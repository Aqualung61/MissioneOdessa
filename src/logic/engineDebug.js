function isTruthy(value) {
  return value === '1' || value === 'true' || value === 'yes';
}

const MAX_EVENTS = 200;
let nextId = 1;
let events = [];

/**
 * Indica se la traccia di debug è attiva (variabile d'ambiente `ENGINE_DEBUG`).
 * @returns {boolean}
 */
export function isEngineDebugEnabled() {
  return isTruthy((process.env.ENGINE_DEBUG || '').toLowerCase());
}

/**
 * Svuota la traccia e riparte la numerazione degli eventi.
 * @returns {void}
 */
export function resetEngineDebugTrace() {
  events = [];
  nextId = 1;
}

/**
 * Aggiunge un evento alla traccia con `id` progressivo e `ts` ISO; non fa nulla se il debug è spento.
 * Conserva al massimo 200 eventi: oltre il limite scarta il più vecchio.
 * @param {Object} event - evento da registrare
 * @returns {void}
 */
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

/**
 * Copia della traccia corrente.
 * @returns {{enabled: boolean, maxEvents: number, size: number, events: Array<Object>}}
 */
export function getEngineDebugTrace() {
  return {
    enabled: isEngineDebugEnabled(),
    maxEvents: MAX_EVENTS,
    size: events.length,
    events: events.slice(),
  };
}
