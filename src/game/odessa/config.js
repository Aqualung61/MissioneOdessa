// Configurazione di gioco di Odessa (src/data-internal/Configurazione.json).
// Caricata all'importazione del modulo,
// non dai dati statici in memoria (indipendente dall'ordine di inizializzazione,
// non toccata dai test che sostituiscono i dati statici con dati parziali).
// Un errore di caricamento impedisce l'avvio del server con un messaggio esplicito.
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { loadGameConfig } from '../../logic/core/gameConfig.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = resolve(__dirname, '..', '..', 'data-internal', 'Configurazione.json');

// Percorsi puntati di tutte le chiavi della configurazione:
// `loadGameConfig` verifica la presenza di ciascuno e cita il percorso
// mancante nel messaggio d'errore, restando generico (l'elenco è specifico di Odessa
// e vive qui, non nel caricatore).
const REQUIRED_PATHS = [
  'luoghi.iniziale',
  'luoghi.barriera',
  'luoghi.pesa',
  'luoghi.cassaforte',
  'luoghi.zoneAperte',
  'luoghi.passaggioCrollato.luogo',
  'luoghi.passaggioCrollato.direzione',
  'luoghi.passaggioCrollato.destinazione',
  'luoghi.movimentiBloccatiConTesto',
  'luoghi.macerieEsaminabili',
  'luoghi.scavoDelegatoAInterazione',
  'luoghi.scavoSenzaAttrezzo',
  'oggetti.torcia',
  'oggetti.lampada',
  'oggetti.fiammiferi',
  'oggetti.badile',
  'oggetti.documenti',
  'oggetti.vittoria',
  'oggetti.spostabiliAncheSeFissi',
  'regole.limiteInventario',
  'regole.fiammiferiIniziali',
  'regole.turniLuceFiammifero',
  'regole.timerBuio',
  'regole.timerZonaAperta',
  'regole.turniTorciaFunzionante',
  'regole.timerGuardia',
  'regole.avvisiGuardia',
  'regole.limiteAlba',
  'regole.avvisiAlba',
  'regole.verbiBloccatiAlBuio',
  'regole.oggettiSceniciSenzaPresenza',
  'punteggio.luogo',
  'punteggio.interazione',
  'punteggio.mistero',
  'punteggio.ferenc',
  'punteggio.ranghi',
  'lessico.verbiSenzaOggetto',
];

/**
 * Configurazione di Odessa, letta da `Configurazione.json` all'importazione del modulo e congelata (`deepFreeze`).
 * @type {Object}
 */
export const CONFIG = loadGameConfig(CONFIG_PATH, { required: REQUIRED_PATHS });
