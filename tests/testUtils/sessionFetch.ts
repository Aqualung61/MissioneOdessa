import { randomUUID } from 'node:crypto';

export type SessionState = {
  sessionId: string;
  gameId: string;
};

export function createSessionState(): SessionState {
  return {
    sessionId: randomUUID(),
    gameId: randomUUID(),
  };
}

export async function fetchWithSession(
  url: string,
  init: RequestInit | undefined,
  session: SessionState
): Promise<Response> {
  const headers = new Headers(init?.headers || {});
  headers.set('X-Session-Id', session.sessionId);
  headers.set('X-Game-Id', session.gameId);

  const res = await fetch(url, { ...(init || {}), headers });

  const nextSessionId = res.headers.get('X-Session-Id');
  const nextGameId = res.headers.get('X-Game-Id');
  if (nextSessionId) session.sessionId = nextSessionId;
  if (nextGameId) session.gameId = nextGameId;

  return res;
}
