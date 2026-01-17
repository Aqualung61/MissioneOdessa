/* eslint-env browser */

(function initSeoI18n() {
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

  function getBasePath() {
    return typeof window.basePath === 'string' && window.basePath
      ? ensureBasePath(window.basePath)
      : ensureBasePath(computeBasePathFallback());
  }

  function resolveIdLingua() {
    return localStorage.getItem('linguaSelezionata') || '1';
  }

  function resolveLangConfig(idLingua) {
    if (String(idLingua) === '2') {
      return { htmlLang: 'en', ogLocale: 'en_US' };
    }
    return { htmlLang: 'it', ogLocale: 'it_IT' };
  }

  function setMetaByName(name, content) {
    var el = document.querySelector('meta[name="' + name + '"]');
    if (!el) return;
    el.setAttribute('content', String(content || ''));
  }

  function setMetaByProperty(property, content) {
    var el = document.querySelector('meta[property="' + property + '"]');
    if (!el) return;
    el.setAttribute('content', String(content || ''));
  }

  function setCanonicalHref(href) {
    var el = document.querySelector('link[rel="canonical"]');
    if (!el) return;
    el.setAttribute('href', String(href || ''));
  }

  function getPageKey() {
    var pathname = String(window.location.pathname || '');
    if (pathname.endsWith('/odessa_intro.html')) return 'intro';
    if (pathname.endsWith('/odessa_storia.html')) return 'storia';
    if (pathname.endsWith('/odessa_main.html')) return 'main';
    return 'default';
  }

  function computeCanonicalUrl() {
    try {
      return String(window.location.origin || '') + String(window.location.pathname || '');
    } catch {
      return '';
    }
  }

  function getFallbackSeoByLingua(pageKey, idLingua) {
    var lingua = String(idLingua) === '2' ? '2' : '1';

    if (lingua === '2') {
      if (pageKey === 'intro') {
        return {
          title: 'Mission Odessa - Introduction',
          description: 'Mission Odessa: introduction and story background.',
        };
      }
      if (pageKey === 'storia') {
        return {
          title: 'Mission Odessa - Story',
          description: 'Mission Odessa: interactive text-adventure story and resources.',
        };
      }
      return {
        title: 'Mission Odessa - Adventure Game',
        description: 'Mission Odessa: interactive text adventure.',
      };
    }

    if (pageKey === 'intro') {
      return {
        title: 'Missione Odessa - Introduzione',
        description: 'Missione Odessa: introduzione e contesto dell’avventura.',
      };
    }
    if (pageKey === 'storia') {
      return {
        title: 'Missione Odessa - Storia',
        description: 'Missione Odessa: avventura testuale interattiva.',
      };
    }
    return {
      title: 'Missione Odessa - Adventure Game',
      description: 'Missione Odessa: avventura testuale interattiva.',
    };
  }

  function applySeo({ title, description, ogLocale, canonicalUrl, htmlLang }) {
    if (htmlLang) {
      document.documentElement.setAttribute('lang', String(htmlLang));
    }

    if (ogLocale) {
      setMetaByProperty('og:locale', ogLocale);
    }

    if (canonicalUrl) {
      setCanonicalHref(canonicalUrl);
      setMetaByProperty('og:url', canonicalUrl);
    }

    if (title) {
      document.title = String(title);
      setMetaByProperty('og:title', title);
      setMetaByName('twitter:title', title);
    }

    if (description) {
      setMetaByName('description', description);
      setMetaByProperty('og:description', description);
      setMetaByName('twitter:description', description);
    }
  }

  var idLingua = resolveIdLingua();
  var pageKey = getPageKey();
  var langCfg = resolveLangConfig(idLingua);
  var canonicalUrl = computeCanonicalUrl();
  var fallback = getFallbackSeoByLingua(pageKey, idLingua);

  // Prima applicazione: immediata e senza dipendenze.
  applySeo({
    title: fallback.title,
    description: fallback.description,
    ogLocale: langCfg.ogLocale,
    canonicalUrl: canonicalUrl,
    htmlLang: langCfg.htmlLang,
  });

  // Seconda applicazione (non bloccante): se API disponibili, usa MessaggiFrontend.
  var basePath = getBasePath();
  fetch(basePath + 'api/frontend-messages/' + idLingua)
    .then(function (res) {
      if (!res.ok) return null;
      return res.json();
    })
    .then(function (data) {
      var messages = Array.isArray(data && data.messages) ? data.messages : [];
      var titleKey = 'seo.title.' + pageKey;
      var descKey = 'seo.description.' + pageKey;
      var defaultTitleKey = 'seo.title.default';
      var defaultDescKey = 'seo.description.default';

      var titleRow = messages.find(function (m) {
        return m && m.Chiave === titleKey;
      });
      var descRow = messages.find(function (m) {
        return m && m.Chiave === descKey;
      });

      if (!titleRow) {
        titleRow = messages.find(function (m) {
          return m && m.Chiave === defaultTitleKey;
        });
      }

      if (!descRow) {
        descRow = messages.find(function (m) {
          return m && m.Chiave === defaultDescKey;
        });
      }

      var title = titleRow && typeof titleRow.Messaggio === 'string' ? titleRow.Messaggio.trim() : '';
      var description = descRow && typeof descRow.Messaggio === 'string' ? descRow.Messaggio.trim() : '';

      applySeo({
        title: title || fallback.title,
        description: description || fallback.description,
        ogLocale: langCfg.ogLocale,
        canonicalUrl: canonicalUrl,
        htmlLang: langCfg.htmlLang,
      });
    })
    .catch(function () {
      // ignore
    });
})();
