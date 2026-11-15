// Worker thread of the simulation lab: plays matches / duels it receives and posts results back.
import { parentPort, workerData } from 'node:worker_threads';
import { applyPatch, duel, playMatch, type DuelSide, type LabMatch } from '@bc/shared';

// What-if balance changes (lab --patch) are applied to this worker's copy of the game data.
if (workerData?.patch) applyPatch(workerData.patch);

export type LabTask = { id: number; kind: 'match'; job: LabMatch } | { id: number; kind: 'duel'; a: DuelSide; b: DuelSide; seed: number; minutes: number };

parentPort!.on('message', (t: LabTask) => {
  const result = t.kind === 'match' ? playMatch(t.job) : duel(t.a, t.b, { seed: t.seed, minutes: t.minutes });
  parentPort!.postMessage({ id: t.id, result });
});
