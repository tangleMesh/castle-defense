import { randomBytes } from 'node:crypto';
import {
  AI_LEVEL_NAMES, BOT_RATING, START_RATING, botTargets, FACTION_IDS, MAX_PLAYERS_PER_TEAM, Sim, botLevel, isBotId, makeBotId,
  INVITE_ALPHABET, INVITE_LENGTH, RANKED_BEST_OF, parseInviteCode,
  type AiLevel, type ClientMessage, type GameMode, type FactionId, type MatchInitPlayer, type RoomInfo, type RoomSlot,
} from '@bc/shared';
import type { Conn } from './conn';
import { MatchRoom } from './matchRoom';
import type { Learner } from './learner';
import { Matchmaker, type RankedPlayer } from './matchmaking';
import type { Persistence } from './persistence';

interface Room {
  id: string;
  /** Invite code, unique among open rooms. */
  code: string;
  name: string;
  hostId: string;
  bestOf: number;
  mode: GameMode;
  status: 'lobby' | 'playing';
  slots: RoomSlot[];
  savedGameId?: string;
  roster?: RoomInfo['roster'];
  score?: [number, number];
  match?: MatchRoom;
  /** Ranked matchmaking match (not listed, not saved by the host). */
  ranked?: boolean;
  /** Matchmaking bot accounts → the AI's skill for them. */
  disguised?: Record<string, number>;
}

const newId = () => randomBytes(8).toString('hex');

const BOT_NAMES = ['Aldric', 'Brina', 'Corvus', 'Dagny', 'Edda', 'Fenwick', 'Gisla', 'Hadrik', 'Ilse', 'Jorund', 'Kestrel', 'Lysa', 'Morrow', 'Nessa', 'Oswin', 'Perrin'];
const botName = (base: string, level: AiLevel) => `${base} (${AI_LEVEL_NAMES[level]} AI)`;

/** Tracks connected users, lobby rooms and the matches they turn into. */
export class Lobby {
  private conns = new Map<string, Conn>();
  private rooms = new Map<string, Room>();
  /** userId → roomId */
  private membership = new Map<string, string>();

  /** The bots' background learner (real matches feed it). */
  learner: Learner | null = null;

  readonly matchmaker: Matchmaker;

  constructor(private db: Persistence, private tickMs: number, mm: { botWait?: [number, number]; botWaitPerPlayer?: number } = {}) {
    this.matchmaker = new Matchmaker(db, {
      send: (userId, msg) => this.conns.get(userId)?.send(msg),
      inRoom: (userId) => this.membership.has(userId),
      online: (userId) => this.conns.has(userId),
      newCode: () => this.newCode(),
      startRanked: (size, players) => this.startRanked(size, players),
    }, mm);
  }

  /** Matches being played right now (the learner pauses its self-play meanwhile). */
  liveMatches(): number {
    return [...this.rooms.values()].filter((r) => r.match).length;
  }

  // ---------------------------------------------------------------- connections

  connect(conn: Conn) {
    const old = this.conns.get(conn.userId);
    if (old && old !== conn) {
      old.send({ type: 'error', message: 'Signed in from another window' });
      old.ws.close(4000, 'replaced');
    }
    this.conns.set(conn.userId, conn);
    const room = this.roomOf(conn.userId);
    if (room) {
      const slot = room.slots.find((s) => s.userId === conn.userId);
      if (slot) slot.connected = true;
      conn.send({ type: 'lobby.room', room: this.info(room) });
      if (room.match) room.match.attach(conn);
    } else {
      conn.send({ type: 'lobby.room', room: null });
    }
    conn.send({ type: 'lobby.list', rooms: this.listRooms() });
    conn.send({ type: 'mm.status', status: this.matchmaker.statusOf(conn.userId) });
    if (room) this.broadcastRoom(room);
  }

  disconnect(conn: Conn) {
    if (this.conns.get(conn.userId) !== conn) return; // replaced by a newer connection
    this.conns.delete(conn.userId);
    this.matchmaker.disconnect(conn.userId);
    const room = this.roomOf(conn.userId);
    if (!room) return;
    if (room.match) {
      const slot = room.slots.find((s) => s.userId === conn.userId);
      if (slot) slot.connected = false;
      room.match.detach(conn.userId);
    } else {
      this.leaveRoom(conn.userId);
    }
  }

  // ---------------------------------------------------------------- messages

  async handle(conn: Conn, msg: ClientMessage) {
    const room = this.roomOf(conn.userId);
    const err = (message: string) => conn.send({ type: 'error', message });

    if (room?.match && ['cmd', 'game.pause', 'game.saveAndExit', 'match.loaded', 'chat'].includes(msg.type)) {
      room.match.handle(conn, msg);
      return;
    }

    switch (msg.type) {
      case 'party.create': return void (await this.matchmaker.create(conn.userId, conn.username));
      case 'party.leave': return this.matchmaker.leave(conn.userId);
      case 'mm.queue': return void (await this.matchmaker.queue(conn.userId, conn.username, msg.size));
      case 'mm.cancel': return this.matchmaker.cancel(conn.userId);
      case 'lobby.create': {
        if (room) return err('Leave your current room first');
        if (this.matchmaker.isBusy(conn.userId)) return err('Cancel your match search first');
        const r: Room = { id: newId(), code: this.newCode(), name: msg.name, hostId: conn.userId, bestOf: msg.bestOf, mode: msg.mode ?? 'standard', status: 'lobby', slots: [] };
        this.rooms.set(r.id, r);
        this.addSlot(r, conn, 0, 'ironvow');
        return this.changed(r);
      }
      case 'lobby.setMode': {
        if (!room || room.status !== 'lobby' || room.roster) return;
        if (room.hostId !== conn.userId) return err('Only the host can change the game mode');
        room.mode = msg.mode;
        for (const s of room.slots) if (!s.bot) s.ready = false;
        return this.changed(room);
      }
      case 'lobby.join':
      case 'lobby.joinCode': {
        let r: Room | undefined;
        if (msg.type === 'lobby.joinCode') {
          const code = parseInviteCode(msg.code);
          // A friend's ranked party?
          if (code && await this.matchmaker.joinByCode(conn.userId, conn.username, code)) return;
          r = code ? [...this.rooms.values()].find((x) => x.code === code) : undefined;
          if (!r) return err(code ? `No open game with the code ${code}` : 'That is not a valid invite code');
          if (room === r) return; // already in it (e.g. opened the own invite link)
        } else r = this.rooms.get(msg.roomId);
        if (room) return err('Leave your current room first');
        if (this.matchmaker.isBusy(conn.userId)) return err('Cancel your match search first');
        if (!r) return err('Room not available');
        if (r.status !== 'lobby') return err('That game has already started');
        if (r.roster) {
          const entry = r.roster.find((p) => p.userId === conn.userId);
          if (!entry) return err('This is a resumed game for its original players only');
          this.addSlot(r, conn, entry.team, entry.faction);
        } else {
          const team = this.count(r, 0) <= this.count(r, 1) ? 0 : 1;
          if (this.count(r, team) >= MAX_PLAYERS_PER_TEAM) return err('Room is full');
          this.addSlot(r, conn, team, this.freeFaction(r, team, 'ironvow'));
        }
        return this.changed(r);
      }
      case 'lobby.leave': {
        if (!room || room.match) return;
        this.leaveRoom(conn.userId);
        conn.send({ type: 'lobby.room', room: null });
        return;
      }
      case 'lobby.setTeam': {
        if (!room || room.status !== 'lobby' || room.roster) return;
        const slot = room.slots.find((s) => s.userId === conn.userId)!;
        if (slot.team !== msg.team && this.count(room, msg.team) >= MAX_PLAYERS_PER_TEAM) return err('Team is full');
        slot.team = msg.team;
        // Each faction once per team: a taken faction switches to a free one.
        slot.faction = this.freeFaction(room, msg.team, slot.faction, slot.userId);
        slot.ready = false;
        return this.changed(room);
      }
      case 'lobby.setFaction': {
        if (!room || room.status !== 'lobby' || room.roster) return;
        const slot = room.slots.find((s) => s.userId === conn.userId)!;
        const mate = this.takenBy(room, slot.team, msg.faction, slot.userId);
        if (mate) return err(`${mate.name} already plays that faction (each faction once per team)`);
        slot.faction = msg.faction;
        slot.ready = false;
        return this.changed(room);
      }
      case 'lobby.ready': {
        if (!room || room.status !== 'lobby') return;
        room.slots.find((s) => s.userId === conn.userId)!.ready = msg.ready;
        return this.changed(room);
      }
      case 'lobby.start': {
        if (!room || room.status !== 'lobby') return;
        if (room.hostId !== conn.userId) return err('Only the host can start');
        room.slots.find((s) => s.userId === conn.userId)!.ready = true;
        const problem = this.startProblem(room);
        if (problem) { this.changed(room); return err(problem); }
        await this.startMatch(room);
        return;
      }
      case 'lobby.addBot': {
        if (!room || room.status !== 'lobby' || room.roster) return;
        if (room.hostId !== conn.userId) return err('Only the host can add bots');
        if (this.count(room, msg.team) >= MAX_PLAYERS_PER_TEAM) return err('Team is full');
        const used = new Set(room.slots.map((x) => x.name.split(' (')[0]));
        const base = BOT_NAMES.find((n) => !used.has(n)) ?? `Bot ${room.slots.length + 1}`;
        const free = FACTION_IDS.filter((f) => !this.takenBy(room, msg.team, f));
        const faction: FactionId = free[Math.floor(Math.random() * free.length)] ?? FACTION_IDS[0];
        room.slots.push({
          userId: makeBotId(msg.level, newId()), name: botName(base, msg.level), team: msg.team, faction,
          ready: true, connected: true, bot: msg.level,
        });
        return this.changed(room);
      }
      case 'lobby.updateBot': {
        if (!room || room.status !== 'lobby' || room.roster) return;
        if (room.hostId !== conn.userId) return err('Only the host can change bots');
        const slot = room.slots.find((x) => x.userId === msg.userId && x.bot);
        if (!slot) return;
        if (msg.team !== undefined && msg.team !== slot.team) {
          if (this.count(room, msg.team) >= MAX_PLAYERS_PER_TEAM) return err('Team is full');
          slot.team = msg.team;
          slot.faction = this.freeFaction(room, msg.team, slot.faction, slot.userId);
        }
        if (msg.faction) {
          const mate = this.takenBy(room, slot.team, msg.faction, slot.userId);
          if (mate) return err(`${mate.name} already plays that faction (each faction once per team)`);
          slot.faction = msg.faction;
        }
        if (msg.level && msg.level !== slot.bot) {
          slot.bot = msg.level;
          slot.userId = makeBotId(msg.level, slot.userId.split(':')[2]);
          slot.name = botName(slot.name.split(' (')[0], msg.level);
        }
        return this.changed(room);
      }
      case 'lobby.removeBot': {
        if (!room || room.status !== 'lobby' || room.roster) return;
        if (room.hostId !== conn.userId) return err('Only the host can remove bots');
        room.slots = room.slots.filter((x) => !(x.userId === msg.userId && x.bot));
        return this.changed(room);
      }
      case 'lobby.resume': {
        if (room) return err('Leave your current room first');
        const saved = await this.db.savedGames.get(msg.savedGameId);
        if (!saved || saved.status !== 'saved' || !saved.userIds.includes(conn.userId)) return err('Saved game not found');
        if ([...this.rooms.values()].some((r) => r.savedGameId === saved._id)) return err('That game is already open in a room');
        const r: Room = {
          id: newId(), code: this.newCode(), name: `${saved.name} (resumed)`, hostId: conn.userId, bestOf: saved.bestOf, mode: saved.mode ?? 'standard', status: 'lobby',
          slots: [], savedGameId: saved._id, roster: saved.players, score: saved.score,
          ranked: saved.ranked, disguised: saved.disguised,
        };
        this.rooms.set(r.id, r);
        const me = saved.players.find((p) => p.userId === conn.userId)!;
        this.addSlot(r, conn, me.team, me.faction);
        // Computer players rejoin automatically.
        for (const p of saved.players) {
          const level = botLevel(p.userId);
          if (level) r.slots.push({ userId: p.userId, name: p.name, team: p.team, faction: p.faction, ready: true, connected: true, bot: level });
          // Matchmaking bot accounts too (they look like players).
          else if (saved.disguised?.[p.userId] !== undefined) r.slots.push({ userId: p.userId, name: p.name, team: p.team, faction: p.faction, ready: true, connected: true });
        }
        return this.changed(r);
      }
      case 'chat': {
        const text = msg.text;
        const targets = room ? room.slots.map((s) => this.conns.get(s.userId)) : [...this.conns.values()].filter((c) => !this.roomOf(c.userId));
        for (const c of targets) c?.send({ type: 'chat', from: conn.username, text, scope: 'lobby' });
        return;
      }
      case 'game.leave': {
        // Leaving a running match: treated like a disconnect, but the user returns to the lobby.
        if (!room?.match) return;
        room.match.detach(conn.userId, true);
        room.slots = room.slots.filter((s) => s.userId !== conn.userId);
        this.membership.delete(conn.userId);
        conn.send({ type: 'lobby.room', room: null });
        conn.send({ type: 'lobby.list', rooms: this.listRooms() });
        return;
      }
      default:
        return;
    }
  }

  // ---------------------------------------------------------------- rooms

  private addSlot(r: Room, conn: Conn, team: 0 | 1, faction: FactionId) {
    r.slots.push({ userId: conn.userId, name: conn.username, team, faction, ready: false, connected: true });
    this.membership.set(conn.userId, r.id);
  }

  /** The teammate (other than `userId`) playing `faction` on `team`, if any: each faction once per team. */
  private takenBy(r: Room, team: 0 | 1, faction: FactionId, userId?: string) {
    return r.slots.find((s) => s.team === team && s.faction === faction && s.userId !== userId);
  }

  /** `wanted` if nobody else on `team` plays it, else the first free faction. */
  private freeFaction(r: Room, team: 0 | 1, wanted: FactionId, userId?: string): FactionId {
    if (!this.takenBy(r, team, wanted, userId)) return wanted;
    return FACTION_IDS.find((f) => !this.takenBy(r, team, f, userId)) ?? wanted;
  }

  private count(r: Room, team: 0 | 1) {
    return r.slots.filter((s) => s.team === team).length;
  }

  private roomOf(userId: string): Room | undefined {
    const id = this.membership.get(userId);
    return id ? this.rooms.get(id) : undefined;
  }

  private leaveRoom(userId: string) {
    const r = this.roomOf(userId);
    this.membership.delete(userId);
    if (!r) return;
    r.slots = r.slots.filter((s) => s.userId !== userId);
    if (!r.slots.some((s) => !s.bot)) {
      this.rooms.delete(r.id);
      this.broadcastList();
      return;
    }
    if (r.hostId === userId) r.hostId = r.slots.find((s) => !s.bot)!.userId;
    this.changed(r);
  }

  private startProblem(r: Room): string | null {
    if (r.roster) {
      const missing = r.roster.filter((p) => !r.slots.some((s) => s.userId === p.userId));
      if (missing.length) return `Waiting for original players: ${missing.map((m) => m.name).join(', ')}`;
    } else {
      if (!this.count(r, 0) || !this.count(r, 1)) return 'Each team needs at least one player';
      if (r.mode === 'standard') for (const s of r.slots) {
        const mate = this.takenBy(r, s.team, s.faction, s.userId);
        if (mate) return `${s.name} and ${mate.name} play the same faction: each faction once per team`;
      }
    }
    const notReady = r.slots.filter((s) => !s.ready);
    if (notReady.length) return `Not ready: ${notReady.map((s) => s.name).join(', ')}`;
    return null;
  }

  /** Matchmaking found a match: a room straight into battle (random factions, ranked). */
  private async startRanked(size: number, players: RankedPlayer[]) {
    const humans = players.filter((p) => p.botSkill === undefined);
    const disguised: Record<string, number> = {};
    for (const p of players) if (p.botSkill !== undefined) disguised[p.userId] = p.botSkill;
    const r: Room = {
      id: newId(), code: this.newCode(), name: `Ranked ${size}v${size}`, hostId: humans[0].userId, bestOf: RANKED_BEST_OF, mode: 'random',
      status: 'lobby', ranked: true, disguised,
      slots: players.map((p) => ({ userId: p.userId, name: p.name, team: p.team, faction: p.faction, ready: true, connected: p.botSkill !== undefined || this.conns.has(p.userId) })),
    };
    this.rooms.set(r.id, r);
    for (const h of humans) this.membership.set(h.userId, r.id);
    for (const h of humans) this.conns.get(h.userId)?.send({ type: 'lobby.room', room: this.info(r) });
    await this.startMatch(r);
  }

  private async startMatch(r: Room) {
    let sim: Sim;
    let players: MatchInitPlayer[];
    let matchId: string;
    let startedAt = new Date();
    const resumed = !!r.savedGameId;

    if (r.savedGameId) {
      const saved = await this.db.savedGames.get(r.savedGameId);
      if (!saved?.simState || saved.status !== 'saved') {
        for (const s of r.slots) this.conns.get(s.userId)?.send({ type: 'error', message: 'Saved game is no longer available' });
        return;
      }
      if (!Sim.compatible(saved.simState)) {
        for (const s of r.slots) this.conns.get(s.userId)?.send({ type: 'error', message: 'This saved game was played on the old, smaller map and can\'t be resumed.' });
        return;
      }
      sim = Sim.restore(saved.simState);
      matchId = saved._id;
      startedAt = saved.startedAt;
      players = sim.state.players.map((p) => ({ i: p.index, userId: p.userId, name: p.name, team: p.team, faction: p.faction }));
      await this.db.savedGames.setLive(matchId);
    } else {
      // Team 0 first, then team 1, stable by join order.
      const ordered = [...r.slots.filter((s) => s.team === 0), ...r.slots.filter((s) => s.team === 1)];
      players = ordered.map((s, i) => ({ i, userId: s.userId, name: s.name, team: s.team, faction: s.faction }));
      sim = Sim.create({
        players: players.map((p) => ({ userId: p.userId, name: p.name, team: p.team, faction: p.faction })),
        bestOf: r.bestOf,
        mode: r.mode,
        seed: randomBytes(4).readUInt32LE(0),
      });
      matchId = newId();
      await this.db.savedGames.create({
        _id: matchId, status: 'live', name: r.name, hostId: r.hostId, bestOf: r.bestOf, mode: r.mode,
        players: players.map(({ userId, name, team, faction }) => ({ userId, name, team, faction })),
        userIds: players.map((p) => p.userId), score: [0, 0], round: 1, tick: 0, startedAt,
        ...(r.ranked ? { ranked: true } : {}), ...(r.disguised ? { disguised: r.disguised } : {}),
      });
    }

    // Auto bots play at the Elo that makes the teams even (humans' ratings, preset bots' fixed ones).
    const botElo: Record<string, number> = {};
    try {
      const rated = await Promise.all(players.map(async (p) => {
        const lvl = botLevel(p.userId);
        if (lvl === 'auto') return { team: p.team, rating: undefined };
        if (lvl) return { team: p.team, rating: BOT_RATING[lvl] };
        return { team: p.team, rating: (await this.db.users.byId(p.userId))?.stats?.rating ?? START_RATING };
      }));
      botTargets(rated).forEach((t, i) => { if (t !== undefined) botElo[players[i].userId] = t; });
    } catch (err) {
      console.error('[lobby] failed to read ratings for bot targets', err);
    }

    r.status = 'playing';
    const match = new MatchRoom({
      matchId, name: r.name, sim, players, hostId: r.hostId, resumed, startedAt, botElo,
      persistence: this.db, tickMs: this.tickMs, learner: this.learner, ranked: r.ranked, disguised: r.disguised,
      onClose: () => this.closeRoom(r),
    });
    r.match = match;
    for (const s of r.slots) {
      const c = this.conns.get(s.userId);
      if (c) match.attach(c);
    }
    match.start();
    this.changed(r);
  }

  private closeRoom(r: Room) {
    this.rooms.delete(r.id);
    for (const s of r.slots) {
      if (isBotId(s.userId)) continue;
      if (this.membership.get(s.userId) === r.id) this.membership.delete(s.userId);
      const c = this.conns.get(s.userId);
      c?.send({ type: 'lobby.room', room: null });
    }
    // Users who left mid-match may still be mapped to the room.
    for (const [u, id] of this.membership) if (id === r.id) this.membership.delete(u);
    this.broadcastList();
  }

  async shutdown() {
    await Promise.all([...this.rooms.values()].map((r) => r.match?.shutdown()));
  }

  // ---------------------------------------------------------------- broadcast

  private info(r: Room): RoomInfo {
    return {
      id: r.id, code: r.code, ranked: r.ranked, name: r.name, hostId: r.hostId, bestOf: r.bestOf, mode: r.mode, status: r.status,
      savedGameId: r.savedGameId, roster: r.roster, score: r.score, slots: r.slots,
    };
  }

  /** A fresh invite code that no open room uses. */
  private newCode(): string {
    for (;;) {
      const bytes = randomBytes(INVITE_LENGTH);
      const code = [...bytes].map((b) => INVITE_ALPHABET[b % INVITE_ALPHABET.length]).join('');
      if (![...this.rooms.values()].some((r) => r.code === code) && !this.matchmaker?.hasCode(code)) return code;
    }
  }

  private listRooms(): RoomInfo[] {
    return [...this.rooms.values()].filter((r) => !r.ranked).map((r) => this.info(r));
  }

  private changed(r: Room) {
    this.broadcastRoom(r);
    this.broadcastList();
  }

  private broadcastRoom(r: Room) {
    const info = this.info(r);
    for (const s of r.slots) this.conns.get(s.userId)?.send({ type: 'lobby.room', room: info });
  }

  private broadcastList() {
    const rooms = this.listRooms();
    const json = JSON.stringify({ type: 'lobby.list', rooms });
    for (const c of this.conns.values()) c.sendRaw(json);
  }
}
