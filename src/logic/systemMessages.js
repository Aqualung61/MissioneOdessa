// Helper per accedere ai messaggi di sistema localizzati

let messaggiSistema = [];

// Carica i messaggi di sistema dai dati globali
export function loadMessaggiSistema() {
  if (global.odessaData && global.odessaData.MessaggiSistema) {
    messaggiSistema = global.odessaData.MessaggiSistema;
  }
}

/**
 * Recupera un messaggio di sistema localizzato
 * @param {string} chiave - Chiave del messaggio (es. "engine.inventory.empty")
 * @param {number} idLingua - ID della lingua (1=IT, 2=EN)
 * @param {Array<string>} params - Parametri per sostituire placeholder {0}, {1}, etc.
 * @returns {string} Messaggio localizzato con placeholder sostituiti
 */
export function getSystemMessage(chiave, idLingua = 1, params = []) {
  const record = messaggiSistema.find(m => m.Chiave === chiave && m.IDLingua === idLingua);
  
  if (!record) {
    return `[Missing: ${chiave}]`;
  }
  
  let messaggio = record.Messaggio;
  
  // Sostituisci placeholder {0}, {1}, etc.
  params.forEach((param, index) => {
    messaggio = messaggio.replace(`{${index}}`, param);
  });
  
  return messaggio;
}

export default { loadMessaggiSistema, getSystemMessage };
