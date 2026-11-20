import { BASE_INCOME, INCOME_INTERVAL_TICKS, INCOME_PCT, MAX_INCOME_BONUS, TREASURE_BONUS, TREASURE_DECAY } from '../constants';
import { BUILDINGS } from '../data';
import type { Sim } from './sim';

/** Gold the player will receive at the next income tick. */
export function incomeFor(sim: Sim, player: number): number {
  // The map's income: 5 + every building's value × its rate, times the Treasure Box multiplier.
  let base = BASE_INCOME, bonus = 0, boxes = 0;
  for (const e of sim.state.entities) {
    if (e.kind !== 'building' || e.owner !== player) continue;
    const def = BUILDINGS[e.type];
    base += (e.value ?? 0) * (def.incomeRate ?? INCOME_PCT);
    if (!e.buildLeft) { bonus += def.incomeBonus ?? 0; if (def.treasure) boxes++; }
  }
  const treasure = TREASURE_BONUS * (1 - TREASURE_DECAY ** boxes) / (1 - TREASURE_DECAY);
  const mult = sim.state.players[player]?.incomeMult ?? 1;
  return Math.floor(base * (1 + treasure + Math.min(bonus, MAX_INCOME_BONUS)) * mult);
}

export function stepEconomy(sim: Sim) {
  const s = sim.state;
  if (--s.incomeTicks > 0) return;
  s.incomeTicks = INCOME_INTERVAL_TICKS;
  const amounts = s.players.map((p) => {
    const amount = incomeFor(sim, p.index);
    p.gold += amount;
    p.goldEarned += amount;
    return amount;
  });
  sim.emit({ t: 'income', amounts });
}
