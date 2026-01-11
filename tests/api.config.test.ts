import { describe, it, expect, afterEach } from 'vitest';
import express from 'express';
import type { Server } from 'http';
import { registerApiConfigRoutes } from '../src/api/configRoute.js';

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

describe('M0 api config: basePath esposto e normalizzato', () => {
  let server: Server | undefined;
  let baseUrl = '';

  afterEach(async () => {
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('BASE_PATH vuoto: /api/config -> basePath "/"', async () => {
    const app = express();
    registerApiConfigRoutes(app, { basePath: '' });

    const started = await startServer(app);
    server = started.server;
    baseUrl = started.baseUrl;

    const res = await fetch(`${baseUrl}/api/config`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ basePath: '/' });

    const res2 = await fetch(`${baseUrl}/missioneodessa/api/config`);
    expect(res2.status).toBe(404);
  });

  it('BASE_PATH impostato: risponde sia /api/config che BASE_PATH+/api/config', async () => {
    const app = express();
    registerApiConfigRoutes(app, { basePath: '/missioneodessa' });

    const started = await startServer(app);
    server = started.server;
    baseUrl = started.baseUrl;

    const r1 = await fetch(`${baseUrl}/api/config`);
    expect(r1.status).toBe(200);
    expect(await r1.json()).toEqual({ basePath: '/missioneodessa/' });

    const r2 = await fetch(`${baseUrl}/missioneodessa/api/config`);
    expect(r2.status).toBe(200);
    expect(await r2.json()).toEqual({ basePath: '/missioneodessa/' });
  });
});
