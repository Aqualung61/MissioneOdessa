function isPlainObject(value) {
  if (!value || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function hasControlChars(s) {
  // Reject ASCII control chars (incl. DEL). Keep it strict for command inputs.
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    const isControl = (code >= 0 && code <= 8) || code === 11 || code === 12 || (code >= 14 && code <= 31) || code === 127;
    if (isControl) return true;
  }
  return false;
}

function respondInvalid(req, res, mode, details) {
  // Keep response shapes compatible with existing endpoints.
  if (mode === 'parser') {
    return res.status(400).json({ IsValid: false, Error: 'INVALID_INPUT', Details: details });
  }
  if (mode === 'load') {
    return res.status(400).json({ ok: false, error: 'Invalid save data', details });
  }
  if (mode === 'suite') {
    return res.status(400).json({ ok: false, error: 'INVALID_SUITE', details });
  }
  return res.status(400).json({ ok: false, error: 'Invalid input', details });
}

/**
 * Validates `req.body.input` for command-like endpoints.
 */
export function validateCommandInput(options = {}) {
  const field = options.field ?? 'input';
  const minLen = options.minLen ?? 1;
  const maxLen = options.maxLen ?? 500;
  const mode = options.mode ?? 'engine'; // 'engine' | 'parser'

  return function validateCommandInputMiddleware(req, res, next) {
    const raw = req.body?.[field];
    if (typeof raw !== 'string') {
      return respondInvalid(req, res, mode, 'NOT_A_STRING');
    }

    const value = raw.trim();
    if (value.length < minLen || value.length > maxLen) {
      return respondInvalid(req, res, mode, 'LENGTH_OUT_OF_RANGE');
    }

    if (hasControlChars(value)) {
      return respondInvalid(req, res, mode, 'CONTROL_CHARS');
    }

    // Normalize input for downstream handlers (consistent behavior)
    req.body[field] = value;
    return next();
  };
}

/**
 * Validates body for POST /api/engine/load-client-state.
 * Keeps it intentionally permissive (to avoid breaking old saves) while still preventing abuse.
 */
export function validateSaveData(options = {}) {
  const mode = 'load';
  const maxLuoghi = options.maxLuoghi ?? 500;
  const maxOggetti = options.maxOggetti ?? 5000;

  return function validateSaveDataMiddleware(req, res, next) {
    const body = req.body;
    if (!isPlainObject(body)) return respondInvalid(req, res, mode, 'BODY_NOT_OBJECT');

    const { gameState, odessaData } = body;
    if (!isPlainObject(gameState)) return respondInvalid(req, res, mode, 'GAMESTATE_INVALID');
    if (!isPlainObject(odessaData)) return respondInvalid(req, res, mode, 'ODESSADATA_INVALID');

    const luoghi = odessaData.Luoghi;
    if (!Array.isArray(luoghi)) return respondInvalid(req, res, mode, 'LUOGHI_NOT_ARRAY');
    if (luoghi.length > maxLuoghi) return respondInvalid(req, res, mode, 'LUOGHI_TOO_LARGE');

    const oggetti = odessaData.Oggetti;
    if (oggetti !== undefined) {
      if (!Array.isArray(oggetti)) return respondInvalid(req, res, mode, 'OGGETTI_NOT_ARRAY');
      if (oggetti.length > maxOggetti) return respondInvalid(req, res, mode, 'OGGETTI_TOO_LARGE');
    }

    // Basic item sanity: avoid primitives in collections
    if (!luoghi.every(isPlainObject)) return respondInvalid(req, res, mode, 'LUOGHI_ITEMS_INVALID');
    if (Array.isArray(oggetti) && !oggetti.every(isPlainObject)) return respondInvalid(req, res, mode, 'OGGETTI_ITEMS_INVALID');

    return next();
  };
}

export function validateSuiteParam(options = {}) {
  const mode = 'suite';
  const allowed = options.allowed ?? ['full', 'smoke'];

  return function validateSuiteParamMiddleware(req, res, next) {
    const suite = (req.query?.suite ?? 'full').toString();
    if (!allowed.includes(suite)) {
      return respondInvalid(req, res, mode, `ALLOWED: ${allowed.join(',')}`);
    }
    return next();
  };
}
