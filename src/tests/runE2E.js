// Script Node per lanciare Playwright e restituire un report JSON sintetico
// Da usare nella rotta backend /api/run-tests


import { exec } from 'child_process';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

export function runE2ETests() {
  return new Promise((resolve) => {
  // Usa variabile d'ambiente TESTPATH se definita, altrimenti fallback
  const testDir = process.env.TESTPATH ? process.env.TESTPATH : 'src/tests/e2e';
  // Esegui Playwright in modalità JSON reporter, path tra virgolette
  exec(`npx playwright test "${testDir}" --reporter=json`, { maxBuffer: 1024 * 1024, cwd: process.cwd() }, (error, stdout, stderr) => {
      if (error) {
        resolve({ success: false, error: error.message, stderr, testPathUsed: testDir, raw: stdout });
        return;
      }
      try {
        // Il reporter JSON di Playwright stampa un oggetto JSON per tutti i test
        const report = JSON.parse(stdout);
        resolve({ success: true, report, testPathUsed: testDir, raw: stdout });
      } catch (e) {
        resolve({ success: false, error: 'Parsing error', details: e.message, raw: stdout, testPathUsed: testDir });
      }
    });
  });
}
