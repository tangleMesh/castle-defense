import {
  FACTION_IDS, START_RATING, botTargets, skillForElo,
  type FactionId, type MatchmakingStatus, type UserStats,
} from '@bc/shared';
import type { Persistence } from './persistence';

/** What the matchmaker needs from the lobby. */
export interface MatchmakingHost {
  send(userId: string, msg: { type: 'mm.status'; status: MatchmakingStatus } | { type: 'error'; message: string }): void;
  /** The user sits in a lobby room or match. */
  inRoom(userId: string): boolean;
  online(userId: string): boolean;
  newCode(): string;
  /** Starts a ranked match with these players (bots: their account and skill). */
  startRanked(size: number, players: RankedPlayer[]): Promise<void>;
}

export interface RankedPlayer {
  userId: string;
  name: string;
  team: 0 | 1;
  faction: FactionId;
  /** A matchmaking bot account: the AI plays it at this skill. */
  botSkill?: number;
}

interface Party {
  id: string;
  code: string;
  leader: string;
  members: Array<{ userId: string; name: string; rating: number }>;
  search: { size: 1 | 2 | 3 | 4; since: number; botAt: number } | null;
  found?: boolean;
}

export interface MatchmakerOptions {
  /** Seconds a party waits for human opponents before bots fill the match: [min, max] (semi-random). */
  botWait?: [number, number];
  /** Seconds more per extra player in a team (bigger matches are slower to fill). */
  botWaitPerPlayer?: number;
  tickMs?: number;
}

/**
 * Ranked matchmaking. Parties (one player or friends who joined by invite code) queue for 1v1 …
 * 4v4. Every second the matchmaker tries to build a full match of real players, two teams of
 * similar rating (the accepted gap widens the longer people wait), parties always on one team.
 * Only when a party has waited its semi-random time does it give up on humans: the empty slots
 * go to bot accounts, players with names, ratings and histories, whose strength is chosen so the
 * match is fair. Nobody can tell them from people.
 */
export class Matchmaker {
  private parties = new Map<string, Party>();
  private partyOf = new Map<string, string>();
  private timer: NodeJS.Timeout;
  private busyBots = new Set<string>();
  private nextId = 1;

  constructor(private db: Persistence, private host: MatchmakingHost, private o: MatchmakerOptions = {}) {
    this.timer = setInterval(() => void this.tick(), o.tickMs ?? 1000);
    this.timer.unref();
  }

  stop() { clearInterval(this.timer); }

  // ---------------------------------------------------------------- parties

  statusOf(userId: string): MatchmakingStatus {
    const p = this.party(userId);
    return p ? { party: { code: p.code, leaderId: p.leader, members: p.members }, search: p.search && { size: p.search.size, since: p.search.since }, found: p.found } : { party: null, search: null };
  }

  private party(userId: string): Party | undefined {
    const id = this.partyOf.get(userId);
    return id ? this.parties.get(id) : undefined;
  }

  private push(p: Party) {
    for (const m of p.members) this.host.send(m.userId, { type: 'mm.status', status: this.statusOf(m.userId) });
  }

  isBusy(userId: string): boolean {
    return !!this.party(userId)?.search;
  }

  hasCode(code: string): boolean {
    return [...this.parties.values()].some((p) => p.code === code);
  }

  private async member(userId: string, name: string) {
    const u = await this.db.users.byId(userId);
    return { userId, name, rating: u?.stats?.rating ?? START_RATING };
  }

  async create(userId: string, name: string): Promise<Party | null> {
    if (this.host.inRoom(userId)) { this.host.send(userId, { type: 'error', message: 'Leave your game room first' }); return null; }
    const existing = this.party(userId);
    if (existing) return existing;
    const p: Party = { id: String(this.nextId++), code: this.host.newCode(), leader: userId, members: [await this.member(userId, name)], search: null };
    this.parties.set(p.id, p);
    this.partyOf.set(userId, p.id);
    this.push(p);
    return p;
  }

  /** Joins a party by its invite code; false if there is no such party. */
  async joinByCode(userId: string, name: string, code: string): Promise<boolean> {
    const p = [...this.parties.values()].find((x) => x.code === code);
    if (!p) return false;
    if (this.party(userId) === p) return true;
    const err = (message: string) => { this.host.send(userId, { type: 'error', message }); return true; };
    if (this.host.inRoom(userId)) return err('Leave your game room first');
    if (p.search || p.found) return err('That party is already searching for a match');
    if (p.members.length >= 4) return err('That party is full (4 players)');
    this.leave(userId);
    p.members.push(await this.member(userId, name));
    this.partyOf.set(userId, p.id);
    this.push(p);
    return true;
  }

  leave(userId: string) {
    const p = this.party(userId);
    if (!p) return;
    p.members = p.members.filter((m) => m.userId !== userId);
    this.partyOf.delete(userId);
    this.host.send(userId, { type: 'mm.status', status: { party: null, search: null } });
    // Someone leaving cancels the search; the party lives on with the others.
    p.search = null;
    if (!p.members.length) { this.parties.delete(p.id); return; }
    if (p.leader === userId) p.leader = p.members[0].userId;
    this.push(p);
  }

  async queue(userId: string, name: string, size: 1 | 2 | 3 | 4) {
    const p = this.party(userId) ?? (await this.create(userId, name));
    if (!p) return;
    const err = (message: string) => this.host.send(userId, { type: 'error', message });
    if (p.leader !== userId) return err('Only the party leader can start the search');
    if (p.members.length > size) return err(`Your party has ${p.members.length} players: too many for ${size}v${size}`);
    if (p.members.some((m) => this.host.inRoom(m.userId))) return err('Someone in your party is still in a game room');
    if (p.members.some((m) => !this.host.online(m.userId))) return err('Someone in your party is offline');
    // Refresh ratings (they change after every match).
    p.members = await Promise.all(p.members.map((m) => this.member(m.userId, m.name)));
    const [lo, hi] = this.o.botWait ?? [25, 70];
    const wait = lo + Math.random() * (hi - lo) + (this.o.botWaitPerPlayer ?? 8) * (size - 1);
    p.search = { size, since: Date.now(), botAt: Date.now() + wait * 1000 };
    p.found = false;
    this.push(p);
  }

  cancel(userId: string) {
    const p = this.party(userId);
    if (!p?.search) return;
    p.search = null;
    this.push(p);
  }

  /** A player went offline: their party stops searching (they stay in the party for a reconnect). */
  disconnect(userId: string) {
    const p = this.party(userId);
    if (p?.search) { p.search = null; this.push(p); }
  }

  // ---------------------------------------------------------------- matching

  private avg(p: Party) {
    return p.members.reduce((s, m) => s + m.rating, 0) / p.members.length;
  }

  /** The rating gap a party accepts: 150, growing by 8 per second of waiting (up to 700). */
  private window(p: Party, now: number) {
    return Math.min(700, 150 + ((now - p.search!.since) / 1000) * 8);
  }

  private ticking = false;

  async tick() {
    if (this.ticking) return;
    this.ticking = true;
    try {
      const now = Date.now();
      for (const size of [1, 2, 3, 4] as const) {
        let searching = [...this.parties.values()].filter((p) => p.search?.size === size && !p.found).sort((a, b) => a.search!.since - b.search!.since);
        while (searching.length) {
          const anchor = searching[0];
          const pick = this.formMatch(anchor, searching, size, now >= anchor.search!.botAt, now);
          if (!pick) { searching = searching.slice(1); continue; }
          searching = searching.filter((p) => !pick.teams.flat().includes(p));
          await this.start(size, pick.teams);
        }
      }
    } catch (err) {
      console.error('[matchmaking]', err);
    } finally {
      this.ticking = false;
    }
  }

  /**
   * The best match around `anchor`: parties within each other's rating window, split into two teams
   * of at most `size` players (exactly `size` each unless `allowBots`). Prefers more humans, then
   * humans on both sides (people want people to play against), then even team ratings.
   */
  private formMatch(anchor: Party, pool: Party[], size: number, allowBots: boolean, now: number): { teams: [Party[], Party[]] } | null {
    const fits = (p: Party) => Math.abs(this.avg(p) - this.avg(anchor)) <= Math.min(this.window(p, now), this.window(anchor, now));
    const cands = [anchor, ...pool.filter((p) => p !== anchor && fits(p)).sort((a, b) => Math.abs(this.avg(a) - this.avg(anchor)) - Math.abs(this.avg(b) - this.avg(anchor))).slice(0, 7)];
    let best: { teams: [Party[], Party[]]; score: number } | null = null;
    const n = cands.length;
    // Every party goes to team A, team B or stays in the queue (the anchor always plays).
    const total = 3 ** n;
    for (let code = 0; code < total; code++) {
      let c = code;
      const a: Party[] = [], b: Party[] = [];
      for (let i = 0; i < n; i++) { const d = c % 3; c = Math.floor(c / 3); if (d === 1) a.push(cands[i]); else if (d === 2) b.push(cands[i]); }
      if (!a.includes(cands[0])) continue; // anchor on team A (mirror solutions are the same)
      const na = a.reduce((s, p) => s + p.members.length, 0), nb = b.reduce((s, p) => s + p.members.length, 0);
      if (na > size || nb > size) continue;
      if (!allowBots && (na !== size || nb !== size)) continue;
      const ra = a.flatMap((p) => p.members.map((m) => m.rating)), rb = b.flatMap((p) => p.members.map((m) => m.rating));
      const mean = (r: number[]) => r.reduce((s, x) => s + x, 0) / r.length;
      const gap = rb.length ? Math.abs(mean(ra) - mean(rb)) : 0;
      const score = (na + nb) * 1000 + (nb > 0 ? 500 : 0) - gap;
      if (!best || score > best.score) best = { teams: [a, b], score };
    }
    return best && { teams: best.teams };
  }

  private async start(size: number, teams: [Party[], Party[]]) {
    for (const p of teams.flat()) { p.found = true; this.push(p); }
    const humans = teams.flatMap((t, team) => t.flatMap((p) => p.members.map((m) => ({ ...m, team: team as 0 | 1 }))));
    // Fair strength for the bots: the Elo that evens out the team averages.
    const slots: Array<{ team: 0 | 1; rating?: number }> = [...humans.map((h) => ({ team: h.team, rating: h.rating }))];
    for (const team of [0, 1] as const) for (let i = humans.filter((h) => h.team === team).length; i < size; i++) slots.push({ team });
    const targets = botTargets(slots);
    const players: RankedPlayer[] = humans.map((h) => ({ userId: h.userId, name: h.name, team: h.team, faction: FACTION_IDS[0] }));
    for (let i = humans.length; i < slots.length; i++) {
      const target = targets[i] ?? START_RATING;
      const acct = await this.botAccount(target);
      players.push({ userId: acct.id, name: acct.name, team: slots[i].team, faction: FACTION_IDS[0], botSkill: skillForElo(target) });
    }
    try {
      await this.host.startRanked(size, players);
    } finally {
      for (const p of teams.flat()) { p.search = null; p.found = false; }
      for (const pl of players) if (pl.botSkill !== undefined) this.busyBots.delete(pl.userId);
    }
  }

  // ---------------------------------------------------------------- bot accounts

  /**
   * A free bot account with a rating near `target` (a new one if none fits), so the rating its
   * opponents see matches how it plays.
   */
  private async botAccount(target: number): Promise<{ id: string; name: string }> {
    const bots = (await this.db.users.listBots()).filter((b) => !this.busyBots.has(b._id!.toHexString()));
    const near = bots.filter((b) => Math.abs((b.stats?.rating ?? START_RATING) - target) <= 90);
    const pick = near.length ? near[Math.floor(Math.random() * near.length)] : null;
    if (pick) { this.busyBots.add(pick._id!.toHexString()); return { id: pick._id!.toHexString(), name: pick.username }; }
    for (let attempt = 0; attempt < 20; attempt++) {
      const name = botName();
      try {
        const doc = await this.db.users.createBot(name, botStats(target));
        const id = doc._id!.toHexString();
        this.busyBots.add(id);
        return { id, name };
      } catch { /* name taken: try another */ }
    }
    throw new Error('could not create a bot account');
  }
}

const PRE = ['Dark', 'Swift', 'Iron', 'Silent', 'Grim', 'Frost', 'Wild', 'Lucky', 'Mad', 'Shadow', 'Red', 'Night', 'Storm', 'Old', 'Little', 'Big', 'Sir', 'Lord', 'Captain', 'Crazy', 'Lazy', 'Sneaky', 'Brave', 'Grumpy'];
const CORE = ['wolf', 'fox', 'raven', 'bear', 'knight', 'mage', 'ranger', 'smith', 'viking', 'monk', 'hawk', 'badger', 'goblin', 'orc', 'troll', 'bard', 'castle', 'tower', 'dragon', 'paladin', 'archer', 'golem', 'lich', 'kodo'];
const FIRST = ['kevin', 'jonas', 'lukas', 'mia', 'lena', 'tom', 'max', 'finn', 'emma', 'nina', 'paul', 'tim', 'sara', 'leon', 'ben', 'anna', 'niko', 'jan', 'felix', 'marie', 'chris', 'alex', 'sam', 'robin'];

/** A plausible gamer name: "SilentRaven", "kodo_lord", "jonas93", "xX_Frostwolf_Xx" (rarely). */
export function botName(): string {
  const r = Math.random, pick = <T>(a: T[]) => a[Math.floor(r() * a.length)];
  const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
  const n = () => String(Math.floor(r() * 100)).padStart(r() < 0.5 ? 2 : 1, '0');
  const style = r();
  let name: string;
  if (style < 0.3) name = pick(PRE) + cap(pick(CORE));
  else if (style < 0.5) name = pick(FIRST) + (r() < 0.7 ? n() : '');
  else if (style < 0.65) name = `${pick(CORE)}_${pick(['lord', 'king', 'slayer', 'master', 'fan', 'main', 'boy', 'girl'])}`;
  else if (style < 0.8) name = cap(pick(CORE)) + cap(pick(CORE)) + (r() < 0.5 ? n() : '');
  else if (style < 0.95) name = (r() < 0.5 ? pick(PRE).toLowerCase() : pick(PRE)) + pick(CORE) + n();
  else name = `xX_${cap(pick(CORE))}${pick(CORE)}_Xx`;
  return name.slice(0, 20);
}

/** A believable record for a new bot account at this rating. */
function botStats(rating: number): UserStats {
  const matches = 15 + Math.floor(Math.random() * 180);
  const winShare = Math.min(0.75, Math.max(0.25, 0.5 + (rating - START_RATING) / 2000 + (Math.random() - 0.5) * 0.1));
  const wins = Math.round(matches * winShare);
  return {
    matches, wins, losses: matches - wins,
    roundsWon: Math.round(wins * (1.6 + Math.random() * 0.4) + (matches - wins) * 0.5),
    unitsKilled: Math.round(matches * (180 + Math.random() * 220)),
    rescueStrikesUsed: Math.round(matches * (1.2 + Math.random())),
    rating: Math.round(rating + (Math.random() - 0.5) * 60),
    peakRating: Math.round(rating + 20 + Math.random() * 120),
  };
}
