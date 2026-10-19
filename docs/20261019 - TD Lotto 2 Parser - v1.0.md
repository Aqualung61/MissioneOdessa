# TD Lotto 2 — Parser: scomposizione e nuova firma (v1.4.2)

| Campo | Valore |
|---|---|
| Documento | Specifica tecnica (TD) |
| Versione | v1.0 — approvata da Mauro Giorgi il 2026-10-19 (decisioni D-L2-1..3 in §6) |
| Data | 2026-10-19 |
| Issue | #63 (`Refs #63`); #126 per la pulizia dei commenti |
| Destinazione | `release/v1.4.2` |
| Baseline | `release/v1.4.2` @ `3c1a379` (lotto 1) |
| Modello consigliato | Fase 1A: Claude Sonnet 5.5, effort medio (alto se la prima prova non supera le istantanee). Fase 1B: Claude Sonnet 5.5, effort medio. Fase 2: Claude Sonnet 5.5, effort basso |

## 1. Valutazione del rischio di regressione

**Livello: medio, ben contenuto.** Il lotto riscrive l'interno di `parser.js` (complessità 38 e 53), da cui dipende ogni comando del gioco. Il comportamento atteso è identico, ed è fissato da istantanee che coprono l'intero output del parser.

| Area | Rischio | Perché | Contenimento |
|---|---|---|---|
| Analisi dei comandi | Medio | Precedenza delle regole, casi limite (punteggiatura, accenti, indici numerici, nomi composti, CARICA) | **Nuova istantanea completa del parser** (§4.1): ParseResult integrale di 12.976 input; corpus esistente; istantanea delle risposte; tracce |
| Vocabolario | Medio | Ordine di costruzione della mappa dei token: in caso di voci duplicate vince l'ultima, gli alias senza accenti non sovrascrivono; forma canonica per tipo | **Nuova istantanea del vocabolario** (§4.1): 217 token IT, 151 EN con tipo, termine, concetto e forma canonica |
| Firma di `parseCommand` | Basso | 27 file di test chiamano `parseCommand(null, …)` | La firma resta, come involucro della nuova funzione (§3.1); nessun test esistente cambia |
| Prestazioni | Basso | La costruzione del vocabolario avviene una volta per lingua; l'analisi è per comando | Durata della suite e di `responses.snapshot.test.ts` confrontate con la baseline (±20%) |
| Contratto HTTP | Nullo | `parseResult` esposto da `/execute` invariato, comprese le chiavi | Traccia HTTP |

## 2. Obiettivi e perimetro

1. Nuova funzione `parseInput(input, gameState)` senza il parametro `dbPath`; `parseCommand` resta come involucro compatibile.
2. Scomposizione di `ensureVocabulary` e del corpo dell'analisi in funzioni sotto le soglie ESLint (complessità ≤ 15, ≤ 80 righe).
3. Un solo punto di accesso ai dati del lessico dentro `parser.js`, pronto per l'accessor del lotto 3.
4. Pulizia di commenti obsoleti e del campo `dbPathResolved`.

**Fuori perimetro**:
- regole di lessico specifiche di Odessa (`ACTION_NO_OBJECT`, caso CARICA + nome): restano dove sono, e passano alla definizione del gioco nel lotto 3 (TD 0 §4.2);
- `normalizeForComparison` duplicata in `engine.js`: si unifica nel lotto 4a;
- `validateCommandInput({ mode: 'parser' })` in `validation.js`: lotto 5;
- qualunque cambiamento di comportamento, compreso l'allineamento imperfetto tra token normalizzati e token originali quando la punteggiatura divide una parola (caratterizzato nel lotto 0: "esamina.lampada"), che **va mantenuto identico**;
- nomi di 3+ parole e preposizione "di" (v1.4.3, #128).

## 3. Soluzione

### 3.1 API pubblica di `parser.js`

| Esportazione | Dopo il lotto |
|---|---|
| `CommandType`, `ParseErrorType` | invariati |
| `resetVocabularyCache()` | invariata |
| `ensureVocabulary(gameState = null)` | stessa firma e stesso valore restituito (`{ tokenMap }`), stessa cache per lingua |
| `parseInput(input, gameState = null)` | **nuova**: il corpo attuale di `parseCommand` |
| `parseCommand(dbPath, input, gameState = null)` | involucro marcato `@deprecated`: `return parseInput(input, gameState);` |

Chiamanti da aggiornare a `parseInput`: `src/api/engineRoutes.js` (`/execute`) e `scripts/measure-session-memory.mjs`. Nelle route si tolgono anche i commenti `// dbPath rimosso`. I test **non** si toccano.

### 3.2 `ensureVocabulary`

Si scompone in funzioni di modulo, **pure dove possibile** (dati in ingresso, risultato in uscita), ciascuna sotto le soglie:

| Funzione | Responsabilità attuale (righe su `3c1a379`) |
|---|---|
| `lexiconSource()` | Unico punto che legge `global.odessaData` (`VociLessico`, `TerminiLessico`, `TipiLessico`, `Oggetti`). Nel lotto 3 diventerà una chiamata all'accessor `getGameData()` |
| `loadLexiconRows(source, lingua)` | Unione voce → termine → tipo, nello **stesso ordine** di `VociLessico`, scartando le righe senza termine o tipo (49–63) |
| `mapTipoToCommandType(tipo)` | Da funzione interna a funzione di modulo (118–133) |
| `normalizeForComparison(s)` | Da costante interna a funzione di modulo (71–77) |
| `buildLocalizedNounConcepts(rows, source, lingua)` | Concetti dei nomi localizzati per le lingue diverse dall'italiano (79–103) |
| `buildActionCanonicalConcepts(rows)` | Infinito come forma canonica dei verbi d'azione (109–116) |
| `buildTokenMap(rows, lingua, localizzati, infiniti)` | Mappa token → info e alias senza accenti (138–167) |
| `applyCanonicalForms(tokenMap, canonicalByTerm)` | Forma canonica finale (169–172) |

Regole di equivalenza da rispettare (le verifica l'istantanea del vocabolario):
- i token si inseriscono nell'ordine delle righe: per un token presente in più termini **vince l'ultimo**;
- l'alias senza accenti si aggiunge solo se il token non esiste già (**vince il primo**);
- forma canonica: per navigazione e sistema il concetto in maiuscolo; per i verbi d'azione l'infinito se è una voce della lingua, altrimenti la voce lessicograficamente minore; per gli altri tipi la voce minore;
- la ricerca `rows.some(...)` di `buildActionCanonicalConcepts` può essere ottimizzata (per esempio con un insieme per termine) solo se l'istantanea del vocabolario resta identica.

### 3.3 `parseInput`

Pipeline in passi, ciascuno in una funzione:

1. `validateRawInput(input)`: i quattro controlli iniziali, nell'ordine attuale.
2. `tokenize(input, tokenMap)`: normalizzazione, divisione in token, eliminazione delle parole vuote, token originali corrispondenti. **Allineamento invariato**: il token originale di posizione *i* è la parola *i* dell'input diviso sugli spazi (prima della rimozione della punteggiatura), come oggi.
3. Smistamento per numero di token: `parseSingleToken`, `parseCompoundNoun` (tre token senza indice), `parseTwoTokens` (due token, o tre con indice numerico finale).
4. Costruttori dei risultati: un `ParseResult` di base con le **stesse chiavi nello stesso ordine** di oggi (§3.3.1), e funzioni per i casi validi. I due blocchi CARICA + nome (con nome semplice o composto) usano lo stesso costruttore, con `NounIndex` passato come parametro (`idx` per il nome semplice, `null` per il composto, come oggi).

**3.3.1 Tabella di decisione** (ordine attuale, da preservare):

| # | Condizione | Esito |
|---|---|---|
| 1 | `input` non è una stringa | `INVALID_INPUT`, `NOT_A_STRING` |
| 2 | caratteri di controllo | `INVALID_INPUT`, `CONTROL_CHARS` |
| 3 | vuoto dopo il trim | `INVALID_INPUT`, `EMPTY_INPUT` |
| 4 | più di 500 caratteri dopo il trim | `INVALID_INPUT`, `LENGTH_OUT_OF_RANGE` |
| 5 | nessun token utile | `COMMAND_UNKNOWN` |
| 6 | 1 token sconosciuto | `COMMAND_UNKNOWN`, `UnknownToken` |
| 7 | 1 token, navigazione o sistema | valido |
| 8 | 1 token, azione | valido se il concetto è in `ACTION_NO_OBJECT`, altrimenti `SYNTAX_ACTION_INCOMPLETE` |
| 9 | 1 token, altro tipo | `SYNTAX_INVALID_STRUCTURE` |
| 10 | 3 token senza indice, primo sconosciuto | `COMMAND_UNKNOWN`, `UnknownToken` |
| 11 | 3 token senza indice, azione + nome composto (2° e 3°) | valido, `NounIndex` null |
| 12 | 3 token senza indice, CARICARE + nome composto | azione CARICARE, `NounIndex` null |
| 13 | 3 token senza indice, altri casi | `SYNTAX_INVALID_STRUCTURE` |
| 14 | 2 token (o 3 con indice), primo sconosciuto | `COMMAND_UNKNOWN`, `UnknownToken` |
| 15 | primo di sistema CARICARE e secondo nome | azione CARICARE, `NounIndex` = indice |
| 16 | primo di navigazione o sistema, altri casi | `SYNTAX_INVALID_STRUCTURE` |
| 17 | primo azione, secondo sconosciuto | `SYNTAX_NOUN_UNKNOWN`, `UnknownNounToken` (token originale, oppure normalizzato) |
| 18 | primo azione, secondo non nome | `SYNTAX_INVALID_STRUCTURE` |
| 19 | primo azione, secondo nome | valido, `NounIndex` = indice |
| 20 | primo di altro tipo | `SYNTAX_INVALID_STRUCTURE` |
| 21 | più di 3 token | `SYNTAX_INVALID_STRUCTURE` |

### 3.4 Pulizia

- `parser.js`: rimossi i commenti su SQLite (righe 7 e 31) e aggiornato il commento di testa.
- `src/api/parserRoutes.js`, `GET /stats` (solo fuori produzione): **D-L2-2**, rimuovere il campo `dbPathResolved` (relitto dell'epoca SQLite; nessun consumatore; il test del lotto 1 verifica solo `byType`).

## 4. Test

### 4.1 Nuove istantanee (fornite, da copiare senza modifiche in `tests/fixtures/parser/`)

| File | Contenuto | SHA-256 |
|---|---|---|
| `parse_full_baseline.json` | ParseResult completo (campi non nulli, chiavi ordinate, `OriginalInput` omesso perché uguale all'input) per 12.966 coppie (lingua, input): unione del corpus (5.080) e degli input dell'istantanea delle risposte, più 116 casi limite per lingua (179 coppie nuove dopo l'unione); più 10 input non stringa | `e9ccc844f171358205cb55b422d8dbb852d92fe422aa88b8ddb77bbf14c4fbc9` |
| `vocabulary_baseline.json` | Mappa dei token costruita da `ensureVocabulary` per IT (217) ed EN (151), ordinata per token | `24a962b16c23cd2bc4dda67b2009289d06eed001b8fbd3146b8cd2756924293f` |

Generate su `3c1a379` con `gen_parse.mjs` (fornito, resta fuori dal repository); riprodotte identiche in due esecuzioni. L'istantanea completa copre da sola il 99,3% delle righe di `parser.js` (scoperte solo `resetVocabularyCache` e il `default` di `mapTipoToCommandType`).

### 4.2 Nuovi test

| File | Verifica |
|---|---|
| `tests/parser.full.test.ts` | Per ogni caso: `parseInput(input, { currentLingua })` **e** `parseCommand(null, input, { currentLingua })`, normalizzati come nel generatore (campi nulli rimossi, `OriginalInput` rimosso per gli input stringa), uguali al valore registrato. Anche gli input non stringa. Su differenza: lingua, input, campo, prima e dopo (prime 20) |
| `tests/parser.vocabulary.test.ts` | `ensureVocabulary({ currentLingua })` per IT ed EN: stessi token e stesse info dell'istantanea. Controllo aggiuntivo: per un token con accento e il suo alias senza accento l'oggetto info è lo stesso |

Nessuna modalità di aggiornamento. Dopo il merge i due test e le due istantanee diventano protetti.

### 4.3 Test esistenti

Nessuna modifica. Devono passare invariati in particolare: `parser.regression.test.ts` (corpus), `parser.test.ts`, `characterization.parser.test.ts`, `responses.snapshot.test.ts`, `responses.language.test.ts`, tracce, percorsi completi.

## 5. Criteri di accettazione

| # | Criterio |
|---|---|
| AC-1 | Diff limitato a `src/logic/parser.js`, `src/api/engineRoutes.js` (chiamata e commenti), `src/api/parserRoutes.js` (campo `dbPathResolved`), `scripts/measure-session-memory.mjs`, nuovi test e fixture di §4, `docs/` e `Unreleased.md` |
| AC-2 | Istantanea completa del parser e istantanea del vocabolario identiche; corpus, istantanea delle risposte (SHA `97a62ceb…`), tracce del motore e HTTP identici |
| AC-3 | Nessuna funzione di `parser.js` sopra le soglie: avvisi ESLint attesi 12 `complexity`, 7 `max-lines-per-function`, 3 `max-depth` |
| AC-4 | `npm run lint` uscita 0; `typecheck`, `build`, `npm test` PASS; test esistenti invariati |
| AC-5 | Durata di `responses.snapshot.test.ts` e della suite entro +20% della baseline misurata in Fase 1A sulla stessa macchina |
| AC-6 | `git grep -n "parseCommand(" -- src scripts` restituisce solo la definizione dell'involucro |
| AC-7 | Prova manuale (§7) |

## 6. Decisioni (approvate il 2026-10-19)

| # | Decisione | Esito |
|---|---|---|
| D-L2-1 | Nome della nuova funzione | `parseInput(input, gameState)`. `parseCommand` resta come involucro `@deprecated`, da rimuovere solo quando i test protetti potranno migrare (non in v1.4.2) |
| D-L2-2 | Campo `dbPathResolved` di `/api/parser/stats` | Rimuovere |
| D-L2-3 | Accesso ai dati del lessico | Una sola funzione `lexiconSource()` in `parser.js` che legge `global.odessaData`; nel lotto 3 diventa l'accessor `getGameData()` |

## 7. Prova manuale (Mauro, `localhost:3001`)

In italiano e in inglese:
1. comandi con accenti e senza (`giù` / `giu`, `perchè` se previsto);
2. un nome composto (`esamina grande tavolo` / `examine large table`);
3. `carica peso` e `carica` da solo (caricamento della partita);
4. un comando con punteggiatura (`prendi, lampada`) e uno con indice (`prendi lampada 2`);
5. un errore per tipo: parola sconosciuta, verbo senza oggetto, nome sconosciuto.

Le risposte devono essere quelle della v1.4.1.
