import { ELO_K, FACTION_IDS, START_RATING, type PublicUser } from '@bc/shared';
import { Bot } from './bot';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

async function api<T>(base: string, path: string, token: string): Promise<T> {
  const res = await fetch(`${base}${path}`, { headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

/** Create a room with `host`, let the others join split across teams, ready up and start. */
export async function setupMatch(host: Bot, others: Bot[], bestOf: 1 | 3 | 5, name = 'bot battle') {
  host.send({ type: 'lobby.create', name, bestOf });
  const room = await host.waitFor('lobby.room', (m) => !!m.room);
  host.send({ type: 'lobby.setFaction', faction: host.faction });
  // Everyone else joins through the invite code: typed in lower case, or a whole pasted link.
  const code = room.room!.code;
  assert(/^[A-Z0-9]{6}$/.test(code), `invite code ${code}`);
  for (const [i, b] of others.entries()) {
    if (i === 0) {
      b.send({ type: 'lobby.joinCode', code: 'XXXXXX' });
      await b.waitFor('error', (m) => m.message.includes('No open game'));
    }
    b.send({ type: 'lobby.joinCode', code: i % 2 ? `https://example.org/?join=${code}` : code.toLowerCase() });
    await b.waitFor('lobby.room', (m) => m.room?.id === room.room!.id);
    b.send({ type: 'lobby.setTeam', team: (i % 2 === 0 ? 1 : 0) as 0 | 1 });
    b.send({ type: 'lobby.setFaction', faction: b.faction });
    b.send({ type: 'lobby.ready', ready: true });
    await b.waitFor('lobby.room', (m) => !!m.room?.slots.find((s) => s.userId === b.userId)?.ready);
  }
  const inits = [host, ...others].map((b) => b.waitFor('match.init', () => true));
  host.send({ type: 'lobby.start' });
  await Promise.all(inits);
}

/** Wait until every bot saw match.end. */
async function waitEnd(bots: Bot[], timeoutMs: number) {
  const t0 = Date.now();
  while (bots.some((b) => !b.ended)) {
    if (Date.now() - t0 > timeoutMs) {
      const s = bots[0].snap;
      throw new Error(`match did not end in time (round ${s?.round}, score ${s?.score}, tick ${s?.tick})`);
    }
    await sleep(100);
  }
}

export interface ScenarioResult {
  log: string[];
}

/** 2v2 (or 1v1) full match: checks match history and stats were persisted. */
export async function fullMatchScenario(base: string, opts: { perTeam: number; bestOf: 1 | 3 | 5; timeoutMs: number; prefix: string }): Promise<ScenarioResult> {
  const log: string[] = [];
  const bots: Bot[] = [];
  for (let i = 0; i < opts.perTeam * 2; i++) {
    const b = new Bot(base, `${opts.prefix}${i}`, FACTION_IDS[i % FACTION_IDS.length], 100 + i);
    await b.register();
    await b.connect();
    bots.push(b);
  }
  await setupMatch(bots[0], bots.slice(1), opts.bestOf, `${opts.prefix} match`);
  log.push(`match ${bots[0].matchId} started with ${bots.length} bots`);
  await waitEnd(bots, opts.timeoutMs);
  const end = bots[0].ended!;
  assert(end.reason === 'finished', `match finished (got ${end.reason})`);
  log.push(`match finished: team ${end.winner} won ${end.score?.join(':')}`);

  // History & stats (written asynchronously right after the end message).
  await sleep(300);
  const { matches } = await api<{ matches: Array<{ _id: string; winnerTeam: number }> }>(base, '/api/history', bots[0].token);
  assert(matches.some((m) => m._id === bots[0].matchId), 'match is in history');
  let wins = 0, losses = 0;
  // The statistics page and Elo: equal teams of fresh accounts, so winners +16 and losers -16.
  assert(!!end.stats && end.stats.players.length === bots.length && end.stats.rounds.length === (end.score![0] + end.score![1]), 'statistics page data sent');
  for (const b of bots) {
    const { user } = await api<{ user: PublicUser }>(base, '/api/me', b.token);
    assert(user.stats.matches === 1, `${b.name} has 1 match`);
    wins += user.stats.wins; losses += user.stats.losses;
    const want = START_RATING + (user.stats.wins ? ELO_K / 2 : -ELO_K / 2);
    assert(user.stats.rating === want, `${b.name} rating ${user.stats.rating} (want ${want})`);
  }
  assert(wins === opts.perTeam && losses === opts.perTeam, `wins/losses split per team (${wins}/${losses})`);
  log.push(`history + stats verified for ${bots.length} players`);
  const errs = bots.flatMap((b) => b.errors).filter((e) => !/Not enough gold|Not enough lumber|occupied|block|busy|round starts in|No open game with the code XXXXXX/.test(e));
  log.push(`unexpected errors: ${errs.length ? errs.join(' | ') : 'none'}`);
  bots.forEach((b) => b.disconnect());
  return { log };
}

/**
 * Start a match, save & exit mid-game, optionally restart the server, then resume
 * with the same accounts and play to the end.
 */
export async function saveResumeScenario(
  base: string,
  opts: { prefix: string; timeoutMs: number; restart?: () => Promise<string> },
): Promise<ScenarioResult> {
  const log: string[] = [];
  const a = new Bot(base, `${opts.prefix}A`, 'ironvow', 7);
  const b = new Bot(base, `${opts.prefix}B`, 'thornwild', 8);
  for (const bot of [a, b]) { await bot.register(); await bot.connect(); }
  await setupMatch(a, [b], 3, `${opts.prefix} saved match`);
  const matchId = a.matchId;
  // Let the game develop.
  await a.waitFor('match.snapshot', (m) => m.snap.tick > 1500 && m.snap.ents.some((e) => e[1] === 0), opts.timeoutMs);
  const tickBefore = a.snap!.tick;
  const ends = [a.waitFor('match.end'), b.waitFor('match.end')];
  a.send({ type: 'game.saveAndExit' });
  const [endA] = await Promise.all(ends);
  assert(endA.reason === 'saved', 'match ended as saved');
  log.push(`saved match ${matchId} at tick ≈${tickBefore}`);

  if (opts.restart) {
    a.disconnect(); b.disconnect();
    base = await opts.restart();
    a.base = b.base = base;
    await a.connect(); await b.connect();
    log.push('server restarted, bots reconnected');
  }

  const { saved } = await api<{ saved: Array<{ _id: string; round: number }> }>(base, '/api/saved', a.token);
  assert(saved.some((s) => s._id === matchId), 'saved game is listed for player A');

  // Resume: A opens the room, B must join (only roster members may).
  a.send({ type: 'lobby.resume', savedGameId: matchId });
  const room = await a.waitFor('lobby.room', (m) => !!m.room?.savedGameId);
  a.send({ type: 'lobby.start' });
  await a.waitFor('error', (m) => m.message.includes('Waiting for original players'));
  b.send({ type: 'lobby.join', roomId: room.room!.id });
  await b.waitFor('lobby.room', (m) => !!m.room);
  b.send({ type: 'lobby.ready', ready: true });
  await b.waitFor('lobby.room', (m) => !!m.room?.slots.find((s) => s.userId === b.userId)?.ready);
  const inits = [a.waitFor('match.init'), b.waitFor('match.init')];
  a.send({ type: 'lobby.start' });
  const [init] = await Promise.all(inits);
  assert(init.matchId === matchId && init.resumed, 'resumed the same match id');
  const first = await a.waitFor('match.snapshot');
  assert(first.snap.tick >= tickBefore - 5, `state restored (tick ${first.snap.tick} ≥ ${tickBefore})`);
  log.push(`resumed at tick ${first.snap.tick}`);

  await waitEnd([a, b], opts.timeoutMs);
  assert(a.ended!.reason === 'finished', 'resumed match finished');
  log.push(`resumed match finished: team ${a.ended!.winner} won ${a.ended!.score?.join(':')}`);
  const left = await api<{ saved: Array<{ _id: string }> }>(base, '/api/saved', a.token);
  assert(!left.saved.some((s) => s._id === matchId), 'finished match no longer resumable');
  a.disconnect(); b.disconnect();
  return { log };
}

/**
 * One human (a scripted client that never builds) against computer players: the host adds,
 * edits and removes AI slots, saves mid-match, resumes alone (bots rejoin by themselves)
 * and the match finishes. Stats must only be written for the human.
 */
export async function aiMatchScenario(base: string, opts: { prefix: string; timeoutMs: number }): Promise<ScenarioResult> {
  const log: string[] = [];
  const human = new Bot(base, `${opts.prefix}H`, 'ironvow', 3);
  human.playing = false;
  await human.register();
  await human.connect();
  human.send({ type: 'lobby.create', name: `${opts.prefix} vs AI`, bestOf: 1 });
  await human.waitFor('lobby.room', (m) => !!m.room);
  const slotsWhere = (pred: (n: number) => boolean) => human.waitFor('lobby.room', (m) => pred(m.room?.slots.length ?? 0));
  human.send({ type: 'lobby.addBot', team: 0, level: 'easy' });
  await slotsWhere((n) => n === 2);
  human.send({ type: 'lobby.addBot', team: 1, level: 'hard' });
  human.send({ type: 'lobby.addBot', team: 1, level: 'normal' });
  const room = (await slotsWhere((n) => n === 4)).room!;
  const ally = room.slots.find((s) => s.team === 0 && s.bot)!;
  const foe = room.slots.find((s) => s.bot === 'normal')!;
  // Edit: ally becomes Thornwild Hard; remove the Normal enemy.
  human.send({ type: 'lobby.updateBot', userId: ally.userId, faction: 'thornwild', level: 'hard' });
  human.send({ type: 'lobby.removeBot', userId: foe.userId });
  const edited = (await human.waitFor('lobby.room', (m) => m.room?.slots.length === 3 && m.room.slots.some((s) => s.team === 0 && s.bot === 'hard' && s.faction === 'thornwild'))).room!;
  assert(edited.slots.every((s) => !s.bot || s.ready), 'bots are always ready');
  log.push(`room: ${edited.slots.map((s) => `${s.name}/${s.team}/${s.faction}`).join(', ')}`);

  const init = human.waitFor('match.init');
  human.send({ type: 'lobby.start' });
  const { matchId } = await init;
  // The AI must actually build. Under fog of war the human only sees its own team's buildings
  // (here: its bot ally's), and the round may end early, so check this well before any castle can fall.
  await human.waitFor('match.snapshot', (m) => m.snap.tick > 600 && m.snap.ents.some((e) => e[1] === 1 && e[4] === human.team), opts.timeoutMs);
  log.push('AI players are building');
  const tickBefore = human.snap!.tick;
  const end = human.waitFor('match.end');
  human.send({ type: 'game.saveAndExit' });
  assert((await end).reason === 'saved', 'saved');
  log.push(`saved at tick ≈${tickBefore}`);

  human.send({ type: 'lobby.resume', savedGameId: matchId });
  const resumed = (await human.waitFor('lobby.room', (m) => !!m.room?.savedGameId)).room!;
  assert(resumed.slots.length === 3 && resumed.slots.filter((s) => s.bot).length === 2, 'bots rejoined the resumed room');
  const init2 = human.waitFor('match.init');
  human.send({ type: 'lobby.start' });
  assert((await init2).matchId === matchId, 'resumed same match');
  await waitEnd([human], opts.timeoutMs);
  assert(human.ended!.reason === 'finished', 'AI match finished');
  log.push(`finished: team ${human.ended!.winner} won ${human.ended!.score?.join(':')} at tick ${human.snap?.tick}`);
  await sleep(300);
  const { user } = await api<{ user: PublicUser }>(base, '/api/me', human.token);
  assert(user.stats.matches === 1, 'human stats recorded');
  const { matches } = await api<{ matches: Array<{ _id: string; players: unknown[] }> }>(base, '/api/history', human.token);
  assert(matches.find((m) => m._id === matchId)?.players.length === 3, 'history lists all 3 players');
  log.push('stats + history verified');
  human.disconnect();
  return { log };
}

/**
 * Ranked matchmaking: two solo players queueing 1v1 meet each other; a party of two queueing 2v2
 * gets filled with bot accounts after its wait, and those look like any player (no bot ids, rated).
 * Needs a server with short bot waits (startServer({ matchmaking: { botWait: [2, 3] } })).
 */
export async function rankedScenario(base: string, opts: { prefix: string; timeoutMs: number }): Promise<ScenarioResult> {
  const log: string[] = [];
  const mk = async (n: string, seed: number) => { const b = new Bot(base, `${opts.prefix}${n}`, 'ironvow', seed); await b.register(); await b.connect(); return b; };

  // 1v1: the second searcher is matched with the first, no bot.
  const a = await mk('a', 301), b = await mk('b', 302);
  const ia = a.waitFor('match.init', () => true, 20_000), ib = b.waitFor('match.init', () => true, 20_000);
  a.send({ type: 'mm.queue', size: 1 });
  await a.waitFor('mm.status', (m) => !!m.status.search);
  b.send({ type: 'mm.queue', size: 1 });
  const [ma, mb] = await Promise.all([ia, ib]);
  assert(ma.matchId === mb.matchId && ma.players.length === 2, '1v1: the two searchers play each other');
  assert(ma.players.every((p) => !p.userId.startsWith('bot:')), '1v1: no bot');
  log.push('1v1: two queued players were matched together');
  await waitEnd([a, b], opts.timeoutMs);
  log.push(`1v1 finished ${a.ended!.score?.join(':')}`);

  // A party of two in 2v2: after its wait, bot accounts fill the other team.
  const c = await mk('c', 303), d = await mk('d', 304);
  c.send({ type: 'party.create' });
  const party = await c.waitFor('mm.status', (m) => !!m.status.party);
  d.send({ type: 'lobby.joinCode', code: party.status.party!.code });
  await c.waitFor('mm.status', (m) => m.status.party?.members.length === 2);
  d.send({ type: 'mm.queue', size: 2 });
  await d.waitFor('error', (m) => m.message.includes('leader'));
  const ic = c.waitFor('match.init', () => true, 30_000);
  c.send({ type: 'mm.queue', size: 2 });
  const mc = await ic;
  assert(mc.players.length === 4, '2v2: four players');
  const mine = mc.players.find((p) => p.userId === c.userId)!, mate = mc.players.find((p) => p.userId === d.userId)!;
  assert(mine.team === mate.team, '2v2: the party plays on one team');
  const foes = mc.players.filter((p) => p.team !== mine.team);
  assert(foes.every((p) => !p.userId.startsWith('bot:') && !/\bAI\b/.test(p.name)), '2v2: the bot accounts look like players');
  log.push(`2v2: party vs ${foes.map((p) => p.name).join(' & ')}`);
  await waitEnd([c, d], opts.timeoutMs);
  const end = c.ended!;
  assert(end.stats!.players.every((p) => !!p.rating && !p.bot), '2v2: everyone is rated on the result screen');
  log.push(`2v2 finished ${end.score?.join(':')}; ratings ${end.stats!.players.map((p) => `${p.name} ${p.rating!.before}→${p.rating!.after}`).join(', ')}`);
  for (const x of [a, b, c, d]) x.disconnect();
  return { log };
}
