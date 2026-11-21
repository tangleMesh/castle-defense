import { describe, expect, it } from 'vitest';
import { Matchmaker } from '../src/matchmaking';
import { createMemoryPersistence } from '../src/persistence/memory';

const host = { send() {}, inRoom: () => false, online: () => true, newCode: () => 'ABCDEF', startRanked: async () => {} };
type Acct = { id: string; rating: number };
const pick = (mm: Matchmaker, target: number): Promise<Acct> => (mm as unknown as { botAccount(t: number): Promise<Acct> }).botAccount(target);
const free = (mm: Matchmaker, id: string) => (mm as unknown as { busyBots: Set<string> }).busyBots.delete(id);

describe('matchmaking bot accounts', () => {
  it('reuses a fitting bot account when no newcomer is drawn', async () => {
    const db = createMemoryPersistence();
    const mm = new Matchmaker(db, host, { newBotChance: 0 });
    const first = await pick(mm, 1000);
    free(mm, first.id);
    const again = await pick(mm, 1000);
    expect(again.id).toBe(first.id);
    // Far away in Elo: a new account at that level.
    const strong = await pick(mm, 1600);
    expect(strong.id).not.toBe(first.id);
    expect(Math.abs(strong.rating - 1600)).toBeLessThan(60);
    mm.stop();
  });

  it('about a quarter of the time a new account joins, so the pool grows', async () => {
    const db = createMemoryPersistence();
    const mm = new Matchmaker(db, host);
    for (let i = 0; i < 80; i++) free(mm, (await pick(mm, 1000)).id);
    const n = (await db.users.listBots()).length;
    // 1 to start + ~25% of 79 (allow generous randomness).
    expect(n).toBeGreaterThan(8);
    expect(n).toBeLessThan(40);
    mm.stop();
  });
});
