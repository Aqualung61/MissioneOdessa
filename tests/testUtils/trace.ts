/**
 * Generazione delle tracce di caratterizzazione (#63).
 * Specifica: `docs/20261019 - TD Lotto 0 Rete di caratterizzazione - v1.0.md`, §3.2.
 *
 * Porta in TypeScript, senza cambiarne il risultato, l'algoritmo dei generatori di
 * riferimento (`scripts/baselines/gen_trace.mjs` e `scripts/baselines/gen_http_trace.mjs`).
 * Usa solo API pubblica del motore, del parser e dei router di
 * produzione; un motore nuovo per scenario; stessa normalizzazione e stesso JSON canonico.
 *
 * La scrittura di `save_v141_full_it_step91.json` dal generatore HTTP non è portata qui:
 * il fixture è già fornito in `tests/fixtures/trace/`.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import express from 'express';
import type { Server } from 'node:http';

import { initOdessa } from '../../src/initOdessa.js';
import { loadMessaggiSistema } from '../../src/logic/systemMessages.js';
import { ensureVocabulary, parseCommand } from '../../src/logic/parser.js';
import { createEngine } from '../../src/logic/engine.js';
import engineRoutes from '../../src/api/engineRoutes.js';
import apiRoutes from '../../src/api/routes.js';
import { errorHandler } from '../../src/middleware/errorHandler.js';
import { ENGINE_SCENARIOS, RESUME_SCENARIOS } from './traceScenarios.mjs';

type Engine = ReturnType<typeof createEngine>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

const root = resolve(__dirname, '..', '..');
const fixture = (...parts: string[]): Json => JSON.parse(readFileSync(resolve(root, 'tests', 'fixtures', ...parts), 'utf8'));
const walk = (name: string): string[] => fixture('walkthrough', `${name}.json`).steps.map((s: { command: string }) => s.command);

// JSON canonico: chiavi ordinate, Set/Map come array, funzioni e undefined omessi.
function canon(v: Json): Json {
  if (v === null || typeof v !== 'object') return v;
  if (v instanceof Set) return [...v].map(canon);
  if (v instanceof Map) return canon(Object.fromEntries(v));
  if (Array.isArray(v)) return v.map((x) => (typeof x === 'function' || x === undefined ? null : canon(x)));
  const o: Record<string, Json> = {};
  for (const k of Object.keys(v).sort()) {
    if (typeof v[k] === 'function' || v[k] === undefined) continue;
    o[k] = canon(v[k]);
  }
  return o;
}
const sha = (v: Json): string => createHash('sha256').update(JSON.stringify(canon(v))).digest('hex');

async function ensureReady(): Promise<void> {
  const quiet = console.log;
  console.log = () => {};
  try {
    await initOdessa();
    loadMessaggiSistema();
    await ensureVocabulary();
  } finally {
    console.log = quiet;
  }
}

async function withEnv<T>(env: Record<string, string> | undefined, fn: () => Promise<T>): Promise<T> {
  const saved: Record<string, string | undefined> = {};
  for (const k of Object.keys(env || {})) {
    saved[k] = process.env[k];
    process.env[k] = (env as Record<string, string>)[k];
  }
  try {
    return await fn();
  } finally {
    for (const k of Object.keys(saved)) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
}

// ---------------------------------------------------------------------------
// Traccia del motore
// ---------------------------------------------------------------------------

function newEngine(lingua: number): Engine {
  const e = createEngine();
  e.initializeOriginalData();
  e.resetGameState(lingua);
  return e;
}

type InitialPositions = Record<string, [number, boolean]>;

function initialPositions(engine: Engine): InitialPositions {
  const m: InitialPositions = {};
  for (const o of engine.getGameStateSnapshot().Oggetti as Json[]) {
    m[`${o.IDLingua}:${o.ID}`] = [o.IDLuogo, o.Attivo];
  }
  return m;
}

function snap(engine: Engine): Json {
  const s = engine.getGameStateSnapshot();
  delete (s as Json).timestamp;
  delete (s as Json).version;
  return s;
}

function compact(s: Json, initialPos: InitialPositions): Json {
  const moved: Record<string, [number, boolean]> = {};
  const inv: number[] = [];
  for (const o of s.Oggetti as Json[]) {
    if (o.IDLingua !== s.currentLingua) continue;
    if (o.IDLuogo === 0) inv.push(o.ID);
    const k = `${o.ID}`;
    const cur: [number, boolean] = [o.IDLuogo, o.Attivo];
    const ini = initialPos[`${o.IDLingua}:${o.ID}`];
    if (!ini || ini[0] !== cur[0] || ini[1] !== cur[1]) moved[k] = cur;
  }
  return canon({
    loc: s.currentLocationId,
    turns: s.turn.totalTurnsConsumed,
    gturn: s.turn.globalTurnNumber,
    score: s.punteggio.totale,
    darkness: s.turn.darknessTimer,
    openArea: s.turn.openAreaTimer,
    guard: s.guardTimer,
    timers: s.timers,
    narrative: s.narrativeState,
    flags: s.flags,
    open: s.openStates,
    toggles: s.direzioniToggle,
    unlocked: s.direzioniSbloccate,
    seq: s.sequenze,
    inv: inv.sort((a, b) => a - b),
    moved,
    end: {
      victory: s.victory,
      ended: s.ended,
      awaitingRestart: s.awaitingRestart,
      awaitingEndConfirm: s.awaitingEndConfirm,
      awaitingContinue: s.awaitingContinue,
      movementBlocked: s.movementBlocked,
    },
  });
}

async function step(engine: Engine, input: string): Promise<{ parsed: Json; result: Json }> {
  const parsed = await parseCommand(null, input, engine.getGameState());
  const result = engine.executeCommand(parsed);
  return { parsed, result };
}

function record(i: number, input: string, parsed: Json, result: Json, s: Json, initialPos: InitialPositions): Json {
  return {
    i,
    input,
    parse: { valid: parsed.IsValid, type: parsed.CommandType, verb: parsed.VerbConcept, noun: parsed.NounConcept, error: parsed.Error },
    result: canon(result),
    state: compact(s, initialPos),
    sha: sha({ parsed, result, state: s }),
  };
}

export interface Trace {
  format: number;
  generator: string;
  normalization: string;
  scenarios: Json[];
}

export async function generateEngineTrace(): Promise<Trace> {
  await ensureReady();

  const out: Trace = {
    format: 1,
    generator: 'tests/testUtils/trace.ts',
    normalization: 'snapshot senza timestamp e version; JSON canonico a chiavi ordinate; sha = SHA-256 di {parsed, result, state}',
    scenarios: [],
  };

  for (const sc of ENGINE_SCENARIOS as Json[]) {
    const engine = newEngine(sc.lingua);
    const initialPos = initialPositions(engine);
    if (sc.prefix) {
      for (const c of walk(sc.prefix.walkthrough).slice(0, sc.prefix.upTo)) await step(engine, c);
    }
    const env: Record<string, string> = { ...(sc.env || {}) };
    if (sc.envFromTurns) env.GAME_MAX_TURNS_CONSUMED = String(engine.getGameState().turn.totalTurnsConsumed + sc.envFromTurns);
    const commands: string[] = sc.walkthrough ? walk(sc.walkthrough) : sc.commands;
    const steps: Json[] = [];
    const start = sc.prefix ? sc.prefix.upTo : 0;

    await withEnv(env, async () => {
      if (sc.prefix) steps.push({ i: start, input: null, state: compact(snap(engine), initialPos), sha: sha({ state: snap(engine) }) });
      let i = start;
      for (const c of commands) {
        const { parsed, result } = await step(engine, c);
        steps.push(record(++i, c, parsed, result, snap(engine), initialPos));
      }
    });

    out.scenarios.push({ id: sc.id, lingua: sc.lingua, prefix: sc.prefix || null, env, steps });
  }

  for (const sc of RESUME_SCENARIOS as Json[]) {
    const commands = walk(sc.walkthrough);
    let saved: Json;
    if (sc.saveFile) {
      saved = fixture(...sc.saveFile.split('/')).gameState;
    } else {
      const e = newEngine(sc.lingua);
      for (const c of commands.slice(0, sc.saveAt)) await step(e, c);
      saved = JSON.parse(JSON.stringify(e.getGameStateSnapshot()));
    }
    const engine = newEngine(sc.lingua);
    const initialPos = initialPositions(engine);
    engine.setGameState(JSON.parse(JSON.stringify(saved)));
    const steps: Json[] = [{ i: sc.saveAt, input: null, state: compact(snap(engine), initialPos), sha: sha({ state: snap(engine) }) }];
    let i = sc.saveAt;
    for (const c of commands.slice(sc.saveAt)) {
      const { parsed, result } = await step(engine, c);
      steps.push(record(++i, c, parsed, result, snap(engine), initialPos));
    }
    out.scenarios.push({ id: sc.id, lingua: sc.lingua, resume: { walkthrough: sc.walkthrough, saveAt: sc.saveAt, saveFile: sc.saveFile || null }, steps });
  }

  return out;
}

// ---------------------------------------------------------------------------
// Traccia HTTP
// ---------------------------------------------------------------------------

type HttpSession = { sessionId: string; gameId: string };

function newSession(): HttpSession {
  return { sessionId: randomUUID(), gameId: randomUUID() };
}

function normalizeHttpBody(body: Json): Json {
  const b = JSON.parse(JSON.stringify(body ?? null));
  const strip = (s: Json) => {
    if (s && typeof s === 'object') {
      delete s.timestamp;
      delete s.version;
    }
  };
  if (b && typeof b === 'object') {
    strip(b);
    strip(b.state);
    strip(b.gameState);
  }
  return b;
}

function summary(body: Json): Json {
  if (Array.isArray(body)) return { _array: body.length };
  if (!body || typeof body !== 'object') return body;
  const out: Record<string, Json> = {};
  for (const [k, v] of Object.entries(body)) {
    if (k === 'state' || k === 'gameState') {
      out[k] = v && {
        loc: (v as Json).currentLocationId,
        turns: (v as Json).turn?.totalTurnsConsumed,
        score: (v as Json).punteggio?.totale,
        lingua: (v as Json).currentLingua,
        awaitingRestart: (v as Json).awaitingRestart,
        awaitingEndConfirm: (v as Json).awaitingEndConfirm,
        ended: (v as Json).ended,
        victory: (v as Json).victory,
      };
    } else if (k === 'parseResult') {
      out[k] = v && { valid: (v as Json).IsValid, verb: (v as Json).VerbConcept, noun: (v as Json).NounConcept, error: (v as Json).Error };
    } else if (k === 'odessaData') {
      out[k] = '(omesso)';
    } else {
      out[k] = v;
    }
  }
  return canon(out);
}

export async function generateHttpTrace(): Promise<Trace> {
  await ensureReady();

  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use('/api/engine', engineRoutes);
  app.use('/api', apiRoutes);
  app.use(errorHandler);

  const server: Server = await new Promise((resolveServer) => {
    const s = app.listen(0, '127.0.0.1', () => resolveServer(s));
  });
  const address = server.address();
  const port = typeof address === 'string' ? 0 : address?.port ?? 0;
  const base = `http://127.0.0.1:${port}`;

  async function call(session: HttpSession, method: string, path: string, body?: Json, raw?: boolean): Promise<{ status: number; body: Json }> {
    const headers: Record<string, string> = { 'X-Session-Id': session.sessionId, 'X-Game-Id': session.gameId };
    const init: Json = { method, headers };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      init.body = raw ? body : JSON.stringify(body);
    }
    const res = await fetch(base + path, init);
    const g = res.headers.get('X-Game-Id');
    if (g) session.gameId = g;
    const s = res.headers.get('X-Session-Id');
    if (s) session.sessionId = s;
    const text = await res.text();
    let json: Json;
    try {
      json = JSON.parse(text);
    } catch {
      json = { _text: text };
    }
    return { status: res.status, body: json };
  }

  const scenarios: Json[] = [];

  type ReqOpts = { session?: HttpSession; raw?: boolean; label?: string };
  async function scenario(id: string, fn: (req: Json, session: HttpSession) => Promise<void>): Promise<void> {
    const steps: Json[] = [];
    const session = newSession();
    let i = 0;
    const req = async (method: string, path: string, body?: Json, opts: ReqOpts = {}) => {
      const r = await call(opts.session || session, method, path, body, opts.raw);
      const n = normalizeHttpBody(r.body);
      steps.push({
        i: ++i,
        req: `${method} ${path}`,
        input: opts.label ?? (body && typeof body === 'object' && 'input' in body ? body.input : undefined),
        status: r.status,
        body: summary(n),
        sha: sha({ status: r.status, body: n }),
      });
      return r;
    };
    await fn(req, session);
    scenarios.push({ id, steps });
  }
  const exec = (req: Json, input: string, opts?: ReqOpts) => req('POST', '/api/engine/execute', { input }, opts);

  try {
    await scenario('H-min-it', async (req) => {
      await req('POST', '/api/engine/reset', { idLingua: 1 });
      for (const c of walk('min_it')) await exec(req, c);
      await req('GET', '/api/engine/stats');
      await req('GET', '/api/engine/state');
    });

    await scenario('H-min-en', async (req) => {
      await req('POST', '/api/engine/reset', { idLingua: 2 });
      for (const c of walk('min_en')) await exec(req, c);
      await req('GET', '/api/engine/stats');
    });

    await scenario('H-fine-e-riavvio', async (req) => {
      await req('POST', '/api/engine/reset', { idLingua: 1 });
      for (const c of ['e', 'fine', 'forse', 'no', 'guarda', 'fine', 'si', 'guarda', 'si', 'e']) await exec(req, c);
    });

    await scenario('H-fine-e-termina', async (req) => {
      await req('POST', '/api/engine/reset', { idLingua: 2 });
      for (const c of ['end', 'yes', 'no', 'look']) await exec(req, c);
    });

    await scenario('H-morte-e-riavvio', async (req) => {
      await req('POST', '/api/engine/reset', { idLingua: 1 });
      for (const c of ['posa torcia', 'esamina documenti', 'posa fiammiferi', 'e', 'guarda', 'no', 'guarda']) await exec(req, c);
    });

    await scenario('H-input-non-valido', async (req) => {
      await req('POST', '/api/engine/reset', { idLingua: 1 });
      await req('POST', '/api/engine/execute', {}, { label: '(corpo vuoto)' });
      await req('POST', '/api/engine/execute', { input: 5 }, { label: '(numero)' });
      await req('POST', '/api/engine/execute', { input: '' }, { label: '(stringa vuota)' });
      await req('POST', '/api/engine/execute', { input: 'prendi\u0007' }, { label: '(carattere di controllo)' });
      await req('POST', '/api/engine/execute', { input: 'a'.repeat(600) }, { label: '(600 caratteri)' });
      await req('POST', '/api/engine/execute', '{"input":', { raw: true, label: '(JSON malformato)' });
      for (const c of ['xyzzy', 'prendi xyzzy', 'prendi', 'nord sud']) await exec(req, c);
    });

    await scenario('H-salva-carica', async (req, session) => {
      await req('POST', '/api/engine/reset', { idLingua: 1 });
      const cmds = walk('full_it');
      for (const c of cmds.slice(0, 50)) await exec(req, c);
      const saved = await req('POST', '/api/engine/save-client-state', { luoghi: [] });
      await req('POST', '/api/engine/save-client-state', { luoghi: 'x' }, { label: '(luoghi non valido)' });
      const other = newSession();
      await req('POST', '/api/engine/reset', { idLingua: 2 }, { session: other, label: '(sessione EN)' });
      await req('POST', '/api/engine/load-client-state', saved.body, { session: other, label: '(salvataggio IT in sessione EN)' });
      const third = newSession();
      await req('POST', '/api/engine/reset', { idLingua: 1 }, { session: third, label: '(sessione IT)' });
      await req('POST', '/api/engine/load-client-state', saved.body, { session: third, label: '(salvataggio IT)' });
      for (const c of cmds.slice(50, 60)) await exec(req, c, { session: third });
      await req('GET', '/api/engine/stats', undefined, { session: third });
      await req('POST', '/api/engine/load-client-state', { gameState: null }, { session: third, label: '(salvataggio non valido)' });
      await exec(req, 'guarda', { session });
    });

    await scenario('H-servizio', async (req) => {
      await req('POST', '/api/engine/reset', { idLingua: 1 });
      await req('GET', '/api/engine/direzioni/1');
      await req('GET', '/api/engine/direzioni/44');
      await req('GET', '/api/engine/direzioni/abc');
      await req('GET', '/api/luogo-oggetti?idLuogo=6&idLingua=1');
      await req('GET', '/api/luogo-oggetti?idLuogo=6');
      await req('GET', '/api/luoghi');
      await req('GET', '/api/frontend-messages/1');
      await req('GET', '/api/frontend-messages/9');
      await req('GET', '/api/introduzione');
      await req('GET', '/api/storia');
      await req('GET', '/api/ping');
    });
  } finally {
    await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
  }

  return {
    format: 1,
    generator: 'tests/testUtils/trace.ts',
    normalization: 'timestamp e version rimossi da corpo, state e gameState; sha = SHA-256 di {status, body} canonico',
    scenarios,
  };
}
