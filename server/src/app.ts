import { existsSync } from 'node:fs';
import Fastify, { type FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import { WebSocketServer } from 'ws';
import { ClientMessageSchema } from '@bc/shared';
import { Conn } from './conn';
import { registerHttpRoutes } from './http';
import { Lobby } from './lobby';
import { Learner, type LearnerMode } from './learner';
import { toPublic, type Persistence } from './persistence';

export interface ServerOptions {
  persistence: Persistence;
  port: number;
  host?: string;
  /** Milliseconds per simulation tick (50 = real time at 20 Hz). */
  tickMs: number;
  clientDist?: string;
  logger?: boolean;
  /** Matchmaking: how long parties wait for humans before bots fill the match (seconds; tests use short waits). */
  matchmaking?: { botWait?: [number, number]; botWaitPerPlayer?: number; foundDelay?: number; newBotChance?: number; reconnectGrace?: number };
  /** Background bot learner (default: env LEARNER, else 'always'; tests: 'off'). */
  learner?: LearnerMode;
}

export interface RunningServer {
  app: FastifyInstance;
  lobby: Lobby;
  port: number;
  /** Save running matches, then stop accepting connections. */
  close(): Promise<void>;
}

/** HTTP API + static client + websocket game server on one port. */
export async function startServer(o: ServerOptions): Promise<RunningServer> {
  const db = o.persistence;
  const recovered = await db.savedGames.recoverLive();

  const app = Fastify({ logger: o.logger === false ? false : { level: process.env.LOG_LEVEL ?? 'info' } });
  if (recovered) app.log.info(`${recovered} interrupted match(es) marked as saved`);
  registerHttpRoutes(app, db);
  app.get('/api/health', async () => ({ ok: true }));

  if (o.clientDist && existsSync(o.clientDist)) {
    await app.register(fastifyStatic, { root: o.clientDist });
  } else if (o.clientDist) {
    app.log.warn(`client build not found at ${o.clientDist}; run "npm run build" or use the Vite dev server`);
  }

  const lobby = new Lobby(db, o.tickMs, o.matchmaking);
  const mode = o.learner ?? ((process.env.LEARNER as LearnerMode | undefined) ?? (process.env.VITEST ? 'off' : 'always'));
  const learner = new Learner(db, { mode, busy: () => lobby.liveMatches() > 0, gamesPerHour: Number(process.env.LEARNER_GAMES_PER_HOUR) || undefined /* unset or 0: unlimited */ });
  await learner.start();
  lobby.learner = learner;
  app.get('/api/learner', async () => learner.status());
  // Admin (header x-admin-token = env ADMIN_TOKEN): roll the bots' models back, or switch them off/on.
  const admin = (req: { headers: Record<string, unknown> }) => !!process.env.ADMIN_TOKEN && req.headers['x-admin-token'] === process.env.ADMIN_TOKEN;
  app.post<{ Body: { version?: number } }>('/api/learner/rollback', async (req, reply) => {
    if (!admin(req)) return reply.code(403).send({ error: 'forbidden' });
    return learner.rollback(Number(req.body?.version)) ? { ok: true } : reply.code(404).send({ error: 'unknown version' });
  });
  app.post<{ Body: { enabled?: boolean } }>('/api/learner/models', async (req, reply) => {
    if (!admin(req)) return reply.code(403).send({ error: 'forbidden' });
    learner.setModelsEnabled(!!req.body?.enabled);
    return { ok: true };
  });
  const wss = new WebSocketServer({ noServer: true, perMessageDeflate: { threshold: 1024 }, maxPayload: 64 * 1024 });

  app.server.on('upgrade', (req, socket, head) => {
    if (!req.url?.startsWith('/ws')) return socket.destroy();
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  });

  wss.on('connection', (ws) => {
    const conn = new Conn(ws);
    let alive = true;
    ws.on('pong', () => { alive = true; });
    const ping = setInterval(() => {
      if (!alive) return ws.terminate();
      alive = false;
      ws.ping();
    }, 15_000);

    // Process messages strictly in order per connection (auth is async).
    let chain: Promise<void> = Promise.resolve();
    ws.on('message', (data) => {
      chain = chain.then(async () => {
        let raw: unknown;
        try { raw = JSON.parse(data.toString()); } catch { return conn.send({ type: 'error', message: 'Bad JSON' }); }
        const parsed = ClientMessageSchema.safeParse(raw);
        if (!parsed.success) return conn.send({ type: 'error', message: 'Invalid message' });
        const msg = parsed.data;
        if (!conn.authed) {
          if (msg.type !== 'auth') return conn.send({ type: 'error', message: 'Not authenticated' });
          const user = await db.users.userForToken(msg.token);
          if (!user) { conn.send({ type: 'error', message: 'Session expired' }); ws.close(4001, 'auth'); return; }
          conn.userId = user._id!.toHexString();
          conn.username = user.username;
          conn.send({ type: 'auth.ok', user: toPublic(user) });
          lobby.connect(conn);
          return;
        }
        await lobby.handle(conn, msg);
      }).catch((err) => app.log.error(err));
    });
    ws.on('close', () => {
      clearInterval(ping);
      chain = chain.then(() => { if (conn.authed) lobby.disconnect(conn); });
    });
  });

  await app.listen({ port: o.port, host: o.host ?? '0.0.0.0' });
  const addr = app.server.address();
  const port = typeof addr === 'object' && addr ? addr.port : o.port;

  return {
    app, lobby, port,
    async close() {
      lobby.matchmaker.stop();
      await lobby.shutdown();
      await learner.stop();
      for (const c of wss.clients) c.terminate();
      wss.close();
      await app.close();
    },
  };
}
