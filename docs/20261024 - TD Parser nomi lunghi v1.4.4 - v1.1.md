# TD — Parser: nomi di 3+ parole (v1.4.4, #128)

| Campo | Valore |
|---|---|
| Documento | Specifica tecnica (TD) |
| Versione | v1.1 — errata dopo la Fase 1A di HO-30 (Q5–Q8, §8); la v1.0 era approvata da Mauro Giorgi il 2026-10-24 (Q1–Q4). Regole, perimetro e criteri di accettazione invariati, salvo la precisazione su corpus, campi ammessi e test «Dati» |
| Data | 2026-10-24 |
| Issue | #128 "Parser: nomi di 3+ parole e preposizione "di"" (milestone 8 "v1.4.4 (Parser: nomi composti)"; etichette `type:feature`, `area:parser`, `priority:P2`) |
| Destinazione | `release/v1.4.4` (da creare da `main` @ `10725aa`, su autorizzazione di Mauro nell'handoff); PR con `Refs #128`, merge squash, non unita da Claude Code |
| Baseline | `main` @ `10725aa` (v1.4.3, in produzione) |
| Fonte | Report Fase 0B di HO-29, parte C (fatti C1–C5, ipotesi C6); TD Lessico L3 v1.1 (decisione E4, TC-03); TD Lotto 2 Parser v1.0 (§3.3.1, tabella di decisione) |
| Struttura | Un solo handoff, tre fasi: 1A implementazione e misure in locale senza commit; 1B rigenerazione delle baseline e verifica del diff; 2 commit, push e PR su via libera |
| Modello consigliato | Claude Sonnet 5.5: Fase 1A effort alto; Fase 1B effort medio; Fase 2 effort basso |

## 1. Valutazione del rischio di regressione

**Livello complessivo: medio.** Si cambia il ramo di analisi del parser, da cui passa ogni comando, e si aggiornano baseline protette. La modifica è però costruita per fare una sola cosa: trasformare in validi alcuni input che oggi sono respinti con `SYNTAX_INVALID_STRUCTURE`. Ogni altro esito deve restare identico, e la differenza è verificabile in modo meccanico con un oracolo indipendente dalla nuova implementazione (§5.2).

| Area | Rischio | Perché | Contenimento |
|---|---|---|---|
| Analisi dei comandi (`parser.js:456-478`) | Medio | Si toccano il ramo "≥4 token" e il ramo "3 token con nome composto non trovato" | Il nuovo percorso si attiva solo se oggi l'esito sarebbe `SYNTAX_INVALID_STRUCTURE` (§3.3); tutte le altre righe della tabella di decisione restano come sono; test negativi (§5.3) |
| Falsi positivi | Medio | Un input oggi respinto potrebbe diventare valido per errore | Il resto dei token deve coincidere **per intero** con una voce lunga; solo verbi d'azione e CARICARE; nessun confronto parziale; diff completo verificato per regola (AC-3) |
| Collisioni di chiavi | Basso | Due voci potrebbero produrre la stessa chiave; una chiave derivata potrebbe coincidere con una chiave esistente | La chiave esistente vince sempre; test sui dati che fallisce se due voci condividono la stessa chiave derivata |
| Vocabolario (`ensureVocabulary`, `tokenMap`) | Basso | L'indice dei nomi lunghi si deriva dal `tokenMap` senza modificarlo | `vocabulary_baseline.json` invariato (AC-2) |
| Baseline protette | Medio (cambi attesi) | Cambiano `parse_full_baseline.json`, il corpus del parser e `responses_baseline.json` | Cambi definiti per regola in §5.1, con oracolo (§5.2); nessuna modifica "a occhio" |
| Motore e risposte | Medio-basso | `NounConcept` dei nomi lunghi arriva a `command.js`, `execute.js`, `engine.js` con `NounIndex` null | Prova di equivalenza end-to-end con la voce breve dello stesso termine (AC-7); tracce motore e HTTP invariate (AC-5) |
| Prestazioni | Basso | L'indice si costruisce una volta per lingua, con la cache del vocabolario | Durata della suite entro +20% (AC-10) |
| Salvataggi | Nullo | Nessun file di stato toccato | Tracce e salvataggi invariati |
| Generatori delle baseline fuori dal repository | Medio-basso | `gen_parse.mjs` e `20261016 - L2 gen_responses.mjs` stanno in `Claude decompiler/` (cartella ignorata, su OneDrive) | SHA256 dei generatori nel report; versionamento in issue separata (Q2, §8) |
| Architettura (framework) | Basso | Il parser deve restare generico | Nessun riferimento a Odessa nel codice; `tests/architecture.test.ts` invariato (AC-9) |

**Rollback:** revert della PR su `release/v1.4.4` (codice, test e baseline tornano insieme).

## 2. Contesto (fatti dal Report 0B)

- Il parser riconosce nomi composti **solo di 2 parole significative**: `parseCompoundNoun` (`parser.js:390-408`) cerca nel `tokenMap` la chiave `"${t2} ${t3}"`. Con 4 o più token filtrati l'esito è sempre `SYNTAX_INVALID_STRUCTURE` (riga 478, tabella di decisione #21).
- `tokenize` scarta ogni token di tipo STOPWORD (`parser.js:306-311`). `DI` e `DEGLI` **non** sono stopword (E4 di L3; `tests/lexicon.l3.test.ts:271-279`).
- Voci NOUN con 3 o più parole: 7, tutte presenti nei dati.

| Termine | Voce lunga | Voce breve dello stesso termine | Stopword nella voce lunga |
|---|---|---|---|
| T20 | IT `Bastone di comando` | `Bastone` (EN `BATON`) | no (`di` è token pieno) |
| T24 | IT `Arazzo in pessime condizioni` / EN `Tapestry in terrible condition` | `Arazzo` / `TAPESTRY` | `in` |
| T25 | IT `Lista di servizio` | `lista` (EN `ROSTER`) | no (`di` è token pieno) |
| T28 | IT `Trofei alle pareti` / EN `Trophies on the walls` | `Trofei` / `TROPHIES` | `alle` / `on`, `the` |
| T39 | IT `Banco degli attrezzi` | `Banco` (EN solo `Workbench`) | no (`degli` è token pieno) |

- Difetto riprodotto sui 12 casi dell'issue e anche con `esamina` e `prendi`, non solo con `carica`/`load`. Le voci brevi funzionano già (`esamina bastone`, `esamina lista`).
- Gli equivalenti EN `Command baton` e `Duty roster` hanno 2 parole e funzionano già.

## 3. Decisioni

| # | Decisione | Motivazione |
|---|---|---|
| D-1 | **Ipotesi H1** del Report 0B: riconoscimento dei nomi lunghi nel solo ramo di analisi, senza modificare i dati lessicali. Si scarta **H2** ("di" come parola ignorata): rischio alto, tocca dati lessicali e contraddice E4/TC-03 | Decisione di Mauro (2026-10-24) |
| D-2 | `DI` e `DEGLI` restano token pieni e fanno parte della chiave del nome lungo | Coerenza con E4 |
| D-3 | Il nome lungo si riconosce confrontando **l'intero resto dei token filtrati** dopo il verbo con la chiave derivata di una voce lunga: nessun confronto parziale, nessuna ricerca della "sequenza più lunga" | Un comando è VERBO + un solo nome: il resto dei token deve essere il nome |
| D-4 | Chiave derivata di una voce lunga = i token della voce, normalizzati come l'input (punteggiatura, accenti, maiuscolo), **senza i token di tipo STOPWORD**. Si derivano chiavi solo per voci NOUN con 3 o più parole grezze | Il parser scarta le stopword dall'input: senza questo passo le voci con `in`, `alle`, `on`, `the` non potrebbero mai corrispondere |
| D-5 | L'indice delle chiavi derivate si costruisce a partire dal `tokenMap` e dalla stessa cache per lingua del vocabolario. **Il `tokenMap` non cambia** | Evitare di toccare `vocabulary_baseline.json` |
| D-6 | Un nome lungo si accetta solo con verbo ACTION o CARICARE, come per i composti di 2 parole; il risultato usa gli stessi costruttori (`buildActionNounResult`, `buildCaricaResult`) con `NounIndex` null | Comportamento coerente con i composti già supportati |
| D-7 | Se il nuovo percorso non trova una corrispondenza, l'esito è **esattamente** quello di oggi (§3.3). Una chiave già presente nel `tokenMap` vince sempre su una chiave derivata | Nessun cambio fuori dal perimetro |
| D-8 | Nessuna modifica a `src/data-internal/`, `web/`, `package.json`, lock | Perimetro "solo parser" |
| D-9 | Cambi di baseline definiti per regola (§5.1) e verificati con oracolo (§5.2) | Regola delle baseline protette: si aggiornano solo con cambi attesi dichiarati nella TD |

### 3.3 Modifica alla tabella di decisione (riferimento: TD Lotto 2 §3.3.1)

Le righe 1–12, 14–20 restano identiche. Si modificano solo le righe 13 e 21, ciascuna divisa in due:

| # | Condizione | Esito |
|---|---|---|
| 13a (nuova) | 3 token senza indice, primo token azione o CARICARE, la chiave `"t2 t3"` non esiste nel `tokenMap` **e** il resto `t2 t3` coincide con una chiave derivata | Valido, come le righe 11 e 12, `NounIndex` null |
| 13 | 3 token senza indice, altri casi | `SYNTAX_INVALID_STRUCTURE` (invariato) |
| 21a (nuova) | più di 3 token, primo token azione o CARICARE, il resto dei token coincide con una chiave derivata | Valido, come le righe 11 e 12, `NounIndex` null |
| 21 | più di 3 token, altri casi | `SYNTAX_INVALID_STRUCTURE` (invariato) |

Casi che **non** cambiano per costruzione: primo token sconosciuto (riga 10 e riga 21), navigazione o sistema diversi da CARICARE (riga 16), indice numerico finale (`esamina torcia elettrica 2`, riga 14 e seguenti), comandi con il resto parziale (`esamina bastone comando`: la chiave `BASTONE COMANDO` non è derivata, perché `di` resta nella chiave).

Conseguenza dichiarata di D-4: per le voci con stopword vengono accettate anche forme senza la stopword o con un'altra stopword (per esempio `esamina trofei pareti`, `esamina trofei nelle pareti`), perché il parser ignora le stopword in ingresso. Decisione Q1: accettato (§8).

## 4. Perimetro

**Dentro:** `src/logic/parser.js` (eventualmente un modulo nuovo del parser) per l'indice delle chiavi derivate e le righe 13a e 21a; nuovi test; aggiornamento di test e baseline protette per regola; `docs/`, `Unreleased.md`.

**Fuori:**
- "di" come stopword (H2), voci alternative nei dati (H3), generalizzazione di `parseCompoundNoun` a n token con indice (H4).
- Indice numerico dopo un nome lungo: resta `SYNTAX_INVALID_STRUCTURE` (Q3).
- Voci a 2 parole che contengono stopword (per esempio EN `Empty shelves`): il comportamento attuale si misura e si riporta, non si cambia (Q4).
- Comandi con due nomi (non supportati dal motore).
- Imperativo/infinito in `aiuto` IT, #150, `format:check`, CI.

## 5. Test e cambi attesi

### 5.1 Cambi attesi, per regola

Regola **P-1**: input della forma `verbo (azione o CARICARE) + resto` in cui il resto dei token filtrati coincide con la chiave derivata di una voce lunga. Oggi l'esito è `SYNTAX_INVALID_STRUCTURE`. Dopo: valido.

| Baseline | Cosa cambia | Cosa resta identico |
|---|---|---|
| `tests/fixtures/parser/parse_full_baseline.json` (12.966 coppie + 10 non stringa) | Solo i casi P-1 tra i 568 "verbo + nome lungo" oggi invalidi; il numero esatto si misura in Fase 1A e non è un'asserzione della TD | I 72 casi validi con nomi EN a 2 parole; i 2 casi `COMMAND_UNKNOWN`; ogni altro caso |
| `tests/fixtures/parser/parser_baseline.json` (corpus, 5.080) e `tests/parser.regression.test.ts` | Il file JSON **non cambia** (non ha un generatore e il test applica i cambi attesi per regola, nel codice; Q5). Cambia solo `tests/parser.regression.test.ts`: i 12 casi di `CARICA_LOAD_UNCHANGED_INPUTS` (righe 91-104) passano a "valido"; `expectedForCaricaLoad` (`noteWords.length >= 3 → null`) si aggiorna con la regola P-1, ricavata dai dati lessicali e **non** dal parser; il conteggio dei "150 cambi attesi" si ricalcola e si dichiara (misurati in Fase 1A: 211 casi P-1 distinti nel corpus) | Il file JSON e tutto il resto del corpus |
| `tests/fixtures/responses/responses_baseline.json` (88.151) | Solo le voci P-1 tra le 4.025 che contengono nomi lunghi: la risposta di errore diventa la risposta dell'azione sull'oggetto | Ogni altra risposta, IT ed EN |
| `tests/lexicon.l3.test.ts` TC-03 (righe 271-279) | `esamina bastone di comando` non è più "invariato": diventa valido, con la stessa risposta di `esamina bastone`. Si aggiunge un caso che conferma E4: `esamina bastone comando` resta non valido | — |
| `tests/fixtures/parser/vocabulary_baseline.json` | Nulla (D-5) | Tutto |
| Tracce motore e HTTP (`engine_trace.json`, `http_trace.json`), percorsi completi, punteggio 138 | Nulla attesa | Tutto (da misurare: il Report 0B non ha analizzato quali comandi usano le tracce) |

### 5.2 Oracolo

Il valore atteso di ogni caso P-1 **non** si ricava dalla nuova implementazione. Si calcola con il parser di v1.4.3 (`main` @ `10725aa`) sull'input equivalente con la **voce breve dello stesso termine** (tabella §2): `esamina bastone di comando` ↔ `esamina bastone`, `prendi arazzo in pessime condizioni` ↔ `prendi arazzo`, e così via. Differenze ammesse tra la forma lunga e quella breve: solo i campi che riflettono la forma digitata: `OriginalInput`, `NormalizedInput`, `NounLiteral` (elenco accertato in Fase 1A su tutti i 407 casi di `parse_full`; `Tokens` non esiste nel `ParseResult`; Q7). Per le risposte: stessa regola, con la sola eccezione dei messaggi che riportano la parola digitata (§4.10 di L3), dove la differenza ammessa è la parola digitata. Il termine T39 in EN non ha voce lunga: nessun caso.

### 5.3 Nuovi test

`tests/parser.longnouns.test.ts` (nome indicativo):

| Gruppo | Verifica |
|---|---|
| Equivalenza | Per ciascuna delle 7 voci lunghe, in IT ed EN, con i verbi `esamina`/`examine`, `prendi`/`take`, `carica`/`load`: `verbo + voce lunga` = `verbo + voce breve`, nei campi di §5.2 |
| Stopword | Voci con `in`, `alle`, `on`, `the`: forma completa valida; stopword diversa o assente valida (Q1) |
| Negativi | `esamina bastone comando`, `esamina bastone di`, `esamina di comando`; resto parziale; verbo di navigazione + nome lungo; primo token sconosciuto + nome lungo; nome lungo con indice finale (`esamina bastone di comando 2`): esito come oggi |
| Invarianza | Nomi a 1 e 2 parole (`esamina lampada`, `esamina grande tavolo`, `prendi torcia elettrica`, EN `examine large table`): esito identico |
| Dati | Nessuna coppia di voci condivide la stessa chiave derivata; una chiave derivata può coincidere con una chiave del `tokenMap` solo se appartiene allo stesso termine (è il caso delle 3 voci senza stopword, la cui chiave derivata è la voce stessa); per le voci con stopword non deve coincidere con nessuna chiave (Q6) |
| Genericità | Il codice non contiene riferimenti a nomi di oggetti di Odessa; se la struttura del parser lo consente, un test con vocabolario sintetico |

I test esistenti si modificano solo come in §5.1.

## 6. Criteri di accettazione

| # | Criterio |
|---|---|
| AC-1 | Diff limitato a `src/logic/parser.js` (ed eventuale modulo del parser), nuovi test, test e baseline di §5.1, `docs/`, `Unreleased.md`. `src/data-internal/`, `web/`, `package*.json`, `src/logic/core/**`, `tests/testUtils/**` invariati (SHA); se serve toccarli, fermarsi |
| AC-2 | `vocabulary_baseline.json` invariato (SHA); `tokenMap` identico per IT ed EN |
| AC-3 | Diff di `parse_full_baseline.json`; per il corpus (JSON invariato) i casi che il test di regressione ammette come cambiati: ogni differenza ricade in P-1 e coincide con l'oracolo; nessun'altra; numero di casi cambiati e invariati riportato |
| AC-4 | Diff di `responses_baseline.json`: ogni differenza ricade in P-1 e coincide con l'oracolo; nessun'altra; 4.025 voci contenenti nomi lunghi suddivise in cambiate e invariate, con il motivo |
| AC-5 | Tracce del motore e HTTP, percorsi completi e punteggio 138 identici (SHA) |
| AC-6 | Test negativi e di invarianza di §5.3 PASS |
| AC-7 | Equivalenza end-to-end con la voce breve per le 7 voci lunghe, IT ed EN, con i tre verbi |
| AC-8 | Lint a 0 avvisi (soglie ESLint del progetto: nessuna funzione sopra le soglie), `typecheck`, build e `npm test` PASS; test esistenti invariati salvo §5.1 |
| AC-9 | Nessun riferimento a Odessa nel codice nuovo; `tests/architecture.test.ts` invariato e PASS |
| AC-10 | Durata della suite e di `responses.snapshot.test.ts` entro +20% della baseline misurata in Fase 1A sulla stessa macchina |
| AC-11 | CI `build-test` verde sulla matrice vigente al momento della PR |
| AC-12 | Prova manuale (§7) |
| AC-13 | SHA256 di `gen_parse.mjs` e `20261016 - L2 gen_responses.mjs` registrati nel report; la rigenerazione delle baseline avviene solo con questi generatori |

## 7. Prova manuale (Mauro, `localhost:3001`)

| # | Prova | Atteso |
|---|---|---|
| M1 | IT: `esamina bastone di comando`, `esamina lista di servizio`, `esamina banco degli attrezzi`, `esamina arazzo in pessime condizioni`, `esamina trofei alle pareti` | Stessa risposta del comando con la voce breve (`esamina bastone`, ecc.) |
| M2 | IT: `esamina bastone comando`, `esamina bastone di` | Errore di struttura come oggi |
| M3 | EN: `examine tapestry in terrible condition`, `examine trophies on the walls` | Stessa risposta di `examine tapestry`, `examine trophies` |
| M4 | Regressione: `esamina grande tavolo`, `prendi torcia elettrica`, `examine large table`, `carica peso` | Come nella v1.4.3 |

## 8. Decisioni su Q1–Q4 (Mauro, 2026-10-24)

| # | Questione | Decisione |
|---|---|---|
| Q1 | D-4 accetta anche le forme senza la stopword o con un'altra (`esamina trofei pareti`, `esamina trofei nelle pareti`) | **Accettate.** Sono cambi attesi della regola P-1, coperti da oracolo e test dedicati (§5.3). `di`/`degli` restano token pieni (`esamina bastone comando` resta non valido). Il comportamento del gioco originale su queste forme non è stato verificato |
| Q2 | I generatori delle baseline stanno in `Claude decompiler/` (ignorata) | **Non spostati in questa TD.** SHA256 nel report (AC-13). Issue separata per versionarli, da aprire a cura di Mauro/assistente, fuori da questo handoff |
| Q3 | Indice numerico con nome lungo (`esamina bastone di comando 2`) | **Fuori perimetro:** resta `SYNTAX_INVALID_STRUCTURE` |
| Q4 | Voci a 2 parole con stopword (EN `Empty shelves`, `Empty niche`) | **Fuori perimetro.** Fase 1A misura e riporta il comportamento attuale; un eventuale difetto va in issue separata. **Esito (Fase 1A, 2026-10-24):** nessun difetto, nessuna issue da aprire |
| Q5 | `parser_baseline.json` (corpus) non ha un generatore | **JSON invariato**; si aggiorna solo `tests/parser.regression.test.ts` con la regola P-1 (211 casi); il JSON esce dall'elenco di staging di Fase 2 |
| Q6 | Test «Dati»: una chiave derivata uguale a una chiave del `tokenMap` | Ammessa solo se dello stesso termine (3 voci senza stopword); vietata per le voci con stopword |
| Q7 | Campi ammessi nell'equivalenza lunga/breve | `OriginalInput`, `NormalizedInput`, `NounLiteral` |
| Q8 | Documenti | In Fase 1B solo `docs/release-notes/Unreleased.md` e la copia di questa TD in `docs/`; `docs/ROADMAP.md` (righe 15-18, #128 ancora sotto «v1.4.3») si aggiorna al rilascio v1.4.4, perché riguarda anche #137; le TD e i report datati non si modificano |

Da accertare in Fase 1A (non sono domande): i campi di `ParseResult` che differiscono tra forma lunga e breve (§5.2); come si costruisce oggi `NounLiteral` per i composti di 2 parole, da riprodurre; se il `tokenMap` consente di riconoscere i token STOPWORD per derivare le chiavi senza modificarlo.
