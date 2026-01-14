# 2026-01-14 — Issue #58: Invarianti (Scoring / Game Over / Intercettazione)

Questa nota definisce **invarianti minime** per rendere più verificabile e robusta la logica di:
- **punteggio** (scoring)
- **game over** (stato terminale + flusso di riavvio)
- **intercettazione** (danger zones + morte per permanenza)

Contesto: Issue #58 (milestone 1.3.2).

---

## 1) Invarianti punteggio

### I58.1.A — Dominio e monotonicità (partita attiva)
- **Dominio:** `state.punteggio.totale` è un numero intero $\ge 1$.
- **Monotonicità (partita attiva):** finché la partita è **attiva** (cioè `awaitingRestart=false` e `ended=false`), il punteggio **non diminuisce**.
  - Sono ammessi incrementi (es. nuovi luoghi visitati, interazioni con punteggio, misteri risolti) oppure nessuna variazione.

Nota: dopo un **reset** (riavvio confermato) il punteggio riparte dalla baseline iniziale e quindi può risultare inferiore al punteggio della partita precedente.

### I58.1.B — Idempotenza su eventi “una tantum”
- **Luoghi:** visitare un luogo già presente in `visitedPlaces` **non** deve incrementare il punteggio.
- **Interazioni con punteggio:** un’ID già presente in `punteggio.interazioniPunteggio` **non** deve ri-assegnare punti.
- **Misteri:** una chiave già presente in `punteggio.misteriRisolti` **non** deve ri-assegnare punti.

---

## 2) Invarianti game over e flusso riavvio

### I58.1.C — Stato terminale: awaitingRestart
- Quando una condizione di game over è soddisfatta, lo stato deve diventare coerente con:
  - `state.awaitingRestart === true`
  - la risposta engine deve indicare game over (es. `resultType='GAME_OVER'` o equivalente lato API)

### I58.1.D — Policy comandi post-game-over (API)
- In modalità API (`/api/engine/execute`), se `state.awaitingRestart === true`, la richiesta:
  - **bypassa** parser/command DTO (quindi `parseResult=null`, `command=null`)
  - interpreta l’input come conferma (SI/NO) per `confirmRestart()`

---

## 3) Invarianti intercettazione (danger zones)

### I58.1.E — Concetto
- `turn.turnsInDangerZone` rappresenta **solo** turni che consumano tempo trascorsi in danger zone.
- Il game over per intercettazione si innesca quando `turn.turnsInDangerZone` raggiunge la soglia prevista (attualmente 4).

Nota: questa sezione definisce l’invariante a livello concettuale. I test di dettaglio (sequenze, edge cases, reset contatore su uscita) sono nel piano Sprint #58.3.

---

## Tracciabilità

- Documento operativo issue: [docs/20260113_nextsteps.md](20260113_nextsteps.md)
- Test invarianti (Sprint #58.1): [tests/scoring.invariants.test.ts](../tests/scoring.invariants.test.ts)
