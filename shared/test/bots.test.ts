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
  }, 120_000);
});

describe('strategist', () => {
  it('recognises enemy plans from sightings', async () => {
    const { recognisePlan } = await import('../src/index');
    const base = { spawners: 3, towers: 0, chests: 0, upgrades: 0, legendary: 0, airShare: 0, avgSpawnerCost: 300, minutes: 4 };
    expect(recognisePlan({ ...base, airShare: 0.6 })).toBe('air');
    expect(recognisePlan({ ...base, towers: 4 })).toBe('turtle');
    expect(recognisePlan({ ...base, chests: 1 })).toBe('eco');
    expect(recognisePlan({ ...base, spawners: 5, avgSpawnerCost: 150 })).toBe('rush');
    expect(recognisePlan({ ...base, spawners: 0 })).toBe('*');
  });
  it('experience wins over taste for skilled bots', async () => {
    const { choosePlan, setStrategyStats, seededRandom } = await import('../src/index');
    setStrategyStats({ 'ironvow|turtle|*': [90, 100], 'ironvow|rush|*': [10, 100], 'ironvow|eco|*': [10, 100], 'ironvow|tech|*': [10, 100], 'ironvow|air|*': [10, 100], 'ironvow|balanced|*': [10, 100] });
    const r = seededRandom(9);
    let turtle = 0;
    for (let i = 0; i < 50; i++) if (choosePlan('ironvow', '*', { ...drawPersona(i, 1.2), aggression: 1 }, r) === 'turtle') turtle++;
    setStrategyStats({});
    expect(turtle).toBeGreaterThan(35);
  });
  it('Auto bots log their plan and the result of every round', () => {
    const sim = Sim.create({ countdownTicks: 0, bestOf: 3, seed: 21, players: [
      { userId: makeBotId('auto', 'a'), name: 'a', team: 0, faction: 'sunspire' },
      { userId: makeBotId('auto', 'b'), name: 'b', team: 1, faction: 'thornwild' },
    ] });
    const ais = [new AiPlayer(0, 'auto', 31, undefined, { skill: 1 }), new AiPlayer(1, 'auto', 32, undefined, { skill: 1 })];
    while (sim.state.phase !== 'matchOver' && sim.state.tick < 40 * 60 * TICK_RATE) {
      const cmds: PlayerCommand[] = [];
      for (const ai of ais) for (const cmd of ai.update(sim)) cmds.push({ player: ai.player, cmd });
      sim.step(cmds);
    }
    for (const ai of ais) ai.update(sim);
    expect(ais[0].roundLog.length).toBe(sim.state.rounds.length);
    expect(ais[0].roundLog.map((r) => r.won)).toEqual(ais[1].roundLog.map((r) => !r.won));
  }, 120_000);
});

describe('learning', () => {
  it('strategy stats count wins and slowly forget', async () => {
    const { addPlanResults, statKey } = await import('../src/index');
    const stats = {};
    addPlanResults(stats, [{ faction: 'ironvow', opening: 'rush', plan: 'rush', enemy: 'eco', won: true }], 1, 0.5);
    addPlanResults(stats, [{ faction: 'ironvow', opening: 'rush', plan: 'rush', enemy: '*', won: false }], 1, 0.5);
    const s = (stats as Record<string, [number, number]>)[statKey('ironvow', 'rush', '*')];
    expect(s[1]).toBeCloseTo(1.5);
    expect(s[0]).toBeCloseTo(0.5);
  });
  it('skill calibration: a bucket that beats stronger players climbs; the curve stays monotone', async () => {
    const { addSkillResult, bucketElo, curveFromState, freshLearnedState } = await import('../src/index');
    const st = freshLearnedState();
    const before = bucketElo(st, 0.5);
    for (let i = 0; i < 50; i++) addSkillResult(st, [{ team: 0, skill: 0.5 }, { team: 1, rating: 1300 }], 0, 16);
    expect(bucketElo(st, 0.5)).toBeGreaterThan(before + 100);
    const curve = curveFromState(st);
    for (let i = 1; i < curve.length; i++) expect(curve[i][0]).toBeGreaterThan(curve[i - 1][0]);
  });
});

describe('learned models', () => {
  it('the MLP learns a simple rule (loss drops, predictions right)', async () => {
    const { Mlp } = await import('../src/index');
    const net = new Mlp([2, 8, 1], 'sigmoid', 3);
    const xs: number[][] = [], ys: number[] = [];
    for (let i = 0; i < 400; i++) { const a = (i * 7919 % 100) / 100, b = (i * 104729 % 100) / 100; xs.push([a, b]); ys.push(a > b ? 1 : 0); }
    const before = net.loss(xs, ys);
    for (let e = 0; e < 200; e++) net.trainBatch(xs, ys, undefined, 0.02);
    expect(net.loss(xs, ys)).toBeLessThan(before * 0.5);
    expect(net.predict([0.9, 0.1])[0]).toBeGreaterThan(0.7);
    expect(Mlp.fromJSON(net.toJSON()).predict([0.9, 0.1])[0]).toBeCloseTo(net.predict([0.9, 0.1])[0], 3);
  });
  it('the recorder labels a game, and bots play with a policy model in place', async () => {
    const { GameRecorder, Mlp, setModels, CATEGORIES, FEATURE_COUNT } = await import('../src/index');
    setModels({ policy: new Mlp([FEATURE_COUNT, 8, CATEGORIES.length], 'softmax', 5).toJSON(), value: new Mlp([FEATURE_COUNT, 8, 1], 'sigmoid', 6).toJSON() });
    try {
      const sim = Sim.create({ countdownTicks: 0, bestOf: 1, seed: 8, players: [
        { userId: makeBotId('auto', 'a'), name: 'a', team: 0, faction: 'bloodtusk' },
        { userId: makeBotId('auto', 'b'), name: 'b', team: 1, faction: 'frostmark' },
      ] });
      const ais = [new AiPlayer(0, 'auto', 41, undefined, { skill: 1.1 }), new AiPlayer(1, 'auto', 42, undefined, { skill: 1.1, useModels: false })];
      const rec = new GameRecorder(() => ({ w: 1, human: false }));
      while (sim.state.phase === 'playing' && sim.state.tick < 25 * 60 * TICK_RATE) {
        const cmds: PlayerCommand[] = [];
        for (const ai of ais) for (const cmd of ai.update(sim)) cmds.push({ player: ai.player, cmd });
        rec.observe(sim, cmds);
        sim.step(cmds);
      }
      rec.observe(sim, []);
      expect(rec.value.length).toBeGreaterThan(10);
      expect(rec.policy.length).toBeGreaterThan(5);
      expect(rec.value[0].x).toHaveLength(FEATURE_COUNT);
      expect(new Set(rec.value.map((v) => v.y)).size).toBe(2);
    } finally { setModels(null); }
  }, 120_000);
});

describe('fair bots', () => {
  it('no bot level gets an income bonus or sees through the fog of war', async () => {
    const { AI_INCOME, BOT_LEVELS } = await import('../src/index');
    for (const l of BOT_LEVELS) {
      expect(AI_INCOME[l], l).toBe(1);
      expect(PROFILES[l].fullVision, l).toBeFalsy();
    }
  });
  it('a stealthed enemy in the base is invisible to the bot (no rescue strike on it)', () => {
    const sim = Sim.create({ countdownTicks: 0, bestOf: 1, seed: 3, players: [
      { userId: makeBotId('hard', 'a'), name: 'a', team: 0, faction: 'ironvow' },
      { userId: makeBotId('hard', 'b'), name: 'b', team: 1, faction: 'duskmoon' },
    ] });
    const ai = new AiPlayer(0, 'hard', 5);
    const castle = sim.castle(0)!;
    // A pack of hidden assassins right next to the castle.
    for (let i = 0; i < 12; i++) {
      const u = sim.add({ kind: 'unit', type: 'dm_assassin', owner: 1, team: 1, x: castle.tx! + 6 + (i % 4) * 0.4, y: castle.ty! + 2 + Math.floor(i / 4) * 0.4, hp: 375, maxHp: 375, cd: 0, healCd: 0 });
      u.hidden = true;
    }
    let struck = false;
    for (let t = 0; t < 3 * TICK_RATE; t++) if (ai.update(sim).some((c) => c.c === 'rescue')) struck = true;
    expect(struck).toBe(false);
  });
});
