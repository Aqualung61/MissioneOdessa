/**
 * Test di caratterizzazione — motore: azioni e interazioni (#63, lotto 0 v1.4.2, Fase 1B-1).
 * Specifica: `docs/20261019 - TD Lotto 0 Rete di caratterizzazione - v1.0.md`, §3.5;
 * handoff: `Claude decompiler/20261019 - HO-18 Lotto 0 Rete di caratterizzazione - v1.2.md`,
 * Fase 1B-1.
 *
 * Ambito: rami non coperti (dal report di copertura di Fase 1A) di
 * `executeCommandLegacy`, `cercaEseguiInterazione` e `verificaPrerequisiti` in
 * `src/logic/engine.js`, raggiungibili con il gioco reale (parser + motore,
 * nessun ramo forzato, nessuna correzione — regole di TD §3.5). I rami residui
 * (irraggiungibili o difensivi con i dati attuali) sono elencati nel report di
 * Fase 1B-1, non in questo file.
 *
 * Ogni test usa solo API pubblica (`createEngine`, `parseCommand`, `executeCommand`)
 * e verifica i messaggi tramite chiave con `getSystemMessage`.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initOdessa } from '../src/initOdessa.js';
import { ensureVocabulary, parseCommand } from '../src/logic/parser.js';
import { createEngine } from '../src/logic/engine.js';
import { getSystemMessage } from '../src/logic/systemMessages.js';

type Engine = ReturnType<typeof createEngine>;

interface WalkthroughStep {
  step: number;
  command: string;
}

const root = resolve(__dirname, '..');

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

describe('Caratterizzazione — motore: azioni e interazioni (#63)', () => {
  const fullIt = loadWalkthroughCommands('full_it');

  beforeAll(async () => {
    await initOdessa();
    await ensureVocabulary();
  });

  it('executeCommand — SYSTEM INVENTARIO con inventario vuoto', async () => {
    const engine = newEngine(1);
    // I tre oggetti iniziali (Documenti, Fiammiferi, Torcia) partono in inventario:
    // vanno posati per osservare il ramo "inventario vuoto".
    await runMany(engine, ['posa documenti', 'posa fiammiferi', 'posa torcia']);

    const result = await run(engine, 'inventario');

    expect(result.resultType).toBe('OK');
    expect(result.message).toBe(getSystemMessage('engine.inventory.empty', 1));
  });

  it('verificaPrerequisiti — OGGETTO_VISIBILE non soddisfatto: "ruota destra" in biblioteca prima di scoprire la cassaforte', async () => {
    const engine = newEngine(1);
    // Passo 36 di full_it: posizione 24 (biblioteca), appena prima di "sposta quadro"
    // (passo 37), quindi la Cassaforte (Attivo=0 di default) non è ancora visibile.
    await runMany(engine, fullIt.slice(0, 36));
    expect(engine.getGameState().currentLocationId).toBe(24);

    const result = await run(engine, 'ruota destra');

    // L'interazione dedicata (ruota_destra_cassaforte_24) richiede OGGETTO_VISIBILE
    // su Cassaforte e non ha una risposta dedicata per il prerequisito non soddisfatto:
    // cercaEseguiInterazione prosegue senza risposta e il motore usa la regola generale
    // di D4 ("niente da ruotare"), engine.js §"GIRA/RUOTA DESTRA/SINISTRA fuori dalla
    // biblioteca o con la cassaforte non visibile".
    expect(result.resultType).toBe('OK');
    expect(result.message).toBe(getSystemMessage('engine.rotate.nothingToTurn', 1));
  });

  it('cercaEseguiInterazione — sequenza della cassaforte già completata: "ruota destra" ripete il messaggio dedicato', async () => {
    const engine = newEngine(1);
    // Passi 37-42 di full_it: "sposta quadro" (rivela la cassaforte) seguito dalla
    // combinazione completa (DESTRA, SINISTRA, SINISTRA, DESTRA, SINISTRA).
    await runMany(engine, fullIt.slice(0, 42));
    expect(engine.getGameState().currentLocationId).toBe(24);
    expect(engine.getGameState().sequenze['cassaforte_24']?.completata).toBe(true);

    const result = await run(engine, 'ruota destra');

    expect(result.resultType).toBe('OK');
    expect(result.message).toBe(getSystemMessage('engine.safeAlreadyOpen', 1));
  });
});
