/**
 * Lessico L2b: verbi e risposte dell'originale, CARICA (#109, #98)
 * Specifica: docs/20261016 - TD Lessico L2 risposte e testi - v1.1.md, §5.3, §6.2.
 *
 * Motore e parser reali (parseCommand + executeCommand). Per i luoghi precisi si
 * giocano i passi dei percorsi di riferimento (full_it.json / full_en.json); nessuna
 * modifica a mano dello stato (solo comandi reali: posa/prendi per rimettere o
 * togliere oggetti dall'inventario quando serve un punto di partenza preciso).
 *
 * Un caso per ogni riga di §5.3, in IT e in EN, più TB-01…TB-05 di §6.2.
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
const msg = (key: string, lingua = 1) => getSystemMessage(key, lingua);

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

async function runAll(engine: Engine, commands: string[]) {
  const results = [];
  for (const command of commands) results.push(await run(engine, command));
  return results;
}

function walkthrough(lingua: number): Step[] {
  return loadJson('tests', 'fixtures', 'walkthrough', lingua === 1 ? 'full_it.json' : 'full_en.json').steps as Step[];
}

async function playUpTo(lingua: number, uptoStep: number): Promise<Engine> {
  const engine = newEngine(lingua);
  for (const s of walkthrough(lingua).filter((x) => x.step <= uptoStep)) await run(engine, s.command);
  return engine;
}

// Testi letterali delle nuove interazioni (Interazioni.json): la cassaforte, la porta
// del 44, lo scomparto del 25, la porta del 27 e scarica pesa/peso al 57 non usano
// chiavi di MessaggiSistema ma il testo diretto, come le interazioni esistenti
// (es. carica_pesa_57).
const CASSAFORTE_CHIUSA = { 1: 'La cassaforte è chiusa con una serratura a combinazione.', 2: 'The safe is locked with a combination lock.' };
const CASSAFORTE_APERTA = { 1: 'È già aperta.', 2: "It's already open." };
const CASSAFORTE_GIA_CHIUSA = { 1: 'La cassaforte è già chiusa.', 2: 'The safe is already closed.' };
const CASSAFORTE_RIMANE_APERTA = { 1: 'La cassaforte rimane aperta: la serratura non scatta più.', 2: 'The safe stays open: the lock no longer catches.' };
const SCOMPARTO_RIMANE_APERTO = { 1: 'Lo scomparto rimane aperto: si deve essere rotto il meccanismo.', 2: 'The compartment stays open: the mechanism must be broken.' };
const PORTA44_CHIUSA_SCATTO = { 1: 'La porta è chiusa con un meccanismo a scatto.', 2: 'The door is held shut by a spring mechanism.' };
const PORTA44_GIA_APERTA = { 1: 'La porta è già aperta.', 2: 'The door is already open.' };
const PORTA44_GIA_CHIUSA = { 1: 'La porta è già chiusa.', 2: 'The door is already closed.' };
const PORTA44_SOLO_AUTOMATICO = { 1: 'La porta si chiude solo azionando il meccanismo automatico.', 2: 'The door only closes by operating the automatic mechanism.' };
const PORTA27_BLOCCATA = { 1: 'Non riesci a chiudere la porta: un meccanismo la blocca.', 2: "You can't close the door: a mechanism is blocking it." };
const SCARICA_BLOCCATO = { 1: 'Il meccanismo si è bloccato.', 2: 'The mechanism has jammed.' };
const SCARICA_NON_CARICA = { 1: 'La pesa non è carica.', 2: "The scale isn't loaded." };
// Il testo di successo del caricamento (interazione esistente carica_pesa_57, invariata)
// include la descrizione del luogo che segue l'apertura della botola: il confronto usa
// .toContain() sul testo centrale, non un'uguaglianza su tutto il messaggio.
const CARICA_SUCCESSO_TESTO = {
  1: 'Carichi la pesa: il piatto è ora sollevato in equilibrio col braccio della pesa. Con uno strano rumore il coperchio di una botola si apre davanti a te sul pavimento.',
  2: 'You load the weight: the pan is now balanced against the arm of the scale. With a strange sound, the lid of a hatch opens in the floor in front of you.',
};

describe("Lessico L2b: verbi e risposte dell'originale, CARICA (#109, #98)", () => {
  beforeAll(async () => {
    await initOdessa();
    await ensureVocabulary();
  });

  it('spegni/extinguish (con o senza nome), ovunque (R9)', async () => {
    for (const lingua of [1, 2]) {
      const bare = lingua === 1 ? 'spegni' : 'extinguish';
      const withName = lingua === 1 ? 'spegni lampada' : 'extinguish lamp';
      const [r1, r2] = await runAll(newEngine(lingua), [bare, withName]);
      expect(r1.message, `${bare}`).toBe(msg('engine.spegni.notTime', lingua));
      expect(r2.message, `${withName}`).toBe(msg('engine.spegni.notTime', lingua));
    }
  });

  it('scarica pesa/peso al capanno (57): non ancora carica, poi bloccata dopo il caricamento (R6)', async () => {
    for (const lingua of [1, 2]) {
      const pesa = lingua === 1 ? 'scarica pesa' : 'unload scale';
      const peso = lingua === 1 ? 'scarica peso' : 'unload weight';

      const nonCaricaPesa = await run(await playUpTo(lingua, 119), pesa);
      expect(nonCaricaPesa.message, `${pesa}, non carica`).toBe(SCARICA_NON_CARICA[lingua as 1 | 2]);
      const nonCaricaPeso = await run(await playUpTo(lingua, 119), peso);
      expect(nonCaricaPeso.message, `${peso}, non carica`).toBe(SCARICA_NON_CARICA[lingua as 1 | 2]);

      const dopoCaricata = await playUpTo(lingua, 120); // 120 = metti peso/put weight
      const bloccato = await run(dopoCaricata, pesa);
      expect(bloccato.message, `${pesa}, dopo il caricamento`).toBe(SCARICA_BLOCCATO[lingua as 1 | 2]);
    }
  });

  it('scarica pesa al buio: bloccato come gli altri verbi di §5.4 (TB-04)', async () => {
    for (const lingua of [1, 2]) {
      // Partita appena iniziata: nessuna lampada accesa, nessun fiammifero in uso.
      // Posata la torcia (unica fonte di luce attiva allo stato iniziale), il buio
      // blocca SCARICARE come ogni altro verbo di DARK_BLOCKED_VERBS, indipendentemente
      // dal luogo e dallo stato della pesa.
      const posaTorcia = lingua === 1 ? 'posa torcia' : 'drop flashlight';
      const pesa = lingua === 1 ? 'scarica pesa' : 'unload scale';
      const engine = newEngine(lingua);
      await run(engine, posaTorcia);
      const result = await run(engine, pesa);
      expect(result.message, `${pesa} al buio`).toContain(msg('engine.dark.tooDark', lingua));
    }
  });

  it("carica peso/pesa: stesso esito di metti peso/put weight, stesso punteggio una sola volta (TB-02, entrambi gli ordini)", async () => {
    for (const lingua of [1, 2]) {
      const caricaPeso = lingua === 1 ? 'carica peso' : 'load weight';
      const caricaPesa = lingua === 1 ? 'carica pesa' : 'load scale';
      const mettiPeso = lingua === 1 ? 'metti peso' : 'put weight';

      // "carica peso" da solo: stesso esito di "metti peso".
      const [success1, success2] = await Promise.all([run(await playUpTo(lingua, 119), caricaPeso), run(await playUpTo(lingua, 119), mettiPeso)]);
      expect(success1.message, caricaPeso).toContain(CARICA_SUCCESSO_TESTO[lingua as 1 | 2]);
      expect(success1.message, `${caricaPeso} = ${mettiPeso}`).toBe(success2.message);

      // "carica pesa" (nome della pesa, non del peso): stesso esito.
      const successPesa = await run(await playUpTo(lingua, 119), caricaPesa);
      expect(successPesa.message, caricaPesa).toContain(CARICA_SUCCESSO_TESTO[lingua as 1 | 2]);

      // Ordine 1: "carica peso" poi "metti peso" -> il punteggio non cambia, il
      // secondo comando trova l'interazione già eseguita.
      {
        const engine = await playUpTo(lingua, 119);
        const r1 = await run(engine, caricaPeso);
        const scoreAfterFirst = engine.getGameState().punteggio.totale;
        const r2 = await run(engine, mettiPeso);
        expect(r1.message, `${caricaPeso} (primo)`).toContain(CARICA_SUCCESSO_TESTO[lingua as 1 | 2]);
        expect(r2.message, `${mettiPeso} dopo ${caricaPeso}`).toBe(msg('engine.interaction.alreadyDone', lingua));
        expect(engine.getGameState().punteggio.totale, 'punteggio invariato dopo il secondo comando').toBe(scoreAfterFirst);
      }

      // Ordine 2 (inverso): "metti peso" poi "carica peso" -> stesso risultato.
      {
        const engine = await playUpTo(lingua, 119);
        const r1 = await run(engine, mettiPeso);
        const scoreAfterFirst = engine.getGameState().punteggio.totale;
        const r2 = await run(engine, caricaPeso);
        expect(r1.message, `${mettiPeso} (primo)`).toContain(CARICA_SUCCESSO_TESTO[lingua as 1 | 2]);
        expect(r2.message, `${caricaPeso} dopo ${mettiPeso}`).toBe(msg('engine.interaction.alreadyDone', lingua));
        expect(engine.getGameState().punteggio.totale, 'punteggio invariato dopo il secondo comando').toBe(scoreAfterFirst);
      }
    }
  });

  it('carica peso/pesa al 57 senza il peso in inventario', async () => {
    for (const lingua of [1, 2]) {
      const posaPeso = lingua === 1 ? 'posa peso' : 'drop weight';
      const caricaPeso = lingua === 1 ? 'carica peso' : 'load weight';
      const engine = await playUpTo(lingua, 119); // il peso è già in inventario (preso al passo 106)
      await run(engine, posaPeso);
      const result = await run(engine, caricaPeso);
      expect(result.message, caricaPeso).toBe(msg('engine.load.scaleNeedsWeight', lingua));
    }
  });

  it('carica con altri nomi resta un\'azione senza effetto', async () => {
    for (const lingua of [1, 2]) {
      const verbo = lingua === 1 ? 'caricare' : 'load';
      const comando = lingua === 1 ? 'carica documenti' : 'load documents';
      const result = await run(newEngine(lingua), comando);
      expect(result.message.toLowerCase(), comando).toContain(verbo);
    }
  });

  it('scappa/flee (D7): stessa risposta ovunque, con o senza nome', async () => {
    for (const lingua of [1, 2]) {
      const bare = lingua === 1 ? 'scappa' : 'flee';
      const withName = lingua === 1 ? 'scappa documenti' : 'flee documents';
      const [r1, r2] = await runAll(newEngine(lingua), [bare, withName]);
      expect(r1.message).toBe(msg('engine.scappa.cantEscape', lingua));
      expect(r2.message).toBe(msg('engine.scappa.cantEscape', lingua));
    }
  });

  it('sorridi/smile: stessa risposta ovunque', async () => {
    for (const lingua of [1, 2]) {
      const bare = lingua === 1 ? 'sorridi' : 'smile';
      const result = await run(newEngine(lingua), bare);
      expect(result.message).toBe(msg('engine.sorridi.cheese', lingua));
    }
  });

  it('dormi/siediti e sleep/sit (D7): stessa risposta con o senza nome', async () => {
    for (const lingua of [1, 2]) {
      const dormi = lingua === 1 ? 'dormi' : 'sleep';
      const siediti = lingua === 1 ? 'siediti' : 'sit';
      const dormiConNome = lingua === 1 ? 'dormi documenti' : 'sleep documents';
      const [r1, r2, r3] = await runAll(newEngine(lingua), [dormi, siediti, dormiConNome]);
      expect(r1.message, dormi).toBe(msg('engine.dormi.noTimeToWaste', lingua));
      expect(r2.message, siediti).toBe(msg('engine.dormi.noTimeToWaste', lingua));
      expect(r3.message, dormiConNome).toBe(msg('engine.dormi.noTimeToWaste', lingua));
    }
  });

  it('parla/rispondi e talk/answer: stessa risposta ovunque tranne alla barriera (59)', async () => {
    for (const lingua of [1, 2]) {
      const parla = lingua === 1 ? 'parla' : 'talk';
      const rispondi = lingua === 1 ? 'rispondi' : 'answer';

      const altrove = await run(newEngine(lingua), parla);
      expect(altrove.message, `${parla} altrove`).toBe(msg('engine.parla.toSelf', lingua));

      // Alla barriera (passo 146): sia "parla"/"talk" sia "rispondi"/"answer".
      const barrieraParla = await run(await playUpTo(lingua, 146), parla);
      expect(barrieraParla.message, `${parla} alla barriera`).toBe(msg('engine.parla.guardGerman', lingua));
      const barrieraRispondi = await run(await playUpTo(lingua, 146), rispondi);
      expect(barrieraRispondi.message, `${rispondi} alla barriera`).toBe(msg('engine.parla.guardGerman', lingua));
    }
  });

  it('accendi/light senza nome, accendi luce: cascata torcia → fiammifero → lampada → nessuna fonte', async () => {
    for (const lingua of [1, 2]) {
      const accendi = lingua === 1 ? 'accendi' : 'light';
      const accendiLuce = lingua === 1 ? 'accendi luce' : null; // D5: nessun nome "luce" in EN

      // Torcia con te e funzionante (stato iniziale): "già accesa".
      const [r1] = await runAll(newEngine(lingua), [accendi]);
      expect(r1.message, accendi).toBe(msg('engine.torch.alreadyLit', lingua));
      if (accendiLuce) {
        const r2 = await run(newEngine(lingua), accendiLuce);
        expect(r2.message, accendiLuce).toBe(msg('engine.torch.alreadyLit', lingua));
      }

      // Nessuna fonte: dopo l'incontro con Ferenc (passo 146) spariscono tutti gli
      // oggetti tranne i Documenti (R11): né torcia, né fiammiferi, né lampada.
      const nessunaFonte = await run(await playUpTo(lingua, 146), accendi);
      expect(nessunaFonte.message, `${accendi}, nessuna fonte`).toBe(msg('engine.light.noSourceHere', lingua));
    }
  });

  it('accendi torcia/light flashlight: nel luogo ma non con te, con te funzionante, con te guasta', async () => {
    for (const lingua of [1, 2]) {
      const accendiTorcia = lingua === 1 ? 'accendi torcia' : 'light flashlight';
      const posaTorcia = lingua === 1 ? 'posa torcia' : 'drop flashlight';
      const guarda = lingua === 1 ? 'guarda' : 'look';

      // Con te, funzionante.
      const funzionante = await run(newEngine(lingua), accendiTorcia);
      expect(funzionante.message, `${accendiTorcia}, funzionante`).toBe(msg('engine.torch.alreadyLit', lingua));

      // Nel luogo ma non con te: la si posa, poi si tenta di accenderla. Posata la
      // torcia resta al buio (unica fonte di luce allo stato iniziale), quindi il
      // messaggio include anche l'avviso di pericolo del turno al buio.
      const nelLuogo = newEngine(lingua);
      await run(nelLuogo, posaTorcia);
      const rNelLuogo = await run(nelLuogo, accendiTorcia);
      expect(rNelLuogo.message, `${accendiTorcia}, nel luogo ma non con te`).toContain(msg('engine.torch.takeFirst', lingua));

      // Con te, guasta: la torcia si guasta dopo 6 turni (resta con te, mai posata).
      const guasta = newEngine(lingua);
      await runAll(guasta, Array(6).fill(guarda));
      const rGuasta = await run(guasta, accendiTorcia);
      expect(rGuasta.message, `${accendiTorcia}, guasta`).toContain(msg('engine.torch.broken', lingua));
    }
  });

  it('scava/dig senza nome, dove esiste un\'interazione "scava macerie" (11, 49): come con il nome', async () => {
    for (const lingua of [1, 2]) {
      const scava = lingua === 1 ? 'scava' : 'dig';
      const scavaMacerie = lingua === 1 ? 'scava macerie' : 'dig rubble';

      // Luogo 11 (passo 14): badile non ancora preso.
      const [r11a, r11b] = await Promise.all([run(await playUpTo(lingua, 14), scava), run(await playUpTo(lingua, 14), scavaMacerie)]);
      expect(r11a.message, `${scava} al luogo 11`).toBe(r11b.message);

      // Luogo 49 (passo 101): badile ancora in inventario (posato solo al passo 104).
      const [r49a, r49b] = await Promise.all([run(await playUpTo(lingua, 101), scava), run(await playUpTo(lingua, 101), scavaMacerie)]);
      expect(r49a.message, `${scava} al luogo 49`).toBe(r49b.message);
    }
  });

  it('scava/dig allo stretto passaggio (32), con e senza badile', async () => {
    for (const lingua of [1, 2]) {
      const scava = lingua === 1 ? 'scava' : 'dig';
      const posaBadile = lingua === 1 ? 'posa badile' : 'drop spade';

      // Con badile (ancora in inventario al passo 80: posato solo al passo 104).
      const conBadile = await run(await playUpTo(lingua, 80), scava);
      expect(conBadile.message, `${scava} al 32, con badile`).toBe(msg('engine.dig.digging', lingua));

      // Senza badile: lo si posa appena arrivati.
      const engineSenza = await playUpTo(lingua, 80);
      await run(engineSenza, posaBadile);
      const senzaBadile = await run(engineSenza, scava);
      expect(senzaBadile.message, `${scava} al 32, senza badile`).toBe(msg('engine.dig.bareHandsNoTool', lingua));
    }
  });

  it('scava/dig allo stretto passaggio (36), con e senza badile', async () => {
    for (const lingua of [1, 2]) {
      const scava = lingua === 1 ? 'scava' : 'dig';
      const posaBadile = lingua === 1 ? 'posa badile' : 'drop spade';

      const conBadile = await run(await playUpTo(lingua, 81), scava);
      expect(conBadile.message, `${scava} al 36, con badile`).toBe(msg('engine.dig.noPassageNorth', lingua));

      const engineSenza = await playUpTo(lingua, 81);
      await run(engineSenza, posaBadile);
      const senzaBadile = await run(engineSenza, scava);
      expect(senzaBadile.message, `${scava} al 36, senza badile`).toBe(msg('engine.dig.bareHandsNoTool', lingua));
    }
  });

  it('scava macerie/dig rubble al tinello (49): senza badile, poi già scavato', async () => {
    for (const lingua of [1, 2]) {
      const scavaMacerie = lingua === 1 ? 'scava macerie' : 'dig rubble';
      const posaBadile = lingua === 1 ? 'posa badile' : 'drop spade';
      const scava = lingua === 1 ? 'scava' : 'dig';

      // Senza badile (ancora in inventario al passo 101: lo si posa appena arrivati).
      const engineSenza = await playUpTo(lingua, 101);
      await run(engineSenza, posaBadile);
      const senzaBadile = await run(engineSenza, scavaMacerie);
      expect(senzaBadile.message, `${scavaMacerie} senza badile`).toBe(msg('engine.dig.bareHandsNoTool', lingua));

      // Già scavato (il passo 102 esegue "scava macerie").
      const giaScavato = await run(await playUpTo(lingua, 102), scava);
      expect(giaScavato.message, `${scava} già scavato`).toBe(msg('engine.dig.digging', lingua));
    }
  });

  it('scava/dig senza nome altrove: senza badile, poi con badile', async () => {
    for (const lingua of [1, 2]) {
      const scava = lingua === 1 ? 'scava' : 'dig';
      const senzaBadile = await run(newEngine(lingua), scava); // badile non ancora preso (passo 29)
      expect(senzaBadile.message, `${scava} altrove, senza badile`).toBe(msg('engine.dig.noToolHere', lingua));

      const conBadile = await run(await playUpTo(lingua, 29), scava); // appena preso, luogo 18
      expect(conBadile.message, `${scava} altrove, con badile`).toBe(msg('engine.dig.digging', lingua));
    }
  });

  it('apri/chiudi cassaforte alla biblioteca (24): chiusa, poi aperta (D6)', async () => {
    for (const lingua of [1, 2]) {
      const apriCassaforte = lingua === 1 ? 'apri cassaforte' : 'open safe';
      const chiudiCassaforte = lingua === 1 ? 'chiudi cassaforte' : 'close safe';

      // Chiusa (passo 37: cassaforte visibile dopo "sposta quadro"/"move painting", sequenza non ancora completata).
      const apriChiusa = await run(await playUpTo(lingua, 37), apriCassaforte);
      expect(apriChiusa.message, apriCassaforte).toBe(CASSAFORTE_CHIUSA[lingua as 1 | 2]);
      const chiudiChiusa = await run(await playUpTo(lingua, 37), chiudiCassaforte);
      expect(chiudiChiusa.message, chiudiCassaforte).toBe(CASSAFORTE_GIA_CHIUSA[lingua as 1 | 2]);

      // Aperta (passo 42: sequenza DESTRA,SINISTRA,SINISTRA,DESTRA,SINISTRA completata).
      const apriAperta = await run(await playUpTo(lingua, 42), apriCassaforte);
      expect(apriAperta.message, `${apriCassaforte}, aperta`).toBe(CASSAFORTE_APERTA[lingua as 1 | 2]);
      const chiudiAperta = await run(await playUpTo(lingua, 42), chiudiCassaforte);
      expect(chiudiAperta.message, `${chiudiCassaforte}, aperta (D6)`).toBe(CASSAFORTE_RIMANE_APERTA[lingua as 1 | 2]);
    }
  });

  it('chiudi scomparto/close compartment, archivio (25)', async () => {
    for (const lingua of [1, 2]) {
      const chiudiScomparto = lingua === 1 ? 'chiudi scomparto' : 'close compartment';
      const result = await run(await playUpTo(lingua, 48), chiudiScomparto); // passo 48: sposta fermacarte
      expect(result.message, chiudiScomparto).toBe(SCOMPARTO_RIMANE_APERTO[lingua as 1 | 2]);
    }
  });

  it('apri/chiudi porta, passaggio (44): chiusa, poi aperta dal pulsante', async () => {
    for (const lingua of [1, 2]) {
      const apriPorta = lingua === 1 ? 'apri porta' : 'open door';
      const chiudiPorta = lingua === 1 ? 'chiudi porta' : 'close door';

      // Chiusa (passo 94, prima di premere il pulsante al 95).
      const apriChiusa = await run(await playUpTo(lingua, 94), apriPorta);
      expect(apriChiusa.message, apriPorta).toBe(PORTA44_CHIUSA_SCATTO[lingua as 1 | 2]);
      const chiudiChiusa = await run(await playUpTo(lingua, 94), chiudiPorta);
      expect(chiudiChiusa.message, chiudiPorta).toBe(PORTA44_GIA_CHIUSA[lingua as 1 | 2]);

      // Aperta (passo 95: "premi pulsante"/"press button").
      const apriAperta = await run(await playUpTo(lingua, 95), apriPorta);
      expect(apriAperta.message, `${apriPorta}, aperta`).toBe(PORTA44_GIA_APERTA[lingua as 1 | 2]);
      const chiudiAperta = await run(await playUpTo(lingua, 95), chiudiPorta);
      expect(chiudiAperta.message, `${chiudiPorta}, aperta`).toBe(PORTA44_SOLO_AUTOMATICO[lingua as 1 | 2]);
    }
  });

  it('chiudi porta/close door, seminterrato (27), dopo infila statuetta', async () => {
    for (const lingua of [1, 2]) {
      const chiudiPorta = lingua === 1 ? 'chiudi porta' : 'close door';
      const result = await run(await playUpTo(lingua, 68), chiudiPorta); // passo 68: infila statuetta
      expect(result.message, chiudiPorta).toBe(PORTA27_BLOCCATA[lingua as 1 | 2]);
    }
  });

  it('gira/ruota e turn/rotate destra/sinistra, fuori dalla biblioteca (D4)', async () => {
    for (const lingua of [1, 2]) {
      const giraDestra = lingua === 1 ? 'gira destra' : 'turn right';
      const ruotaSinistra = lingua === 1 ? 'ruota sinistra' : 'rotate left';
      const [r1, r2] = await runAll(newEngine(lingua), [giraDestra, ruotaSinistra]);
      expect(r1.message, giraDestra).toBe(msg('engine.rotate.nothingToTurn', lingua));
      expect(r2.message, ruotaSinistra).toBe(msg('engine.rotate.nothingToTurn', lingua));
    }
  });

  it('muovi/sposta e move <oggetto> (D3): trasportabile (compresi i casi limite: sedie), altro oggetto', async () => {
    for (const lingua of [1, 2]) {
      const muoviDocumenti = lingua === 1 ? 'muovi documenti' : 'move documents';
      const muoviSedie = lingua === 1 ? 'muovi sedie' : 'move chairs';
      const muoviCassaforte = lingua === 1 ? 'muovi cassaforte' : 'move safe';

      const trasportabile = await run(newEngine(lingua), muoviDocumenti);
      expect(trasportabile.message, muoviDocumenti).toBe(msg('engine.move.nothingHappens', lingua));

      // Sedie (Attivo < 3, non raccoglibili ma trasportabili per la precisazione 4): passo 23.
      const sedie = await run(await playUpTo(lingua, 23), muoviSedie);
      expect(sedie.message, muoviSedie).toBe(msg('engine.move.nothingHappens', lingua));

      // Cassaforte (Attivo scenico, non trasportabile), visibile dal passo 37.
      const nonTrasportabile = await run(await playUpTo(lingua, 37), muoviCassaforte);
      expect(nonTrasportabile.message, muoviCassaforte).toBe(msg('engine.move.notPossible', lingua));
    }
  });

  it('TB-01: carica/load da soli restano il caricamento della partita, come oggi', async () => {
    for (const lingua of [1, 2]) {
      const bare = lingua === 1 ? 'carica' : 'load';
      const result = await run(newEngine(lingua), bare);
      expect(result.resultType, bare).toBe('LOAD_GAME');
      expect(result.message.toLowerCase(), bare).not.toContain(lingua === 1 ? 'non puoi' : "can't");
    }
  });

  it('TB-05: ogni comando nuovo del lotto L2b consuma un turno', async () => {
    for (const lingua of [1, 2]) {
      const comandi = lingua === 1 ? ['spegni', 'scappa', 'sorridi', 'dormi', 'siediti', 'parla'] : ['extinguish', 'flee', 'smile', 'sleep', 'sit', 'talk'];
      const engine = newEngine(lingua);
      for (const comando of comandi) {
        const before = engine.getGameState().turn.totalTurnsConsumed;
        await run(engine, comando);
        const after = engine.getGameState().turn.totalTurnsConsumed;
        expect(after, `${comando}: turno consumato`).toBe(before + 1);
      }
    }
  });
});
