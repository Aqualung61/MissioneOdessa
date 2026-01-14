// Lingua persistita in localStorage (bootstrap.js scrive subito il default=1)
const idLingua = parseInt(localStorage.getItem('linguaSelezionata')) || 1;
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
  // Idempotente: non aggiungere più volte il banner nel feed.
  if (endedMessageShown) {
    applyEndedUiState();
    return;
  }

  applyEndedUiState();
  
  const feed = document.getElementById('placeFeed');
  if (feed) {
    const msg = document.createElement('div');
    msg.className = 'feed-msg system';
    msg.classList.add('game-ended');
    msg.style.fontWeight = 'bold';
    msg.style.color = '#d60000';
    msg.textContent = window.i18n ? window.i18n.msg('ui.game.ended') : 'Gioco terminato. Ricarica la pagina per giocare di nuovo.';
    feed.appendChild(msg);
    feed.scrollTop = feed.scrollHeight;
  }

  endedMessageShown = true;
}

// Funzione di gestione click direzione
async function handleDirectionClick(dir) {
  if (awaitingRestart || gameEnded || (inFlight && !debugRaceMode)) return;
  await executeCommandOnServer(dir);
}


// odessa_main.js - Adventure game client-side (usa dati reali via API)
// Versione aggiornata: 2025-10-30  (fetch API)

const output = document.getElementById('output');
const inputForm = document.getElementById('inputArea');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');

// Determina base path per deployment in sottodirectory
// Supporta qualsiasi path custom (es. /missioneodessa/, /test/, /produzione/)
// Esclude segmenti "app" come /web/, /images/, /src/ per deployment root
function getBasePath() {
  // Preferisci il bootstrap comune (web/js/bootstrap.js), se presente.
  if (typeof window.basePath === 'string' && window.basePath) {
    let bp = window.basePath;
    if (!bp.startsWith('/')) bp = '/' + bp;
    if (!bp.endsWith('/')) bp = bp + '/';
    return bp;
  }

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

// Sprint #57.4: debug mode per riprodurre race/out-of-order in modo deterministico.
// Nota: la pagina carica questo file come ES module (type="module"), quindi le funzioni
// top-level non sono disponibili in Console a meno di esporle su window.
const debugRaceParams = new URLSearchParams(window.location.search);
const debugRaceMode = debugRaceParams.get('debugRace') === '1';

const debugRaceDelayMs = (() => {
  const raw = debugRaceParams.get('debugRaceDelayMs');
  if (!raw) return 800;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 800;
})();

if (debugRaceMode) {
  document.documentElement.dataset.debugRace = '1';
  document.title = `[debugRace] ${document.title}`;
  console.warn('[debugRace] enabled (testing mode)');
  console.log('[debugRace] enabled', { delayMs: debugRaceDelayMs });
}

function debugRaceArtificialDelayMsForRequest(requestId) {
  if (!debugRaceMode) return 0;
  // Ritarda le request dispari per forzare risposte fuori ordine in modo prevedibile.
  // Nota: il delay viene applicato PRIMA del controllo di staleness (requestId), così anche
  // una risposta "veloce" può essere resa obsoleta dall'invio immediato di una richiesta più recente.
  return requestId % 2 === 1 ? debugRaceDelayMs : 0;
}

let luoghi = [];
let current = null;
let awaitingRestart = false;
let awaitingConfirmEnd = false;
let gameEnded = false;
let endedMessageShown = false;
let currentScore = 0; // Punteggio corrente dal server
let inFlight = false;
let executeRequestId = 0;

function updateSendButtonDisabledState(isBusy) {
  if (sendBtn) sendBtn.disabled = !!isBusy || gameEnded;
}

function applyEndedUiState() {
  gameEnded = true;
  awaitingRestart = false;
  awaitingConfirmEnd = false;
  inFlight = false;
  updateSendButtonDisabledState(false);
  userInput.value = '';
  userInput.disabled = true;
  userInput.placeholder = '';
}

function appendFeedMessage({ kind, text, html }) {
  const feed = document.getElementById('placeFeed');
  if (!feed) return;
  const msg = document.createElement('div');
  msg.className = kind === 'error' ? 'feed-msg error' : 'feed-msg system';
  if (typeof html === 'string') msg.innerHTML = html;
  else msg.textContent = String(text || '');
  feed.appendChild(msg);
  feed.scrollTop = feed.scrollHeight;
}

function applyStats(stats) {
  if (!stats || typeof stats !== 'object') return;

  const visitedEl = document.getElementById('visitedCount');
  if (visitedEl && typeof stats.visitedPlaces === 'number') {
    visitedEl.textContent = `Luoghi visitati: ${stats.visitedPlaces}`;
  }

  const interactionsEl = document.getElementById('interactionsCount');
  if (interactionsEl && typeof stats.interactions === 'number') {
    interactionsEl.textContent = `Interazioni: ${stats.interactions}`;
  }

  const mysteriesEl = document.getElementById('mysteriesCount');
  if (mysteriesEl && typeof stats.mysteries === 'number') {
    mysteriesEl.textContent = `Misteri risolti: ${stats.mysteries}`;
  }

  const scoreEl = document.getElementById('scoreCount');
  if (scoreEl && typeof stats.score === 'number') {
    currentScore = stats.score;
    scoreEl.textContent = `Punteggio: ${currentScore}/138`;
  }

  const rankEl = document.getElementById('rankCount');
  if (rankEl && stats.rank) {
    rankEl.textContent = `Livello: ${stats.rank}`;
  }
}

function applyUiFromExecute(ui) {
  if (!ui || typeof ui !== 'object') return;

  const locationId = ui.location && typeof ui.location.id === 'number' ? ui.location.id : null;
  if (locationId) {
    const next = luoghi.find(l => l.ID === locationId);
    if (next) current = next;
  }

  if (current && ui.direzioni && typeof ui.direzioni === 'object') {
    Object.assign(current, ui.direzioni);
    const luogoInArray = luoghi.find(l => current && l.ID === current.ID);
    if (luogoInArray) Object.assign(luogoInArray, ui.direzioni);
    updateDirectionUI(current);
  }
}

function syncFlagsFromState(state) {
  if (!state || typeof state !== 'object') return;
  awaitingRestart = !!state.awaitingRestart;
  awaitingConfirmEnd = !!state.awaitingEndConfirm;
  // Importante: NON mostrare qui il banner "Gioco terminato".
  // In caso di vittoria, il server ritorna state.ended=true insieme al testo finale:
  // il banner deve essere aggiunto DOPO il messaggio conclusivo (gestito in executeCommandOnServer).
  if (state.ended === true) applyEndedUiState();
}

async function executeCommandOnServer(input) {
  const raw = String(input || '').trim();
  if (!raw) return;

  // Sprint #57.2: lock one-at-a-time per prevenire doppie esecuzioni.
  if (!debugRaceMode) {
    if (inFlight) return;
    inFlight = true;
    updateSendButtonDisabledState(true);
  }

  // Sprint #57.3: requestId incrementale per scartare risposte fuori ordine.
  const requestId = ++executeRequestId;

  if (debugRaceMode) {
    console.log('[debugRace] execute start', { requestId, input: raw });
  }

  try {
    const prevLocationId = current && typeof current.ID === 'number' ? current.ID : null;

    let res;
    try {
      res = await fetch(basePath + 'api/engine/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: raw })
      });
    } catch (err) {
      console.error('Errore chiamata execute:', err);
      appendFeedMessage({ kind: 'error', text: window.i18n ? window.i18n.msg('ui.error.communication') : 'Errore di comunicazione.' });
      return;
    }

    let executeResult;
    try {
      executeResult = await res.json();
    } catch (err) {
      console.error('Errore parsing JSON execute:', err);
      appendFeedMessage({ kind: 'error', text: window.i18n ? window.i18n.msg('ui.error.internal') : 'Errore interno.' });
      return;
    }

    if (debugRaceMode) {
      const delayMs = debugRaceArtificialDelayMsForRequest(requestId);
      if (delayMs > 0) {
        console.log('[debugRace] delaying response apply', { requestId, delayMs });
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    // Sprint #57.3: se nel frattempo è partita una richiesta più recente, ignora questa risposta.
    if (requestId !== executeRequestId) {
      if (debugRaceMode) {
        console.log('[debugRace] Ignorata risposta fuori ordine', { requestId, latest: executeRequestId });
      }
      return;
    }
    // Sprint 4.1.3: usa sempre i campi arricchiti per aggiornare UI e contatori.
    if (executeResult && executeResult.stats) applyStats(executeResult.stats);
    if (executeResult && executeResult.ui) applyUiFromExecute(executeResult.ui);
    if (executeResult && executeResult.state) syncFlagsFromState(executeResult.state);

    // Errori di parsing/input
    if (!executeResult || executeResult.ok !== true) {
      const msg = executeResult && typeof executeResult.userMessage === 'string'
        ? executeResult.userMessage
        : (window.i18n ? window.i18n.msg('ui.error.unknownCommand') : 'Comando sconosciuto.');
      appendFeedMessage({ kind: 'error', text: msg });
      return;
    }

    const engine = executeResult.engine;
    if (!engine) return;

    const stateEnded = executeResult && executeResult.state && executeResult.state.ended === true;

    // GAME OVER
    if (engine.gameOver === true || engine.resultType === 'GAME_OVER') {
      // Mostra prima la location corrente (se la UI l'ha aggiornata) e poi il messaggio.
      // Altrimenti, in caso di luogo terminale dopo NAVIGATION, si vede solo il messaggio.
      try {
        showCurrent();
      } catch {
        // ignore: fallback a solo messaggio game over
      }
      displayGameOverMessage(engine.message);
      return;
    }

    // VITTORIA / ENDED
    // Nota: per alcuni flussi (es. risposta "NO" al game over) il server può segnare ended solo in state.
    if (engine.ended === true || stateEnded) {
      if (engine.message) {
        appendFeedMessage({ kind: 'system', html: engine.message });
      }
      displayGameEndedMessage();
      return;
    }

    // Conferma fine gioco (gestione client-side esistente)
    if (engine.resultType === 'CONFIRM_END') {
      awaitingConfirmEnd = true;
    }

    // Salvataggio
    if (engine.resultType === 'SAVE_GAME') {
      fetch(basePath + 'api/engine/save-client-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ luoghi: luoghi })
      })
      .then(res2 => {
        if (!res2.ok) throw new Error('Errore nel salvataggio: ' + res2.status);
        return res2.json();
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
        appendFeedMessage({ kind: 'system', text: `Gioco salvato come ${filename}.` });
      })
      .catch(err => {
        console.error('Errore nel salvataggio:', err);
        appendFeedMessage({ kind: 'error', text: window.i18n ? window.i18n.msg('ui.error.command') : 'Errore nel salvataggio del gioco.' });
      });
    }

    // Caricamento
    if (engine.resultType === 'LOAD_GAME') {
      const inputEl = document.createElement('input');
      inputEl.type = 'file';
      inputEl.accept = '.json';
      inputEl.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          try {
            const saveData = JSON.parse(ev.target.result);
            fetch(basePath + 'api/engine/load-client-state', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(saveData)
            })
            .then(r => r.json())
            .then(result => {
              if (!result.ok) throw new Error(result.error);
              return fetch(basePath + 'api/luoghi');
            })
            .then(r => r.json())
            .then(data => {
              luoghi = Array.isArray(data) ? data : [];
              return fetch(basePath + 'api/engine/state');
            })
            .then(r => r.json())
            .then(stateResult => {
              if (!stateResult || stateResult.ok !== true || !stateResult.state) return;

              // Riallinea flag UI (restart/end confirm/ended) e location corrente
              syncFlagsFromState(stateResult.state);
              const locationId = stateResult.state.currentLocationId;
              current = luoghi.find(l => l.ID === locationId) || luoghi[0];

              // Riallinea direzioni dinamiche (toggle/sblocchi) e contatori dal server.
              // Nota: senza questo, la UI rimane con valori pre-load finché non si esegue un comando.
              return fetch(basePath + `api/engine/direzioni/${locationId}`)
                .then(r2 => r2.json())
                .then(dirResult => {
                  if (dirResult && dirResult.ok && dirResult.direzioni && current) {
                    Object.assign(current, dirResult.direzioni);
                    const luogoInArray = luoghi.find(l => current && l.ID === current.ID);
                    if (luogoInArray) Object.assign(luogoInArray, dirResult.direzioni);
                  }
                })
                .catch(() => {
                  // ignore: fallback a direzioni statiche
                })
                .finally(() => {
                  showCurrent();
                  updateGameStats();
                  appendFeedMessage({ kind: 'system', text: window.i18n ? window.i18n.msg('ui.game.loaded') : 'Gioco caricato con successo.' });
                });
            })
            .catch(err => {
              console.error('Errore nel caricamento:', err);
              appendFeedMessage({ kind: 'error', text: window.i18n ? window.i18n.msg('ui.error.command') : 'Errore nel caricamento del gioco.' });
            });
          } catch {
            appendFeedMessage({ kind: 'error', text: window.i18n ? window.i18n.msg('ui.error.invalidFile') : 'File di salvataggio non valido.' });
          }
        };
        reader.readAsText(file);
      };
      inputEl.click();
    }

    if (engine.message) {
      appendFeedMessage({ kind: 'system', html: engine.message });
    }

    const nextId = executeResult && executeResult.ui && executeResult.ui.location && typeof executeResult.ui.location.id === 'number'
      ? executeResult.ui.location.id
      : null;

    // In caso di restart (awaitingRestart bypass parser), il submit handler pulisce il feed.
    // Qui riallineiamo la UI mostrando subito la location corrente.
    const isRestartAccepted = executeResult && executeResult.parseResult === null && engine && engine.resultType === 'OK';

    if (engine.showLocation || isRestartAccepted || (prevLocationId && nextId && prevLocationId !== nextId)) {
      showCurrent();
    }
  } finally {
    // Sprint #57.3: evita che una risposta tardiva sblocchi l'UI se esiste una richiesta più recente.
    if (!debugRaceMode && requestId === executeRequestId) {
      inFlight = false;
      updateSendButtonDisabledState(false);
    }
  }
}

// Espone helper per smoke test/checklist in DevTools (lo script è type="module").
try {
  window.executeCommandOnServer = executeCommandOnServer;
  window.debugRaceMode = debugRaceMode;
  window.debugRaceDelayMs = debugRaceDelayMs;
} catch {
  // ignore
}

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
        applyStats(data);
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
  // Statistiche: aggiornate da /execute (fallback iniziale via updateGameStats).

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

  // Sprint #57.2: se c'è una richiesta in corso, ignora l'invio (senza cancellare l'input).
  if (inFlight && !debugRaceMode) return;
  
  // Blocca input se gioco terminato
  if (gameEnded) {
    userInput.value = '';
    return;
  }
  
  // Se in attesa di conferma fine gioco (server-side), inoltra SI/NO a /execute
  if (awaitingConfirmEnd) {
    const risposta = userInput.value.trim().toUpperCase();
    if (/^(S(I|Ì)?|Y(ES)?)$/.test(risposta) || /^(N(O)?)$/.test(risposta)) {
      userInput.value = '';
      await executeCommandOnServer(risposta);
      return;
    }
    userInput.value = '';
    return;
  }
  // Se in attesa di conferma riavvio
  if (awaitingRestart) {
    const risposta = userInput.value.trim().toUpperCase();
    // Accetta S, SI, SÌ, Sì, s, sì, etc.
    if (/^S(I|Ì)?$/.test(risposta)) {
      const feed = document.getElementById('placeFeed');
      if (feed) feed.innerHTML = '';
      userInput.value = '';
      await executeCommandOnServer(risposta);
      return;
    } else if (/^N(O)?$/.test(risposta)) {
      userInput.value = '';
      await executeCommandOnServer('NO');
      return;
    }
    // Se risposta non valida, ignora qualsiasi input e rimane sulla descrizione terminale
    userInput.value = '';
    e.preventDefault();
    return;
  }
  const val = userInput.value.trim();
  userInput.value = '';
  if (!val) return;

  await executeCommandOnServer(val);
});
fetch(basePath + 'api/luoghi')
  .then(res => res.json())
  .then(async data => {
    luoghi = Array.isArray(data) ? data : [];
    if (!luoghi.length) {
      console.error('Nessun luogo trovato!');
      return;
    }

    // Reset del gameState sul server all'avvio
    fetch(basePath + 'api/engine/reset', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idLingua })
    })
      .catch(err => console.error('Errore reset engine iniziale:', err));

    current = luoghi.find(l => l.ID === 1) || luoghi[0];
    showCurrent();

    // Fallback: carica statistiche iniziali.
    updateGameStats();
  })
  .catch(err => {
    console.error('Errore nel caricamento dei luoghi:', err);
  });

