# TD — Aggiornamento del lock delle dipendenze npm (v1.4.3)

| Campo | Valore |
|---|---|
| Documento | Specifica tecnica (TD) |
| Versione | v1.0 — bozza, da approvare da Mauro Giorgi |
| Issue | Da creare in Fase 0 di HO-26 (milestone v1.4.3, etichetta `type:chore`) |
| Baseline | `main` @ `5b98269` (v1.4.2, in produzione dal 2026-10-22) |
| Fonte | "Stato avanzamento", sezione "Dipendenze npm": `npm audit` e prova in worktree del 2026-10-22. I dati non sono stati rieseguiti per questa TD; l'handoff li rimisura |
| Handoff | HO-26 |

## 1. Valutazione del rischio di regressione

**Livello complessivo: basso, con un punto non coperto dai test (limitatore di frequenza).** Nessun file di `src/`, dati di gioco, test o fixture viene toccato; cambia solo `package-lock.json`.

| Area | Rischio | Perché | Contenimento |
|---|---|---|---|
| Dipendenze di produzione (6 pacchetti) | Basso | Salti di minor/patch entro i range di `package.json`. Nella prova in worktree: lint, typecheck, build e 675 passed / 17 skipped (incluse le tracce HTTP) PASS | Rieseguire tutto sul risultato reale della Fase 1 |
| Limitatore di frequenza (`express-rate-limit`, `ip-address`, `proxy-addr`) | Medio-basso | La correzione riguarda proprio la chiave di limitazione per IPv6: il comportamento in produzione cambia per costruzione. *Da verificare:* se i test eseguono il limitatore attivo (`RATE_LIMIT_DISABLED`) | Prova comportamentale prima/dopo con limitatore attivo (429); log di avvio senza avvisi `ERR_ERL_*` |
| Limite del corpo (`body-parser`) | Basso | `JSON_BODY_LIMIT=256kb` è valido; la correzione riguarda solo valori non validi | Prova prima/dopo: corpo oltre il limite e JSON non valido |
| Dipendenze di sviluppo (lock) | Basso-medio | `npm audit fix` muove anche pacchetti di sviluppo (nella prova +562/−667 righe di lock): possibile deriva entro i range di `eslint`, `typescript`, `vitest` | Confronto di `npm ls --depth=0` prima/dopo; `lint` con `--max-warnings 0` |
| Compatibilità Node/npm | Medio-basso | Il lock è prodotto con npm 11 (npm 10.9.4 va in errore su `audit fix`). CI su Node 18.20.x e 20.x e Railway su Node 20.20.2 usano presumibilmente npm 10.x (*da verificare*): devono leggere il lock con `npm ci`. I pacchetti aggiornati possono dichiarare `engines.node` superiori a 18.20 | `npm ci` nella CI (entrambe le versioni); confronto degli `engines` dei pacchetti cambiati |
| Salvataggi, dati, istantanee, parser | Nullo | Nessun file interessato | SHA dei file protetti invariati |

**Rollback:** revert della PR (solo lock), poi nuovo deploy. Nessuna migrazione, nessun cambio di formato dei salvataggi.

## 2. Contesto

`npm audit` su `5b98269` (2026-10-22): 31 vulnerabilità (3 critical, 22 high). **In produzione 6** (`npm audit --omit=dev`):

| Pacchetto | Versione attuale | Problema (da `npm audit`) | Versione nella prova |
|---|---|---|---|
| `proxy-addr` | 2.0.7 | critical: spoofing dell'IP con subnet IPv4-mapped IPv6 | 2.0.8 |
| `express-rate-limit` | 8.2.1 | aggiramento del limitatore su IPv6 | 8.7.1 |
| `ip-address` | 10.0.1 | aggiramento del limitatore su IPv6 | 10.7.4 |
| `path-to-regexp` | 8.3.0 | ReDoS su pattern con wildcard o gruppi opzionali | 8.4.2 |
| `body-parser` | 2.2.1 | un limite non valido disattiva il controllo | 2.3.0 |
| `qs` | 6.14.1 | non descritto nello Stato avanzamento: l'handoff lo rileva da `npm audit` | 6.16.1 |

Esposizione **dedotta dal codice** (non provata): bassa (`trust proxy` = 1 hop, route senza wildcard, `JSON_BODY_LIMIT` valido, nessun `urlencoded`); la più concreta è l'aggiramento del limitatore. Le versioni della colonna finale non sono un requisito: il requisito è l'esito di `npm audit` (§5).

Prova in worktree (2026-10-22, npm 11): `npm audit fix` cambia solo `package-lock.json`, `package.json` invariato, produzione a 0 vulnerabilità. Restano 3 vulnerabilità di sviluppo (`vitest`, `@vitest/mocker`, `@vitest/coverage-v8`): la correzione richiede `@vitest/coverage-v8` 4.0.5 → 4.1.12 (pin esatto del lotto 0) e quindi `--force`.

## 3. Decisioni

| # | Decisione | Motivazione |
|---|---|---|
| D-1 | Solo `package-lock.json`: `npm audit fix` **senza** `--force`, con npm 11.19.1 (npm locale) | Decisione di Mauro del 2026-10-22; npm 10.9.4 va in errore |
| D-2 | `package.json` invariato; se `audit fix` lo modifica, ripristinare lock e `package.json`, fermarsi e riferire | Garantisce che il perimetro resti "solo lock" |
| D-3 | I 3 residui di sviluppo restano aperti e dichiarati nella PR; nessun cambio al pin di `@vitest/coverage-v8` | Cambio deliberato e separato |
| D-4 | Nessun aggiornamento di fixture, istantanee o baseline; nessun test modificato | Il risultato deve essere identico a `5b98269` |
| D-5 | Prova comportamentale prima/dopo su tre comportamenti HTTP (429 con limitatore attivo, corpo oltre il limite, JSON non valido) e sul log di avvio | Copre il punto che i test potrebbero non esercitare |
| D-6 | Branch di integrazione `release/v1.4.3` creato da `5b98269`; PR con `--base release/v1.4.3` e `Refs`; un solo merge finale su `main` con merge commit e `Fixes` (flusso di lavoro vigente) | Coerenza con il flusso concordato; `release/**` non avvia deploy Railway |

**Conseguenza di D-6:** la correzione raggiunge la produzione solo con il rilascio v1.4.3. Con esposizione dedotta bassa è accettabile; se il rilascio dovesse slittare, valutare un rilascio anticipato del solo lock.

## 4. Fuori perimetro

- `npm audit fix --force`, qualunque modifica a `package.json`, bump di `vitest` o `@vitest/coverage-v8`.
- Migrazione di Node (produzione su Node 20, CI su 18.20.x e 20.x, entrambe fuori supporto): argomento separato.
- Codice di `src/`, `web/`, test, fixture. Se esiste un `package-lock.json` separato (per esempio in `web/`), segnalarlo nel report senza modificarlo.

## 5. Criteri di accettazione

| # | Criterio |
|---|---|
| AC-1 | `package.json` identico alla baseline (SHA e `git diff` vuoto) |
| AC-2 | Il diff del codice contiene solo `package-lock.json`; nella PR si aggiungono solo la TD in `docs/` e la voce in `docs/release-notes/Unreleased.md` |
| AC-3 | `npm audit --omit=dev`: 0 vulnerabilità. `npm audit`: nessuna vulnerabilità oltre le 3 di sviluppo note (`vitest`, `@vitest/mocker`, `@vitest/coverage-v8`). Se `audit` ne mostra altre (banca dati aggiornata), riportarle e fermarsi |
| AC-4 | `npm ci` da zero senza errori; `npm ls` senza errori; `lockfileVersion` invariato; nessun `resolved` fuori dal registro npm |
| AC-5 | Lint (0 avvisi), typecheck, build PASS; `npm test`: 675 passed, 17 skipped, 3 esecuzioni consecutive; SHA dei file protetti e delle fixture invariati (nessuna rigenerazione) |
| AC-6 | Prova comportamentale: i tre comportamenti sono equivalenti a prima (stesso stato HTTP e stessa forma del corpo di errore), salvo differenze motivate e riportate; log di avvio senza `ERR_ERL_*` |
| AC-7 | Elenco dei pacchetti cambiati con `engines.node` non compatibile con 18.20.x o 20.x: vuoto, oppure riportato e sottoposto a decisione |
| AC-8 | CI `build-test` verde su Node 18.20.x e 20.x sulla PR |
| AC-9 | Versioni dirette (`npm ls --depth=0`) prima/dopo riportate; ogni variazione elencata |

## 6. Questioni aperte

- **Q1.** I test eseguono il limitatore attivo? Se no, AC-6 è l'unica copertura del cambio di comportamento IPv6. L'handoff chiede di accertarlo nel codice.
- **Q2.** Versione di npm usata dalla CI e da Railway: da verificare (workflow e log di build). Se `npm ci` fallisce in CI con il lock di npm 11, fermarsi e riferire.
- **Q3.** Un'eventuale issue di follow-up sui 3 residui di sviluppo non è creata in questa TD: decisione a Mauro.
