import { TICK_RATE } from '../constants';
import { BUILDINGS } from '../data';
import type { Sim } from '../sim/sim';
import type { Command } from '../sim/state';
import { buildCategory } from './ai';
import { CATEGORIES, observedFeatures } from './features';

/** A training sample: features, the label (won the round / category built), and its weight. */
export interface Sample { x: number[]; y: number; w: number; human: boolean }

/**
 * Turns a game into training samples: every 15 s each player's view (labelled with whether their
 * team won that round, for the value model), and every build or upgrade with the player's view at
 * that moment (labelled with the category, for the policy model). `weightOf` decides how much a
 * player's choices count (strong humans most, losing bots little).
 */
export class GameRecorder {
  private open: Array<{ player: number; x: number[]; kind: 'value' | 'policy'; y: number }> = [];
  private rounds = 0;
  readonly value: Sample[] = [];
  readonly policy: Sample[] = [];

  constructor(private weightOf: (player: number, won: boolean) => { w: number; human: boolean }) {}

  observe(sim: Sim, cmds: Array<{ player: number; cmd: Command }>) {
    const s = sim.state;
    if (s.phase === 'playing' && s.phaseTicks <= 0) {
      if ((s.tick - s.roundStartTick) % (15 * TICK_RATE) === 0) {
        for (const p of s.players) this.open.push({ player: p.index, x: observedFeatures(sim, p.index), kind: 'value', y: 0 });
      }
      for (const { player, cmd } of cmds) {
        let cat: number | null = null;
        if (cmd.c === 'build' && BUILDINGS[cmd.building]) cat = CATEGORIES.indexOf(buildCategory(BUILDINGS[cmd.building]));
        else if (cmd.c === 'upgrade' && BUILDINGS[cmd.to]) cat = CATEGORIES.indexOf(buildCategory(BUILDINGS[cmd.to], true));
        if (cat !== null && cat >= 0) this.open.push({ player, x: observedFeatures(sim, player), kind: 'policy', y: cat });
      }
    }
    // A round ended: label what we collected during it.
    if (s.rounds.length > this.rounds) {
      this.rounds = s.rounds.length;
      const winner = s.rounds[s.rounds.length - 1].winner;
      for (const o of this.open) {
        const won = s.players[o.player].team === winner;
        const { w, human } = this.weightOf(o.player, won);
        if (o.kind === 'value') this.value.push({ x: o.x, y: won ? 1 : 0, w: human ? 2 : 1, human });
        else if (w > 0) this.policy.push({ x: o.x, y: o.y, w, human });
      }
      this.open = [];
    }
  }
}
