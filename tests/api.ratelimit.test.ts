import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import express from 'express';
import type { Server } from 'http';
import { createRateLimiter } from '../src/middleware/rateLimiter.js';

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

describe('M5 rate limiting', () => {
  let server: Server;
  let baseUrl: string;

  const prev = {
    NODE_ENV: process.env.NODE_ENV,
    RATE_LIMIT_DISABLED: process.env.RATE_LIMIT_DISABLED,
  };

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    delete process.env.RATE_LIMIT_DISABLED;
  });

  afterEach(async () => {
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
    process.env.NODE_ENV = prev.NODE_ENV;
    process.env.RATE_LIMIT_DISABLED = prev.RATE_LIMIT_DISABLED;
  });

  it('superata la soglia -> 429', async () => {
    const app = express();
    const limiter = createRateLimiter({ windowMs: 1_000, max: 2 });

    app.use('/api', limiter);
    app.get('/api/ping', (_req, res) => res.json({ pong: true }));

    const started = await startServer(app);
    server = started.server;
    baseUrl = started.baseUrl;

    const r1 = await fetch(`${baseUrl}/api/ping`);
    const r2 = await fetch(`${baseUrl}/api/ping`);
    const r3 = await fetch(`${baseUrl}/api/ping`);

    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(r3.status).toBe(429);

    const body = await r3.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('RATE_LIMITED');
  });
});
