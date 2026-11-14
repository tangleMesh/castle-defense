import { BASE_INCOME, INCOME_INTERVAL_TICKS, INCOME_PCT, MAX_INCOME_BONUS } from '../constants';
import { BUILDINGS } from '../data';
import type { Sim } from './sim';

/** Gold the player will receive at the next income tick. */
export function incomeFor(sim: Sim, player: number): number {
  let value = 0, bonus = 0;
  for (const e of sim.state.entities) {
    if (e.kind !== 'building' || e.owner !== player) continue;
    value += e.value ?? 0;
    if (!e.buildLeft) bonus += BUILDINGS[e.type].incomeBonus ?? 0;
  }
  return Math.floor((BASE_INCOME + INCOME_PCT * value) * (1 + Math.min(bonus, MAX_INCOME_BONUS)));
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
