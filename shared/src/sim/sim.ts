import { INCOME_INTERVAL_TICKS, START_GOLD, START_SAPPHIRES, type GameMode } from '../constants';
import { sideRandom } from './rng';
import { BUILDINGS, UNITS } from '../data';
import { MAP, distToRect } from '../map/map';

const MAP_KEY = `${MAP.width}x${MAP.height}`;
import type { Entity, PlayerCommand, PlayerSetup, SimEvent, SimState, Team } from './state';
import { buildBlockedGrid, computeFlowField, footprint } from './grid';
import { SpatialHash } from './spatialHash';
import { applyCommand } from './commands';
import { stepEconomy } from './economy';
import { stepBuildings } from './spawning';
import { computeAuras, type Mods } from './auras';
import { stepCombatUnits, stepStructureAttacks } from './combat';
import { stepBuilders, stepUnitMovementPost } from './movement';
import { stepStrikes } from './rescue';
import { stepItems } from './items';
import { checkRoundEnd, startRound, stepPhase } from './rounds';

export interface CreateOptions {
  players: PlayerSetup[];
  bestOf: number;
  seed: number;
  mode?: GameMode;
}

/**
 * Deterministic, server-authoritative simulation. `state` is plain JSON; everything
 * else on this class is a cache derived from it and rebuilt on demand.
 */
export class Sim {
  state: SimState;
  byId = new Map<number, Entity>();
  hash = new SpatialHash(3);
  mods = new Map<number, Mods>();
  /** Per player kill-bounty bonus from buildings (recomputed every tick with the auras). */
  bountyBonus: number[] = [];
  private blocked: Uint8Array | null = null;
  private fields: [Uint16Array | null, Uint16Array | null] = [null, null];

  constructor(state: SimState) {
    this.state = state;
    this.reindex();
  }

  static create(opts: CreateOptions): Sim {
    const state: SimState = {
      version: 1,
      map: MAP_KEY,
      tick: 0,
      roundStartTick: 0,
      rng: opts.seed >>> 0,
      bestOf: opts.bestOf,
      mode: opts.mode ?? 'standard',
      round: 0,
      score: [0, 0],
      rounds: [],
      phase: 'playing',
      phaseTicks: 0,
      winner: null,
      incomeTicks: INCOME_INTERVAL_TICKS,
      nextId: 1,
      players: opts.players.map((p, index) => ({
        index, userId: p.userId, name: p.name, team: p.team, faction: p.faction, ...(p.incomeMult && p.incomeMult !== 1 ? { incomeMult: p.incomeMult } : {}),
        gold: START_GOLD, sapphires: START_SAPPHIRES, rescueUsed: false, builderId: 0, connected: true,
        kills: 0, strikes: 0, goldEarned: 0, lost: 0, castleDmg: 0,
      })),
      entities: [],
      castleIds: [0, 0],
      strikes: [],
      events: [],
    };
    const sim = new Sim(state);
    startRound(sim);
    return sim;
  }

  /** Restore from a persisted state (deep-copied so the input is never mutated). */
  /** Whether a saved game was played on the current map (older saves sit on other coordinates). */
  static compatible(saved: SimState): boolean {
    return saved.map === MAP_KEY;
  }

  static restore(saved: SimState): Sim {
    const state = JSON.parse(JSON.stringify(saved)) as SimState;
    state.events = [];
    return new Sim(state);
  }

  serialize(): SimState {
    return JSON.parse(JSON.stringify({ ...this.state, events: [] }));
  }

  // ------------------------------------------------------------------ entities

  reindex() {
    this.byId.clear();
    for (const e of this.state.entities) this.byId.set(e.id, e);
    this.invalidateGrid();
  }

  get(id: number | undefined): Entity | undefined {
    return id === undefined ? undefined : this.byId.get(id);
  }

  add(e: Omit<Entity, 'id'>): Entity {
    const ent = { ...e, id: this.state.nextId++ } as Entity;
    this.state.entities.push(ent);
    this.byId.set(ent.id, ent);
    if (ent.kind === 'building' || ent.kind === 'castle') this.invalidateGrid();
    return ent;
  }

  /** Remove entities with hp <= 0 (builders and castles are handled elsewhere). */
  removeDead() {
    let gridChanged = false;
    const alive: Entity[] = [];
    const released: Entity[] = [];
    for (const e of this.state.entities) {
      if (e.hp > 0 || e.kind === 'builder' || e.kind === 'castle') { alive.push(e); continue; }
      this.byId.delete(e.id);
      if (e.kind === 'unit') {
        const p = this.state.players[e.owner]; if (p) p.lost = (p.lost ?? 0) + 1;
        if (UNITS[e.type].onDeath) released.push(e);
      }
      this.emit({ t: 'die', id: e.id, x: round2(e.x), y: round2(e.y), k: e.kind });
      if (e.kind === 'building') gridChanged = true;
    }
    this.state.entities = alive;
    if (gridChanged) this.invalidateGrid();
    // Units that burst into smaller ones when they fall (Vinelings → Sproutlings, treants → saplings).
    for (const e of released) {
      const od = UNITS[e.type].onDeath!;
      const u = UNITS[od.unit];
      for (let i = 0; i < od.count; i++) {
        // Side-symmetric: team 1's burst is the point mirror of team 0's in the same spot.
        const rx = e.team === 0 ? e.x : MAP.width - e.x, ry = e.team === 0 ? e.y : MAP.height - e.y;
        const a = (i / od.count) * Math.PI * 2 + sideRandom(this.state, Math.floor(rx * 64) * 7 + Math.floor(ry * 64) * 8191 + i)
          + (e.team === 0 ? 0 : Math.PI);
        this.add({
          kind: 'unit', type: od.unit, owner: e.owner, team: e.team,
          x: e.x + Math.cos(a) * 0.35, y: e.y + Math.sin(a) * 0.35, hp: u.hp, maxHp: u.hp, cd: 0, healCd: 0,
        });
      }
    }
  }

  removeNow(e: Entity) {
    this.state.entities = this.state.entities.filter((x) => x !== e);
    this.byId.delete(e.id);
    if (e.kind === 'building') this.invalidateGrid();
  }

  emit(ev: SimEvent) {
    this.state.events.push(ev);
  }

  // ------------------------------------------------------------------ grids

  invalidateGrid() {
    this.blocked = null;
    this.fields = [null, null];
    this.structureList = null;
  }

  private structureList: Entity[] | null = null;
  /**
   * Buildings and castles in entity order (cached; every change of the structure set goes through
   * `invalidateGrid`). Units without a target look for structures every tick, and scanning
   * all entities for them was a large share of a lab game's run time.
   */
  structures(): Entity[] {
    return this.structureList ??= this.state.entities.filter((e) => this.isStructure(e));
  }

  get blockedGrid(): Uint8Array {
    return (this.blocked ??= buildBlockedGrid(this.state));
  }

  /** Flow field that units of `team` follow (towards the enemy castle). */
  flowField(team: Team): Uint16Array {
    return (this.fields[team] ??= computeFlowField(this.blockedGrid, MAP.castles[(1 - team) as Team]));
  }

  // ------------------------------------------------------------------ geometry

  radius(e: Entity): number {
    if (e.kind === 'unit') return UNITS[e.type].radius;
    if (e.kind === 'builder') return 0.3;
    return 0;
  }

  isStructure(e: Entity) {
    return e.kind === 'building' || e.kind === 'castle';
  }

  isAir(e: Entity) {
    return e.kind === 'unit' && !!UNITS[e.type].air;
  }

  /** Edge-to-edge distance between two entities. */
  edgeDist(a: Entity, b: Entity): number {
    if (this.isStructure(b)) return distToRect(footprint(b), a.x, a.y) - this.radius(a);
    if (this.isStructure(a)) return distToRect(footprint(a), b.x, b.y) - this.radius(b);
    return Math.hypot(a.x - b.x, a.y - b.y) - this.radius(a) - this.radius(b);
  }

  castle(team: Team): Entity {
    return this.byId.get(this.state.castleIds[team])!;
  }

  // ------------------------------------------------------------------ economy helpers

  playerBuildings(player: number): Entity[] {
    return this.state.entities.filter((e) => e.kind === 'building' && e.owner === player);
  }

  // ------------------------------------------------------------------ step

  step(commands: PlayerCommand[] = []): SimEvent[] {
    const s = this.state;
    s.events = [];
    if (s.phase !== 'playing') {
      stepPhase(this);
      s.tick++;
      return s.events;
    }
    // Alternate which player's commands go first, so no side always gets the lower entity ids.
    for (const pc of s.tick % 2 ? commands.slice().reverse() : commands) applyCommand(this, pc);

    this.hash.rebuild(s.entities.filter((e) => e.kind === 'unit' && e.hp > 0));
    stepEconomy(this);
    stepBuildings(this);
    computeAuras(this);
    stepCombatUnits(this);
    stepStructureAttacks(this);
    stepItems(this);
    stepBuilders(this);
    stepStrikes(this);
    stepUnitMovementPost(this);
    this.removeDead();
    checkRoundEnd(this);
    s.tick++;
    return s.events;
  }
}

export function round2(v: number) {
  return Math.round(v * 100) / 100;
}

export function buildingDef(e: Entity) {
  return BUILDINGS[e.type];
}
