/**
 * Formato delle voci di `help` in inglese (#137).
 * Specifica: docs/20261023 - TD help EN maiuscolo v1.4.3 - v1.0.md (D-2, D-6, AC-H5).
 *
 * Le voci sono mostrate con iniziale maiuscola e resto minuscolo; il comando digitato
 * come mostrato deve avere la stessa interpretazione della voce grezza in maiuscolo.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { ensureVocabulary, parseCommand, resetVocabularyCache } from '../src/logic/parser.js';
import { generateHelpMessage, initializeOriginalData } from '../src/logic/engine.js';

const state = { currentLingua: 2 };

function entriesOf(message: string, section: string): string[] {
  const line = message.split('\n').find((l) => l.startsWith(`<i>${section}: `));
  expect(line, `sezione ${section}`).toBeTruthy();
  return line!.replace(`<i>${section}: `, '').replace('</i>', '').split(', ');
}

describe('help EN: formato delle voci (#137)', () => {
  let message = '';

  beforeAll(async () => {
    initializeOriginalData();
    resetVocabularyCache();
    await ensureVocabulary(state);
    message = generateHelpMessage(2);
  });

  it('ogni voce ha iniziale maiuscola e resto minuscolo (abbreviazione delle direzioni in maiuscolo)', () => {
    for (const section of ['Directions', 'System', 'Actions']) {
      const entries = entriesOf(message, section);
      expect(entries.length).toBeGreaterThan(0);
      for (const entry of entries) {
        expect(entry, entry).toMatch(/^[A-Z][a-z]*( [a-z]+)*( \([A-Z]\))?$/);
      }
    }
  });

  it('le sezioni mantengono ordine alfabetico', () => {
    for (const section of ['Directions', 'System', 'Actions']) {
      const names = entriesOf(message, section).map((e) => e.replace(/ \(.\)$/, ''));
      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'en')));
    }
  });

  it('andata e ritorno: ogni voce digitata come mostrata ha la stessa interpretazione della voce in maiuscolo', async () => {
    const typed: string[] = [];
    for (const section of ['Directions', 'System', 'Actions']) {
      for (const entry of entriesOf(message, section)) {
        const m = /^(.*?)(?: \((.)\))?$/.exec(entry)!;
        typed.push(m[1]);
        if (m[2]) typed.push(m[2]);
      }
    }
    expect(typed.length).toBeGreaterThan(0);
    for (const text of typed) {
      const shown = await parseCommand(null, text, state);
      const raw = await parseCommand(null, text.toUpperCase(), state);
      // Un verbo d'azione senza nome e incompleto (SYNTAX_ACTION_INCOMPLETE), ma mai una parola sconosciuta.
      expect(shown.UnknownToken, text).toBeNull();
      // OriginalInput riporta la digitazione e quindi differisce per costruzione.
      expect({ ...shown, OriginalInput: '' }, text).toEqual({ ...raw, OriginalInput: '' });
    }
  });

  it('help IT invariato nella forma (nessuna voce in maiuscolo grezzo)', () => {
    const it = generateHelpMessage(1);
    expect(it).toContain('<b>Comandi disponibili:</b>');
    expect(it).toContain('Nord');
    expect(it).toContain('Prendi');
  });
});
