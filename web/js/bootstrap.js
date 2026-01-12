/* eslint-env browser */

(function bootstrapOdessa() {
  // Bootstrap lingua (preferenza UI) su localStorage.
  // Requisiti:
  // - default = 1
  // - whitelist = {1,2}
  // - scrivere subito il default se mancante/invalida
  (function bootstrapLingua() {
    var STORAGE_KEY = 'linguaSelezionata';
    var DEFAULT_LINGUA = '1';

    function normalizeLingua(raw) {
      var v = String(raw || '').trim();
      return v === '2' ? '2' : '1';
    }

    // Normalizza/scrive subito in storage
    try {
      var current = localStorage.getItem(STORAGE_KEY);
      var normalized = normalizeLingua(current || DEFAULT_LINGUA);
      if (current !== normalized) {
        localStorage.setItem(STORAGE_KEY, normalized);
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
