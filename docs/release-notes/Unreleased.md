# Missione Odessa – Release Notes (Unreleased)

Data: TBA
Branch: `release/v1.4.2`

## v1.4.2 — lotto 0: rete di caratterizzazione

### Sintesi
Refactor del motore, lotto 0: rete di caratterizzazione, nessuna modifica al gioco.

### Modifiche
- Traccia dello stato del motore (42 scenari, 895 passi) e traccia HTTP (8 scenari, 312 richieste) confrontate con fixture registrati sulla v1.4.1, per fissare il comportamento attuale prima del refactor (#63).
- Compatibilità dei salvataggi v1.4.1: formato di salvataggio e caricamento invariati, verificati su un salvataggio al passo 91 del percorso completo IT.
- Test di caratterizzazione sui rami non coperti del motore (azioni, interazioni, stato), del parser e degli effetti di turno, prima che il refactor li tocchi.
- Regole ESLint di complessità in modalità avviso su `src/**/*.js` (passo 1 della #63); strumento di copertura (`npm run test:coverage`) e misure di base per confrontare i lotti successivi.
- Nessun file in `src/` o `web/` modificato: il gioco in produzione resta identico alla v1.4.1.

## Quality gates
- Build: PASS
- Test (Vitest): PASS (473 passed, 17 skipped)
- Lint: PASS (uscita 0)

## Note
- Dettagli completi (copertura prima/dopo, rami residui, candidati issue, misure): vedi i report di Fase 1A, 1B-1 e 1B-2 dell'issue #63.
