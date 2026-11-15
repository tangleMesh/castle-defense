/**
 * Sparring partners: the hard bot's brain pushed towards one human-style strategy each.
 * A good bot must beat all of them, not just copies of itself.
 */
import type { Profile } from '../ai/ai';

export const SPARRING: Record<string, Partial<Profile>> = {
  /** Towers and auras first, then units: the classic human turtle. */
  turtle: { bias: { tower: 3, aura: 1.6 } },
  /** Masses ranged units behind a thin line. */
  ranged: { bias: { ranged: 3 } },
  /** Pure melee / frontline. */
  melee: { bias: { melee: 3 } },
  /** Many cheap bodies. */
  swarm: { bias: { swarm: 3 } },
  /** Goes for flyers to dodge ground melee. */
  air: { bias: { air: 4 } },
  /** Siege engines and rams to crack buildings. */
  siege: { bias: { siege: 3 } },
  /** Economy first (income / bounty buildings), army later. */
  greed: { bias: { eco: 3 } },
  /** Few buildings, upgraded early; special building and elite units. */
  tech: { bias: { upgrade: 3, special: 2 }, upgradeAfter: 1 },
  /** Scouts everything (no fog) and counters what it sees. */
  scout: { fullVision: true },
  /** All-in early aggression: cheap spawners only, never techs. */
  rush: { bias: { tower: 0.1, aura: 0.1, eco: 0.1, upgrade: 0.2, special: 0.1 } },
};
