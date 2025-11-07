import express from 'express';
import { ensureVocabulary, parseCommand } from '../logic/parser.js';
import { toCommandDTO, executeCommandAsync, getGameStateSnapshot, resetGameState, confirmRestart } from '../logic/engine.js';
import { mapParseErrorToUserMessage } from '../logic/messages.js';

const router = express.Router();

router.post('/execute', async (req, res) => {
  try {
    const dbPath = process.env.ODESSA_DB_PATH || './db/Odessa.db';
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', async () => {
      let input = '';
      try {
        const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
        input = (body?.input || '').toString();
      } catch {
        // Body assente o JSON non valido: ignora e prosegui con input vuoto
        input = '';
      }
      await ensureVocabulary(dbPath);
      const state = getGameStateSnapshot();
      // Se siamo in attesa conferma riavvio, bypassa parser e interpreta input come SI/NO
      if (state.awaitingRestart) {
        const engine = await confirmRestart(dbPath, input);
        return res.json({ ok: true, parseResult: null, command: null, engine });
      }
      const parsed = await parseCommand(dbPath, input);
      if (parsed.IsValid !== true) {
        const userMessage = mapParseErrorToUserMessage(parsed);
        return res.status(400).json({ ok: false, parseResult: parsed, error: parsed.Error, userMessage });
      }
  const command = toCommandDTO(parsed);
  const engine = await executeCommandAsync(dbPath, parsed);
      res.json({ ok: true, parseResult: parsed, command, engine });
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;

// Stato engine: snapshot
router.get('/state', (req, res) => {
  try {
    const snap = getGameStateSnapshot();
    res.json({ ok: true, state: snap });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Stato engine: reset
router.post('/reset', (req, res) => {
  try {
    resetGameState();
    const snap = getGameStateSnapshot();
    res.json({ ok: true, state: snap });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});
