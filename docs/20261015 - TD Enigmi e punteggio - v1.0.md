# TD — Enigmi e punteggio: bastone sotto le macerie, quadro prendibile, interazioni senza punteggio

| Campo | Valore |
|---|---|
| Documento | Specifica tecnica (TD) |
| Versione | v1.0 — approvata da Mauro Giorgi il 2026-10-15 (eccezione controllata su `scoring.max.test.ts`, testi EN, fermacarte: si tiene il porting) |
| Data | 2026-10-15 |
| Issue | #96 — milestone `v1.4.1 (Fedeltà all'originale e refactor del motore)` |
| Decisioni | `docs/20261015 - Decisioni fedeltà originale - v1.0.md`: R7 e §4 (punteggio) |
| Destinazione | `release/v1.4.1` |
| Baseline | `release/v1.4.1` @ `a6ac6e5` (dopo #108) |
| Fonte per l'originale | `missione_odessa.bas` (`BAS nnnn`) e tabella delle azioni, ricavati dal codice e non eseguiti |
| Modello consigliato per l'implementazione | Claude Sonnet 5.5, effort alto |

## 1. Valutazione del rischio di regressione

**Livello complessivo: medio-basso.** Si aggiungono interazioni nei dati e un campo nel modello delle interazioni; il punto delicato è il punteggio.

| Area | Rischio | Perché | Contenimento |
|---|---|---|---|
| Punteggio | **Medio** | Il nuovo campo `punteggio` cambia come il motore assegna +2 e +3. Un errore porterebbe il massimo oltre 138 o farebbe perdere punti esistenti. | Percorso completo (138) invariato; aggiornamento controllato del test del massimo (§6.1) |
| Ricerca delle interazioni | **Basso-medio** | Le nuove interazioni su PRENDERE ed ESAMINARE intercettano comandi oggi gestiti dal motore generico. Si appoggiano alla regola "prerequisito fallito senza risposta → si passa oltre" (#93). | TB dedicati per prima e dopo ogni sblocco |
| Limite di 5 oggetti | **Basso** | Prendere il quadro passa da un'interazione: serve un prerequisito che rispetti il limite. | TB-07 |
| Percorsi di riferimento | **Basso** | Il percorso completo passa dall'ufficio (11) senza prendere il bastone e usa `sposta quadro`. Devono passare **senza modifiche**. | Un fallimento è una regressione |

## 2. Perimetro

Dentro:
- R7: bastone bloccato dalle macerie nell'ufficio (11), da liberare scavando con il badile; bastone leggibile solo in mano; quadro prendibile, e prenderlo scopre la cassaforte;
- §4 delle decisioni: campo `punteggio` per le interazioni (nessun punteggio, oppure punteggio condiviso);
- nuovo tipo di prerequisito `INVENTARIO_NON_PIENO`;
- chiusura di #96 (perimetro ridotto: niente meccanismi reversibili, R6 = B).

Fuori:
- `scava` senza nome (l'originale lo accetta): lessico, #109;
- prendere il fermacarte (vedi §8);
- `esamina macerie` nell'ufficio.

## 3. Regole originali di riferimento

| Elemento | Originale |
|---|---|
| Bastone | Nell'ufficio, **visibile** nell'elenco degli oggetti ma bloccato (`L(2)=-53`; l'elenco usa `ABS(L(I))`, `BAS 270`). `prendi bastone` → "Le macerie te lo impediscono." (`BAS 4180`). `scava` o `scava macerie` nell'ufficio: senza badile in inventario "Ti manca l'attrezzo!"; con il badile "Rimuovi le macerie che impediscono di prendere il bastone." e il bastone diventa prendibile (`BAS 4200–4230`); scavando di nuovo, risposta generica "Scava, scava, scava..." (`BAS 5140–5150`) |
| Leggere il bastone | `esamina bastone` senza averlo in mano → "Senza prenderlo è difficile." (`BAS 2510`); in mano mostra la frase cifrata (`BAS 2520–2540`) |
| Quadro | Prendibile nella biblioteca (`L(21)=9`). `prendi quadro`: se l'inventario non è pieno scopre la cassaforte e prende il quadro (`BAS 3780–3790`); se è pieno "Puoi portare solo cinque oggetti!" e la cassaforte resta nascosta. `sposta quadro` scopre la cassaforte senza prenderlo (`BAS 3800–3810`) |

Nel porting oggi il bastone si prende direttamente e si esamina senza prenderlo; il quadro si può solo spostare.

## 4. Soluzione

### 4.1 Campo `punteggio` nelle interazioni

Nuova chiave di primo livello, facoltativa, in `Interazioni.json`:

| Valore | Effetto |
|---|---|
| assente | Come oggi: +2 alla prima esecuzione (chiave = `id` dell'interazione); +3 per ogni mistero nuovo degli effetti |
| `false` | Nessun +2 e nessun +3 per i misteri degli effetti |
| stringa (id di un'altra interazione) | Il +2 usa quella chiave: se l'altra interazione è già stata eseguita (o viceversa) non si assegna di nuovo; i misteri come oggi (la chiave del mistero è già condivisa per oggetto o direzione) |

- `interactionSchema.js`: `punteggio` tra le chiavi ammesse; valore ammesso `false` o stringa uguale a un `id` esistente nella stessa lingua; coerenza IT/EN (stesso valore).
- Motore: la chiave usata per `punteggio.interazioniPunteggio` è `punteggio` se stringa, altrimenti `id`; con `false` non si aggiunge nulla e `assegnaPunteggioMistero` non si chiama.

### 4.2 Prerequisito `INVENTARIO_NON_PIENO`

Soddisfatto se il giocatore porta meno di 5 oggetti (stesso conteggio del comando `prendi` generico). Nessun campo obbligatorio; ammette `risposta`. Va in `PREREQUISITE_TYPES` e nel motore.

### 4.3 Bastone (ID 1, luogo 11)

Dati di `Oggetti.json` (IT ed EN): `Attivo` da 3 a **1** (visibile, non prendibile).

Nuove interazioni (IT ed EN, `ripetibile: true` salvo dove indicato, tutte con `punteggio: false`):

| id | Trigger | Luogo | Prerequisiti | Effetti | Risposta |
|---|---|---|---|---|---|
| `prendi_bastone_bloccato_11` | PRENDERE BASTONE_DI_COMANDO | 11 | `FLAG_FALSE flags.bastoneLiberato` (senza risposta) | nessuno | "Le macerie te lo impediscono." |
| `scava_macerie_11` | SCAVARE MACERIE | 11 | `OGGETTO_IN_INVENTARIO Badile arruginito` (risposta "Ti manca l'attrezzo!"); `FLAG_FALSE flags.bastoneLiberato` (risposta "Scava, scava, scava...") | `VISIBILITA Bastone di comando 3`; `SET_FLAG flags.bastoneLiberato true` | "Rimuovi le macerie che impediscono di prendere il bastone." |
| `esamina_bastone` | ESAMINARE BASTONE_DI_COMANDO | ovunque (`null`) | `OGGETTO_IN_INVENTARIO Bastone di comando` (risposta "Senza prenderlo è difficile.") | nessuno | La descrizione attuale del bastone in `Oggetti.json` |

Funzionamento: prima dello scavo `prendi bastone` risponde con le macerie; dopo lo scavo il prerequisito fallisce senza risposta e il comando passa al `prendi` generico (bastone ormai prendibile, limite di 5 oggetti rispettato).

Concetti e nomi target: usare quelli esistenti nel lessico e in `Oggetti.json` (IT ed EN); se il concetto del bastone ha un nome diverso da `BASTONE_DI_COMANDO`, usare quello.

### 4.4 Quadro (ID 33, luogo 24)

Dati di `Oggetti.json` (IT ed EN): `Attivo` da 1 a **3** (prendibile).

Interazione esistente `sposta_quadro_24`: aggiungere l'effetto `SET_FLAG flags.cassaforteScoperta true`. Testo e punteggio invariati.

Nuova interazione (IT ed EN):

| id | Trigger | Luogo | Prerequisiti | Effetti | Risposta | Punteggio |
|---|---|---|---|---|---|---|
| `prendi_quadro_24` | PRENDERE QUADRO | 24 | `FLAG_FALSE flags.cassaforteScoperta` (senza risposta); `INVENTARIO_NON_PIENO` (risposta: testo di `engine.take.inventoryFull`) | `VISIBILITA Cassaforte 1`; `SPOSTA_OGGETTO Quadro da 24 a 0`; `SET_FLAG flags.cassaforteScoperta true` | "Prendi il quadro. Scopri che il quadro copre una cassaforte a muro." | `"sposta_quadro_24"` (condiviso) |

`ripetibile: true` (dopo la scoperta il prerequisito sul flag fallisce senza risposta e il quadro si prende o si posa con i comandi generici).

Punteggio: la scoperta della cassaforte vale una sola volta, comunque avvenga: +2 condiviso con `sposta_quadro_24`, +3 del mistero `visibilita_Cassaforte` già condiviso.

### 4.5 Testi EN

| IT | EN |
|---|---|
| Le macerie te lo impediscono. | The rubble is in the way. |
| Ti manca l'attrezzo! | You don't have the right tool! |
| Scava, scava, scava... | Dig, dig, dig... |
| Rimuovi le macerie che impediscono di prendere il bastone. | You clear away the rubble that was keeping you from taking the baton. |
| Senza prenderlo è difficile. | It's hard without picking it up. |
| Prendi il quadro. Scopri che il quadro copre una cassaforte a muro. | You take the painting. You discover that it was hiding a wall safe. |

Per il messaggio del limite di oggetti si riusa il testo esistente di `engine.take.inventoryFull` (IT ed EN).

## 5. Punteggio massimo

Con §4.1 il massimo resta **138**: le interazioni con `punteggio: false` non contano; `prendi_quadro_24` condivide la chiave di `sposta_quadro_24`; nessun mistero nuovo (`visibilita_Bastone di comando` è in un'interazione senza punteggio).

## 6. Test

### 6.1 Test esistenti e test protetti

- Procedura S/R come in #107 e #108.
- `tests/walkthrough.test.ts`, `tests/timers.original.test.ts`, `tests/matches.test.ts` e i fixture: **nessuna modifica**.
- **Eccezione controllata, da approvare:** `tests/scoring.max.test.ts` calcola il massimo riproducendo le regole del punteggio e il suo commento dice che va aggiornato insieme a esse. Va aggiornato **solo** il calcolo, per applicare il campo `punteggio` (esclusione con `false`, deduplica delle chiavi condivise, esclusione dei misteri delle interazioni senza punteggio). L'asserzione **resta 138**, come le due verifiche sui testi mostrati.

### 6.2 Test nuovi — `tests/puzzles.r7.test.ts`

| ID | Caso | Atteso |
|---|---|---|
| TB-01 | Nell'ufficio, `prendi bastone` | "Le macerie te lo impediscono."; bastone non in inventario; punteggio invariato |
| TB-02 | Nell'ufficio senza badile, `scava macerie` | "Ti manca l'attrezzo!" |
| TB-03 | Con il badile, `scava macerie`, poi `prendi bastone` | "Rimuovi le macerie…"; bastone in inventario; nessun punto guadagnato da queste due azioni |
| TB-04 | Dopo TB-03, `scava macerie` di nuovo | "Scava, scava, scava..." |
| TB-05 | `esamina bastone` senza averlo / con il bastone in mano | "Senza prenderlo è difficile." / descrizione con UXRWD LO VHGLOH |
| TB-06 | Biblioteca, `prendi quadro` con inventario non pieno | Quadro in inventario; cassaforte visibile; +2 e +3 come `sposta quadro` |
| TB-07 | Biblioteca, `prendi quadro` con 5 oggetti | Testo del limite; quadro non preso; cassaforte nascosta |
| TB-08 | `sposta quadro`, poi `prendi quadro` | Cassaforte scoperta una sola volta; il secondo comando prende il quadro con il `prendi` generico; punteggio +5 in totale, non +7 o +10 |
| TB-09 | `prendi quadro`, `posa quadro`, `prendi quadro` | Prende e posa normalmente; nessun punto aggiuntivo |
| TB-10 | Schema | `punteggio` e `INVENTARIO_NON_PIENO` ammessi; uno `punteggio` stringa che non corrisponde a un `id` esistente è segnalato |
| TB-11 | EN | TB-01 e TB-06 in inglese |

Il percorso fino al badile e all'ufficio si gioca con i passi del percorso completo, come in #107.

## 7. Prova manuale (Mauro, `localhost:3001`)

Partita nuova in italiano, con i percorsi indicati. La lampada va presa e accesa all'inizio: la torcia si guasta al sesto turno e al buio `prendi` ed `esamina` non funzionano (R1).

| # | Prova | Atteso |
|---|---|---|
| M1 | Lampada e poi ufficio (11): `e`, `n`, `prendi lampada`, `accendi lampada`, `s`, `e`, `n`, `su`, `s`, `o`; poi `prendi bastone` | Il bastone è nell'elenco degli oggetti; "Le macerie te lo impediscono." |
| M2 | Nello stesso punto `scava macerie` | "Ti manca l'attrezzo!" |
| M3 | Partita nuova, lampada e poi biblioteca (24): `e`, `n`, `prendi lampada`, `accendi lampada`, `s`, `s`, `s`, `s`; poi `prendi quadro`, `inventario`, `esamina cassaforte` | "Prendi il quadro. Scopri che il quadro copre una cassaforte a muro."; quadro in inventario; cassaforte descritta |

Lo scavo con il badile (garage) e la lettura del bastone sono coperti dai test automatici; facoltativamente si possono provare a mano.

## 8. Fuori perimetro

**Fermacarte.** Nell'originale prendere il fermacarte rompe il meccanismo dello scomparto segreto (`BAS 3720`, `BAS 3760`); nel porting il fermacarte non si può prendere. **Decisione (Mauro, 2026-10-15): si tiene il porting.** Nessuna modifica.

## 9. Criteri di accettazione

| ID | Criterio |
|---|---|
| AC-1 | Lint, build, typecheck, test PASS |
| AC-2 | Percorsi di riferimento, timer e fiammiferi PASS senza modifiche |
| AC-3 | `scoring.max.test.ts`: modificato solo il calcolo, asserzione 138 invariata |
| AC-4 | TB-01…TB-11 PASS |
| AC-5 | Prova manuale M1–M3 PASS |
| AC-6 | #96 chiusa a mano dopo il merge |

## 10. Rollback

Revert della PR su `release/v1.4.1`.
