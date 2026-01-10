import rateLimit from 'express-rate-limit';

function isTruthy(value) {
  return value === '1' || value === 'true' || value === 'yes';
}

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

// Generale su /api/*
export const apiLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 120,
});

// Endpoint CPU-intensive: parse/execute
export const parsingLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 30,
});

// Endpoint pesanti (opzionale)
export const heavyLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 5,
});
