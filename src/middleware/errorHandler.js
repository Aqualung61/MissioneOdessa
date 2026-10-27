/**
 * M4 (MVP) - Error handling & sanitization
 *
 * Goal:
 * - Avoid leaking internal details (paths/stack/error messages) in production.
 * - Keep compatibility for existing 4xx responses by not touching them.
 * - Provide minimal, predictable JSON shapes for 5xx depending on API area.
 *
 * Sequenza: JSON malformato → log di errore → headersSent →
 * CORS 403 → stato → non-API (testo) → /api/parser (busta IsValid) → busta standard.
 */

// Body-parser: JSON malformato (SyntaxError con type entity.parse.failed o status 400).
function isInvalidJsonBody(err) {
  return (
    err instanceof SyntaxError &&
    (err?.type === 'entity.parse.failed' || err?.status === 400) &&
    (typeof err?.body === 'string' || typeof err?.message === 'string')
  );
}

// Malformed JSON body (Express/body-parser). Return a stable 400 envelope and avoid noisy stacks.
function handleInvalidJson(err, req, res, next, url, isProd) {
  console.warn('[warn]', {
    method: req?.method,
    url,
    error: 'INVALID_JSON',
    message: isProd ? undefined : err?.message,
  });

  if (res.headersSent) return next(err);

  // Only standardize/sanitize API responses here.
  if (!url.includes('/api')) {
    return res.status(400).send('Bad Request');
  }
  res.set('Cache-Control', 'no-store');
  return res.status(400).json({ ok: false, error: 'INVALID_JSON' });
}

// Always log server-side (stack + details) for troubleshooting.
function logServerError(err, req, url) {
  console.error('[error]', {
    method: req?.method,
    url,
    message: err?.message,
    stack: err?.stack,
  });
}

// Prefer explicit status when provided, default 500.
function resolveHttpStatus(err) {
  const status = typeof err?.status === 'number' ? err.status : 500;
  return status >= 400 && status <= 599 ? status : 500;
}

function sendNonApiError(res, httpStatus) {
  return res.status(httpStatus).send(httpStatus === 404 ? 'Not Found' : 'Internal Server Error');
}

// Parser API uses IsValid/Error envelope.
function sendParserApiError(err, res, httpStatus, isProd) {
  const baseBody = { IsValid: false, Error: httpStatus === 404 ? 'NOT_FOUND' : 'INTERNAL' };
  if (!isProd && err?.message) {
    return res.status(httpStatus).json({ ...baseBody, Message: err.message });
  }
  return res.status(httpStatus).json(baseBody);
}

// Default API envelope.
function sendStandardApiError(err, res, httpStatus, isProd) {
  const errorValue = isProd ? 'INTERNAL_ERROR' : err?.message || 'INTERNAL_ERROR';
  return res.status(httpStatus).json({ ok: false, error: errorValue });
}

/**
 * Middleware Express di gestione errori: risponde con un corpo sanificato (in produzione senza `err.message`).
 * Ordine di valutazione: JSON malformato, log, headersSent, CORS 403, stato, non-API (testo), `/api/parser`, busta standard.
 * @param {*} err - errore ricevuto
 * @param {Object} req - richiesta Express
 * @param {Object} res - risposta Express
 * @param {function} next - callback Express
 * @returns {*} la risposta inviata, oppure `next(err)` se le intestazioni sono già state inviate
 */
export function errorHandler(err, req, res, next) {
  const isProd = process.env.NODE_ENV === 'production';
  const url = (req?.originalUrl ?? req?.url ?? '').toString();

  if (isInvalidJsonBody(err)) return handleInvalidJson(err, req, res, next, url, isProd);

  logServerError(err, req, url);

  if (res.headersSent) return next(err);

  // CORS origin callback error (when ALLOWED_ORIGINS is set)
  if (err?.message === 'Not allowed by CORS') {
    return res.status(403).json({ ok: false, error: 'CORS_NOT_ALLOWED' });
  }

  const httpStatus = resolveHttpStatus(err);

  // Only standardize/sanitize API responses here.
  if (!url.includes('/api')) return sendNonApiError(res, httpStatus);

  if (url.includes('/api/parser')) return sendParserApiError(err, res, httpStatus, isProd);

  return sendStandardApiError(err, res, httpStatus, isProd);
}
