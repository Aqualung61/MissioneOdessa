import express from 'express';
import { ensureVocabulary, parseCommand } from '../logic/parser.js';
import { toCommandDTO, executeCommand, getGameStateSnapshot, resetGameState } from '../logic/engine.js';
import { mapParseErrorToUserMessage } from '../logic/messages.js';

const router = express.Router();

router.post('/execute', async (req, res) => {
  try {
    const dbPath = process.env.ODESSA_DB_PATH || './db/odessa.db';
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', async () => {
      let input = '';
      try {
        const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
        input = (body?.input || '').toString();
      } catch {}
      await ensureVocabulary(dbPath);
      const parsed = await parseCommand(dbPath, input);
      if (parsed.IsValid !== true) {
        const userMessage = mapParseErrorToUserMessage(parsed);
        return res.status(400).json({ ok: false, parseResult: parsed, error: parsed.Error, userMessage });
      }
      const command = toCommandDTO(parsed);
      const engine = executeCommand(parsed);
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
