import { TICK_RATE } from '../constants';
import type { Command } from '../sim/state';
import type { Persona } from './persona';
import { seededRandom } from './persona';

/**
 * Makes a bot's input look like a person's: decisions reach the game after a reaction time (log-
 * normal, slower for weaker players), actions per minute are limited, attention lapses now and
 * then (looking at the shop, the minimap…), and the bot chats a little. Only used in real matches;
 * the simulation lab runs bots without it, so its results stay deterministic and comparable.
 */
export class Humanizer {
  private rnd: () => number;
  private pending: Array<{ cmd: Command; due: number }> = [];
  private recent: number[] = [];
  private lapseUntil = 0;
  private nextLapseCheck = 0;
  private chatOut: Array<{ text: string; all: boolean; due: number }> = [];
  private lastChat = -1e9;

  constructor(private persona: Persona, seed: number) {
    this.rnd = seededRandom(seed ^ 0x5bd1e995);
  }

  private get skill() { return Math.min(1, this.persona.skill / 1.2); }

  /** Reaction time in ticks: median ~1.1 s for beginners, ~0.35 s for the best, long-tailed. */
  private reaction(urgent: boolean): number {
    const median = (1.1 - 0.75 * this.skill) * (urgent ? 0.7 : 1);
    const g = Math.sqrt(-2 * Math.log(1 - this.rnd())) * Math.cos(2 * Math.PI * this.rnd());
    return Math.max(2, Math.round(median * Math.exp(0.35 * g) * TICK_RATE));
  }

  /** Actions per minute a player of this skill manages in this slow-paced game. */
  private get apm() { return 14 + 40 * this.skill; }

  /** Commands still waiting to "be clicked" (the bot shouldn't decide the same thing twice). */
  busy(): boolean {
    return this.pending.some((p) => p.cmd.c !== 'rescue');
  }

  /** Queues the bot's decisions; returns what the "player" actually clicks this tick. */
  step(cmds: Command[], tick: number): Command[] {
    for (const cmd of cmds) this.pending.push({ cmd, due: tick + this.reaction(cmd.c === 'rescue') });
    // Attention lapses: every ~20 s a chance to look away for 2–7 s (weaker players more often).
    if (tick >= this.nextLapseCheck) {
      this.nextLapseCheck = tick + 20 * TICK_RATE;
      if (this.rnd() < 0.35 - 0.25 * this.skill) this.lapseUntil = tick + Math.round((2 + this.rnd() * 5) * TICK_RATE);
    }
    this.recent = this.recent.filter((t) => tick - t < 60 * TICK_RATE);
    const out: Command[] = [];
    this.pending = this.pending.filter((p) => {
      if (p.due > tick) return true;
      // A rescue strike is the one thing that interrupts whatever the player was looking at.
      if (p.cmd.c !== 'rescue' && (tick < this.lapseUntil || this.recent.length >= this.apm)) return true;
      out.push(p.cmd);
      this.recent.push(tick);
      return false;
    });
    return out;
  }

  // ---------------------------------------------------------------- chat

  private say(lines: string[], tick: number, opts: { all?: boolean; chance?: number; delay?: number } = {}) {
    if (this.rnd() > (opts.chance ?? 1) * (0.25 + 0.75 * this.persona.chatty)) return;
    if (tick - this.lastChat < 8 * TICK_RATE) return;
    this.lastChat = tick;
    let text = lines[Math.floor(this.rnd() * lines.length)];
    // Typing habits: some never capitalise, some skip punctuation.
    if (this.persona.chatty < 0.5 || this.rnd() < 0.5) text = text.toLowerCase();
    if (this.rnd() < 0.4) text = text.replace(/[.!]$/, '');
    this.chatOut.push({ text, all: opts.all ?? true, due: tick + Math.round((opts.delay ?? 2 + this.rnd() * 4) * TICK_RATE) });
  }

  /** Something happened worth a word. */
  event(kind: 'start' | 'roundWon' | 'roundLost' | 'matchWon' | 'matchLost' | 'struck' | 'castleLow' | 'enemyLegendary', tick: number) {
    switch (kind) {
      case 'start': return this.say(['gl hf', 'glhf', 'gl', 'hf', 'gl hf all', 'good luck', 'hi'], tick, { chance: 0.7, delay: 3 + this.rnd() * 8 });
      case 'roundWon': return this.say(['gg', 'nice', 'next', 'close one', 'wp'], tick, { chance: 0.45 });
      case 'roundLost': return this.say(['gg', 'wp', 'damn', 'ok next round', 'nice push', 'ugh'], tick, { chance: 0.6 });
      case 'matchWon': return this.say(['gg', 'gg wp', 'ggwp', 'gg thx', 'that was fun'], tick, { chance: 0.85 });
      case 'matchLost': return this.say(['gg', 'gg wp', 'gg well played', 'ggs', 'rematch?'], tick, { chance: 0.9 });
      case 'struck': return this.say(['nice strike', 'ouch', 'wow', 'rip my army', 'good timing'], tick, { chance: 0.25 });
      case 'castleLow': return this.say(['help', 'need help mid', 'they are at my castle', 'hold on'], tick, { chance: 0.3, all: false });
      case 'enemyLegendary': return this.say(['uh oh', 'that legendary...', 'here it comes'], tick, { chance: 0.15, all: false });
    }
  }

  /** Someone wrote in chat: answer greetings and goodbyes now and then. */
  hear(text: string, tick: number) {
    const t = text.toLowerCase().trim();
    if (/^(hi|hey|hello|yo|sup|moin|hallo|servus)\b/.test(t)) this.say(['hi', 'hey', 'yo', 'hello', 'o/'], tick, { chance: 0.6 });
    else if (/\bgl\b|good luck|glhf|gl hf/.test(t)) this.say(['u2', 'gl', 'you too', 'hf'], tick, { chance: 0.5 });
    else if (/^gg\b|good game/.test(t)) this.say(['gg', 'ggwp', 'gg!'], tick, { chance: 0.6 });
    else if (/\?\s*$/.test(t) && this.rnd() < 0.15) this.say(['?', 'idk', 'lol', 'maybe'], tick, { chance: 1 });
    else if (/\b(lol|lmao|haha)\b/.test(t)) this.say(['lol', 'haha', 'xd'], tick, { chance: 0.2 });
  }

  /** Chat lines due now. */
  drainChat(tick: number): Array<{ text: string; all: boolean }> {
    const out = this.chatOut.filter((c) => c.due <= tick);
    this.chatOut = this.chatOut.filter((c) => c.due > tick);
    return out.map(({ text, all }) => ({ text, all }));
  }
}
