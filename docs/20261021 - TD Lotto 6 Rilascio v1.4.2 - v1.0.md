# TD Lotto 6 — Rilascio v1.4.2

| Campo | Valore |
|---|---|
| Documento | Specifica tecnica (TD) del lotto 6 della v1.4.2 |
| Versione | v1.0 — approvata da Mauro Giorgi il 2026-10-21 (D-6-1…D-6-9; Q1 e Q2 come proposto) |
| Issue | #63, #123, #124, #125, #126 (chiusura); issue di rilascio da creare (§6.1) |
| Milestone | 6 — `v1.4.2 (Refactor del motore)` |
| Baseline | `release/v1.4.2` @ `4b0f7c2` (verificata il 2026-10-21, §2) |
| Riferimento rilascio precedente | v1.4.1: PR #120 (versione e note), PR #121 → `main` (`85edb5e`) |
| Handoff | `20261021 - HO-25 Lotto 6 Rilascio v1.4.2 - v1.0.md` |

## 1. Rischio di regressione

**Livello complessivo: basso.** Il lotto non modifica motore, parser, dati di gioco, frontend né test. Il rischio residuo è nel processo di rilascio, non nel codice.

| Area | Rischio | Perché | Contenimento |
|---|---|---|---|
| Codice in `src/` | **Nullo** | Solo due commenti in `src/logic/engine.js` (§5.5); nessuna istruzione cambiata | Reti invariate (istantanea risposte, tracce motore e HTTP, parser, salvataggi) |
| Versione `1.4.1` → `1.4.2` | **Basso** | Cambia `/api/version` e il campo `version` dei salvataggi. Nessun test o fixture protetto confronta `version` con `appVersion` (il confronto dei salvataggi lo esclude). La v1.4.1 non valida `version` al caricamento (`src/middleware/validation.js`, verificato su `85edb5e`) | Suite completa e tracce dopo il cambio; salvataggi incrociati (§7) |
| Merge `release/v1.4.2` → `main` | **Medio** | 7 PR di refactor (38+ file solo nel lotto 5) arrivano insieme in produzione; il deploy Railway è automatico dalla CI su `main` | CI obbligatoria sul merge; verifica `/api/version` e prova rapida in produzione; rollback (§8.3) |
| Compatibilità salvataggi (rollback) | **Basso** | D-5-4 cambia solo il caricamento di salvataggi incompleti; il formato prodotto è invariato | Verificato in anticipo in entrambe le direzioni (§2.3); ripetuto dopo il cambio di versione |
| Pulizia rami remoti | **Basso, irreversibile** | Eliminare un ramo non contenuto in `main` ne perde i commit | Tag `archive/<nome>` prima dell'eliminazione per i 4 rami non contenuti (D-6-7) |
| Variabili Railway | **Basso** | `DISABLE_LEGACY_ENDPOINTS` non è più letta dal lotto 1 | Eliminazione dopo il deploy verificato |

## 2. Baseline verificata (2026-10-21, ambiente cloud della sessione, Linux, Node 22.22.0)

### 2.1 Repository
- `release/v1.4.2` @ `4b0f7c2` (PR #135); `main` @ `85edb5e` (tag `v1.4.1`). Tag presenti fino a `v1.4.1`.
- `package.json` versione `1.4.1`; script `lint` = `eslint . --max-warnings 0`.
- Milestone 6 `v1.4.2 (Refactor del motore)`: 5 issue aperte (#63, #123, #124, #125, #126), 0 chiuse. Milestone 7 `v1.4.3 (Parser: nomi composti)`: #128.
- Issue aperte senza milestone: #127 (frontend `executeCommandOnServer`), #129 (candidati dalla traccia del lotto 0).

### 2.2 Quality gates su `4b0f7c2`
| Controllo | Esito |
|---|---|
| `npm ci` | OK (281 pacchetti) |
| `npm run lint` | PASS, 0 avvisi |
| `npm run typecheck` | PASS |
| `npm run build` | PASS |
| `npx vitest run` | 81 file passati, 1 saltato; **675 passed, 17 skipped**; 52,4 s |

Tracce, istantanee e SHA dei file protetti non sono stati rigenerati in questa verifica (il kit è sul PC locale); l'ultima verifica indipendente PASS è quella della PR #135 sullo stesso commit.

### 2.3 Salvataggi incrociati v1.4.2 ↔ v1.4.1 (verifica anticipata)
Eseguita via HTTP (`/reset`, `/execute`, `/save-client-state`, `/load-client-state`) su `4b0f7c2` e su un worktree di `85edb5e`, percorsi `full_it` e `full_en` (147 passi), salvataggio ai passi 1, 30, 60, 91, 120, 146:

| Verifica | IT | EN |
|---|---|---|
| Salvataggi prodotti da v1.4.2 e v1.4.1 identici (esclusi `timestamp`, `version`) | Sì (6/6) | Sì (6/6) |
| Salvataggio v1.4.2 caricato in v1.4.1: caricamento 200, vittoria, 147 turni, 138 punti | Sì (6/6) | Sì (6/6) |
| Risposte dei passi successivi: v1.4.2 → v1.4.1 identiche a v1.4.1 → v1.4.1 | Sì | Sì |
| Salvataggio v1.4.1 caricato in v1.4.2: risposte identiche a v1.4.1 → v1.4.1 | Sì | Sì |

Ripetuta con `package.json` portato temporaneamente a `1.4.2` (salvataggi con `version` `1.4.2`, passi 1, 91, 146, IT ed EN): PASS. La prova va comunque ripetuta sul commit di rilascio (§7, AC-5). Script: `20261021 - Lotto 6 salvataggi incrociati.mjs`.

### 2.4 Rami remoti (24 oltre a `main`)
- `release/v1.4.2`: ramo di integrazione, da eliminare dopo il merge finale.
- 19 rami contenuti in `main` (antenati di `85edb5e`): `chore/bump-1.2.3-dev`, `chore/ignore-claude-decompiler`, `chore/ignore-disassembly`, `chore/start-1.2.1-dev`, `debug-db-logs`, `deploy-production`, `docs/codex-agent-instructions`, `final-merge`, `final-sync`, `fix-basepath`, `fix-db-copy`, `freeze-20251104`, `include-db`, `init-db-from-sql`, `issue-91/session-engine-factory`, `issue-92/as-built-report`, `issue-93/interaction-prerequisites`, `resolve-conflict`, `sync-db-init`.
- 4 rami **non** contenuti in `main` (analisi del contenuto):

| Ramo | Punta | Commit non in `main` | Contenuto | Stato in `main` |
|---|---|---|---|---|
| `chore/dev-scripts-node` | `cf0c6f4` (2025-11-05) | 1 | `dev`/`dev:watch` senza `npx` | Già equivalente in `main` |
| `freeze-20251031` | `5bf1afb` (2025-11-04) | 1 | Una riga di README (stato v1.1.0) | Superato |
| `feature-carica-updates` | `8c72b8c` (2025-11-25) | 3 | Intro: immagine, bottone Continua; `Introduzione.json`; test CARICA | Immagine presente in `main`; pagina e test evoluti in seguito. Non confrontato riga per riga |
| `release/v1.2.2` | `4eda79d` (2025-11-06) | 2 | Pagina principale, CSS, indici lessico SQLite, test nav/terminal/schema | Test e CSS presenti in `main`; parti SQLite rimosse con la migrazione a JSON |

## 3. Perimetro

**Nel perimetro**
1. Versione `1.4.2` (`package.json`, `package-lock.json`, `README.md`).
2. Note di rilascio: `docs/release-notes/AAAA-MM-GG_v1.4.2.md`, blocco in `RELEASE_NOTES.md`, reset di `Unreleased.md`.
3. `docs/ROADMAP.md` aggiornato (#126).
4. Commenti "Stub" fuorvianti in `src/logic/engine.js` (#126).
5. Issue: rilascio v1.4.2 e candidati raccolti nei lotti (§6).
6. PR di rilascio verso `release/v1.4.2`, PR finale verso `main`, tag, GitHub Release, chiusura milestone.
7. Pulizia dei rami remoti (#126).
8. Variabile Railway `DISABLE_LEGACY_ENDPOINTS`.

**Fuori perimetro**
- Qualsiasi modifica di comportamento, compresa la correzione di `help` EN (issue per la v1.4.3, D-6-5).
- Rimozione di `parseCommand` (deprecato): 27 file di test protetti lo usano (§6.4).
- `docs/STATISTICHE_PROGETTO.md` (fotografia di gennaio 2026), `web/`, dati di gioco, test protetti.
- Installazione di Node 20 in locale: il rilascio non cambia il runtime; la CI copre 18.20.x e 20.x.

## 4. Decisioni

| # | Decisione | Motivo |
|---|---|---|
| D-6-1 | Versione `1.4.2`; data del rilascio = giorno del merge finale; file `docs/release-notes/<data>_v1.4.2.md` | Convenzione delle release precedenti |
| D-6-2 | Note di rilascio **per tema**, non per lotto: architettura del motore, parser, configurazione, endpoint e configurazione server, strumenti di qualità, unica modifica di comportamento (D-5-4). Il dettaglio per lotto resta nelle TD in `docs/` | `Unreleased.md` è un diario dei lotti con quality gate intermedi ormai superati (es. "8 avvisi `complexity`") |
| D-6-3 | `docs/ROADMAP.md` riscritto in forma breve: fonte di verità GitHub; Fatto (v1.4.0–v1.4.2), Prossimo (v1.4.3), Dopo (issue senza milestone). `docs/20260113_nextsteps.md` resta, indicato come storico in ROADMAP e README | #126; il file attuale elenca milestone e issue di gennaio |
| D-6-4 | In `src/logic/engine.js` si correggono solo i due commenti "Stub" (riga 79 `enterLocationOf`, riga 165 `executeCommandAsync`): descrivono il comportamento reale. Nessuna modifica all'API (21 chiavi, vincolate da `tests/architecture.test.ts`) | #126 ("etichette Stub fuorvianti"); `executeCommandAsync` è usata da `engineRoutes.js:198`, `enterLocation` da due test |
| D-6-5 | Issue nuove (testi in §6): rilascio v1.4.2; `help` EN in maiuscolo (milestone v1.4.3); messaggi del frontend per 409 e 429; candidati di gestione errori API; candidati del motore dai lotti 4b–5. #129 resta com'è | Decisione di Mauro del 2026-10-21 su `help` EN; gli altri candidati sono annotati in "Stato avanzamento" senza issue |
| D-6-6 | Chiusura con la PR finale: `Fixes` #63, #123, #124, #125, #126 e l'issue di rilascio. Su #123, prima del merge, un commento che dichiara la deviazione: `DIREZIONE_APERTA` **non** generalizzato (D-L3-3, D-4b-5); secondo gioco fuori perimetro | Il corpo di #123 elenca la generalizzazione come attività |
| D-6-7 | Rami: eliminare i 19 contenuti in `main`; per i 4 non contenuti creare prima il tag `archive/<nome-ramo>` (`/` sostituito da `-`) sulla punta, verificare che il tag punti allo SHA di §2.4, poi eliminare il ramo; eliminare `release/v1.4.2` dopo il merge finale | Nessuna perdita di commit; elenco dei rami ridotto a `main` |
| D-6-8 | Verifiche pre-rilascio: (a) suite e reti invariate dopo il cambio di versione; (b) salvataggi incrociati automatici IT/EN (script §2.3); (c) **prova manuale di Mauro**: partita completa **in italiano** fino alla vittoria su localhost:3001 (la partita in inglese è stata fatta per la v1.4.1); (d) facoltativa: un salvataggio scaricato da localhost (v1.4.2) caricato su www.missioneodessa.it (v1.4.1) dal frontend | (c) è l'unico percorso reale frontend+motore dopo 7 PR di refactor; (d) prova il percorso di rollback dal browser |
| D-6-9 | `DISABLE_LEGACY_ENDPOINTS` eliminata da Railway dopo la verifica di `/api/version` = 1.4.2 | Non letta dal codice dal lotto 1 |

## 5. Modifiche ai file

### 5.1 Versione
- `package.json`: `"version": "1.4.2"`; `package-lock.json` allineato con `npm install --package-lock-only` (solo i campi `version` della radice; nessun'altra differenza ammessa).
- `README.md`: riga 5 (`**Versione 1.4.2**`), riga 116 (`{ "version": "1.4.2" }`), riga 253 (`**Versione attuale: 1.4.2** (<data>)`); riga 8 (link a `docs/20260113_nextsteps.md`): indicare "storico (gennaio 2026)".

### 5.2 `docs/release-notes/<data>_v1.4.2.md`
Stessa struttura della v1.4.1 (Data, Tag, Branch, Milestone; Sintesi; Modifiche; Quality gates; Note). Contenuto minimo:
- **Sintesi**: refactor del motore a comportamento invariato (#63), predisposizione al framework (#123), pulizia ed endpoint legacy (#124, #125, #126); una sola modifica di comportamento (D-5-4).
- **Modifiche**, per tema (D-6-2): motore (`createEngine` facciata, `src/logic/core/`, `src/game/odessa/`, gestori di verbo, registri di interazione, effetti di turno dalla definizione del gioco); parser (`parseInput`, `parseCommand` deprecato); configurazione (`Configurazione.json`, `gameConfig.js`); API (endpoint rimossi, `/api/parser/stats` e `/reload` fuori produzione, `DISABLE_LEGACY_ENDPOINTS` rimossa); qualità (ESLint di complessità bloccante, `--max-warnings 0`, copertura, reti di caratterizzazione); salvataggi incompleti (D-5-4); `tsconfig` NodeNext.
- **Quality gates**: valori finali misurati in Fase 1B (test, lint, build, copertura, memoria per sessione), CI sulla PR finale.
- **Note**: compatibilità dei salvataggi in entrambe le direzioni (rollback a v1.4.1 possibile); variabile Railway da eliminare; nessun cambiamento visibile al giocatore salvo D-5-4.

### 5.3 `RELEASE_NOTES.md`
Blocco `## v1.4.2 (<data>)` in testa (sotto `## Unreleased`), 4–6 voci con riferimenti alle issue e link al file dettagliato, come per la v1.4.1.

### 5.4 `docs/release-notes/Unreleased.md`
Ripristinato al modello vuoto usato dopo la v1.4.1 (Data TBA, Branch `main`, sezioni TBD/TBA).

### 5.5 `src/logic/engine.js` (solo commenti)
- Riga 79: `// Stub: entra in luogo terminale (da implementare secondo logica app)` → commento che descrive il comportamento (imposta il luogo corrente e l'attesa di riavvio; usata dai test dei luoghi terminali).
- Riga 165: `// Stub: esecuzione comando asincrona (da implementare secondo logica app)` → commento che descrive il comportamento (involucro asincrono di `executeCommand`, usato da `POST /api/engine/execute`).

### 5.6 `docs/ROADMAP.md`
Struttura (D-6-3): scopo e link GitHub; **Fatto** (v1.4.0, v1.4.1, v1.4.2 con una riga ciascuna e link alle note); **Prossimo** (milestone v1.4.3: #128, issue `help` EN); **Dopo** (#127, #129 e issue nuove senza milestone); convenzioni (issue, milestone, `Fixes`), senza l'elenco delle milestone di gennaio.

## 6. Issue da creare (Fase 0)

Etichette: usare solo etichette esistenti (`gh label list`); se una proposta non esiste, usare la più vicina e segnalarlo nel report.

### 6.1 `Rilascio v1.4.2`
Milestone 6; `type:chore`, `priority:P2`. Corpo: perimetro di §3, rimando alla TD, elenco delle issue chiuse dal merge finale.

### 6.2 `help EN: voci in maiuscolo`
Milestone 7 (v1.4.3); `area:engine`, `priority:P2` (più `i18n` se esiste). Corpo:
- `help` in inglese mostra le voci in maiuscolo (VociLessico grezze), diversamente da `aiuto` in italiano.
- Decisione (2026-10-21): correggere il maiuscolo; **non** aggiungere i sinonimi all'aiuto.
- La correzione cambia l'istantanea delle risposte: aggiornamento dichiarato nella TD.
- Da decidere nella TD: uniformare in `aiuto` IT la forma delle voci (oggi imperativo e infinito mescolati: Prendi, Sposta / Attaccare, Dormire, Premere; `capitalizeCommand` mappa solo alcuni concetti) — vedi questione aperta Q1.

### 6.3 `Frontend: messaggi dedicati per 409 LANGUAGE_MISMATCH e 429 RATE_LIMITED`
Nessuna milestone; `priority:P2` (area frontend se esiste). Corpo:
- Caricando un salvataggio in un'altra lingua il server risponde 409 `LANGUAGE_MISMATCH` (dalla v1.4.0); il frontend mostra "Errore nell'esecuzione del comando".
- Oltre 30 comandi al minuto per IP (`src/middleware/rateLimiter.js`, attivo in produzione) il server risponde 429 `RATE_LIMITED`; il frontend mostra "Comando sconosciuto." (verificato il 2026-10-20).
- Da valutare: messaggi dedicati IT/EN; soglia del limitatore.
- Collegata a #127.

### 6.4 `Motore: candidati emersi dal refactor v1.4.2 (lotti 4b–5)`
Nessuna milestone; `area:engine`. Corpo (comportamenti esistenti, fissati dalle reti; ogni correzione richiede una TD):
1. Il completamento della combinazione della cassaforte conta tra i "misteri risolti" (D-4b-4).
2. I prerequisiti `OGGETTO_IN_LUOGO` e `OGGETTO_VISIBILE` hanno la stessa implementazione.
3. `openStates` assente in un salvataggio → errore a `APRI BOTOLA` (non coperto da D-5-4).
4. Testi italiani fissi: `currentLocationName` `'Sconosciuto'` anche in inglese; ripiego `'💡 SUGGERIMENTO…'` in `victoryEffect.js`.
5. `torchEffect.js`: due rami identici.
6. `parseCommand(dbPath, input, gameState)` deprecato: rimozione dopo la migrazione dei 27 file di test a `parseInput` (test protetti: richiede approvazione).

### 6.5 `API: candidati di gestione degli errori (lotto 5)`
Nessuna milestone; `area:api`. Corpo:
1. Ramo "input non stringa" di `POST /api/engine/execute` irraggiungibile via HTTP.
2. In produzione `errorHandler` risponde `INTERNAL_ERROR` anche a un 404 su `/api`.
3. Fuori da `/api` uno stato diverso da 404 produce "Internal Server Error" con lo stato originale.
4. Fuori produzione un `err.message` non stringa finisce nel campo `error`.

## 7. Criteri di accettazione

| # | Criterio |
|---|---|
| AC-1 | `npm run lint` (0 avvisi), `typecheck`, `build` PASS; `npm test` 675 passed / 17 skipped, ripetuto 3 volte |
| AC-2 | Tracce motore (`dfbe5a46…`) e HTTP (`db892c31…`), istantanee del parser (`e9ccc844…` / `24a962b1…`), istantanea delle risposte (88.151 voci, `97a62ceb…`) identiche a `4b0f7c2` |
| AC-3 | Nessun file modificato in `tests/`, `web/`, `src/data-internal/`; in `src/` solo i due commenti di §5.5 (`git diff 4b0f7c2 -- src` mostra solo righe di commento) |
| AC-4 | `/api/version` = `{"version":"1.4.2"}` su localhost; `package-lock.json` differisce solo nei campi `version` della radice |
| AC-5 | Salvataggi incrociati (script, IT ed EN, 6 punti ciascuno) dopo il cambio di versione: tutte le verifiche di §2.3 a `Sì` |
| AC-6 | Prova manuale di Mauro (D-6-8 c) superata |
| AC-7 | Dopo il merge: CI verde su `main`; deploy Railway; `https://www.missioneodessa.it/api/version` = 1.4.2; prova rapida in produzione (nuova partita, 3 comandi, salva) |
| AC-8 | Tag annotato `v1.4.2` sul merge commit; GitHub Release pubblicata; milestone 6 chiusa con 6 issue chiuse |
| AC-9 | Rami remoti: solo `main` (più eventuali rami creati dopo questa TD); 4 tag `archive/*` sugli SHA di §2.4 |

## 8. Sequenza

### 8.1 Prima del merge
Fase 0 (issue) → Fase 1A (modifiche di §5) → Fase 1B (AC-1…AC-5) → prova manuale (AC-6) → Fase 2: PR "chore(release): v1.4.2" → `release/v1.4.2` (squash, `Refs`), commento su #123 (D-6-6), PR finale `release/v1.4.2` → `main` (merge commit, `Fixes` di tutte le issue).

### 8.2 Dopo il merge (Fase 3)
1. CI su `main` e deploy Railway; `/api/version` = 1.4.2; prova rapida (AC-7).
2. Mauro elimina `DISABLE_LEGACY_ENDPOINTS` da Railway; se Railway ridistribuisce, ripetere `/api/version`.
3. Tag annotato `v1.4.2` sul merge commit; `gh release create v1.4.2` con le note del file dettagliato.
4. Verifica che le 6 issue siano chiuse; chiusura della milestone 6.
5. Rami (D-6-7): tag `archive/*` per i 4 rami, verifica, eliminazione dei 23 rami e di `release/v1.4.2`.

### 8.3 Rollback
In caso di difetto in produzione: ridistribuire su Railway il deployment della v1.4.1 (rollback immediato) oppure PR di revert del merge commit su `main`. I salvataggi dei giocatori restano caricabili in entrambe le direzioni (§2.3, AC-5).

## 9. Questioni aperte

| # | Questione | Proposta |
|---|---|---|
| Q1 | `aiuto` IT con imperativo e infinito mescolati: entra nell'issue `help` EN (v1.4.3)? | **Approvato:** sì, come punto da decidere nella TD dell'issue (§6.2) |
| Q2 | Prova manuale facoltativa D-6-8 (d) (salvataggio da localhost caricato in produzione) | **Approvato:** si esegue |
| Q3 | `docs/STATISTICHE_PROGETTO.md` fermo a gennaio 2026 | **Approvato:** fuori perimetro; nota nell'issue di rilascio |
