// Script Node per lanciare Playwright e restituire un report JSON sintetico
// Da usare nella rotta backend /api/run-tests


import { exec } from 'child_process';
import dotenv from 'dotenv';
dotenv.config();

export function runE2ETests(options = {}) {
  return new Promise((resolve) => {
    // Usa variabile d'ambiente TESTPATH se definita, altrimenti fallback
    const testDir = process.env.TESTPATH ? process.env.TESTPATH : 'src/tests/e2e';
    const suite = options.suite || process.env.TEST_SUITE || 'full';
    // Costruisci comando Playwright
    let cmd = `npx playwright test "${testDir}" --reporter=json`;
    // Suite "smoke": esegue solo i test minimi e veloci (versione API)
    if (suite === 'smoke') {
      const grep = 'API \\/api\\/version'; // pattern semplice e portabile
      cmd += ` -g "${grep}"`;
    }
    exec(cmd, { maxBuffer: 1024 * 1024, cwd: process.cwd() }, (error, stdout, stderr) => {
      if (error) {
        resolve({ success: false, error: error.message, stderr, testPathUsed: testDir, suiteUsed: suite, raw: stdout });
        return;
      }
      try {
        // Il reporter JSON di Playwright stampa un oggetto JSON per tutti i test
        const report = JSON.parse(stdout);
        resolve({ success: true, report, testPathUsed: testDir, suiteUsed: suite, raw: stdout });
      } catch (e) {
        resolve({ success: false, error: 'Parsing error', details: e.message, raw: stdout, testPathUsed: testDir, suiteUsed: suite });
      }
    });
  });
}
