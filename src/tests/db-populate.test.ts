import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, statSync } from 'fs';

const dbTestScript = 'tests/test-ddl-populate-odessatest.ps1';
const dbPath = 'test-results/odessatest.db';

describe('DB populate script', () => {
  it('crea e popola il DB di test senza errori', () => {
    // Esegue lo script PowerShell
    execSync(`pwsh -File ${dbTestScript}`, { stdio: 'inherit' });
    // Verifica che il file sia stato creato
    expect(existsSync(dbPath)).toBe(true);
    // Verifica che il file non sia vuoto
    expect(statSync(dbPath).size).toBeGreaterThan(1024);
  });
});
