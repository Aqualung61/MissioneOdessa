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
- Accedi al frontend su `/web/odessa1.html`.
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
