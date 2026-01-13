import { describe, it, expect, afterEach } from 'vitest';
import express from 'express';
import type { Server } from 'http';
import type { NextFunction, Request, Response } from 'express';
import { validateCommandInput, validateSaveData, validateSuiteParam } from '../src/middleware/validation.js';

type StartedServer = { server: Server; baseUrl: string };

function startServer(app: express.Express): Promise<StartedServer> {
  return new Promise<StartedServer>((resolve) => {
    const server = app.listen(0, () => {
      const address = server.address();
      const port = typeof address === 'string' ? 0 : (address?.port ?? 0);
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

describe('M2 validation + body limits', () => {
  let server: Server;
  let baseUrl: string;

  afterEach(async () => {
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('payload troppo grande -> 413 JSON', async () => {
    const app = express();
    app.use(express.json({ limit: '50b', strict: true }));
    app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
      if (typeof err === 'object' && err) {
        const maybe = err as { type?: unknown; status?: unknown };
        if (maybe.type === 'entity.too.large' || maybe.status === 413) {
          return res.status(413).json({ ok: false, error: 'PAYLOAD_TOO_LARGE' });
        }
      }
      return next(err);
    });
    app.post('/x', (_req, res) => res.json({ ok: true }));

    const started = await startServer(app);
    server = started.server;
    baseUrl = started.baseUrl;

    const big = { a: 'x'.repeat(200) };
    const res = await fetch(`${baseUrl}/x`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(big),
    });

    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body).toEqual({ ok: false, error: 'PAYLOAD_TOO_LARGE' });
  });

  it('parser/parse: input > 500 -> 400 IsValid=false', async () => {
    const app = express();
    app.use(express.json());
    app.post('/api/parser/parse', validateCommandInput({ mode: 'parser' }), (_req, res) => {
      res.json({ IsValid: true });
    });

    const started = await startServer(app);
    server = started.server;
    baseUrl = started.baseUrl;

    const res = await fetch(`${baseUrl}/api/parser/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'a'.repeat(501) }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.IsValid).toBe(false);
    expect(body.Error).toBe('INVALID_INPUT');
    expect(body.Details).toBe('LENGTH_OUT_OF_RANGE');
  });

  it('parser/parse: input vuoto/solo spazi -> 400 IsValid=false (EMPTY_INPUT)', async () => {
    const app = express();
    app.use(express.json());
    app.post('/api/parser/parse', validateCommandInput({ mode: 'parser' }), (_req, res) => {
      res.json({ IsValid: true });
    });

    const started = await startServer(app);
    server = started.server;
    baseUrl = started.baseUrl;

    const res = await fetch(`${baseUrl}/api/parser/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: '   ' }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.IsValid).toBe(false);
    expect(body.Error).toBe('INVALID_INPUT');
    expect(body.Details).toBe('EMPTY_INPUT');
  });

  it('engine/execute: control chars -> 400 ok=false', async () => {
    const app = express();
    app.use(express.json());
    app.post('/api/engine/execute', validateCommandInput({ mode: 'engine' }), (_req, res) => {
      res.json({ ok: true });
    });

    const started = await startServer(app);
    server = started.server;
    baseUrl = started.baseUrl;

    const res = await fetch(`${baseUrl}/api/engine/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'CIAO\u0000' }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('INVALID_INPUT');
    expect(body.details).toBe('CONTROL_CHARS');
  });

  it('engine/execute: input vuoto/solo spazi -> 400 ok=false (EMPTY_INPUT)', async () => {
    const app = express();
    app.use(express.json());
    app.post('/api/engine/execute', validateCommandInput({ mode: 'engine' }), (_req, res) => {
      res.json({ ok: true });
    });

    const started = await startServer(app);
    server = started.server;
    baseUrl = started.baseUrl;

    const res = await fetch(`${baseUrl}/api/engine/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: '   ' }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('INVALID_INPUT');
    expect(body.details).toBe('EMPTY_INPUT');
  });

  it('load-client-state: array enorme -> 400', async () => {
    const app = express();
    app.use(express.json());
    app.post('/api/engine/load-client-state', validateSaveData({ maxLuoghi: 2 }), (_req, res) => {
      res.json({ ok: true });
    });

    const started = await startServer(app);
    server = started.server;
    baseUrl = started.baseUrl;

    const res = await fetch(`${baseUrl}/api/engine/load-client-state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameState: {},
        odessaData: { Luoghi: [{}, {}, {}] },
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  it('run-tests: suite non ammessa -> 400', async () => {
    const app = express();
    app.use(express.json());
    app.post('/api/run-tests', validateSuiteParam({ allowed: ['full', 'smoke'] }), (_req, res) => {
      res.json({ ok: true });
    });

    const started = await startServer(app);
    server = started.server;
    baseUrl = started.baseUrl;

    const res = await fetch(`${baseUrl}/api/run-tests?suite=hax`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('INVALID_SUITE');
  });
});
