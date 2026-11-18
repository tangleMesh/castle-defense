import {
  BASE_INCOME, SAPPHIRE_GOLD, START_SAPPHIRES, BUILDINGS, INCOME_PCT, FACTIONS, ITEMS, ITEM_BY_ID, MAX_ITEMS, GRID_HOTKEYS, INCOME_INTERVAL_TICKS, REPAIR_TIME_RATIO, CASTLE_REPAIR_HPS, MAP, ROCK_GRID, TICK_RATE, UNITS, DAMAGE_TABLE, fogActive, unitAbilities, powerText,
  type ArmorType, type AttackType, type EntRow, type ServerMessage, type SimEvent, type Snapshot,
} from '@bc/shared';
import { OUTER_TILES, outerDecor } from '../game/landscape';
import type { GameScene } from '../game/scene';
import type { MatchSession, Mode } from '../game/session';
import { DPR, TEAM_COLORS, TEAM_CSS, TEAM_NAMES, WORLD, toScreen, toTile } from '../game/iso';

/** Minimap size in CSS pixels; the canvas backing store is DPR× larger. */
const MINI_W = 232, MINI_H = 80;
/** World rect the minimap shows: the whole map, padded with countryside to the minimap's aspect. */
const MV = (() => {
  const h = ((WORLD.maxX - WORLD.minX) * MINI_H) / MINI_W, pad = (h - (WORLD.maxY - WORLD.minY)) / 2;
  return { minX: WORLD.minX, maxX: WORLD.maxX, minY: WORLD.minY - pad, maxY: WORLD.maxY + pad };
})();
import { $, clear, css, h } from './dom';
import { itemIcon } from './itemIcons';

interface CardButton {
  slot: number;
  icon: string;
  name: string;
  cost?: number;
  /** False when the player can't pay `cost` right now. */
  afford?: boolean;
  /** Sapphires needed on top of the gold. */
  gems?: number;
  /** False when the player lacks the sapphires. */
  gemsOk?: boolean;
  tip: string;
  disabled?: boolean;
  active?: boolean;
  run: () => void;
}

const SVG = {
  rescue: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><defs><radialGradient id="rg"><stop offset="0" stop-color="#fff8c0"/><stop offset="1" stop-color="#e0a020"/></radialGradient></defs><rect width="48" height="48" fill="#3a2a10"/><g stroke="#ffd860" stroke-width="3">${Array.from({ length: 8 }, (_, i) => { const a = (i * Math.PI) / 4; return `<line x1="${24 + Math.cos(a) * 12}" y1="${24 + Math.sin(a) * 12}" x2="${24 + Math.cos(a) * 21}" y2="${24 + Math.sin(a) * 21}"/>`; }).join('')}</g><circle cx="24" cy="24" r="10" fill="url(#rg)"/></svg>`,
  stop: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" fill="#2a1a1a"/><rect x="13" y="13" width="22" height="22" rx="3" fill="#c84040" stroke="#ffb0a0" stroke-width="2"/></svg>`,
  sell: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" fill="#2a2410"/><circle cx="24" cy="24" r="13" fill="#e0b040" stroke="#fff0a0" stroke-width="2"/><text x="24" y="30" font-size="16" text-anchor="middle" fill="#6a4a10" font-family="Georgia" font-weight="bold">$</text></svg>`,
  sapphire: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><defs><linearGradient id="sg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9ad8ff"/><stop offset=".5" stop-color="#2a6ae0"/><stop offset="1" stop-color="#102a80"/></linearGradient></defs><rect width="48" height="48" fill="#141a2a"/><path d="M14 18 L20 11 H28 L34 18 L24 38 Z" fill="url(#sg)" stroke="#d8f0ff" stroke-width="1.5"/><path d="M14 18 H34 M20 11 L24 18 L28 11 M24 18 L24 38" stroke="#d8f0ff" stroke-width=".8" opacity=".7" fill="none"/></svg>`,
  repair: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" fill="#1a2418"/><g transform="rotate(-40 24 24)"><rect x="21.5" y="18" width="5" height="22" rx="1.5" fill="#a07040" stroke="#e0c090" stroke-width="1"/><rect x="13" y="10" width="22" height="9" rx="2" fill="#b8c0c8" stroke="#f0f4f8" stroke-width="1.5"/></g><path d="M33 31 l2.5 -5 l2.5 5 l-2.5 5 z" fill="#80ff90"/></svg>`,
  cancel: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" fill="#1a1a1a"/><path d="M14 14 L34 34 M34 14 L14 34" stroke="#e05040" stroke-width="5" stroke-linecap="round"/></svg>`,
};
/** Invested value isn't in the snapshot; approximate from building costs incl. the upgrade chain. */
function chainCost(id: string): number {
  const d = BUILDINGS[id];
  const from = Object.values(BUILDINGS).find((b) => b.upgrades?.includes(id));
  return d.cost + (from ? chainCost(from.id) : 0);
}
const svgUrl = (s: string) => `data:image/svg+xml;utf8,${encodeURIComponent(s)}`;

const ATTACK_LABEL: Record<AttackType, string> = { normal: 'Normal', pierce: 'Pierce', siege: 'Siege', magic: 'Magic', chaos: 'Chaos' };
const ARMOR_LABEL: Record<ArmorType, string> = { light: 'Light', medium: 'Medium', heavy: 'Heavy', fortified: 'Fortified' };

function strongAgainst(a: AttackType): string {
  return (Object.entries(DAMAGE_TABLE[a]) as Array<[ArmorType, number]>).filter(([, m]) => m > 1.1).map(([k]) => ARMOR_LABEL[k]).join(', ') || '—';
}

/** WC3-style console: resource bar, minimap, info panel, command card, chat, banners. */
export class Hud {
  private root: HTMLElement;
  private icons = new Map<string, string>();
  private card!: HTMLElement;
  /** The builder's item bag (above the command card), with the shop button. */
  private bag!: HTMLElement;
  private lastBagKey = '';
  private info!: HTMLElement;
  private top!: HTMLElement;
  private msg!: HTMLElement;
  private chatLog!: HTMLElement;
  private chatInput!: HTMLInputElement;
  private overlay!: HTMLElement;
  private banner!: HTMLElement;
  /** Start countdown of a round (nobody can build until it ends). */
  private countdown!: HTMLElement;
  private menu!: HTMLElement;
  private topLive!: HTMLElement;
  private board!: HTMLElement;
  private mini!: HTMLCanvasElement;
  private miniBase!: HTMLCanvasElement;
  private buttons: CardButton[] = [];
  private sellArmed = 0;
  private lastInfoKey = '';
  private lastCardKey = '';
  private disposers: Array<() => void> = [];
  private raf = 0;
  private pauseVote = false;

  constructor(private session: MatchSession, private scene: GameScene, private onExit: () => void, private sendRaw: (m: import('@bc/shared').ClientMessage) => void) {
    this.root = $('#hud');
    clear(this.root);
    this.build();
    scene.flashError = (m) => this.error(m);
    this.disposers.push(
      session.on('snapshot', () => this.onSnapshot()),
      session.on('event', (ev: SimEvent) => this.onEvent(ev)),
      session.on('mode', () => this.refreshCard(true)),
      session.on('selection', () => { this.sellArmed = 0; this.refreshCard(true); this.refreshInfo(true); }),
      session.on('pause', () => this.renderPause()),
      session.on('end', (m) => this.renderEnd(m)),
      session.on('chat', (m) => this.addChat(m.from, m.text)),
    );
    const onKey = (e: KeyboardEvent) => this.onKey(e);
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') this.scene.shiftHeld = false;
      if (e.key === 'Alt') this.scene.showAllBars = false;
      if (e.key === 'Tab') { this.board.hidden = true; e.preventDefault(); }
    };
    const onBlur = () => { this.board.hidden = true; };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    this.disposers.push(
      () => window.removeEventListener('keydown', onKey),
      () => window.removeEventListener('keyup', onKeyUp),
      () => window.removeEventListener('blur', onBlur),
    );
    const loop = () => { this.drawMinimap(); this.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
    this.renderPause();
    this.message(`Round ${session.latest?.round ?? 1}. ${this.factionNote()}Build spawners, push to the enemy castle! (F1 builder · Space center · T rescue strike)`, 'info', 6000);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.disposers.forEach((d) => d());
    clear(this.root);
  }

  // ---------------------------------------------------------------- layout

  /** Data URL of a texture cropped to its opaque art (skips baked shadows and empty canvas). */
  private icon(key: string): string {
    let url = this.icons.get(key);
    if (url) return url;
    const src = this.scene.textures.get(key).getSourceImage() as HTMLCanvasElement | HTMLImageElement;
    try {
      const w = src.width, h = src.height;
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(src, 0, 0);
      const data = ctx.getImageData(0, 0, w, h).data;
      let x0 = w, y0 = h, x1 = -1, y1 = -1;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] < 200) continue;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
      if (x1 < 0) throw new Error('empty');
      // square crop with a little padding
      const side = Math.max(x1 - x0, y1 - y0) * 1.08 + 4;
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      const out = document.createElement('canvas');
      out.width = out.height = Math.min(256, Math.ceil(side));
      const o = out.getContext('2d')!;
      o.imageSmoothingQuality = 'high';
      o.drawImage(src, cx - side / 2, cy - side / 2, side, side, 0, 0, out.width, out.height);
      url = out.toDataURL();
    } catch {
      url = this.scene.textures.getBase64(key);
    }
    this.icons.set(key, url);
    return url;
  }

  private build() {
    this.top = h('div', { class: 'topbar' });
    this.topLive = h('div', { class: 'top-live' });
    // Built once: the live part of the bar is re-rendered every snapshot, which would swallow clicks.
    this.top.append(this.topLive, h('div', { class: 'top-actions' },
      h('button', { class: 'btn small', onclick: () => this.toggleMenu() }, 'Menu (F10)'),
    ));
    this.msg = h('div', { class: 'hud-msg' });
    this.chatLog = h('div', { class: 'chat-log' });
    this.chatInput = h('input', { class: 'chat-input', maxLength: 300, placeholder: 'Say something… (Enter to send, Esc to cancel)' });
    this.chatInput.hidden = true;
    this.chatInput.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        const text = this.chatInput.value.trim();
        if (text) this.sendRaw({ type: 'chat', text });
        this.chatInput.value = '';
        this.chatInput.hidden = true;
        this.chatInput.blur();
      } else if (e.key === 'Escape') {
        this.chatInput.hidden = true;
        this.chatInput.blur();
      }
    });
    this.mini = h('canvas', { class: 'minimap', width: MINI_W * DPR, height: MINI_H * DPR });
    this.bakeMinimap();
    let dragging = false;
    const jump = (e: MouseEvent) => {
      const r = this.mini.getBoundingClientRect();
      const sx = ((e.clientX - r.left) / r.width) * (MV.maxX - MV.minX) + MV.minX;
      const sy = ((e.clientY - r.top) / r.height) * (MV.maxY - MV.minY) + MV.minY;
      const t = toTile(sx, sy);
      if (e.button === 2) { this.session.send({ c: 'move', x: t.x, y: t.y }); return; }
      this.scene.cameras.main.centerOn(sx, sy);
    };
    this.mini.addEventListener('mousedown', (e) => { dragging = e.button === 0; jump(e); });
    this.mini.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('mouseup', () => { dragging = false; });
    this.mini.addEventListener('mousemove', (e) => { if (dragging) jump(e); });

    this.info = h('div', { class: 'info' });
    this.card = h('div', { class: 'card' });
    this.bag = h('div', { class: 'bag' });
    this.overlay = h('div', { class: 'overlay' });
    this.overlay.hidden = true;
    this.banner = h('div', { class: 'banner' });
    this.banner.hidden = true;
    this.countdown = h('div', { class: 'countdown' });
    this.countdown.hidden = true;
    this.menu = h('div', { class: 'overlay menu' });
    this.menu.hidden = true;

    const consoleEl = h('div', { class: 'console' },
      h('div', { class: 'panel mini-wrap' }, this.mini),
      h('div', { class: 'panel info-wrap' }, this.info),
      h('div', { class: 'panel card-wrap' }, this.card),
    );
    this.board = h('div', { class: 'scoreboard' });
    this.board.hidden = true;
    this.root.append(this.top, this.msg, this.chatLog, this.chatInput, consoleEl, this.bag, this.banner, this.countdown, this.board, this.overlay, this.menu);
    this.refreshCard(true);
    this.refreshInfo(true);
  }

  // ---------------------------------------------------------------- top bar

  /** One sun per player of `team`: lit while that player's rescue strike is still available. */
  private strikePips(snap: Snapshot, team: 0 | 1) {
    const players = snap.players.filter((p) => p.team === team);
    const ready = players.filter((p) => !p.rescueUsed).length;
    const title = `${TEAM_NAMES[team]} rescue strikes: ${ready}/${players.length} ready\n`
      + players.map((p) => `${p.rescueUsed ? '✗' : '☀'} ${p.name}`).join('\n');
    return h('span', { class: 'cb-strikes', title },
      players.map((p) => h('i', { class: `sun${p.rescueUsed ? ' used' : ''}` })),
      h('b', { class: ready ? '' : 'none' }, `${ready}/${players.length}`),
    );
  }

  // ---------------------------------------------------------------- scoreboard (hold Tab)

  private renderBoard(snap: Snapshot) {
    const s = this.session;
    const myTeam = snap.players[s.you].team;
    const fogged = fogActive(snap.phase);
    type Row = { units: number; buildings: number; value: number; special: string };
    const per = new Map<number, Row>(snap.players.map((p) => [p.i, { units: 0, buildings: 0, value: 0, special: '—' }]));
    for (const e of snap.ents) {
      const r = per.get(e[3]);
      if (!r) continue;
      if (e[1] === 0) r.units++;
      else if (e[1] === 1) {
        const d = BUILDINGS[e[2]];
        r.buildings++;
        if (d.special) r.special = d.name + (e[9] !== 100 ? ' (building)' : '');
      }
    }
    for (const e of snap.ents) if (e[1] === 1 && per.has(e[3])) per.get(e[3])!.value += chainCost(e[2]);

    const num = (v: number) => v.toLocaleString();
    const head = h('tr', null, ...['Player', 'Army', 'Buildings', 'Special', 'Items', 'Kills', 'Lost', 'Castle dmg', 'Income', 'Gold earned', 'Gold', 'Strike']
      .map((t, i) => h('th', { class: i ? 'n' : '' }, t)));
    const teamBlock = (team: 0 | 1) => {
      const ps = snap.players.filter((p) => p.team === team);
      const sum = (f: (p: typeof ps[number]) => number) => ps.reduce((a, p) => a + f(p), 0);
      const castle = this.castleHp(snap, team);
      const rows = ps.map((p) => {
        const r = per.get(p.i)!;
        const ally = p.team === myTeam;
        // Under fog of war the enemy's army and base are unknown.
        const hidden = !ally && fogged;
        const q = () => h('span', { class: 'dim', title: 'Hidden by fog of war' }, '?');
        return h('tr', { class: p.i === s.you ? 'me' : '' },
          h('td', null, h('i', { class: 'fac-dot', style: `background:${css(FACTIONS[p.faction as keyof typeof FACTIONS].color)}` }),
            p.name, p.i === s.you ? h('span', { class: 'dim' }, ' (you)') : null, p.connected ? null : h('span', { class: 'dc' }, ' disconnected')),
          h('td', { class: 'n' }, hidden ? q() : r.units),
          h('td', { class: 'n' }, ...(hidden ? [q()] : [`${r.buildings}`, h('span', { class: 'dim' }, ` · ${num(r.value)}g`)])),
          h('td', { class: `n ${hidden || r.special === '—' ? 'dim' : 'special'}` }, hidden ? q() : r.special),
          h('td', { class: 'n sb-items' }, (p.items ?? []).length ? (p.items ?? []).map((id) => h('img', { src: itemIcon(id), alt: '', title: ITEM_BY_ID[id]?.name ?? id })) : h('span', { class: 'dim' }, '—')),
          h('td', { class: 'n' }, p.kills),
          h('td', { class: 'n' }, p.lost),
          h('td', { class: 'n' }, num(p.castleDmg)),
          h('td', { class: 'n' }, `+${p.income}`),
          h('td', { class: 'n' }, num(p.goldEarned)),
          h('td', { class: 'n' }, ally ? num(p.gold) : h('span', { class: 'dim', title: 'Hidden for enemies' }, '?')),
          h('td', { class: 'n' }, h('i', { class: `sun${p.rescueUsed ? ' used' : ''}`, title: p.rescueUsed ? 'Used this round' : 'Ready' })),
        );
      });
      const total = h('tr', { class: 'total' },
        h('td', null, `${TEAM_NAMES[team]} total`, h('span', { class: 'dim' }, ` · castle ${castle ? num(castle[7]) : 0}`)),
        h('td', { class: 'n' }, team !== myTeam && fogged ? '' : sum((p) => per.get(p.i)!.units)),
        h('td', { class: 'n' }, team !== myTeam && fogged ? '' : sum((p) => per.get(p.i)!.buildings)),
        h('td', { class: 'n' }, team !== myTeam && fogged ? '' : ps.filter((p) => per.get(p.i)!.special !== '—').length),
        h('td', { class: 'n' }, sum((p) => (p.items ?? []).length)),
        h('td', { class: 'n' }, sum((p) => p.kills)),
        h('td', { class: 'n' }, sum((p) => p.lost)),
        h('td', { class: 'n' }, num(sum((p) => p.castleDmg))),
        h('td', { class: 'n' }, `+${sum((p) => p.income)}`),
        h('td', { class: 'n' }, num(sum((p) => p.goldEarned))),
        h('td', { class: 'n' }, team === myTeam ? num(sum((p) => p.gold)) : ''),
        h('td', { class: 'n' }, `${ps.filter((p) => !p.rescueUsed).length}/${ps.length}`),
      );
      return [h('tr', { class: 'team-head' }, h('td', { colSpan: 12, style: `color:${TEAM_CSS[team]}` }, `${TEAM_NAMES[team]}${team === myTeam ? ' (your team)' : ''}`)), ...rows, total];
    };
    const mins = Math.floor(snap.tick / TICK_RATE / 60);
    clear(this.board);
    this.board.append(
      h('div', { class: 'sb-head' },
        h('b', null, 'Scoreboard'),
        h('span', { class: 'dim' }, `Round ${snap.round} · best of ${snap.bestOf} · score ${snap.score[0]} : ${snap.score[1]} · ${mins} min played`),
      ),
      h('div', { class: 'sb-scroll' }, h('table', null, h('thead', null, head), h('tbody', null, ...teamBlock(0), ...teamBlock(1)))),
      h('div', { class: 'sb-foot dim' }, 'Release Tab to close · Enemy gold, army and buildings are hidden by the fog of war'),
    );
  }

  private castleHp(snap: Snapshot, team: 0 | 1): EntRow | undefined {
    return snap.ents.find((e) => e[1] === 3 && e[4] === team);
  }

  private renderTop(snap: Snapshot) {
    const me = snap.players[this.session.you];
    const secs = Math.ceil(snap.incomeTicks / TICK_RATE);
    const pct = 100 * (1 - snap.incomeTicks / INCOME_INTERVAL_TICKS);
    const castle = (team: 0 | 1) => {
      const c = this.castleHp(snap, team);
      const r = c ? c[7] / c[8] : 0;
      return h('div', { class: 'castle-bar' },
        h('span', { class: 'cb-label', style: `color:${TEAM_CSS[team]}` }, `${TEAM_NAMES[team]} Castle`),
        h('div', { class: 'cb-track' }, h('div', { class: 'cb-fill', style: `width:${(r * 100).toFixed(1)}%;background:${TEAM_CSS[team]}` })),
        h('div', { class: 'cb-sub' },
          h('span', { class: 'cb-num' }, c ? `${c[7]}` : '—'),
          this.strikePips(snap, team),
        ),
      );
    };
    clear(this.topLive);
    this.topLive.append(
      h('div', { class: 'res' },
        h('span', { class: 'gold-ico' }),
        h('b', { class: 'gold' }, me.gold),
        h('span', { class: 'sapphires', title: 'Sapphires: special buildings and elite upgrades cost one. Buy more in the castle shop.' },
          h('i', { class: 'gem-ico' }), h('b', null, String(me.sapphires ?? START_SAPPHIRES))),
        h('span', { class: 'income', title: `Income every 10 s = ${BASE_INCOME} + ${INCOME_PCT * 100}% of your building value` },
          `+${me.income}`,
          h('span', { class: 'income-track' }, h('span', { class: 'income-fill', style: `width:${pct}%` })),
          `${secs}s`),
        h('span', { class: `rescue-pill ${me.rescueUsed ? 'used' : ''}`, title: 'Rescue strike (T): once per round, anywhere in your build zone' }, me.rescueUsed ? 'Strike used' : 'Strike ready'),
      ),
      h('div', { class: 'center' },
        castle(0),
        h('div', { class: 'score' },
          h('div', { class: 'round' }, `Round ${snap.round} · Best of ${snap.bestOf}${snap.mode === 'random' ? ' · Random' : ''}`),
          h('div', { class: 'tally' }, h('span', { style: `color:${TEAM_CSS[0]}` }, snap.score[0]), ' : ', h('span', { style: `color:${TEAM_CSS[1]}` }, snap.score[1])),
        ),
        castle(1),
      ),
    );
  }

  // ---------------------------------------------------------------- command card

  private builderCard(): CardButton[] {
    const s = this.session;
    const me = s.latest.players[s.you];
    const faction = FACTIONS[me.faction as keyof typeof FACTIONS];
    const out: CardButton[] = faction.build.map((id, slot) => {
      const def = BUILDINGS[id];
      const gemsOk = (me.sapphires ?? 1) >= (def.sapphires ?? 0);
      return {
        slot, icon: this.icon(`b_${id}`), name: def.name, cost: def.cost, afford: me.gold >= def.cost, gems: def.sapphires, gemsOk,
        tip: this.buildingTip(def.id),
        disabled: me.gold < def.cost || !gemsOk,
        active: s.mode.kind === 'place' && s.mode.building === id,
        run: () => {
          if (!gemsOk) return this.error('Needs a sapphire (buy one in the castle shop)');
          if (me.gold < def.cost) return this.error('Not enough gold');
          s.setMode({ kind: 'place', building: id });
        },
      };
    });
    out.push(this.rescueButton(), {
      slot: 11, icon: svgUrl(SVG.stop), name: 'Stop', tip: 'Cancel queued construction (refunds gold).',
      run: () => s.send({ c: 'stop' }),
    });
    return out;
  }

  private rescueButton(): CardButton {
    const s = this.session;
    const used = s.latest.players[s.you].rescueUsed;
    return {
      slot: 10, icon: svgUrl(SVG.rescue), name: 'Rescue Strike',
      tip: '<b>Rescue Strike</b> (T)<br>Calls down sunfire that slays <i>every</i> enemy unit in a large circle.<br>Must target near your own castle. Once per round.',
      disabled: used, active: s.mode.kind === 'rescue',
      run: () => used ? this.error('Rescue strike already used this round') : s.setMode({ kind: 'rescue' }),
    };
  }

  private buildingCard(row: EntRow): CardButton[] {
    const s = this.session;
    const me = s.latest.players[s.you];
    const def = BUILDINGS[row[2]];
    const busy = row[9] !== 100;
    const out: CardButton[] = (def.upgrades ?? []).map((id, slot) => {
      const up = BUILDINGS[id];
      const gemsOk = (me.sapphires ?? 1) >= (up.sapphires ?? 0);
      return {
        slot, icon: this.icon(`b_${id}`), name: `Upgrade: ${up.name}`, cost: up.cost, afford: me.gold >= up.cost, gems: up.sapphires, gemsOk,
        tip: `<b>Upgrade to ${up.name}</b><br>${this.buildingTip(id)}`,
        disabled: busy || me.gold < up.cost || !gemsOk,
        run: () => {
          if (busy) return this.error('Building is busy');
          if (!gemsOk) return this.error('Needs a sapphire (buy one in the castle shop)');
          if (me.gold < up.cost) return this.error('Not enough gold');
          s.send({ c: 'upgrade', id: row[0], to: id });
        },
      };
    });
    // Builder repair (one building at a time); the builder row carries its repair target.
    const builder = s.latestById.get(me.builderId);
    const repairing = builder?.[10] === row[0];
    const damaged = row[7] < row[8];
    out.push({
      slot: 3, icon: svgUrl(SVG.repair), name: repairing ? 'Repairing…' : 'Repair',
      tip: `<b>Repair</b> (R, or right-click the building)<br>Your builder walks over and repairs it: free, but slow (a full repair takes ${REPAIR_TIME_RATIO}× the build time).`
        + (damaged && !busy ? `<br>This one: about ${Math.ceil(((row[8] - row[7]) / row[8]) * REPAIR_TIME_RATIO * BUILDINGS[row[2]].buildTime)} s.` : '') + '<br>One building at a time; any other builder order stops it.',
      disabled: busy || !damaged, active: repairing,
      run: () => {
        if (busy) return this.error('Building is under construction');
        if (!damaged) return this.error('Building is undamaged');
        s.send({ c: 'repair', id: row[0] });
      },
    });
    out.push(this.rescueButton(), {
      slot: 11, icon: svgUrl(SVG.sell), name: this.sellArmed === row[0] ? 'Confirm sell' : 'Sell',
      tip: busy && row[9] >= 0 ? 'Cancel construction: full refund.' : 'Sell for 50% of the gold invested. Press twice to confirm.',
      active: this.sellArmed === row[0],
      run: () => {
        if (this.sellArmed === row[0]) { s.send({ c: 'sell', id: row[0] }); this.sellArmed = 0; s.select(null); return; }
        this.sellArmed = row[0];
        this.refreshCard(true);
      },
    });
    return out;
  }

  private currentCard(): CardButton[] {
    const s = this.session;
    if (s.mode.kind !== 'none') {
      return [{ slot: 11, icon: svgUrl(SVG.cancel), name: 'Cancel', tip: 'Cancel (Esc / right click)', run: () => s.setMode({ kind: 'none' }) }];
    }
    const row = s.selection !== null ? s.latestById.get(s.selection) : undefined;
    if (row && row[1] === 1 && row[3] === s.you) return this.buildingCard(row);
    if (row && row[1] === 3 && row[4] === s.team) return this.shopCard();
    return this.builderCard();
  }

  private refreshCard(force = false) {
    if (!this.session.latest) return;
    this.renderBag(force);
    const btns = this.currentCard();
    const key = JSON.stringify(btns.map((b) => [b.slot, b.name, b.disabled, b.active, b.afford, b.gemsOk]));
    if (!force && key === this.lastCardKey) return;
    this.lastCardKey = key;
    this.buttons = btns;
    clear(this.card);
    for (let slot = 0; slot < 12; slot++) {
      const b = btns.find((x) => x.slot === slot);
      if (!b) { this.card.append(h('div', { class: 'cbtn empty' })); continue; }
      const tip = h('div', { class: 'tip' });
      tip.innerHTML = `<div class="tip-title">${b.name}</div>`
        + (b.cost ? `<div class="tip-cost${b.afford === false ? ' short' : ''}"><i class="coin"></i>${b.cost} gold${b.afford === false ? ' <span>· not enough gold</span>' : ''}</div>` : '')
        + (b.gems ? `<div class="tip-cost gem${b.gemsOk === false ? ' short' : ''}"><i class="gem-ico"></i>${b.gems} sapphire${b.gems > 1 ? 's' : ''}${b.gemsOk === false ? ' <span>· buy one in the castle shop</span>' : ''}</div>` : '')
        + `<div>${b.tip}</div>`;
      this.card.append(h('button', {
        class: `cbtn${b.disabled ? ' disabled' : ''}${b.active ? ' active' : ''}${b.cost ? ' has-cost' : ''}`,
        onclick: (e: MouseEvent) => { e.preventDefault(); b.run(); },
      },
      h('img', { src: b.icon, alt: '' }),
      h('span', { class: 'hk' }, GRID_HOTKEYS[slot]),
      b.cost ? h('span', { class: `cost${b.afford === false ? ' short' : ''}` }, h('i', { class: 'coin' }), String(b.cost)) : null,
      b.gems ? h('span', { class: `gem-badge${b.gemsOk === false ? ' short' : ''}`, title: 'Costs a sapphire' }, h('i', { class: 'gem-ico' })) : null,
      tip));
    }
  }

  // ---------------------------------------------------------------- castle shop & item bag

  private ownCastleId(): number | null {
    const c = this.session.latest?.ents.find((e) => e[1] === 3 && e[4] === this.session.team);
    return c ? c[0] : null;
  }

  private shopOpen(): boolean {
    const s = this.session;
    return s.selection !== null && s.selection === this.ownCastleId();
  }

  private openShop() {
    const id = this.ownCastleId();
    if (id === null) return;
    const s = this.session;
    if (s.mode.kind !== 'none') s.setMode({ kind: 'none' });
    s.select(s.selection === id ? null : id);
  }

  private shopCard(): CardButton[] {
    const s = this.session;
    const me = s.latest.players[s.you];
    const bag = me.items ?? [];
    const out: CardButton[] = ITEMS.map((it, slot) => {
      const owned = bag.includes(it.id);
      const full = bag.length >= MAX_ITEMS;
      return {
        slot, icon: itemIcon(it.id), name: it.name, cost: it.cost, afford: me.gold >= it.cost,
        tip: `<span class="tip-desc">${it.desc}</span><br><span class="tip-meta">${owned ? '<b>Your builder carries this.</b>' : full ? `Bag full (${MAX_ITEMS} items).` : `Carried by your builder until the round ends · ${bag.length}/${MAX_ITEMS} slots used`}</span>`,
        disabled: owned || full || me.gold < it.cost,
        active: owned,
        run: () => {
          if (owned) return this.error(`You already carry ${it.name}`);
          if (full) return this.error(`Your builder can carry only ${MAX_ITEMS} items`);
          if (me.gold < it.cost) return this.error('Not enough gold');
          s.send({ c: 'buy', item: it.id });
        },
      };
    });
    out.push({
      slot: 8, icon: svgUrl(SVG.sapphire), name: 'Sapphire', cost: SAPPHIRE_GOLD, afford: me.gold >= SAPPHIRE_GOLD,
      tip: `<span class="tip-desc">A rare gem. Special buildings and elite upgrades cost a sapphire on top of their gold.</span><br><span class="tip-meta">You start every round with ${START_SAPPHIRES}. You have ${me.sapphires ?? START_SAPPHIRES}.</span>`,
      disabled: me.gold < SAPPHIRE_GOLD,
      run: () => me.gold < SAPPHIRE_GOLD ? this.error('Not enough gold') : s.send({ c: 'buySapphire' }),
    }, this.castleRepairButton(), this.rescueButton(), {
      slot: 11, icon: svgUrl(SVG.cancel), name: 'Close shop', tip: 'Back to your builder (B / Esc).',
      run: () => s.select(s.me.builderId),
    });
    return out;
  }

  private castleRepairButton(): CardButton {
    const s = this.session;
    const me = s.latest.players[s.you];
    const castle = s.latest.ents.find((e) => e[1] === 3 && e[4] === s.team);
    const repairing = !!castle && s.latestById.get(me.builderId)?.[10] === castle[0];
    const damaged = !!castle && castle[7] < castle[8];
    return {
      slot: 9, icon: svgUrl(SVG.repair), name: repairing ? 'Repairing castle…' : 'Repair castle',
      tip: `<b>Repair castle</b> (or right-click it)<br>Your builder repairs the castle for free, ${CASTLE_REPAIR_HPS} HP per second; every builder on it adds another ${CASTLE_REPAIR_HPS}.<br>Any other builder order stops it.`,
      disabled: !damaged, active: repairing,
      run: () => (!castle || !damaged ? this.error('Castle is undamaged') : s.send({ c: 'repair', id: castle[0] })),
    };
  }

  private renderBag(force = false) {
    const s = this.session;
    const me = s.latest?.players[s.you];
    if (!me) return;
    const bag = me.items ?? [];
    const open = this.shopOpen();
    const key = JSON.stringify([bag, open]);
    if (!force && key === this.lastBagKey) return;
    this.lastBagKey = key;
    clear(this.bag);
    const tip = (html: string) => { const t = h('div', { class: 'tip' }); t.innerHTML = html; return t; };
    this.bag.append(h('button', {
      class: `bag-shop${open ? ' active' : ''}`,
      onclick: (e: MouseEvent) => { e.preventDefault(); this.openShop(); },
    }, h('span', { class: 'bag-shop-ico' }), 'Castle shop', h('span', { class: 'hk' }, 'B'),
    tip('<div class="tip-title">Castle shop (B)</div>Expensive late-game items for your builder: team-wide auras, faster spawning, tougher buildings, a crossbow and a repair hammer. Opens your castle’s command card.')));
    for (let i = 0; i < MAX_ITEMS; i++) {
      const id = bag[i];
      if (!id) { this.bag.append(h('div', { class: 'bag-slot empty', title: 'Empty item slot' })); continue; }
      const it = ITEM_BY_ID[id];
      this.bag.append(h('div', { class: 'bag-slot' }, h('img', { src: itemIcon(id), alt: '' }),
        tip(`<div class="tip-title">${it.name}</div><span class="tip-desc">${it.desc}</span><br><span class="tip-meta">Works while your builder carries it, until the round ends.</span>`)));
    }
  }

  private buildingTip(id: string): string {
    const d = BUILDINGS[id];
    const lines = [`<span class="tip-desc">${d.desc}</span>`];
    if (d.spawn) {
      const u = UNITS[d.spawn.unit];
      lines.push(`Spawns <b>${d.spawn.count}× ${u.name}</b> every ${d.spawn.interval}s`);
      lines.push(`${Math.round(u.hp)} HP · ${+u.dmg.toFixed(1)} ${ATTACK_LABEL[u.attackType]} dmg (strong vs ${strongAgainst(u.attackType)}) · ${ARMOR_LABEL[u.armorType]} armor ${u.armor}${u.air ? ' · <i>flying</i>' : ''}${u.range > 1.5 ? ` · range ${u.range}` : ''}`);
      for (const a of unitAbilities(u, UNITS)) lines.push(`<span class="tip-ability">✦ ${a}</span>`);
    }
    if (d.aura) lines.push(`Aura radius ${d.aura.radius}`);
    if (d.attack) lines.push(`Attack ${d.attack.dmg} ${ATTACK_LABEL[d.attack.attackType]}, range ${d.attack.range}${d.attack.splash ? ', splash' : ''}`);
    const power = powerText(d);
    if (power) lines.push(`<span class="tip-ability">✦ ${power}</span>`);
    if (d.regen) lines.push(`Living wood: regrows ${d.regen} HP/s`);
    lines.push(`<span class="tip-meta">${d.hp} HP · build ${d.buildTime}s${d.special ? ' · <b>SPECIAL</b>' : ''}</span>`);
    return lines.join('<br>');
  }

  // ---------------------------------------------------------------- info panel

  private spawnBar: HTMLElement | null = null;

  /** Fill the "next unit" bar of the selected spawn building (runs on every snapshot). */
  private updateSpawnBar() {
    const s = this.session;
    const bar = this.spawnBar;
    if (!bar?.isConnected) { this.spawnBar = null; return; }
    const row = s.selection !== null ? s.latestById.get(s.selection) : undefined;
    const sp = row && BUILDINGS[row[2]]?.spawn;
    if (!row || !sp) return;
    const total = sp.interval * TICK_RATE;
    const left = Math.min(total, row[10]);
    (bar.firstChild as HTMLElement).style.width = `${(100 * (1 - left / total)).toFixed(1)}%`;
    (bar.lastChild as HTMLElement).textContent = `Next ${UNITS[sp.unit].name} in ${Math.ceil(left / TICK_RATE)}s`;
  }

  private itemLine(player: number) {
    const items = this.session.latest.players[player]?.items ?? [];
    if (!items.length) return h('div', { class: 'dim' }, 'No items · buy some at the castle (B)');
    return h('div', { class: 'item-line' }, 'Items: ', items.map((id) => h('img', { src: itemIcon(id), alt: ITEM_BY_ID[id].name, title: `${ITEM_BY_ID[id].name}: ${ITEM_BY_ID[id].desc}` })));
  }

  private refreshInfo(force = false) {
    const s = this.session;
    if (!s.latest) return;
    const row = s.selection !== null ? s.latestById.get(s.selection) : undefined;
    const key = row ? JSON.stringify([row[0], row[2], row[7], row[9], row[1] === 2 ? s.latest.players[row[3]]?.items : 0]) : `none:${s.latest.players.map((p) => `${p.kills}${p.connected}`).join()}`;
    if (!force && key === this.lastInfoKey) return;
    this.lastInfoKey = key;
    clear(this.info);
    if (!row) {
      this.info.append(h('div', { class: 'overview' }, h('div', { class: 'info-title' }, 'Battle overview ', h('span', { class: 'dim small' }, '· hold Tab for the full scoreboard')),
        h('table', { class: 'roster' }, s.latest.players.map((p) => h('tr', null,
          h('td', { style: `color:${TEAM_CSS[p.team]}` }, '●'),
          h('td', null, p.name, p.i === s.you ? ' (you)' : '', p.connected ? '' : h('span', { class: 'dc' }, ' disconnected')),
          h('td', { class: 'dim' }, FACTIONS[p.faction as keyof typeof FACTIONS].name),
          h('td', null, `${p.kills} kills`),
        )))));
      return;
    }
    const [, kind, type, owner, team, , , hp, maxHp, extra] = row;
    const ownerName = owner >= 0 ? s.playerName(owner) : `${TEAM_NAMES[team]} team`;
    const hpBar = h('div', { class: 'ihp' }, h('div', { style: `width:${(100 * hp) / maxHp}%` }), h('span', null, `${hp} / ${maxHp}`));
    const portrait = (key: string) => h('div', { class: 'portrait', style: `border-color:${css(TEAM_COLORS[team])}` }, h('img', { src: this.icon(key), alt: '' }));
    if (kind === 0) {
      const u = UNITS[type];
      this.info.append(portrait(`u_${type}`), h('div', { class: 'istats' },
        h('div', { class: 'info-title' }, u.name), h('div', { class: 'dim' }, ownerName), hpBar,
        h('div', null, `Attack: ${+u.dmg.toFixed(1)} ${ATTACK_LABEL[u.attackType]}${u.range > 1.5 ? ` · range ${u.range}` : ' · melee'}${u.splash ? ' · splash' : ''}${u.chain ? ` · chains ${u.chain}` : ''}`),
        h('div', null, `Armor: ${u.armor} ${ARMOR_LABEL[u.armorType]} · Speed ${u.speed}${u.air ? ' · flying' : ''}`),
        unitAbilities(u, UNITS).map((a) => h('div', { class: 'ability' }, `✦ ${a}`)),
        h('div', { class: 'dim' }, `Strong vs ${strongAgainst(u.attackType)} · Bounty ${u.bounty}g`),
      ));
    } else if (kind === 1) {
      const d = BUILDINGS[type];
      this.info.append(portrait(`b_${type}`), h('div', { class: 'istats' },
        h('div', { class: 'info-title' }, d.name), h('div', { class: 'dim' }, ownerName), hpBar,
        extra !== 100 ? h('div', { class: 'gold-text' }, `${extra < 0 ? 'Upgrading' : 'Constructing'}… ${Math.abs(extra)}%`) : null,
        h('div', { class: 'desc' }, d.desc),
        d.spawn ? h('div', null, `Spawns ${d.spawn.count}× ${UNITS[d.spawn.unit].name} every ${d.spawn.interval}s`) : null,
        powerText(d) ? h('div', { class: 'ability' }, `✦ ${powerText(d)}`) : null,
        d.spawn && extra === 100 ? (this.spawnBar = h('div', { class: 'ispawn', title: 'Time until the next unit' }, h('div'), h('span'))) : null,
      ));
      this.updateSpawnBar();
    } else if (kind === 2) {
      this.info.append(portrait('builder'), h('div', { class: 'istats' },
        h('div', { class: 'info-title' }, 'Builder'), h('div', { class: 'dim' }, ownerName),
        h('div', { class: 'desc' }, 'Invulnerable worker. Right-click to move, choose a building from the command card to construct it. Hold Shift to queue.'),
        this.itemLine(owner),
      ));
    } else {
      this.info.append(portrait(`castle${team}`), h('div', { class: 'istats' },
        h('div', { class: 'info-title' }, `${TEAM_NAMES[team]} Castle`), hpBar,
        h('div', { class: 'desc' }, 'Destroy the enemy castle to win the round. The castle has no attack of its own: defend it with units, towers and your rescue strike.'),
        team === s.team ? h('div', { class: 'gold-text' }, `Castle shop: buy items for your builder (up to ${MAX_ITEMS}). They last until the round ends.`) : null,
      ));
    }
  }

  // ---------------------------------------------------------------- minimap

  private bakeMinimap() {
    const c = document.createElement('canvas');
    c.width = this.mini.width; c.height = this.mini.height;
    const g = c.getContext('2d')!;
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    // Countryside around the map, matching the forest drawn on the battlefield.
    g.fillStyle = '#365a26';
    g.fillRect(0, 0, MINI_W, MINI_H);
    const sx = MINI_W / (MV.maxX - MV.minX), sy = MINI_H / (MV.maxY - MV.minY);
    const P = (x: number, y: number) => { const p = toScreen(x, y); return [(p.x - MV.minX) * sx, (p.y - MV.minY) * sy] as const; };
    for (const d of outerDecor()) {
      if (d.kind !== 'tree' && d.kind !== 'rock') continue;
      const [x, y] = P(d.x, d.y);
      if (x < -3 || y < -3 || x > MINI_W + 3 || y > MINI_H + 3) continue;
      g.fillStyle = d.kind === 'rock' ? '#7a766c' : d.key.startsWith('tree_p') ? '#1f4421' : '#2f6626';
      g.beginPath(); g.arc(x, y, d.kind === 'rock' ? 1 : 1.6, 0, Math.PI * 2); g.fill();
    }
    const quad = (x: number, y: number, w: number, hh: number, color: string) => {
      g.fillStyle = color;
      g.beginPath();
      g.moveTo(...P(x, y)); g.lineTo(...P(x + w, y)); g.lineTo(...P(x + w, y + hh)); g.lineTo(...P(x, y + hh));
      g.closePath(); g.fill();
    };
    if (this.scene.groundChunks.length) {
      // The minimap is a small copy of the painted battlefield.
      g.imageSmoothingQuality = 'high';
      for (const ch of this.scene.groundChunks) g.drawImage(ch.canvas, (ch.x - MV.minX) * sx, (ch.y - MV.minY) * sy, ch.w * sx, ch.h * sy);
      g.globalAlpha = 0.18;
      quad(MAP.zones[0].x, MAP.zones[0].y, MAP.zones[0].w, MAP.zones[0].h, '#4f9bff');
      quad(MAP.zones[1].x, MAP.zones[1].y, MAP.zones[1].w, MAP.zones[1].h, '#ff5a48');
      g.globalAlpha = 1;
    } else {
      quad(0, 0, MAP.width, MAP.height, '#3f6a2c');
      const c0 = MAP.castles[0], c1 = MAP.castles[1];
      quad(c0.x + c0.w, c0.y, c1.x - c0.x - c0.w, c0.h, '#7a6a48');
    }
    for (let y = 0; y < MAP.height; y++) for (let x = 0; x < MAP.width; x++) if (ROCK_GRID[y * MAP.width + x]) quad(x, y, 1, 1, '#8a8478');
    this.miniBase = c;
  }

  private drawMinimap() {
    const s = this.session;
    if (!s.latest) return;
    const g = this.mini.getContext('2d')!;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(this.miniBase, 0, 0);
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    const sx = MINI_W / (MV.maxX - MV.minX), sy = MINI_H / (MV.maxY - MV.minY);
    for (const [id, v] of this.scene.views) {
      const p = toScreen(v.x, v.y);
      const x = (p.x - MV.minX) * sx, y = (p.y - MV.minY) * sy;
      g.fillStyle = v.owner === s.you && v.kind !== 0 ? '#ffffff' : TEAM_CSS[v.team];
      const size = v.kind === 3 ? 9 : v.kind === 1 ? 5 : v.kind === 2 ? 4 : 2.5;
      if (v.kind === 2) { g.fillStyle = '#ffe060'; }
      g.fillRect(x - size / 2, y - size / 2, size, size);
      if (id === s.selection) { g.strokeStyle = '#40ff60'; g.strokeRect(x - size / 2 - 1, y - size / 2 - 1, size + 2, size + 2); }
    }
    for (const v of this.scene.ghosts.values()) {
      const p = toScreen(v.x, v.y);
      g.fillStyle = 'rgba(150,160,175,0.7)';
      g.fillRect((p.x - MV.minX) * sx - 2.5, (p.y - MV.minY) * sy - 2.5, 5, 5);
    }
    const fog = this.scene.vision;
    if (fog) {
      // Fog of war: darken every tile the team can't see (row runs → one quad each).
      g.fillStyle = 'rgba(4,6,10,0.55)';
      g.beginPath();
      const P = (x: number, y: number) => { const q = toScreen(x, y); return [(q.x - MV.minX) * sx, (q.y - MV.minY) * sy] as const; };
      // Outside the map a tile shares the visibility of the nearest map tile (same as the battlefield).
      const W = MAP.width, H = MAP.height, B = OUTER_TILES;
      const vis = (x: number, y: number) => fog[Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))];
      for (let y = -B; y < H + B; y++) {
        let x = -B;
        while (x < W + B) {
          if (vis(x, y)) { x++; continue; }
          let x1 = x + 1;
          while (x1 < W + B && !vis(x1, y)) x1++;
          g.moveTo(...P(x, y)); g.lineTo(...P(x1, y)); g.lineTo(...P(x1, y + 1)); g.lineTo(...P(x, y + 1)); g.closePath();
          x = x1;
        }
      }
      g.fill();
    }
    for (const [, x, y] of s.latest.strikes) {
      const p = toScreen(x, y);
      g.strokeStyle = '#ffe060'; g.beginPath(); g.arc((p.x - MV.minX) * sx, (p.y - MV.minY) * sy, 8, 0, Math.PI * 2); g.stroke();
    }
    const v = this.scene.viewRect();
    g.strokeStyle = 'rgba(255,255,255,0.9)';
    g.lineWidth = 1;
    g.strokeRect((v.x - MV.minX) * sx, (v.y - MV.minY) * sy, v.width * sx, v.height * sy);
  }

  // ---------------------------------------------------------------- messages & banners

  /** Random factions mode: which faction the player commands this round (with a trailing space). */
  private factionNote() {
    const snap = this.session.latest;
    if (snap?.mode !== 'random') return '';
    const f = FACTIONS[snap.players[this.session.you]?.faction as keyof typeof FACTIONS];
    return f ? `This round you command the ${f.name}. ` : '';
  }

  private msgTimer = 0;
  message(text: string, kind: 'error' | 'info' | 'gold' = 'info', ms = 2500) {
    this.msg.textContent = text;
    this.msg.className = `hud-msg ${kind}`;
    this.msg.hidden = false;
    clearTimeout(this.msgTimer);
    this.msgTimer = window.setTimeout(() => { this.msg.hidden = true; }, ms);
  }

  error(text: string) {
    this.message(text, 'error');
  }

  private addChat(from: string, text: string) {
    const line = h('div', { class: 'chat-line' }, h('b', null, `${from}: `), text);
    this.chatLog.append(line);
    while (this.chatLog.children.length > 8) this.chatLog.firstChild!.remove();
    setTimeout(() => line.classList.add('fade'), 12000);
  }

  private onSnapshot() {
    const snap = this.session.latest;
    this.renderTop(snap);
    if (!this.board.hidden) this.renderBoard(snap);
    this.refreshCard();
    this.refreshInfo();
    this.updateSpawnBar();
    this.renderCountdown(snap);
    // The banner waits until the castle-collapse cinematic has played.
    if (snap.phase === 'roundOver' && !this.scene.cinematic) this.renderRoundBanner(snap);
    else if (!this.banner.hidden && snap.phase === 'playing') {
      this.banner.hidden = true;
      this.message(`Round ${snap.round} begins! ${this.factionNote()}New builder, fresh gold — and your rescue strike is ready.`, 'info', 6000);
      this.scene.centerOnCastle();
    }
  }

  private onEvent(ev: SimEvent) {
    const s = this.session;
    switch (ev.t) {
      case 'err': if (ev.p === s.you) this.error(ev.msg); return;
      case 'income': {
        const amt = ev.amounts[s.you];
        if (amt) this.floatGold(`+${amt}`);
        return;
      }
      case 'strike':
        if (!ev.hit) {
          const team = s.latest.players[ev.p].team;
          this.message(`${s.playerName(ev.p)} calls a rescue strike!`, team === s.team ? 'gold' : 'error', 2500);
        }
        return;
      case 'sapphire': {
        if (ev.p === s.you) this.message('Sapphire bought.', 'gold', 2500);
        else if (s.latest.players[ev.p]?.team === s.team) this.message(`${s.playerName(ev.p)} bought a sapphire.`, 'info', 2500);
        return;
      }
      case 'first': {
        const nth = ['First', 'Second', 'Third'][ev.place] ?? 'Early';
        if (ev.p === s.you) this.message(`${nth} building of the round! +${ev.g} gold`, 'gold', 3000);
        else this.message(`${s.playerName(ev.p)} finished the ${nth.toLowerCase()} building (+${ev.g} gold).`, 'info', 2500);
        return;
      }
      case 'item': {
        const it = ITEM_BY_ID[ev.item];
        if (!it) return;
        const team = s.latest.players[ev.p]?.team;
        if (ev.p === s.you) this.message(`${it.name} bought.`, 'gold', 3000);
        else if (team === s.team) this.message(`${s.playerName(ev.p)} bought ${it.name}.`, 'info', 2500);
        return;
      }
      case 'built': {
        const row = s.latestById.get(ev.id);
        if (row && row[3] === s.you) this.message(`${BUILDINGS[row[2]].name} complete.`, 'info', 1800);
        return;
      }
    }
  }

  private floatGold(text: string) {
    const el = h('div', { class: 'float-gold' }, text);
    this.top.append(el);
    setTimeout(() => el.remove(), 1400);
  }

  private renderCountdown(snap: Snapshot) {
    const left = snap.phase === 'playing' ? Math.ceil(snap.phaseTicks / TICK_RATE) : 0;
    this.countdown.hidden = left <= 0;
    if (left <= 0 || this.countdown.dataset.left === String(left)) return;
    this.countdown.dataset.left = String(left);
    clear(this.countdown);
    this.countdown.append(h('div', { class: 'countdown-num' }, left), h('div', { class: 'countdown-text' }, 'Get ready: building starts in'));
    // Restart the pulse animation for each new number.
    this.countdown.classList.remove('tick'); void this.countdown.offsetWidth; this.countdown.classList.add('tick');
  }

  private renderRoundBanner(snap: Snapshot) {
    const winner = snap.lastWinner ?? 0;
    const won = winner === this.session.team;
    clear(this.banner);
    this.banner.append(
      h('div', { class: `banner-title ${won ? 'win' : 'lose'}` }, `${TEAM_NAMES[winner]} wins round ${snap.round}`),
      h('div', { class: 'banner-score' }, h('span', { style: `color:${TEAM_CSS[0]}` }, snap.score[0]), ' : ', h('span', { style: `color:${TEAM_CSS[1]}` }, snap.score[1])),
      h('table', { class: 'roster' }, snap.players.map((p) => h('tr', null,
        h('td', { style: `color:${TEAM_CSS[p.team]}` }, '●'), h('td', null, p.name), h('td', null, `${p.kills} kills`)))),
      h('div', { class: 'dim' }, `Next round in ${Math.ceil(snap.phaseTicks / TICK_RATE)}s`),
    );
    this.banner.hidden = false;
  }

  private renderPause() {
    const p = this.session.pause;
    if (this.session.ended) return;
    if (!p.paused) { this.overlay.hidden = true; return; }
    clear(this.overlay);
    // Waiting for slow loaders before the first start countdown: no pause controls needed.
    if (/load/.test(p.reason)) {
      this.overlay.append(h('div', { class: 'dialog' }, h('h2', null, 'Getting ready'), h('p', null, `Waiting for ${p.waitingFor.join(', ')} to load the battlefield`, p.resumeIn ? ` · starting in ${p.resumeIn}s at the latest` : '')));
      this.overlay.hidden = false;
      return;
    }
    this.overlay.append(h('div', { class: 'dialog' },
      h('h2', null, 'Paused'),
      h('p', null, p.reason),
      p.waitingFor.length ? h('p', null, `Waiting for: ${p.waitingFor.join(', ')}`, p.resumeIn ? ` · continuing in ${p.resumeIn}s` : '') : null,
      p.votes.length ? h('p', { class: 'dim' }, `Pause votes: ${p.votes.join(', ')}`) : null,
      this.pauseVote ? h('button', { class: 'btn', onclick: () => this.votePause(false) }, 'Vote to resume') : null,
      this.session.isHost ? h('button', { class: 'btn ghost', onclick: () => this.sendRaw({ type: 'game.saveAndExit' }) }, 'Save & exit') : null,
    ));
    this.overlay.hidden = false;
  }

  private renderEnd(m: Extract<ServerMessage, { type: 'match.end' }>) {
    if (this.scene.cinematic) { void this.scene.cinematicDone.then(() => this.renderEnd(m)); return; }
    this.menu.hidden = true;
    clear(this.overlay);
    let title = 'Game saved', cls = '';
    if (m.reason === 'finished') {
      const won = m.winner === this.session.team;
      title = won ? 'Victory!' : 'Defeat';
      cls = won ? 'win' : 'lose';
    }
    this.overlay.append(h('div', { class: 'dialog end' },
      h('h1', { class: cls }, title),
      m.score ? h('div', { class: 'banner-score' }, h('span', { style: `color:${TEAM_CSS[0]}` }, m.score[0]), ' : ', h('span', { style: `color:${TEAM_CSS[1]}` }, m.score[1])) : null,
      m.reason === 'saved' ? h('p', null, 'The match was saved. Any of its players can resume it from the lobby later — everyone must rejoin.') : null,
      h('table', { class: 'roster' }, this.session.latest.players.map((p) => h('tr', null,
        h('td', { style: `color:${TEAM_CSS[p.team]}` }, '●'), h('td', null, p.name), h('td', null, `${p.kills} kills`)))),
      h('button', { class: 'btn', onclick: () => this.onExit() }, 'Return to lobby'),
    ));
    this.overlay.hidden = false;
  }

  private votePause(v: boolean) {
    this.pauseVote = v;
    this.sendRaw({ type: 'game.pause', pause: v });
    this.renderMenu();
  }

  private toggleMenu(force?: boolean) {
    const show = force ?? this.menu.hidden;
    this.menu.hidden = !show;
    if (show) this.renderMenu();
  }

  private renderMenu() {
    clear(this.menu);
    this.menu.append(h('div', { class: 'dialog' },
      h('h2', null, 'Menu'),
      h('button', { class: 'btn', onclick: () => this.votePause(!this.pauseVote) }, this.pauseVote ? 'Withdraw pause vote' : 'Vote to pause'),
      this.session.isHost ? h('button', { class: 'btn', onclick: () => this.sendRaw({ type: 'game.saveAndExit' }) }, 'Save & exit (resume later)') : h('p', { class: 'dim' }, 'Only the host can save the game.'),
      h('button', { class: 'btn danger', onclick: (e: MouseEvent) => {
        const b = e.currentTarget as HTMLButtonElement;
        if (b.dataset.armed) { this.sendRaw({ type: 'game.leave' }); this.onExit(); return; }
        b.dataset.armed = '1'; b.textContent = 'Click again to leave the match';
      } }, 'Leave match'),
      h('button', { class: 'btn ghost', onclick: () => this.toggleMenu(false) }, 'Return to game'),
      h('div', { class: 'keys' },
        h('b', null, 'Controls'),
        h('div', null, 'Right-click: move builder · Left-click: select'),
        h('div', null, 'Q W E R / A S D F / Z X C V: command card'),
        h('div', null, 'Shift: queue buildings · Esc: cancel'),
        h('div', null, 'T: rescue strike · F1/Space: builder · Backspace: castle'),
        h('div', null, 'B: castle shop (builder items)'),
        h('div', null, 'Arrows / screen edge / middle-drag: camera · Wheel: zoom · Alt: show all building health bars · Hold Tab: scoreboard'),
        h('div', null, 'Enter: chat'),
        h('div', null, 'Fog of war: you see your own base, plus 12 tiles around each of your team\'s units'),
      ),
    ));
  }

  // ---------------------------------------------------------------- keyboard

  private onKey(e: KeyboardEvent) {
    if (document.activeElement === this.chatInput) return;
    const s = this.session;
    if (e.key === 'Shift') this.scene.shiftHeld = true;
    if (e.key === 'Alt') { this.scene.showAllBars = true; e.preventDefault(); }
    if (e.key === 'Tab') {
      // Hold Tab: scoreboard (and keep the browser from moving focus).
      e.preventDefault();
      if (this.board.hidden && this.session.latest) { this.board.hidden = false; this.renderBoard(this.session.latest); }
      return;
    }
    if (e.key === 'Enter') { this.chatInput.hidden = false; this.chatInput.focus(); e.preventDefault(); return; }
    if (e.key === 'F10') { this.toggleMenu(); e.preventDefault(); return; }
    if (e.key === 'Escape') {
      if (!this.menu.hidden) this.toggleMenu(false);
      else if (s.mode.kind !== 'none') s.setMode({ kind: 'none' });
      else if (s.selection !== null) s.select(null);
      else this.toggleMenu(true);
      return;
    }
    if (s.ended || !s.latest) return;
    if (e.key === 'F1') { s.select(s.me.builderId); this.scene.centerOnBuilder(); e.preventDefault(); return; }
    if (e.key === ' ') { this.scene.centerOnBuilder(); e.preventDefault(); return; }
    if (e.key === 'Backspace') { this.scene.centerOnCastle(); e.preventDefault(); return; }
    const k = e.key.toUpperCase();
    if (k === 'T') { this.rescueButton().run(); return; }
    if (k === 'B') { this.openShop(); e.preventDefault(); return; }
    const slot = GRID_HOTKEYS.indexOf(k);
    if (slot >= 0 && !e.ctrlKey && !e.metaKey) {
      const b = this.buttons.find((x) => x.slot === slot);
      if (b) { b.run(); e.preventDefault(); }
    }
  }
}

export type { Mode };
