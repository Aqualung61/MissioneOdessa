import rateLimit from 'express-rate-limit';

function isTruthy(value) {
  return value === '1' || value === 'true' || value === 'yes';
}

/**
 * Crea un limitatore di frequenza. Disattivato con `RATE_LIMIT_DISABLED` o `options.enabled === false`.
 * In ambiente di test il massimo predefinito è molto alto.
 * @param {{windowMs?: number, max?: number, enabled?: boolean}} [options] - finestra in ms (predefinita 60000), massimo di richieste per finestra
 * @returns {function(Object, Object, function): void} middleware Express
 */
export function createRateLimiter(options) {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const disabled = isTruthy(process.env.RATE_LIMIT_DISABLED || '') || options?.enabled === false;

  if (disabled) {
    return function rateLimitDisabled(_req, _res, next) {
      next();
    };
  }

  // In test keep defaults very high unless explicitly overridden.
  const isTest = nodeEnv === 'test';
  const windowMs = options?.windowMs ?? 60_000;
  const max = options?.max ?? (isTest ? 1_000_000 : 60);

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, error: 'RATE_LIMITED' },
  });
}

/**
 * Limitatore generale su `/api/*`: 120 richieste al minuto.
 */
export const apiLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 120,
});

/**
 * Limitatore per gli endpoint onerosi (parse/execute): 30 richieste al minuto.
 */
export const parsingLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 30,
});

/**
 * Limitatore per gli endpoint pesanti: 5 richieste al minuto.
 */
export const heavyLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 5,
});
