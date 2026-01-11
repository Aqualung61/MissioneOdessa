/* eslint-env browser */

(function redirectIndexToStory() {
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

  var params = new URLSearchParams(window.location.search || '');
  // Manteniamo la convenzione di defaultare la lingua a 1.
  params.set('idLingua', '1');

  var targetPath = basePath + 'web/odessa_storia.html?' + params.toString();
  var target =
    window.location.protocol === 'file:'
      ? 'http://localhost:3001' + targetPath
      : targetPath;

  window.location.replace(target);
})();
