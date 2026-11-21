import type { Collections, LearnerDoc } from './db';

const ID = 'state';

/** The bots' learned knowledge: a single document, replaced on every save. */
export class LearnerRepo {
  constructor(private c: Collections) {}

  async load(): Promise<LearnerDoc | null> {
    return this.c.learner.findOne({ _id: ID });
  }

  async save(doc: Omit<LearnerDoc, '_id' | 'updatedAt'>) {
    await this.c.learner.replaceOne({ _id: ID }, { ...doc, updatedAt: new Date() }, { upsert: true });
  }
}
