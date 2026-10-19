/**
 * Test di caratterizzazione — motore: stato e traccia di debug (#63, lotto 0 v1.4.2,
 * Fase 1B-2). Specifica: `docs/20261019 - TD Lotto 0 Rete di caratterizzazione - v1.0.md`,
 * §3.5; handoff: `Claude decompiler/20261019 - HO-18 Lotto 0 Rete di caratterizzazione -
 * v1.2.md`, Fase 1B-2.
 *
 * Ambito: rami non coperti (dal report di copertura di Fase 1A/1B-1) di `setGameState`
 * ed `executeCommand` in `src/logic/engine.js`.
 *
 * `setGameState` è la funzione di compatibilità dei salvataggi (TD §3.4): accetta stati
 * parziali o di formato precedente e applica valori di default documentati nel codice
 * ("default per i salvataggi che non li contengono"). I test qui sotto costruiscono
 * stati parziali plausibili (derivati da snapshot reali, con singoli campi rimossi per
 * imitare un salvataggio di formato precedente) e passano **solo** per l'API pubblica
 * `setGameState`/`getGameState` — questo è l'uso previsto della funzione, non un ramo
 * forzato.
 *
 * I test sulla traccia di debug (`ENGINE_DEBUG=1`) seguono le stesse convenzioni di
 * `tests/engine.debug.trace.test.ts` (file protetto, non modificato): un evento per
 * `EXECUTE_COMMAND_BLOCKED` e per il caso "awaitingRestart cambiato durante un comando
 * che consuma turno", non ancora esercitati da quel file. La variabile d'ambiente è
 * ripristinata a fine di ogni test (regola 6 di TD §3.5).
 */

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initOdessa } from '../src/initOdessa.js';
import { ensureVocabulary, parseCommand } from '../src/logic/parser.js';
import { createEngine } from '../src/logic/engine.js';
import { getEngineDebugTrace, resetEngineDebugTrace } from '../src/logic/engineDebug.js';
import { getSystemMessage } from '../src/logic/systemMessages.js';

type Engine = ReturnType<typeof createEngine>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

const root = resolve(__dirname, '..');

interface WalkthroughStep {
  step: number;
  command: string;
}

function loadWalkthroughCommands(name: string): string[] {
  const data = JSON.parse(readFileSync(resolve(root, 'tests', 'fixtures', 'walkthrough', `${name}.json`), 'utf8'));
  return (data.steps as WalkthroughStep[]).map((s) => s.command);
}

function newEngine(lingua: number): Engine {
  const engine = createEngine();
  engine.initializeOriginalData();
  engine.resetGameState(lingua);
  return engine;
}

async function run(engine: Engine, input: string) {
  const parsed = await parseCommand(null, input, engine.getGameState());
  return engine.executeCommand(parsed);
}

async function runMany(engine: Engine, inputs: string[]) {
  for (const c of inputs) await run(engine, c);
}

/** Snapshot reale, clonato in profondità e scorporato dai campi indicati (per imitare un salvataggio di formato precedente). */
function snapshotWithout(engine: Engine, ...fields: string[]): Json {
  const snap = JSON.parse(JSON.stringify(engine.getGameStateSnapshot())) as Json;
  for (const f of fields) delete snap[f];
  return snap;
}

describe('Caratterizzazione — motore: compatibilità dei salvataggi (setGameState, #63, lotto 0, Fase 1B-2)', () => {
  beforeAll(async () => {
    await initOdessa();
    await ensureVocabulary();
  });

  it('setGameState — struttura minima (turn, punteggio, timers, flags, visitedPlaces, Oggetti, interazioniEseguite assenti): tutti i default si applicano', () => {
    const source = newEngine(1);
    const partial = snapshotWithout(source, 'turn', 'punteggio', 'timers', 'flags', 'visitedPlaces', 'Oggetti', 'interazioniEseguite');
    partial.currentLocationId = 7;

    const engine = newEngine(1);
    engine.setGameState(partial);
    const state = engine.getGameState();

    expect([...state.visitedPlaces]).toEqual([]);
    expect(state.Oggetti).toEqual([]);
    expect(state.flags.cassaforteScoperta).toBe(false);
    expect(state.flags.bastoneLiberato).toBe(false);
    expect(state.flags.passaggioCrollato).toBe(false);
    expect(state.punteggio).toEqual({ totale: 0, interazioniPunteggio: new Set(), misteriRisolti: new Set() });
    expect(state.timers.matchesLeft).toBe(0);
    expect(state.timers.matchTimer).toBe(0);
    expect(state.turn.globalTurnNumber).toBe(0);
    expect(state.turn.current.location).toBe(7);
  });

  it('setGameState — struttura minima senza turn e senza currentLocationId: la posizione predefinita è 1', () => {
    const source = newEngine(1);
    const partial = snapshotWithout(source, 'turn', 'currentLocationId');

    const engine = newEngine(1);
    engine.setGameState(partial);
    const state = engine.getGameState();

    expect(state.turn.current.location).toBe(1);
    expect(state.turn.previous.location).toBe(1);
  });

  it('setGameState — punteggio presente con sotto-campi assenti: interazioniPunteggio e misteriRisolti diventano insiemi vuoti', () => {
    const source = newEngine(1);
    const snap = JSON.parse(JSON.stringify(source.getGameStateSnapshot())) as Json;
    snap.punteggio = { totale: 0 };

    const engine = newEngine(1);
    engine.setGameState(snap);
    const state = engine.getGameState();

    expect(state.punteggio.totale).toBe(0);
    expect([...state.punteggio.interazioniPunteggio]).toEqual([]);
    expect([...state.punteggio.misteriRisolti]).toEqual([]);
  });

  it('setGameState — Fiammiferi già esauriti (IDLuogo=-1) con timers.matchesLeft assente: dedotto a 0', async () => {
    const source = newEngine(1);
    // Esaurisce le 6 scorte reali (R8): accendi fiammifero finché non restano più.
    for (let i = 0; i < 7; i++) await run(source, 'accendi fiammifero');
    expect(source.getGameState().timers.matchesLeft).toBe(0);

    const snap = JSON.parse(JSON.stringify(source.getGameStateSnapshot())) as Json;
    delete snap.timers.matchesLeft;

    const engine = newEngine(1);
    engine.setGameState(snap);
    expect(engine.getGameState().timers.matchesLeft).toBe(0);
  });

  it('setGameState — turn presente senza current/previous, con currentLocationId: i default usano la posizione corrente', () => {
    const source = newEngine(1);
    const snap = snapshotWithout(source, 'turn');
    // Ricostruiamo "turn" senza i sotto-oggetti current/previous (formato precedente ipotetico).
    const fullTurn = JSON.parse(JSON.stringify(source.getGameStateSnapshot())).turn;
    delete fullTurn.current;
    delete fullTurn.previous;
    snap.turn = fullTurn;
    snap.currentLocationId = 9;

    const engine = newEngine(1);
    engine.setGameState(snap);
    const state = engine.getGameState();

    expect(state.turn.current.location).toBe(9);
    expect(state.turn.previous.location).toBe(1);
  });

  it('setGameState — turn presente senza current/previous e senza currentLocationId: entrambe le posizioni predefinite sono 1', () => {
    const source = newEngine(1);
    const fullTurn = JSON.parse(JSON.stringify(source.getGameStateSnapshot())).turn;
    delete fullTurn.current;
    delete fullTurn.previous;
    const snap = snapshotWithout(source, 'turn', 'currentLocationId');
    snap.turn = fullTurn;

    const engine = newEngine(1);
    engine.setGameState(snap);
    const state = engine.getGameState();

    expect(state.turn.current.location).toBe(1);
  });

  it('setGameState — turn.current e turn.previous presenti ma senza il campo location: usano la posizione corrente/predefinita', () => {
    const source = newEngine(1);
    const snap = JSON.parse(JSON.stringify(source.getGameStateSnapshot())) as Json;
    delete snap.turn.current.location;
    delete snap.turn.previous.location;
    snap.currentLocationId = 12;

    const engine = newEngine(1);
    engine.setGameState(snap);
    const state = engine.getGameState();

    expect(state.turn.current.location).toBe(12);
    expect(state.turn.previous.location).toBe(1);
  });

  it('setGameState — turn.current senza location e senza currentLocationId: usa la posizione predefinita 1', () => {
    const source = newEngine(1);
    const snap = JSON.parse(JSON.stringify(source.getGameStateSnapshot())) as Json;
    delete snap.turn.current.location;
    delete snap.currentLocationId;

    const engine = newEngine(1);
    engine.setGameState(snap);
    const state = engine.getGameState();

    expect(state.turn.current.location).toBe(1);
  });
});

describe('Caratterizzazione — motore: traccia di debug (executeCommand, #63, lotto 0, Fase 1B-2)', () => {
  const prevDebug = process.env.ENGINE_DEBUG;

  beforeAll(async () => {
    await initOdessa();
    await ensureVocabulary();
  });

  afterEach(() => {
    if (typeof prevDebug === 'string') process.env.ENGINE_DEBUG = prevDebug;
    else delete process.env.ENGINE_DEBUG;
    resetEngineDebugTrace();
  });

  it('executeCommand — evento EXECUTE_COMMAND_BLOCKED con ENGINE_DEBUG=1 (movimento bloccato dalla guardia)', async () => {
    const engine = newEngine(1);
    const fullIt = loadWalkthroughCommands('full_it');
    // Passo 146 di full_it: alla barriera, movimento bloccato dalla guardia (R4).
    await runMany(engine, fullIt.slice(0, 146));
    expect(engine.getGameState().movementBlocked).toBe(true);

    process.env.ENGINE_DEBUG = '1';
    resetEngineDebugTrace();

    await run(engine, 'n');

    const trace = getEngineDebugTrace();
    const blockedEvents = trace.events.filter((e) => e.kind === 'EXECUTE_COMMAND_BLOCKED');
    expect(blockedEvents.length).toBe(1);
    expect(blockedEvents[0].result.resultType).toBe('ERROR');
  });

  it('executeCommand — evento EXECUTE_COMMAND con ENGINE_DEBUG=1: awaitingRestart cambia durante un comando che consuma turno (attacco alla guardia)', async () => {
    const engine = newEngine(1);
    const fullIt = loadWalkthroughCommands('full_it');
    await runMany(engine, fullIt.slice(0, 146));
    expect(engine.getGameState().awaitingRestart).toBe(false);

    process.env.ENGINE_DEBUG = '1';
    resetEngineDebugTrace();

    await run(engine, 'attacca guardia');

    expect(engine.getGameState().awaitingRestart).toBe(true);
    const trace = getEngineDebugTrace();
    const events = trace.events.filter((e) => e.kind === 'EXECUTE_COMMAND');
    expect(events.length).toBeGreaterThanOrEqual(1);
    const last = events[events.length - 1];
    expect(last.consumesTurn).toBe(true);
    expect(last.delta.awaitingRestart).toBe(1);
  });
});

/**
 * Rami aggiuntivi di `executeCommandLegacy` individuati in Fase 1B-2 dopo aver
 * corretto l'intervallo di riga della funzione nel report di copertura (il report di
 * Fase 1B-1 misurava solo fino alla riga 1748; la funzione arriva in realtà alla riga
 * 1853, includendo i rami generici di ESAMINA/APRI-CHIUDI/PRENDI/POSA finali). Vedi
 * `Claude decompiler/20261019 - HO-18 Report Fase 1B-2 - v1.0.md` per il dettaglio.
 */
describe('Caratterizzazione — motore: executeCommandLegacy, rami ESAMINA/APRI-CHIUDI/PRENDI (#63, lotto 0, Fase 1B-2)', () => {
  const fullIt = loadWalkthroughCommands('full_it');

  beforeAll(async () => {
    await initOdessa();
    await ensureVocabulary();
  });

  it('executeCommandLegacy — APRI/CHIUDI generico (BOTOLA): apertura, "già aperta", chiusura, "già chiusa"', async () => {
    const engine = newEngine(1);
    // Passo 120 di full_it: la Botola (ID 41) è già visibile dopo l'enigma della pesa.
    await runMany(engine, fullIt.slice(0, 120));

    const r1 = await run(engine, 'apri botola');
    expect(r1.message).toBe(getSystemMessage('engine.open.success', 1, ['BOTOLA']));

    const r2 = await run(engine, 'apri botola');
    expect(r2.message).toBe(getSystemMessage('engine.open.alreadyOpen', 1));

    const r3 = await run(engine, 'chiudi botola');
    expect(r3.message).toBe(getSystemMessage('engine.close.success', 1, ['BOTOLA']));

    const r4 = await run(engine, 'chiudi botola');
    expect(r4.message).toBe(getSystemMessage('engine.close.alreadyClosed', 1));
  });

  it('executeCommandLegacy — PRENDERE generico (senza interazione dedicata) con inventario già pieno', async () => {
    const engine = newEngine(1);
    // Percorso reale fino al passo 44, senza le "posa" intermedie dell'enigma del buio
    // (passi 2, 6, 28): così i tre oggetti iniziali restano in inventario insieme a
    // lampada (passo 4) e badile (passo 29), raggiungendo il limite di 5 prima del
    // passo 44 ("prendi medaglione", senza interazione PRENDERE dedicata).
    const dropSteps = new Set([2, 6, 28]);
    const data = JSON.parse(
      readFileSync(resolve(root, 'tests', 'fixtures', 'walkthrough', 'full_it.json'), 'utf8')
    ) as { steps: WalkthroughStep[] };
    const commands = data.steps.filter((s) => s.step <= 44 && !dropSteps.has(s.step)).map((s) => s.command);
    await runMany(engine, commands.slice(0, -1));

    const inventoryCount = engine
      .getGameState()
      .Oggetti.filter((o: Json) => o.IDLuogo === 0 && o.Attivo >= 3).length;
    expect(inventoryCount).toBe(5);

    const result = await run(engine, commands[commands.length - 1]);
    expect(result.message).toBe(getSystemMessage('engine.take.inventoryFull', 1));
  });
});
