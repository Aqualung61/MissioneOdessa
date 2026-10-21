# TD Lotto 3 — Configurazione di gioco (v1.4.2)

| Campo | Valore |
|---|---|
| Issue | #63 (`Refs #63`), #123 framework (`Refs #123`) |
| Baseline | `release/v1.4.2` @ `fb4b330` |
| Riferimento | TD 0 v1.0, "Predisposizione al framework", decisione su `Configurazione.json` |
| Stato | v1.1, approvata il 2026-10-19; emendamenti del 2026-10-20 dopo la Fase 1A (§8) |
| Modello | Fasi 1A e 1B: **Claude Sonnet 5.5, effort medio**. Fase 2: **Sonnet 5.5, effort basso** |

---

## 1. Valutazione del rischio di regressione

**Basso-medio.** Il lotto sostituisce costanti letterali con valori letti da un file; non sposta funzioni e non cambia flussi di controllo.

| Rischio | Probabilità | Mitigazione |
|---|---|---|
| Valore sbagliato in una sostituzione (es. ID 36 oggetto *fiammiferi* confuso con luogo 36) | Media | Chiavi distinte per luoghi e oggetti; istantanea risposte, tracce motore e HTTP, percorsi completi, punteggio 138 |
| Mutazione accidentale di un array di configurazione (`push`, `splice`) | Bassa | Configurazione congelata in profondità: la mutazione lancia `TypeError` in modalità strict (moduli ESM), quindi emerge nei test |
| Configurazione non trovata in produzione | Bassa | Il server parte da `src/` (`node src/server.js`); caricamento sincrono all'avvio con errore esplicito; test dedicato |
| Test che sostituiscono `global.odessaData` con oggetti parziali | Nessuna | La configurazione **non** passa da `global.odessaData` (§3.1) |
| Differenza tra le due funzioni di rango (motore e `/api/engine/stats`) | Nessuna | Stesse soglie; prima corrispondenza in ordine decrescente equivale a entrambe le implementazioni attuali (§3.4) |

Reti che devono restare **identiche** senza aggiornamenti: istantanea risposte (SHA `97a62ceb…`), corpus del parser, traccia motore (`dfbe5a46…`), traccia HTTP (`db892c31…`), `parse_full_baseline.json`, `vocabulary_baseline.json`, compatibilità salvataggi, caratterizzazione, percorsi completi.

---

## 2. Obiettivi e perimetro

**Obiettivo**: i parametri specifici di Odessa (ID di luoghi e oggetti con ruolo speciale, regole numeriche, insiemi di verbi, punteggio e ranghi) stanno in un unico file dati, `src/data-internal/Configurazione.json`, letto da un modulo dedicato. Il codice non contiene più quei numeri.

**Nel perimetro**
- nuovo `src/data-internal/Configurazione.json` (fornito, §3.2);
- nuovo caricatore generico `src/logic/core/gameConfig.js` e modulo `src/game/odessa/config.js` che espone la configurazione di Odessa;
- sostituzione dei letterali dell'inventario (§3.3) in `engine.js`, `turnEffects/*.js`, `parser.js`, `engineRoutes.js`;
- funzione di rango unica (§3.4);
- nuovo test `tests/gameConfig.test.ts`.

**Fuori perimetro**
- spostamento di funzioni o gestori, pipeline dei verbi, registri (lotti 4a/4b);
- accessore `getGameData()` (rinviato a 4a, §6 D-L3-2);
- letterali di concetti e nomi dentro rami speciali (`PESO`, `MANOPOLA`, `GUARDIA`, `CARICARE`…), chiavi di messaggio non elencate in §3.2, stati narrativi (`ENDING_PHASE_2_WAIT`…): restano nel codice e migrano con i gestori in 4a/4b;
- generalizzazione del prerequisito `DIREZIONE_APERTA` (§6 D-L3-3);
- correzione di comportamenti anomali (vanno elencati come candidati issue).

---

## 3. Soluzione

### 3.1 Caricamento

- `src/logic/core/gameConfig.js` (generico, senza riferimenti a Odessa):
  - `loadGameConfig(filePath)`: `readFileSync` + `JSON.parse`, validazione (§3.1.1), congelamento in profondità (`deepFreeze`), restituisce l'oggetto;
  - `rankKeyFor(score, ranghi)`: §3.4.
- `src/game/odessa/config.js`:
  ```js
  // Configurazione di gioco di Odessa (src/data-internal/Configurazione.json).
  export const CONFIG = loadGameConfig(<percorso risolto da import.meta.url verso src/data-internal/Configurazione.json>);
  ```
  Caricamento all'importazione del modulo: un errore impedisce l'avvio del server con messaggio esplicito (nome del file e chiave mancante).
- **Non** si legge da `global.odessaData` e **non** si aggiunge `Configurazione` a `tableNames` di `initOdessa.js`: diversi test sostituiscono `global.odessaData` con oggetti parziali e `tests/setup.ts` carica un suo elenco di tabelle.

#### 3.1.1 Validazione (in `loadGameConfig`)

Fallisce con `Error` se: manca una chiave di §3.2; un ID o un parametro numerico non è intero positivo (eccezione: `punteggio.ranghi[].minimo` ammette 0); un insieme non è array; `versione !== 1`. Non verifica l'esistenza degli ID nei dati (lo fa il test, §4.1): il caricatore non deve dipendere dall'ordine di inizializzazione.

### 3.2 `Configurazione.json` (fornito, da copiare senza modifiche)

File in `20261020 - Lotto 3 materiale v1.1.zip` (SHA-256 `82384abef67c8a769453e235c60f77c56b3975c6547b4dd54a42e02c2821cf37`; la v1.0 `f93a783d…` è superata). Struttura e corrispondenze:

| Chiave | Valore | Uso attuale |
|---|---|---|
| `luoghi.iniziale` | 1 | posizione iniziale, `visitedPlaces` iniziale |
| `luoghi.barriera` | 59 | barriera finale (luce, guardia, vittoria, game over) |
| `luoghi.pesa` | 57 | comando su PESA/PESO |
| `luoghi.cassaforte` | 24 | ramo cassaforte |
| `luoghi.zoneAperte` | [51,52,53,55,56,58] | intercettazione, messaggio di game over |
| `luoghi.passaggioCrollato` | {32, Sud, 36} | passaggio crollato |
| `luoghi.movimentiBloccatiConTesto` | 1 Ovest, 44 Est, 49 Ovest con chiave di messaggio | movimenti bloccati con testo dedicato |
| `luoghi.macerieEsaminabili` | [11,32,36] | esame delle macerie |
| `luoghi.scavoDelegatoAInterazione` | [11,49] | `LUOGHI_SCAVA_MACERIE_DELEGATA` |
| `luoghi.scavoSenzaAttrezzo` | [32,36] | scavo senza attrezzo |
| `oggetti.torcia` / `lampada` / `fiammiferi` | 37 / 27 / 36 | fonti di luce |
| `oggetti.badile` | 4 | scavo (v1.1) |
| `oggetti.documenti` | 35 | oggetto conservato nel trasferimento alla barriera (v1.1) |
| `oggetti.vittoria` | [16,6,34] | condizione di vittoria |
| `oggetti.spostabiliAncheSeFissi` | [3,33] | SPOSTA su oggetti fissi |
| `regole.limiteInventario` | 5 | PRENDI e prerequisito `INVENTARIO_NON_PIENO` |
| `regole.fiammiferiIniziali` | 6 | stato iniziale, default al caricamento, ricarica |
| `regole.turniLuceFiammifero` | 2 | `matchTimer` |
| `regole.timerBuio` | 3 | `darknessEffect` |
| `regole.timerZonaAperta` | 2 | `openAreaTimer` |
| `regole.turniTorciaFunzionante` | 6 | `torchEffect` |
| `regole.timerGuardia` | 5 | `guardEffect`, `victoryEffect`, default al caricamento |
| `regole.avvisiGuardia` | {3,2,1} | `GUARD_WARNINGS` |
| `regole.limiteAlba` | 200 | `DAWN_TURN_LIMIT` |
| `regole.avvisiAlba` | {30,15,5} | avvisi alba |
| `regole.verbiBloccatiAlBuio` | 14 concetti | `DARK_BLOCKED_VERBS` |
| `regole.oggettiSceniciSenzaPresenza` | 4 nomi | `OGGETTI_SCENICI` |
| `punteggio.luogo` / `interazione` / `mistero` / `ferenc` | 1 / 2 / 3 / 4 | incrementi di punteggio |
| `punteggio.ranghi` | 134/100/67/34/0 con chiavi | ranghi (§3.4) |
| `lessico.verbiSenzaOggetto` | 11 concetti | `ACTION_NO_OBJECT` |

Le mappe di avvisi hanno chiavi stringa (`"3"`): la ricerca attuale `GUARD_WARNINGS[n]` con `n` numerico produce lo stesso risultato.

### 3.3 Inventario delle sostituzioni (righe su `fb4b330`)

Regola: si sostituisce il letterale **sul posto**, senza spostare funzioni né cambiare l'ordine dei controlli. Le costanti di modulo esistenti restano con lo stesso nome, valorizzate dalla configurazione (es. `const DARK_BLOCKED_VERBS = new Set(CONFIG.regole.verbiBloccatiAlBuio)`), così il diff resta minimo.

| File | Righe (indicative) | Letterale → configurazione |
|---|---|---|
| `engine.js` | 26 | `DARK_BLOCKED_VERBS` → `regole.verbiBloccatiAlBuio` |
| `engine.js` | 105, 107, 118, 131, 147, 152, 228, 230, 241, 253, 269, 274, 804, 825 | luogo 1, `Set([1])`, `totale: 1`, `matchesLeft: 6` → `luoghi.iniziale`, `punteggio.luogo` (punteggio iniziale del primo luogo), `regole.fiammiferiIniziali` |
| `engine.js` | 379, 1615, 1623, 1759 | 59 → `luoghi.barriera` |
| `engine.js` | 385, 1637, 1662 | 37 → `oggetti.torcia` |
| `engine.js` | 393 | 27 → `oggetti.lampada` |
| `engine.js` | 414, 495 | zone aperte → `luoghi.zoneAperte` |
| `engine.js` | 762–765 | default `guardTimer` 5 → `regole.timerGuardia` |
| `engine.js` | 769–771, 1080 | 36, 6 → `oggetti.fiammiferi`, `regole.fiammiferiIniziali` |
| `engine.js` | 848 | +1 per luogo → `punteggio.luogo` |
| `engine.js` | 1012, 1799 | 5 → `regole.limiteInventario` |
| `engine.js` | 1067 | +3 → `punteggio.mistero` |
| `engine.js` | 1084, 1101, 1562 | 36 → `oggetti.fiammiferi` |
| `engine.js` | 1110 | 2 → `regole.turniLuceFiammifero` |
| `engine.js` | 1270, 1300 | +2 → `punteggio.interazione` |
| `engine.js` | 1413–1431 | 32/Sud/36 → `luoghi.passaggioCrollato` |
| `engine.js` | 1438–1444 | movimenti bloccati → `luoghi.movimentiBloccatiConTesto` (ricerca per luogo+direzione; stesso ordine dei controlli) |
| `engine.js` | 1500–1505 | ranghi → `rankKeyFor` (§3.4) |
| `engine.js` | 1574 | 57 → `luoghi.pesa` |
| `engine.js` | 1680 | `LUOGHI_SCAVA_MACERIE_DELEGATA` → `luoghi.scavoDelegatoAInterazione` |
| `engine.js` | 1685, 1690 | 32/36 → `luoghi.scavoSenzaAttrezzo` |
| `engine.js` | 1727 | 24 → `luoghi.cassaforte` |
| `engine.js` | 1733 | 3/33 → `oggetti.spostabiliAncheSeFissi` |
| `engine.js` | 1764 | `OGGETTI_SCENICI` → `regole.oggettiSceniciSenzaPresenza` |
| `engine.js` | 1771 | 11/32/36 → `luoghi.macerieEsaminabili` |
| `turnEffects/darknessEffect.js` | 43, 46 | 3, 59 → `regole.timerBuio`, `luoghi.barriera` |
| `turnEffects/dawnEffect.js` | 13, 16–18 | `DAWN_TURN_LIMIT = CONFIG.regole.limiteAlba` (export mantenuto, lo importa un test); avvisi → `regole.avvisiAlba`. `GAME_MAX_TURNS_CONSUMED` resta prioritario |
| `turnEffects/gameOverEffect.js` | 49, 61, 124 | 27, 37, 59 |
| `turnEffects/guardEffect.js` | 13–17, 28, 33 | avvisi, 59, 5 |
| `turnEffects/interceptEffect.js` | 18, 36, 43 | `OPEN_AREA_LOCATIONS = CONFIG.luoghi.zoneAperte` (export mantenuto), 2 → `regole.timerZonaAperta` |
| `turnEffects/torchEffect.js` | 22, 25, 31, 52, 74 | 59, 37, 27, 6 → `regole.turniTorciaFunzionante` |
| `turnEffects/victoryEffect.js` | 26, 36, 42, 48, 63, 95, 98, 99, 102, 117, 103 | 1, 16/6/34, +4, 5, 59, +1 |
| `parser.js` | `ACTION_NO_OBJECT` | → `lessico.verbiSenzaOggetto` (stesso tipo di struttura attuale) |
| `api/engineRoutes.js` | 27–33 | `computeRankKey` → `rankKeyFor(score, CONFIG.punteggio.ranghi)` |

L'agente deve ricontrollare ogni riga sul codice reale: se un letterale dell'elenco ha un significato diverso da quello indicato, si ferma e lo segnala. Se trova altri letterali di Odessa con ruolo di parametro non elencati, li elenca nel report **senza** sostituirli.

Restano nel codice, per decisione: il controllo `concept === 'CARICARE'` al buio (riga 1557, ramo speciale); le chiavi di messaggio dentro i rami; i valori 0 e 1 con significato strutturale (es. `IDLuogo === 0` = inventario, `Attivo >= 3`).

### 3.4 Rango

`rankKeyFor(score, ranghi)` restituisce la `chiave` del primo elemento con `score >= minimo`, scorrendo `ranghi` nell'ordine del file (decrescente). Equivalenza:
- `engineRoutes.computeRankKey`: identica (cascata decrescente);
- `engine.js` 1500–1505: novice → master/investigator/explorer in cascata, poi perfectionist se ≥134; per ogni intero il risultato coincide con la cascata decrescente.

`computeRankKey` in `engineRoutes.js` viene rimossa e sostituita dalla chiamata.

### 3.5 Commenti

I commenti che citano numeri (es. "luogo 59", "limite di 5 oggetti") si aggiornano solo dove diventerebbero falsi; la citazione del valore originale è ammessa come documentazione (es. "barriera (59 in Odessa)").

---

## 4. Test

### 4.1 Nuovo `tests/gameConfig.test.ts`

1. `CONFIG` si carica, è congelato in profondità (tentativo di `push` su un array lancia).
2. `loadGameConfig` su un file temporaneo con chiave mancante, ID non intero, `versione` errata: lancia con messaggio che cita la chiave.
3. **Coerenza con i dati** (letti da `src/data-internal/*.json` direttamente, non da `global.odessaData`): ogni ID in `luoghi.*` esiste in `Luoghi.json`; ogni ID in `oggetti.*` esiste in `Oggetti.json`; ogni chiave di messaggio della configurazione esiste in `MessaggiSistema.json`; ogni concetto di `verbiBloccatiAlBuio`, `verbiSenzaOggetto` e `oggettiSceniciSenzaPresenza` esiste in `TerminiLessico.json` (campo `Concetto`); le direzioni sono colonne di `Luoghi.json` (`Nord`, `Est`, `Sud`, `Ovest`, `Su`, `Giu`). Verifica preliminare sulla bozza: tutti i riferimenti risolti.
4. `rankKeyFor`: per ogni intero da 0 a 140 coincide con la cascata attuale riscritta nel test come oracolo; soglie in ordine decrescente.
5. `DAWN_TURN_LIMIT === CONFIG.regole.limiteAlba` e `OPEN_AREA_LOCATIONS` uguale a `CONFIG.luoghi.zoneAperte`.

### 4.2 Test esistenti

Nessuna modifica. Tutti devono passare, comprese le reti di §1. Un fallimento è un errore del lotto (S) oppure un'anomalia da segnalare; mai un aggiornamento di istantanea.

---

## 5. Criteri di accettazione

| ID | Criterio |
|---|---|
| AC-1 | File toccati: `src/data-internal/Configurazione.json` (nuovo, SHA identico al fornito), `src/logic/core/gameConfig.js` (nuovo), `src/game/odessa/config.js` (nuovo), `src/logic/engine.js`, `src/logic/parser.js`, `src/logic/turnEffects/{darkness,dawn,gameOver,guard,intercept,torch,victory}Effect.js`, `src/api/engineRoutes.js`, `tests/gameConfig.test.ts` (nuovo); in Fase 2 `docs/` (copia TD) e `docs/release-notes/Unreleased.md` |
| AC-2 | `npm run lint` uscita 0; avvisi non superiori a 12 `complexity`, 7 `max-lines-per-function`, **6 `max-depth`** (v1.1, §8 E-1) |
| AC-3 | `npm run typecheck`, `npm run build`, `npm test`: tutto verde; nessun test esistente modificato (`git diff --name-only origin/release/v1.4.2 -- tests` = solo il nuovo file) |
| AC-4 | Reti di §1 identiche; punteggio massimo 138 nei percorsi completi |
| AC-5 | Ricerca residui (report): `git grep -nE "\b(59\|37\|27\|57\|24)\b" -- src/logic src/api` e ricerca dei vettori `[51, 52, 53` / `[11, 49]` / `[11, 32, 36]` / `>= 134`: ogni occorrenza residua giustificata (non è un parametro di Odessa o è fuori perimetro per §3.3) |
| AC-6 | Nessuna lettura di `Configurazione` da `global.odessaData`; `initOdessa.js` invariato |
| AC-7 | `CONFIG` congelato; nessuna scrittura sugli oggetti di configurazione |

---

## 6. Decisioni (approvate il 2026-10-19)

| ID | Decisione | Motivo |
|---|---|---|
| D-L3-1 | Configurazione letta da file all'importazione del modulo, non da `global.odessaData` | Test con dati parziali; indipendenza dall'ordine di inizializzazione |
| D-L3-2 | Accessore `getGameData()` rinviato al lotto 4a | Lavoro strutturale, tocca molti file (`global.odessaData` in 7 file); nel lotto 3 aumenterebbe il diff senza ridurre il rischio |
| D-L3-3 | `DIREZIONE_APERTA` resta basato sui soli toggle; la generalizzazione su `getDirezioniLuogo` va annotata per 4b | Non contiene letterali; cambiarlo è una modifica semantica, equivalente oggi solo per 44 Est |
| D-L3-4 | `GAME_MAX_TURNS_CONSUMED` resta come override del limite dell'alba | Usato da test e tracce |
| D-L3-5 | Export `DAWN_TURN_LIMIT` e `OPEN_AREA_LOCATIONS` mantenuti come alias della configurazione | Importati da test e da `gameOverEffect.js` |
| D-L3-6 | Moduli in `src/logic/core/` (generico) e `src/game/odessa/` (specifico), come da TD 0 | Anticipa la struttura del lotto 4a senza spostare codice esistente |

---

## 7. Prova manuale (Mauro, `localhost:3001`)

1. Nuova partita: luogo iniziale, punteggio 1, `INVENTARIO` invariati rispetto alla v1.4.1.
2. Buio: in un luogo senza luce, `PRENDI` è bloccato; `ACCENDI FIAMMIFERO` mostra il messaggio consueto; dopo 2 turni il fiammifero si spegne.
3. `PUNTEGGIO`: testo e rango identici.
4. Statistiche (`/api/engine/stats` o pannello): rango coerente con `PUNTEGGIO`.
5. Opzionale: salvataggio e caricamento di una partita salvata con la v1.4.1.

---

## 8. Emendamenti v1.1 (2026-10-20, dopo la Fase 1A)

Prevalgono sulle sezioni precedenti in caso di contrasto.

| ID | Emendamento | Motivo |
|---|---|---|
| E-1 | AC-2: soglia `max-depth` portata a 6 | Verificato su `node_modules/eslint/lib/rules/max-depth.js` (ESLint 9.39.1): `IfStatement` incrementa solo se il genitore non è un `IfStatement`, ma `IfStatement:exit` decrementa sempre. Ogni catena `else if` sottrae quindi 1 per ramo al contatore della funzione. La cascata dei ranghi rimossa (§3.4) mascherava tre profondità reali già a 5 (pesa, scavo senza attrezzo, scavo con chiave). Nessun cambio di struttura nel lotto 3; la riduzione spetta al lotto 4a (estrazione dei gestori) |
| E-2 | Validazione delle chiavi annidate: `loadGameConfig(filePath, { required })`, con `required` = elenco di percorsi puntati (es. `'luoghi.barriera'`) definito in `src/game/odessa/config.js` e comprendente **tutte** le chiavi di §3.2. Il caricatore resta generico: verifica la presenza di ogni percorso e cita il percorso mancante nel messaggio. Test aggiuntivo in §4.1 punto 2: chiave annidata mancante | TD §3.1.1 chiedeva la verifica di ogni chiave; la Fase 1A verificava solo il primo livello |
| E-3 | `movimentiBloccatiConTesto`: ricerca per `luogo` e `direzione` (`find`), non destrutturazione per posizione | Richiesto da §3.3; la dipendenza dall'ordine del file renderebbe fragile la configurazione. Le tre coppie sono disgiunte: equivalenza garantita |
| E-4 | `engine.js` (scavo): `=== CONFIG.luoghi.scavoSenzaAttrezzo[1]` sostituito da `=== CONFIG.luoghi.passaggioCrollato.destinazione`, con commento: "a 36, sotto il passaggio crollato, scavando non si trova un passaggio a nord" | Niente indici posizionali; il legame con il passaggio crollato è quello del gioco |
| E-5 | Letterali aggiunti all'inventario: `engine.js` fallback `newState.currentLocationId \|\| 1` e `newState.turn.previous.location \|\| 1` (≈ righe 793, 798) → `CONFIG.luoghi.iniziale`; `engine.js` `o.ID === 4` (badile, ×2, scavo) → `CONFIG.oggetti.badile`; `victoryEffect.js` `oggetto.ID === 35` (`teleportToBarrier`) → `CONFIG.oggetti.documenti` | Stesso significato dei valori già configurati; badile e documenti sfuggiti all'inventario v1.0 e al report |
| E-6 | Punteggio della sequenza della cassaforte: resta `CONFIG.punteggio.interazione` (+2) con deduplicazione in `misteriRisolti` invariata; aggiungere un commento che segnala l'anomalia. Nessuna issue: non è osservabile dal giocatore; da riconsiderare nel lotto 4b (interazioni) | Comportamento invariato |
