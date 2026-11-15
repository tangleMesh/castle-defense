import { AI_LEVELS, AI_LEVEL_NAMES, FACTIONS, FACTION_IDS, GAME_MODES, MAX_PLAYERS_PER_TEAM, type AiLevel, type FactionId, type GameMode, type PublicUser, type RoomInfo, type ServerMessage } from '@bc/shared';
import { api, type MatchSummary, type SavedGameSummary } from '../net/api';
import type { Socket } from '../net/socket';
import { TEAM_CSS, TEAM_NAMES } from '../game/iso';
import { $, clear, css, h, timeAgo } from './dom';

const AI_HINTS: Record<AiLevel, string> = {
  easy: 'Slow, builds at random, sloppy rescue strikes.',
  normal: 'Steady builder that upgrades and uses auras and towers.',
  hard: 'Counters your army, builds a safe base behind its castle, plans its economy, saves the rescue strike for big waves.',
  brutal: 'Hard, but cheating: +30% income, no fog of war, instant reactions. For veterans.',
};

/** Lobby: room list, room view (teams/factions/ready), saved games, history, chat. */
export class LobbyView {
  private rooms: RoomInfo[] = [];
  private room: RoomInfo | null = null;
  private saved: SavedGameSummary[] = [];
  private history: MatchSummary[] = [];
  private chat: Array<{ from: string; text: string }> = [];
  private error = '';
  private botLevel: AiLevel = 'normal';
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
        if (left) void this.refreshData();
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
          h('span', { class: 'dim' }, ` · ${s.wins}W ${s.losses}L · ${s.roundsWon} rounds won · ${s.unitsKilled} kills · ${s.rescueStrikesUsed} strikes`),
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
    return h('section', { class: 'panel-box' },
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

  // ---------------------------------------------------------------- room

  private renderRoom(r: RoomInfo) {
    const me = r.slots.find((s) => s.userId === this.user.id);
    const isHost = r.hostId === this.user.id;
    const locked = !!r.roster;
    const random = r.mode === 'random';
    const team = (t: 0 | 1) => {
      const slots = r.slots.filter((s) => s.team === t);
      const expected = r.roster?.filter((p) => p.team === t) ?? [];
      const missing = expected.filter((p) => !slots.some((s) => s.userId === p.userId));
      return h('div', { class: 'team', style: `--team:${TEAM_CSS[t]}` },
        h('h3', null, `${TEAM_NAMES[t]} `, h('span', { class: 'dim' }, `${slots.length}/${MAX_PLAYERS_PER_TEAM}`)),
        slots.map((s) => s.bot && isHost && !locked ? this.renderBotSlot(s, t, random) : h('div', { class: `slot ${s.ready ? 'ready' : ''}` },
          h('span', { class: 'fac-dot', style: `background:${random ? 'var(--gold-2)' : css(FACTIONS[s.faction].color)}` }),
          h('b', null, s.name), s.userId === r.hostId ? h('span', { class: 'tag' }, 'host') : null,
          s.bot ? h('span', { class: 'tag bot' }, 'AI') : null,
          h('span', { class: 'dim' }, random ? 'Random faction' : FACTIONS[s.faction].name),
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
        AI_LEVELS.map((l) => h('button', {
          class: `btn small ${this.botLevel === l ? '' : 'ghost'}`, title: AI_HINTS[l],
          onclick: () => { this.botLevel = l; this.render(); },
        }, AI_LEVEL_NAMES[l])),
        h('span', { class: 'dim small' }, AI_HINTS[this.botLevel]),
      ) : null,
      !locked && me && !random ? h('div', null,
        h('h3', null, 'Your faction'),
        h('div', { class: 'factions' }, FACTION_IDS.map((id: FactionId) => {
          const f = FACTIONS[id];
          return h('button', {
            class: `faction ${me.faction === id ? 'selected' : ''}`, style: `--fc:${css(f.color)}`,
            onclick: () => this.socket.send({ type: 'lobby.setFaction', faction: id }),
          }, h('b', null, f.name), h('span', null, f.desc),
            h('ul', { class: 'traits' }, f.traits.map((t) => {
              const [head, ...rest] = t.split(': ');
              return h('li', null, rest.length ? h('b', null, `${head}: `) : null, rest.length ? rest.join(': ') : head);
            })));
        })),
      ) : null,
      h('div', { class: 'room-actions' },
        me ? h('button', { class: `btn ${me.ready ? 'ghost' : ''}`, onclick: () => this.socket.send({ type: 'lobby.ready', ready: !me.ready }) }, me.ready ? 'Not ready' : 'Ready') : null,
        isHost ? h('button', { class: 'btn big', onclick: () => this.socket.send({ type: 'lobby.start' }) }, 'Start battle') : h('span', { class: 'dim' }, 'Waiting for the host to start…'),
        h('button', { class: 'btn ghost', onclick: () => this.socket.send({ type: 'lobby.leave' }) }, 'Leave'),
      ),
    );
  }

  private renderBotSlot(s: RoomInfo['slots'][number], t: 0 | 1, random: boolean) {
    const update = (patch: { team?: 0 | 1; faction?: FactionId; level?: AiLevel }) =>
      this.socket.send({ type: 'lobby.updateBot', userId: s.userId, ...patch });
    return h('div', { class: 'slot ready bot-slot' },
      h('span', { class: 'fac-dot', style: `background:${random ? 'var(--gold-2)' : css(FACTIONS[s.faction].color)}` }),
      h('b', null, s.name.split(' (')[0]), h('span', { class: 'tag bot' }, 'AI'),
      h('select', { title: 'Difficulty', onchange: (e: Event) => update({ level: (e.target as HTMLSelectElement).value as AiLevel }) },
        AI_LEVELS.map((l) => h('option', { value: l, selected: s.bot === l }, AI_LEVEL_NAMES[l]))),
      random ? h('span', { class: 'dim' }, 'Random faction') : h('select', { title: 'Faction', onchange: (e: Event) => update({ faction: (e.target as HTMLSelectElement).value as FactionId }) },
        FACTION_IDS.map((id) => h('option', { value: id, selected: s.faction === id }, FACTIONS[id].name))),
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

  private renderHistory() {
    return h('section', { class: 'panel-box' },
      h('h2', null, 'Recent battles'),
      this.history.length ? this.history.slice(0, 8).map((m) => {
        const me = m.players.find((p) => p.userId === this.user.id);
        const won = me && me.team === m.winnerTeam;
        return h('div', { class: 'hist-row' },
          h('span', { class: won ? 'win' : 'lose' }, won ? 'Victory' : 'Defeat'),
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
