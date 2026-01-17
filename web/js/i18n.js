// Frontend i18n helper - Sprint 2
// Gestisce messaggi localizzati lato client

let frontendMessages = [];
let currentLanguage = 1; // Default IT

function ensureBasePath(path) {
  if (!path || typeof path !== 'string') return '/';
  let normalized = path;
  if (!normalized.startsWith('/')) normalized = '/' + normalized;
  if (!normalized.endsWith('/')) normalized = normalized + '/';
  return normalized;
}

function getBasePath() {
  return typeof window.basePath === 'string' && window.basePath
    ? ensureBasePath(window.basePath)
    : '/';
}

/**
 * Carica messaggi frontend dal backend
 * @param {number} lingua - ID lingua (1=IT, 2=EN)
 */
async function loadFrontendMessages(lingua) {
  try {
    const basePath = getBasePath();
    const response = await fetch(`${basePath}api/frontend-messages/${lingua}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    frontendMessages = data.messages || [];
    currentLanguage = lingua;
    console.log(`Messaggi frontend caricati: ${frontendMessages.length} per lingua ${lingua}`);
    return frontendMessages;
  } catch (error) {
    console.error('Errore caricamento messaggi frontend:', error);
    // Fallback: usa messaggi vuoti
    frontendMessages = [];
    return [];
  }
}

/**
 * Recupera messaggio localizzato
 * @param {string} key - Chiave messaggio (es. "ui.loading")
 * @param {...any} params - Parametri per placeholder {0}, {1}, etc.
 * @returns {string} Messaggio localizzato
 */
function msg(key, ...params) {
  const record = frontendMessages.find(m => m.Chiave === key && m.IDLingua === currentLanguage);
  
  if (!record) {
    console.warn(`Messaggio frontend non trovato: ${key} (lingua ${currentLanguage})`);
    return `[${key}]`;
  }
  
  let message = record.Messaggio;
  
  // Sostituisci placeholder {0}, {1}, etc.
  params.forEach((param, index) => {
    message = message.replace(`{${index}}`, param);
  });
  
  return message;
}

/**
 * Imposta lingua corrente
 * @param {number} lingua - ID lingua (1=IT, 2=EN)
 */
function setCurrentLanguage(lingua) {
  currentLanguage = lingua;
  console.log(`Lingua frontend impostata: ${lingua}`);
}

/**
 * Ottiene lingua corrente
 * @returns {number} ID lingua corrente
 */
function getCurrentLanguage() {
  return currentLanguage;
}

/**
 * Inizializza testi HTML con attributi data-i18n
 */
function initHTMLTexts() {
  // data-i18n per textContent
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) {
      el.textContent = msg(key);
    }
  });

  // data-i18n-placeholder per input placeholder
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) {
      el.placeholder = msg(key);
    }
  });

  // data-i18n-title per title attribute (tooltips)
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    if (key) {
      el.title = msg(key);
    }
  });

  // data-i18n-aria-label per aria-label
  document.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
    const key = el.getAttribute('data-i18n-aria-label');
    if (key) {
      el.setAttribute('aria-label', msg(key));
    }
  });

  // data-i18n-alt per alt (img)
  document.querySelectorAll('[data-i18n-alt]').forEach(el => {
    const key = el.getAttribute('data-i18n-alt');
    if (key) {
      el.setAttribute('alt', msg(key));
    }
  });

  // Update page title
  const titleEl = document.querySelector('title[data-i18n]');
  if (titleEl) {
    const key = titleEl.getAttribute('data-i18n');
    document.title = msg(key);
  }
}

// Export per uso globale
window.i18n = {
  load: loadFrontendMessages,
  msg: msg,
  setLanguage: setCurrentLanguage,
  getLanguage: getCurrentLanguage,
  initHTML: initHTMLTexts
};
