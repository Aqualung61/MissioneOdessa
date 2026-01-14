function isTruthy(value) {
  return value === '1' || value === 'true' || value === 'yes';
}

const MAX_EVENTS = 200;
let nextId = 1;
let events = [];

export function isEngineDebugEnabled() {
  return isTruthy((process.env.ENGINE_DEBUG || '').toLowerCase());
}

export function resetEngineDebugTrace() {
  events = [];
  nextId = 1;
}

export function pushEngineDebugEvent(event) {
  if (!isEngineDebugEnabled()) return;
  const safeEvent = {
    ...event,
    id: nextId++,
    ts: new Date().toISOString(),
  };

  if (events.length >= MAX_EVENTS) {
    events.shift();
  }
  events.push(safeEvent);
}

export function getEngineDebugTrace() {
  return {
    enabled: isEngineDebugEnabled(),
    maxEvents: MAX_EVENTS,
    size: events.length,
    events: events.slice(),
  };
}
