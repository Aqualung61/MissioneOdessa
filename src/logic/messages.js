// Mappatura ParseErrorType -> messaggio utente localizzato
// Fonte: docs/20251103 - REQ01.md, Sezione 2.4.2
// Sprint 1: i18n - usa MessaggiSistema.json

import { getSystemMessage } from './systemMessages.js';

export function mapParseErrorToUserMessage(parseResult, idLingua = 1) {
  const code = parseResult?.Error || 'NONE';
  switch (code) {
    case 'INVALID_INPUT': {
      const details = parseResult?.Details;
      switch (details) {
        case 'EMPTY_INPUT':
          return getSystemMessage('parse.error.emptyInput', idLingua);
        case 'CONTROL_CHARS':
          return getSystemMessage('parse.error.controlChars', idLingua);
        case 'LENGTH_OUT_OF_RANGE':
          return getSystemMessage('parse.error.lengthOutOfRange', idLingua);
        case 'NOT_A_STRING':
          return getSystemMessage('parse.error.notAString', idLingua);
        default:
          return getSystemMessage('parse.error.invalidInputGeneric', idLingua);
      }
    }
    case 'COMMAND_UNKNOWN':
      return getSystemMessage('parse.error.commandUnknown', idLingua);
    case 'SYNTAX_ACTION_INCOMPLETE':
      return getSystemMessage('parse.error.syntaxActionIncomplete', idLingua);
    case 'SYNTAX_NOUN_UNKNOWN': {
      const noun = parseResult?.UnknownNounToken;
      if (noun) {
        return getSystemMessage('parse.error.syntaxNounUnknown', idLingua, [noun.toLowerCase()]);
      }
      return getSystemMessage('parse.error.syntaxNounUnknownGeneric', idLingua);
    }
    case 'SYNTAX_INVALID_STRUCTURE':
      return getSystemMessage('parse.error.syntaxInvalidStructure', idLingua);
    case 'NONE':
    default:
      return '';
  }
}

export default { mapParseErrorToUserMessage };
