// Definizione del gioco Odessa: configurazione, elenco ordinato dei
// gestori di verbo (la precedenza è vincolante) e regole specifiche.
import { CONFIG } from './config.js';
import * as rules from './rules.js';
import { unknownDirection, move } from '../../logic/core/handlers/navigation.js';
import { system } from '../../logic/core/handlers/system.js';
import { collapsedPassage, blockedWithText } from './handlers/navigation.js';
import { darkness } from './handlers/darkness.js';
import { lightMatches, lightGeneric, lightTorch } from './handlers/light.js';
import { loadWeight } from './handlers/weight.js';
import { spegni, scappa, sorridi, dormi, parla } from './handlers/flavor.js';
import { attackGuard } from './handlers/guard.js';
import { dig } from './handlers/dig.js';
import { prerequisiteTypes } from './interactions/prerequisites.js';
import { effectTypes } from './interactions/effects.js';
import { interaction } from '../../logic/core/handlers/interaction.js';
import { rotateDirection, rotateKnob } from './handlers/rotate.js';
import { moveObject } from './handlers/move.js';
import { examineSpecial } from './handlers/examine.js';
import { examine } from '../../logic/core/handlers/examine.js';
import { openClose } from '../../logic/core/handlers/openClose.js';
import { take } from '../../logic/core/handlers/take.js';
import { drop } from '../../logic/core/handlers/drop.js';
import { fallback } from '../../logic/core/handlers/fallback.js';
import { TURN_EFFECTS } from '../../logic/turnEffects/index.js';

/**
 * @typedef {Object} VerbHandler
 * @property {string} id - identificatore del gestore (es. `odessa.action.dig`)
 * @property {Array<string>} types - tipi di comando gestiti (`ACTION`, `NAVIGATION`, `SYSTEM`)
 * @property {function(Object, Object): boolean} [match] - `(cmd, ctx) => boolean`; se assente il gestore
 *   si applica a ogni comando dei suoi tipi
 * @property {function(Object, Object): (Object|null)} run - `(cmd, ctx) => risultato`; `null` passa al gestore successivo
 */
/**
 * @typedef {Object} OdessaGame
 * Ciò che un gioco fornisce al motore (`createEngine(game)`).
 * @property {string} id - identificatore del gioco
 * @property {Object} config - configurazione del gioco (`CONFIG`, da `Configurazione.json`)
 * @property {Array<VerbHandler>} verbHandlers - gestori di verbo in ordine di precedenza: vince il primo
 *   che restituisce un risultato non nullo
 * @property {Object<string, function(Object, Object): boolean>} prerequisiteTypes - registro dei prerequisiti:
 *   tipo → `(req, ctx) => boolean`
 * @property {Object<string, function(Object, Object, Object): *>} effectTypes - registro degli effetti:
 *   tipo → `(effetto, ctx, env) => info | undefined`
 * @property {Array<function(Object, Object, Object): void>} turnEffects - effetti di turno
 *   `(gameState, result, parseResult)`, nell'ordine di esecuzione
 * @property {Object} rules - regole che il motore chiama: `awardMystery(effetto, info, ctx)`,
 *   `toggleResponseVerbs` (Set di verbi), `sequence` (`alreadyCompletedMessageKey`, `onCompleted(seqKey, ctx)`),
 *   `hasActiveLight(gameState)`, `deriveLoadedFlags(newState)`, `rankKey(score)`, `isDangerZone(state)`,
 *   `initialMatches()`, `initialOpenStates()`, `deriveLoadedGuardTimer(newState)`, `deriveLoadedTimers(newState)`
 */
/**
 * Definizione del gioco Odessa.
 * @type {OdessaGame}
 */
export const odessaGame = {
  id: 'odessa',
  config: CONFIG,
  verbHandlers: [
    unknownDirection,   // 1  core.nav.unknownDirection
    collapsedPassage,   // 2  odessa.nav.collapsedPassage
    blockedWithText,    // 3  odessa.nav.blockedWithText
    move,               // 4  core.nav.move
    system,             // 5  core.system
    darkness,           // 6  odessa.action.darkness
    lightMatches,       // 7  odessa.action.lightMatches
    loadWeight,         // 8  odessa.action.loadWeight
    spegni,             // 9  odessa.action.spegni
    scappa,             // 10 odessa.action.scappa
    sorridi,            // 11 odessa.action.sorridi
    dormi,              // 12 odessa.action.dormi
    parla,              // 13 odessa.action.parla
    attackGuard,        // 14 odessa.action.attackGuard
    lightGeneric,       // 15 odessa.action.lightGeneric
    lightTorch,         // 16 odessa.action.lightTorch
    dig,                // 17 odessa.action.dig
    interaction,        // 18 core.action.interaction
    rotateDirection,    // 19 odessa.action.rotateDirection
    rotateKnob,         // 20 odessa.action.rotateKnob
    moveObject,         // 21 odessa.action.moveObject
    examineSpecial,     // 22 odessa.action.examineSpecial
    examine,            // 23 core.action.examine
    openClose,          // 24 core.action.openClose
    take,               // 25 core.action.take
    drop,               // 26 core.action.drop
    fallback,           // 27 core.action.fallback
  ],
  prerequisiteTypes,
  effectTypes,
  // Effetti di turno: lo stesso array di `TURN_EFFECTS`, non una copia.
  turnEffects: TURN_EFFECTS,
  rules,
};
