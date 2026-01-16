import { describe, it, expect } from 'vitest';
import express from 'express';
import type { Server } from 'http';

import engineRoutes from '../src/api/engineRoutes.js';
import { createSessionState, fetchWithSession } from './testUtils/sessionFetch.js';

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

describe('Sprint #59.1 — Multi-session isolation (API)', () => {
  it('due sessioni diverse non condividono currentLocationId', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/engine', engineRoutes);

    const { server, baseUrl } = await startServer(app);
    try {
      const sessionA = createSessionState();
      const sessionB = createSessionState();

      const setA = await fetchWithSession(`${baseUrl}/api/engine/set-location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId: 2, consumeTurn: false }),
      }, sessionA);
      expect(setA.status).toBe(200);

      const setB = await fetchWithSession(`${baseUrl}/api/engine/set-location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId: 3, consumeTurn: false }),
      }, sessionB);
      expect(setB.status).toBe(200);

      const stateARes = await fetchWithSession(`${baseUrl}/api/engine/state`, undefined, sessionA);
      expect(stateARes.status).toBe(200);
      const stateAJson = await stateARes.json();
      expect(stateAJson.ok).toBe(true);
      expect(stateAJson.state?.currentLocationId).toBe(2);

      const stateBRes = await fetchWithSession(`${baseUrl}/api/engine/state`, undefined, sessionB);
      expect(stateBRes.status).toBe(200);
      const stateBJson = await stateBRes.json();
      expect(stateBJson.ok).toBe(true);
      expect(stateBJson.state?.currentLocationId).toBe(3);

      // Conferma isolamento anche dopo aver toccato l'altra sessione.
      const stateARes2 = await fetchWithSession(`${baseUrl}/api/engine/state`, undefined, sessionA);
      const stateAJson2 = await stateARes2.json();
      expect(stateAJson2.ok).toBe(true);
      expect(stateAJson2.state?.currentLocationId).toBe(2);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
