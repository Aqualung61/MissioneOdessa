/**
 * Fiammiferi dell'originale (#108)
 * Specifica: docs/20261015 - TD Fiammiferi - v1.0.md, §6.2 (TB-01…TB-12).
 *
 * Motore e parser reali (parseCommand + executeCommand). Per gli scenari si giocano i
 * comandi; nessuna modifica a mano dello stato, salvo `setGameState` in TB-09.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initOdessa } from '../src/initOdessa.js';
import { createEngine } from '../src/logic/engine.js';
import { ensureVocabulary, parseCommand } from '../src/logic/parser.js';
import { getSystemMessage } from '../src/logic/systemMessages.js';
import { INTERACTION_TOP_LEVEL_KEYS, EFFECT_TYPES } from '../src/logic/interactionSchema.js';

type Engine = ReturnType<typeof createEngine>;

const root = resolve(__dirname, '..');
const loadJson = (...parts: string[]) => JSON.parse(readFileSync(resolve(root, ...parts), 'utf8'));
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

describe('fiammiferi dell\'originale (#108)', () => {
  beforeAll(async () => {
    await initOdessa();
    await ensureVocabulary();
  });

  it('TB-01: partita nuova', () => {
    const engine = newEngine();
    const state = engine.getGameState();
    expect(state.timers.matchesLeft).toBe(6);
    expect(state.timers.matchTimer).toBe(0);
  });

  it('TB-02: accensione, luce per il comando successivo, poi si spegne', async () => {
    const engine = newEngine();

    const r1 = await run(engine, 'posa torcia');
    expect(r1.message).toContain(msg('timer.torch.defective.warning'));

    const r2 = await run(engine, 'accendi fiammifero');
    expect(r2.message).toBe(msg('engine.matches.lit'));
    expect(r2.message).not.toContain(msg('timer.darkness.warning'));
    expect(engine.getGameState().turn.darknessTimer).toBe(0);

    const r3 = await run(engine, 'esamina documenti');
    expect(r3.message).not.toContain(msg('engine.dark.tooDark'));
    expect(r3.message).toContain(msg('engine.matches.out'));
    expect(r3.message).toContain(msg('timer.darkness.warning'));

    const r4 = await run(engine, 'guarda');
    expect(r4.message).toContain(msg('engine.dark.tooDark'));
    expect(r4.resultType).not.toBe('GAME_OVER');
  });

  it('TB-03: il fiammifero salva dal buio', async () => {
    const engine = newEngine();
    const results = await runAll(engine, ['posa torcia', 'esamina documenti', 'accendi fiammifero', 'e', 'o']);
    expect(results.every((r) => r.resultType !== 'GAME_OVER')).toBe(true);
  });

  it('TB-04: sei accensioni esauriscono la scorta', async () => {
    const engine = newEngine();
    const results = await runAll(engine, Array(7).fill('accendi fiammifero'));
    const state = engine.getGameState();

    for (let i = 0; i < 5; i++) {
      expect(results[i].message, `accensione ${i + 1}`).not.toContain(msg('engine.matches.finished'));
    }
    expect(results[5].message).toContain(msg('engine.matches.lit'));
    expect(results[5].message).toContain(msg('engine.matches.finished'));

    const fiammiferi = state.Oggetti.find((o: { ID: number }) => o.ID === 36);
    expect(fiammiferi.IDLuogo).toBe(-1);
    expect(fiammiferi.Attivo).toBe(0);
    expect(state.timers.matchesLeft).toBe(0);

    // Il fiammifero acceso dalla 6ª accensione si spegne durante questo turno (indipendente
    // dall'esito del comando): il testo si accoda a "Non hai fiammiferi.".
    expect(results[6].message).toContain(msg('engine.matches.none'));
    expect(results[6].resultType).not.toBe('GAME_OVER');
  });

  it('TB-05: la lampada con l\'ultimo fiammifero lo consuma e lo esaurisce', async () => {
    const engine = newEngine();
    const commands = ['e', 'n', 'prendi lampada', ...Array(5).fill('accendi fiammifero'), 'accendi lampada'];
    const results = await runAll(engine, commands);
    const state = engine.getGameState();

    expect(state.timers.lampadaAccesa).toBe(true);
    expect(results.at(-1)?.message).toContain(msg('engine.matches.finished'));
    const fiammiferi = state.Oggetti.find((o: { ID: number }) => o.ID === 36);
    expect(fiammiferi.IDLuogo).toBe(-1);
  });

  it('TB-06: la lampada senza fiammiferi risponde con il testo dedicato', async () => {
    const engine = newEngine();
    const commands = ['e', 'n', 'prendi lampada', ...Array(6).fill('accendi fiammifero'), 'accendi lampada'];
    const results = await runAll(engine, commands);

    // Il fiammifero acceso dalla 6ª accensione può ancora spegnersi in questo turno (indipendente)
    expect(results.at(-1)?.message).toContain('Non hai i fiammiferi per accendere la lampada.');
    expect(engine.getGameState().timers.lampadaAccesa).toBe(false);
  });

  it('TB-07: la lampada lasciata accesa con un fiammifero acceso non muore subito', async () => {
    const engine = newEngine();
    // Si prende e si accende la lampada PRIMA di posare la torcia, altrimenti il buio
    // bloccherebbe PRENDERE.
    await runAll(engine, ['e', 'n', 'prendi lampada', 'accendi lampada', 'posa torcia', 'posa lampada', 'accendi fiammifero']);

    const sMove = await run(engine, 's'); // 6 -> 2: il fiammifero si spegne in questo turno
    expect(sMove.resultType).not.toBe('GAME_OVER'); // matchLitAtStart evita LAMP_ABANDONED
    expect(sMove.message).toContain(msg('engine.matches.out'));
    expect(sMove.message).toContain(msg('timer.darkness.warning'));

    const blocked = await run(engine, 'esamina documenti'); // ora al buio: azione bloccata
    expect(blocked.message).toContain(msg('engine.dark.tooDark'));

    const back = await run(engine, 'n'); // 2 -> 6: la luce della lampada torna
    expect(back.resultType).not.toBe('GAME_OVER');
    expect(engine.getGameState().turn.current.hasLight).toBe(true);
  });

  it('TB-07: senza fiammifero acceso, lasciare la lampada accesa è morte immediata (invariato)', async () => {
    const engine = newEngine();
    const results = await runAll(engine, ['e', 'n', 'prendi lampada', 'accendi lampada', 'posa torcia', 'posa lampada']);
    expect(results.every((r) => r.resultType !== 'GAME_OVER')).toBe(true);

    const sMove = await run(engine, 's'); // 6 -> 2, senza fiammifero: nessuna fonte di luce resta
    expect(sMove.resultType).toBe('GAME_OVER');
    expect(sMove.gameOverReason).toBe('LAMP_ABANDONED');
  });

  it('TB-08: lessico, singolare e plurale, IT ed EN', async () => {
    const it1 = newEngine(1);
    for (const command of ['accendi fiammifero', 'accendi fiammiferi']) {
      const r = await run(it1, command);
      expect(r.resultType, command).not.toBe('ERROR');
      expect([msg('engine.matches.lit'), msg('engine.matches.none')]).toContain(r.message.split('\n')[0]);
    }

    const en = newEngine(2);
    for (const command of ['light match', 'light matches']) {
      const r = await run(en, command);
      expect(r.resultType, command).not.toBe('ERROR');
      expect([msg('engine.matches.lit', 2), msg('engine.matches.none', 2)]).toContain(r.message.split('\n')[0]);
    }
  });

  it('TB-09: un salvataggio v1.4.0 riceve i default e il passo successivo si esegue', async () => {
    const save = loadJson('tests', 'fixtures', 'walkthrough', 'save_v140_full_it_step91.json');
    expect(save.gameState.timers.matchesLeft).toBeUndefined();
    expect(save.gameState.timers.matchTimer).toBeUndefined();

    const engine = newEngine();
    engine.setGameState(save.gameState);
    const state = engine.getGameState();
    expect(state.timers.matchesLeft).toBe(6);
    expect(state.timers.matchTimer).toBe(0);

    const next = loadJson('tests', 'fixtures', 'walkthrough', 'full_it.json').steps.find((s: { step: number }) => s.step === 92);
    const r = await run(engine, next.command);
    expect(r.resultType).toBe(next.resultType);
    expect(engine.getGameState().currentLocationId).toBe(next.location);
  });

  it('TB-10: i fiammiferi nel luogo funzionano; altrove no', async () => {
    const engine = newEngine();
    const [posa, qui] = await runAll(engine, ['posa fiammiferi', 'accendi fiammifero']);
    expect(posa.resultType).not.toBe('GAME_OVER');
    expect(qui.message).toBe(msg('engine.matches.lit'));

    const altrove = await runAll(engine, ['e', 'accendi fiammifero']);
    expect(altrove.at(-1)?.message).toBe(msg('engine.matches.none'));
  });

  it('TB-11: esaminare i fiammiferi (IT ed EN)', async () => {
    const it1 = newEngine(1);
    const rIt = await run(it1, 'esamina fiammiferi');
    expect(rIt.message).toBe('Sono dei semplici fiammiferi svedesi.');

    const en = newEngine(2);
    const rEn = await run(en, 'examine matches');
    expect(rEn.message).toBe('They are ordinary safety matches.');
  });

  it('TB-12: testi e schema', () => {
    const messaggi = loadJson('src', 'data-internal', 'MessaggiSistema.json') as Array<{ Chiave: string; IDLingua: number; Messaggio: string }>;
    for (const key of ['engine.matches.lit', 'engine.matches.finished', 'engine.matches.out', 'engine.matches.none']) {
      for (const lingua of [1, 2]) {
        const found = messaggi.filter((m) => m.Chiave === key && m.IDLingua === lingua);
        expect(found, `${key} / ${lingua}`).toHaveLength(1);
        expect(found[0].Messaggio.trim(), `${key} / ${lingua}`).not.toBe('');
      }
    }

    expect(EFFECT_TYPES.has('CONSUMA_FIAMMIFERO')).toBe(true);
    expect(INTERACTION_TOP_LEVEL_KEYS.has('effetti')).toBe(true);

    const interazioni = loadJson('src', 'data-internal', 'Interazioni.json') as Array<{ id: string; effetti: Array<{ tipo: string }> }>;
    const accendiLampada = interazioni.filter((i) => i.id === 'accendi_lampada');
    expect(accendiLampada).toHaveLength(2);
    for (const i of accendiLampada) {
      expect(i.effetti.some((e) => e.tipo === 'CONSUMA_FIAMMIFERO')).toBe(true);
    }
  });
});
