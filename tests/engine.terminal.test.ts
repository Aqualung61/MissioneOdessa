import { describe, it, expect, beforeEach } from 'vitest';
import { resetGameState, getGameStateSnapshot, enterLocation, confirmRestart } from '../src/logic/engine.js';

const dbPath = process.env.ODESSA_DB_PATH || './db/Odessa.db';

describe('Engine - luoghi terminali', () => {
  beforeEach(() => {
    resetGameState();
  });

  it('entra in luogo terminale e chiede riavvio', async () => {
    // Scegli un ID noto terminale (dal dataset: 8, 40 o 54); usiamo 8
    const res = await enterLocation(dbPath, 8);
    expect(res.accepted).toBe(true);
    expect(res.resultType).toBe('TERMINAL');
    const snap = getGameStateSnapshot();
    expect(snap.awaitingRestart).toBe(true);
    expect(snap.currentLocationId).toBe(8);
  });

  it('riavvia con risposta positiva (S)', async () => {
    await enterLocation(dbPath, 8);
    const res = await confirmRestart(dbPath, 'S');
    expect(res.accepted).toBe(true);
    expect(['OK', 'TERMINAL']).toContain(res.resultType); // se ID=1 fosse terminale, sarebbe TERMINAL
    const snap = getGameStateSnapshot();
    expect(snap.awaitingRestart).toBe(false);
    expect(snap.currentLocationId).toBe(1);
  });

  it('termina la partita con risposta negativa', async () => {
    await enterLocation(dbPath, 8);
    const res = await confirmRestart(dbPath, 'NO');
    expect(res.accepted).toBe(true);
    expect(res.resultType).toBe('ENDED');
    const snap = getGameStateSnapshot();
    expect(snap.ended).toBe(true);
  });

  it('accetta varianti SI e SÌ', async () => {
    await enterLocation(dbPath, 8);
    const res1 = await confirmRestart(dbPath, 'SI');
    expect(res1.accepted).toBe(true);
    // Torna in attesa: porta nuovamente in terminale e prova con accento
    await enterLocation(dbPath, 8);
    const res2 = await confirmRestart(dbPath, 'Sì');
    expect(res2.accepted).toBe(true);
  });
});
