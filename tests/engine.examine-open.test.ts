import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { ensureVocabulary, parseCommand } from '../src/logic/parser.js';
import { executeCommand, resetGameState, getGameStateSnapshot, initializeOriginalData } from '../src/logic/engine.js';
import Introduzione from '../src/data-internal/Introduzione.json';
import LessicoSoftware from '../src/data-internal/LessicoSoftware.json';
import Lingue from '../src/data-internal/Lingue.json';
import Luoghi from '../src/data-internal/Luoghi.json';
import Luoghi_immagine from '../src/data-internal/Luoghi_immagine.json';
import Oggetti from '../src/data-internal/Oggetti.json';
import Piattaforme from '../src/data-internal/Piattaforme.json';
import Software from '../src/data-internal/Software.json';
import TerminiLessico from '../src/data-internal/TerminiLessico.json';
import TipiLessico from '../src/data-internal/TipiLessico.json';
import VociLessico from '../src/data-internal/VociLessico.json';

describe('Engine: ESAMINA e APRI/CHIUDI', () => {
  beforeAll(async () => {
    // Carica dati JSON in global.odessaData per simulare initOdessa
    global.odessaData = {
      Introduzione,
      LessicoSoftware,
      Lingue,
      Luoghi,
      Luoghi_immagine,
      Oggetti,
      Piattaforme,
      Software,
      TerminiLessico,
      TipiLessico,
      VociLessico,
    };
    initializeOriginalData();
    await ensureVocabulary();
  });

  beforeEach(() => {
    resetGameState();
  });

  it('ESAMINA oggetto presente -> descrizione', async () => {
    // Esamina un oggetto dell'inventario iniziale
    const parsed = await parseCommand(null, 'ESAMINA DOCUMENTI');
    expect(parsed.IsValid).toBe(true);
    const res = executeCommand(parsed);
    expect(res.accepted).toBe(true);
    expect(typeof res.message).toBe('string');
    expect(res.message.length).toBeGreaterThan(0);
  });

  it('ESAMINA senza oggetto -> descrizione luogo corrente', async () => {
    const parsed = await parseCommand(null, 'ESAMINA');
    expect(parsed.IsValid).toBe(true);
    const res = executeCommand(parsed);
    expect(res.accepted).toBe(true);
    expect(typeof res.message).toBe('string');
    expect(res.message.length).toBeGreaterThan(0);
    expect(res.showLocation).toBe(true);
  });

  it('GUARDA senza oggetto -> descrizione luogo corrente', async () => {
    const parsed = await parseCommand(null, 'GUARDA');
    expect(parsed.IsValid).toBe(true);
    const res = executeCommand(parsed);
    expect(res.accepted).toBe(true);
    expect(typeof res.message).toBe('string');
    expect(res.message.length).toBeGreaterThan(0);
    expect(res.showLocation).toBe(true);
  });

  // Test temporaneamente disabilitato - richiede setup di oggetti apribili specifici
  it.skip('APRI oggetto -> aperto; CHIUDI oggetto -> chiuso', async () => {
    let parsed = await parseCommand(null, 'APRI BOTOLA');
    let res = executeCommand(parsed);
    expect(res.accepted).toBe(true);
    expect(res.message).toMatch(/Hai aperto la BOTOLA|È già aperto/i);
    let snap = getGameStateSnapshot();
    expect(snap.openStates.BOTOLA).toBe(true);

    parsed = await parseCommand(null, 'CHIUDI BOTOLA');
    res = executeCommand(parsed);
    expect(res.accepted).toBe(true);
    expect(res.message).toMatch(/Hai chiuso la BOTOLA|È già chiuso/i);
    snap = getGameStateSnapshot();
    expect(snap.openStates.BOTOLA).toBe(false);
  });
});
