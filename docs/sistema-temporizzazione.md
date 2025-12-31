# Sistema di Temporizzazione - Missione Odessa

**Versione:** 1.0 (proposta)  
**Data:** 29 dicembre 2025  
**Status:** Design Document (non implementato)

---

## 1. Panoramica Requisiti

Il gioco richiede l'implementazione di **tre meccanismi di morte a tempo**:

### 1.1 Evento A: Torcia Difettosa (6 mosse)

**Condizione di trigger:**
- ❌ Lampada NON prelevata dall'inventario
- ❌ Lampada NON accesa (anche se prelevata)
- ✅ Fiammiferi presenti in inventario

**Comportamento:**
- Dopo **6 mosse** qualsiasi (comandi ACTION, NAVIGATION, etc.)
- La torcia elettrica (item iniziale) si spegne definitivamente

**Game Over:**
```
🔦 La torcia elettrica emette un ultimo tremulo bagliore e si spegne.
Sei avvolto dall'oscurità totale. Non riesci a vedere nulla.

💀 SEI MORTO - Al buio è impossibile orientarsi e hai battuto la testa.

[GAME OVER]
```

**Prevenzione:**
1. Prendere la Lampada (ID=27, IDLuogo=6)
2. Accendere la Lampada usando i Fiammiferi
3. Timer disabilitato ✅

---

### 1.2 Evento B: Intercettazione Esterna (3 turni)

**Luoghi pericolosi identificati:**

| ID Luogo | Nome | Nota |
|----------|------|------|
| 51 | Grossa piazza | Descrizione: "Restare a lungo fermi in un posto all'aperto può essere pericoloso" |
| 52 | Filo spinato | Descrizione: "Restare a lungo fermi in un posto all'aperto può essere pericoloso" |
| 53 | Posto di blocco | Descrizione: "Restare a lungo fermi in un posto all'aperto può essere pericoloso" |
| 54 | Strada | Descrizione: "Restare a lungo fermi in un posto all'aperto può essere pericoloso" |
| 55 | Strada | Descrizione: "Restare a lungo fermi in un posto all'aperto può essere pericoloso" |
| 56 | Filo spinato | Descrizione: "Restare a lungo fermi in un posto all'aperto può essere pericoloso" |
| 58 | Filo spinato | Descrizione: "Restare a lungo fermi in un posto all'aperto può essere pericoloso" |

**Comportamento:**
- Counter incrementa **ogni azione** (ACTION, NAVIGATION, SYSTEM) quando giocatore si trova in uno dei luoghi sopra
- Dopo **3 azioni consecutive** nello stesso luogo pericoloso → Game Over
- Counter si **resetta** quando si cambia luogo (anche verso altro luogo pericoloso)

**Game Over:**
```
🚨 Una pattuglia russa ti ha individuato!
Non avresti dovuto attardarti così a lungo in questa zona.

💀 SEI MORTO - Sei stato catturato e interrogato.

[GAME OVER]
```

**Prevenzione:**
- Non rimanere più di 2 azioni nello stesso luogo pericoloso
- Muoversi continuamente tra i luoghi esterni

---

### 1.3 Evento C: Lampada Abbandonata

**Condizione di trigger:**
- ✅ Lampada accesa (stato `lampadaAccesa: true`)
- ✅ Lampada lasciata in un luogo (IDLuogo !== 0)
- ❌ Giocatore si allontana (currentLocationId !== lampada.IDLuogo)

**Comportamento:**
- **Immediato** al cambio luogo (NAVIGATION)
- Verifica se fonte luce disponibile (lampada accesa in inventario)
- Se NON disponibile → Game Over

**Game Over:**
```
🔦 Ti sei allontanato dalla fonte di luce. L'oscurità ti avvolge.
Inciampi e cadi in una botola nascosta che non potevi vedere.

💀 SEI MORTO - Non si sopravvive ad una caduta di 10 metri.

[GAME OVER]
```

**Prevenzione:**
- NON lasciare la lampada accesa con comando POSA/LASCIA
- Oppure: prendere sempre la lampada prima di muoversi

---

## 2. Architettura Sistema

### 2.1 Estensione gameState

```javascript
let gameState = {
  // ... campi esistenti ...
  
  // === SISTEMA TEMPORIZZAZIONE ===
  timers: {
    // Timer globale mosse (per torcia difettosa)
    movementCounter: 0,           // Incrementa ad ogni comando
    
    // Stato fonte luce
    torciaDifettosa: true,        // true finché non si accende lampada
    lampadaAccesa: false,         // true quando lampada accesa
    lampadaPresa: false,          // true quando lampada prelevata almeno una volta
    
    // Timer intercettazione (luoghi pericolosi)
    azioniInLuogoPericoloso: 0,   // Counter azioni consecutive nel luogo corrente
    ultimoLuogoPericoloso: null,  // ID ultimo luogo pericoloso (per detect cambio)
    
    // Warning flags
    warningTorciaEsaurita: false, // Mostra warning a 5 mosse
    warningIntercettazione: false // Mostra warning a 2 azioni
  }
};
```

### 2.2 Costanti Configurabili

```javascript
// In engine.js - top level
const TIMER_CONFIG = {
  TORCIA_MOSSE_MAX: 6,           // Mosse prima che torcia si spenga
  TORCIA_WARNING_MOSSE: 5,       // Mostra warning
  INTERCETTAZIONE_AZIONI_MAX: 3, // Azioni consecutive in luogo pericoloso
  INTERCETTAZIONE_WARNING: 2,    // Mostra warning
  
  // ID luoghi pericolosi (esclude ID=54 terminale, ID=57 rifugio)
  LUOGHI_PERICOLOSI: [51, 52, 53, 55, 56, 58]
};
```

### 2.3 Identificazione Oggetti

**Oggetti coinvolti (da Oggetti.json):**

```javascript
// Oggetto ID=27 - Lampada
{
  "ID": 27,
  "Oggetto": "Lampada",
  "Attivo": 3,        // Prelevabile
  "IDLuogo": 6        // Luogo iniziale
}

// Oggetto ID=36 - Fiammiferi
{
  "ID": 36,
  "Oggetto": "Fiammiferi",
  "Attivo": 3,        // Prelevabile
  "IDLuogo": 0        // Già in inventario all'inizio
}

// Oggetto ID=37 - Torcia elettrica
{
  "ID": 37,
  "Oggetto": "Torcia elettrica",
  "Attivo": 3,        // Prelevabile
  "IDLuogo": 0        // Già in inventario all'inizio
}
```

**Note:**
- Torcia elettrica è già in inventario (IDLuogo=0)
- Fiammiferi sono già in inventario (IDLuogo=0)
- Lampada va trovata e prelevata dal luogo 6

---

## 3. Implementazione Dettagliata

### 3.1 Inizializzazione Timer (resetGameState)

```javascript
export function resetGameState() {
  console.log('Inizializzazione gameState');
  gameState = {
    openStates: { BOTOLA: false },
    awaitingRestart: false,
    currentLocationId: 1,
    ended: false,
    visitedPlaces: new Set([1]),
    Oggetti: [],
    interazioniEseguite: [],
    direzioniSbloccate: {},
    direzioniToggle: {},
    sequenze: {},
    
    // === NUOVO: Sistema Timers ===
    timers: {
      movementCounter: 0,
      torciaDifettosa: true,           // Timer attivo all'inizio
      lampadaAccesa: false,
      lampadaPresa: false,
      azioniInLuogoPericoloso: 0,
      ultimoLuogoPericoloso: null,
      warningTorciaEsaurita: false,
      warningIntercettazione: false
    }
  };
  
  // ... resto inizializzazione esistente ...
}
```

---

### 3.2 Funzione: Verifica Torcia Difettosa

```javascript
/**
 * Verifica se la torcia difettosa si è esaurita.
 * Chiamare PRIMA di processare ogni comando.
 * 
 * @returns {Object|null} - GameOver result se timer scaduto, null altrimenti
 */
function checkTorciaEsaurita() {
  // Se timer disabilitato (lampada accesa), skip
  if (!gameState.timers.torciaDifettosa) {
    return null;
  }
  
  // Incrementa counter mosse
  gameState.timers.movementCounter++;
  
  const mosse = gameState.timers.movementCounter;
  const max = TIMER_CONFIG.TORCIA_MOSSE_MAX;
  const warning = TIMER_CONFIG.TORCIA_WARNING_MOSSE;
  
  // === WARNING a 5 mosse ===
  if (mosse === warning && !gameState.timers.warningTorciaEsaurita) {
    gameState.timers.warningTorciaEsaurita = true;
    
    // Mostra messaggio warning come SYSTEM message
    // Questo dovrebbe essere concatenato al risultato del comando corrente
    console.warn(`⚠️ WARNING: Torcia sta per esaurirsi (${max - mosse} mosse rimanenti)`);
    // Opzione: inviare al frontend per mostrare banner persistente
  }
  
  // === GAME OVER a 6 mosse ===
  if (mosse >= max) {
    gameState.ended = true;
    
    return {
      accepted: true,
      resultType: 'GAME_OVER',
      message: `
🔦 La torcia elettrica emette un ultimo tremulo bagliore e si spegne.
Sei avvolto dall'oscurità totale. Non riesci a vedere nulla.

💀 SEI MORTO - Al buio è impossibile orientarsi e hai battuto 
la testa contro un pilastro di cemento armato.

[GAME OVER - Torcia esaurita]
      `,
      deathReason: 'TORCIA_ESAURITA',
      showLocation: false
    };
  }
  
  return null;
}
```

**Note implementative:**
- ⚠️ Warning a 5 mosse potrebbe essere mostrato come notifica persistente in UI
- ⚠️ Considera se contare SOLO mosse NAVIGATION o tutti i comandi
- Raccomandazione: contare **tutti i comandi** (più realistico per "tempo che passa")

---

### 3.3 Funzione: Verifica Intercettazione

```javascript
/**
 * Verifica se il giocatore sta per essere intercettato in zona pericolosa.
 * Chiamare DOPO ogni comando (se eseguito con successo).
 * 
 * @returns {Object|null} - GameOver result se intercettato, warning message, o null
 */
function checkIntercettazione() {
  const luogoCorrente = gameState.currentLocationId;
  const isPericoloso = TIMER_CONFIG.LUOGHI_PERICOLOSI.includes(luogoCorrente);
  
  // === CASO 1: Non in luogo pericoloso ===
  if (!isPericoloso) {
    // Reset counter se si lascia zona pericolosa
    if (gameState.timers.azioniInLuogoPericoloso > 0) {
      gameState.timers.azioniInLuogoPericoloso = 0;
      gameState.timers.ultimoLuogoPericoloso = null;
      gameState.timers.warningIntercettazione = false;
    }
    return null;
  }
  
  // === CASO 2: In luogo pericoloso ===
  
  // Check se cambiato luogo pericoloso (reset counter)
  if (gameState.timers.ultimoLuogoPericoloso !== luogoCorrente) {
    gameState.timers.azioniInLuogoPericoloso = 0;
    gameState.timers.ultimoLuogoPericoloso = luogoCorrente;
    gameState.timers.warningIntercettazione = false;
  }
  
  // Incrementa counter azioni nel luogo pericoloso corrente
  gameState.timers.azioniInLuogoPericoloso++;
  
  const azioni = gameState.timers.azioniInLuogoPericoloso;
  const max = TIMER_CONFIG.INTERCETTAZIONE_AZIONI_MAX;
  const warning = TIMER_CONFIG.INTERCETTAZIONE_WARNING;
  
  // === WARNING a 2 azioni ===
  if (azioni === warning && !gameState.timers.warningIntercettazione) {
    gameState.timers.warningIntercettazione = true;
    
    return {
      type: 'WARNING',
      message: `⚠️ Senti delle voci in lontananza. Meglio non restare qui troppo a lungo!`,
      continueExecution: true  // Flag per indicare che non è game over
    };
  }
  
  // === GAME OVER a 3 azioni ===
  if (azioni >= max) {
    gameState.ended = true;
    
    return {
      accepted: true,
      resultType: 'GAME_OVER',
      message: `
🚨 Una pattuglia russa ti ha individuato!
Non avresti dovuto attardarti così a lungo in questa zona scoperta.

💀 SEI MORTO - Sei stato catturato, interrogato e giustiziato 
come spia occidentale.

[GAME OVER - Intercettato]
      `,
      deathReason: 'INTERCETTATO',
      showLocation: false
    };
  }
  
  return null;
}
```

**Note implementative:**
- Counter è **per singolo luogo pericoloso** (cambiare luogo resetta)
- Muoversi da luogo 51 → 52 → 51 significa 3 counter diversi (sicuro)
- Rimanere 3 volte in luogo 51 → game over

---

### 3.4 Funzione: Verifica Lampada Abbandonata

```javascript
/**
 * Verifica se il giocatore si è allontanato dalla fonte di luce (lampada accesa).
 * Chiamare DOPO ogni comando NAVIGATION con successo.
 * 
 * @returns {Object|null} - GameOver result se al buio, null altrimenti
 */
function checkLampadaAbbandonata() {
  // Skip se lampada non ancora accesa (torcia funziona ancora o non conta)
  if (!gameState.timers.lampadaAccesa) {
    return null;
  }
  
  // Trova oggetto Lampada
  const lampada = gameState.Oggetti.find(obj => 
    obj.Oggetto === 'Lampada' && obj.ID === 27
  );
  
  if (!lampada) {
    console.error('❌ Oggetto Lampada non trovato in gameState.Oggetti');
    return null;
  }
  
  // === CASO 1: Lampada in inventario (IDLuogo = 0) ===
  if (lampada.IDLuogo === 0) {
    // Tutto ok, fonte luce con il giocatore
    return null;
  }
  
  // === CASO 2: Lampada lasciata in un luogo ===
  
  // Check se giocatore è nello stesso luogo della lampada
  if (lampada.IDLuogo === gameState.currentLocationId) {
    // Ancora nello stesso luogo, ok
    return null;
  }
  
  // === CASO 3: Giocatore si è allontanato dalla lampada ===
  
  // Verifica se torcia elettrica ancora funzionante (backup)
  const torcia = gameState.Oggetti.find(obj => 
    obj.Oggetto === 'Torcia elettrica' && obj.ID === 37
  );
  
  // Se torcia in inventario e non difettosa, può sopravvivere
  if (torcia && torcia.IDLuogo === 0 && !gameState.timers.torciaDifettosa) {
    // Torcia funzionante come backup
    return {
      type: 'WARNING',
      message: `⚠️ Ti sei allontanato dalla lampada accesa, ma la torcia elettrica ti sta salvando.`,
      continueExecution: true
    };
  }
  
  // === GAME OVER: Al buio senza fonte luce ===
  gameState.ended = true;
  
  return {
    accepted: true,
    resultType: 'GAME_OVER',
    message: `
🔦 Ti sei allontanato dalla lampada accesa. L'oscurità ti avvolge.
Senza una fonte di luce, non riesci a vedere dove metti i piedi.

Inciampi e cadi in una botola nascosta che non potevi vedere nel buio.

💀 SEI MORTO - Non si sopravvive ad una caduta di 10 metri nel vuoto.

[GAME OVER - Al buio]
    `,
    deathReason: 'BUIO_TOTALE',
    showLocation: false
  };
}
```

**Note implementative:**
- Torcia elettrica **può essere usata come backup** se non difettosa
- Se torcia esaurita + lampada abbandonata = game over
- Se torcia funzionante + lampada abbandonata = warning ma continua

---

### 3.5 Interazione: ACCENDI LAMPADA

**File:** `src/data-internal/Interazioni.json`

```json
{
  "id": "accendi_lampada",
  "trigger": {
    "verbo": "ACCENDERE",
    "oggetto": "LAMPADA"
  },
  "condizioni": {
    "prerequisiti": [
      {
        "tipo": "OGGETTO_IN_INVENTARIO",
        "target": "Lampada"
      },
      {
        "tipo": "OGGETTO_IN_INVENTARIO",
        "target": "Fiammiferi"
      }
    ]
  },
  "risposta": "Accendi la lampada con i fiammiferi. Una luce calda e stabile illumina l'ambiente circostante. Ora hai una fonte di luce affidabile!",
  "effetti": [
    {
      "tipo": "SET_FLAG",
      "flag": "lampadaAccesa",
      "valore": true
    },
    {
      "tipo": "DISABLE_TIMER",
      "timer": "torciaDifettosa"
    }
  ],
  "ripetibile": false
}
```

**Note:**
- ⚠️ Richiede nuovo tipo effetto: `SET_FLAG` e `DISABLE_TIMER`
- Effetto deve settare `gameState.timers.lampadaAccesa = true`
- Effetto deve settare `gameState.timers.torciaDifettosa = false`

---

### 3.6 Gestione Effetti Custom (Estensione)

**File:** `src/logic/engine.js` - funzione `applicaEffetti()`

```javascript
function applicaEffetti(effetti, interazioneId, interazione) {
  // ... gestione effetti esistenti (VISIBILITA, SBLOCCA_DIREZIONE, etc.) ...
  
  effetti.forEach((effetto) => {
    switch (effetto.tipo) {
      // ... case esistenti ...
      
      // === NUOVO: SET_FLAG ===
      case 'SET_FLAG':
        if (effetto.flag && effetto.valore !== undefined) {
          // Imposta flag nel gameState.timers
          if (gameState.timers.hasOwnProperty(effetto.flag)) {
            gameState.timers[effetto.flag] = effetto.valore;
            console.log(`✅ Flag impostato: ${effetto.flag} = ${effetto.valore}`);
          } else {
            console.warn(`⚠️ Flag sconosciuto: ${effetto.flag}`);
          }
        }
        break;
      
      // === NUOVO: DISABLE_TIMER ===
      case 'DISABLE_TIMER':
        if (effetto.timer) {
          // Disabilita timer specifico
          if (gameState.timers.hasOwnProperty(effetto.timer)) {
            gameState.timers[effetto.timer] = false;
            console.log(`✅ Timer disabilitato: ${effetto.timer}`);
          } else {
            console.warn(`⚠️ Timer sconosciuto: ${effetto.timer}`);
          }
        }
        break;
      
      // ... altri case ...
    }
  });
}
```

---

### 3.7 Integrazione in executeCommand()

```javascript
export function executeCommand(parseResult) {
  if (!parseResult || parseResult.IsValid !== true) {
    return { /* ... errore ... */ };
  }
  
  // ====================================================
  // STEP 1: Check torcia esaurita (PRIMA di processare)
  // ====================================================
  const torciaGameOver = checkTorciaEsaurita();
  if (torciaGameOver) {
    return torciaGameOver;  // Game Over immediato
  }
  
  // ====================================================
  // STEP 2: Processa comando normalmente
  // ====================================================
  let result;
  
  switch (parseResult.CommandType) {
    case 'NAVIGATION':
      result = handleNavigation(parseResult);
      
      // Se navigazione ha successo, check lampada abbandonata
      if (result.accepted && result.resultType === 'OK') {
        const lampadaGameOver = checkLampadaAbbandonata();
        if (lampadaGameOver) {
          return lampadaGameOver;  // Game Over immediato
        }
      }
      break;
    
    case 'ACTION':
      result = handleAction(parseResult);
      break;
    
    case 'SYSTEM':
      result = handleSystem(parseResult);
      break;
    
    default:
      return { accepted: false, resultType: 'ERROR', message: 'Tipo comando sconosciuto' };
  }
  
  // ====================================================
  // STEP 3: Check intercettazione (DOPO comando successo)
  // ====================================================
  if (result.accepted && result.resultType !== 'GAME_OVER') {
    const intercettazioneResult = checkIntercettazione();
    
    if (intercettazioneResult) {
      if (intercettazioneResult.resultType === 'GAME_OVER') {
        // Game Over: sostituisci result
        return intercettazioneResult;
      } else if (intercettazioneResult.type === 'WARNING') {
        // Warning: aggiungi al messaggio esistente
        result.message += '\n\n' + intercettazioneResult.message;
      }
    }
  }
  
  // ====================================================
  // STEP 4: Ritorna risultato finale
  // ====================================================
  return result;
}
```

**Note:**
- **Ordine critico**: torcia PRIMA (incrementa counter), intercettazione DOPO
- Lampada abbandonata check SOLO su NAVIGATION con successo
- Warning intercettazione va concatenato al messaggio del comando

---

## 4. Casi Edge e Gestione Speciale

### 4.1 Edge Case: Accendi Lampada alla Mossa 5

**Scenario:**
- Giocatore è alla mossa 5 (warning torcia)
- Comando: `ACCENDI LAMPADA`
- Mossa 6 attivata (incremento counter)
- Ma lampada si accende → `torciaDifettosa = false`

**Soluzione:**
```javascript
function checkTorciaEsaurita() {
  if (!gameState.timers.torciaDifettosa) {
    // Timer disabilitato: NON incrementare counter
    return null;
  }
  
  // Incrementa SOLO se timer ancora attivo
  gameState.timers.movementCounter++;
  
  // ... resto della logica ...
}
```

**Risultato:**
- ✅ Giocatore accende lampada alla mossa 6 → salvo
- ❌ Giocatore NON accende lampada alla mossa 6 → game over

---

### 4.2 Edge Case: Posa Lampada in Luogo Sicuro

**Scenario:**
- Lampada accesa
- Giocatore: `POSA LAMPADA` nel luogo 10 (interno, sicuro)
- Giocatore: `NORD` (va al luogo 11)
- Dovrebbe morire al buio?

**Considerazione:**
- Requisito originale: "si lascia la lampada accesa in un luogo e ci si allontana"
- Non specifica se differenziare luoghi interni/esterni

**Raccomandazione:**
- **Opzione A (Semplice):** Game Over **sempre** se abbandoni lampada accesa
- **Opzione B (Realistica):** Game Over **solo** se vai in luoghi senza fonte luce naturale

**Implementazione Opzione B (se richiesta):**

```javascript
// In engine.js - costanti
const LUOGHI_ILLUMINATI_NATURALMENTE = [
  51, 52, 53, 54, 55, 56, 58  // Luoghi esterni (luce diurna)
];

function checkLampadaAbbandonata() {
  // ... codice esistente ...
  
  // Check se luogo corrente ha luce naturale
  const luogoIlluminato = LUOGHI_ILLUMINATI_NATURALMENTE.includes(
    gameState.currentLocationId
  );
  
  if (luogoIlluminato) {
    // Luce naturale disponibile, non serve lampada
    return {
      type: 'WARNING',
      message: `⚠️ Hai lasciato la lampada, ma la luce esterna è sufficiente.`,
      continueExecution: true
    };
  }
  
  // Altrimenti, game over come prima
  // ...
}
```

---

### 4.3 Edge Case: Comando ESAMINA Non Incrementa Timer?

**Domanda:** Comandi "passivi" come `ESAMINA`, `INVENTARIO`, `AIUTO` dovrebbero incrementare il counter mosse?

**Considerazioni:**

| Comando | Incrementa Timer? | Rationale |
|---------|-------------------|-----------|
| NAVIGATION | ✅ Sì | Movimento = tempo passa |
| PRENDI | ✅ Sì | Azione fisica = tempo passa |
| POSA | ✅ Sì | Azione fisica = tempo passa |
| ESAMINA | ⚠️ Dipende | Solo osservare, nessun movimento |
| INVENTARIO | ❌ No | Solo UI, meta-comando |
| AIUTO | ❌ No | Meta-comando |
| PUNTI | ❌ No | Meta-comando |

**Raccomandazione:**

```javascript
const COMANDI_CHE_NON_INCREMENTANO_TIMER = [
  'INVENTARIO', 'AIUTO', 'PUNTI', 'SALVARE', 'CARICARE'
];

function checkTorciaEsaurita(parseResult) {
  if (!gameState.timers.torciaDifettosa) return null;
  
  // Skip incremento per comandi meta
  const concept = parseResult.VerbConcept || parseResult.CanonicalVerb || '';
  if (COMANDI_CHE_NON_INCREMENTANO_TIMER.includes(concept.toUpperCase())) {
    return null;
  }
  
  // Incrementa per tutti gli altri comandi
  gameState.timers.movementCounter++;
  
  // ... resto logica ...
}
```

---

### 4.4 Edge Case: Morire Due Volte Contemporaneamente

**Scenario:**
- Mossa 6 (torcia esaurita) 
- In luogo pericoloso (3a azione)
- Senza lampada

**Conflitto:** Quale game over mostrare?

**Soluzione - Ordine Priorità:**

```javascript
// In executeCommand()

// 1. PRIORITÀ MASSIMA: Torcia esaurita (check per primo)
const torciaGameOver = checkTorciaEsaurita(parseResult);
if (torciaGameOver) return torciaGameOver;

// 2. Processa comando...

// 3. PRIORITÀ MEDIA: Lampada abbandonata (solo se NAVIGATION)
if (parseResult.CommandType === 'NAVIGATION' && result.accepted) {
  const lampadaGameOver = checkLampadaAbbandonata();
  if (lampadaGameOver) return lampadaGameOver;
}

// 4. PRIORITÀ BASSA: Intercettazione
const intercettazioneResult = checkIntercettazione();
if (intercettazioneResult?.resultType === 'GAME_OVER') {
  return intercettazioneResult;
}
```

**Ordine logico:**
1. Torcia esaurita (problema tecnico equipaggiamento)
2. Lampada abbandonata (errore tattico giocatore)
3. Intercettazione (evento esterno)

---

## 5. Testing - Test Cases

### 5.1 Test Torcia Difettosa

| ID | Descrizione | Setup | Azioni | Expected |
|----|-------------|-------|--------|----------|
| T01 | Torcia si spegne a 6 mosse | Inizio gioco, no lampada | 6 comandi qualsiasi | Game Over "Torcia esaurita" |
| T02 | Warning a 5 mosse | Inizio gioco | 5 comandi | Warning + continua |
| T03 | Lampada disabilita timer | Inizio gioco | PRENDI LAMPADA, ACCENDI LAMPADA, 10 mosse | Nessun game over |
| T04 | Accendere lampada alla mossa 6 | Inizio gioco | 5 mosse, PRENDI LAMPADA (6a mossa), ACCENDI (dovrebbe essere mossa 7?) | Verificare se salvo o morto |
| T05 | Meta-comandi non incrementano | Inizio gioco | 3x INVENTARIO, 3x comandi veri | Game Over alla 6a mossa "vera" |

**Note Test T04:**
- Criticità: capire se `ACCENDI LAMPADA` avviene prima o dopo incremento counter
- Raccomandazione: check torcia PRIMA di processare comando → mossa 6 è `ACCENDI` → salvo

---

### 5.2 Test Intercettazione

| ID | Descrizione | Setup | Azioni | Expected |
|----|-------------|-------|--------|----------|
| T10 | 3 azioni in luogo pericoloso | Vai a luogo 51 | 3 comandi qualsiasi nel luogo 51 | Game Over "Intercettato" |
| T11 | Warning a 2 azioni | Vai a luogo 51 | 2 comandi | Warning + continua |
| T12 | Cambio luogo resetta counter | Vai a luogo 51 | 2 comandi, NORD (va a 52), 2 comandi | Nessun game over |
| T13 | Ritorno allo stesso luogo | Vai a 51, 2 comandi, vai a 10, torna a 51 | 2 comandi | Counter resettato, nessun warning |
| T14 | Luogo sicuro resetta | Vai a 51, 2 comandi, vai a luogo interno (es. 6) | 10 comandi nel luogo 6 | Nessun problema |

---

### 5.3 Test Lampada Abbandonata

| ID | Descrizione | Setup | Azioni | Expected |
|----|-------------|-------|--------|----------|
| T20 | Lasciare lampada accesa | Prendi + accendi lampada | POSA LAMPADA, NORD | Game Over "Al buio" |
| T21 | Lampada in inventario | Prendi + accendi lampada | NORD (lampada con te) | Nessun problema |
| T22 | Lasciare lampada spenta | Prendi lampada (non accesa) | POSA LAMPADA, NORD | Nessun game over (torcia funziona) |
| T23 | Tornare dove hai lasciato lampada | Prendi + accendi, posa in luogo 10, vai a 11 | Torna a luogo 10 | Game Over appena lasci luogo 10 |
| T24 | Torcia backup | Prendi lampada, accendi (timer torcia off), posa lampada | NORD | Game Over? (torcia ancora ok ma timer disabilitato) |

**Note Test T24:**
- **Ambiguità:** Se accendo lampada, `torciaDifettosa = false` ma torcia non si ricarica
- **Interpretazione:** Timer torcia disabilitato significa "non serve più torcia"
- **Raccomandazione:** Se lampada accesa, torcia non può salvare da lampada abbandonata

---

### 5.4 Test Combinati

| ID | Descrizione | Setup | Azioni | Expected |
|----|-------------|-------|--------|----------|
| T30 | Torcia + Intercettazione | Inizio gioco, vai a luogo 51 | 3 mosse in luogo 51, mossa 4-6 nello stesso | Torcia si spegne PRIMA (mossa 6) |
| T31 | Lampada + Intercettazione | Prendi + accendi lampada, vai a 51 | 3 mosse nel luogo 51 | Intercettato (lampada non protegge) |
| T32 | Tutti e tre | Mossa 5, luogo 51 (2 azioni) | Posa lampada, vai NORD (mossa 6, 3a azione in 51) | Torcia esaurita (priorità max) |

---

## 6. Impatto su Serializzazione (Save/Load)

### 6.1 Persistenza Timers

**File:** `web/js/odessa1.js` - funzioni `saveGame()` e `loadGame()`

```javascript
function saveGame() {
  try {
    const savedState = {
      currentLocationId: gameState.currentLocationId,
      visitedPlaces: Array.from(gameState.visitedPlaces),
      Oggetti: gameState.Oggetti,
      interazioniEseguite: gameState.interazioniEseguite,
      direzioniSbloccate: gameState.direzioniSbloccate,
      direzioniToggle: gameState.direzioniToggle,
      sequenze: gameState.sequenze,
      
      // === NUOVO: Salva stato timers ===
      timers: {
        movementCounter: gameState.timers.movementCounter,
        torciaDifettosa: gameState.timers.torciaDifettosa,
        lampadaAccesa: gameState.timers.lampadaAccesa,
        lampadaPresa: gameState.timers.lampadaPresa,
        azioniInLuogoPericoloso: gameState.timers.azioniInLuogoPericoloso,
        ultimoLuogoPericoloso: gameState.timers.ultimoLuogoPericoloso,
        warningTorciaEsaurita: gameState.timers.warningTorciaEsaurita,
        warningIntercettazione: gameState.timers.warningIntercettazione
      }
    };
    
    localStorage.setItem('odessa_save', JSON.stringify(savedState));
    console.log('✅ Partita salvata con timers');
    return true;
  } catch (error) {
    console.error('❌ Errore salvataggio:', error);
    return false;
  }
}

function loadGame() {
  try {
    const savedData = localStorage.getItem('odessa_save');
    if (!savedData) return false;
    
    const loadedState = JSON.parse(savedData);
    
    // Ripristina stato base
    gameState.currentLocationId = loadedState.currentLocationId;
    gameState.visitedPlaces = new Set(loadedState.visitedPlaces);
    gameState.Oggetti = loadedState.Oggetti;
    gameState.interazioniEseguite = loadedState.interazioniEseguite;
    gameState.direzioniSbloccate = loadedState.direzioniSbloccate;
    gameState.direzioniToggle = loadedState.direzioniToggle;
    gameState.sequenze = loadedState.sequenze;
    
    // === NUOVO: Ripristina timers ===
    if (loadedState.timers) {
      gameState.timers = {
        movementCounter: loadedState.timers.movementCounter || 0,
        torciaDifettosa: loadedState.timers.torciaDifettosa !== false,  // Default true
        lampadaAccesa: loadedState.timers.lampadaAccesa || false,
        lampadaPresa: loadedState.timers.lampadaPresa || false,
        azioniInLuogoPericoloso: loadedState.timers.azioniInLuogoPericoloso || 0,
        ultimoLuogoPericoloso: loadedState.timers.ultimoLuogoPericoloso || null,
        warningTorciaEsaurita: loadedState.timers.warningTorciaEsaurita || false,
        warningIntercettazione: loadedState.timers.warningIntercettazione || false
      };
    }
    
    console.log('✅ Partita caricata con timers');
    return true;
  } catch (error) {
    console.error('❌ Errore caricamento:', error);
    return false;
  }
}
```

**Backward compatibility:**
- Se caricato save **vecchio** (senza field `timers`) → default values
- `torciaDifettosa` default `true` (timer attivo)
- Tutti gli altri default `false` / `0` / `null`

---

### 6.2 Versioning Save Files (Opzionale)

```javascript
const SAVE_VERSION = 2;  // Incrementa quando aggiungi timers

function saveGame() {
  const savedState = {
    version: SAVE_VERSION,
    // ... resto dei dati ...
  };
  // ...
}

function loadGame() {
  const loadedState = JSON.parse(savedData);
  
  // Migrazione da versione 1 a 2
  if (!loadedState.version || loadedState.version < 2) {
    console.warn('⚠️ Save file versione vecchia, applico defaults per timers');
    loadedState.timers = {
      movementCounter: 0,
      torciaDifettosa: true,
      // ... altri defaults ...
    };
  }
  
  // ... resto caricamento ...
}
```

---

## 7. UI/UX - Indicatori Visuali

### 7.1 Barra Stato Timers (Proposta)

**File:** `web/index.html`

```html
<div id="timer-warnings" class="timer-bar">
  <!-- Warning Torcia -->
  <div id="warning-torcia" class="warning-item hidden">
    🔦 <span id="torcia-mosse-rimanenti">0</span> mosse alla torcia esaurita
  </div>
  
  <!-- Warning Intercettazione -->
  <div id="warning-intercettazione" class="warning-item hidden">
    🚨 Rischio intercettazione! Muoviti!
  </div>
</div>
```

**File:** `web/css/style.css`

```css
.timer-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  background: rgba(0, 0, 0, 0.8);
  padding: 10px;
  display: flex;
  gap: 20px;
  justify-content: center;
  z-index: 1000;
}

.warning-item {
  color: #ffcc00;
  font-weight: bold;
  padding: 8px 16px;
  border-radius: 4px;
  background: rgba(255, 69, 0, 0.3);
  animation: pulse 1.5s infinite;
}

.warning-item.hidden {
  display: none;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
```

**File:** `web/js/odessa1.js` - update UI

```javascript
function updateTimerWarnings() {
  const timers = gameState.timers;
  
  // === Warning Torcia ===
  const torciaWarning = document.getElementById('warning-torcia');
  const torciaMovesSpan = document.getElementById('torcia-mosse-rimanenti');
  
  if (timers.torciaDifettosa && timers.movementCounter >= 5) {
    const mosseRimanenti = 6 - timers.movementCounter;
    torciaMovesSpan.textContent = mosseRimanenti;
    torciaWarning.classList.remove('hidden');
  } else {
    torciaWarning.classList.add('hidden');
  }
  
  // === Warning Intercettazione ===
  const intercettazioneWarning = document.getElementById('warning-intercettazione');
  
  if (timers.azioniInLuogoPericoloso >= 2) {
    intercettazioneWarning.classList.remove('hidden');
  } else {
    intercettazioneWarning.classList.add('hidden');
  }
}

// Chiamare dopo ogni comando
async function sendCommand(input) {
  const result = await executeCommandAsync(parseResult);
  
  // ... gestione result ...
  
  // Aggiorna UI warnings
  updateTimerWarnings();
}
```

---

### 7.2 Audio Warning (Opzionale)

```javascript
// In odessa1.js
const AUDIO_WARNING = new Audio('sounds/warning.mp3');

function updateTimerWarnings() {
  // ... codice esistente ...
  
  // Play sound se nuovo warning appare
  if (timers.warningTorciaEsaurita && !previousWarningState.torcia) {
    AUDIO_WARNING.play();
  }
  
  if (timers.warningIntercettazione && !previousWarningState.intercettazione) {
    AUDIO_WARNING.play();
  }
  
  // Aggiorna stato precedente
  previousWarningState = {
    torcia: timers.warningTorciaEsaurita,
    intercettazione: timers.warningIntercettazione
  };
}
```

---

## 8. Roadmap Implementazione

### 8.1 Fase 1: Core Timers (4-5 ore)

**Obiettivo:** Implementare struttura base e timer torcia

1. ✅ Estendere `gameState` con field `timers` in `resetGameState()`
2. ✅ Implementare funzione `checkTorciaEsaurita()`
3. ✅ Integrare check in `executeCommand()` (PRIMA di processare)
4. ✅ Testing manuale: 6 mosse → game over
5. ✅ Testing: warning a 5 mosse
6. ✅ Implementare interazione `accendi_lampada` in `Interazioni.json`
7. ✅ Implementare effetti `SET_FLAG` e `DISABLE_TIMER` in `applicaEffetti()`
8. ✅ Testing: accendere lampada disabilita timer

**File modificati:**
- `src/logic/engine.js` (gameState, checkTorciaEsaurita, executeCommand, applicaEffetti)
- `src/data-internal/Interazioni.json` (nuova interazione accendi_lampada)

---

### 8.2 Fase 2: Intercettazione (2-3 ore)

**Obiettivo:** Timer luoghi pericolosi

1. ✅ Implementare funzione `checkIntercettazione()`
2. ✅ Definire costante `LUOGHI_PERICOLOSI` con IDs (51, 52, 53, 55, 56, 58) - Esclude ID=54 (terminale) e ID=57 (rifugio)
3. ✅ Integrare check in `executeCommand()` (DOPO comando successo)
4. ✅ Testing: 3 azioni in luogo pericoloso → game over
5. ✅ Testing: cambio luogo resetta counter
6. ✅ Testing: warning a 2 azioni

**File modificati:**
- `src/logic/engine.js` (checkIntercettazione, executeCommand)

---

### 8.3 Fase 3: Lampada Abbandonata (2-3 ore)

**Obiettivo:** Morte se abbandoni fonte luce

1. ✅ Implementare funzione `checkLampadaAbbandonata()`
2. ✅ Integrare check in `executeCommand()` (DOPO NAVIGATION successo)
3. ✅ Testing: posa lampada accesa e allontanarsi → game over
4. ✅ Testing: lampada in inventario → ok
5. ✅ Testing: lampada non accesa → ok (torcia backup)
6. ✅ Testing edge case: torcia esaurita + lampada abbandonata

**File modificati:**
- `src/logic/engine.js` (checkLampadaAbbandonata, executeCommand)

---

### 8.4 Fase 4: Persistenza (1-2 ore)

**Obiettivo:** Save/Load con timers

1. ✅ Modificare `saveGame()` per includere `gameState.timers`
2. ✅ Modificare `loadGame()` per ripristinare `gameState.timers`
3. ✅ Implementare defaults per backward compatibility
4. ✅ Testing: salvare a mossa 4, caricare → continua a 5
5. ✅ Testing: salvare in luogo pericoloso (2 azioni) → caricato correttamente

**File modificati:**
- `web/js/odessa1.js` (saveGame, loadGame)

---

### 8.5 Fase 5: UI Warnings (2-3 ore) - OPZIONALE

**Obiettivo:** Indicatori visuali per timer

1. ✅ Aggiungere HTML per timer-bar in `index.html`
2. ✅ CSS styling per warning items
3. ✅ Implementare `updateTimerWarnings()` in `odessa1.js`
4. ✅ Chiamare dopo ogni comando
5. ✅ Testing: warning visibile quando mosse >= 5
6. ✅ Testing: warning scompare quando lampada accesa

**File modificati:**
- `web/index.html` (timer-bar HTML)
- `web/css/style.css` (o file CSS equivalente)
- `web/js/odessa1.js` (updateTimerWarnings)

---

### 8.6 Fase 6: Polish & QA (2-3 ore)

**Obiettivo:** Testing completo e bug fixing

1. ✅ Eseguire tutti i test cases (T01-T32)
2. ✅ Verificare messaggi game over chiari e informativi
3. ✅ Verificare ordine priorità morti multiple
4. ✅ Testing completo save/load in vari stati
5. ✅ Code review: consistency, naming, documentation
6. ✅ Aggiornare `RELEASE_NOTES.md` con nuove feature

**Durata totale stimata:** 13-19 ore

---

## 9. Alternative e Varianti

### 9.1 Variante: Timer Basato su Tempo Reale

**Descrizione:** Invece di contare mosse, usare timer JavaScript reale

**Pro:**
- ✅ Più realistico (pressione temporale reale)
- ✅ Incentiva decisioni rapide

**Contro:**
- ❌ Penalizza giocatori lenti/disabili
- ❌ Complesso da salvare/ripristinare
- ❌ Problemi con pause/AFK

**Implementazione (sketch):**

```javascript
let torciaStartTime = Date.now();
const TORCIA_DURATA_MS = 3 * 60 * 1000;  // 3 minuti

function checkTorciaEsaurita() {
  if (!gameState.timers.torciaDifettosa) return null;
  
  const elapsed = Date.now() - torciaStartTime;
  
  if (elapsed >= TORCIA_DURATA_MS) {
    // Game Over
  }
}
```

**Raccomandazione:** **NON usare** per gioco text-based dove si legge e riflette

---

### 9.2 Variante: Timer Visibile al Giocatore

**Descrizione:** Mostrare esattamente quante mosse/azioni rimangono

**Pro:**
- ✅ Trasparenza totale
- ✅ Giocatore può pianificare

**Contro:**
- ❌ Meno tensione (sai sempre stato)
- ❌ Rompe immersione

**Implementazione:**

```javascript
// In UI
<div id="timer-display">
  ⏱️ Mosse rimanenti: <span id="moves-left">6</span>
</div>

// Aggiornare dopo ogni comando
document.getElementById('moves-left').textContent = 
  6 - gameState.timers.movementCounter;
```

**Raccomandazione:** **Usare solo warning** (a -1 mossa dalla fine), non counter completo

---

### 9.3 Variante: Modalità Difficoltà

**Descrizione:** Timer configurabili per diverse difficoltà

```javascript
const DIFFICULTY = {
  EASY: {
    TORCIA_MOSSE_MAX: 10,
    INTERCETTAZIONE_AZIONI_MAX: 5,
    WARNINGS_ENABLED: true
  },
  NORMAL: {
    TORCIA_MOSSE_MAX: 6,
    INTERCETTAZIONE_AZIONI_MAX: 3,
    WARNINGS_ENABLED: true
  },
  HARD: {
    TORCIA_MOSSE_MAX: 4,
    INTERCETTAZIONE_AZIONI_MAX: 2,
    WARNINGS_ENABLED: false
  }
};

// Selezionato all'inizio del gioco o in settings
const currentDifficulty = DIFFICULTY.NORMAL;
```

**Raccomandazione:** **Implementare in versione futura** se richiesto da playtest

---

## 10. Documentazione per Giocatore

### 10.1 Sezione AIUTO - Meccaniche di Sopravvivenza

**Aggiungere al comando AIUTO:**

```
═══════════════════════════════════════════
  MECCANICHE DI SOPRAVVIVENZA
═══════════════════════════════════════════

🔦 FONTE DI LUCE
La tua torcia elettrica è difettosa e potrebbe
spegnersi in qualsiasi momento. Trova e accendi
la lampada usando i fiammiferi per evitare di
rimanere al buio.

🚨 ZONE PERICOLOSE
Alcune aree esterne sono pattugliate. Non 
attardarti troppo a lungo nello stesso posto:
potresti essere intercettato!

⚠️ ATTENZIONE
Non allontanarti mai dalla tua fonte di luce
accesa, o rischierai di morire nell'oscurità.

═══════════════════════════════════════════
```

---

### 10.2 Messaggi In-Game Contestuali

**Primo accesso a luogo pericoloso (ID=51):**

```
Sei in una grossa piazza. Restare a lungo fermi in un 
posto all'aperto può essere pericoloso.

💡 SUGGERIMENTO: Non attardarti qui. Se devi fare
qualcosa, fallo rapidamente e poi spostati.
```

**Primo prelievo Lampada:**

```
Hai preso la Lampada.

💡 SUGGERIMENTO: Potresti accenderla con i fiammiferi
che hai in tasca. Una fonte di luce affidabile è
essenziale per la sopravvivenza.
```

---

## 11. Rischi e Mitigazioni

### 11.1 Rischio: Giocatore Bloccato Senza Saperlo

**Scenario:**
- Giocatore a mossa 5, non ha mai visto la lampada
- Lampada è nel luogo 6, ma giocatore in luogo 30
- Impossibile raggiungere luogo 6 in 1 mossa

**Conseguenza:**
- Game Over inevitabile, frustrazione

**Mitigazione:**

1. **Design livelli:** Assicurarsi che lampada sia nel percorso naturale primario
2. **Hint system:** Messaggio a mossa 4 se lampada non ancora prelevata:
   ```javascript
   if (gameState.timers.movementCounter === 4 && !gameState.timers.lampadaPresa) {
     result.message += '\n\n💡 SUGGERIMENTO: La torcia sta per esaurirsi. ' +
       'Forse dovresti cercare una fonte di luce alternativa...';
   }
   ```
3. **Playtest:** Verificare con beta tester se timer è troppo stretto

---

### 11.2 Rischio: False Death (Morte Non Meritata)

**Scenario:**
- Giocatore esplora metodicamente, fa tutto giusto
- Ma conta mosse include ESAMINA, INVENTARIO, etc.
- Arriva a 6 mosse troppo presto

**Mitigazione:**

- Escludere comandi meta (INVENTARIO, AIUTO) dal conteggio
- Contare solo NAVIGATION e ACTION fisiche
- Oppure: aumentare timer a 8-10 mosse

**Test case critico:**

```
1. PRENDI FIAMMIFERI (mossa 1)
2. NORD (mossa 2)
3. PRENDI LAMPADA (mossa 3)
4. ACCENDI LAMPADA (mossa 4)

→ 2 mosse rimanenti, ok
```

vs.

```
1. INVENTARIO (non conta)
2. ESAMINA STANZA (mossa 1)
3. NORD (mossa 2)
4. ESAMINA OGGETTO (mossa 3)
5. PRENDI FIAMMIFERI (mossa 4)
6. SUD (mossa 5)
7. NORD (mossa 6) → GAME OVER prima di trovare lampada

→ Frustrazione
```

**Raccomandazione:** Escludere INVENTARIO, AIUTO, PUNTI, SALVARE, CARICARE dal conteggio

---

### 11.3 Rischio: Bug Save/Load

**Scenario:**
- Salvare a mossa 5, caricare 10 volte
- Counter non incrementa → infinite lives

**Mitigazione:**

- Counter persiste correttamente in save file
- Test: salvare a varie mosse, caricare, verificare counter

**Test case:**

```
1. Nuovo gioco
2. 3 mosse
3. SALVARE
4. 2 mosse (totale 5)
5. Morire (mossa 6)
6. CARICARE
7. Verificare counter = 3 (non 0)
8. 2 mosse → mossa 5 (warning)
9. 1 mossa → morte
```

---

## 12. File Modificati - Summary

| File | Tipo | Modifiche Principali |
|------|------|---------------------|
| `src/logic/engine.js` | EDIT | gameState.timers, checkTorciaEsaurita(), checkIntercettazione(), checkLampadaAbbandonata(), applicaEffetti() esteso, executeCommand() integrazione |
| `src/data-internal/Interazioni.json` | EDIT | Aggiungere interazione "accendi_lampada" |
| `web/js/odessa1.js` | EDIT | saveGame/loadGame serializzazione timers, updateTimerWarnings() (opzionale) |
| `web/index.html` | EDIT | Timer-bar UI (opzionale) |
| `web/css/style.css` | EDIT | Stili timer warnings (opzionale) |

---

## 13. Riferimenti

- [data-modeling.md](./data-modeling.md) - Struttura dati esistente
- [raccomandazioni.md](./raccomandazioni.md) - Best practices progetto
- [sistema-punteggio.md](./sistema-punteggio.md) - Sistema punteggio (non conflitto con timers)
- [engine.js](../src/logic/engine.js) - Game engine corrente
- [Oggetti.json](../src/data-internal/Oggetti.json) - Lista oggetti
- [Luoghi.json](../src/data-internal/Luoghi.json) - Lista luoghi

---

**Document Status:** ✅ Ready for Review  
**Next Step:** Approvazione design → Implementazione Fase 1 (Core Timers)

**Critical Decision Points:**
1. ❓ Contare ESAMINA nel timer mosse? (Raccomandazione: NO)
2. ❓ Game over se abbandoni lampada in QUALSIASI luogo? (Raccomandazione: SÌ, semplice)
3. ❓ Implementare UI warnings visuale? (Raccomandazione: SÌ, migliora UX)
4. ❓ Torcia può salvare da lampada abbandonata se timer torcia disabilitato? (Raccomandazione: NO, logica più semplice)

---

*Ultimo aggiornamento: 29 dicembre 2025*
