# TD — Lessico L1: sinonimi e parser

| Campo | Valore |
|---|---|
| Documento | Specifica tecnica (TD) |
| Versione | v1.1 — approvata (v1.1: correzione del conteggio delle voci nuove, 19 e non 18) |
| Data | 2026-10-15 |
| Issue | #109 (lotto L1 di 3) — milestone `v1.4.1 (Fedeltà all'originale e refactor del motore)` |
| Riferimenti | `20261015 - Inventario lessico originale - v1.0` (§1.1; decisioni D1–D3, D6) |
| Destinazione | `release/v1.4.1` |
| Baseline | `release/v1.4.1` @ `f65a102` (dopo #96) |
| Modello consigliato per l'implementazione | Claude Sonnet 5.5, effort alto |

## 1. Valutazione del rischio di regressione

**Livello: medio.** Le modifiche sono quasi solo dati, ma il lessico entra nell'analisi di ogni comando: una voce nuova può cambiare il significato di comandi oggi validi.

| Area | Rischio | Contenimento |
|---|---|---|
| Analisi dei comandi esistenti | **Medio** | Nuovo test di non regressione su un corpus di **5.080 comandi** (ogni voce da sola e ogni combinazione verbo + nome, IT ed EN) registrato sulla baseline: ogni comando oggi valido deve dare lo stesso risultato |
| Parole vuote nuove | Basso-medio | Verificato che nessuna delle parole aggiunte esiste già nel lessico (IT ed EN) |
| `look` da solo in EN | Basso | Modifica di una riga nel parser, coperta dal corpus e da un test dedicato |
| Percorsi di riferimento e test protetti | Basso | Invariati; un fallimento è una regressione |

## 2. Perimetro

Dentro: sinonimi e parole vuote di §3; `look` (e gli altri verbi che ammettono l'uso senza oggetto) in inglese.

Fuori: verbi nuovi e risposte (lotto L2), nomi e luoghi (L3), l'abbreviazione `a` (D1: esclusa), i messaggi per parole sconosciute e gli infiniti (D2, D3: si tiene il porting).

## 3. Voci da aggiungere a `VociLessico.json`

Nuovi `ID_Voce` a partire da 1093, in sequenza. Nessuna voce esistente si modifica.

| Concetto esistente | IT | EN |
|---|---|---|
| ESAMINARE | OSSERVA | OBSERVE |
| RUOTARE | GIRA | ROTATE |
| INFILARE | INTRODUCI | — (INSERT esiste già) |
| PREMERE | PIGIA, SCHIACCIA | PUSH |
| SEDIE | Sedia | Chair |
| BASSO | B | — (D esiste già) |

**Parole vuote.** Nuovo concetto `PREPOSIZIONE` in `TerminiLessico.json`, di tipo `STOPWORD` (`ID_TipoLessico` 5, come gli articoli), con le voci:
- IT: ALLA, COL, CON, VERSO;
- EN: WITH, TO, TOWARDS, AT.

`L` da sola (presente nell'originale per l'apostrofo del C64) **non** si aggiunge: `L'` esiste già.

Controllo fatto sulla baseline: nessuna di queste parole è già presente nel lessico, in nessuna lingua.

## 4. `look` da solo in inglese

Oggi `parser.js` ammette senza oggetto solo i verbi la cui forma canonica è `DORMI`, `ESAMINA` o `GUARDA` (`ACTION_NO_OBJECT`): sono forme italiane, quindi in inglese `look` ed `examine` da soli sono rifiutati ("What do you want?").

**Dopo:** il controllo usa il **concetto** del verbo (`DORMIRE`, `ESAMINARE`, `GUARDARE`), valido in entrambe le lingue. Con i sinonimi di §3 vale anche per `osserva` / `observe`.

`dormi` / `sleep` da soli restano accettati dal parser come oggi; la risposta del motore ("Cosa vuoi dormi?") si corregge nel lotto L2.

## 5. Test

### 5.1 Corpus di non regressione del parser (fornito)

File `tests/fixtures/parser/parser_baseline.json` (fornito, da copiare senza modifiche; SHA-256 `2ff9e8600b3473ed30acaf6c64d9278273b4e72c646ac2a46175db97d25fbf94`). Contiene 5.080 casi registrati sulla baseline `f65a102`: per ogni lingua, ogni voce del lessico da sola e ogni combinazione verbo + nome, con `IsValid`, `CommandType`, `VerbConcept`, `NounConcept`, `Error`.

Nuovo test `tests/parser.regression.test.ts`:
- per ogni caso con `IsValid: true` nella baseline, il parser deve restituire **gli stessi** cinque campi;
- per ogni caso con `IsValid: false`, il risultato deve restare uguale, **tranne** i casi elencati come cambi attesi: `look`, `examine` e `sleep` (EN) da soli, che diventano validi come i corrispondenti italiani `guarda`, `esamina`, `dormi`;
- il test riporta in un unico messaggio tutti i casi diversi (non si ferma al primo).

Questo file diventa un test protetto per i lotti L2 e L3: si aggiorna solo aggiungendo cambi attesi motivati nella specifica del lotto.

### 5.2 Test nuovi — `tests/lexicon.l1.test.ts`

| ID | Caso | Atteso |
|---|---|---|
| TB-01 | `osserva documenti`, `gira destra` (in biblioteca), `pigia pulsante`, `schiaccia pulsante`, `introduci medaglione` | Stesso concetto e stesso esito dei verbi esistenti (`esamina`, `ruota`, `premi`, `infila`) |
| TB-02 | `esamina sedia` | Come `esamina sedie` |
| TB-03 | `b` | Come `basso` |
| TB-04 | `esamina con documenti`, `esamina verso documenti`, `prendi alla lampada` (nel ripostiglio) | Stesso risultato di `esamina documenti` / `prendi lampada`: le preposizioni vengono scartate come gli articoli |
| TB-05 | EN: `observe documents`, `rotate right`, `push button`, `examine chair`, `take the lamp with` → stessi esiti degli equivalenti | Come TB-01–TB-04 |
| TB-06 | EN: `look`, `examine`, `observe`, `sleep` da soli | Validi per il parser; `look`/`examine`/`observe` descrivono il luogo come `guarda` in italiano (`sleep`: risposta corretta nel lotto L2) |
| TB-07 | `a` (IT) | Invariato rispetto alla baseline (D1) |
| TB-08 | **Copertura completa del lessico**: un caso tabellare per ognuna delle 19 voci nuove di §3 (11 sinonimi IT ed EN e 8 preposizioni) | Ogni sinonimo dà lo stesso `VerbConcept`/`NounConcept` della voce di riferimento in un comando completo (es. `pigia pulsante` = `premi pulsante`); ogni preposizione tra verbo e nome dà lo stesso risultato del comando senza preposizione |

Per i comandi che richiedono un luogo preciso si usano i passi dei percorsi di riferimento, come nei lotti precedenti.

### 5.3 Test protetti

`tests/walkthrough.test.ts`, `tests/scoring.max.test.ts`, `tests/timers.original.test.ts`, `tests/matches.test.ts`, `tests/puzzles.r7.test.ts` e i fixture: nessuna modifica. Test esistenti: procedura S/R come nei lotti precedenti.

## 6. Prova manuale (Mauro, `localhost:3001`)

Copre in gioco tutte le parole nuove. Criterio: ogni parola nuova dà **la stessa risposta** della parola di riferimento nello stesso punto. Le prove si fanno in coppia, una dopo l'altra, così luce e timer sono gli stessi. Prima si prende e si accende la lampada: la torcia si spegne al 6° turno e al buio `prendi`/`esamina` non funzionano.

**M1 — Partita nuova in italiano**

| # | Comandi | Atteso |
|---|---|---|
| M1.1 | `e`, `n`, `prendi alla lampada`, `accendi lampada` | Lampada presa (come `prendi lampada`) e accesa |
| M1.2 | `osserva documenti`, `esamina documenti`, `esamina con documenti`, `esamina verso documenti` | Quattro volte la stessa descrizione dei documenti |
| M1.3 | `s`, `e`, `n`, `su`, poi `b` | `b` porta giù come `giu` (dal luogo 9 al 7) |
| M1.4 | `s`, `o`, `s`, `e` (stanza del tavolo, 14), poi `esamina sedia`, `esamina sedie` | Stessa risposta ("Non noto nulla di particolare") |
| M1.5 | `gira destra`, `ruota destra` | Stessa risposta (fuori dalla biblioteca) |
| M1.6 | `introduci medaglione`, `infila medaglione` | Stessa risposta |
| M1.7 | `pigia pulsante`, `schiaccia pulsante`, `premi pulsante` | Stessa risposta (qui il pulsante non c'è) |

**M2 — Effetto reale di `pigia` / `schiaccia`** (salvataggio `tests/fixtures/walkthrough/save_v140_full_it_step91.json`, luogo 43)

| # | Comandi | Atteso |
|---|---|---|
| M2.1 | Caricare il salvataggio; `o`, `s`, `e` | Luogo 44, quello del pulsante |
| M2.2 | `pigia pulsante` | "Premi il pulsante e la porta ad est si apre con sinistri cigolii." |
| M2.3 | `schiaccia pulsante` | "Premi il pulsante e la porta ad est si chiude con sinistri cigolii." |

**M3 — Partita nuova in inglese**

| # | Comandi | Atteso |
|---|---|---|
| M3.1 | `e`, `n`, `take the lamp`, `light lamp` | Lampada presa e accesa |
| M3.2 | `look`, `examine`, `observe` | Tre volte la descrizione del luogo (oggi `look` ed `examine` danno "What do you want?") |
| M3.3 | `sleep` | Accettato dal parser; la risposta resta quella attuale e si corregge nel lotto L2 |
| M3.4 | `observe documents`, `examine documents`, `look at documents`, `examine with documents` | Le prime due e l'ultima: stessa descrizione; `look at documents` uguale a `look documents` |
| M3.5 | `rotate right`, `turn right` | Stessa risposta |
| M3.6 | `push button`, `press button` | Stessa risposta |
| M3.7 | `s`, `s`, `e` (luogo 14), poi `examine chair`, `examine chairs` | Stessa risposta |

**M4 — Nulla di cambiato:** `a` risponde come prima (D1, non è "alto"); `su`, `alto`, `giu`, `basso` funzionano come prima.

`gira destra`/`gira sinistra` sulla cassaforte e `introduci medaglione` nel punto giusto sono verificati dai test automatici sul percorso di riferimento (TB-01); in gioco richiederebbero 36–52 comandi.

## 7. Criteri di accettazione

| ID | Criterio |
|---|---|
| AC-1 | Lint, build, typecheck, test PASS |
| AC-2 | Corpus: nessuna differenza oltre ai cambi attesi di §5.1 |
| AC-3 | Test protetti invariati e verdi |
| AC-4 | TB-01…TB-08 PASS |
| AC-5 | Prova manuale PASS |

## 8. Rollback

Revert della PR su `release/v1.4.1`.
