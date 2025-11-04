import { describe, it, expect } from 'vitest';
import { mapParseErrorToUserMessage } from '../src/logic/messages.js';

describe('Messaggi utente (REQ01 2.4.2)', () => {
  it('COMMAND_UNKNOWN => ?NON CAPISCO QUESTA PAROLA.', () => {
    const msg = mapParseErrorToUserMessage({ Error: 'COMMAND_UNKNOWN' });
    expect(msg).toBe('?NON CAPISCO QUESTA PAROLA.');
  });

  it('SYNTAX_ACTION_INCOMPLETE => ?COSA VUOI?', () => {
    const msg = mapParseErrorToUserMessage({ Error: 'SYNTAX_ACTION_INCOMPLETE' });
    expect(msg).toBe('?COSA VUOI?');
  });

  it('SYNTAX_NOUN_UNKNOWN con token => specifica oggetto', () => {
    const msg = mapParseErrorToUserMessage({ Error: 'SYNTAX_NOUN_UNKNOWN', UnknownNounToken: 'AAA' });
    expect(msg).toBe('?NON VEDO NESSUN "AAA" QUI.');
  });

  it('SYNTAX_INVALID_STRUCTURE => ?NON CAPISCO.', () => {
    const msg = mapParseErrorToUserMessage({ Error: 'SYNTAX_INVALID_STRUCTURE' });
    expect(msg).toBe('?NON CAPISCO.');
  });
});
