# TD Lotto 4b — Motore: interazioni, registri di prerequisiti ed effetti (v1.4.2)

| Campo | Valore |
|---|---|
| Issue | #63 (`Refs #63`), #123 (`Refs #123`) |
| Baseline | `release/v1.4.2` @ `ce547fd` |
| Riferimento | TD 0 v1.0 §4.5, §4.7; TD lotto 4a v1.0 (contesto, `helpers`); TD lotto 3 v1.1 E-6, D-L3-3 |
| Stato | v1.0, approvata il 2026-10-20 |
| Modello | Fase 1A-1 (P1–P2): **Sonnet 5.5, effort medio**. Fase 1A-2 (P3–P4): **Opus 5.5, effort medio** (alto se una rete fallisce due volte di seguito). Fase 1B: **Sonnet 5.5, effort medio**. Fase 2: **Sonnet 5.5, effort basso** |

---

## 1. Valutazione del rischio di regressione

**Alto.** Le interazioni producono tutti i punti di interazione e di mistero (138 in tutto) e quasi tutte le modifiche allo stato del gioco; l'ordine delle modifiche è comportamento.

| Rischio | Mitigazione |
|---|---|
| Ordine delle mutazioni cambiato (punteggio, registrazione, effetti, misteri, messaggi aggiuntivi) | Sequenze vincolanti in §4; istantanea delle risposte e traccia del motore (che registra stato e punteggio a ogni passo) |
| `statoPreToggle` calcolato in un momento diverso: punti mistero dati o tolti all'apertura della porta 44 e del sedile 42 | Regola R3 (§3.3); la traccia del motore contiene entrambe le aperture |
| Tipo sconosciuto trattato diversamente (oggi: prerequisito fallito con un avviso; effetto ignorato con un avviso) | Comportamento trascritto in §3.2; test esistente `interaction-prerequisites` (un solo avviso) |
| Sequenza della cassaforte: punteggio, reset e messaggi | Trascrizione alla lettera in §3.4; percorsi completi e caratterizzazione |
| Interruzione per limiti d'uso | Punti di ripristino a ogni passaggio, come nel lotto 4a |

Reti che devono restare **identiche** senza aggiornamenti: istantanea risposte (`97a62ceb…`), corpus del parser, `parse_full_baseline.json` (`e9ccc844…`), `vocabulary_baseline.json` (`24a962b1…`), traccia motore (`dfbe5a46…`), traccia HTTP (`db892c31…`), salvataggi, caratterizzazione, percorsi completi, 138 punti, `architecture.test.ts` (aggiornato solo come da §5.1).

---

## 2. Obiettivi e perimetro

**Nel perimetro** (righe su `ce547fd`)
- `verificaPrerequisiti` (932–980) → ciclo generico in `core/interactions.js` + registro `game.prerequisiteTypes` di Odessa.
- `applicaEffetti` (1077–1142) → ciclo generico + registro `game.effectTypes` di Odessa; `assegnaPunteggioMistero` (985–1025) diventa regola di Odessa.
- `cercaEseguiInterazione` (1145–1302) → `core/interactions.js`, scomposta; i casi specifici di Odessa (verbi con risposta di apertura/chiusura, punteggio e messaggio della sequenza della cassaforte) diventano regole di Odessa.
- `warnUnknownTypeOnce` (19–26) → `core/interactions.js`, stesso testo e stessa memoria per processo.
- Test di coerenza registri ↔ `interactionSchema.js`.

**Fuori perimetro**
- `getDirezioniLuogo` (638–696, legge le interazioni per trovare la destinazione dei toggle), `setGameState`, `resetGameState`, `prepareTurnContext`, `applyTurnEffects`, `turnEffects/` (lotto 5).
- `interactionSchema.js` e `Interazioni.json`: invariati.
- Correzione dell'anomalia E-6 (punteggio della sequenza registrato tra i misteri): resta, trascritta (D-4b-4).
- Generalizzazione di `DIREZIONE_APERTA` (D-4b-5).

---

## 3. Soluzione

### 3.1 Moduli

```
src/logic/core/
  interactions.js        warnUnknownTypeOnce, verificaPrerequisiti, applicaEffetti,
                         cercaEseguiInterazione (scomposta), eseguiSequenza, assegnaPunteggioInterazione
src/game/odessa/
  interactions/
    prerequisites.js     registro: tipo → (req, ctx) => boolean (true = soddisfatto)
    effects.js           registro: tipo → (effetto, ctx, env) => info | undefined
  scoring.js             mysteryIdFor(effetto, info) + awardMystery(effetto, info, ctx)
  rules.js               + toggleResponseVerbs, sequence (hook della sequenza)
  index.js               + prerequisiteTypes, effectTypes
```

`core/interactions.js` non importa da `src/game/**` (regola ESLint del lotto 4a). Le funzioni ricevono il contesto del lotto 4a (`state`, `game`, `msg`, `helpers`).

**Helper aggiunti a `helpers`** (funzioni esistenti del motore, non duplicate): `getNestedProperty`, `setNestedProperty`, `consumaFiammifero`. `helpers.cercaEseguiInterazione(verb, noun)` mantiene la firma attuale: nel motore diventa `(verb, noun) => cercaEseguiInterazione(verb, noun, createContext(gameState, game, helpers))`, così i gestori del lotto 4a non cambiano.

### 3.2 Prerequisiti

```js
export function verificaPrerequisiti(prerequisiti, ctx) {
  if (!prerequisiti || prerequisiti.length === 0) return { ok: true };
  for (const req of prerequisiti) {
    const check = ctx.game.prerequisiteTypes[req.tipo];
    if (!check) {
      warnUnknownTypeOnce('prerequisito', req.tipo);
      return { ok: false, prerequisito: req };
    }
    if (!check(req, ctx)) return { ok: false, prerequisito: req };
  }
  return { ok: true };
}
```

- Registro di Odessa con gli 8 tipi di `PREREQUISITE_TYPES`; ogni funzione è il corpo attuale (936–972) trascritto alla lettera con la condizione **invertita** in modo esplicito (oggi `if (!oggetto) return false` → `return !!oggetto`; `FLAG_FALSE`: `return !getNestedProperty(...)`).
- Equivalenza del tipo sconosciuto: oggi un tipo assente da `PREREQUISITE_TYPES` fallisce con avviso; un tipo presente nello schema ma non gestito non esiste. Con il test di coerenza (§5.1) "assente dal registro" ⇔ "assente dallo schema".
- `OGGETTO_IN_LUOGO` e `OGGETTO_VISIBILE` hanno oggi la stessa condizione: restano due voci distinte, identiche.

### 3.3 Effetti

```js
export function applicaEffetti(effetti, luogoCorrente, { skipMisteri = false } = {}, ctx) {
  const extraMessages = [];
  for (const effetto of effetti) {
    const apply = ctx.game.effectTypes[effetto.tipo];
    let info;
    if (apply) info = apply(effetto, ctx, { luogoCorrente, extraMessages });
    else warnUnknownTypeOnce('effetto', effetto.tipo);
    if (!skipMisteri) ctx.game.rules.awardMystery(effetto, info ?? {}, ctx);
  }
  return extraMessages;
}
```

- **R1 — alla lettera**: ogni funzione del registro è il ramo attuale (1082–1130) con `gameState` → `ctx.state`, `CONFIG`/`game.config` → `ctx.game.config`, helper → `ctx.helpers.*`, `getSystemMessage(k, lingua)` → `ctx.msg(k)`.
- **R2 — tipo sconosciuto**: come oggi, avviso e **poi** chiamata della regola dei misteri (che per un tipo sconosciuto non assegna nulla).
- **R3 — `statoPreToggle`**: l'effetto `TOGGLE_DIREZIONE` restituisce `{ statoPreToggle }` letto **dopo** l'eventuale inizializzazione a `false` e **prima** dell'inversione (righe 1107–1112). Gli altri effetti restituiscono `undefined`; la regola dei misteri riceve `{}` e quindi `statoPreToggle === undefined`, come oggi.
- **`SEQUENZA`**: voce del registro **vuota** (`() => undefined`) con il commento attuale (1116–1119). Rimuoverla farebbe scattare l'avviso: non è codice morto, è un tipo gestito altrove (§3.4).
- **`CONSUMA_FIAMMIFERO`**: `if (ctx.helpers.consumaFiammifero()) env.extraMessages.push(ctx.msg('engine.matches.finished'))`.
- **Misteri** (`scoring.js`): `mysteryIdFor(effetto, info)` = logica di 988–1018 (VISIBILITA, SBLOCCA_DIREZIONE, TOGGLE_DIREZIONE con `info.statoPreToggle === false`); `awardMystery` = 1021–1024 con `ctx.game.config.punteggio.mistero`. `rules.awardMystery` lo riesporta.

### 3.4 Ricerca ed esecuzione delle interazioni

`cercaEseguiInterazione(verb, noun, ctx)` scomposta in funzioni nello **stesso ordine** di oggi:

| Passo | Righe | Funzione | Note |
|---|---|---|---|
| 1 | 1146–1152 | ciclo sulle interazioni della lingua corrente, confronto di verbo e oggetto | `getGameData()` letto a ogni chiamata |
| 2 | 1155–1157 | luogo diverso → `continue` | |
| 3 | 1160–1163 | non ripetibile già eseguita → risposta "già eseguita" | |
| 4 | 1166–1175 | prerequisiti: con `risposta` → risposta; senza → `continue` | |
| 5 | 1179–1188 | risposta di apertura/chiusura | condizione `ctx.game.rules.toggleResponseVerbs.has(interazione.trigger.verbo)` (Odessa: `PREMERE`, `RUOTARE`) |
| 6 | 1191–1249 | `eseguiSequenza(interazione, effettoSequenza, risposta, ctx)` | §3.4.1 |
| 7 | 1255–1260 | `assegnaPunteggioInterazione(interazione, ctx)` → `punteggioSkip` | generica: semantica del campo `punteggio` dello schema; `ctx.game.config.punteggio.interazione` |
| 8 | 1263–1265 | registrazione come eseguita | |
| 9 | 1268–1271 | `applicaEffetti` + messaggi aggiuntivi | |
| 10 | 1274–1297 | `buildInteractionResult` | ordine delle chiavi: `accepted`, `resultType`, `effects`, poi `ended`, `victory`, poi `message` (spread attuale) |
| — | 1301 | `return null` | unico punto senza risultato, nessuna mutazione prima (requisito dei gestori del lotto 4a) |

#### 3.4.1 Sequenze

Meccanismo generico (`effetto SEQUENZA` con `pattern`, `direzione`, `effetti_completamento`, risposte `risposta_step` / `risposta_errore` / `risposta_completa`), trascritto alla lettera. Due punti diventano regole di Odessa in `rules.sequence`:

| Oggi | Regola |
|---|---|
| sequenza già completata → `engine.safeAlreadyOpen` (1209) | `rules.sequence.alreadyCompletedMessageKey = 'engine.safeAlreadyOpen'` |
| completamento: `misteriRisolti` `'sequenza_cassaforte'` + `punteggio.interazione` (1226–1229) | `rules.sequence.onCompleted(seqKey, ctx)`, stesso codice, stessa chiave fissa (anomalia E-6 trascritta) |

Ordine al completamento invariato: `completata = true` → `onCompleted` → `applicaEffetti(effetti_completamento, luogo)` (con i misteri, senza `skipMisteri`) → risposta + descrizione del luogo.

### 3.5 Definizione del gioco

`odessaGame` aggiunge `prerequisiteTypes`, `effectTypes`; `rules` aggiunge `awardMystery`, `toggleResponseVerbs` (`Set`), `sequence`.

---

## 4. Ordini vincolanti

**Interazione eseguita** (senza sequenza): +2 interazione (se dovuto) → registrazione in `interazioniEseguite` → per ogni effetto, nell'ordine dei dati: effetto, poi mistero → messaggi aggiuntivi → risultato (flag di vittoria, descrizione se ci sono effetti `VISIBILITA`).

**Sequenza**: inizializzazione → già completata? → passo atteso → (corretto) avanzamento → completata? → `onCompleted` → effetti di completamento con misteri → risposta + descrizione; (errato) reset e `risposta_errore`. Nessun +2 di interazione e nessuna registrazione per le interazioni con sequenza, come oggi (ritornano prima del passo 7).

---

## 5. Test

### 5.1 Nuovi test

`tests/interactions.registry.test.ts`:
1. Chiavi di `odessaGame.prerequisiteTypes` = `PREREQUISITE_TYPES`, in entrambe le direzioni.
2. Chiavi di `odessaGame.effectTypes` = `EFFECT_TYPES`, in entrambe le direzioni.
3. Ogni voce è una funzione.
4. `rules.toggleResponseVerbs` contiene il verbo di ogni interazione dei dati che ha un effetto `TOGGLE_DIREZIONE` (oggi `premi_pulsante_44`, `ruota_sedile_42`): impedisce che un dato nuovo resti senza risposta di apertura/chiusura.

`tests/architecture.test.ts`: aggiunta di `src/logic/core/interactions.js` alla verifica delle dipendenze (se l'elenco dei file non è già dinamico). Nessun'altra modifica.

### 5.2 Test esistenti

Nessuna modifica. In particolare `tests/unit/interaction-prerequisites.test.ts` (un solo avviso per tipo sconosciuto, testo con il nome del tipo) e `tests/unit/interaction-effects.test.ts` devono passare invariati: l'avviso mantiene il prefisso `[engine]` e il testo attuale.

---

## 6. Criteri di accettazione

| ID | Criterio |
|---|---|
| AC-1 | File toccati: `src/logic/engine.js`, nuovi file di §3.1, `src/game/odessa/rules.js`, `src/game/odessa/index.js`, `tests/interactions.registry.test.ts`, `tests/architecture.test.ts` (solo §5.1); in Fase 2 `docs/` e `Unreleased.md` |
| AC-2 | Reti di §1 identiche; 138 punti |
| AC-3 | `npm run lint` uscita 0; nessun avviso nei file nuovi; `verificaPrerequisiti`, `applicaEffetti`, `cercaEseguiInterazione` non compaiono più tra gli avvisi; totali non superiori a 11/6/3 (atteso un calo) |
| AC-4 | `npm run typecheck`, `npm run build`, `npm test` verdi; nessun test esistente modificato (salvo §5.1) |
| AC-5 | `git grep -nE "PREMERE\|RUOTARE\|sequenza_cassaforte\|safeAlreadyOpen" -- src/logic` vuoto |
| AC-6 | `git grep -n "warnUnknownTypeOnce" -- src/logic/engine.js` vuoto; `interactionSchema.js` invariato |
| AC-7 | Tempi di `npm test` e `responses.snapshot.test.ts` entro +10% (misura alternata) |

---

## 7. Decisioni (approvate il 2026-10-20)

| ID | Decisione | Motivo |
|---|---|---|
| D-4b-1 | Registri come oggetti `tipo → funzione` in `game/odessa/interactions/`; il motore non definisce tipi | TD 0 §4.5 |
| D-4b-2 | Prerequisito = funzione booleana (true = soddisfatto); effetto = funzione che può restituire `info` (oggi solo `statoPreToggle`) | Interfaccia minima che copre i casi attuali senza stato condiviso |
| D-4b-3 | Verbi con risposta di apertura/chiusura come regola esplicita di Odessa (`PREMERE`, `RUOTARE`), non come regola generica "interazione con effetto toggle" | La regola generica è equivalente sui dati di oggi ma diversa per dati futuri: nella v1.4.2 si trascrive. Il test §5.1 punto 4 segnala l'eventuale incoerenza |
| D-4b-4 | Anomalia E-6 (sequenza della cassaforte: +2 registrati in `misteriRisolti` con chiave fissa) trascritta in `rules.sequence.onCompleted`, non corretta | Correggerla cambierebbe i salvataggi (chiave nei misteri) e il conteggio "misteri risolti" mostrato al giocatore; da valutare come issue separata |
| D-4b-5 | `DIREZIONE_APERTA` resta basato sui soli toggle; la generalizzazione su `getDirezioniLuogo` annotata nel lotto 3 **non si fa** | Cambierebbe il significato per direzioni aperte stabilmente o sbloccate; sui dati di oggi non dà benefici. Chiude la nota D-L3-3 |
| D-4b-6 | Fase 1A in due sessioni: 1A-1 Sonnet (prerequisiti, effetti), 1A-2 Opus (ricerca ed esecuzione, sequenze) | Opus solo per la parte con l'ordine delle mutazioni più articolato |

---

## 8. Candidati issue (non si correggono nel lotto)

- Anomalia E-6 (D-4b-4): il completamento della combinazione conta come "mistero risolto" nel riepilogo del punteggio.
- `OGGETTO_IN_LUOGO` e `OGGETTO_VISIBILE` hanno la stessa implementazione: o un tipo è superfluo, o "visibile" dovrebbe controllare qualcosa di diverso.

---

## 9. Prova manuale (Mauro, `localhost:3001`)

1. Interazione semplice con punti: `ACCENDI LAMPADA` (con lampada e fiammiferi) → punteggio +2.
2. Interazione con oggetto che diventa visibile: `MUOVI FERMACARTE` nell'archivio → compare lo scomparto, punteggio +2 e +3.
3. Cassaforte: combinazione D S S D S in biblioteca dopo aver spostato il quadro; un errore a metà resetta; al termine la cassaforte si apre; `RUOTA DESTRA` di nuovo → "già aperta".
4. Porta del 44: `PREMI PULSANTE` due volte (apertura, poi chiusura) → +3 solo la prima volta.
5. Prerequisito con risposta dedicata: un'interazione senza l'oggetto richiesto in inventario.
6. `PUNTI` alla fine: totale e riepilogo coerenti.
