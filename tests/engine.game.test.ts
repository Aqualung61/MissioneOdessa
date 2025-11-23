import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
// Rimosso @ts-expect-error inutilizzato
import { ensureVocabulary, parseCommand } from '../src/logic/parser.js';
import { executeCommand, resetGameState, getGameStateSnapshot } from '../src/logic/engine.js';
import Azioni from '../src/data-internal/Azioni.json';
import Introduzione from '../src/data-internal/Introduzione.json';
import LessicoSoftware from '../src/data-internal/LessicoSoftware.json';
import Lingue from '../src/data-internal/Lingue.json';
import Luoghi from '../src/data-internal/Luoghi.json';
import Luoghi_immagine from '../src/data-internal/Luoghi_immagine.json';
import Luoghi_oggetto from '../src/data-internal/Luoghi_oggetto.json';
import Oggetti from '../src/data-internal/Oggetti.json';
import Piattaforme from '../src/data-internal/Piattaforme.json';
import Software from '../src/data-internal/Software.json';
import TerminiLessico from '../src/data-internal/TerminiLessico.json';
import TipiLessico from '../src/data-internal/TipiLessico.json';
import VociLessico from '../src/data-internal/VociLessico.json';

describe('Engine gameplay base: PRENDI/POSA e INVENTARIO', () => {
  beforeAll(async () => {
    // Carica dati JSON in global.odessaData per simulare initOdessa
    global.odessaData = {
      Azioni,
      Introduzione,
      LessicoSoftware,
      Lingue,
      Luoghi,
      Luoghi_immagine,
      Luoghi_oggetto,
      Oggetti,
      Piattaforme,
      Software,
      TerminiLessico,
      TipiLessico,
      VociLessico,
    };
    await ensureVocabulary();
  });

  beforeEach(() => {
    resetGameState();
  });

  it('PRENDI LAMPADA -> inventario contiene LAMPADA', async () => {
    const parsed = await parseCommand(null, 'PRENDI LAMPADA');
    expect(parsed.IsValid).toBe(true);
    const res = executeCommand(parsed);
    expect(res.accepted).toBe(true);
    expect(res.message).toMatch(/Hai preso la LAMPADA/);
    const snap = getGameStateSnapshot();
    expect(snap.inventory).toContain('LAMPADA');
    expect(snap.roomItems).not.toContain('LAMPADA');
  });

  it('POSA LAMPADA dopo PRENDI -> torna nella stanza', async () => {
    let parsed = await parseCommand(null, 'PRENDI LAMPADA');
    executeCommand(parsed);
    parsed = await parseCommand(null, 'POSA LAMPADA');
    const res2 = executeCommand(parsed);
    expect(res2.accepted).toBe(true);
    expect(res2.message).toMatch(/Hai posato la LAMPADA/);
    const snap = getGameStateSnapshot();
    expect(snap.inventory).not.toContain('LAMPADA');
    expect(snap.roomItems).toContain('LAMPADA');
  });

  it('INVENTARIO mostra contenuto o assenza', async () => {
    // Vuoto
    let parsed = await parseCommand(null, 'INVENTARIO');
    let res = executeCommand(parsed);
    expect(res.message).toBe('Non hai nulla.');
    // Dopo PRENDI LAMPADA
    parsed = await parseCommand(null, 'PRENDI LAMPADA');
    executeCommand(parsed);
    parsed = await parseCommand(null, 'INVENTARIO');
    res = executeCommand(parsed);
    expect(res.message).toContain('LAMPADA');
  });
});
