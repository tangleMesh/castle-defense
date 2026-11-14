import type { Collections, MatchDoc } from './db';

export class MatchRepo {
  constructor(private c: Collections) {}

  async insert(doc: MatchDoc) {
    await this.c.matches.insertOne(doc);
  }

  async historyFor(userId: string, limit = 20): Promise<MatchDoc[]> {
    return this.c.matches.find({ 'players.userId': userId }).sort({ endedAt: -1 }).limit(limit).toArray();
  }
}
