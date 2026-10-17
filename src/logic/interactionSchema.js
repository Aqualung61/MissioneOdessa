// Schema delle interazioni dichiarative (src/data-internal/Interazioni.json).
// Fonte unica degli insiemi ammessi: importata dal motore (engine.js) e dai test,
// così motore e test non possono divergere.

export const INTERACTION_TOP_LEVEL_KEYS = new Set([
  'id',
  'IDLingua',
  'trigger',
  'condizioni',
  'effetti',
  'ripetibile',
  'risposta',
  'risposta_apri',
  'risposta_chiudi',
  'risposta_step',
  'risposta_completa',
  'risposta_errore',
  'risposta_gia_eseguita',
  'punteggio',
]);

export const PREREQUISITE_TYPES = new Set([
  'OGGETTO_IN_INVENTARIO',
  'OGGETTO_IN_LUOGO',
  'OGGETTO_VISIBILE',
  'SEQUENZA_COMPLETATA',
  'INTERAZIONE_ESEGUITA',
  'FLAG_FALSE',
  'INVENTARIO_NON_PIENO',
  'DIREZIONE_APERTA',
]);

export const PREREQUISITE_KEYS = new Set(['tipo', 'target', 'luogo', 'direzione', 'flag', 'risposta']);

// Campi obbligatori per tipo di prerequisito.
export const PREREQUISITE_REQUIRED_FIELDS = {
  OGGETTO_IN_INVENTARIO: ['target'],
  OGGETTO_IN_LUOGO: ['target', 'luogo'],
  OGGETTO_VISIBILE: ['target', 'luogo'],
  SEQUENZA_COMPLETATA: ['target'],
  INTERAZIONE_ESEGUITA: ['target'],
  FLAG_FALSE: ['flag'],
  INVENTARIO_NON_PIENO: [],
  DIREZIONE_APERTA: ['luogo', 'direzione'],
};

export const EFFECT_TYPES = new Set([
  'VISIBILITA',
  'SPOSTA_OGGETTO',
  'SBLOCCA_DIREZIONE',
  'TOGGLE_DIREZIONE',
  'SEQUENZA',
  'SET_FLAG',
  'RESET_COUNTER',
  'VITTORIA',
  'CONSUMA_FIAMMIFERO',
]);

function prerequisitesOf(record) {
  const list = record?.condizioni?.prerequisiti;
  return Array.isArray(list) ? list : [];
}

function effectsOf(record) {
  return Array.isArray(record?.effetti) ? record.effetti : [];
}

/**
 * Valida i record di Interazioni.json (tutte le lingue).
 * @param {Array<Object>} records
 * @returns {string[]} errori leggibili (vuoto se i dati sono validi)
 */
export function validateInterazioni(records) {
  const errors = [];
  if (!Array.isArray(records)) return ['Interazioni: atteso un array di record'];

  const byLang = new Map();

  for (const record of records) {
    const where = `[${record?.id ?? '?'} / lingua ${record?.IDLingua ?? '?'}]`;

    for (const key of Object.keys(record ?? {})) {
      if (!INTERACTION_TOP_LEVEL_KEYS.has(key)) errors.push(`${where} chiave non ammessa: ${key}`);
    }

    prerequisitesOf(record).forEach((req, idx) => {
      const at = `${where} prerequisito #${idx + 1}`;
      if (!PREREQUISITE_TYPES.has(req?.tipo)) {
        errors.push(`${at} tipo non ammesso: ${req?.tipo}`);
      } else {
        for (const field of PREREQUISITE_REQUIRED_FIELDS[req.tipo]) {
          if (req[field] === undefined || req[field] === null || req[field] === '') {
            errors.push(`${at} (${req.tipo}) campo obbligatorio mancante: ${field}`);
          }
        }
      }
      for (const key of Object.keys(req ?? {})) {
        if (!PREREQUISITE_KEYS.has(key)) errors.push(`${at} chiave non ammessa: ${key}`);
      }
      if (req?.risposta !== undefined && typeof req.risposta !== 'string') {
        errors.push(`${at} risposta deve essere una stringa`);
      }
    });

    effectsOf(record).forEach((eff, idx) => {
      if (!EFFECT_TYPES.has(eff?.tipo)) {
        errors.push(`${where} effetto #${idx + 1} tipo non ammesso: ${eff?.tipo}`);
      }
    });

    if (!byLang.has(record?.IDLingua)) byLang.set(record?.IDLingua, new Map());
    byLang.get(record?.IDLingua).set(record?.id, record);
  }

  // Validazione di `punteggio`: `false` oppure stringa che riferisce un id esistente nella stessa lingua.
  for (const record of records) {
    const where = `[${record?.id ?? '?'} / lingua ${record?.IDLingua ?? '?'}]`;
    if (record?.punteggio === undefined) continue;
    if (record.punteggio !== false && typeof record.punteggio !== 'string') {
      errors.push(`${where} punteggio deve essere false o una stringa`);
      continue;
    }
    if (typeof record.punteggio === 'string') {
      const idsStessaLingua = byLang.get(record.IDLingua);
      if (!idsStessaLingua || !idsStessaLingua.has(record.punteggio)) {
        errors.push(`${where} punteggio riferisce un id inesistente nella stessa lingua: ${record.punteggio}`);
      }
    }
  }

  // Coerenza IT/EN: stessi id; per ogni id, stessi tipi nello stesso ordine; risposta presente in entrambe.
  const langs = [...byLang.keys()];
  if (langs.length > 1) {
    const [baseLang, ...others] = langs;
    const base = byLang.get(baseLang);
    for (const lang of others) {
      const other = byLang.get(lang);
      for (const id of base.keys()) {
        if (!other.has(id)) errors.push(`[${id}] presente in lingua ${baseLang} ma assente in lingua ${lang}`);
      }
      for (const id of other.keys()) {
        if (!base.has(id)) errors.push(`[${id}] presente in lingua ${lang} ma assente in lingua ${baseLang}`);
      }
      for (const [id, a] of base.entries()) {
        const b = other.get(id);
        if (!b) continue;
        const reqA = prerequisitesOf(a);
        const reqB = prerequisitesOf(b);
        const typesA = reqA.map((r) => r?.tipo).join(',');
        const typesB = reqB.map((r) => r?.tipo).join(',');
        if (typesA !== typesB) {
          errors.push(`[${id}] tipi di prerequisito diversi tra lingue ${baseLang} e ${lang}: ${typesA} / ${typesB}`);
        } else {
          reqA.forEach((r, idx) => {
            if (typeof r?.risposta === 'string' !== (typeof reqB[idx]?.risposta === 'string')) {
              errors.push(`[${id}] prerequisito #${idx + 1}: risposta presente solo in una lingua (${baseLang}/${lang})`);
            }
          });
        }
        const effA = effectsOf(a).map((e) => e?.tipo).join(',');
        const effB = effectsOf(b).map((e) => e?.tipo).join(',');
        if (effA !== effB) {
          errors.push(`[${id}] tipi di effetto diversi tra lingue ${baseLang} e ${lang}: ${effA} / ${effB}`);
        }
        if (a?.punteggio !== b?.punteggio) {
          errors.push(`[${id}] punteggio diverso tra lingue ${baseLang} e ${lang}: ${JSON.stringify(a?.punteggio)} / ${JSON.stringify(b?.punteggio)}`);
        }
      }
    }
  }

  return errors;
}
