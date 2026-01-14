function isTruthy(value) {
  return value === '1' || value === 'true' || value === 'yes';
}

const MAX_EVENTS = 200;
let nextId = 1;
let events = [];

export function isEngineDebugEnabled() {
  return isTruthy(String(process.env.ENGINE_DEBUG || '').toLowerCase());
}

export function resetEngineDebugTrace() {
  events = [];
  nextId = 1;
}

export function pushEngineDebugEvent(event) {
  if (!isEngineDebugEnabled()) return;
  const safeEvent = {
    id: nextId++,
    ts: new Date().toISOString(),
    ...event,
  };

  events.push(safeEvent);
  if (events.length > MAX_EVENTS) {
    events = events.slice(events.length - MAX_EVENTS);
  }
}

export function getEngineDebugTrace() {
  return {
    enabled: isEngineDebugEnabled(),
    maxEvents: MAX_EVENTS,
    size: events.length,
    events: events.slice(),
  };
}
