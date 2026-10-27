/**
 * Caratterizzazione dell'ordine delle chiavi dei corpi HTTP (#63).
 * Specifica: `docs/20261021 - TD Lotto 5 Effetti di turno, route e ESLint - v1.2.md`, §5.1 test 3 e AC-8.
 *
 * La traccia HTTP (`tests/trace.http.test.ts`) ordina le chiavi prima di calcolare lo SHA: non
 * vede un cambio di ordine. Qui si verifica l'ORDINE RICORSIVO delle chiavi (non i valori) dei
 * corpi delle risposte di `/api/engine/*`, resa come stringa:
 *   - oggetto: `{k1,k2:{...},k3:[...]}`; chiave senza valore strutturato: solo il nome;
 *   - array di oggetti: `[` + forma del primo elemento + `]`; array vuoto o di primitivi: `[]`.
 * Gli attesi sono stati ricavati eseguendo il codice di riferimento e controllati a mano rispetto
 * a `src/api/engineRoutes.js`. Questo file non si modifica (AC-8).
 *
 * Rami di `/execute` caratterizzati: input non valido dal validatore (stringa vuota e valore non
 * stringa), `input` non stringa (ramo a valle del validatore, irraggiungibile via HTTP: esercitato
 * chiamando il gestore del router direttamente), attesa FINE, attesa riavvio, errore di parsing,
 * comando valido. Più `/stats`, `/state`, `load-client-state` (409 e 200) e `save-client-state`.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import express from 'express';
import type { Server } from 'node:http';

import { initOdessa } from '../src/initOdessa.js';
import { loadMessaggiSistema } from '../src/logic/systemMessages.js';
import { ensureVocabulary } from '../src/logic/parser.js';
import { createEngine } from '../src/logic/engine.js';
import engineRoutes from '../src/api/engineRoutes.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { createSessionState, fetchWithSession, type SessionState } from './testUtils/sessionFetch';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

const root = resolve(__dirname, '..');
const SAVE_PATH = resolve(root, 'tests', 'fixtures', 'trace', 'save_v141_full_it_step91.json');

// Forma ricorsiva delle chiavi, nell'ordine d'inserimento.
function shape(v: Json): string {
  if (Array.isArray(v)) {
    const first = v[0];
    return first !== null && typeof first === 'object' ? `[${shape(first)}]` : '[]';
  }
  if (v === null || typeof v !== 'object') return '';
  const parts = Object.keys(v).map((k) => {
    const s = shape(v[k]);
    return s === '' ? k : `${k}:${s}`;
  });
  return `{${parts.join(',')}}`;
}

// ---------------------------------------------------------------------------
// Attesi (comportamento di riferimento)
// ---------------------------------------------------------------------------

const STATE = '{openStates:{BOTOLA},awaitingEndConfirm,awaitingRestart,currentLocationId,ended,visitedPlaces:[],Oggetti:[{ID,IDLingua,Oggetto,Attivo,IDLuogo,descrizione}],interazioniEseguite:[],direzioniSbloccate:{},direzioniToggle:{},sequenze:{},flags:{},currentLingua,punteggio:{totale,interazioniPunteggio:[],misteriRisolti:[]},timers:{movementCounter,torciaDifettosa,lampadaAccesa,azioniInLuogoPericoloso,ultimoLuogoPericoloso,matchesLeft,matchTimer},narrativeState,narrativePhase,victory,movementBlocked,guardTimer,awaitingContinue,turn:{globalTurnNumber,totalTurnsConsumed,turnsInDarkness,turnsInDangerZone,darknessTimer,openAreaTimer,movedThisTurn,current:{parseResult,consumesTurn,location,hasLight,inDangerZone},previous:{location,hasLight,consumedTurn,inDangerZone}},currentLocationName,timestamp,version}';
const STATE_LOADED = '{openStates:{BOTOLA},awaitingEndConfirm,awaitingRestart,currentLocationId,ended,visitedPlaces:[],Oggetti:[{ID,IDLingua,Oggetto,Attivo,IDLuogo,descrizione}],interazioniEseguite:[],direzioniSbloccate:{20_Sud,21_Nord,27_Nord,28_Sud,36_Ovest,37_Est},direzioniToggle:{42_Est,43_Ovest},sequenze:{cassaforte_24:{pattern:[],progressione:[],completata}},flags:{cassaforteScoperta,passaggioCrollato,bastoneLiberato},currentLingua,punteggio:{totale,interazioniPunteggio:[],misteriRisolti:[]},timers:{movementCounter,torciaDifettosa,lampadaAccesa,azioniInLuogoPericoloso,ultimoLuogoPericoloso,matchesLeft,matchTimer},narrativeState,narrativePhase,victory,movementBlocked,guardTimer,awaitingContinue,turn:{globalTurnNumber,totalTurnsConsumed,turnsInDarkness,turnsInDangerZone,darknessTimer,openAreaTimer,movedThisTurn,current:{parseResult,consumesTurn,location,hasLight,inDangerZone},previous:{location,hasLight,consumedTurn,inDangerZone}},currentLocationName,timestamp,version}';
const UI = 'ui:{location:{id,name},direzioni:{Nord,Est,Sud,Ovest,Su,Giu},availableDirections:[]}';
const STATS = 'stats:{visitedPlaces,interactions,mysteries,score,rank,rankKey}';
const PARSE = 'parseResult:{IsValid,OriginalInput,NormalizedInput,CommandType,CanonicalVerb,CanonicalNoun,NounIndex,VerbTermId,VerbConcept,NounTermId,NounConcept,NounLiteral,Error,Details,UnknownToken,UnknownNounToken}';
const COMMAND = 'command:{original,normalized,type,verb:{canonical,termId,concept},noun}';
const ENGINE = 'engine:{accepted,resultType,message,effects:[],turnMessages:[],gameOver}';
const DEBUG =
  'debug:{enabled,maxEvents,size,events:[{kind,parse:{commandType,canonicalVerb,verbConcept,canonicalNoun,nounConcept},consumesTurn,result:{accepted,resultType},delta:{score,totalTurnsConsumed,turnsInDangerZone,awaitingRestart},before:{awaitingRestart,ended,currentLocationId,score,totalTurnsConsumed,turnsInDangerZone,globalTurnNumber},after:{awaitingRestart,ended,currentLocationId,score,totalTurnsConsumed,turnsInDangerZone,globalTurnNumber},id,ts}]}';

const EXPECTED: Record<string, string> = {
  'execute/validatore (stringa vuota)': `400 {ok,error,details,userMessage,parseResult:{IsValid,Error,Details},command,engine,state:${STATE},${UI},${STATS}}`,
  'execute/validatore (non stringa)': `400 {ok,error,details,userMessage,parseResult:{IsValid,Error,Details},command,engine,state:${STATE},${UI},${STATS}}`,
  'execute/input non stringa (gestore diretto)': `400 {ok,error,details,userMessage,parseResult,command,engine,state:${STATE},${UI},${STATS}}`,
  'execute/comando valido': `200 {ok,${PARSE},${COMMAND},${ENGINE},state:${STATE},${UI},${STATS}}`,
  'execute/errore di parsing': `200 {ok,${PARSE},command,engine,error,userMessage,state:${STATE},${UI},${STATS}}`,
  'execute/FINE (richiesta)': `200 {ok,${PARSE},${COMMAND},${ENGINE},state:${STATE},${UI},${STATS}}`,
  'execute/attesa FINE': `200 {ok,parseResult,command,engine:{accepted,resultType,message,turnMessages:[],gameOver},state:${STATE},${UI},${STATS}}`,
  'execute/FINE confermata': `200 {ok,parseResult,command,engine:{accepted,resultType,message,gameOver,turnMessages:[]},state:${STATE},${UI},${STATS}}`,
  'execute/attesa riavvio': `200 {ok,parseResult,command,engine:{accepted,resultType,message,turnMessages:[],gameOver},state:${STATE},${UI},${STATS}}`,
  'stats': `200 {ok,visitedPlaces,interactions,mysteries,score,rank,rankKey}`,
  'state': `200 {ok,state:${STATE}}`,
  'save-client-state': `200 {gameState:${STATE},odessaData:{Luoghi:[],Oggetti:[{ID,IDLingua,Oggetto,Attivo,IDLuogo,descrizione}]},timestamp,version}`,
  'save-client-state (luoghi non valido)': `400 {ok,error}`,
  'load-client-state 409': `409 {ok,error,saveLanguage,sessionLanguage}`,
  'load-client-state 200': `200 {ok,message}`,
  'state (dopo il caricamento)': `200 {ok,state:${STATE_LOADED}}`,
  'execute/comando valido (dopo il caricamento)': `200 {ok,${PARSE},${COMMAND},${ENGINE},state:${STATE_LOADED},${UI},${STATS}}`,
  'execute/comando valido (debug)': `200 {ok,${PARSE},${COMMAND},${ENGINE},state:${STATE},${UI},${STATS},${DEBUG}}`,
  'execute/validatore (debug)': `400 {ok,error,details,userMessage,parseResult:{IsValid,Error,Details},command,engine,state:${STATE},${UI},${STATS},${DEBUG}}`,
  'state (debug)': `200 {ok,state:${STATE},${DEBUG}}`,
};


// ---------------------------------------------------------------------------

describe('Ordine delle chiavi dei corpi HTTP', () => {
  let server: Server;
  let base = '';
  const actual: Record<string, string> = {};

  async function http(session: SessionState, method: string, path: string, body?: Json): Promise<{ status: number; body: Json }> {
    const init: RequestInit = { method };
    if (body !== undefined) {
      init.headers = { 'Content-Type': 'application/json' };
      init.body = JSON.stringify(body);
    }
    const res = await fetchWithSession(base + path, init, session);
    return { status: res.status, body: await res.json() };
  }

  beforeAll(async () => {
    const quiet = console.log;
    console.log = () => undefined;
    try {
      await initOdessa();
      loadMessaggiSistema();
      await ensureVocabulary();
    } finally {
      console.log = quiet;
    }

    const app = express();
    app.use(express.json({ limit: '1mb' }));
    app.use('/api/engine', engineRoutes);
    app.use(errorHandler);
    server = await new Promise((resolveServer) => {
      const s = app.listen(0, '127.0.0.1', () => resolveServer(s));
    });
    const address = server.address();
    base = `http://127.0.0.1:${typeof address === 'string' ? 0 : address?.port ?? 0}`;

    const save = JSON.parse(readFileSync(SAVE_PATH, 'utf8'));
    const record = (label: string, status: number, body: Json) => {
      actual[label] = `${status} ${shape(body)}`;
    };
    const fresh = async (lingua: number): Promise<SessionState> => {
      const s = createSessionState();
      await http(s, 'POST', '/api/engine/reset', { idLingua: lingua });
      return s;
    };
    const exec = (s: SessionState, input: unknown) => http(s, 'POST', '/api/engine/execute', { input });

    // execute: input non valido dal validatore
    {
      const s = await fresh(1);
      let r = await exec(s, '');
      record('execute/validatore (stringa vuota)', r.status, r.body);
      r = await exec(s, 123);
      record('execute/validatore (non stringa)', r.status, r.body);
    }

    // execute: ramo "input non stringa" a valle del validatore (irraggiungibile via HTTP)
    {
      const layer = (engineRoutes as Json).stack.find((l: Json) => l.route?.path === '/execute');
      const handler = layer.route.stack[1].handle;
      const engine = createEngine();
      engine.initializeOriginalData();
      engine.resetGameState(1);
      let status = 200;
      let body: Json;
      const res = {
        status(c: number) {
          status = c;
          return this;
        },
        json(b: Json) {
          body = b;
          return this;
        },
      };
      await handler({ odessaSession: { engine }, body: { input: 123 } }, res, (e: unknown) => {
        throw e;
      });
      record('execute/input non stringa (gestore diretto)', status, body);
    }

    // execute: comando valido, errore di parsing, attesa FINE
    {
      const s = await fresh(1);
      let r = await exec(s, 'guarda');
      record('execute/comando valido', r.status, r.body);
      r = await exec(s, 'xyzzy plugh');
      record('execute/errore di parsing', r.status, r.body);
      r = await exec(s, 'fine');
      record('execute/FINE (richiesta)', r.status, r.body);
      expect((await http(s, 'GET', '/api/engine/state')).body.state.awaitingEndConfirm).toBe(true);
      r = await exec(s, 'forse');
      record('execute/attesa FINE', r.status, r.body);
      // risposta "no": esce dall'attesa; poi "fine", "si" porta all'attesa di riavvio
      await exec(s, 'no');
      await exec(s, 'fine');
      r = await exec(s, 'si');
      expect((await http(s, 'GET', '/api/engine/state')).body.state.awaitingRestart).toBe(true);
      record('execute/FINE confermata', r.status, r.body);
      r = await exec(s, 'forse');
      record('execute/attesa riavvio', r.status, r.body);
    }

    // stats, state, save, load
    {
      const s = await fresh(1);
      await exec(s, 'guarda');
      let r = await http(s, 'GET', '/api/engine/stats');
      record('stats', r.status, r.body);
      r = await http(s, 'GET', '/api/engine/state');
      record('state', r.status, r.body);
      r = await http(s, 'POST', '/api/engine/save-client-state', { luoghi: [] });
      record('save-client-state', r.status, r.body);
      r = await http(s, 'POST', '/api/engine/save-client-state', { luoghi: 'x' });
      record('save-client-state (luoghi non valido)', r.status, r.body);

      const en = await fresh(2);
      r = await http(en, 'POST', '/api/engine/load-client-state', save);
      record('load-client-state 409', r.status, r.body);

      r = await http(s, 'POST', '/api/engine/load-client-state', save);
      record('load-client-state 200', r.status, r.body);

      // dopo il caricamento le collezioni e i flag sono popolati: l'ordine interno si vede
      r = await http(s, 'GET', '/api/engine/state');
      record('state (dopo il caricamento)', r.status, r.body);
      r = await exec(s, 'guarda');
      record('execute/comando valido (dopo il caricamento)', r.status, r.body);
    }

    // con ENGINE_DEBUG attivo la chiave `debug` si aggiunge in coda
    {
      const saved = process.env.ENGINE_DEBUG;
      process.env.ENGINE_DEBUG = '1';
      try {
        const s = await fresh(1);
        let r = await exec(s, 'guarda');
        record('execute/comando valido (debug)', r.status, r.body);
        r = await exec(s, '');
        record('execute/validatore (debug)', r.status, r.body);
        r = await http(s, 'GET', '/api/engine/state');
        record('state (debug)', r.status, r.body);
      } finally {
        if (saved === undefined) delete process.env.ENGINE_DEBUG;
        else process.env.ENGINE_DEBUG = saved;
      }
    }
  }, 60000);

  afterAll(async () => {
    await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
  });

  it('i corpi coprono tutti i casi attesi', () => {
    expect(Object.keys(actual)).toEqual(Object.keys(EXPECTED));
  });

  it.each(Object.keys(EXPECTED))('%s', (label) => {
    expect(actual[label]).toBe(EXPECTED[label]);
  });
});
