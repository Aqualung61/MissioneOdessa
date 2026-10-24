## Unreleased

- 

---

## v1.4.3 (24 ottobre 2026)

### Sicurezza e testi

- Dipendenze: lock npm aggiornato, 0 vulnerabilità nelle dipendenze di produzione; chiusa l'elusione del limitatore di frequenza con indirizzi IPv4-mapped IPv6 (#144).
- `help` in inglese: voci con iniziale maiuscola e resto minuscolo (#137).
- Test del limitatore di frequenza con `X-Forwarded-For` (#147), senza impatto sul gioco.

Dettagli: [docs/release-notes/2026-10-24_v1.4.3.md](docs/release-notes/2026-10-24_v1.4.3.md)

---

## v1.4.2 (21 ottobre 2026)

### Refactor del motore

- Motore: `createEngine` come facciata, nucleo generico in `src/logic/core/` e parte di Odessa in `src/game/odessa/`; gestori di verbo, registri di interazioni, effetti di turno dalla definizione del gioco (#63, #123).
- Parser: nuova `parseInput`, `parseCommand` deprecato; configurazione di gioco in `Configurazione.json` (#63, #123).
- API: rimossi gli endpoint legacy e `DISABLE_LEGACY_ENDPOINTS`; `/api/parser/stats` e `/reload` solo fuori produzione; `tsconfig` NodeNext (#124, #125, #126).
- Qualità: ESLint di complessità bloccante (`--max-warnings 0`), reti di caratterizzazione, copertura (#63, #123).
- Unica modifica di comportamento: i salvataggi incompleti si caricano senza errori 500 (D-5-4).

Dettagli: [docs/release-notes/2026-10-21_v1.4.2.md](docs/release-notes/2026-10-21_v1.4.2.md)

---

## v1.4.1 (17 ottobre 2026)

### Fedeltà all'originale

- Timer e sequenza finale dell'originale: buio, zona aperta, alba a 200 turni, guardia alla barriera, incontro con Ferenc (#107, #97).
- Fiammiferi contati e luce della lampada solo dove si trova (#108).
- Enigmi del bastone e del quadro; punteggio delle interazioni senza doppi conteggi, massimo 138 (#96).
- Lessico e risposte dell'originale in italiano e inglese: sinonimi, preposizioni, verbi, guardia, luoghi, `carica peso` (#109, #98).
- Passaggio crollato nel sotterraneo: crollo una sola volta, poi passaggio bloccato (#117).
- Testi IT/EN corretti e reti di test: partite di riferimento, corpus del parser, istantanea delle risposte (#99, #95).

Dettagli: [docs/release-notes/2026-10-17_v1.4.1.md](docs/release-notes/2026-10-17_v1.4.1.md)

---

## v1.4.0 (15 ottobre 2026)

### Stabilità: sessioni e difetti

- Sessioni: motore isolato per sessione tramite factory `createEngine()`; memoria per sessione rilasciata all'evizione (~12 KB invece di ~210 KB non rilasciati) (#91).
- Interazioni: `FLAG_FALSE`, risposte dedicate per prerequisito (`accendi lampada`), prerequisiti sconosciuti non soddisfatti, test di schema su `Interazioni.json` (#93).
- Robustezza: caricamento dati tutto-o-niente all'avvio, rimosso `GET /init_odessa`, limiter pesante su `POST /api/parser/reload`, rimosso l'oggetto ID 11, stato del toggle non più scritto sui dati condivisi (#94).
- Documentazione: report tecnico as-built v1.3.4 versionato con correzioni (#92).

Dettagli: [docs/release-notes/2026-10-15_v1.4.0.md](docs/release-notes/2026-10-15_v1.4.0.md)

---

## v1.3.4 (18 gennaio 2026)

### Release readiness (pre-public)

- Documentazione “pre-public”: checklist completata e pubblicata.
- Aggiunti third-party notices e attribution immagini (dummy + immagini generate dall’autore del porting con supporto AI).

---

## v1.3.3 (17 gennaio 2026)

### Sprint #59.1: Multi-session per-tab

- Multi-session per-tab (no cookie) via header `X-Session-Id` / `X-Game-Id`.
	- Frontend: persistenza per-tab in `sessionStorage` (isolamento tra tab).
	- Backend: engine isolato per sessione + self-healing degli id; `/reset` genera un nuovo `X-Game-Id`.
	- Guardrail produzione: TTL idle/assoluto + limite sessioni (LRU) configurabili via `.env`.
- CI: pin Node a `18.20.x` e `20.x` + reporter test verbose per evitare timeout da assenza output.

---

## v1.3.2 (14 gennaio 2026)

### Patch release: milestone chiusa

#### Cambiamenti principali
- Save/Load: dopo `CARICA` la UI riallinea subito contatori/HUD e direzioni coerenti con lo stato caricato.
- Gameplay: intercettazione in luoghi pericolosi dopo **4** turni consuming (prima: 3).
- Lingua/URL: lingua UI persistita solo in `localStorage` (default=1, whitelist {1,2}); ripulite querystring legacy e canonical/og:url senza query.
- Cleanup: rimozione artefatti/rename script e semplificazione entrypoint (redirect verso `web/odessa_storia.html`).

---

## v1.3.1 (12 gennaio 2026)

### Navigation: migrazione full-server (Sprint 4.1.x)

#### Novità principali
- Pipeline unica per input: `POST /api/engine/execute` come source-of-truth (parser + engine) con risposta arricchita `state/ui/stats`.
- Restart dopo GAME OVER: conferma `SI` esegue un hard reset server-side (preserva lingua) e riallinea HUD/UI.
- Comando `FINE` allineato al flusso full-server: richiede conferma `SI/NO` server-side (flag `awaitingEndConfirm`) ed elimina regressioni dovute a mismatch client/server.

#### Hardening e compatibilità
- Test HTTP aggiunti per la navigazione via `/api/engine/execute` (valida/bloccata/terminale + flow `SI/NO`).
- Endpoint legacy marcati come deprecati (`Deprecation`/`Sunset`) e disabilitabili via `DISABLE_LEGACY_ENDPOINTS=1`:
	- `POST /api/engine/set-location`
	- `POST /api/parser/parse`

#### Note
- Nessuna rimozione fisica degli endpoint legacy in questa release: cleanup aggressivo rimandato.
- Scoring: rango **Perfezionista** ottenibile con punteggio **>= 134**; massimo tecnico visualizzato **/138** (coerente con le interazioni conteggiabili).

> Nota: questa versione promuove la precedente prerelease `v1.3.1-beta` a release stabile.

---

## v1.3.0 - Beta Release (8 gennaio 2026)

### Sprint 3.3.5.D - Test Suite Completo e Quality Assurance

#### Novità principali
- **Test Coverage Completo**: 211 test totali (194 passati, 17 skippati)
  - 43 test alta priorità: CHECK 4 Guardia (5), victoryEffect (22), victory E2E (10 skipped)
  - 8 test priorità media: scoring.mysteries (6 passati, 2 skipped)
  - 160 test esistenti: full regression green
- **ESLint Clean**: Risolti 48 errori di linting (variabili non usate, tipi any)
- **i18n Compliance**: Verificate tutte le stringhe di sistema IT/EN
- **Mystery Scoring Tests**: Validazione sistema +3 punti per VISIBILITA, SBLOCCA_DIREZIONE, TOGGLE_DIREZIONE

#### Migliorie tecniche
- **TypeScript strict typing**: Eliminati tutti i tipi `any` dai test
- **Test organization**: Struttura modulare unit/integration/e2e
- **Quality gates**: Linting + test automatici pre-commit

#### Bug Fix
- Rimossi log obsoleti in backend (console.log)
- Fixed hardcoded strings in frontend (compliance i18n)
- Corretto conteggio effetti in turn-effects-registry.test.ts (4→5)

#### Documentazione
- Sprint 3.3.5.D completato al 100%
- Test documentation aggiornata
- Copilot instructions aggiornate

---

### Sprint 3.3.5.C - Sistema Intercettazione Pattuglie Sovietiche (v1.2.5)

#### Novità principali
- **Sistema intercettazione**: Morte automatica dopo 3 turni consecutivi in zone pericolose (danger zones: luoghi 51,52,53,55,56,58)
- **Rifugio sicuro**: Luogo 57 (Capanno attrezzi) resetta il contatore di intercettazione
- **Messaggi i18n**: Nuovo messaggio di morte "💀 INTERCETTATO DALLA PATTUGLIA SOVIETICA" (IT/EN)
- **Game Over CHECK 3**: Attivato controllo intercettazione in gameOverEffect

#### Migliorie tecniche
- **Middleware interceptEffect.js**: 4° effect nel registry TURN_EFFECTS
  - Incremento dal primo arrivo in zona pericolosa (no skip)
  - Reset automatico all'uscita verso luogo sicuro
  - Comandi SYSTEM esclusi automaticamente (non consumano turno)
- **Turn System v3.0 Extended**: Aggiunto flag `inDangerZone` a current/previous
- **TypeScript definitions**: Nuovo file `types/game-state.d.ts` con interfacce complete
- **Test suite**: +11 test (162 totali), nuovi test isolati in `intercept-effect.test.ts`

#### Bug Fix (5 totali)
1. Parser cache non resettato dopo loadGame → `resetVocabularyCache()` in load-client-state
2. Turn structure non ricostruita → Enhanced `setGameState()` con defaults espliciti
3. `previous.inDangerZone` non salvato → Aggiunto in `prepareTurnContext()`
4. `current.inDangerZone` non aggiornato dopo movimento → Ricalcolo in `applyTurnEffects()`
5. Contatori turn non salvati → Full turn structure in `getGameStateSnapshot()`

#### Documentazione
- Aggiornata `architettura-applicazione.md` con sezione dedicata Sistema Intercettazione
- Aggiornata `specifica-tecnica-completa-integrata.md` con Sprint 3.3.8 (5 sottosprint)
- Diagrammi mermaid aggiornati con CHECK 3 implementato

#### Note tecniche
- Ordine esecuzione critico: gameOverEffect (3°) verifica PRIMA di interceptEffect (4°) incremento
- Persistenza garantita: contatore salvato in save/load cycle
- ESLint clean, tutti i test green (162 passing)

---

### Sprint 3.3.5.B - Sistema Buio e Game Over Unificato (v1.2.4)

#### Novità principali
- Nuova pagina principale: `web/odessa_main.html` promossa a entrypoint dell'app.
- `index.html` aggiornato: redirect alla nuova pagina principale con selezione lingua.
- Pannello stella/UI direzioni: click-to-move su lettere N/E/S/O e controlli Su/Giù; tooltip dinamici e stati attivo/disabilitato.
- Comportamento input: i click su lettere/Su/Giù non inseriscono testo nell'input.

### Migliorie tecniche
- Micro-ottimizzazioni performance: cache DOM centralizzata, riduzione query ripetute.
- `applyDirectionStates(cur)` per centralizzare tooltip e classi UI; separazione `showCurrent()`/`updateLayoutPanels()`.
- Micro-profilazione: `window.__odPerf` con log periodici via `performance.now()`.
- CSS: background stella via `image-set`, rimozione preload non necessario; `content-visibility` sul feed descrizioni.
- Fix sintassi/robustezza: bilanciamento parentesi e cleanup duplicazioni legacy.

### Note
- Pulizia sandbox: rimossi file obsoleti `web/odessa_main2.html` e `web/css/odessa_main2.css`.

---

## v1.2.3-beta.0 (18/11/2025)

### Novità principali
- Le direzioni nel pannello stella (N/E/S/O/Su/Giu) sono ora cliccabili: il click esegue il comando di movimento corrispondente, senza modificare l’input testuale.
- Nessuna regressione nota, logica di abilitazione/disabilitazione invariata.
- Modifica tracciata e reversibile.

### Migliorie tecniche
- Refactor delle APIs `azioni_setup` e `azioni_modi`: ora aggiornano dinamicamente le direzioni nell'array luoghi in memoria invece di scrivere sul database, migliorando prestazioni e coerenza.
- Rimozione di tutti i `console.log` dalle APIs e dal frontend per una console pulita.
- Correzione parametri API (case sensitivity, query WHERE) e percorsi immagini (`../images/dummy.png`).
- Validazione robusta parametri log (0/1) e IDLuogo.

### Note
- Logica di navigazione completata: direzioni dinamiche, eccezioni (muri, luoghi terminali), introduzione multilingua, immagini di contesto.
- Prossimi passi: implementazione parser per frasi, gestione oggetti e timer.

---

## v1.2.4-dev

### Novità
- 

---

## v1.0.0 (31/10/2025)

### Novità principali
- Prima release pubblica dell’applicazione Missione Odessa.
- Backend Node.js/Express con API REST e frontend statico.
- Struttura modulare: separazione tra data layer, application logic e web/API.
- Nuova rotta `/api/version` per ottenere la versione applicativa (sincronizzata con `package.json`).
- Documentazione aggiornata e struttura repository pulita.
- Backup, test e script organizzati in cartelle dedicate.

### Come usare
- Avvia il server con `npm run dev`.
- Accedi al frontend su `/index.html` (selezione lingua) o `/web/odessa_main.html` (gioco diretto).
- Consulta le API su `/api/luoghi` e `/api/version`.

---

## v1.2.0 (04/11/2025)

### Novità principali
- Parser conforme a REQ01:
	- Lessico da DB (Tipi/Terimini/Voci + LessicoSoftware), sinonimi NAV/SYS, NOUN SME.
	- Normalizzazione (case-insensitive, spazi, stopword), tolleranza punteggiatura e accenti.
	- Grammatica: NAV/SYS singolo token; ACTION singolo (DORMI/SCAPPA/SORRIDI); ACTION + NOUN (+ indice).
	- Errori strutturati e mappati a messaggi utente IT (es. `?NON CAPISCO QUESTA PAROLA.`).
- Canonici di navigazione stabili (NORD/SUD/EST/OVEST/ALTO/BASSO).
- API parser: `POST /api/parser/parse`, `GET /api/parser/stats`, `POST /api/parser/reload`.
- Engine base con stato in memoria:
	- Comandi: INVENTARIO, PRENDI/POSA/LASCIA, ESAMINA/OSSERVA/GUARDA, APRI/CHIUDI (BOTOLA, ecc.).
	- API engine: `POST /api/engine/execute`, `GET /api/engine/state`, `POST /api/engine/reset`.
- UI demo `web/parser.html`: analisi, esecuzione, riepilogo, help, pannello stato e reset.
- Test Vitest: 29 test PASS (parser, sinonimi, canonici, engine gameplay minimo).

### Migliorie tecniche
- Cache vocabolario con hot-reload.
- Script di rebuild lessico allineato (drop/idempotenza) e stats DB.
- Messaggi utente centralizzati in `src/logic/messages.js`.

### Note
- La tabella verbi nel requisito elenca 33 voci operative; il set è estendibile via DB.
- Lo stato engine è in-memory (per iterazione rapida); endpoint di stato e reset inclusi.
