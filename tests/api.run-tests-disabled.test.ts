import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import type { Server } from 'http';
import apiRoutes from '../src/api/routes.js';

type StartedServer = {
  server: Server;
  baseUrl: string;
};

function startServer(app: express.Express): Promise<StartedServer> {
  return new Promise<StartedServer>((resolve) => {
    const server = app.listen(0, () => {
      const address = server.address();
      const port = typeof address === 'string' ? 0 : (address?.port ?? 0);
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

describe('DISABLE_RUN_TESTS: /api/run-tests disabilitato', () => {
  let server: Server;
  let baseUrl: string;

  const prevEnv = {
    DISABLE_RUN_TESTS: process.env.DISABLE_RUN_TESTS,
  };

  beforeEach(async () => {
    process.env.DISABLE_RUN_TESTS = '1';

    const app = express();
    app.use('/api', apiRoutes);

    const started = await startServer(app);
    server = started.server;
    baseUrl = started.baseUrl;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    process.env.DISABLE_RUN_TESTS = prevEnv.DISABLE_RUN_TESTS;
  });

  it('ritorna 404 anche con suite non valida (blocco prima della validazione)', async () => {
    const res = await fetch(`${baseUrl}/api/run-tests?suite=hacker` , { method: 'POST' });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ success: false, error: 'NOT_AVAILABLE' });
  });
});
