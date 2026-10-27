/**
 * Nomi di 3 o più parole nel parser (#128, v1.4.4).
 * Specifica: TD Parser nomi lunghi v1.4.4 v1.0, §3 (righe 13a e 21a della tabella di
 * decisione) e §5.3.
 *
 * Un nome lungo è riconosciuto quando l'intero resto dei token dopo il verbo (ACTION o
 * CARICARE) coincide con la chiave derivata di una voce NOUN di 3+ parole: i token della
 * voce, normalizzati come l'input, senza le STOPWORD. I valori attesi (concetto del nome,
 * forma canonica) sono quelli dell'oracolo calcolato con il parser v1.4.3 sulla voce breve
 * dello stesso termine, non sull'output di questa implementazione.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ensureVocabulary, parseCommand, resetVocabularyCache } from '../src/logic/parser.js';
import VociLessico from '../src/data-internal/VociLessico.json';
import Oggetti from '../src/data-internal/Oggetti.json';
import TerminiLessico from '../src/data-internal/TerminiLessico.json';
import TipiLessico from '../src/data-internal/TipiLessico.json';

type Fields = Record<string, unknown>;

// Campi del ParseResult che riflettono la forma digitata (TD §5.2)
const TYPED_FORM_FIELDS = ['OriginalInput', 'NormalizedInput', 'NounLiteral'];

async function parse(input: string, lingua: number): Promise<Fields> {
  return (await parseCommand(null, input, { currentLingua: lingua })) as Fields;
}

function withoutTypedForm(r: Fields): Fields {
  const copy = { ...r };
  for (const k of TYPED_FORM_FIELDS) delete copy[k];
  return copy;
}

// Oracolo: [lingua, voce lunga, voce breve, NounConcept, CanonicalNoun]
const LONG_NOUNS: Array<[number, string, string, string, string]> = [
  [1, 'bastone di comando', 'bastone', 'BASTONE_DI_COMANDO', 'BASTONE'],
  [1, 'arazzo in pessime condizioni', 'arazzo', 'ARAZZO_IN_PESSIME_CONDIZIONI', 'ARAZZO'],
  [1, 'lista di servizio', 'lista', 'LISTA_DI_SERVIZIO', 'LISTA'],
  [1, 'trofei alle pareti', 'trofei', 'TROFEI_ALLE_PARETI', 'TROFEI'],
  [1, 'banco degli attrezzi', 'banco', 'BANCO_DEGLI_ATTREZZI', 'BANCO'],
  [2, 'tapestry in terrible condition', 'tapestry', 'Tapestry in terrible condition', 'TAPESTRY'],
  [2, 'trophies on the walls', 'trophies', 'Trophies on the walls', 'TROPHIES'],
];
const VERBS: Record<number, string[]> = { 1: ['esamina', 'prendi', 'carica'], 2: ['examine', 'take', 'load'] };

describe('Nomi di 3+ parole (#128)', () => {
  const originalData = global.odessaData;

  beforeAll(async () => {
    global.odessaData = { VociLessico, Oggetti, TerminiLessico, TipiLessico };
    resetVocabularyCache();
    await ensureVocabulary({ currentLingua: 1 });
    await ensureVocabulary({ currentLingua: 2 });
  });

  afterAll(() => {
    global.odessaData = originalData;
    resetVocabularyCache();
  });

  describe('Equivalenza con la voce breve dello stesso termine (7 voci, 3 verbi)', () => {
    for (const [lingua, lunga, breve, nounConcept, canonicalNoun] of LONG_NOUNS) {
      for (const verbo of VERBS[lingua]) {
        it(`[${lingua}] "${verbo} ${lunga}" = "${verbo} ${breve}"`, async () => {
          const long = await parse(`${verbo} ${lunga}`, lingua);
          const short = await parse(`${verbo} ${breve}`, lingua);
          expect(long.IsValid).toBe(true);
          expect(long.Error).toBe('NONE');
          expect(long.NounConcept).toBe(nounConcept);
          expect(long.CanonicalNoun).toBe(canonicalNoun);
          expect(long.NounIndex).toBeNull();
          expect(withoutTypedForm(long)).toEqual(withoutTypedForm(short));
          // NounLiteral: parole digitate senza parole vuote (TD Lessico L3, §4.10)
          const stopwords = ['in', 'alle', 'on', 'the'];
          expect(long.NounLiteral).toBe(lunga.split(' ').filter((w) => !stopwords.includes(w)).join(' '));
        });
      }
    }

    it('articoli e maiuscole non cambiano l\'esito', async () => {
      const a = await parse('ESAMINA IL BASTONE DI COMANDO', 1);
      const b = await parse('esamina bastone', 1);
      expect(a.IsValid).toBe(true);
      expect(withoutTypedForm(a)).toEqual(withoutTypedForm(b));
      const c = await parse('examine the tapestry in terrible condition', 2);
      expect(c.IsValid).toBe(true);
      expect(c.NounConcept).toBe('Tapestry in terrible condition');
    });
  });

  describe('Voci con stopword: forma completa, senza stopword o con un\'altra (Q1)', () => {
    const cases: Array<[number, string, string]> = [
      [1, 'esamina trofei alle pareti', 'esamina trofei'],
      [1, 'esamina trofei pareti', 'esamina trofei'],
      [1, 'esamina trofei nei pareti', 'esamina trofei'],
      [1, 'esamina arazzo in pessime condizioni', 'esamina arazzo'],
      [1, 'esamina arazzo pessime condizioni', 'esamina arazzo'],
      [1, 'esamina arazzo nei pessime condizioni', 'esamina arazzo'],
      [1, 'carica trofei pareti', 'carica trofei'],
      [2, 'examine trophies on the walls', 'examine trophies'],
      [2, 'examine trophies walls', 'examine trophies'],
      [2, 'examine trophies at the walls', 'examine trophies'],
      [2, 'examine tapestry terrible condition', 'examine tapestry'],
      [2, 'take tapestry in terrible condition', 'take tapestry'],
    ];
    for (const [lingua, lunga, breve] of cases) {
      it(`[${lingua}] "${lunga}" = "${breve}"`, async () => {
        const long = await parse(lunga, lingua);
        expect(long.IsValid).toBe(true);
        expect(withoutTypedForm(long)).toEqual(withoutTypedForm(await parse(breve, lingua)));
      });
    }
  });

  describe('Negativi: esito come in v1.4.3', () => {
    const invalid: Array<[number, string, string]> = [
      [1, 'esamina bastone comando', 'SYNTAX_INVALID_STRUCTURE'], // "di" resta nella chiave (E4)
      [1, 'esamina bastone di', 'SYNTAX_INVALID_STRUCTURE'],
      [1, 'esamina di comando', 'SYNTAX_INVALID_STRUCTURE'],
      [1, 'esamina arazzo in pessime', 'SYNTAX_INVALID_STRUCTURE'],
      [1, 'esamina lista di', 'SYNTAX_INVALID_STRUCTURE'],
      [1, 'esamina banco attrezzi', 'SYNTAX_INVALID_STRUCTURE'],
      [1, 'esamina bastone di comando extra', 'SYNTAX_INVALID_STRUCTURE'],
      [1, 'esamina bastone di comando 2', 'SYNTAX_INVALID_STRUCTURE'], // indice: fuori perimetro (Q3)
      [1, 'esamina trofei alle pareti 2', 'SYNTAX_INVALID_STRUCTURE'],
      [1, 'nord bastone di comando', 'SYNTAX_INVALID_STRUCTURE'], // navigazione
      [1, 'inventario bastone di comando', 'SYNTAX_INVALID_STRUCTURE'], // sistema diverso da CARICARE
      [1, 'inventario trofei alle pareti', 'SYNTAX_INVALID_STRUCTURE'],
      [1, 'xyzzy bastone di comando', 'SYNTAX_INVALID_STRUCTURE'], // primo token sconosciuto, 4 token
      [1, 'bastone di comando', 'SYNTAX_INVALID_STRUCTURE'], // primo token è un nome
      [1, 'lampada bastone di comando', 'SYNTAX_INVALID_STRUCTURE'],
      [1, 'esamina bastone di comando lampada', 'SYNTAX_INVALID_STRUCTURE'], // due nomi
      [1, 'esamina bastone di comando bastone di comando', 'SYNTAX_INVALID_STRUCTURE'],
      [2, 'examine tapestry in terrible', 'SYNTAX_INVALID_STRUCTURE'],
      [2, 'examine bastone di comando', 'SYNTAX_INVALID_STRUCTURE'], // voce italiana in sessione EN
      [2, 'examine trophies on the walls 2', 'SYNTAX_INVALID_STRUCTURE'],
      [2, 'north tapestry in terrible condition', 'SYNTAX_INVALID_STRUCTURE'],
    ];
    for (const [lingua, input, error] of invalid) {
      it(`[${lingua}] "${input}" => ${error}`, async () => {
        const r = await parse(input, lingua);
        expect(r.IsValid).toBe(false);
        expect(r.Error).toBe(error);
      });
    }

    it('primo token sconosciuto con 3 token filtrati resta COMMAND_UNKNOWN (riga 10)', async () => {
      const r = await parse('xyzzy trofei alle pareti', 1);
      expect(r.IsValid).toBe(false);
      expect(r.Error).toBe('COMMAND_UNKNOWN');
      expect(r.UnknownToken).toBe('XYZZY');
    });

    it('nessun confronto parziale: "esamina bastone" resta la voce breve, non il nome lungo', async () => {
      const r = await parse('esamina bastone', 1);
      expect(r.IsValid).toBe(true);
      expect(r.NounLiteral).toBe('bastone');
    });
  });

  describe('Invarianza: nomi a 1 e 2 parole', () => {
    const valid: Array<[number, string, string, string | null]> = [
      [1, 'esamina lampada', 'LAMPADA', null],
      [1, 'esamina grande tavolo', 'GRANDE_TAVOLO', null],
      [1, 'prendi torcia elettrica', 'TORCIA_ELETTRICA', null],
      [1, 'esamina badile arruginito', 'BADILE_ARRUGINITO', null],
      [1, 'carica peso', 'PESO', null],
      [2, 'examine large table', 'Large table', null],
      [2, 'take command baton', 'Command baton', null],
      [2, 'examine empty shelves', 'Empty shelves', null], // Q4: due parole con stopword, già valido
    ];
    for (const [lingua, input, nounConcept] of valid) {
      it(`[${lingua}] "${input}" => ${nounConcept}`, async () => {
        const r = await parse(input, lingua);
        expect(r.IsValid).toBe(true);
        expect(r.NounConcept).toBe(nounConcept);
      });
    }

    it('indice numerico dopo un nome a 2 parole resta non valido (come in v1.4.3)', async () => {
      const r = await parse('esamina torcia elettrica 2', 1);
      expect(r.IsValid).toBe(false);
      expect(r.Error).toBe('SYNTAX_INVALID_STRUCTURE');
    });

    it('più di 3 token con un nome a 2 parole non riconosciuto resta non valido', async () => {
      const r = await parse('prendi lampada e torcia', 1);
      expect(r.IsValid).toBe(false);
      expect(r.Error).toBe('SYNTAX_INVALID_STRUCTURE');
    });
  });

  describe('Dati: chiavi derivate', () => {
    const norm = (s: string) =>
      s
        .replace(/[.,;:!"'“”‘’()[\]{}…]/g, ' ')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .trim()
        .toUpperCase()
        .replace(/\s+/g, ' ');

    function tipoDi(idTermine: number): string {
      const t = TerminiLessico.find((x) => x.ID_Termine === idTermine);
      return TipiLessico.find((x) => x.ID_TipoLessico === t?.ID_TipoLessico)?.NomeTipo ?? '';
    }

    for (const lingua of [1, 2]) {
      it(`[${lingua}] nessuna coppia di voci condivide la chiave derivata; nessuna chiave derivata coincide con una chiave del tokenMap di un altro termine`, async () => {
        const voci = VociLessico.filter((v) => v.ID_Lingua === lingua);
        const stop = new Set(voci.filter((v) => tipoDi(v.ID_Termine) === 'STOPWORD').map((v) => norm(v.Voce)));
        const { tokenMap } = await ensureVocabulary({ currentLingua: lingua });
        const seen = new Map<string, number>();
        const lunghe = voci.filter((v) => tipoDi(v.ID_Termine) === 'NOUN' && norm(v.Voce).split(' ').length >= 3);
        expect(lunghe.length).toBe(lingua === 1 ? 5 : 2);
        for (const v of lunghe) {
          const key = norm(v.Voce).split(' ').filter((w) => !stop.has(w)).join(' ');
          expect(seen.has(key), `chiave derivata duplicata: ${key}`).toBe(false);
          seen.set(key, v.ID_Termine);
          const esistente = tokenMap.get(key);
          // Le voci senza stopword hanno come chiave derivata la voce stessa, già nel
          // tokenMap e dello stesso termine; le altre non devono coincidere con nulla.
          if (esistente) expect(esistente.termId, `chiave ${key}`).toBe(v.ID_Termine);
        }
        const conStopword = lunghe.filter((v) => norm(v.Voce).split(' ').some((w) => stop.has(w)));
        expect(conStopword.length).toBe(lingua === 1 ? 2 : 2);
        for (const v of conStopword) {
          const key = norm(v.Voce).split(' ').filter((w) => !stop.has(w)).join(' ');
          expect(tokenMap.has(key), `la chiave derivata ${key} non deve essere nel tokenMap`).toBe(false);
        }
      });
    }
  });

  describe('Genericità', () => {
    it('il codice dell\'indice e della ricerca non contiene riferimenti a Odessa', () => {
      const src = readFileSync(resolve(__dirname, '..', 'src', 'logic', 'parser.js'), 'utf8');
      const start = src.indexOf('function buildLongNounIndex');
      const end = src.indexOf('export async function ensureVocabulary');
      const lookupStart = src.indexOf('function lookupNounKey');
      const lookupEnd = src.indexOf('function parseCompoundNoun');
      expect(start).toBeGreaterThan(-1);
      expect(lookupStart).toBeGreaterThan(-1);
      expect(src.slice(start, end)).not.toMatch(/odessa/i);
      expect(src.slice(lookupStart, lookupEnd)).not.toMatch(/odessa/i);
    });

    it('con un vocabolario sintetico riconosce i nomi lunghi, anche con stopword', async () => {
      const tipi = [
        { ID_TipoLessico: 1, NomeTipo: 'VERBO_AZIONE' },
        { ID_TipoLessico: 4, NomeTipo: 'NOUN' },
        { ID_TipoLessico: 5, NomeTipo: 'STOPWORD' },
      ];
      const termini = [
        { ID_Termine: 1, ID_TipoLessico: 1, Concetto: 'ESAMINARE' },
        { ID_Termine: 2, ID_TipoLessico: 4, Concetto: 'GATTO_NERO_DI_CASA' },
        { ID_Termine: 3, ID_TipoLessico: 4, Concetto: 'TAZZA_SUL_TAVOLO' },
        { ID_Termine: 4, ID_TipoLessico: 5, Concetto: 'SUL' },
      ];
      const voci = [
        { ID_Voce: 1, Voce: 'esamina', ID_Termine: 1, ID_Lingua: 1 },
        { ID_Voce: 2, Voce: 'gatto nero di casa', ID_Termine: 2, ID_Lingua: 1 },
        { ID_Voce: 3, Voce: 'gatto', ID_Termine: 2, ID_Lingua: 1 },
        { ID_Voce: 4, Voce: 'tazza sul tavolo', ID_Termine: 3, ID_Lingua: 1 },
        { ID_Voce: 5, Voce: 'tazza', ID_Termine: 3, ID_Lingua: 1 },
        { ID_Voce: 6, Voce: 'sul', ID_Termine: 4, ID_Lingua: 1 },
      ];
      const saved = global.odessaData;
      try {
        global.odessaData = { VociLessico: voci, TerminiLessico: termini, TipiLessico: tipi, Oggetti: [] };
        resetVocabularyCache();
        const full = await parse('esamina gatto nero di casa', 1);
        expect(full.IsValid).toBe(true);
        expect(full.NounConcept).toBe('GATTO_NERO_DI_CASA');
        const stop = await parse('esamina tazza tavolo', 1);
        expect(stop.IsValid).toBe(true);
        expect(stop.NounConcept).toBe('TAZZA_SUL_TAVOLO');
        expect((await parse('esamina gatto nero', 1)).IsValid).toBe(false);
      } finally {
        global.odessaData = saved;
        resetVocabularyCache();
        await ensureVocabulary({ currentLingua: 1 });
        await ensureVocabulary({ currentLingua: 2 });
      }
    });
  });
});
