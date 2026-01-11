/**
 * M4 (MVP) - Error handling & sanitization
 *
 * Goal:
 * - Avoid leaking internal details (paths/stack/error messages) in production.
 * - Keep compatibility for existing 4xx responses by not touching them.
 * - Provide minimal, predictable JSON shapes for 5xx depending on API area.
 */

export function errorHandler(err, req, res, next) {
  const isProd = process.env.NODE_ENV === 'production';
  const url = (req?.originalUrl ?? req?.url ?? '').toString();

  const isInvalidJsonBody =
    err instanceof SyntaxError &&
    (err?.type === 'entity.parse.failed' || err?.status === 400) &&
    (typeof err?.body === 'string' || typeof err?.message === 'string');

  // Malformed JSON body (Express/body-parser). Return a stable 400 envelope and avoid noisy stacks.
  if (isInvalidJsonBody) {
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
  console.error('[error]', {
    method: req?.method,
    url,
    message: err?.message,
    stack: err?.stack,
  });

  if (res.headersSent) return next(err);

  // CORS origin callback error (when ALLOWED_ORIGINS is set)
  if (err?.message === 'Not allowed by CORS') {
    return res.status(403).json({ ok: false, error: 'CORS_NOT_ALLOWED' });
  }

  // Prefer explicit status when provided, default 500.
  const status = typeof err?.status === 'number' ? err.status : 500;
  const httpStatus = status >= 400 && status <= 599 ? status : 500;

  // Only standardize/sanitize API responses here.
  if (!url.includes('/api')) {
    return res.status(httpStatus).send(httpStatus === 404 ? 'Not Found' : 'Internal Server Error');
  }

  // Parser API uses IsValid/Error envelope.
  if (url.includes('/api/parser')) {
    const baseBody = { IsValid: false, Error: httpStatus === 404 ? 'NOT_FOUND' : 'INTERNAL' };
    if (!isProd && err?.message) {
      return res.status(httpStatus).json({ ...baseBody, Message: err.message });
    }
    return res.status(httpStatus).json(baseBody);
  }

  // Default API envelope.
  const errorValue = isProd ? 'INTERNAL_ERROR' : (err?.message || 'INTERNAL_ERROR');
  return res.status(httpStatus).json({ ok: false, error: errorValue });
}
