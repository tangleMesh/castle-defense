import { INCOME_INTERVAL_TICKS, INCOME_PCT, MAX_INCOME_BONUS, RESCUE_RADIUS, RESCUE_RANGE, SAPPHIRE_GOLD, START_SAPPHIRES, TICK_RATE } from '../constants';
import { BUILDINGS, DAMAGE_TABLE, FACTIONS, ITEM_BY_ID, MAX_ITEMS, UNITS, itemsOf, type ArmorType, type AttackType, type BuildingDef, type FactionId, type ItemDef, type UnitDef } from '../data';
import { MAP, rectCenter } from '../map/map';
import { incomeFor } from '../sim/economy';
import { placementError } from '../sim/placement';
import { KIND_CODES } from '../sim/snapshot';
import { computeVision, entityVisible } from '../sim/vision';
import type { Sim } from '../sim/sim';
import type { Command, Entity, PlayerState } from '../sim/state';

export type AiLevel = 'easy' | 'normal' | 'hard' | 'brutal';
export const AI_LEVELS: AiLevel[] = ['easy', 'normal', 'hard', 'brutal'];
export const AI_LEVEL_NAMES: Record<AiLevel, string> = { easy: 'Easy', normal: 'Normal', hard: 'Hard', brutal: 'Brutal' };
/** Income multiplier per level: Brutal openly cheats (it also sees through the fog of war). */
export const AI_INCOME: Record<AiLevel, number> = { easy: 1, normal: 1, hard: 1, brutal: 1.3 };

/** Bot players use synthetic user ids of the form `ai:<level>:<suffix>`. */
export function isBotId(userId: string): boolean {
  return userId.startsWith('ai:');
}
export function botLevel(userId: string): AiLevel | null {
  const level = userId.split(':')[1] as AiLevel;
  return isBotId(userId) && AI_LEVELS.includes(level) ? level : null;
}
export function makeBotId(level: AiLevel, suffix: string): string {
  return `ai:${level}:${suffix}`;
}

export interface Profile {
  /** Ticks between decisions (reaction speed). */
  think: number;
  /** Max queued build orders. */
  maxQueue: number;
  /** Chance per decision to do nothing at all. */
  idle: number;
  /** Own buildings before upgrades are considered. */
  upgradeAfter: number;
  /** Own buildings before the special building is considered (Infinity: never). */
  specialAt: number;
  /** Plans economy, auras and towers. */
  planner: boolean;
  /** Picks units that counter the enemy's armour and air units. */
  counter: boolean;
  /** Saves gold for the best option instead of buying whatever is affordable. */
  saves: boolean;
  /** Placement: compact base from the castle outwards vs. random spots. */
  tidy: boolean;
  /** Enemy "threat" (≈ unit count) needed before using the rescue strike. */
  rescueAt: number;
  /** Ticks the bot waits after noticing a strike-worthy situation. */
  rescueDelay: number;
  /** Aim error of the rescue strike in tiles. */
  rescueAim: number;
  /** Multiplier on upgrade scores (quality over quantity). */
  upgradeBias: number;
  /** Target share of ranged spawn buildings (0 = don't care). */
  rangedShare: number;
  /** Place spawn buildings behind the castle first. */
  safeSpots: boolean;
  /** Longest wait (seconds of income) the bot accepts while saving for its special building. */
  saveForSpecial: number;
  /** Minutes into a round before the bot starts buying builder items (Infinity: never). */
  itemsAfterMin: number;
  /** Items in the order the bot wants them. */
  items: string[];
  /**
   * Strategy bias: multipliers on the scores of building categories. Used by the simulation lab
   * to model human strategies (tower turtle, ranged mass, …) as sparring partners.
   */
  bias?: Partial<Record<BuildCategory, number>>;
  /** Scouting cheat for sparring partners: judges the enemy army without fog of war. */
  fullVision?: boolean;
  /** Income ticks the bot may wait for a better option instead of buying another fragile-unit spawner (0 = never waits). */
  chaffWait?: number;
  /** Where spawn buildings go: around the castle (default), towards the front, or behind the castle. */
  place?: Placement;
  /** Per-faction placement (wins over `place`): each faction has its own best base layout. */
  placeBy?: Partial<Record<FactionId, Placement>>;
}

export type Placement = 'castle' | 'front' | 'back';

export type BuildCategory = 'melee' | 'ranged' | 'air' | 'swarm' | 'siege' | 'tower' | 'aura' | 'eco' | 'upgrade' | 'special';

/** Category of a building for strategy biases. */
export function buildCategory(def: BuildingDef, upgrade = false): BuildCategory {
  if (def.special) return 'special';
  if (upgrade) return 'upgrade';
  if (def.incomeBonus || def.bountyBonus) return 'eco';
  if (def.attack) return 'tower';
  if (!def.spawn) return 'aura';
  const u = UNITS[def.spawn.unit];
  if (u.air) return 'air';
  if (u.structuresOnly || u.attackType === 'siege') return 'siege';
  if (def.spawn.count > 1 || u.hp < 150) return 'swarm';
  return u.range >= 4 ? 'ranged' : 'melee';
}

export const PROFILES: Record<AiLevel, Profile> = {
  easy: {
    think: 4 * TICK_RATE, maxQueue: 1, idle: 0.15, upgradeAfter: 10, specialAt: 14, planner: false, counter: false,
    saves: false, tidy: false, rescueAt: 14, rescueDelay: 2 * TICK_RATE, rescueAim: 2.5, upgradeBias: 1, rangedShare: 0, safeSpots: false, saveForSpecial: 0,
    itemsAfterMin: 8, items: ['chalice', 'boots', 'hammer'],
  },
  normal: {
    think: Math.round(1.5 * TICK_RATE), maxQueue: 2, idle: 0.05, upgradeAfter: 4, specialAt: 7, planner: true, counter: true,
    saves: false, tidy: true, rescueAt: 6, rescueDelay: TICK_RATE, rescueAim: 0.5, upgradeBias: 1, rangedShare: 0.25, safeSpots: false, saveForSpecial: 10,
    itemsAfterMin: 6, items: ['aegis', 'hammer', 'war_horn'],
  },
  hard: {
    think: Math.round(0.5 * TICK_RATE), maxQueue: 3, idle: 0, upgradeAfter: 3, specialAt: 5, planner: true, counter: true,
    saves: true, tidy: true, rescueAt: 3, rescueDelay: 0, rescueAim: 0, upgradeBias: 1, rangedShare: 0.4, safeSpots: false, saveForSpecial: 20,
    itemsAfterMin: 5, items: ['war_drum', 'war_horn', 'aegis'],
    // Found with the simulation lab (npm run lab -- search / tune): a base behind the castle wins ~65% against one
    // around it, and striking early at small waves (rescueAt 3 instead of 8) another ~70%.
    place: 'back', chaffWait: 0,
  },
  // Hard's brain, faster, without fog of war and with +30% income (AI_INCOME): openly cheating.
  brutal: {
    think: 3, maxQueue: 3, idle: 0, upgradeAfter: 3, specialAt: 5, planner: true, counter: true,
    saves: true, tidy: true, rescueAt: 3, rescueDelay: 0, rescueAim: 0, upgradeBias: 1, rangedShare: 0.4, safeSpots: false, saveForSpecial: 20,
    itemsAfterMin: 5, items: ['war_drum', 'war_horn', 'aegis'], place: 'back', chaffWait: 0, fullVision: true,
  },
};

type Option =
  | { kind: 'build'; def: BuildingDef; score: number }
  | { kind: 'upgrade'; def: BuildingDef; from: Entity; score: number };

/**
 * Computer opponent. It reads the authoritative simulation directly and issues
 * the same commands a human client would send, so it can't cheat on gold or placement.
 * It keeps almost no state of its own, so it continues seamlessly after save/resume.
 */
/** Tick in which a team's bot last ordered a rescue strike (per simulation). */
const RESCUE_CLAIMS = new WeakMap<Sim, Map<number, number>>();

export class AiPlayer {
  readonly profile: Profile;
  private nextThink: number;
  private rescueSeenAt = -1;
  private wish: string | null = null;
  private rnd: () => number;

  /** `overrides` tweak the level's profile (used by the simulation lab to compare AI variants). */
  constructor(readonly player: number, readonly level: AiLevel, seed = player * 7919 + 17, overrides?: Partial<Profile>) {
    this.profile = { ...PROFILES[level], ...overrides };
    let s = seed >>> 0 || 1;
    this.rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    // Spread bots over different ticks so they don't all think at once (set from the team slot on
    // the first update, so both teams' bots think in step and neither side moves first).
    this.nextThink = -1;
  }

  /** Call once per tick before `sim.step`; returns commands to queue for this player. */
  update(sim: Sim): Command[] {
    const s = sim.state;
    if (s.phase !== 'playing') { this.rescueSeenAt = -1; return []; }
    const out: Command[] = [];
    // Teammates decide in the same tick before either strike is registered: claim it so two bots
    // never burn both strikes on the same wave.
    const team = s.players[this.player].team;
    const claims = RESCUE_CLAIMS.get(sim) ?? new Map<number, number>();
    RESCUE_CLAIMS.set(sim, claims);
    const rescue = claims.get(team) === s.tick ? null : this.rescue(sim);
    if (rescue) { out.push(rescue); claims.set(team, s.tick); }
    if (this.nextThink < 0) {
      const slot = s.players.filter((p) => p.team === team && p.index < this.player).length;
      this.nextThink = s.tick + (slot * 3) % this.profile.think;
    }
    if (s.tick < this.nextThink) return out;
    this.nextThink = s.tick + this.profile.think;
    if (this.rnd() < this.profile.idle) return out;
    const cmd = this.decide(sim);
    if (cmd) out.push(cmd);
    return out;
  }

  // ---------------------------------------------------------------- rescue strike

  private rescue(sim: Sim): Command | null {
    const s = sim.state;
    const me = s.players[this.player];
    if (me.rescueUsed) return null;
    // A teammate's strike is still in its telegraph: let it land before judging the wave again
    // (otherwise both strikes go into the same wave one tick apart).
    if (s.strikes.some((st) => s.players[st.player]?.team === me.team)) return null;
    const c = rectCenter(MAP.castles[me.team]);
    const castle = sim.castle(me.team);
    // Every difficulty: never let a building of our team fall if a strike can still save it.
    const save = this.saveBuilding(sim, c);
    if (save) return save;
    const threats = s.entities.filter((e) => e.kind === 'unit' && e.team !== me.team && e.hp > 0
      && Math.hypot(e.x - c.x, e.y - c.y) < RESCUE_RANGE + 1);
    if (!threats.length) { this.rescueSeenAt = -1; return null; }

    // Weight by unit strength; desperate castles fire earlier.
    const weight = (e: Entity) => Math.max(0.5, Math.sqrt(e.maxHp / 250));
    let best = { x: 0, y: 0, w: 0 };
    for (const t of threats) {
      // Lead the target slightly towards the castle (units keep walking during the 1 s delay).
      const d = Math.hypot(c.x - t.x, c.y - t.y) || 1;
      const lead = this.profile.rescueAim === 0 ? Math.min(1.5, d * 0.25) : 0;
      const x = t.x + ((c.x - t.x) / d) * lead, y = t.y + ((c.y - t.y) / d) * lead;
      if (Math.hypot(x - c.x, y - c.y) > RESCUE_RANGE) continue;
      let w = 0;
      for (const o of threats) if (Math.hypot(o.x - x, o.y - y) <= RESCUE_RADIUS - 0.3) w += weight(o);
      if (w > best.w) best = { x, y, w };
    }
    // Fire at big waves, or earlier once the castle is actually taking damage.
    const hpFrac = castle.hp / castle.maxHp;
    const needed = this.profile.rescueAt * (hpFrac < 0.35 ? 0.5 : hpFrac < 0.9 ? 1 : 1.6);
    if (best.w < needed) { this.rescueSeenAt = -1; return null; }
    if (this.rescueSeenAt < 0) this.rescueSeenAt = s.tick;
    if (s.tick - this.rescueSeenAt < this.profile.rescueDelay) return null;

    const a = this.rnd() * Math.PI * 2, r = this.rnd() * this.profile.rescueAim;
    let x = best.x + Math.cos(a) * r, y = best.y + Math.sin(a) * r;
    const d = Math.hypot(x - c.x, y - c.y);
    if (d > RESCUE_RANGE - 0.1) { x = c.x + ((x - c.x) / d) * (RESCUE_RANGE - 0.1); y = c.y + ((y - c.y) / d) * (RESCUE_RANGE - 0.1); }
    return { c: 'rescue', x, y };
  }

  /**
   * Strike to save a team building (or the castle) that's about to be destroyed: it is badly
   * damaged and enemy units are attacking it. Skipped if a teammate's strike is already on its way.
   */
  private saveBuilding(sim: Sim, c: { x: number; y: number }): Command | null {
    const s = sim.state;
    const me = s.players[this.player];
    if (s.strikes.some((st) => s.players[st.player]?.team === me.team)) return null;
    let best: { x: number; y: number; urgency: number } | null = null;
    for (const b of s.entities) {
      if (b.team !== me.team || (b.kind !== 'building' && b.kind !== 'castle') || b.hp <= 0) continue;
      const frac = b.hp / b.maxHp;
      if (frac > (b.kind === 'castle' ? 0.25 : 0.45)) continue;
      const bx = b.tx! + b.size! / 2, by = b.ty! + b.size! / 2;
      // Enemy units close enough to be hitting it.
      const attackers = s.entities.filter((e) => e.kind === 'unit' && e.team !== me.team && e.hp > 0
        && sim.edgeDist(b, e) <= (UNITS[e.type]?.range ?? 1) + 1.5);
      if (!attackers.length) continue;
      // Aim at the attackers' centre, pulled into strike range of our castle.
      let x = attackers.reduce((a, e) => a + e.x, 0) / attackers.length;
      let y = attackers.reduce((a, e) => a + e.y, 0) / attackers.length;
      const d = Math.hypot(x - c.x, y - c.y);
      if (d > RESCUE_RANGE - 0.1) { x = c.x + ((x - c.x) / d) * (RESCUE_RANGE - 0.1); y = c.y + ((y - c.y) / d) * (RESCUE_RANGE - 0.1); }
      const hit = attackers.filter((e) => Math.hypot(e.x - x, e.y - y) <= RESCUE_RADIUS - 0.3).length;
      if (hit * 2 < attackers.length) continue; // out of reach: the strike can't save this one
      const urgency = (1 - frac) * (b.kind === 'castle' ? 2 : 1) + hit * 0.05;
      if (!best || urgency > best.urgency) best = { x, y, urgency };
    }
    return best && { c: 'rescue', x: best.x, y: best.y };
  }

  // ---------------------------------------------------------------- economy & building

  private decide(sim: Sim): Command | null {
    const s = sim.state;
    const me = s.players[this.player];
    const P = this.profile;
    const builder = sim.get(me.builderId);
    if (!builder) return null;
    const mine = sim.playerBuildings(this.player);
    const queued = builder.orders ?? [];

    const item = this.wantedItem(sim, mine.length);
    if (item) {
      if (me.gold >= item.cost) return { c: 'buy', item: item.id };
      // Planners stop building and save for it when it's within about 90 s of income.
      const waitTicks = ((item.cost - me.gold) / Math.max(1, incomeFor(sim, this.player))) * INCOME_INTERVAL_TICKS;
      if (P.planner && waitTicks <= 90 * TICK_RATE) return null;
    }

    // Rich planners buy another sapphire for an elite upgrade or a second special building.
    if (P.planner && (me.sapphires ?? START_SAPPHIRES) === 0 && me.gold >= SAPPHIRE_GOLD + 200 && mine.length >= 6) return { c: 'buySapphire' };

    const options = this.options(sim, me, mine, queued);
    if (!options.length) return null;

    let pick: Option | undefined;
    // Planners save up for their special building (and its upgrades) once their base stands.
    const goal = P.planner ? options.find((o) => o.def.special) : undefined;
    if (goal && goal.def.cost > me.gold) {
      const waitTicks = ((goal.def.cost - me.gold) / Math.max(1, incomeFor(sim, this.player))) * INCOME_INTERVAL_TICKS;
      if (waitTicks < P.saveForSpecial * TICK_RATE) return null;
    }
    if (goal && goal.def.cost <= me.gold) pick = goal;
    else if (P.saves) {
      // Go for the best option; wait for it when it's within ~15 s of income.
      options.sort((a, b) => b.score - a.score);
      const perTick = incomeFor(sim, this.player);
      // Enemy flyers and no way to hit them: save up (up to ~40 s) for anti-air instead of
      // buying yet another cheap ground spawner.
      const aa = this.needsAntiAir(sim, me, mine) ? options.find((o) => o.def.spawn && (UNITS[o.def.spawn.unit].targetsAir || UNITS[o.def.spawn.unit].air)) : undefined;
      if (aa && aa.def.cost > me.gold && aa.def.cost <= me.gold + perTick * 4) return null;
      if (aa && aa.def.cost <= me.gold) pick = aa;
      else {
        // Don't flood the field with cheap chaff: if the affordable choice is a spawner of fragile
        // units, wait up to ~30 s of income for a clearly better option (unless under pressure).
        const cheap = options.find((o) => o.def.cost <= me.gold);
        // (Not for the very first spawner: that one is bought as soon as possible.)
        const chaff = !!cheap?.def.spawn && UNITS[cheap.def.spawn.unit].hp < 150
          && mine.filter((e) => BUILDINGS[e.type].spawn).length >= 1;
        for (const o of options) {
          if (o.def.cost <= me.gold) { pick = o; break; }
          if (o.def.cost <= me.gold + perTick * 1.5) return null;
          // A strategy bias (sparring partners) is worth saving up for.
          if ((P.bias?.[buildCategory(o.def, o.kind === 'upgrade')] ?? 1) >= 2 && o.def.cost <= me.gold + perTick * 10) return null;
          if (chaff && o.score >= cheap!.score * 1.2 && o.def.cost <= me.gold + perTick * (P.chaffWait ?? 3)
            && !this.enemyProfile(sim, me).pressure) return null;
        }
      }
    } else if (P.planner) {
      const affordable = options.filter((o) => o.def.cost <= me.gold);
      if (!affordable.length) return null;
      affordable.sort((a, b) => b.score * (0.7 + this.rnd() * 0.6) - a.score * (0.7 + this.rnd() * 0.6));
      pick = affordable[0];
    } else {
      // Easy: wants something at random and waits until it can pay for it.
      if (!this.wish || !options.some((o) => o.def.id === this.wish)) this.wish = options[Math.floor(this.rnd() * options.length)].def.id;
      pick = options.find((o) => o.def.id === this.wish && o.def.cost <= me.gold);
      if (pick) this.wish = null;
    }
    if (!pick) return null;

    if (pick.kind === 'upgrade') return { c: 'upgrade', id: pick.from.id, to: pick.def.id };
    if (queued.length >= P.maxQueue) return null;
    const spot = this.findSpot(sim, pick.def);
    return spot ? { c: 'build', building: pick.def.id, tx: spot.tx, ty: spot.ty, queue: true } : null;
  }

  /** Next builder item this bot wants, once the round is old enough and its base stands. */
  private wantedItem(sim: Sim, buildings: number): ItemDef | null {
    const s = sim.state;
    const me = s.players[this.player];
    const P = this.profile;
    const bag = itemsOf(me);
    if (bag.length >= MAX_ITEMS) return null;
    if (s.tick - s.roundStartTick < P.itemsAfterMin * 60 * TICK_RATE || buildings < 5) return null;
    const id = P.items.find((i) => !bag.includes(i));
    return id ? ITEM_BY_ID[id] : null;
  }

  private options(sim: Sim, me: PlayerState, mine: Entity[], queued: { building: string }[]): Option[] {
    const P = this.profile;
    const faction = FACTIONS[me.faction];
    const all = [...mine.map((e) => e.type), ...queued.map((o) => o.building)];
    const count = (pred: (d: BuildingDef) => boolean) => all.filter((t) => pred(BUILDINGS[t])).length;
    const spawners = count((d) => !!d.spawn && !d.special);
    const total = all.length;
    const enemy = this.enemyProfile(sim, me);
    const out: Option[] = [];

    // Everything is scored in "army value per gold"; utility buildings are rated relative
    // to the best spawn building so the planner can weigh them against each other.
    const spawnOpts = faction.build.map((id) => BUILDINGS[id]).filter((d) => d.spawn && !d.special);
    const top = Math.max(...spawnOpts.map((d) => this.spawnScore(d, enemy) / d.cost));
    const towers = count((d) => !!d.attack);
    const ranged = count((d) => !!d.spawn && !d.special && UNITS[d.spawn.unit].range >= 4);
    const wantTowers = enemy.pressure ? 2 : spawners >= (P.counter ? 3 : 5) ? 1 : 0;

    const gems = me.sapphires ?? START_SAPPHIRES;
    for (const id of faction.build) {
      const def = BUILDINGS[id];
      if ((def.sapphires ?? 0) > gems) continue;
      if (def.special) {
        if (total >= P.specialAt && !count((d) => !!d.special)) out.push({ kind: 'build', def, score: top * (P.planner ? 1.3 : 1) });
        continue;
      }
      if (def.spawn) {
        let score = this.spawnScore(def, enemy) / def.cost;
        // Planners keep a mixed army: each further copy of the same spawner is worth a bit less.
        if (P.counter) score *= 0.88 ** count((d) => d.id === def.id || !!def.upgrades?.includes(d.id));
        if (P.rangedShare && UNITS[def.spawn.unit].range >= 4 && ranged < P.rangedShare * Math.max(1, spawners)) score *= 1.6;
        out.push({ kind: 'build', def, score });
        continue;
      }
      if (!P.planner) {
        if (total >= 3) out.push({ kind: 'build', def, score: 0 });
        continue;
      }
      // Utility buildings, planned by the stronger bots.
      if (def.incomeBonus) {
        const bonus = all.reduce((n, t) => n + (BUILDINGS[t].incomeBonus ?? 0), 0);
        if (bonus + def.incomeBonus > MAX_INCOME_BONUS + 1e-9) continue;
        // Only worth it when it pays for itself within a few minutes.
        const perTick = incomeFor(sim, this.player) * def.incomeBonus + def.cost * INCOME_PCT;
        const payback = (def.cost / Math.max(0.1, perTick)) * (INCOME_INTERVAL_TICKS / TICK_RATE);
        if (payback < (P.counter ? 240 : 180)) out.push({ kind: 'build', def, score: top * 1.1 });
      } else if (def.bountyBonus) {
        // Hunting economy: worth it once the army is killing steadily.
        const have = count((d) => !!d.bountyBonus);
        if (spawners >= 4 && have < Math.min(2, Math.floor(spawners / 4))) out.push({ kind: 'build', def, score: top * 1.05 });
      } else if (def.attack) {
        // Towers (incl. auras that also attack) defend the castle approach.
        if (towers < wantTowers) out.push({ kind: 'build', def, score: top * (enemy.pressure ? 1.4 : 1.1) });
      } else if (def.aura) {
        const have = count((d) => !!d.aura && !d.attack);
        if (have < Math.floor(spawners / 4)) out.push({ kind: 'build', def, score: top * 1.05 });
      }
    }

    if (total >= P.upgradeAfter) {
      for (const e of mine) {
        const from = BUILDINGS[e.type];
        if (!from.upgrades?.length || e.buildLeft) continue;
        for (const to of from.upgrades) {
          const def = BUILDINGS[to];
          if ((def.sapphires ?? 0) > gems) continue;
          let score: number;
          if (def.special) score = top * (P.planner ? 1.2 : 0.8);
          else if (def.spawn && from.spawn) {
            // Upgrades are good value: you keep the building and get a better unit.
            score = (this.spawnScore(def, enemy) - this.spawnScore(from, enemy) * 0.5) / def.cost * P.upgradeBias;
          } else score = top * 0.5;
          out.push({ kind: 'upgrade', def, from: e, score });
        }
      }
    }
    if (P.bias) {
      for (const o of out) o.score *= P.bias[buildCategory(o.def, o.kind === 'upgrade')] ?? 1;
      // Strong preferences also lift the gates that normally hold towers / economy back.
      for (const id of faction.build) {
        const def = BUILDINGS[id], cat = buildCategory(def);
        if ((P.bias[cat] ?? 1) >= 2 && (cat === 'tower' || cat === 'eco' || cat === 'aura') && !out.some((o) => o.def.id === id)
          && (def.sapphires ?? 0) <= gems) out.push({ kind: 'build', def, score: top * (P.bias[cat] ?? 1) });
      }
    }
    return out;
  }

  /** Army strength per second a spawn building adds, adjusted against the enemy army. */
  private spawnScore(def: BuildingDef, enemy: EnemyProfile): number {
    const sp = def.spawn!;
    const u = UNITS[sp.unit];
    // Faction abilities, folded into rough damage and toughness factors.
    const dps = (u.dmg / u.cooldown * (u.chain ? 1 + (u.chain - 1) * 0.5 : 1) * (u.splash ? 1.6 : 1) * (u.heal ? 1.5 : 1)
      + (u.poison ? u.poison.dps * 0.8 : 0)) * (u.charge ? 1.25 : 1) * (u.bonusVs ? 1.15 : 1) * (u.ignoreArmor ? 1.15 : 1) * (u.aura ? 1.25 : 1);
    let hp = u.hp * (1 + (u.lifesteal ?? 0) * 0.8 + (u.thorns ?? 0) * 0.6) + (u.regen ?? 0) * 8;
    if (u.onDeath) hp += UNITS[u.onDeath.unit].hp * u.onDeath.count * 0.3;
    let power = Math.sqrt(hp * (1 + u.armor * 0.06) * dps) * sp.count / sp.interval;
    if (u.structuresOnly) power *= 0.6;
    // Small bodies lose more to overkill, splash and towers than the formula suggests.
    if (u.hp < 150) power *= 0.75;
    // Ranged units keep shooting from behind the frontline.
    if (this.profile.counter && u.range >= 4) power *= 1.35;
    if (this.profile.counter && enemy.total > 0) power *= this.counterFactor(u, enemy);
    return power * 100;
  }

  private counterFactor(u: UnitDef, enemy: EnemyProfile): number {
    let f = 0;
    for (const [armor, w] of Object.entries(enemy.armor) as Array<[ArmorType, number]>) {
      f += (w / enemy.total) * DAMAGE_TABLE[u.attackType][armor];
    }
    // Air: ground units that can't shoot up are much worse, anti-air better.
    const air = enemy.air / enemy.total;
    if (!u.targetsAir && !u.air) f *= 1 - air * 0.8;
    else if (air > 0.15) f *= 1 + air * 0.5;
    // Defence: avoid units whose armour the enemy's attacks are strong against.
    let taken = 0;
    for (const [att, w] of Object.entries(enemy.attack) as Array<[AttackType, number]>) taken += (w / enemy.total) * DAMAGE_TABLE[att][u.armorType];
    if (taken > 0) f /= Math.max(0.6, taken) ** 0.7;
    // Swarms of small bodies melt under splash and chain attacks.
    if (u.hp < 150 || u.onDeath) f *= 1 - (enemy.splash / enemy.total) * 0.7;
    // Our own units: keep some frontline when the enemy has many ranged units.
    if (u.range > 2 && enemy.ranged / enemy.total > 0.5) f *= 0.9;
    return Math.max(0.2, f) ** 1.5;
  }

  /** The enemy fields a real air force and less than a fifth of our spawners can shoot it down. */
  private needsAntiAir(sim: Sim, me: PlayerState, mine: Entity[]): boolean {
    const enemy = this.enemyProfile(sim, me);
    if (!enemy.total || enemy.air / enemy.total < 0.2) return false;
    const spawners = mine.filter((e) => BUILDINGS[e.type].spawn);
    const aa = spawners.filter((e) => { const u = UNITS[BUILDINGS[e.type].spawn!.unit]; return u.targetsAir || u.air; });
    return aa.length < Math.max(1, spawners.length * 0.2);
  }

  private enemyProfile(sim: Sim, me: PlayerState): EnemyProfile {
    const p: EnemyProfile = { armor: {}, attack: {}, air: 0, ranged: 0, splash: 0, total: 0, pressure: false };
    const c = rectCenter(MAP.castles[me.team]);
    const add = (u: UnitDef, w: number) => {
      p.armor[u.armorType] = (p.armor[u.armorType] ?? 0) + w;
      p.attack[u.attackType] = (p.attack[u.attackType] ?? 0) + w;
      if (u.air) p.air += w;
      if (u.range > 2) p.ranged += w;
      if (u.splash || u.chain) p.splash += w;
      p.total += w;
    };
    let near = 0;
    // Bots play under the same fog of war as humans: they only judge what their team can see.
    const own = sim.state.entities.filter((e) => e.team === me.team);
    const vision = computeVision(me.team, own);
    for (const e of sim.state.entities) {
      if (e.team === me.team || e.hp <= 0) continue;
      if (!this.profile.fullVision && e.kind !== 'castle' && !entityVisible(vision, KIND_CODES.indexOf(e.kind), e.type, e.x, e.y)) continue;
      if (e.kind === 'unit') {
        const u = UNITS[e.type];
        // Small units still count: a cloud of moths is a threat even at 85 HP each.
        if (u) add(u, Math.max(0.6, u.hp / 200));
        if (Math.hypot(e.x - c.x, e.y - c.y) < 18) near++;
      } else if (e.kind === 'building') {
        const sp = BUILDINGS[e.type].spawn;
        if (sp) { const u = UNITS[sp.unit]; add(u, Math.max(0.6, u.hp / 200) * sp.count * 2); }
      }
    }
    p.pressure = near >= 6;
    return p;
  }

  // ---------------------------------------------------------------- placement

  private findSpot(sim: Sim, def: BuildingDef): { tx: number; ty: number } | null {
    const me = sim.state.players[this.player];
    const z = MAP.zones[me.team];
    const castle = rectCenter(MAP.castles[me.team]);
    const n = def.size;
    const cands: Array<{ tx: number; ty: number; score: number }> = [];
    const P = this.profile;
    // Allied spawn buildings (for aura placement).
    const spawners = sim.state.entities.filter((e) => e.kind === 'building' && e.team === me.team && BUILDINGS[e.type].spawn);
    const step = P.tidy ? 3 : 1;
    // The map is point-symmetric: team 1 uses the mirror image of team 0's grid, so both sides
    // get exactly the same base layout options.
    const z0 = MAP.zones[0];
    for (let lx = z0.x + (P.tidy ? 1 : 0); lx + n <= z0.x + z0.w; lx += step) {
      for (let ly = z0.y + (P.tidy ? 1 : 0); ly + n <= z0.y + z0.h; ly += step) {
        const tx = me.team === 0 ? lx : MAP.width - lx - n, ty = me.team === 0 ? ly : MAP.height - ly - n;
        if (tx < z.x || tx + n > z.x + z.w) continue;
        const cx = tx + n / 2, cy = ty + n / 2;
        let score: number;
        if (!P.tidy) score = this.rnd();
        else if (def.aura && !def.attack) {
          // Auras sit where they cover the most of our spawn buildings.
          score = -spawners.filter((e) => Math.hypot(e.x - cx, e.y - cy) <= def.aura!.radius - 1).length * 10
            + Math.abs(cx - castle.x) * 0.2;
        } else if (def.attack) {
          // Towers guard the castle approach on the enemy side.
          const front = castle.x + (me.team === 0 ? 5 : -5);
          score = Math.hypot(cx - front, (cy - castle.y) * 1.3);
        } else {
          // Compact base growing outwards from the castle; mild spread across lanes.
          score = Math.abs(cx - castle.x) + Math.abs(cy - castle.y) * 0.6 + this.rnd() * 1.5;
          // Forward bases put units into the fight sooner; rear bases are safer.
          const forward = me.team === 0 ? cx - castle.x : castle.x - cx;
          const place = P.placeBy?.[me.faction] ?? P.place;
          if (place === 'front') score = -forward + Math.abs(cy - castle.y) * 0.4 + this.rnd() * 1.5;
          else if (place === 'back') score = forward + Math.abs(cy - castle.y) * 0.5 + this.rnd() * 1.5;
          // Behind the castle is safest: enemies have to get past it first.
          if (P.safeSpots && (me.team === 0 ? cx < castle.x : cx > castle.x)) score -= 6;
        }
        cands.push({ tx, ty, score });
      }
    }
    cands.sort((a, b) => a.score - b.score);
    // placementError runs a full path-connectivity check, so only test the best few.
    let tested = 0;
    for (const c of cands) {
      if (!placementError(sim, this.player, def.id, c.tx, c.ty)) return c;
      if (++tested > 60) break;
    }
    return null;
  }
}

interface EnemyProfile {
  armor: Partial<Record<ArmorType, number>>;
  /** Weight of the enemy's attack types (what hurts which of our armour types). */
  attack: Partial<Record<AttackType, number>>;
  air: number;
  ranged: number;
  /** Enemy units with splash or chain attacks (bad news for swarms). */
  splash: number;
  total: number;
  /** Many enemy units close to our castle. */
  pressure: boolean;
}
