/**
 * Test di caratterizzazione — parser (#63, lotto 0 v1.4.2, Fase 1B-2).
 * Specifica: `docs/20261019 - TD Lotto 0 Rete di caratterizzazione - v1.0.md`, §3.5;
 * handoff: `Claude decompiler/20261019 - HO-18 Lotto 0 Rete di caratterizzazione -
 * v1.2.md`, Fase 1B-2.
 *
 * Ambito: rami non coperti di `src/logic/parser.js` (`parseCommand`), raggiungibili
 * con input realistici che un giocatore potrebbe digitare. Solo API pubblica
 * (`parseCommand`), nessun ramo forzato.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { initOdessa } from '../src/initOdessa.js';
import { ensureVocabulary, parseCommand } from '../src/logic/parser.js';

const gameState = { currentLingua: 1 };

describe('Caratterizzazione — parser: rami di parseCommand (#63)', () => {
  beforeAll(async () => {
    await initOdessa();
    await ensureVocabulary();
  });

  it('parseCommand — input di sola punteggiatura ("..."): normalizzato a stringa vuota, nessun token', async () => {
    const result = await parseCommand(null, '...', gameState);
    expect(result.IsValid).toBe(false);
    expect(result.NormalizedInput).toBe('');
    expect(result.Error).toBe('COMMAND_UNKNOWN');
  });

  it('parseCommand — tre token con indice numerico finale ("prendi lampada 2"): NounIndex popolato', async () => {
    const result = await parseCommand(null, 'prendi lampada 2', gameState);
    expect(result.IsValid).toBe(true);
    expect(result.NounIndex).toBe(2);
    expect(result.CanonicalNoun).toBe('LAMPADA');
  });

  it('parseCommand — tre token, primo token non riconosciuto ("xyzzy abc def"): COMMAND_UNKNOWN con UnknownToken', async () => {
    const result = await parseCommand(null, 'xyzzy abc def', gameState);
    expect(result.IsValid).toBe(false);
    expect(result.Error).toBe('COMMAND_UNKNOWN');
    expect(result.UnknownToken).toBe('XYZZY');
  });

  it('parseCommand — verbo seguito da un token non-nome ("prendi nord"): SYNTAX_INVALID_STRUCTURE', async () => {
    const result = await parseCommand(null, 'prendi nord', gameState);
    expect(result.IsValid).toBe(false);
    expect(result.Error).toBe('SYNTAX_INVALID_STRUCTURE');
  });

  it('parseCommand — verbo e nome uniti da punteggiatura senza spazio ("esamina.lampada"): la normalizzazione produce due token dove l\'input originale ne ha uno solo', async () => {
    // normalizeInput sostituisce '.' con uno spazio: "ESAMINA.LAMPADA" -> "ESAMINA LAMPADA"
    // (due token), mentre l'input originale (diviso su spazi veri) resta un solo token.
    // NounLiteral usa quindi il token normalizzato come ripiego (nessun token originale
    // corrispondente all'indice 1).
    const result = await parseCommand(null, 'esamina.lampada', gameState);
    expect(result.IsValid).toBe(true);
    expect(result.CommandType).toBe('ACTION');
    expect(result.CanonicalNoun).toBe('LAMPADA');
    expect(result.NounLiteral).toBe('lampada');
  });

  it('parseCommand — verbo e nome sconosciuto uniti da punteggiatura ("esamina.xyzzy"): SYNTAX_NOUN_UNKNOWN con UnknownNounToken dal token normalizzato', async () => {
    const result = await parseCommand(null, 'esamina.xyzzy', gameState);
    expect(result.IsValid).toBe(false);
    expect(result.Error).toBe('SYNTAX_NOUN_UNKNOWN');
    expect(result.UnknownNounToken).toBe('XYZZY');
  });
});
