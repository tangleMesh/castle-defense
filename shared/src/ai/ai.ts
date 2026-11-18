import { INCOME_INTERVAL_TICKS, INCOME_PCT, MAX_INCOME_BONUS, RESCUE_RADIUS, SAPPHIRE_GOLD, START_SAPPHIRES, TICK_RATE } from '../constants';
import { ACTIVE_TUNING, BUILDINGS, DAMAGE_TABLE, FACTIONS, ITEM_BY_ID, MAX_ITEMS, UNITS, abilityFactors, itemsOf, type ArmorType, type AttackType, type BuildingDef, type FactionId, type ItemDef, type UnitDef } from '../data';
import { MAP, clampToRescueArea, inRescueArea, rectCenter } from '../map/map';
import { incomeFor } from '../sim/economy';
import { placementError } from '../sim/placement';
import { KIND_CODES } from '../sim/snapshot';
import { computeVision, entityVisible } from '../sim/vision';
import type { Sim } from '../sim/sim';
import type { Command, Entity, PlayerState } from '../sim/state';

export type AiLevel = 'easy' | 'normal' | 'hard' | 'brutal';
export const AI_LEVELS: AiLevel[] = ['easy', 'normal', 'hard', 'brutal'];
export const AI_LEVEL_NAMES: Record<AiLevel, string> = { easy: 'Easy', normal: 'Normal', hard: 'Hard', brutal: 'Brutal' };
/**
 * Income multiplier per level, set by the balancer (shared/src/data/tuning.ts). Brutal openly
 * cheats (it also sees through the fog of war); easier levels may get less than a player.
 */
export const AI_INCOME: Record<AiLevel, number> = { easy: 1, normal: 1, hard: 1, brutal: 1.3, ...ACTIVE_TUNING.aiIncome };

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
  /**
   * Planners: how much saving up costs. An option's appeal is divided by (1 + waitCost × extra / cost),
   * where `extra` is the gold still missing beyond the soonest affordable option; options more than
   * `maxWait` seconds of extra saving away are skipped. Before, bots only looked ~15 s ahead, and with
   * income around 1 gold/s early on the cheapest spawner was the only thing ever in reach.
   */
  waitCost?: number;
  maxWait?: number;
  /**
   * Per-round doctrine: each round the bot draws a preference for every building category
   * (log-normal, this σ), so its army differs from round to round and can be countered.
   */
  doctrine?: number;
  /** Noise on a new wish (±share), so equal options are picked in turn. */
  noise?: number;
  /** Income ticks the bot saves up for anti-air when enemy flyers outnumber its anti-air (0: never reacts). */
  antiAirWait?: number;
  /** The idle builder repairs an own building below this share of its HP (0 = never). */
  repairBelow?: number;
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
    itemsAfterMin: 8, items: ['chalice', 'boots', 'hammer'], repairBelow: 0.3,
    // Even a beginner notices flyers it can't hit, but reacts late and only half the time (see decide()).
    antiAirWait: 0,
  },
  normal: {
    think: Math.round(1.5 * TICK_RATE), maxQueue: 2, idle: 0.05, upgradeAfter: 4, specialAt: 7, planner: true, counter: true,
    saves: false, tidy: true, rescueAt: 6, rescueDelay: TICK_RATE, rescueAim: 0.5, upgradeBias: 1, rangedShare: 0.25, safeSpots: false, saveForSpecial: 10,
    itemsAfterMin: 6, items: ['aegis', 'hammer', 'war_horn'], repairBelow: 0.6,
    waitCost: 1.5, maxWait: 120, doctrine: 0.5, noise: 0.3, antiAirWait: 2.5,
  },
  hard: {
    think: Math.round(0.5 * TICK_RATE), maxQueue: 3, idle: 0, upgradeAfter: 3, specialAt: 5, planner: true, counter: true,
    saves: true, tidy: true, rescueAt: 3, rescueDelay: 0, rescueAim: 0, upgradeBias: 1, rangedShare: 0.4, safeSpots: false, saveForSpecial: 20,
    itemsAfterMin: 5, items: ['war_drum', 'war_horn', 'aegis'], repairBelow: 0.75,
    // Found with the simulation lab (npm run lab -- search / tune): a base behind the castle wins ~65% against one
    // around it, and striking early at small waves (rescueAt 3 instead of 8) another ~70%.
    place: 'back', waitCost: 1, maxWait: 180, doctrine: 0.3, noise: 0.15, antiAirWait: 4,
  },
  // Hard's brain, faster, without fog of war and with +30% income (AI_INCOME): openly cheating.
  brutal: {
    think: 3, maxQueue: 3, idle: 0, upgradeAfter: 3, specialAt: 5, planner: true, counter: true,
    saves: true, tidy: true, rescueAt: 3, rescueDelay: 0, rescueAim: 0, upgradeBias: 1, rangedShare: 0.4, safeSpots: false, saveForSpecial: 20,
    itemsAfterMin: 5, items: ['war_drum', 'war_horn', 'aegis'], repairBelow: 0.75, place: 'back', waitCost: 1, maxWait: 180, doctrine: 0.3, noise: 0.15, antiAirWait: 4, fullVision: true,
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
  /**
   * What this bot has seen of the enemy (id → type and when), so a wave of flyers that died at our
   * walls still counts a minute later, and a scouted base is remembered. A soft cache: losing it on
   * save/resume only makes the bot forget like a human after a break.
   */
  private intel = new Map<number, { type: string; kind: 'unit' | 'building'; tick: number }>();
  private profileCache: { tick: number; p: EnemyProfile } | null = null;

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
    if (s.phase !== 'playing' || s.phaseTicks > 0) { this.rescueSeenAt = -1; return []; }
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
    const save = this.saveBuilding(sim);
    if (save) return save;
    const threats = s.entities.filter((e) => e.kind === 'unit' && e.team !== me.team && e.hp > 0
      && (() => { const q = clampToRescueArea(me.team, e.x, e.y); return Math.hypot(e.x - q.x, e.y - q.y) < 1; })());
    if (!threats.length) { this.rescueSeenAt = -1; return null; }

    // Weight by unit strength; desperate castles fire earlier.
    const weight = (e: Entity) => Math.max(0.5, Math.sqrt(e.maxHp / 250));
    let best = { x: 0, y: 0, w: 0 };
    for (const t of threats) {
      // Lead the target slightly towards the castle (units keep walking during the 1 s delay).
      const d = Math.hypot(c.x - t.x, c.y - t.y) || 1;
      const lead = this.profile.rescueAim === 0 ? Math.min(1.5, d * 0.25) : 0;
      const x = t.x + ((c.x - t.x) / d) * lead, y = t.y + ((c.y - t.y) / d) * lead;
      if (!inRescueArea(me.team, x, y)) continue;
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
    ({ x, y } = clampToRescueArea(me.team, x, y));
    return { c: 'rescue', x, y };
  }

  /**
   * Strike to save a team building (or the castle) that's about to be destroyed: it is badly
   * damaged and enemy units are attacking it. Skipped if a teammate's strike is already on its way.
   */
  private saveBuilding(sim: Sim): Command | null {
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
      // Aim at the attackers' centre, pulled into the rescue area (our build zone).
      let x = attackers.reduce((a, e) => a + e.x, 0) / attackers.length;
      let y = attackers.reduce((a, e) => a + e.y, 0) / attackers.length;
      ({ x, y } = clampToRescueArea(me.team, x, y));
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

    // An idle builder repairs the most valuable badly damaged building (cheap: 35% of its price for a full repair).
    if (P.repairBelow && !queued.length && builder.repairId === undefined) {
      let best: Entity | undefined, bestW = 0;
      for (const b of mine) {
        const frac = b.hp / b.maxHp;
        if (b.buildLeft || frac >= P.repairBelow) continue;
        const w = (1 - frac) * (b.value ?? 1);
        if (w > bestW) { best = b; bestW = w; }
      }
      if (best && me.gold >= (1 - best.hp / best.maxHp) * (best.value ?? 0) * 0.35 * 0.5) return { c: 'repair', id: best.id };
    }

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
    const perTick = incomeFor(sim, this.player);
    // Enemy flyers outnumber our anti-air: the best anti-air spawner comes first, and the bot saves
    // up for it (hard ~40 s, normal ~25 s) instead of buying yet another ground spawner that can't
    // hit them. Easy reacts too, but only every other decision.
    const aa = (P.antiAirWait !== undefined && this.antiAirGap(sim, me, mine, queued) > 0 && (P.counter || this.rnd() < 0.5))
      ? options.filter((o) => o.kind === 'build' && o.def.spawn && canHitAir(UNITS[o.def.spawn.unit])).sort((a, b) => b.score - a.score)[0]
      : undefined;
    if (goal && goal.def.cost <= me.gold) pick = goal;
    else if (aa && aa.def.cost <= me.gold) pick = aa;
    else if (aa && aa.def.cost <= me.gold + perTick * (P.antiAirWait ?? 0)) return null;
    else if (P.planner) {
      pick = this.plan(sim, me, mine, options, perTick);
      if (!pick) return null;
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

  /**
   * Planner pick: every option's value (square-rooted, so one strong counter doesn't crowd out
   * everything else) is weighed by this round's doctrine and discounted by the time needed to save
   * for it. The bot then sticks to that wish while saving, unless something becomes much better.
   */
  private plan(sim: Sim, me: PlayerState, mine: Entity[], options: Option[], perTick: number): Option | undefined {
    const P = this.profile;
    const enemy = this.enemyProfile(sim, me);
    // The first spawner, and anything while the castle is under pressure, is bought right away.
    const urgent = !mine.some((e) => BUILDINGS[e.type].spawn) || enemy.pressure;
    const waitCost = urgent ? 8 : P.waitCost ?? 1.5, maxWait = urgent ? 8 : P.maxWait ?? 120;
    const doctrine = this.doctrineFor(sim);
    const perSec = Math.max(0.3, perTick) / (INCOME_INTERVAL_TICKS / TICK_RATE);
    // All gold is spent sooner or later, so what an option really costs in time is the wait on top of
    // the soonest affordable one (right after a purchase, everything is far away).
    const soonest = Math.min(...options.map((o) => o.def.cost));
    const rank = (o: Option) => {
      const cat = buildCategory(o.def, o.kind === 'upgrade');
      const extra = Math.max(0, o.def.cost - me.gold) - Math.max(0, soonest - me.gold);
      // A strategy bias (sparring partners) is worth saving up for longer.
      if (extra / perSec > maxWait * ((P.bias?.[cat] ?? 1) >= 2 ? 2.5 : 1)) return 0;
      return Math.sqrt(Math.max(0, o.score)) * (doctrine[cat] ?? 1) / (1 + (waitCost * extra) / o.def.cost);
    };
    const ranked = options.map((o) => ({ o, r: rank(o) })).filter((x) => x.r > 0);
    if (!ranked.length) return undefined;
    const best = ranked.reduce((a, b) => (b.r > a.r ? b : a));
    let want = this.wish ? ranked.find((x) => x.o.def.id === this.wish) : undefined;
    if (!want || best.r > want.r * 1.6) {
      const noise = P.noise ?? 0;
      want = ranked.map((x) => ({ ...x, n: x.r * (1 + noise * (this.rnd() * 2 - 1)) })).reduce((a, b) => (b.n > a.n ? b : a));
      this.wish = want.o.def.id;
    }
    if (want.o.def.cost > me.gold) return undefined;
    this.wish = null;
    return want.o;
  }

  private doctrine: { round: number; w: Partial<Record<BuildCategory, number>> } | null = null;

  /** This round's preferences per building category (redrawn every round). */
  private doctrineFor(sim: Sim): Partial<Record<BuildCategory, number>> {
    const round = sim.state.round;
    if (this.doctrine?.round === round) return this.doctrine.w;
    const sigma = this.profile.doctrine ?? 0;
    const w: Partial<Record<BuildCategory, number>> = {};
    for (const c of ['melee', 'ranged', 'air', 'swarm', 'siege', 'tower', 'aura', 'eco', 'upgrade', 'special'] as BuildCategory[]) {
      // Box–Muller normal draw → log-normal weight around 1.
      const g = Math.sqrt(-2 * Math.log(1 - this.rnd())) * Math.cos(2 * Math.PI * this.rnd());
      w[c] = Math.exp(sigma * g);
    }
    this.doctrine = { round, w };
    return w;
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
    const wantTowers = enemy.pressure ? 3 : spawners >= (P.counter ? 3 : 5) ? 1 + Math.floor(spawners / 6) : 0;

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
        // Planners keep a mixed army: each further copy of the same spawner (or its upgrades) is worth less.
        if (P.planner) score *= (P.counter ? 0.78 : 0.85) ** count((d) => d.id === def.id || !!def.upgrades?.includes(d.id));
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
    // Called for every option several times per decision: cache per enemy picture (one per tick).
    if (this.scoreCache.enemy !== enemy) this.scoreCache = { enemy, scores: new Map() };
    let v = this.scoreCache.scores.get(def.id);
    if (v === undefined) { v = this.computeSpawnScore(def, enemy); this.scoreCache.scores.set(def.id, v); }
    return v;
  }

  private scoreCache: { enemy: EnemyProfile | null; scores: Map<string, number> } = { enemy: null, scores: new Map() };

  private computeSpawnScore(def: BuildingDef, enemy: EnemyProfile): number {
    const sp = def.spawn!;
    const u = UNITS[sp.unit];
    // Faction abilities, folded into rough damage and toughness factors.
    const ab = abilityFactors(u);
    const dps = (u.dmg / u.cooldown * (u.chain ? 1 + (u.chain - 1) * 0.5 : 1) * (u.splash ? 1.6 : 1) * (u.heal ? 1.5 : 1)
      + (u.poison ? u.poison.dps * 0.8 : 0)) * (u.charge ? 1.25 : 1) * (u.bonusVs ? 1.15 : 1) * (u.ignoreArmor ? 1.15 : 1) * (u.aura ? 1.25 : 1) * ab.dmg;
    let hp = (u.hp * (1 + (u.lifesteal ?? 0) * 0.8 + (u.thorns ?? 0) * 0.6) + (u.regen ?? 0) * 8) * ab.hp;
    if (u.onDeath) hp += UNITS[u.onDeath.unit].hp * u.onDeath.count * 0.3;
    let power = Math.sqrt(hp * (1 + u.armor * 0.06) * dps) * sp.count / sp.interval;
    if (u.structuresOnly) power *= 0.6;
    // Anti-air specialists are only worth their price against flyers.
    if (u.airOnly) power *= enemy.total ? Math.min(1.6, (enemy.air / enemy.total) * 3) : 0.15;
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
    if (u.airOnly) return Math.max(0.2, f) ** 1.5; // judged by the share of flyers in computeSpawnScore
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

  /**
   * How many anti-air spawners we are short of (0: enough). The share of our spawners that can hit
   * flyers should follow the share of flyers in the enemy army (capped at 75%: someone still has
   * to fight the ground units). Queued builds count, so the bot doesn't queue three at once.
   */
  private antiAirGap(sim: Sim, me: PlayerState, mine: Entity[], queued: { building: string }[]): number {
    const enemy = this.enemyProfile(sim, me);
    const air = enemy.total ? enemy.air / enemy.total : 0;
    if (air < 0.15) return 0;
    const types = [...mine.map((e) => e.type), ...queued.map((o) => o.building)].map((t) => BUILDINGS[t]).filter((d) => d.spawn && !d.special);
    const aa = types.filter((d) => canHitAir(UNITS[d.spawn!.unit])).length;
    // Towers that shoot up help too, a bit.
    const towers = mine.filter((e) => BUILDINGS[e.type].attack?.targetsAir).length;
    const want = Math.max(1, Math.ceil(Math.min(0.75, air) * (types.length + 1)));
    return want - aa - Math.floor(towers / 2);
  }

  private enemyProfile(sim: Sim, me: PlayerState): EnemyProfile {
    if (this.profileCache?.tick === sim.state.tick) return this.profileCache.p;
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
    const tick = sim.state.tick;
    // Bots play under the same fog of war as humans: they only judge what their team has seen.
    const vision = teamVision(sim, me.team);
    const alive = new Set<number>();
    for (const e of sim.state.entities) {
      if (e.team === me.team || e.hp <= 0) continue;
      if (e.kind === 'building') alive.add(e.id);
      if (!this.profile.fullVision && e.kind !== 'castle' && !entityVisible(vision, KIND_CODES.indexOf(e.kind), e.type, e.x, e.y)) continue;
      if (e.kind === 'unit') {
        if (UNITS[e.type]) this.intel.set(e.id, { type: e.type, kind: 'unit', tick });
        if (Math.hypot(e.x - c.x, e.y - c.y) < 18) near++;
      } else if (e.kind === 'building' && BUILDINGS[e.type].spawn) this.intel.set(e.id, { type: e.type, kind: 'building', tick });
    }
    // Units seen within the last minute count (dead or alive: the next wave is coming), buildings
    // as long as they stand (their ruin is visible to everyone).
    for (const [id, m] of this.intel) {
      if (m.kind === 'unit') {
        if (tick - m.tick > INTEL_UNIT_TICKS) { this.intel.delete(id); continue; }
        const u = UNITS[m.type];
        // Small units still count: a cloud of moths is a threat even at 85 HP each.
        add(u, Math.max(0.6, u.hp / 200));
      } else {
        if (!alive.has(id)) { this.intel.delete(id); continue; }
        const sp = BUILDINGS[m.type].spawn!;
        const u = UNITS[sp.unit];
        add(u, Math.max(0.6, u.hp / 200) * sp.count * 2);
      }
    }
    p.pressure = near >= 6;
    this.profileCache = { tick, p };
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

/** Vision grid per simulation, team and tick: teammates share it (it's a whole-map pass). */
const VISION = new WeakMap<Sim, Map<number, { tick: number; grid: Uint8Array }>>();
function teamVision(sim: Sim, team: number): Uint8Array {
  const m = VISION.get(sim) ?? new Map<number, { tick: number; grid: Uint8Array }>();
  VISION.set(sim, m);
  const c = m.get(team);
  if (c?.tick === sim.state.tick) return c.grid;
  const grid = computeVision(team as 0 | 1, sim.state.entities.filter((e) => e.team === team));
  m.set(team, { tick: sim.state.tick, grid });
  return grid;
}

/** Units seen up to a minute ago still shape the bot's picture of the enemy army. */
const INTEL_UNIT_TICKS = 60 * TICK_RATE;

/** The unit can fight flyers (shoots up, or flies itself). */
const canHitAir = (u: UnitDef) => !!(u.targetsAir || u.air);

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
