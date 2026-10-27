// Aiuto: messaggio dei comandi disponibili.
// Testi fissi e mappa `capitalizeCommand`.
import { getGameData } from './gameData.js';

// Mapping speciale per alcuni comandi
const COMMAND_MAPPINGS = {
  PRENDERE: 'Prendi',
  SALVARE: 'Salva',
  CARICARE: 'Carica',
  INVENTARIO: 'Inventario',
  ESAMINARE: 'Esamina',
  OSSERVARE: 'Osserva',
  GUARDARE: 'Guarda',
  APRIRE: 'Apri',
  CHIUDERE: 'Chiudi',
  LEGGERE: 'Leggi',
  INFILARE: 'Infila',
  POSARE: 'Posa',
  LASCIARE: 'Lascia',
  SPOSTARE: 'Sposta',
  MUOVERE: 'Muovi',
  ACCENDERE: 'Accendi',
  METTERE: 'Metti',
  ATTACCARE: 'Attacca',
  DORMIRE: 'Dormi',
  PARLARE: 'Parla',
  PORGERE: 'Porgi',
  PREMERE: 'Premi',
  RUOTARE: 'Ruota',
  SCAPPARE: 'Scappa',
  SCARICARE: 'Scarica',
  SCAVARE: 'Scava',
  SEDERSI: 'Siediti',
  SORRIDERE: 'Sorridi',
  SPEGNERE: 'Spegni',
  AIUTO: 'Aiuto',
  FINE: 'Fine',
  PUNTI: 'Punti',
  NORD: 'Nord',
  SUD: 'Sud',
  EST: 'Est',
  OVEST: 'Ovest',
  SU: 'Su',
  GIU: 'Giù',
};

/**
 * Forma di presentazione di un comando: la mappatura speciale se esiste, altrimenti iniziale maiuscola e resto minuscolo.
 * @param {string} str - comando
 * @returns {string}
 */
export function capitalizeCommand(str) {
  if (COMMAND_MAPPINGS[str]) return COMMAND_MAPPINGS[str];

  // Capitalizzazione standard
  return str.charAt(0) + str.slice(1).toLowerCase();
}

// IT: manteniamo il comportamento storico (concetti canonici + capitalizzazione).
function helpMessageIt(termini) {
  const direzioni = termini
    .filter((t) => t.ID_TipoLessico === 2)
    .map((t) => capitalizeCommand(t.Concetto))
    .sort();

  const sistema = termini
    .filter((t) => t.ID_TipoLessico === 3)
    .map((t) => capitalizeCommand(t.Concetto))
    .sort();

  const verbi = termini
    .filter((t) => t.ID_TipoLessico === 1)
    .map((t) => capitalizeCommand(t.Concetto))
    .sort();

  let msg = '<b>Comandi disponibili:</b>\n';
  msg += '<i>Direzioni: ' + direzioni.join(', ') + '</i>\n';
  msg += '<i>Sistema: ' + sistema.join(', ') + '</i>\n';
  msg += '<i>Azioni: ' + verbi.join(', ') + '</i>\n\n';
  return msg;
}

// EN: usa VociLessico per mostrare comandi in lingua selezionata.
function helpMessageEn(termini) {
  const voci = getGameData().VociLessico || [];

  function voicesForTerm(termId) {
    return voci
      .filter((v) => v.ID_Termine === termId && v.ID_Lingua === 2)
      .map((v) => String(v.Voce || '').trim())
      .filter(Boolean);
  }

  function pickPrimaryVoice(termId) {
    const voices = Array.from(new Set(voicesForTerm(termId))).sort((a, b) =>
      a.localeCompare(b, 'en')
    );
    if (!voices.length) return null;
    // Preferisci una voce "lunga" (es. NORTH) rispetto a abbreviazioni (es. N)
    const long = voices.find((v) => v.length > 1);
    return long || voices[0];
  }

  function pickDirectionVoice(termId) {
    const voices = Array.from(new Set(voicesForTerm(termId))).sort((a, b) =>
      a.localeCompare(b, 'en')
    );
    if (!voices.length) return null;
    const long = voices.find((v) => v.length > 1);
    const short = voices.find((v) => v.length === 1);
    if (long && short) return `${long} (${short})`;
    return long || short || voices[0];
  }

  // Presentazione (#137): iniziale maiuscola e resto minuscolo; ordine calcolato sulle voci grezze.
  function toDisplay(raw) {
    const lower = raw.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }

  function listFor(tipo, pick) {
    return termini
      .filter((t) => t.ID_TipoLessico === tipo)
      .map((t) => {
        const raw = pick(t.ID_Termine);
        return raw
          ? { sortKey: raw, shown: formatEnEntry(raw) }
          : { sortKey: capitalizeCommand(t.Concetto), shown: capitalizeCommand(t.Concetto) };
      })
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey, 'en'))
      .map((e) => e.shown);
  }

  // Direzioni: "NORTH (N)" -> "North (N)"; l'abbreviazione resta in maiuscolo.
  function formatEnEntry(raw) {
    const m = /^(.*?)( \([^)]*\))?$/.exec(raw);
    return toDisplay(m[1]) + (m[2] || '');
  }

  const direzioni = listFor(2, pickDirectionVoice);
  const sistema = listFor(3, pickPrimaryVoice);
  const verbi = listFor(1, pickPrimaryVoice);

  let msg = '<b>Available commands:</b>\n';
  msg += '<i>Directions: ' + direzioni.join(', ') + '</i>\n';
  msg += '<i>System: ' + sistema.join(', ') + '</i>\n';
  msg += '<i>Actions: ' + verbi.join(', ') + '</i>\n\n';
  return msg;
}

/**
 * Messaggio di aiuto con i comandi disponibili nella lingua indicata.
 * @param {Object} eng - contenitore del motore
 * @param {number} [idLingua] - ID della lingua (1 = IT, 2 = EN); se omesso, la lingua corrente di `eng.state`
 * @returns {string}
 */
export function generateHelpMessage(eng, idLingua = eng.state?.currentLingua ?? 1) {
  const lingua = Number(idLingua) === 2 ? 2 : 1;
  const termini = getGameData().TerminiLessico || [];
  return lingua === 1 ? helpMessageIt(termini) : helpMessageEn(termini);
}
