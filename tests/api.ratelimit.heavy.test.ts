import { describe, it, expect, afterEach } from 'vitest';
import express from 'express';
import type { Server } from 'http';
import { heavyLimiter } from '../src/middleware/rateLimiter.js';

describe('heavyLimiter (#94, R4)', () => {
  let server: Server | undefined;

  afterEach(async () => {
    await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
    server = undefined;
  });

  it('TB-05: le prime 5 richieste rispondono 200, la sesta 429', async () => {
    const app = express();
    app.use('/heavy', heavyLimiter);
    app.post('/heavy', (_req, res) => res.json({ ok: true }));

    const baseUrl = await new Promise<string>((resolve) => {
      server = app.listen(0, () => {
        const address = server!.address();
        const port = typeof address === 'string' ? 0 : (address?.port ?? 0);
        resolve(`http://127.0.0.1:${port}`);
      });
    });

    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await fetch(`${baseUrl}/heavy`, { method: 'POST' });
      statuses.push(res.status);
    }
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
  });
});
