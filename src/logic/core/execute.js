// Esecuzione di un comando: pipeline del turno.
// Sequenza: debug "prima" → `parseResult` assente → non valido → `prepareTurnContext` →
// controlli preliminari (se bloccato: effetti di turno solo se consuma turno, evento BLOCKED,
// ritorno) → `dispatch` con contesto nuovo → se consuma turno: `applyTurnEffects`, evento,
// ritorno → altrimenti evento e ritorno.
//
// `eng.state` si legge a ogni accesso, mai in una variabile locale che attraversi il dispatch
// (un gestore potrebbe riassegnare lo stato).
import { getSystemMessage } from '../systemMessages.js';
import { mapParseErrorToUserMessage } from '../messages.js';
import { isEngineDebugEnabled, pushEngineDebugEvent } from '../engineDebug.js';
import { createContext } from './context.js';
import { dispatch } from './dispatch.js';
import { buildCommand } from './command.js';
import { debugStateSnapshot } from './state.js';
import {
  shouldConsumeTurn,
  prepareTurnContext,
  runPreExecutionChecks,
  applyTurnEffects,
} from './turn.js';

function summarizeParseResult(parseResult) {
  if (!parseResult || typeof parseResult !== 'object') return null;
  return {
    commandType: parseResult.CommandType ?? null,
    canonicalVerb: parseResult.CanonicalVerb ?? null,
    verbConcept: parseResult.VerbConcept ?? null,
    canonicalNoun: parseResult.CanonicalNoun ?? null,
    nounConcept: parseResult.NounConcept ?? null,
  };
}

function summarizeResult(result) {
  return {
    accepted: !!result.accepted,
    resultType: result.resultType ?? null,
  };
}

// Differenza tra lo stato di debug prima e dopo il comando.
function debugDelta(before, after) {
  return {
    score: (after.score ?? 0) - (before.score ?? 0),
    totalTurnsConsumed: (after.totalTurnsConsumed ?? 0) - (before.totalTurnsConsumed ?? 0),
    turnsInDangerZone: (after.turnsInDangerZone ?? 0) - (before.turnsInDangerZone ?? 0),
    awaitingRestart: (after.awaitingRestart ?? false) === (before.awaitingRestart ?? false) ? 0 : 1,
  };
}

/**
 * Registra l'evento di debug di un comando eseguito (solo se la traccia era attiva all'inizio:
 * `debugBefore` non nullo). Forma degli eventi alla lettera:
 * - EXECUTE_COMMAND_BLOCKED: kind, parse, result {accepted, resultType}, before, after
 * - EXECUTE_COMMAND: kind, parse, consumesTurn, result {accepted, resultType}, delta, before, after
 * @param {Object} eng - contenitore del motore
 * @param {Object|null} debugBefore - stato di debug prima del comando (null = traccia spenta)
 * @param {string} kind - 'EXECUTE_COMMAND_BLOCKED' | 'EXECUTE_COMMAND'
 * @param {Object} parseResult
 * @param {Object} result - risultato (accepted/resultType)
 * @param {boolean} consumesTurn - ignorato per BLOCKED
 */
function recordExecuteEvent(eng, debugBefore, kind, parseResult, result, consumesTurn) {
  if (!debugBefore) return;
  const debugAfter = debugStateSnapshot(eng.state);
  if (kind === 'EXECUTE_COMMAND_BLOCKED') {
    pushEngineDebugEvent({
      kind,
      parse: summarizeParseResult(parseResult),
      result: summarizeResult(result),
      before: debugBefore,
      after: debugAfter,
    });
    return;
  }
  pushEngineDebugEvent({
    kind,
    parse: summarizeParseResult(parseResult),
    consumesTurn,
    result: summarizeResult(result),
    delta: debugDelta(debugBefore, debugAfter),
    before: debugBefore,
    after: debugAfter,
  });
}

// Phase 0: Validation (preserved from original). Restituisce il risultato di rifiuto, o null.
function rejectInvalidParse(eng, parseResult) {
  if (!parseResult) {
    return {
      accepted: false,
      resultType: 'ERROR',
      message: getSystemMessage('engine.error.noParseResult', eng.state.currentLingua),
    };
  }
  if (parseResult.IsValid !== true) {
    const userMessage = mapParseErrorToUserMessage(parseResult, eng.state.currentLingua);
    return {
      accepted: false,
      resultType: 'ERROR',
      message:
        userMessage || getSystemMessage('parse.error.invalidInputGeneric', eng.state.currentLingua),
    };
  }
  return null;
}

/**
 * Esegue un comando già parsato (pipeline del turno, v3.0).
 * @param {Object} eng - contenitore del motore ({ game, state, originalOggetti })
 * @param {Object} helpers - funzioni del motore esposte ai gestori di verbo
 * @param {Object} parseResult
 * @returns {Object} risultato del comando
 */
export function executeCommand(eng, helpers, parseResult) {
  const debugBefore = isEngineDebugEnabled() ? debugStateSnapshot(eng.state) : null;

  const rejected = rejectInvalidParse(eng, parseResult);
  if (rejected) return rejected;

  // Phase 1: Create turn snapshot
  prepareTurnContext(eng.state, eng.game, parseResult);

  // Phase 2: Run pre-execution checks (awaitingRestart)
  const preCheck = runPreExecutionChecks(eng.state, parseResult);
  if (preCheck) {
    // Il movimento bloccato alla barriera consuma comunque un turno (R4, #107)
    if (shouldConsumeTurn(parseResult)) {
      applyTurnEffects(eng.state, eng.game, preCheck, parseResult);
    }
    recordExecuteEvent(eng, debugBefore, 'EXECUTE_COMMAND_BLOCKED', parseResult, preCheck);
    return preCheck;
  }

  // Phase 3: Execute core command logic: gestori di verbo in ordine di precedenza.
  // Il contesto si crea qui, a ogni comando: lo stato può essere stato riassegnato.
  const result = dispatch(
    eng.game.verbHandlers,
    buildCommand(parseResult, eng.state, helpers),
    createContext(eng.state, eng.game, helpers)
  );

  // Phase 4: Apply turn effects (torch, darkness)
  // Gli effetti si applicano a ogni comando che consuma un turno, accettato o no (#107)
  if (shouldConsumeTurn(parseResult)) {
    const finalResult = applyTurnEffects(eng.state, eng.game, result, parseResult);
    recordExecuteEvent(eng, debugBefore, 'EXECUTE_COMMAND', parseResult, finalResult, true);
    return finalResult;
  }

  recordExecuteEvent(eng, debugBefore, 'EXECUTE_COMMAND', parseResult, result, false);
  return result;
}
