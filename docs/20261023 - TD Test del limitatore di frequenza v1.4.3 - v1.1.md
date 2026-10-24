# TD — Test di integrazione del limitatore di frequenza (v1.4.3)

| Campo | Valore |
|---|---|
| Documento | Specifica tecnica (TD) |
| Versione | v1.1 — bozza, da approvare da Mauro Giorgi |
| Revisioni | v1.0 bozza; v1.1 (2026-10-23): esiti della Fase 1 di HO-27. C-4 non dipende dalla correzione (misurato sul lock di `5b98269`); C-6 misurato e incluso come caso discriminante (D-4); test su mini-app con il limitatore reale (D-1, D-7); AC-L5 riformulato; Q1, Q2, Q3 chiuse |
| Issue | #147 (milestone v1.4.3, etichetta `type:test`) |
| Baseline | `release/v1.4.3` @ `bdcd397` (lock aggiornato con la PR #145, merge `6d432ff`; regola npm e TD HO-26 con la PR #146); `main` @ `5b98269` (v1.4.2, in produzione) |
| Fonte | TD Aggiornamento lock npm v1.1 (§1, §2, Q1); "Stato avanzamento" (debiti dopo v1.4.2); Report Fase 1 di HO-27 |
| Handoff | HO-27, lotto A |

## 1. Valutazione del rischio di regressione

**Livello complessivo: basso.** Si aggiunge un solo file di test. Nessuna modifica a `src/`, `web/`, `package.json`, lock, fixture o test esistenti. I rischi riguardano la qualità del test, non il comportamento del gioco.

| Area | Rischio | Perché | Contenimento |
|---|---|---|---|
| Codice di produzione | Nullo | Nessun file di `src/` toccato | SHA di `src/` e `package*.json` invariati |
| Suite esistente (675 passed / 17 skipped) | Basso | Un test che avvia il limitatore attivo può interferire con gli altri (porte, contatori condivisi, variabili d'ambiente, moduli già caricati) quando vitest esegue i file in parallelo | Isolamento: app in-process dedicata, chiavi proprie per ogni caso, nessuno stato condiviso; 675/17 invariati per 3 esecuzioni consecutive |
| Instabilità del nuovo test (flaky) | Medio-basso | Il limitatore dipende da contatori e finestra temporale; CI su Node 18.20.x e 20.x | Nessuna attesa della scadenza della finestra, nessun timer reale; ogni caso usa chiavi (IP) proprie; 3 esecuzioni locali consecutive e CI verde (Fase 1: file di 5 test in circa 210 ms) |
| Falsa sicurezza | Medio | Un test scritto sul comportamento osservato può congelare un comportamento errato, o non distinguere prima e dopo la correzione | Esiti attesi fissati in D-4 prima della misura; prova di sensibilità (AC-L5): il caso discriminante è C-6 |
| Copertura del cablaggio | Medio | Il test usa una mini-app: non verifica che `server.js` imposti `trust proxy` da `TRUST_PROXY` né che monti i limitatori sulle route | Fuori perimetro; il limite è dichiarato nel corpo della PR |
| Durata della suite | Basso | Fino a soglia + 1 richieste per caso | Durata del file riportata nel report |

**Rollback:** revert della PR (solo test).

## 2. Contesto

- La PR #145 ha aggiornato il lock: `express-rate-limit` 8.7.1, `ip-address` 10.7.4, `proxy-addr` 2.0.8 (prima 8.2.1, 10.0.1, 2.0.7). La misura di Fase 1 mostra che la differenza di comportamento riguarda gli indirizzi IPv4-mapped IPv6 (C-6): la chiave IPv6 a /56 (C-4) era già attiva sul lock precedente.
- Configurazione di produzione nota: `TRUST_PROXY=1` (un solo proxy, Railway), `RATE_LIMIT_DISABLED=0`.
- Q1 accertata in Fase 1: due test esistenti eseguono un limitatore attivo (`tests/api.ratelimit.test.ts`, `tests/api.ratelimit.heavy.test.ts`), entrambi su mini-app e senza `trust proxy` né `X-Forwarded-For`. La chiave del client dietro proxy non era coperta.
- Obiettivo: rete di sicurezza automatica sulla chiave con cui il limitatore identifica il client dietro `trust proxy` = 1, che renda visibile una regressione della correzione.

## 3. Decisioni

| # | Decisione | Motivazione |
|---|---|---|
| D-1 | Solo test: un nuovo file in `tests/` (`tests/api.ratelimit.xforwardedfor.test.ts`). Nessuna modifica a `src/` | Perimetro "solo test" |
| D-2 | Configurazione del test = produzione simulata: limitatore attivo, `trust proxy` = 1. Soglia e finestra si leggono dalla configurazione effettiva (intestazione `RateLimit-Limit`), non si fissano nel test | Il test non deve divergere dalla configurazione reale |
| D-3 | Nessuna attesa della finestra, nessun timer reale; ogni caso usa chiavi proprie | Stabilità, durata |
| D-4 | Casi nella tabella sotto; C-6 incluso (decisione di Mauro, 2026-10-23) | C-6 è l'unico caso che distingue il lock vecchio dal nuovo |
| D-5 | Nessuna modifica a test esistenti, fixture, `tests/testUtils/**` | Reti di sicurezza protette |
| D-6 | PR verso `release/v1.4.3`, `Refs #147`, non unita da Claude Code | Flusso vigente |
| D-7 | Il test usa una mini-app Express con il vero `heavyLimiter` e `trust proxy` = 1 riprodotto nel test: `server.js` non è importabile in-process. Il test protegge dipendenze e limitatore, non il cablaggio di `server.js` | Vincolo tecnico accertato in Fase 1 |

**Casi (D-4).**

| # | Caso | Esito atteso | Misura Fase 1 (lock nuovo / lock `5b98269`) |
|---|---|---|---|
| C-1 | Stesso IPv4 oltre la soglia | La richiesta soglia + 1 riceve 429; le precedenti no | come atteso / come atteso |
| C-2 | IPv4 diverso mentre il primo è bloccato | Non limitato: contatore indipendente | come atteso / come atteso |
| C-3 | `X-Forwarded-For` a più voci con voci a sinistra diverse e stessa ultima voce | Contatore condiviso: con `trust proxy` = 1 la chiave è l'ultima voce | come atteso / come atteso |
| C-4 | Due indirizzi IPv6 che differiscono solo nei bit bassi, nella stessa /56 | Contatore condiviso | come atteso / come atteso (caso di rete generale, non discriminante) |
| C-5 | Due indirizzi IPv6 in /56 diverse | Contatori indipendenti | come atteso / come atteso |
| C-6 | Indirizzo IPv4-mapped IPv6 (forma puntata ed esadecimale) e IPv4 dello stesso indirizzo, in entrambe le direzioni | Contatore condiviso | condiviso / **non condiviso** (discriminante) |

## 4. Fuori perimetro

Modifiche a `src/` o alla configurazione del limitatore; cablaggio di `server.js` (`trust proxy` da `TRUST_PROXY`, montaggio dei limitatori sulle route); l'avviso di `proxy-addr` sulle subnet fidate (la produzione usa il conteggio dei salti, non una lista di subnet: deduzione, non provata); test su `body-parser`, `path-to-regexp`, `qs`; gestione frontend del 429 (#138); i 3 residui di sviluppo; migrazione Node/npm.

## 5. Criteri di accettazione

| # | Criterio |
|---|---|
| AC-L1 | Il diff contiene un solo file nuovo in `tests/` (più la TD in `docs/`); `src/`, `web/`, `package.json`, `package-lock.json`, fixture, test esistenti e `tests/testUtils/**` invariati (SHA) |
| AC-L2 | Q1 documentata (fatto in Fase 1) |
| AC-L3 | Tabella atteso/misurato per C-1…C-6 (fatto in Fase 1 per C-1…C-6; C-6 ora anche nel file) |
| AC-L4 | Test nuovi PASS per 3 esecuzioni consecutive; suite esistente 675 passed / 17 skipped invariata; lint a 0 avvisi; typecheck PASS (file nuovo incluso); build PASS |
| AC-L5 | Sensibilità: il file completo (C-1…C-6), eseguito sull'albero con il lock di `5b98269`, fallisce su C-6 e passa su C-1…C-5; sul lock nuovo passa tutto. Se C-6 non fallisce sul lock precedente, fermarsi e riferire |
| AC-L6 | Nessuna dipendenza dal tempo (nessuna attesa della finestra); durata del file riportata |
| AC-L7 | CI `build-test` verde su Node 18.20.x e 20.x sulla PR |
| AC-L8 | Il corpo della PR dichiara il limite di copertura: mini-app, non il cablaggio di `server.js` |

## 6. Questioni aperte

- **Q1.** Chiusa: due test esistenti eseguono un limitatore attivo, nessuno copre la chiave dietro proxy.
- **Q2.** Chiusa: C-6 incluso (decisione di Mauro, 2026-10-23).
- **Q3.** Chiusa: il limitatore è esercitabile su mini-app senza toccare `src/`; il cablaggio di `server.js` resta fuori perimetro (D-7).
