// Mappatura ParseErrorType -> messaggio utente (IT)
// Fonte: docs/20251103 - REQ01.md, Sezione 2.4.2

export function mapParseErrorToUserMessage(parseResult) {
  const code = parseResult?.Error || 'NONE';
  switch (code) {
    case 'COMMAND_UNKNOWN':
      return '?NON CAPISCO QUESTA PAROLA.';
    case 'SYNTAX_ACTION_INCOMPLETE':
      return '?COSA VUOI?';
    case 'SYNTAX_NOUN_UNKNOWN': {
      const noun = parseResult?.UnknownNounToken;
      if (noun) return `?NON VEDO NESSUN "${noun}" QUI.`;
      return '?NON VEDO QUESTO OGGETTO QUI.';
    }
    case 'SYNTAX_INVALID_STRUCTURE':
      return '?NON CAPISCO.';
    case 'NONE':
    default:
      return '';
  }
}

export default { mapParseErrorToUserMessage };
