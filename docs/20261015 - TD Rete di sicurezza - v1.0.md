# TD — Rete di sicurezza per il blocco v1.4.1

| Campo | Valore |
|---|---|
| Documento | Specifica tecnica (TD) |
| Versione | v1.0 — approvata da Mauro Giorgi il 2026-10-15 |
| Data | 2026-10-15 |
| Issue | #99 (parte: rete di sicurezza) e #95 (chiusura del documento di decisioni) |
| Destinazione | `main` (unica PR del blocco su `main`; le successive vanno su `release/v1.4.1`) |
| Baseline | `main` @ `f0f3fe3` (v1.4.0) |
| Modello consigliato per l'implementazione | Claude Sonnet 5.5, effort medio |

## 1. Valutazione del rischio di regressione

**Livello: nullo sul gioco.** Nessun file in `src/` né in `web/` cambia. Si aggiungono test, dati di test e documentazione; si modificano solo i trigger della CI.

| Area | Rischio | Perché |
|---|---|---|
| Gioco in produzione | Nullo | Nessuna modifica a codice o dati del gioco |
| Suite di test | Basso | Un file di test nuovo (circa 1.000 comandi eseguiti in totale, meno di 2 secondi in locale); test esistenti non toccati |
| CI | Basso | Si aggiunge `release/**` ai trigger di `push` e `pull_request`. Il deploy su Railway resta legato a `main` (configurazione Railway, non del workflow): da verificare al primo push su `release/v1.4.1` che Railway **non** avvii un deploy |
| Falsi allarmi futuri | Medio, voluto | Il test confronta ogni passo con valori registrati: qualunque cambiamento del percorso lo fa fallire. È lo scopo; le regole di manutenzione (§3.4) evitano che venga "aggiustato" impropriamente |

## 2. Obiettivi

1. Test di riferimento sul completamento del gioco: quattro percorsi (minimo e completo, IT ed EN) eseguiti con parser e motore reali.
2. Test di compatibilità dei salvataggi: una partita salvata con la v1.4.0 deve poter essere ripresa e completata.
3. Test del punteggio massimo: il massimo calcolato dai dati vale 138 e coincide con il valore mostrato al giocatore.
4. Documentazione: descrizione del test e documento delle decisioni in `docs/`.
5. Infrastruttura del blocco: CI sui branch `release/**`, branch `release/v1.4.1`, aggiornamento delle issue.

## 3. Soluzione

### 3.1 Dati di riferimento — `tests/fixtures/walkthrough/`

Forniti già pronti (generati sulla v1.4.0 e verificati), **da copiare senza modifiche**:

| File | Contenuto |
|---|---|
| `min_it.json`, `min_en.json` | Percorso minimo: 95 passi |
| `full_it.json`, `full_en.json` | Percorso completo: 147 passi |
| `save_v140_full_it_step91.json` | Salvataggio v1.4.0 al passo 91 del percorso completo IT, nel formato prodotto da `POST /api/engine/save-client-state` |

Struttura dei file di percorso:

```json
{
  "name": "full_it",
  "lingua": 1,
  "baseline": "v1.4.0 (f0f3fe3)",
  "expected": {
    "victory": true, "ended": true,
    "turnsAtFerenc": 146, "finalTurns": 147, "score": 138,
    "visitedPlaces": [1, 2, "..."], "interactions": ["..."], "mysteries": ["..."]
  },
  "steps": [
    { "step": 1, "command": "e", "resultType": "OK", "location": 2, "turns": 1, "score": 2 }
  ]
}
```

Valori attesi riassunti:

| Percorso | Passi | `turnsAtFerenc` | `finalTurns` | `score` | Luoghi | Interazioni | Misteri |
|---|---|---|---|---|---|---|---|
| min_it / min_en | 95 | 94 | 95 | 104 | 36 | 13 | 13 |
| full_it / full_en | 147 | 146 | 147 | 138 | 56 | 17 | 15 |

### 3.2 Test `tests/walkthrough.test.ts`

Setup (come `tests/unit/engine-factory.test.ts`): `beforeAll` con `await initOdessa()` e `await ensureVocabulary()`.

Per ciascuno dei quattro percorsi, un caso di test:
1. `const engine = createEngine(); engine.initializeOriginalData(); engine.resetGameState(fixture.lingua);`
2. per ogni passo: `const parsed = await parseCommand(null, step.command, engine.getGameState()); const r = engine.executeCommand(parsed);` poi verificare `r.resultType`, `currentLocationId`, `turn.totalTurnsConsumed`, `punteggio.totale` contro i valori del passo. In caso di differenza il messaggio deve indicare percorso, numero del passo e comando;
3. registrare `turn.totalTurnsConsumed` al passo con `resultType === 'TELEPORT'`;
4. alla fine verificare `victory`, `ended`, `turnsAtFerenc`, `finalTurns`, `score` e gli elenchi ordinati di `visitedPlaces`, `punteggio.interazioniPunteggio`, `punteggio.misteriRisolti`;
5. solo per i percorsi minimi: `turnsAtFerenc <= 100` (invariante della decisione R3, indipendente dal valore registrato).

Caso aggiuntivo **compatibilità dei salvataggi**:
1. motore nuovo, `resetGameState(1)`, poi `engine.setGameState(save.gameState)`;
2. eseguire i passi 92–147 di `full_it.json` con le stesse verifiche per passo;
3. verificare vittoria e 138 punti.

Nessuna scorciatoia: niente `setCurrentLocation`, niente modifiche dirette allo stato, salvo `setGameState` nel caso dei salvataggi.

### 3.3 Test `tests/scoring.max.test.ts`

Calcola il massimo dai dati IT (`IDLingua === 1`), con le regole del motore v1.4.0:
- +1 per ogni luogo con `Terminale !== -1`;
- +2 per ogni interazione, escluse quelle i cui effetti sono di tipo `SEQUENZA` (il motore restituisce la risposta prima di assegnare il punteggio);
- +3 per ogni mistero distinto: `VISIBILITA` per `target`; `SBLOCCA_DIREZIONE` e `TOGGLE_DIREZIONE` per coppia ordinata `(min(luogo, destinazione), max(luogo, destinazione))`;
- +2 per la sequenza della cassaforte, +4 per l'incontro con Ferenc.

Verifiche:
1. il massimo calcolato vale **138**;
2. `engine.score.breakdown` (IT ed EN) in `MessaggiSistema.json` contiene `/138`;
3. `web/js/odessa_main.js` contiene `'ui.stats.score', currentScore, 138` (ricerca testuale sul file).

Il test documenta nel commento che il calcolo riproduce le regole del motore v1.4.0 e va aggiornato insieme a esse. Insieme al percorso completo, che dimostra che 138 è raggiungibile, fissa il massimo in entrambe le direzioni.

### 3.4 Documentazione

- `docs/20261015 - Test completo per completamento game - v1.0.md`: fornito già pronto, da copiare senza modifiche. Contiene scopo, verifiche, limiti, **regole di manutenzione** e le tabelle passo per passo.
- `docs/20261015 - Decisioni fedeltà originale - v1.0.md`: fornito, da copiare senza modifiche (chiude #95).
- `docs/20261015 - TD Rete di sicurezza - v1.0.md`: questa specifica, nella versione approvata.
- `docs/release-notes/Unreleased.md`: voce sotto "Modifiche".

### 3.5 CI — `.github/workflows/ci.yml`

```yaml
on:
  push:
    branches:
      - main
      - 'release/**'
  pull_request:
    branches:
      - main
      - 'release/**'
```

Nient'altro cambia nel workflow.

### 3.6 Issue (dopo il merge)

| Issue | Azione |
|---|---|
| #95 | Chiusa dalla PR (`Fixes #95`) |
| #99 | Commento: completata la rete di sicurezza; restano i test mirati di ciascuna specifica del blocco |
| #97 | Commento: superata dalla decisione R4; si chiuderà con la PR "Timer e sequenza finale" |
| #98 | Commento: assorbita dalla decisione R10; si chiuderà con il lotto lessico che contiene CARICA |
| #96 | Commento: perimetro ridotto (R6 = B); restano il campo "senza punteggio" e gli effetti necessari a R7 |
| #63 | Correzione del titolo (rimuovere " Descrizione" finale) |
| Nuova | "Timer e sequenza finale (R1, R2, R3, R4, R11, R12)", milestone v1.4.1 |
| Nuova | "Fiammiferi (R8)", milestone v1.4.1 |
| Nuova | "Lessico e risposte dell'originale (R10)", milestone v1.4.1 |

### 3.7 Branch di integrazione

Dopo il merge su `main`: creare `release/v1.4.1` dal commit di merge e pubblicarlo. Da quel momento le PR delle specifiche del blocco hanno base `release/v1.4.1`.

## 4. File coinvolti

| File | Tipo |
|---|---|
| `tests/fixtures/walkthrough/*.json` (5) | Nuovi, forniti |
| `tests/walkthrough.test.ts` | Nuovo |
| `tests/scoring.max.test.ts` | Nuovo |
| `.github/workflows/ci.yml` | Modificato (solo trigger) |
| `docs/` (3 documenti), `docs/release-notes/Unreleased.md` | Nuovi / modificato |

## 5. Criteri di accettazione

| ID | Criterio |
|---|---|
| AC-1 | Lint, build, typecheck e test PASS; test esistenti invariati |
| AC-2 | I quattro percorsi passano: ogni passo coincide con i valori registrati; vittoria; valori finali come in §3.1 |
| AC-3 | Il salvataggio v1.4.0 si riprende al passo 92 e la partita si completa con 138 punti |
| AC-4 | Il massimo calcolato dai dati vale 138 e coincide con i tre punti in cui è mostrato |
| AC-5 | **Prova negativa**: alterando in una copia temporanea un'uscita in `Luoghi.json` (o un passo atteso), il test di percorso fallisce indicando passo e comando; ripristinato il file, torna verde. La prova non lascia modifiche |
| AC-6 | Fixture e documenti forniti identici agli originali (checksum di §6) |
| AC-7 | CI attiva sulle PR verso `release/**`; nessun deploy Railway al push di `release/v1.4.1` |

## 6. Checksum dei file forniti (SHA-256, contenuto LF, verificati subito dopo la copia)

| File | SHA-256 |
|---|---|
| `full_en.json` | `748e644849cbe5c6c2ddc89557da9cac62081aeec1580a7d3806de74b6929be5` |
| `full_it.json` | `3a550761e8e4b9de67020af3aa00771777132cdfefe3af76372ea00ca801fbf1` |
| `min_en.json` | `797da9d355b7bc5c29d042d3f538ba3d2eacf3c7fad5e01eb917356f1c5c86b3` |
| `min_it.json` | `c3f3a7eea841b5245c6583e93bd50acb822bcec1c989d2adbe00ea5b2a752ca6` |
| `save_v140_full_it_step91.json` | `8a61accfd80444f6748c7db733e0fd520833e5a9d244eadd4456c822bff5a2d1` |
| `docs/20261015 - Test completo per completamento game - v1.0.md` | `20eda3536981fc53116859534441304b955395cd146070c334de83ddd444bd95` |
| `docs/20261015 - Decisioni fedeltà originale - v1.0.md` | `f38d295ad895e68d64994b31708b6b47fb168ef9913a643921918fc0ba5eca89` |

## 7. Compatibilità dei salvataggi all'indietro (nota per il rilascio)

`setGameState` della v1.4.0 copia tutti i campi del salvataggio (`...newState`) e ricostruisce solo quelli noti: i campi in più di un salvataggio v1.4.1 vengono conservati e ignorati. In caso di rollback, quindi, un salvataggio v1.4.1 dovrebbe caricarsi nella v1.4.0 e proseguire con le regole v1.4.0. È un'analisi del codice, non una prova: al gate di rilascio v1.4.1 si verifica caricando un salvataggio v1.4.1 su un worktree del tag `v1.4.0`.

## 8. Rollback

Revert della PR. Nessun effetto sul gioco.
