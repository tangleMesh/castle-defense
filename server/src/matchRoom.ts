import {
  AiPlayer, CASTLE_FALL_SECONDS, SNAPSHOT_EVERY, filterSnapshot, TICK_RATE, botLevel, isBotId, makeSnapshot,
  type ClientMessage, type MatchInitPlayer, type PlayerCommand, type ServerMessage, type Sim, type SimEvent,
} from '@bc/shared';
import type { Conn } from './conn';
import type { Persistence } from './persistence';

const LIVE_SAVE_EVERY_TICKS = 30 * TICK_RATE;
const DISCONNECT_GRACE_MS = 60_000;
/** Longest the first start countdown waits for clients that are still loading. */
const LOAD_WAIT_MS = 20_000;

export interface MatchRoomOptions {
  matchId: string;
  name: string;
  sim: Sim;
  players: MatchInitPlayer[];
  hostId: string;
  resumed: boolean;
  startedAt: Date;
  persistence: Persistence;
  tickMs: number;
  /** Called once the match is over (finished, saved, or abandoned). */
  onClose: (reason: 'finished' | 'saved') => void;
}

/** Runs one match: fixed-step tick loop, command queue, snapshots, pause/save, persistence. */
export class MatchRoom {
  readonly id: string;
  private sim: Sim;
  private conns = new Map<string, Conn>();
  private queue: PlayerCommand[] = [];
  private pendingEvents: SimEvent[] = [];
  private timer: NodeJS.Timeout | null = null;
  private pauseVotes = new Set<string>();
  private disconnectedAt = new Map<string, number>();
  private lastPauseKey = '';
  private saving = false;
  private ticksSinceSave = 0;
  private closed = false;
  private ais: AiPlayer[] = [];
  /** Players whose client has the battlefield on screen (see `loading`). */
  private loaded = new Set<string>();
  private startedAt = Date.now();

  constructor(private o: MatchRoomOptions) {
    this.id = o.matchId;
    this.sim = o.sim;
    for (const p of o.players) {
      const level = botLevel(p.userId);
      if (level) this.ais.push(new AiPlayer(p.i, level, o.sim.state.tick + p.i * 7919 + 1));
    }
  }

  get players() {
    return this.o.players;
  }

  playerIndex(userId: string) {
    return this.o.players.find((p) => p.userId === userId)?.i ?? -1;
  }

  start() {
    for (const p of this.sim.state.players) p.connected = isBotId(p.userId) || this.conns.has(p.userId);
    this.startedAt = Date.now();
    this.timer = setInterval(() => this.tick(), this.o.tickMs);
    void this.persist('live');
  }

  attach(conn: Conn) {
    const i = this.playerIndex(conn.userId);
    if (i < 0) return;
    this.conns.set(conn.userId, conn);
    this.disconnectedAt.delete(conn.userId);
    this.sim.state.players[i].connected = true;
    conn.send({
      type: 'match.init', matchId: this.id, you: i, players: this.o.players,
      bestOf: this.sim.state.bestOf, hostId: this.o.hostId, resumed: this.o.resumed,
    });
    conn.send({ type: 'match.snapshot', snap: filterSnapshot(makeSnapshot(this.sim, []), this.sim.state.players[i].team) });
    this.broadcastPause(true);
  }

  /** `left`: the player quit on purpose, so the match does not wait for them. */
  detach(userId: string, left = false) {
    if (!this.conns.delete(userId)) return;
    const i = this.playerIndex(userId);
    if (i >= 0) this.sim.state.players[i].connected = false;
    if (left) this.disconnectedAt.delete(userId);
    else this.disconnectedAt.set(userId, Date.now());
    this.pauseVotes.delete(userId);
    if (this.conns.size === 0) {
      // Everybody is gone: keep the game resumable instead of simulating to nobody.
      void this.saveAndClose();
      return;
    }
    this.broadcastPause(true);
  }

  handle(conn: Conn, msg: ClientMessage) {
    const i = this.playerIndex(conn.userId);
    if (i < 0) return;
    switch (msg.type) {
      case 'cmd':
        if (this.queue.length < 2000) this.queue.push({ player: i, cmd: msg.cmd });
        return;
      case 'game.pause':
        if (msg.pause) this.pauseVotes.add(conn.userId); else this.pauseVotes.delete(conn.userId);
        this.broadcastPause(true);
        return;
      case 'match.loaded':
        this.loaded.add(conn.userId);
        this.broadcastPause(true);
        return;
      case 'game.saveAndExit':
        if (conn.userId !== this.o.hostId) return conn.send({ type: 'error', message: 'Only the host can save & exit' });
        void this.saveAndClose();
        return;
      case 'chat': {
        // Shift+Enter: everyone (scope 'match'); Enter: the sender's team only.
        if (msg.all) { this.broadcast({ type: 'chat', from: conn.username, text: msg.text, scope: 'match' }); return; }
        const team = this.o.players.find((p) => p.userId === conn.userId)?.team;
        const mates = new Set(this.o.players.filter((p) => p.team === team).map((p) => p.userId));
        const json = JSON.stringify({ type: 'chat', from: conn.username, text: msg.text, scope: 'team' } satisfies ServerMessage);
        for (const [userId, c] of this.conns) if (mates.has(userId)) c.sendRaw(json);
        return;
      }
    }
  }

  // ---------------------------------------------------------------- loop

  /**
   * Connected players still loading the battlefield while the round's start countdown is pending.
   * The countdown waits for them (at most LOAD_WAIT_MS), so a slow loader doesn't lose its 5 s.
   */
  private loading(now: number): string[] {
    const s = this.sim.state;
    if (s.phase !== 'playing' || s.phaseTicks <= 0 || now - this.startedAt > LOAD_WAIT_MS) return [];
    return [...this.conns.keys()].filter((u) => !this.loaded.has(u)).map((u) => this.o.players.find((p) => p.userId === u)?.name ?? '?');
  }

  private isPaused(): { paused: boolean; reason: string; waitingFor: string[]; resumeIn?: number } {
    const now = Date.now();
    const loading = this.loading(now);
    if (loading.length) return { paused: true, reason: 'Waiting for players to load the battlefield', waitingFor: loading, resumeIn: Math.ceil((LOAD_WAIT_MS - (now - this.startedAt)) / 1000) };
    const waiting = [...this.disconnectedAt.entries()].filter(([, at]) => now - at < DISCONNECT_GRACE_MS);
    if (waiting.length) {
      const names = waiting.map(([u]) => this.o.players.find((p) => p.userId === u)?.name ?? '?');
      const resumeIn = Math.ceil((DISCONNECT_GRACE_MS - (now - Math.min(...waiting.map(([, at]) => at)))) / 1000);
      return { paused: true, reason: 'Waiting for players to reconnect', waitingFor: names, resumeIn };
    }
    const connected = this.conns.size;
    if (this.pauseVotes.size > 0 && this.pauseVotes.size * 2 >= connected) {
      return { paused: true, reason: 'Paused by vote', waitingFor: [] };
    }
    return { paused: false, reason: '', waitingFor: [] };
  }

  private broadcastPause(force = false) {
    const p = this.isPaused();
    const votes = [...this.pauseVotes].map((u) => this.o.players.find((x) => x.userId === u)?.name ?? '?');
    const key = JSON.stringify([p.paused, p.reason, p.waitingFor, votes, p.resumeIn]);
    if (!force && key === this.lastPauseKey) return;
    this.lastPauseKey = key;
    this.broadcast({ type: 'match.paused', ...p, votes });
  }

  private tick() {
    if (this.closed) return;
    const pause = this.isPaused();
    this.broadcastPause();
    if (pause.paused) return;

    const cmds = this.queue;
    this.queue = [];
    for (const ai of this.ais) for (const cmd of ai.update(this.sim)) cmds.push({ player: ai.player, cmd });
    const events = this.sim.step(cmds);
    for (const ev of events) this.pendingEvents.push(ev);

    const state = this.sim.state;
    if (state.tick % SNAPSHOT_EVERY === 0 || state.phase === 'matchOver') this.flushSnapshot();

    this.ticksSinceSave++;
    const roundChanged = events.some((e) => e.t === 'round');
    if (state.phase === 'matchOver') {
      void this.finish();
    } else if (roundChanged || this.ticksSinceSave >= LIVE_SAVE_EVERY_TICKS) {
      this.ticksSinceSave = 0;
      void this.persist('live');
    }
  }

  private flushSnapshot() {
    const events = this.pendingEvents;
    this.pendingEvents = [];
    const shared = events.filter((e) => e.t !== 'err');
    const errs = events.filter((e): e is Extract<SimEvent, { t: 'err' }> => e.t === 'err');
    const full = makeSnapshot(this.sim, shared);
    // Fog of war: each team only receives what it can see.
    const perTeam = [filterSnapshot(full, 0), filterSnapshot(full, 1)];
    const base = perTeam.map((snap) => JSON.stringify({ type: 'match.snapshot', snap }));
    for (const conn of this.conns.values()) {
      const i = this.playerIndex(conn.userId);
      const team = this.sim.state.players[i].team;
      const mine = errs.filter((e) => e.p === i);
      if (!mine.length) conn.sendRaw(base[team]);
      else conn.send({ type: 'match.snapshot', snap: { ...perTeam[team], ev: [...perTeam[team].ev, ...mine] } });
    }
  }

  private broadcast(msg: ServerMessage) {
    const json = JSON.stringify(msg);
    for (const c of this.conns.values()) c.sendRaw(json);
  }

  // ---------------------------------------------------------------- persistence

  private async persist(status: 'live' | 'saved') {
    if (this.saving) return;
    this.saving = true;
    try {
      await this.o.persistence.savedGames.snapshot(this.id, this.sim.serialize(), status);
    } catch (err) {
      console.error('[match] snapshot failed', err);
    } finally {
      this.saving = false;
    }
  }

  private stop() {
    this.closed = true;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async saveAndClose() {
    if (this.closed) return;
    this.stop();
    // Wait for an in-flight live save so ours lands last.
    while (this.saving) await new Promise((r) => setTimeout(r, 10));
    await this.persist('saved');
    this.broadcast({ type: 'match.end', reason: 'saved', score: [...this.sim.state.score] as [number, number] });
    this.o.onClose('saved');
  }

  private async finish() {
    if (this.closed) return;
    this.stop();
    const s = this.sim.state;
    const winner = s.winner!;
    // Let every client play the castle-collapse cinematic before the result screen
    // (scaled with the tick speed so accelerated test matches don't wait).
    await new Promise((r) => setTimeout(r, CASTLE_FALL_SECONDS * 1000 * Math.min(1, this.o.tickMs / (1000 / TICK_RATE))));
    this.broadcast({ type: 'match.end', reason: 'finished', winner, score: [s.score[0], s.score[1]] });
    const { persistence: db } = this.o;
    try {
      while (this.saving) await new Promise((r) => setTimeout(r, 10));
      await db.matches.insert({
        _id: this.id,
        players: s.players.map((p) => ({
          userId: p.userId, name: p.name, team: p.team, faction: p.faction,
          kills: p.kills, strikes: p.strikes, goldEarned: p.goldEarned,
        })),
        bestOf: s.bestOf,
        rounds: s.rounds.map((r) => ({ winner: r.winner, durationTicks: r.ticks })),
        score: [s.score[0], s.score[1]],
        winnerTeam: winner,
        startedAt: this.o.startedAt,
        endedAt: new Date(),
      });
      await Promise.all(s.players.filter((p) => !isBotId(p.userId)).map((p) => db.users.addStats(p.userId, {
        matches: 1,
        wins: p.team === winner ? 1 : 0,
        losses: p.team === winner ? 0 : 1,
        roundsWon: s.score[p.team],
        unitsKilled: p.kills,
        rescueStrikesUsed: p.strikes,
      })));
      await db.savedGames.finish(this.id);
    } catch (err) {
      console.error('[match] failed to record result', err);
    }
    this.o.onClose('finished');
  }

  /** Server shutdown: save state so the match can be resumed later. */
  async shutdown() {
    await this.saveAndClose();
  }
}
