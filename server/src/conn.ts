import type { WebSocket } from 'ws';
import type { ServerMessage } from '@bc/shared';

/** One authenticated websocket connection. */
export class Conn {
  userId = '';
  username = '';
  constructor(public ws: WebSocket) {}

  get authed() {
    return !!this.userId;
  }

  send(msg: ServerMessage) {
    if (this.ws.readyState === this.ws.OPEN) this.ws.send(JSON.stringify(msg));
  }

  /** Send an already-serialised message (shared snapshot payloads). */
  sendRaw(json: string) {
    if (this.ws.readyState === this.ws.OPEN) this.ws.send(json);
  }
}
