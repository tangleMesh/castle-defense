import {
  BUILDINGS, FACTIONS, MAP, RESCUE_RANGE, ROCK_GRID, basicPlacementError, isFullyConnected, rectCenter,
  type ClientMessage, type FactionId, type RoomInfo, type ServerMessage, type Snapshot, type Team,
} from '@bc/shared';

/**
 * Headless player for tests and load: registers over HTTP, plays over the websocket
 * with a simple build/upgrade/rescue strategy.
 */
export class Bot {
  token = '';
  userId = '';
  ws: WebSocket | null = null;
  room: RoomInfo | null = null;
  rooms: RoomInfo[] = [];
  snap: Snapshot | null = null;
  you = -1;
  team: Team = 0;
  matchId = '';
  ended: Extract<ServerMessage, { type: 'match.end' }> | null = null;
  errors: string[] = [];
  private waiters: Array<{ pred: (m: ServerMessage) => boolean; resolve: (m: ServerMessage) => void }> = [];
  private snapsSinceThink = 0;
  /** Commands already sent, to avoid re-sending before the snapshot reflects them. */
  private sentUpgrades = new Set<number>();
  private rescueRound = -1;
  private rnd: () => number;
  /** When false the bot only watches (used to keep a match running idle). */
  playing = true;

  constructor(public base: string, public name: string, public faction: FactionId = 'ironvow', seed = 1) {
    let s = seed >>> 0 || 1;
    this.rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  }

  async register(password = 'secret123') {
    const res = await fetch(`${this.base}/api/register`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: this.name, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`register ${this.name}: ${data.error}`);
    this.token = data.token;
    this.userId = data.user.id;
    return data;
  }

  connect(): Promise<void> {
    const url = this.base.replace(/^http/, 'ws') + '/ws';
    this.ws = new WebSocket(url);
    this.snap = null;
    return new Promise((resolve, reject) => {
      this.ws!.onopen = () => { this.send({ type: 'auth', token: this.token }); };
      this.ws!.onerror = (e) => reject(e);
      this.ws!.onmessage = (e) => {
        const m = JSON.parse(String(e.data)) as ServerMessage;
        this.onMessage(m);
        if (m.type === 'auth.ok') resolve();
      };
    });
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
  }

  send(m: ClientMessage) {
    this.ws?.send(JSON.stringify(m));
  }

  waitFor<T extends ServerMessage['type']>(type: T, pred: (m: Extract<ServerMessage, { type: T }>) => boolean = () => true, timeoutMs = 30_000): Promise<Extract<ServerMessage, { type: T }>> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`${this.name}: timeout waiting for ${type} (last tick ${this.snap?.tick}, phase ${this.snap?.phase}, ents ${this.snap?.ents.length}, buildings ${this.snap?.ents.filter((e) => e[1] === 1).length}, ended ${this.ended?.reason}, errors ${this.errors.slice(-3).join(" / ")})`)), timeoutMs);
      this.waiters.push({
        pred: (m) => m.type === type && pred(m as Extract<ServerMessage, { type: T }>),
        resolve: (m) => { clearTimeout(timer); resolve(m as Extract<ServerMessage, { type: T }>); },
      });
    });
  }

  private onMessage(m: ServerMessage) {
    switch (m.type) {
      case 'lobby.room': this.room = m.room; break;
      case 'lobby.list': this.rooms = m.rooms; break;
      case 'match.init': this.you = m.you; this.team = m.players[m.you].team; this.matchId = m.matchId; this.ended = null; this.send({ type: 'match.loaded' }); break;
      case 'match.end': this.ended = m; break;
      case 'error': this.errors.push(m.message); break;
      case 'match.snapshot':
        if (this.snap && this.snap.round !== m.snap.round) this.sentUpgrades.clear();
        this.snap = m.snap;
        for (const ev of m.snap.ev) if (ev.t === 'err' && ev.p === this.you) this.errors.push(ev.msg);
        if (this.playing && ++this.snapsSinceThink >= 5) { this.snapsSinceThink = 0; this.think(); }
        break;
    }
    this.waiters = this.waiters.filter((w) => {
      if (!w.pred(m)) return true;
      w.resolve(m);
      return false;
    });
  }

  // ---------------------------------------------------------------- strategy

  private occupancy(s: Snapshot) {
    const g = ROCK_GRID.slice();
    const fill = (tx: number, ty: number, n: number) => { for (let y = ty; y < ty + n; y++) for (let x = tx; x < tx + n; x++) g[y * MAP.width + x] = 1; };
    for (const e of s.ents) {
      if (e[1] === 1) { const n = BUILDINGS[e[2]].size; fill(Math.round(e[5] - n / 2), Math.round(e[6] - n / 2), n); }
      if (e[1] === 3) { const r = MAP.castles[e[4] as Team]; fill(r.x, r.y, r.w); }
    }
    for (const [, b, tx, ty] of s.orders) fill(tx, ty, BUILDINGS[b].size);
    return g;
  }

  private findSpot(s: Snapshot, size: number): { tx: number; ty: number } | null {
    const occ = this.occupancy(s);
    const z = MAP.zones[this.team];
    // Leave a one-tile gap between buildings so lanes stay open.
    const xs: number[] = [];
    for (let x = z.x + 1; x + size <= z.x + z.w - 1; x += 3) xs.push(x);
    // Build from the castle side outwards.
    if (this.team === 1) xs.reverse();
    for (const x of xs) {
      for (let y = z.y + 1; y + size <= z.y + z.h - 1; y += 3) {
        if (basicPlacementError(this.team, x, y, size, (a, b) => !!occ[b * MAP.width + a])) continue;
        const g = occ.slice();
        for (let j = y; j < y + size; j++) for (let i = x; i < x + size; i++) g[j * MAP.width + i] = 1;
        if (isFullyConnected(g)) return { tx: x, ty: y };
      }
    }
    return null;
  }

  think() {
    const s = this.snap;
    if (!s || s.phase !== 'playing' || this.you < 0) return;
    const me = s.players[this.you];
    const faction = FACTIONS[me.faction as FactionId];

    // Rescue strike when enemies crowd the castle.
    if (!me.rescueUsed && this.rescueRound !== s.round) {
      const c = rectCenter(MAP.castles[this.team]);
      const near = s.ents.filter((e) => e[1] === 0 && e[4] !== this.team && Math.hypot(e[5] - c.x, e[6] - c.y) < RESCUE_RANGE - 2);
      if (near.length >= 6) {
        const x = near.reduce((a, e) => a + e[5], 0) / near.length, y = near.reduce((a, e) => a + e[6], 0) / near.length;
        this.rescueRound = s.round;
        this.send({ type: 'cmd', cmd: { c: 'rescue', x, y } });
      }
    }

    const mine = s.ents.filter((e) => e[1] === 1 && e[3] === this.you);
    const pending = s.orders.filter(([p]) => p === this.you).length;
    // Upgrades once we have a base.
    if (mine.length >= 4 && me.gold >= 200) {
      for (const e of mine) {
        const ups = BUILDINGS[e[2]].upgrades;
        if (!ups?.length || e[9] !== 100 || this.sentUpgrades.has(e[0])) continue;
        const to = ups[Math.floor(this.rnd() * ups.length)];
        if (BUILDINGS[to].cost <= me.gold) {
          this.sentUpgrades.add(e[0]);
          this.send({ type: 'cmd', cmd: { c: 'upgrade', id: e[0], to } });
          return;
        }
      }
    }
    if (pending >= 2) return;
    const hasSpecial = mine.some((e) => BUILDINGS[e[2]].special) || s.orders.some(([p, b]) => p === this.you && BUILDINGS[b].special);
    const special = faction.build.find((id) => BUILDINGS[id].special)!;
    let choice: string | undefined;
    if (!hasSpecial && mine.length >= 6 && me.gold >= BUILDINGS[special].cost) choice = special;
    else {
      const options = faction.build.filter((id) => !BUILDINGS[id].special && BUILDINGS[id].cost <= me.gold);
      const spawners = options.filter((id) => BUILDINGS[id].spawn);
      const pool = mine.length < 3 || this.rnd() < 0.75 ? spawners : options;
      if (pool.length) choice = pool[Math.floor(this.rnd() * pool.length)];
    }
    if (!choice) return;
    const spot = this.findSpot(s, BUILDINGS[choice].size);
    if (spot) this.send({ type: 'cmd', cmd: { c: 'build', building: choice, tx: spot.tx, ty: spot.ty, queue: true } });
  }
}
