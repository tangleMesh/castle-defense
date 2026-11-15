import { afterEach, describe, expect, it } from 'vitest';
import { AI_INCOME, COMMITTED_TUNING, NEUTRAL_TUNING, UNITS, applyTuning, type Tuning } from '../src/index';

describe('balance tuning', () => {
  afterEach(() => applyTuning(COMMITTED_TUNING));

  it('scales from the hand-written values and never compounds', () => {
    applyTuning(NEUTRAL_TUNING);
    const hp = UNITS.tw_vineling.hp, dmg = UNITS.tw_vineling.dmg, ivHp = UNITS.iv_militia.hp;
    const t: Tuning = { factions: { thornwild: { power: 1.21 } }, units: { tw_vineling: { dmg: 0.5 } }, aiIncome: { easy: 0.8 } };
    applyTuning(t);
    applyTuning(t);
    expect(UNITS.tw_vineling.hp).toBeCloseTo(hp * 1.1);
    expect(UNITS.tw_vineling.dmg).toBeCloseTo(dmg * 1.1 * 0.5);
    expect(UNITS.iv_militia.hp).toBeCloseTo(ivHp);
    expect(AI_INCOME.easy).toBe(0.8);
    applyTuning(NEUTRAL_TUNING);
    expect(UNITS.tw_vineling.hp).toBe(hp);
    expect(UNITS.tw_vineling.dmg).toBe(dmg);
    expect(AI_INCOME.easy).toBe(1);
    expect(AI_INCOME.brutal).toBe(1.3);
  });

  it('scales heals and poison with damage', () => {
    applyTuning(NEUTRAL_TUNING);
    const healer = Object.values(UNITS).find((u) => u.heal)!, poisoner = Object.values(UNITS).find((u) => u.poison)!;
    const h = healer.heal!.amount, p = poisoner.poison!.dps;
    applyTuning({ factions: {}, units: { [healer.id]: { dmg: 2 }, [poisoner.id]: { dmg: 2 } }, aiIncome: {} });
    expect(healer.heal!.amount).toBeCloseTo(h * 2);
    expect(poisoner.poison!.dps).toBeCloseTo(p * 2);
  });
});
