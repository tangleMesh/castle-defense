/**
 * Offline balance check: runs bot-vs-bot rounds directly on the simulation
 * (no network) and reports win rates per faction and per side.
 * Usage: npx tsx server/scripts/balance.ts [rounds=20]
 */
import { Sim, TICK_RATE, makeSnapshot, type FactionId, type PlayerCommand } from '@bc/shared';
import { Bot } from './bot';

const N = Number(process.argv[2] ?? 20);
const pairs: Array<[FactionId, FactionId]> = [['ironvow', 'thornwild'], ['thornwild', 'ironvow'], ['ironvow', 'ironvow'], ['thornwild', 'thornwild']];
const tally: Record<string, number> = {};
const durations: number[] = [];
let maxUnits = 0, slowest = 0;

for (const [f0, f1] of pairs) {
  for (let r = 0; r < N; r++) {
    const sim = Sim.create({
      players: [
        { userId: 'a', name: 'a', team: 0, faction: f0 },
        { userId: 'b', name: 'b', team: 1, faction: f1 },
      ],
      bestOf: 1,
      seed: 1000 + r,
    });
    const bots = [new Bot('', 'a', f0, 11 + r), new Bot('', 'b', f1, 97 + r)];
    let queue: PlayerCommand[] = [];
    bots.forEach((b, i) => {
      b.you = i; b.team = i as 0 | 1;
      b.send = (m) => { if (m.type === 'cmd') queue.push({ player: i, cmd: m.cmd }); };
    });
    while (sim.state.phase === 'playing' && sim.state.tick < TICK_RATE * 60 * 40) {
      const t0 = performance.now();
      sim.step(queue);
      slowest = Math.max(slowest, performance.now() - t0);
      queue = [];
      if (sim.state.tick % 10 === 0) {
        const snap = makeSnapshot(sim, []);
        for (const b of bots) { b.snap = snap; b.think(); }
        maxUnits = Math.max(maxUnits, sim.state.entities.filter((e) => e.kind === 'unit').length);
      }
    }
    const w = sim.state.winner;
    const key = w === null ? `${f0} vs ${f1}: timeout` : `${f0} vs ${f1}: side ${w} (${w === 0 ? f0 : f1}) wins`;
    tally[key] = (tally[key] ?? 0) + 1;
    durations.push(sim.state.tick / TICK_RATE / 60);
  }
}
console.log(tally);
durations.sort((a, b) => a - b);
console.log(`round length (min): median ${durations[durations.length >> 1].toFixed(1)}, min ${durations[0].toFixed(1)}, max ${durations.at(-1)!.toFixed(1)}`);
console.log(`peak units: ${maxUnits}, slowest tick: ${slowest.toFixed(2)} ms`);
