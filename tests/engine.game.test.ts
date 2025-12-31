import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
// Rimosso @ts-expect-error inutilizzato
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

describe('Engine gameplay base: PRENDI/POSA e INVENTARIO', () => {
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

  it('PRENDI oggetto -> inventario lo contiene', async () => {
    // Imposta luogo corrente a 11 dove c'è "Bastone di comando"
    const { setCurrentLocation } = await import('../src/logic/engine.js');
    setCurrentLocation(11);
    
    const parsed = await parseCommand(null, 'PRENDI BASTONE');
    expect(parsed.IsValid).toBe(true);
    const res = executeCommand(parsed);
    expect(res.accepted).toBe(true);
    expect(res.message).toMatch(/Hai preso/i);
    const snap = getGameStateSnapshot();
    // Verifica che l'oggetto sia ora in inventario (IDLuogo = 0)
    const bastone = snap.Oggetti.find(o => o.Oggetto === 'Bastone di comando');
    expect(bastone).toBeDefined();
    expect(bastone.IDLuogo).toBe(0);
  });

  it('POSA oggetto dopo PRENDI -> torna nel luogo', async () => {
    const { setCurrentLocation } = await import('../src/logic/engine.js');
    setCurrentLocation(11);
    
    let parsed = await parseCommand(null, 'PRENDI BASTONE');
    executeCommand(parsed);
    parsed = await parseCommand(null, 'POSA BASTONE');
    const res2 = executeCommand(parsed);
    expect(res2.accepted).toBe(true);
    expect(res2.message).toMatch(/Hai posato/i);
    const snap = getGameStateSnapshot();
    // Verifica che l'oggetto sia tornato nel luogo corrente
    const bastone = snap.Oggetti.find(o => o.Oggetto === 'Bastone di comando');
    expect(bastone).toBeDefined();
    expect(bastone.IDLuogo).toBe(11);
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

  it('PRENDI oggetto spostabile (Attivo=2) -> messaggio di rifiuto', async () => {
    // Imposta luogo corrente a 24 dove c'è "Quadro" (Attivo=2, spostabile)
    const { setCurrentLocation } = await import('../src/logic/engine.js');
    setCurrentLocation(24);
    
    const parsed = await parseCommand(null, 'PRENDI QUADRO');
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
