# Missione Odessa App

[![CI](https://github.com/Aqualung61/MissioneOdessa/actions/workflows/ci.yml/badge.svg)](https://github.com/Aqualung61/MissioneOdessa/actions/workflows/ci.yml)

Applicazione adventure testuale con backend Node.js/Express, frontend statico e API REST basata su dati JSON statici (precedentemente SQLite).

## Avvio rapido

1. Installa le dipendenze:
   ```sh
   npm install
   ```
2. Avvia il server (statico + API):
   ```sh
   npm run dev
   ```
3. Accedi all'applicazione web:
   - [http://localhost:3001/index.html](http://localhost:3001/index.html) (entrypoint con selezione lingua)
   - [http://localhost:3001/web/odessa_main.html](http://localhost:3001/web/odessa_main.html) (gioco diretto)

4. Le API sono disponibili su:
   - [http://localhost:3001/api/luoghi](http://localhost:3001/api/luoghi)
   - [http://localhost:3001/api/luoghi/8](http://localhost:3001/api/luoghi/8)
   - [http://localhost:3001/api/version](http://localhost:3001/api/version) — restituisce la versione dell'applicazione
## Versionamento API e applicazione

- La versione dell'app è sincronizzata con il campo `version` in `package.json`.
- La rotta `/api/version` restituisce un oggetto JSON con la versione attuale, ad esempio:
   ```json
   { "version": "1.0.0" }
   ```
- Ogni avvio del server stampa la versione corrente in console.

## Struttura progetto

- `src/` — codice backend e logica applicativa
  - `src/data/` — accesso dati (es. `luoghiStore.js`)
  - `src/logic/` — logica di parsing e utility (es. `parser.js`)
  - `src/api/` — router API Express (es. `routes.js`, `linguaRoutes.js`)
  - `src/server.js` — entry point server Express (statico + API)
  - `src/tests/` — script di test, utilità e backup
- `web/` — file frontend statici (es. `odessa_main.html`, `odessa_intro.html`, `odessa1.js`)
- `backup/` — backup e archivi
- `docs/` — documentazione e note di modellazione
- `.env` — configurazione ambiente (es. percorso DB)

## Note
- Il server carica i dati da file JSON statici in `src/data-internal/` e serve sia API che file statici dalla stessa porta.
- La logica di parsing e la presentazione sono modulari e facilmente estendibili.
- I file di test e script di utilità sono in `src/tests/`.
- I backup sono in `backup/`.

## Dati e struttura

I dati dell'applicazione sono memorizzati in file JSON statici in `src/data-internal/` per semplicità e velocità. Schema e struttura dati documentati in `docs/`.
- Linee guida: vedi `docs/raccomandazioni.md` e `docs/data-modeling.md`.

## Release notes

- Unreleased: vedi `docs/release-notes/Unreleased.md`.
- 2025-11-04 – v1.1.0 (freeze-20251104): vedi `docs/release-notes/2025-11-04_v1.1.0_freeze-20251104.md`.
- 2025-11-04 – freeze-20251031: vedi `docs/release-notes/2025-11-04_freeze-20251031.md`.

## Endpoint utili (test e servizio)

- POST `/api/run-tests?suite=smoke|full`
   - Esegue la suite E2E Playwright dal backend e restituisce un report JSON.
   - `suite=smoke` esegue solo i controlli minimi (es. API versione) per una verifica rapida.

- POST `/api/shutdown`
   - Spegne il server in modo “graceful” (exit code 0). Disponibile solo quando `NODE_ENV=test`. Utile nelle pipeline locali per evitare exit -1.

## Nuove API

### API azioni_setup
- **Endpoint**: `/api/azioni`
- **Metodo**: GET
- **Parametri**:
  - `idLingua` (opzionale, default: 1): ID della lingua.
  - `log` (opzionale, default: 0): Abilita il log dettagliato.
- **Descrizione**: Aggiorna i record nella tabella `Luoghi` basandosi sui dati della tabella `Azioni` con `Sequenza = 1`.
- **Esempio di utilizzo**:
  ```
  GET /api/azioni?idLingua=1&log=1
  ```
- **Log**: Mostra la query SQL eseguita e i risultati in console se `log=1`.

### Campo `Terminale` nella tabella `Luoghi`

- **Descrizione**: Il campo `Terminale` nella tabella `Luoghi` rappresenta uno stato o una proprietà specifica del luogo.
- **Valori speciali**:
  - `-1`: Indica un luogo speciale o non accessibile, che richiede una gestione particolare.
- **Comportamento speciale**:
  - Quando un record nella tabella `Luoghi` ha il campo `Terminale = -1`, il luogo corrispondente rappresenta la fine del gioco.
  - In questo caso, l'utente ha la possibilità di ripartire dall'inizio del gioco.
- **Gestione**:
  - I luoghi con `Terminale = -1` possono essere esclusi dalle query o trattati diversamente.
  - Esempio di query per escludere questi luoghi:
    ```sql
    SELECT * FROM Luoghi WHERE Terminale != -1;
    ```
  - È possibile aggiornare il valore di `Terminale` con una query `UPDATE`:
    ```sql
    UPDATE Luoghi
    SET Terminale = 0
    WHERE Terminale = -1;
    ```
- **Uso nelle API**:
  - Le API possono includere o escludere i luoghi con `Terminale = -1` in base ai requisiti applicativi.

### Quando il valore del campo `Terminale` è maggiore di 0

- **Descrizione**: Il valore del campo `Terminale` maggiore di 0 identifica il record `ID` della tabella `Luoghi` che deve essere modificato.
- **Comportamento**:
  - La modifica segue le regole definite nella tabella `Azioni`.
- **Esempio di utilizzo**:
  ```
  GET /api/azioni?idLingua=1&log=1
  ```
- **Log**: Mostra la query SQL eseguita e i risultati in console se `log=1`.

## Migrazione da DB a JSON

A partire dalla versione 1.3.0, l'applicazione è stata migrata da SQLite a dati JSON statici per:
- **Semplicità**: Eliminazione della dipendenza da DB, facilitando deploy e test.
- **Velocità**: Caricamento immediato dei dati in memoria all'avvio.
- **Manutenibilità**: Dati versionati con Git, modifiche dirette ai file JSON.

I dati originali sono stati esportati da SQLite a JSON. Per modifiche, editare i file in `src/data-internal/` e testare con `npm test`.

## Stato

- Versione attuale: 1.3.0 (dati JSON statici).
- Test E2E: Suite completa via Playwright, accessibile da `index.html` > "Esegui test applicazione".
- Smoke test via API: ~9–10 secondi su ambiente locale.
