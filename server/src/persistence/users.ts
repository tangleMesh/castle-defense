import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';
import { START_RATING, type PublicUser, type UserStats } from '@bc/shared';
import type { Collections, UserDoc } from './db';

export const EMPTY_STATS: UserStats = { wins: 0, losses: 0, roundsWon: 0, unitsKilled: 0, rescueStrikesUsed: 0, matches: 0, rating: START_RATING, peakRating: START_RATING };

export function toPublic(u: UserDoc): PublicUser {
  return { id: u._id!.toHexString(), username: u.username, stats: { ...EMPTY_STATS, ...u.stats } };
}

export class UserRepo {
  constructor(private c: Collections) {}

  async register(username: string, password: string): Promise<UserDoc> {
    const doc: UserDoc = {
      username,
      usernameLower: username.toLowerCase(),
      passwordHash: await bcrypt.hash(password, 10),
      createdAt: new Date(),
      stats: { ...EMPTY_STATS },
    };
    const res = await this.c.users.insertOne(doc);
    return { ...doc, _id: res.insertedId };
  }

  /**
   * A matchmaking bot account: a normal-looking player (name, rating, some history) that can't sign
   * in. Throws on a taken name (unique index), like register.
   */
  async createBot(username: string, stats: UserStats): Promise<UserDoc> {
    const doc: UserDoc = { username, usernameLower: username.toLowerCase(), passwordHash: '!', createdAt: new Date(Date.now() - Math.random() * 200 * 86400_000), stats, bot: true };
    const res = await this.c.users.insertOne(doc);
    return { ...doc, _id: res.insertedId };
  }

  async listBots(): Promise<UserDoc[]> {
    return this.c.users.find({ bot: true }).toArray();
  }

  /** Accounts with at least one finished match, best Elo first (ties: more wins, then older account). */
  async leaderboard(limit: number): Promise<UserDoc[]> {
    return this.c.users.find({ 'stats.matches': { $gt: 0 } }).sort({ 'stats.rating': -1, 'stats.wins': -1, createdAt: 1 }).limit(limit).toArray();
  }

  /** How many ranked accounts are ahead of this rating. */
  async countAbove(rating: number): Promise<number> {
    return this.c.users.countDocuments({ 'stats.matches': { $gt: 0 }, 'stats.rating': { $gt: rating } });
  }

  async verify(username: string, password: string): Promise<UserDoc | null> {
    const u = await this.c.users.findOne({ usernameLower: username.toLowerCase() });
    if (!u || u.bot || !(await bcrypt.compare(password, u.passwordHash))) return null;
    return u;
  }

  async byId(id: string): Promise<UserDoc | null> {
    if (!ObjectId.isValid(id)) return null;
    return this.c.users.findOne({ _id: new ObjectId(id) });
  }

  async createSession(userId: string): Promise<string> {
    const token = randomBytes(24).toString('base64url');
    await this.c.sessions.insertOne({ _id: token, userId, createdAt: new Date() });
    return token;
  }

  async userForToken(token: string): Promise<UserDoc | null> {
    const s = await this.c.sessions.findOne({ _id: token });
    return s ? this.byId(s.userId) : null;
  }

  async deleteSession(token: string) {
    await this.c.sessions.deleteOne({ _id: token });
  }

  async addStats(userId: string, inc: Partial<UserStats>) {
    const $inc: Record<string, number> = {};
    for (const [k, v] of Object.entries(inc)) if (v) $inc[`stats.${k}`] = v;
    if (Object.keys($inc).length) await this.c.users.updateOne({ _id: new ObjectId(userId) }, { $inc });
  }

  /** Sets the Elo rating (and raises the peak when it is a new high). */
  async setRating(userId: string, rating: number) {
    if (!ObjectId.isValid(userId)) return;
    await this.c.users.updateOne({ _id: new ObjectId(userId) }, { $set: { 'stats.rating': rating }, $max: { 'stats.peakRating': rating } });
  }
}
