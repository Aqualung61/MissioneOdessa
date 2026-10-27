// Misura la memoria per sessione dei motori creati con createEngine() (TB-08, issue #91).
// Uso: node --expose-gc scripts/measure-session-memory.mjs
// Esce con codice 1 se le soglie di AC-5 sono superate.

import { initOdessa } from '../src/initOdessa.js';
import { createEngine } from '../src/logic/engine.js';
import { ensureVocabulary, parseInput } from '../src/logic/parser.js';

const SESSIONS = 1000;
const MAX_ACTIVE_KB = 30;
const MAX_RELEASED_KB = 2;
const COMMANDS = [
  'e',
  'n',
  'prendi lampada',
  'accendi lampada',
  's',
  'esamina documenti',
  'inventario',
  'punti',
];

if (typeof global.gc !== 'function') {
  console.error('Eseguire con: node --expose-gc scripts/measure-session-memory.mjs');
  process.exit(2);
}

function heapUsedKb() {
  global.gc();
  global.gc();
  return process.memoryUsage().heapUsed / 1024;
}

await initOdessa();
await ensureVocabulary();

const parsed = [];
for (const cmd of COMMANDS) {
  parsed.push(await parseInput(cmd));
}

// Riscaldamento: compila il bytecode condiviso prima della misura.
{
  const warm = createEngine();
  warm.initializeOriginalData();
  warm.resetGameState(1);
  for (const p of parsed) warm.executeCommand(p);
}

const baseline = heapUsedKb();

let engines = [];
for (let i = 0; i < SESSIONS; i++) {
  const engine = createEngine();
  engine.initializeOriginalData();
  engine.resetGameState(1);
  for (const p of parsed) engine.executeCommand(p);
  engines.push(engine);
}
const active = heapUsedKb();

engines = null;
const released = heapUsedKb();

const activePerSession = (active - baseline) / SESSIONS;
const releasedPerSession = (released - baseline) / SESSIONS;

console.log(`Sessioni: ${SESSIONS}, comandi per sessione: ${COMMANDS.length}`);
console.log(`Per sessione attiva: ${activePerSession.toFixed(1)} KB (soglia ${MAX_ACTIVE_KB} KB)`);
console.log(
  `Dopo il rilascio:    ${releasedPerSession.toFixed(2)} KB (soglia ${MAX_RELEASED_KB} KB)`
);

if (activePerSession > MAX_ACTIVE_KB || releasedPerSession > MAX_RELEASED_KB) {
  console.error('FAIL: soglie AC-5 superate');
  process.exit(1);
}
console.log('PASS');
