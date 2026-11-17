import { describe, expect, it } from 'vitest';
import { AiPlayer, MAP, Sim, makeBotId, type FactionId, type PlayerCommand } from '../src/index';

/**
 * The map is point-symmetric, so two identical bots playing a mirror match must produce exact
 * mirror images of each other (up to floating-point rounding, which only grows once units grind
 * against the rocks in the middle). Any earlier divergence means some rule favours one side:
 * processing order, tie-breaks, spawn jitter or random draws.
 */
function firstAsymmetry(faction: FactionId, ticks: number): string | null {
  const sim = Sim.create({ countdownTicks: 0,
    players: [
      { userId: makeBotId('hard', 'a'), name: 'a', team: 0, faction },
      { userId: makeBotId('hard', 'b'), name: 'b', team: 1, faction },
    ],
    bestOf: 1, seed: 5,
  });
  const ais = [new AiPlayer(0, 'hard', 42), new AiPlayer(1, 'hard', 42)];
  // Bots are normally staggered by team slot; line them up for an exact mirror.
  (ais[1] as unknown as { nextThink: number }).nextThink = (ais[0] as unknown as { nextThink: number }).nextThink;
  const W = MAP.width, H = MAP.height;
  for (let t = 0; t < ticks; t++) {
    const cmds: PlayerCommand[] = [];
    for (const ai of ais) for (const cmd of ai.update(sim)) cmds.push({ player: ai.player, cmd });
    sim.step(cmds);
    const a = sim.state.entities.filter((e) => e.team === 0 && e.kind !== 'castle');
    const b = sim.state.entities.filter((e) => e.team === 1 && e.kind !== 'castle');
    if (a.length !== b.length) return `tick ${sim.state.tick}: ${a.length} vs ${b.length} entities`;
    for (const e of a) {
      const m = b.find((o) => o.type === e.type && Math.abs(o.x - (W - e.x)) < 1e-3 && Math.abs(o.y - (H - e.y)) < 1e-3 && Math.abs(o.hp - e.hp) < 1e-3);
      if (!m) return `tick ${sim.state.tick}: ${e.type}#${e.id} at ${e.x.toFixed(4)},${e.y.toFixed(4)} has no mirror`;
    }
  }
  return null;
}

describe('side symmetry', () => {
  // ~55 s of play: buildings, spawns, marching and the first clashes in the middle.
  it.each(['ironvow', 'thornwild'] as const)('a %s mirror match stays an exact mirror image', (f) => {
    expect(firstAsymmetry(f, 1100)).toBeNull();
  });
});
