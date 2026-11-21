import { parseInviteCode } from '@bc/shared';

const KEY = 'bc.join';

/**
 * Invite links (`…/?join=K7QX2M`): the code is taken from the address bar at start-up and kept
 * (also across sign-in or account creation) until the lobby uses it. The address bar is cleaned
 * so reloading the page doesn't try to join again.
 */
export function captureInvite() {
  const url = new URL(location.href);
  const code = parseInviteCode(url.searchParams.get('join') ?? '');
  if (!url.searchParams.has('join')) return;
  try { if (code) sessionStorage.setItem(KEY, code); } catch { /* private mode: join won't survive sign-in */ }
  pending = code ?? pending;
  url.searchParams.delete('join');
  history.replaceState(null, '', url.pathname + url.search + url.hash);
}

let pending: string | null = null;

/** The invite code waiting to be used, if any (without consuming it). */
export function pendingInvite(): string | null {
  try { return sessionStorage.getItem(KEY) ?? pending; } catch { return pending; }
}

/** Takes the waiting invite code (it is used once). */
export function takeInvite(): string | null {
  const code = pendingInvite();
  pending = null;
  try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
  return code;
}

/** The link to share for a room's code. */
export function inviteLink(code: string): string {
  return `${location.origin}/?join=${code}`;
}

/** Copies text; falls back to a hidden textarea where the clipboard API isn't available (plain http). */
export async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* fall back */ }
  const ta = document.createElement('textarea');
  ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.append(ta); ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { ok = false; }
  ta.remove();
  return ok;
}
