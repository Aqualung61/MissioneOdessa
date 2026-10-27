/**
 * Lessico L3: guardia, nomi, luoghi, movimento e preposizioni (#109)
 * Specifica: docs/20261016 - TD Lessico L3 nomi luoghi e guardia - v1.1.md, §4, §6.3.
 *
 * Motore e parser reali (parseCommand + executeCommand). Per i luoghi precisi si
 * giocano i passi dei percorsi di riferimento (full_it.json / full_en.json); nessuna
 * modifica a mano dello stato.
 *
 * Un caso per ogni riga di §4, in IT e in EN, più TC-01…TC-06 di §6.3. Include
 * esplicitamente i casi che i 7 punti dell'istantanea non raggiungono (4.3 manopola
 * con e senza cassaforte visibile; 4.5 macerie a 11, 32, 36; 4.8 porta del 44 chiusa
 * e aperta; 4.9 tinello prima e dopo lo scavo), e i 4 casi della correzione sulla parola
 * digitata, non la forma canonica, per i nomi senza oggetto).
 *
 * TC-06 coincide con i test di completamento e punteggio massimo, già coperti
 * integralmente dai test protetti (`tests/walkthrough.test.ts`, `tests/scoring.max.test.ts`):
 * basta un rimando, nessuna duplicazione.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initOdessa } from '../src/initOdessa.js';
import { createEngine } from '../src/logic/engine.js';
import { ensureVocabulary, parseCommand } from '../src/logic/parser.js';
import { getSystemMessage } from '../src/logic/systemMessages.js';

type Engine = ReturnType<typeof createEngine>;

const root = resolve(__dirname, '..');
const loadJson = (...parts: string[]) => JSON.parse(readFileSync(resolve(root, ...parts), 'utf8'));
const msg = (key: string, lingua = 1, args?: string[]) => getSystemMessage(key, lingua, args);

interface Step {
  step: number;
  command: string;
}

interface ParsedFields {
  IsValid: boolean;
  CommandType: string | null;
  VerbConcept: string | null;
  NounConcept: string | null;
  Error: string;
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

function walkthrough(lingua: number): Step[] {
  return loadJson('tests', 'fixtures', 'walkthrough', lingua === 1 ? 'full_it.json' : 'full_en.json').steps as Step[];
}

async function playUpTo(lingua: number, uptoStep: number): Promise<Engine> {
  const engine = newEngine(lingua);
  for (const s of walkthrough(lingua).filter((x) => x.step <= uptoStep)) await run(engine, s.command);
  return engine;
}

async function pickFields(command: string, lingua: number): Promise<ParsedFields> {
  const r = await parseCommand(null, command, { currentLingua: lingua });
  return { IsValid: r.IsValid, CommandType: r.CommandType, VerbConcept: r.VerbConcept, NounConcept: r.NounConcept, Error: r.Error };
}

describe("Lessico L3: guardia, nomi, luoghi, movimento e preposizioni (#109)", () => {
  beforeAll(async () => {
    await initOdessa();
    await ensureVocabulary();
  });

  it('4.1: esamina guardia/uomo, alla barriera (59)', async () => {
    for (const lingua of [1, 2]) {
      const esaminaGuardia = lingua === 1 ? 'esamina guardia' : 'examine guard';
      const esaminaUomo = lingua === 1 ? 'esamina uomo' : 'examine man';
      const engine = await playUpTo(lingua, 146);
      const r1 = await run(engine, esaminaGuardia);
      expect(r1.message, esaminaGuardia).toBe(msg('engine.examine.guard', lingua));
      const r2 = await run(await playUpTo(lingua, 146), esaminaUomo);
      expect(r2.message, esaminaUomo).toBe(msg('engine.examine.guard', lingua));
    }
  });

  it('4.2: attacca e sinonimi, con o senza nome, alla barriera (59) — morte GUARD_ATTACK', async () => {
    for (const lingua of [1, 2]) {
      const attacca = lingua === 1 ? 'attacca' : 'attack';
      const attaccaGuardia = lingua === 1 ? 'attacca guardia' : 'attack guard';
      const colpisci = lingua === 1 ? 'colpisci guardia' : 'hit guard';

      const engine1 = await playUpTo(lingua, 146);
      const r1 = await run(engine1, attacca);
      expect(r1.resultType, attacca).toBe('GAME_OVER');
      expect(r1.gameOverReason, attacca).toBe('GUARD_ATTACK');
      expect(r1.message, attacca).toBe(msg('engine.attack.guardStrikes', lingua));
      expect(engine1.getGameState().awaitingRestart, `${attacca}: richiesta di riavvio`).toBe(true);

      const r2 = await run(await playUpTo(lingua, 146), attaccaGuardia);
      expect(r2.resultType, attaccaGuardia).toBe('GAME_OVER');
      expect(r2.gameOverReason, attaccaGuardia).toBe('GUARD_ATTACK');

      const r3 = await run(await playUpTo(lingua, 146), colpisci);
      expect(r3.resultType, colpisci).toBe('GAME_OVER');
      expect(r3.gameOverReason, colpisci).toBe('GUARD_ATTACK');
    }
  });

  it('4.3 / E3: gira/ruota manopola, in biblioteca (24), solo con la cassaforte visibile', async () => {
    for (const lingua of [1, 2]) {
      const giraManopola = lingua === 1 ? 'gira manopola' : 'turn knob';

      // Prima di "sposta quadro"/"move painting" (passo 37): cassaforte non visibile.
      const senzaCassaforte = await run(await playUpTo(lingua, 36), giraManopola);
      expect(senzaCassaforte.message, `${giraManopola}, senza cassaforte visibile`).toBe(msg('engine.examine.objectNotHere', lingua, [lingua === 1 ? 'manopola' : 'knob']));

      // Dopo (passo 37): cassaforte visibile.
      const conCassaforte = await run(await playUpTo(lingua, 37), giraManopola);
      expect(conCassaforte.message, `${giraManopola}, con cassaforte visibile`).toBe(msg('engine.rotate.knobPoints', lingua));
    }
  });

  it('4.4 / E2: esamina oggetti scenici, ovunque, senza controllo di presenza', async () => {
    for (const lingua of [1, 2]) {
      const comandi = lingua === 1
        ? ['esamina filo spinato', 'esamina arredamento', 'esamina elevatore', 'esamina parete']
        : ['examine barbed wire', 'examine furniture', 'examine elevator', 'examine wall'];
      for (const comando of comandi) {
        const altrove = await run(newEngine(lingua), comando);
        expect(altrove.message, `${comando}, altrove`).toBe(msg('engine.examine.nothingSpecialOriginal', lingua));
        // Alla barriera (59): stessa risposta, nessun controllo di presenza.
        const allaBarriera = await run(await playUpTo(lingua, 146), comando);
        expect(allaBarriera.message, `${comando}, alla barriera`).toBe(msg('engine.examine.nothingSpecialOriginal', lingua));
      }
    }
  });

  it('4.5: esamina macerie, ai luoghi 11, 32, 36 (al 49 resta la descrizione dell\'oggetto)', async () => {
    for (const lingua of [1, 2]) {
      const esaminaMacerie = lingua === 1 ? 'esamina macerie' : 'examine rubble';

      const al11 = await run(await playUpTo(lingua, 14), esaminaMacerie);
      expect(al11.message, `${esaminaMacerie} al luogo 11`).toBe(msg('engine.examine.nothingSpecialOriginal', lingua));

      const al32 = await run(await playUpTo(lingua, 80), esaminaMacerie);
      expect(al32.message, `${esaminaMacerie} al luogo 32`).toBe(msg('engine.examine.nothingSpecialOriginal', lingua));

      const al36 = await run(await playUpTo(lingua, 81), esaminaMacerie);
      expect(al36.message, `${esaminaMacerie} al luogo 36`).toBe(msg('engine.examine.nothingSpecialOriginal', lingua));

      // Al 49 (prima dello scavo, passo 101): resta la descrizione esistente dell'oggetto, invariata.
      const al49 = await run(await playUpTo(lingua, 101), esaminaMacerie);
      expect(al49.message, `${esaminaMacerie} al luogo 49`).not.toBe(msg('engine.examine.nothingSpecialOriginal', lingua));
    }
  });

  it('4.6: esamina/guarda + nome di luogo, ovunque, come guarda da solo', async () => {
    for (const lingua of [1, 2]) {
      const guardaCucina = lingua === 1 ? 'guarda cucina' : 'look kitchen';
      const esaminaBiblioteca = lingua === 1 ? 'esamina biblioteca' : 'examine library';
      const guardaBareComando = lingua === 1 ? 'guarda' : 'look';

      const engine1 = newEngine(lingua);
      const [guardaSolo, guardaConLuogo] = [await run(engine1, guardaBareComando), await run(newEngine(lingua), guardaCucina)];
      expect(guardaConLuogo.message, guardaCucina).toBe(guardaSolo.message);

      const engine2 = await playUpTo(lingua, 37); // in biblioteca (24)
      const guardaSoloInBiblioteca = await run(await playUpTo(lingua, 37), guardaBareComando);
      const esaminaBibliotecaResult = await run(engine2, esaminaBiblioteca);
      expect(esaminaBibliotecaResult.message, esaminaBiblioteca).toBe(guardaSoloInBiblioteca.message);
    }
  });

  it('4.7: o/w, atrio (1) — non si può lasciare la casa', async () => {
    for (const lingua of [1, 2]) {
      const ovest = lingua === 1 ? 'o' : 'w';
      const r = await run(newEngine(lingua), ovest);
      expect(r.message, ovest).toBe(msg('engine.move.leaveHouseWest', lingua));
    }
  });

  it('4.8: e, passaggio (44) — porta chiusa, poi aperta dal pulsante', async () => {
    for (const lingua of [1, 2]) {
      const est = lingua === 1 ? 'e' : 'e';

      const chiusa = await run(await playUpTo(lingua, 94), est);
      expect(chiusa.message, `${est}, porta chiusa`).toBe(msg('engine.move.doorClosedPassage', lingua));

      const aperta = await run(await playUpTo(lingua, 95), est);
      expect(aperta.resultType, `${est}, porta aperta`).toBe('OK');
      expect(aperta.message, `${est}, porta aperta`).not.toBe(msg('engine.move.doorClosedPassage', lingua));
    }
  });

  it('4.9: o/w, tinello (49) — macerie, poi passaggio scavato', async () => {
    for (const lingua of [1, 2]) {
      const ovest = lingua === 1 ? 'o' : 'w';

      const primaDiScavare = await run(await playUpTo(lingua, 101), ovest);
      expect(primaDiScavare.message, `${ovest}, prima di scavare`).toBe(msg('engine.move.rubbleBlocksWest', lingua));

      const dopoScavare = await run(await playUpTo(lingua, 102), ovest);
      expect(dopoScavare.resultType, `${ovest}, dopo aver scavato`).toBe('OK');
      expect(dopoScavare.message, `${ovest}, dopo aver scavato`).not.toBe(msg('engine.move.rubbleBlocksWest', lingua));
    }
  });

  it('4.10 / R1: nei messaggi generici si mostra la parola effettivamente digitata, non la forma canonica', async () => {
    // I quattro casi esatti della correzione: un nome con sinonimo
    // alfabeticamente non minore (cucina/kitchen rispetto ad archivio/archive; uomo
    // rispetto a guardia; knob rispetto a dial) deve mostrare la parola digitata.
    const prendiCucina = await run(newEngine(1), 'prendi cucina');
    expect(prendiCucina.message).toBe(msg('engine.examine.objectNotHere', 1, ['cucina']));

    const takeKitchen = await run(newEngine(2), 'take kitchen');
    expect(takeKitchen.message).toBe(msg('engine.examine.objectNotHere', 2, ['kitchen']));

    const esaminaUomo = await run(newEngine(1), 'esamina uomo');
    expect(esaminaUomo.message).toBe(msg('engine.examine.objectNotHere', 1, ['uomo']));

    const turnKnob = await run(newEngine(2), 'turn knob');
    expect(turnKnob.message).toBe(msg('engine.examine.objectNotHere', 2, ['knob']));

    // Controllo di non regressione: destra/sinistra/porta in inglese (L2a) mostrano
    // ancora la parola digitata, non il concetto italiano non tradotto.
    const dropRight = await run(newEngine(2), 'drop right');
    expect(dropRight.message).toBe(msg('engine.drop.notInInventory', 2, ['right']));
    const dropLeft = await run(newEngine(2), 'drop left');
    expect(dropLeft.message).toBe(msg('engine.drop.notInInventory', 2, ['left']));
    const dropDoor = await run(newEngine(2), 'drop door');
    expect(dropDoor.message).toBe(msg('engine.drop.notInInventory', 2, ['door']));
  });

  it('TC-01: "gira a destra" in biblioteca (passo 37) — stesso esito di "gira destra"', async () => {
    for (const lingua of [1, 2]) {
      const giraDestra = lingua === 1 ? 'gira destra' : 'turn right';
      const giraADestra = lingua === 1 ? 'gira a destra' : 'turn to the right';
      const [a, b] = await Promise.all([
        run(await playUpTo(lingua, 37), giraDestra),
        run(await playUpTo(lingua, 37), giraADestra),
      ]);
      expect(b.message, `${giraADestra} vs ${giraDestra}`).toBe(a.message);
    }
  });

  it('TC-02: comandi con preposizioni di E4 — stesso esito senza preposizione', async () => {
    const rows: Array<[number, string, string]> = [
      [1, 'scava nel capanno', 'scava capanno'],
      [1, 'esamina sulla pesa', 'esamina pesa'],
      [1, 'esamina dal garage', 'esamina garage'],
      [2, 'dig in the shed', 'dig shed'],
      [2, 'examine on the scale', 'examine scale'],
      // L'esempio letterale della specifica (§6.3): con entrambe le preposizioni di
      // E4 presenti ("la", già ignorata da prima di L3, e "nel", nuova), stesso
      // esito di "prendi lampada ripostiglio" (senza "nel"; "la" già ignorata).
      [1, 'prendi la lampada nel ripostiglio', 'prendi lampada ripostiglio'],
    ];
    for (const [lingua, conPreposizione, senzaPreposizione] of rows) {
      const actual = await pickFields(conPreposizione, lingua);
      const expected = await pickFields(senzaPreposizione, lingua);
      expect(actual, `${conPreposizione} vs ${senzaPreposizione}`).toEqual(expected);
    }
  });

  // Aggiornato per #128 (v1.4.4, TD Parser nomi lunghi v1.1, §5.1): il nome di 3+ parole
  // "bastone di comando" è riconosciuto per intero, con la stessa risposta di "esamina
  // bastone". "di" resta un token pieno (E4): "esamina bastone comando" resta non valido.
  it('TC-03: "esamina bastone di comando" è valido con la stessa risposta di "esamina bastone"; "esamina bastone comando" resta non valido (E4: "di" non è ignorata)', async () => {
    const lungo = await pickFields('esamina bastone di comando', 1);
    expect(lungo).toEqual(await pickFields('esamina bastone', 1));
    expect(lungo.IsValid).toBe(true);
    expect(lungo.NounConcept).toBe('BASTONE_DI_COMANDO');

    const risposteLungo = await run(await playUpTo(1, 0), 'esamina bastone di comando');
    const risposteBreve = await run(await playUpTo(1, 0), 'esamina bastone');
    expect(risposteLungo.message).toBe(risposteBreve.message);

    const parziale = await pickFields('esamina bastone comando', 1);
    expect(parziale.IsValid).toBe(false);
    expect(parziale.Error).toBe('SYNTAX_INVALID_STRUCTURE');
  });

  it('TC-04: "attacca guardia" alla barriera — fine partita, motivo GUARD_ATTACK, richiesta di riavvio', async () => {
    const engine = await playUpTo(1, 146);
    const r = await run(engine, 'attacca guardia');
    expect(r.resultType).toBe('GAME_OVER');
    expect(r.gameOverReason).toBe('GUARD_ATTACK');
    expect(engine.getGameState().awaitingRestart).toBe(true);
  });

  it('TC-05: "attacca" fuori dalla barriera — nessuna fine partita (E1)', async () => {
    for (const lingua of [1, 2]) {
      const attacca = lingua === 1 ? 'attacca' : 'attack';
      const r = await run(newEngine(lingua), attacca);
      expect(r.resultType, attacca).not.toBe('GAME_OVER');
      expect(r.gameOverReason, attacca).toBeUndefined();
    }
  });

  // TC-06: percorsi completi e punteggio massimo (138) invariati — già coperti
  // integralmente da `tests/walkthrough.test.ts` e `tests/scoring.max.test.ts` (test
  // protetti, non duplicati qui; basta un rimando, come da specifica §6.3).
});
