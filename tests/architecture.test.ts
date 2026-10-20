/**
 * Test di architettura (#63, lotto 4a v1.4.2).
 * Specifica: TD Lotto 4a Gestori di verbo v1.0, §5.1.
 *
 * 1. `src/logic/core/**` non importa da `src/game/**` (import statici e dinamici).
 * 2. Ordine degli `id` dei gestori = tabella di precedenza di TD §4.
 * 3. Forma dei gestori: `id` unici, `types` validi, `run` funzione.
 * 4. Copertura del lessico: concetti di NAVIGAZIONE e SISTEMA tutti gestiti.
 * 5. `createEngine()` e `createEngine(odessaGame)` danno le stesse risposte.
 * 6. `rules.hasActiveLight` è la funzione riesportata da `torchEffect.js`.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join, relative, sep } from 'node:path';
import { initOdessa } from '../src/initOdessa.js';
import { ensureVocabulary, parseInput } from '../src/logic/parser.js';
import { createEngine } from '../src/logic/engine.js';
import { odessaGame } from '../src/game/odessa/index.js';
import * as rules from '../src/game/odessa/rules.js';
import { hasFonteLuceAttiva } from '../src/logic/turnEffects/torchEffect.js';
import { HANDLED_NAV_CONCEPTS, directionFieldFor } from '../src/logic/core/handlers/navigation.js';
import { HANDLED_SYSTEM_CONCEPTS } from '../src/logic/core/handlers/system.js';
import TerminiLessico from '../src/data-internal/TerminiLessico.json';
import TipiLessico from '../src/data-internal/TipiLessico.json';

const root = resolve(__dirname, '..');
const coreDir = resolve(root, 'src', 'logic', 'core');
const gameDir = resolve(root, 'src', 'game');

const EXPECTED_HANDLER_IDS = [
  'core.nav.unknownDirection',
  'odessa.nav.collapsedPassage',
  'odessa.nav.blockedWithText',
  'core.nav.move',
  'core.system',
  'odessa.action.darkness',
  'odessa.action.lightMatches',
  'odessa.action.loadWeight',
  'odessa.action.spegni',
  'odessa.action.scappa',
  'odessa.action.sorridi',
  'odessa.action.dormi',
  'odessa.action.parla',
  'odessa.action.attackGuard',
  'odessa.action.lightGeneric',
  'odessa.action.lightTorch',
  'odessa.action.dig',
  'core.action.interaction',
  'odessa.action.rotateDirection',
  'odessa.action.rotateKnob',
  'odessa.action.moveObject',
  'odessa.action.examineSpecial',
  'core.action.examine',
  'core.action.openClose',
  'core.action.take',
  'core.action.drop',
  'core.action.fallback',
];

function listJsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...listJsFiles(full));
    else if (full.endsWith('.js')) out.push(full);
  }
  return out;
}

function importSpecifiers(source: string): string[] {
  const specs: string[] = [];
  const patterns = [
    /\bimport\s+[^'"]*?\bfrom\s*['"]([^'"]+)['"]/g, // import x from '…'
    /\bexport\s+[^'"]*?\bfrom\s*['"]([^'"]+)['"]/g, // export … from '…'
    /\bimport\s*['"]([^'"]+)['"]/g,                  // import '…'
    /\bimport\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,      // import('…')
  ];
  for (const re of patterns) {
    for (const m of source.matchAll(re)) specs.push(m[1]);
  }
  return specs;
}

function lexiconConcepts(nomeTipo: string): string[] {
  const tipo = TipiLessico.find((t) => t.NomeTipo === nomeTipo);
  if (!tipo) throw new Error(`Tipo di lessico ${nomeTipo} non trovato`);
  return TerminiLessico.filter((t) => t.ID_TipoLessico === tipo.ID_TipoLessico).map((t) => t.Concetto);
}

describe('Architettura del motore (#63, lotto 4a, TD §5.1)', () => {
  it('1. nessun file di src/logic/core importa da src/game (statici e dinamici)', () => {
    const files = listJsFiles(coreDir);
    expect(files.length).toBeGreaterThan(0);
    const violations: string[] = [];
    for (const file of files) {
      for (const spec of importSpecifiers(readFileSync(file, 'utf8'))) {
        const target = spec.startsWith('.') ? resolve(dirname(file), spec) : spec;
        const insideGame = spec.startsWith('.')
          ? !relative(gameDir, target).startsWith('..')
          : /(^|[/\\])game[/\\]/.test(spec);
        if (insideGame) violations.push(`${relative(root, file).split(sep).join('/')} → ${spec}`);
      }
    }
    expect(violations).toEqual([]);
  });

  it('2. l\'elenco dei gestori segue la precedenza di TD §4', () => {
    expect(odessaGame.verbHandlers.map((h) => h.id)).toEqual(EXPECTED_HANDLER_IDS);
  });

  it('3. id unici, types validi e non vuoti, run è una funzione', () => {
    const ids = odessaGame.verbHandlers.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
    const allowed = ['NAVIGATION', 'SYSTEM', 'ACTION'];
    for (const h of odessaGame.verbHandlers) {
      expect(Array.isArray(h.types) && h.types.length > 0, h.id).toBe(true);
      for (const t of h.types) expect(allowed, `${h.id}: ${t}`).toContain(t);
      expect(typeof h.run, h.id).toBe('function');
      if ('match' in h && h.match !== undefined) expect(typeof h.match, h.id).toBe('function');
    }
  });

  it('4a. ogni concetto di NAVIGAZIONE del lessico è mappato da core.nav.*', () => {
    const concepts = lexiconConcepts('NAVIGAZIONE');
    expect([...concepts].sort()).toEqual([...HANDLED_NAV_CONCEPTS].sort());
    for (const c of concepts) expect(directionFieldFor(c), c).not.toBeNull();
  });

  it('4b. ogni concetto di SISTEMA del lessico è gestito da core.system', () => {
    const concepts = lexiconConcepts('SISTEMA');
    expect([...concepts].sort()).toEqual([...HANDLED_SYSTEM_CONCEPTS].sort());
  });

  describe('motore', () => {
    beforeAll(async () => {
      await initOdessa();
      await ensureVocabulary();
    });

    it('4c. ogni concetto di SISTEMA produce una risposta di core.system (non il ripiego di dispatch)', () => {
      for (const c of HANDLED_SYSTEM_CONCEPTS) {
        const engine = createEngine();
        engine.initializeOriginalData();
        engine.resetGameState(1);
        const r = engine.executeCommand({ IsValid: true, CommandType: 'SYSTEM', VerbConcept: c, CanonicalVerb: c });
        expect(r.resultType, c).not.toBe('ERROR');
      }
    });

    it('5. createEngine() e createEngine(odessaGame) rispondono allo stesso modo', async () => {
      const commands = [
        'inventario', 'guarda', 'est', 'ovest', 'ovest', 'prendi torcia', 'accendi', 'nord',
        'esamina quadro', 'apri botola', 'apri botola', 'posa torcia', 'sorridi', 'dormi',
        'scava', 'gira manopola', 'punti', 'aiuto', 'parla', 'xyz',
      ];
      const a = createEngine();
      const b = createEngine(odessaGame);
      for (const e of [a, b]) {
        e.initializeOriginalData();
        e.resetGameState(1);
      }
      for (const c of commands) {
        const ra = a.executeCommand(await parseInput(c, a.getGameState()));
        const rb = b.executeCommand(await parseInput(c, b.getGameState()));
        expect(JSON.stringify(rb), c).toBe(JSON.stringify(ra));
      }
      // Lo snapshot contiene l'ora di creazione: si confronta tutto il resto.
      const sa = { ...a.getGameStateSnapshot(), timestamp: null };
      const sb = { ...b.getGameStateSnapshot(), timestamp: null };
      expect(JSON.stringify(sb)).toBe(JSON.stringify(sa));
    });
  });

  it('6. rules.hasActiveLight è la funzione riesportata da torchEffect.js', () => {
    expect(hasFonteLuceAttiva).toBe(rules.hasActiveLight);
    expect(odessaGame.rules.hasActiveLight).toBe(rules.hasActiveLight);
  });
});
