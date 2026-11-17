import { describe, expect, it } from 'vitest';
import { spawnUnit } from '../src/sim/spawning';
import { AiPlayer, BUILDINGS, Sim, UNITS, TICK_RATE, botLevel, isBotId, makeBotId, type PlayerCommand, type SimEvent } from '../src';

function play(levels: ['easy' | 'normal' | 'hard', 'easy' | 'normal' | 'hard'], seed: number, maxMinutes = 45, swapFactions = false) {
  const f = swapFactions ? (['thornwild', 'ironvow'] as const) : (['ironvow', 'thornwild'] as const);
  const sim = Sim.create({
    players: [
      { userId: makeBotId(levels[0], 'a'), name: 'a', team: 0, faction: f[0] },
      { userId: makeBotId(levels[1], 'b'), name: 'b', team: 1, faction: f[1] },
    ],
    bestOf: 1, seed,
  });
  const ais = levels.map((l, i) => new AiPlayer(i, l, seed + i));
  const errors: string[] = [];
  while (sim.state.phase === 'playing' && sim.state.tick < TICK_RATE * 60 * maxMinutes) {
    const cmds: PlayerCommand[] = [];
    for (const ai of ais) for (const cmd of ai.update(sim)) cmds.push({ player: ai.player, cmd });
    for (const e of sim.step(cmds) as SimEvent[]) if (e.t === 'err') errors.push(e.msg);
  }
  return { sim, errors };
}

describe('AI players', () => {
  it('normal and hard bots build anti-air against a flyer army', () => {
    // Thornwild hard brain biased to pure flyers (moths) against an Ironvow bot.
    for (const level of ['normal', 'hard'] as const) {
      const sim = Sim.create({
        players: [
          { userId: makeBotId(level, 'a'), name: 'a', team: 0, faction: 'ironvow' },
          { userId: makeBotId('hard', 'b'), name: 'b', team: 1, faction: 'thornwild' },
        ],
        bestOf: 1, seed: 1,
      });
      const ais = [new AiPlayer(0, level, 32), new AiPlayer(1, 'hard', 39, { bias: { air: 10 } })];
      while (sim.state.phase === 'playing' && sim.state.tick < TICK_RATE * 60 * 9) {
        const cmds: PlayerCommand[] = [];
        for (const ai of ais) for (const cmd of ai.update(sim)) cmds.push({ player: ai.player, cmd });
        sim.step(cmds);
      }
      const spawners = sim.playerBuildings(0).map((e) => BUILDINGS[e.type].spawn).filter((sp) => !!sp);
      const aa = spawners.filter((sp) => UNITS[sp!.unit].targetsAir || UNITS[sp!.unit].air).length;
      expect(aa, `${level}: ${aa} of ${spawners.length} spawners shoot up`).toBeGreaterThanOrEqual(Math.ceil(spawners.length / 2));
    }
  }, 60_000);

  it('encodes the difficulty in the bot id', () => {
    expect(isBotId(makeBotId('hard', 'x'))).toBe(true);
    expect(botLevel(makeBotId('easy', 'x'))).toBe('easy');
    expect(botLevel('64a1f0c2e3')).toBeNull();
  });

  it('plays a full round without issuing invalid commands', () => {
    const { sim, errors } = play(['normal', 'hard'], 42);
    expect(sim.state.phase).not.toBe('playing');
    // Gold is checked before ordering; placement before building. Only races with the
    // builder walking (e.g. an enemy wave destroying the site) may produce errors.
    expect(errors.filter((e) => !/occupied|block|busy/i.test(e))).toEqual([]);
    expect(sim.state.players.every((p) => p.goldEarned > 0)).toBe(true);
  }, 60_000);

  it('hard beats easy most of the time', () => {
    // Rounds are short and swingy, so judge over several games, not one; factions alternate so
    // the test checks the levels, not one faction matchup (the lab ladder covers those).
    let hardWins = 0;
    [7, 11, 23, 42, 99].forEach((seed, i) => { if (play(['easy', 'hard'], seed, 45, i % 2 === 1).sim.state.winner === 1) hardWins++; });
    expect(hardWins).toBeGreaterThanOrEqual(3);
  }, 120_000);

  it.each(['easy', 'normal', 'hard'] as const)('%s bot strikes to save a building about to fall', (level) => {
    const sim = Sim.create({
      players: [
        { userId: makeBotId(level, 'a'), name: 'a', team: 0, faction: 'ironvow' },
        { userId: 'human', name: 'h', team: 1, faction: 'thornwild' },
      ],
      bestOf: 1, seed: 3,
    });
    const me = sim.state.players[0];
    me.gold += 1000;
    sim.step([{ player: 0, cmd: { c: 'build', building: 'iv_militia_hall', tx: 16, ty: 8 } }]);
    for (let i = 0; i < 600 && sim.get(me.builderId)!.orders!.length; i++) sim.step();
    const b = sim.state.entities.find((e) => e.kind === 'building' && e.team === 0)!;
    b.buildLeft = 0; b.hp = b.maxHp;
    const ai = new AiPlayer(0, level, 1);
    // A couple of attackers at full building HP: no strike yet (not a big wave).
    for (let k = 0; k < 2; k++) { const u = spawnUnit(sim, sim.castle(1), 'tw_vineling', 0, 1); u.x = 18.5 + k * 0.3; u.y = 10.5; }
    expect(ai.update(sim).some((c) => c.c === 'rescue')).toBe(false);
    b.hp = b.maxHp * 0.3;
    const cmd = ai.update(sim).find((c) => c.c === 'rescue');
    expect(cmd).toBeTruthy();
    if (cmd?.c === 'rescue') expect(Math.hypot(cmd.x - 18.6, cmd.y - 10.5)).toBeLessThan(2);
  });
});
