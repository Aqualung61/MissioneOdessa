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
}


// odessa1.js - Adventure game client-side (usa dati reali via API)
// Versione aggiornata: 2025-10-30  (fetch API)

const DIRECTIONS = ['Nord', 'Est', 'Sud', 'Ovest', 'Su', 'Giu'];

const output = document.getElementById('output');
const inputForm = document.getElementById('inputArea');
const userInput = document.getElementById('userInput');

let luoghi = [];
let current = null;
let awaitingRestart = false;

function updateDynamicPlaceImage() {
  const dynamicImage = document.getElementById('dynamicPlaceImage');
  if (dynamicImage && current) {
    const imagePath = current.Immagine ? `../images/${current.Immagine}` : './images/dummy.png';
    dynamicImage.src = imagePath;
    dynamicImage.alt = current.Nome || 'Immagine del luogo';
    dynamicImage.title = current.Nome || 'Immagine del luogo'; // Testo al mouse over
    dynamicImage.style.display = 'block';
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

    if (current.Terminale === -1) {
      const endMsg = document.createElement('div');
      endMsg.className = 'feed-msg system';
      endMsg.innerHTML = '<b>Hai raggiunto un luogo terminale. Vuoi ripartire? (SI/SÌ per confermare)</b>';
      placeFeed.appendChild(endMsg);
      placeFeed.scrollTop = placeFeed.scrollHeight;
      awaitingRestart = true;
    }
  }
}
inputForm.addEventListener('submit', function(e) {
  e.preventDefault();
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
      showCurrent();
      return;
    }
    // Se risposta non valida, ignora qualsiasi input e rimane sulla descrizione terminale
    userInput.value = '';
    e.preventDefault();
    return;
  }
  // Gestione input direzione
  const val = userInput.value.trim();
  userInput.value = '';
  let dir = val;
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
});
fetch('/api/luoghi')
  .then(res => res.json())
  .then(data => {
    luoghi = Array.isArray(data) ? data : [];
    if (!luoghi.length) {
      console.error('Nessun luogo trovato!');
      return;
    }

    current = luoghi.find(l => l.ID === 1) || luoghi[0];
    showCurrent();
  })
  .catch(err => {
    console.error('Errore nel caricamento dei luoghi:', err);
  });
