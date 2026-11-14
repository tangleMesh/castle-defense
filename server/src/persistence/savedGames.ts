import type { SimState } from '@bc/shared';
import type { Collections, SavedGameDoc } from './db';

export class SavedGameRepo {
  constructor(private c: Collections) {}

  async create(doc: Omit<SavedGameDoc, 'updatedAt'>) {
    await this.c.savedGames.insertOne({ ...doc, updatedAt: new Date() });
  }

  /** Persist the current simulation state, optionally changing the status. */
  async snapshot(id: string, state: SimState, status: SavedGameDoc['status']) {
    await this.c.savedGames.updateOne(
      { _id: id },
      {
        $set: {
          status,
          simState: state,
          score: [state.score[0], state.score[1]],
          round: state.round,
          tick: state.tick,
          updatedAt: new Date(),
        },
      },
    );
  }

  async finish(id: string) {
    await this.c.savedGames.updateOne({ _id: id }, { $set: { status: 'finished', updatedAt: new Date() }, $unset: { simState: '' } });
  }

  async setLive(id: string) {
    await this.c.savedGames.updateOne({ _id: id }, { $set: { status: 'live', updatedAt: new Date() } });
  }

  get(id: string) {
    return this.c.savedGames.findOne({ _id: id });
  }

  /** Saved (resumable) games that include this user; the heavy simState is omitted. */
  listForUser(userId: string) {
    return this.c.savedGames
      .find({ userIds: userId, status: 'saved' }, { projection: { simState: 0 } })
      .sort({ updatedAt: -1 })
      .limit(20)
      .toArray();
  }

  async discard(id: string, userId: string) {
    const res = await this.c.savedGames.deleteOne({ _id: id, status: 'saved', userIds: userId });
    return res.deletedCount === 1;
  }

  /** Crash recovery: matches that were live when the server stopped become resumable. */
  async recoverLive(): Promise<number> {
    const res = await this.c.savedGames.updateMany(
      { status: 'live', simState: { $exists: true } },
      { $set: { status: 'saved', updatedAt: new Date() } },
    );
    return res.modifiedCount;
  }
}
