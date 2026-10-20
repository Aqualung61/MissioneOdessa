// Definizione del gioco Odessa (TD Lotto 4a, §3.1): configurazione, elenco ordinato dei
// gestori di verbo (la precedenza è vincolante, TD §4) e regole specifiche.
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
  rules,
};
