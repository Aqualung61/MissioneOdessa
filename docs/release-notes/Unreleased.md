# Missione Odessa – Release Notes (Unreleased)

Data: TBA
Branch: main

## Sintesi
TBD.

## Modifiche
- Dipendenze: aggiornamento del lock npm con `npm audit fix` (#144). Risolte le 6 vulnerabilità delle dipendenze di produzione (`proxy-addr`, `express-rate-limit`, `ip-address`, `path-to-regexp`, `body-parser`, `qs`); `npm audit --omit=dev` ora segnala 0 vulnerabilità. Cambia solo `package-lock.json` (`package.json` invariato): nessuna modifica al codice o al comportamento del gioco. La correzione di `express-rate-limit` chiude l'aggiramento del limitatore di frequenza con indirizzi IPv4-mapped IPv6 (con `TRUST_PROXY` attivo). Restano 3 vulnerabilità delle dipendenze di sviluppo (`vitest`, `@vitest/mocker`, `@vitest/coverage-v8`), non incluse: la correzione richiede il cambio del pin di `@vitest/coverage-v8`. Specifica: `docs/20261022 - TD Aggiornamento lock npm v1.4.3 - v1.0.md`.

## Quality gates
- Build: TBA
- Test (Vitest): TBA

## Note
TBD.
