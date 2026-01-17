import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import {
  executeCommand,
  initializeOriginalData,
  resetGameState,
  setCurrentLocation,
} from '../src/logic/engine.js';

type EngineResultLike = {
  accepted: boolean;
  message: string;
};

import Interazioni from '../src/data-internal/Interazioni.json';
import Introduzione from '../src/data-internal/Introduzione.json';
import LessicoSoftware from '../src/data-internal/LessicoSoftware.json';
import Lingue from '../src/data-internal/Lingue.json';
import Luoghi from '../src/data-internal/Luoghi.json';
import LuoghiLogici from '../src/data-internal/LuoghiLogici.json';
import MessaggiSistema from '../src/data-internal/MessaggiSistema.json';
import Oggetti from '../src/data-internal/Oggetti.json';
import Piattaforme from '../src/data-internal/Piattaforme.json';
import Software from '../src/data-internal/Software.json';
import TerminiLessico from '../src/data-internal/TerminiLessico.json';
import TipiLessico from '../src/data-internal/TipiLessico.json';
import VociLessico from '../src/data-internal/VociLessico.json';

describe('Sprint 59.5 — runtime: Interazioni filtrate per lingua', () => {
  beforeAll(() => {
    global.odessaData = {
      Interazioni,
      Introduzione,
      LessicoSoftware,
      Lingue,
      Luoghi,
      LuoghiLogici,
      MessaggiSistema,
      Oggetti,
      Piattaforme,
      Software,
      TerminiLessico,
      TipiLessico,
      VociLessico,
    };
    initializeOriginalData();
  });

  beforeEach(() => {
    resetGameState(2);
  });

  it('Esegue un’interazione in EN e ritorna la risposta EN', () => {
    setCurrentLocation(24);

    const expectedEn = Interazioni.find(i => i.id === 'sposta_quadro_24' && i.IDLingua === 2)?.risposta;
    const expectedIt = Interazioni.find(i => i.id === 'sposta_quadro_24' && i.IDLingua === 1)?.risposta;
    expect(typeof expectedEn).toBe('string');
    expect(typeof expectedIt).toBe('string');

    const parseResult = {
      IsValid: true,
      CommandType: 'ACTION',
      CanonicalVerb: 'SPOSTA',
      VerbConcept: 'SPOSTARE',
      CanonicalNoun: 'Painting',
      NounConcept: 'Painting',
    };

    const res = executeCommand(parseResult) as EngineResultLike;
    expect(res.accepted).toBe(true);
    expect(res.message).toContain(expectedEn as string);
    expect(res.message).not.toContain(expectedIt as string);
  });
});
