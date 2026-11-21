import { availableParallelism, loadavg } from 'node:os';
import { monitorEventLoopDelay } from 'node:perf_hooks';
import { Worker } from 'node:worker_threads';
import {
  PLAN_IDS, addPlanResults, addSkillResult, curveFromState, freshLearnedState, setSkillCurve, setStrategyStats, statKey,
  FACTION_IDS, type LearnedState, type Participant, type PlanRecord,
} from '@bc/shared';
import type { Persistence } from '../persistence';
import type { FromWorker, ToWorker, SelfPlayResult } from './worker';

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
  /** Upper limit on self-play games per hour (also spaces them out). */
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
        this.state = rest;
      }
    } catch (err) {
      console.error('[learner] could not load the learned state', err);
    }
    this.apply();
    if (this.o.mode === 'off') return;
    this.worker = new Worker(new URL('./worker-boot.mjs', import.meta.url));
    this.worker.on('message', (m: FromWorker) => { if (m.t === 'game') this.onSelfPlay(m.result); });
    this.worker.on('error', (e) => { console.error('[learner worker]', e); this.worker = null; });
    this.lag.enable();
    this.post({ t: 'state', strategy: this.state.strategy, curve: curveFromState(this.state) });
    this.timer = setInterval(() => this.throttle(), 2000);
    this.timer.unref();
  }

  async stop() {
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
    const perHour = this.o.gamesPerHour ?? 400;
    const calm = this.lag.mean / 1e6 < 30 && loadavg()[0] < availableParallelism() * 0.6;
    this.lag.reset();
    const want = this.o.mode === 'always' || (this.o.mode === 'idle' && !this.o.busy() && calm);
    const on = want && this.gameTimes.length < perHour;
    if (on !== this.running) { this.running = on; }
    // Space games out evenly over the hour (at least 2 s apart).
    this.post({ t: 'run', on, restMs: Math.max(2000, 3600_000 / perHour - 4000) });
    if (this.unsaved && (this.unsaved >= 20 || now - this.lastSave > 120_000)) void this.save();
  }

  /** Hands the learned knowledge to the bots of this process and to the worker. */
  private apply() {
    setStrategyStats(this.state.strategy);
    const curve = curveFromState(this.state);
    setSkillCurve(curve);
    this.post({ t: 'state', strategy: this.state.strategy, curve });
  }

  private onSelfPlay(r: SelfPlayResult) {
    this.gameTimes.push(Date.now());
    this.lastResult = { at: new Date(), seconds: r.seconds };
    addPlanResults(this.state.strategy, r.players.flatMap((p) => p.log), 1);
    addSkillResult(this.state, r.players.map((p) => ({ team: p.team, skill: p.skill })), r.winner, K_SELF);
    this.state.selfPlayGames++;
    this.unsaved++;
    if (this.state.selfPlayGames % 5 === 0) this.apply();
  }

  /**
   * A real match finished: its bots' plans and results feed the strategy stats, and the result
   * against the humans' known ratings calibrates the skill curve.
   */
  recordMatch(players: Participant[], winner: 0 | 1, plans: PlanRecord[], humans: number) {
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
      selfPlayRunning: this.running,
      selfPlayGames: s.selfPlayGames,
      realGames: s.realGames,
      gamesLastHour: this.gameTimes.length,
      lastSelfPlay: this.lastResult,
      skillCurve: curveFromState(s),
      bestOpenings: best,
    };
  }
}
