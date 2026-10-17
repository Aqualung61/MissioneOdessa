# TD — Lessico L2: risposte dell'originale, verbi e testi IT/EN

| Campo | Valore |
|---|---|
| Documento | Specifica tecnica (TD) |
| Versione | v1.1 — approvata (2026-10-16, decisioni D1–D9 come proposte). v1.1: conteggio dei cambi del corpus in §5.5 corretto (150, non 162) |
| Data | 2026-10-16 |
| Issue | #109 (lotto L2 di 3), #98 (CARICA) — milestone `v1.4.1 (Fedeltà all'originale e refactor del motore)` |
| Riferimenti | `docs/20261015 - Inventario lessico originale - v1.0.md` (§1.2, §1.4, §1.6); `docs/20261015 - Decisioni fedeltà originale - v1.0.md` (R6, R9, R10, §3.1); sorgente originale `missione_odessa.bas` |
| Baseline | `release/v1.4.1` @ `2568db0` (dopo L1) |
| Struttura proposta | Due handoff: **L2a** (rete dei testi e correzioni IT/EN, nessun comportamento nuovo) poi **L2b** (verbi e risposte dell'originale, CARICA) |
| Modello consigliato | Claude Sonnet 5.5, effort alto (entrambi) |

## 0. Decisioni (approvate)

| # | Punto | Proposta |
|---|---|---|
| D1 | Suddivisione | **Due handoff, L2a poi L2b.** L2a mette prima la rete sui testi: ogni risposta cambiata da L2b sarà visibile e verificabile |
| D2 | Verbo nei messaggi generici ("Non puoi apri cassaforte", "Non puoi pigia documenti") | **Infinito**: il verbo mostrato è il nome del concetto (`APRIRE` → "aprire"), aggiungendo come sinonimi gli infiniti mancanti (coerente con D2 dell'inventario). Alternativa: testo dell'originale "Non è possibile." senza verbo |
| D3 | `muovi <oggetto>` senza effetto | Testi dell'originale **solo se l'oggetto è presente** (oggi il porting risponde "Non vedi … qui" se non c'è, e lo teniamo): oggetto trasportabile, quadro o sedie → "Fatto: non accade niente."; altri oggetti presenti → "Non è possibile." |
| D4 | `gira destra` / `gira sinistra` nella sala del sedile (42): nell'originale ruotano il sedile | **No**: "Non vedo niente da ruotare." come in ogni altro luogo fuori dalla biblioteca. Il sedile si ruota con `ruota sedile` |
| D5 | Nome "luce" in inglese | **Nessuno**: `LIGHT` è già il verbo. In inglese `light` / `extinguish` da soli coprono "accendi luce" / "spegni luce" |
| D6 | `chiudi cassaforte` quando è aperta (R6: niente effetti reversibili) | Testo nuovo: "La cassaforte rimane aperta: la serratura non scatta più." / "The safe stays open: the lock no longer catches." (sul modello dello scomparto dell'originale) |
| D7 | `scappa`, `dormi`, `siediti` con un nome (nell'originale: "Non capisco.") | **Stessa risposta che senza nome**, come già fa l'originale per `parla` e `sorridi` |
| D8 | Parole inglesi dei verbi nuovi | `EXTINGUISH`; `UNLOAD`; `FLEE`, `ESCAPE`, `RUN`; `SMILE`; `SIT`; `TALK`, `SPEAK`, `ANSWER`. "turn off" non è supportato (`TURN` è già "ruota") |
| D9 | Infiniti dei verbi nuovi (italiano) | Sì: `SPEGNERE`, `SCARICARE`, `SCAPPARE`, `SORRIDERE`, `SEDERSI`, `PARLARE`, `RISPONDERE` |

`attacca` / `colpisci` / `picchia` / `uccidi` restano nel lotto L3 insieme alla guardia (inventario D5–D6): nell'originale esistono solo alla barriera.

## 1. Valutazione del rischio di regressione

| Area | Rischio | Contenimento |
|---|---|---|
| Testi delle risposte (L2a) | **Medio**: si cambiano i messaggi generici usati da quasi tutti i comandi | Nuova rete: **istantanea di 39.655 risposte** (ogni comando del lessico in 7 punti della partita, IT ed EN) registrata sulla baseline; ogni differenza deve corrispondere a una voce di §4.3 |
| Parser (L2b) | Medio-basso | Corpus protetto di L1: i soli cambi ammessi sono quelli di §5.5, definiti per regola |
| CARICA (L2b) | Medio-basso | "carica" da solo resta il caricamento della partita (test esistenti e nuovi); con un nome diventa un'azione |
| Nuove risposte (L2b) | Basso | Interazioni con `punteggio: false` o regole del motore senza effetti sullo stato; percorsi di riferimento e punteggio 138 invariati |
| Pagina web (riavvio Y/YES) | Basso | Una espressione regolare; prova manuale |

## 2. Perimetro

**L2a — rete e testi.** Istantanea delle risposte; controllo della lingua; correzioni dei testi italiani nella partita inglese; verbo all'infinito nei messaggi generici; riavvio con `y`/`yes`.

**L2b — verbi e risposte.** Verbi nuovi (`spegni`, `scarica`, `scappa`, `sorridi`, `siediti`, `parla`/`rispondi`); `dormi`; `accendi` e `scava` senza nome; nome `luce`; risposte specifiche dell'originale (cassaforte, scomparto, porte, pesa, `muovi`, `gira` fuori dalla biblioteca, `accendi torcia`, scavo nei passaggi); CARICA (#98).

**Fuori (lotto L3):** guardia (esamina, attacca con morte), manopola, oggetti scenici, nomi dei luoghi, `esamina macerie`, messaggi speciali di movimento (ovest dall'atrio, porta chiusa al 44, passaggio crollato).

**Verificato e già conforme:** ordine dei messaggi alla barriera. Sul movimento bloccato il motore restituisce prima "Non puoi muoverti…" e poi l'avviso della guardia, come l'originale (gli avvisi dei timer vengono dopo la risposta al comando). Si aggiunge solo un test che lo fissa (TA-07).

## 3. Regressione di testo introdotta da L1

L'analisi per questa specifica ha trovato un effetto di L1 non coperto dal corpus. Il parser sceglie come forma "canonica" di un verbo la voce **alfabeticamente minore**, e i messaggi generici la mostrano. Con i sinonimi nuovi:

| Comando | Prima di L1 | Dopo L1 |
|---|---|---|
| `premi documenti` | Non puoi premere documenti. | Non puoi **pigia** documenti. |
| `ruota documenti` | Non puoi ruota documenti. | Non puoi **gira** documenti. |
| `turn documents` | You can't turn documents. | You can't **rotate** documents. |

Nessun effetto sul gioco (le interazioni usano il concetto, non la forma), solo sul testo. Il corpus di L1 non lo vedeva perché confronta concetti ed errori, non i testi. Si corregge in L2a (§4.2 c) e l'istantanea delle risposte di §4.1 impedisce che si ripeta.

## 4. L2a — Rete dei testi e correzioni IT/EN

### 4.1 Istantanea delle risposte (nuovo test protetto)

File fornito `tests/fixtures/responses/responses_baseline.json` (copiare senza modifiche; SHA-256 `420e16a360648a465f2b9595f4e5351141684abd0c376a987678457d0f6813bf`, 39.655 righe, generato su `2568db0`). Generatore di riferimento allegato (`20261016 - L2 gen_responses.mjs`): il test deve produrre esattamente lo stesso file.

Regole di generazione (devono coincidere con il generatore allegato):
- **Comandi**, per ogni lingua: ogni voce del lessico da sola e ogni combinazione verbo + nome (verbi: tipi 1, 2, 3; nomi: tipo 4), in minuscolo, senza duplicati, in ordine alfabetico. Il lessico si legge dai dati correnti, quindi le parole nuove entrano da sole.
- **Punti della partita**: stato dopo i passi 0, 6, 37, 49, 94, 119, 146 del percorso completo della lingua (`full_it.json` / `full_en.json`).
- **Esecuzione**: per ogni comando un motore nuovo con lo stato del punto (`setGameState` dell'istantanea); se il parser rifiuta il comando si registra `mapParseErrorToUserMessage`, altrimenti il `message` di `executeCommand`.
- **Formato**: array JSON, una voce `{"lang","step","input","message"}` per riga, nell'ordine lingua → passo → comando.

Nuovo test `tests/responses.snapshot.test.ts`: rigenera le risposte e le confronta con il file; in caso di differenze riporta in un unico messaggio tutte le righe diverse (lingua, passo, comando, prima, dopo). Aggiornamento del file solo con `UPDATE_RESPONSES=1 npx vitest run tests/responses.snapshot.test.ts`, solo in Fase 1B e solo per differenze elencate nella specifica del lotto. Il diff del file nella PR è il documento di revisione.

### 4.2 Correzioni

| # | Difetto | Correzione |
|---|---|---|
| a | Nomi senza traduzione inglese nei messaggi: "You don't see **destra** here." (anche `sinistra`, `porta`) con qualunque verbo | Nei messaggi generici, se il nome non corrisponde a un oggetto, si mostra **la parola digitata** dal giocatore (in minuscolo). Se è un oggetto resta il nome dell'oggetto nella lingua corrente, come oggi |
| b | Testo fisso italiano "Non c'è bisogno di farlo di nuovo." mostrato anche in inglese (`engine.js`, ripetizione di un'interazione non ripetibile) | Nuova chiave `engine.interaction.alreadyDone` in `MessaggiSistema`: IT invariato, EN "There's no need to do that again." |
| c | Verbo nei messaggi generici (D2) | Forma canonica di un verbo d'azione = **nome del concetto** se è una voce della lingua corrente, altrimenti la voce alfabeticamente minore (EN invariato rispetto a oggi). Voci IT aggiunte (sinonimi), solo dove manca l'infinito di un verbo che compare nei messaggi generici: `APRIRE`, `CHIUDERE`, `DORMIRE`, `INFILARE`, `LEGGERE` (verificato: nessuna esiste già). `PORGERE`, `RUOTARE`, `PREMERE`, `SCAVARE` esistono già; per `SPOSTARE` la forma resta "muovere" |
| d | Testi di ripiego fissi in italiano non raggiungibili oggi: `'Non noti nulla di particolare.'` (`engine.js`), `'Hai raggiunto un luogo terminale.'` (`gameOverEffect.js`) | Sostituiti dalle chiavi esistenti (`engine.examine.nothingSpecial`, `game.terminal.location`), senza testo fisso |
| e | Riavvio dopo la fine della partita: la pagina accetta solo `s`/`si`/`sì`/`n`/`no`, mentre in inglese il messaggio chiede "YES" | `web/js/odessa_main.js`: accettare anche `y`/`yes` (come già la conferma di FINE) |

### 4.3 Differenze attese nell'istantanea (L2a)

Solo queste; qualunque altra differenza è una regressione. Le categorie (c) e righe nuove sono state verificate simulando la regola su una copia di `2568db0`: 930 righe cambiate, 1.890 aggiunte, nessuna rimossa.

| Categoria | Righe | Esempio |
|---|---|---|
| (a) EN: parola digitata al posto del concetto italiano | 416 (`destra` 138, `sinistra` 138, `porta` 140) | `close right`: "You don't see destra here." → "You don't see right here." |
| (b) EN: testo di ripetizione in inglese | 6 | `move painting` (passo 37): "Non c'è bisogno di farlo di nuovo." → "There's no need to do that again." |
| (c) IT: infinito nei messaggi generici | 930 | "Non puoi apri documenti." → "Non puoi aprire documenti."; idem `chiudi`, `consegna`→`porgere`, `dormi`, `gira`/`pigia`→`ruotare`/`premere`, `infila`, `leggi`, `scava`; "Cosa vuoi dormi?" → "Cosa vuoi dormire?" |
| Righe nuove | 1.890 | Comandi formati con le 5 voci di (c): sono aggiunte, non modifiche |

### 4.4 Controllo della lingua (nuovo test)

`tests/responses.language.test.ts`, sulle stesse risposte: nessuna risposta inglese contiene parole solo italiane (voci del lessico IT assenti in EN, più: non, il, che, puoi, vedo, qui, cosa, vuoi, nulla, della, sono, questo, particolare); nessuna risposta italiana contiene parole solo inglesi (voci EN assenti in IT, più: the, you, don't, here, what, nothing, this, can't, want, see); nessuna risposta contiene `[Missing`, `undefined`, `{0}`, `NaN`, `[object`. Sulla baseline il controllo trova esattamente i difetti (a) e (b); dopo L2a deve essere pulito. Eventuali falsi positivi vanno in un elenco esplicito nel test, motivato.

## 5. L2b — Verbi e risposte dell'originale

### 5.1 Lessico nuovo

| Concetto (nuovo) | Tipo | IT | EN |
|---|---|---|---|
| SPEGNERE | azione | SPEGNI, SPEGNERE | EXTINGUISH |
| SCARICARE | azione | SCARICA, SCARICARE | UNLOAD |
| SCAPPARE | azione | SCAPPA, SCAPPARE | FLEE, ESCAPE, RUN |
| SORRIDERE | azione | SORRIDI, SORRIDERE | SMILE |
| SEDERSI | azione | SIEDITI, SEDERSI | SIT |
| PARLARE | azione | PARLA, PARLARE, RISPONDI, RISPONDERE | TALK, SPEAK, ANSWER |
| LUCE | nome | Luce | — (D5) |

Verificato sulla baseline: nessuna di queste parole esiste già, in nessuna lingua.

### 5.2 Parser

- Verbi ammessi senza nome (`ACTION_NO_OBJECT`, per concetto): si aggiungono `SCAVARE`, `ACCENDERE`, `SPEGNERE`, `SCAPPARE`, `SORRIDERE`, `SEDERSI`, `PARLARE`.
- **CARICA (#98).** Una voce del concetto di sistema `CARICARE` (IT `carica`, `load`; EN `load`) **seguita da un nome** diventa un comando d'azione con concetto `CARICARE` e quel nome. Da sola resta il caricamento della partita.

### 5.3 Risposte

Le risposte senza effetti si realizzano come interazioni (`punteggio: false`) o come regole del motore per i verbi senza nome; scelta all'implementazione, motivata nell'output.

| Comando | Dove / condizione | IT | EN |
|---|---|---|---|
| `spegni` (con o senza nome) | ovunque (R9) | Non è il momento di restare al buio. | This is no time to be left in the dark. |
| `scarica pesa` / `scarica peso` | capanno (57), pesa non ancora caricata | La pesa non è carica. | The scale isn't loaded. |
| idem | dopo il caricamento (R6) | Il meccanismo si è bloccato. | The mechanism has jammed. |
| `carica peso` / `carica pesa` | ovunque | Stesso esito di `metti peso` (stessa interazione `carica_pesa_57`, stesso punteggio una sola volta) | come `put weight` |
| idem | 57, senza il peso | Per caricare una pesa occorre un peso. | To load a scale you need a weight. |
| `scappa` (D7) | ovunque | Svicola tutto a mancina... ma non puoi. | You dodge hard to the left... but you can't. |
| `sorridi` | ovunque | Cheese... | Cheese... |
| `dormi`, `siediti` (D7) | ovunque | Non perdere tempo. Hai una missione da compiere. | Don't waste time. You have a mission to complete. |
| `parla`, `rispondi` | ovunque tranne la barriera | Parlare da solo non ti aiuterà a finire la missione. | Talking to yourself won't help you finish the mission. |
| idem | barriera (59) | La guardia non sembra capire il tedesco. | The guard doesn't seem to understand German. |
| `accendi` senza nome, `accendi luce` | ovunque | Primo applicabile: `accendi torcia` se la torcia è con te ed è ancora funzionante; `accendi fiammifero` se hai i fiammiferi; `accendi lampada` se hai la lampada | come gli equivalenti |
| idem | nessuna fonte | Non vedo alcuna luce qui. | I don't see any light here. |
| `accendi torcia` | torcia nel luogo ma non con te | Prendi la torcia prima. | Take the flashlight first. |
| idem | con te, funzionante | La torcia è già accesa. | The flashlight is already on. |
| idem | con te, guasta | La torcia non funziona. | The flashlight doesn't work. |
| `scava` senza nome | dove esiste un'interazione "scava macerie" (11, 49) | Come `scava macerie` | come `dig rubble` |
| `scava` (con o senza `macerie`) | stretto passaggio (32) | senza badile: "Vuoi scavare a mani nude? Non hai un attrezzo."; con il badile: "Scava, scava, scava..." | "Do you want to dig with your bare hands? You don't have a tool." / "Dig, dig, dig..." |
| idem | stretto passaggio (36) | senza badile: come sopra; con il badile: "Pur scavando non crei un passaggio a nord." | … / "Even by digging you can't make a passage to the north." |
| `scava macerie` / `scava` | tinello (49): senza badile; già scavato | "Vuoi scavare a mani nude? Non hai un attrezzo."; "Scava, scava, scava..." (oggi: risposta generica e "Non c'è bisogno di farlo di nuovo.") | come sopra |
| `scava` senza nome | altrove | senza badile: "Ti manca l'attrezzo!"; con il badile: "Scava, scava, scava..." | "You don't have the right tool!" / "Dig, dig, dig..." |
| `apri cassaforte` | biblioteca (24), cassaforte visibile e chiusa | La cassaforte è chiusa con una serratura a combinazione. | The safe is locked with a combination lock. |
| idem | aperta | È già aperta. | It's already open. |
| `chiudi cassaforte` | chiusa | La cassaforte è già chiusa. | The safe is already closed. |
| idem | aperta (D6) | La cassaforte rimane aperta: la serratura non scatta più. | The safe stays open: the lock no longer catches. |
| `chiudi scomparto` | archivio (25), scomparto visibile | Lo scomparto rimane aperto: si deve essere rotto il meccanismo. | The compartment stays open: the mechanism must be broken. |
| `apri porta` | passaggio (44), porta chiusa | La porta è chiusa con un meccanismo a scatto. | The door is held shut by a spring mechanism. |
| idem | porta aperta | La porta è già aperta. | The door is already open. |
| `chiudi porta` | 44, porta chiusa | La porta è già chiusa. | The door is already closed. |
| idem | porta aperta | La porta si chiude solo azionando il meccanismo automatico. | The door only closes by operating the automatic mechanism. |
| `chiudi porta` | seminterrato (27), dopo `infila statuetta` | Non riesci a chiudere la porta: un meccanismo la blocca. | You can't close the door: a mechanism is blocking it. |
| `gira`/`ruota destra`/`sinistra` | fuori dalla biblioteca, o in biblioteca con la cassaforte non visibile (D4) | Non vedo niente da ruotare. | I don't see anything to turn. |
| `muovi <oggetto>` (D3) | oggetto presente, nessuna interazione: trasportabile, quadro o sedie | Fatto: non accade niente. | Done: nothing happens. |
| idem | altro oggetto presente | Non è possibile. | That's not possible. |

Note di implementazione:
- Stato della porta del 44: è la direzione Est del luogo 44 (aperta/chiusa dal pulsante). Se serve, nuovo prerequisito `DIREZIONE_APERTA` (`luogo`, `direzione`) nello schema delle interazioni, con test di schema.
- Cassaforte aperta = sequenza `cassaforte_24` completata (prerequisito esistente `SEQUENZA_COMPLETATA`).
- Nessuna risposta nuova modifica lo stato di gioco, tranne CARICA, che usa l'interazione esistente.
- Ogni comando nuovo consuma un turno come tutti i comandi riconosciuti (come l'originale): conta per i timer.

### 5.4 Buio

`SCARICARE` si aggiunge a `DARK_BLOCKED_VERBS` (nell'originale `scarica` è bloccato al buio). `carica peso` è già coperto perché equivale a `metti peso`.

### 5.5 Corpus del parser: cambi attesi (L2b)

Si aggiungono a `EXPECTED_CHANGES` di `tests/parser.regression.test.ts`, per regola:
- da soli diventano validi (`ACTION`, nessun nome): IT `scava`, `scavare`, `accendi`, `accendere`, `illumina`, `illuminare`; EN `dig`, `light`;
- `carica <nome>` e `load <nome>` (IT, 94 casi) e `load <nome>` (EN, 48 casi): da `SYNTAX_INVALID_STRUCTURE` a `ACTION`, concetto `CARICARE`, con il nome. Restano invariati i 12 casi (10 IT, 2 EN) con nomi di tre o più parole significative ("banco degli attrezzi", "tapestry in terrible condition"…): il parser non li riconosce con nessun verbo, limite preesistente fuori da questo lotto.

Totale: 150 casi (8 + 94 + 48).

Nessun altro caso del corpus può cambiare.

## 6. Test

### 6.1 L2a — `tests/texts.l2a.test.ts`

| ID | Caso | Atteso |
|---|---|---|
| TA-01 | EN `turn right`, `drop door`, `close left` (inizio partita) | "You don't see right here." / "You don't have door." / "You don't see left here." |
| TA-02 | EN `move painting` due volte (passo 37) | Seconda risposta "There's no need to do that again." |
| TA-03 | IT `apri documenti`, `premi documenti`, `ruota documenti`, `porgi documenti` | "Non puoi aprire documenti." / "…premere…" / "…ruotare…" / "…porgere…" |
| TA-04 | Le 5 voci infinite nuove | Stesso concetto della voce esistente (come TB-08 di L1) |
| TA-05 | Istantanea (§4.1) | Uguale al file aggiornato |
| TA-06 | Controllo della lingua (§4.4) | Nessuna segnalazione |
| TA-07 | Barriera (passo 146): `n` due volte | "Non puoi muoverti…" prima dell'avviso della guardia |

### 6.2 L2b — `tests/verbs.l2b.test.ts`

Un caso per ogni riga di §5.3, in IT e in EN, giocando i percorsi di riferimento fino al punto giusto; più:

| ID | Caso | Atteso |
|---|---|---|
| TB-01 | `carica` / `load` da soli | Caricamento della partita, come oggi |
| TB-02 | `carica peso` al 57 con il peso | Stesso stato e stesso punteggio di `metti peso`; poi `metti peso` non dà altri punti |
| TB-03 | Corpus | Solo i cambi di §5.5 |
| TB-04 | `scarica pesa` al buio | Bloccato come gli altri verbi di §5.4 |
| TB-05 | Turni | Ogni comando nuovo consuma un turno |

## 7. Prova manuale (Mauro, `localhost:3001`)

| # | Prova | Atteso |
|---|---|---|
| M1 (L2a) | Partita EN: `turn right`; poi giocare fino alla morte (per esempio restando fermi in un'area aperta) e rispondere `yes` al riavvio | "You don't see right here."; la partita riparte |
| M2 (L2a) | Partita IT: `apri documenti` | "Non puoi aprire documenti." |
| M3 (L2b) | Partita IT: `sorridi`, `scappa`, `parla`, `spegni lampada`, `accendi` | Testi di §5.3 |
| M4 (L2b) | Salvataggio passo 91: `o`, `s`, `e`, `apri porta`, `premi pulsante`, `chiudi porta` | "…meccanismo a scatto." / porta aperta / "…solo azionando il meccanismo automatico." |
| M5 (L2b) | Partita EN: `smile`, `talk`, `extinguish`, `light` | Testi EN di §5.3 |

## 8. Criteri di accettazione

| ID | Criterio |
|---|---|
| AC-1 | Lint, build, typecheck, test PASS |
| AC-2 | Test protetti invariati (percorsi, punteggio 138, timer, fiammiferi, enigmi R7); corpus del parser con i soli cambi di §5.5 |
| AC-3 | Istantanea: differenze solo nelle categorie di §4.3 (L2a) e nelle righe di §5.3 (L2b), verificate da me sul diff della PR |
| AC-4 | Controllo della lingua pulito |
| AC-5 | Prova manuale PASS |

## 9. Rollback

Revert della PR del lotto su `release/v1.4.1`.
