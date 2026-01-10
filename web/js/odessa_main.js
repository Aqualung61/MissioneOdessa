// Funzione per leggere parametri URL
function getQueryParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

// Legge idLingua da URL, localStorage o default a 1
const idLingua = parseInt(getQueryParam('idLingua')) || parseInt(localStorage.getItem('linguaSelezionata')) || 1;
console.log('ID Lingua corrente (odessa_main.js):', idLingua);

// Persistenza lingua: utile se l'utente apre direttamente odessa_main.html senza query.
try {
  const prev = localStorage.getItem('linguaSelezionata');
  const current = String(idLingua);
  if (prev !== current) {
    localStorage.setItem('linguaSelezionata', current);
    localStorage.removeItem('linguaDescrizione');
  }
} catch {
  // ignore
}

function setLinguaScelta(descrizione) {
  const el = document.getElementById('linguaScelta');
  if (!el) return;
  if (!descrizione) {
    el.textContent = window.i18n ? window.i18n.msg('ui.lang.selected', '') : 'Lingua selezionata:';
    return;
  }
  el.textContent = window.i18n ? window.i18n.msg('ui.lang.selected', descrizione) : `Lingua selezionata: ${descrizione}`;
}

function setVersioneRunning(ver) {
  const el = document.getElementById('versioneRunning');
  if (!el) return;
  el.textContent = ver ? `Versione: ${ver}` : '';
}

// Recupera la versione dall'API (mostrata sotto la lingua)
try {
  const bp = getBasePath();
  fetch(bp + 'api/version')
    .then(res => res.json())
    .then(data => {
      if (data && data.version) setVersioneRunning(data.version);
    })
    .catch(() => setVersioneRunning('non disponibile'));
} catch {
  setVersioneRunning('non disponibile');
}

// Carica messaggi i18n frontend
if (window.i18n) {
  window.i18n.load(idLingua)
    .then(() => {
      window.i18n.initHTML();
      console.log('Testi HTML localizzati');
      
      // Mostra lingua selezionata localizzata
      let descrizione = localStorage.getItem('linguaDescrizione') || '';
      if (!descrizione && idLingua) {
        // Fallback: recupera nome lingua dal backend
        // NOTA: basePath definito più avanti, ma hoisting consente l'uso qui tramite funzione
        const bp = getBasePath();
        fetch(bp + 'api/lingue')
          .then(res => res.json())
          .then(data => {
            const lingua = data.find(l => String(l.ID_Lingua ?? l.ID ?? l.id ?? l.Id) === String(idLingua));
            if (lingua) {
              const nome = lingua.NomeLingua ?? lingua.Descrizione ?? lingua.nome ?? lingua.nomeLingua;
              descrizione = nome || '';
              if (descrizione) {
                setLinguaScelta(descrizione);
                localStorage.setItem('linguaDescrizione', descrizione);
              }
            }
          });
      } else if (descrizione) {
        setLinguaScelta(descrizione);
      }
    })
    .catch(err => console.error('Errore caricamento i18n:', err));
}

// Se l'i18n non è disponibile, mostriamo comunque la lingua (best-effort)
if (!window.i18n) {
  try {
    let descrizione = localStorage.getItem('linguaDescrizione') || '';
    if (descrizione) {
      setLinguaScelta(descrizione);
    } else if (idLingua) {
      const bp = getBasePath();
      fetch(bp + 'api/lingue')
        .then(res => res.json())
        .then(data => {
          const lingua = data.find(l => String(l.ID_Lingua ?? l.ID ?? l.id ?? l.Id) === String(idLingua));
          if (!lingua) return;
          const nome = lingua.NomeLingua ?? lingua.Descrizione ?? lingua.nome ?? lingua.nomeLingua;
          descrizione = nome || '';
          if (!descrizione) return;
          setLinguaScelta(descrizione);
          localStorage.setItem('linguaDescrizione', descrizione);
        })
        .catch(() => {
          // ignore
        });
    }
  } catch {
    // ignore
  }
}

// Nessuna logica click/hover: solo visualizzazione direzioni
// Modifica 20251107: aggiunta logica click sulle direzioni abilitate
function updateDirectionUI(cur) {
  // ...existing code...
  // Se luogo terminale, tutte le direzioni sono disabilitate
  const isTerminal = cur && cur.Terminale === -1;
  const dirMap = { 'Nord': 'N', 'Est': 'E', 'Sud': 'S', 'Ovest': 'O' };
  Object.entries(dirMap).forEach(([it, letter]) => {
    const vlets = document.querySelectorAll('#squarePanel .vlet');
    vlets.forEach(el => {
      if (el.textContent.trim() === letter) {
        let enabled;
        if (isTerminal) {
          enabled = false;
        } else {
          // Sud: abilitato se cur['Sud'] > 0
          if (it === 'Sud') {
            enabled = cur && cur['Sud'] && cur['Sud'] > 0;
          } else {
            const val = cur ? cur[it] : undefined;
            enabled = val && val !== 0;
          }
        }
        el.classList.toggle('active', enabled);
        el.classList.toggle('disabled', !enabled);
        // Logica click: solo se abilitato
        el.style.cursor = enabled ? 'pointer' : 'default';
        el.onclick = enabled ? function(e) {
          e.preventDefault();
          // Esegui comando direzione come input
          handleDirectionClick(it);
        } : null;
      }
    });
  });
  // Bottoni verticali Su/Giu
  const vertMap = { 'Su': 'Su', 'Giu': 'Giu' };
  Object.entries(vertMap).forEach(([it, label]) => {
    const items = document.querySelectorAll('#squarePanel .vg-item');
    items.forEach(item => {
      const lbl = item.querySelector('.vg-label');
      if (lbl && lbl.textContent.trim() === label) {
        const dot = item.querySelector('.vg-dot');
        let enabled;
        if (isTerminal) {
          enabled = false;
        } else {
          const val = cur ? cur[it] : undefined;
          enabled = val && val !== 0;
        }
        if (dot) {
          dot.classList.toggle('active', enabled);
          dot.classList.toggle('disabled', !enabled);
          dot.style.cursor = enabled ? 'pointer' : 'default';
          dot.onclick = enabled ? function(e) {
            e.preventDefault();
            handleDirectionClick(it);
          } : null;
        }
        lbl.classList.toggle('active', enabled);
        lbl.classList.toggle('disabled', !enabled);
        lbl.style.cursor = enabled ? 'pointer' : 'default';
        lbl.onclick = enabled ? function(e) {
          e.preventDefault();
          handleDirectionClick(it);
        } : null;
        item.classList.toggle('active', enabled);
        item.classList.toggle('disabled', !enabled);
      }
    });
  });
}

// === HELPER FUNCTIONS ===

/**
 * Mostra messaggio di game over e blocca ulteriori input
 * @param {string} message - Messaggio da mostrare (opzionale, usa i18n se non fornito)
 */
function displayGameOverMessage(message) {
  awaitingRestart = true;
  const feed = document.getElementById('placeFeed');
  if (feed) {
    // Messaggio principale (morte specifica)
    const gameOverMsg = document.createElement('div');
    gameOverMsg.className = 'feed-msg system';
    gameOverMsg.style.color = '#0066cc';
    
    // Parsare il messaggio per applicare bold solo a ***** GAME OVER *****
    const finalMessage = message || (window.i18n ? window.i18n.msg('ui.game.terminal') : 'Hai raggiunto un luogo terminale.');
    const gameOverPattern = /\*{3,5}\s*GAME OVER\s*\*{3,5}/gi;
    
    if (gameOverPattern.test(finalMessage)) {
      // Se contiene GAME OVER, usa innerHTML con bold
      const htmlMessage = finalMessage.replace(
        gameOverPattern,
        '<strong>$&</strong>'
      );
      gameOverMsg.innerHTML = htmlMessage.replace(/\n/g, '<br>');
    } else {
      // Altrimenti usa textContent normale
      gameOverMsg.style.fontWeight = 'bold';
      gameOverMsg.textContent = finalMessage;
    }
    
    feed.appendChild(gameOverMsg);
    
    // Domanda riavvio (sempre aggiunta)
    const restartMsg = document.createElement('div');
    restartMsg.className = 'feed-msg system';
    restartMsg.style.fontWeight = 'bold';
    restartMsg.style.color = '#0066cc';
    restartMsg.textContent = window.i18n ? window.i18n.msg('ui.game.restart') : 'Vuoi ripartire? (SI/SÌ per confermare)';
    feed.appendChild(restartMsg);
    
    feed.scrollTop = feed.scrollHeight;
  }
}

/**
 * Mostra messaggio di gioco terminato definitivamente (senza possibilità di riavvio)
 * Usato sia per vittoria che per risposta "NO" al game over
 */
function displayGameEndedMessage() {
  gameEnded = true;
  awaitingRestart = false;
  userInput.value = '';
  userInput.disabled = true;
  userInput.placeholder = '';
  
  const feed = document.getElementById('placeFeed');
  if (feed) {
    const msg = document.createElement('div');
    msg.className = 'feed-msg system';
    msg.style.fontWeight = 'bold';
    msg.style.color = '#d60000';
    msg.textContent = window.i18n ? window.i18n.msg('ui.game.ended') : 'Gioco terminato. Ricarica la pagina per giocare di nuovo.';
    feed.appendChild(msg);
    feed.scrollTop = feed.scrollHeight;
  }
}

// Funzione di gestione click direzione
function handleDirectionClick(dir) {
  if (awaitingRestart) return;
  let field = null;
  if (dir.length === 1) {
    // Se S, può essere Sud o Su
    if (dir.toUpperCase() === 'S') {
      if (current['Sud'] && current['Sud'] !== 0) {
        field = 'Sud';
      } else if (current['Su'] && current['Su'] !== 0) {
        field = 'Su';
      }
    } else {
      field = DIRECTIONS.find(d => d[0].toUpperCase() === dir[0].toUpperCase());
    }
  } else if (dir.toUpperCase() === 'SUD') {
    field = 'Sud';
  } else if (dir.toUpperCase() === 'SU') {
    field = 'Su';
  } else {
    field = DIRECTIONS.find(d => d.toUpperCase() === dir.toUpperCase());
  }
  if (!field || !DIRECTIONS.includes(field)) {
    // Messaggio di errore in placeFeed
    const feed = document.getElementById('placeFeed');
    if (feed) {
      const err = document.createElement('div');
      err.className = 'feed-msg error';
      err.textContent = window.i18n ? window.i18n.msg('ui.error.input') : 'Input non valido. Usa solo Nord, Est, Sud, Ovest, Su, Giu o iniziali N/E/S/O.';
      feed.appendChild(err);
      feed.scrollTop = feed.scrollHeight;
    }
    return;
  }
  const nextId = current[field];
  if (!nextId || nextId === 0) {
    const feed = document.getElementById('placeFeed');
    if (feed) {
      const err = document.createElement('div');
      err.className = 'feed-msg error';
      err.textContent = `Comando: ${dir} → muro (0)\nNon puoi andare in quella direzione.`;
      feed.appendChild(err);
      feed.scrollTop = feed.scrollHeight;
    }
    return;
  }
  const next = luoghi.find(l => l.ID === nextId);
  if (!next) {
    const feed = document.getElementById('placeFeed');
    if (feed) {
      const err = document.createElement('div');
      err.className = 'feed-msg error';
      err.textContent = window.i18n ? window.i18n.msg('ui.error.location', nextId) : `Luogo con ID=${nextId} non trovato!`;
      feed.appendChild(err);
      feed.scrollTop = feed.scrollHeight;
    }
    return;
  }
  current = next;
  
  // Variabili per coordinare timing tra direzioni e set-location
  let pendingGameOver = null;
  let direzioniComplete = false;
  
  // Aggiorna direzioni dinamiche del nuovo luogo prima di mostrarlo
  console.log(`Navigazione stella: aggiornamento direzioni per luogo ${current.ID}`);
  fetch(basePath + `api/engine/direzioni/${current.ID}`)
    .then(res => res.json())
    .then(direzioniResult => {
      console.log(`Direzioni ricevute per luogo ${current.ID}:`, direzioniResult);
      if (direzioniResult.ok && direzioniResult.direzioni) {
        // Aggiorna le direzioni del luogo corrente
        Object.assign(current, direzioniResult.direzioni);
        // Aggiorna anche nell'array luoghi per coerenza
        const luogoInArray = luoghi.find(l => l.ID === current.ID);
        if (luogoInArray) {
          Object.assign(luogoInArray, direzioniResult.direzioni);
        }
        console.log(`Direzioni aggiornate. current.Sud = ${current.Sud}`);
      }
      
      // Mostra messaggi turn system se presenti
      if (direzioniResult.turnMessages && direzioniResult.turnMessages.length > 0) {
        const feed = document.getElementById('placeFeed');
        if (feed) {
          direzioniResult.turnMessages.forEach(msgText => {
            const msg = document.createElement('div');
            msg.className = 'feed-msg system';
            msg.innerHTML = msgText;
            feed.appendChild(msg);
          });
          feed.scrollTop = feed.scrollHeight;
        }
      }
      
      showCurrent();
      
      // Segna che direzioni sono complete
      direzioniComplete = true;
      
      // Se c'è un gameOver pending, mostralo ORA dopo showCurrent()
      if (pendingGameOver) {
        console.log('[CLIENT] Mostrando game over DOPO showCurrent() - stella');
        displayGameOverMessage(pendingGameOver.message);
      }
    })
    .catch(err => {
      console.error('Errore aggiornamento direzioni navigazione:', err);
      showCurrent(); // Mostra comunque il luogo
      direzioniComplete = true;
    });
  
  // Notifica server del cambio location + trigger turn system
  fetch(basePath + 'api/engine/set-location', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ locationId: current.ID, consumeTurn: true })
  })
  .then(response => {
    if (!response.ok) {
      console.error('set-location failed:', response.status);
    }
    return response.json();
  })
  .then(result => {
    console.log('[CLIENT] Stella set-location result:', result);
    
    // Check NARRATIVE (Ferenc sequence)
    if (result.resultType === 'NARRATIVE') {
      console.log('[CLIENT] NARRATIVE rilevato da stella - phase:', result.narrativePhase);
      const feed = document.getElementById('placeFeed');
      if (feed) {
        const msg = document.createElement('div');
        msg.className = 'feed-msg system';
        msg.innerHTML = result.message || '';
        feed.appendChild(msg);
        feed.scrollTop = feed.scrollHeight;
      }
      // Se awaiting continue, blocca input e aspetta INVIO
      return;
    }
    
    // Check TELEPORT (Ferenc finale - spostamento a luogo 59)
    if (result.resultType === 'TELEPORT') {
      console.log('[CLIENT] TELEPORT rilevato da stella - destinazione:', result.locationId);
      const targetLuogo = luoghi.find(l => l.ID === result.locationId);
      if (targetLuogo) {
        current = targetLuogo;
        showCurrent();
      }
      // Mostra messaggio teleport se presente
      if (result.message) {
        const feed = document.getElementById('placeFeed');
        if (feed) {
          const msg = document.createElement('div');
          msg.className = 'feed-msg system';
          msg.innerHTML = result.message;
          feed.appendChild(msg);
          feed.scrollTop = feed.scrollHeight;
        }
      }
      return;
    }
    
    // Check game over - ma NON mostrarlo subito, aspetta che showCurrent() sia stato chiamato
    if (result.gameOver === true || !result.ok) {
      if (result.gameOver) {
        console.log('[CLIENT] GAME OVER rilevato in stella set-location - memorizzato per dopo showCurrent()');
        pendingGameOver = result;
        
        // Se direzioni sono già complete, mostra subito
        if (direzioniComplete) {
          console.log('[CLIENT] Direzioni già complete (stella), mostrando game over subito');
          displayGameOverMessage(result.message);
        }
      }
      return; // Non processare altri messaggi
    }
    
    // Mostra eventuali messaggi dal turn system
    if (result.ok && result.turnMessages && result.turnMessages.length > 0) {
      const feed = document.getElementById('placeFeed');
      if (feed) {
        result.turnMessages.forEach(msgText => {
          const msg = document.createElement('div');
          msg.className = 'feed-msg system';
          msg.innerHTML = msgText;
          feed.appendChild(msg);
        });
        feed.scrollTop = feed.scrollHeight;
      }
    }
  })
  .catch(err => console.error('Errore set-location:', err));
}


// odessa_main.js - Adventure game client-side (usa dati reali via API)
// Versione aggiornata: 2025-10-30  (fetch API)

const DIRECTIONS = ['Nord', 'Est', 'Sud', 'Ovest', 'Su', 'Giu'];

const output = document.getElementById('output');
const inputForm = document.getElementById('inputArea');
const userInput = document.getElementById('userInput');

// Determina base path per deployment in sottodirectory
// Supporta qualsiasi path custom (es. /missioneodessa/, /test/, /produzione/)
// Esclude segmenti "app" come /web/, /images/, /src/ per deployment root
function getBasePath() {
  const pathParts = window.location.pathname.split('/').filter(p => p);
  // Se primo segmento è cartella app interna, siamo in root deployment
  const appFolders = ['web', 'images', 'src', 'api'];
  if (pathParts.length === 0 || appFolders.includes(pathParts[0])) {
    return '/';
  }
  // Altrimenti primo segmento è il BASE_PATH custom
  return '/' + pathParts[0] + '/';
}
const basePath = getBasePath();

// Dati e stato per parsing livello 0
let odessaData = {};
let vocabCache = null;

// Carica strutture JSON per parsing livello 0
async function loadOdessaData() {
  try {
    const [termini, voci, tipi] = await Promise.all([
      fetch(basePath + 'src/data-internal/TerminiLessico.json').then(r => r.json()),
      fetch(basePath + 'src/data-internal/VociLessico.json').then(r => r.json()),
      fetch(basePath + 'src/data-internal/TipiLessico.json').then(r => r.json())
    ]);
    odessaData.TerminiLessico = termini;
    odessaData.VociLessico = voci;
    odessaData.TipiLessico = tipi;
    console.log('Dati lessico caricati per livello 0:', odessaData);
  } catch (e) {
    console.error('Errore caricamento dati livello 0:', e);
  }
}

// Logica parser livello 0 (portata da parser.html)
const CommandType = {
  ACTION: 'ACTION',
  NAVIGATION: 'NAVIGATION',
  SYSTEM: 'SYSTEM',
  NOUN: 'NOUN',
  STOPWORD: 'STOPWORD',
};

const ParseErrorType = {
  NONE: 'NONE',
  COMMAND_UNKNOWN: 'COMMAND_UNKNOWN',
  SYNTAX_ACTION_INCOMPLETE: 'SYNTAX_ACTION_INCOMPLETE',
  SYNTAX_NOUN_UNKNOWN: 'SYNTAX_NOUN_UNKNOWN',
  SYNTAX_INVALID_STRUCTURE: 'SYNTAX_INVALID_STRUCTURE',
};

async function ensureVocabulary() {
  if (vocabCache) return vocabCache;

  const rows = odessaData.VociLessico
    .filter(vl => vl.ID_Lingua === idLingua)
    .map(vl => {
      const tl = odessaData.TerminiLessico.find(tl => tl.ID_Termine === vl.ID_Termine);
      if (!tl) return null;
      const t = odessaData.TipiLessico.find(t => t.ID_TipoLessico === tl.ID_TipoLessico);
      if (!t) return null;
      return {
        Tipo: t.NomeTipo,
        TermineID: tl.ID_Termine,
        Concetto: tl.Concetto,
        Voce: vl.Voce
      };
    })
    .filter(row => row !== null);

  const tokenMap = new Map();
  const canonicalByTerm = new Map();

  function mapTipoToCommandType(tipo) {
    switch (tipo) {
      case 'VERBO_AZIONE': return CommandType.ACTION;
      case 'NAVIGAZIONE': return CommandType.NAVIGATION;
      case 'SISTEMA': return CommandType.SYSTEM;
      case 'NOUN': return CommandType.NOUN;
      case 'STOPWORD': return CommandType.STOPWORD;
      default: return null;
    }
  }

  const removeDiacritics = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  for (const r of rows) {
    const type = mapTipoToCommandType(r.Tipo);
    if (!type) continue;
    const token = r.Voce.toUpperCase();
    const prev = canonicalByTerm.get(r.TermineID);
    const canon = String(r.Concetto || token).toUpperCase();
    if (!prev || canon < prev) {
      canonicalByTerm.set(r.TermineID, canon);
    }
    const info = { type, canonical: null, termId: r.TermineID, concept: r.Concetto };
    tokenMap.set(token, info);
    const noAcc = removeDiacritics(token);
    if (noAcc !== token && !tokenMap.has(noAcc)) {
      tokenMap.set(noAcc, info);
    }
  }
  for (const [tok, info] of tokenMap) {
    const canon = canonicalByTerm.get(info.termId) || tok;
    tokenMap.set(tok, { ...info, canonical: canon });
  }

  vocabCache = { tokenMap };
  return vocabCache;
}

function normalizeInput(input) {
  const withoutPunct = input.replace(/[.,;:!"'“”‘’()[\]{}…]/g, ' ');
  const noAcc = withoutPunct.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return noAcc.trim().toUpperCase().replace(/\s+/g, ' ');
}

function isDigits(str) {
  return /^\d+$/.test(str);
}

const ACTION_NO_OBJECT = new Set(['DORMI', 'SCAPPA', 'SORRIDI']);

async function parseLevel0(input) {
  const vocab = await ensureVocabulary();
  const { tokenMap } = vocab;
  const OriginalInput = input;
  const NormalizedInput = normalizeInput(input);
  const rawTokens = NormalizedInput.length ? NormalizedInput.split(' ') : [];

  const looked = rawTokens.map((t) => tokenMap.get(t) || null);
  const filteredTokens = [];
  for (let i = 0; i < rawTokens.length; i++) {
    const info = looked[i];
    if (info && info.type === CommandType.STOPWORD) continue;
    filteredTokens.push({ token: rawTokens[i], info });
  }

  const base = {
    IsValid: false,
    OriginalInput,
    NormalizedInput,
    CommandType: null,
    CanonicalVerb: null,
    CanonicalNoun: null,
    NounIndex: null,
    VerbTermId: null,
    VerbConcept: null,
    NounTermId: null,
    NounConcept: null,
    Error: ParseErrorType.NONE,
    UnknownToken: null,
    UnknownNounToken: null,
  };

  if (filteredTokens.length === 0) {
    return { ...base, Error: ParseErrorType.COMMAND_UNKNOWN };
  }

  if (filteredTokens.length === 1) {
    const { token, info } = filteredTokens[0];
    if (!info) return { ...base, Error: ParseErrorType.COMMAND_UNKNOWN, UnknownToken: token };
    if (info.type === CommandType.NAVIGATION || info.type === CommandType.SYSTEM) {
      return {
        ...base,
        IsValid: true,
        CommandType: info.type,
        CanonicalVerb: info.canonical,
        VerbTermId: info.termId,
        VerbConcept: info.concept,
      };
    }
    if (info.type === CommandType.ACTION) {
      if (ACTION_NO_OBJECT.has(info.canonical)) {
        return {
          ...base,
          IsValid: true,
          CommandType: CommandType.ACTION,
          CanonicalVerb: info.canonical,
          VerbTermId: info.termId,
          VerbConcept: info.concept,
        };
      }
      return { ...base, Error: ParseErrorType.SYNTAX_ACTION_INCOMPLETE };
    }
    return { ...base, Error: ParseErrorType.SYNTAX_INVALID_STRUCTURE };
  }

  if (filteredTokens.length === 2 || filteredTokens.length === 3) {
    const [t1, t2, t3] = filteredTokens;
    const idx = t3 && isDigits(t3.token) ? parseInt(t3.token, 10) : null;
    const extra = filteredTokens.length === 3 && idx === null;
    if (extra) return { ...base, Error: ParseErrorType.SYNTAX_INVALID_STRUCTURE };

    if (!t1.info) return { ...base, Error: ParseErrorType.COMMAND_UNKNOWN, UnknownToken: t1.token };

    if (t1.info.type === CommandType.NAVIGATION || t1.info.type === CommandType.SYSTEM) {
      return { ...base, Error: ParseErrorType.SYNTAX_INVALID_STRUCTURE };
    }

    if (t1.info.type === CommandType.ACTION) {
      if (!t2.info) return { ...base, Error: ParseErrorType.SYNTAX_NOUN_UNKNOWN, UnknownNounToken: t2.token };
      if (t2.info.type !== CommandType.NOUN) return { ...base, Error: ParseErrorType.SYNTAX_INVALID_STRUCTURE };
      return {
        ...base,
        IsValid: true,
        CommandType: CommandType.ACTION,
        CanonicalVerb: t1.info.canonical,
        CanonicalNoun: t2.info.canonical,
        VerbTermId: t1.info.termId,
        VerbConcept: t1.info.concept,
        NounTermId: t2.info.termId,
        NounConcept: t2.info.concept,
        NounIndex: idx,
      };
    }

    return { ...base, Error: ParseErrorType.SYNTAX_INVALID_STRUCTURE };
  }

  return { ...base, Error: ParseErrorType.SYNTAX_INVALID_STRUCTURE };
}

let luoghi = [];
let current = null;
let awaitingRestart = false;
let awaitingConfirmEnd = false;
let gameEnded = false;
let currentScore = 0; // Punteggio corrente dal server

function updateDynamicPlaceImage() {
  const dynamicImage = document.getElementById('dynamicPlaceImage');
  const overlay = document.getElementById('placeNameOverlay');
  if (dynamicImage && current) {
    const imagePath = current.Immagine ? `../images/${current.Immagine}` : '../images/dummy.png';
    dynamicImage.src = imagePath;
    dynamicImage.alt = current.Nome || 'Immagine del luogo';
    dynamicImage.title = current.Nome || 'Immagine del luogo'; // Testo al mouse over
    dynamicImage.style.display = 'block';
    if (overlay) {
      overlay.textContent = current.Nome || '';
      overlay.style.display = 'block';
    }
  } else {
    if (dynamicImage) dynamicImage.style.display = 'none';
    if (overlay) overlay.style.display = 'none';
  }
}

function updateGameStats() {
  // Recupera entrambi i contatori dal server (source of truth)
  fetch(basePath + 'api/engine/stats')
    .then(res => res.json())
    .then(data => {
      if (data.ok) {
        // Aggiorna luoghi visitati
        const visitedEl = document.getElementById('visitedCount');
        if (visitedEl && typeof data.visitedPlaces === 'number') {
          visitedEl.textContent = `Luoghi visitati: ${data.visitedPlaces}`;
        }
        // Aggiorna interazioni
        const interactionsEl = document.getElementById('interactionsCount');
        if (interactionsEl && typeof data.interactions === 'number') {
          interactionsEl.textContent = `Interazioni: ${data.interactions}`;
        }
        // Aggiorna misteri
        const mysteriesEl = document.getElementById('mysteriesCount');
        if (mysteriesEl && typeof data.mysteries === 'number') {
          mysteriesEl.textContent = `Misteri risolti: ${data.mysteries}`;
        }
        // Aggiorna punteggio
        const scoreEl = document.getElementById('scoreCount');
        if (scoreEl && typeof data.score === 'number') {
          currentScore = data.score;
          scoreEl.textContent = `Punteggio: ${currentScore}/134`;
        }
        // Aggiorna rango
        const rankEl = document.getElementById('rankCount');
        if (rankEl && data.rank) {
          rankEl.textContent = `Livello: ${data.rank}`;
        }
      }
    })
    .catch(err => console.error('Errore recupero statistiche:', err));
}

function showCurrent() {
  // Visualizza descrizione luogo
  if (!current) {
    output.textContent = '';
    updateDirectionUI(null);
    const placeFeed = document.getElementById('placeFeed');
    if (placeFeed) {
      // Scritta "Gioco" con stile personalizzato
      const gameTitle = document.createElement('div');
      gameTitle.className = 'game-title-custom';
      gameTitle.textContent = window.i18n ? window.i18n.msg('ui.game') : 'Gioco';
      gameTitle.style.background = '#d60000'; // rosso vivo
      gameTitle.style.color = '#fff';
      gameTitle.style.fontWeight = 'bold';
      gameTitle.style.fontSize = '1.3em';
      gameTitle.style.padding = '8px 0';
      gameTitle.style.textAlign = 'center';
      gameTitle.style.width = '100%';
      gameTitle.style.borderRadius = '6px';
      gameTitle.style.marginBottom = '8px';
      placeFeed.innerHTML = '';
      placeFeed.appendChild(gameTitle);
    }
    return;
  }

  output.textContent = '';
  updateDirectionUI(current);
  updateDynamicPlaceImage();

  // Aggiorna statistiche (luoghi visitati + punteggio) dal server
  updateGameStats();

  const placeFeed = document.getElementById('placeFeed');
  if (placeFeed) {
    const entry = document.createElement('div');
    entry.className = 'place-entry';

    // Rimuovi la visualizzazione dell'immagine dalla colonna di destra
    entry.innerHTML = `
      <div class='temp-flex-row' style="display:flex;align-items:flex-start;gap:16px;">
        <div class='temp-desc-wrapper' style="flex:1 1 0;max-width:100%;">
          <div class='entry-name'>${current.Nome}</div>
          <div class='entry-desc'>${current.Descrizione}</div>
        </div>
      </div>
    `;

    const spacer = document.createElement('div');
    spacer.style.height = '16px';

    placeFeed.appendChild(entry);
    placeFeed.appendChild(spacer);
    placeFeed.scrollTop = placeFeed.scrollHeight;

    // Carica e mostra oggetti nel luogo
    fetch(basePath + `api/luogo-oggetti?idLuogo=${current.ID}&idLingua=${idLingua}`)
      .then(res => res.json())
      .then(oggetti => {
        if (oggetti.length > 0) {
          const oggettiDiv = document.createElement('div');
          oggettiDiv.className = 'entry-oggetti';
          oggettiDiv.innerHTML = '<div class="entry-oggetti-title">Oggetti presenti:</div>' + oggetti.map(o => `<div class="entry-oggetto">• ${o.descrizione}</div>`).join('');
          entry.appendChild(oggettiDiv);
          placeFeed.scrollTop = placeFeed.scrollHeight; // Scrolla dopo aver aggiunto gli oggetti
        }
      })
      .catch(err => console.error('Errore nel caricamento oggetti:', err));

    // RIMOSSO: Check Terminale === -1 lato client
    // Ora gestito uniformemente da gameOverEffect.js lato server
    // Il client reagisce solo a result.gameOver dalla risposta API
  }
}
inputForm.addEventListener('submit', async function(e) {
  e.preventDefault();
  
  // Blocca input se gioco terminato
  if (gameEnded) {
    userInput.value = '';
    return;
  }
  
  // Se in attesa di conferma fine gioco
  if (awaitingConfirmEnd) {
    const risposta = userInput.value.trim().toUpperCase();
    if (/^S(I|Ì)?$/.test(risposta)) {
      awaitingConfirmEnd = false;
      awaitingRestart = true;
      userInput.value = '';
      const feed = document.getElementById('placeFeed');
      if (feed) {
        const msg = document.createElement('div');
        msg.className = 'feed-msg system';
        msg.innerHTML = '<b>Vuoi ripartire? (SI/SÌ per confermare)</b>';
        feed.appendChild(msg);
        feed.scrollTop = feed.scrollHeight;
      }
      return;
    } else if (/^N(O)?$/.test(risposta)) {
      awaitingConfirmEnd = false;
      userInput.value = '';
      const feed = document.getElementById('placeFeed');
      if (feed) {
        const msg = document.createElement('div');
        msg.className = 'feed-msg system';
        msg.textContent = window.i18n ? window.i18n.msg('ui.game.continued') : 'Gioco continuato.';
        feed.appendChild(msg);
        feed.scrollTop = feed.scrollHeight;
      }
      return;
    } else {
      userInput.value = '';
      return;
    }
  }
  // Se in attesa di conferma riavvio
  if (awaitingRestart) {
    const risposta = userInput.value.trim().toUpperCase();
    // Accetta S, SI, SÌ, Sì, s, sì, etc.
    if (/^S(I|Ì)?$/.test(risposta)) {
      // Reset feed e riparti dal luogo iniziale
      const feed = document.getElementById('placeFeed');
      if (feed) {
        feed.innerHTML = '';
      }
      userInput.value = '';
      current = luoghi.find(l => l.ID === 1) || luoghi[0];
      awaitingRestart = false;
      // Reset del gameState sul server
      fetch(basePath + 'api/engine/reset', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idLingua })
      })
        .catch(err => console.error('Errore reset engine:', err));
      showCurrent();
      return;
    } else if (/^N(O)?$/.test(risposta)) {
      // Risposta NO: termina gioco definitivamente
      displayGameEndedMessage();
      return;
    }
    // Se risposta non valida, ignora qualsiasi input e rimane sulla descrizione terminale
    userInput.value = '';
    e.preventDefault();
    return;
  }
  // Gestione input direzione usando il parser API
  const val = userInput.value.trim();
  userInput.value = '';
  if (!val) return;

  // Parsing livello 0
  try {
    const level0Result = await parseLevel0(val);
    console.log('Parsing livello 0:', level0Result);

    // Se NAVIGATION valido, gestisci localmente senza API
    if (level0Result.IsValid && level0Result.CommandType === 'NAVIGATION') {
      console.log('Entrato in NAVIGATION livello0');
      
      // CHECK: blocca comandi se in attesa riavvio
      if (awaitingRestart) {
        const feed = document.getElementById('placeFeed');
        if (feed) {
          const msg = document.createElement('div');
          msg.className = 'feed-msg system';
          msg.textContent = window.i18n ? window.i18n.msg('ui.game.awaitingRestart') : 'Gioco in attesa di riavvio. Digita SI per riavviare o NO per terminare.';
          feed.appendChild(msg);
          feed.scrollTop = feed.scrollHeight;
        }
        return;
      }
      
      // Determina il field basato su VerbConcept
      let field = null;
      const concept = level0Result.VerbConcept;
      if (concept === 'NORD') field = 'Nord';
      else if (concept === 'EST') field = 'Est';
      else if (concept === 'SUD') field = 'Sud';
      else if (concept === 'OVEST') field = 'Ovest';
      else if (concept === 'ALTO') field = 'Su';
      else if (concept === 'BASSO') field = 'Giu';

      if (!field) {
        const feed = document.getElementById('placeFeed');
        if (feed) {
          const err = document.createElement('div');
          err.className = 'feed-msg error';
          err.textContent = window.i18n.msg('ui.error.direction');
          feed.appendChild(err);
          feed.scrollTop = feed.scrollHeight;
        }
        return;
      }

      const nextId = current[field];
      if (!nextId || nextId === 0) {
        const feed = document.getElementById('placeFeed');
        if (feed) {
          const err = document.createElement('div');
          err.className = 'feed-msg error';
          err.textContent = `Comando: ${val} → muro (0)\nNon puoi andare in quella direzione.`;
          feed.appendChild(err);
          feed.scrollTop = feed.scrollHeight;
        }
        return;
      }
      
      // === GESTIONE DESTINAZIONE TERMINALE (-1) ===
      if (nextId === -1) {
        console.log('[CLIENT] Livello0 NAVIGATION - destinazione terminale (-1), fetch al server');
        
        // Fai fetch al server con locationId ATTUALE per triggerare game over
        fetch(basePath + 'api/engine/set-location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locationId: current.ID, consumeTurn: true })
        })
        .then(response => {
          console.log('[CLIENT] Response terminale livello0, status:', response.status);
          if (!response.ok) {
            console.error('[CLIENT] set-location failed:', response.status);
          }
          return response.json();
        })
        .then(result => {
          console.log('[CLIENT] Livello0 terminale - risposta server:', result);
          
          // Il server DEVE restituire gameOver per destinazioni -1
          if (result && result.gameOver === true) {
            console.log('[CLIENT] GAME OVER rilevato da destinazione terminale (livello0)');
            displayGameOverMessage(result.message);
            console.log('[CLIENT] Game over message appended (livello0):', result.message);
          }
        })
        .catch(err => {
          console.error('[CLIENT] ERRORE fetch destinazione terminale (livello0):', err);
          const feed = document.getElementById('placeFeed');
          if (feed) {
            const errMsg = document.createElement('div');
            errMsg.className = 'feed-msg error';
            errMsg.textContent = window.i18n.msg('ui.error.communication') + err.message;
            feed.appendChild(errMsg);
            feed.scrollTop = feed.scrollHeight;
          }
        });
        return; // Esce dal handler - non prosegue con il flusso normale
      }
      
      // === FLUSSO NORMALE per destinazioni valide ===
      const next = luoghi.find(l => l.ID === nextId);
      if (!next) {
        const feed = document.getElementById('placeFeed');
        if (feed) {
          const err = document.createElement('div');
          err.className = 'feed-msg error';
          err.textContent = window.i18n ? window.i18n.msg('ui.error.location', nextId) : `Luogo con ID=${nextId} non trovato!`;
          feed.appendChild(err);
          feed.scrollTop = feed.scrollHeight;
        }
        return;
      }
      current = next;
      
      // Variabile per coordinare timing tra direzioni e set-location
      let pendingGameOver = null;
      let direzioniComplete = false;
      
      // Aggiorna direzioni dinamiche del nuovo luogo prima di mostrarlo
      console.log(`Livello0 NAVIGATION: aggiornamento direzioni per luogo ${current.ID}`);
      let skipShowCurrent = false; // Flag per evitare showCurrent() se arriva TELEPORT
      
      fetch(basePath + `api/engine/direzioni/${current.ID}`)
        .then(res => res.json())
        .then(direzioniResult => {
          console.log(`Direzioni ricevute per luogo ${current.ID}:`, direzioniResult);
          if (direzioniResult.ok && direzioniResult.direzioni) {
            // Aggiorna le direzioni del luogo corrente
            Object.assign(current, direzioniResult.direzioni);
            // Aggiorna anche nell'array luoghi per coerenza
            const luogoInArray = luoghi.find(l => l.ID === current.ID);
            if (luogoInArray) {
              Object.assign(luogoInArray, direzioniResult.direzioni);
            }
            console.log(`Direzioni aggiornate. current.Sud = ${current.Sud}, current.Nord = ${current.Nord}`);
          }
          
          // Non chiamare showCurrent se è arrivato un TELEPORT nel frattempo
          if (!skipShowCurrent) {
            showCurrent();
          }
          
          // Segna che direzioni sono complete
          direzioniComplete = true;
          
          // Se c'è un gameOver pending, mostralo ORA dopo showCurrent()
          if (pendingGameOver) {
            console.log('[CLIENT] Mostrando game over DOPO showCurrent()');
            displayGameOverMessage(pendingGameOver.message);
          }
          
          // Gestisci messaggi turn system DOPO showCurrent (altrimenti vengono cancellati)
          if (direzioniResult.messages && direzioniResult.messages.length > 0) {
            const feed = document.getElementById('placeFeed');
            if (feed) {
              direzioniResult.messages.forEach(msgText => {
                const msg = document.createElement('div');
                msg.className = 'feed-msg system';
                msg.textContent = msgText;
                feed.appendChild(msg);
              });
              feed.scrollTop = feed.scrollHeight;
            }
          }
        })
        .catch(err => {
          console.error('Errore aggiornamento direzioni navigazione livello0:', err);
          showCurrent(); // Mostra comunque il luogo
        });
      
      // Aggiorna luogo corrente nel server + trigger turn system
      fetch(basePath + 'api/engine/set-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId: current.ID, consumeTurn: true })
      })
      .then(response => {
        console.log('[CLIENT] Livello0 set-location response status:', response.status);
        if (!response.ok) {
          console.error('set-location failed:', response.status);
        }
        return response.json();
      })
      .then(result => {
        console.log('[CLIENT] Livello0 set-location result:', result);
        
        // CHECK NARRATIVE PHASE (Ferenc victory sequence)
        if (result && result.resultType === 'NARRATIVE') {
          console.log('[CLIENT] NARRATIVE phase rilevato (livello0):', result.narrativePhase);
          const feed = document.getElementById('placeFeed');
          if (feed) {
            const narrativeMsg = document.createElement('div');
            narrativeMsg.className = 'feed-msg system';
            narrativeMsg.style.color = '#2196F3';
            narrativeMsg.innerHTML = result.message;
            feed.appendChild(narrativeMsg);
            feed.scrollTop = feed.scrollHeight;
          }
          // NON mostrare showCurrent() - siamo in sequenza narrativa
          // Ma direzioni sono già state fetched, quindi ignora pendingGameOver
          pendingGameOver = null;
          return;
        }
        
        // CHECK TELEPORT (Ferenc finale)
        if (result && result.resultType === 'TELEPORT' && result.locationId) {
          console.log('[CLIENT] TELEPORT rilevato (livello0) - destinazione:', result.locationId);
          
          // Impedisci al fetch direzioni precedente di chiamare showCurrent()
          skipShowCurrent = true;
          
          // Aggiorna location client-side (già fatto sopra ma forziamo la destinazione corretta)
          const teleportLocation = luoghi.find(l => l.ID === result.locationId);
          if (teleportLocation) {
            current = teleportLocation;
            console.log('[CLIENT] Location forzata a:', result.locationId);
            
            // Re-fetch direzioni per il luogo di destinazione
            fetch(basePath + `api/engine/direzioni/${result.locationId}`)
              .then(res => res.json())
              .then(direzioniResult => {
                if (direzioniResult.ok && direzioniResult.direzioni) {
                  Object.assign(current, direzioniResult.direzioni);
                  const luogoInArray = luoghi.find(l => l.ID === result.locationId);
                  if (luogoInArray) {
                    Object.assign(luogoInArray, direzioniResult.direzioni);
                  }
                }
                // Mostra il luogo di destinazione
                showCurrent();
              })
              .catch(err => {
                console.error('Errore fetch direzioni dopo teleport:', err);
                showCurrent(); // Mostra comunque
              });
          }
          
          // Mostra messaggio narrativo del teleport
          const feed = document.getElementById('placeFeed');
          if (feed) {
            const teleportMsg = document.createElement('div');
            teleportMsg.className = 'feed-msg system';
            teleportMsg.style.color = '#2196F3';
            teleportMsg.innerHTML = result.message;
            feed.appendChild(teleportMsg);
            feed.scrollTop = feed.scrollHeight;
          }
          
          pendingGameOver = null;
          return;
        }
        
        // CHECK GAME OVER - ma NON mostrarlo subito, aspetta che showCurrent() sia stato chiamato
        if (result && result.gameOver === true) {
          console.log('[CLIENT] GAME OVER rilevato in livello0 set-location - memorizzato per dopo showCurrent()');
          pendingGameOver = result;
          
          // Se direzioni sono già complete, mostra subito
          if (direzioniComplete) {
            console.log('[CLIENT] Direzioni già complete, mostrando game over subito');
            displayGameOverMessage(result.message);
          }
          return; // Non processare turn messages se è game over
        }
        
        // Mostra eventuali messaggi dal turn system
        if (result.ok && result.turnMessages && result.turnMessages.length > 0) {
          const feed = document.getElementById('placeFeed');
          if (feed) {
            result.turnMessages.forEach(msgText => {
              const msg = document.createElement('div');
              msg.className = 'feed-msg system';
              msg.innerHTML = msgText;
              feed.appendChild(msg);
            });
            feed.scrollTop = feed.scrollHeight;
          }
        }
      })
      .catch(err => console.error('Errore set-location:', err));
      return; // Salta chiamata API
    }

    // Se SYSTEM valido, gestisci localmente dove possibile, altrimenti API
    if (level0Result.IsValid && level0Result.CommandType === 'SYSTEM') {
      console.log('Entrato in gestione SYSTEM locale');
      const canonical = level0Result.CanonicalVerb;
      console.log('SYSTEM command, canonical:', canonical);
      // Rimosso gestione locale AIUTO - ora gestito dal server
      console.log('Non gestito localmente, procedi con API');
      // Per comandi SYSTEM (INVENTARIO, SALVA, CARICA, AIUTO), procedi con chiamata API
    }
  } catch (e) {
    console.error('Errore parsing livello 0:', e);
  }

  // Chiama il parser API per SYSTEM, ACTION, o fallback
  fetch(basePath + 'api/parser/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: val })
  })
  .then(res => res.json())
  .then(parseResult => {
    if (!parseResult.IsValid) {
      // Messaggio di errore in placeFeed
      const feed = document.getElementById('placeFeed');
      if (feed) {
        const err = document.createElement('div');
        err.className = 'feed-msg error';
        const msgKey = parseResult.Error === 'COMMAND_UNKNOWN' ? 'ui.error.unknownCommand' : 'ui.error.input';
        err.textContent = window.i18n ? window.i18n.msg(msgKey) : (parseResult.Error === 'COMMAND_UNKNOWN' ? 'Comando sconosciuto.' : 'Input non valido.');
        feed.appendChild(err);
        feed.scrollTop = feed.scrollHeight;
      }
      return;
    }
    if (parseResult.CommandType === 'NAVIGATION') {
      // Determina il field basato su VerbConcept
      let field = null;
      const concept = parseResult.VerbConcept;
      if (concept === 'NORD') field = 'Nord';
      else if (concept === 'EST') field = 'Est';
      else if (concept === 'SUD') field = 'Sud';
      else if (concept === 'OVEST') field = 'Ovest';
      else if (concept === 'ALTO') field = 'Su';
      else if (concept === 'BASSO') field = 'Giu';

      if (!field) {
        const feed = document.getElementById('placeFeed');
        if (feed) {
          const err = document.createElement('div');
          err.className = 'feed-msg error';
          err.textContent = window.i18n ? window.i18n.msg('ui.error.direction') : 'Direzione non riconosciuta.';
          feed.appendChild(err);
          feed.scrollTop = feed.scrollHeight;
        }
        return;
      }

      const nextId = current[field];
      if (!nextId || nextId === 0) {
        const feed = document.getElementById('placeFeed');
        if (feed) {
          const err = document.createElement('div');
          err.className = 'feed-msg error';
          err.textContent = `Comando: ${val} → muro (0)\nNon puoi andare in quella direzione.`;
          feed.appendChild(err);
          feed.scrollTop = feed.scrollHeight;
        }
        return;
      }
      
      // Se nextId === -1 (luogo terminale), il server gestirà il game over
      // Non cercare il luogo localmente, vai diretto al fetch
      if (nextId === -1) {
        console.log('[CLIENT] NAVIGATION testuale - destinazione terminale (-1), fetch al server');
        
        // Fai fetch SENZA cambiare current localmente
        fetch(basePath + 'api/engine/set-location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locationId: current.ID, consumeTurn: true })
        })
        .then(response => {
          console.log('[CLIENT] Response ricevuto (terminale), status:', response.status, 'ok:', response.ok);
          if (!response.ok) {
            console.error('[CLIENT] set-location failed:', response.status);
          }
          return response.json();
        })
        .then(result => {
          console.log('[CLIENT] NAVIGATION testuale (terminale) - risposta server:', result);
          
          // Il server DEVE restituire gameOver per destinazioni -1
          if (result && result.gameOver === true) {
            console.log('[CLIENT] GAME OVER rilevato da destinazione terminale');
            awaitingRestart = true;
            const feed = document.getElementById('placeFeed');
            if (feed) {
              const gameOverMsg = document.createElement('div');
              gameOverMsg.className = 'feed-msg system';
              gameOverMsg.style.fontWeight = 'bold';
              gameOverMsg.style.color = '#d60000';
              gameOverMsg.textContent = result.message || 'Game Over';
              feed.appendChild(gameOverMsg);
              console.log('[CLIENT] Game over message appended:', result.message);
              
              const restartMsg = document.createElement('div');
              restartMsg.className = 'feed-msg system';
              restartMsg.innerHTML = '<b>Vuoi ripartire? (SI/SÌ per confermare)</b>';
              feed.appendChild(restartMsg);
              feed.scrollTop = feed.scrollHeight;
            }
          }
        })
        .catch(err => {
          console.error('[CLIENT] ERRORE fetch destinazione terminale:', err);
          const feed = document.getElementById('placeFeed');
          if (feed) {
            const errMsg = document.createElement('div');
            errMsg.className = 'feed-msg error';
            errMsg.textContent = window.i18n.msg('ui.error.communication') + err.message;
            feed.appendChild(errMsg);
            feed.scrollTop = feed.scrollHeight;
          }
        });
        return; // Esce dal handler
      }
      
      // Caso normale: nextId è un ID valido
      const next = luoghi.find(l => l.ID === nextId);
      if (!next) {
        const feed = document.getElementById('placeFeed');
        if (feed) {
          const err = document.createElement('div');
          err.className = 'feed-msg error';
          err.textContent = window.i18n ? window.i18n.msg('ui.error.location', nextId) : `Luogo con ID=${nextId} non trovato!`;
          feed.appendChild(err);
          feed.scrollTop = feed.scrollHeight;
        }
        return;
      }
      current = next;
      
      console.log('[CLIENT] NAVIGATION testuale - inizio fetch a luogo ID:', current.ID);
      
      // NON chiamare showCurrent() ancora - aspetta la risposta del server per sapere se è game over
      // Aggiorna luogo corrente nel server CON turn system
      fetch(basePath + 'api/engine/set-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId: current.ID, consumeTurn: true })
      })
      .then(response => {
        console.log('[CLIENT] Response ricevuto, status:', response.status, 'ok:', response.ok);
        if (!response.ok) {
          console.error('[CLIENT] set-location failed:', response.status);
        }
        return response.json();
      })
      .then(result => {
        console.log('[CLIENT] NAVIGATION testuale - risposta server:', result);
        
        // Check game over da NAVIGATION testuale (darkness, terminale, ecc.)
        if (result && (result.gameOver === true || !result.ok)) {
          if (result.gameOver) {
            console.log('[CLIENT] GAME OVER rilevato - awaitingRestart=true');
            displayGameOverMessage(result.message);
            console.log('[CLIENT] Game over message appended:', result.message);
            // NON chiamare showCurrent() - è game over
            return; // Esce senza mostrare il luogo
          }
        }
        
        // Check narrative phase (Ferenc victory sequence)
        if (result && result.resultType === 'NARRATIVE') {
          console.log('[CLIENT] NARRATIVE phase rilevato:', result.narrativePhase);
          const feed = document.getElementById('placeFeed');
          if (feed) {
            const narrativeMsg = document.createElement('div');
            narrativeMsg.className = 'feed-msg system';
            narrativeMsg.style.color = '#2196F3';
            narrativeMsg.innerHTML = result.message;
            feed.appendChild(narrativeMsg);
            feed.scrollTop = feed.scrollHeight;
          }
          // NON chiamare showCurrent() - siamo in sequenza narrativa
          return;
        }
        
        // Check teleport (Ferenc finale)
        if (result && result.resultType === 'TELEPORT' && result.locationId) {
          console.log('[CLIENT] TELEPORT rilevato - destinazione:', result.locationId);
          
          // Aggiorna location client-side
          const teleportLocation = luoghi.find(l => l.ID === result.locationId);
          if (teleportLocation) {
            current = teleportLocation;
            console.log('[CLIENT] Location aggiornata a:', result.locationId);
          }
          
          // Mostra messaggio narrativo
          const feed = document.getElementById('placeFeed');
          if (feed) {
            const teleportMsg = document.createElement('div');
            teleportMsg.className = 'feed-msg system';
            teleportMsg.style.color = '#2196F3';
            teleportMsg.innerHTML = result.message;
            feed.appendChild(teleportMsg);
            feed.scrollTop = feed.scrollHeight;
          }
          
          // Mostra il nuovo luogo (barriera)
          showCurrent();
          return;
        }
        
        // Se NON è game over NÉ narrative, mostra il nuovo luogo
        showCurrent();
        
        // Mostra eventuali turn messages (torcia, ecc.)
        if (result && result.turnMessages && result.turnMessages.length > 0) {
          const feed = document.getElementById('placeFeed');
          if (feed) {
            result.turnMessages.forEach(msg => {
              const msgDiv = document.createElement('div');
              msgDiv.className = 'feed-msg system';
              msgDiv.innerHTML = msg;
              feed.appendChild(msgDiv);
            });
            feed.scrollTop = feed.scrollHeight;
          }
        }
      })
      .catch(err => {
        console.error('[CLIENT] ERRORE fetch set-location:', err);
        const feed = document.getElementById('placeFeed');
        if (feed) {
          const errMsg = document.createElement('div');
          errMsg.className = 'feed-msg error';
          errMsg.textContent = window.i18n.msg('ui.error.communication') + err.message;
          feed.appendChild(errMsg);
          feed.scrollTop = feed.scrollHeight;
        }
      });
    } else if (parseResult.CommandType === 'SYSTEM') {
      // Esegui comando SYSTEM via API engine
      fetch(basePath + 'api/engine/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: val })
      })
      .then(res => res.json())
      .then(executeResult => {
        if (executeResult.ok && executeResult.engine) {
          const engine = executeResult.engine;
          
          // Gestione GAME OVER unificata (darkness, terminale, intercettazione, ecc.)
          if (engine.gameOver === true || engine.resultType === 'GAME_OVER') {
            displayGameOverMessage(engine.message);
            return; // Non eseguire altre logiche
          }
          
          if (engine.resultType === 'CONFIRM_END') {
            awaitingConfirmEnd = true;
          }
          if (engine.resultType === 'SAVE_GAME') {
            // Invia luoghi aggiornati al server per salvare
            fetch(basePath + 'api/engine/save-client-state', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ luoghi: luoghi })
            })
            .then(res => {
              if (!res.ok) {
                throw new Error('Errore nel salvataggio: ' + res.status);
              }
              return res.json();
            })
            .then(saveData => {
              const stateJson = JSON.stringify(saveData, null, 2);
              const blob = new Blob([stateJson], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const now = new Date();
              const timestamp = now.getFullYear() + ('0' + (now.getMonth() + 1)).slice(-2) + ('0' + now.getDate()).slice(-2) + '_' + ('0' + now.getHours()).slice(-2) + ('0' + now.getMinutes()).slice(-2) + ('0' + now.getSeconds()).slice(-2);
              const filename = `MissioneOdessa_Save_${timestamp}.json`;
              const a = document.createElement('a');
              a.href = url;
              a.download = filename;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              // Mostra messaggio di successo
              const feed = document.getElementById('placeFeed');
              if (feed) {
                const msg = document.createElement('div');
                msg.className = 'feed-msg system';
                msg.textContent = `Gioco salvato come ${filename}.`;
                feed.appendChild(msg);
                feed.scrollTop = feed.scrollHeight;
              }
            })
            .catch(err => {
              console.error('Errore nel salvataggio:', err);
              const feed = document.getElementById('placeFeed');
              if (feed) {
                const errMsg = document.createElement('div');
                errMsg.className = 'feed-msg error';
                errMsg.textContent = window.i18n ? window.i18n.msg('ui.error.command') : 'Errore nel salvataggio del gioco.';
                feed.appendChild(errMsg);
                feed.scrollTop = feed.scrollHeight;
              }
            });
          }
          if (engine.resultType === 'LOAD_GAME') {
            // Apri file picker per selezionare file di salvataggio
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = (e) => {
              const file = e.target.files[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (e) => {
                try {
                  const saveData = JSON.parse(e.target.result);
                  // Invia dati al server per ripristinare stato
                  fetch(basePath + 'api/engine/load-client-state', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(saveData)
                  })
                  .then(res => res.json())
                  .then(result => {
                    if (result.ok) {
                      // Ricarica luoghi aggiornati dal server
                      fetch(basePath + 'api/luoghi')
                        .then(res => res.json())
                        .then(data => {
                          luoghi = Array.isArray(data) ? data : [];
                          // Ottieni gameState aggiornato
                          fetch(basePath + 'api/engine/state')
                            .then(res => res.json())
                            .then(stateResult => {
                              if (stateResult.ok) {
                                current = luoghi.find(l => l.ID === stateResult.state.currentLocationId) || luoghi[0];
                                showCurrent();
                                const feed = document.getElementById('placeFeed');
                                if (feed) {
                                  const msg = document.createElement('div');
                                  msg.className = 'feed-msg system';
                                  msg.textContent = window.i18n ? window.i18n.msg('ui.game.loaded') : 'Gioco caricato con successo.';
                                  feed.appendChild(msg);
                                  feed.scrollTop = feed.scrollHeight;
                                }
                              }
                            });
                        });
                    } else {
                      throw new Error(result.error);
                    }
                  })
                  .catch(err => {
                    console.error('Errore nel caricamento:', err);
                    const feed = document.getElementById('placeFeed');
                    if (feed) {
                      const errMsg = document.createElement('div');
                      errMsg.className = 'feed-msg error';
                      errMsg.textContent = window.i18n ? window.i18n.msg('ui.error.command') : 'Errore nel caricamento del gioco.';
                      feed.appendChild(errMsg);
                      feed.scrollTop = feed.scrollHeight;
                    }
                  });
                } catch {
                  const feed = document.getElementById('placeFeed');
                  if (feed) {
                    const errMsg = document.createElement('div');
                    errMsg.className = 'feed-msg error';
                    errMsg.textContent = window.i18n ? window.i18n.msg('ui.error.invalidFile') : 'File di salvataggio non valido.';
                    feed.appendChild(errMsg);
                    feed.scrollTop = feed.scrollHeight;
                  }
                }
              };
              reader.readAsText(file);
            };
            input.click();
          }
          if (engine.message) {
            // Mostra il messaggio nel feed
            const feed = document.getElementById('placeFeed');
            if (feed) {
              const msg = document.createElement('div');
              msg.className = 'feed-msg system';
              msg.innerHTML = engine.message;
              feed.appendChild(msg);
              feed.scrollTop = feed.scrollHeight;
            }
          }
          // Se il comando SYSTEM richiede di mostrare nuovamente il luogo
          if (engine.showLocation) {
            showCurrent();
          }
        } else {
          // Messaggio di errore
          const feed = document.getElementById('placeFeed');
          if (feed) {
            const err = document.createElement('div');
            err.className = 'feed-msg error';
            err.textContent = window.i18n ? window.i18n.msg('ui.error.execution') : 'Errore nell\'esecuzione del comando.';
            feed.appendChild(err);
            feed.scrollTop = feed.scrollHeight;
          }
        }
      })
      .catch(err => {
        console.error('Errore interno nell\'esecuzione (SYSTEM):', err);
        const feed = document.getElementById('placeFeed');
        if (feed) {
          const errMsg = document.createElement('div');
          errMsg.className = 'feed-msg error';
          errMsg.textContent = window.i18n ? window.i18n.msg('ui.error.internal') : 'Errore interno nell\'esecuzione.';
          feed.appendChild(errMsg);
          feed.scrollTop = feed.scrollHeight;
        }
      });
    } else if (parseResult.CommandType === 'ACTION') {
      // Esegui comando ACTION via API engine
      fetch(basePath + 'api/engine/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: val })
      })
      .then(res => res.json())
      .then(executeResult => {
        if (executeResult.ok && executeResult.engine) {
          const engine = executeResult.engine;
          
          // Gestione GAME OVER unificata (darkness, terminale, intercettazione, ecc.)
          if (engine.gameOver === true || engine.resultType === 'GAME_OVER') {
            displayGameOverMessage(engine.message);
            return; // Non eseguire altre logiche
          }
          
          // Gestione VITTORIA (ended=true con messaggio)
          if (engine.ended === true && engine.message) {
            // Aggiorna statistiche PRIMA di terminare (per mostrare punteggio finale)
            updateGameStats();
            
            const feed = document.getElementById('placeFeed');
            if (feed) {
              // Mostra messaggio vittoria
              const victoryMsg = document.createElement('div');
              victoryMsg.className = 'feed-msg system';
              victoryMsg.innerHTML = engine.message;
              feed.appendChild(victoryMsg);
              feed.scrollTop = feed.scrollHeight;
            }
            
            // Termina gioco definitivamente
            displayGameEndedMessage();
            return; // Non eseguire altre logiche
          }
          
          if (engine.message) {
            // Mostra il messaggio nel feed
            const feed = document.getElementById('placeFeed');
            if (feed) {
              const msg = document.createElement('div');
              msg.className = 'feed-msg system';
              msg.innerHTML = engine.message;
              feed.appendChild(msg);
              feed.scrollTop = feed.scrollHeight;
            }
          }
          // Aggiorna le direzioni dinamiche dopo un'azione riuscita
          if (current && current.ID) {
            fetch(basePath + `api/engine/direzioni/${current.ID}`)
              .then(res => res.json())
              .then(direzioniResult => {
                if (direzioniResult.ok && direzioniResult.direzioni) {
                  // Aggiorna le direzioni del luogo corrente
                  Object.assign(current, direzioniResult.direzioni);
                  // Aggiorna anche nell'array luoghi per coerenza
                  const luogoInArray = luoghi.find(l => l.ID === current.ID);
                  if (luogoInArray) {
                    Object.assign(luogoInArray, direzioniResult.direzioni);
                  }
                  // Aggiorna la stella delle direzioni
                  updateDirectionUI(current);
                }
              })
              .catch(err => console.error('Errore aggiornamento direzioni:', err));
          }
          // Aggiorna statistiche dopo comando
          updateGameStats();
        } else {
          // Messaggio di errore
          const feed = document.getElementById('placeFeed');
          if (feed) {
            const err = document.createElement('div');
            err.className = 'feed-msg error';
            err.textContent = window.i18n ? window.i18n.msg('ui.error.action') : 'Errore nell\'esecuzione del comando ACTION.';
            feed.appendChild(err);
            feed.scrollTop = feed.scrollHeight;
          }
        }
      })
      .catch(err => {
        console.error('Errore interno nell\'esecuzione (ACTION):', err);
        const feed = document.getElementById('placeFeed');
        if (feed) {
          const errMsg = document.createElement('div');
          errMsg.className = 'feed-msg error';
          errMsg.textContent = window.i18n ? window.i18n.msg('ui.error.actionInternal') : 'Errore interno nell\'esecuzione ACTION.';
          feed.appendChild(errMsg);
          feed.scrollTop = feed.scrollHeight;
        }
      });
    } else {
      // Messaggio per tipi non supportati
      const feed = document.getElementById('placeFeed');
      if (feed) {
        const err = document.createElement('div');
        err.className = 'feed-msg error';
        err.textContent = window.i18n ? window.i18n.msg('ui.error.unsupported') : 'Tipo di comando non supportato.';
        feed.appendChild(err);
        feed.scrollTop = feed.scrollHeight;
      }
    }
  })
  .catch(err => {
    console.error('Errore nel parser:', err);
    const feed = document.getElementById('placeFeed');
    if (feed) {
      const errMsg = document.createElement('div');
      errMsg.className = 'feed-msg error';
      errMsg.textContent = window.i18n ? window.i18n.msg('ui.error.parser') : 'Errore interno del parser.';
      feed.appendChild(errMsg);
      feed.scrollTop = feed.scrollHeight;
    }
  });
});
fetch(basePath + 'api/luoghi')
  .then(res => res.json())
  .then(async data => {
    luoghi = Array.isArray(data) ? data : [];
    if (!luoghi.length) {
      console.error('Nessun luogo trovato!');
      return;
    }

    // Carica dati per parsing livello 0 prima di procedere
    await loadOdessaData();

    // Reset del gameState sul server all'avvio
    fetch(basePath + 'api/engine/reset', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idLingua })
    })
      .catch(err => console.error('Errore reset engine iniziale:', err));

    current = luoghi.find(l => l.ID === 1) || luoghi[0];
    showCurrent();
  })
  .catch(err => {
    console.error('Errore nel caricamento dei luoghi:', err);
  });

// Non chiamare loadOdessaData qui, è dentro il then
