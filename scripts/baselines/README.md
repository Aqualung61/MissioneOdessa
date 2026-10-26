# Generatori delle baseline protette

Questi script producono i fixture protetti sotto `tests/fixtures/`. Si usano **solo** per cambi attesi e dichiarati in una TD: una baseline non si rigenera per far passare un test.

Sono stati verificati con Node 24.22.1 (Windows); la CI gira su Node 20.x e 22.x. Scrivere sempre in una cartella ignorata (ad esempio `output/<nome>/`), mai sopra ai fixture, poi confrontare ed eventualmente copiare il risultato. Il confronto va fatto sui byte del blob committato (`git show origin/main:<percorso>`), perche' la copia di lavoro puo' avere fine riga CRLF.

`<repo>` e' la radice del repository, `<out>` la cartella di output. Eseguire da qualunque cartella.

| Generatore | Produce | Comando | Legge dal repository |
| --- | --- | --- | --- |
| `gen_parse.mjs` | `tests/fixtures/parser/parse_full_baseline.json`, `tests/fixtures/parser/vocabulary_baseline.json` | `node scripts/baselines/gen_parse.mjs <repo> <out-dir>` | `tests/fixtures/parser/parser_baseline.json`, `tests/fixtures/responses/responses_baseline.json` (elenco degli input) |
| `gen_responses.mjs` | `tests/fixtures/responses/responses_baseline.json` | `node scripts/baselines/gen_responses.mjs <repo> <out.json>` | `tests/fixtures/walkthrough/full_it.json`, `full_en.json` |
| `gen_trace.mjs` (+ `scenarios.mjs`) | `tests/fixtures/trace/engine_trace.json` | `node scripts/baselines/gen_trace.mjs <repo> <out-dir>` | `tests/fixtures/walkthrough/*.json`, `walkthrough/save_v140_full_it_step91.json` |
| `gen_http_trace.mjs` | `tests/fixtures/trace/http_trace.json` (e `save_v141_full_it_step91.json`, vedi nota) | `node scripts/baselines/gen_http_trace.mjs <repo> <out-dir>` | `tests/fixtures/walkthrough/*.json`; richiede `node_modules` installato |

`scenarios.mjs` contiene solo i dati degli scenari di `gen_trace.mjs` e non si lancia da solo.

Note:

- `gen_parse.mjs` dipende dai fixture delle risposte: rigenerare prima `responses_baseline.json` se cambia.
- `gen_http_trace.mjs` scrive nella cartella di output due file: `http_trace.json` **e** `save_v141_full_it_step91.json`. Non indicare mai `tests/fixtures/trace/` come cartella di output: sovrascriverebbe anche il salvataggio storico.
- `save_v141_full_it_step91.json` e' un salvataggio storico v1.4.1: l'output di `gen_http_trace.mjs` differisce dal fixture per `timestamp` e `version`, che non vanno rigenerati.
- Mancano i generatori di `parser_baseline.json` e dei fixture di walkthrough.
