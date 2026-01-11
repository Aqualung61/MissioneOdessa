/* eslint-env browser */

(function initIndexLinks() {
  function getQueryParam(name) {
    var url = new URL(window.location.href);
    return url.searchParams.get(name);
  }

  function ensureBasePath(path) {
    if (!path || typeof path !== 'string') return '/';
    var normalized = path;
    if (!normalized.startsWith('/')) normalized = '/' + normalized;
    if (!normalized.endsWith('/')) normalized = normalized + '/';
    return normalized;
  }

  function computeBasePathFallback() {
    var pathParts = window.location.pathname.split('/').filter(Boolean);
    var appFolders = ['web', 'images', 'src', 'api'];

    if (window.location.protocol === 'file:') return '/';
    if (pathParts.length === 0 || appFolders.includes(pathParts[0])) return '/';
    return '/' + pathParts[0] + '/';
  }

  var basePath =
    typeof window.basePath === 'string' && window.basePath
      ? ensureBasePath(window.basePath)
      : ensureBasePath(computeBasePathFallback());

  var idLingua = getQueryParam('idLingua') || localStorage.getItem('linguaSelezionata') || '1';

  var continueLink = document.getElementById('continueImageLink');
  if (continueLink) {
    var params = new URLSearchParams(window.location.search || '');
    params.set('idLingua', idLingua);
    continueLink.setAttribute('href', basePath + 'web/odessa_intro.html?' + params.toString());
  }

  var pdfLinks = document.querySelectorAll('a[data-pdf]');
  pdfLinks.forEach(function (el) {
    var filename = el.getAttribute('data-pdf');
    if (!filename) return;
    el.setAttribute('href', basePath + 'web/docs/' + filename);
  });
})();
