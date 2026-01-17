const fs = require('fs');

function norm(value) {
  return String(value).toUpperCase().replace(/\s+/g, '_');
}

const interazioni = JSON.parse(fs.readFileSync('src/data-internal/Interazioni.json', 'utf8'));
const oggetti = JSON.parse(fs.readFileSync('src/data-internal/Oggetti.json', 'utf8'));

const oggettiById = new Map();
for (const o of oggetti) {
  if (!oggettiById.has(o.ID)) oggettiById.set(o.ID, {});
  oggettiById.get(o.ID)[o.IDLingua] = o;
}

const oggettiByNormIt = new Map();
for (const o of oggetti.filter(o => o.IDLingua === 1)) {
  oggettiByNormIt.set(norm(o.Oggetto), o);
}

function mapItToEnObjectName(itName) {
  const itObj = oggettiByNormIt.get(norm(itName));
  if (!itObj) return null;
  const enObj = oggettiById.get(itObj.ID)?.[2];
  return enObj?.Oggetto ?? null;
}

const itOnly = interazioni.filter(i => i.IDLingua === 1);
const references = new Map();

function addRef(kind, value, where) {
  if (value == null) return;
  const key = `${kind}:${value}`;
  if (!references.has(key)) references.set(key, { kind, value, where: new Set() });
  references.get(key).where.add(where);
}

for (const i of itOnly) {
  addRef('trigger', i.trigger?.oggetto, i.id);
  for (const p of i.condizioni?.prerequisiti || []) {
    if (p.target) addRef('prereq', p.target, i.id);
  }
  for (const e of i.effetti || []) {
    if (e.target) addRef('effect', e.target, i.id);
  }
}

const rows = Array.from(references.values())
  .map(r => ({
    kind: r.kind,
    it: r.value,
    en: mapItToEnObjectName(r.value),
    usedIn: Array.from(r.where).slice(0, 10).join(','),
  }))
  .sort((a, b) => a.it.localeCompare(b.it));

const missing = rows.filter(r => r.en == null);
console.log('Interazioni IT records:', itOnly.length);
console.log('Unique referenced strings:', rows.length);
console.log('Mapped:', rows.length - missing.length, 'Missing:', missing.length);

if (missing.length) {
  console.log('\nMissing mappings (IT string not found in Oggetti IT):');
  for (const r of missing) {
    console.log('-', r.kind, JSON.stringify(r.it), 'in', r.usedIn);
  }
}

console.log('\nSample mappings:');
for (const r of rows.filter(r => r.en != null).slice(0, 100)) {
  console.log('-', r.kind, JSON.stringify(r.it), '=>', JSON.stringify(r.en));
}
