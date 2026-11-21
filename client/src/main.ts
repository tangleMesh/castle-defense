import Phaser from 'phaser';
import type { PublicUser, ServerMessage } from '@bc/shared';
import { versionLabel } from '@bc/shared';
import './style.css';
import { api, getToken, setToken } from './net/api';
import { Socket } from './net/socket';
import { renderAuth } from './ui/auth';
import { LobbyView } from './ui/lobby';
import { Hud } from './ui/hud';
import { MatchSession } from './game/session';
import { GameScene } from './game/scene';
import { DPR } from './game/iso';
import { $ } from './ui/dom';
import { getGraphics, onGraphics } from './settings';
import { captureInvite } from './net/invite';

type Screen = 'auth' | 'lobby' | 'game';

/** Top-level state machine: auth → lobby ⇄ game. */
class App {
  socket: Socket | null = null;
  private user: PublicUser | null = null;
  private lobby: LobbyView | null = null;
  session: MatchSession | null = null;
  game: Phaser.Game | null = null;
  private hud: Hud | null = null;
  private status = $('#net-status');

  async boot() {
    const token = getToken();
    if (token) {
      try {
        const { user } = await api.me();
        return this.authed(token, user);
      } catch { setToken(null); }
    }
    this.show('auth');
    renderAuth((t, u) => this.authed(t, u));
  }

  private show(s: Screen) {
    for (const id of ['auth', 'lobby', 'game'] as Screen[]) $(`#screen-${id}`).hidden = id !== s;
  }

  private authed(token: string, user: PublicUser) {
    this.user = user;
    this.socket = new Socket(token);
    this.socket.onStatus((up) => { this.status.hidden = up; });
    this.socket.on((m) => this.route(m));
    this.socket.connect();
    this.toLobby();
  }

  private toLobby() {
    this.leaveGame();
    this.show('lobby');
    if (!this.lobby) this.lobby = new LobbyView(this.socket!, this.user!, () => this.logout());
    else void this.lobby.refreshData();
  }

  private route(m: ServerMessage) {
    if (m.type === 'error' && m.message === 'Session expired') { this.logout(); return; }
    if (m.type === 'auth.ok') { this.user = m.user; return; }
    if (m.type === 'match.init') { this.startGame(m); return; }
    this.session?.receive(m);
  }

  private startGame(init: Extract<ServerMessage, { type: 'match.init' }>) {
    // Reconnect to the same match: keep the running scene, just reset the snapshot buffer.
    if (this.session && this.session.matchId === init.matchId && this.game) {
      this.session.buffer = [];
      this.socket!.send({ type: 'match.loaded' });
      return;
    }
    this.leaveGame();
    this.show('game');
    const session = new MatchSession(init, this.socket!, this.user!.id);
    this.session = session;
    const scene = new GameScene();
    let ready = false;
    let pendingSnap = false;
    const tryHud = () => {
      if (!ready || !session.latest || this.hud) return;
      this.hud = new Hud(session, scene, () => this.toLobby(), (msg) => this.socket!.send(msg));
      // Battlefield on screen: the round's start countdown may begin.
      this.socket!.send({ type: 'match.loaded' });
    };
    scene.onReady = () => { ready = true; void scene.setGraphics(getGraphics()); tryHud(); };
    const offGraphics = onGraphics((m) => { if (this.session === session) void scene.setGraphics(m); else offGraphics(); });
    session.on('snapshot', () => { if (!pendingSnap) { pendingSnap = true; tryHud(); } });
    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'phaser',
      // Transparent: in 3D mode the three.js view shows through (the page background is the 2D ground colour).
      transparent: true,
      // Render at device pixel density (sharp on Retina) and shrink back to CSS size.
      scale: { mode: Phaser.Scale.NONE, width: window.innerWidth * DPR, height: window.innerHeight * DPR, zoom: 1 / DPR },
      render: { antialias: true, roundPixels: false },
      disableContextMenu: true,
      banner: false,
      scene: [],
    });
    this.game.scene.add('game', scene, true, { session });
    const game = this.game;
    const onResize = () => {
      if (this.game !== game) { window.removeEventListener('resize', onResize); return; }
      game.scale.resize(window.innerWidth * DPR, window.innerHeight * DPR);
      game.scale.setZoom(1 / DPR);
    };
    window.addEventListener('resize', onResize);
  }

  private leaveGame() {
    // Free the 3D renderer (WebGL context, textures) with the match.
    void (this.game?.scene.getScene('game') as GameScene | undefined)?.setGraphics('2d');
    this.hud?.destroy();
    this.hud = null;
    this.game?.destroy(true);
    this.game = null;
    this.session = null;
  }

  private async logout() {
    await api.logout().catch(() => {});
    setToken(null);
    this.socket?.close();
    this.socket = null;
    this.lobby?.destroy();
    this.lobby = null;
    this.leaveGame();
    this.show('auth');
    renderAuth((t, u) => this.authed(t, u));
  }
}

document.getElementById('app-version')!.textContent = `v${versionLabel(__APP_VERSION__)}`;

captureInvite();
const app = new App();
// `?debug` exposes the app on window for manual inspection and automated UI tests.
if (new URLSearchParams(location.search).has('debug')) (window as unknown as { bc: App }).bc = app;
void app.boot();
