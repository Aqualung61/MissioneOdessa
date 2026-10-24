// Parser di comandi utente conforme REQ01
// - Carica lessico dai dati statici di gioco in memoria (Map token -> { type, canonical, termId })
// - Normalizza input (trim, upper, collapse spaces)
// - Rimuove stopword
// - Valida grammatica e produce ParseResult

import { CONFIG } from '../game/odessa/config.js';
import { getGameData } from './core/gameData.js';

// Tipi comando per ParseResult
export const CommandType = {
  ACTION: 'ACTION',
  NAVIGATION: 'NAVIGATION',
  SYSTEM: 'SYSTEM',
  NOUN: 'NOUN',
  STOPWORD: 'STOPWORD',
};

export const ParseErrorType = {
  NONE: 'NONE',
  INVALID_INPUT: 'INVALID_INPUT',
  COMMAND_UNKNOWN: 'COMMAND_UNKNOWN',
  SYNTAX_ACTION_INCOMPLETE: 'SYNTAX_ACTION_INCOMPLETE',
  SYNTAX_NOUN_UNKNOWN: 'SYNTAX_NOUN_UNKNOWN',
  SYNTAX_INVALID_STRUCTURE: 'SYNTAX_INVALID_STRUCTURE',
};

// Cache interna del vocabolario per processo, separata per lingua.
// Questo evita che una prima costruzione (es. IT) venga riusata impropriamente per altre lingue (es. EN).
const vocabCacheByLingua = new Map();

export function resetVocabularyCache() {
  vocabCacheByLingua.clear();
}

// === Lessico: unico punto di accesso ai dati statici (lotto 2, #63) ===
// `lexiconSource()` è l'unico punto di questo modulo che legge i dati statici, tramite
// l'accessor `getGameData()` (TD 0 Architettura motore e regole, §4.8); letto a ogni chiamata.
function lexiconSource() {
  return getGameData();
}

// Simula la query JOIN voce -> termine -> tipo, nello stesso ordine di VociLessico,
// scartando le righe senza termine o senza tipo corrispondente.
function loadLexiconRows(source, lingua) {
  return source.VociLessico
    .filter((vl) => vl.ID_Lingua === lingua)
    .map((vl) => {
      const tl = source.TerminiLessico.find((t) => t.ID_Termine === vl.ID_Termine);
      if (!tl) return null; // Skip se termine non trovato
      const t = source.TipiLessico.find((x) => x.ID_TipoLessico === tl.ID_TipoLessico);
      if (!t) return null; // Skip se tipo non trovato
      return {
        Tipo: t.NomeTipo,
        TermineID: tl.ID_Termine,
        Concetto: tl.Concetto,
        Voce: vl.Voce,
      };
    })
    .filter((row) => row !== null);
}

function mapTipoToCommandType(tipo) {
  switch (tipo) {
    case 'VERBO_AZIONE':
      return CommandType.ACTION;
    case 'NAVIGAZIONE':
      return CommandType.NAVIGATION;
    case 'SISTEMA':
      return CommandType.SYSTEM;
    case 'NOUN':
      return CommandType.NOUN;
    case 'STOPWORD':
      return CommandType.STOPWORD;
    default:
      return null;
  }
}

function normalizeForComparison(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/_/g, ' ')
    .toUpperCase()
    .trim()
    .replace(/\s+/g, ' ');
}

// Precalcola i concetti dei nomi localizzati per le lingue diverse dall'italiano.
// Obiettivo: in EN il parser deve produrre NounConcept compatibile con Oggetti.json
// (nome localizzato), ma per concetti non-oggetto (es. DESTRA/SINISTRA) si mantiene
// il concetto originale.
function buildLocalizedNounConcepts(rows, source, lingua) {
  const localizedNounConceptByTerm = new Map();
  if (lingua === 1) return localizedNounConceptByTerm;

  const oggettoIdByItName = new Map();
  for (const o of source.Oggetti || []) {
    if (o.IDLingua !== 1) continue;
    const k = normalizeForComparison(o.Oggetto);
    if (!k) continue;
    oggettoIdByItName.set(k, o.ID);
  }

  for (const r of rows) {
    const type = mapTipoToCommandType(r.Tipo);
    if (type !== CommandType.NOUN) continue;
    if (localizedNounConceptByTerm.has(r.TermineID)) continue;

    const itKey = normalizeForComparison(r.Concetto);
    const objId = oggettoIdByItName.get(itKey);
    if (!objId) {
      localizedNounConceptByTerm.set(r.TermineID, r.Concetto);
      continue;
    }
    const obj = (source.Oggetti || []).find((o) => o.ID === objId && o.IDLingua === lingua);
    localizedNounConceptByTerm.set(r.TermineID, obj?.Oggetto || r.Concetto);
  }
  return localizedNounConceptByTerm;
}

// Forma canonica dei verbi d'azione (TD Lessico L2 risposte e testi, §4.2 c): se
// l'infinito (il concetto) è esso stesso una voce della lingua corrente, è la forma
// canonica; altrimenti resta la voce alfabeticamente minore, come oggi (invariato
// per l'inglese, dove il concetto è sempre il nome italiano).
function buildActionCanonicalConcepts(rows) {
  const actionCanonicalConceptByTerm = new Map();
  for (const r of rows) {
    if (mapTipoToCommandType(r.Tipo) !== CommandType.ACTION) continue;
    if (actionCanonicalConceptByTerm.has(r.TermineID)) continue;
    const concetto = String(r.Concetto || '').toUpperCase();
    const esisteComeVoce = rows.some((x) => x.TermineID === r.TermineID && x.Voce.toUpperCase() === concetto);
    actionCanonicalConceptByTerm.set(r.TermineID, esisteComeVoce ? concetto : null);
  }
  return actionCanonicalConceptByTerm;
}

// Rimuove diacritici (accenti)
function removeDiacritics(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Mappa token -> info e alias senza accenti (es. GIU -> GIÙ): l'alias si aggiunge
// solo se il token non esiste già (vince il primo). Per il token "principale", per
// un termine presente in più righe vince l'ultima (si sovrascrive `tokenMap.set`).
// Costruisce anche `canonicalByTerm`, finalizzato da `applyCanonicalForms`.
function buildTokenMap(rows, lingua, localizedNounConceptByTerm, actionCanonicalConceptByTerm) {
  const tokenMap = new Map();
  const canonicalByTerm = new Map();

  for (const r of rows) {
    const type = mapTipoToCommandType(r.Tipo);
    if (!type) continue;
    const token = r.Voce.toUpperCase();
    // Canonico per termine:
    // - NAVIGAZIONE: forziamo il concetto come canonico stabile (es. NORD, BASSO)
    // - SISTEMA: forziamo il concetto come canonico stabile (es. AIUTO, INVENTARIO)
    // - VERBO_AZIONE: l'infinito se è una voce della lingua corrente, altrimenti il
    //   minimo lessicografico (vedi actionCanonicalConceptByTerm)
    // - altri tipi: prendi il minimo lessicografico tra le voci della lingua corrente
    const prev = canonicalByTerm.get(r.TermineID);
    const infinitoCanonico = type === CommandType.ACTION ? actionCanonicalConceptByTerm.get(r.TermineID) : null;
    if (type === CommandType.NAVIGATION || type === CommandType.SYSTEM) {
      canonicalByTerm.set(r.TermineID, String(r.Concetto || token).toUpperCase());
    } else if (infinitoCanonico) {
      canonicalByTerm.set(r.TermineID, infinitoCanonico);
    } else if (!prev || token < prev) {
      canonicalByTerm.set(r.TermineID, token);
    }
    const concept = (type === CommandType.NOUN && lingua !== 1)
      ? (localizedNounConceptByTerm.get(r.TermineID) || r.Concetto)
      : r.Concetto;
    const info = { type, canonical: null, termId: r.TermineID, concept };
    tokenMap.set(token, info);
    const noAcc = removeDiacritics(token);
    if (noAcc !== token && !tokenMap.has(noAcc)) {
      tokenMap.set(noAcc, info);
    }
  }
  return { tokenMap, canonicalByTerm };
}

// Finalizza la forma canonica di ogni voce del tokenMap (muta tokenMap in place).
function applyCanonicalForms(tokenMap, canonicalByTerm) {
  for (const [tok, info] of tokenMap) {
    const canon = canonicalByTerm.get(info.termId) || tok;
    tokenMap.set(tok, { ...info, canonical: canon });
  }
  return tokenMap;
}

// Indice dei nomi di 3 o più parole (#128). Per ogni voce NOUN con almeno 3 parole,
// la chiave derivata è l'insieme dei suoi token, normalizzati come l'input e senza i
// token STOPWORD (che `tokenize` scarta dall'input). Si costruisce dal tokenMap, che non
// cambia. A parità di chiave vince la prima voce; la chiave esistente nel tokenMap
// prevale comunque su quella derivata (vedi `lookupNounKey`).
function buildLongNounIndex(tokenMap) {
  const longNounIndex = new Map();
  for (const [voce, info] of tokenMap) {
    if (info.type !== CommandType.NOUN) continue;
    const words = normalizeInput(voce).split(' ');
    if (words.length < 3) continue;
    const kept = words.filter((w) => tokenMap.get(w)?.type !== CommandType.STOPWORD);
    if (kept.length < 2) continue;
    const key = kept.join(' ');
    if (!longNounIndex.has(key)) longNounIndex.set(key, info);
  }
  return longNounIndex;
}

// Carica il vocabolario dai dati statici di gioco e costruisce:
// - tokenMap: Map<string, { type, canonical, termId, concept }>
// - longNounIndex: Map<chiave derivata, info> per i nomi di 3 o più parole
export async function ensureVocabulary(gameState = null) {
  const currentLingua = gameState?.currentLingua || 1;

  const cached = vocabCacheByLingua.get(currentLingua);
  if (cached) return cached;

  const source = lexiconSource();
  const rows = loadLexiconRows(source, currentLingua);
  const localizedNounConceptByTerm = buildLocalizedNounConcepts(rows, source, currentLingua);
  const actionCanonicalConceptByTerm = buildActionCanonicalConcepts(rows);
  const { tokenMap, canonicalByTerm } = buildTokenMap(rows, currentLingua, localizedNounConceptByTerm, actionCanonicalConceptByTerm);
  applyCanonicalForms(tokenMap, canonicalByTerm);

  const built = { tokenMap, longNounIndex: buildLongNounIndex(tokenMap) };
  vocabCacheByLingua.set(currentLingua, built);
  return built;
}

// Preprocess: rimuove punteggiatura comune (ma preserva '?'), rimuove accenti, normalizza spazi
function normalizeInput(input) {
  const withoutPunct = input
    // sostituisci punteggiatura comune con spazio, ma NON rimuovere '?' che è un comando valido
    // Nota: in una character class JS, ']' chiude la classe. Per includerlo va escapato (\]) oppure
    // posizionato come primo carattere della classe; qui manteniamo l'escape per chiarezza.
    // '[' invece non necessita di escape all'interno della classe.
    // Manteniamo qui l'escape esplicito di ']' (\]) per massima leggibilità; '[' resta
    // non escapato perché non necessario all'interno della classe.
    .replace(/[.,;:!"'“”‘’()[\]{}…]/g, ' ');
  const noAcc = withoutPunct.normalize('NFD').replace(/[̀-ͯ]/g, '');
  return noAcc.trim().toUpperCase().replace(/\s+/g, ' ');
}

function isDigits(str) {
  return /^\d+$/.test(str);
}

function hasControlChars(s) {
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    const isControl = (code >= 0 && code <= 8) || code === 11 || code === 12 || (code >= 14 && code <= 31) || code === 127;
    if (isControl) return true;
  }
  return false;
}

// Alcuni verbi d'azione non richiedono oggetto, in base al concetto (valido in ogni lingua):
// TD Lotto 3 Configurazione di gioco, §3.2 (lessico.verbiSenzaOggetto); storia della
// regola: DORMIRE (azione senza oggetto); ESAMINARE/GUARDARE (descrivono il luogo);
// SCAVARE/ACCENDERE (TD Lessico L2 risposte e testi, §5.2); SPEGNERE/SCAPPARE/
// SORRIDERE/SEDERSI/PARLARE (lotto L2b, §5.2); ATTACCARE (lotto L3, TD Lessico L3, §5).
const ACTION_NO_OBJECT = new Set(CONFIG.lessico.verbiSenzaOggetto);

// ParseResult di base: stesse chiavi, stesso ordine, stessi valori iniziali di sempre.
function createBaseResult(input) {
  const OriginalInput = typeof input === 'string' ? input : '';
  return {
    IsValid: false,
    OriginalInput,
    NormalizedInput: '',
    CommandType: null,
    CanonicalVerb: null,
    CanonicalNoun: null,
    NounIndex: null,
    // campi diagnostici/canonici aggiuntivi (additivi)
    VerbTermId: null,
    VerbConcept: null,
    NounTermId: null,
    NounConcept: null,
    // Nome digitato dal giocatore (minuscolo, senza parole vuote; per i nomi composti
    // le parole digitate unite da uno spazio), usato nei messaggi generici quando il
    // nome non corrisponde a un oggetto (TD Lessico L3, §4.10).
    NounLiteral: null,
    Error: ParseErrorType.NONE,
    Details: null,
    // campi diagnostici per errori specifici
    UnknownToken: null,
    UnknownNounToken: null,
  };
}

// I quattro controlli iniziali, nell'ordine attuale (tabella di decisione #1-4).
// Ritorna il ParseResult di errore, oppure null se l'input passa tutti i controlli.
function validateRawInput(input, base) {
  if (typeof input !== 'string') {
    return { ...base, Error: ParseErrorType.INVALID_INPUT, Details: 'NOT_A_STRING' };
  }
  if (hasControlChars(input)) {
    return { ...base, Error: ParseErrorType.INVALID_INPUT, Details: 'CONTROL_CHARS' };
  }
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return { ...base, Error: ParseErrorType.INVALID_INPUT, Details: 'EMPTY_INPUT' };
  }
  if (trimmed.length > 500) {
    return { ...base, Error: ParseErrorType.INVALID_INPUT, Details: 'LENGTH_OUT_OF_RANGE' };
  }
  return null;
}

// Normalizzazione, divisione in token, eliminazione delle stopword, token originali
// corrispondenti. Allineamento invariato: il token originale di posizione i è la
// parola i dell'input diviso sugli spazi (prima della rimozione della punteggiatura).
function tokenize(input, tokenMap) {
  const NormalizedInput = normalizeInput(input);
  const rawTokens = NormalizedInput.length ? NormalizedInput.split(' ') : [];
  const trimmed = input.trim();
  const originalTokens = trimmed.length ? trimmed.split(/\s+/) : [];

  const looked = rawTokens.map((t) => tokenMap.get(t) || null);
  const filteredTokens = [];
  const filteredOriginalTokens = [];
  for (let i = 0; i < rawTokens.length; i++) {
    const info = looked[i];
    if (info && info.type === CommandType.STOPWORD) continue; // scarta
    filteredTokens.push({ token: rawTokens[i], info });
    filteredOriginalTokens.push(originalTokens[i] || rawTokens[i]);
  }
  return { NormalizedInput, filteredTokens, filteredOriginalTokens };
}

// Costruttore condiviso per ACTION + nome (nome semplice o composto): NounIndex è
// passato come parametro (idx per il nome semplice, null per il composto).
function buildActionNounResult(verbInfo, nounInfo, nounLiteral, nounIndex, base) {
  return {
    ...base,
    IsValid: true,
    CommandType: CommandType.ACTION,
    CanonicalVerb: verbInfo.canonical,
    CanonicalNoun: nounInfo.canonical,
    VerbTermId: verbInfo.termId,
    VerbConcept: verbInfo.concept,
    NounTermId: nounInfo.termId,
    NounConcept: nounInfo.concept,
    NounLiteral: nounLiteral,
    NounIndex: nounIndex,
  };
}

// Costruttore condiviso per CARICA/LOAD + nome (nome semplice o composto): stesso
// esito di #98, NounIndex passato come parametro (idx per il nome semplice, null per
// il composto, come oggi). Il verbo mostrato è sempre "caricare" (IT) / "load" (EN),
// mai il concetto italiano forzato come canonico per i verbi di sistema.
function buildCaricaResult(verbInfo, nounInfo, nounLiteral, nounIndex, base, currentLingua) {
  return {
    ...base,
    IsValid: true,
    CommandType: CommandType.ACTION,
    CanonicalVerb: currentLingua === 1 ? 'CARICARE' : 'LOAD',
    VerbTermId: verbInfo.termId,
    VerbConcept: 'CARICARE',
    CanonicalNoun: nounInfo.canonical,
    NounTermId: nounInfo.termId,
    NounConcept: nounInfo.concept,
    NounLiteral: nounLiteral,
    NounIndex: nounIndex,
  };
}

// 1 token (tabella di decisione #6-9).
function parseSingleToken({ token, info }, base) {
  if (!info) return { ...base, Error: ParseErrorType.COMMAND_UNKNOWN, UnknownToken: token };

  if (info.type === CommandType.NAVIGATION || info.type === CommandType.SYSTEM) {
    return {
      ...base,
      IsValid: true,
      CommandType: info.type,
      CanonicalVerb: info.canonical,
      VerbTermId: info.termId,
      VerbConcept: info.concept,
    };
  }

  if (info.type === CommandType.ACTION) {
    // Verbi che non richiedono oggetto
    if (ACTION_NO_OBJECT.has(info.concept)) {
      return {
        ...base,
        IsValid: true,
        CommandType: CommandType.ACTION,
        CanonicalVerb: info.canonical,
        VerbTermId: info.termId,
        VerbConcept: info.concept,
      };
    }
    return { ...base, Error: ParseErrorType.SYNTAX_ACTION_INCOMPLETE };
  }

  // NOUN singolo o altro
  return { ...base, Error: ParseErrorType.SYNTAX_INVALID_STRUCTURE };
}

// Cerca il resto dei token dopo il verbo come nome: la chiave esistente nel tokenMap
// vince sempre; se non esiste, si usa la chiave derivata di un nome di 3+ parole.
function lookupNounKey(key, { tokenMap, longNounIndex }) {
  return tokenMap.get(key) || longNounIndex.get(key) || null;
}

// Nome composto (tutti i token dopo il verbo), con ACTION o con CARICARE: 3 token senza
// indice numerico finale (tabella di decisione #10-13, 13a) o più di 3 token (#21a).
// Supporto NOUN multi-parola per mantenere compatibilità con VociLessico che contengono
// spazi (es. "LARGE TABLE") e, dal #128, con i nomi di 3+ parole il cui resto coincide
// per intero con la chiave derivata.
function parseCompoundNoun(t1, rest, filteredOriginalTokens, vocab, base, currentLingua) {
  if (!t1.info) return { ...base, Error: ParseErrorType.COMMAND_UNKNOWN, UnknownToken: t1.token };

  const combinedToken = rest.map((t) => t.token).join(' ');
  const combinedInfo = lookupNounKey(combinedToken, vocab);
  const isCombinedNoun = !!combinedInfo && combinedInfo.type === CommandType.NOUN;
  const nounLiteral = filteredOriginalTokens.slice(1).join(' ').toLowerCase();

  if (isCombinedNoun && t1.info.type === CommandType.ACTION) {
    return buildActionNounResult(t1.info, combinedInfo, nounLiteral, null, base);
  }

  // CARICA/LOAD seguito da un nome composto (vedi anche il caso a 2 token, sopra).
  if (isCombinedNoun && t1.info.type === CommandType.SYSTEM && t1.info.concept === 'CARICARE') {
    return buildCaricaResult(t1.info, combinedInfo, nounLiteral, null, base, currentLingua);
  }

  return { ...base, Error: ParseErrorType.SYNTAX_INVALID_STRUCTURE };
}

// 2 token, o 3 con indice numerico finale (tabella di decisione #14-20).
function parseTwoTokens(t1, t2, idx, filteredOriginalTokens, base, currentLingua) {
  if (!t1.info) return { ...base, Error: ParseErrorType.COMMAND_UNKNOWN, UnknownToken: t1.token };

  if (t1.info.type === CommandType.NAVIGATION || t1.info.type === CommandType.SYSTEM) {
    // CARICA/LOAD seguito da un nome diventa un'azione (#98, TD Lessico L2 risposte e
    // testi, §5.2): da sola (un token) resta il caricamento della partita, gestito sopra.
    if (t1.info.type === CommandType.SYSTEM && t1.info.concept === 'CARICARE' && t2.info && t2.info.type === CommandType.NOUN) {
      const nounLiteral = (filteredOriginalTokens[1] || t2.token).toLowerCase();
      return buildCaricaResult(t1.info, t2.info, nounLiteral, idx, base, currentLingua);
    }
    // Non devono avere oggetto
    return { ...base, Error: ParseErrorType.SYNTAX_INVALID_STRUCTURE };
  }

  if (t1.info.type === CommandType.ACTION) {
    if (!t2.info) return { ...base, Error: ParseErrorType.SYNTAX_NOUN_UNKNOWN, UnknownNounToken: filteredOriginalTokens[1] || t2.token };
    if (t2.info.type !== CommandType.NOUN) return { ...base, Error: ParseErrorType.SYNTAX_INVALID_STRUCTURE };
    const nounLiteral = (filteredOriginalTokens[1] || t2.token).toLowerCase();
    return buildActionNounResult(t1.info, t2.info, nounLiteral, idx, base);
  }

  // T1 NOUN o altro -> struttura non valida
  return { ...base, Error: ParseErrorType.SYNTAX_INVALID_STRUCTURE };
}

/**
 * Analizza un comando utente e produce un ParseResult deterministico; non lancia
 * mai eccezioni per input invalido (#63, lotto 2: nuova firma senza `dbPath`).
 * @param {*} input - testo digitato dal giocatore (qualunque valore: i non stringa
 *   producono un ParseResult di errore, mai un'eccezione)
 * @param {{currentLingua?: number}|null} gameState - stato di gioco, solo per la lingua
 * @returns {Promise<object>} ParseResult
 */
export async function parseInput(input, gameState = null) {
  const vocab = await ensureVocabulary(gameState);
  const { tokenMap } = vocab;
  const currentLingua = gameState?.currentLingua || 1;
  const base = createBaseResult(input);

  const invalid = validateRawInput(input, base);
  if (invalid) return invalid;

  const { NormalizedInput, filteredTokens, filteredOriginalTokens } = tokenize(input, tokenMap);
  const baseWithNormalized = { ...base, NormalizedInput };

  // Nessun token utile (tabella di decisione #5)
  if (filteredTokens.length === 0) {
    return { ...baseWithNormalized, Error: ParseErrorType.COMMAND_UNKNOWN };
  }

  if (filteredTokens.length === 1) {
    return parseSingleToken(filteredTokens[0], baseWithNormalized);
  }

  // 2 o 3 token (supporto indice numerico opzionale come terzo token)
  if (filteredTokens.length === 2 || filteredTokens.length === 3) {
    const [t1, t2, t3] = filteredTokens;
    const idx = t3 && isDigits(t3.token) ? parseInt(t3.token, 10) : null;
    const extra = filteredTokens.length === 3 && idx === null;

    if (extra) {
      return parseCompoundNoun(t1, [t2, t3], filteredOriginalTokens, vocab, baseWithNormalized, currentLingua);
    }
    return parseTwoTokens(t1, t2, idx, filteredOriginalTokens, baseWithNormalized, currentLingua);
  }

  // Più di 3 token: valido solo con verbo noto e nome di 3+ parole (#21a); altrimenti
  // troppi token, anche con primo token sconosciuto (tabella di decisione #21)
  if (filteredTokens[0].info) {
    return parseCompoundNoun(filteredTokens[0], filteredTokens.slice(1), filteredOriginalTokens, vocab, baseWithNormalized, currentLingua);
  }
  return { ...baseWithNormalized, Error: ParseErrorType.SYNTAX_INVALID_STRUCTURE };
}

/**
 * @deprecated usare `parseInput(input, gameState)`. Involucro compatibile mantenuto
 * per i test protetti che chiamano `parseCommand(null, ...)` (27 file); da rimuovere
 * solo quando quei test potranno migrare (non in v1.4.2, TD Lotto 2 Parser, D-L2-1).
 */
export async function parseCommand(dbPath, input, gameState = null) {
  return parseInput(input, gameState);
}
