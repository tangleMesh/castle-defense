import {
  BUILDINGS, MAP, ROCK_GRID, TICK_RATE, basicPlacementError, isFullyConnected,
  type Command, type EntRow, type MatchInitPlayer, type ServerMessage, type SimEvent, type Snapshot, type Team,
} from '@bc/shared';
import type { Socket } from '../net/socket';

export type Mode =
  | { kind: 'none' }
  | { kind: 'place'; building: string }
  | { kind: 'rescue' };

export interface PauseInfo {
  paused: boolean;
  reason: string;
  waitingFor: string[];
  votes: string[];
  resumeIn?: number;
}

interface Buffered {
  /** Local time (ms) at which this snapshot should be displayed. */
  t: number;
  snap: Snapshot;
  byId: Map<number, EntRow>;
  processed: boolean;
}

const TICK_MS = 1000 / TICK_RATE;
const INTERP_DELAY = 110;

/** Client-side view of a running match: snapshot buffer, selection, input mode, commands. */
export class MatchSession {
  readonly matchId: string;
  readonly you: number;
  readonly team: Team;
  readonly players: MatchInitPlayer[];
  readonly hostId: string;
  buffer: Buffered[] = [];
  latest!: Snapshot;
  latestById = new Map<number, EntRow>();
  selection: number | null = null;
  mode: Mode = { kind: 'none' };
  pause: PauseInfo = { paused: false, reason: '', waitingFor: [], votes: [] };
  ended: Extract<ServerMessage, { type: 'match.end' }> | null = null;
  private offset: number | null = null;
  private listeners = new Map<string, Set<(arg?: unknown) => void>>();

  constructor(init: Extract<ServerMessage, { type: 'match.init' }>, private socket: Socket, readonly userId: string) {
    this.matchId = init.matchId;
    this.you = init.you;
    this.players = init.players;
    this.hostId = init.hostId;
    this.team = init.players[init.you].team;
  }

  get isHost() { return this.userId === this.hostId; }
  get me() { return this.latest?.players[this.you]; }

  // ---------------------------------------------------------------- events

  on(name: 'snapshot' | 'event' | 'mode' | 'selection' | 'pause' | 'end' | 'chat', fn: (arg?: any) => void) {
    let s = this.listeners.get(name);
    if (!s) this.listeners.set(name, (s = new Set()));
    s.add(fn);
    return () => s!.delete(fn);
  }

  private emit(name: string, arg?: unknown) {
    this.listeners.get(name)?.forEach((fn) => fn(arg));
  }

  // ---------------------------------------------------------------- network

  receive(msg: ServerMessage) {
    switch (msg.type) {
      case 'match.snapshot': return this.addSnapshot(msg.snap);
      case 'match.paused': this.pause = msg; this.emit('pause', msg); return;
      case 'match.end': this.ended = msg; this.emit('end', msg); return;
      case 'chat': this.emit('chat', msg); return;
    }
  }

  private addSnapshot(snap: Snapshot) {
    const now = performance.now();
    const serverT = snap.tick * TICK_MS;
    const target = now - serverT;
    if (this.offset === null || Math.abs(target - this.offset) > 250) this.offset = target;
    else this.offset = this.offset * 0.95 + target * 0.05;
    const byId = new Map<number, EntRow>();
    for (const e of snap.ents) byId.set(e[0], e);
    // A new round restarts entity ids; drop older buffered frames.
    if (this.latest && snap.round !== this.latest.round) this.buffer = [];
    this.buffer.push({ t: serverT, snap, byId, processed: false });
    if (this.buffer.length > 30) this.buffer.splice(0, this.buffer.length - 30);
    this.latest = snap;
    this.latestById = byId;
    if (this.selection !== null && !byId.has(this.selection)) this.select(null);
    this.emit('snapshot', snap);
    // Errors are only for me and should show immediately.
    for (const ev of snap.ev) if (ev.t === 'err' && ev.p === this.you) this.emit('event', ev);
  }

  /** Interpolation frames for the current render time; fires buffered events once reached. */
  frames(): { a: Buffered; b: Buffered; alpha: number } | null {
    if (!this.buffer.length || this.offset === null) return null;
    const renderT = performance.now() - this.offset - INTERP_DELAY;
    let ai = 0;
    for (let i = 0; i < this.buffer.length; i++) if (this.buffer[i].t <= renderT) ai = i;
    const a = this.buffer[ai];
    const b = this.buffer[Math.min(ai + 1, this.buffer.length - 1)];
    for (let i = 0; i <= ai; i++) {
      const f = this.buffer[i];
      if (f.processed) continue;
      f.processed = true;
      for (const ev of f.snap.ev) if (ev.t !== 'err') this.emit('event', ev as SimEvent);
    }
    if (ai > 2) this.buffer.splice(0, ai - 2);
    const alpha = b === a ? 0 : Math.min(1, Math.max(0, (renderT - a.t) / (b.t - a.t)));
    return { a, b, alpha };
  }

  send(cmd: Command) {
    this.socket.send({ type: 'cmd', cmd });
  }

  // ---------------------------------------------------------------- selection & modes

  select(id: number | null) {
    if (this.selection === id) return;
    this.selection = id;
    this.emit('selection', id);
  }

  setMode(mode: Mode) {
    this.mode = mode;
    this.emit('mode', mode);
  }

  playerName(i: number) {
    return this.players[i]?.name ?? '';
  }

  // ---------------------------------------------------------------- placement preview

  private occCache: { tick: number; grid: Uint8Array } | null = null;

  occupancy(): Uint8Array {
    if (this.occCache?.tick === this.latest.tick) return this.occCache.grid;
    const g = ROCK_GRID.slice();
    const fill = (tx: number, ty: number, s: number) => {
      for (let y = ty; y < ty + s; y++) for (let x = tx; x < tx + s; x++) if (x >= 0 && y >= 0 && x < MAP.width && y < MAP.height) g[y * MAP.width + x] = 1;
    };
    for (const e of this.latest.ents) {
      if (e[1] === 1) { const s = BUILDINGS[e[2]].size; fill(Math.round(e[5] - s / 2), Math.round(e[6] - s / 2), s); }
      if (e[1] === 3) { const r = MAP.castles[e[4] as Team]; fill(r.x, r.y, r.w); }
    }
    for (const [, b, tx, ty] of this.latest.orders) fill(tx, ty, BUILDINGS[b].size);
    this.occCache = { tick: this.latest.tick, grid: g };
    return g;
  }

  /** Client-side mirror of the server's placement rules for the ghost preview. */
  placementError(building: string, tx: number, ty: number): string | null {
    const def = BUILDINGS[building];
    const occ = this.occupancy();
    const err = basicPlacementError(this.team, tx, ty, def.size, (x, y) => !!occ[y * MAP.width + x]);
    if (err) return err;
    const g = occ.slice();
    for (let y = ty; y < ty + def.size; y++) for (let x = tx; x < tx + def.size; x++) g[y * MAP.width + x] = 1;
    if (!isFullyConnected(g)) return 'That would block the path';
    return null;
  }
}
