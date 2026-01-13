import { describe, expect, it } from 'vitest';

import { ParseErrorType } from '../src/logic/parser.js';
import { mapParseErrorToUserMessage } from '../src/logic/messages.js';
import { getSystemMessage } from '../src/logic/systemMessages.js';

type ParseResultLike = {
  Error: string;
  UnknownNounToken?: string;
};

describe('Issue #55.1 — taxonomy errori e chiavi i18n', () => {
  const languages = [1, 2] as const;

  const requiredKeys = [
    // Già in uso da mapParseErrorToUserMessage
    'parse.error.commandUnknown',
    'parse.error.syntaxActionIncomplete',
    'parse.error.syntaxNounUnknown',
    'parse.error.syntaxNounUnknownGeneric',
    'parse.error.syntaxInvalidStructure',

    // Taxonomy input invalidi (ancora non integrata ovunque)
    'parse.error.invalidInputGeneric',
    'parse.error.emptyInput',
    'parse.error.controlChars',
    'parse.error.lengthOutOfRange',
    'parse.error.notAString',
  ] as const;

  it('ha messaggi IT/EN per tutte le chiavi minime', () => {
    for (const key of requiredKeys) {
      for (const lang of languages) {
        const msg = getSystemMessage(key, lang);
        expect(msg, `${key} lang=${lang}`).not.toMatch(/^\[Missing:/);
        expect(msg, `${key} lang=${lang}`).toBeTypeOf('string');
        expect(msg.trim().length, `${key} lang=${lang}`).toBeGreaterThan(0);
      }
    }
  });

  it('sostituisce i placeholder dove previsto', () => {
    const msgIt = getSystemMessage('parse.error.syntaxNounUnknown', 1, ['chiave']);
    expect(msgIt).toContain('chiave');
    expect(msgIt).not.toContain('{0}');

    const msgEn = getSystemMessage('parse.error.syntaxNounUnknown', 2, ['key']);
    expect(msgEn).toContain('key');
    expect(msgEn).not.toContain('{0}');
  });

  it('mapParseErrorToUserMessage produce un messaggio per gli errori parser noti', () => {
    const knownErrors = [
      ParseErrorType.COMMAND_UNKNOWN,
      ParseErrorType.SYNTAX_ACTION_INCOMPLETE,
      ParseErrorType.SYNTAX_NOUN_UNKNOWN,
      ParseErrorType.SYNTAX_INVALID_STRUCTURE,
    ] as const;

    for (const err of knownErrors) {
      const parseResult: ParseResultLike = { Error: err };
      if (err === ParseErrorType.SYNTAX_NOUN_UNKNOWN) {
        parseResult.UnknownNounToken = 'Chiave';
      }

      for (const lang of languages) {
        const msg = mapParseErrorToUserMessage(parseResult, lang);
        expect(msg, `${err} lang=${lang}`).toBeTypeOf('string');
        expect(msg.trim().length, `${err} lang=${lang}`).toBeGreaterThan(0);
        expect(msg, `${err} lang=${lang}`).not.toMatch(/^\[Missing:/);
      }
    }
  });
});
