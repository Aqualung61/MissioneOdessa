/**
 * Controllo della lingua delle risposte (#109, lotti L2a, L2b e L3).
 * Specifica: docs/20261016 - TD Lessico L2 risposte e testi - v1.1.md, §4.4;
 * aggiornato per #109 (lotto L2b), precisazione 2: le parole solo italiane includono
 * anche i nomi dei concetti (`TerminiLessico`) che non sono voci inglesi.
 *
 * Sulle stesse risposte generate per l'istantanea (§4.1): nessuna risposta inglese
 * contiene parole solo italiane, nessuna risposta italiana contiene parole solo
 * inglesi, nessuna risposta contiene segnaposto rotti. Prima della correzione del
 * lotto L2a, il controllo trovava esattamente i difetti (a) e (b) della specifica;
 * dopo L2a, L2b e L3 deve risultare pulito, senza eccezioni (aggiornato per #109,
 * lotto L3: TD Lessico L3 nomi luoghi e guardia, §4.10 v1.1 — la rimozione di E5
 * toglie l'ultimo falso positivo, `botton`).
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { initOdessa } from '../src/initOdessa.js';
import { ensureVocabulary } from '../src/logic/parser.js';
import { generateResponses } from './testUtils/responseSnapshot.js';

interface VoceLessico {
  Voce: string;
  ID_Lingua: number;
}

interface TermineLessico {
  Concetto: string;
}

// Parole aggiuntive di §4.4, oltre alle voci del lessico esclusive di una lingua.
const IT_EXTRA_WORDS = ['non', 'il', 'che', 'puoi', 'vedo', 'qui', 'cosa', 'vuoi', 'nulla', 'della', 'sono', 'questo', 'particolare'];
const EN_EXTRA_WORDS = ['the', 'you', "don't", 'here', 'what', 'nothing', 'this', "can't", 'want', 'see'];
const BROKEN_PLACEHOLDER_PATTERNS = ['[Missing', 'undefined', '{0}', 'NaN', '[object'];

// Falsi positivi (§4.4), motivati: voci del lessico di una sola lettera che
// coincidono con una parola, un tag HTML o un contenuto non linguistico dell'altra
// lingua, non con un difetto di traduzione.
// - "i" (voce IT: articolo plurale "i") compare in EN come pronome "I" ("I don't
//   understand.") e nel tag HTML <i> dei messaggi di aiuto.
// - "b" (voce IT, L1: abbreviazione di "basso") compare in EN nel tag HTML <b> dei
//   messaggi di aiuto.
const IT_WORDS_FALSE_POSITIVE_IN_EN = new Set(['i', 'b']);
// - "a" (voce EN: articolo "a") compare in IT come normale preposizione italiana
//   ("intestati a David Liebermann"), non registrata nel lessico ma di uso corrente.
// - "d" (voce EN: abbreviazione di "down") compare in IT nel testo di un enigma
//   ("D S S D S"), lettere di un codice, non una parola inglese.
const EN_WORDS_FALSE_POSITIVE_IN_IT = new Set(['a', 'd']);
// Aggiornato per #109 (lotto L2b), precisazione 2: anche i nomi dei concetti
// (TerminiLessico) che non sono voci inglesi contano come "parole solo italiane" (un
// concetto italiano mostrato in inglese, es. "caricare", è un difetto).
// Aggiornato per #109 (lotto L3): rimosso "botton" (concetto della voce residua
// BOTTON_LEGACY, L2a), tolta dal lessico con la rimozione E5 (TD Lessico L3, §3).
// Nessun falso positivo residuo in questa categoria.
const IT_CONCEPTS_FALSE_POSITIVE_IN_EN = new Set<string>();

const wordRegexCache = new Map<string, RegExp>();
function containsWord(message: string, word: string): boolean {
  let re = wordRegexCache.get(word);
  if (!re) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    re = new RegExp(`\\b${escaped}\\b`, 'i');
    wordRegexCache.set(word, re);
  }
  return re.test(message);
}

/** Voci del lessico esclusive di una lingua (presenti in quella lingua, assenti nell'altra), in minuscolo. */
function buildExclusiveWordSets(): { itOnly: string[]; enOnly: string[] } {
  const voci = global.odessaData.VociLessico as VoceLessico[];
  const it = new Set(voci.filter((v) => v.ID_Lingua === 1).map((v) => v.Voce.toLowerCase()));
  const en = new Set(voci.filter((v) => v.ID_Lingua === 2).map((v) => v.Voce.toLowerCase()));
  return {
    itOnly: [...it].filter((w) => !en.has(w)),
    enOnly: [...en].filter((w) => !it.has(w)),
  };
}

/**
 * Aggiornato per #109 (lotto L2b), precisazione 2: nomi dei concetti (sempre
 * italiani, `TerminiLessico.Concetto`) che non sono anche una voce inglese. Un
 * concetto italiano mostrato in un messaggio inglese (es. "caricare" al posto di
 * "load") è un difetto di traduzione, non diverso da una voce solo italiana.
 */
function buildConceptWordsWithoutEnglishVoce(): string[] {
  const termini = global.odessaData.TerminiLessico as TermineLessico[];
  const enVoci = new Set((global.odessaData.VociLessico as VoceLessico[]).filter((v) => v.ID_Lingua === 2).map((v) => v.Voce.toLowerCase()));
  return termini.map((t) => t.Concetto.toLowerCase()).filter((c) => !enVoci.has(c));
}

describe('Controllo della lingua delle risposte (#109, lotto L2a)', () => {
  beforeAll(async () => {
    await initOdessa();
    await ensureVocabulary();
  });

  it(
    'nessuna risposta mescola le lingue o contiene segnaposto rotti',
    async () => {
      const entries = await generateResponses();
      const { itOnly, enOnly } = buildExclusiveWordSets();
      const conceptWords = buildConceptWordsWithoutEnglishVoce();
      const itForbidden = [...itOnly, ...conceptWords, ...IT_EXTRA_WORDS].filter(
        (w) => !IT_WORDS_FALSE_POSITIVE_IN_EN.has(w) && !IT_CONCEPTS_FALSE_POSITIVE_IN_EN.has(w)
      );
      const enForbidden = [...enOnly, ...EN_EXTRA_WORDS].filter((w) => !EN_WORDS_FALSE_POSITIVE_IN_IT.has(w));

      const violations: string[] = [];

      for (const entry of entries) {
        const broken = BROKEN_PLACEHOLDER_PATTERNS.find((p) => entry.message.includes(p));
        if (broken) {
          violations.push(`lang=${entry.lang} step=${entry.step} input="${entry.input}": segnaposto "${broken}" in "${entry.message}"`);
          continue;
        }

        if (entry.lang === 2) {
          const parola = itForbidden.find((w) => containsWord(entry.message, w));
          if (parola) {
            violations.push(`lang=2 step=${entry.step} input="${entry.input}": parola italiana "${parola}" in "${entry.message}"`);
          }
        } else if (entry.lang === 1) {
          const parola = enForbidden.find((w) => containsWord(entry.message, w));
          if (parola) {
            violations.push(`lang=1 step=${entry.step} input="${entry.input}": parola inglese "${parola}" in "${entry.message}"`);
          }
        }
      }

      expect(violations.length, violations.slice(0, 50).join('\n')).toBe(0);
    },
    // Timeout esteso (#109, lotto L3): genera ~88.000 risposte con motore e parser
    // reali (vedi generateResponses, cresciuto con il lessico di L3), più lento del
    // default di Vitest sotto carico nella suite completa.
    60000
  );
});
