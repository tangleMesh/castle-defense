import type { ClientMessage, ServerMessage } from '@bc/shared';

type Listener = (msg: ServerMessage) => void;

/** Websocket with automatic reconnect + re-auth. */
export class Socket {
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private statusListeners = new Set<(up: boolean) => void>();
  private retry = 0;
  private closedByUser = false;
  private outbox: ClientMessage[] = [];

  constructor(private token: string) {}

  connect() {
    this.closedByUser = false;
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${location.host}/ws`);
    this.ws = ws;
    ws.onopen = () => {
      this.retry = 0;
      ws.send(JSON.stringify({ type: 'auth', token: this.token }));
      for (const m of this.outbox.splice(0)) ws.send(JSON.stringify(m));
      this.statusListeners.forEach((l) => l(true));
    };
    ws.onmessage = (e) => {
      let msg: ServerMessage;
      try { msg = JSON.parse(e.data); } catch { return; }
      this.listeners.forEach((l) => l(msg));
    };
    ws.onclose = (e) => {
      this.statusListeners.forEach((l) => l(false));
      if (this.closedByUser || e.code === 4000 || e.code === 4001) return;
      const delay = Math.min(5000, 500 * 2 ** this.retry++);
      setTimeout(() => this.connect(), delay);
    };
  }

  send(msg: ClientMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
    else if (msg.type !== 'cmd') this.outbox.push(msg);
  }

  on(l: Listener) { this.listeners.add(l); return () => this.listeners.delete(l); }
  onStatus(l: (up: boolean) => void) { this.statusListeners.add(l); return () => this.statusListeners.delete(l); }

  close() {
    this.closedByUser = true;
    this.ws?.close();
  }
}
