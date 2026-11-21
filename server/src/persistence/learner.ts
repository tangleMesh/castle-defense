import type { Sample } from '@bc/shared';
import type { Collections, LearnerDoc } from './db';

const ID = 'state';
const SAMPLE_CAP = 100_000;

/** The bots' learned knowledge: a single document, replaced on every save. */
export class LearnerRepo {
  constructor(private c: Collections) {}

  async load(): Promise<LearnerDoc | null> {
    return this.c.learner.findOne({ _id: ID });
  }

  /** Keeps samples from real matches (the newest SAMPLE_CAP per kind survive). */
  async addSamples(kind: 'value' | 'policy', samples: Sample[]) {
    if (!samples.length) return;
    const at = new Date();
    await this.c.samples.insertMany(samples.map((s) => ({ kind, x: s.x, y: s.y, w: s.w, human: s.human, at })));
    const n = await this.c.samples.countDocuments({ kind });
    if (n > SAMPLE_CAP) {
      const cut = await this.c.samples.find({ kind }).sort({ at: -1 }).skip(SAMPLE_CAP).limit(1).next();
      if (cut) await this.c.samples.deleteMany({ kind, at: { $lte: cut.at } });
    }
  }

  async recentSamples(kind: 'value' | 'policy', limit: number): Promise<Sample[]> {
    const docs = await this.c.samples.find({ kind }).sort({ at: -1 }).limit(limit).toArray();
    return docs.map((d) => ({ x: d.x, y: d.y, w: d.w, human: d.human }));
  }

  async save(doc: Omit<LearnerDoc, '_id' | 'updatedAt'>) {
    await this.c.learner.replaceOne({ _id: ID }, { ...doc, updatedAt: new Date() }, { upsert: true });
  }
}
