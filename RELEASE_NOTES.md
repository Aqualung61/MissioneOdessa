## Unreleased

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
