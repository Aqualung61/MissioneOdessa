

// odessa1.js - Adventure game client-side (usa dati reali via API)
// Versione aggiornata: 2025-10-30  (fetch API)

const DIRECTIONS = ['Nord', 'Est', 'Sud', 'Ovest', 'Su', 'Giu'];
const DIRECTION_TO_FIELD = {
  'Nord': 'North',
  'Est': 'East',
  'Sud': 'South',
  'Ovest': 'West',
  'Su': 'Up',
  'Giu': 'Down',
};

const output = document.getElementById('output');
const inputForm = document.getElementById('inputArea');
const userInput = document.getElementById('userInput');

let luoghi = [];
let current = null;

function print(msg) {
  output.textContent += (output.textContent ? '\n' : '') + msg;
  output.scrollTop = output.scrollHeight;
}

function showCurrent() {
  if (!current) {
    output.textContent = 'Nessun luogo selezionato.';
    return;
  }
  output.textContent =
    `ID: ${current.ID}\n` +
    `Description: ${current.Description}\n` +
    `North: ${current.North}\n` +
    `East: ${current.East}\n` +
    `South: ${current.South}\n` +
    `West: ${current.West}\n` +
    `Up: ${current.Up}\n` +
    `Down: ${current.Down}`;
}


inputForm.addEventListener('submit', function(e) {
  e.preventDefault();
  const val = userInput.value.trim();
  userInput.value = '';
  if (!DIRECTIONS.includes(val)) {
    print('Input non valido. Usa solo Nord, Est, Sud, Ovest, Su, Giu.');
    return;
  }
  const field = DIRECTION_TO_FIELD[val];
  const nextId = current[field];
  if (!nextId || nextId === 0) {
    print(`Comando: ${val} → muro (0)`);
    print('Non puoi andare in quella direzione.');
    return;
  }
  const next = luoghi.find(l => l.ID === nextId);
  if (!next) {
    print(`Luogo con ID=${nextId} non trovato!`);
    return;
  }
  current = next;
  showCurrent();
});

// Carica i dati reali via API
fetch('/api/luoghi')
  .then(res => res.json())
  .then(data => {
    luoghi = data;
    current = luoghi.find(l => l.ID === 8) || luoghi[0];
    showCurrent();
  })
  .catch(err => {
    output.textContent = 'Errore nel caricamento dati: ' + err;
  });
