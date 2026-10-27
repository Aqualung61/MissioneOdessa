/**
 * Caratterizzazione di `validateInterazioni` (#63).
 * Specifica: `docs/20261021 - TD Lotto 5 Effetti di turno, route e ESLint - v1.2.md`, §5.1 test 5.
 *
 * Un insieme di record malformati produce OGNI messaggio dell'elaboratore almeno una volta;
 * si verifica l'elenco completo, nell'ordine. Messaggi coperti:
 *   1  Interazioni: atteso un array di record             (ingresso non array)
 *   2  chiave non ammessa                                  (record a)
 *   3  prerequisito #n tipo non ammesso                    (record a: #1, #5 null, #6 vuoto)
 *   4  prerequisito #n (tipo) campo obbligatorio mancante  (record a: #2)
 *   5  prerequisito #n chiave non ammessa                  (record a: #3)
 *   6  prerequisito #n risposta deve essere una stringa    (record a: #4)
 *   7  effetto #n tipo non ammesso                         (record a: #2)
 *   8  punteggio deve essere false o una stringa           (record p)
 *   9  punteggio riferisce un id inesistente               (record q)
 *   10 [id] presente in lingua A ma assente in lingua B    (record h)
 *   11 [id] presente in lingua B ma assente in lingua A    (record i)
 *   12 tipi di prerequisito diversi tra lingue             (record a)
 *   13 prerequisito #n: risposta presente solo in una lingua (record t)
 *   14 tipi di effetto diversi tra lingue                  (record a)
 *   15 punteggio diverso tra lingue                        (record r)
 * Gli attesi sono stati ricavati eseguendo il baseline e controllati a mano rispetto a
 * `src/logic/interactionSchema.js`.
 */

import { describe, it, expect } from 'vitest';
import { validateInterazioni } from '../src/logic/interactionSchema.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

const MALFORMED: Json[] = [
  // a (IT): chiave di primo livello non ammessa, prerequisiti ed effetti malformati
  {
    id: 'a',
    IDLingua: 1,
    extra: true,
    condizioni: {
      prerequisiti: [
        { tipo: 'NOPE' },
        { tipo: 'OGGETTO_IN_LUOGO', target: 1 },
        { tipo: 'FLAG_FALSE', flag: 'x', colore: 'rosso' },
        { tipo: 'INVENTARIO_NON_PIENO', risposta: 5 },
        null,
        {},
      ],
    },
    effetti: [{ tipo: 'VISIBILITA' }, { tipo: 'BOH' }],
  },
  // a (EN): senza prerequisiti né effetti → tipi diversi tra le lingue
  { id: 'a', IDLingua: 2, condizioni: { prerequisiti: [] }, effetti: [] },
  // p: punteggio di tipo errato (in entrambe le lingue)
  { id: 'p', IDLingua: 1, punteggio: 42 },
  { id: 'p', IDLingua: 2, punteggio: 42 },
  // q: punteggio che riferisce un id inesistente (in entrambe le lingue)
  { id: 'q', IDLingua: 1, punteggio: 'nonesiste' },
  { id: 'q', IDLingua: 2, punteggio: 'nonesiste' },
  // r: punteggio diverso tra le lingue (riferimento valido in IT, false in EN)
  { id: 'r', IDLingua: 1, punteggio: 'a' },
  { id: 'r', IDLingua: 2, punteggio: false },
  // t: risposta del prerequisito presente solo in una lingua
  { id: 't', IDLingua: 1, condizioni: { prerequisiti: [{ tipo: 'INVENTARIO_NON_PIENO', risposta: 'x' }] } },
  { id: 't', IDLingua: 2, condizioni: { prerequisiti: [{ tipo: 'INVENTARIO_NON_PIENO' }] } },
  // h: solo in IT; i: solo in EN
  { id: 'h', IDLingua: 1 },
  { id: 'i', IDLingua: 2 },
];

const EXPECTED_ERRORS = [
  '[a / lingua 1] chiave non ammessa: extra',
  '[a / lingua 1] prerequisito #1 tipo non ammesso: NOPE',
  '[a / lingua 1] prerequisito #2 (OGGETTO_IN_LUOGO) campo obbligatorio mancante: luogo',
  '[a / lingua 1] prerequisito #3 chiave non ammessa: colore',
  '[a / lingua 1] prerequisito #4 risposta deve essere una stringa',
  '[a / lingua 1] prerequisito #5 tipo non ammesso: undefined',
  '[a / lingua 1] prerequisito #6 tipo non ammesso: undefined',
  '[a / lingua 1] effetto #2 tipo non ammesso: BOH',
  '[p / lingua 1] punteggio deve essere false o una stringa',
  '[p / lingua 2] punteggio deve essere false o una stringa',
  '[q / lingua 1] punteggio riferisce un id inesistente nella stessa lingua: nonesiste',
  '[q / lingua 2] punteggio riferisce un id inesistente nella stessa lingua: nonesiste',
  '[h] presente in lingua 1 ma assente in lingua 2',
  '[i] presente in lingua 2 ma assente in lingua 1',
  '[a] tipi di prerequisito diversi tra lingue 1 e 2: NOPE,OGGETTO_IN_LUOGO,FLAG_FALSE,INVENTARIO_NON_PIENO,, / ',
  '[a] tipi di effetto diversi tra lingue 1 e 2: VISIBILITA,BOH / ',
  '[r] punteggio diverso tra lingue 1 e 2: "a" / false',
  '[t] prerequisito #1: risposta presente solo in una lingua (1/2)',
];

describe('validateInterazioni — caratterizzazione', () => {
  it('record malformati: elenco completo dei messaggi, nell\'ordine', () => {
    expect(validateInterazioni(MALFORMED)).toEqual(EXPECTED_ERRORS);
  });

  it('i record di ingresso non vengono modificati', () => {
    const copy = JSON.parse(JSON.stringify(MALFORMED));
    validateInterazioni(MALFORMED);
    expect(JSON.parse(JSON.stringify(MALFORMED))).toEqual(copy);
  });

  it.each([[undefined], [{}], ['x'], [null], [42]])('ingresso non array (%j) → messaggio unico', (input) => {
    expect(validateInterazioni(input as Json)).toEqual(['Interazioni: atteso un array di record']);
  });

  it('array vuoto e record nullo: nessun errore', () => {
    expect(validateInterazioni([])).toEqual([]);
    expect(validateInterazioni([null])).toEqual([]);
  });

  it('record senza id né lingua: segnaposto "?" nel prefisso', () => {
    expect(validateInterazioni([{ x: 1 }])).toEqual(['[? / lingua ?] chiave non ammessa: x']);
  });
});
