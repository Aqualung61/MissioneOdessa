import { randomUUID } from 'node:crypto';

const SESSION_ID_HEADER = 'X-Session-Id';
const GAME_ID_HEADER = 'X-Game-Id';

/**
 * In-memory session store.
 * Key: sessionId
 * Value: { gameId: string, engine: any, createdAt: number, lastAccessAt: number }
 */
const sessions = new Map();

function isValidUuid(value) {
  if (typeof value !== 'string') return false;
  const v = value.trim();
  // Strict UUID v4/v1/etc format: 8-4-4-4-12 hex
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

function normalizeHeader(value) {
  if (typeof value !== 'string') return undefined;
  const v = value.trim();
  if (!v) return undefined;
  return v;
}

async function importEngineModuleForSession(sessionId) {
  // IMPORTANT: adding a query parameter forces a distinct module instance per session.
  const engineUrl = new URL('../logic/engine.js', import.meta.url);
  engineUrl.searchParams.set('session', sessionId);
  const engine = await import(engineUrl.href);

  // Ensure shared immutable original data is initialized (idempotent).
  if (typeof engine.initializeOriginalData === 'function') {
    engine.initializeOriginalData();
  }

  return engine;
}

async function getOrCreateSession(req) {
  const incomingSessionId = normalizeHeader(req.get(SESSION_ID_HEADER));
  const incomingGameId = normalizeHeader(req.get(GAME_ID_HEADER));

  const sessionId = isValidUuid(incomingSessionId) ? incomingSessionId : randomUUID();

  let session = sessions.get(sessionId);
  if (!session) {
    const engine = await importEngineModuleForSession(sessionId);
    const gameId = isValidUuid(incomingGameId) ? incomingGameId : randomUUID();

    // New session => start a fresh game state (default lingua=1).
    if (typeof engine.resetGameState === 'function') {
      engine.resetGameState(1);
    }

    const now = Date.now();
    session = { sessionId, gameId, engine, createdAt: now, lastAccessAt: now };
    sessions.set(sessionId, session);
  } else {
    session.lastAccessAt = Date.now();
  }

  return session;
}

/**
 * Express middleware: attaches per-session engine instance to the request.
 * - No cookies
 * - Self-healing: generates ids when missing/invalid
 * - Always returns headers in response
 */
export function attachEngineSession(req, res, next) {
  (async () => {
    const session = await getOrCreateSession(req);

    // Always expose ids to the client.
    res.set(SESSION_ID_HEADER, session.sessionId);
    res.set(GAME_ID_HEADER, session.gameId);

    req.odessaSession = {
      sessionId: session.sessionId,
      gameId: session.gameId,
      engine: session.engine,
      setGameId: (newGameId) => {
        if (!isValidUuid(newGameId)) return;
        session.gameId = newGameId;
        req.odessaSession.gameId = newGameId;
        res.set(GAME_ID_HEADER, newGameId);
      },
    };

    return next();
  })().catch(next);
}

export function _testOnly_clearSessions() {
  sessions.clear();
}
