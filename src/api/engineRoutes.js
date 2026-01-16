import express from 'express';
import { randomUUID } from 'node:crypto';
import { parseCommand } from '../logic/parser.js';
import { toCommandDTO } from '../logic/engine.js';
import { resetVocabularyCache } from '../logic/parser.js';
import { mapParseErrorToUserMessage } from '../logic/messages.js';
import { getSystemMessage } from '../logic/systemMessages.js';
import { validateCommandInput, validateSaveData } from '../middleware/validation.js';
import { appVersion } from '../version.js';
import { getEngineDebugTrace, isEngineDebugEnabled } from '../logic/engineDebug.js';
import { attachEngineSession } from '../middleware/sessionContext.js';

const router = express.Router();

// Sprint #59.1: multi-session per-tab (no cookie)
router.use(attachEngineSession);

function getEngineOrSendError(req, res) {
  const engine = req.odessaSession?.engine;
  if (!engine) {
    res.status(500).json({ ok: false, error: 'ENGINE_SESSION_MISSING' });
    return null;
  }
  return engine;
}

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

function buildUiFromState(state, engine) {
  const locationId = state?.currentLocationId;
  const direzioni = typeof locationId === 'number' && engine && typeof engine.getDirezioniLuogo === 'function'
    ? engine.getDirezioniLuogo(locationId)
    : {};
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

function mapInvalidInputDetailsToI18nKey(details) {
  switch (details) {
    case 'EMPTY_INPUT':
      return 'parse.error.emptyInput';
    case 'CONTROL_CHARS':
      return 'parse.error.controlChars';
    case 'LENGTH_OUT_OF_RANGE':
      return 'parse.error.lengthOutOfRange';
    case 'NOT_A_STRING':
      return 'parse.error.notAString';
    default:
      return 'parse.error.invalidInputGeneric';
  }
}

function maybeAttachDebug(payload) {
  if (!isEngineDebugEnabled()) return payload;
  return { ...payload, debug: getEngineDebugTrace() };
}

router.post('/execute', validateCommandInput({ mode: 'engine', behavior: 'attach' }), async (req, res, next) => {
  try {
    const engine = getEngineOrSendError(req, res);
    if (!engine) return;

    if (req.commandInputValidationError) {
      const state = engine.getGameStateSnapshot();
      const details = req.commandInputValidationError.details;
      const i18nKey = mapInvalidInputDetailsToI18nKey(details);
      const userMessage = getSystemMessage(i18nKey, state.currentLingua);
      return res.status(400).json(maybeAttachDebug({
        ok: false,
        error: 'INVALID_INPUT',
        details,
        userMessage,
        parseResult: { IsValid: false, Error: 'INVALID_INPUT', Details: details },
        command: null,
        engine: null,
        state,
        ui: buildUiFromState(state, engine),
        stats: computeStatsFromState(state),
      }));
    }

    const { input } = req.body || {};
    if (!input || typeof input !== 'string') {
      const state = engine.getGameStateSnapshot();
      return res.status(400).json(maybeAttachDebug({
        ok: false,
        error: 'INVALID_INPUT',
        details: 'NOT_A_STRING',
        userMessage: getSystemMessage('parse.error.notAString', state.currentLingua),
        parseResult: null,
        command: null,
        engine: null,
        state,
        ui: buildUiFromState(state, engine),
        stats: computeStatsFromState(state),
      }));
    }
    // ensureVocabulary ora chiamata automaticamente in parseCommand
    const state = engine.getGameStateSnapshot();
    // Se siamo in attesa conferma FINE, bypassa parser e interpreta input come SI/NO
    if (state.awaitingEndConfirm) {
      const engineResult = normalizeEngineResult(engine.confirmEnd(input));
      const nextState = engine.getGameStateSnapshot();
      return res.json(maybeAttachDebug({
        ok: true,
        parseResult: null,
        command: null,
        engine: engineResult,
        state: nextState,
        ui: buildUiFromState(nextState, engine),
        stats: computeStatsFromState(nextState),
      }));
    }
    // Se siamo in attesa conferma riavvio, bypassa parser e interpreta input come SI/NO
    if (state.awaitingRestart) {
      const engineResult = normalizeEngineResult(await engine.confirmRestart(input)); // dbPath rimosso
      const nextState = engine.getGameStateSnapshot();
      return res.json(maybeAttachDebug({
        ok: true,
        parseResult: null,
        command: null,
        engine: engineResult,
        state: nextState,
        ui: buildUiFromState(nextState, engine),
        stats: computeStatsFromState(nextState),
      }));
    }
    const parsed = await parseCommand(null, input, state); // passa gameState
    if (parsed.IsValid !== true) {
      const userMessage = mapParseErrorToUserMessage(parsed, state.currentLingua);
      const currentState = engine.getGameStateSnapshot();
      return res.status(400).json(maybeAttachDebug({
        ok: false,
        parseResult: parsed,
        command: null,
        engine: null,
        error: parsed.Error,
        userMessage,
        state: currentState,
        ui: buildUiFromState(currentState, engine),
        stats: computeStatsFromState(currentState),
      }));
    }
    const command = toCommandDTO(parsed);
    const engineResult = normalizeEngineResult(await engine.executeCommandAsync(parsed)); // dbPath rimosso
    const nextState = engine.getGameStateSnapshot();
    res.json(maybeAttachDebug({
      ok: true,
      parseResult: parsed,
      command,
      engine: engineResult,
      state: nextState,
      ui: buildUiFromState(nextState, engine),
      stats: computeStatsFromState(nextState),
    }));
  } catch (err) {
    return next(err);
  }
});

// Stato engine: snapshot
router.get('/state', (req, res, next) => {
  try {
    const engine = getEngineOrSendError(req, res);
    if (!engine) return;
    const snap = engine.getGameStateSnapshot();
    res.json(maybeAttachDebug({ ok: true, state: snap }));
  } catch (err) {
    return next(err);
  }
});

// Stato engine: reset
router.post('/reset', (req, res, next) => {
  try {
    const engine = getEngineOrSendError(req, res);
    if (!engine) return;
    const { idLingua } = req.body || {};
    const newGameId = randomUUID();
    req.odessaSession?.setGameId(newGameId);
    engine.resetGameState(idLingua);
    const snap = engine.getGameStateSnapshot();
    res.json(maybeAttachDebug({ ok: true, state: snap }));
  } catch (err) {
    return next(err);
  }
});

// Stato engine: set location
router.post('/set-location', (req, res, next) => {
  try {
    const engine = getEngineOrSendError(req, res);
    if (!engine) return;
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
    const state = engine.getGameStateSnapshot();
    if (state.awaitingRestart) {
      return res.json({ 
        ok: false, 
        gameOver: true,
        message: 'Gioco in attesa di riavvio. Digita SI per riavviare o NO per terminare.',
        turnMessages: [] 
      });
    }
    
    engine.setCurrentLocation(locationId);
    
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
      engine.prepareTurnContext(fakeParseResult);
      
      // Crea result fittizio per applyTurnEffects
      const fakeResult = { accepted: true, resultType: 'OK', message: '', effects: [] };
      const resultWithEffects = engine.applyTurnEffects(fakeResult, fakeParseResult);
      
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
    const engine = getEngineOrSendError(req, res);
    if (!engine) return;
    const { luoghi } = req.body;
    if (!Array.isArray(luoghi)) {
      return res.status(400).json({ ok: false, error: 'Invalid luoghi data' });
    }
    // Ottieni gameState dal server
    const gameState = engine.getGameStateSnapshot();
    // Crea saveData con luoghi e oggetti aggiornati
    const saveData = {
      gameState,
      // Nota: per compatibilità con save preesistenti manteniamo odessaData.Luoghi,
      // ma lato server NON applichiamo mai mutazioni a global.odessaData per singolo player.
      odessaData: {
        Luoghi: luoghi,
        Oggetti: gameState.Oggetti,
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
    const engine = getEngineOrSendError(req, res);
    if (!engine) return;
    const { gameState, odessaData } = req.body;
    if (!gameState || !odessaData || !Array.isArray(odessaData.Luoghi)) {
      return res.status(400).json({ ok: false, error: 'Invalid save data' });
    }

    // Guardrail (lingua): il caricamento è consentito solo se la lingua del save coincide
    // con la lingua corrente della sessione. In caso di mismatch, non applicare modifiche.
    const currentState = engine.getGameStateSnapshot();
    const saveLanguage = typeof gameState?.currentLingua === 'number' ? gameState.currentLingua : undefined;
    const sessionLanguage = typeof currentState?.currentLingua === 'number' ? currentState.currentLingua : undefined;

    // Nota: la validazione del payload di load è volutamente permissiva (per non rompere vecchi save).
    // Per questo applichiamo il blocco di mismatch solo per codici lingua supportati (1=IT, 2=EN).
    // Altri valori numerici (es. 0/3/undefined) sono ignorati intenzionalmente.
    const isSupportedLanguageCode = (value) => value === 1 || value === 2;
    if (
      isSupportedLanguageCode(saveLanguage) &&
      isSupportedLanguageCode(sessionLanguage) &&
      saveLanguage !== sessionLanguage
    ) {
      return res.status(409).json({
        ok: false,
        error: 'LANGUAGE_MISMATCH',
        saveLanguage,
        sessionLanguage
      });
    }

    // Ripristina gameState
    engine.setGameState(gameState);
    
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
    const engine = getEngineOrSendError(req, res);
    if (!engine) return;
    const idLuogo = parseInt(req.params.idLuogo, 10);
    if (isNaN(idLuogo)) {
      return res.status(400).json({ ok: false, error: 'Invalid location ID' });
    }

    // Ottieni direzioni valide (senza avanzare il sistema di turni/torcia)
    const direzioni = engine.getDirezioniLuogo(idLuogo);
    res.json({ ok: true, direzioni, messages: [] });
  } catch (err) {
    return next(err);
  }
});

// Endpoint per ottenere statistiche di gioco (luoghi visitati + interazioni + misteri + punteggio + rango)
router.get('/stats', (req, res, next) => {
  try {
    const engine = getEngineOrSendError(req, res);
    if (!engine) return;
    const state = engine.getGameStateSnapshot();
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
