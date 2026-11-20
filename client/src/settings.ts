/** Per-player display settings, kept in this browser (never sent to the server). */
export type GraphicsMode = '2d' | '3d';

const KEY = 'bc.graphics';
const listeners = new Set<(m: GraphicsMode) => void>();

export function getGraphics(): GraphicsMode {
  try { return localStorage.getItem(KEY) === '3d' ? '3d' : '2d'; } catch { return '2d'; }
}

export function setGraphicsMode(m: GraphicsMode) {
  try { localStorage.setItem(KEY, m); } catch { /* private mode: setting lasts this page only */ }
  for (const f of listeners) f(m);
}

export function onGraphics(f: (m: GraphicsMode) => void): () => void {
  listeners.add(f);
  return () => listeners.delete(f);
}
