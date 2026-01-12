import express from 'express';
import { parseCommand } from '../logic/parser.js';
import { toCommandDTO, executeCommandAsync, getGameStateSnapshot, resetGameState, confirmEnd, confirmRestart, setCurrentLocation, setGameState, getDirezioniLuogo, prepareTurnContext, applyTurnEffects } from '../logic/engine.js';
import { resetVocabularyCache } from '../logic/parser.js';
import { mapParseErrorToUserMessage } from '../logic/messages.js';
import { validateCommandInput, validateSaveData } from '../middleware/validation.js';
import { appVersion } from '../version.js';

const router = express.Router();

function isTruthy(value) {
  return value === '1' || value === 'true' || value === 'yes';
}

function computeStatsFromState(state) {
  const visitedPlaces = state?.visitedPlaces?.length || 0;
  const interactions = state?.punteggio?.interazioniPunteggio?.length || 0;
  const mysteries = state?.punteggio?.misteriRisolti?.length || 0;
  const score = state?.punteggio?.totale || 0;

  let rank = 'Novizio';
  if (score >= 100) rank = 'Maestro';
  else if (score >= 67) rank = 'Investigatore';
  else if (score >= 34) rank = 'Esploratore';
  if (score >= 134) rank = 'Perfezionista';

  return { visitedPlaces, interactions, mysteries, score, rank };
}

function buildUiFromState(state) {
  const locationId = state?.currentLocationId;
  const direzioni = typeof locationId === 'number' ? getDirezioniLuogo(locationId) : {};
  const availableDirections = Object.entries(direzioni)
    .filter(([, value]) => typeof value === 'number' && value >= 1)
    .map(([key]) => key);

  return {
    location: {
      id: typeof locationId === 'number' ? locationId : null,
      name: typeof state?.currentLocationName === 'string' ? state.currentLocationName : '',
    },
    direzioni,
    availableDirections,
  };
}

function normalizeEngineResult(engine) {
  if (!engine || typeof engine !== 'object') {
    return {
      accepted: false,
      resultType: 'ERROR',
      message: '',
      turnMessages: [],
      gameOver: false,
    };
  }

  const normalized = { ...engine };

  if (typeof normalized.accepted !== 'boolean') {
    normalized.accepted = true;
  }

  if (typeof normalized.resultType !== 'string' || normalized.resultType.length === 0) {
    normalized.resultType = normalized.accepted ? 'OK' : 'ERROR';
  }

  if (typeof normalized.message !== 'string') {
    normalized.message = '';
  }

  if (!Array.isArray(normalized.turnMessages)) {
    if (typeof normalized.turnMessages === 'string' && normalized.turnMessages.trim()) {
      normalized.turnMessages = [normalized.turnMessages.trim()];
    } else {
      normalized.turnMessages = [];
    }
  }

  if (typeof normalized.gameOver !== 'boolean') {
    normalized.gameOver = false;
  }

  return normalized;
}

router.post('/execute', validateCommandInput({ mode: 'engine' }), async (req, res, next) => {
  try {
    const { input } = req.body || {};
    if (!input || typeof input !== 'string') {
      const state = getGameStateSnapshot();
      return res.status(400).json({
        ok: false,
        error: 'Invalid input',
        parseResult: null,
        command: null,
        engine: null,
        state,
        ui: buildUiFromState(state),
        stats: computeStatsFromState(state),
      });
    }
    // ensureVocabulary ora chiamata automaticamente in parseCommand
    const state = getGameStateSnapshot();
    // Se siamo in attesa conferma FINE, bypassa parser e interpreta input come SI/NO
    if (state.awaitingEndConfirm) {
      const engine = normalizeEngineResult(confirmEnd(input));
      const nextState = getGameStateSnapshot();
      return res.json({
        ok: true,
        parseResult: null,
        command: null,
        engine,
        state: nextState,
        ui: buildUiFromState(nextState),
        stats: computeStatsFromState(nextState),
      });
    }
    // Se siamo in attesa conferma riavvio, bypassa parser e interpreta input come SI/NO
    if (state.awaitingRestart) {
      const engine = normalizeEngineResult(await confirmRestart(input)); // dbPath rimosso
      const nextState = getGameStateSnapshot();
      return res.json({
        ok: true,
        parseResult: null,
        command: null,
        engine,
        state: nextState,
        ui: buildUiFromState(nextState),
        stats: computeStatsFromState(nextState),
      });
    }
    const parsed = await parseCommand(null, input, state); // passa gameState
    if (parsed.IsValid !== true) {
      const userMessage = mapParseErrorToUserMessage(parsed, state.currentLingua);
      const currentState = getGameStateSnapshot();
      return res.status(400).json({
        ok: false,
        parseResult: parsed,
        command: null,
        engine: null,
        error: parsed.Error,
        userMessage,
        state: currentState,
        ui: buildUiFromState(currentState),
        stats: computeStatsFromState(currentState),
      });
    }
    const command = toCommandDTO(parsed);
    const engine = normalizeEngineResult(await executeCommandAsync(parsed)); // dbPath rimosso
    const nextState = getGameStateSnapshot();
    res.json({
      ok: true,
      parseResult: parsed,
      command,
      engine,
      state: nextState,
      ui: buildUiFromState(nextState),
      stats: computeStatsFromState(nextState),
    });
  } catch (err) {
    return next(err);
  }
});

// Stato engine: snapshot
router.get('/state', (req, res, next) => {
  try {
    const snap = getGameStateSnapshot();
    res.json({ ok: true, state: snap });
  } catch (err) {
    return next(err);
  }
});

// Stato engine: reset
router.post('/reset', (req, res, next) => {
  try {
    const { idLingua } = req.body || {};
    resetGameState(idLingua);
    const snap = getGameStateSnapshot();
    res.json({ ok: true, state: snap });
  } catch (err) {
    return next(err);
  }
});

// Stato engine: set location
router.post('/set-location', (req, res, next) => {
  try {
    // Legacy endpoint: usare POST /api/engine/execute (NAVIGATION) invece di set-location.
    res.set('Deprecation', 'true');
    res.set('Sunset', 'Wed, 01 Jul 2026 00:00:00 GMT');
    res.set('Cache-Control', 'no-store');

    if (isTruthy(process.env.DISABLE_LEGACY_ENDPOINTS || '')) {
      return res.status(410).json({
        ok: false,
        error: 'LEGACY_ENDPOINT_DISABLED',
        message: 'Endpoint legacy disabilitato. Usa POST /api/engine/execute.',
      });
    }

    const { locationId, consumeTurn } = req.body;
    if (typeof locationId !== 'number' || locationId < 1) {
      return res.status(400).json({ ok: false, error: 'Invalid locationId' });
    }
    
    // Check awaiting restart: blocca navigazione se in attesa conferma riavvio
    const state = getGameStateSnapshot();
    if (state.awaitingRestart) {
      return res.json({ 
        ok: false, 
        gameOver: true,
        message: 'Gioco in attesa di riavvio. Digita SI per riavviare o NO per terminare.',
        turnMessages: [] 
      });
    }
    
    setCurrentLocation(locationId);
    
    // Se consumeTurn=true, applica effetti turn system (per navigazione stella)
    const turnMessages = [];
    if (consumeTurn === true) {
      // Simula parseResult NAVIGATION per turn system
      const fakeParseResult = {
        IsValid: true,
        CommandType: 'NAVIGATION',
        CanonicalVerb: 'NAVIGATION',
        VerbConcept: 'NAVIGATION'
      };
      
      // Prepara context e applica effetti
      prepareTurnContext(fakeParseResult);
      
      // Crea result fittizio per applyTurnEffects
      const fakeResult = { accepted: true, resultType: 'OK', message: '', effects: [] };
      const resultWithEffects = applyTurnEffects(fakeResult, fakeParseResult);
      
      // Check game over triggato da turn effects (darkness, terminale, ecc.)
      if (resultWithEffects.gameOver === true) {
        return res.json({
          ok: false,
          gameOver: true,
          gameOverReason: resultWithEffects.gameOverReason || 'UNKNOWN',
          message: resultWithEffects.message || 'Game Over',
          turnMessages: [resultWithEffects.message]
        });
      }
      
      // Check narrative phase (Ferenc victory sequence)
      if (resultWithEffects.resultType === 'NARRATIVE') {
        return res.json({
          ok: true,
          resultType: 'NARRATIVE',
          message: resultWithEffects.message,
          awaitingContinue: resultWithEffects.awaitingContinue || false,
          narrativePhase: resultWithEffects.narrativePhase,
          turnMessages: []
        });
      }
      
      // Check teleport (Ferenc finale)
      if (resultWithEffects.resultType === 'TELEPORT') {
        return res.json({
          ok: true,
          resultType: 'TELEPORT',
          message: resultWithEffects.message,
          locationId: resultWithEffects.locationId,
          teleport: true,
          narrativePhase: resultWithEffects.narrativePhase,
          turnMessages: []
        });
      }
      
      // Estrai messaggi turn system (torcia spenta, etc.)
      if (resultWithEffects.message) {
        const lines = resultWithEffects.message.split('\n\n');
        lines.forEach(line => {
          if (line.trim()) turnMessages.push(line.trim());
        });
      }
    }
    
    res.json({ ok: true, turnMessages });
  } catch (err) {
    return next(err);
  }
});

// Nuovo endpoint per salvare stato client
router.post('/save-client-state', (req, res, next) => {
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
      version: appVersion
    };
    // Imposta header per download
    const now = new Date();
    const timestamp = now.getFullYear() + ('0' + (now.getMonth() + 1)).slice(-2) + ('0' + now.getDate()).slice(-2) + '_' + ('0' + now.getHours()).slice(-2) + ('0' + now.getMinutes()).slice(-2) + ('0' + now.getSeconds()).slice(-2);
    const filename = `MissioneOdessa_Save_${timestamp}.json`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json(saveData);
  } catch (err) {
    return next(err);
  }
});

// Nuovo endpoint per caricare stato client
router.post('/load-client-state', validateSaveData(), (req, res, next) => {
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
    
    // BUGFIX: Reset parser vocabulary cache dopo caricamento
    // La cache del parser deve essere ricostruita con i nuovi dati
    resetVocabularyCache();
    
    res.json({ ok: true, message: 'Stato ripristinato' });
  } catch (err) {
    return next(err);
  }
});

// Nuovo endpoint per ottenere direzioni dinamiche di un luogo
// Integrato con turn pipeline per Sprint 3.3.5.A (Torcia)
router.get('/direzioni/:idLuogo', (req, res, next) => {
  try {
    const idLuogo = parseInt(req.params.idLuogo, 10);
    if (isNaN(idLuogo)) {
      return res.status(400).json({ ok: false, error: 'Invalid location ID' });
    }

    // Ottieni direzioni valide (senza avanzare il sistema di turni/torcia)
    const direzioni = getDirezioniLuogo(idLuogo);
    res.json({ ok: true, direzioni, messages: [] });
  } catch (err) {
    return next(err);
  }
});

// Endpoint per ottenere statistiche di gioco (luoghi visitati + interazioni + misteri + punteggio + rango)
router.get('/stats', (req, res, next) => {
  try {
    const state = getGameStateSnapshot();
    const visitedPlaces = state.visitedPlaces?.length || 0;
    const interactions = state.punteggio?.interazioniPunteggio?.length || 0;
    const mysteries = state.punteggio?.misteriRisolti?.length || 0;
    const score = state.punteggio?.totale || 0;
    
    // Calcola rango basato su soglie
    let rank = 'Novizio';
    if (score >= 100) rank = 'Maestro';
    else if (score >= 67) rank = 'Investigatore';
    else if (score >= 34) rank = 'Esploratore';
    if (score >= 134) rank = 'Perfezionista';
    
    res.json({ ok: true, visitedPlaces, interactions, mysteries, score, rank });
  } catch (err) {
    return next(err);
  }
});

export default router;
