import { BOT_LEVELS, AI_LEVEL_NAMES, START_RATING, FACTIONS, FACTION_IDS, GAME_MODES, MAX_PLAYERS_PER_TEAM, type AiLevel, type FactionId, type GameMode, type PublicUser, type RoomInfo, type ServerMessage, type MatchmakingStatus, RANKED_BEST_OF } from '@bc/shared';
import { builderPortrait } from './portraits';
import { getGraphics, setGraphicsMode } from '../settings';
import { api, type MatchSummary, type SavedGameSummary } from '../net/api';
import type { Socket } from '../net/socket';
import { copyText, inviteLink, takeInvite } from '../net/invite';
import { TEAM_CSS, TEAM_NAMES } from '../game/iso';
import { $, clear, css, h, timeAgo } from './dom';

const AI_HINTS: Record<AiLevel, string> = {
  auto: 'Plays as strong as the humans in the game (matched to their Elo, teams kept fair), each with its own playstyle and temper.',
  easy: 'Slow, builds at random, sloppy rescue strikes.',
  normal: 'Steady builder that upgrades and uses auras and towers.',
  hard: 'Counters your army, builds a safe base behind its castle, plans its economy, saves the rescue strike for big waves.',
  brutal: 'The sharpest fixed level: Hard\'s plans with faster decisions. No cheats: same income and fog of war as you.',
};

/** Lobby: room list, room view (teams/factions/ready), saved games, history, chat. */
export class LobbyView {
  private rooms: RoomInfo[] = [];
  private room: RoomInfo | null = null;
  private saved: SavedGameSummary[] = [];
  private history: MatchSummary[] = [];
  private chat: Array<{ from: string; text: string }> = [];
  private error = '';
  private botLevel: AiLevel = 'auto';
  /** Short confirmation next to the invite buttons ("Link copied"). */
  private copied = '';
  /** Ranked matchmaking: party and search state. */
  private mm: MatchmakingStatus = { party: null, search: null };
  private mmSize: 1 | 2 | 3 | 4 = 1;
  private mmTimer: ReturnType<typeof setInterval> | null = null;
  /** The first room state from the server arrived (a waiting invite is used then). */
  private synced = false;
  private root = $('#screen-lobby');
  private off: () => void;

  constructor(private socket: Socket, public user: PublicUser, private onLogout: () => void) {
    this.off = socket.on((m) => this.receive(m));
    void this.refreshData();
    this.render();
  }

  destroy() {
    this.off();
  }

  async refreshData() {
    try {
      const [me, saved, history] = await Promise.all([api.me(), api.saved(), api.history()]);
      this.user = me.user;
      this.saved = saved.saved;
      this.history = history.matches;
    } catch { /* offline: keep old data */ }
    this.render();
  }

  private receive(m: ServerMessage) {
    switch (m.type) {
      case 'lobby.list': this.rooms = m.rooms; break;
      case 'lobby.room': {
        const left = this.room && !m.room;
        this.room = m.room;
        // An invite link opened before signing in: join that game now.
        if (!this.synced) {
          this.synced = true;
          const code = takeInvite();
          if (code && m.room?.code !== code) this.socket.send({ type: 'lobby.joinCode', code });
        }
        if (left) void this.refreshData();
        break;
      }
      case 'mm.status': {
        this.mm = m.status;
        if (m.status.party && m.status.party.members.length > this.mmSize) this.mmSize = Math.min(4, m.status.party.members.length) as 1 | 2 | 3 | 4;
        if (m.status.search) this.mmSize = m.status.search.size;
        // Tick the search clock without re-rendering the whole lobby.
        if (m.status.search && !this.mmTimer) this.mmTimer = setInterval(() => this.tickSearch(), 1000);
        if (!m.status.search && this.mmTimer) { clearInterval(this.mmTimer); this.mmTimer = null; }
        break;
      }
      case 'chat': if (m.scope === 'lobby') { this.chat.push({ from: m.from, text: m.text }); this.chat = this.chat.slice(-50); } break;
      case 'error': this.error = m.message; setTimeout(() => { if (this.error === m.message) { this.error = ''; this.render(); } }, 5000); break;
      default: return;
    }
    this.render();
  }

  render() {
    const chatBox = this.root.querySelector<HTMLInputElement>('.lobby-chat input');
    const chatDraft = chatBox?.value ?? '';
    const chatFocused = document.activeElement === chatBox;
    clear(this.root);
    const s = this.user.stats;
    this.root.append(...[
      h('header', { class: 'lobby-head' },
        h('h1', { class: 'title small' }, 'Castle Defense'),
        h('div', { class: 'me' },
          h('b', null, this.user.username),
          h('span', { class: 'elo-badge', title: `Elo rating · peak ${s.peakRating ?? START_RATING}` }, `Elo ${s.rating ?? START_RATING}`),
          h('span', { class: 'dim' }, ` · ${s.wins}W ${s.losses}L · ${s.roundsWon} rounds won · ${s.unitsKilled} kills · ${s.rescueStrikesUsed} strikes`),
          h('button', { class: 'btn small ghost', title: 'Graphics of the battlefield: painted 2D or 3D (only for you)', onclick: () => { setGraphicsMode(getGraphics() === '3d' ? '2d' : '3d'); this.render(); } },
            `Graphics: ${getGraphics() === '3d' ? '3D' : '2D'}`),
          h('button', { class: 'btn small ghost', onclick: () => this.onLogout() }, 'Sign out'),
        ),
      ),
      this.error ? h('div', { class: 'banner-error' }, this.error) : null,
      h('main', { class: 'lobby-grid' },
        this.room ? this.renderRoom(this.room) : this.renderBrowser(),
        h('aside', { class: 'side' }, this.renderSaved(), this.renderHistory(), this.renderChat()),
      ),
    ].filter((n): n is HTMLElement => !!n));
    if (chatFocused || chatDraft) {
      const box = this.root.querySelector<HTMLInputElement>('.lobby-chat input');
      if (box) { box.value = chatDraft; if (chatFocused) box.focus(); }
    }
  }

  // ---------------------------------------------------------------- browser

  private renderBrowser() {
    const name = h('input', { placeholder: 'Game name', maxLength: 40, value: `${this.user.username}'s battle` });
    const bestOf = h('select', null, [1, 3, 5].map((n) => h('option', { value: String(n), selected: n === 3 }, `Best of ${n}`)));
    const mode = h('select', { title: 'Game mode' }, (Object.keys(GAME_MODES) as GameMode[]).map((m) => h('option', { value: m, title: GAME_MODES[m].desc }, GAME_MODES[m].name)));
    const code = h('input', { placeholder: 'Invite code or link', maxLength: 200, class: 'code-input', autocomplete: 'off', spellcheck: false });
    return h('section', { class: 'panel-box' },
      this.renderRanked(),
      h('form', { class: 'join-code', onsubmit: (e: Event) => {
        e.preventDefault();
        if (code.value.trim()) this.socket.send({ type: 'lobby.joinCode', code: code.value });
      } }, h('b', null, 'Got an invite?'), code, h('button', { class: 'btn small', type: 'submit' }, 'Join')),
      h('h2', null, 'Open games'),
      this.rooms.length
        ? h('div', { class: 'room-list' }, this.rooms.map((r) => {
          const t0 = r.slots.filter((x) => x.team === 0).length, t1 = r.slots.filter((x) => x.team === 1).length;
          const mine = r.roster?.some((p) => p.userId === this.user.id);
          const canJoin = r.status === 'lobby' && (!r.roster || mine);
          return h('div', { class: 'room-row' },
            h('div', null,
              h('b', null, r.name),
              r.roster ? h('span', { class: 'tag' }, 'resumed') : null,
              r.status === 'playing' ? h('span', { class: 'tag live' }, 'in battle') : null,
              h('div', { class: 'dim' }, `${GAME_MODES[r.mode ?? 'standard'].name} · Best of ${r.bestOf} · ${t0} vs ${t1} · ${r.slots.map((x) => x.name).join(', ')}`),
            ),
            h('button', { class: 'btn small', disabled: !canJoin, onclick: () => this.socket.send({ type: 'lobby.join', roomId: r.id }) }, 'Join'),
          );
        }))
        : h('p', { class: 'dim' }, 'No open games yet. Create one below!'),
      h('h2', null, 'Create a game'),
      h('form', { class: 'create-form', onsubmit: (e: Event) => {
        e.preventDefault();
        this.socket.send({ type: 'lobby.create', name: name.value.trim() || 'Battle', bestOf: Number(bestOf.value) as 1 | 3 | 5, mode: mode.value as GameMode });
      } }, name, bestOf, mode, h('button', { class: 'btn', type: 'submit' }, 'Create')),
      h('div', { class: 'how' },
        h('h3', null, 'How to play'),
        h('ul', null,
          h('li', null, 'Two teams, one castle each. Every player commands a single invulnerable builder.'),
          h('li', null, 'Build spawn buildings in your zone: they train units that march on the enemy castle by themselves.'),
          h('li', null, 'Income every 10 s grows with the value of what you build. Kills pay a bounty.'),
          h('li', null, 'Aura buildings buff nearby units; towers defend; each player may own one powerful special building.'),
          h('li', null, 'Once per round, a Rescue Strike near your own castle wipes out every enemy unit in the area.'),
          h('li', null, 'Destroy the enemy castle to win the round. Each round starts fresh.'),
        ),
      ),
    );
  }

  // ---------------------------------------------------------------- ranked

  private tickSearch() {
    const el = this.root.querySelector('.mm-clock');
    const since = this.mm.search?.since;
    if (el && since) el.textContent = clock(Date.now() - since);
  }

  /** Ranked matchmaking: party (alone or with friends), size, search. */
  private renderRanked() {
    const { party, search, found } = this.mm;
    const me = this.user.id;
    const leader = !party || party.leaderId === me;
    const members = party?.members ?? [{ userId: me, name: this.user.username, rating: this.user.stats.rating ?? START_RATING }];
    const sizeBtn = (n: 1 | 2 | 3 | 4) => h('button', {
      class: `mode size ${this.mmSize === n ? 'selected' : ''}`, disabled: !!search || members.length > n || !leader,
      title: members.length > n ? `Your party has ${members.length} players` : `${n} player${n > 1 ? 's' : ''} per team`,
      onclick: () => { this.mmSize = n; this.render(); },
    }, h('b', null, `${n}v${n}`));
    return h('div', { class: 'ranked' },
      h('div', { class: 'ranked-head' },
        h('h2', null, 'Ranked match'),
        h('span', { class: 'dim' }, `Random factions · best of ${RANKED_BEST_OF} · counts for your Elo`)),
      h('div', { class: 'party' },
        members.map((m) => h('span', { class: `member ${m.userId === me ? 'me' : ''}` },
          party && m.userId === party.leaderId && members.length > 1 ? h('i', { class: 'crown', title: 'Party leader' }, '♛') : null,
          h('b', null, m.name), h('span', { class: 'dim' }, ` ${Math.round(m.rating)}`))),
        party
          ? h('span', { class: 'party-invite' },
            h('code', { class: 'invite-code small' }, party.code),
            h('button', { class: 'btn small ghost', disabled: !!search, onclick: () => void this.copy(inviteLink(party.code), 'Invite link copied') }, 'Copy invite link'),
            h('button', { class: 'btn small ghost', disabled: !!search, onclick: () => this.socket.send({ type: 'party.leave' }) }, members.length > 1 ? 'Leave party' : 'Close party'))
          : h('button', { class: 'btn small ghost', onclick: () => this.socket.send({ type: 'party.create' }), title: 'Queue together with friends: they join with your party\'s invite code or link' }, '+ Invite friends'),
        this.copied ? h('span', { class: 'copied' }, this.copied) : null,
      ),
      h('div', { class: 'sizes' }, ([1, 2, 3, 4] as const).map(sizeBtn)),
      found
        ? h('div', { class: 'mm-search found' }, h('b', null, 'Match found!'), h('span', { class: 'dim' }, ' Get ready…'))
        : search
          ? h('div', { class: 'mm-search' },
            h('span', { class: 'spinner' }),
            h('b', null, `Searching for a ${search.size}v${search.size} match`),
            h('span', { class: 'mm-clock' }, clock(Date.now() - search.since)),
            h('button', { class: 'btn ghost', onclick: () => this.socket.send({ type: 'mm.cancel' }) }, 'Cancel'))
          : leader
            ? h('button', { class: 'btn big find', disabled: !!this.room, onclick: () => this.socket.send({ type: 'mm.queue', size: this.mmSize }) }, `Find ${this.mmSize}v${this.mmSize} match`)
            : h('div', { class: 'dim' }, `Waiting for ${members.find((m) => m.userId === party?.leaderId)?.name ?? 'the leader'} to start the search…`),
    );
  }

  // ---------------------------------------------------------------- room

  private async copy(text: string, note: string) {
    const ok = await copyText(text);
    this.copied = ok ? note : `Copy failed: ${text}`;
    this.render();
    setTimeout(() => { if (this.copied) { this.copied = ''; this.render(); } }, 2500);
  }

  private renderRoom(r: RoomInfo) {
    const me = r.slots.find((s) => s.userId === this.user.id);
    const isHost = r.hostId === this.user.id;
    const locked = !!r.roster;
    // Random and mirror modes draw factions each round: nothing to pick in the lobby.
    const random = r.mode !== 'standard';
    /** Teammate (other than `userId`) already playing `faction` on team `t`: each faction once per team. */
    const takenBy = (t: 0 | 1, faction: FactionId, userId: string) => r.slots.find((x) => x.team === t && x.faction === faction && x.userId !== userId);
    const team = (t: 0 | 1) => {
      const slots = r.slots.filter((s) => s.team === t);
      const expected = r.roster?.filter((p) => p.team === t) ?? [];
      const missing = expected.filter((p) => !slots.some((s) => s.userId === p.userId));
      return h('div', { class: 'team', style: `--team:${TEAM_CSS[t]}` },
        h('h3', null, `${TEAM_NAMES[t]} `, h('span', { class: 'dim' }, `${slots.length}/${MAX_PLAYERS_PER_TEAM}`)),
        slots.map((s) => s.bot && isHost && !locked ? this.renderBotSlot(s, t, random, r) : h('div', { class: `slot ${s.ready ? 'ready' : ''}` },
          h('span', { class: 'fac-dot', style: `background:${random ? 'var(--gold-2)' : css(FACTIONS[s.faction].color)}` }),
          h('b', null, s.name), s.userId === r.hostId ? h('span', { class: 'tag' }, 'host') : null,
          s.bot ? h('span', { class: 'tag bot' }, 'AI') : null,
          h('span', { class: 'dim' }, random ? (r.mode === 'mirror' ? 'Mirrored faction' : 'Random faction') : FACTIONS[s.faction].name),
          h('span', { class: 'rdy' }, s.ready ? 'Ready' : '…'),
        )),
        missing.map((p) => h('div', { class: 'slot missing' }, h('b', null, p.name), h('span', { class: 'dim' }, 'not joined yet'))),
        !locked && me && me.team !== t
          ? h('button', { class: 'btn small ghost', onclick: () => this.socket.send({ type: 'lobby.setTeam', team: t }) }, `Join ${TEAM_NAMES[t]}`)
          : null,
        isHost && !locked && slots.length < MAX_PLAYERS_PER_TEAM
          ? h('button', { class: 'btn small ghost add-bot', onclick: () => this.socket.send({ type: 'lobby.addBot', team: t, level: this.botLevel }) }, `+ Add ${AI_LEVEL_NAMES[this.botLevel]} AI`)
          : null,
      );
    };
    return h('section', { class: 'panel-box' },
      h('div', { class: 'room-head' },
        h('h2', null, r.name),
        h('span', { class: 'dim' }, `Best of ${r.bestOf}${r.score ? ` · saved score ${r.score[0]} : ${r.score[1]}` : ''}`),
      ),
      h('div', { class: 'invite-bar', title: 'Share the code or the link (Discord, any chat): friends join this game directly' },
        h('span', { class: 'dim' }, 'Invite friends'),
        h('code', { class: 'invite-code' }, r.code),
        h('button', { class: 'btn small ghost', onclick: () => void this.copy(r.code, 'Code copied') }, 'Copy code'),
        h('button', { class: 'btn small', onclick: () => void this.copy(inviteLink(r.code), 'Invite link copied') }, 'Copy invite link'),
        this.copied ? h('span', { class: 'copied' }, this.copied) : null,
      ),
      h('div', { class: 'mode-bar' },
        h('h3', null, 'Game mode'),
        isHost && !locked
          ? h('div', { class: 'modes' }, (Object.keys(GAME_MODES) as GameMode[]).map((m) => h('button', {
            class: `mode ${r.mode === m ? 'selected' : ''}`,
            onclick: () => { if (r.mode !== m) this.socket.send({ type: 'lobby.setMode', mode: m }); },
          }, h('b', null, GAME_MODES[m].name), h('span', null, GAME_MODES[m].desc))))
          : h('div', { class: 'modes' }, h('div', { class: 'mode selected' },
            h('b', null, GAME_MODES[r.mode ?? 'standard'].name), h('span', null, GAME_MODES[r.mode ?? 'standard'].desc))),
      ),
      locked ? h('p', { class: 'note' }, 'Resuming a saved game: teams and factions are locked, and every original player must join.') : null,
      h('div', { class: 'teams' }, team(0), h('div', { class: 'vs' }, 'VS'), team(1)),
      isHost && !locked ? h('div', { class: 'bot-bar' },
        h('span', { class: 'dim' }, 'Computer players:'),
        BOT_LEVELS.map((l) => h('button', {
          class: `btn small ${this.botLevel === l ? '' : 'ghost'}`, title: AI_HINTS[l],
          onclick: () => { this.botLevel = l; this.render(); },
        }, AI_LEVEL_NAMES[l])),
        h('span', { class: 'dim small' }, AI_HINTS[this.botLevel]),
      ) : null,
      !locked && me && !random ? h('div', null,
        h('h3', null, 'Your faction'),
        // A compact picker: each faction's builder and name; the chosen one's details below.
        h('div', { class: 'factions' }, FACTION_IDS.map((id: FactionId) => {
          const f = FACTIONS[id];
          const mate = takenBy(me.team, id, me.userId);
          return h('button', {
            class: `faction ${me.faction === id ? 'selected' : ''} ${mate ? 'taken' : ''}`, style: `--fc:${css(f.color)}`,
            title: mate ? `${mate.name} already plays the ${f.name} (each faction once per team)` : f.desc, disabled: !!mate,
            onclick: () => this.socket.send({ type: 'lobby.setFaction', faction: id }),
          }, h('img', { src: builderPortrait(id), alt: '' }), h('b', null, f.name.split(' ')[0]));
        })),
        ((f) => h('div', { class: 'faction-detail', style: `--fc:${css(f.color)}` },
          h('img', { src: builderPortrait(f.id), alt: '' }),
          h('div', null,
            h('b', null, f.name), h('span', null, f.desc),
            h('ul', { class: 'traits' }, f.traits.map((t) => {
              const [head, ...rest] = t.split(': ');
              return h('li', null, rest.length ? h('b', null, `${head}: `) : null, rest.length ? rest.join(': ') : head);
            })))))(FACTIONS[me.faction as FactionId]),
      ) : null,
      h('div', { class: 'room-actions' },
        me ? h('button', { class: `btn ${me.ready ? 'ghost' : ''}`, onclick: () => this.socket.send({ type: 'lobby.ready', ready: !me.ready }) }, me.ready ? 'Not ready' : 'Ready') : null,
        isHost ? (() => {
          // The host is ready by starting; everyone else has to press Ready first.
          const waiting = r.slots.filter((x) => !x.ready && x.userId !== this.user.id);
          const empty = !r.roster && ([0, 1] as const).some((t) => !r.slots.some((x) => x.team === t));
          const hint = empty ? 'Each team needs at least one player (add an AI?)'
            : waiting.length ? `All players must be ready first · waiting for ${waiting.map((x) => x.name).join(', ')}` : '';
          return h('span', { class: 'start-wrap' },
            h('button', { class: 'btn big', disabled: !!hint, title: hint || 'Start the battle', onclick: () => this.socket.send({ type: 'lobby.start' }) }, 'Start battle'),
            hint ? h('span', { class: 'start-hint' }, hint) : null);
        })() : h('span', { class: 'dim' }, me?.ready ? 'Waiting for the host to start…' : 'Press Ready when you are set — the host starts once everyone is ready'),
        h('button', { class: 'btn ghost', onclick: () => this.socket.send({ type: 'lobby.leave' }) }, 'Leave'),
      ),
    );
  }

  private renderBotSlot(s: RoomInfo['slots'][number], t: 0 | 1, random: boolean, r: RoomInfo) {
    const update = (patch: { team?: 0 | 1; faction?: FactionId; level?: AiLevel }) =>
      this.socket.send({ type: 'lobby.updateBot', userId: s.userId, ...patch });
    return h('div', { class: 'slot ready bot-slot' },
      h('span', { class: 'fac-dot', style: `background:${random ? 'var(--gold-2)' : css(FACTIONS[s.faction].color)}` }),
      h('b', null, s.name.split(' (')[0]), h('span', { class: 'tag bot' }, 'AI'),
      h('select', { title: 'Difficulty', onchange: (e: Event) => update({ level: (e.target as HTMLSelectElement).value as AiLevel }) },
        BOT_LEVELS.map((l) => h('option', { value: l, selected: s.bot === l }, AI_LEVEL_NAMES[l]))),
      random ? h('span', { class: 'dim' }, r.mode === 'mirror' ? 'Mirrored faction' : 'Random faction') : h('select', { title: 'Faction', onchange: (e: Event) => update({ faction: (e.target as HTMLSelectElement).value as FactionId }) },
        FACTION_IDS.map((id) => {
          const mate = r.slots.find((x) => x.team === t && x.faction === id && x.userId !== s.userId);
          return h('option', { value: id, selected: s.faction === id, disabled: !!mate }, mate ? `${FACTIONS[id].name} (${mate.name.split(' (')[0]})` : FACTIONS[id].name);
        })),
      h('span', { class: 'rdy' },
        h('button', { class: 'btn tiny ghost', title: `Move to ${TEAM_NAMES[t === 0 ? 1 : 0]}`, onclick: () => update({ team: t === 0 ? 1 : 0 }) }, '⇄'),
        h('button', { class: 'btn tiny ghost', title: 'Remove', onclick: () => this.socket.send({ type: 'lobby.removeBot', userId: s.userId }) }, '✕'),
      ),
    );
  }

  // ---------------------------------------------------------------- side panels

  private renderSaved() {
    return h('section', { class: 'panel-box' },
      h('h2', null, 'Saved games'),
      this.saved.length ? this.saved.map((g) => h('div', { class: 'saved-row' },
        h('div', null,
          h('b', null, g.name),
          h('div', { class: 'dim' }, `Round ${g.round} · ${g.score[0]} : ${g.score[1]} · ${timeAgo(g.updatedAt)}`),
          h('div', { class: 'dim small' }, g.players.map((p) => p.name).join(', ')),
        ),
        h('div', { class: 'col' },
          h('button', { class: 'btn small', disabled: !!this.room, onclick: () => this.socket.send({ type: 'lobby.resume', savedGameId: g._id }) }, 'Resume'),
          h('button', { class: 'btn small ghost', onclick: async (e: MouseEvent) => {
            const b = e.currentTarget as HTMLButtonElement;
            if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Sure?'; return; }
            await api.discardSaved(g._id).catch(() => {});
            void this.refreshData();
          } }, 'Discard'),
        ),
      )) : h('p', { class: 'dim' }, 'Matches you save (or that get interrupted) appear here.'),
    );
  }

  /** The account's rating over its recent matches (oldest left), as a small SVG line. */
  private ratingChart() {
    const pts = this.history.map((m) => m.players.find((p) => p.userId === this.user.id)?.ratingAfter).filter((v): v is number => v !== undefined).reverse();
    if (pts.length < 2) return null;
    const W = 260, H = 54, lo = Math.min(...pts) - 5, hi = Math.max(...pts) + 5;
    const xy = pts.map((v, i) => `${((i / (pts.length - 1)) * W).toFixed(1)},${(H - ((v - lo) / (hi - lo)) * H).toFixed(1)}`);
    const svg = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" class="elo-chart"><polyline points="${xy.join(' ')}" fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>`;
    const el = h('div', { class: 'elo-progress', title: `Rating after each of your last ${pts.length} rated matches` });
    el.innerHTML = svg;
    return h('div', null, h('div', { class: 'dim small' }, `Rating ${pts[0]} → ${pts[pts.length - 1]} over ${pts.length} matches`), el);
  }

  private renderHistory() {
    return h('section', { class: 'panel-box' },
      h('h2', null, 'Recent battles'),
      this.ratingChart(),
      this.history.length ? this.history.slice(0, 8).map((m) => {
        const me = m.players.find((p) => p.userId === this.user.id);
        const won = me && me.team === m.winnerTeam;
        const d = me?.ratingAfter !== undefined && me.ratingBefore !== undefined ? me.ratingAfter - me.ratingBefore : null;
        return h('div', { class: 'hist-row' },
          h('span', { class: won ? 'win' : 'lose' }, won ? 'Victory' : 'Defeat'),
          d !== null ? h('span', { class: d >= 0 ? 'elo-up' : 'elo-down' }, `${d >= 0 ? '+' : ''}${d}`) : null,
          h('span', null, `${m.score[0]} : ${m.score[1]}`),
          h('span', { class: 'dim' }, m.players.filter((p) => p.userId !== this.user.id).map((p) => p.name).join(', ')),
          h('span', { class: 'dim small' }, timeAgo(m.endedAt)),
        );
      }) : h('p', { class: 'dim' }, 'No battles fought yet.'),
    );
  }

  private renderChat() {
    const input = h('input', { placeholder: this.room ? 'Chat with your room…' : 'Chat with the lobby…', maxLength: 300 });
    return h('section', { class: 'panel-box lobby-chat' },
      h('h2', null, 'Chat'),
      h('div', { class: 'chat-lines' }, this.chat.slice(-12).map((c) => h('div', null, h('b', null, `${c.from}: `), c.text))),
      h('form', { onsubmit: (e: Event) => {
        e.preventDefault();
        const text = input.value.trim();
        if (text) this.socket.send({ type: 'chat', text });
        input.value = '';
      } }, input),
    );
  }
}

/** m:ss of a duration in ms. */
function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
