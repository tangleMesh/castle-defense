import type { LeaderboardEntry, PublicUser } from '@bc/shared';

const TOKEN_KEY = 'bc.token';

export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* storage unavailable: session-only login */ }
}

async function call<T>(method: string, url: string, body?: unknown): Promise<T> {
  const token = getToken();
  const res = await fetch(url, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as T;
}

export interface SavedGameSummary {
  _id: string;
  name: string;
  bestOf: number;
  players: Array<{ userId: string; name: string; team: 0 | 1; faction: string }>;
  score: [number, number];
  round: number;
  updatedAt: string;
}

export interface MatchSummary {
  _id: string;
  players: Array<{ userId: string; name: string; team: 0 | 1; faction: string; kills: number; ratingBefore?: number; ratingAfter?: number }>;
  mode?: string;
  score: [number, number];
  winnerTeam: 0 | 1;
  bestOf: number;
  endedAt: string;
}

export const api = {
  register: (username: string, password: string) => call<{ token: string; user: PublicUser }>('POST', '/api/register', { username, password }),
  login: (username: string, password: string) => call<{ token: string; user: PublicUser }>('POST', '/api/login', { username, password }),
  logout: () => call('POST', '/api/logout', {}),
  me: () => call<{ user: PublicUser }>('GET', '/api/me'),
  history: () => call<{ matches: MatchSummary[] }>('GET', '/api/history'),
  leaderboard: () => call<{ top: LeaderboardEntry[]; you: LeaderboardEntry | null }>('GET', '/api/leaderboard'),
  saved: () => call<{ saved: SavedGameSummary[] }>('GET', '/api/saved'),
  discardSaved: (id: string) => call('DELETE', `/api/saved/${encodeURIComponent(id)}`),
};
