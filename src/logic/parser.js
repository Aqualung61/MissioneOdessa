// Parser di comandi utente conforme REQ01
// - Carica lessico da global.odessaData in memoria (Map token -> { type, canonical, termId })
// - Normalizza input (trim, upper, collapse spaces)
// - Rimuove stopword
// - Valida grammatica e produce ParseResult

// Rimossi import sqlite3 e open, ora usa global.odessaData

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
  COMMAND_UNKNOWN: 'COMMAND_UNKNOWN',
  SYNTAX_ACTION_INCOMPLETE: 'SYNTAX_ACTION_INCOMPLETE',
  SYNTAX_NOUN_UNKNOWN: 'SYNTAX_NOUN_UNKNOWN',
  SYNTAX_INVALID_STRUCTURE: 'SYNTAX_INVALID_STRUCTURE',
};

// Cache interna del vocabolario per processo
let vocabCache = null;

// Rimossi vocabDbPath, ora usa global.odessaData sempre disponibile

export function resetVocabularyCache() {
  vocabCache = null;
}

// Carica il vocabolario da global.odessaData e costruisce:
// - tokenMap: Map<string, { type, canonical, termId }>
// - canonicalByTerm: Map<termId, canonicalToken>
export async function ensureVocabulary() {
  // Usa global.odessaData
  if (vocabCache) return vocabCache;

  // Simula la query JOIN usando filtri su global.odessaData
  const rows = global.odessaData.VociLessico
    .filter(vl => vl.ID_Lingua === 1)
    .map(vl => {
      const tl = global.odessaData.TerminiLessico.find(tl => tl.ID_Termine === vl.ID_Termine);
      if (!tl) return null; // Skip se termine non trovato
      const t = global.odessaData.TipiLessico.find(t => t.ID_TipoLessico === tl.ID_TipoLessico);
      if (!t) return null; // Skip se tipo non trovato
      return {
        Tipo: t.NomeTipo,
        TermineID: tl.ID_Termine,
        Concetto: tl.Concetto,
        Voce: vl.Voce
      };
    })
    .filter(row => row !== null); // Rimuovi null

  const tokenMap = new Map();
  const canonicalByTerm = new Map();

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

  // Funzione per rimuovere diacritici (accenti)
  const removeDiacritics = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  for (const r of rows) {
    const type = mapTipoToCommandType(r.Tipo);
    if (!type) continue;
    const token = r.Voce.toUpperCase();
    // Canonico per termine:
    // - NAVIGAZIONE: forziamo il concetto come canonico stabile (es. NORD, BASSO)
    // - altri tipi: prendi il minimo lessicografico tra le voci IT
    const prev = canonicalByTerm.get(r.TermineID);
    if (type === CommandType.NAVIGATION) {
      canonicalByTerm.set(r.TermineID, String(r.Concetto || token).toUpperCase());
    } else if (!prev || token < prev) {
      canonicalByTerm.set(r.TermineID, token);
    }
    const info = { type, canonical: null, termId: r.TermineID, concept: r.Concetto };
    tokenMap.set(token, info);
    // Aggiungi alias senza diacritici per tollerare input senza accenti (es. GIU -> GIÙ)
    const noAcc = removeDiacritics(token);
    if (noAcc !== token && !tokenMap.has(noAcc)) {
      tokenMap.set(noAcc, info);
    }
  }
  // Finalizza canonical
  for (const [tok, info] of tokenMap) {
    const canon = canonicalByTerm.get(info.termId) || tok;
    tokenMap.set(tok, { ...info, canonical: canon });
  }

  vocabCache = { tokenMap };
  return vocabCache;
}// Preprocess: rimuove punteggiatura comune (ma preserva '?'), rimuove accenti, normalizza spazi
function normalizeInput(input) {
  const withoutPunct = input
    // sostituisci punteggiatura comune con spazio, ma NON rimuovere '?' che è un comando valido
    // Nota: in una character class JS, ']' chiude la classe. Per includerlo va escapato (\]) oppure
    // posizionato come primo carattere della classe; qui manteniamo l'escape per chiarezza.
    // '[' invece non necessita di escape all'interno della classe.
  // Manteniamo qui l'escape esplicito di ']' (\]) per massima leggibilità; '[' resta
  // non escapato perché non necessario all'interno della classe.
  .replace(/[.,;:!"'“”‘’()[\]{}…]/g, ' ');
  const noAcc = withoutPunct.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return noAcc.trim().toUpperCase().replace(/\s+/g, ' ');
}

function isDigits(str) {
  return /^\d+$/.test(str);
}

// Alcuni verbi d'azione non richiedono oggetto
// DORMI: azione senza oggetto
// ESAMINA/GUARDA: possono essere usati senza oggetto per descrivere il luogo
const ACTION_NO_OBJECT = new Set(['DORMI', 'ESAMINA', 'GUARDA']);

export async function parseCommand(dbPath, input) {
  const vocab = await ensureVocabulary();
  const { tokenMap } = vocab;
  const OriginalInput = input;
  const NormalizedInput = normalizeInput(input);
  const rawTokens = NormalizedInput.length ? NormalizedInput.split(' ') : [];

  // Mappa token -> info e filtra STOPWORD
  const looked = rawTokens.map((t) => tokenMap.get(t) || null);
  const filteredTokens = [];
  for (let i = 0; i < rawTokens.length; i++) {
    const info = looked[i];
    if (info && info.type === CommandType.STOPWORD) continue; // scarta
    filteredTokens.push({ token: rawTokens[i], info });
  }

  // Helper per risultato
  const base = {
    IsValid: false,
    OriginalInput,
    NormalizedInput,
    CommandType: null,
    CanonicalVerb: null,
    CanonicalNoun: null,
    NounIndex: null,
    // campi diagnostici/canonici aggiuntivi (additivi)
    VerbTermId: null,
    VerbConcept: null,
    NounTermId: null,
    NounConcept: null,
    Error: ParseErrorType.NONE,
    // campi diagnostici per errori specifici
    UnknownToken: null,
    UnknownNounToken: null,
  };

  // Nessun token utile
  if (filteredTokens.length === 0) {
    return { ...base, Error: ParseErrorType.COMMAND_UNKNOWN };
  }

  // Caso 1 token
  if (filteredTokens.length === 1) {
    const { token, info } = filteredTokens[0];
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
      if (ACTION_NO_OBJECT.has(info.canonical)) {
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

  // Caso 2 o 3 token (supporto indice numerico opzionale come terzo token)
  if (filteredTokens.length === 2 || filteredTokens.length === 3) {
    const [t1, t2, t3] = filteredTokens;
    const idx = t3 && isDigits(t3.token) ? parseInt(t3.token, 10) : null;
    const extra = filteredTokens.length === 3 && idx === null;
    if (extra) return { ...base, Error: ParseErrorType.SYNTAX_INVALID_STRUCTURE };

    if (!t1.info) return { ...base, Error: ParseErrorType.COMMAND_UNKNOWN, UnknownToken: t1.token };

    if (t1.info.type === CommandType.NAVIGATION || t1.info.type === CommandType.SYSTEM) {
      // Non devono avere oggetto
      return { ...base, Error: ParseErrorType.SYNTAX_INVALID_STRUCTURE };
    }

    if (t1.info.type === CommandType.ACTION) {
      if (!t2.info) return { ...base, Error: ParseErrorType.SYNTAX_NOUN_UNKNOWN, UnknownNounToken: t2.token };
      if (t2.info.type !== CommandType.NOUN) return { ...base, Error: ParseErrorType.SYNTAX_INVALID_STRUCTURE };
      return {
        ...base,
        IsValid: true,
        CommandType: CommandType.ACTION,
        CanonicalVerb: t1.info.canonical,
        CanonicalNoun: t2.info.canonical,
        VerbTermId: t1.info.termId,
        VerbConcept: t1.info.concept,
        NounTermId: t2.info.termId,
        NounConcept: t2.info.concept,
        NounIndex: idx,
      };
    }

    // T1 NOUN o altro -> struttura non valida
    return { ...base, Error: ParseErrorType.SYNTAX_INVALID_STRUCTURE };
  }

  // Troppi token
  return { ...base, Error: ParseErrorType.SYNTAX_INVALID_STRUCTURE };
}

