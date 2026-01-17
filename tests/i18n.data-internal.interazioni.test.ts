import { describe, it, expect } from 'vitest';
import Interazioni from '../src/data-internal/Interazioni.json';

function assertCompleteI18nByStringId<T extends { id: string; IDLingua: number }>(
  datasetName: string,
  rows: T[],
) {
  const byId = new Map<string, Set<number>>();

  for (const row of rows) {
    if (!byId.has(row.id)) byId.set(row.id, new Set());
    byId.get(row.id)?.add(row.IDLingua);
  }

  for (const [id, langs] of byId.entries()) {
    expect(
      [datasetName, id, Array.from(langs).sort((a, b) => a - b)],
      `${datasetName}: copertura i18n incompleta per id=${id}`,
    ).toEqual([datasetName, id, [1, 2]]);
  }

  // Guardrail: ci aspettiamo esattamente 2 righe per id (IT+EN)
  expect(rows.length).toBe(byId.size * 2);
}

describe('Sprint 59.5 — Data-internal: Interazioni (IT+EN)', () => {
  it('Interazioni: per ogni id esistono IT+EN (IDLingua 1/2)', () => {
    assertCompleteI18nByStringId('Interazioni', Interazioni);
  });
});
