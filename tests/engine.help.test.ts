import { describe, it, expect, beforeAll } from 'vitest';
import { ensureVocabulary, parseCommand } from '../src/logic/parser.js';
import { executeCommand, generateHelpMessage, initializeOriginalData } from '../src/logic/engine.js';
import Introduzione from '../src/data-internal/Introduzione.json';
import LessicoSoftware from '../src/data-internal/LessicoSoftware.json';
import Lingue from '../src/data-internal/Lingue.json';
import Luoghi from '../src/data-internal/Luoghi.json';
import LuoghiLogici from '../src/data-internal/LuoghiLogici.json';
import Oggetti from '../src/data-internal/Oggetti.json';
import Piattaforme from '../src/data-internal/Piattaforme.json';
import Software from '../src/data-internal/Software.json';
import TerminiLessico from '../src/data-internal/TerminiLessico.json';
import TipiLessico from '../src/data-internal/TipiLessico.json';
import VociLessico from '../src/data-internal/VociLessico.json';

describe('Engine: Comando HELP/AIUTO', () => {
  beforeAll(async () => {
    global.odessaData = {
      Introduzione,
      LessicoSoftware,
      Lingue,
      Luoghi,
      LuoghiLogici,
      Oggetti,
      Piattaforme,
      Software,
      TerminiLessico,
      TipiLessico,
      VociLessico,
    };
    initializeOriginalData();
    await ensureVocabulary();
  });

  it('generateHelpMessage genera messaggio con tutte le sezioni', () => {
    const message = generateHelpMessage(1);
    
    expect(message).toContain('<b>Comandi disponibili:</b>');
    expect(message).toContain('<i>Direzioni:');
    expect(message).toContain('<i>Sistema:');
    expect(message).toContain('<i>Azioni:');
    expect(message).toContain('<b>Oggetti nel gioco:</b>');
    expect(message).toContain('</i>');
  });

  it('generateHelpMessage include comandi di direzione', () => {
    const message = generateHelpMessage(1);
    
    expect(message).toContain('Nord');
    expect(message).toContain('Sud');
    expect(message).toContain('Est');
    expect(message).toContain('Ovest');
  });

  it('generateHelpMessage include comandi di sistema', () => {
    const message = generateHelpMessage(1);
    
    expect(message).toContain('Inventario');
    expect(message).toContain('Aiuto');
    expect(message).toContain('Salva');
    expect(message).toContain('Carica');
  });

  it('generateHelpMessage include verbi azione', () => {
    const message = generateHelpMessage(1);
    
    expect(message).toContain('Prendi');
    expect(message).toContain('Esamina');
  });

  it('generateHelpMessage include oggetti del gioco', () => {
    const message = generateHelpMessage(1);
    
    // Verifica che ci siano oggetti elencati con formattazione
    expect(message).toMatch(/<b>Oggetti nel gioco:<\/b>\n<i>.+<\/i>/);
  });

  it('AIUTO viene riconosciuto e eseguito correttamente', async () => {
    const parsed = await parseCommand(null, 'AIUTO');
    expect(parsed.IsValid).toBe(true);
    expect(parsed.CommandType).toBe('SYSTEM');
    
    const res = executeCommand(parsed);
    expect(res.accepted).toBe(true);
    expect(res.resultType).toBe('OK');
    expect(res.message).toContain('<b>Comandi disponibili:</b>');
    expect(res.showLocation).toBe(true);
  });

  it('HELP viene riconosciuto come sinonimo di AIUTO', async () => {
    const parsed = await parseCommand(null, 'HELP');
    expect(parsed.IsValid).toBe(true);
    expect(parsed.CommandType).toBe('SYSTEM');
    expect(parsed.CanonicalVerb).toBe('AIUTO');
    
    const res = executeCommand(parsed);
    expect(res.accepted).toBe(true);
    expect(res.resultType).toBe('OK');
    expect(res.message).toContain('<b>Comandi disponibili:</b>');
    expect(res.showLocation).toBe(true);
  });
});
