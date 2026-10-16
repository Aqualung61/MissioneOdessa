# TD — Lessico L3: guardia, nomi, luoghi, movimento e preposizioni

| Campo | Valore |
|---|---|
| Documento | Specifica tecnica (TD) |
| Versione | v1.1 — approvata (2026-10-16, decisioni E1–E7). v1.1: `DAI` escluso dalle preposizioni (è già sinonimo di `porgi`); §4.10 precisata: parola digitata, non forma canonica |
| Data | 2026-10-16 |
| Issue | #109 (lotto L3, ultimo) — milestone `v1.4.1 (Fedeltà all'originale e refactor del motore)` |
| Riferimenti | `docs/20261015 - Inventario lessico originale - v1.0.md` (§1.3, §1.4, D4, D5); sorgente `missione_odessa.bas` (righe citate) |
| Baseline | `release/v1.4.1` @ `df8b5d5` (dopo L2b) |
| Struttura | Un solo handoff (lotti piccoli uniti) |
| Modello consigliato | Claude Sonnet 5.5: Fase 1A effort alto, 1B e 2 medio |

## 0. Decisioni (approvate)

| # | Punto | Proposta |
|---|---|---|
| E1 | `attacca` & sinonimi **fuori dalla barriera** (nell'originale: "Non capisco.") | Risposta generica del porting per il verbo senza effetto, come gli altri verbi; nessun testo nuovo |
| E2 | Oggetti scenici `filo spinato`, `arredamento`, `elevatore`, `parete` | `esamina` risponde "Non noto nulla di particolare." **ovunque**, come l'originale (BAS: azione senza controllo di presenza). Gli altri verbi: risposta generica |
| E3 | `gira manopola` in biblioteca | Solo **con la cassaforte visibile** (dopo `sposta quadro`): "Indica un verso."; prima: "Non vedi manopola qui." (nell'originale funzionava sempre, ma la manopola è quella della cassaforte nascosta) |
| E4 | Preposizioni italiane da ignorare | **Sì**: `A`, `AD`, `AL`, `ALLO`, `AI`, `AGLI`, `ALLE`, `IN`, `NEL`, `NELLO`, `NELLA`, `NEI`, `NEGLI`, `NELLE`, `SUL`, `SULLO`, `SULLA`, `SUI`, `SUGLI`, `SULLE`, `DA`, `DAL`, `DALLO`, `DALLA`, `DAGLI`, `DALLE` (`DAI` escluso: è già voce di `PORGERE`, "dai documenti"). EN: `IN`, `ON`, `INTO`, `ONTO`. **Esclusi** `DI` e composti (`DEL`, `DEGLI`…): compaiono dentro nomi di oggetti ("bastone di comando") e cambierebbero il riconoscimento dei nomi; i 12 nomi di tre parole restano un limite noto, da valutare nel refactor (v1.4.2). `SU` resta "alto" |
| E5 | Voci residue `BOTTON_LEGACY`, `TAVOLO_LEGACY`, `TABLE_LEGACY` (nessun giocatore le digita; non usate nel codice) | **Rimuoverle ora**: permettono la regola generale di §4.6 senza eccezioni e tolgono il falso positivo "botton" dal controllo della lingua. Costo: 194 casi del corpus e 1.890 righe dell'istantanea cambiano o spariscono, per regola |
| E6 | Messaggi speciali di movimento | Solo quelli senza morte, perché le tre morti di movimento dell'originale (elevatore, pozzo, posto di blocco) **esistono già** nel porting come luoghi terminali (8, 40, 54) |
| E7 | Passaggio crollato (32 → sud, BAS 5160) | **Non** si ripristina: nel porting il passaggio 32 → 36 resta percorribile (scelta strutturale del porting); fuori perimetro |

## 1. Valutazione del rischio di regressione

| Area | Rischio | Contenimento |
|---|---|---|
| Preposizioni (E4) | **Medio**: parole brevi e frequenti, entrano nell'analisi di ogni comando italiano | Verificato: nessuna esiste già nel lessico IT, tranne `DAI` (escluso). Corpus protetto (solo i cambi di §6.2) + istantanea delle risposte |
| Morte attaccando la guardia | Medio-basso: nuova fine partita alla barriera | Test dedicato IT/EN; percorsi di riferimento invariati (nessuno attacca) |
| Rimozione voci residue (E5) | Basso: dati non usati | Cambi del corpus e dell'istantanea definiti per regola |
| Nomi e luoghi nuovi | Basso | Verificato: nessuna delle parole nuove esiste già (IT ed EN) |
| Regola generale dei nomi senza oggetto | Basso | Con E5 l'unico effetto atteso è sui nomi nuovi di questo lotto |

## 2. Perimetro

Dentro: §3–§5. Fuori: passaggio crollato (E7); `DI` e nomi lunghi (E4); verbi nuovi di movimento come `vai`/`go` (nell'originale assenti).

## 3. Lessico nuovo

Verificato su `df8b5d5`: nessuna di queste parole esiste già, in nessuna lingua.

| Concetto (nuovo) | Tipo | IT | EN |
|---|---|---|---|
| ATTACCARE | azione | ATTACCA, ATTACCARE, COLPISCI, COLPIRE, PICCHIA, PICCHIARE, UCCIDI, UCCIDERE | ATTACK, HIT, STRIKE, KILL, PUNCH |
| GUARDIA | nome | Guardia, Uomo | Guard, Man, Soldier |
| MANOPOLA | nome | Manopola | Knob, Dial |
| FILO_SPINATO | nome | Filo spinato | Barbed wire |
| ARREDAMENTO | nome | Arredamento | Furniture |
| ELEVATORE | nome | Elevatore | Elevator, Lift |
| PARETE | nome | Parete | Wall |
| LUOGO | nome | Archivio, Armeria, Atrio, Barriera, Biblioteca, Camera, Capanno, Corridoio, Cortile, Cucina, Garage, Passaggio, Pianerottolo, Piazza, Pozzo, Reception, Ripostiglio, Sala, Salone, Scala, Scalone, Stanza, Strada, Studio (le 24 parole dell'originale) | Archive, Armoury, Armory, Hall, Atrium, Barrier, Library, Room, Bedroom, Shed, Corridor, Courtyard, Yard, Kitchen, Garage, Passage, Landing, Square, Well, Reception, Storeroom, Lounge, Stairs, Staircase, Street, Study |
| PREPOSIZIONE (esistente) | parola vuota | voci di E4 | IN, ON, INTO, ONTO |

Rimozione (E5): voci `BOTTON_LEGACY` (IT, EN), `TAVOLO_LEGACY` (IT), `TABLE_LEGACY` (EN). I concetti restano.

## 4. Risposte

| # | Comando | Dove / condizione | IT | EN |
|---|---|---|---|---|
| 4.1 | `esamina guardia` / `uomo` | barriera (59) | È un sottufficiale russo, armato: ti guarda con curiosità. (BAS 5280) | He's an armed Russian NCO: he looks at you with curiosity. |
| 4.2 | `attacca` e sinonimi, con o senza nome | barriera (59) | **Morte**: "Non sei molto veloce nella tua azione: la guardia scansa il tuo attacco e reagisce. Ti colpisce con il calcio del fucile e tu cadi tramortito: pessima fine di un'avventura quasi conclusa." (BAS 5240–5260), poi la richiesta di riavvio come le altre morti | You're not very quick: the guard dodges your attack and strikes back. He hits you with the butt of his rifle and you fall unconscious: a sorry end to an adventure that was almost over. |
| 4.3 | `gira`/`ruota manopola` | biblioteca (24), cassaforte visibile (E3) | Indica un verso. (BAS 5130) | It points one way. |
| 4.4 | `esamina` oggetti scenici (E2) | ovunque | Non noto nulla di particolare. (BAS 2270) | I notice nothing special. |
| 4.5 | `esamina macerie` | 11, 32, 36 (al 49 resta la descrizione dell'oggetto) | Non noto nulla di particolare. | I notice nothing special. |
| 4.6 | `esamina` / `guarda` + nome di luogo | ovunque (D4) | Come `guarda`: descrizione del luogo corrente (BAS 5520: nessun testo, ripresenta il luogo) | idem |
| 4.7 | `o` | atrio (1) | Se vai ad ovest lasci la casa: ma tu hai un lavoro da fare... (BAS 4930) | If you go west you'll leave the house: but you have a job to do... |
| 4.8 | `e` | passaggio (44), porta chiusa | Di lì non puoi andare: c'è una porta ma è chiusa. (BAS 4510) | You can't go that way: there's a door, but it's closed. |
| 4.9 | `o` | tinello (49), prima di scavare | Delle macerie ti impediscono di andare ad ovest. Non si passa se non scavando. (BAS 4620) | Rubble blocks your way west. You can't get through without digging. |

Note:
- 4.2 usa il meccanismo di fine partita esistente (come l'arresto della guardia), con un motivo proprio (`GUARD_ATTACK`). Il punteggio non cambia.
- 4.7–4.9 sostituiscono "Non puoi andare in quella direzione." solo in quei luoghi e in quelle condizioni; il turno si consuma come per ogni movimento bloccato.
- 4.6: con altri verbi i nomi di luogo danno la risposta generica.

### 4.10 Regola generale dei nomi senza oggetto (sostituisce l'elenco di L2a)

Nei messaggi generici, se il nome non corrisponde a un oggetto nella lingua corrente, si mostra **la parola effettivamente digitata** dal giocatore (in minuscolo, senza parole vuote), non la forma canonica del concetto: `prendi cucina` → "Non vedi cucina qui." (non "archivio"), `turn knob` → "knob" (non "dial"), `esamina uomo` → "uomo". L'elenco fisso `DESTRA`, `SINISTRA`, `PORTA` di L2a si elimina. Con la rimozione di E5, il controllo della lingua non ha più eccezioni (`botton` esce dall'elenco dei falsi positivi).

## 5. Parser

- `ATTACCARE` ammesso senza nome (`ACTION_NO_OBJECT`).
- Preposizioni di E4 nel concetto esistente `PREPOSIZIONE`. Dopo la rimozione, un comando fatto solo di parole vuote (per esempio `a`) dà lo stesso esito di oggi per `a` in inglese.

## 6. Test

### 6.1 Istantanea delle risposte

Un aggiornamento in Fase 1B. Differenze attese, per categoria: righe di §4 (cambiate); righe nuove per le parole di §3; righe rimosse per le voci di E5 (1.890); righe cambiate per la regola di §4.10 limitate ai nomi nuovi. Ogni coppia "prima → dopo" va ricondotta a una riga di questa specifica.

### 6.2 Corpus del parser: cambi attesi

Solo i 194 casi che contengono una voce rimossa (E5): devono dare lo stesso esito che avrebbero con una parola sconosciuta nella stessa posizione. Nessun altro caso cambia (le parole nuove non sono nel corpus).

### 6.3 Test nuovi — `tests/lexicon.l3.test.ts`

Un caso per ogni riga di §4, in IT e in EN, giocando i percorsi di riferimento; inoltre:

| ID | Caso | Atteso |
|---|---|---|
| TC-01 | `gira a destra` in biblioteca (passo 37) | Stesso esito di `gira destra` |
| TC-02 | `prendi la lampada nel ripostiglio`… e altri comandi con preposizioni di E4 | Stesso esito senza preposizione |
| TC-03 | `esamina bastone di comando` | Invariato rispetto a oggi (E4: `di` non è ignorata) |
| TC-04 | `attacca guardia` alla barriera | Fine partita, motivo `GUARD_ATTACK`, richiesta di riavvio |
| TC-05 | `attacca` fuori dalla barriera | Nessuna fine partita (E1) |
| TC-06 | Percorsi completi e punteggio 138 | Invariati (test protetti) |

## 7. Prova manuale (Mauro, `localhost:3001`)

| # | Prova | Atteso |
|---|---|---|
| M1 | Partita IT: `o`, `esamina atrio`, `esamina elevatore`, `gira a destra` | 4.7; descrizione dell'atrio; 4.4; "Non vedo niente da ruotare." |
| M2 | Salvataggio passo 91: `o`, `s`, `e`, `e` | 4.8 sulla porta chiusa |
| M3 | Partita EN fino alla barriera (o un salvataggio lì): `examine guard`, poi `attack guard` | 4.1; morte 4.2 e riavvio con `yes` |

## 8. Criteri di accettazione

| ID | Criterio |
|---|---|
| AC-1 | Lint, build, typecheck, test PASS |
| AC-2 | Test protetti invariati; corpus con i soli cambi di §6.2 |
| AC-3 | Istantanea: differenze solo nelle categorie di §6.1, verificate sul diff |
| AC-4 | Controllo della lingua pulito, senza eccezioni |
| AC-5 | Prova manuale PASS |

## 9. Rollback

Revert della PR su `release/v1.4.1`.
