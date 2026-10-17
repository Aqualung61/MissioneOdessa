/**
 * Enigmi e punteggio (#96)
 * Specifica: docs/20261015 - TD Enigmi e punteggio - v1.0.md, §6.2 (TB-01…TB-11).
 *
 * Motore e parser reali (parseCommand + executeCommand). Il percorso fino al badile e
 * all'ufficio si gioca con i passi del percorso completo, come in #107; nessuna modifica
 * a mano dello stato, salvo `setGameState` per i casi di compatibilità dei salvataggi.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initOdessa } from '../src/initOdessa.js';
import { createEngine } from '../src/logic/engine.js';
import { ensureVocabulary, parseCommand } from '../src/logic/parser.js';
import { INTERACTION_TOP_LEVEL_KEYS, PREREQUISITE_TYPES, validateInterazioni } from '../src/logic/interactionSchema.js';

type Engine = ReturnType<typeof createEngine>;

const root = resolve(__dirname, '..');
const loadJson = (...parts: string[]) => JSON.parse(readFileSync(resolve(root, ...parts), 'utf8'));

interface Step {
  step: number;
  command: string;
}

function newEngine(lingua = 1): Engine {
  const engine = createEngine();
  engine.initializeOriginalData();
  engine.resetGameState(lingua);
  return engine;
}

async function run(engine: Engine, command: string) {
  const parsed = await parseCommand(null, command, engine.getGameState());
  return engine.executeCommand(parsed);
}

function walkthrough(lingua: number) {
  return loadJson('tests', 'fixtures', 'walkthrough', lingua === 1 ? 'full_it.json' : 'full_en.json').steps as Step[];
}

// Ritorno dal garage (18, dopo il badile) all'ufficio (11): percorso reale, non nei fixture.
const BACK_TO_OFFICE_IT = ['n', 'n', 'o', 'o', 'o', 'n', 'e', 'n', 'su', 's', 'o'];
const BACK_TO_OFFICE_EN = ['n', 'n', 'w', 'w', 'w', 'n', 'e', 'n', 'up', 's', 'w'];

/** Ufficio (11) con il badile in inventario (dopo il passo che lo prende, passo 29 IT/EN). */
async function toUfficioConBadile(lingua = 1): Promise<Engine> {
  const engine = newEngine(lingua);
  for (const s of walkthrough(lingua).filter((x) => x.step <= 29)) await run(engine, s.command);
  for (const c of lingua === 1 ? BACK_TO_OFFICE_IT : BACK_TO_OFFICE_EN) await run(engine, c);
  return engine;
}

/** Ufficio (11), primo passaggio, senza badile (passi 1…14). */
async function toUfficioSenzaBadile(lingua = 1): Promise<Engine> {
  const engine = newEngine(lingua);
  for (const s of walkthrough(lingua).filter((x) => x.step <= 14)) await run(engine, s.command);
  return engine;
}

/** Biblioteca (24), prima della scoperta della cassaforte (passo 36), con 2 oggetti in inventario. */
async function toBibliotecaInventarioLibero(lingua = 1): Promise<Engine> {
  const engine = newEngine(lingua);
  for (const s of walkthrough(lingua).filter((x) => x.step <= 36)) await run(engine, s.command);
  return engine;
}

/** Biblioteca (24), prima della scoperta della cassaforte, con 5 oggetti in inventario (limite). */
async function toBibliotecaInventarioPieno(lingua = 1): Promise<Engine> {
  const engine = newEngine(lingua);
  const skip = lingua === 1
    ? new Set(['posa documenti', 'posa fiammiferi', 'posa torcia'])
    : new Set(['drop documents', 'drop matches', 'drop torch']);
  for (const s of walkthrough(lingua).filter((x) => x.step <= 36)) {
    if (skip.has(s.command)) continue;
    await run(engine, s.command);
  }
  return engine;
}

describe('enigmi e punteggio (#96)', () => {
  beforeAll(async () => {
    await initOdessa();
    await ensureVocabulary();
  });

  describe('R7 — bastone sotto le macerie', () => {
    it('TB-01: senza scavare, prendi bastone risponde con le macerie; nessun punto', async () => {
      const engine = await toUfficioConBadile();
      const punteggioBefore = engine.getGameState().punteggio.totale;

      const r = await run(engine, 'prendi bastone');
      expect(r.message).toBe('Le macerie te lo impediscono.');
      const bastone = engine.getGameState().Oggetti.find((o: { ID: number }) => o.ID === 1);
      expect(bastone.IDLuogo).toBe(11);
      expect(engine.getGameState().punteggio.totale).toBe(punteggioBefore);
    });

    it('TB-02: senza badile, scava macerie risponde "Ti manca l\'attrezzo!"', async () => {
      const engine = await toUfficioSenzaBadile();
      const r = await run(engine, 'scava macerie');
      expect(r.message).toBe("Ti manca l'attrezzo!");
    });

    it('TB-03: con il badile, scavare libera il bastone e si può prendere; nessun punto', async () => {
      const engine = await toUfficioConBadile();
      const punteggioBefore = engine.getGameState().punteggio.totale;

      const rScava = await run(engine, 'scava macerie');
      expect(rScava.message).toContain('Rimuovi le macerie che impediscono di prendere il bastone.');

      const rPrendi = await run(engine, 'prendi bastone');
      expect(rPrendi.message).toMatch(/Hai preso/i);
      const bastone = engine.getGameState().Oggetti.find((o: { ID: number }) => o.ID === 1);
      expect(bastone.IDLuogo).toBe(0);

      expect(engine.getGameState().punteggio.totale).toBe(punteggioBefore);
    });

    it('TB-04: dopo lo scavo, scavare di nuovo risponde "Scava, scava, scava..."', async () => {
      const engine = await toUfficioConBadile();
      await run(engine, 'scava macerie');
      const r = await run(engine, 'scava macerie');
      expect(r.message).toBe('Scava, scava, scava...');
    });

    it('TB-05: esamina bastone senza averlo, poi con il bastone in mano', async () => {
      const engine = await toUfficioConBadile();
      const senza = await run(engine, 'esamina bastone');
      expect(senza.message).toBe('Senza prenderlo è difficile.');

      await run(engine, 'scava macerie');
      await run(engine, 'prendi bastone');
      const conBastone = await run(engine, 'esamina bastone');
      expect(conBastone.message).toContain('UXRWD LO VHGLOH');
    });
  });

  describe('R7 — quadro prendibile', () => {
    it('TB-06: inventario non pieno, prendi quadro scopre la cassaforte e lo prende; +2 e +3 come sposta quadro', async () => {
      const engine = await toBibliotecaInventarioLibero();
      const punteggioBefore = engine.getGameState().punteggio.totale;

      const r = await run(engine, 'prendi quadro');
      expect(r.message).toContain('Prendi il quadro. Scopri che il quadro copre una cassaforte a muro.');

      const state = engine.getGameState();
      const quadro = state.Oggetti.find((o: { ID: number }) => o.ID === 33);
      const cassaforte = state.Oggetti.find((o: { ID: number }) => o.ID === 25);
      expect(quadro.IDLuogo).toBe(0);
      expect(cassaforte.Attivo).toBe(1);
      expect(state.punteggio.totale).toBe(punteggioBefore + 5); // +2 (sposta_quadro_24) + 3 (mistero)
      expect(state.punteggio.interazioniPunteggio.has('sposta_quadro_24')).toBe(true);
    });

    it('TB-07: inventario pieno (5 oggetti), prendi quadro risponde con il limite; cassaforte resta nascosta', async () => {
      const engine = await toBibliotecaInventarioPieno();
      const punteggioBefore = engine.getGameState().punteggio.totale;

      const r = await run(engine, 'prendi quadro');
      expect(r.message).toBe("Non puoi trasportare più di 5 oggetti.");

      const state = engine.getGameState();
      const quadro = state.Oggetti.find((o: { ID: number }) => o.ID === 33);
      const cassaforte = state.Oggetti.find((o: { ID: number }) => o.ID === 25);
      expect(quadro.IDLuogo).toBe(24);
      expect(cassaforte.Attivo).toBe(0);
      expect(state.punteggio.totale).toBe(punteggioBefore);
    });

    it('TB-08: sposta quadro poi prendi quadro: cassaforte scoperta una volta, +5 in totale', async () => {
      const engine = await toBibliotecaInventarioLibero();
      const punteggioBefore = engine.getGameState().punteggio.totale;

      const rSposta = await run(engine, 'sposta quadro');
      expect(rSposta.message).toContain('Sposti il quadro polveroso');

      const rPrendi = await run(engine, 'prendi quadro');
      expect(rPrendi.message).toMatch(/Hai preso/i); // prendi generico, non il testo dedicato

      const state = engine.getGameState();
      const quadro = state.Oggetti.find((o: { ID: number }) => o.ID === 33);
      expect(quadro.IDLuogo).toBe(0);
      expect(state.punteggio.totale).toBe(punteggioBefore + 5);
    });

    it('TB-09: prendi quadro, posa quadro, prendi quadro: nessun punto aggiuntivo', async () => {
      const engine = await toBibliotecaInventarioLibero();
      await run(engine, 'prendi quadro');
      const punteggioDopoPrimaPresa = engine.getGameState().punteggio.totale;

      const rPosa = await run(engine, 'posa quadro');
      expect(rPosa.message).toMatch(/Hai posato/i);
      expect(engine.getGameState().Oggetti.find((o: { ID: number }) => o.ID === 33).IDLuogo).toBe(24);

      const rPrendi2 = await run(engine, 'prendi quadro');
      expect(rPrendi2.message).toMatch(/Hai preso/i);
      expect(engine.getGameState().Oggetti.find((o: { ID: number }) => o.ID === 33).IDLuogo).toBe(0);
      expect(engine.getGameState().punteggio.totale).toBe(punteggioDopoPrimaPresa);
    });
  });

  describe('R7 — schema', () => {
    it('TB-10: punteggio e INVENTARIO_NON_PIENO sono ammessi; un punteggio con id inesistente è segnalato', () => {
      expect(INTERACTION_TOP_LEVEL_KEYS.has('punteggio')).toBe(true);
      expect(PREREQUISITE_TYPES.has('INVENTARIO_NON_PIENO')).toBe(true);

      const record = (id: string, punteggio?: string | false) => ({
        id,
        IDLingua: 1,
        trigger: { verbo: 'ESAMINARE', oggetto: id.toUpperCase() },
        condizioni: { luogo: null, prerequisiti: [{ tipo: 'INVENTARIO_NON_PIENO' }] },
        risposta: 'ok',
        effetti: [],
        ripetibile: true,
        ...(punteggio !== undefined ? { punteggio } : {}),
      });

      const valid = validateInterazioni([record('a'), record('b', 'a'), record('c', false)]);
      expect(valid).toEqual([]);

      const invalid = validateInterazioni([record('a'), record('b', 'id_inesistente')]);
      expect(invalid.some((e) => e.includes('punteggio'))).toBe(true);
    });
  });

  describe('Compatibilità dei salvataggi', () => {
    it('default dei flag: cassaforteScoperta = true se interazioniEseguite contiene sposta_quadro_24', () => {
      const source = newEngine();
      const snapshot = JSON.parse(JSON.stringify(source.getGameStateSnapshot())) as Record<string, unknown> & {
        interazioniEseguite: string[];
      };
      delete (snapshot as { flags?: unknown }).flags;
      snapshot.interazioniEseguite = [...snapshot.interazioniEseguite, 'sposta_quadro_24'];

      const engine = newEngine();
      engine.setGameState(snapshot);
      const state = engine.getGameState();
      expect(state.flags.cassaforteScoperta).toBe(true);
      expect(state.flags.bastoneLiberato).toBe(false); // Bastone ancora Attivo=1, non deducibile
    });

    it('default dei flag: bastoneLiberato = true se il Bastone di comando ha Attivo >= 3 (salvataggi v1.4.0)', () => {
      const source = newEngine();
      const snapshot = JSON.parse(JSON.stringify(source.getGameStateSnapshot())) as Record<string, unknown> & {
        Oggetti: Array<{ ID: number; Attivo: number }>;
      };
      delete (snapshot as { flags?: unknown }).flags;
      const bastone = snapshot.Oggetti.find((o) => o.ID === 1);
      expect(bastone).toBeDefined();
      (bastone as { Attivo: number }).Attivo = 3; // come nei salvataggi v1.4.0, dove era prendibile

      const engine = newEngine();
      engine.setGameState(snapshot);
      const state = engine.getGameState();
      expect(state.flags.bastoneLiberato).toBe(true);
      expect(state.flags.cassaforteScoperta).toBe(false);
    });
  });

  describe('EN', () => {
    it('TB-11: TB-01 in inglese', async () => {
      const engine = await toUfficioConBadile(2);
      const punteggioBefore = engine.getGameState().punteggio.totale;

      const r = await run(engine, 'take baton');
      expect(r.message).toBe('The rubble is in the way.');
      const bastone = engine.getGameState().Oggetti.find((o: { ID: number }) => o.ID === 1);
      expect(bastone.IDLuogo).toBe(11);
      expect(engine.getGameState().punteggio.totale).toBe(punteggioBefore);
    });

    it('TB-11: TB-06 in inglese', async () => {
      const engine = await toBibliotecaInventarioLibero(2);
      const punteggioBefore = engine.getGameState().punteggio.totale;

      const r = await run(engine, 'take painting');
      expect(r.message).toContain('You take the painting. You discover that it was hiding a wall safe.');

      const state = engine.getGameState();
      const painting = state.Oggetti.find((o: { ID: number }) => o.ID === 33);
      expect(painting.IDLuogo).toBe(0);
      expect(state.punteggio.totale).toBe(punteggioBefore + 5);
    });
  });
});
