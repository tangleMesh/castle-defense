import { MongoClient, type Db } from 'mongodb';
import type { SimState, FactionId, UserStats } from '@bc/shared';

export interface UserDoc {
  _id?: import('mongodb').ObjectId;
  username: string;
  usernameLower: string;
  passwordHash: string;
  createdAt: Date;
  stats: UserStats;
}

export interface SessionDoc {
  _id: string;
  userId: string;
  createdAt: Date;
}

export interface MatchPlayerDoc {
  userId: string;
  name: string;
  team: 0 | 1;
  faction: FactionId;
  kills: number;
  strikes: number;
  goldEarned: number;
}

export interface MatchDoc {
  _id: string;
  players: MatchPlayerDoc[];
  bestOf: number;
  rounds: Array<{ winner: 0 | 1; durationTicks: number }>;
  score: [number, number];
  winnerTeam: 0 | 1;
  startedAt: Date;
  endedAt: Date;
}

export interface SavedGameDoc {
  _id: string;
  status: 'live' | 'saved' | 'finished';
  name: string;
  hostId: string;
  bestOf: number;
  players: Array<{ userId: string; name: string; team: 0 | 1; faction: FactionId }>;
  userIds: string[];
  score: [number, number];
  round: number;
  tick: number;
  simState?: SimState;
  startedAt: Date;
  updatedAt: Date;
}

export interface Collections {
  db: Db;
  users: import('mongodb').Collection<UserDoc>;
  sessions: import('mongodb').Collection<SessionDoc>;
  matches: import('mongodb').Collection<MatchDoc>;
  savedGames: import('mongodb').Collection<SavedGameDoc>;
  close(): Promise<void>;
}

export async function connectDb(url: string, dbName = 'bastion_clash'): Promise<Collections> {
  const client = new MongoClient(url);
  // Mongo may still be starting when the server container comes up: retry for ~30 s.
  for (let attempt = 1; ; attempt++) {
    try {
      await client.connect();
      break;
    } catch (err) {
      if (attempt >= 30) throw err;
      console.log(`[db] waiting for MongoDB (${attempt})…`);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  const db = client.db(dbName);
  const c: Collections = {
    db,
    users: db.collection<UserDoc>('users'),
    sessions: db.collection<SessionDoc>('sessions'),
    matches: db.collection<MatchDoc>('matches'),
    savedGames: db.collection<SavedGameDoc>('savedGames'),
    close: () => client.close(),
  };
  await Promise.all([
    c.users.createIndex({ usernameLower: 1 }, { unique: true }),
    c.sessions.createIndex({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 }),
    c.matches.createIndex({ 'players.userId': 1, endedAt: -1 }),
    c.savedGames.createIndex({ userIds: 1, status: 1, updatedAt: -1 }),
  ]);
  return c;
}
