// Worker thread of the simulation lab: plays matches / duels it receives and posts results back.
import { parentPort, workerData } from 'node:worker_threads';
import { applyPatch, applyTuning, duel, playMatch, type DuelSide, type LabMatch, type Tuning } from '@bc/shared';

// What-if balance changes (lab --patch) are applied to this worker's copy of the game data.
const patch = workerData?.patch as Record<string, unknown> | undefined;
if (patch) applyPatch(patch);

export type LabTask = ({ kind: 'match'; job: LabMatch } | { kind: 'duel'; a: DuelSide; b: DuelSide; seed: number; minutes: number }) & { id: number; tuning?: Tuning };

// A task may carry a candidate tuning (npm run balance); it's applied whenever it changes.
let current = '';
parentPort!.on('message', (t: LabTask) => {
  if (t.tuning) {
    const key = JSON.stringify(t.tuning);
    if (key !== current) {
      current = key;
      applyTuning(t.tuning);
      if (patch) applyPatch(patch);
    }
  }
  const result = t.kind === 'match' ? playMatch(t.job) : duel(t.a, t.b, { seed: t.seed, minutes: t.minutes });
  parentPort!.postMessage({ id: t.id, result });
});
