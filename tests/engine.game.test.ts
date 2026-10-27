import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { ensureVocabulary, parseCommand } from '../src/logic/parser.js';
import {
  executeCommand,
  resetGameState,
  getGameStateSnapshot,
  initializeOriginalData,
} from '../src/logic/engine.js';
import Introduzione from '../src/data-internal/Introduzione.json';
import LessicoSoftware from '../src/data-internal/LessicoSoftware.json';
import Lingue from '../src/data-internal/Lingue.json';
import Luoghi from '../src/data-internal/Luoghi.json';
import LuoghiLogici from '../src/data-internal/LuoghiLogici.json';
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
      Introduzione,
      LessicoSoftware,
      Lingue,
      Luoghi,
      LuoghiLogici,
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

  // Aggiornato per decisione R7 (#96): "Statuetta" (luogo 22, Attivo=3) al posto del
  // Bastone di comando, non più prendibile direttamente dal `prendi` generico (R7).
  it('PRENDI oggetto -> inventario lo contiene', async () => {
    // Imposta luogo corrente a 22 dove c'è "Statuetta"
    const { setCurrentLocation } = await import('../src/logic/engine.js');
    setCurrentLocation(22);

    const parsed = await parseCommand(null, 'PRENDI STATUETTA');
    expect(parsed.IsValid).toBe(true);
    const res = executeCommand(parsed);
    expect(res.accepted).toBe(true);
    expect(res.message).toMatch(/Hai preso/i);
    const snap = getGameStateSnapshot();
    // Verifica che l'oggetto sia ora in inventario (IDLuogo = 0)
    const statuetta = snap.Oggetti.find((o) => o.Oggetto === 'Statuetta');
    expect(statuetta).toBeDefined();
    expect(statuetta.IDLuogo).toBe(0);
  });

  // Aggiornato per decisione R7 (#96): stessa sostituzione del test precedente
  it('POSA oggetto dopo PRENDI -> torna nel luogo', async () => {
    const { setCurrentLocation } = await import('../src/logic/engine.js');
    setCurrentLocation(22);

    let parsed = await parseCommand(null, 'PRENDI STATUETTA');
    executeCommand(parsed);
    parsed = await parseCommand(null, 'POSA STATUETTA');
    const res2 = executeCommand(parsed);
    expect(res2.accepted).toBe(true);
    expect(res2.message).toMatch(/Hai posato/i);
    const snap = getGameStateSnapshot();
    // Verifica che l'oggetto sia tornato nel luogo corrente
    const statuetta = snap.Oggetti.find((o) => o.Oggetto === 'Statuetta');
    expect(statuetta).toBeDefined();
    expect(statuetta.IDLuogo).toBe(22);
  });

  it('INVENTARIO mostra contenuto o assenza', async () => {
    // All'inizio ci sono oggetti in inventario (Documenti, Fiammiferi, Torcia)
    const parsed = await parseCommand(null, 'INVENTARIO');
    const res = executeCommand(parsed);
    expect(res.message).toMatch(/Hai con te:|Documenti|Fiammiferi|Torcia/i);
  });

  it('FINE chiede conferma', async () => {
    const parsed = await parseCommand(null, 'FINE');
    expect(parsed.IsValid).toBe(true);
    const res = executeCommand(parsed);
    expect(res.accepted).toBe(true);
    expect(res.resultType).toBe('CONFIRM_END');
    expect(res.message).toBe('Vuoi davvero finire il gioco? (s/n)');

    const snap = getGameStateSnapshot();
    expect(snap.awaitingEndConfirm).toBe(true);
    expect(snap.awaitingRestart).toBe(false);
  });

  it('SALVA restituisce stato per download', async () => {
    const parsed = await parseCommand(null, 'SALVA');
    expect(parsed.IsValid).toBe(true);
    const res = executeCommand(parsed);
    expect(res.accepted).toBe(true);
    expect(res.resultType).toBe('SAVE_GAME');
    expect(res.message).toBe('Salvataggio in corso...');
    expect(res.effects).toEqual([]);
  });

  it('CARICA avvia caricamento', async () => {
    const parsed = await parseCommand(null, 'CARICA');
    expect(parsed.IsValid).toBe(true);
    const res = executeCommand(parsed);
    expect(res.accepted).toBe(true);
    expect(res.resultType).toBe('LOAD_GAME');
    expect(res.message).toBe('Caricamento in corso...');
    expect(res.effects).toEqual([]);
  });

  it('PRENDI oggetto scenico (Attivo=1) -> messaggio di rifiuto', async () => {
    // Imposta luogo corrente a 14 dove ci sono "Sedie" (Attivo=1, scenico)
    const { setCurrentLocation } = await import('../src/logic/engine.js');
    setCurrentLocation(14);

    const parsed = await parseCommand(null, 'PRENDI SEDIE');
    expect(parsed.IsValid).toBe(true);
    const res = executeCommand(parsed);
    expect(res.accepted).toBe(true);
    expect(res.message).toBe('Questo oggetto non può essere preso.');
  });

  // Aggiornato per decisione R7 (#96): "Trofei alle pareti" (luogo 22, Attivo=1) al posto
  // del Quadro, ora prendibile (Attivo=3, R7).
  it('PRENDI oggetto spostabile (Attivo=1) -> messaggio di rifiuto', async () => {
    // Imposta luogo corrente a 22 dove ci sono "Trofei alle pareti" (Attivo=1, scenico)
    const { setCurrentLocation } = await import('../src/logic/engine.js');
    setCurrentLocation(22);

    const parsed = await parseCommand(null, 'PRENDI TROFEI');
    expect(parsed.IsValid).toBe(true);
    const res = executeCommand(parsed);
    expect(res.accepted).toBe(true);
    expect(res.message).toBe('Questo oggetto non può essere preso.');
  });

  it('PRENDI oggetto con nome composto normalizzato (es. Scaffali) -> riconosce forma abbreviata', async () => {
    // Imposta luogo corrente a 24 dove ci sono "Scaffali vuoti" (Attivo=1, scenico)
    const { setCurrentLocation } = await import('../src/logic/engine.js');
    setCurrentLocation(24);

    // Test con "SCAFFALI" (forma breve che il parser riconosce)
    // Il parser converte "SCAFFALI" in concetto "SCAFFALI_Vuoti"
    // L'engine normalizza sia il concetto che il nome oggetto per confrontarli
    const parsed = await parseCommand(null, 'PRENDI SCAFFALI');
    expect(parsed.IsValid).toBe(true);
    expect(parsed.NounConcept).toBe('SCAFFALI_Vuoti');
    const res = executeCommand(parsed);
    expect(res.accepted).toBe(true);
    expect(res.message).toBe('Questo oggetto non può essere preso.');
  });
});

describe('Engine gameplay base EN: TAKE/DROP e INVENTORY', () => {
  beforeAll(async () => {
    // Carica dati JSON in global.odessaData per simulare initOdessa
    global.odessaData = {
      Introduzione,
      LessicoSoftware,
      Lingue,
      Luoghi,
      LuoghiLogici,
      Oggetti,
      Piattaforme,
      Software,
      TerminiLessico,
      TipiLessico,
      VociLessico,
    };
    initializeOriginalData();
    await ensureVocabulary({ currentLingua: 2 });
  });

  beforeEach(() => {
    resetGameState(2);
  });

  it('TAKE LAMP -> inventario lo contiene (EN)', async () => {
    const { setCurrentLocation } = await import('../src/logic/engine.js');
    setCurrentLocation(6);

    const parsed = await parseCommand(null, 'TAKE LAMP', { currentLingua: 2 });
    expect(parsed.IsValid).toBe(true);
    const res = executeCommand(parsed);
    expect(res.accepted).toBe(true);
    expect(res.message).toMatch(/You took/i);

    const snap = getGameStateSnapshot();
    const lamp = snap.Oggetti.find((o) => o.Oggetto === 'Lamp');
    expect(lamp).toBeDefined();
    expect(lamp!.IDLuogo).toBe(0);
  });
});
