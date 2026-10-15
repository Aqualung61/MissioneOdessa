# Decisioni di fedeltà all'originale

| Campo | Valore |
|---|---|
| Documento | Decisioni di progetto (D) |
| Versione | v1.0 — approvata da Mauro Giorgi il 2026-10-15 |
| Issue | #95 — milestone `v1.4.1 (Fedeltà all'originale e refactor del motore)` |
| Baseline del porting | `main` @ `f0f3fe3` (v1.4.0) |
| Fonte per l'originale | Sorgente decompilato `missione_odessa.bas` (righe citate come `BAS nnnn`); comportamento ricavato dal codice, non eseguito |
| Fonte per il porting | Esecuzione del motore su scenari mirati e lettura del codice |
| Revisioni | v0.1 bozza con raccomandazioni; v1.0 decisioni, incastri, simulazione dell'alba, regola sul punteggio, valutazione del rischio |

## 1. Valutazione del rischio di regressione

**Livello complessivo: medio-alto.** È il primo blocco che cambia di proposito le regole di gioco. Il rischio non è uniforme: si concentra su timer, lessico e test esistenti.

| Area | Rischio | Perché | Contenimento |
|---|---|---|---|
| Test esistenti | **Alto (atteso)** | Circa 15 file di test codificano le regole attuali (buio, zona aperta, guardia, alba, torcia, Ferenc), per esempio `intercept-effect`, `darkness-effect`, `gameover-effect`, `victory-effect`, `turn-system`, `torch-system`. Con le nuove regole alcuni falliranno per costruzione. | Deroga esplicita alla regola "non modificare i test esistenti": ogni TD elenca i test superati dalla decisione, con motivazione; si modificano solo quelli; il diff dei test è un punto di verifica obbligatorio. |
| Timer (R1, R2, R3, R4, R11) | **Medio-alto** | Cambia l'ordine e la semantica degli effetti di turno; le interazioni tra timer (buio alla barriera, alba fermata da Ferenc, zona aperta e comandi senza turno) sono il punto fragile. | Una sola TD per i timer, test per ogni coppia di timer, percorso di riferimento (§5) eseguito a ogni PR. |
| Lessico (R10) | **Medio** | Nuovi verbi e sinonimi possono collidere con quelli esistenti (CARICA, GIRA/RUOTA, OSSERVA/ESAMINA, PIGIA/PREMI) o cambiare l'analisi di comandi oggi validi. | Lotti piccoli; test di non regressione del parser su tutti i comandi oggi accettati; regola di disambiguazione di CARICA testata in IT ed EN. |
| Salvataggi | **Medio** | Nuovi campi di stato (fiammiferi rimasti, timer dell'alba, timer della guardia, semantica del timer della zona). Un salvataggio v1.4.0 caricato dopo il cambio deve restare giocabile. | Valori di default al caricamento e test di caricamento di un salvataggio v1.4.0. |
| Punteggio | **Medio** | Massimo (138) e soglie dei ranghi sono scritti a mano; nessun test li verifica. Ogni nuova interazione aggiungerebbe +2, ogni nuova `VISIBILITA` +3. | Regola di §4; test che calcola il massimo dai dati e verifica 138. |
| Testi IT/EN | **Basso-medio** | I testi originali sono solo in italiano: la versione inglese va scritta. Rischio di qualità, non funzionale. | Revisione dei testi EN da parte dell'autore; test di coerenza IT/EN delle chiavi. |
| Frontend | **Basso** | La scena di Ferenc passa dal flusso `TELEPORT`; i nuovi avvisi passano dal messaggio di risposta. | Prova manuale della sequenza finale in IT ed EN. |
| Enigmi invariati (R5, R6, R9) | **Nullo** | Nessuna modifica di regola; solo le risposte fisse di §3. | — |

**Rete di sicurezza preliminare (raccomandata prima di toccare le regole):** test del percorso di riferimento sulla v1.4.0 e test del punteggio massimo (anticipo di parte di #99). Il percorso resta valido con le nuove regole (§5), quindi protegge da regressioni non volute durante tutto il blocco.

## 2. Principio guida

La regola originale è il default; una deviazione resta solo se migliora la giocabilità in modo dichiarato. Le aggiunte del porting che non alterano regole dell'originale restano: punteggio e ranghi, AIUTO, conferma su FINE, versione inglese, comandi di sistema che non consumano turni, salvataggio.

## 3. Decisioni

| # | Regola | Decisione | Contenuto |
|---|---|---|---|
| R1 | Buio | **A — Ripristino** | Timer di 3 turni senza luce; allo scadere si muore solo con un comando di movimento (`BAS 1230–1280`). Al buio esaminare, prendere e azioni simili rispondono "E' troppo buio per farlo." (`BAS 240–250`). Avviso "E' pericoloso muoversi senza luce." (`BAS 780`). |
| R2 | Zona aperta | **A — Ripristino** | Il timer riparte a ogni spostamento; si muore restando fermi (`BAS 1290–1350`), con l'avviso a ogni turno fermo. Contano solo i comandi che consumano turni. Testo di morte originale: "Sei stato scorto da una ronda russa che ti arresta come spia. Una fine ingloriosa!". |
| R3 | Alba | **A — Ripristino, 200 turni** | 200 turni; avvisi a 30, 15 e 5 dalla fine (`BAS 1360–1380`); due morti distinte, in casa e all'aperto (`BAS 1400–1520`); timer fermato all'incontro con Ferenc. La variabile `GAME_MAX_TURNS_CONSUMED` resta solo come override per i test. Motivazione in §5. |
| R4 | Guardia alla barriera | **A — Ripristino** | Timer di 6 turni dall'arrivo; avvisi a 3, 2 e 1; arresto a 0 (`BAS 1530–1650`). Testi originali, compreso l'arresto. Rimossi il contatore dei comandi inutili e il messaggio `game.over.guardia_sospetta`. Resta il blocco del movimento (la barriera non ha uscite neanche nell'originale). Supera #97. |
| R5 | Combinazione della cassaforte | **B — Porting** | Invariata, con messaggio d'errore. |
| R6 | Meccanismi reversibili | **B — Porting** | Sblocchi permanenti. |
| R7 | Bastone e quadro | **A — Ripristino** | Il bastone si libera scavando le macerie con il badile; il quadro si può prendere, e prenderlo scopre la cassaforte (`BAS 3800–3810`). `sposta quadro` resta valido. |
| R8 | Fiammiferi | **A — Ripristino** | 6 fiammiferi; ogni accensione ne consuma uno, compresa la lampada (`BAS 3540`, `BAS 3600`); "Li hai finiti!" all'ultimo. `accendi fiammifero`: luce per 2 turni, poi "Il fiammifero si spegne." (`BAS 1220`). |
| R9 | Torcia e lampada | **B — Porting** | Nessun on/off; regole attuali, con l'integrazione di §3.1 (punto 4). |
| R10 | Vocabolario e risposte "di colore" | **A — Ripristino** | Verbi, nomi e risposte specifiche dell'originale (elenco nella v0.1, R10), con traduzione EN. Guardia esaminabile al luogo 59 (`BAS 5280`). CARICA: con `peso` o la pesa è l'azione di gioco, altrimenti è il caricamento della partita (assorbe #98). |
| R11 | Oggetti rimossi all'incontro con Ferenc | **A — Ripristino** | Vengono rimossi tutti gli oggetti; i documenti restano solo se sono in inventario (`BAS 1030–1050`). Senza documenti la partita si chiude con l'arresto (R4). |
| R12 | Testi della sequenza finale | **A — Ripristino** | Testi originali per l'incontro con Ferenc e il percorso a piedi fino alla barriera (`BAS 840–1020`), gli avvisi e l'arresto della guardia, la morte nella zona aperta. Sostituiscono i testi attuali, che contengono un anacronismo ("dossier KGB" nel 1948), un riferimento alla torcia anche quando è guasta o posata e, in inglese, la guardia al femminile. |

### 3.1 Incastri tra le decisioni (approvati)

1. **R10 con R9 — `SPEGNI`**: il verbo viene riconosciuto e risponde con un messaggio fisso (per esempio "Non è il momento di restare al buio."); nessun effetto.
2. **R10 con R6 — `SCARICA` e ripresa del peso**: risposta fissa (per esempio "Il meccanismo si è bloccato.") e nessun effetto.
3. **R11 con R1 — luce alla barriera**: all'arrivo alla barriera c'è luce d'ufficio, come nell'originale (`BAS 1030`, `V2=1`), anche se la lampada è stata rimossa.
4. **R8 con R9 — fiammifero acceso**: un fiammifero acceso conta come fonte di luce, quindi lasciare la lampada accesa in un'altra stanza non è mortale se il fiammifero è acceso. `accendi fiammifero` e `accendi lampada` sono comandi distinti; accendere la lampada consuma un fiammifero.

### 3.2 Testo danneggiato

`BAS 1570`: "La guardia ti rivolge una domanda in russo; probabilmente vuole che ti qualifichi." Ricostruzione confermata dall'autore; la corruzione risale alla compilazione dell'epoca.

## 4. Punteggio

- Il massimo resta **138** e le soglie dei ranghi restano invariate. Verifica sui dati v1.4.0: 56 luoghi non terminali + 17 interazioni con punteggio × 2 + 14 misteri × 3 + 2 (sequenza della cassaforte) + 4 (Ferenc) = 138.
- Le nuove interazioni introdotte da R7, R8 e R10 **non assegnano punti**: campo esplicito nei dati (per esempio `punteggio: false`), letto dal motore e ammesso dallo schema delle interazioni.
- `prendi quadro` e `sposta quadro` condividono lo stesso punteggio: la scoperta della cassaforte conta una volta sola.
- Nuovo test: il massimo calcolato dai dati vale 138 e coincide con il valore mostrato (messaggi IT/EN e `odessa_main.js`).

## 5. Simulazione dell'alba (R3)

Percorso completo eseguito sul motore v1.4.0 (file `20261015 - Percorso di riferimento v1.4.0.json`): 95 comandi, tutti accettati, vittoria.

| Misura | Valore |
|---|---|
| Turni consumati prima dell'incontro con Ferenc | 94 |
| Risparmio massimo stimato con un percorso diverso | 3–4 turni |
| Effetto delle altre decisioni sul percorso minimo | al più +1 turno (quadro preso in inventario) |
| Limite deciso | 200 turni, circa 2,1 volte il minimo |

Il percorso tocca le zone aperte solo in movimento e non resta mai al buio, quindi resta valido con R1, R2 e R8. Nel porting le parole sconosciute e i comandi di sistema non consumano turni, e il salvataggio conserva il contatore: il margine effettivo è maggiore che nell'originale.

## 6. Effetti sulle issue

| Issue | Effetto |
|---|---|
| #96 (E1) | Ridotta: R6 è B, quindi niente effetti reversibili. Resta il bisogno di effetti condizionali e del campo "senza punteggio" (§4); da rivalutare quando si scrive la TD enigmi. |
| #97 (B3) | Superata da R4: si chiude con la PR della TD timer. |
| #98 (B5) | Assorbita da R10: si chiude con la PR del lotto lessico che contiene CARICA. |
| #99 (E3) | Primo intervento del blocco: test del percorso di riferimento (minimo ≤ 100 turni prima di Ferenc) e test del punteggio massimo; poi un test per ogni regola ripristinata. |
| #63 (E2) | Dopo gli interventi sulle regole. |

## 7. Piano delle specifiche

| Ordine | TD | Contenuto | Issue |
|---|---|---|---|
| 1 | Rete di sicurezza | Percorso di riferimento, punteggio massimo | #99 (parte) |
| 2 | Timer e sequenza finale | R1, R2, R3, R4, R11, R12, §3.1 punto 3 | nuova issue; chiude #97 |
| 3 | Luce | R8, §3.1 punto 4 | nuova issue |
| 4 | Enigmi e punteggio | R7, §4 | #96 |
| 5 | Lessico, a lotti | R10, §3.1 punti 1 e 2, CARICA | nuove issue; chiude #98 |
| 6 | Refactor | `executeCommand()`, `ensureVocabulary()` | #63 |
