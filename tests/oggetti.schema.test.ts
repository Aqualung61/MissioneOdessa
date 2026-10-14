import { describe, it, expect } from 'vitest';
import Oggetti from '../src/data-internal/Oggetti.json';

type OggettoRecord = { ID: number; IDLingua: number; IDLuogo: unknown; Attivo: unknown };

const records = Oggetti as OggettoRecord[];

describe('Oggetti.json — schema (#94)', () => {
  it('IDLuogo è un intero non nullo in ogni record', () => {
    const invalid = records.filter((o) => !Number.isInteger(o.IDLuogo));
    expect(invalid.map((o) => `${o.ID}/${o.IDLingua}`)).toEqual([]);
  });

  it('Attivo è un intero tra 0 e 3 in ogni record', () => {
    const invalid = records.filter(
      (o) => !Number.isInteger(o.Attivo) || (o.Attivo as number) < 0 || (o.Attivo as number) > 3
    );
    expect(invalid.map((o) => `${o.ID}/${o.IDLingua}`)).toEqual([]);
  });

  it('IT ed EN hanno gli stessi ID', () => {
    const ids = (lingua: number) =>
      records
        .filter((o) => o.IDLingua === lingua)
        .map((o) => o.ID)
        .sort((a, b) => a - b);
    expect(ids(2)).toEqual(ids(1));
  });
});
