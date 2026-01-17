// src/api/configRoute.js

/**
 * Normalizza un base path per uso client.
 * - root => '/'
 * - sottocartella => '/subpath/' (sempre trailing slash)
 */
export function normalizeBasePath(value) {
  if (!value) return '/';
  let bp = String(value).trim();
  if (!bp) return '/';
  if (!bp.startsWith('/')) bp = '/' + bp;
  if (bp !== '/' && bp.endsWith('/')) bp = bp.slice(0, -1);
  return bp + '/';
}

/**
 * Registra l'endpoint di config in modo che sia sempre accessibile:
 * - /api/config (root)
 * - BASE_PATH + /api/config (solo se basePath è impostato)
 */
export function registerApiConfigRoutes(app, { basePath = '', limiter } = {}) {
  const basePathNormalized = normalizeBasePath(basePath);

  function sendApiConfig(_req, res) {
    const lingueRaw = global?.odessaData?.Lingue;
    const lingue = Array.isArray(lingueRaw)
      ? lingueRaw.map((row) => ({
        ID: row?.ID,
        IDLingua: row?.IDLingua,
        Descrizione: row?.Descrizione,
      }))
      : [];

    res.json({ basePath: basePathNormalized, lingue });
  }

  if (limiter) {
    app.get('/api/config', limiter, sendApiConfig);
    if (basePath) {
      app.get(basePath + '/api/config', limiter, sendApiConfig);
    }
  } else {
    app.get('/api/config', sendApiConfig);
    if (basePath) {
      app.get(basePath + '/api/config', sendApiConfig);
    }
  }

  return { basePathNormalized };
}
