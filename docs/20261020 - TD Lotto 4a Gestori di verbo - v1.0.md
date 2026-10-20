# TD Lotto 4a — Motore: contesto, dispatch e gestori di verbo (v1.4.2)

| Campo | Valore |
|---|---|
| Issue | #63 (`Refs #63`), #123 (`Refs #123`) |
| Baseline | `release/v1.4.2` @ `4acdd1b` |
| Riferimento | TD 0 v1.0 §4.1–§4.4, §4.7, §4.8; TD lotto 3 v1.1 (D-L3-2, residui) |
| Stato | v1.0, approvata il 2026-10-20 |
| Modello | Fase 1A-1 (passaggi P1–P3): **Sonnet 5.5, effort medio**. Fase 1A-2 (P4–P5): **Opus 5.5, effort medio** (alto se una rete fallisce due volte di seguito). Fase 1B: **Sonnet 5.5, effort medio**. Fase 2: **Sonnet 5.5, effort basso** |

---

## 1. Valutazione del rischio di regressione

**Alto**, il più alto della v1.4.2: `executeCommandLegacy` (righe 1352–1849, complessità 160) decide quasi tutte le risposte, e l'ordine dei suoi controlli è parte del comportamento.

| Rischio | Mitigazione |
|---|---|
| Riordino dei controlli: un comando valido riceve la risposta di un altro ramo | Precedenza trascritta in §4 come tabella vincolante; test sull'ordine degli `id` dei gestori; istantanea delle risposte (88.151 voci) e tracce |
| Calcolo anticipato di un valore che oggi è calcolato dopo una mutazione (es. l'oggetto presente, calcolato oggi **dopo** l'esecuzione delle interazioni) | Regola R3 (§3.3) e tabella §4 con il momento di calcolo |
| Ordine delle chiavi nei risultati: le tracce confrontano JSON | Regola R4: oggetti risultato copiati alla lettera |
| `gameState` riassegnato da `resetGameState`/`setGameState` | Il contesto si crea a ogni comando e legge lo stato corrente (§3.2) |
| Interruzione per limiti d'uso a metà del refactor | Cinque passaggi, ognuno chiuso a test verdi con copia di sicurezza delle modifiche (handoff) |

Reti che devono restare **identiche** senza aggiornamenti: istantanea risposte (`97a62ceb…`), corpus del parser, `parse_full_baseline.json` (`e9ccc844…`), `vocabulary_baseline.json` (`24a962b1…`), traccia motore (`dfbe5a46…`), traccia HTTP (`db892c31…`), compatibilità salvataggi, caratterizzazione, percorsi completi, punteggio 138.

---

## 2. Obiettivi e perimetro

**Nel perimetro**
- P1 `src/logic/core/gameData.js` con `getGameData()`; `engine.js` non legge più `global.odessaData` direttamente (TD 0 §4.8, D-L3-2).
- P2 definizione del gioco `src/game/odessa/index.js` (`odessaGame`), `createEngine(game = odessaGame)`, contesto `core/context.js`, `core/dispatch.js`, regole di Odessa `src/game/odessa/rules.js`; dentro `createEngine` i riferimenti a `CONFIG` diventano `game.config`.
- P3 gestori `NAVIGATION` e `SYSTEM`.
- P4 gestori `ACTION`; eliminazione di `executeCommandLegacy`.
- P5 codice morto (elenco del lotto 0), derivazione dei flag dei salvataggi in `rules.js` (residui del lotto 3), regola ESLint sulle dipendenze, test di architettura.

**Fuori perimetro**
- `verificaPrerequisiti`, `applicaEffetti`, `cercaEseguiInterazione` e i registri delle interazioni (lotto 4b): restano nel motore, invariati, esposti ai gestori tramite `helpers`.
- `prepareTurnContext`, `applyTurnEffects`, `turnEffects/` (lotto 5); `turnEffects/` continua a importare `CONFIG`.
- Estrazione di `setGameState`/`resetGameState` in `core/state.js` (lotto 5, se la TD lo prevede).
- Testi fissi IT/EN dei movimenti (`'Non puoi andare in quella direzione.'`, `'Direzione non riconosciuta.'`): restano alla lettera (candidato issue, §8).
- Qualsiasi correzione di comportamento.

---

## 3. Soluzione

### 3.1 Moduli

```
src/logic/
  engine.js                 facciata: createEngine(game = odessaGame) + 20 esportazioni invariate
  core/
    gameData.js             getGameData()
    context.js              createContext(...)
    dispatch.js             dispatch(handlers, cmd, ctx)
    command.js              buildCommand(parseResult, state, helpers)
    handlers/
      navigation.js         core.nav.unknownDirection, core.nav.move
      system.js             core.system
      interaction.js        core.action.interaction
      examine.js            core.action.examine
      openClose.js          core.action.openClose
      take.js               core.action.take
      drop.js               core.action.drop
      fallback.js           core.action.fallback
src/game/odessa/
  config.js                 (lotto 3, invariato)
  index.js                  odessaGame = { id, config, verbHandlers, rules }
  rules.js                  hasActiveLight, rankKey, deriveLoadedFlags
  handlers/
    navigation.js           odessa.nav.collapsedPassage, odessa.nav.blockedWithText
    darkness.js             odessa.action.darkness
    light.js                odessa.action.lightMatches, odessa.action.lightGeneric, odessa.action.lightTorch
    weight.js               odessa.action.loadWeight
    flavor.js               odessa.action.spegni, .scappa, .sorridi, .dormi, .parla
    guard.js                odessa.action.attackGuard
    dig.js                  odessa.action.dig
    rotate.js               odessa.action.rotateDirection, odessa.action.rotateKnob
    move.js                 odessa.action.moveObject
    examine.js              odessa.action.examineSpecial
```

Nomi dei file vincolanti per i nuovi moduli; gli `id` dei gestori sono vincolanti (test §5).

Dipendenze (TD 0 §4.7): `core/**` non importa `src/game/**`; `game/odessa/**` importa da `core/`, `systemMessages.js`, `config.js`; `engine.js` importa entrambi. `game/odessa/index.js` compone l'elenco ordinato importando i gestori generici di `core/handlers/`.

### 3.2 Contesto e comando

**Contesto**, creato **a ogni chiamata** di `executeCommand` dopo i controlli preliminari (mai in cache, perché `gameState` viene riassegnato):

```js
ctx = {
  state,                         // lo stesso oggetto gameState corrente, nessuna copia
  game,                          // odessaGame
  msg: (key, params) => getSystemMessage(key, state.currentLingua, params), // lingua letta a ogni chiamata
  helpers: {
    normalize,                   // normalizeForComparison attuale
    findObjectHereOrInventory,   // ricerca di "PRIORITÀ 2" (riga 1709), stessa condizione
    cercaEseguiInterazione, accendiFiammifero, setCurrentLocation, getDirezioniLuogo,
    generateHelpMessage, generaDescrizioneLuogoConOggetti,
  },
}
```

`msg` produce le stesse chiamate di oggi: `getSystemMessage(chiave, idLingua = 1, params = [])` tratta `params` assente o `undefined` come `[]` (verificato su `systemMessages.js`), quindi `ctx.msg(k)` equivale a `getSystemMessage(k, lingua)`.

**Comando** (`buildCommand`), costruito una volta con gli stessi calcoli e allo stesso momento di oggi:

| Campo | Tipo di comando | Calcolo (alla lettera dal codice attuale) |
|---|---|---|
| `type` | tutti | `parseResult.CommandType` |
| `parseResult` | tutti | riferimento |
| `concept` | NAVIGATION, SYSTEM | `(VerbConcept \|\| CanonicalVerb \|\| '').toUpperCase()` |
| `concept` | ACTION | `(VerbConcept \|\| '').toUpperCase()` (**senza** ripiego su `CanonicalVerb`) |
| `verb` | ACTION | `(CanonicalVerb \|\| '').toUpperCase()` |
| `noun` | ACTION | `(NounConcept \|\| CanonicalNoun \|\| '').toUpperCase()` |
| `nounForMissingObject` | ACTION | righe 1541–1546, calcolato alla costruzione del comando (prima di ogni gestore, come oggi) |

### 3.3 Dispatch e regole di trascrizione

```js
export function runHandlers(handlers, cmd, ctx) {   // risultato o null
  for (const h of handlers) {
    if (!h.types.includes(cmd.type)) continue;
    if (h.match && !h.match(cmd, ctx)) continue;
    const r = h.run(cmd, ctx);
    if (r) return r;
  }
  return null;
}

export function dispatch(handlers, cmd, ctx) {
  return runHandlers(handlers, cmd, ctx)
    ?? { accepted: false, resultType: 'ERROR', message: ctx.msg('engine.error.unknownCommandType') };
}
```

Il ripiego finale è il `default` attuale dello `switch` (riga 1847), stesso oggetto. Durante la migrazione a gruppi (P4) il codice non ancora migrato usa `runHandlers` sui gestori già migrati e prosegue se il risultato è `null`.

Un gestore è `{ id, types, match?, run }`. `run` restituisce un risultato oppure `null` per passare al successivo (i rami che oggi "proseguono con l'elaborazione standard").

- **R1 — alla lettera.** Il corpo di ogni gestore è il blocco attuale spostato, con le sole sostituzioni `gameState` → `ctx.state`, `getSystemMessage(k, gameState.currentLingua, p)` → `ctx.msg(k, p)`, helper → `ctx.helpers.*`, `CONFIG` → `ctx.game.config`. Nessuna semplificazione di condizioni, nessuna fusione di rami.
- **R2 — precedenza.** L'ordine dei gestori è quello di §4; nessun riordino, nemmeno tra gestori che sembrano indipendenti.
- **R3 — momento dei calcoli.** L'oggetto presente (`oggetto`, riga 1709) oggi si calcola **dopo** le interazioni (riga 1700): i gestori che lo usano (righe 15–24 di §4) lo ricalcolano con `ctx.helpers.findObjectHereOrInventory(cmd.noun)` al proprio turno, mai in `buildCommand`. `fiammiferiRecord` (riga 1557) si ricalcola nei gestori che lo usano (ricerca per ID, nessuna mutazione intermedia).
- **R4 — risultati.** Ogni oggetto risultato mantiene chiavi, valori e **ordine delle chiavi** attuali.
- **R5 — un solo `normalizeForComparison`.** Le ridefinizioni locali in PRENDI e POSA (righe 1799, 1818) sono identiche a quella del motore (riga 970): si usa `ctx.helpers.normalize`.

### 3.4 Regole di Odessa (`rules.js`)

| Funzione | Origine | Note |
|---|---|---|
| `hasActiveLight(state)` | `hasFonteLuceAttiva` di `torchEffect.js` (righe 21–42), spostata | Equivalente a quella di `engine.js` (376–405): stesse condizioni, nessun effetto collaterale. `torchEffect.js` la reimporta e la riesporta con il nome attuale; l'esportazione `hasFonteLuceAttiva()` del motore delega a `game.rules.hasActiveLight(gameState)` |
| `rankKey(score)` | `rankKeyFor(score, config.punteggio.ranghi)` | usata da `core.system` (PUNTI) come `ctx.game.rules.rankKey` |
| `deriveLoadedFlags(newState)` | IIFE `flags` di `setGameState` (righe 734–748) | sostituisce l'IIFE; `36` → `config.luoghi.passaggioCrollato.destinazione`; ID del bastone (`1`) e `'sposta_quadro_24'` diventano costanti con nome in `rules.js` (dentro `game/odessa/` i riferimenti ai dati di Odessa sono ammessi, TD 0 §4.4) |

### 3.5 Facciata `engine.js`

- `createEngine(game = odessaGame)`; le 20 esportazioni e le loro firme invariate.
- `executeCommand` invariato nella struttura (controlli, `prepareTurnContext`, `runPreExecutionChecks`, effetti di turno, eventi di debug); la chiamata `executeCommandLegacy(parseResult)` diventa `dispatch(game.verbHandlers, buildCommand(...), createContext(...))`.
- `DARK_BLOCKED_VERBS` passa nel gestore `odessa.action.darkness`.
- Dentro `createEngine` ogni `CONFIG.` diventa `game.config.`; l'import di `CONFIG` resta solo se serve fuori dalla closure.

### 3.6 Codice morto (P5)

| Codice | Motivo | Verifica |
|---|---|---|
| Controlli `!parseResult` / `IsValid` in `executeCommandLegacy` (1353–1363) | Già fatti in `executeCommand` (1860–1870), unico chiamante | sparisce con la funzione |
| `case 'SU'`, `'GIU'`, `'GIÙ'` nella mappa delle direzioni | Il lessico ha solo `NORD, EST, SUD, OVEST, ALTO, BASSO` (`TerminiLessico.json`, tipo 2) | test §5 punto 4 |
| `default` di SYSTEM (`Stub: sistema …`) | Il lessico ha solo i 6 concetti gestiti (tipo 3) | test §5 punto 4; il caso residuo cade nel ripiego di `dispatch` |
| Ramo `SEQUENZA` vuoto in `applicaEffetti` | **Escluso**: `applicaEffetti` è del lotto 4b | — |

### 3.7 Accesso ai dati (P1)

`core/gameData.js`: `export function getGameData() { return global.odessaData; }`, letto **a ogni chiamata** (i test sostituiscono il global). Le 10 letture in `engine.js` (righe 203, 204, 560, 587, 639, 666, 696, 844, 885, 1190) diventano `getGameData()`, con la stessa espressione (compresi `?.` e `|| []`).

---

## 4. Precedenza dei gestori (vincolante)

`odessaGame.verbHandlers`, in quest'ordine (righe su `4acdd1b`):

| # | `id` | Tipo | Righe | Condizione | Esito |
|---|---|---|---|---|---|
| 1 | `core.nav.unknownDirection` | NAV | 1370–1407 | direzione non riconosciuta | `messageUnknown` (testo fisso) |
| 2 | `odessa.nav.collapsedPassage` | NAV | 1413–1434 | luogo/direzione del passaggio crollato | crollo o bloccato |
| 3 | `odessa.nav.blockedWithText` | NAV | 1436–1445 | destinazione non valida e coppia in `movimentiBloccatiConTesto` | testo dedicato |
| 4 | `core.nav.move` | NAV | 1446–1462 | sempre | bloccato generico (testo fisso) o spostamento |
| 5 | `core.system` | SYS | 1466–1514 | sempre | 6 concetti |
| 6 | `odessa.action.darkness` | ACT | 1552–1554 | verbo bloccato o CARICARE, senza luce | troppo buio |
| 7 | `odessa.action.lightMatches` | ACT | 1557–1561 | ACCENDERE + nome dei fiammiferi | `accendiFiammifero` |
| 8 | `odessa.action.loadWeight` | ACT | 1568–1590 | CARICARE + PESO/PESA/WEIGHT/SCALE | alla pesa: interazione o "serve un peso"; altrove `null` |
| 9 | `odessa.action.spegni` | ACT | 1592–1594 | SPEGNERE | |
| 10 | `odessa.action.scappa` | ACT | 1596–1598 | SCAPPARE | |
| 11 | `odessa.action.sorridi` | ACT | 1600–1602 | SORRIDERE | |
| 12 | `odessa.action.dormi` | ACT | 1605–1607 | DORMIRE o SEDERSI | |
| 13 | `odessa.action.parla` | ACT | 1609–1612 | PARLARE | barriera o altrove |
| 14 | `odessa.action.attackGuard` | ACT | 1618–1628 | ATTACCARE alla barriera | GAME_OVER |
| 15 | `odessa.action.lightGeneric` | ACT | 1631–1650 | ACCENDERE senza nome o LUCE | torcia, fiammifero, lampada, nessuna fonte |
| 16 | `odessa.action.lightTorch` | ACT | 1655–1668 | ACCENDERE + torcia localizzata | con te / nel luogo; altrimenti `null` |
| 17 | `odessa.action.dig` | ACT | 1671–1696 | SCAVARE senza nome o MACERIE | delegata, senza attrezzo, senza nome; altrimenti `null` |
| 18 | `core.action.interaction` | ACT | 1700–1705 | `noun && concept` | `cercaEseguiInterazione` o `null` |
| 19 | `odessa.action.rotateDirection` | ACT | 1716–1718 | RUOTARE + DESTRA/SINISTRA | |
| 20 | `odessa.action.rotateKnob` | ACT | 1723–1725 | RUOTARE + MANOPOLA, cassaforte, flag | |
| 21 | `odessa.action.moveObject` | ACT | 1728–1732 | SPOSTARE/MUOVI/SPOSTA + nome + oggetto presente | |
| 22 | `odessa.action.examineSpecial` | ACT | 1745–1769 | ESAMINA/GUARDA con nome LUOGO, GUARDIA alla barriera, oggetto scenico, MACERIE nei luoghi configurati | altrimenti `null` |
| 23 | `core.action.examine` | ACT | 1734–1742, 1771–1773 | ESAMINA/GUARDA (concetto o verbo) | senza nome: descrizione del luogo; oggetto assente; descrizione |
| 24 | `core.action.openClose` | ACT | 1776–1791 | APRIRE/CHIUDERE (concetto o verbo) | |
| 25 | `core.action.take` | ACT | 1792–1815 | PRENDERE/PRENDI | |
| 26 | `core.action.drop` | ACT | 1816–1829 | POSARE/LASCIARE/POSA/LASCIA | |
| 27 | `core.action.fallback` | ACT | 1831–1844 | sempre | senza nome; oggetto assente; non applicabile |

Equivalenza da verificare in Fase 1A per i punti delicati:
- **22 prima di 23**: oggi, dentro ESAMINA, il caso senza nome (1736) precede i casi speciali; il gestore 22 richiede sempre un nome, quindi senza nome passa a 23 → stesso esito.
- **21 e 23–27** usano l'oggetto ricalcolato (R3) dopo il gestore 18.
- **8**: le due chiamate a `cercaEseguiInterazione('METTERE', …)` e il ramo "già eseguita" restano nello stesso ordine.

---

## 5. Test

### 5.1 Nuovo `tests/architecture.test.ts`

1. Nessun file in `src/logic/core/**` importa da `src/game/**` (analisi degli `import` statici e dinamici).
2. `odessaGame.verbHandlers.map(h => h.id)` è uguale all'elenco di §4, nell'ordine.
3. `id` unici; `types` non vuoto e incluso in `['NAVIGATION', 'SYSTEM', 'ACTION']`; `run` è una funzione.
4. Copertura del lessico: i concetti di tipo NAVIGAZIONE in `TerminiLessico.json` sono tutti mappati da `core.nav.*`; quelli di tipo SISTEMA sono tutti gestiti da `core.system` (esportare l'elenco dei concetti gestiti e confrontarlo).
5. `createEngine()` e `createEngine(odessaGame)`: stessa risposta su una breve sequenza di comandi.
6. `rules.hasActiveLight` è la stessa funzione riesportata da `torchEffect.js` come `hasFonteLuceAttiva`.

### 5.2 ESLint

- Nuovo blocco in `eslint.config.*`: per `src/logic/core/**`, `no-restricted-imports` con pattern che vieta `**/game/**` (livello `error`).
- Avvisi di complessità: nessun avviso nei file nuovi; `executeCommandLegacy` non esiste più; totali non superiori a 12/7/6 (atteso un calo, da riportare per regola e per funzione).

### 5.3 Test esistenti

Nessuna modifica. Unica eccezione ammessa: i **commenti** che citano `executeCommandLegacy` in `tests/characterization.engine.state.test.ts` e `tests/unit/wrapper-pipeline.test.ts` possono restare invariati (sono storici); nessuna asserzione cambia.

---

## 6. Criteri di accettazione

| ID | Criterio |
|---|---|
| AC-1 | File toccati: `src/logic/engine.js`, `src/logic/turnEffects/torchEffect.js` (spostamento di `hasFonteLuceAttiva` con riesportazione), `eslint.config.*`, i nuovi file di §3.1, `tests/architecture.test.ts`; in Fase 2 `docs/` e `Unreleased.md` |
| AC-2 | Reti di §1 identiche; 138 punti |
| AC-3 | `npm run lint` uscita 0, regola `no-restricted-imports` attiva su `core/`; avvisi ≤ 12/7/6 e nessuno nei file nuovi |
| AC-4 | `npm run typecheck`, `npm run build`, `npm test` verdi; nessun test esistente modificato |
| AC-5 | `git grep -n "global.odessaData" -- src/logic/engine.js` vuoto; `git grep -n "executeCommandLegacy" -- src` vuoto |
| AC-6 | `git grep -nE "from ['\"].*game/" -- src/logic/core` vuoto |
| AC-7 | API di `engine.js` invariata: stesse 20 esportazioni più `createEngine` (test esistenti) |
| AC-8 | Tempi di `npm test` e di `responses.snapshot.test.ts` entro +10% rispetto alla baseline (misura alternata come nel lotto 2, se necessario) |

---

## 7. Decisioni (approvate il 2026-10-20)

| ID | Decisione | Motivo |
|---|---|---|
| D-4a-1 | Gestore `{ id, types, match?, run }` con `run` che può restituire `null` | TD 0 A4; i rami che proseguono oggi diventano `null` senza logica aggiuntiva |
| D-4a-2 | Elenco ordinato unico per i tre tipi di comando, filtrato per `types` | Una sola tabella di precedenza, un solo test |
| D-4a-3 | L'oggetto presente si ricalcola nei gestori (R3), non si memorizza nel comando | Garantisce il momento di calcolo attuale senza stato condiviso mutabile |
| D-4a-4 | `hasFonteLuceAttiva` unificata in `rules.hasActiveLight` (oggi duplicata in motore e `torchEffect.js`) | Elimina una duplicazione già equivalente; l'API resta |
| D-4a-5 | Codice morto: rimozione di `SU/GIU/GIÙ` e dello stub SYSTEM, coperta dal test sul lessico | Decisione del lotto 0; il test impedisce che un concetto nuovo del lessico resti senza gestore |
| D-4a-6 | Estrazione di `setGameState`/`resetGameState` fuori dal lotto (solo i flag passano a `rules.deriveLoadedFlags`) | Contiene il diff; i residui del lotto 3 vengono comunque chiusi |
| D-4a-7 | Fase 1A divisa in due sessioni (1A-1 Sonnet, 1A-2 Opus) con un report ciascuna | Costi: Opus solo per i gestori `ACTION`, la parte a rischio alto |

---

## 8. Candidati issue (non si correggono nel lotto)

- I messaggi di movimento bloccato e di direzione sconosciuta sono testi fissi IT/EN nel codice, non in `MessaggiSistema.json`: con una terza lingua non funzionerebbero.

---

## 9. Prova manuale (Mauro, `localhost:3001`)

1. Movimento: direzioni valide, una bloccata, `ovest` dal luogo 1 (testo dedicato).
2. `INVENTARIO`, `AIUTO`, `PUNTI`, `FINE` → `no`.
3. Al buio `PRENDI` qualcosa: troppo buio. `ACCENDI FIAMMIFERI`, poi `ACCENDI` da solo.
4. `PRENDI` / `POSA` un oggetto; `ESAMINA` un oggetto presente e uno assente; `APRI BOTOLA` due volte.
5. Comandi "di colore": `SORRIDI`, `DORMI`, `SCAPPA`, `SPEGNI`, `PARLA`.
6. Carica un salvataggio della v1.4.1: luogo, punteggio e inventario corretti.
