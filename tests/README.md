# Suite di test

Test automatici del progetto (Vitest). Questo file descrive come sono classificati i file, quali dipendono dai dati di Odessa e come aggiungere nuovi test. Le classificazioni derivano dalla ricognizione HO-37 e sono aggiornate dopo la revisione HO-38.

## Esecuzione

- Suite completa: `npm test`
- Un solo file: `npm test -- tests/<file>.test.ts`
- Lint, typecheck e build come in CI: `npm run lint`, `npm run typecheck`, `npm run build`.

## Categorie e ambiti

**Categoria** (una per file):

- **a** — unitario del motore: moduli del motore o degli effetti, con dati sintetici o minimi
- **b** — integrazione/endpoint: router o middleware Express
- **c** — snapshot/baseline: confronta con un fixture protetto o rigenera una traccia
- **d** — caratterizzazione: fissa il comportamento esistente prima di un refactor; resta un controllo di comportamento attivo
- **e** — specifico di Odessa: asserisce testi, ID, enigmi o dati di Odessa

**Ambito** (uno per file, la parte prevalente):

- **M** — motore
- **O** — Odessa
- **S** — server/middleware
- **D** — dati statici e i18n

## File di test

Colonna «Odessa»: **sì** se il file importa dati di Odessa, `initOdessa` o moduli `game/odessa/*`, oppure verifica contenuti di Odessa; **no** altrimenti. «Test» e «Saltati» sono i valori dopo la revisione HO-38.

| File | Cat. | Ambito | Odessa | Test | Saltati |
| --- | --- | --- | --- | --- | --- |
| `api.auth.test.ts` | b | S | no | 4 | 0 |
| `api.config.test.ts` | b | S | no | 2 | 0 |
| `api.engine.execute.contract.test.ts` | b | S | sì | 9 | 0 |
| `api.engine.load.language-mismatch.test.ts` | b | S | sì | 2 | 0 |
| `api.engine.multisession.isolation.test.ts` | b | S | no | 1 | 0 |
| `api.engine.navigation.http.test.ts` | b | S | sì | 5 | 0 |
| `api.errorhandler.test.ts` | b | S | no | 3 | 0 |
| `api.legacy.endpoints.removed.test.ts` | b | S | no | 4 | 0 |
| `api.ratelimit.heavy.test.ts` | b | S | no | 1 | 0 |
| `api.ratelimit.test.ts` | b | S | no | 1 | 0 |
| `api.ratelimit.xforwardedfor.test.ts` | b | S | no | 6 | 0 |
| `api.validation.test.ts` | b | S | sì | 7 | 0 |
| `architecture.test.ts` | a | M | sì | 11 | 0 |
| `characterization.engine.actions.test.ts` | d | M | sì | 3 | 0 |
| `characterization.engine.state.test.ts` | d | M | sì | 10 | 0 |
| `characterization.errorhandler.test.ts` | d | S | no | 63 | 0 |
| `characterization.http-keys.test.ts` | d | S | sì | 21 | 0 |
| `characterization.parser.test.ts` | d | M | sì | 6 | 0 |
| `characterization.routes.test.ts` | d | S | sì | 9 | 0 |
| `characterization.schema.test.ts` | d | M | no | 9 | 0 |
| `characterization.state.test.ts` | d | M | sì | 26 | 0 |
| `characterization.turneffects.test.ts` | d | O | no | 2 | 0 |
| `engine.debug.trace.test.ts` | a | M | no | 5 | 0 |
| `engine.examine-open.test.ts` | e | O | sì | 4 | 1 |
| `engine.game.test.ts` | e | O | sì | 10 | 0 |
| `engine.help.test.ts` | e | O | sì | 10 | 0 |
| `engine.navigation.server.test.ts` | e | O | sì | 4 | 0 |
| `engine.terminal.test.ts` | e | O | sì | 4 | 0 |
| `gameConfig.test.ts` | a | M | sì | 22 | 0 |
| `gameData.access.test.ts` | a | M | sì | 3 | 0 |
| `help.en.format.test.ts` | e | O | no | 4 | 0 |
| `i18n.data-internal.interazioni.test.ts` | e | D | sì | 1 | 0 |
| `i18n.data-internal.luoghi-oggetti.test.ts` | e | D | sì | 2 | 0 |
| `i18n.data-internal.messaggi-frontend.test.ts` | e | D | sì | 1 | 0 |
| `i18n.data-internal.voci-lessico.test.ts` | e | D | sì | 2 | 0 |
| `i18n.frontend-ui.bindings.test.ts` | e | D | no | 2 | 0 |
| `i18n.interazioni.runtime.test.ts` | e | D | sì | 1 | 0 |
| `init-odessa.test.ts` | e | O | sì | 3 | 0 |
| `interactions.registry.test.ts` | a | M | sì | 8 | 0 |
| `interazioni.schema.test.ts` | e | D | sì | 5 | 0 |
| `issue-58.invariants.edgecases.test.ts` | e | O | sì | 4 | 0 |
| `lexicon.l1.test.ts` | e | O | sì | 8 | 0 |
| `lexicon.l3.test.ts` | e | O | sì | 15 | 0 |
| `lexicon.nav-voices.test.ts` | e | D | sì | 1 | 0 |
| `location.toggle.test.ts` | a | M | sì | 5 | 0 |
| `luoghi.schema.test.ts` | e | D | sì | 4 | 0 |
| `matches.test.ts` | e | O | sì | 13 | 0 |
| `oggetti.schema.test.ts` | e | D | sì | 3 | 0 |
| `parse.error-taxonomy.i18n.test.ts` | a | M | no | 3 | 0 |
| `parser.full.test.ts` | c | M | sì | 3 | 0 |
| `parser.longnouns.test.ts` | e | O | sì | 71 | 0 |
| `parser.regression.test.ts` | c | M | sì | 5 | 0 |
| `parser.test.ts` | a | M | sì | 21 | 0 |
| `parser.vocabulary.test.ts` | c | M | sì | 4 | 0 |
| `passage.collapse.test.ts` | e | O | sì | 12 | 0 |
| `puzzles.r7.test.ts` | e | O | sì | 14 | 0 |
| `responses.language.test.ts` | c | O | sì | 1 | 0 |
| `responses.snapshot.test.ts` | c | O | sì | 2 | 0 |
| `saves.compat.test.ts` | c | M | sì | 2 | 0 |
| `scoring.base.test.ts` | e | O | sì | 5 | 0 |
| `scoring.invariants.test.ts` | e | O | sì | 2 | 0 |
| `scoring.max.test.ts` | e | O | sì | 3 | 0 |
| `scoring.mysteries.test.ts` | e | O | sì | 7 | 1 |
| `state.load-defaults.test.ts` | a | M | sì | 21 | 0 |
| `synonyms.test.ts` | e | O | sì | 6 | 0 |
| `texts.l2a.test.ts` | e | O | sì | 5 | 0 |
| `timers.original.test.ts` | e | O | sì | 26 | 0 |
| `trace.engine.test.ts` | c | M | no | 2 | 0 |
| `trace.http.test.ts` | c | S | no | 2 | 0 |
| `unit/darkness-effect.test.ts` | a | O | no | 8 | 0 |
| `unit/engine-factory.test.ts` | a | M | sì | 4 | 0 |
| `unit/gameover-effect.test.ts` | a | O | no | 24 | 0 |
| `unit/interaction-effects.test.ts` | a | M | sì | 9 | 0 |
| `unit/interaction-prerequisites.test.ts` | a | O | sì | 9 | 0 |
| `unit/intercept-effect.test.ts` | a | O | no | 15 | 0 |
| `unit/toggle-no-global-mutation.test.ts` | a | M | sì | 1 | 0 |
| `unit/torch-system.test.ts` | a | O | no | 9 | 0 |
| `unit/turn-effects-registry.test.ts` | a | O | no | 13 | 0 |
| `unit/turn-system.test.ts` | a | M | no | 35 | 0 |
| `unit/victory-effect.test.ts` | a | O | no | 22 | 0 |
| `unit/wrapper-pipeline.test.ts` | d | M | no | 3 | 0 |
| `verbs-coverage.test.ts` | e | O | sì | 1 | 0 |
| `verbs.l2b.test.ts` | e | O | sì | 25 | 0 |
| `walkthrough.test.ts` | c | O | sì | 5 | 0 |
| **Totale (84 file)** | | | | **749** | **2** |

Per ambito: M 24 file/221 test, O 34 file/366 test, S 16 file/140 test, D 10 file/22 test.

## Riuso per un nuovo gioco

**Non dipendono dai dati di Odessa (25 file)** — verificano meccanismi generali e sono candidati al riuso:

- motore: `characterization.schema.test.ts`, `engine.debug.trace.test.ts`, `parse.error-taxonomy.i18n.test.ts`, `trace.engine.test.ts`, `unit/turn-system.test.ts`, `unit/wrapper-pipeline.test.ts`
- server/middleware: `api.auth.test.ts`, `api.config.test.ts`, `api.engine.multisession.isolation.test.ts`, `api.errorhandler.test.ts`, `api.legacy.endpoints.removed.test.ts`, `api.ratelimit.heavy.test.ts`, `api.ratelimit.test.ts`, `api.ratelimit.xforwardedfor.test.ts`, `characterization.errorhandler.test.ts`, `trace.http.test.ts`
- dati statici e i18n: `i18n.frontend-ui.bindings.test.ts`
- Odessa: `characterization.turneffects.test.ts`, `help.en.format.test.ts`, `unit/darkness-effect.test.ts`, `unit/gameover-effect.test.ts`, `unit/intercept-effect.test.ts`, `unit/torch-system.test.ts`, `unit/turn-effects-registry.test.ts`, `unit/victory-effect.test.ts`

**Dipendono da Odessa (59 file)** — asseriscono testi, ID, enigmi, fixture o dati di Odessa e andrebbero riscritti o sostituiti per un altro gioco (tutti i file con «sì» nella tabella). In particolare:

- tutti i file di categoria **e** (specifici di Odessa), compresi i percorsi di riferimento e i test degli enigmi;
- i file di categoria **c** (snapshot/baseline) e **d** (caratterizzazione) che usano dati o fixture di Odessa;
- i test dei dati (ambito D) che leggono i JSON in `src/data-internal/`;
- gli effetti di turno in `src/logic/turnEffects/`, trattati come Odessa (7 effetti su 8 importano `game/odessa/*`), e i relativi test unitari.

Limite attuale: nessun test usa un gioco di prova diverso da `odessaGame` (`engine.js` lo fissa di default e `parser.js` legge la configurazione di Odessa). Anche i file con «no» passano da quel motore: sono indipendenti dai *dati*, non ancora dal *gioco*. Un test del motore davvero indipendente richiede prima di rendere il motore parametrico sul gioco.

## Fixture protetti

I file sotto `tests/fixtures/` (`parser/`, `responses/`, `state/`, `trace/`, `walkthrough/`) sono baseline registrate e **non si modificano né si rigenerano per far passare un test**: un cambio ammesso richiede una specifica che lo dichiari. I generatori sono in `scripts/baselines/` (vedi il README di quella cartella).

## Test saltati

Un test saltato porta accanto al `skip` il motivo scritto in un commento. Oggi ce ne sono due:

- `engine.examine-open.test.ts` — «APRI oggetto -> aperto; CHIUDI oggetto -> chiuso»: asserisce `openStates.BOTOLA`, che nessun altro test verifica; serve la botola visibile.
- `scoring.mysteries.test.ts` — «NON dovrebbe assegnare punti duplicati per direzione bidirezionale (20↔21)»: asserisce il rifiuto del secondo INFILA MEDAGLIONE, che nessun altro test verifica.

## Convenzione per i nuovi test

1. **Posizione e nome.** In `tests/<area>.<oggetto>.test.ts`; i test di un singolo modulo del motore o di un effetto di turno in `tests/unit/<modulo>.test.ts`. Gli helper condivisi stanno in `tests/testUtils/`.
2. **Classificazione.** Alla creazione del file aggiungere la sua riga alla tabella sopra, con categoria (a-e) e ambito (M, O, S, D) secondo le definizioni di questo file.
3. **Titoli.** `describe` e `it` descrivono il comportamento verificato, in italiano. Niente cronaca del lavoro (lotti, sprint, fasi, numeri di handoff) né nomi di funzioni che non esistono più.
4. **Motore e stato.** Un motore proprio per ogni test (`createEngine()` con `initializeOriginalData()` e `resetGameState(lingua)`); non modificare `global.odessaData` né i dati statici. Per portare il gioco in una situazione, giocare i comandi reali (parser e motore) a partire dai passi di `tests/fixtures/walkthrough/`, invece di impostare lo stato a mano.
5. **Messaggi.** Verificare i testi tramite chiave (`getSystemMessage`) quando esiste, in italiano e in inglese se la funzione è localizzata.
6. **Niente `skip` o `todo` senza motivo.** Un test che non si può far passare si corregge o si elimina; se resta saltato, il motivo si scrive accanto al `skip` e il file si elenca nella sezione «Test saltati».
7. **Eliminare un test** solo se un altro test continua ad asserire lo stesso comportamento, indicandolo nella descrizione della modifica; nel dubbio il test resta.
8. **Endpoint.** Per le route coprire contratto, validazione, errori, isolamento tra sessioni (`X-Session-Id`, `X-Game-Id`) e assenza di stack trace o percorsi interni nelle risposte di errore.
