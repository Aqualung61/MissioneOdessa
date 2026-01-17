/* eslint-env browser */

(function bootstrapOdessa() {
  // Bootstrap lingua (preferenza UI) per-tab su sessionStorage.
  // Requisiti (Opzione B):
  // - default per nuova tab = 1 (IT)
  // - whitelist derivata da `Lingue` via /api/config (no hardcode)
  // - scrivere subito il default se mancante/invalida
  (function bootstrapLingua() {
    var STORAGE_KEY = 'linguaSelezionata';
    var DEFAULT_LINGUA = '1';

    function normalizeLingua(raw) {
      var v = String(raw || '').trim();
      if (!/^\d+$/.test(v)) return DEFAULT_LINGUA;
      var n = parseInt(v, 10);
      if (!isFinite(n) || n <= 0) return DEFAULT_LINGUA;
      return String(n);
    }

    // Normalizza/scrive subito in storage (per-tab)
    try {
      var current = sessionStorage.getItem(STORAGE_KEY);
      var normalized = normalizeLingua(current || DEFAULT_LINGUA);
      if (current !== normalized) {
        sessionStorage.setItem(STORAGE_KEY, normalized);
      }
    } catch {
      // ignore
    }

    // Ripulisce eventuale idLingua dalla URL (vecchi bookmark/redirect), mantenendo altri parametri.
    try {
      var url = new URL(window.location.href);
      if (url.searchParams && (url.searchParams.has('idLingua') || url.searchParams.has('Lingua'))) {
        url.searchParams.delete('idLingua');
        url.searchParams.delete('Lingua');
        var next = url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : '') + url.hash;
        window.history.replaceState({}, '', next);
      }
    } catch {
      // ignore
    }
  })();

  function computeBasePath() {
    var pathParts = window.location.pathname.split('/').filter(Boolean);
    var appFolders = ['web', 'images', 'src', 'api'];

    // In file:// non possiamo dedurre in modo affidabile il BASE_PATH dal filesystem.
    // Best-effort: se troviamo una cartella "missioneodessa" nel path, usiamola; altrimenti root '/'.
    if (window.location.protocol === 'file:') {
      var idx = pathParts.findIndex(function (p) {
        return String(p).toLowerCase() === 'missioneodessa';
      });
      if (idx >= 0) return '/' + pathParts[idx] + '/';
      return '/';
    }

    if (pathParts.length === 0 || appFolders.includes(pathParts[0])) return '/';
    return '/' + pathParts[0] + '/';
  }

  var basePath = computeBasePath();
  window.basePath = basePath;

  // === Helpers globali (lingua per-tab) ===
  // Espone metodi riusabili per validare la lingua usando /api/config (data-driven).
  (function exposeOdessaHelpers() {
    var STORAGE_KEY = 'linguaSelezionata';
    var DEFAULT_ID = 1;
    var cachedConfigPromise = null;

    function normalizeToPositiveInt(raw) {
      var v = String(raw || '').trim();
      if (!/^\d+$/.test(v)) return DEFAULT_ID;
      var n = parseInt(v, 10);
      if (!isFinite(n) || n <= 0) return DEFAULT_ID;
      return n;
    }

    function getLinguaIdSync() {
      try {
        return normalizeToPositiveInt(sessionStorage.getItem(STORAGE_KEY));
      } catch {
        return DEFAULT_ID;
      }
    }

    function setLinguaIdSync(id) {
      try {
        sessionStorage.setItem(STORAGE_KEY, String(normalizeToPositiveInt(id)));
      } catch {
        // ignore
      }
    }

    function loadApiConfigOnce() {
      if (cachedConfigPromise) return cachedConfigPromise;

      cachedConfigPromise = (function () {
        try {
          var bp = typeof window.basePath === 'string' ? window.basePath : '/';
          return fetch(bp + 'api/config')
            .then(function (res) {
              if (!res.ok) return null;
              return res.json();
            })
            .catch(function () {
              return null;
            });
        } catch {
          return Promise.resolve(null);
        }
      })();

      return cachedConfigPromise;
    }

    async function resolveLinguaId() {
      var current = getLinguaIdSync();
      var cfg = await loadApiConfigOnce();

      // Se non possiamo validare (API/config non disponibile), degrada al default (IT).
      if (!cfg || !Array.isArray(cfg.lingue)) {
        if (current !== DEFAULT_ID) {
          current = DEFAULT_ID;
          setLinguaIdSync(current);
        }
        return current;
      }

      var lingue = cfg && Array.isArray(cfg.lingue) ? cfg.lingue : [];
      if (lingue.length === 0) {
        if (current !== DEFAULT_ID) {
          current = DEFAULT_ID;
          setLinguaIdSync(current);
        }
        return current;
      }
      if (lingue.length > 0) {
        var allowed = new Set(
          lingue
            .map(function (row) {
              return row && row.ID !== undefined && row.ID !== null ? String(row.ID) : null;
            })
            .filter(Boolean)
        );

        if (allowed.size > 0 && !allowed.has(String(current))) {
          current = DEFAULT_ID;
          setLinguaIdSync(current);
        }
      }

      return current;
    }

    window.odessa = window.odessa || {};
    window.odessa.getLinguaId = getLinguaIdSync;
    window.odessa.setLinguaId = setLinguaIdSync;
    window.odessa.loadConfig = loadApiConfigOnce;
    window.odessa.resolveLinguaId = resolveLinguaId;
  })();

  // Se la pagina è aperta come file:// le API relative (/api/...) non funzionano.
  // Reindirizza automaticamente al server locale mantenendo i parametri query.
  try {
    if (window.location.protocol === 'file:') {
      // Solo le pagine in /web/ vanno riscritte su http://localhost:3001/.../web/<page>
      // (Evita che index.html in root venga inviato a /web/index.html che non esiste.)
      if (String(window.location.pathname || '').includes('/web/')) {
        var page = window.location.pathname.split('/').filter(Boolean).pop() || 'odessa_main.html';
        var target = 'http://localhost:3001' + basePath + 'web/' + page + (window.location.search || '');
        window.location.replace(target);
      }
    }
  } catch {
    // ignore
  }
})();
