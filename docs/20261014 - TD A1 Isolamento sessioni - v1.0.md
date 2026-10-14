# TD A1 — Isolamento delle sessioni senza istanze di modulo

| Campo | Valore |
|---|---|
| Documento | Specifica tecnica (TD) |
| Versione | v1.0 — approvata il 2026-10-14 |
| Data | 2026-10-14 |
| Blocco | A1 (rischio operativo) |
| Track | Standard (`AGENTS.md`) |
| Baseline | `main` @ `6877f7c` |
| Issue | "Isolamento sessioni: memoria non rilasciata (istanze ESM per sessione)" — numero assegnato con HO-02 |
| Milestone | v1.4.0 (Stabilità: sessioni e difetti) |
| Modello consigliato per l'implementazione | Claude Opus 5.5, effort medio |

## 1. Valutazione del rischio di regressione

**Livello complessivo: medio-basso.**

Motivazione:
- La trasformazione è meccanica: il corpo di `engine.js` viene racchiuso in una funzione che costruisce il motore. La logica di gioco non cambia di una riga.
- L'API pubblica resta identica in due forme: come metodi dell'oggetto motore (usata dalle route) e come funzioni esportate dal modulo (usata da `server.js` e dai test).
- Un prototipo su `6877f7c` ha superato **tutti i 285 test esistenti senza modificarli** (42 file passati, 1 saltato).

Aree esposte:

| Area | Rischio | Perché |
|---|---|---|
| Logica di gioco (`executeCommand`, effetti di turno, punteggio, vittoria) | Basso | Codice invariato; gli effetti di turno ricevono già `gameState` come parametro |
| Isolamento tra sessioni | Basso | Ogni motore ha un proprio `gameState` in una closure; coperto da test esistenti e nuovi |
| Gestione sessioni (`sessionContext.js`) | Basso | Cambia solo la funzione che crea il motore |
| Revisione del diff | **Medio** | La re-indentazione di ~1.500 righe rende il diff grande: errori di trascrizione sono possibili e difficili da vedere |
| Stato condiviso già esistente (debug trace, `_statoPreToggle`, cache lessicale) | Invariato | Già condiviso oggi tra le sessioni; non peggiora e non migliora (vedi §9) |

Copertura attuale delle aree toccate: alta per la logica di gioco (suite unitaria e di integrazione) e per l'isolamento (`tests/api.engine.multisession.isolation.test.ts`). Nessun test copre oggi la memoria.

Contenimento:
- revisione del diff con `git diff -w` (ignora gli spazi), così la re-indentazione non nasconde modifiche reali;
- nuovi test di isolamento sul motore (TB-03…TB-06) e misura della memoria (TB-08) prima del merge;
- rollback: revert della PR, nessuna migrazione di dati né di configurazione.

## 2. Problema

`src/middleware/sessionContext.js` crea un motore per sessione importando `engine.js` con una query string diversa (`engine.js?session=<uuid>`). Node tratta ogni URL come un modulo distinto e non scarica mai i moduli ESM: l'evizione della sessione dalla `Map` non libera la memoria.

Misure su `0a2d684` (Node 22; produzione su Node 20, valori indicativi):

| Componente | Per sessione |
|---|---|
| Testo sorgente di `engine.js` conservato per ogni istanza | ~120 KB |
| Record del modulo, funzioni, scope | ~20 KB |
| Bytecode compilato durante il gioco | ~60 KB |
| Stato di gioco | ~11 KB |
| **Totale, mai rilasciato** | **~140 KB alla creazione, ~210 KB dopo 8 comandi** |

Ogni scheda del browser crea una sessione (UUID per scheda in `sessionStorage`). Ogni richiesta a `/api/engine/*` o `/api/luogo-oggetti` senza un `X-Session-Id` valido ne crea una nuova. Ordine di grandezza: 1.000 sessioni distinte ≈ 200 MB occupati fino al riavvio del processo.

## 3. Obiettivi e non obiettivi

Obiettivi:
1. Un solo caricamento di `engine.js` per processo.
2. Memoria per sessione limitata allo stato e alle closure del motore, e rilasciata quando la sessione viene rimossa.
3. Comportamento di gioco e API HTTP invariati.

Non obiettivi (blocchi successivi):
- rendere il motore privo di stato, con `gameState` passato come parametro (E2);
- ridurre la complessità di `executeCommandLegacy` e simili (E2, issue #63);
- eliminare lo stato condiviso già esistente (B6);
- cambiare la creazione delle sessioni per le richieste senza ID (valutare dopo A1).

## 4. Soluzione

### 4.1 Factory del motore in `src/logic/engine.js`

- Gli `import` restano in testa al modulo.
- Tutto il resto del modulo diventa il corpo di `export function createEngine()`. Le variabili oggi a livello di modulo (`gameState`, `originalOggetti`) diventano variabili della funzione.
- Le funzioni oggi esportate perdono la parola `export` e vengono restituite in un oggetto.
- Il modulo crea un'istanza di default e ne riesporta i metodi con lo stesso nome, così `server.js` e i test continuano a funzionare senza modifiche.

Schema:

```js
import { getSystemMessage } from './systemMessages.js';
// ... altri import invariati ...

export function createEngine() {
  let gameState = { /* invariato */ };
  let originalOggetti = [];

  function resetGameState(idLingua = 1) { /* invariato */ }
  function executeCommand(parseResult) { /* invariato */ }
  // ... tutte le altre funzioni, invariate ...

  return {
    enterLocation, executeCommandAsync, confirmEnd, confirmRestart,
    initializeOriginalData, getGameState, resetGameState,
    shouldConsumeTurn, hasFonteLuceAttiva, prepareTurnContext,
    runPreExecutionChecks, applyTurnEffects, generateHelpMessage,
    generaDescrizioneLuogoConOggetti, getOggetti, getDirezioniLuogo,
    setGameState, setCurrentLocation, getGameStateSnapshot,
    toCommandDTO, executeCommand,
  };
}

// Istanza di default: API di modulo invariata per server.js e test.
const defaultEngine = createEngine();
export const resetGameState = (...args) => defaultEngine.resetGameState(...args);
// ... una riga per ciascuna delle 21 funzioni dell'elenco sopra ...
```

Vincoli:
- L'elenco delle 21 funzioni esportate deve restare identico: stessi nomi, stesse firme, stesso comportamento.
- La copia originale degli oggetti resta condivisa tramite `globalThis.__odessaOriginalOggetti`, come oggi.
- Nessuna modifica alla logica di gioco, ai testi o ai dati JSON.

### 4.2 `src/middleware/sessionContext.js`

- Sostituire `importEngineModuleForSession(sessionId)` con una funzione `createEngineForSession()` che chiama `createEngine()`, poi `initializeOriginalData()`. Il `resetGameState(1)` resta dove è oggi.
- Rimuovere l'`import()` dinamico con query string.
- Nessun'altra modifica: TTL, limite di 200 sessioni, evizione, header e ID restano invariati.

### 4.3 Cosa resta condiviso tra le sessioni

| Elemento | Condiviso | Note |
|---|---|---|
| `global.odessaData` | Sì | Già oggi; sola lettura salvo `_statoPreToggle` (B6) |
| Copia originale degli oggetti | Sì | Già oggi, tramite `globalThis` |
| Cache del lessico (`parser.js`) | Sì | Già oggi |
| Trace di debug (`engineDebug.js`) | Sì | Già oggi: un reset di qualunque sessione la svuota; solo con `ENGINE_DEBUG` attivo |
| `gameState` e copia di lavoro degli oggetti | **No** | Per motore |

## 5. Alternative considerate

| Alternativa | Esito |
|---|---|
| Motore senza stato, `gameState` passato come parametro | Scartata per ora: tocca tutte le firme e molti test; è l'obiettivo di E2 |
| Un unico motore e scambio di `gameState` a ogni richiesta | Scartata: le route usano `await` (parser), richieste di sessioni diverse si possono intrecciare e scambiarsi lo stato |
| `AsyncLocalStorage` per lo stato corrente | Scartata: richiede di cambiare ogni accesso a `gameState`, introduce un meccanismo implicito |
| Worker o processi per sessione | Sproporzionata |
| Solo rimozione dei caratteri non Latin-1 (A2) | Mitigazione, non soluzione; superata da A1 |

## 6. File coinvolti

| File | Modifica |
|---|---|
| `src/logic/engine.js` | Factory `createEngine()` più istanza di default ed export di compatibilità |
| `src/middleware/sessionContext.js` | Creazione del motore con la factory |
| `tests/unit/engine-factory.test.ts` (nuovo) | Test TB-03…TB-06 |
| `scripts/measure-session-memory.mjs` (nuovo) | Misura TB-08, eseguita a mano, non in CI |
| `docs/release-notes/Unreleased.md` | Voce sulla correzione della memoria delle sessioni |

Nessuna nuova dipendenza.

## 7. Criteri di accettazione

| ID | Criterio |
|---|---|
| AC-1 | `npm run lint`, `npm run build`, `npm test` PASS; la suite esistente passa senza modifiche ai test esistenti |
| AC-2 | Nessun `import()` dinamico di `engine.js` nel codice applicativo (`grep -rn "engine.js?" src` vuoto; nessun `searchParams.set('session'` in `src`) |
| AC-3 | Due motori creati con `createEngine()` hanno stati indipendenti (TB-03…TB-06) |
| AC-4 | L'isolamento via API resta valido (`tests/api.engine.multisession.isolation.test.ts`) |
| AC-5 | Memoria per sessione attiva ≤ 30 KB e memoria residua dopo il rilascio ≤ 2 KB per sessione, su 1.000 sessioni con 8 comandi ciascuna (TB-08) |
| AC-6 | `git diff -w origin/main...HEAD -- src/logic/engine.js` mostra solo: dichiarazione della factory, rimozione di `export` dalle funzioni interne, oggetto restituito, istanza di default ed export di compatibilità |
| AC-7 | Le 21 funzioni esportate da `engine.js` hanno gli stessi nomi di prima |

## 8. Testbook

| ID | Caso | Precondizioni | Passi | Atteso |
|---|---|---|---|---|
| TB-01 | Suite esistente | Dipendenze installate | `npm test` | Tutti i test passano come sulla baseline (285 passati, 17 saltati) |
| TB-02 | Export invariati | — | Confrontare i nomi esportati da `engine.js` prima e dopo (`Object.keys(await import(...))`) | Stesso insieme di 21 funzioni, più `createEngine` |
| TB-03 | Stato indipendente | `initOdessa()` eseguito | Creare A e B; `A.resetGameState(1)`, `B.resetGameState(1)`; `A.setCurrentLocation(5)` | `A.getGameState().currentLocationId === 5`; per B resta `1` |
| TB-04 | Reset indipendente | Come TB-03, A in luogo 5 | `B.resetGameState(1)` | A resta nel luogo 5 |
| TB-05 | Comandi indipendenti | Come TB-03 | Eseguire su A un comando parsato `e` (`executeCommand`) | Turni consumati di A = 1; di B = 0 |
| TB-06 | `setGameState` indipendente | Come TB-03 | `B.setGameState(A.getGameStateSnapshot())`; poi `A.setCurrentLocation(3)` | B non cambia luogo; gli oggetti di B non sono lo stesso riferimento di quelli di A |
| TB-07 | Isolamento API | — | `tests/api.engine.multisession.isolation.test.ts` | PASS |
| TB-08 | Memoria | `node --expose-gc` | `node --expose-gc scripts/measure-session-memory.mjs`: crea 1.000 motori, esegue 8 comandi ciascuno, misura heap, rilascia i riferimenti, misura di nuovo | Valori entro AC-5; lo script stampa KB per sessione attiva e dopo il rilascio |
| TB-09 | Prova manuale | `npm run dev` | Due schede: partite diverse, salvataggio e caricamento in una, `FINE` e riavvio nell'altra | Nessuna interferenza; comportamento identico alla produzione attuale |

Lo script di TB-08 deve fare quanto segue:
1. caricare i dati con `initOdessa()`;
2. preparare 8 comandi parsati: `e`, `n`, `prendi lampada`, `accendi lampada`, `s`, `esamina documenti`, `inventario`, `punti`;
3. creare 1.000 motori, eseguire i comandi, tenere i riferimenti;
4. misurare l'heap dopo `global.gc()`;
5. rilasciare i riferimenti, rieseguire `global.gc()`, misurare di nuovo.

Riferimento del prototipo: 12,5 KB per sessione attiva, 0,3 KB dopo il rilascio.

## 9. Rischi residui e punti fuori perimetro

- **Stato condiviso esistente**: `_statoPreToggle` sui dati globali e trace di debug condivisa restano come oggi. Sono trattati in B6.
- **Sessioni create senza ID**: dopo A1 una sessione costa ~12 KB e viene liberata dall'evizione: il rischio di esaurimento della memoria diventa limitato dal tetto di 200 sessioni. Se servirà ridurre anche la creazione di sessioni da richieste senza ID, sarà un intervento separato.
- **Formattazione**: `npm run format:check` non è nella CI. La re-indentazione deve seguire lo stile esistente (2 spazi); non eseguire `npm run format` su tutto il repository (`AGENTS.md`).

## 10. Rollback

Revert della PR. Non ci sono migrazioni di dati, di configurazione o di salvataggi: il formato degli snapshot non cambia.

## 11. Evidenze da restituire (Human gate)

- Output di AC-1 (lint, build, test con conteggi).
- Output dei grep di AC-2.
- `git diff -w --stat` e il diff di `sessionContext.js`.
- Output di TB-02 e TB-08.
- Esito della prova manuale TB-09.
- URL della PR e stato della CI.
