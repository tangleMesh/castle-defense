/**
 * Structural checks every faction must pass. They are written against FACTIONS / BUILDINGS / UNITS
 * generically, so a new faction is checked automatically as soon as it is registered.
 */
import { describe, expect, it } from 'vitest';
import {
  BUILDINGS, FACTIONS, FACTION_IDS, GRID_HOTKEYS, START_GOLD, START_SAPPHIRES, UNITS, spawners, tierOf, totalCost, unitAbilities,
} from '../src/index';

describe.each(FACTION_IDS)('faction %s', (id) => {
  const f = FACTIONS[id];
  const own = f.buildings;

  it('has a name, description, colour and traits for the lobby', () => {
    expect(f.name.length).toBeGreaterThan(3);
    expect(f.desc.length).toBeGreaterThan(10);
    expect(f.traits.length).toBeGreaterThanOrEqual(3);
  });

  it('fits its build list on the builder card (slot 11 is stop; the strike lives in the top bar and on T)', () => {
    expect(f.build.length).toBeLessThanOrEqual(GRID_HOTKEYS.length - 1);
    for (const b of f.build) {
      expect(BUILDINGS[b], b).toBeTruthy();
      expect([id, 'any']).toContain(BUILDINGS[b].faction);
      expect(BUILDINGS[b].upgradeOnly, `${b} is buildable`).toBeFalsy();
    }
  });

  it('references only existing, own-faction buildings and units', () => {
    for (const b of own) {
      for (const u of b.upgrades ?? []) {
        expect(BUILDINGS[u], `${b.id} → ${u}`).toBeTruthy();
        expect(BUILDINGS[u].faction).toBe(id);
        expect(BUILDINGS[u].upgradeOnly, `${u} is an upgrade`).toBe(true);
      }
      if (b.spawn) expect(UNITS[b.spawn.unit], `${b.id} spawns ${b.spawn.unit}`).toBeTruthy();
    }
    // Every upgrade-only building is reachable.
    for (const b of own.filter((x) => x.upgradeOnly)) expect(own.some((x) => x.upgrades?.includes(b.id)), `${b.id} reachable`).toBe(true);
    for (const u of f.units) if (u.onDeath) expect(UNITS[u.onDeath.unit], `${u.id} releases ${u.onDeath.unit}`).toBeTruthy();
  });

  it('can open with a spawner on the starting gold', () => {
    expect(f.build.some((b) => BUILDINGS[b].spawn && BUILDINGS[b].cost <= START_GOLD)).toBe(true);
  });

  it('has at least one way to hit flyers without upgrades or sapphires', () => {
    const aa = spawners(id, 'basic').some((b) => { const u = UNITS[b.spawn!.unit]; return u.targetsAir || u.air; })
      || own.some((b) => !b.upgradeOnly && b.attack?.targetsAir);
    expect(aa).toBe(true);
  });

  it('gates special buildings and elite upgrades behind sapphires', () => {
    const specials = own.filter((b) => b.special && !b.upgradeOnly);
    expect(specials.length).toBeGreaterThanOrEqual(1);
    for (const b of specials) expect(b.sapphires ?? 0).toBeGreaterThanOrEqual(1);
    for (const b of own.filter((x) => tierOf(x) === 'elite')) expect(b.sapphires).toBeLessThanOrEqual(START_SAPPHIRES);
  });

  it('has sane unit and building numbers', () => {
    for (const u of f.units) {
      expect(u.hp, u.id).toBeGreaterThan(0);
      expect(u.dmg, u.id).toBeGreaterThan(0);
      expect(u.cooldown, u.id).toBeGreaterThan(0.2);
      // Stationary summons (tentacles) don't move at all; everything else must.
      if (u.speed !== 0) expect(u.speed, u.id).toBeGreaterThan(0.5);
      expect(u.speed, u.id).toBeLessThan(8);
      expect(u.range, u.id).toBeGreaterThan(0);
      if (u.aura) expect(u.aura.radius, u.id).toBeGreaterThan(0);
      expect(() => unitAbilities(u, UNITS)).not.toThrow();
    }
    for (const b of own) {
      expect(b.cost, b.id).toBeGreaterThan(0);
      expect(b.hp, b.id).toBeGreaterThan(0);
      expect(b.size, b.id).toBe(2);
      if (b.spawn) { expect(b.spawn.interval, b.id).toBeGreaterThanOrEqual(5); expect(b.spawn.count, b.id).toBeGreaterThanOrEqual(1); }
    }
  });

});
