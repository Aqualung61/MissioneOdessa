import { describe, it, expect } from 'vitest';
import MessaggiFrontend from '../src/data-internal/MessaggiFrontend.json';

type FrontendMessageRow = {
  Chiave: string;
  IDLingua: number;
  Messaggio: string;
};

function assertCompleteI18nByKey(datasetName: string, rows: FrontendMessageRow[]) {
  const byKey = new Map<string, Set<number>>();

  for (const row of rows) {
    expect(typeof row.Chiave).toBe('string');
    expect(row.Chiave.trim().length).toBeGreaterThan(0);

    expect([1, 2]).toContain(row.IDLingua);

    expect(typeof row.Messaggio).toBe('string');
    expect(row.Messaggio.trim().length).toBeGreaterThan(0);

    // Placeholder visibile tipico se manca la chiave (i18n.js ritorna `[key]`).
    expect(row.Messaggio.trim()).not.toMatch(/^\[[^\]]+\]$/);

    if (!byKey.has(row.Chiave)) byKey.set(row.Chiave, new Set());
    byKey.get(row.Chiave)?.add(row.IDLingua);
  }

  for (const [key, langs] of byKey.entries()) {
    expect(
      [datasetName, key, Array.from(langs).sort((a, b) => a - b)],
      `${datasetName}: copertura i18n incompleta per Chiave=${key}`,
    ).toEqual([datasetName, key, [1, 2]]);
  }

  // Guardrail: ci aspettiamo esattamente 2 righe per chiave (IT+EN)
  expect(rows.length).toBe(byKey.size * 2);
}

describe('Sprint 59.8 — Test anti-regressione i18n', () => {
  it('MessaggiFrontend: per ogni Chiave esistono IT+EN (IDLingua 1/2) e nessun placeholder visibile', () => {
    assertCompleteI18nByKey('MessaggiFrontend', MessaggiFrontend as FrontendMessageRow[]);
  });
});
