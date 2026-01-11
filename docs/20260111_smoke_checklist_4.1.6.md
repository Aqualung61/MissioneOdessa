# Smoke checklist — Sprint 4.1.6 (pre-release)

Obiettivo: verificare rapidamente che la migrazione “thin client + pipeline unica” sia stabile prima della release.

## Setup

- Avvio: `npm run dev`
- URL base: `http://localhost:3001/` (o sotto `BASE_PATH` se configurato)

## Smoke (API)

- `GET /api/version` → `200` e JSON `{ "version": "..." }` coerente con `package.json`.
- `GET /api/luoghi` → `200` e array non vuoto.
- `POST /api/engine/reset` con `{ "idLingua": 1 }` → `200` e `state.currentLocationId=1`.

## Smoke (UI / gameplay)

- Apri `/web/odessa_main.html`.
- Direzione valida (es. NORD/EST/...) → cambia luogo; pannello direzioni aggiornato; nessun errore console.
- Direzione bloccata (muro) → resta nello stesso luogo e mostra messaggio d’errore coerente.
- Entra in un luogo terminale (`Terminale=-1`) → GAME OVER + prompt riavvio.
- Risposta `NO` al prompt → gioco terminato (input disabilitato).
- Risposta `SI` al prompt → ripartenza a luogo 1 e HUD azzerato (luoghi visitati=1, punteggio=1, turn counters=0).

## Compatibilità / legacy

- (Se `DISABLE_LEGACY_ENDPOINTS=1`) verificare che:
  - `POST /api/engine/set-location` → `410 LEGACY_ENDPOINT_DISABLED`
  - `POST /api/parser/parse` → `410` con body `{ "IsValid": false, "Error": "LEGACY_ENDPOINT_DISABLED" }`
