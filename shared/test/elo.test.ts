import { describe, expect, it } from 'vitest';
import { BOT_RATING, ELO_K, START_RATING, eloDelta, expectedScore } from '../src/index';

describe('Elo', () => {
  it('splits K evenly between equal teams and rewards upsets more', () => {
    expect(eloDelta([START_RATING], [START_RATING], true)).toBe(ELO_K / 2);
    expect(eloDelta([START_RATING], [START_RATING], false)).toBe(-ELO_K / 2);
    // Beating a much stronger team earns more than beating an equal one, losing to it costs little.
    expect(eloDelta([1000], [1400], true)).toBeGreaterThan(ELO_K / 2);
    expect(eloDelta([1000], [1400], false)).toBeGreaterThan(-ELO_K / 2);
    expect(expectedScore(1400, 1000)).toBeCloseTo(10 / 11, 3);
  });

  it('averages team ratings (bots count with their level rating)', () => {
    expect(eloDelta([1000, 1200], [BOT_RATING.hard, BOT_RATING.easy], true)).toBe(eloDelta([1100], [1000], true));
  });

  it("records every player's statistics per round", async () => {
    const { Sim } = await import('../src/index');
    const sim = Sim.create({ countdownTicks: 0, bestOf: 3, seed: 1, players: [
      { userId: 'a', name: 'a', team: 0, faction: 'ironvow' }, { userId: 'b', name: 'b', team: 1, faction: 'thornwild' }] });
    sim.state.players[0].kills = 4;
    sim.castle(1).hp = 0;
    sim.step();
    expect(sim.state.rounds[0].players?.[0]).toMatchObject({ faction: 'ironvow', kills: 4 });
  });
});
