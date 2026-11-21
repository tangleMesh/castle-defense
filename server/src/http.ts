import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { Persistence } from './persistence';
import { EMPTY_STATS, toPublic } from './persistence';
import type { LeaderboardEntry } from '@bc/shared';

const Credentials = z.object({
  username: z.string().trim().min(3).max(20).regex(/^[A-Za-z0-9_\-]+$/, 'Letters, digits, _ and - only'),
  password: z.string().min(4).max(100),
});

async function userFromRequest(db: Persistence, req: FastifyRequest) {
  const h = req.headers.authorization ?? '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  return token ? db.users.userForToken(token) : null;
}

/** REST API: accounts, profile/stats, match history and saved games. */
export function registerHttpRoutes(app: FastifyInstance, db: Persistence) {
  app.post('/api/register', async (req, reply) => {
    const parsed = Credentials.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues[0].message });
    try {
      const user = await db.users.register(parsed.data.username, parsed.data.password);
      const token = await db.users.createSession(user._id!.toHexString());
      return { token, user: toPublic(user) };
    } catch (err: unknown) {
      if ((err as { code?: number }).code === 11000) return reply.code(409).send({ error: 'Username is taken' });
      throw err;
    }
  });

  app.post('/api/login', async (req, reply) => {
    const parsed = Credentials.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid username or password' });
    const user = await db.users.verify(parsed.data.username, parsed.data.password);
    if (!user) return reply.code(401).send({ error: 'Invalid username or password' });
    const token = await db.users.createSession(user._id!.toHexString());
    return { token, user: toPublic(user) };
  });

  app.post('/api/logout', async (req) => {
    const h = req.headers.authorization ?? '';
    if (h.startsWith('Bearer ')) await db.users.deleteSession(h.slice(7));
    return { ok: true };
  });

  app.get('/api/me', async (req, reply) => {
    const user = await userFromRequest(db, req);
    if (!user) return reply.code(401).send({ error: 'Not signed in' });
    return { user: toPublic(user) };
  });

  // Elo leaderboard: the top 100 accounts with at least one match, plus the caller's own rank.
  app.get('/api/leaderboard', async (req) => {
    const rows = await db.users.leaderboard(100);
    const entry = (u: (typeof rows)[number], rank: number): LeaderboardEntry => {
      const st = { ...EMPTY_STATS, ...u.stats };
      return { rank, userId: u._id!.toHexString(), username: u.username, rating: st.rating, peakRating: st.peakRating, wins: st.wins, losses: st.losses, matches: st.matches };
    };
    // Equal ratings share a rank (1, 2, 2, 4 …).
    const top: LeaderboardEntry[] = [];
    rows.forEach((u, i) => {
      const prev = top[i - 1];
      top.push(entry(u, prev && prev.rating === (u.stats?.rating ?? EMPTY_STATS.rating) ? prev.rank : i + 1));
    });
    const me = await userFromRequest(db, req);
    let you: LeaderboardEntry | null = null;
    if (me && (me.stats?.matches ?? 0) > 0) you = top.find((t) => t.userId === me._id!.toHexString()) ?? entry(me, (await db.users.countAbove(me.stats.rating)) + 1);
    return { top, you };
  });

  app.get('/api/history', async (req, reply) => {
    const user = await userFromRequest(db, req);
    if (!user) return reply.code(401).send({ error: 'Not signed in' });
    return { matches: await db.matches.historyFor(user._id!.toHexString()) };
  });

  app.get('/api/saved', async (req, reply) => {
    const user = await userFromRequest(db, req);
    if (!user) return reply.code(401).send({ error: 'Not signed in' });
    return { saved: await db.savedGames.listForUser(user._id!.toHexString()) };
  });

  app.delete('/api/saved/:id', async (req, reply) => {
    const user = await userFromRequest(db, req);
    if (!user) return reply.code(401).send({ error: 'Not signed in' });
    const ok = await db.savedGames.discard((req.params as { id: string }).id, user._id!.toHexString());
    return ok ? { ok } : reply.code(404).send({ error: 'Not found' });
  });
}
