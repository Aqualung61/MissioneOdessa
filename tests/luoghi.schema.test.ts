import { describe, it, expect } from 'vitest';
import Luoghi from '../src/data-internal/Luoghi.json';

describe('Schema Luoghi allineato (Terminale INTEGER, not null)', () => {
  it('colonna Terminale presente come numero', () => {
    const sample = Luoghi[0];
    expect(sample).toHaveProperty('Terminale');
    expect(typeof sample.Terminale).toBe('number');
  });

  it('conteggio righe coerente (>= 59)', () => {
    expect(Luoghi.length).toBeGreaterThanOrEqual(59);
  });

  it('valori Terminale attesi su subset (8,40,54 = -1; altri = 0)', () => {
    const luogo8 = Luoghi.find(l => l.ID === 8);
    const luogo40 = Luoghi.find(l => l.ID === 40);
    const luogo54 = Luoghi.find(l => l.ID === 54);
    const luogo1 = Luoghi.find(l => l.ID === 1);
    const luogo9 = Luoghi.find(l => l.ID === 9);
    expect([luogo8?.Terminale, luogo40?.Terminale, luogo54?.Terminale]).toEqual([-1, -1, -1]);
    expect([luogo1?.Terminale, luogo9?.Terminale]).toEqual([0, 0]);
  });
});
