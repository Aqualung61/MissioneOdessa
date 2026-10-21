// Aiuto: messaggio dei comandi disponibili, estratto da `engine.js` (TD Lotto 5, §3.4.4).
// Testi fissi e mappa `capitalizeCommand` alla lettera (fuori perimetro, TD §2.2).
import { getGameData } from './gameData.js';

// Mapping speciale per alcuni comandi
const COMMAND_MAPPINGS = {
  'PRENDERE': 'Prendi',
  'SALVARE': 'Salva',
  'CARICARE': 'Carica',
  'INVENTARIO': 'Inventario',
  'ESAMINARE': 'Esamina',
  'OSSERVARE': 'Osserva',
  'GUARDARE': 'Guarda',
  'APRIRE': 'Apri',
  'CHIUDERE': 'Chiudi',
  'LEGGERE': 'Leggi',
  'INFILARE': 'Infila',
  'POSARE': 'Posa',
  'LASCIARE': 'Lascia',
  'SPOSTARE': 'Sposta',
  'MUOVERE': 'Muovi',
  'ACCENDERE': 'Accendi',
  'METTERE': 'Metti',
  'AIUTO': 'Aiuto',
  'FINE': 'Fine',
  'PUNTI': 'Punti',
  'NORD': 'Nord',
  'SUD': 'Sud',
  'EST': 'Est',
  'OVEST': 'Ovest',
  'SU': 'Su',
  'GIU': 'Giù'
};

// Funzione helper per capitalizzare comandi
export function capitalizeCommand(str) {
  if (COMMAND_MAPPINGS[str]) return COMMAND_MAPPINGS[str];

  // Capitalizzazione standard
  return str.charAt(0) + str.slice(1).toLowerCase();
}

// IT: manteniamo il comportamento storico (concetti canonici + capitalizzazione).
function helpMessageIt(termini) {
  const direzioni = termini
    .filter(t => t.ID_TipoLessico === 2)
    .map(t => capitalizeCommand(t.Concetto))
    .sort();

  const sistema = termini
    .filter(t => t.ID_TipoLessico === 3)
    .map(t => capitalizeCommand(t.Concetto))
    .sort();

  const verbi = termini
    .filter(t => t.ID_TipoLessico === 1)
    .map(t => capitalizeCommand(t.Concetto))
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
      .filter(v => v.ID_Termine === termId && v.ID_Lingua === 2)
      .map(v => String(v.Voce || '').trim())
      .filter(Boolean);
  }

  function pickPrimaryVoice(termId) {
    const voices = Array.from(new Set(voicesForTerm(termId)))
      .sort((a, b) => a.localeCompare(b, 'en'));
    if (!voices.length) return null;
    // Preferisci una voce "lunga" (es. NORTH) rispetto a abbreviazioni (es. N)
    const long = voices.find(v => v.length > 1);
    return long || voices[0];
  }

  function pickDirectionVoice(termId) {
    const voices = Array.from(new Set(voicesForTerm(termId)))
      .sort((a, b) => a.localeCompare(b, 'en'));
    if (!voices.length) return null;
    const long = voices.find(v => v.length > 1);
    const short = voices.find(v => v.length === 1);
    if (long && short) return `${long} (${short})`;
    return long || short || voices[0];
  }

  const direzioni = termini
    .filter(t => t.ID_TipoLessico === 2)
    .map(t => pickDirectionVoice(t.ID_Termine) || capitalizeCommand(t.Concetto))
    .sort((a, b) => a.localeCompare(b, 'en'));

  const sistema = termini
    .filter(t => t.ID_TipoLessico === 3)
    .map(t => pickPrimaryVoice(t.ID_Termine) || capitalizeCommand(t.Concetto))
    .sort((a, b) => a.localeCompare(b, 'en'));

  const verbi = termini
    .filter(t => t.ID_TipoLessico === 1)
    .map(t => pickPrimaryVoice(t.ID_Termine) || capitalizeCommand(t.Concetto))
    .sort((a, b) => a.localeCompare(b, 'en'));

  let msg = '<b>Available commands:</b>\n';
  msg += '<i>Directions: ' + direzioni.join(', ') + '</i>\n';
  msg += '<i>System: ' + sistema.join(', ') + '</i>\n';
  msg += '<i>Actions: ' + verbi.join(', ') + '</i>\n\n';
  return msg;
}

// Funzione isolata per generare messaggio di aiuto. La lingua predefinita è quella corrente di `eng.state`.
export function generateHelpMessage(eng, idLingua = eng.state?.currentLingua ?? 1) {
  const lingua = Number(idLingua) === 2 ? 2 : 1;
  const termini = getGameData().TerminiLessico || [];
  return lingua === 1 ? helpMessageIt(termini) : helpMessageEn(termini);
}
