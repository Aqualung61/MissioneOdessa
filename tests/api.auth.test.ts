import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import type { Server } from 'http';
import { apiKeyAuth } from '../src/middleware/auth.js';

type StartedServer = {
  server: Server;
  baseUrl: string;
};

function startServer(app: express.Express): Promise<StartedServer> {
  return new Promise<StartedServer>((resolve) => {
    const server = app.listen(0, () => {
      const address = server.address();
      const port = typeof address === 'string' ? 0 : (address?.port ?? 0);
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${port}`,
      });
    });
  });
}

describe('M1 auth: X-API-Key su /api', () => {
  let server: Server;
  let baseUrl: string;

  const prevEnv = {
    NODE_ENV: process.env.NODE_ENV,
    API_KEY: process.env.API_KEY,
    API_AUTH_DISABLED: process.env.API_AUTH_DISABLED,
  };

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';
    process.env.API_KEY = 'test-secret';

    const app = express();
    app.use('/api', apiKeyAuth());
    app.get('/api/ping', (req, res) => res.json({ pong: true }));

    const started = await startServer(app);
    server = started.server;
    baseUrl = started.baseUrl;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    process.env.NODE_ENV = prevEnv.NODE_ENV;
    process.env.API_KEY = prevEnv.API_KEY;
    process.env.API_AUTH_DISABLED = prevEnv.API_AUTH_DISABLED;
  });

  it('senza key -> 401', async () => {
    const res = await fetch(`${baseUrl}/api/ping`);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('UNAUTHORIZED');
  });

  it('key errata -> 401', async () => {
    const res = await fetch(`${baseUrl}/api/ping`, {
      headers: { 'X-API-Key': 'wrong' },
    });
    expect(res.status).toBe(401);
  });

  it('key valida -> 200', async () => {
    const res = await fetch(`${baseUrl}/api/ping`, {
      headers: { 'X-API-Key': 'test-secret' },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ pong: true });
  });

  it('API_AUTH_DISABLED=1 -> bypass (200 anche senza key)', async () => {
    process.env.API_AUTH_DISABLED = '1';
    const res = await fetch(`${baseUrl}/api/ping`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ pong: true });
  });
});
