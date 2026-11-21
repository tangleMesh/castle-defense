import { describe, expect, it } from 'vitest';
import {
  AiPlayer, DEFAULT_SKILL_CURVE, Humanizer, PROFILES, Sim, TICK_RATE, botTargets, drawPersona, eloForSkill, makeBotId, personaProfile,
  setSkillCurve, skillForElo, type PlayerCommand,
} from '../src/index';

describe('Elo targets of Auto bots', () => {
  it('a lone human gets a bot of their own Elo', () => {
    expect(botTargets([{ team: 0, rating: 1500 }, { team: 1 }])).toEqual([undefined, 1500]);
  });
  it('a bot on the strong human\'s team evens out the averages', () => {
    // 1600 human + bot vs two 1200 humans → the bot plays at 800 (team average 1200).
    expect(botTargets([{ team: 0, rating: 1600 }, { team: 0 }, { team: 1, rating: 1200 }, { team: 1, rating: 1200 }])[1]).toBe(800);
  });
  it('bots on both teams: both teams end up with the same average', () => {
    const ps = [{ team: 0 as const, rating: 1400 }, { team: 0 as const }, { team: 1 as const, rating: 1000 }, { team: 1 as const }];
    const t = botTargets(ps);
    const avg = (team: 0 | 1) => ps.map((p, i) => ({ ...p, r: p.rating ?? t[i]! })).filter((p) => p.team === team).reduce((s, p) => s + p.r, 0) / 2;
    expect(avg(0)).toBeCloseTo(avg(1), 0);
  });
  it('only bots: everyone plays at the start rating; targets stay in range', () => {
    expect(botTargets([{ team: 0 }, { team: 1 }])).toEqual([1000, 1000]);
    expect(botTargets([{ team: 0, rating: 2600 }, { team: 0, rating: 2600 }, { team: 1 }])[2]).toBe(2400);
  });
});

describe('skill curve', () => {
  it('is monotone and invertible', () => {
    setSkillCurve(DEFAULT_SKILL_CURVE);
    let last = -1;
    for (let e = 400; e <= 2400; e += 50) { const s = skillForElo(e); expect(s).toBeGreaterThanOrEqual(last); last = s; }
    expect(eloForSkill(skillForElo(1100))).toBeCloseTo(1100, 0);
    // A refit that isn't monotone gets repaired.
    setSkillCurve([[800, 0.5], [1000, 0.3], [1200, 1]]);
    expect(skillForElo(1000)).toBeGreaterThanOrEqual(skillForElo(800));
    setSkillCurve(DEFAULT_SKILL_CURVE);
  });
});

describe('personas', () => {
  it('are deterministic per seed and differ between seeds', () => {
    expect(drawPersona(7, 0.8)).toEqual(drawPersona(7, 0.8));
    expect(drawPersona(7, 0.8)).not.toEqual(drawPersona(8, 0.8));
  });
  it('skill shapes the profile: stronger bots think faster, plan, counter', () => {
    const weak = personaProfile(drawPersona(1, 0.1), PROFILES), strong = personaProfile(drawPersona(1, 1.3), PROFILES);
    expect(strong.think).toBeLessThan(weak.think);
    expect(strong.planner && strong.counter).toBe(true);
    expect(weak.counter).toBe(false);
  });
});

describe('humanizer', () => {
  it('delays commands by a human reaction time and never sends more than the APM allows', () => {
    const h = new Humanizer(drawPersona(3, 0.5), 3);
    const cmd = { c: 'stop' } as const;
    const sent: number[] = [];
    for (let t = 0; t < 60 * TICK_RATE; t++) for (const _ of h.step(t < 30 * TICK_RATE ? [cmd] : [], t)) sent.push(t);
    expect(sent[0]).toBeGreaterThanOrEqual(2);
    expect(sent.length).toBeLessThanOrEqual(14 + 40 * (0.5 / 1.2) + 1);
  });
  it('answers a greeting in chat, eventually', () => {
    let said = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const h = new Humanizer(drawPersona(seed, 0.5), seed);
      h.hear('hi all', 0);
      said += h.drainChat(10 * TICK_RATE).length;
    }
    expect(said).toBeGreaterThan(3);
  });
  it('a humanised Auto bot plays a whole round with legal commands only', () => {
    const sim = Sim.create({ countdownTicks: 0, bestOf: 1, seed: 5, players: [
      { userId: makeBotId('auto', 'a'), name: 'a', team: 0, faction: 'ironvow' },
      { userId: makeBotId('auto', 'b'), name: 'b', team: 1, faction: 'gravewake' },
    ] });
    const ais = [new AiPlayer(0, 'auto', 11, undefined, { skill: 0.3, human: true }), new AiPlayer(1, 'auto', 12, undefined, { skill: 1.2, human: true })];
    let errors = 0, built = 0;
    while (sim.state.phase === 'playing' && sim.state.tick < 8 * 60 * TICK_RATE) {
      const cmds: PlayerCommand[] = [];
      for (const ai of ais) for (const cmd of ai.update(sim)) cmds.push({ player: ai.player, cmd });
      for (const ev of sim.step(cmds)) { if (ev.t === 'err') errors++; if (ev.t === 'built') built++; }
    }
    expect(built).toBeGreaterThan(8);
    // A few placement races are normal (a spot taken while "clicking"); not a stream of errors.
    expect(errors).toBeLessThan(25);
  });
});
