// Interazioni: cicli generici su prerequisiti ed effetti, ricerca ed esecuzione delle
// interazioni (TD Lotto 4b, §3.1–§3.4). I tipi concreti vivono nei registri del gioco
// (`game.prerequisiteTypes`, `game.effectTypes`) e i casi specifici nelle regole del gioco
// (`game.rules`): questo modulo non conosce nessun tipo né dato di Odessa.
import { getGameData } from './gameData.js';

// Avvisi per tipi sconosciuti nei dati delle interazioni: una sola volta per tipo e processo.
const warnedUnknownTypes = new Set();
export function warnUnknownTypeOnce(kind, tipo) {
  const key = `${kind}:${tipo}`;
  if (warnedUnknownTypes.has(key)) return;
  warnedUnknownTypes.add(key);
  console.warn(`[engine] ${kind} di tipo sconosciuto in Interazioni.json: ${tipo}`);
}

// Funzione per verificare i prerequisiti di un'interazione.
// Restituisce { ok: true } oppure { ok: false, prerequisito } con il primo prerequisito fallito.
export function verificaPrerequisiti(prerequisiti, ctx) {
  if (!prerequisiti || prerequisiti.length === 0) return { ok: true };

  for (const req of prerequisiti) {
    // Solo voci proprie del registro: un tipo che coincide con una proprietà ereditata
    // (es. "toString") resta sconosciuto, come con il Set dello schema del codice originale.
    const check = Object.hasOwn(ctx.game.prerequisiteTypes, req.tipo) ? ctx.game.prerequisiteTypes[req.tipo] : undefined;
    if (!check) {
      // Tipo sconosciuto: fail-closed (prerequisito non soddisfatto), segnalato una sola volta.
      warnUnknownTypeOnce('prerequisito', req.tipo);
      return { ok: false, prerequisito: req };
    }
    if (!check(req, ctx)) return { ok: false, prerequisito: req };
  }
  return { ok: true };
}

// Funzione per applicare gli effetti di un'interazione
// @param {boolean} skipMisteri - true se l'interazione ha `punteggio: false` (R7, §4.1):
//   nessun punto mistero per i suoi effetti
// @returns {string[]} messaggi aggiuntivi da accodare alla risposta (es. avvisi prodotti dagli effetti)
export function applicaEffetti(effetti, luogoCorrente, { skipMisteri = false } = {}, ctx) {
  const extraMessages = [];
  for (const effetto of effetti) {
    // Solo voci proprie del registro (vedi verificaPrerequisiti)
    const apply = Object.hasOwn(ctx.game.effectTypes, effetto.tipo) ? ctx.game.effectTypes[effetto.tipo] : undefined;
    // `info`: valore restituito dall'effetto (oggi solo `statoPreToggle`), variabile locale
    let info;
    if (apply) info = apply(effetto, ctx, { luogoCorrente, extraMessages });
    else warnUnknownTypeOnce('effetto', effetto.tipo);

    // === SISTEMA PUNTEGGIO MISTERI ===
    // Assegna i punti se questo effetto risolve un mistero (non per punteggio: false, §4.1);
    // per un tipo sconosciuto la regola non assegna nulla (R2: avviso, poi regola)
    if (!skipMisteri) ctx.game.rules.awardMystery(effetto, info ?? {}, ctx);
  }
  return extraMessages;
}

// Passo 7 (TD Lotto 4b, §3.4): punteggio dell'interazione. Restituisce `punteggioSkip`.
// === SISTEMA PUNTEGGIO: Assegna +2 punti PRIMA di applicare effetti ===
// Importante: deve avvenire PRIMA di applicaEffetti() perché VITTORIA imposta ended=true
// Campo `punteggio` (R7, §4.1): assente -> chiave = id; stringa -> chiave condivisa
// con l'interazione indicata; false -> nessun +2 (e nessun mistero, vedi applicaEffetti)
export function assegnaPunteggioInterazione(interazione, ctx) {
  const punteggioSkip = interazione.punteggio === false;
  const chiavePunteggio = typeof interazione.punteggio === 'string' ? interazione.punteggio : interazione.id;
  if (!punteggioSkip && !ctx.state.punteggio.interazioniPunteggio.has(chiavePunteggio)) {
    ctx.state.punteggio.totale += ctx.game.config.punteggio.interazione;
    ctx.state.punteggio.interazioniPunteggio.add(chiavePunteggio);
  }
  return punteggioSkip;
}

// Passo 10 (TD Lotto 4b, §3.4): risultato dell'interazione eseguita. Ordine delle chiavi:
// accepted, resultType, effects, poi ended, victory (se VITTORIA), poi message.
function buildInteractionResult(interazione, risposta, ctx) {
  // Verifica se è VITTORIA per aggiungere flag ended nella risposta
  const hasVittoriaEffect = interazione.effetti.some(e => e.tipo === 'VITTORIA');
  const resultBase = {
    accepted: true,
    resultType: 'OK',
    effects: interazione.effetti
  };

  // Se VITTORIA, aggiungi flag ended e victory alla risposta
  if (hasVittoriaEffect) {
    resultBase.ended = true;
    resultBase.victory = true;
  }

  // Se ci sono effetti VISIBILITA, aggiungi descrizione luogo e oggetti
  const haVisibilitaEffects = interazione.effetti.some(e => e.tipo === 'VISIBILITA');
  if (haVisibilitaEffects) {
    // Usa funzione centralizzata per descrizione luogo e oggetti
    const descrizioneCompleta = ctx.helpers.generaDescrizioneLuogoConOggetti(ctx.state.currentLocationId);
    const messaggioCompleto = risposta + '\n\n' + descrizioneCompleta;

    return { ...resultBase, message: messaggioCompleto };
  }

  return { ...resultBase, message: risposta };
}

// Passo 6 (TD Lotto 4b, §3.4.1): meccanismo generico delle sequenze (effetto SEQUENZA con
// `pattern`, `direzione`, `effetti_completamento` e risposte `risposta_step` /
// `risposta_errore` / `risposta_completa`). I due casi specifici del gioco sono regole:
// `rules.sequence.alreadyCompletedMessageKey` e `rules.sequence.onCompleted`.
// Nessun +2 di interazione e nessuna registrazione in `interazioniEseguite` (TD §4).
export function eseguiSequenza(interazione, effettoSequenza, risposta, ctx) {
  const key = effettoSequenza.target;
  const direzione = effettoSequenza.direzione;

  // Inizializza sequenza se non esiste
  if (!ctx.state.sequenze[key]) {
    ctx.state.sequenze[key] = {
      pattern: effettoSequenza.pattern,
      progressione: [],
      completata: false
    };
  }

  const seq = ctx.state.sequenze[key];

  // Se già completata, non fare nulla
  if (seq.completata) {
    return { accepted: true, resultType: 'OK', message: ctx.msg(ctx.game.rules.sequence.alreadyCompletedMessageKey), effects: [] };
  }

  // Verifica se la direzione è corretta per il passo attuale
  const passoAtteso = seq.pattern[seq.progressione.length];

  if (direzione === passoAtteso) {
    seq.progressione.push(direzione);

    // Sequenza completata?
    if (seq.progressione.length === seq.pattern.length) {
      seq.completata = true;

      // Punteggio del completamento (regola del gioco)
      ctx.game.rules.sequence.onCompleted(key, ctx);

      applicaEffetti(effettoSequenza.effetti_completamento, interazione.condizioni.luogo, {}, ctx);
      risposta = interazione.risposta_completa;

      // Usa funzione centralizzata per descrizione luogo e oggetti
      const descrizioneCompleta = ctx.helpers.generaDescrizioneLuogoConOggetti(ctx.state.currentLocationId);
      const messaggioCompleto = risposta + '\n\n' + descrizioneCompleta;

      return { accepted: true, resultType: 'OK', message: messaggioCompleto, effects: interazione.effetti };
    } else {
      risposta = interazione.risposta_step;
      return { accepted: true, resultType: 'OK', message: risposta, effects: [] };
    }
  } else {
    // Errore: reset sequenza
    seq.progressione = [];
    risposta = interazione.risposta_errore;
    return { accepted: true, resultType: 'OK', message: risposta, effects: [] };
  }
}

// Passi 5–10 (TD Lotto 4b, §3.4): interazione trovata e valida; restituisce sempre un risultato.
function eseguiInterazione(interazione, ctx) {
  // Interazione trovata e valida
  // Determina la risposta (per toggle): verbi con risposta di apertura/chiusura (regola del gioco)
  let risposta = interazione.risposta;
  if (ctx.game.rules.toggleResponseVerbs.has(interazione.trigger.verbo)) {
    // Verifica stato toggle
    const primoEffetto = interazione.effetti.find(e => e.tipo === 'TOGGLE_DIREZIONE');
    if (primoEffetto) {
      const key = `${primoEffetto.luogo}_${primoEffetto.direzione}`;
      const statoCorrente = ctx.state.direzioniToggle[key] || false;
      risposta = statoCorrente ? interazione.risposta_chiudi : interazione.risposta_apri;
    }
  }

  // Gestione speciale per effetto SEQUENZA
  const effettoSequenza = interazione.effetti.find(e => e.tipo === 'SEQUENZA');
  if (effettoSequenza) {
    return eseguiSequenza(interazione, effettoSequenza, risposta, ctx);
  }

  const punteggioSkip = assegnaPunteggioInterazione(interazione, ctx);

  // Segna come eseguita
  if (!interazione.ripetibile) {
    ctx.state.interazioniEseguite.push(interazione.id);
  }

  // Applica effetti (passa il luogo corrente per risolvere ambiguità oggetti con stesso nome)
  const extraMessages = applicaEffetti(interazione.effetti, interazione.condizioni.luogo, { skipMisteri: punteggioSkip }, ctx);
  if (extraMessages.length > 0) {
    risposta = risposta + '\n\n' + extraMessages.join('\n\n');
  }

  return buildInteractionResult(interazione, risposta, ctx);
}

// Funzione per cercare e eseguire un'interazione (passi 1–4 di TD Lotto 4b, §3.4).
// `null` è l'unico esito senza risultato e non è preceduto da alcuna mutazione.
export function cercaEseguiInterazione(verb, noun, ctx) {
  const interazioni = (getGameData().Interazioni || [])
    .filter(i => i.IDLingua === ctx.state.currentLingua);

  // Cerca un'interazione che corrisponda
  for (const interazione of interazioni) {
    if (ctx.helpers.normalize(interazione.trigger.verbo) === ctx.helpers.normalize(verb) &&
        ctx.helpers.normalize(interazione.trigger.oggetto) === ctx.helpers.normalize(noun)) {

      // Verifica luogo
      if (interazione.condizioni.luogo && interazione.condizioni.luogo !== ctx.state.currentLocationId) {
        continue;
      }

      // Verifica se già eseguita (se non ripetibile)
      if (!interazione.ripetibile && ctx.state.interazioniEseguite.includes(interazione.id)) {
        const messaggio = interazione.risposta_gia_eseguita || ctx.msg('engine.interaction.alreadyDone');
        return { accepted: true, resultType: 'OK', message: messaggio, effects: [] };
      }

      // Verifica prerequisiti
      const esitoPrerequisiti = verificaPrerequisiti(interazione.condizioni.prerequisiti, ctx);
      if (!esitoPrerequisiti.ok) {
        const rispostaPrerequisito = esitoPrerequisiti.prerequisito.risposta;
        if (rispostaPrerequisito) {
          // Risposta dedicata: nessun effetto, nessun punteggio, interazione non registrata come eseguita
          return { accepted: true, resultType: 'OK', message: rispostaPrerequisito, effects: [] };
        }
        // Senza risposta dedicata: passa all'interazione successiva
        continue;
      }

      return eseguiInterazione(interazione, ctx);
    }
  }

  return null;
}
