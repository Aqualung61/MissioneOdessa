# Inventario del lessico e delle risposte dell'originale (#109)

| Campo | Valore |
|---|---|
| Documento | Inventario e proposta di suddivisione in lotti |
| Versione | v1.0 — approvata |
| Data | 2026-10-15 |
| Issue | #109 (R10), #98 (CARICA) — milestone v1.4.1 |
| Baseline del porting | `release/v1.4.1` dopo #96 |
| Metodo | Confronto automatico tra il vocabolario dell'originale (142 parole, `orig.json`) e `VociLessico.json` (IT); tabella delle azioni dell'originale con i testi dei gestori (`missione_odessa.bas`); prove sul motore del porting |

Corrispondenza dei luoghi usata sotto (originale → porting): 1→1, 9→24, 10→20, 32→57, 34→27, 44→32, 45→36, 48→42, 50→44, 53→11, 56→59.

## 1. Cosa manca

### 1.1 Sinonimi di verbi e nomi già esistenti

| Parola originale | Concetto del porting | Note |
|---|---|---|
| osserva | ESAMINARE | |
| gira | RUOTARE | |
| introduci | INFILARE | |
| pigia, schiaccia | PREMERE | |
| sedia | SEDIE | singolare |
| b | BASSO | abbreviazione |
| a | ALTO | **collide** con la preposizione "a" (IT) e l'articolo "a" (EN): da escludere (§3, D1) |
| alla, col, con, l, verso | parole vuote | oggi non riconosciute: un comando come "infila medaglione con…" fallisce |
| `look` (EN) | GUARDARE | esiste, ma da solo è rifiutato ("What do you want?"), mentre `guarda` in italiano funziona |

### 1.2 Verbi assenti

| Verbo originale | Dove | Risposta originale |
|---|---|---|
| spegni (lampada, torcia, luce) | ovunque | R9 = porting: risposta fissa decisa, "Non è il momento di restare al buio." |
| scarica (pesa) | capanno (57) | "La pesa non è carica." prima di caricarla; dopo, risposta fissa decisa "Il meccanismo si è bloccato." (R6 = porting) |
| attacca, colpisci, picchia, uccidi | barriera (59) | "Non sei molto veloce nella tua azione: la guardia scansa il tuo attacco e reagisce…" → **morte** |
| parla, rispondi | ovunque / barriera | "Parlare da solo non ti aiuterà a finire la missione." / al 59 "La guardia non sembra capire il tedesco." |
| scappa | ovunque | "Svicola tutto a mancina... ma non puoi." |
| sorridi | ovunque | "Cheese..." |
| siediti | ovunque | "Non perdere tempo. Hai una missione da compiere." |
| dormi | ovunque | stessa risposta; oggi il porting risponde "Cosa vuoi dormi?" (difetto) |

### 1.3 Nomi assenti

| Nome originale | Uso nell'originale |
|---|---|
| guardia, uomo | al 59: `esamina guardia` → "È un sottufficiale russo, armato: ti guarda con curiosità."; bersaglio di `attacca` |
| luce | `accendi luce` / `spegni luce`: agisce sulla prima fonte disponibile (torcia, fiammifero, lampada) |
| manopola | in biblioteca (24): `gira manopola` → "Indica un verso." |
| filo spinato, arredamento, elevatore, parete | `esamina` → "Non noto nulla di particolare." |
| nomi di luoghi (atrio, biblioteca, cucina… 24 parole) | `esamina <luogo>` equivale a guardarsi intorno |

### 1.4 Risposte specifiche dell'originale assenti nel porting

| Comando | Dove (porting) | Risposta originale |
|---|---|---|
| `o` | atrio (1) | "Se vai ad ovest lasci la casa: ma tu hai un lavoro da fare..." (oggi: "Non puoi andare in quella direzione.") |
| `e` con la porta chiusa | passaggio (44) | "Di lì non puoi andare: c'è una porta ma è chiusa." |
| `apri porta` / `chiudi porta` | 44 | "La porta è chiusa con un meccanismo a scatto." / "La porta è già chiusa." / "La porta si chiude solo azionando il meccanismo automatico." |
| `chiudi porta` | seminterrato (27) | "Non riesci a chiudere la porta: un meccanismo la blocca." |
| `chiudi scomparto` | archivio (25) | "Lo scomparto rimane aperto: si deve essere rotto il meccanismo." |
| `apri` / `chiudi cassaforte` | biblioteca (24) | "È già aperta." / "La cassaforte è già chiusa." (R6 = porting: solo le risposte, nessun effetto) |
| `muovi <oggetto>` senza effetto | ovunque | "Fatto: non accade niente." (oggetti trasportabili) / "Non è possibile." (oggi: "Non puoi muovere …") |
| `gira destra` / `gira sinistra` | fuori dalla biblioteca | "Non vedo niente da ruotare." |
| `scava` (anche senza nome) | ovunque | senza badile "Ti manca l'attrezzo!" / "Vuoi scavare a mani nude? Non hai un attrezzo."; con il badile "Scava, scava, scava..."; nel passaggio crollato (32, 36) "Pur scavando non crei un passaggio a sud/nord." |
| `accendi` / `spegni` senza oggetto | ovunque | agisce sulla prima fonte disponibile |
| `carica peso` / `carica pesa` | capanno (57) | oggi errore di sintassi perché CARICA è il caricamento della partita (#98); senza peso: "Per caricare una pesa occorre un peso." |
| `esamina macerie` | 11, 32, 36 | "Non noto nulla di particolare." |

### 1.5 Risposte di sistema dell'originale

| Caso | Originale | Porting | Proposta |
|---|---|---|---|
| Verbo all'infinito ("prendere") | "Dammi del tu, per favore." | accettato come verbo | **tenere il porting** (D2) |
| Verbo sconosciuto | "Non conosco il verbo '…'." | "Non capisco questa parola." | tenere il porting |
| Nome sconosciuto | "Non conosco la parola '…'." | "Non vedo nessun "…" qui." | tenere il porting |

### 1.6 Presentazione

- Alla barriera, sul movimento bloccato, l'avviso della guardia compare prima di "Non puoi muoverti…" (emerso in #107).

## 2. Proposta di suddivisione in lotti

| Lotto | Contenuto | Tipo di modifica | Rischio |
|---|---|---|---|
| **L1 — Sinonimi e parser** | §1.1: sinonimi IT con equivalenti EN, parole vuote, `look` da solo in EN | Dati del lessico; piccolo intervento nel parser per `look` | **Medio**: tocca l'analisi di tutti i comandi. Protezione: test di non regressione su tutti i comandi oggi accettati (i quattro percorsi di riferimento + l'elenco dei verbi esistenti) |
| **L2 — Verbi e risposte** | §1.2, §1.4 (tranne i nomi), CARICA (#98), `scava`/`accendi`/`spegni` senza oggetto, ordine dell'avviso della guardia (§1.6) | Interazioni con `punteggio: false`, poche righe nel motore (comandi senza oggetto, CARICA) | **Medio-basso**: risposte nuove; l'unico punto delicato è CARICA (caricamento della partita) |
| **L3 — Nomi e luoghi** | §1.3: guardia (esamina, attacca con morte), manopola, oggetti scenici, nomi dei luoghi, `esamina macerie`; messaggi speciali di movimento (ovest dall'atrio, porta chiusa) | Lessico, oggetti scenici, interazioni | **Basso-medio**: la guardia aggiunge una morte al 59; i luoghi come nomi non devono collidere con i nomi esistenti (per esempio "scala", "porta") |

Ordine proposto: L1 → L2 → L3. L1 per primo perché gli altri due usano i sinonimi.

Ogni lotto: specifica, handoff in fasi (1A/1B/2), test protetti invariati, prova manuale, PR verso `release/v1.4.1`. Tutte le nuove interazioni senza punteggio (massimo 138 invariato). Testi EN scritti nella specifica, da approvare.

## 3. Decisioni (approvate il 2026-10-15)

| # | Punto | Proposta |
|---|---|---|
| D1 | Abbreviazione `a` per "alto" | **Esclusa**: collide con "a" (IT) e con l'articolo EN; resta `su`/`sali`/`alto`/`up`/`u` |
| D2 | Verbi all'infinito ("Dammi del tu") | **Tenere il porting**: accetta gli infiniti come sinonimi |
| D3 | Messaggi di verbo o nome sconosciuto | **Tenere il porting** |
| D4 | Nomi dei luoghi come oggetto di `esamina` | **Sì**, equivalenti a `guarda` (lotto L3), verificando le collisioni |
| D5 | Morte attaccando la guardia | **Sì**, come l'originale (lotto L3); testo originale + traduzione EN |
| D6 | Ordine e numero dei lotti | L1 → L2 → L3 |
