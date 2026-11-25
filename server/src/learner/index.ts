import { monitorEventLoopDelay } from 'node:perf_hooks';
import { Worker } from 'node:worker_threads';
import {
  PLAN_IDS, MAX_SKILL, eloForSkill, expectedScore, addPlanResults, addSkillResult, curveFromState, freshLearnedState, setModels, setSkillCurve, setStrategyStats, statKey,
  FACTION_IDS, type LearnedState, type Participant, type PlanRecord, type Sample,
} from '@bc/shared';
import type { Persistence } from '../persistence';
import type { FromWorker, ToWorker, SelfPlayResult, ModelKind } from './worker';

export type LearnerMode = 'off' | 'idle' | 'always';

export interface LearnerOptions {
  /**
   * off: only use what was learned so far (no background games);
   * idle: self-play only while no match runs and the machine is quiet (default);
   * always: self-play continuously (still at the lowest CPU priority).
   */
  mode: LearnerMode;
  /** A real match is running (idle mode pauses self-play). */
  busy: () => boolean;
  /** Upper limit on self-play games per hour (default: none, one game right after another). */
  gamesPerHour?: number;
}

/** Elo step for skill calibration: real matches (with humans) move it much more than self-play. */
const K_SELF = 4, K_REAL = 16;
/** Real rounds count this much more than self-play rounds in the strategy stats. */
const REAL_WEIGHT = 3;

/**
 * The background learner: keeps the bots' knowledge (which plans win, how strong each skill is on
 * the Elo scale) up to date from every real match and from self-play games in idle time, persists
 * it, and hands it to the live bots and the self-play worker.
 */
export class Learner {
  state: LearnedState = freshLearnedState();
  private worker: Worker | null = null;
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private lag = monitorEventLoopDelay({ resolution: 20 });
  private lastSave = Date.now();
  private unsaved = 0;
  private gameTimes: number[] = [];
  private lastResult: { at: Date; seconds: number } | null = null;

  constructor(private db: Persistence, private o: LearnerOptions) {}

  async start() {
    try {
      const doc = await this.db.learner.load();
      if (doc && doc.version === this.state.version && doc.skillElo?.length === this.state.skillElo.length) {
        const { _id: _i, updatedAt: _u, ...rest } = doc;
        // Fields added later get their defaults.
        this.state = { ...freshLearnedState(), ...rest };
      }
    } catch (err) {
      console.error('[learner] could not load the learned state', err);
    }
    this.apply();
    if (this.o.mode === 'off') return;
    this.lag.enable();
    await this.spawnWorker();
    this.timer = setInterval(() => this.throttle(), 2000);
    this.timer.unref();
  }

  /** Worker health, for the status page: is it alive, how often it had to be restarted, why. */
  private health = { restarts: 0, lastError: null as string | null, lastErrorAt: null as Date | null, lastActivity: Date.now(), startedAt: new Date() };
  private stopping = false;
  private pausedBecause: string | null = null;
  private respawn: NodeJS.Timeout | null = null;

  /**
   * Starts the self-play worker and hands it what was learned so far. If it ever dies (an error,
   * running out of memory) it is restarted after a short pause, so the learner never stops for good.
   */
  private async spawnWorker() {
    // The worker gets its own memory cap: if it ever needs more it is restarted, it can never take
    // the game server (and the running matches) down with it.
    const w = new Worker(new URL('./worker-boot.mjs', import.meta.url), { resourceLimits: { maxOldGenerationSizeMb: Number(process.env.LEARNER_MAX_MB) || 256 } });
    this.worker = w;
    this.health.lastActivity = Date.now();
    this.health.startedAt = new Date();
    w.on('message', (m: FromWorker) => {
      this.health.lastActivity = Date.now();
      if (m.t === 'game') this.onSelfPlay(m.result);
      else if (m.t === 'bench') this.onBenchmark(m.vs, m.learnedWon);
      else if (m.t === 'model') { this.state.modelAccuracy[m.kind] = m.accuracy; this.onModel(m.kind, m.model, m.valLoss, m.championLoss, m.samples); }
      else if (m.t === 'error') this.noteError(`game error: ${m.message}`);
    });
    w.on('error', (e) => this.noteError(`worker crashed: ${e instanceof Error ? e.message : String(e)}`));
    w.on('exit', (code) => {
      if (this.worker !== w) return;
      this.worker = null;
      if (this.stopping) return;
      if (code !== 0) this.noteError(`worker exited with code ${code}`);
      this.scheduleRespawn();
    });
    this.post({ t: 'state', strategy: this.state.strategy, curve: curveFromState(this.state) });
    this.post({ t: 'models', models: this.modelSet() });
    this.post({ t: 'run', on: this.running, restMs: 200 });
    // The worker trains on human samples kept from earlier matches too.
    try {
      const [value, policy] = await Promise.all([this.db.learner.recentSamples('value', 20_000), this.db.learner.recentSamples('policy', 20_000)]);
      this.post({ t: 'samples', value, policy });
    } catch (err) { console.error('[learner] could not load samples', err); }
  }

  private noteError(msg: string) {
    console.error('[learner]', msg);
    this.health.lastError = msg;
    this.health.lastErrorAt = new Date();
  }

  /** Restart the worker after a pause that grows with repeated failures (5 s … 5 min). */
  private scheduleRespawn() {
    if (this.respawn || this.stopping) return;
    const delay = Math.min(300_000, 5_000 * 2 ** Math.min(6, this.health.restarts));
    this.health.restarts++;
    console.error(`[learner] restarting the self-play worker in ${Math.round(delay / 1000)} s`);
    this.respawn = setTimeout(() => { this.respawn = null; if (!this.stopping) void this.spawnWorker(); }, delay);
    this.respawn.unref();
  }

  async stop() {
    this.stopping = true;
    if (this.respawn) clearTimeout(this.respawn);
    if (this.timer) clearInterval(this.timer);
    this.lag.disable();
    if (this.worker) { this.post({ t: 'stop' }); await this.worker.terminate().catch(() => {}); this.worker = null; }
    await this.save();
  }

  private post(m: ToWorker) {
    this.worker?.postMessage(m);
  }

  /** Runs self-play only when allowed: mode, no live match, a calm event loop and spare CPU. */
  private throttle() {
    const now = Date.now();
    this.gameTimes = this.gameTimes.filter((t) => now - t < 3600_000);
    const perHour = this.o.gamesPerHour ?? Infinity;
    // Only this server's own event loop counts. The load average is the whole host's: in a container
    // on a shared machine, other apps kept it high and idle mode never ran. The worker runs at the
    // lowest CPU priority and inside the container's CPU limit anyway.
    const lagMs = this.lag.mean / 1e6;
    const calm = !(lagMs >= 30);
    this.lag.reset();
    const busy = this.o.busy();
    const limited = this.gameTimes.length >= perHour;
    this.pausedBecause = this.o.mode === 'off' ? 'learner off'
      : limited ? 'games-per-hour limit reached'
      : this.o.mode === 'idle' && busy ? 'a match is running (idle mode)'
      : this.o.mode === 'idle' && !calm ? `server busy (event loop lag ${Math.round(lagMs)} ms, idle mode)`
      : !this.worker ? 'worker restarting'
      : null;
    const want = this.o.mode === 'always' || (this.o.mode === 'idle' && !busy && calm);
    const on = want && !limited;
    if (on !== this.running) { this.running = on; this.health.lastActivity = Date.now(); }
    // Watchdog: a running worker that hasn't finished anything in 20 minutes is stuck: replace it.
    if (this.worker && this.running && Date.now() - this.health.lastActivity > 20 * 60_000) {
      this.noteError('worker stopped reporting (stuck): restarting it');
      const w = this.worker;
      this.worker = null;
      void w.terminate().catch(() => {});
      this.scheduleRespawn();
    }
    // Unlimited: the next game starts right after the last (a short breather to stay polite);
    // with a limit, games are spaced out evenly over the hour.
    this.post({ t: 'run', on, restMs: Number.isFinite(perHour) ? Math.max(2000, 3600_000 / perHour - 4000) : 200 });
    if (this.unsaved && (this.unsaved >= 20 || now - this.lastSave > 120_000)) void this.save();
  }

  /** Hands the learned knowledge to the bots of this process and to the worker. */
  private apply() {
    setStrategyStats(this.state.strategy);
    const curve = curveFromState(this.state);
    setSkillCurve(curve);
    setModels(this.modelSet());
    this.post({ t: 'state', strategy: this.state.strategy, curve });
  }

  private modelSet() {
    const s = this.state;
    return { ...s.models, enabled: s.modelsEnabled, version: s.modelVersion };
  }

  /** The worker found a model that predicts held-out games better: it becomes the live one. */
  private onModel(kind: ModelKind, model: NonNullable<LearnedState['models']['value']>, valLoss: number, championLoss: number | null, samples: number) {
    const s = this.state;
    s.models = { ...s.models, [kind]: model };
    s.modelVersion++;
    s.history = [...s.history, { version: s.modelVersion, at: new Date().toISOString(), models: s.models }].slice(-5);
    // A new policy model (it changes how bots play) gets a fresh chance in the A/B games.
    if (kind === 'policy') { s.modelsEnabled = true; s.modelEdge = [0, 0]; }
    this.lastModel = { kind, valLoss, championLoss, samples, at: new Date() };
    this.apply();
    this.post({ t: 'models', models: this.modelSet() });
    this.unsaved++;
    void this.save();
  }

  private lastModel: { kind: ModelKind; valLoss: number; championLoss: number | null; samples: number; at: Date } | null = null;

  /** A benchmark game finished (learning bot vs the fixed Hard or Brutal bot). */
  private onBenchmark(vs: 'hard' | 'brutal', learnedWon: boolean) {
    const b = vs === 'brutal' ? this.state.benchmarkBrutal : this.state.benchmark;
    b.recent = [b.recent[0] * 0.995 + (learnedWon ? 1 : 0), b.recent[1] * 0.995 + 1];
    b.total = [b.total[0] + (learnedWon ? 1 : 0), b.total[1] + 1];
    // A point for the trend every 50 benchmark games.
    if (b.total[1] % 50 === 0) b.history = [...b.history, { at: new Date().toISOString(), games: b.total[1], winRate: round2(b.recent[0] / b.recent[1]) }].slice(-200);
    this.unsaved++;
  }

  /** Switches back to an earlier model version (admin). */
  rollback(version: number): boolean {
    const h = this.state.history.find((x) => x.version === version);
    if (!h) return false;
    this.state.models = h.models;
    this.state.modelsEnabled = true;
    this.state.modelEdge = [0, 0];
    this.apply();
    this.post({ t: 'models', models: this.modelSet() });
    this.unsaved++;
    void this.save();
    return true;
  }

  /** Turns the learned models on or off for all bots (admin). */
  setModelsEnabled(on: boolean) {
    this.state.modelsEnabled = on;
    this.state.modelEdge = [0, 0];
    this.apply();
    this.post({ t: 'models', models: this.modelSet() });
    this.unsaved++;
    void this.save();
  }

  private onSelfPlay(r: SelfPlayResult) {
    this.gameTimes.push(Date.now());
    this.lastResult = { at: new Date(), seconds: r.seconds };
    addPlanResults(this.state.strategy, r.players.flatMap((p) => p.log), 1);
    addSkillResult(this.state, r.players.map((p) => ({ team: p.team, skill: p.skill })), r.winner, K_SELF);
    this.state.selfPlayGames++;
    // A/B check: one side with the models, the other without. If the model side keeps losing,
    // the models are switched off until a better one arrives.
    const side = (t: 0 | 1) => r.players.filter((p) => p.team === t);
    const uses = (t: 0 | 1) => side(t).every((p) => p.models), none = (t: 0 | 1) => side(t).every((p) => !p.models);
    const modelTeam = uses(0) && none(1) ? 0 : uses(1) && none(0) ? 1 : null;
    if (modelTeam !== null && this.state.models.policy) {
      const e = this.state.modelEdge;
      e[0] = e[0] * 0.995 + (r.winner === modelTeam ? 1 : 0);
      e[1] = e[1] * 0.995 + 1;
      if (this.state.modelsEnabled && e[1] >= 80 && e[0] / e[1] < 0.45) {
        this.state.modelsEnabled = false;
        console.warn(`[learner] models off: model side won only ${Math.round((100 * e[0]) / e[1])}% of A/B games`);
        this.apply();
        this.post({ t: 'models', models: this.modelSet() });
      }
    }
    this.unsaved++;
    if (this.state.selfPlayGames % 5 === 0) this.apply();
  }

  /**
   * A real match finished: its bots' plans and results feed the strategy stats, and the result
   * against the humans' known ratings calibrates the skill curve.
   */
  recordMatch(players: Participant[], winner: 0 | 1, plans: PlanRecord[], humans: number, samples?: { value: Sample[]; policy: Sample[] }) {
    // Bots vs people: one team only Auto bots, the other only rated players (humans).
    for (const t of [0, 1] as const) {
      const bots = players.filter((p) => p.team === t), people = players.filter((p) => p.team !== t);
      if (!bots.length || !people.length || !bots.every((p) => 'skill' in p) || !people.every((p) => 'rating' in p) || !humans) continue;
      const avg = (v: number[]) => v.reduce((s, x) => s + x, 0) / v.length;
      const botElo = avg(bots.map((p) => eloForSkill((p as { skill: number }).skill)));
      const humanElo = avg(people.map((p) => (p as { rating: number }).rating));
      const h = this.state.vsHumans;
      h.games++; h.wins += winner === t ? 1 : 0; h.expected += expectedScore(botElo, humanElo);
    }
    // Training samples (human play is kept in the database: it's what makes bots play like people).
    if (samples && (samples.value.length || samples.policy.length)) {
      this.post({ t: 'samples', value: samples.value, policy: samples.policy });
      if (humans) {
        void this.db.learner.addSamples('value', samples.value).catch((err) => console.error('[learner] samples', err));
        void this.db.learner.addSamples('policy', samples.policy.filter((x) => x.human)).catch((err) => console.error('[learner] samples', err));
      }
    }
    addPlanResults(this.state.strategy, plans, humans ? REAL_WEIGHT : 1);
    if (players.some((p) => 'skill' in p)) addSkillResult(this.state, players, winner, humans ? K_REAL : K_SELF);
    this.state.realGames++;
    this.unsaved++;
    this.apply();
    void this.save();
  }

  async save() {
    if (!this.unsaved) return;
    this.unsaved = 0;
    this.lastSave = Date.now();
    try { await this.db.learner.save(this.state); } catch (err) { console.error('[learner] save failed', err); }
  }

  /** How good the bots are, measured three ways (see status().strength). */
  private strength() {
    const s = this.state, b = s.benchmark, h = s.vsHumans;
    const rate = b.recent[1] ? round2(b.recent[0] / b.recent[1]) : null;
    const br = s.benchmarkBrutal, brutalRate = br.recent[1] ? round2(br.recent[0] / br.recent[1]) : null;
    const curve = curveFromState(s);
    const bench = (x: typeof b, explain: string) => ({
      explain, winRate: x.recent[1] ? round2(x.recent[0] / x.recent[1]) : null, recentGames: Math.round(x.recent[1]), totalGames: x.total[1],
      allTimeWinRate: x.total[1] ? round2(x.total[0] / x.total[1]) : null, trend: x.history.slice(-20),
    });
    return {
      summary: rate === null ? 'No benchmark games yet.'
        : `The learning bot wins ${Math.round(rate * 100)}% against the original Hard bot${brutalRate === null ? '' : ` and ${Math.round(brutalRate * 100)}% against the original Brutal bot`} (50% = no better). Strongest bot plays at ~${Math.round(eloForSkill(MAX_SKILL, curve))} Elo, Hard-level at ~${Math.round(eloForSkill(1, curve))}.`,
      vsOriginalHard: bench(b, 'Learning Auto bot (skill 1 = Hard strength, with plans, experience and models) vs the original Hard bot that never learns, same faction. 50% = equal; above = learning helped.'),
      vsOriginalBrutal: bench(br, 'The same at the top end: learning Auto bot at skill 1.2 (= Brutal strength) vs the original Brutal bot (Hard\'s brain with faster reactions, no cheats), same faction.'),
      eloScale: {
        explain: 'What Elo bots really play at, calibrated from results (real matches count most).',
        strongestBot: Math.round(eloForSkill(MAX_SKILL, curve)),
        hardLevel: Math.round(eloForSkill(1, curve)),
        normalLevel: Math.round(eloForSkill(0.5, curve)),
        weakestBot: Math.round(eloForSkill(0, curve)),
      },
      vsHumans: {
        explain: 'Real matches with only bots on one side and only people on the other: how often the bots won, and how often Elo expected them to.',
        games: h.games, botWinRate: h.games ? round2(h.wins / h.games) : null, expectedWinRate: h.games ? round2(h.expected / h.games) : null,
      },
      models: {
        explain: 'Held-out samples the live models get right: value = predicting the round winner (50% = guessing), policy = which kind of building is built next (10 kinds).',
        valueAccuracy: s.modelAccuracy.value !== undefined ? round2(s.modelAccuracy.value) : null,
        policyAccuracy: s.modelAccuracy.policy !== undefined ? round2(s.modelAccuracy.policy) : null,
      },
    };
  }

  /** Public summary (GET /api/learner). */
  status() {
    const s = this.state;
    const best: Record<string, { plan: string; winRate: number; games: number }> = {};
    for (const f of FACTION_IDS) {
      let top: { plan: string; winRate: number; games: number } | null = null;
      for (const plan of PLAN_IDS) {
        const [w, n] = s.strategy[statKey(f, plan, '*')] ?? [0, 0];
        if (n < 3) continue;
        const rate = (w + 1) / (n + 2);
        if (!top || rate > top.winRate) top = { plan, winRate: Math.round(rate * 100) / 100, games: Math.round(n) };
      }
      if (top) best[f] = top;
    }
    return {
      mode: this.o.mode,
      selfPlayRunning: this.running && !!this.worker,
      pausedBecause: this.running && this.worker ? null : this.pausedBecause,
      worker: {
        alive: !!this.worker,
        restarts: this.health.restarts,
        lastError: this.health.lastError,
        lastErrorAt: this.health.lastErrorAt,
        lastActivity: new Date(this.health.lastActivity),
        memoryMB: Math.round(process.memoryUsage().rss / 1e6),
      },
      selfPlayGames: s.selfPlayGames,
      realGames: s.realGames,
      gamesLastHour: this.gameTimes.length,
      lastSelfPlay: this.lastResult,
      strength: this.strength(),
      skillCurve: curveFromState(s),
      bestOpenings: best,
      models: {
        version: s.modelVersion,
        enabled: s.modelsEnabled,
        value: !!s.models.value,
        policy: !!s.models.policy,
        abWinRate: s.modelEdge[1] ? Math.round((100 * s.modelEdge[0]) / s.modelEdge[1]) / 100 : null,
        abGames: Math.round(s.modelEdge[1]),
        lastTrained: this.lastModel,
        history: s.history.map((h) => ({ version: h.version, at: h.at })),
      },
    };
  }
}

const round2 = (v: number) => Math.round(v * 100) / 100;
