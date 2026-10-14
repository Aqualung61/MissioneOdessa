# TD B6 — Robustezza: stato condiviso, caricamento dati, endpoint e configurazione

| Campo | Valore |
|---|---|
| Documento | Specifica tecnica (TD) |
| Versione | v1.0 — approvata il 2026-10-14 (R3: rimozione; R4: limiter montato) |
| Data | 2026-10-14 |
| Issue | #94 — milestone `v1.4.0 (Stabilità: sessioni e difetti)` |
| Track | Fast con specifica breve |
| Baseline | `main` @ `d71a63f` (dopo #93) |
| Modello consigliato per l'implementazione | Claude Sonnet 5.5, effort medio |

## 1. Valutazione del rischio di regressione

**Livello complessivo: basso.** Sono sei interventi piccoli e indipendenti. Nessuno cambia le regole di gioco o i testi visibili al giocatore.

| # | Intervento | Rischio | Perché |
|---|---|---|---|
| R1 | `_statoPreToggle` in variabile locale | Basso | Riguarda solo il punteggio della prima apertura dei passaggi a scomparsa (`TOGGLE_DIREZIONE`), già coperto da `tests/scoring.mysteries.test.ts` |
| R2 | `initOdessa()` si ferma se manca una tabella | **Medio sul deploy** | Con un JSON danneggiato il server non parte più, invece di partire con dati incompleti. È voluto, ma un deploy fallito su Railway è più visibile di un malfunzionamento silenzioso |
| R3 | Rimozione di `GET /init_odessa` | Basso | Nessun uso nel codice, nel frontend o nei test |
| R4 | Limiter "heavy" su `POST /api/parser/reload` | Basso | Endpoint operativo, non usato dal gioco |
| R5 | Rimozione dell'oggetto ID 11 (`IDLuogo: null`) | Basso | Non è in nessun luogo, quindi non è mai visibile; i salvataggi vecchi che lo contengono restano caricabili |
| R6 | Configurazione e documentazione obsolete | Nullo | Solo `.env.example`, README e un commento |

Contenimento: test dedicati per R1, R2, R3, R4, R5 (§6). Rollback: revert della PR.

## 2. Interventi

### R1 — `_statoPreToggle` fuori dai dati globali

**Oggi**: in `applicaEffetti`, per `TOGGLE_DIREZIONE`, il motore scrive `effetto._statoPreToggle` sull'oggetto effetto, che appartiene a `global.odessaData.Interazioni` ed è quindi condiviso tra tutte le sessioni. `assegnaPunteggioMistero` lo rilegge subito dopo.

**Dopo**: lo stato precedente al toggle è una variabile locale di `applicaEffetti`, passata ad `assegnaPunteggioMistero` come secondo argomento, per esempio `assegnaPunteggioMistero(effetto, { statoPreToggle })`. Nessuna scrittura sugli oggetti dei dati globali.

### R2 — Caricamento dati: tutto o niente

**Oggi**: `initOdessa()` registra l'errore del singolo file e prosegue; il server parte anche con tabelle mancanti.

**Dopo**: `initOdessa()` prova a caricare tutte le tabelle, raccoglie gli errori e, se ce n'è almeno uno, lancia un'eccezione che elenca **tutti** i file non caricati. In `server.js` il `try/catch` esistente intercetta l'eccezione ed esce con `process.exit(1)`, come già oggi per gli altri errori.

Rimuovere anche i due `console.log` di debug su "Luogo 59 Est" in `initOdessa.js`.

### R3 — Rimozione di `GET /init_odessa`

**Oggi**: `server.js` registra `GET ${BASE_PATH}/init_odessa`, commentato "per test", fuori da `/api`: nessuna API key, nessun rate limiting. A ogni chiamata rilegge tutti i JSON da disco e sostituisce `global.odessaData`.

**Dopo**: endpoint rimosso. Nessun file lo usa (frontend, test, script).

### R4 — Limiter "heavy" su `POST /api/parser/reload`

**Oggi**: `heavyLimiter` (5 richieste al minuto) è definito in `rateLimiter.js` ma non montato. `POST /api/parser/reload` svuota e ricostruisce la cache del lessico ed è limitato solo dal limiter generale (120 al minuto).

**Dopo**: in `server.js`, accanto agli altri limiter specifici:

```js
app.use(BASE_PATH + '/api/parser/reload', heavyLimiter);
```

### R5 — Oggetto ID 11

**Oggi**: `Oggetti.json` contiene l'ID 11 ("Scrivania" / "Desk") con `IDLuogo: null`, in IT ed EN. Le scrivanie del gioco sono l'ID 7 (archivio, luogo 25) e l'ID 40 (saletta segreta, luogo 21); l'ID 11 non corrisponde a nessun oggetto dell'originale e non compare mai.

**Dopo**: i due record ID 11 rimossi. Aggiungere un test di schema su `Oggetti.json`:
- `IDLuogo` intero (non nullo) in ogni record;
- `Attivo` intero tra 0 e 3;
- stessi `ID` in IT e EN.

### R6 — Configurazione e documentazione obsolete

- `.env.example`: rimuovere le tre righe di `DISABLE_RUN_TESTS` (commento compreso): l'endpoint `/api/run-tests` non esiste.
- `README.md`: le tre occorrenze di `localStorage` per la lingua diventano `sessionStorage` (riga del redirect, nota sulla lingua UI, esempio di console). Nell'esempio: `sessionStorage.setItem('linguaSelezionata', '2');`.
- `web/js/index-redirect.js`: commento alla riga 26, `localStorage` → `sessionStorage`.

## 3. File coinvolti

| File | Intervento |
|---|---|
| `src/logic/engine.js` | R1 |
| `src/initOdessa.js` | R2 |
| `src/server.js` | R3, R4 |
| `src/data-internal/Oggetti.json` | R5 |
| `tests/unit/toggle-no-global-mutation.test.ts` (nuovo) | TB-01 |
| `tests/init-odessa.test.ts` (nuovo) | TB-02, TB-03 |
| `tests/oggetti.schema.test.ts` (nuovo) | TB-06 |
| `.env.example`, `README.md`, `web/js/index-redirect.js` | R6 |
| `docs/release-notes/Unreleased.md` | Voce #94 |

## 4. Criteri di accettazione

| ID | Criterio |
|---|---|
| AC-1 | Lint, build, typecheck e test PASS; test esistenti invariati |
| AC-2 | Dopo un toggle, nessun oggetto di `global.odessaData.Interazioni` contiene `_statoPreToggle`; il punteggio della prima apertura resta +3 una sola volta |
| AC-3 | `initOdessa()` con una tabella illeggibile lancia un'eccezione che la nomina; con tutti i file validi carica le 15 tabelle |
| AC-4 | `GET /init_odessa` non è più registrato (`grep -rn "init_odessa" src` vuoto) |
| AC-5 | `POST /api/parser/reload` restituisce 429 oltre la soglia del limiter heavy |
| AC-6 | Nessun oggetto con `IDLuogo` nullo; IT ed EN con gli stessi ID |
| AC-7 | Nessuna occorrenza di `DISABLE_RUN_TESTS` né di `localStorage` riferita alla lingua in `.env.example`, `README.md`, `web/js/` (escluso `marked.min.js`) |

## 5. Testbook

| ID | Caso | Atteso |
|---|---|---|
| TB-01 | Motore nuovo, luogo 44: `premi pulsante` due volte (apri e chiudi), poi ripetere su un secondo motore | Nessuna chiave `_statoPreToggle` negli oggetti di `global.odessaData.Interazioni`; +3 alla prima apertura in ciascun motore, nessun +3 alla chiusura |
| TB-02 | `initOdessa()` con lettura di un file simulata in errore (per esempio con `vi.spyOn(fs, 'readFileSync')` su un solo nome di file) | Eccezione con il nome del file nel messaggio |
| TB-03 | `initOdessa()` con i file reali | 15 tabelle in `global.odessaData`, nessuna eccezione |
| TB-04 | Ricerca di `init_odessa` in `src` | Nessun risultato |
| TB-05 | App Express di test con `heavyLimiter` montato su un endpoint fittizio, `NODE_ENV=test`: 6 richieste | Le prime 5 rispondono 200, la sesta 429. Se il limiter con `max: 5` interferisce con test esistenti, segnalarlo invece di cambiare le soglie |
| TB-06 | Test di schema su `Oggetti.json` | PASS sui dati corretti |
| TB-07 | Avvio reale: `npm run dev` | Il server parte; nel log non compaiono più le righe "Luogo 59 Est" |
| TB-08 | Prova manuale breve: partita nuova, `e`, `n`, `prendi lampada`, poi in biblioteca `sposta quadro` e la combinazione | Gioco invariato |

## 6. Rollback

Revert della PR. I salvataggi esistenti restano compatibili: un salvataggio con l'oggetto ID 11 si carica come prima (l'oggetto resta nello stato caricato ma senza luogo, quindi invisibile).
