import { randomBytes } from 'node:crypto';
import { ObjectId } from 'mongodb';
import type { SimState, UserStats } from '@bc/shared';
import type { MatchDoc, SavedGameDoc, UserDoc } from './db';
import type { Persistence } from './index';
import { EMPTY_STATS } from './users';

const clone = <T>(v: T): T => structuredClone(v);
/** structuredClone drops the ObjectId class, so rebuild it. */
const cloneUser = <T extends UserDoc>(u: T): T => ({ ...clone(u), _id: new ObjectId(u._id!.toHexString()) });

/**
 * In-memory persistence with the same API as the MongoDB repositories.
 * Used by tests; NOT for production (no password hashing, nothing survives a restart).
 */
export function createMemoryPersistence(): Persistence {
  const users = new Map<string, UserDoc & { password: string }>();
  const sessions = new Map<string, string>();
  const matches: MatchDoc[] = [];
  const saved = new Map<string, SavedGameDoc>();

  return {
    users: {
      async register(username: string, password: string) {
        if ([...users.values()].some((u) => u.usernameLower === username.toLowerCase())) throw Object.assign(new Error('dup'), { code: 11000 });
        const doc = { _id: new ObjectId(), username, usernameLower: username.toLowerCase(), passwordHash: '', password, createdAt: new Date(), stats: { ...EMPTY_STATS } };
        users.set(doc._id.toHexString(), doc);
        return cloneUser(doc);
      },
      async verify(username: string, password: string) {
        const u = [...users.values()].find((x) => x.usernameLower === username.toLowerCase());
        return u && u.password === password ? cloneUser(u) : null;
      },
      async byId(id: string) { const u = users.get(id); return u ? cloneUser(u) : null; },
      async createSession(userId: string) { const t = randomBytes(12).toString('hex'); sessions.set(t, userId); return t; },
      async userForToken(token: string) { const id = sessions.get(token); const u = id ? users.get(id) : undefined; return u ? cloneUser(u) : null; },
      async deleteSession(token: string) { sessions.delete(token); },
      async addStats(userId: string, inc: Partial<UserStats>) {
        const u = users.get(userId);
        if (!u) return;
        for (const [k, v] of Object.entries(inc)) (u.stats as unknown as Record<string, number>)[k] = ((u.stats as unknown as Record<string, number>)[k] ?? 0) + (v ?? 0);
      },
      async setRating(userId: string, rating: number) {
        const u = users.get(userId);
        if (!u) return;
        u.stats = { ...EMPTY_STATS, ...u.stats, rating, peakRating: Math.max(u.stats.peakRating ?? EMPTY_STATS.peakRating, rating) };
      },
    },
    matches: {
      async insert(doc: MatchDoc) { matches.push(clone(doc)); },
      async historyFor(userId: string) { return clone(matches.filter((m) => m.players.some((p) => p.userId === userId)).reverse()); },
    },
    savedGames: {
      async create(doc: Omit<SavedGameDoc, 'updatedAt'>) { saved.set(doc._id, { ...clone(doc), updatedAt: new Date() }); },
      async snapshot(id: string, state: SimState, status: SavedGameDoc['status']) {
        const d = saved.get(id);
        if (d) Object.assign(d, { status, simState: clone(state), score: [state.score[0], state.score[1]], round: state.round, tick: state.tick, updatedAt: new Date() });
      },
      async finish(id: string) { const d = saved.get(id); if (d) { d.status = 'finished'; delete d.simState; } },
      async setLive(id: string) { const d = saved.get(id); if (d) d.status = 'live'; },
      async get(id: string) { const d = saved.get(id); return d ? clone(d) : null; },
      async listForUser(userId: string) {
        return clone([...saved.values()].filter((d) => d.status === 'saved' && d.userIds.includes(userId)).map(({ simState: _s, ...rest }) => rest as SavedGameDoc));
      },
      async discard(id: string, userId: string) {
        const d = saved.get(id);
        if (!d || d.status !== 'saved' || !d.userIds.includes(userId)) return false;
        return saved.delete(id);
      },
      async recoverLive() {
        let n = 0;
        for (const d of saved.values()) if (d.status === 'live' && d.simState) { d.status = 'saved'; n++; }
        return n;
      },
    },
    async close() {},
  };
}
