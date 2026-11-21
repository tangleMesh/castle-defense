/**
 * Skill ↔ Elo. A bot's skill (0 = the old Easy brain, 0.5 = Normal, 1 = Hard, up to 1.5 = sharper
 * than Hard, never cheating) maps onto the Elo scale of human accounts, so an "Auto" bot plays as
 * strong as the players it meets. The curve is a list of (elo, skill) anchors, monotone in both; the
 * background learner refits it from real results (bots that beat their target Elo too often get a
 * lower skill for that Elo, and vice versa).
 */
export type SkillCurve = Array<[elo: number, skill: number]>;

export const MIN_SKILL = 0;
export const MAX_SKILL = 1.5;

/** Starting curve: the old presets' Elo (Easy 800, Normal 1000, Hard 1200) and beyond. */
export const DEFAULT_SKILL_CURVE: SkillCurve = [[500, 0], [800, 0.05], [1000, 0.5], [1200, 1], [1500, 1.3], [1900, 1.5]];

let active: SkillCurve = DEFAULT_SKILL_CURVE;

/** Replaces the curve (the learner's latest fit). Invalid curves are ignored. */
export function setSkillCurve(curve: SkillCurve | null | undefined) {
  if (!curve || curve.length < 2) { active = DEFAULT_SKILL_CURVE; return; }
  const sorted = [...curve].sort((a, b) => a[0] - b[0]);
  // Enforce monotonicity (higher Elo never means a weaker bot).
  for (let i = 1; i < sorted.length; i++) sorted[i] = [sorted[i][0], Math.max(sorted[i][1], sorted[i - 1][1])];
  active = sorted.map(([e, s]) => [e, Math.min(MAX_SKILL, Math.max(MIN_SKILL, s))]);
}

export function skillCurve(): SkillCurve {
  return active;
}

const interp = (pts: Array<[number, number]>, x: number) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    if (x <= x1) return x1 === x0 ? y1 : y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return pts[pts.length - 1][1];
};

/** The bot skill that plays at this Elo. */
export function skillForElo(elo: number, curve = active): number {
  return interp(curve, elo);
}

/** The Elo a bot of this skill plays at (inverse of the curve). */
export function eloForSkill(skill: number, curve = active): number {
  const inv = curve.map(([e, s]) => [s, e] as [number, number]).filter((p, i, a) => i === 0 || p[0] > a[i - 1][0]);
  return interp(inv, skill);
}
