// Generatore indipendente dell'istantanea completa del parser.
// Uso: node gen_parse.mjs <repo> <out-dir>
// Input: unione degli input (lingua, testo) del corpus del parser e dell'istantanea delle
// risposte, più un elenco di casi limite. Per ciascuno registra il ParseResult completo
// (campi non nulli, chiavi ordinate), ottenuto con parseCommand(null, input, { currentLingua }).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const repo = resolve(process.argv[2] || '.');
const outDir = resolve(process.argv[3] || '.');
const imp = (p) => import(pathToFileURL(resolve(repo, p)).href);
const quiet = console.log;
console.log = () => {};
const { initOdessa } = await imp('src/initOdessa.js');
const { parseCommand, ensureVocabulary } = await imp('src/logic/parser.js');
await initOdessa();
await ensureVocabulary();
console.log = quiet;

const readJson = (...p) => JSON.parse(readFileSync(resolve(repo, ...p), 'utf8'));
const pairs = new Map();
const add = (lang, input) => {
  const k = `${lang}\u0000${input}`;
  if (!pairs.has(k)) pairs.set(k, { lang, input });
};
for (const c of readJson('tests', 'fixtures', 'parser', 'parser_baseline.json').cases)
  add(c.lang, c.input);
for (const r of readJson('tests', 'fixtures', 'responses', 'responses_baseline.json'))
  add(r.lang, r.input);

// Casi limite (stessi per entrambe le lingue)
const EDGE = [
  '',
  '   ',
  '...',
  '?',
  '? ?',
  'prendi\u0007',
  'a'.repeat(500),
  'a'.repeat(501),
  ' '.repeat(3) + 'nord' + ' '.repeat(3),
  'esamina.lampada',
  'esamina.xyzzy',
  'prendi, lampada',
  'prendi (lampada)',
  '"prendi" lampada',
  'prendi lampada!',
  'prendi lampada 2',
  'prendi lampada 0',
  'prendi lampada 12',
  'prendi 2 lampada',
  'take lamp 2',
  'take 2 lamp',
  'xyzzy abc def',
  'prendi grande tavolo',
  'esamina grande tavolo',
  'examine large table',
  'esamina tavolo grande',
  'prendi la grande tavolo',
  'carica peso',
  'carica il peso',
  'carica',
  'carica peso 2',
  'carica grande tavolo',
  'load weight',
  'load',
  'load large table',
  'nord sud',
  'nord lampada',
  'inventario lampada',
  'aiuto aiuto',
  'lampada',
  'lampada prendi',
  'prendi nord',
  'prendi prendi',
  'prendi lampada torcia',
  'prendi lampada e torcia',
  'prendi la lampada',
  'prendi lo la lampada',
  'il la lo',
  'giu',
  'giù',
  'GIÙ',
  'Giù',
  'su',
  'sù',
  'perchè',
  'è',
  'PRENDI LAMPADA',
  'Prendi Lampada',
  'prendi  lampada',
  '\tprendi lampada',
  'prendi\tlampada',
  'prendi\nlampada',
  'esamina',
  'guarda',
  'dormi',
  'scava',
  'accendi',
  'spegni',
  'scappa',
  'sorridi',
  'siediti',
  'parla',
  'attacca',
  'look',
  'examine',
  'sleep',
  'dig',
  'light',
  'n',
  's',
  'e',
  'o',
  'w',
  'u',
  'd',
  'nord est',
  'a b c d',
  'a b c d e',
  'gira a destra',
  'gira destra',
  'ruota a sinistra',
  'turn right',
  'turn to the left',
  'premi pulsante',
  'press button',
  'metti peso',
  'infila medaglione',
  'porgi documenti',
  'give documents',
  'sposta quadro',
  'move painting',
  'à',
  'ò',
  'ü',
  'ß',
  'ñ',
  '日本',
  '💀',
  'prendi 💀',
  '123',
  '1 2 3',
  'prendi 1',
  '-',
  '--',
  '_',
  'prendi_lampada',
];
for (const lang of [1, 2]) for (const e of EDGE) add(lang, e);

function canon(v) {
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(canon);
  const o = {};
  for (const k of Object.keys(v).sort())
    if (v[k] !== null && v[k] !== undefined) o[k] = canon(v[k]);
  return o;
}

const cases = [];
for (const { lang, input } of pairs.values()) {
  const r = await parseCommand(null, input, { currentLingua: lang });
  const c = canon(r);
  delete c.OriginalInput; // uguale all'input
  cases.push({ lang, input, result: c });
}
cases.sort((a, b) => a.lang - b.lang || (a.input < b.input ? -1 : a.input > b.input ? 1 : 0));
// Input non stringa
const nonString = [];
for (const lang of [1, 2])
  for (const v of [null, undefined, 5, {}, []]) {
    const r = await parseCommand(null, v, { currentLingua: lang });
    nonString.push({
      lang,
      input: v === undefined ? '(undefined)' : JSON.stringify(v),
      result: canon(r),
    });
  }

// Vocabolario costruito da ensureVocabulary, per lingua: token -> info (ordinato per token)
const vocab = {};
for (const lang of [1, 2]) {
  const { tokenMap } = await ensureVocabulary({ currentLingua: lang });
  vocab[lang] = [...tokenMap.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([t, i]) => [t, canon(i)]);
}

mkdirSync(outDir, { recursive: true });
const vtext =
  JSON.stringify({ format: 1, generator: 'gen_parse.mjs', vocab }, null, 0).replace(
    /\],\["/g,
    '],\n["'
  ) + '\n';
writeFileSync(resolve(outDir, 'vocabulary_baseline.json'), vtext);
process.stdout.write(
  `vocabolario IT ${vocab[1].length}, EN ${vocab[2].length} token, sha ${createHash('sha256').update(vtext).digest('hex')}\n`
);
const out = {
  format: 1,
  generator: 'gen_parse.mjs',
  note: 'ParseResult completo: campi non nulli a chiavi ordinate; OriginalInput omesso (uguale a input)',
  cases,
  nonString,
};
const text = JSON.stringify(out, null, 0).replace(/\},\{"lang"/g, '},\n{"lang"') + '\n';
writeFileSync(resolve(outDir, 'parse_full_baseline.json'), text);
process.stdout.write(
  `casi ${cases.length} + ${nonString.length} non stringa, KB ${(text.length / 1024).toFixed(0)}, sha ${createHash('sha256').update(text).digest('hex')}\n`
);
