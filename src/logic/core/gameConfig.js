// Caricatore generico di configurazione di gioco (TD 0 Architettura motore e
// regole; TD Lotto 3 Configurazione di gioco, §3.1, §3.1.1). Nessun riferimento ai
// valori o alla semantica di uno specifico gioco: la sola conoscenza di schema è
// l'elenco minimo delle sezioni di primo livello richieste e la convenzione "una
// chiave di nome `minimo` può valere 0" (soglia inclusiva di un livello/fascia),
// entrambi generici e riutilizzabili da un secondo gioco con un proprio file.
import { readFileSync } from 'node:fs';

// Sezioni di primo livello che un file di configurazione di gioco deve avere
// (oltre a `versione`). Un secondo gioco con sezioni diverse richiederebbe di
// estendere questo elenco: non è specifico di Odessa, è lo schema minimo del
// formato "configurazione di gioco" di cui questo modulo è il caricatore.
const REQUIRED_TOP_LEVEL_SECTIONS = ['luoghi', 'oggetti', 'regole', 'punteggio', 'lessico'];

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isInteger(value) {
  return typeof value === 'number' && Number.isInteger(value);
}

// Congela l'oggetto e, ricorsivamente, ogni oggetto/array annidato: una mutazione
// (anche solo `push`/`splice` su un array) lancia `TypeError` in modalità strict.
export function deepFreeze(value) {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const key of Object.keys(value)) {
    deepFreeze(value[key]);
  }
  return value;
}

// Valida un valore numerico: intero; positivo, salvo per le chiavi `minimo`
// (soglia di una fascia/rango), che ammettono anche 0.
function validateNumber(value, path) {
  const isMinimoKey = path.length > 0 && path[path.length - 1] === 'minimo';
  const isValid = isMinimoKey ? isInteger(value) && value >= 0 : isInteger(value) && value > 0;
  if (!isValid) {
    const requirement = isMinimoKey ? 'un intero non negativo' : 'un intero positivo';
    throw new Error(`Configurazione non valida: "${path.join('.')}" deve essere ${requirement} (valore: ${JSON.stringify(value)})`);
  }
}

// Visita ricorsivamente la configurazione: ogni numero deve essere un intero
// (positivo, salvo l'eccezione di `minimo`); ogni valore che sembra un insieme
// (già un array, per costruzione di `JSON.parse`) resta tale; oggetti e array si
// visitano in profondità. Stringhe e booleani non sono vincolati da questo modulo:
// il loro significato appartiene al gioco specifico.
function validateNode(value, path) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => validateNode(item, [...path, String(index)]));
    return;
  }
  if (isPlainObject(value)) {
    for (const [key, child] of Object.entries(value)) {
      validateNode(child, [...path, key]);
    }
    return;
  }
  if (typeof value === 'number') {
    validateNumber(value, path);
  }
}

// Legge un percorso puntato (es. "luoghi.passaggioCrollato.luogo") da un oggetto
// annidato; restituisce `undefined` se un segmento intermedio non esiste. Generico:
// non sa nulla del significato dei percorsi, li tratta come semplici stringhe.
function getByPath(obj, dottedPath) {
  return dottedPath.split('.').reduce((node, key) => (node == null ? undefined : node[key]), obj);
}

function validateRequiredPaths(config, required, filePath) {
  for (const path of required) {
    if (getByPath(config, path) === undefined) {
      throw new Error(`Configurazione non valida in ${filePath}: manca la chiave "${path}"`);
    }
  }
}

function validateConfig(config, filePath, required) {
  if (!isPlainObject(config)) {
    throw new Error(`Configurazione non valida in ${filePath}: il contenuto non è un oggetto JSON`);
  }
  if (config.versione !== 1) {
    throw new Error(`Configurazione non valida in ${filePath}: "versione" deve essere 1 (trovato: ${JSON.stringify(config.versione)})`);
  }
  for (const section of REQUIRED_TOP_LEVEL_SECTIONS) {
    if (!(section in config)) {
      throw new Error(`Configurazione non valida in ${filePath}: manca la chiave "${section}"`);
    }
  }
  if (required) {
    validateRequiredPaths(config, required, filePath);
  }
  validateNode(config, []);
}

/**
 * Carica un file di configurazione di gioco: legge, valida (§3.1.1) e congela in
 * profondità. Non verifica che gli ID citati esistano nei dati di gioco (lo fa il
 * test dedicato): il caricatore non deve dipendere dall'ordine di inizializzazione.
 * @param {string} filePath - percorso assoluto del file JSON
 * @param {{required?: string[]}} [options] - `required`: percorsi puntati (es.
 *   "luoghi.barriera") la cui presenza viene verificata; l'elenco è definito dal
 *   chiamante (specifico del gioco), questo modulo resta generico.
 * @returns {object} la configurazione, congelata in profondità
 */
export function loadGameConfig(filePath, options = {}) {
  let raw;
  try {
    raw = readFileSync(filePath, 'utf8');
  } catch (err) {
    throw new Error(`Impossibile leggere il file di configurazione "${filePath}": ${err.message}`);
  }
  let config;
  try {
    config = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Configurazione non valida in ${filePath}: JSON non valido (${err.message})`);
  }
  validateConfig(config, filePath, options.required);
  return deepFreeze(config);
}

/**
 * Restituisce la `chiave` del primo elemento di `ranghi` con `score >= minimo`,
 * scorrendo l'array nell'ordine in cui è scritto nel file (tipicamente decrescente):
 * TD Lotto 3 Configurazione di gioco, §3.4.
 * @param {number} score - punteggio da classificare
 * @param {Array<{minimo: number, chiave: string}>} ranghi
 * @returns {string|null} la chiave del rango, o null se nessuna soglia è superata
 */
export function rankKeyFor(score, ranghi) {
  for (const rango of ranghi) {
    if (score >= rango.minimo) return rango.chiave;
  }
  return null;
}
