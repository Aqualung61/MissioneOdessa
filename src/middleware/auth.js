import crypto from 'crypto';

function isTruthy(value) {
  return value === '1' || value === 'true' || value === 'yes';
}

function safeEquals(a, b) {
  const aBuf = Buffer.from(String(a));
  const bBuf = Buffer.from(String(b));
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

/**
 * API Key authentication middleware.
 *
 * - Checks `X-API-Key` header against `process.env.API_KEY`.
 * - If `API_AUTH_DISABLED` is truthy, auth is bypassed.
 * - In production, missing API_KEY is treated as server misconfiguration.
 * - In non-production, if API_KEY is missing, auth is skipped (explicitly).
 */
export function apiKeyAuth(options = {}) {
  const headerName = options.headerName ?? 'X-API-Key';
  const envKeyName = options.envKeyName ?? 'API_KEY';

  return function apiKeyAuthMiddleware(req, res, next) {
    // For public anonymous deployments the API key is not a real secret in-browser.
    // Allow explicitly disabling auth via env.
    if (isTruthy(process.env.API_AUTH_DISABLED || '')) {
      return next();
    }

    const nodeEnv = process.env.NODE_ENV || 'development';
    const isProd = nodeEnv === 'production';

    const expectedKey = process.env[envKeyName];
    if (!expectedKey) {
      if (isProd) {
        res.set('Cache-Control', 'no-store');
        return res.status(500).json({ ok: false, error: 'SERVER_MISCONFIGURED' });
      }
      return next();
    }

    const providedKey = req.get(headerName);
    if (!providedKey || !safeEquals(providedKey, expectedKey)) {
      res.set('Cache-Control', 'no-store');
      return res.status(401).json({ ok: false, error: 'UNAUTHORIZED' });
    }

    return next();
  };
}
