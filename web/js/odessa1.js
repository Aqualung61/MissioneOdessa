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
      err.textContent = 'Input non valido. Usa solo Nord, Est, Sud, Ovest, Su, Giu o iniziali N/E/S/O.';
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
      err.textContent = `Luogo con ID=${nextId} non trovato!`;
      feed.appendChild(err);
      feed.scrollTop = feed.scrollHeight;
    }
    return;
  }
  current = next;
  showCurrent();
  // Aggiorna luogo corrente nel server
  fetch(basePath + 'api/engine/set-location', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ locationId: current.ID })
  })
  .then(response => {
    if (!response.ok) {
      console.error('set-location failed:', response.status);
    }
  })
  .catch(err => console.error('Errore set-location:', err));
}


// odessa1.js - Adventure game client-side (usa dati reali via API)
// Versione aggiornata: 2025-10-30  (fetch API)

const DIRECTIONS = ['Nord', 'Est', 'Sud', 'Ovest', 'Su', 'Giu'];

const output = document.getElementById('output');
const inputForm = document.getElementById('inputArea');
const userInput = document.getElementById('userInput');

// Determina base path per deployment in sottodirectory
const basePath = window.location.pathname.split('/').filter(p => p).length > 0 && window.location.pathname.split('/').filter(p => p)[0] === 'missioneodessa' ? '/' + window.location.pathname.split('/').filter(p => p)[0] + '/' : '/';

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

function resetVocabularyCache() {
  vocabCache = null;
}

async function ensureVocabulary() {
  if (vocabCache) return vocabCache;

  const rows = odessaData.VociLessico
    .filter(vl => vl.ID_Lingua === 1)
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
let visitedPlaces = new Set();

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
      gameTitle.textContent = 'Gioco';
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

  // Aggiorna luoghi visitati
  visitedPlaces.add(current.ID);
  const visitedEl = document.getElementById('visitedCount');
  if (visitedEl) visitedEl.textContent = `Luoghi visitati: ${visitedPlaces.size}`;

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
    fetch(basePath + `api/luogo-oggetti?idLuogo=${current.ID}&idLingua=1`)
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

    if (current.Terminale === -1) {
      const endMsg = document.createElement('div');
      endMsg.className = 'feed-msg system';
      endMsg.innerHTML = '<b>Hai raggiunto un luogo terminale. Vuoi ripartire? (SI/SÌ per confermare)</b>';
      placeFeed.appendChild(endMsg);
      placeFeed.scrollTop = placeFeed.scrollHeight;
      awaitingRestart = true;
    } else if (current.Terminale > 0) {
      // Chiamata azioni_modi per aggiornare direzioni in luoghi speciali
      fetch(basePath + 'api/azioni-modi?idLingua=1&log=0&IDLuogo=' + current.Terminale)
        .then(res => res.json())
        .then(modiData => {
          if (modiData.updatedDirections) {
            for (const [id, directions] of Object.entries(modiData.updatedDirections)) {
              const luogo = luoghi.find(l => l.ID == id);
              if (luogo) {
                Object.assign(luogo, directions);
              }
            }
          }
        })
        .catch(err => {
          console.error('Errore in azioni_modi:', err);
        });
    }
  }
}
inputForm.addEventListener('submit', async function(e) {
  e.preventDefault();
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
        msg.textContent = 'Gioco continuato.';
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
      visitedPlaces = new Set(); // Reset luoghi visitati
      // Chiamata azioni_setup per aggiornare direzioni al restart
      fetch(basePath + 'api/azioni?idLingua=1&log=0')
        .then(res => res.json())
        .then(azioniData => {
          if (azioniData.updatedDirections) {
            for (const [id, directions] of Object.entries(azioniData.updatedDirections)) {
              const luogo = luoghi.find(l => l.ID == id);
              if (luogo) {
                Object.assign(luogo, directions);
              }
            }
          }
          showCurrent();
        })
        .catch(err => {
          console.error('Errore in azioni_setup al restart:', err);
          showCurrent(); // Procedi comunque
        });
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
          err.textContent = 'Direzione non riconosciuta.';
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
      const next = luoghi.find(l => l.ID === nextId);
      if (!next) {
        const feed = document.getElementById('placeFeed');
        if (feed) {
          const err = document.createElement('div');
          err.className = 'feed-msg error';
          err.textContent = `Luogo con ID=${nextId} non trovato!`;
          feed.appendChild(err);
          feed.scrollTop = feed.scrollHeight;
        }
        return;
      }
      current = next;
      showCurrent();
      // Aggiorna luogo corrente nel server
      fetch(basePath + 'api/engine/set-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId: current.ID })
      })
      .then(response => {
        if (!response.ok) {
          console.error('set-location failed:', response.status);
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
      if (canonical === 'INVENTARIO' || canonical === 'AIUTO') {
        console.log('Gestione locale per', canonical);
        const feed = document.getElementById('placeFeed');
        if (feed) {
          let msg = '';
          if (canonical === 'INVENTARIO') {
            msg = 'Inventario: (per ora vuoto - implementazione futura)';
          } else if (canonical === 'AIUTO') {
            msg = '<b>Comandi disponibili:</b> <br><b>Direzioni:</b> <i>Nord, Est, Sud, Ovest, Su, Giu (e sinonimi)</i><br><b>Gioco:</b> <i>Aiuto, Inventario, Fine, Salva, Carica</i><br><b>Azioni:</b> <i>Prendi, Leggi, Esamina, Infila, Lascia, altro.</i>';
          }
          const sysMsg = document.createElement('div');
          sysMsg.className = 'feed-msg system';
          sysMsg.innerHTML = msg;
          feed.appendChild(sysMsg);
          feed.scrollTop = feed.scrollHeight;
        }
        console.log('Return dopo gestione locale');
        return; // Salta chiamata API per questi SYSTEM locali
      }
      console.log('Non gestito localmente, procedi con API');
      // Per altri SYSTEM (es. SALVA, CARICA), procedi con chiamata API
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
        err.textContent = parseResult.Error === 'COMMAND_UNKNOWN' ? 'Comando sconosciuto.' : 'Input non valido.';
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
          err.textContent = 'Direzione non riconosciuta.';
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
      const next = luoghi.find(l => l.ID === nextId);
      if (!next) {
        const feed = document.getElementById('placeFeed');
        if (feed) {
          const err = document.createElement('div');
          err.className = 'feed-msg error';
          err.textContent = `Luogo con ID=${nextId} non trovato!`;
          feed.appendChild(err);
          feed.scrollTop = feed.scrollHeight;
        }
        return;
      }
      current = next;
      showCurrent();
      // Aggiorna luogo corrente nel server
      fetch(basePath + 'api/engine/set-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId: current.ID })
      })
      .then(response => {
        if (!response.ok) {
          console.error('set-location failed:', response.status);
        }
      })
      .catch(err => console.error('Errore set-location:', err));
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
                errMsg.textContent = 'Errore nel salvataggio del gioco.';
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
                                visitedPlaces = new Set(stateResult.state.visitedPlaces || []);
                                showCurrent();
                                const feed = document.getElementById('placeFeed');
                                if (feed) {
                                  const msg = document.createElement('div');
                                  msg.className = 'feed-msg system';
                                  msg.textContent = 'Gioco caricato con successo.';
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
                      errMsg.textContent = 'Errore nel caricamento del gioco.';
                      feed.appendChild(errMsg);
                      feed.scrollTop = feed.scrollHeight;
                    }
                  });
                } catch (err) {
                  const feed = document.getElementById('placeFeed');
                  if (feed) {
                    const errMsg = document.createElement('div');
                    errMsg.className = 'feed-msg error';
                    errMsg.textContent = 'File di salvataggio non valido.';
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
              msg.textContent = engine.message;
              feed.appendChild(msg);
              feed.scrollTop = feed.scrollHeight;
            }
          }
        } else {
          // Messaggio di errore
          const feed = document.getElementById('placeFeed');
          if (feed) {
            const err = document.createElement('div');
            err.className = 'feed-msg error';
            err.textContent = 'Errore nell\'esecuzione del comando.';
            feed.appendChild(err);
            feed.scrollTop = feed.scrollHeight;
          }
        }
      })
      .catch(err => {
        const feed = document.getElementById('placeFeed');
        if (feed) {
          const errMsg = document.createElement('div');
          errMsg.className = 'feed-msg error';
          errMsg.textContent = 'Errore interno nell\'esecuzione.';
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
          if (engine.message) {
            // Mostra il messaggio nel feed
            const feed = document.getElementById('placeFeed');
            if (feed) {
              const msg = document.createElement('div');
              msg.className = 'feed-msg system';
              msg.textContent = engine.message;
              feed.appendChild(msg);
              feed.scrollTop = feed.scrollHeight;
            }
          }
          // Per ACTION, potremmo aggiornare stato locale se necessario (es. inventario)
          // Per ora, semplice messaggio
        } else {
          // Messaggio di errore
          const feed = document.getElementById('placeFeed');
          if (feed) {
            const err = document.createElement('div');
            err.className = 'feed-msg error';
            err.textContent = 'Errore nell\'esecuzione del comando ACTION.';
            feed.appendChild(err);
            feed.scrollTop = feed.scrollHeight;
          }
        }
      })
      .catch(err => {
        const feed = document.getElementById('placeFeed');
        if (feed) {
          const errMsg = document.createElement('div');
          errMsg.className = 'feed-msg error';
          err.textContent = 'Errore interno nell\'esecuzione ACTION.';
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
        err.textContent = 'Tipo di comando non supportato.';
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
      errMsg.textContent = 'Errore interno del parser.';
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

    current = luoghi.find(l => l.ID === 1) || luoghi[0];
    // Chiamata azioni_setup per aggiornare direzioni
    fetch(basePath + 'api/azioni?idLingua=1&log=0')
      .then(res => res.json())
      .then(azioniData => {
        if (azioniData.updatedDirections) {
          for (const [id, directions] of Object.entries(azioniData.updatedDirections)) {
            const luogo = luoghi.find(l => l.ID == id);
            if (luogo) {
              Object.assign(luogo, directions);
            }
          }
        }
        showCurrent();
      })
      .catch(err => {
        console.error('Errore in azioni_setup:', err);
        showCurrent(); // Procedi comunque
      });
  })
  .catch(err => {
    console.error('Errore nel caricamento dei luoghi:', err);
  });

// Non chiamare loadOdessaData qui, è dentro il then
