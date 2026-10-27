/**
 * Accesso ai dati statici di gioco (#63, lotto 5 v1.4.2).
 * Specifica: `Claude decompiler/20261021 - TD Lotto 5 Effetti di turno route e ESLint - v1.2.md`,
 * §3.6 e §5.2 (AC-5), con l'emendamento E-1 (forma `?.`); TD 0 Architettura motore e regole, §4.8.
 *
 * Nessun file di `src/` fuori da `src/logic/core/gameData.js` e `src/initOdessa.js` legge o
 * scrive `global.odessaData` direttamente: tutti passano da `getGameData()`. La verifica è una
 * ricerca testuale (commenti compresi, perciò vanno riformulati).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, relative, sep } from 'node:path';

const root = resolve(__dirname, '..');
const srcDir = join(root, 'src');

const ALLOWED = new Set(['src/logic/core/gameData.js', 'src/initOdessa.js']);
// Forme: global.odessaData, globalThis.odessaData, global?.odessaData (E-1), global['odessaData'], global?.['odessaData']
const DIRECT_ACCESS = /global(This)?\s*(\?\.|\.)\s*odessaData|global(This)?\s*(\?\.)?\s*\[\s*['"]odessaData/;
const SOURCE_EXT = /\.(js|mjs|cjs|ts)$/;

function listSources(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...listSources(full));
    else if (SOURCE_EXT.test(name)) out.push(full);
  }
  return out;
}

describe('Accesso ai dati statici', () => {
  it('la ricerca riconosce le forme di accesso diretto', () => {
    expect(DIRECT_ACCESS.test('const d = global.odessaData;')).toBe(true);
    expect(DIRECT_ACCESS.test('globalThis.odessaData = x')).toBe(true);
    expect(DIRECT_ACCESS.test("global['odessaData']")).toBe(true);
    expect(DIRECT_ACCESS.test('global["odessaData"]')).toBe(true);
    expect(DIRECT_ACCESS.test('global . odessaData')).toBe(true);
    // E-1: forma con concatenamento opzionale (sfuggita alla prima stesura della ricerca)
    expect(DIRECT_ACCESS.test('const lingueRaw = global?.odessaData?.Lingue;')).toBe(true);
    expect(DIRECT_ACCESS.test('globalThis?.odessaData')).toBe(true);
    expect(DIRECT_ACCESS.test("global?.['odessaData']")).toBe(true);
    expect(DIRECT_ACCESS.test('getGameData()?.Lingue')).toBe(false);
    expect(DIRECT_ACCESS.test('getGameData().Luoghi')).toBe(false);
    expect(DIRECT_ACCESS.test('const { odessaData } = body;')).toBe(false);
  });

  it('nessun file di src/ (tranne gameData.js e initOdessa.js) accede direttamente a global.odessaData', () => {
    const files = listSources(srcDir);
    expect(files.length).toBeGreaterThan(50);
    const offenders = files
      .map((f) => relative(root, f).split(sep).join('/'))
      .filter((rel) => !ALLOWED.has(rel))
      .filter((rel) => DIRECT_ACCESS.test(readFileSync(join(root, rel), 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('i due file ammessi esistono', () => {
    for (const rel of ALLOWED) expect(statSync(join(root, rel)).isFile()).toBe(true);
  });
});
