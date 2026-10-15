# TD — Timer e sequenza finale

| Campo | Valore |
|---|---|
| Documento | Specifica tecnica (TD) |
| Versione | v1.0 — approvata da Mauro Giorgi il 2026-10-15 (testi IT, traduzioni EN, titoli delle morti, comportamento alla barriera, salvataggi oltre il limite) |
| Data | 2026-10-15 |
| Issue | #107 (chiude anche #97) — milestone `v1.4.1 (Fedeltà all'originale e refactor del motore)` |
| Decisioni | `docs/20261015 - Decisioni fedeltà originale - v1.0.md`: R1, R2, R3, R4, R11, R12, §3.1 punto 3 |
| Destinazione | `release/v1.4.1` (non `main`) |
| Baseline | `release/v1.4.1` @ `fb4c172` |
| Fonte per l'originale | `missione_odessa.bas` (righe citate come `BAS nnnn`), ricavato dal codice e non eseguito |
| Modello consigliato per l'implementazione | Claude Opus 5.5, effort alto (cambio di semantica del ciclo di turno, molti test coinvolti) |

## 1. Valutazione del rischio di regressione

**Livello complessivo: medio-alto.** Cambia il cuore del ciclo di turno: quando si applicano gli effetti, come contano i timer, come finisce la partita.

| Area | Rischio | Perché | Contenimento |
|---|---|---|---|
| Ciclo di turno | **Alto** | Oggi gli effetti di turno si applicano solo ai comandi accettati (`result.accepted`). Le regole originali contano **ogni** comando che consuma un turno, anche un movimento rifiutato ("Di lì non puoi andare") o bloccato alla barriera. Va cambiata la condizione nel wrapper `executeCommand`. | §4.1 preciso; test dedicati per comandi rifiutati; percorsi di riferimento invariati |
| Test esistenti | **Alto (atteso)** | Circa 10 file di test codificano le regole attuali (§6.1). Falliranno per costruzione. | Procedura di §6.1: ogni test fallito va classificato; si modificano solo i test superati da una decisione, con riferimento alla decisione |
| Sequenza finale | **Medio** | Testi, rimozione degli oggetti, timer della guardia e luce alla barriera cambiano insieme. | Test su vittoria, arresto, arrivo senza documenti; prova manuale |
| Salvataggi | **Medio** | Nuovi campi di stato; un salvataggio v1.4.0 deve continuare a funzionare. | Valori di default (§4.7); test dei percorsi con il salvataggio v1.4.0 già esistente; prova manuale con due salvataggi forniti |
| Configurazione di produzione | **Medio** | `.env.example` contiene oggi `GAME_MAX_TURNS_CONSUMED=250` attivo. Se la stessa variabile è impostata su Railway, sostituirebbe il limite di 200. | §4.4 e verifica di Mauro sulle variabili Railway prima del rilascio |
| Testi IT/EN | **Basso-medio** | Testi originali in italiano, traduzioni inglesi nuove. | Testi completi in §5, da approvare; test di presenza delle chiavi in entrambe le lingue |
| Percorsi di riferimento | **Basso** | I percorsi non restano mai al buio, attraversano le zone aperte solo muovendosi, finiscono entro 146 turni e porgono i documenti al primo comando alla barriera. Devono passare **senza modifiche ai fixture**. | Se un percorso fallisce è una regressione, non un aggiornamento |

## 2. Perimetro

Dentro:
- R1 buio; R2 zona aperta; R3 alba; R4 guardia; R11 oggetti rimossi da Ferenc; R12 testi della sequenza finale e dei timer;
- §3.1 punto 3 delle decisioni: luce alla barriera;
- chiusura di #97.

Fuori (altre issue):
- fiammiferi e fiammifero acceso come luce (#108);
- guardia esaminabile, attacco alla guardia, nuovi verbi (#109);
- regole di torcia e lampada (R9 = porting, invariate, compresa la morte immediata lasciando la lampada accesa);
- endpoint legacy `POST /api/engine/set-location`: resta com'è (vedi §8).

## 3. Regole originali di riferimento

Nel BASIC i timer scendono di 1 a ogni comando riconosciuto (`BAS 360` → `BAS 490–550`), **subito dopo** l'esecuzione; il timer del buio viene poi riavviato se il giocatore è senza luce (`BAS 360`, `BAS 790–830`).

| Timer | Originale |
|---|---|
| Buio (`T3`) | Senza luce parte a 3. Allo scadere si muore solo se l'ultimo comando era un **verbo di movimento**, anche se il movimento è fallito (`BAS 1230–1280`, verbi 1–6). Altrimenti resta a 0 e, se si è ancora al buio, riparte da 3. Al buio i verbi prendi, esamina/guarda/leggi/osserva e i verbi 17–30 rispondono "E' troppo buio per farlo." (`BAS 240–250`). Ogni turno senza luce: "E' pericoloso muoversi senza luce." (`BAS 780`, non alla barriera). |
| Zona aperta (`T4`) | Entrando in un luogo all'aperto vale 3 e scende subito a 2 con l'avviso (`BAS 2190`, `BAS 1290–1320`). Ogni comando senza spostamento lo fa scendere; a 0 la ronda arresta il giocatore (`BAS 1330–1350`). Uscendo dalla zona si azzera. In pratica: si muore al **secondo comando consecutivo senza spostamento** nella zona. Un movimento fallito non è uno spostamento. |
| Alba (`T5`) | 200 all'inizio (`BAS 2170`); avvisi quando restano 30, 15 e 5 turni (`BAS 1360–1380`); a 0 morte all'aperto (luoghi della zona) o in casa (tutti gli altri) (`BAS 1400–1520`). Fermato all'incontro con Ferenc (`BAS 840`). |
| Guardia (`T6`) | All'arrivo alla barriera; il giocatore ha 4 comandi liberi: avvisi dopo il 2°, 3° e 4° comando, arresto al 5° (`BAS 1530–1650`). Porgere i documenti ferma il timer e porta alla vittoria (`BAS 5310–5330`). |
| Ferenc | Ferma tutti i timer (`BAS 840`); all'arrivo alla barriera la luce è garantita (`V2=1`) e tutti gli oggetti spariscono, tranne i documenti se sono in inventario (`BAS 1030–1050`). |

## 4. Soluzione

### 4.1 Quando si applicano gli effetti di turno

Oggi (`executeCommand`): gli effetti si applicano solo se `result.accepted && shouldConsumeTurn(parseResult)`; il blocco del movimento alla barriera (`runPreExecutionChecks`) restituisce senza effetti.

**Dopo:** gli effetti di turno si applicano a **ogni comando che consuma un turno** (`shouldConsumeTurn(parseResult) === true`), accettato o no, **compreso** il movimento bloccato alla barriera. I comandi di sistema e quelli non validi per il parser continuano a non consumare turni e a non applicare effetti.

Questo vale per tutti gli effetti del registro, torcia compresa. Ogni effetto deve sapere se il comando è stato un **movimento riuscito** (luogo cambiato). Il turno salva quindi anche `movedThisTurn` (luogo prima e dopo il comando diversi).

Ordine nel registro (invariato salvo i nomi): torcia → buio → zona aperta → alba → guardia → controllo delle condizioni di fine partita → vittoria (Ferenc). L'ordine delle verifiche di fine partita resta: lampada abbandonata, buio, luogo terminale, zona aperta, guardia, alba.

### 4.2 R1 — Buio

Stato: `turn.darknessTimer` (intero, 0 = non attivo). Il campo attuale `turnsInDarkness` resta in lettura per compatibilità ma non decide più la morte (vedi §4.7).

A ogni turno consumato, dopo l'esecuzione del comando e il ricalcolo della luce:
1. se `darknessTimer > 0`: scende di 1; se arriva a 0 **e** il comando è di tipo `NAVIGATION` (riuscito o no) → morte per buio;
2. se il giocatore è senza luce: se `darknessTimer === 0` → `darknessTimer = 3`;
3. se il giocatore ha luce → `darknessTimer = 0`.

Il punto 3 corregge un difetto dell'originale, dove il timer continuava a scendere anche dopo aver ritrovato la luce: deviazione minima e dichiarata.

**Azioni al buio.** Senza luce, i comandi con verbo `PRENDERE`, `ESAMINARE`, `GUARDARE`, `LEGGERE`, `SPOSTARE`, `RUOTARE`, `INFILARE`, `METTERE`, `SCAVARE`, `PREMERE`, `PORGERE`, `APRIRE`, `CHIUDERE` non vengono eseguiti e rispondono `engine.dark.tooDark` (§5). Il turno è consumato. Restano eseguibili: movimento, `POSARE`, `LASCIARE`, `ACCENDERE`, `DORMIRE` e i comandi di sistema. Il controllo avviene prima della ricerca delle interazioni e degli oggetti.

**Avviso.** A ogni turno consumato che termina senza luce, fuori dal luogo 59, si aggiunge `timer.darkness.warning`. Non si aggiunge nel turno in cui compare già l'avviso di torcia guasta (`timer.torch.defective.warning`, che lo contiene).

**Morte.** `timer.darkness.death` (testo in §5), `gameOverReason: 'DARKNESS'`.

### 4.3 R2 — Zona aperta

Luoghi della zona: 51, 52, 53, 55, 56, 58 (corrispondono ai luoghi 26–31 dell'originale). Stato: `turn.openAreaTimer`.

A ogni turno consumato:
1. se il luogo finale **non** è nella zona → `openAreaTimer = 0`;
2. se è nella zona e il comando è un movimento riuscito → `openAreaTimer = 2` e si aggiunge `timer.openArea.warning`;
3. se è nella zona senza movimento riuscito: se `openAreaTimer === 0` (stato caricato o inconsistente) → `openAreaTimer = 2`; poi scende di 1; se arriva a 0 → morte; altrimenti si aggiunge `timer.openArea.warning`.

Effetto: entrando si ha l'avviso; il primo comando senza spostamento dà un nuovo avviso; il secondo consecutivo è fatale.

**Morte.** `game.intercept.death` (testo originale in §5), `gameOverReason: 'INTERCEPT'`.

**Rimozioni.** Il contatore cumulativo `turnsInDangerZone` e la soglia `INTERCEPT_TURNS_TO_DIE` non decidono più la morte (il campo resta per compatibilità dei salvataggi, §4.7). La frase "Restare a lungo fermi in un posto all'aperto può essere pericoloso." (EN: "Standing still for too long in an open area can be dangerous.") va **tolta dalle descrizioni** dei luoghi 51, 52, 53, 55, 56, 58 in `Luoghi.json`, IT ed EN: nell'originale non fa parte della descrizione e ora compare come avviso di turno. Nient'altro cambia nelle descrizioni.

### 4.4 R3 — Alba

Limite: **200** turni consumati. Override: se `GAME_MAX_TURNS_CONSUMED` è impostata con un intero positivo, sostituisce 200 (uso: test e prove manuali).

A ogni turno consumato, finché l'incontro con Ferenc non è avvenuto (`narrativeState` nullo):
- turni rimasti = limite − `totalTurnsConsumed`;
- se i turni rimasti sono esattamente 30, 15 o 5 → si aggiunge rispettivamente `timer.dawn.warning30`, `timer.dawn.warning15`, `timer.dawn.warning5`;
- se `totalTurnsConsumed >= limite` → morte: `timer.dawn.death.outdoor` se il luogo è nella zona aperta (§4.3), altrimenti `timer.dawn.death.house`; `gameOverReason: 'TOO_LATE'`.

**Configurazione.** In `.env.example` la riga `GAME_MAX_TURNS_CONSUMED=250` diventa commentata, con la nota: "Override del limite dell'alba (regola di gioco: 200). Solo per test; non impostare in produzione." Stesso chiarimento nella riga di `README.md` che descrive la variabile.

**Salvataggi oltre il limite.** Un salvataggio v1.4.0 con 200 o più turni consumati porta alla morte per l'alba al primo comando dopo il caricamento. È la conseguenza diretta della regola; non si introducono eccezioni.

**Produzione.** Su Railway la variabile `GAME_MAX_TURNS_CONSUMED` è oggi impostata a 250 ed è l'unico limite della v1.4.0 in produzione: **non va toccata ora**. Al rilascio della v1.4.1 va **eliminata** (non portata a 200): il limite di 200 diventa regola del gioco e la variabile serve solo nei test. Il controllo entra nella checklist del rilascio v1.4.1.

La chiave `game.over.tooLate` viene rimossa (IT ed EN), sostituita dalle due morti.

### 4.5 R4 e R11 — Incontro con Ferenc e barriera

**All'incontro con Ferenc** (condizioni di attivazione invariate), in `teleportToBarrier`:
1. tutti gli oggetti spariscono (`IDLuogo = -1`, `Attivo = 0`, `Inventario = false`), **tranne** i Documenti (ID 35) se sono in inventario (`IDLuogo === 0`). Se i Documenti non sono in inventario spariscono anche loro;
2. `timers.lampadaAccesa = false` (la lampada non esiste più; evita che la regola della lampada abbandonata scatti);
3. `turn.darknessTimer = 0`, `turn.openAreaTimer = 0`; il timer dell'alba si ferma (§4.4);
4. `guardTimer = 5`;
5. resto invariato: trasferimento al luogo 59, +4 e +1 punti, `movementBlocked = true`, `narrativeState = 'ENDING_PHASE_2_WAIT'`, risultato `TELEPORT` con il testo `victory.phase1a` (originale, §5).

**Luce alla barriera.** Nel luogo 59 il giocatore ha sempre luce (`hasFonteLuceAttiva` vera), anche senza lampada né torcia.

**Timer della guardia.** A ogni turno consumato nel luogo 59, finché la partita non è finita (compreso il movimento bloccato):
- `guardTimer` scende di 1;
- a 3 → `timer.guard.warning1`; a 2 → `timer.guard.warning2`; a 1 → `timer.guard.warning3`;
- a 0 → arresto: `timer.guard.arrest`, `gameOverReason: 'GUARD_ARREST'`.

`porgi documenti` con i Documenti in inventario porta alla vittoria come oggi; la vittoria ha precedenza sull'arresto nello stesso turno (il controllo di fine partita non si applica se `ended === true`).

Sequenza risultante: 1° comando nessun avviso, 2° sospetto, 3° domanda in russo, 4° guardia spazientita, 5° arresto.

**Rimozioni.**
- `unusefulCommandsCounter`: non più usato né salvato (§4.7);
- il ramo di `executeCommandLegacy` che al luogo 59 risponde `narrative.command.useless` e incrementa il contatore: i comandi alla barriera ricevono le risposte normali del motore;
- la verifica `GUARD_SUSPICIOUS` in `gameOverEffect`;
- le chiavi `game.over.guardia_sospetta` e `narrative.command.useless` (IT ed EN), se non usate altrove (verificare con una ricerca su `src/` e `web/`).

`narrative.movement.blocked` resta: la barriera non ha uscite neanche nell'originale.

**#97.** Con queste regole la partita alla barriera finisce sempre: con la vittoria o con l'arresto al 5° comando. #97 si chiude con questa PR.

### 4.6 R12 — Testi

Tutti i testi di §5 sostituiscono o integrano `MessaggiSistema.json`, IT (`IDLingua: 1`) ed EN (`IDLingua: 2`). I testi italiani sono quelli originali con ortografia normalizzata (accenti, apostrofi, a capo, spazi, "aereoporto" → "aeroporto"), parole invariate. I testi di morte mantengono la riga di titolo con 💀 usata dal porting.

### 4.7 Stato, salvataggi e compatibilità

Nuovi campi:

| Campo | Default al caricamento di un salvataggio che non lo contiene |
|---|---|
| `turn.darknessTimer` | 0 (il primo turno al buio lo avvia) |
| `turn.openAreaTimer` | 0 (gestito da §4.3 punto 3) |
| `turn.movedThisTurn` | `false` |
| `guardTimer` | 5 se `narrativeState === 'ENDING_PHASE_2_WAIT'`, altrimenti 0 |

- I nuovi campi entrano in `getGameStateSnapshot` e in `setGameState` (con i default sopra) e nello stato iniziale di `resetGameState`.
- `turnsInDarkness`, `turnsInDangerZone`: restano nello stato e nel salvataggio per compatibilità all'indietro (un salvataggio v1.4.1 caricato nella v1.4.0 dopo un eventuale rollback), ma non decidono più nulla. `unusefulCommandsCounter` non si salva più; se presente in un salvataggio caricato viene ignorato.
- Il salvataggio v1.4.0 di `tests/fixtures/walkthrough/` deve continuare a passare senza modifiche.

## 5. Testi (IT / EN)

| Chiave | IT | EN |
|---|---|---|
| `engine.dark.tooDark` | È troppo buio per farlo. | It's too dark to do that. |
| `timer.darkness.warning` | È pericoloso muoversi senza luce. | It's dangerous to move without light. |
| `timer.darkness.death` | 💀 MORTE AL BUIO⏎⏎Muoversi al buio può essere pericoloso: inciampi nelle macerie e cadi, rompendoti il collo. Sei morto! *(invariato)* | *(invariato)* |
| `timer.openArea.warning` | Restare a lungo fermi in un posto all'aperto può essere pericoloso. | Standing still for too long in an open area can be dangerous. |
| `game.intercept.death` | 💀 SCORTO DA UNA RONDA⏎⏎Sei stato scorto da una ronda russa che ti arresta come spia. Una fine ingloriosa! | 💀 SPOTTED BY A PATROL⏎⏎You have been spotted by a Russian patrol, which arrests you as a spy. An inglorious end! |
| `timer.dawn.warning30` | Hai ancora poco tempo prima che sorga l'alba! Sbrigati. | You have little time left before dawn! Hurry. |
| `timer.dawn.warning15` | Sono quasi le sei: tra poco sorge l'alba! | It's almost six: dawn will soon break! |
| `timer.dawn.warning5` | Sono le sei passate e sei in pericolo! | It's past six and you are in danger! |
| `timer.dawn.death.house` | 💀 SORPRESO ALL'ALBA⏎⏎Senti dei passi: qualcuno ti colpisce improvvisamente alle spalle. Quando rinvieni ti trovi circondato da tre persone: sono membri dell'ODESSA che ti hanno sorpreso dopo il sorgere dell'alba ancora all'interno della casa, e tu sai che significa... | 💀 CAUGHT AT DAWN⏎⏎You hear footsteps: someone suddenly strikes you from behind. When you come to, you find yourself surrounded by three people: they are members of ODESSA who caught you still inside the house after dawn, and you know what that means... |
| `timer.dawn.death.outdoor` | 💀 SCORTO ALL'ALBA⏎⏎All'improvviso senti delle voci: una pattuglia russa ti ha scorto con le prime luci dell'alba. Non ci pensano troppo: senti la raffica dei mitra come un rumore sgradevole nel silenzio del mattino. Prima di morire riesci a vedere due soldati che si congratulano per il tiro... | 💀 SPOTTED AT DAWN⏎⏎Suddenly you hear voices: a Russian patrol has spotted you in the first light of dawn. They don't think twice: you hear the burst of submachine-gun fire, an unpleasant noise in the silence of the morning. Before you die, you see two soldiers congratulating each other on the shot... |
| `timer.guard.warning1` | La guardia ti osserva con sospetto: a quest'ora del mattino è strano vedere una persona sul confine dei settori. | The guard eyes you suspiciously: at this hour of the morning it is strange to see someone at the sector border. |
| `timer.guard.warning2` | La guardia ti rivolge una domanda in russo; probabilmente vuole che ti qualifichi. | The guard asks you something in Russian; he probably wants you to identify yourself. |
| `timer.guard.warning3` | La guardia, spazientita, si muove verso di te imbracciando il fucile. | The guard, losing patience, moves towards you, raising his rifle. |
| `timer.guard.arrest` | 💀 ARRESTATO⏎⏎La guardia ti spinge contro un muro e ti perquisisce accuratamente. Poi ti conduce verso una garitta nei pressi: sei in arresto. Non hai via di scampo. Scopriranno chi sei e questo potrebbe anche permettere loro di risalire a Ferenc. Hai fallito nella missione. | 💀 ARRESTED⏎⏎The guard pushes you against a wall and searches you thoroughly. Then he leads you to a sentry box nearby: you are under arrest. There is no way out. They will find out who you are, and this might even lead them to Ferenc. You have failed the mission. |

`⏎` indica un a capo (`\n`).

**`victory.phase1a`** (sostituisce l'intero testo attuale):

IT:

```
Da un angolo sbuca Ferenc.
— «Sono felice di rivederti, Liebermann. Vedo che hai i documenti; molto bene. Herr Wiesenthal saprà farne buon uso.»
Ferenc prende i documenti che tu gli porgi e velocemente gli dà un'occhiata. Si infila le carte in una logora borsa.
— «Seguimi senza far rumore: sta per albeggiare e bisogna far presto.»
Apre la porta con cautela e uscite insieme dalla casa.

Fai fatica a tenere il suo passo svelto, tipico della persona che deve sempre fare in fretta e di nascosto. Dopo qualche minuto, in cui avete girato per vie secondarie, passato reticolati ed evitato posti di blocco, si arresta e te ne indica uno più avanti.
— «Io sono arrivato. Quella è la barriera col settore americano: fai l'indifferente e vedrai che a quest'ora passerai senza problemi. Poi prosegui per l'aeroporto: ti aspettano. Io provvederò alla consegna dei documenti. Addio.»
Lo guardi scomparire velocemente nel dedalo di strade alle tue spalle, tenendosi stretta la sua borsa logora.
```

EN:

```
Ferenc steps out from a corner.
— "I'm glad to see you again, Liebermann. I see you have the documents; very good. Herr Wiesenthal will put them to good use."
Ferenc takes the documents you hand him and glances through them quickly. He slips the papers into a worn bag.
— "Follow me without a sound: dawn is about to break and we must hurry."
He opens the door carefully and you leave the house together.

You struggle to keep up with his brisk pace, typical of someone who always has to move fast and unseen. After a few minutes of back streets, barbed wire and avoided checkpoints, he stops and points to one further ahead.
— "This is as far as I go. That is the barrier with the American sector: act casually and you'll see that at this hour you'll get through without any trouble. Then go on to the airport: they are waiting for you. I'll see to the delivery of the documents. Farewell."
You watch him vanish quickly into the maze of streets behind you, clutching his worn bag.
```

Il testo della vittoria (`porgi_documenti_59`) coincide già con l'originale e non cambia.

## 6. Test

### 6.1 Test esistenti superati dalle decisioni

File candidati (contengono asserzioni sulle regole attuali): `tests/unit/gameover-effect.test.ts`, `intercept-effect.test.ts`, `darkness-effect.test.ts`, `victory-effect.test.ts`, `interaction-effects.test.ts`, `turn-effects-registry.test.ts`, `turn-system.test.ts`, `wrapper-pipeline.test.ts`, `tests/issue-58.invariants.edgecases.test.ts`, `tests/api.engine.load.language-mismatch.test.ts`, `tests/victory-sequence.test.ts` (oggi tutto saltato).

Procedura obbligatoria:
1. implementare senza toccare i test esistenti ed eseguire la suite;
2. per **ogni** test fallito, riportare in una tabella: file, nome del test, asserzione, classificazione:
   - **S — superato** da una decisione (indicare R1, R2, R3, R4, R11 o R12): il test descrive la regola vecchia;
   - **R — regressione**: il test descrive un comportamento che non doveva cambiare;
3. correggere il codice per ogni R;
4. per ogni S: aggiornare il test alla nuova regola (non cancellarlo, salvo che la regola non esista più, per esempio il contatore dei comandi inutili), con un commento `// Aggiornato per decisione Rx (#107)`;
5. **Nessuna modifica** a `tests/walkthrough.test.ts`, `tests/scoring.max.test.ts` e ai fixture di `tests/fixtures/walkthrough/`.

### 6.2 Test nuovi — `tests/timers.original.test.ts`

Con motore reale e comandi reali (`parseCommand` + `executeCommand`), partita nuova salvo dove indicato. Per arrivare velocemente a un luogo si può usare un salvataggio costruito eseguendo i passi dei percorsi di riferimento, oppure `setCurrentLocation` **solo** per preparare lo scenario, mai durante la verifica.

| ID | Caso | Atteso |
|---|---|---|
| TB-01 | Buio: `posa torcia`, `esamina documenti`, `posa fiammiferi`, `e` | 1°: avviso di torcia guasta, timer a 3; 2°: "È troppo buio per farlo."; 3°: eseguito; avviso di pericolo a ogni turno; 4° (movimento con timer a 0): morte `DARKNESS` |
| TB-02 | Buio: `posa torcia`, `esamina documenti` ×3, `e`, `n`, `s` | Al 4° comando il timer arriva a 0 senza movimento e riparte da 3; 5° e 6° (movimenti) senza morte; 7° (`s`, movimento con timer a 0): morte `DARKNESS` |
| TB-03 | Buio: movimento rifiutato allo scadere | `n` dall'atrio con timer a 1 → morte `DARKNESS` |
| TB-04 | Buio: ritrovata la luce il timer si azzera | `e`, `n`, `prendi lampada`, `posa torcia` (buio), `esamina documenti`, `accendi lampada` (consentito al buio), poi tre movimenti: nessuna morte |
| TB-05 | Buio: azioni consentite | `posa`, `accendi`, `inventario` al buio non rispondono "troppo buio" |
| TB-06 | Zona: entrare e muoversi sempre (51 → 52 → 51 → 55 → 57) | Avviso a ogni turno nella zona, nessuna morte |
| TB-07 | Zona: entrare e fermarsi | 1° comando fermo: avviso; 2° comando fermo: morte `INTERCEPT` con il testo originale |
| TB-08 | Zona: movimento rifiutato conta come fermo | Nel 52, `e` (rifiutato) e poi `esamina documenti` → morte |
| TB-09 | Zona: uscendo il timer si azzera | 51, comando fermo, `o` verso 47, ritorno a 51, comando fermo → nessuna morte |
| TB-10 | Alba: override `GAME_MAX_TURNS_CONSUMED=40` | Avvisi ai turni 10, 25, 35; al 40° morte `TOO_LATE` con testo "casa" fuori dalla zona |
| TB-11 | Alba nella zona | Allo scadere nella zona: testo "all'aperto" |
| TB-12 | Alba ferma dopo Ferenc | Con limite basso, dopo l'incontro con Ferenc nessuna morte per l'alba |
| TB-13 | Guardia: 5 comandi senza porgere i documenti | Avvisi al 2°, 3°, 4°; arresto `GUARD_ARREST` al 5° |
| TB-14 | Guardia: il movimento bloccato conta | 5 movimenti → arresto al 5° |
| TB-15 | Guardia: vittoria al 4° comando | 3 comandi qualsiasi, poi `porgi documenti` → vittoria, nessun arresto |
| TB-16 | Ferenc senza documenti in inventario | Arrivo alla barriera con inventario vuoto; `porgi documenti` non vince; arresto al 5° comando (chiude #97) |
| TB-17 | Ferenc rimuove gli oggetti | Dopo l'arrivo: inventario = solo Documenti; lampada, torcia e altri oggetti con `IDLuogo === -1`; `lampadaAccesa === false`; luce presente al 59 |
| TB-18 | Testi | Tutte le chiavi di §5 presenti in IT ed EN; `game.over.guardia_sospetta`, `game.over.tooLate`, `narrative.command.useless` assenti; descrizioni dei luoghi della zona senza la frase sull'aperto |
| TB-19 | Salvataggio v1.4.0 senza i nuovi campi | Caricato con `setGameState`, i default di §4.7 sono applicati e la partita prosegue |
| TB-20 | EN | TB-07 e TB-13 in inglese con i testi EN |

### 6.3 Percorsi di riferimento

`tests/walkthrough.test.ts` deve passare **senza modifiche** a test e fixture. Un fallimento è una regressione.

## 7. Prova manuale (Mauro, in `npm run dev`, italiano)

Due salvataggi forniti, prodotti con la v1.4.0: `20261015 - Salvataggio prova piazza - v1.4.0.json` (luogo 47, lampada accesa, 72 turni) e `20261015 - Salvataggio prova ferenc - v1.4.0.json` (reception, tutto pronto per l'incontro, 93 turni). Si caricano con `carica`.

| # | Prova | Atteso |
|---|---|---|
| M1 | Partita nuova: `posa torcia`, `esamina documenti`, `posa fiammiferi`, `e` | 1°: torcia guasta; 2°: "È troppo buio per farlo."; 3°: fiammiferi posati; avviso di pericolo a ogni turno; 4°: morte al buio |
| M2 | Carica "piazza": `e` (piazza), `esamina documenti`, `esamina documenti` | Avviso entrando e al primo comando fermo; morte con "Sei stato scorto da una ronda russa…" al secondo |
| M3 | Carica "piazza": `e`, `n`, `s`, `e`, `n` (fino al capanno) | Avvisi nella zona, nessuna morte |
| M4 | Carica "ferenc": `o` | Testo originale di Ferenc; arrivo alla barriera; `inventario` mostra solo i Documenti |
| M5 | Dopo M4: `esamina documenti`, `n`, `guarda`, `n`, `inventario`, `n` | Avvisi della guardia al 2°, 3° e 4° comando che consuma turno (l'inventario non conta); arresto al 5° |
| M6 | Carica "ferenc": `o`, `porgi documenti` | Vittoria come oggi |
| M7 | Carica "ferenc": `posa documenti`, `o`, poi 5 comandi | All'arrivo inventario vuoto; arresto al 5° comando (#97) |
| M8 | Ripetere M2 e M5 in inglese (`load`) con una partita in inglese | Testi EN (il salvataggio è in italiano: per l'inglese si gioca fino alla piazza o si usano i test automatici; facoltativo) |

## 8. Fuori perimetro, da segnalare

- `POST /api/engine/set-location` (legacy, attivo con `DISABLE_LEGACY_ENDPOINTS=0`) permette di spostarsi in qualsiasi luogo. Non è usato dal frontend. Non si tocca qui; da valutare in un'issue separata (disattivarlo in produzione).
- La chiave `timer.intercept.death` non è usata dal codice: resta invariata.

## 9. Criteri di accettazione

| ID | Criterio |
|---|---|
| AC-1 | Lint, build, typecheck e test PASS |
| AC-2 | Percorsi di riferimento e punteggio massimo PASS senza modifiche |
| AC-3 | Ogni test esistente modificato è classificato S con la decisione citata; nessuna R aperta |
| AC-4 | TB-01…TB-20 PASS |
| AC-5 | Prova manuale M1–M7 PASS |
| AC-6 | `.env.example` senza `GAME_MAX_TURNS_CONSUMED` attivo; README allineato |
| AC-7 | #97 citata con `Fixes #97` nella PR verso `release/v1.4.1` e chiusa manualmente al merge (la chiusura automatica avviene solo sul branch predefinito); `Fixes #107` riportato nella PR finale verso `main` |

## 10. Rollback

Revert della PR su `release/v1.4.1`. Nessun effetto su `main` né sulla produzione finché il blocco non viene rilasciato.
