/**
 * Offline check of the in-game AI: plays every difficulty pairing on the simulation directly.
 * Usage: npx tsx server/scripts/aiBalance.ts [games=10]
 */
import { AI_LEVELS, AiPlayer, Sim, TICK_RATE, type AiLevel, type FactionId, type PlayerCommand } from '@bc/shared';

const N = Number(process.argv[2] ?? 8);
const factions: FactionId[] = ['ironvow', 'thornwild'];
let slowest = 0;
const factionWins: Record<string, number> = { ironvow: 0, thornwild: 0 };
const only = process.argv[3]?.split(',');
for (let i = 0; i < AI_LEVELS.length; i++) {
  for (let j = i; j < AI_LEVELS.length; j++) {
    if (only && !only.includes(`${AI_LEVELS[i]}-${AI_LEVELS[j]}`)) continue;
    const a: AiLevel = AI_LEVELS[i], b: AiLevel = AI_LEVELS[j];
    const wins = { [a]: 0, [b]: 0, timeout: 0 } as Record<string, number>;
    let mins = 0, strikes = 0;
    for (let g = 0; g < N; g++) {
      // Alternate sides and factions.
      const swap = ((g >> 2) & 1) === 1;
      const lv: [AiLevel, AiLevel] = swap ? [b, a] : [a, b];
      const f: [FactionId, FactionId] = [factions[g & 1], factions[(g >> 1) & 1]];
      const sim = Sim.create({
        players: [{ userId: 'x', name: 'x', team: 0, faction: f[0] }, { userId: 'y', name: 'y', team: 1, faction: f[1] }],
        bestOf: 1, seed: 500 + g + 1000 * (i * 3 + j),
      });
      const ais = [new AiPlayer(0, lv[0], 31 + g), new AiPlayer(1, lv[1], 77 + g)];
      while (sim.state.phase === 'playing' && sim.state.tick < TICK_RATE * 60 * 90) {
        const cmds: PlayerCommand[] = [];
        const t0 = performance.now();
        for (const ai of ais) for (const cmd of ai.update(sim)) cmds.push({ player: ai.player, cmd });
        sim.step(cmds);
        slowest = Math.max(slowest, performance.now() - t0);
      }
      const w = sim.state.winner;
      if (w !== null && f[0] !== f[1]) factionWins[f[w]]++;
      if (w === null) wins.timeout++;
      else if (a === b) wins[a]++;
      else wins[lv[w]]++;
      mins += sim.state.tick / TICK_RATE / 60;
      strikes += sim.state.players.reduce((n, p) => n + p.strikes, 0);
    }
    console.log(`${a} vs ${b}:`, wins, `avg ${(mins / N).toFixed(1)} min, strikes/game ${(strikes / N).toFixed(1)}`);
  }
}
console.log('mixed-faction games won by:', factionWins);
console.log(`slowest tick incl. AI: ${slowest.toFixed(2)} ms`);
