/**
 * Timer e sequenza finale dell'originale (#107, #97)
 * Specifica: docs/20261015 - TD Timer e sequenza finale - v1.0.md, §6.2 (TB-01…TB-20).
 *
 * Motore e parser reali (parseCommand + executeCommand). Per arrivare alla zona aperta o
 * alla barriera si eseguono i passi del percorso completo di riferimento
 * (tests/fixtures/walkthrough/), mai scorciatoie sullo stato durante la verifica.
 */

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initOdessa } from '../src/initOdessa.js';
import { createEngine } from '../src/logic/engine.js';
import { ensureVocabulary, parseCommand } from '../src/logic/parser.js';
import { getSystemMessage } from '../src/logic/systemMessages.js';

type Engine = ReturnType<typeof createEngine>;

interface Step {
  step: number;
  command: string;
  resultType: string;
  location: number;
}

const root = resolve(__dirname, '..');
const loadJson = (...parts: string[]) => JSON.parse(readFileSync(resolve(root, ...parts), 'utf8'));
const walkthrough = (name: string): { steps: Step[] } => loadJson('tests', 'fixtures', 'walkthrough', `${name}.json`);

const ENV_KEY = 'GAME_MAX_TURNS_CONSUMED';
const OPEN_AREA = [51, 52, 53, 55, 56, 58];

const msg = (key: string, lingua = 1) => getSystemMessage(key, lingua);

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

async function runAll(engine: Engine, commands: string[]) {
  const results = [];
  for (const command of commands) results.push(await run(engine, command));
  return results;
}

/** Partita nuova portata al passo indicato del percorso completo (IT o EN). */
async function upTo(step: number, lingua = 1): Promise<Engine> {
  const engine = newEngine(lingua);
  const { steps } = walkthrough(lingua === 1 ? 'full_it' : 'full_en');
  for (const s of steps.filter((x) => x.step <= step)) await run(engine, s.command);
  return engine;
}

// Passi del percorso completo usati come punti di partenza
const AT_OPEN_AREA = 109;   // primo arrivo nella zona (luogo 51)
const AT_52 = 110;          // arrivo al luogo 52 (filo spinato, uscita Est assente)
const BEFORE_DOCS = 144;    // reception, Documenti non ancora ripresi
const AT_BARRIER = 146;     // incontro con Ferenc e arrivo alla barriera (TELEPORT)

describe('timer e sequenza finale dell\'originale (#107)', () => {
  beforeAll(async () => {
    await initOdessa();
    await ensureVocabulary();
  });

  afterEach(() => {
    delete process.env[ENV_KEY];
  });

  it('i punti di partenza dei percorsi sono quelli attesi', async () => {
    const steps = walkthrough('full_it').steps;
    const at = (n: number) => steps.find((s) => s.step === n) as Step;
    expect(at(AT_OPEN_AREA).location).toBe(51);
    expect(at(AT_52).location).toBe(52);
    expect(at(BEFORE_DOCS).location).toBe(2);
    expect(at(AT_BARRIER).resultType).toBe('TELEPORT');
  });

  describe('R1 — buio', () => {
    it('TB-01: torcia posata, azione al buio, posa consentita, movimento fatale', async () => {
      const engine = newEngine();
      const [r1, r2, r3, r4] = await runAll(engine, ['posa torcia', 'esamina documenti', 'posa fiammiferi', 'e']);

      expect(r1.message).toContain(msg('timer.torch.defective.warning'));
      expect(r1.message).not.toContain(msg('timer.darkness.warning'));

      expect(r2.message).toContain(msg('engine.dark.tooDark'));
      expect(r2.message).toContain(msg('timer.darkness.warning'));

      expect(r3.message).not.toContain(msg('engine.dark.tooDark'));
      expect(r3.message).toContain(msg('timer.darkness.warning'));
      const fiammiferi = engine.getGameState().Oggetti.find((o: { ID: number }) => o.ID === 36);
      expect(fiammiferi.IDLuogo).toBe(1);

      expect(r4.resultType).toBe('GAME_OVER');
      expect(r4.gameOverReason).toBe('DARKNESS');
      expect(r4.message).toBe(msg('timer.darkness.death'));
    });

    it('TB-01 (timer): al primo turno senza luce il timer vale 3', async () => {
      const engine = newEngine();
      await run(engine, 'posa torcia');
      expect(engine.getGameState().turn.darknessTimer).toBe(3);
    });

    it('TB-02: allo scadere senza movimento il timer riparte da 3; muore al movimento con timer a 0', async () => {
      const engine = newEngine();
      const results = [];
      const timers: number[] = [];
      for (const c of ['posa torcia', 'esamina documenti', 'esamina documenti', 'esamina documenti', 'e', 'n', 's']) {
        results.push(await run(engine, c));
        timers.push(engine.getGameState().turn.darknessTimer);
      }
      // Al 4° comando il timer arriva a 0 senza movimento e riparte da 3
      expect(timers).toEqual([3, 2, 1, 3, 2, 1, 0]);
      expect(results.slice(0, 6).every((r) => r.resultType !== 'GAME_OVER')).toBe(true);
      expect(results[6].gameOverReason).toBe('DARKNESS');
    });

    it('TB-03: un movimento rifiutato allo scadere del timer è fatale', async () => {
      const engine = newEngine();
      await runAll(engine, ['posa torcia', 'esamina documenti', 'esamina documenti']);
      expect(engine.getGameState().turn.darknessTimer).toBe(1);

      const r = await run(engine, 'n'); // Dall'atrio non c'è uscita a nord
      expect(engine.getGameState().currentLocationId).toBe(1);
      expect(r.resultType).toBe('GAME_OVER');
      expect(r.gameOverReason).toBe('DARKNESS');
    });

    it('TB-04: ritrovata la luce il timer si azzera', async () => {
      const engine = newEngine();
      await runAll(engine, ['e', 'n', 'prendi lampada', 'posa torcia', 'esamina documenti']);
      expect(engine.getGameState().turn.darknessTimer).toBe(2);

      const lit = await run(engine, 'accendi lampada'); // Consentito al buio
      expect(lit.message).not.toContain(msg('engine.dark.tooDark'));
      expect(engine.getGameState().timers.lampadaAccesa).toBe(true);
      expect(engine.getGameState().turn.darknessTimer).toBe(0);

      const moves = await runAll(engine, ['s', 'o', 'e']);
      expect(moves.every((r) => r.resultType !== 'GAME_OVER')).toBe(true);
      expect(engine.getGameState().turn.darknessTimer).toBe(0);
    });

    it('TB-05: al buio posa, accendi e inventario non rispondono "troppo buio"', async () => {
      const engine = newEngine();
      await run(engine, 'posa torcia');
      const tooDark = msg('engine.dark.tooDark');
      for (const command of ['posa fiammiferi', 'accendi lampada', 'inventario']) {
        const r = await run(engine, command);
        expect(r.message, command).not.toContain(tooDark);
      }
    });
  });

  describe('R2 — zona aperta', () => {
    it('TB-06: muovendosi sempre (51 → 52 → 51 → 55 → 57) avviso nella zona e nessuna morte', async () => {
      const engine = await upTo(AT_OPEN_AREA);
      const warning = msg('timer.openArea.warning');
      const results = await runAll(engine, ['n', 's', 'e', 'n']);
      const locations = [52, 51, 55, 57];

      results.forEach((r, i) => {
        expect(r.resultType).not.toBe('GAME_OVER');
        if (OPEN_AREA.includes(locations[i])) expect(r.message).toContain(warning);
        else expect(r.message ?? '').not.toContain(warning);
      });
      expect(engine.getGameState().currentLocationId).toBe(57);
      expect(engine.getGameState().turn.openAreaTimer).toBe(0);
    });

    it('TB-07: entrando e fermandosi, avviso al primo comando fermo e morte al secondo', async () => {
      const engine = await upTo(AT_OPEN_AREA);
      const [r1, r2] = await runAll(engine, ['guarda', 'guarda']);

      expect(r1.resultType).not.toBe('GAME_OVER');
      expect(r1.message).toContain(msg('timer.openArea.warning'));

      expect(r2.resultType).toBe('GAME_OVER');
      expect(r2.gameOverReason).toBe('INTERCEPT');
      expect(r2.message).toBe(msg('game.intercept.death'));
      expect(r2.message).toContain('Sei stato scorto da una ronda russa che ti arresta come spia.');
    });

    it('TB-08: un movimento rifiutato conta come comando fermo', async () => {
      const engine = await upTo(AT_52);
      const [r1, r2] = await runAll(engine, ['e', 'esamina documenti']);

      expect(engine.getGameState().currentLocationId).toBe(52);
      expect(r1.resultType).not.toBe('GAME_OVER');
      expect(r2.gameOverReason).toBe('INTERCEPT');
    });

    it('TB-09: uscendo dalla zona il timer si azzera', async () => {
      const engine = await upTo(AT_OPEN_AREA);
      const results = await runAll(engine, ['guarda', 'o', 'e', 'guarda']);

      expect(results.every((r) => r.resultType !== 'GAME_OVER')).toBe(true);
      expect(engine.getGameState().currentLocationId).toBe(51);
      expect(engine.getGameState().turn.openAreaTimer).toBe(1);
    });
  });

  describe('R3 — alba', () => {
    it('TB-10: con limite 40, avvisi ai turni 10, 25, 35 e morte "in casa" al 40°', async () => {
      process.env[ENV_KEY] = '40';
      const engine = newEngine();
      const warnings: Record<number, string> = {
        10: msg('timer.dawn.warning30'),
        25: msg('timer.dawn.warning15'),
        35: msg('timer.dawn.warning5'),
      };
      const allWarnings = Object.values(warnings);

      for (let turn = 1; turn <= 40; turn++) {
        const r = await run(engine, 'guarda');
        expect(engine.getGameState().turn.totalTurnsConsumed).toBe(turn);
        if (turn === 40) {
          expect(r.resultType).toBe('GAME_OVER');
          expect(r.gameOverReason).toBe('TOO_LATE');
          expect(r.message).toBe(msg('timer.dawn.death.house'));
        } else {
          expect(r.resultType, `turno ${turn}`).not.toBe('GAME_OVER');
          for (const w of allWarnings) {
            if (w === warnings[turn]) expect(r.message, `turno ${turn}`).toContain(w);
            else expect(r.message, `turno ${turn}`).not.toContain(w);
          }
        }
      }
    });

    it('TB-11: allo scadere nella zona aperta il testo è quello "all\'aperto"', async () => {
      const engine = await upTo(AT_OPEN_AREA);
      process.env[ENV_KEY] = String(engine.getGameState().turn.totalTurnsConsumed + 1);

      const r = await run(engine, 'n'); // 51 → 52, sempre nella zona
      expect(engine.getGameState().currentLocationId).toBe(52);
      expect(r.gameOverReason).toBe('TOO_LATE');
      expect(r.message).toBe(msg('timer.dawn.death.outdoor'));
    });

    it('TB-12: dopo l\'incontro con Ferenc l\'alba è ferma', async () => {
      const engine = await upTo(AT_BARRIER);
      process.env[ENV_KEY] = '10'; // Limite già superato
      const results = await runAll(engine, ['guarda', 'guarda', 'guarda']);
      expect(results.every((r) => r.gameOverReason !== 'TOO_LATE' && r.resultType !== 'GAME_OVER')).toBe(true);
    });
  });

  describe('R4 e R11 — Ferenc e barriera', () => {
    it('TB-13: cinque comandi senza porgere i documenti, avvisi al 2°, 3°, 4° e arresto al 5°', async () => {
      const engine = await upTo(AT_BARRIER);
      const results = await runAll(engine, ['esamina documenti', 'guarda', 'esamina documenti', 'guarda', 'esamina documenti']);
      const w = [msg('timer.guard.warning1'), msg('timer.guard.warning2'), msg('timer.guard.warning3')];

      for (const text of w) expect(results[0].message).not.toContain(text);
      expect(results[1].message).toContain(w[0]);
      expect(results[2].message).toContain(w[1]);
      expect(results[3].message).toContain(w[2]);
      expect(results.slice(0, 4).every((r) => r.resultType !== 'GAME_OVER')).toBe(true);

      expect(results[4].resultType).toBe('GAME_OVER');
      expect(results[4].gameOverReason).toBe('GUARD_ARREST');
      expect(results[4].message).toBe(msg('timer.guard.arrest'));
    });

    it('TB-13 (sistema): i comandi di sistema non contano per la guardia', async () => {
      const engine = await upTo(AT_BARRIER);
      await runAll(engine, ['guarda', 'inventario', 'inventario']);
      expect(engine.getGameState().guardTimer).toBe(4);
    });

    it('TB-14: il movimento bloccato conta: arresto al 5° movimento', async () => {
      const engine = await upTo(AT_BARRIER);
      const results = await runAll(engine, ['n', 'n', 'n', 'n', 'n']);

      results.slice(0, 4).forEach((r) => {
        expect(r.resultType).toBe('ERROR');
        expect(r.message).toContain(msg('narrative.movement.blocked'));
      });
      expect(results[1].message).toContain(msg('timer.guard.warning1'));
      expect(results[4].gameOverReason).toBe('GUARD_ARREST');
    });

    it('TB-15: porgendo i documenti al 4° comando si vince, senza arresto', async () => {
      const engine = await upTo(AT_BARRIER);
      const results = await runAll(engine, ['guarda', 'n', 'esamina documenti', 'porgi documenti']);
      const state = engine.getGameState();

      expect(results.every((r) => r.resultType !== 'GAME_OVER')).toBe(true);
      expect(state.victory).toBe(true);
      expect(state.ended).toBe(true);
      expect(results[3].message).not.toContain(msg('timer.guard.warning3'));
    });

    it('TB-16: Ferenc senza documenti in inventario: porgi documenti non vince, arresto al 5° (#97)', async () => {
      const engine = await upTo(BEFORE_DOCS);
      const teleport = await run(engine, 'o');
      expect(teleport.resultType).toBe('TELEPORT');

      const state = engine.getGameState();
      expect(state.Oggetti.filter((o: { IDLuogo: number }) => o.IDLuogo === 0)).toHaveLength(0);

      const results = await runAll(engine, ['porgi documenti', 'guarda', 'guarda', 'guarda', 'guarda']);
      expect(state.victory).toBe(false);
      expect(results.slice(0, 4).every((r) => r.resultType !== 'GAME_OVER')).toBe(true);
      expect(results[4].gameOverReason).toBe('GUARD_ARREST');
    });

    it('TB-17: Ferenc rimuove gli oggetti, lascia solo i Documenti in inventario; luce al 59', async () => {
      const engine = await upTo(AT_BARRIER);
      const state = engine.getGameState();
      const oggetti = state.Oggetti as Array<{ ID: number; IDLuogo: number; Attivo: number }>;

      expect(state.currentLocationId).toBe(59);
      expect(oggetti.filter((o) => o.IDLuogo === 0).map((o) => o.ID)).toEqual([35]);
      for (const id of [27, 37]) expect(oggetti.find((o) => o.ID === id)?.IDLuogo).toBe(-1); // lampada, torcia
      expect(oggetti.filter((o) => o.ID !== 35).every((o) => o.IDLuogo === -1 && o.Attivo === 0)).toBe(true);
      expect(state.timers.lampadaAccesa).toBe(false);
      expect(state.guardTimer).toBe(5);
      expect(engine.hasFonteLuceAttiva()).toBe(true);
    });

    it('TB-17 (testo): il testo dell\'incontro con Ferenc è quello originale', async () => {
      const engine = await upTo(AT_BARRIER - 1);
      const r = await run(engine, 'o');
      expect(r.resultType).toBe('TELEPORT');
      expect(r.message).toBe(msg('victory.phase1a'));
      expect(r.message.startsWith('Da un angolo sbuca Ferenc.')).toBe(true);
    });
  });

  describe('R12 — testi', () => {
    const NEW_KEYS = [
      'engine.dark.tooDark', 'timer.darkness.warning', 'timer.darkness.death', 'timer.openArea.warning',
      'game.intercept.death', 'timer.dawn.warning30', 'timer.dawn.warning15', 'timer.dawn.warning5',
      'timer.dawn.death.house', 'timer.dawn.death.outdoor', 'timer.guard.warning1', 'timer.guard.warning2',
      'timer.guard.warning3', 'timer.guard.arrest', 'victory.phase1a',
    ];
    const REMOVED_KEYS = ['game.over.guardia_sospetta', 'game.over.tooLate', 'narrative.command.useless'];

    it('TB-18: chiavi del §5 presenti in IT ed EN, chiavi rimosse assenti, descrizioni della zona senza la frase', () => {
      const messaggi = loadJson('src', 'data-internal', 'MessaggiSistema.json') as Array<{ Chiave: string; IDLingua: number; Messaggio: string }>;
      for (const key of NEW_KEYS) {
        for (const lingua of [1, 2]) {
          const found = messaggi.filter((m) => m.Chiave === key && m.IDLingua === lingua);
          expect(found, `${key} / ${lingua}`).toHaveLength(1);
          expect(found[0].Messaggio.trim(), `${key} / ${lingua}`).not.toBe('');
        }
      }
      for (const key of REMOVED_KEYS) {
        expect(messaggi.some((m) => m.Chiave === key), key).toBe(false);
      }

      const luoghi = loadJson('src', 'data-internal', 'Luoghi.json') as Array<{ ID: number; Descrizione: string }>;
      for (const l of luoghi.filter((x) => OPEN_AREA.includes(x.ID))) {
        expect(l.Descrizione).not.toContain("Restare a lungo fermi in un posto all'aperto");
        expect(l.Descrizione).not.toContain('Standing still for too long in an open area');
      }
    });
  });

  describe('Salvataggi', () => {
    it('TB-19: un salvataggio v1.4.0 senza i nuovi campi riceve i default e la partita prosegue', async () => {
      const save = loadJson('tests', 'fixtures', 'walkthrough', 'save_v140_full_it_step91.json');
      expect(save.gameState.turn.darknessTimer).toBeUndefined();
      expect(save.gameState.guardTimer).toBeUndefined();

      const engine = newEngine();
      engine.setGameState(save.gameState);
      const state = engine.getGameState();
      expect(state.turn.darknessTimer).toBe(0);
      expect(state.turn.openAreaTimer).toBe(0);
      expect(state.turn.movedThisTurn).toBe(false);
      expect(state.guardTimer).toBe(0);
      expect('unusefulCommandsCounter' in state).toBe(false);

      const next = walkthrough('full_it').steps.find((s) => s.step === 92) as Step;
      const r = await run(engine, next.command);
      expect(r.resultType).toBe(next.resultType);
      expect(engine.getGameState().currentLocationId).toBe(next.location);
    });

    it('TB-19 (barriera): un salvataggio alla barriera senza guardTimer riparte da 5', async () => {
      const original = await upTo(AT_BARRIER);
      const snapshot = original.getGameStateSnapshot() as Record<string, unknown> & { turn: Record<string, unknown> };
      delete snapshot.guardTimer;
      delete snapshot.turn.darknessTimer;
      delete snapshot.turn.openAreaTimer;
      delete snapshot.turn.movedThisTurn;
      snapshot.unusefulCommandsCounter = 2; // Campo v1.4.0, ignorato

      const engine = newEngine();
      engine.setGameState(JSON.parse(JSON.stringify(snapshot)));
      expect(engine.getGameState().guardTimer).toBe(5);
      expect('unusefulCommandsCounter' in engine.getGameState()).toBe(false);

      const results = await runAll(engine, ['guarda', 'guarda', 'guarda', 'guarda', 'guarda']);
      expect(results[4].gameOverReason).toBe('GUARD_ARREST');
    });
  });

  describe('EN', () => {
    it('TB-20: TB-07 in inglese', async () => {
      const engine = await upTo(AT_OPEN_AREA, 2);
      expect(engine.getGameState().currentLocationId).toBe(51);
      const [r1, r2] = await runAll(engine, ['examine documents', 'examine documents']);

      expect(r1.message).toContain(msg('timer.openArea.warning', 2));
      expect(r1.message).toContain('Standing still for too long in an open area can be dangerous.');
      expect(r2.gameOverReason).toBe('INTERCEPT');
      expect(r2.message).toBe(msg('game.intercept.death', 2));
      expect(r2.message).toContain('You have been spotted by a Russian patrol');
    });

    it('TB-20: TB-13 in inglese', async () => {
      const engine = await upTo(AT_BARRIER, 2);
      const results = await runAll(engine, ['examine documents', 'examine documents', 'examine documents', 'examine documents', 'examine documents']);

      expect(results[1].message).toContain(msg('timer.guard.warning1', 2));
      expect(results[2].message).toContain(msg('timer.guard.warning2', 2));
      expect(results[3].message).toContain(msg('timer.guard.warning3', 2));
      expect(results[4].gameOverReason).toBe('GUARD_ARREST');
      expect(results[4].message).toBe(msg('timer.guard.arrest', 2));
      expect(results[4].message).toContain('💀 ARRESTED');
    });
  });
});
