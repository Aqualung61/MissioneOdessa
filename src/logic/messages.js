// Mappatura ParseErrorType -> messaggio utente localizzato
// Fonte: docs/20251103 - REQ01.md, Sezione 2.4.2
// Sprint 1: i18n - usa MessaggiSistema.json

import { getSystemMessage } from './systemMessages.js';

// Dettaglio di INVALID_INPUT -> chiave del messaggio (unica tabella: usata anche dalle route, TD Lotto 5 D-5-7).
const INVALID_INPUT_KEYS = new Map([
  ['EMPTY_INPUT', 'parse.error.emptyInput'],
  ['CONTROL_CHARS', 'parse.error.controlChars'],
  ['LENGTH_OUT_OF_RANGE', 'parse.error.lengthOutOfRange'],
  ['NOT_A_STRING', 'parse.error.notAString'],
]);

// Codice di errore del parser -> chiave del messaggio (casi senza parametri).
const PARSE_ERROR_KEYS = new Map([
  ['COMMAND_UNKNOWN', 'parse.error.commandUnknown'],
  ['SYNTAX_ACTION_INCOMPLETE', 'parse.error.syntaxActionIncomplete'],
  ['SYNTAX_INVALID_STRUCTURE', 'parse.error.syntaxInvalidStructure'],
]);

/**
 * Chiave del messaggio per un dettaglio di input non valido (qualsiasi altro valore → generico).
 * @param {string} details - ParseResult.Details / dettaglio del validatore
 * @returns {string}
 */
export function invalidInputMessageKey(details) {
  return INVALID_INPUT_KEYS.get(details) ?? 'parse.error.invalidInputGeneric';
}

function unknownNounMessage(parseResult, idLingua) {
  const noun = parseResult?.UnknownNounToken;
  if (noun) {
    return getSystemMessage('parse.error.syntaxNounUnknown', idLingua, [noun.toLowerCase()]);
  }
  return getSystemMessage('parse.error.syntaxNounUnknownGeneric', idLingua);
}

export function mapParseErrorToUserMessage(parseResult, idLingua = 1) {
  const code = parseResult?.Error || 'NONE';
  if (code === 'INVALID_INPUT') {
    return getSystemMessage(invalidInputMessageKey(parseResult?.Details), idLingua);
  }
  if (code === 'SYNTAX_NOUN_UNKNOWN') return unknownNounMessage(parseResult, idLingua);
  const key = PARSE_ERROR_KEYS.get(code);
  return key ? getSystemMessage(key, idLingua) : '';
}

export default { mapParseErrorToUserMessage };
