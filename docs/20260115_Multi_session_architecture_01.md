# Missione Odessa — Multi-session architecture (per-tab)

Data: 2026-01-15

## Scopo
Rendere l’app web utilizzabile da più utenti concorrenti (o più tab) senza condividere lo stato della partita.

Questo è un prerequisito per finalizzare correttamente l’i18n runtime su `/web/odessa_main.html` e sugli endpoint `/api/engine/*`.

## Problema (as-is)
- L’engine mantiene stato globale in memoria (singleton). Due utenti/tab si influenzano.
- Alcuni endpoint di load/save possono mutare strutture globali (es. dati di gioco caricati in memoria), introducendo effetti cross-user.

Effetti pratici:
- Smoke test non affidabili: una tab può “cambiare lingua” o stato all’altra.
- Qualsiasi lavoro i18n che dipende dalla lingua “corrente di partita” rischia regressioni.

## Vincoli e assunti
- No cookie.
- Isolamento per tab: una nuova tab deve creare una nuova sessione.
- La sessione/partita nasce alla prima chiamata a `/api/engine/*`.
- Il client persiste gli id in `sessionStorage` (non `localStorage`) per mantenere l’isolamento per tab.
- Lingua:
  - oggi default IT;
  - in futuro selezionabile in `odessa_storia.html`;
  - immutabile durante la partita (cambio lingua ⇒ nuova partita).

## Modello ID proposto
- `sessionId`: stabile per tab.
- `gameId`: cambia ad ogni restart/reset e ad ogni “nuova partita”.

### Trasporto
- Request headers:
  - `X-Session-Id: <uuid>` (opzionale; se assente il server ne genera uno)
  - `X-Game-Id: <uuid>` (opzionale; se assente il server ne genera uno)
- Response headers:
  - `X-Session-Id: <uuid>` (sempre)
  - `X-Game-Id: <uuid>` (sempre)

### Self-healing
- Se mancano header o sono invalidi, il server genera id validi e li ritorna.
- Se `X-Session-Id` esiste ma la sessione è scaduta/inesistente, il server ricrea sessione e ritorna nuovi header.

## Architettura target (to-be)
### Session manager
Introdurre un componente server-side (in memoria) che gestisce:
- mappa `sessionId → { gameId, engineState, metadata }`
- TTL/inattività (opzionale; per ora basta in-memory senza persistenza)

### Engine state per sessione
- Lo stato dell’engine non deve essere un singleton globale.
- Ogni sessione deve avere il proprio `gameState`.

### Dati globali condivisi
- I dataset statici (`src/data-internal/*.json`) possono restare globali e condivisi.
- È vietato che un endpoint “per utente” muti `global.odessaData` (o equivalenti) in modo visibile ad altre sessioni.

## API: impatti previsti
- Tutti gli endpoint `/api/engine/*` devono leggere/scrivere lo stato della sessione identificata da header.
- `POST /api/engine/reset` deve:
  - creare un nuovo `gameId` per la sessione;
  - resettare solo lo stato della sessione;
  - non toccare le altre sessioni.
- Save/Load:
  - deve essere scoped alla sessione;
  - evitare che il load “rimpiazzi” dataset globali condivisi.

## Diagrammi

### As-is (stato globale)
```mermaid
flowchart LR
  subgraph Client
    A[Tab A] -->|/api/engine/*| S
    B[Tab B] -->|/api/engine/*| S
  end
  subgraph Server
    S[Express]
    E[Engine singleton\n(gameState globale)]
    S --> E
  end
```

### To-be (per-session)
```mermaid
flowchart LR
  subgraph Client
    A[Tab A\n(sessionStorage: sessionIdA, gameIdA)] -->|X-Session-Id, X-Game-Id| S
    B[Tab B\n(sessionStorage: sessionIdB, gameIdB)] -->|X-Session-Id, X-Game-Id| S
  end
  subgraph Server
    S[Express]
    M[SessionManager\n(sessionId → state)]
    EA[Engine state A]
    EB[Engine state B]
    S --> M
    M --> EA
    M --> EB
  end
```

## Piano di implementazione (sintesi)
1. Definire contratti header (`X-Session-Id`, `X-Game-Id`) e self-healing.
2. Introdurre `SessionManager` in `src/` e refactor dell’engine per accettare uno stato per sessione.
3. Aggiornare `src/api/engineRoutes.js` per usare la sessione.
4. Smoke test: due tab concorrenti non si influenzano.

## Rischi
- Regressioni su save/load e reset (sono i punti con più “effetti collaterali”).
- Test esistenti potrebbero assumere singleton: aggiornare i contract test dove necessario.
