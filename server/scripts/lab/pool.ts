// A small worker pool so lab runs use every CPU core.
import { availableParallelism } from 'node:os';
import { Worker } from 'node:worker_threads';
import type { DuelResult, LabMatch, LabResult, DuelSide, Tuning } from '@bc/shared';
import type { LabTask } from './worker';

type Pending = { task: LabTask; resolve: (r: unknown) => void };

export class LabPool {
  private workers: Worker[] = [];
  private idle: Worker[] = [];
  private queue: Pending[] = [];
  private running = new Map<number, Pending>();
  private nextId = 1;
  done = 0;
  total = 0;
  onProgress?: (done: number, total: number) => void;

  constructor(size = Number(process.env.LAB_THREADS) || Math.max(1, availableParallelism()), patch?: Record<string, unknown>) {
    for (let i = 0; i < size; i++) {
      const w = new Worker(new URL('./worker-boot.mjs', import.meta.url), { workerData: { patch } });
      w.on('message', ({ id, result }: { id: number; result: unknown }) => {
        const p = this.running.get(id)!;
        this.running.delete(id);
        this.done++;
        this.onProgress?.(this.done, this.total);
        p.resolve(result);
        this.idle.push(w);
        this.pump();
      });
      w.on('error', (e) => { console.error('[lab worker]', e); process.exit(1); });
      this.workers.push(w);
      this.idle.push(w);
    }
  }

  private pump() {
    while (this.idle.length && this.queue.length) {
      const w = this.idle.pop()!, p = this.queue.shift()!;
      this.running.set(p.task.id, p);
      w.postMessage(p.task);
    }
  }

  /** Tuning sent with every task (the balancer swaps candidates); undefined = the committed one. */
  tuning?: Tuning;

  private run<T>(task: { kind: 'match'; job: LabMatch } | { kind: 'duel'; a: DuelSide; b: DuelSide; seed: number; minutes: number }): Promise<T> {
    this.total++;
    return new Promise((resolve) => {
      this.queue.push({ task: { ...task, id: this.nextId++, tuning: this.tuning } as LabTask, resolve: resolve as (r: unknown) => void });
      this.pump();
    });
  }

  match(job: LabMatch): Promise<LabResult> { return this.run({ kind: 'match', job }); }
  duel(a: DuelSide, b: DuelSide, seed = 7, minutes = 5): Promise<DuelResult> { return this.run({ kind: 'duel', a, b, seed, minutes }); }

  async close() { await Promise.all(this.workers.map((w) => w.terminate())); }
}

/** Progress line on stderr (keeps stdout clean for reports). */
export function progress(label: string) {
  const t0 = Date.now();
  return (done: number, total: number) => {
    if (done === total || done % 4 === 0) process.stderr.write(`\r${label}: ${done}/${total} (${((Date.now() - t0) / 1000).toFixed(0)} s)   ${done === total ? '\n' : ''}`);
  };
}
