// Mappatura ParseErrorType -> messaggio utente localizzato
// Fonte: docs/20251103 - REQ01.md, Sezione 2.4.2
// Sprint 1: i18n - usa MessaggiSistema.json

import { getSystemMessage } from './systemMessages.js';

export function mapParseErrorToUserMessage(parseResult, idLingua = 1) {
  const code = parseResult?.Error || 'NONE';
  switch (code) {
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
