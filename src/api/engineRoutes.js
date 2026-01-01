import express from 'express';
import { parseCommand } from '../logic/parser.js';
import { toCommandDTO, executeCommandAsync, getGameStateSnapshot, resetGameState, confirmRestart, setCurrentLocation, setGameState, getDirezioniLuogo } from '../logic/engine.js';
import { mapParseErrorToUserMessage } from '../logic/messages.js';

const router = express.Router();

router.post('/execute', async (req, res) => {
  try {
    const { input } = req.body || {};
    if (!input || typeof input !== 'string') {
      return res.status(400).json({ ok: false, error: 'Invalid input' });
    }
    // ensureVocabulary ora chiamata automaticamente in parseCommand
    const state = getGameStateSnapshot();
    // Se siamo in attesa conferma riavvio, bypassa parser e interpreta input come SI/NO
    if (state.awaitingRestart) {
      const engine = await confirmRestart(input); // dbPath rimosso
      return res.json({ ok: true, parseResult: null, command: null, engine });
    }
    const parsed = await parseCommand(null, input, state); // passa gameState
    if (parsed.IsValid !== true) {
      const userMessage = mapParseErrorToUserMessage(parsed, state.currentLingua);
      return res.status(400).json({ ok: false, parseResult: parsed, error: parsed.Error, userMessage });
    }
    const command = toCommandDTO(parsed);
    const engine = await executeCommandAsync(parsed); // dbPath rimosso
    res.json({ ok: true, parseResult: parsed, command, engine });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

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
    const { idLingua } = req.body || {};
    resetGameState(idLingua);
    const snap = getGameStateSnapshot();
    res.json({ ok: true, state: snap });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Stato engine: set location
router.post('/set-location', (req, res) => {
  try {
    const { locationId } = req.body;
    if (typeof locationId !== 'number' || locationId < 1) {
      return res.status(400).json({ ok: false, error: 'Invalid locationId' });
    }
    setCurrentLocation(locationId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Nuovo endpoint per salvare stato client
router.post('/save-client-state', (req, res) => {
  try {
    const { luoghi } = req.body;
    if (!Array.isArray(luoghi)) {
      return res.status(400).json({ ok: false, error: 'Invalid luoghi data' });
    }
    // Ottieni gameState dal server
    const gameState = getGameStateSnapshot();
    // Crea saveData con luoghi e oggetti aggiornati
    const saveData = {
      gameState,
      odessaData: { 
        ...global.odessaData, 
        Luoghi: luoghi,
        Oggetti: gameState.Oggetti
      },
      timestamp: new Date().toISOString(),
      version: '1.3.0'
    };
    // Imposta header per download
    const now = new Date();
    const timestamp = now.getFullYear() + ('0' + (now.getMonth() + 1)).slice(-2) + ('0' + now.getDate()).slice(-2) + '_' + ('0' + now.getHours()).slice(-2) + ('0' + now.getMinutes()).slice(-2) + ('0' + now.getSeconds()).slice(-2);
    const filename = `MissioneOdessa_Save_${timestamp}.json`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json(saveData);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Nuovo endpoint per caricare stato client
router.post('/load-client-state', (req, res) => {
  try {
    const { gameState, odessaData } = req.body;
    if (!gameState || !odessaData || !Array.isArray(odessaData.Luoghi)) {
      return res.status(400).json({ ok: false, error: 'Invalid save data' });
    }
    // Ripristina gameState
    setGameState(gameState);
    // Aggiorna odessaData.Luoghi e Oggetti
    global.odessaData.Luoghi = odessaData.Luoghi;
    if (Array.isArray(odessaData.Oggetti)) {
      global.odessaData.Oggetti = odessaData.Oggetti;
    }
    res.json({ ok: true, message: 'Stato ripristinato' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Nuovo endpoint per ottenere direzioni dinamiche di un luogo
router.get('/direzioni/:idLuogo', (req, res) => {
  try {
    const idLuogo = parseInt(req.params.idLuogo, 10);
    if (isNaN(idLuogo)) {
      return res.status(400).json({ ok: false, error: 'Invalid location ID' });
    }
    const direzioni = getDirezioniLuogo(idLuogo);
    res.json({ ok: true, direzioni });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Endpoint per ottenere statistiche di gioco (luoghi visitati + punteggio)
router.get('/stats', (req, res) => {
  try {
    const state = getGameStateSnapshot();
    const visitedPlaces = state.visitedPlaces?.length || 0;
    const score = state.punteggio?.totale || 0;
    res.json({ ok: true, visitedPlaces, score });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
