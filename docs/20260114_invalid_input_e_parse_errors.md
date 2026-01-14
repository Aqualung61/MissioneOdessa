# Contratti API: invalid input e parse errors (Issue #55)

Questo documento riassume il comportamento **atteso e testato** degli endpoint che gestiscono input utente (`input: string`) quando:

- l’input è **invalido** (vuoto, control chars, lunghezza fuori range, non-stringa)
- l’input è valido come tipo, ma il parser produce un **parse error** (verbo sconosciuto, sostantivo sconosciuto, struttura non parsabile, …)

## Terminologia

- **Invalid input**: l’input non è accettabile *prima* di tentare il parsing.
- **Parse error**: il parsing è stato eseguito ma l’input non è interpretabile secondo lessico/grammatica.

## Taxonomy: invalid input (`Details`)

La validazione preliminare è centralizzata (`validateCommandInput`), con codici coerenti tra endpoint:

`Details`/`details` contiene **un singolo valore** (non una lista), uno tra:

- `EMPTY_INPUT` (vuoto o solo spazi)
- `CONTROL_CHARS` (caratteri di controllo)
- `LENGTH_OUT_OF_RANGE` (troppo corto/lungo rispetto ai limiti)
- `NOT_A_STRING` (payload non conforme)

Nota: i limiti di payload e rate limiting sono documentati in README e nelle note di security.

## Taxonomy: parse errors (`Error`)

Il parser usa codici di errore stabili (vedi anche requisiti HL):

- `COMMAND_UNKNOWN` (verbo/token iniziale sconosciuto)
- `SYNTAX_NOUN_UNKNOWN` (ACTION valido, ma NOUN sconosciuto)
- `SYNTAX_INVALID_STRUCTURE` (struttura non parsabile)

Campi diagnostici (quando disponibili):

- `UnknownToken` (token sconosciuto per `COMMAND_UNKNOWN`)
- `UnknownNounToken` (token NOUN sconosciuto per `SYNTAX_NOUN_UNKNOWN`)

## Endpoint: `POST /api/engine/execute` (target)

Questo è l’endpoint **raccomandato** per l’input del gioco (parsing + esecuzione).

### Invalid input

- **HTTP 400**
- envelope:

```json
{
  "ok": false,
  "error": "INVALID_INPUT",
  "details": "EMPTY_INPUT",
  "userMessage": "...",
  "parseResult": { "IsValid": false, "Error": "INVALID_INPUT", "Details": "EMPTY_INPUT" }
}
```

### Parse error

- **HTTP 400**
- envelope:

```json
{
  "ok": false,
  "error": "COMMAND_UNKNOWN|SYNTAX_NOUN_UNKNOWN|SYNTAX_INVALID_STRUCTURE|...",
  "userMessage": "... (i18n)",
  "parseResult": {
    "IsValid": false,
    "Error": "...",
    "UnknownToken": "...",
    "UnknownNounToken": "..."
  }
}
```

### Messaggi utente (i18n)

L’engine **non deve propagare stringhe tecniche** come testo utente quando `parseResult.IsValid !== true`.

Il mapping dei messaggi user-facing passa da `mapParseErrorToUserMessage` e usa chiavi `parse.error.*` definite in `src/data-internal/MessaggiSistema.json`.

Esempi di chiavi:

- `parse.error.commandUnknown`
- `parse.error.syntaxNounUnknown` (usa placeholder con token NOUN sconosciuto, normalizzato)
- `parse.error.syntaxInvalidStructure`

## Endpoint legacy: `POST /api/parser/parse`

Endpoint **deprecato** e disabilitabile (`DISABLE_LEGACY_ENDPOINTS=1` → `410`).

### Invalid input

- **HTTP 400**
- envelope legacy:

```json
{
  "IsValid": false,
  "Error": "INVALID_INPUT",
  "Details": "EMPTY_INPUT"
}
```

### Parse error

- **HTTP 200** (contratto legacy)
- envelope:

```json
{
  "IsValid": false,
  "Error": "COMMAND_UNKNOWN|SYNTAX_NOUN_UNKNOWN|SYNTAX_INVALID_STRUCTURE|...",
  "UnknownToken": "...",
  "UnknownNounToken": "..."
}
```

## Test e regressioni

Copertura introdotta/estesa per garantire stabilità del contratto:

- unit test parser: `tests/parser.test.ts`
- contract test engine: `tests/api.engine.execute.contract.test.ts`
- contract test legacy parser: `tests/api.parser.parse.contract.test.ts`

Obiettivo: evitare regressioni (es. ritorno 500) e prevenire leak di diagnostica in messaggi utente.
