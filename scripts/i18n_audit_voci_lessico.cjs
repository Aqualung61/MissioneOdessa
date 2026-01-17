/* eslint-disable no-console */
/* Tooling script: audit VociLessico IT/EN coverage and suggest EN voices. */

const voci = require('../src/data-internal/VociLessico.json');
const termini = require('../src/data-internal/TerminiLessico.json');
const tipi = require('../src/data-internal/TipiLessico.json');
const oggetti = require('../src/data-internal/Oggetti.json');

const tipoById = new Map(tipi.map(t => [t.ID_TipoLessico, t.NomeTipo]));
const termById = new Map(termini.map(t => [t.ID_Termine, t]));

function norm(s) {
  return String(s || '')
    .toUpperCase()
    .replace(/_/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveOggettoEnByConcetto(concetto) {
  const needle = norm(concetto);
  const it = oggetti.find(o => o.IDLingua === 1 && norm(o.Oggetto) === needle);
  if (!it) return null;
  const en = oggetti.find(o => o.ID === it.ID && o.IDLingua === 2);
  return en?.Oggetto ?? null;
}

const hasByTerm = new Map();
for (const r of voci) {
  const set = hasByTerm.get(r.ID_Termine) || new Set();
  set.add(r.ID_Lingua);
  hasByTerm.set(r.ID_Termine, set);
}

const missingEn = [];
for (const [termId, langs] of hasByTerm) {
  if (langs.has(1) && !langs.has(2)) missingEn.push(termId);
}
missingEn.sort((a, b) => a - b);

const report = missingEn.map(termId => {
  const term = termById.get(termId);
  const tipo = tipoById.get(term?.ID_TipoLessico);
  const concetto = term?.Concetto;
  const itVoices = voci.filter(v => v.ID_Termine === termId && v.ID_Lingua === 1).map(v => v.Voce);
  const enSuggestion = tipo === 'NOUN' ? resolveOggettoEnByConcetto(concetto) : null;
  return { termId, tipo, concetto, itVoices, enSuggestion };
});

console.log('VociLessico rows:', voci.length);
console.log('Missing EN terms:', report.length);
console.log('Missing EN by tipo:', report.reduce((acc, r) => {
  acc[r.tipo || 'UNKNOWN'] = (acc[r.tipo || 'UNKNOWN'] || 0) + 1;
  return acc;
}, {}));

for (const r of report) {
  console.log(`term ${r.termId} [${r.tipo}] concetto=${r.concetto} IT=${JSON.stringify(r.itVoices)} EN_suggest=${r.enSuggestion}`);
}
