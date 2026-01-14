import { describe, it, expect, afterEach } from 'vitest';
import express from 'express';
import type { Server } from 'http';

import parserRoutes from '../src/api/parserRoutes.js';

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

describe('Contract: POST /api/parser/parse (legacy)', () => {
  let server: Server | undefined;
  let baseUrl = '';

  afterEach(async () => {
    const srv = server;
    server = undefined;
    if (!srv) return;
    await new Promise<void>((resolve) => srv.close(() => resolve()));
  });

  it('invalid input: vuoto/solo spazi -> 400 IsValid=false, Error=INVALID_INPUT, Details=EMPTY_INPUT', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/parser', parserRoutes);

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

  it('invalid input: control chars -> 400 IsValid=false, Details=CONTROL_CHARS', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/parser', parserRoutes);

    const started = await startServer(app);
    server = started.server;
    baseUrl = started.baseUrl;

    const res = await fetch(`${baseUrl}/api/parser/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'CIAO\u0000' }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.IsValid).toBe(false);
    expect(body.Error).toBe('INVALID_INPUT');
    expect(body.Details).toBe('CONTROL_CHARS');
  });

  it('parse error: verbo sconosciuto -> 200 IsValid=false, Error=COMMAND_UNKNOWN', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/parser', parserRoutes);

    const started = await startServer(app);
    server = started.server;
    baseUrl = started.baseUrl;

    const res = await fetch(`${baseUrl}/api/parser/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'ASDFGHJKLQWERTY' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.IsValid).toBe(false);
    expect(body.Error).toBe('COMMAND_UNKNOWN');
  });

  it('parse error: NOUN sconosciuto -> 200 IsValid=false, Error=SYNTAX_NOUN_UNKNOWN', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/parser', parserRoutes);

    const started = await startServer(app);
    server = started.server;
    baseUrl = started.baseUrl;

    const res = await fetch(`${baseUrl}/api/parser/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'PRENDI ZZZ' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.IsValid).toBe(false);
    expect(body.Error).toBe('SYNTAX_NOUN_UNKNOWN');
    expect(body.UnknownNounToken).toBe('ZZZ');
  });

  it('parse error: struttura non parsabile -> 200 IsValid=false, Error=SYNTAX_INVALID_STRUCTURE', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/parser', parserRoutes);

    const started = await startServer(app);
    server = started.server;
    baseUrl = started.baseUrl;

    const res = await fetch(`${baseUrl}/api/parser/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'N LAMPADA' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.IsValid).toBe(false);
    expect(body.Error).toBe('SYNTAX_INVALID_STRUCTURE');
  });
});
