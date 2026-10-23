# TD — Formato delle voci di `help` in inglese (v1.4.3, #137)

| Campo | Valore |
|---|---|
| Documento | Specifica tecnica (TD) |
| Versione | v1.0 — bozza, da approvare da Mauro Giorgi |
| Issue | #137 (esistente; milestone v1.4.3, etichetta `i18n`) |
| Baseline | `release/v1.4.3`; `main` @ `5b98269` (v1.4.2, in produzione) |
| Fonte | "Stato avanzamento" (note aperte; decisione di Mauro del 2026-10-21). Il corpo di #137 e la TD del lotto 6 non sono nel progetto: la Fase 0 di HO-27 legge #137, il perimetro qui sotto è provvisorio finché non è riscontrato |
| Handoff | HO-27, lotto B |

## 1. Valutazione del rischio di regressione

**Livello complessivo: basso-medio.** Cambia l'output di `help` EN, quindi l'istantanea delle risposte (88.151 risposte): modifica deliberata, da tenere circoscritta e verificabile in modo meccanico.

| Area | Rischio | Perché | Contenimento |
|---|---|---|---|
| Istantanea delle risposte | Medio (cambio atteso) | È l'unico file di baseline che deve cambiare | Differenze solo nelle voci di `help` EN; per ogni voce, testo vecchio e nuovo uguali a meno di maiuscole e minuscole (AC-H2); risposte IT identiche (AC-H4) |
| Tracce motore e HTTP, salvataggi | Basso | *Da verificare:* se le tracce contengono output di `help` EN | SHA invariati; se una traccia cambia, fermarsi e riferire (AC-H3) |
| Parser e vocabolario (baseline 12.966 + 10 casi, vocabolario, corpus 5.080) | Basso | La correzione è di presentazione. Rischio solo se il parser dipende dalla forma maiuscola mostrata (ipotesi da escludere) | Nessuna modifica a dati lessicali né al parser; SHA dei baseline invariati; prova di andata e ritorno (AC-H5) |
| Architettura (`core/` generico) | Basso | `tests/architecture.test.ts` vieta riferimenti a Odessa in `core/` | Correzione generica; test senza modifiche (AC-H7) |
| Testi IT (`aiuto`) | Basso | Non toccati | Risposte IT identiche |

**Rollback:** revert della PR, poi nuovo deploy. Nessun effetto sui salvataggi (`help` non scrive stato; da verificare).

## 2. Contesto

- Dalle note di progetto: `help` EN mostra le voci in maiuscolo (voci lessicali grezze); `aiuto` IT applica `capitalizeCommand`, che mappa solo alcuni concetti e mescola imperativo e infinito.
- Decisione di Mauro (2026-10-21): sinonimi no; correggere il maiuscolo di `help` EN; la questione imperativo/infinito è la Q1 della TD del lotto 6. Il suo stato non è ricavabile dai documenti disponibili: qui resta fuori perimetro.

## 3. Decisioni

| # | Decisione | Motivazione |
|---|---|---|
| D-1 | Perimetro: solo le voci mostrate da `help` EN. `aiuto` IT, sinonimi, elenco e ordine delle voci invariati | Decisione del 2026-10-21 |
| D-2 | Formato: iniziale maiuscola e resto minuscolo; una voce a più parole mantiene la sola iniziale della prima (`ABC DEF` diventa `Abc def`). Analogo a ciò che `aiuto` IT fa per i concetti mappati. **Da approvare** (alternativa: tutto minuscolo) | Coerenza con la resa IT |
| D-3 | Correzione al livello di presentazione, nel punto in cui `help` compone l'elenco (atteso `core/help.js`, da verificare). Nessuna modifica ai dati lessicali né al parser. Se serve toccarli, fermarsi | Rischio parser nullo |
| D-4 | L'istantanea delle risposte si rigenera solo con il meccanismo esistente e solo dopo aver verificato che le differenze siano quelle attese. Nessun'altra istantanea o fixture si rigenera | Eccezione puntuale al divieto di rigenerare |
| D-5 | Q1 (imperativo/infinito) fuori perimetro. Verificare che il corpo di #137 non rimandi più a "Q1" (la correzione risulta eseguita in Fase 2 di HO-25) | Perimetro |
| D-6 | Un test nuovo (file nuovo, convenzione dei test esistenti) attesta il formato delle voci di `help` EN e la prova di andata e ritorno | Rete di sicurezza della correzione |
| D-7 | Qualsiasi altro test protetto che fallisca per effetto della modifica: fermarsi e riferire | Solo l'istantanea è autorizzata a cambiare |

## 4. Fuori perimetro

`aiuto` IT, imperativo/infinito, sinonimi, `capitalizeCommand`, parser, `web/`, #128 (spostata a v1.4.4), qualsiasi modifica a dati di gioco.

## 5. Criteri di accettazione

| # | Criterio |
|---|---|
| AC-H1 | Diff in `src/` limitato al punto di presentazione di `help`; nessuna modifica a dati di gioco, parser, `web/`, `package.json`, lock |
| AC-H2 | Istantanea delle risposte: le sole differenze sono le voci di `help` EN; elenco completo delle voci modificate nel report; per ciascuna, vecchio e nuovo testo coincidono a meno di maiuscole e minuscole (verifica con script temporaneo) |
| AC-H3 | Baseline parser, vocabolario, corpus, tracce motore e HTTP, salvataggi: SHA invariati. Se una traccia contiene `help` EN e cambia, riportarlo e fermarsi |
| AC-H4 | Voci IT dell'istantanea identiche |
| AC-H5 | Prova di andata e ritorno: ogni comando elencato da `help` EN, digitato come mostrato, ha la stessa interpretazione di prima |
| AC-H6 | Lint a 0 avvisi, typecheck PASS, build PASS; test: 675 passed / 17 skipped invariati più i nuovi, 3 esecuzioni consecutive |
| AC-H7 | `tests/architecture.test.ts` PASS senza modifiche |
| AC-H8 | CI `build-test` verde su Node 18.20.x e 20.x sulla PR |
| AC-H9 | Facoltativo: il Kit di verifica v1.4.2 (`gen_responses`) su `release/v1.4.3`, confrontato con v1.4.2, mostra differenze solo in `help` EN; si allega nella chat di gate |

## 6. Questioni aperte

- **Q1.** Formato D-2 (iniziale maiuscola, resto minuscolo): sì o no?
- **Q2.** Stato di Q1 della TD del lotto 6 (imperativo/infinito): se già deciso diversamente, indicarlo; qui resta fuori.
- **Q3.** Le voci di `help` EN comprendono solo i comandi o anche direzioni e voci di sistema? La correzione si applica a tutte le voci mostrate in maiuscolo; la Fase 1 le elenca.
