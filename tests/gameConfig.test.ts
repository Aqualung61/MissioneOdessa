import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadGameConfig, rankKeyFor } from '../src/logic/core/gameConfig.js';
import { CONFIG } from '../src/game/odessa/config.js';
import { DAWN_TURN_LIMIT } from '../src/logic/turnEffects/dawnEffect.js';
import { OPEN_AREA_LOCATIONS } from '../src/logic/turnEffects/interceptEffect.js';
import Luoghi from '../src/data-internal/Luoghi.json';
import Oggetti from '../src/data-internal/Oggetti.json';
import MessaggiSistema from '../src/data-internal/MessaggiSistema.json';
import TerminiLessico from '../src/data-internal/TerminiLessico.json';

// Base per la configurazione minima valida
// usata nei test di validazione, modificata di volta in volta per violare
// esattamente un vincolo.
function baseConfig() {
  return {
    versione: 1,
    gioco: 'odessa',
    luoghi: {
      iniziale: 1,
      barriera: 59,
      pesa: 57,
      cassaforte: 24,
      zoneAperte: [51, 52, 53],
      passaggioCrollato: { luogo: 32, direzione: 'Sud', destinazione: 36 },
      movimentiBloccatiConTesto: [
        { luogo: 1, direzione: 'Ovest', messaggio: 'engine.move.leaveHouseWest' },
      ],
      macerieEsaminabili: [11, 32, 36],
      scavoDelegatoAInterazione: [11, 49],
      scavoSenzaAttrezzo: [32, 36],
    },
    oggetti: {
      torcia: 37,
      lampada: 27,
      fiammiferi: 36,
      badile: 4,
      documenti: 35,
      vittoria: [16, 6, 34],
      spostabiliAncheSeFissi: [3, 33],
    },
    regole: {
      limiteInventario: 5,
      fiammiferiIniziali: 6,
      turniLuceFiammifero: 2,
      timerBuio: 3,
      timerZonaAperta: 2,
      turniTorciaFunzionante: 6,
      timerGuardia: 5,
      avvisiGuardia: { 3: 'timer.guard.warning1' },
      limiteAlba: 200,
      avvisiAlba: { 30: 'timer.dawn.warning30' },
      verbiBloccatiAlBuio: ['PRENDERE'],
      oggettiSceniciSenzaPresenza: ['FILO_SPINATO'],
    },
    punteggio: {
      luogo: 1,
      interazione: 2,
      mistero: 3,
      ferenc: 4,
      ranghi: [
        { minimo: 100, chiave: 'engine.rank.master' },
        { minimo: 0, chiave: 'engine.rank.novice' },
      ],
    },
    lessico: {
      verbiSenzaOggetto: ['DORMIRE'],
    },
  };
}

function writeFixture(obj: unknown, dir: string, filename = 'Configurazione.json') {
  const filePath = join(dir, filename);
  writeFileSync(filePath, JSON.stringify(obj), 'utf8');
  return filePath;
}

describe('gameConfig — caricamento e validazione', () => {
  const tempDirs: string[] = [];

  function makeTempDir() {
    const dir = mkdtempSync(join(tmpdir(), 'gameConfig-test-'));
    tempDirs.push(dir);
    return dir;
  }

  afterEach(() => {
    while (tempDirs.length > 0) {
      const dir = tempDirs.pop();
      if (dir) rmSync(dir, { recursive: true, force: true });
    }
  });

  it('CONFIG di Odessa viene caricata e contiene le sezioni previste', () => {
    expect(CONFIG.versione).toBe(1);
    expect(CONFIG.gioco).toBe('odessa');
    expect(CONFIG.luoghi.iniziale).toBe(1);
    expect(CONFIG.luoghi.barriera).toBe(59);
    expect(CONFIG.oggetti.torcia).toBe(37);
    expect(CONFIG.punteggio.ranghi.length).toBe(5);
  });

  it('CONFIG è congelata in profondità: una mutazione lancia TypeError', () => {
    expect(() => {
      // @ts-expect-error — test di immutabilità: la mutazione deve essere rifiutata
      CONFIG.luoghi.zoneAperte.push(999);
    }).toThrow(TypeError);
    expect(() => {
      // @ts-expect-error — idem, su una proprietà scalare
      CONFIG.regole.limiteInventario = 999;
    }).toThrow(TypeError);
  });

  it('un file di configurazione valido viene caricato e congelato', () => {
    const dir = makeTempDir();
    const filePath = writeFixture(baseConfig(), dir);
    const config = loadGameConfig(filePath);
    expect(config.versione).toBe(1);
    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.luoghi)).toBe(true);
  });

  it('lancia un errore se manca una sezione di primo livello (es. "lessico")', () => {
    const dir = makeTempDir();
    const broken = baseConfig() as Record<string, unknown>;
    delete broken.lessico;
    const filePath = writeFixture(broken, dir);
    expect(() => loadGameConfig(filePath)).toThrowError(/lessico/);
  });

  it('lancia un errore se "versione" non è 1', () => {
    const dir = makeTempDir();
    const broken = baseConfig();
    broken.versione = 2;
    const filePath = writeFixture(broken, dir);
    expect(() => loadGameConfig(filePath)).toThrowError(/versione/);
  });

  it('lancia un errore se un ID numerico non è un intero positivo', () => {
    const dir = makeTempDir();
    const broken = baseConfig();
    broken.luoghi.barriera = -1;
    const filePath = writeFixture(broken, dir);
    expect(() => loadGameConfig(filePath)).toThrowError(/luoghi\.barriera/);
  });

  it('lancia un errore se un ID numerico non è un intero (valore non intero)', () => {
    const dir = makeTempDir();
    const broken = baseConfig();
    broken.oggetti.torcia = 37.5;
    const filePath = writeFixture(broken, dir);
    expect(() => loadGameConfig(filePath)).toThrowError(/oggetti\.torcia/);
  });

  it('ammette 0 per una chiave "minimo" (soglia di rango inclusiva)', () => {
    const dir = makeTempDir();
    const ok = baseConfig();
    ok.punteggio.ranghi = [{ minimo: 0, chiave: 'engine.rank.novice' }];
    const filePath = writeFixture(ok, dir);
    expect(() => loadGameConfig(filePath)).not.toThrow();
  });

  it('lancia un errore se una chiave "minimo" è negativa', () => {
    const dir = makeTempDir();
    const broken = baseConfig();
    broken.punteggio.ranghi = [{ minimo: -1, chiave: 'engine.rank.novice' }];
    const filePath = writeFixture(broken, dir);
    expect(() => loadGameConfig(filePath)).toThrowError(/minimo/);
  });

  it('lancia un errore se il file non esiste', () => {
    const dir = makeTempDir();
    expect(() => loadGameConfig(join(dir, 'assente.json'))).toThrow();
  });

  it('lancia un errore se il file non è JSON valido', () => {
    const dir = makeTempDir();
    const filePath = join(dir, 'Configurazione.json');
    writeFileSync(filePath, '{ non è json', 'utf8');
    expect(() => loadGameConfig(filePath)).toThrow();
  });

  it('con "required" lancia un errore se manca una chiave annidata, citandola nel messaggio (E-2, v1.1)', () => {
    const dir = makeTempDir();
    const broken = baseConfig() as Record<string, Record<string, unknown>>;
    delete broken.oggetti.badile;
    const filePath = writeFixture(broken, dir);
    expect(() => loadGameConfig(filePath, { required: ['oggetti.badile'] })).toThrowError(
      /oggetti\.badile/
    );
  });

  it('con "required" non lancia se tutte le chiavi annidate richieste sono presenti', () => {
    const dir = makeTempDir();
    const filePath = writeFixture(baseConfig(), dir);
    expect(() =>
      loadGameConfig(filePath, {
        required: ['oggetti.badile', 'luoghi.passaggioCrollato.destinazione'],
      })
    ).not.toThrow();
  });
});

describe('gameConfig — coerenza dei dati Odessa', () => {
  const luoghiIds = new Set(Luoghi.map((l) => l.ID));
  const oggettiIds = new Set(Oggetti.map((o) => o.ID));
  const messaggiChiavi = new Set(MessaggiSistema.map((m) => m.Chiave));
  const concettiLessico = new Set(TerminiLessico.map((t) => t.Concetto));
  const direzioniValide = new Set(['Nord', 'Est', 'Sud', 'Ovest', 'Su', 'Giu']);

  it('ogni ID in luoghi.* esiste in Luoghi.json', () => {
    const idsDaVerificare = [
      CONFIG.luoghi.iniziale,
      CONFIG.luoghi.barriera,
      CONFIG.luoghi.pesa,
      CONFIG.luoghi.cassaforte,
      ...CONFIG.luoghi.zoneAperte,
      CONFIG.luoghi.passaggioCrollato.luogo,
      CONFIG.luoghi.passaggioCrollato.destinazione,
      ...CONFIG.luoghi.movimentiBloccatiConTesto.map((m) => m.luogo),
      ...CONFIG.luoghi.macerieEsaminabili,
      ...CONFIG.luoghi.scavoDelegatoAInterazione,
      ...CONFIG.luoghi.scavoSenzaAttrezzo,
    ];
    for (const id of idsDaVerificare) {
      expect(luoghiIds.has(id), `luoghi: ID ${id} non trovato in Luoghi.json`).toBe(true);
    }
  });

  it('ogni ID in oggetti.* esiste in Oggetti.json', () => {
    const idsDaVerificare = [
      CONFIG.oggetti.torcia,
      CONFIG.oggetti.lampada,
      CONFIG.oggetti.fiammiferi,
      CONFIG.oggetti.badile,
      CONFIG.oggetti.documenti,
      ...CONFIG.oggetti.vittoria,
      ...CONFIG.oggetti.spostabiliAncheSeFissi,
    ];
    for (const id of idsDaVerificare) {
      expect(oggettiIds.has(id), `oggetti: ID ${id} non trovato in Oggetti.json`).toBe(true);
    }
  });

  it('ogni chiave messaggio della configurazione esiste in MessaggiSistema.json', () => {
    const chiavi = [
      ...CONFIG.luoghi.movimentiBloccatiConTesto.map((m) => m.messaggio),
      ...Object.values(CONFIG.regole.avvisiGuardia),
      ...Object.values(CONFIG.regole.avvisiAlba),
      ...CONFIG.punteggio.ranghi.map((r) => r.chiave),
    ];
    for (const chiave of chiavi) {
      expect(
        messaggiChiavi.has(chiave),
        `chiave messaggio "${chiave}" non trovata in MessaggiSistema.json`
      ).toBe(true);
    }
  });

  it('ogni concetto citato in regole.* e lessico.* esiste in TerminiLessico.json', () => {
    const concetti = [...CONFIG.regole.verbiBloccatiAlBuio, ...CONFIG.lessico.verbiSenzaOggetto];
    for (const concetto of concetti) {
      expect(
        concettiLessico.has(concetto),
        `concetto "${concetto}" non trovato in TerminiLessico.json`
      ).toBe(true);
    }
    // oggettiSceniciSenzaPresenza non sono concetti di TerminiLessico (sono nomi di
    // oggetti scenici senza record in Oggetti.json): verificati solo come stringhe non vuote.
    for (const nome of CONFIG.regole.oggettiSceniciSenzaPresenza) {
      expect(typeof nome).toBe('string');
      expect(nome.length).toBeGreaterThan(0);
    }
  });

  it('le direzioni citate nella configurazione sono colonne valide di Luoghi.json', () => {
    expect(direzioniValide.has(CONFIG.luoghi.passaggioCrollato.direzione)).toBe(true);
    for (const m of CONFIG.luoghi.movimentiBloccatiConTesto) {
      expect(direzioniValide.has(m.direzione), `direzione "${m.direzione}" non valida`).toBe(true);
    }
  });
});

describe('rankKeyFor', () => {
  // Oracolo riscritto indipendentemente dalla cascata originale di engine.js/engineRoutes.js.
  function oracle(score: number): string {
    if (score >= 134) return 'engine.rank.perfectionist';
    if (score >= 100) return 'engine.rank.master';
    if (score >= 67) return 'engine.rank.investigator';
    if (score >= 34) return 'engine.rank.explorer';
    return 'engine.rank.novice';
  }

  it('coincide con la cascata attesa per ogni punteggio intero da 0 a 140', () => {
    for (let score = 0; score <= 140; score++) {
      expect(rankKeyFor(score, CONFIG.punteggio.ranghi)).toBe(oracle(score));
    }
  });

  it('restituisce null se nessuna soglia è superata', () => {
    expect(
      rankKeyFor(
        -1,
        [{ minimo: 0, chiave: 'engine.rank.novice' }].filter((r) => r.minimo > 0)
      )
    ).toBeNull();
  });
});

describe('alias di configurazione esportati dai turnEffects', () => {
  it('DAWN_TURN_LIMIT coincide con CONFIG.regole.limiteAlba', () => {
    expect(DAWN_TURN_LIMIT).toBe(CONFIG.regole.limiteAlba);
  });

  it('OPEN_AREA_LOCATIONS coincide con CONFIG.luoghi.zoneAperte', () => {
    expect(OPEN_AREA_LOCATIONS).toEqual(CONFIG.luoghi.zoneAperte);
  });
});
