import { afterEach, describe, expect, it } from 'vitest';
import { AI_INCOME, COMMITTED_TUNING, EARLY_UNITS, NEUTRAL_TUNING, UNITS, applyTuning, type Tuning } from '../src/index';

describe('balance tuning', () => {
  afterEach(() => applyTuning(COMMITTED_TUNING));

  it('scales from the hand-written values and never compounds', () => {
    applyTuning(NEUTRAL_TUNING);
    const hp = UNITS.tw_spider.hp, dmg = UNITS.tw_spider.dmg, ivHp = UNITS.iv_militia.hp;
    const t: Tuning = { factions: { thornwild: { power: 1.21 } }, units: { tw_spider: { dmg: 0.5 } }, aiIncome: { easy: 0.8 } };
    applyTuning(t);
    applyTuning(t);
    expect(UNITS.tw_spider.hp).toBeCloseTo(hp * 1.1);
    expect(UNITS.tw_spider.dmg).toBeCloseTo(dmg * 1.1 * 0.5);
    expect(UNITS.iv_militia.hp).toBeCloseTo(ivHp);
    // Bot incomes can't be tuned: bots earn exactly like players.
    expect(AI_INCOME.easy).toBe(1);
    applyTuning(NEUTRAL_TUNING);
    expect(UNITS.tw_spider.hp).toBe(hp);
    expect(UNITS.tw_spider.dmg).toBe(dmg);
    expect(AI_INCOME.easy).toBe(1);
    expect(AI_INCOME.brutal).toBe(1);
  });

  it('scales heals and poison with damage', () => {
    applyTuning(NEUTRAL_TUNING);
    const healer = Object.values(UNITS).find((u) => u.heal)!, poisoner = Object.values(UNITS).find((u) => u.poison)!;
    const h = healer.heal!.amount, p = poisoner.poison!.dps;
    applyTuning({ factions: {}, units: { [healer.id]: { dmg: 2 }, [poisoner.id]: { dmg: 2 } }, aiIncome: {} });
    expect(healer.heal!.amount).toBeCloseTo(h * 2);
    expect(poisoner.poison!.dps).toBeCloseTo(p * 2);
  });

  it('early scales only first-tier units (and what they burst into) on top of power', () => {
    applyTuning(NEUTRAL_TUNING);
    expect([...EARLY_UNITS]).toEqual(expect.arrayContaining(['iv_militia', 'tw_spider']));
    expect(EARLY_UNITS.has('iv_knight')).toBe(false);
    expect(EARLY_UNITS.has('iv_sun_champion')).toBe(false);
    const mil = UNITS.iv_militia.hp, kn = UNITS.iv_knight.hp;
    applyTuning({ factions: { ironvow: { power: 1.21, early: 1.21 } }, units: {}, aiIncome: {} });
    expect(UNITS.iv_militia.hp).toBeCloseTo(mil * 1.21);
    expect(UNITS.iv_knight.hp).toBeCloseTo(kn * 1.1);
  });
});
