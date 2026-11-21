import { Mlp, type MlpJson } from './mlp';

/**
 * The live learned models (set by the server's learner, absent in the lab unless pinned):
 * - value: P(winning the round) from observedFeatures;
 * - policy: which building category a good player builds next (CATEGORIES order).
 * Bots fall back to their scripted judgement whenever a model is missing or switched off.
 */
let VALUE: Mlp | null = null, POLICY: Mlp | null = null, ENABLED = true, VERSION = 0;

export interface ModelSet { value?: MlpJson; policy?: MlpJson; enabled?: boolean; version?: number }

export function setModels(m: ModelSet | null | undefined) {
  VALUE = m?.value ? Mlp.fromJSON(m.value) : null;
  POLICY = m?.policy ? Mlp.fromJSON(m.policy) : null;
  ENABLED = m?.enabled ?? true;
  VERSION = m?.version ?? 0;
}

export function modelVersion() { return VERSION; }
export function valueModel(): Mlp | null { return ENABLED ? VALUE : null; }
export function policyModel(): Mlp | null { return ENABLED ? POLICY : null; }
