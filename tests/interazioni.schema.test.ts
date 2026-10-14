import { describe, it, expect } from 'vitest';
import Interazioni from '../src/data-internal/Interazioni.json';
import { validateInterazioni } from '../src/logic/interactionSchema.js';

type Record_ = {
  id: string;
  IDLingua: number;
  condizioni: { prerequisiti: Array<Record<string, unknown>> };
  [key: string]: unknown;
};

const records = (): Record_[] => JSON.parse(JSON.stringify(Interazioni)) as Record_[];

describe('Interazioni.json — schema (#93)', () => {
  it('TB-07/TB-09: i dati attuali non producono errori di schema (tipi, campi, IT/EN)', () => {
    expect(validateInterazioni(Interazioni)).toEqual([]);
  });

  it('TB-08: nessuna chiave risposta_no_* nei dati', () => {
    const offending = (Interazioni as Array<Record<string, unknown>>).filter((r) =>
      Object.keys(r).some((k) => k.startsWith('risposta_no_'))
    );
    expect(offending.map((r) => r.id)).toEqual([]);
  });

  it('TB-10: segnala un tipo di prerequisito errato e una chiave non ammessa', () => {
    const copy = records();
    const target = copy.find((r) => r.id === 'accendi_lampada' && r.IDLingua === 1);
    target.condizioni.prerequisiti[0].tipo = 'OGGETO_IN_INVENTARIO';
    target.risposta_xyz = 'non ammessa';

    const errors = validateInterazioni(copy);
    expect(errors.some((e) => e.includes('tipo non ammesso: OGGETO_IN_INVENTARIO'))).toBe(true);
    expect(errors.some((e) => e.includes('chiave non ammessa: risposta_xyz'))).toBe(true);
  });

  it('segnala incoerenze IT/EN (risposta presente solo in una lingua)', () => {
    const copy = records();
    const en = copy.find((r) => r.id === 'accendi_lampada' && r.IDLingua === 2);
    delete en.condizioni.prerequisiti[0].risposta;

    const errors = validateInterazioni(copy);
    expect(
      errors.some((e) => e.includes('accendi_lampada') && e.includes('risposta presente solo in una lingua'))
    ).toBe(true);
  });

  it('segnala campi obbligatori mancanti per tipo', () => {
    const copy = records();
    const target = copy.find((r) => r.id === 'accendi_lampada' && r.IDLingua === 1);
    delete target.condizioni.prerequisiti[2].flag;

    const errors = validateInterazioni(copy);
    expect(errors.some((e) => e.includes('FLAG_FALSE') && e.includes('flag'))).toBe(true);
  });
});
