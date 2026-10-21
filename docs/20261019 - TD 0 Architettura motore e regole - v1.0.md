# TD 0 — Architettura di destinazione: motore e regole del gioco

| Campo | Valore |
|---|---|
| Documento | Specifica tecnica di architettura (solo documento, nessuna implementazione) |
| Versione | v1.0 — approvata da Mauro Giorgi il 2026-10-19 |
| Data | 2026-10-19 |
| Issue | nuova issue "Predisposizione al framework" (milestone v1.4.2); #63 per i lotti 4a, 4b e 5 |
| Baseline | `main` @ `85edb5e` (v1.4.1) |
| Si applica a | lotti 3, 4a, 4b e 5 della v1.4.2 |
| Modello consigliato | nessuno (documento); il modello di ogni lotto è indicato nella sua TD |

## 1. Valutazione del rischio di regressione

**Questo documento: nullo**, perché non modifica codice. Fissa però le scelte da cui dipende il rischio dei lotti che lo applicano.

| Lotto | Rischio | Origine del rischio | Contenimento previsto da questa TD |
|---|---|---|---|
| 3 — configurazione | Medio | Un ID trascritto male in configurazione cambia il comportamento solo nel caso che lo usa | Configurazione validata da test di schema e di coerenza con i dati (§5.3); traccia dello stato (lotto 0) |
| 4a — gestori di verbo | Alto | La precedenza dei controlli in `executeCommandLegacy` decide le risposte; un riordino cambia l'esito di comandi validi | Precedenza fissata in §4.4 come tabella da rispettare; nessun riordino ammesso nella v1.4.2 |
| 4b — interazioni | Alto | Ordine delle mutazioni (punteggio, misteri, toggle, sequenze) | Registri che chiamano le stesse funzioni nello stesso ordine (§4.5) |
| 5 — effetti di turno, route | Medio | Ordine degli effetti; contratto HTTP | Ordine di `TURN_EFFECTS` invariato (§4.6); traccia HTTP (lotto 0) |

## 2. Obiettivo e perimetro

**Obiettivo**: rendere il codice del motore separabile dalle regole di Missione Odessa, senza cambiare il comportamento. È la *predisposizione* al framework, non il framework.

Nella v1.4.2:
1. le regole specifiche di Odessa stanno in un modulo di gioco riconoscibile, non dentro la closure del motore;
2. gli ID di luoghi e oggetti e i letterali di gioco stanno in un file di configurazione;
3. il motore riceve il gioco come parametro, con Odessa come valore predefinito;
4. l'accesso ai dati statici passa da un solo punto.

**Fuori perimetro** (non va anticipato nei lotti):
- un secondo gioco, il caricamento di più giochi nello stesso processo, la scelta del gioco via configurazione o URL;
- lo spostamento dei file JSON fuori da `src/data-internal/`;
- la separazione dei messaggi di sistema in messaggi del motore e messaggi del gioco (le chiavi `engine.*` restano dove sono);
- la conversione a TypeScript, lo stato immutabile, la riscrittura del parser;
- il frontend (`web/`), compreso il massimo `138` scritto in `odessa_main.js`;
- qualunque modifica a testi, dati di gioco, formato di salvataggio o contratto HTTP.

## 3. Stato attuale (verificato su `85edb5e`)

### 3.1 Struttura

| Componente | Forma attuale | Note |
|---|---|---|
| `src/logic/engine.js` (2.007 righe) | `createEngine()` è una closure di 1.474 righe con stato e funzioni; in fondo un'istanza di default e 20 esportazioni di modulo che la delegano | L'API di modulo è usata da `server.js`, dalle route e da 34 file di test |
| Esecuzione di un comando | `executeCommand` → `prepareTurnContext` → `runPreExecutionChecks` → `executeCommandLegacy` → `applyTurnEffects` | `executeCommandLegacy`: complessità 166, 398 righe |
| Interazioni | `cercaEseguiInterazione` legge `global.odessaData.Interazioni`; prerequisiti ed effetti sono catene di `if` su `tipo` (`verificaPrerequisiti`, `applicaEffetti`) | Tipi ammessi e campi obbligatori stanno in `interactionSchema.js` (`PREREQUISITE_TYPES`, `PREREQUISITE_REQUIRED_FIELDS`, `EFFECT_TYPES`), le implementazioni in `engine.js`: tre elenchi da tenere allineati a mano |
| Effetti di turno | `src/logic/turnEffects/`: registro ordinato `TURN_EFFECTS` di 8 funzioni `(gameState, result, parseResult)` | È già modulare; ogni effetto è regola di Odessa |
| Parser | `parser.js`: vocabolario globale da `global.odessaData`; regole lessicali scritte nel codice | Il set `ACTION_NO_OBJECT` e il caso CARICA + nome sono regole del lessico di Odessa |
| Dati | `initOdessa()` carica 15 file JSON in `global.odessaData`; letto in 10 file | Invariante di `AGENTS.md`: i dati statici non si modificano per sessione |

### 3.2 Catalogo delle regole e dei letterali di Odessa nel codice

Rilevato con ricerca testuale; è l'elenco minimo che il lotto 3 deve spostare. Il lotto 3 lo completa con una ricerca propria e documenta ogni voce aggiunta.

| Ruolo | Valore | Dove oggi |
|---|---|---|
| Luogo iniziale | 1 | `engine.js` (stato iniziale, `visitedPlaces`), `victoryEffect.js` (atrio) |
| Barriera (fine gioco) | 59 | `engine.js` (luce d'ufficio, PARLA, ATTACCA, esamina guardia), `torchEffect.js`, `darknessEffect.js`, `gameOverEffect.js`, `guardEffect.js` |
| Zone aperte | 51, 52, 53, 55, 56, 58 | due array in `engine.js` + `OPEN_AREA_LOCATIONS` in `interceptEffect.js` |
| Pesa | 57 | `engine.js` (CARICA peso) |
| Cassaforte e manopola | 24 | `engine.js` (RUOTA MANOPOLA) |
| Movimenti speciali | 1 Ovest, 44 Est, 49 Ovest, 32 Sud (crollo) → 36 | `engine.js`, ramo `NAVIGATION` |
| Luoghi con macerie | 11, 32, 36 (esamina); 11, 49 (scava delegato a interazione); 32, 36 (scava a mani nude) | `engine.js`, ramo `ACTION` |
| Oggetti di luce | torcia 37, lampada 27, fiammiferi 36 | `engine.js`, `torchEffect.js`, `gameOverEffect.js` |
| Oggetti della vittoria | fascicolo 16, lista 6, dossier 34 | `victoryEffect.js` |
| Oggetti trasportabili anche se `Attivo < 3` | 3, 33 | `engine.js` (SPOSTA) |
| Limite di inventario | 5 | `engine.js` (PRENDI e prerequisito) |
| Fiammiferi iniziali | 6 | stato iniziale |
| Alba | 200 turni, avvisi a 30/15/5 | `dawnEffect.js` |
| Guardia | avvisi e arresto | `guardEffect.js` |
| Ranghi | 34, 67, 100, 134 | `engine.js` (PUNTI) **e** `engineRoutes.js` (`computeRankKey`): duplicati |
| Verbi bloccati al buio | 14 concetti + CARICARE | `DARK_BLOCKED_VERBS` in `engine.js` |
| Oggetti scenici senza presenza | FILO_SPINATO, ARREDAMENTO, ELEVATORE, PARETE | `engine.js` (ESAMINA) |
| Nomi trattati come concetto | PESO, PESA, WEIGHT, SCALE, MANOPOLA, GUARDIA, LUOGO, DESTRA, SINISTRA, LUCE | `engine.js` |
| Verbi senza oggetto | 11 concetti | `ACTION_NO_OBJECT` in `parser.js` |
| Lingue | 1 = IT, 2 = EN | `parser.js`, `routes.js`, `engineRoutes.js` (non è regola di gioco: resta nel motore) |

## 4. Architettura di destinazione

### 4.1 Struttura dei moduli

```
src/logic/
  engine.js              facciata: createEngine(game = odessaGame) e le 20 esportazioni attuali, invariate
  core/
    context.js           contesto passato a gestori, prerequisiti, effetti
    dispatch.js          esecuzione ordinata dei gestori di verbo
    interactions.js      ricerca ed esecuzione delle interazioni con registri per tipo
    state.js             stato iniziale generico, snapshot, setGameState, default dei salvataggi
    gameData.js          unico punto di accesso ai dati statici
    handlers/            gestori generici: movimento, sistema, prendi, posa, esamina, apri/chiudi, sposta
  parser.js              invariato come API; regole di lessico del gioco lette dalla definizione
  turnEffects/           invariato come struttura; l'elenco ordinato viene dalla definizione del gioco
src/game/odessa/
  index.js               definizione del gioco (odessaGame)
  handlers/              gestori di Odessa (luce, scava, ruota, pesa, guardia, verbi "di colore", movimenti speciali)
  rules.js               funzioni di regola richieste dal motore (luce attiva, zona pericolosa, ranghi)
src/data-internal/
  Configurazione.json    ruoli e letterali di §3.2 (nuovo file)
```

I nomi dei file sono indicativi: la TD di ogni lotto li fissa. Sono vincolanti la separazione `core/` ↔ `game/odessa/` e la direzione delle dipendenze (§4.7).

### 4.2 Definizione del gioco

Un oggetto, costruito una volta al caricamento del modulo:

| Campo | Contenuto |
|---|---|
| `id` | `'odessa'` |
| `config` | contenuto di `Configurazione.json`, validato |
| `verbHandlers` | elenco **ordinato** dei gestori (generici e di Odessa), §4.4 |
| `prerequisiteTypes` / `effectTypes` | registri tipo → funzione, §4.5 |
| `turnEffects` | elenco ordinato di §4.6 |
| `rules` | funzioni di regola invocate dal motore: `hasActiveLight(ctx)`, `isDangerZone(ctx)`, `rankKey(score)`, stato iniziale aggiuntivo del gioco |
| `lexicon` | regole di lessico del gioco usate dal parser (verbi senza oggetto, caso CARICA + nome) |

`createEngine()` senza argomenti usa `odessaGame`: nessun chiamante cambia.

### 4.3 Contesto

Le funzioni oggi interne alla closure accedono a `gameState` e agli helper per chiusura. Dopo il refactor ricevono un contesto esplicito:

```
ctx = { state, game, data, lingua, msg(key, params), helpers }
```

- `state` è lo **stesso oggetto mutabile** di oggi (nessun cambio di semantica, nessuna copia);
- `helpers` espone le funzioni oggi interne che servono ai gestori (inventario, oggetto nel luogo, descrizione del luogo, consumo del fiammifero…), senza duplicarle;
- `msg` è `getSystemMessage` con la lingua corrente già applicata.

### 4.4 Gestori di verbo e precedenza

Un gestore è `{ id, match(cmd, ctx), run(cmd, ctx) }`. `dispatch` scorre l'elenco e restituisce il risultato del primo gestore il cui `run` produce un risultato; un `run` può restituire `null` per passare al successivo, come fanno oggi i rami che "delegano" all'interazione.

**La precedenza attuale è un requisito.** Il lotto 4a la trascrive dal codice in una tabella nella propria TD e la preserva. Ordine rilevato in `executeCommandLegacy` per il ramo `ACTION` (da confermare riga per riga nella TD del lotto):

1. buio: verbi bloccati e CARICARE senza luce → "troppo buio";
2. ACCENDERE con fiammiferi senza nome;
3. CARICARE con peso o pesa;
4. SPEGNERE, SCAPPARE, SORRIDERE, DORMIRE/SEDERSI, PARLARE, ATTACCARE alla barriera;
5. ACCENDERE luce/torcia/lampada;
6. SCAVARE;
7. interazioni (`cercaEseguiInterazione`) per verbo + nome;
8. RUOTARE destra/sinistra, RUOTARE manopola;
9. SPOSTARE;
10. ESAMINARE/GUARDARE (con i casi speciali luogo, guardia, oggetti scenici, macerie);
11. APRIRE/CHIUDERE;
12. PRENDERE;
13. POSARE/LASCIARE;
14. risposte generiche (senza nome, oggetto assente, verbo non applicabile).

`NAVIGATION` e `SYSTEM` diventano un gestore ciascuno, con i casi speciali di Odessa (movimenti, ranghi) delegati a `game`.

Un gestore è **generico** se non contiene ID, nomi di oggetti o concetti specifici di Odessa; altrimenti sta in `src/game/odessa/handlers/`. I casi misti (per esempio ESAMINA, generico con eccezioni di Odessa) si risolvono con un gestore di Odessa che precede quello generico e restituisce `null` quando non si applica.

### 4.5 Interazioni

- `verificaPrerequisiti` e `applicaEffetti` diventano registri `tipo → funzione` in `game.prerequisiteTypes` e `game.effectTypes`. I tipi attuali sono tutti registrati da Odessa; il motore non ne definisce.
- `interactionSchema.js` resta invariato e resta la fonte degli elenchi (`PREREQUISITE_TYPES`, `PREREQUISITE_REQUIRED_FIELDS`, `EFFECT_TYPES`). Un test verifica che le chiavi dei registri coincidano con quegli elenchi, in entrambe le direzioni. Così non serve che lo schema importi il gioco (§4.7).
- Comportamento invariato per i tipi sconosciuti: oggi un prerequisito sconosciuto fallisce in modo chiuso con un avviso unico (`warnUnknownTypeOnce`); va mantenuto.
- `cercaEseguiInterazione` resta nel motore (la ricerca per verbo, nome, luogo e lingua è generica); i suoi casi speciali di Odessa (per esempio la cassaforte già aperta) diventano gestori o regole del gioco.
- **Ordine delle mutazioni invariato**: punteggio dell'interazione, effetti, misteri, sequenze, nello stesso ordine e con gli stessi dati (`statoPreToggle` compreso).

### 4.6 Effetti di turno

- `TURN_EFFECTS` passa in `game.turnEffects`, stesso contenuto e **stesso ordine** (match, torch, darkness, intercept, dawn, guard, gameOver, victory). I commenti sull'ordine in `turnEffects/index.js` restano la regola.
- La firma `(gameState, result, parseResult)` resta; gli ID letterali dentro gli effetti si leggono dalla configurazione.
- I file degli effetti possono restare in `src/logic/turnEffects/` nella v1.4.2: spostarli in `src/game/odessa/` è ammesso solo nel lotto 5 e solo se la TD lo prevede.

### 4.7 Dipendenze

- `core/` non importa da `src/game/`.
- `src/game/odessa/` importa da `core/` (contesto, helper) e dai messaggi.
- `engine.js` (facciata) è l'unico modulo che importa entrambi.
- Il lotto 4a aggiunge una regola ESLint `no-restricted-imports` su `src/logic/core/**` che vieta `src/game/**`.

### 4.8 Dati statici

- `core/gameData.js` espone `getGameData()`: unico punto che legge `global.odessaData`. Il global resta come archivio nella v1.4.2 (lo usano `tests/setup.ts` e altri 25 file di test).
- I 10 file che oggi leggono il global passano all'accessor nei lotti che li toccano; il lotto 5 verifica che non restino letture dirette fuori da `gameData.js` e `initOdessa.js` (test con ricerca testuale).

### 4.9 Configurazione

- File `src/data-internal/Configurazione.json`, caricato da `initOdessa()` come gli altri.
- Contiene solo ruoli e letterali (§3.2), con nomi di ruolo in inglese o italiano coerenti con i dati (da fissare nella TD del lotto 3).
- Validazione al caricamento e test dedicato: struttura, tipi, ID esistenti in `Luoghi.json` e `Oggetti.json`, nessun ruolo mancante.
- Il massimo del punteggio (138) resta calcolato dai dati come oggi (`scoring.max.test.ts`); i ranghi vengono dalla configurazione e `computeRankKey` in `engineRoutes.js` usa la stessa regola del motore (fine della duplicazione).

## 5. Vincoli validi per tutti i lotti

1. API di `engine.js` invariata: `createEngine` e le 20 esportazioni con la stessa firma e semantica.
2. Formato di snapshot e salvataggio invariato (chiavi, tipi, valori); compatibilità dei salvataggi v1.4.0 e v1.4.1.
3. Contratto HTTP invariato (traccia HTTP del lotto 0).
4. Nessuna modifica a `MessaggiSistema.json`, `Interazioni.json` e agli altri JSON di gioco, salvo l'aggiunta di `Configurazione.json`.
5. Ordini invariati: precedenza dei gestori (§4.4), mutazioni delle interazioni (§4.5), effetti di turno (§4.6).
6. Criteri di comportamento invariato del piano v1.4.2: istantanea delle risposte, corpus del parser, traccia dello stato e traccia HTTP identici; percorsi completi e punteggio 138.
7. Nessuna correzione di comportamento "di passaggio": un difetto trovato durante il refactor si registra come issue e si lascia invariato.

## 6. Corrispondenza con i lotti

| Lotto | Applica | Non deve ancora fare |
|---|---|---|
| 3 | §4.8 (accessor), §4.9 (configurazione), sostituzione dei letterali **sul posto**, `DIREZIONE_APERTA` generalizzato | spostare funzioni fuori dalla closure |
| 4a | §4.1 (`core/`, `game/odessa/`), §4.2, §4.3, §4.4, §4.7 | registri delle interazioni |
| 4b | §4.5, `setGameState` e stato iniziale in `core/state.js`, `executeCommand` | effetti di turno |
| 5 | §4.6, verifica di §4.8, `errorHandler`, route | — |

## 7. Decisioni da approvare

| # | Decisione | Proposta | Alternativa scartata e motivo |
|---|---|---|---|
| A1 | Collocazione del codice di gioco | `src/game/odessa/` | `src/logic/odessa/`: confonde motore e gioco nella stessa cartella |
| A2 | Forma della configurazione | JSON in `src/data-internal/`, validato | modulo JS: non è dato, non è validabile con lo stesso schema degli altri JSON |
| A3 | Firma del motore | `createEngine(game = odessaGame)` | iniezione per sessione in `sessionContext.js`: superflua con un solo gioco |
| A4 | Dispatch dei verbi | elenco ordinato con `null` per passare oltre | mappa concetto → gestore: perde la precedenza, che oggi decide le risposte |
| A5 | `global.odessaData` | resta, letto solo da `gameData.js` | rimozione: tocca `tests/setup.ts` e molti test senza beneficio nella v1.4.2 |
| A6 | Messaggi di sistema | invariati | separazione motore/gioco: cambia chiavi e test di lingua; rinviata |
| A7 | Effetti di turno | restano in `src/logic/turnEffects/`, elenco dalla definizione del gioco | spostamento in `game/odessa/` nel lotto 3 o 4: aumenta il diff senza ridurre il rischio |
