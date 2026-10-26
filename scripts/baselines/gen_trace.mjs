// Generatore indipendente della traccia di stato (v1.4.2, lotto 0).
// Uso: node gen_trace.mjs <repo> <out-dir>
// Scrive <out-dir>/engine_trace.json. Importa dal repository solo l'API pubblica:
// initOdessa, loadMessaggiSistema, ensureVocabulary, parseCommand, createEngine.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { ENGINE_SCENARIOS, RESUME_SCENARIOS } from './scenarios.mjs';

const repo = resolve(process.argv[2] || '.');
const outDir = resolve(process.argv[3] || '.');
const imp = (p) => import(pathToFileURL(resolve(repo, p)).href);

const { initOdessa } = await imp('src/initOdessa.js');
const { loadMessaggiSistema } = await imp('src/logic/systemMessages.js');
const { ensureVocabulary, parseCommand } = await imp('src/logic/parser.js');
const { createEngine } = await imp('src/logic/engine.js');

const quiet = console.log; console.log = () => {};
await initOdessa(); loadMessaggiSistema(); await ensureVocabulary();
console.log = quiet;

const fixture = (...p) => JSON.parse(readFileSync(resolve(repo, 'tests', 'fixtures', ...p), 'utf8'));
const walk = (name) => fixture('walkthrough', `${name}.json`).steps.map((s) => s.command);

// JSON canonico: chiavi ordinate, Set/Map come array, funzioni e undefined omessi
function canon(v) {
  if (v === null || typeof v !== 'object') return v;
  if (v instanceof Set) return [...v].map(canon);
  if (v instanceof Map) return canon(Object.fromEntries(v));
  if (Array.isArray(v)) return v.map((x) => (typeof x === 'function' || x === undefined ? null : canon(x)));
  const o = {};
  for (const k of Object.keys(v).sort()) {
    if (typeof v[k] === 'function' || v[k] === undefined) continue;
    o[k] = canon(v[k]);
  }
  return o;
}
const sha = (v) => createHash('sha256').update(JSON.stringify(canon(v))).digest('hex');

// Snapshot normalizzato: senza timestamp e versione dell'applicazione
function snap(engine) {
  const s = engine.getGameStateSnapshot();
  delete s.timestamp; delete s.version;
  return s;
}

function compact(s, initialPos) {
  const moved = {};
  const inv = [];
  for (const o of s.Oggetti) {
    if (o.IDLingua !== s.currentLingua) continue;
    if (o.IDLuogo === 0) inv.push(o.ID);
    const k = `${o.ID}`;
    const cur = [o.IDLuogo, o.Attivo];
    const ini = initialPos[`${o.IDLingua}:${o.ID}`];
    if (!ini || ini[0] !== cur[0] || ini[1] !== cur[1]) moved[k] = cur;
  }
  return canon({
    loc: s.currentLocationId,
    turns: s.turn.totalTurnsConsumed,
    gturn: s.turn.globalTurnNumber,
    score: s.punteggio.totale,
    darkness: s.turn.darknessTimer,
    openArea: s.turn.openAreaTimer,
    guard: s.guardTimer,
    timers: s.timers,
    narrative: s.narrativeState,
    flags: s.flags,
    open: s.openStates,
    toggles: s.direzioniToggle,
    unlocked: s.direzioniSbloccate,
    seq: s.sequenze,
    inv: inv.sort((a, b) => a - b),
    moved,
    end: { victory: s.victory, ended: s.ended, awaitingRestart: s.awaitingRestart, awaitingEndConfirm: s.awaitingEndConfirm, awaitingContinue: s.awaitingContinue, movementBlocked: s.movementBlocked },
  });
}

function newEngine(lingua) {
  const e = createEngine();
  e.initializeOriginalData();
  e.resetGameState(lingua);
  return e;
}

function initialPositions(engine) {
  const m = {};
  for (const o of engine.getGameStateSnapshot().Oggetti) m[`${o.IDLingua}:${o.ID}`] = [o.IDLuogo, o.Attivo];
  return m;
}

async function step(engine, input) {
  const parsed = await parseCommand(null, input, engine.getGameState());
  const result = engine.executeCommand(parsed);
  return { parsed, result };
}

function record(i, input, parsed, result, s, initialPos) {
  return {
    i,
    input,
    parse: { valid: parsed.IsValid, type: parsed.CommandType, verb: parsed.VerbConcept, noun: parsed.NounConcept, error: parsed.Error },
    result: canon(result),
    state: compact(s, initialPos),
    sha: sha({ parsed, result, state: s }),
  };
}

function withEnv(env, fn) {
  const saved = {};
  for (const k of Object.keys(env || {})) { saved[k] = process.env[k]; process.env[k] = env[k]; }
  return fn().finally(() => {
    for (const k of Object.keys(saved)) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }
  });
}

const out = { format: 1, generator: 'gen_trace.mjs', normalization: 'snapshot senza timestamp e version; JSON canonico a chiavi ordinate; sha = SHA-256 di {parsed, result, state}', scenarios: [] };

for (const sc of ENGINE_SCENARIOS) {
  const engine = newEngine(sc.lingua);
  const initialPos = initialPositions(engine);
  if (sc.prefix) for (const c of walk(sc.prefix.walkthrough).slice(0, sc.prefix.upTo)) await step(engine, c);
  const env = { ...(sc.env || {}) };
  if (sc.envFromTurns) env.GAME_MAX_TURNS_CONSUMED = String(engine.getGameState().turn.totalTurnsConsumed + sc.envFromTurns);
  const commands = sc.walkthrough ? walk(sc.walkthrough) : sc.commands;
  const steps = [];
  const start = sc.prefix ? sc.prefix.upTo : 0;
  await withEnv(env, async () => {
    if (sc.prefix) steps.push({ i: start, input: null, state: compact(snap(engine), initialPos), sha: sha({ state: snap(engine) }) });
    let i = start;
    for (const c of commands) {
      const { parsed, result } = await step(engine, c);
      steps.push(record(++i, c, parsed, result, snap(engine), initialPos));
    }
  });
  out.scenarios.push({ id: sc.id, lingua: sc.lingua, prefix: sc.prefix || null, env, steps });
}

for (const sc of RESUME_SCENARIOS) {
  const commands = walk(sc.walkthrough);
  let saved;
  if (sc.saveFile) {
    saved = fixture(...sc.saveFile.split('/')).gameState;
  } else {
    const e = newEngine(sc.lingua);
    for (const c of commands.slice(0, sc.saveAt)) await step(e, c);
    saved = JSON.parse(JSON.stringify(e.getGameStateSnapshot()));
  }
  const engine = newEngine(sc.lingua);
  const initialPos = initialPositions(engine);
  engine.setGameState(JSON.parse(JSON.stringify(saved)));
  const steps = [{ i: sc.saveAt, input: null, state: compact(snap(engine), initialPos), sha: sha({ state: snap(engine) }) }];
  let i = sc.saveAt;
  for (const c of commands.slice(sc.saveAt)) {
    const { parsed, result } = await step(engine, c);
    steps.push(record(++i, c, parsed, result, snap(engine), initialPos));
  }
  out.scenarios.push({ id: sc.id, lingua: sc.lingua, resume: { walkthrough: sc.walkthrough, saveAt: sc.saveAt, saveFile: sc.saveFile || null }, steps });
}

mkdirSync(outDir, { recursive: true });
const text = JSON.stringify(out, null, 1) + '\n';
writeFileSync(resolve(outDir, 'engine_trace.json'), text);
const n = out.scenarios.reduce((a, s) => a + s.steps.length, 0);
process.stdout.write(`scenari ${out.scenarios.length}, passi ${n}, KB ${(text.length / 1024).toFixed(0)}, sha ${createHash('sha256').update(text).digest('hex')}\n`);
