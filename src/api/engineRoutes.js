import express from 'express';
import { randomUUID } from 'node:crypto';
import { parseInput } from '../logic/parser.js';
import { toCommandDTO } from '../logic/engine.js';
import { resetVocabularyCache } from '../logic/parser.js';
import { mapParseErrorToUserMessage, invalidInputMessageKey } from '../logic/messages.js';
import { getSystemMessage } from '../logic/systemMessages.js';
import { validateCommandInput, validateSaveData } from '../middleware/validation.js';
import { appVersion } from '../version.js';
import { getEngineDebugTrace, isEngineDebugEnabled } from '../logic/engineDebug.js';
import { attachEngineSession } from '../middleware/sessionContext.js';
import { odessaGame } from '../game/odessa/index.js';

const router = express.Router();

// Multi-session per-tab (no cookie)
router.use(attachEngineSession);

function getEngineOrSendError(req, res) {
  const engine = req.odessaSession?.engine;
  if (!engine) {
    res.status(500).json({ ok: false, error: 'ENGINE_SESSION_MISSING' });
    return null;
  }
  return engine;
}

// Numero di elementi di un array opzionale (0 se assente o vuoto).
function countOf(list) {
  return list?.length || 0;
}

function computeStatsFromState(state) {
  const visitedPlaces = countOf(state?.visitedPlaces);
  const interactions = countOf(state?.punteggio?.interazioniPunteggio);
  const mysteries = countOf(state?.punteggio?.misteriRisolti);
  const score = state?.punteggio?.totale || 0;

  // Rango: stessa regola del comando PUNTI.
  const rankKey = odessaGame.rules.rankKey(score);
  const lingua = typeof state?.currentLingua === 'number' ? state.currentLingua : 1;
  const rank = getSystemMessage(rankKey, lingua);

  return {
    visitedPlaces,
    interactions,
    mysteries,
    score,
    rank,
    rankKey,
  };
}

function buildUiFromState(state, engine) {
  const locationId = state?.currentLocationId;
  const direzioni =
    typeof locationId === 'number' && engine && typeof engine.getDirezioniLuogo === 'function'
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

function maybeAttachDebug(payload) {
  if (!isEngineDebugEnabled()) return payload;
  return { ...payload, debug: getEngineDebugTrace() };
}

// Aggiunge in coda state, ui e stats (in quest'ordine) al corpo di una risposta di /execute.
function withState(engine, payload, state) {
  return {
    ...payload,
    state,
    ui: buildUiFromState(state, engine),
    stats: computeStatsFromState(state),
  };
}

// 400: input non valido (dal validatore, oppure non stringa).
function sendInvalidInput(res, engine, details, parseResult) {
  const state = engine.getGameStateSnapshot();
  const userMessage = getSystemMessage(invalidInputMessageKey(details), state.currentLingua);
  return res.status(400).json(
    maybeAttachDebug(
      withState(
        engine,
        {
          ok: false,
          error: 'INVALID_INPUT',
          details,
          userMessage,
          parseResult,
          command: null,
          engine: null,
        },
        state
      )
    )
  );
}

// 200 ok: conferma FINE/riavvio (parseResult e command nulli) oppure comando eseguito.
function sendExecuted(res, engine, parseResult, command, engineResult) {
  const nextState = engine.getGameStateSnapshot();
  return res.json(
    maybeAttachDebug(
      withState(
        engine,
        {
          ok: true,
          parseResult,
          command,
          engine: engineResult,
        },
        nextState
      )
    )
  );
}

// Parse error = errore "utente" (comando sconosciuto / sintassi): non è un Bad Request.
// Restituiamo 200 per evitare rumore in console (F12) e gestiamo il messaggio a livello UI.
function sendParseError(res, engine, parsed, state) {
  const userMessage = mapParseErrorToUserMessage(parsed, state.currentLingua);
  const currentState = engine.getGameStateSnapshot();
  return res.status(200).json(
    maybeAttachDebug(
      withState(
        engine,
        {
          ok: false,
          parseResult: parsed,
          command: null,
          engine: null,
          error: parsed.Error,
          userMessage,
        },
        currentState
      )
    )
  );
}

router.post(
  '/execute',
  validateCommandInput({ mode: 'engine', behavior: 'attach' }),
  async (req, res, next) => {
    try {
      const engine = getEngineOrSendError(req, res);
      if (!engine) return;

      if (req.commandInputValidationError) {
        const details = req.commandInputValidationError.details;
        return sendInvalidInput(res, engine, details, {
          IsValid: false,
          Error: 'INVALID_INPUT',
          Details: details,
        });
      }

      const { input } = req.body || {};
      if (!input || typeof input !== 'string') {
        return sendInvalidInput(res, engine, 'NOT_A_STRING', null);
      }
      // ensureVocabulary ora chiamata automaticamente in parseInput
      const state = engine.getGameStateSnapshot();
      // Se siamo in attesa conferma FINE, bypassa parser e interpreta input come SI/NO
      if (state.awaitingEndConfirm) {
        return sendExecuted(
          res,
          engine,
          null,
          null,
          normalizeEngineResult(engine.confirmEnd(input))
        );
      }
      // Se siamo in attesa conferma riavvio, bypassa parser e interpreta input come SI/NO
      if (state.awaitingRestart) {
        return sendExecuted(
          res,
          engine,
          null,
          null,
          normalizeEngineResult(await engine.confirmRestart(input))
        );
      }
      const parsed = await parseInput(input, state);
      if (parsed.IsValid !== true) {
        return sendParseError(res, engine, parsed, state);
      }
      const command = toCommandDTO(parsed);
      return sendExecuted(
        res,
        engine,
        parsed,
        command,
        normalizeEngineResult(await engine.executeCommandAsync(parsed))
      );
    } catch (err) {
      return next(err);
    }
  }
);

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
      // ma lato server NON applichiamo mai mutazioni ai dati statici di gioco per singolo player.
      odessaData: {
        Luoghi: luoghi,
        Oggetti: gameState.Oggetti,
      },
      timestamp: new Date().toISOString(),
      version: appVersion,
    };
    // Imposta header per download
    const now = new Date();
    const timestamp =
      now.getFullYear() +
      ('0' + (now.getMonth() + 1)).slice(-2) +
      ('0' + now.getDate()).slice(-2) +
      '_' +
      ('0' + now.getHours()).slice(-2) +
      ('0' + now.getMinutes()).slice(-2) +
      ('0' + now.getSeconds()).slice(-2);
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
    const saveLanguage =
      typeof gameState?.currentLingua === 'number' ? gameState.currentLingua : undefined;
    const sessionLanguage =
      typeof currentState?.currentLingua === 'number' ? currentState.currentLingua : undefined;

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
        sessionLanguage,
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

// Endpoint per ottenere direzioni dinamiche di un luogo
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
    const stats = computeStatsFromState(state);
    res.json({ ok: true, ...stats });
  } catch (err) {
    return next(err);
  }
});

export default router;
