/**
 * Percorsi di riferimento (HO-08, #99/#95)
 * Esegue con parser e motore reali i percorsi registrati sulla v1.4.0 (minimo e
 * completo, IT ed EN) e verifica ogni passo. Se un test fallisce perché il
 * comportamento del gioco è cambiato di proposito, i valori registrati si
 * aggiornano seguendo le regole di manutenzione in
 * docs/20261015 - Test completo per completamento game - v1.0.md.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initOdessa } from '../src/initOdessa.js';
import { createEngine } from '../src/logic/engine.js';
import { ensureVocabulary, parseCommand } from '../src/logic/parser.js';

interface Step {
  step: number;
  command: string;
  resultType: string;
  location: number;
  turns: number;
  score: number;
}

interface Walkthrough {
  name: string;
  lingua: number;
  expected: {
    victory: boolean;
    ended: boolean;
    turnsAtFerenc: number;
    finalTurns: number;
    score: number;
    visitedPlaces: number[];
    interactions: string[];
    mysteries: string[];
  };
  steps: Step[];
}

const FIXTURES = resolve(__dirname, 'fixtures', 'walkthrough');

function load<T>(file: string): T {
  return JSON.parse(readFileSync(resolve(FIXTURES, file), 'utf8')) as T;
}

type Engine = ReturnType<typeof createEngine>;

/** Esegue i passi verificando ogni valore registrato; restituisce i turni al TELEPORT. */
async function runSteps(engine: Engine, label: string, steps: Step[]): Promise<number | null> {
  let turnsAtFerenc: number | null = null;
  for (const step of steps) {
    const where = `${label}, passo ${step.step}, comando "${step.command}"`;
    const parsed = await parseCommand(null, step.command, engine.getGameState());
    const result = engine.executeCommand(parsed);
    const state = engine.getGameState();
    expect(result.resultType, `${where}: resultType`).toBe(step.resultType);
    expect(state.currentLocationId, `${where}: luogo`).toBe(step.location);
    expect(state.turn.totalTurnsConsumed, `${where}: turni`).toBe(step.turns);
    expect(state.punteggio.totale, `${where}: punteggio`).toBe(step.score);
    if (result.resultType === 'TELEPORT') turnsAtFerenc = state.turn.totalTurnsConsumed;
  }
  return turnsAtFerenc;
}

function verifyFinal(engine: Engine, label: string, w: Walkthrough, turnsAtFerenc: number | null) {
  const state = engine.getGameState();
  const e = w.expected;
  expect(state.victory, `${label}: victory`).toBe(e.victory);
  expect(state.ended, `${label}: ended`).toBe(e.ended);
  expect(turnsAtFerenc, `${label}: turnsAtFerenc`).toBe(e.turnsAtFerenc);
  expect(state.turn.totalTurnsConsumed, `${label}: finalTurns`).toBe(e.finalTurns);
  expect(state.punteggio.totale, `${label}: score`).toBe(e.score);
  expect([...state.visitedPlaces].sort((a: number, b: number) => a - b), `${label}: luoghi`).toEqual(
    [...e.visitedPlaces].sort((a, b) => a - b)
  );
  expect([...state.punteggio.interazioniPunteggio].sort(), `${label}: interazioni`).toEqual(
    [...e.interactions].sort()
  );
  expect([...state.punteggio.misteriRisolti].sort(), `${label}: misteri`).toEqual(
    [...e.mysteries].sort()
  );
}

function newEngine(lingua: number): Engine {
  const engine = createEngine();
  engine.initializeOriginalData();
  engine.resetGameState(lingua);
  return engine;
}

describe('percorsi di riferimento v1.4.0', () => {
  beforeAll(async () => {
    await initOdessa();
    await ensureVocabulary();
  });

  for (const file of ['min_it.json', 'min_en.json', 'full_it.json', 'full_en.json']) {
    const w = load<Walkthrough>(file);
    it(`${w.name}: ${w.steps.length} passi fino alla vittoria`, async () => {
      const engine = newEngine(w.lingua);
      const turnsAtFerenc = await runSteps(engine, w.name, w.steps);
      verifyFinal(engine, w.name, w, turnsAtFerenc);
      if (w.name.startsWith('min_')) {
        // Invariante della decisione R3, indipendente dal valore registrato
        expect(turnsAtFerenc as number, `${w.name}: turni all'incontro con Ferenc`).toBeLessThanOrEqual(100);
      }
    });
  }

  it('compatibilità: un salvataggio v1.4.0 (passo 91) si riprende e si completa', async () => {
    const w = load<Walkthrough>('full_it.json');
    const save = load<{ gameState: Record<string, unknown> }>('save_v140_full_it_step91.json');
    const engine = newEngine(1);
    engine.setGameState(save.gameState);
    const turnsAtFerenc = await runSteps(engine, 'save_v140_step91', w.steps.filter(s => s.step >= 92));
    verifyFinal(engine, 'save_v140_step91', w, turnsAtFerenc);
  });
});
