// Generatore indipendente della traccia HTTP.
// Uso: node gen_http_trace.mjs <repo> <out-dir>
// Monta in-process i router di produzione (/api, /api/engine) ed errorHandler; nessun endpoint legacy.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';

const repo = resolve(process.argv[2] || '.');
const outDir = resolve(process.argv[3] || '.');
const imp = (p) => import(pathToFileURL(resolve(repo, p)).href);

const express = (await imp('node_modules/express/index.js')).default;
const { initOdessa } = await imp('src/initOdessa.js');
const { loadMessaggiSistema } = await imp('src/logic/systemMessages.js');
const { ensureVocabulary } = await imp('src/logic/parser.js');
const engineRoutes = (await imp('src/api/engineRoutes.js')).default;
const apiRoutes = (await imp('src/api/routes.js')).default;
const errorHandler =
  (await imp('src/middleware/errorHandler.js')).errorHandler ??
  (await imp('src/middleware/errorHandler.js')).default;

mkdirSync(outDir, { recursive: true });
const quiet = console.log;
console.log = () => {};
await initOdessa();
loadMessaggiSistema();
await ensureVocabulary();

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use('/api/engine', engineRoutes);
app.use('/api', apiRoutes);
app.use(errorHandler);
const server = await new Promise((ok) => {
  const s = app.listen(0, '127.0.0.1', () => ok(s));
});
const base = `http://127.0.0.1:${server.address().port}`;

const walk = (name) =>
  JSON.parse(
    readFileSync(resolve(repo, 'tests', 'fixtures', 'walkthrough', `${name}.json`), 'utf8')
  ).steps.map((s) => s.command);

function canon(v) {
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(canon);
  const o = {};
  for (const k of Object.keys(v).sort()) if (v[k] !== undefined) o[k] = canon(v[k]);
  return o;
}
const sha = (v) =>
  createHash('sha256')
    .update(JSON.stringify(canon(v)))
    .digest('hex');

function normalize(body) {
  const b = JSON.parse(JSON.stringify(body ?? null));
  const strip = (s) => {
    if (s && typeof s === 'object') {
      delete s.timestamp;
      delete s.version;
    }
  };
  if (b && typeof b === 'object') {
    strip(b);
    strip(b.state);
    strip(b.gameState);
  }
  return b;
}

function summary(body) {
  if (Array.isArray(body)) return { _array: body.length };
  if (!body || typeof body !== 'object') return body;
  const out = {};
  for (const [k, v] of Object.entries(body)) {
    if (k === 'state' || k === 'gameState') {
      out[k] = v && {
        loc: v.currentLocationId,
        turns: v.turn?.totalTurnsConsumed,
        score: v.punteggio?.totale,
        lingua: v.currentLingua,
        awaitingRestart: v.awaitingRestart,
        awaitingEndConfirm: v.awaitingEndConfirm,
        ended: v.ended,
        victory: v.victory,
      };
    } else if (k === 'parseResult') {
      out[k] = v && { valid: v.IsValid, verb: v.VerbConcept, noun: v.NounConcept, error: v.Error };
    } else if (k === 'odessaData') {
      out[k] = '(omesso)';
    } else out[k] = v;
  }
  return canon(out);
}

function newSession() {
  return { sessionId: randomUUID(), gameId: randomUUID() };
}

async function call(session, method, path, body, raw) {
  const headers = { 'X-Session-Id': session.sessionId, 'X-Game-Id': session.gameId };
  const init = { method, headers };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = raw ? body : JSON.stringify(body);
  }
  const res = await fetch(base + path, init);
  const g = res.headers.get('X-Game-Id');
  if (g) session.gameId = g;
  const s = res.headers.get('X-Session-Id');
  if (s) session.sessionId = s;
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { _text: text };
  }
  return { status: res.status, body: json };
}

const scenarios = [];
async function scenario(id, fn) {
  const steps = [];
  const session = newSession();
  let i = 0;
  const req = async (method, path, body, opts = {}) => {
    const r = await call(opts.session || session, method, path, body, opts.raw);
    const n = normalize(r.body);
    steps.push({
      i: ++i,
      req: `${method} ${path}`,
      input:
        opts.label ??
        (body && typeof body === 'object' && 'input' in body ? body.input : undefined),
      status: r.status,
      body: summary(n),
      sha: sha({ status: r.status, body: n }),
    });
    return r;
  };
  await fn(req, session);
  scenarios.push({ id, steps });
}
const exec = (req, input, opts) => req('POST', '/api/engine/execute', { input }, opts);

await scenario('H-min-it', async (req) => {
  await req('POST', '/api/engine/reset', { idLingua: 1 });
  for (const c of walk('min_it')) await exec(req, c);
  await req('GET', '/api/engine/stats');
  await req('GET', '/api/engine/state');
});

await scenario('H-min-en', async (req) => {
  await req('POST', '/api/engine/reset', { idLingua: 2 });
  for (const c of walk('min_en')) await exec(req, c);
  await req('GET', '/api/engine/stats');
});

await scenario('H-fine-e-riavvio', async (req) => {
  await req('POST', '/api/engine/reset', { idLingua: 1 });
  for (const c of ['e', 'fine', 'forse', 'no', 'guarda', 'fine', 'si', 'guarda', 'si', 'e'])
    await exec(req, c);
});

await scenario('H-fine-e-termina', async (req) => {
  await req('POST', '/api/engine/reset', { idLingua: 2 });
  for (const c of ['end', 'yes', 'no', 'look']) await exec(req, c);
});

await scenario('H-morte-e-riavvio', async (req) => {
  await req('POST', '/api/engine/reset', { idLingua: 1 });
  for (const c of [
    'posa torcia',
    'esamina documenti',
    'posa fiammiferi',
    'e',
    'guarda',
    'no',
    'guarda',
  ])
    await exec(req, c);
});

await scenario('H-input-non-valido', async (req) => {
  await req('POST', '/api/engine/reset', { idLingua: 1 });
  await req('POST', '/api/engine/execute', {}, { label: '(corpo vuoto)' });
  await req('POST', '/api/engine/execute', { input: 5 }, { label: '(numero)' });
  await req('POST', '/api/engine/execute', { input: '' }, { label: '(stringa vuota)' });
  await req(
    'POST',
    '/api/engine/execute',
    { input: 'prendi\u0007' },
    { label: '(carattere di controllo)' }
  );
  await req(
    'POST',
    '/api/engine/execute',
    { input: 'a'.repeat(600) },
    { label: '(600 caratteri)' }
  );
  await req('POST', '/api/engine/execute', '{"input":', { raw: true, label: '(JSON malformato)' });
  for (const c of ['xyzzy', 'prendi xyzzy', 'prendi', 'nord sud']) await exec(req, c);
});

await scenario('H-salva-carica', async (req, session) => {
  await req('POST', '/api/engine/reset', { idLingua: 1 });
  const cmds = walk('full_it');
  for (const c of cmds.slice(0, 50)) await exec(req, c);
  const saved = await req('POST', '/api/engine/save-client-state', { luoghi: [] });
  await req(
    'POST',
    '/api/engine/save-client-state',
    { luoghi: 'x' },
    { label: '(luoghi non valido)' }
  );
  const other = newSession();
  await req(
    'POST',
    '/api/engine/reset',
    { idLingua: 2 },
    { session: other, label: '(sessione EN)' }
  );
  await req('POST', '/api/engine/load-client-state', saved.body, {
    session: other,
    label: '(salvataggio IT in sessione EN)',
  });
  const third = newSession();
  await req(
    'POST',
    '/api/engine/reset',
    { idLingua: 1 },
    { session: third, label: '(sessione IT)' }
  );
  await req('POST', '/api/engine/load-client-state', saved.body, {
    session: third,
    label: '(salvataggio IT)',
  });
  for (const c of cmds.slice(50, 60)) await exec(req, c, { session: third });
  await req('GET', '/api/engine/stats', undefined, { session: third });
  await req(
    'POST',
    '/api/engine/load-client-state',
    { gameState: null },
    { session: third, label: '(salvataggio non valido)' }
  );
  await exec(req, 'guarda', { session });
});

await scenario('H-servizio', async (req) => {
  await req('POST', '/api/engine/reset', { idLingua: 1 });
  await req('GET', '/api/engine/direzioni/1');
  await req('GET', '/api/engine/direzioni/44');
  await req('GET', '/api/engine/direzioni/abc');
  await req('GET', '/api/luogo-oggetti?idLuogo=6&idLingua=1');
  await req('GET', '/api/luogo-oggetti?idLuogo=6');
  await req('GET', '/api/luoghi');
  await req('GET', '/api/frontend-messages/1');
  await req('GET', '/api/frontend-messages/9');
  await req('GET', '/api/introduzione');
  await req('GET', '/api/storia');
  await req('GET', '/api/ping');
});

// Salvataggio v1.4.1 per i test di compatibilità (formato di save-client-state, passo 91 di full_it)
{
  const session = newSession();
  await call(session, 'POST', '/api/engine/reset', { idLingua: 1 });
  for (const c of walk('full_it').slice(0, 91))
    await call(session, 'POST', '/api/engine/execute', { input: c });
  const saved = await call(session, 'POST', '/api/engine/save-client-state', { luoghi: [] });
  writeFileSync(
    resolve(outDir, 'save_v141_full_it_step91.json'),
    JSON.stringify(saved.body, null, 1) + '\n'
  );
}

server.close();
console.log = quiet;
const out = {
  format: 1,
  generator: 'gen_http_trace.mjs',
  normalization:
    'timestamp e version rimossi da corpo, state e gameState; sha = SHA-256 di {status, body} canonico',
  scenarios,
};
const text = JSON.stringify(out, null, 1) + '\n';
writeFileSync(resolve(outDir, 'http_trace.json'), text);
const n = scenarios.reduce((a, s) => a + s.steps.length, 0);
process.stdout.write(
  `scenari ${scenarios.length}, richieste ${n}, KB ${(text.length / 1024).toFixed(0)}, sha ${createHash('sha256').update(text).digest('hex')}\n`
);
