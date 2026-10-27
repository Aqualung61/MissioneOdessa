/**
 * Caratterizzazione di `errorHandler` (#63).
 * Specifica: `docs/20261021 - TD Lotto 5 Effetti di turno, route e ESLint - v1.2.md`, §5.1 test 1.
 *
 * Tabella di 31 casi, ciascuno in sviluppo e in produzione, con `req`/`res`/`next` finti.
 * Per ogni caso si verificano: stato HTTP, corpo JSON o testo, intestazioni impostate,
 * chiamate a `next` (con l'errore stesso, indicato come '<err>'), argomenti di
 * `console.warn` e `console.error` (uguaglianza stretta: anche `message: undefined`).
 * Gli attesi sono stati ricavati eseguendo il codice di riferimento e controllati
 * a mano rispetto a `src/middleware/errorHandler.js`; non si aggiornano.
 *
 * Sono caratterizzati anche comportamenti che sembrano difetti (casi 10, 24, 31): non si correggono.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { errorHandler } from '../src/middleware/errorHandler.js';

type ErrSpec = {
  kind: 'error' | 'syntax' | 'syntaxNoText' | 'plain' | 'undef' | 'null';
  message?: string;
  type?: string;
  status?: number | string;
  body?: string;
};
type ReqSpec = { method?: string; originalUrl?: string; url?: string } | undefined;
type Observed = {
  status?: number;
  json?: unknown;
  send?: unknown;
  set?: unknown[][];
  next?: unknown[][];
  warn?: unknown[][];
  error?: unknown[][];
};
type Case = {
  id: number;
  desc: string;
  spec: { req: ReqSpec; err: ErrSpec; headersSent?: boolean };
  dev: Observed;
  prod: Observed;
};

function makeErr(spec: ErrSpec, id: number): unknown {
  if (spec.kind === 'undef') return undefined;
  if (spec.kind === 'null') return null;
  let e: Record<string, unknown>;
  if (spec.kind === 'plain') e = {};
  else if (spec.kind === 'syntax')
    e = new SyntaxError(spec.message ?? `bad json ${id}`) as unknown as Record<string, unknown>;
  else if (spec.kind === 'syntaxNoText') {
    e = new SyntaxError('x') as unknown as Record<string, unknown>;
    e.message = 123;
  } else e = new Error(spec.message ?? `boom ${id}`) as unknown as Record<string, unknown>;
  if (spec.type !== undefined) e.type = spec.type;
  if (spec.status !== undefined) e.status = spec.status;
  if (spec.body !== undefined) e.body = spec.body;
  e.stack = `STACK ${id}`;
  return e;
}

function run(c: Case, prod: boolean): Observed {
  const savedEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = prod ? 'production' : 'development';
  const obs: Required<Pick<Observed, 'set' | 'next' | 'warn' | 'error'>> & Observed = {
    set: [],
    next: [],
    warn: [],
    error: [],
  };
  const warn = vi
    .spyOn(console, 'warn')
    .mockImplementation((...a: unknown[]) => void obs.warn.push(a));
  const error = vi
    .spyOn(console, 'error')
    .mockImplementation((...a: unknown[]) => void obs.error.push(a));
  const err = makeErr(c.spec.err, c.id);
  const res = {
    headersSent: c.spec.headersSent === true,
    status(code: number) {
      obs.status = code;
      return this;
    },
    json(p: unknown) {
      obs.json = p;
      return this;
    },
    send(p: unknown) {
      obs.send = p;
      return this;
    },
    set(k: string, v: string) {
      obs.set.push([k, v]);
      return this;
    },
  };
  const next = (...a: unknown[]) =>
    void obs.next.push(a.map((x) => (err !== undefined && x === err ? '<err>' : x)));
  try {
    errorHandler(err, c.spec.req, res, next);
  } finally {
    warn.mockRestore();
    error.mockRestore();
    if (savedEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = savedEnv;
  }
  const out: Observed = {};
  if (obs.status !== undefined) out.status = obs.status;
  if ('json' in obs) out.json = obs.json;
  if ('send' in obs) out.send = obs.send;
  for (const k of ['set', 'next', 'warn', 'error'] as const) if (obs[k].length > 0) out[k] = obs[k];
  return out;
}

// Atteso = comportamento osservato sul baseline.
const CASES: Case[] = [
  // 1 — JSON malformato, API: 400 + no-store (righe 20-36)
  {
    id: 1,
    desc: 'JSON malformato su /api (type entity.parse.failed, body stringa)',
    spec: {
      req: { method: 'POST', originalUrl: '/api/engine/execute' },
      err: { kind: 'syntax', type: 'entity.parse.failed', body: '{bad' },
    },
    dev: {
      status: 400,
      json: { ok: false, error: 'INVALID_JSON' },
      set: [['Cache-Control', 'no-store']],
      warn: [
        [
          '[warn]',
          {
            method: 'POST',
            url: '/api/engine/execute',
            error: 'INVALID_JSON',
            message: 'bad json 1',
          },
        ],
      ],
    },
    prod: {
      status: 400,
      json: { ok: false, error: 'INVALID_JSON' },
      set: [['Cache-Control', 'no-store']],
      warn: [
        [
          '[warn]',
          { method: 'POST', url: '/api/engine/execute', error: 'INVALID_JSON', message: undefined },
        ],
      ],
    },
  },
  // 2 — JSON malformato, non-API: testo 400 (righe 31-33)
  {
    id: 2,
    desc: 'JSON malformato fuori da /api',
    spec: {
      req: { method: 'POST', originalUrl: '/altro' },
      err: { kind: 'syntax', type: 'entity.parse.failed', body: '{bad' },
    },
    dev: {
      status: 400,
      send: 'Bad Request',
      warn: [
        ['[warn]', { method: 'POST', url: '/altro', error: 'INVALID_JSON', message: 'bad json 2' }],
      ],
    },
    prod: {
      status: 400,
      send: 'Bad Request',
      warn: [
        ['[warn]', { method: 'POST', url: '/altro', error: 'INVALID_JSON', message: undefined }],
      ],
    },
  },
  // 3 — JSON malformato, headersSent → next (riga 28)
  {
    id: 3,
    desc: 'JSON malformato su /api con headersSent',
    spec: {
      req: { method: 'POST', originalUrl: '/api/engine/execute' },
      err: { kind: 'syntax', type: 'entity.parse.failed', body: '{bad' },
      headersSent: true,
    },
    dev: {
      next: [['<err>']],
      warn: [
        [
          '[warn]',
          {
            method: 'POST',
            url: '/api/engine/execute',
            error: 'INVALID_JSON',
            message: 'bad json 3',
          },
        ],
      ],
    },
    prod: {
      next: [['<err>']],
      warn: [
        [
          '[warn]',
          { method: 'POST', url: '/api/engine/execute', error: 'INVALID_JSON', message: undefined },
        ],
      ],
    },
  },
  // 4 — JSON malformato, headersSent → next (riga 28)
  {
    id: 4,
    desc: 'JSON malformato fuori da /api con headersSent',
    spec: {
      req: { method: 'POST', originalUrl: '/altro' },
      err: { kind: 'syntax', type: 'entity.parse.failed', body: '{bad' },
      headersSent: true,
    },
    dev: {
      next: [['<err>']],
      warn: [
        ['[warn]', { method: 'POST', url: '/altro', error: 'INVALID_JSON', message: 'bad json 4' }],
      ],
    },
    prod: {
      next: [['<err>']],
      warn: [
        ['[warn]', { method: 'POST', url: '/altro', error: 'INVALID_JSON', message: undefined }],
      ],
    },
  },
  // 5 — JSON malformato per status 400 + message (riga 14-18), API
  {
    id: 5,
    desc: 'SyntaxError con status 400 e solo message (senza type né body)',
    spec: {
      req: { method: 'POST', originalUrl: '/api/parser/parse' },
      err: { kind: 'syntax', status: 400 },
    },
    dev: {
      status: 400,
      json: { ok: false, error: 'INVALID_JSON' },
      set: [['Cache-Control', 'no-store']],
      warn: [
        [
          '[warn]',
          {
            method: 'POST',
            url: '/api/parser/parse',
            error: 'INVALID_JSON',
            message: 'bad json 5',
          },
        ],
      ],
    },
    prod: {
      status: 400,
      json: { ok: false, error: 'INVALID_JSON' },
      set: [['Cache-Control', 'no-store']],
      warn: [
        [
          '[warn]',
          { method: 'POST', url: '/api/parser/parse', error: 'INVALID_JSON', message: undefined },
        ],
      ],
    },
  },
  // 6 — non JSON malformato (manca type e status≠400) → busta standard (righe 72-73)
  {
    id: 6,
    desc: 'SyntaxError con status 500 e senza type: non è JSON malformato',
    spec: {
      req: { method: 'GET', originalUrl: '/api/engine/state' },
      err: { kind: 'syntax', status: 500 },
    },
    dev: {
      status: 500,
      json: { ok: false, error: 'bad json 6' },
      error: [
        [
          '[error]',
          { method: 'GET', url: '/api/engine/state', message: 'bad json 6', stack: 'STACK 6' },
        ],
      ],
    },
    prod: {
      status: 500,
      json: { ok: false, error: 'INTERNAL_ERROR' },
      error: [
        [
          '[error]',
          { method: 'GET', url: '/api/engine/state', message: 'bad json 6', stack: 'STACK 6' },
        ],
      ],
    },
  },
  // 7 — non JSON malformato (non SyntaxError) → busta standard (righe 72-73)
  {
    id: 7,
    desc: 'Error generico con type entity.parse.failed: non è JSON malformato',
    spec: {
      req: { method: 'POST', originalUrl: '/api/engine/execute' },
      err: { kind: 'error', type: 'entity.parse.failed', body: '{bad' },
    },
    dev: {
      status: 500,
      json: { ok: false, error: 'boom 7' },
      error: [
        [
          '[error]',
          { method: 'POST', url: '/api/engine/execute', message: 'boom 7', stack: 'STACK 7' },
        ],
      ],
    },
    prod: {
      status: 500,
      json: { ok: false, error: 'INTERNAL_ERROR' },
      error: [
        [
          '[error]',
          { method: 'POST', url: '/api/engine/execute', message: 'boom 7', stack: 'STACK 7' },
        ],
      ],
    },
  },
  // 8 — busta standard (righe 72-73)
  {
    id: 8,
    desc: 'errore generico su /api',
    spec: { req: { method: 'GET', originalUrl: '/api/engine/state' }, err: { kind: 'error' } },
    dev: {
      status: 500,
      json: { ok: false, error: 'boom 8' },
      error: [
        [
          '[error]',
          { method: 'GET', url: '/api/engine/state', message: 'boom 8', stack: 'STACK 8' },
        ],
      ],
    },
    prod: {
      status: 500,
      json: { ok: false, error: 'INTERNAL_ERROR' },
      error: [
        [
          '[error]',
          { method: 'GET', url: '/api/engine/state', message: 'boom 8', stack: 'STACK 8' },
        ],
      ],
    },
  },
  // 9 — headersSent dopo il log → next (riga 46)
  {
    id: 9,
    desc: 'errore generico con headersSent',
    spec: {
      req: { method: 'GET', originalUrl: '/api/engine/state' },
      err: { kind: 'error' },
      headersSent: true,
    },
    dev: {
      next: [['<err>']],
      error: [
        [
          '[error]',
          { method: 'GET', url: '/api/engine/state', message: 'boom 9', stack: 'STACK 9' },
        ],
      ],
    },
    prod: {
      next: [['<err>']],
      error: [
        [
          '[error]',
          { method: 'GET', url: '/api/engine/state', message: 'boom 9', stack: 'STACK 9' },
        ],
      ],
    },
  },
  // 10 — stato valido 404, busta standard (righe 54-55, 72-73)
  {
    id: 10,
    desc: 'status 404 su /api',
    spec: {
      req: { method: 'GET', originalUrl: '/api/inesistente' },
      err: { kind: 'error', status: 404 },
    },
    dev: {
      status: 404,
      json: { ok: false, error: 'boom 10' },
      error: [
        [
          '[error]',
          { method: 'GET', url: '/api/inesistente', message: 'boom 10', stack: 'STACK 10' },
        ],
      ],
    },
    prod: {
      status: 404,
      json: { ok: false, error: 'INTERNAL_ERROR' },
      error: [
        [
          '[error]',
          { method: 'GET', url: '/api/inesistente', message: 'boom 10', stack: 'STACK 10' },
        ],
      ],
    },
  },
  // 11 — stato valido 418, busta standard
  {
    id: 11,
    desc: 'status 418 su /api',
    spec: {
      req: { method: 'GET', originalUrl: '/api/teiera' },
      err: { kind: 'error', status: 418 },
    },
    dev: {
      status: 418,
      json: { ok: false, error: 'boom 11' },
      error: [
        ['[error]', { method: 'GET', url: '/api/teiera', message: 'boom 11', stack: 'STACK 11' }],
      ],
    },
    prod: {
      status: 418,
      json: { ok: false, error: 'INTERNAL_ERROR' },
      error: [
        ['[error]', { method: 'GET', url: '/api/teiera', message: 'boom 11', stack: 'STACK 11' }],
      ],
    },
  },
  // 12 — stato 599 (limite), busta standard
  {
    id: 12,
    desc: 'status 599 su /api (limite superiore)',
    spec: { req: { method: 'GET', originalUrl: '/api/x' }, err: { kind: 'error', status: 599 } },
    dev: {
      status: 599,
      json: { ok: false, error: 'boom 12' },
      error: [['[error]', { method: 'GET', url: '/api/x', message: 'boom 12', stack: 'STACK 12' }]],
    },
    prod: {
      status: 599,
      json: { ok: false, error: 'INTERNAL_ERROR' },
      error: [['[error]', { method: 'GET', url: '/api/x', message: 'boom 12', stack: 'STACK 12' }]],
    },
  },
  // 13 — stato 700 → 500
  {
    id: 13,
    desc: 'status 700 (fuori intervallo) su /api',
    spec: { req: { method: 'GET', originalUrl: '/api/x' }, err: { kind: 'error', status: 700 } },
    dev: {
      status: 500,
      json: { ok: false, error: 'boom 13' },
      error: [['[error]', { method: 'GET', url: '/api/x', message: 'boom 13', stack: 'STACK 13' }]],
    },
    prod: {
      status: 500,
      json: { ok: false, error: 'INTERNAL_ERROR' },
      error: [['[error]', { method: 'GET', url: '/api/x', message: 'boom 13', stack: 'STACK 13' }]],
    },
  },
  // 14 — stato 399 → 500
  {
    id: 14,
    desc: 'status 399 (fuori intervallo) su /api',
    spec: { req: { method: 'GET', originalUrl: '/api/x' }, err: { kind: 'error', status: 399 } },
    dev: {
      status: 500,
      json: { ok: false, error: 'boom 14' },
      error: [['[error]', { method: 'GET', url: '/api/x', message: 'boom 14', stack: 'STACK 14' }]],
    },
    prod: {
      status: 500,
      json: { ok: false, error: 'INTERNAL_ERROR' },
      error: [['[error]', { method: 'GET', url: '/api/x', message: 'boom 14', stack: 'STACK 14' }]],
    },
  },
  // 15 — stato stringa → 500
  {
    id: 15,
    desc: "status '404' (stringa) su /api",
    spec: { req: { method: 'GET', originalUrl: '/api/x' }, err: { kind: 'error', status: '404' } },
    dev: {
      status: 500,
      json: { ok: false, error: 'boom 15' },
      error: [['[error]', { method: 'GET', url: '/api/x', message: 'boom 15', stack: 'STACK 15' }]],
    },
    prod: {
      status: 500,
      json: { ok: false, error: 'INTERNAL_ERROR' },
      error: [['[error]', { method: 'GET', url: '/api/x', message: 'boom 15', stack: 'STACK 15' }]],
    },
  },
  // 16 — busta /api/parser (righe 63-70), 500
  {
    id: 16,
    desc: '/api/parser con messaggio, status 500',
    spec: { req: { method: 'POST', originalUrl: '/api/parser/parse' }, err: { kind: 'error' } },
    dev: {
      status: 500,
      json: { IsValid: false, Error: 'INTERNAL', Message: 'boom 16' },
      error: [
        [
          '[error]',
          { method: 'POST', url: '/api/parser/parse', message: 'boom 16', stack: 'STACK 16' },
        ],
      ],
    },
    prod: {
      status: 500,
      json: { IsValid: false, Error: 'INTERNAL' },
      error: [
        [
          '[error]',
          { method: 'POST', url: '/api/parser/parse', message: 'boom 16', stack: 'STACK 16' },
        ],
      ],
    },
  },
  // 17 — busta /api/parser, 404
  {
    id: 17,
    desc: '/api/parser con messaggio, status 404',
    spec: {
      req: { method: 'GET', originalUrl: '/api/parser/stats' },
      err: { kind: 'error', status: 404 },
    },
    dev: {
      status: 404,
      json: { IsValid: false, Error: 'NOT_FOUND', Message: 'boom 17' },
      error: [
        [
          '[error]',
          { method: 'GET', url: '/api/parser/stats', message: 'boom 17', stack: 'STACK 17' },
        ],
      ],
    },
    prod: {
      status: 404,
      json: { IsValid: false, Error: 'NOT_FOUND' },
      error: [
        [
          '[error]',
          { method: 'GET', url: '/api/parser/stats', message: 'boom 17', stack: 'STACK 17' },
        ],
      ],
    },
  },
  // 18 — busta /api/parser senza messaggio (riga 66-70)
  {
    id: 18,
    desc: '/api/parser senza messaggio (message vuoto)',
    spec: {
      req: { method: 'POST', originalUrl: '/api/parser/parse' },
      err: { kind: 'plain', status: 503 },
    },
    dev: {
      status: 503,
      json: { IsValid: false, Error: 'INTERNAL' },
      error: [
        [
          '[error]',
          { method: 'POST', url: '/api/parser/parse', message: undefined, stack: 'STACK 18' },
        ],
      ],
    },
    prod: {
      status: 503,
      json: { IsValid: false, Error: 'INTERNAL' },
      error: [
        [
          '[error]',
          { method: 'POST', url: '/api/parser/parse', message: undefined, stack: 'STACK 18' },
        ],
      ],
    },
  },
  // 19 — CORS 403 su /api (righe 49-51)
  {
    id: 19,
    desc: 'CORS su /api',
    spec: {
      req: { method: 'GET', originalUrl: '/api/engine/state' },
      err: { kind: 'error', message: 'Not allowed by CORS' },
    },
    dev: {
      status: 403,
      json: { ok: false, error: 'CORS_NOT_ALLOWED' },
      error: [
        [
          '[error]',
          {
            method: 'GET',
            url: '/api/engine/state',
            message: 'Not allowed by CORS',
            stack: 'STACK 19',
          },
        ],
      ],
    },
    prod: {
      status: 403,
      json: { ok: false, error: 'CORS_NOT_ALLOWED' },
      error: [
        [
          '[error]',
          {
            method: 'GET',
            url: '/api/engine/state',
            message: 'Not allowed by CORS',
            stack: 'STACK 19',
          },
        ],
      ],
    },
  },
  // 20 — CORS 403 fuori da /api (JSON, righe 49-51)
  {
    id: 20,
    desc: 'CORS fuori da /api',
    spec: {
      req: { method: 'GET', originalUrl: '/index.html' },
      err: { kind: 'error', message: 'Not allowed by CORS' },
    },
    dev: {
      status: 403,
      json: { ok: false, error: 'CORS_NOT_ALLOWED' },
      error: [
        [
          '[error]',
          { method: 'GET', url: '/index.html', message: 'Not allowed by CORS', stack: 'STACK 20' },
        ],
      ],
    },
    prod: {
      status: 403,
      json: { ok: false, error: 'CORS_NOT_ALLOWED' },
      error: [
        [
          '[error]',
          { method: 'GET', url: '/index.html', message: 'Not allowed by CORS', stack: 'STACK 20' },
        ],
      ],
    },
  },
  // 21 — headersSent (riga 46) precede il ramo CORS (riga 49)
  {
    id: 21,
    desc: 'CORS con headersSent',
    spec: {
      req: { method: 'GET', originalUrl: '/api/engine/state' },
      err: { kind: 'error', message: 'Not allowed by CORS' },
      headersSent: true,
    },
    dev: {
      next: [['<err>']],
      error: [
        [
          '[error]',
          {
            method: 'GET',
            url: '/api/engine/state',
            message: 'Not allowed by CORS',
            stack: 'STACK 21',
          },
        ],
      ],
    },
    prod: {
      next: [['<err>']],
      error: [
        [
          '[error]',
          {
            method: 'GET',
            url: '/api/engine/state',
            message: 'Not allowed by CORS',
            stack: 'STACK 21',
          },
        ],
      ],
    },
  },
  // 22 — non-API 404 → "Not Found" (righe 58-59)
  {
    id: 22,
    desc: 'non-API con status 404',
    spec: { req: { method: 'GET', originalUrl: '/pagina' }, err: { kind: 'error', status: 404 } },
    dev: {
      status: 404,
      send: 'Not Found',
      error: [
        ['[error]', { method: 'GET', url: '/pagina', message: 'boom 22', stack: 'STACK 22' }],
      ],
    },
    prod: {
      status: 404,
      send: 'Not Found',
      error: [
        ['[error]', { method: 'GET', url: '/pagina', message: 'boom 22', stack: 'STACK 22' }],
      ],
    },
  },
  // 23 — non-API 500 → testo generico
  {
    id: 23,
    desc: 'non-API con errore generico (500)',
    spec: { req: { method: 'GET', originalUrl: '/pagina' }, err: { kind: 'error' } },
    dev: {
      status: 500,
      send: 'Internal Server Error',
      error: [
        ['[error]', { method: 'GET', url: '/pagina', message: 'boom 23', stack: 'STACK 23' }],
      ],
    },
    prod: {
      status: 500,
      send: 'Internal Server Error',
      error: [
        ['[error]', { method: 'GET', url: '/pagina', message: 'boom 23', stack: 'STACK 23' }],
      ],
    },
  },
  // 24 — non-API con stato ≠ 404 → testo generico con stato 418
  {
    id: 24,
    desc: 'non-API con status 418 (testo 500 perché diverso da 404)',
    spec: { req: { method: 'GET', originalUrl: '/pagina' }, err: { kind: 'error', status: 418 } },
    dev: {
      status: 418,
      send: 'Internal Server Error',
      error: [
        ['[error]', { method: 'GET', url: '/pagina', message: 'boom 24', stack: 'STACK 24' }],
      ],
    },
    prod: {
      status: 418,
      send: 'Internal Server Error',
      error: [
        ['[error]', { method: 'GET', url: '/pagina', message: 'boom 24', stack: 'STACK 24' }],
      ],
    },
  },
  // 25 — err undefined → busta standard 500
  {
    id: 25,
    desc: 'err undefined su /api',
    spec: { req: { method: 'GET', originalUrl: '/api/x' }, err: { kind: 'undef' } },
    dev: {
      status: 500,
      json: { ok: false, error: 'INTERNAL_ERROR' },
      error: [['[error]', { method: 'GET', url: '/api/x', message: undefined, stack: undefined }]],
    },
    prod: {
      status: 500,
      json: { ok: false, error: 'INTERNAL_ERROR' },
      error: [['[error]', { method: 'GET', url: '/api/x', message: undefined, stack: undefined }]],
    },
  },
  // 26 — err null → busta standard 500
  {
    id: 26,
    desc: 'err null su /api',
    spec: { req: { method: 'GET', originalUrl: '/api/x' }, err: { kind: 'null' } },
    dev: {
      status: 500,
      json: { ok: false, error: 'INTERNAL_ERROR' },
      error: [['[error]', { method: 'GET', url: '/api/x', message: undefined, stack: undefined }]],
    },
    prod: {
      status: 500,
      json: { ok: false, error: 'INTERNAL_ERROR' },
      error: [['[error]', { method: 'GET', url: '/api/x', message: undefined, stack: undefined }]],
    },
  },
  // 27 — url vuoto → non-API (righe 58-59)
  {
    id: 27,
    desc: 'err undefined, req senza originalUrl né url',
    spec: { req: { method: 'GET' }, err: { kind: 'undef' } },
    dev: {
      status: 500,
      send: 'Internal Server Error',
      error: [['[error]', { method: 'GET', url: '', message: undefined, stack: undefined }]],
    },
    prod: {
      status: 500,
      send: 'Internal Server Error',
      error: [['[error]', { method: 'GET', url: '', message: undefined, stack: undefined }]],
    },
  },
  // 28 — url di ripiego (req.url)
  {
    id: 28,
    desc: 'req senza originalUrl, con url /api/x',
    spec: { req: { method: 'GET', url: '/api/x' }, err: { kind: 'error' } },
    dev: {
      status: 500,
      json: { ok: false, error: 'boom 28' },
      error: [['[error]', { method: 'GET', url: '/api/x', message: 'boom 28', stack: 'STACK 28' }]],
    },
    prod: {
      status: 500,
      json: { ok: false, error: 'INTERNAL_ERROR' },
      error: [['[error]', { method: 'GET', url: '/api/x', message: 'boom 28', stack: 'STACK 28' }]],
    },
  },
  // 29 — req undefined → url vuoto → non-API (righe 58-59)
  {
    id: 29,
    desc: 'req undefined',
    spec: { req: undefined, err: { kind: 'error' } },
    dev: {
      status: 500,
      send: 'Internal Server Error',
      error: [['[error]', { method: undefined, url: '', message: 'boom 29', stack: 'STACK 29' }]],
    },
    prod: {
      status: 500,
      send: 'Internal Server Error',
      error: [['[error]', { method: undefined, url: '', message: 'boom 29', stack: 'STACK 29' }]],
    },
  },
  // 30 — message vuoto → ripiego INTERNAL_ERROR (riga 72)
  {
    id: 30,
    desc: 'messaggio vuoto su /api (ripiego INTERNAL_ERROR in sviluppo)',
    spec: { req: { method: 'GET', originalUrl: '/api/x' }, err: { kind: 'error', message: '' } },
    dev: {
      status: 500,
      json: { ok: false, error: 'INTERNAL_ERROR' },
      error: [['[error]', { method: 'GET', url: '/api/x', message: '', stack: 'STACK 30' }]],
    },
    prod: {
      status: 500,
      json: { ok: false, error: 'INTERNAL_ERROR' },
      error: [['[error]', { method: 'GET', url: '/api/x', message: '', stack: 'STACK 30' }]],
    },
  },
  // 31 — message non stringa: non JSON malformato, errore = 123 in sviluppo
  {
    id: 31,
    desc: 'JSON malformato: SyntaxError senza body né message stringa (message non stringa)',
    spec: {
      req: { method: 'POST', originalUrl: '/api/x' },
      err: { kind: 'syntaxNoText', type: 'entity.parse.failed' },
    },
    dev: {
      status: 500,
      json: { ok: false, error: 123 },
      error: [['[error]', { method: 'POST', url: '/api/x', message: 123, stack: 'STACK 31' }]],
    },
    prod: {
      status: 500,
      json: { ok: false, error: 'INTERNAL_ERROR' },
      error: [['[error]', { method: 'POST', url: '/api/x', message: 123, stack: 'STACK 31' }]],
    },
  },
];

describe('errorHandler — caratterizzazione', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('la tabella ha almeno 20 casi', () => {
    expect(CASES.length).toBeGreaterThanOrEqual(20);
  });

  describe.each(['dev', 'prod'] as const)('ambiente %s', (env) => {
    it.each(CASES.map((c) => [c.id, c.desc, c] as const))('caso %i — %s', (_id, _desc, c) => {
      expect(run(c, env === 'prod')).toStrictEqual(c[env]);
    });
  });
});
