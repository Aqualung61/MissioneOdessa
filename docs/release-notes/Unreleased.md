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

## v1.4.2 — lotto 1: pulizia ed endpoint legacy

### Sintesi
Rimozione degli endpoint legacy del motore e del parser, limitazione di `GET /api/parser/stats`/`POST /api/parser/reload` fuori produzione, migrazione di `tsconfig.json` a NodeNext, pulizia di codice e configurazione morti. Nessuna modifica al motore, al parser o ai dati di gioco.

### Modifiche
- Rimossi `POST /api/engine/set-location` e `POST /api/parser/parse` (il frontend non li usava): rispondono come qualunque route inesistente. Rimosso il meccanismo `DISABLE_LEGACY_ENDPOINTS` (header `Deprecation`/`Sunset` compresi) (#124).
- `GET /api/parser/stats` e `POST /api/parser/reload` disponibili solo con `NODE_ENV` diverso da `production` (#124).
- `tsconfig.json` migrato da `module`/`moduleResolution` `node10` a `NodeNext` (#125).
- Rimossi `src/tests/` (file morti, dipendenza `sqlite3` non installata), `src/git-sync.ts`/`.js` (script interattivo non referenziato), lo script `check:nav` e i riferimenti correlati (#126).
- Documentazione e configurazione di esempio aggiornate di conseguenza (README, `.env.example`, `AGENTS.md`).

## Quality gates
- Build: PASS
- Test (Vitest): PASS (473 passed, 17 skipped — lotto 1 Fase 1A, test non ancora aggiornati; vedi report di Fase 1B per il conteggio finale)
- Lint: PASS (uscita 0)

## Note
- Dopo il deploy della v1.4.2, eliminare la variabile `DISABLE_LEGACY_ENDPOINTS` da Railway (impostata a `1` il 2026-10-19 come misura provvisoria, non più necessaria).
- Dettagli completi (copertura prima/dopo, rami residui, candidati issue, misure): vedi i report delle issue #63 (lotto 0) e #124/#125/#126 (lotto 1).
