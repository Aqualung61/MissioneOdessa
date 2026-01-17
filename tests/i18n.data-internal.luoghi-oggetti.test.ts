import { describe, it, expect } from 'vitest';
import Luoghi from '../src/data-internal/Luoghi.json';
import Oggetti from '../src/data-internal/Oggetti.json';

function assertCompleteI18nById<T extends { ID: number; IDLingua: number }>(
  datasetName: string,
  rows: T[],
) {
  const byId = new Map<number, Set<number>>();

  for (const row of rows) {
    if (!byId.has(row.ID)) byId.set(row.ID, new Set());
    byId.get(row.ID)?.add(row.IDLingua);
  }

  for (const [id, langs] of byId.entries()) {
    expect(
      [datasetName, id, Array.from(langs).sort((a, b) => a - b)],
      `${datasetName}: copertura i18n incompleta per ID=${id}`,
    ).toEqual([datasetName, id, [1, 2]]);
  }

  // Guardrail: ci aspettiamo esattamente 2 righe per ID (IT+EN)
  expect(rows.length).toBe(byId.size * 2);
}

describe('Sprint 59.3 — Data-internal: Luoghi + Oggetti', () => {
  it('Luoghi: per ogni ID esistono IT+EN (IDLingua 1/2)', () => {
    assertCompleteI18nById('Luoghi', Luoghi);
  });

  it('Oggetti: per ogni ID esistono IT+EN (IDLingua 1/2)', () => {
    assertCompleteI18nById('Oggetti', Oggetti);
  });
});
