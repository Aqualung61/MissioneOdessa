import { randomUUID } from 'node:crypto';
import { createEngine } from '../logic/engine.js';

const SESSION_ID_HEADER = 'X-Session-Id';
const GAME_ID_HEADER = 'X-Game-Id';

function parsePositiveInt(value) {
  const n = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

// Guardrails per evitare crescita illimitata in produzione.
// Ogni sessione ha un proprio motore (createEngine) che viene rilasciato con l'evizione.
// Questi limiti impediscono un numero illimitato di sessioni (e quindi di engine) nel tempo.
const MAX_SESSIONS = parsePositiveInt(process.env.SESSION_MAX_SESSIONS) ?? 200;
const SESSION_IDLE_TTL_MS = parsePositiveInt(process.env.SESSION_IDLE_TTL_MS) ?? 6 * 60 * 60 * 1000; // 6h
const SESSION_ABSOLUTE_TTL_MS =
  parsePositiveInt(process.env.SESSION_ABSOLUTE_TTL_MS) ?? 24 * 60 * 60 * 1000; // 24h

/**
 * In-memory session store.
 * Key: sessionId
 * Value: { gameId: string, engine: any, createdAt: number, lastAccessAt: number }
 */
const sessions = new Map();

function cleanupExpiredSessions(now = Date.now()) {
  for (const [sessionId, session] of sessions.entries()) {
    const idleAge = now - (session.lastAccessAt || session.createdAt || 0);
    const absoluteAge = now - (session.createdAt || 0);
    if (idleAge > SESSION_IDLE_TTL_MS || absoluteAge > SESSION_ABSOLUTE_TTL_MS) {
      sessions.delete(sessionId);
    }
  }
}

function evictLeastRecentlyUsedSession() {
  let oldestId = undefined;
  let oldestTs = Number.POSITIVE_INFINITY;

  for (const [sessionId, session] of sessions.entries()) {
    const ts = session.lastAccessAt || session.createdAt || 0;
    if (ts < oldestTs) {
      oldestTs = ts;
      oldestId = sessionId;
    }
  }

  if (oldestId) {
    sessions.delete(oldestId);
  }
}

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

function createEngineForSession() {
  const engine = createEngine();

  // Ensure shared immutable original data is initialized (idempotent).
  engine.initializeOriginalData();

  return engine;
}

async function getOrCreateSession(req) {
  cleanupExpiredSessions();

  const incomingSessionId = normalizeHeader(req.get(SESSION_ID_HEADER));
  const incomingGameId = normalizeHeader(req.get(GAME_ID_HEADER));

  const sessionId = isValidUuid(incomingSessionId) ? incomingSessionId : randomUUID();

  let session = sessions.get(sessionId);
  if (!session) {
    // Enforce an upper bound on sessions to avoid unbounded growth.
    if (sessions.size >= MAX_SESSIONS) {
      evictLeastRecentlyUsedSession();
    }

    const engine = createEngineForSession();
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

/**
 * Svuota le sessioni in memoria. Solo per i test.
 * @returns {void}
 */
export function _testOnly_clearSessions() {
  sessions.clear();
}
