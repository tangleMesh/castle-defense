import { RESCUE_RADIUS } from '../constants';
import { UNITS } from '../data';
import type { Sim } from './sim';
import { rewardKill } from './combat';

/**
 * Resolve pending rescue strikes: after the telegraph, every enemy unit in the circle dies.
 * Strike kills count as regular kills of the caster and pay the full bounty.
 */
export function stepStrikes(sim: Sim) {
  const s = sim.state;
  if (!s.strikes.length) return;
  const remaining = [];
  for (const st of s.strikes) {
    if (--st.ticksLeft > 0) { remaining.push(st); continue; }
    const team = s.players[st.player].team;
    let kills = 0;
    for (const e of s.entities) {
      if (e.kind !== 'unit' || e.team === team || e.hp <= 0) continue;
      if (Math.hypot(e.x - st.x, e.y - st.y) - UNITS[e.type].radius <= RESCUE_RADIUS) {
        e.hp = 0;
        rewardKill(sim, e, st.player);
        kills++;
      }
    }
    sim.emit({ t: 'strike', p: st.player, x: st.x, y: st.y, hit: 1, kills });
  }
  s.strikes = remaining;
}
