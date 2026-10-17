# TD — Fiammiferi

| Campo | Valore |
|---|---|
| Documento | Specifica tecnica (TD) |
| Versione | v1.0 — approvata da Mauro Giorgi il 2026-10-15 (numero di fiammiferi non mostrato, come l'originale; EN "Scratch!!! Done."; resto invariato) |
| Data | 2026-10-15 |
| Issue | #108 — milestone `v1.4.1 (Fedeltà all'originale e refactor del motore)` |
| Decisioni | `docs/20261015 - Decisioni fedeltà originale - v1.0.md`: R8 e §3.1 punto 4 |
| Destinazione | `release/v1.4.1` |
| Baseline | `release/v1.4.1` @ `d5e4180` (dopo #107) |
| Fonte per l'originale | `missione_odessa.bas` (`BAS nnnn`), ricavato dal codice e non eseguito |
| Modello consigliato per l'implementazione | Claude Sonnet 5.5, effort alto |

## 1. Valutazione del rischio di regressione

**Livello complessivo: medio-basso.** Il perimetro è piccolo e si appoggia sul timer del buio appena introdotto; il punto delicato è l'ordine tra il fiammifero che si spegne e il calcolo della luce di fine turno.

| Area | Rischio | Perché | Contenimento |
|---|---|---|---|
| Calcolo della luce | **Medio** | Il fiammifero acceso diventa una terza fonte di luce, che si spegne nel ciclo di turno. Se l'ordine è sbagliato, il timer del buio parte un turno prima o dopo. | Ordine fissato in §4.3; test TB-02, TB-03 |
| Accensione della lampada | **Basso-medio** | Consuma un fiammifero: con l'ultimo i fiammiferi spariscono. | TB-05; percorsi di riferimento invariati |
| Lampada lasciata accesa (R9) | **Basso-medio** | La regola della morte immediata deve considerare il fiammifero acceso; di conseguenza la lampada deve illuminare solo il luogo in cui si trova (§4.3), altrimenti si potrebbe restare illuminati a distanza. | TB-07; percorsi di riferimento (la lampada è sempre in inventario) |
| Lessico | **Basso** | Si aggiunge solo il singolare `fiammifero` / `match` al concetto esistente `FIAMMIFERI`. | Test di non regressione del parser esistenti; TB-08 |
| Salvataggi | **Basso** | Due campi nuovi con default. | TB-09 |
| Percorsi di riferimento | **Basso** | Il percorso accende la lampada una sola volta (5 fiammiferi restano) e poi li posa. Devono passare **senza modifiche**. | Un fallimento è una regressione |
| Test esistenti | **Basso** | Pochi test toccano la lampada; nessuno conta i fiammiferi. | Procedura S/R come in #107 |

## 2. Perimetro

Dentro:
- 6 fiammiferi; ogni accensione ne consuma uno, compresa quella della lampada;
- `accendi fiammifero`: luce per il comando successivo, poi si spegne;
- esauriti i fiammiferi, l'oggetto sparisce;
- il fiammifero acceso conta come luce, anche nella regola della lampada lasciata accesa (§3.1 punto 4 delle decisioni);
- singolare `fiammifero` / `match` nel lessico.

Fuori:
- `accendi` senza oggetto (oggi "Cosa vuoi?"): resta com'è; eventualmente in #109;
- torcia e lampada: regole del porting invariate (R9 = B);
- `spegni` (#109, risposta fissa).

## 3. Regole originali di riferimento

| Elemento | Originale |
|---|---|
| Scorta | `V9=6` all'inizio (`BAS 2170`) |
| Accendere un fiammifero | Ammesso se i fiammiferi sono in inventario **o nel luogo** (`BAS 3650`). Consuma uno: `V9=V9-1`; luce accesa (`V0=1`), durata `T2=2`; il timer del buio si azzera (`T3=0`); risposta "Swcrapp!!! Fatto."; se `V9` arriva a 0: "Li hai finiti!" e i fiammiferi spariscono (`L(6)=-99`) (`BAS 3540–3550`) |
| Durata | `T2` scende subito dopo il comando che lo accende (`BAS 360`, `BAS 500`): la luce resta disponibile per **il comando successivo**, alla fine del quale "Il fiammifero si spegne." e, se non c'è altra luce, parte il timer del buio (`BAS 1210–1220`) |
| Lampada | Richiede la lampada in inventario e i fiammiferi in inventario; consuma un fiammifero (`BAS 3570–3600`) |
| Esaminare | "Sono dei semplici fiammiferi svedesi." (`BAS 2750`) |

**Difetto dell'originale non riprodotto.** Accendendo la lampada con l'ultimo fiammifero, l'originale porta la scorta a 0 senza far sparire i fiammiferi e senza "Li hai finiti!"; da lì i fiammiferi diventano di fatto infiniti (la scorta scende sotto zero e non torna più a 0). Nel porting l'esaurimento si applica in entrambi i casi (deviazione minima e dichiarata).

## 4. Soluzione

### 4.1 Stato

| Campo | Significato | Default per un salvataggio che non lo contiene |
|---|---|---|
| `timers.matchesLeft` | Fiammiferi rimasti (6 all'inizio) | 6 se i Fiammiferi (ID 36) esistono nel gioco (`IDLuogo !== -1`), altrimenti 0 |
| `timers.matchTimer` | Turni di luce residui del fiammifero acceso (0 = spento) | 0 |

Entrambi in `resetGameState`, `getGameStateSnapshot`, `setGameState`. Il default 6 per i salvataggi v1.4.0 è generoso (non sappiamo se la lampada è già stata accesa): accettato.

### 4.2 Consumo di un fiammifero

Una funzione unica del motore, usata da `accendi fiammifero` e dall'accensione della lampada:
1. `matchesLeft -= 1`;
2. se `matchesLeft === 0`: i Fiammiferi (ID 36) spariscono (`IDLuogo = -1`, `Attivo = 0`, `Inventario = false`) e alla risposta si aggiunge `engine.matches.finished` ("Li hai finiti!").

### 4.3 `accendi fiammifero`

Comandi: verbo `ACCENDERE` con nome `FIAMMIFERI` (forme `fiammiferi`, `fiammifero`, `matches`, `match`). Gestito dal motore, **non** come interazione di `Interazioni.json` (nessun punteggio).

1. Se i Fiammiferi non sono in inventario né nel luogo corrente (o `matchesLeft === 0`) → `engine.matches.none` ("Non hai fiammiferi."). Il turno è consumato.
2. Altrimenti: consumo (§4.2); `matchTimer = 2`; risposta `engine.matches.lit` ("Swcrapp!!! Fatto."), eventualmente seguita da "Li hai finiti!".

Accendere un fiammifero mentre un altro è acceso: consuma comunque e riporta `matchTimer` a 2 (come l'originale).

**Fonte di luce.** `hasFonteLuceAttiva` (motore e `torchEffect`) restituisce vero anche se `matchTimer > 0`.

**Lampada: luce solo dove si trova.** Oggi la lampada accesa fa luce ovunque (conta solo `timers.lampadaAccesa`), perché chi se ne allontana muore subito. Con l'eccezione di §4.5 il giocatore potrebbe allontanarsi e restare illuminato da una lampada lasciata in un'altra stanza. Quindi la lampada conta come luce solo se è accesa **e** si trova in inventario o nel luogo corrente, come nell'originale (`BAS 790–820`). Negli altri casi il comportamento non cambia: senza fiammifero acceso, allontanarsi dalla lampada resta morte immediata (R9).

**Ordine nel ciclo di turno.** Nuovo effetto `matchEffect`, **primo** nel registro (prima della torcia):
1. se `matchTimer > 0`: scende di 1; se arriva a 0 → si aggiunge `engine.matches.out` ("Il fiammifero si spegne.");
2. poi si ricalcola `turn.current.hasLight` con `hasFonteLuceAttiva`, prima degli effetti successivi.

Risultato, coerente con l'originale:
- turno in cui si accende: `matchTimer` 2 → 1, c'è luce a fine turno (il timer del buio si azzera);
- turno successivo: il comando si esegue **con luce** (si può prendere, esaminare…); a fine turno 1 → 0, "Il fiammifero si spegne.", e se non c'è altra luce parte il timer del buio.

Il controllo "È troppo buio per farlo." usa la stessa `hasFonteLuceAttiva`, quindi tiene conto del fiammifero.

### 4.4 Lampada

L'interazione `accendi_lampada` (IT ed EN) riceve un nuovo effetto `CONSUMA_FIAMMIFERO` dopo `SET_FLAG`:
- `interactionSchema.js`: `CONSUMA_FIAMMIFERO` tra i tipi di effetto ammessi (nessun campo obbligatorio);
- `applicaEffetti`: invoca il consumo di §4.2; se i fiammiferi finiscono, "Li hai finiti!" si aggiunge alla risposta dell'interazione.

Prerequisiti, testi e punteggio di `accendi_lampada` invariati. Il prerequisito sui fiammiferi in inventario resta: se sono esauriti l'oggetto non esiste più e risponde "Non hai i fiammiferi per accendere la lampada.".

L'effetto `RESET_COUNTER` su `turn.turnsInDarkness` resta (innocuo; il campo è solo di compatibilità).

### 4.5 Lampada lasciata accesa (§3.1 punto 4)

Nel controllo `LAMP_ABANDONED` di `gameOverEffect`, la morte immediata non scatta se all'inizio del turno c'era un fiammifero acceso (`matchTimer > 0` prima della discesa di §4.3). Il valore va conservato in `turn.current` (per esempio `turn.current.matchLitAtStart`) da `matchEffect` prima di decrementare.

Effetto: lampada accesa a terra, `accendi fiammifero`, spostamento → nessuna morte immediata; il fiammifero si spegne e il giocatore è al buio con le regole di R1 (la lampada rimasta nell'altra stanza non illumina il luogo nuovo, §4.3). Tornando nella stanza della lampada la luce torna.

### 4.6 Esaminare i fiammiferi

Descrizione dell'oggetto 36: IT "Sono dei semplici fiammiferi svedesi." (originale); EN "They are ordinary safety matches.". Nessuna indicazione del numero rimasto (decisione §7).

### 4.7 Lessico

`VociLessico.json`: aggiungere al concetto `FIAMMIFERI` le voci `Fiammifero` (IT) e `Match` (EN). Nient'altro.

## 5. Testi (IT / EN)

| Chiave | IT | EN |
|---|---|---|
| `engine.matches.lit` | Swcrapp!!! Fatto. | Scratch!!! Done. |
| `engine.matches.finished` | Li hai finiti! | You've run out of them! |
| `engine.matches.out` | Il fiammifero si spegne. | The match goes out. |
| `engine.matches.none` | Non hai fiammiferi. | You have no matches. |

## 6. Test

### 6.1 Test esistenti

Stessa procedura di #107: implementare senza toccare i test, classificare ogni fallimento S (superato da R8) o R (regressione), correggere le R, aggiornare le S con `// Aggiornato per decisione R8 (#108)`. `tests/walkthrough.test.ts`, `tests/scoring.max.test.ts`, `tests/timers.original.test.ts` e i fixture: **nessuna modifica**.

### 6.2 Test nuovi — `tests/matches.test.ts`

| ID | Caso | Atteso |
|---|---|---|
| TB-01 | Partita nuova | `matchesLeft === 6`, `matchTimer === 0` |
| TB-02 | `posa torcia`, `accendi fiammifero`, `esamina documenti`, `guarda` | 2°: "Swcrapp!!! Fatto.", nessun avviso di buio, timer del buio a 0; 3°: esamina eseguito (luce), poi "Il fiammifero si spegne." e avviso di buio; 4°: "È troppo buio per farlo." |
| TB-03 | Il fiammifero salva dal buio | `posa torcia`, `esamina documenti`, `accendi fiammifero`, poi `e`, `o`: nessuna morte (timer del buio azzerato dal fiammifero e ripartito dopo) |
| TB-04 | Sei accensioni | 6 × `accendi fiammifero`: alla sesta "Li hai finiti!", Fiammiferi con `IDLuogo -1`; settima: "Non hai fiammiferi." |
| TB-05 | Lampada con l'ultimo fiammifero | 5 × `accendi fiammifero`, poi `accendi lampada`: lampada accesa, "Li hai finiti!", Fiammiferi spariti |
| TB-06 | Lampada senza fiammiferi | Dopo TB-04, `accendi lampada` → "Non hai i fiammiferi per accendere la lampada." |
| TB-07 | Lampada lasciata accesa con fiammifero acceso | Lampada accesa e posata nel 6, `accendi fiammifero`, `s` → nessun `LAMP_ABANDONED`; nel 2 il fiammifero si spegne e il giocatore è senza luce (avviso di buio); `n` di ritorno nel 6 → luce di nuovo. Senza il fiammifero → `LAMP_ABANDONED` come oggi |
| TB-08 | Lessico | `accendi fiammifero`, `accendi fiammiferi`, `light match`, `light matches` riconosciuti |
| TB-09 | Salvataggio v1.4.0 | Dopo `setGameState` del salvataggio dei percorsi: `matchesLeft === 6`, `matchTimer === 0`; il passo successivo si esegue |
| TB-10 | Fiammiferi nel luogo | Fiammiferi posati nel luogo corrente: `accendi fiammifero` funziona; in un altro luogo → "Non hai fiammiferi." |
| TB-11 | Esaminare | "Sono dei semplici fiammiferi svedesi." (IT) e testo EN |
| TB-12 | Testi | Le 4 chiavi di §5 presenti in IT ed EN; `CONSUMA_FIAMMIFERO` ammesso dallo schema; i due record `accendi_lampada` lo contengono |

## 7. Decisioni (Mauro, 2026-10-15)

| Punto | Opzioni | Proposta |
|---|---|---|
| Numero di fiammiferi visibile | A: nessuna indicazione, come l'originale. B: `esamina fiammiferi` dice anche quanti ne restano ("Ne restano 4.") | **Deciso: A** — come l'originale, nessuna indicazione |
| Testo EN di "Swcrapp!!!" | "Scratch!!! Done." oppure lasciare l'onomatopea originale "Swcrapp!!! Done." | **Deciso: "Scratch!!! Done."** |

## 8. Prova manuale (Mauro, `localhost:3001`, italiano, partita nuova)

| # | Prova | Atteso |
|---|---|---|
| M1 | `posa torcia`, `accendi fiammifero`, `esamina documenti`, `guarda` | Torcia guasta; "Swcrapp!!! Fatto."; documenti esaminati, poi "Il fiammifero si spegne." e avviso di buio; "È troppo buio per farlo." |
| M2 | Partita nuova: `accendi fiammifero` sei volte, poi una settima | Alla sesta "Li hai finiti!"; `inventario` senza Fiammiferi; settima "Non hai fiammiferi." |
| M3 | Partita nuova: `e`, `n`, `prendi lampada`, `accendi lampada`, `posa lampada`, `accendi fiammifero`, `s`, `n` | Nessuna morte immediata; alla reception il fiammifero si spegne e compare l'avviso di buio; tornando nel ripostiglio c'è di nuovo luce |
| M4 | Partita nuova: `esamina fiammiferi` | "Sono dei semplici fiammiferi svedesi." |

## 9. Criteri di accettazione

| ID | Criterio |
|---|---|
| AC-1 | Lint, build, typecheck, test PASS |
| AC-2 | Percorsi di riferimento, punteggio massimo e test dei timer PASS senza modifiche |
| AC-3 | Test esistenti modificati solo se S, con la decisione citata |
| AC-4 | TB-01…TB-12 PASS |
| AC-5 | Prova manuale M1–M4 PASS |

## 10. Rollback

Revert della PR su `release/v1.4.1`.
