import { spawn } from 'node:child_process';

const port = Number(process.env.SMOKE_PORT || 3011);
const base = `http://localhost:${port}`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(timeoutMs = 15000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const res = await fetch(`${base}/api/version`, { method: 'GET' });
      if (res.ok) return true;
    } catch {
      // ignore
    }
    await sleep(250);
  }
  return false;
}

async function requestJson(path, { method = 'GET', headers = {}, body } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { _raw: text };
  }

  const outHeaders = {
    sessionId: res.headers.get('x-session-id'),
    gameId: res.headers.get('x-game-id'),
  };

  return { ok: res.ok, status: res.status, json, headers: outHeaders };
}

function pickSessionHeaders(h) {
  const hdrs = {};
  if (h?.sessionId) hdrs['X-Session-Id'] = h.sessionId;
  if (h?.gameId) hdrs['X-Game-Id'] = h.gameId;
  return hdrs;
}

function print(obj) {
  process.stdout.write(`${JSON.stringify(obj)}\n`);
}

async function main() {
  const child = spawn('node', ['src/server.js'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      PORT: String(port),
      API_AUTH_DISABLED: '1',
    },
  });

  let serverLog = '';
  child.stdout.on('data', (d) => {
    serverLog += d.toString('utf8');
  });
  child.stderr.on('data', (d) => {
    serverLog += d.toString('utf8');
  });

  try {
    const up = await waitForServer();
    if (!up) {
      print({ step: 'waitForServer', ok: false, base, note: 'Server non raggiungibile', serverLogTail: serverLog.slice(-2000) });
      process.exitCode = 1;
      return;
    }

  const version = await requestJson('/api/version');
  print({ step: 'version', ok: version.ok, status: version.status, version: version.json?.version });

  const state0 = await requestJson('/api/engine/state');
  print({ step: 'engine.state.initial', ok: state0.ok, status: state0.status, lingua: state0.json?.state?.currentLingua, location: state0.json?.state?.currentLocationId });

  let session = state0.headers;
  let headers = pickSessionHeaders(session);

  const reset = await requestJson('/api/engine/reset', { method: 'POST', headers, body: { idLingua: 2 } });
  session = { sessionId: reset.headers.sessionId ?? session.sessionId, gameId: reset.headers.gameId ?? session.gameId };
  headers = pickSessionHeaders(session);
  print({ step: 'engine.reset', ok: reset.ok, status: reset.status, lingua: reset.json?.state?.currentLingua });

  const fm = await requestJson('/api/frontend-messages/2', { headers });
  print({ step: 'frontend-messages', ok: fm.ok, status: fm.status, count: fm.json?.count });

  const help = await requestJson('/api/engine/execute', { method: 'POST', headers, body: { input: 'HELP' } });
  const helpMsg = help.json?.engine?.message ?? '';
  print({
    step: 'execute.HELP',
    ok: help.ok,
    status: help.status,
    containsAvailable: typeof helpMsg === 'string' && helpMsg.includes('Available commands'),
    containsComandi: typeof helpMsg === 'string' && helpMsg.includes('Comandi disponibili'),
  });

  const inv = await requestJson('/api/engine/execute', { method: 'POST', headers, body: { input: 'INVENTORY' } });
  const invMsg = inv.json?.engine?.message ?? '';
  print({ step: 'execute.INVENTORY', ok: inv.ok, status: inv.status, msgSample: typeof invMsg === 'string' ? invMsg.slice(0, 120) : null });

  const setLoc = await requestJson('/api/engine/set-location', { method: 'POST', headers, body: { locationId: 24, consumeTurn: false } });
  print({ step: 'engine.set-location.24', ok: setLoc.ok, status: setLoc.status, note: setLoc.ok ? 'OK' : 'skipped/fail (legacy disabled?)' });

  const mp = await requestJson('/api/engine/execute', { method: 'POST', headers, body: { input: 'MOVE PAINTING' } });
  const mpMsg = mp.json?.engine?.message ?? '';
  print({
    step: 'execute.MOVE_PAINTING',
    ok: mp.ok,
    status: mp.status,
    containsYouMove: typeof mpMsg === 'string' && mpMsg.includes('You move'),
    hasItalianAccents: typeof mpMsg === 'string' && /[àèéìòù]/.test(mpMsg),
    msgSample: typeof mpMsg === 'string' ? mpMsg.slice(0, 160) : null,
  });

  const parserLegacy = await requestJson('/api/parser/parse', { method: 'POST', body: { input: 'MOVE PAINTING' } });
  print({
    step: 'parser.parse.legacy',
    ok: parserLegacy.ok,
    status: parserLegacy.status,
    isValid: parserLegacy.json?.IsValid,
    commandType: parserLegacy.json?.CommandType,
    canonicalVerb: parserLegacy.json?.CanonicalVerb,
  });
  } finally {
    child.kill('SIGTERM');
    await sleep(250);
    if (!child.killed) child.kill('SIGKILL');
  }
}

await main();
