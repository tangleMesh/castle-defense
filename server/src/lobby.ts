import { randomBytes } from 'node:crypto';
import {
  AI_INCOME, AI_LEVEL_NAMES, MAX_PLAYERS_PER_TEAM, Sim, botLevel, isBotId, makeBotId,
  type AiLevel, type ClientMessage, type GameMode, type FactionId, type MatchInitPlayer, type RoomInfo, type RoomSlot,
} from '@bc/shared';
import type { Conn } from './conn';
import { MatchRoom } from './matchRoom';
import type { Persistence } from './persistence';

interface Room {
  id: string;
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

  constructor(private db: Persistence, private tickMs: number) {}

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
    if (room) this.broadcastRoom(room);
  }

  disconnect(conn: Conn) {
    if (this.conns.get(conn.userId) !== conn) return; // replaced by a newer connection
    this.conns.delete(conn.userId);
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

    if (room?.match && ['cmd', 'game.pause', 'game.saveAndExit', 'chat'].includes(msg.type)) {
      room.match.handle(conn, msg);
      return;
    }

    switch (msg.type) {
      case 'lobby.create': {
        if (room) return err('Leave your current room first');
        const r: Room = { id: newId(), name: msg.name, hostId: conn.userId, bestOf: msg.bestOf, mode: msg.mode ?? 'standard', status: 'lobby', slots: [] };
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
      case 'lobby.join': {
        if (room) return err('Leave your current room first');
        const r = this.rooms.get(msg.roomId);
        if (!r || r.status !== 'lobby') return err('Room not available');
        if (r.roster) {
          const entry = r.roster.find((p) => p.userId === conn.userId);
          if (!entry) return err('This is a resumed game for its original players only');
          this.addSlot(r, conn, entry.team, entry.faction);
        } else {
          const team = this.count(r, 0) <= this.count(r, 1) ? 0 : 1;
          if (this.count(r, team) >= MAX_PLAYERS_PER_TEAM) return err('Room is full');
          this.addSlot(r, conn, team, 'ironvow');
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
        slot.ready = false;
        return this.changed(room);
      }
      case 'lobby.setFaction': {
        if (!room || room.status !== 'lobby' || room.roster) return;
        const slot = room.slots.find((s) => s.userId === conn.userId)!;
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
        const faction: FactionId = Math.random() < 0.5 ? 'ironvow' : 'thornwild';
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
        }
        if (msg.faction) slot.faction = msg.faction;
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
          id: newId(), name: `${saved.name} (resumed)`, hostId: conn.userId, bestOf: saved.bestOf, mode: saved.mode ?? 'standard', status: 'lobby',
          slots: [], savedGameId: saved._id, roster: saved.players, score: saved.score,
        };
        this.rooms.set(r.id, r);
        const me = saved.players.find((p) => p.userId === conn.userId)!;
        this.addSlot(r, conn, me.team, me.faction);
        // Computer players rejoin automatically.
        for (const p of saved.players) {
          const level = botLevel(p.userId);
          if (level) r.slots.push({ userId: p.userId, name: p.name, team: p.team, faction: p.faction, ready: true, connected: true, bot: level });
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
    }
    const notReady = r.slots.filter((s) => !s.ready);
    if (notReady.length) return `Not ready: ${notReady.map((s) => s.name).join(', ')}`;
    return null;
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
        players: players.map((p) => {
          const level = botLevel(p.userId);
          return { userId: p.userId, name: p.name, team: p.team, faction: p.faction, incomeMult: level ? AI_INCOME[level] : 1 };
        }),
        bestOf: r.bestOf,
        mode: r.mode,
        seed: randomBytes(4).readUInt32LE(0),
      });
      matchId = newId();
      await this.db.savedGames.create({
        _id: matchId, status: 'live', name: r.name, hostId: r.hostId, bestOf: r.bestOf, mode: r.mode,
        players: players.map(({ userId, name, team, faction }) => ({ userId, name, team, faction })),
        userIds: players.map((p) => p.userId), score: [0, 0], round: 1, tick: 0, startedAt,
      });
    }

    r.status = 'playing';
    const match = new MatchRoom({
      matchId, name: r.name, sim, players, hostId: r.hostId, resumed, startedAt,
      persistence: this.db, tickMs: this.tickMs,
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
      id: r.id, name: r.name, hostId: r.hostId, bestOf: r.bestOf, mode: r.mode, status: r.status,
      savedGameId: r.savedGameId, roster: r.roster, score: r.score, slots: r.slots,
    };
  }

  private listRooms(): RoomInfo[] {
    return [...this.rooms.values()].map((r) => this.info(r));
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
