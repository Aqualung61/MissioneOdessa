# Sistema di Vittoria e Sequenza Finale - Missione Odessa

**Versione:** 1.1 (proposta aggiornata)  
**Data:** 30 dicembre 2025  
**Status:** Design Document (non implementato)

---

## 0. Verifiche Pre-Implementazione

### 0.1 Oggetto ID=28 - Lista di servizio (DOPPIONE)

**Verifica completata:**
- ✅ Oggetto ID=28 trovato in Oggetti.json
- ❌ **IDLuogo:** `null` (non presente in alcun luogo)
- ❌ **Duplicato di ID=6** (stessa descrizione, stesso nome)
- ❌ Non referenziato in Interazioni.json
- ❌ Non referenziato nel codice sorgente

**Confronto:**

| Campo | ID=6 (USATO) | ID=28 (DOPPIONE) |
|-------|--------------|------------------|
| Oggetto | "Lista di servizio" | "Lista di servizio" |
| Attivo | 3 | 3 |
| IDLuogo | 21 ✅ | null ❌ |
| Descrizione | Identica | Identica |

**Azione richiesta:**
- 🗑️ **Eliminare oggetto ID=28 da Oggetti.json** prima di implementare sistema vittoria
- ✅ Usare solo ID=6 nei check condizioni vittoria

---

## 1. Panoramica Requisiti

Il gioco prevede una **sequenza di vittoria articolata** che si attiva quando il giocatore soddisfa determinate condizioni e ritorna all'atrio iniziale.

### 1.1 Condizioni di Vittoria

**Trigger:** Arrivo al luogo ID=1 (Atrio)

**Prerequisiti (AND logic):**
1. ✅ **Documenti** in inventario (Oggetto ID=35 "Documenti")
2. ✅ **Lista di servizio** in inventario (Oggetto ID=6 "Lista di servizio")
3. ✅ **Dossier** in inventario (Oggetto ID=34 "Dossier")

**Prerequisiti Impliciti (non richiedono check espliciti):**
4. ✅ **NON morto** - Se il giocatore riesce ad arrivare al luogo ID=1, è evidente che è vivo
5. ✅ **Timer NON scaduto** - Il timer torcia scade SOLO se NON sei nell'atrio (tolleranza 1 mossa)

**Se tutte le condizioni soddisfatte:**
→ Attiva sequenza finale in 2 fasi:
  - Fase 1: Atrio (ID=1) - Incontro con Ferenc
  - Fase 2: Barriera americana (ID=59) - Consegna documenti e vittoria

---

### 1.2 Sequenza Narrativa - Luogo ID=1 (Atrio)

**FASE 1A - Primo Testo (Ferenc):**

```
Da un angolo sbuca Ferenc: 
- Sono felice di rivederti, Liebermann. Vedo che hai i documenti: 
molto bene. Herr Wiesenthal saprà farne buon uso - 

Ferenc prende i documenti che tu gli porgi e velocemente gli dà 
una occhiata. Si infila le carte in una logora borsa. 

- Seguimi senza far rumore: sta per albeggiare e bisogna fare presto - 

Apre la porta con cautela e uscite insieme dalla casa.

[Premere BARRA per continuare]
```

**Stato:** `gameState.narrativeState = 'ENDING_PHASE_1A'`

**Input accettato:** QUALSIASI (barra spazio, invio, qualsiasi tasto)

---

**FASE 1B - Secondo Testo (Cammino):**

```
Fai fatica a tenere il suo passo svelto tipico della persona che 
deve sempre fare in fretta e di nascosto. 

Dopo qualche minuto, in cui avete girato per vie secondarie, passato 
reticolati e evitato posti di blocco, si arresta e te ne indica uno 
più avanti. 

- Io sono arrivato. Quella è la barriera col settore americano: 
fai l'indifferente e vedrai che a quest'ora passerai senza problemi. 
Poi prosegui per l'aereoporto: ti aspettano. Io provvederò alla 
consegna dei documenti. Addio - 

Lo guardi scomparire velocemente nel dedalo di strade alle tue spalle, 
tenendosi stretta la sua borsa logora.
```

**Stato:** `gameState.narrativeState = 'ENDING_PHASE_1B'`

**Effetto automatico:** `TELEPORT` a luogo ID=59

---

### 1.3 Sequenza Narrativa - Luogo ID=59 (Barriera)

**Stato iniziale:**
- `gameState.currentLocationId = 59`
- `gameState.narrativeState = 'ENDING_PHASE_2_WAIT'`
- **TUTTE le direzioni BLOCCATE** (non può muoversi)
- **Comando appropriato:** `PORGI DOCUMENTI`
- **Altri comandi:** Restituiscono "Non vedo alcuna utilità in questo."
- **⚠️ Limite comandi inappropriati:** Se il giocatore digita troppi comandi non appropriati (>3), la guardia si insospettisce → **Game Over alternativo**

**Descrizione luogo ID=59:**
```
Sei davanti alla barriera col settore americano. 
Vedi una guardia.
```

---

### 1.4 Game Over Alternativo - Guardia Insospettita

**Trigger:** Troppi comandi inappropriati al luogo ID=59

**Counter:** `gameState.unusefulCommandsCounter`
- Incrementa ad ogni comando ACTION non appropriato (non PORGI DOCUMENTI)
- **NON incrementa** per comandi SYSTEM (INVENTARIO, AIUTO, PUNTI, SALVARE)
- **NON incrementa** per comandi NAVIGATION (già bloccati)
- Limite: **3 comandi inappropriati**

**Messaggio Game Over:**
```
🚨 La guardia nota il tuo comportamento strano e nervoso.

- Cosa state facendo? Venite qui! -

Ti fermano per un controllo più approfondito. Quando scoprono 
i documenti falsi e i dossier segreti che trasporti, sei perduto.

💀 SEI MORTO - Giustiziato come spia occidentale.

[GAME OVER - Guardia insospettita]
```

**ResultType:** `GAME_OVER`, `deathReason: 'GUARDIA_SOSPETTA'`

---

**FASE 2A - Porge Documenti (Comando richiesto):**

**Comando:** `PORGI DOCUMENTI`

**Risposta:**
```
Porgi i documenti e la guardia li guarda con cura. 
Sono attimi importanti.

[Premere BARRA per continuare]
```

**Stato:** `gameState.narrativeState = 'ENDING_PHASE_2A'`

---

**FASE 2B - Guardia Sorride:**

```
La guardia ti guarda, sorride e ti ritorna i documenti. 
Poi solleva la sbarra e ti fa segno di passare.

[Premere BARRA per continuare]
```

**Stato:** `gameState.narrativeState = 'ENDING_PHASE_2B'`

---

**FASE 2C - Vittoria Finale:**

```
Ce l'hai fatta. Sei nel settore americano e fra poco sarai 
su un aereo diretto a Linz. 

I documenti arriveranno a destinazione attraverso i canali 
dei servizi di informazione gestiti da Ferenc. 

Hai terminato la missione!! 

Sei un agente di prima categoria: arrivederci alla tua 
prossima missione, Liebermann.

[VITTORIA]
```

**Stato:** `gameState.ended = true`, `gameState.victory = true`

**ResultType:** `VICTORY`

---

## 2. Architettura Sistema

### 2.1 Estensione gameState

```javascript
let gameState = {
  // ... campi esistenti ...
  
  // === SISTEMA NARRATIVE SEQUENCES ===
  narrativeState: null,        // Stato corrente sequenza narrativa
  narrativePhase: 0,           // Fase corrente (per sequenze multi-step)
  
  // === VITTORIA ===
  victory: false,              // true se gioco vinto
  movementBlocked: false,      // true se NAVIGATION disabilitato (luogo 59)
  unusefulCommandsCounter: 0,  // Counter comandi inappropriati al luogo 59
  
  // === AWAIT CONTINUE ===
  awaitingContinue: false,     // true se in attesa di "premere barra"
  continueCallback: null       // Funzione da chiamare quando si preme barra
};
```

### 2.2 Stati Narrativi (Enum)

```javascript
const NARRATIVE_STATES = {
  NONE: null,
  
  // Sequenza finale - Atrio (ID=1)
  ENDING_PHASE_1A: 'ENDING_PHASE_1A',  // Ferenc parla (primo testo)
  ENDING_PHASE_1B: 'ENDING_PHASE_1B',  // Cammino (secondo testo)
  
  // Sequenza finale - Barriera (ID=59)
  ENDING_PHASE_2_WAIT: 'ENDING_PHASE_2_WAIT',  // Aspetta comando PORGI DOCUMENTI
  ENDING_PHASE_2A: 'ENDING_PHASE_2A',          // Guardia controlla (primo testo)
  ENDING_PHASE_2B: 'ENDING_PHASE_2B',          // Guardia sorride (secondo testo)
  ENDING_PHASE_2C: 'ENDING_PHASE_2C'           // Vittoria finale
};

// Costanti configurabili
const LIMITE_COMANDI_INUTILI = 3;  // Max comandi inappropriati al luogo 59
```

---

## 3. Implementazione Dettagliata

### 3.1 Funzione: Check Condizioni Vittoria

```javascript
/**
 * Verifica se il giocatore ha soddisfatto le condizioni di vittoria.
 * Chiamare DOPO ogni comando NAVIGATION verso luogo ID=1.
 * 
 * @returns {boolean} - true se condizioni soddisfatte
 */
function checkVictoryConditions() {
  // Deve essere nel luogo 1 (Atrio)
  if (gameState.currentLocationId !== 1) {
    return false;
  }
  
  // NOTE: Se il giocatore è arrivato qui, è vivo (prerequisito implicito)
  // Il check gameState.ended non è necessario
  
  // === CHECK OGGETTI IN INVENTARIO ===
  
  const oggettiInInventario = gameState.Oggetti.filter(obj => 
    obj.IDLuogo === 0 && obj.Attivo >= 3
  );
  
  // Documenti (ID=35)
  const hasDocumenti = oggettiInInventario.some(obj => 
    obj.ID === 35 || obj.Oggetto === 'Documenti'
  );
  
  // Lista di servizio (ID=6 SOLO - ID=28 è doppione da eliminare)
  const hasLista = oggettiInInventario.some(obj => 
    obj.ID === 6 || obj.Oggetto === 'Lista di servizio'
  );
  
  // Dossier (ID=34)
  const hasDossier = oggettiInInventario.some(obj => 
    obj.ID === 34 || obj.Oggetto === 'Dossier'
  );
  
  // Verifica condizioni
  const conditionsMet = hasDocumenti && hasLista && hasDossier;
  
  console.log(`🎯 Check vittoria: Documenti=${hasDocumenti}, Lista=${hasLista}, Dossier=${hasDossier}`);
  
  return conditionsMet;
}
```

**Note implementative:**
- ⚠️ Chiamare **SOLO** quando `gameState.currentLocationId === 1`
- ✅ Oggetto "Lista di servizio": solo ID=6 (ID=28 è doppione inutilizzato)
- ✅ Check ID **e** nome oggetto per robustezza (fallback se ID non match)
- ✅ Check `gameState.ended` omesso: se sei al luogo 1, sei vivo (implicito)

---

### 3.2 Funzione: Inizio Sequenza Finale

```javascript
/**
 * Avvia la sequenza finale di vittoria.
 * Chiamare quando checkVictoryConditions() ritorna true.
 * 
 * @returns {Object} - Result object con primo testo Ferenc
 */
function startEndingSequence() {
  console.log('🎉 Inizio sequenza finale di vittoria!');
  
  // Imposta stato narrativo
  gameState.narrativeState = NARRATIVE_STATES.ENDING_PHASE_1A;
  gameState.awaitingContinue = true;
  gameState.narrativePhase = 1;
  
  // Callback per proseguire alla fase 1B
  gameState.continueCallback = function() {
    // Mostra secondo testo (cammino)
    gameState.narrativeState = NARRATIVE_STATES.ENDING_PHASE_1B;
    gameState.awaitingContinue = true;
    gameState.narrativePhase = 2;
    
    // Callback per teleportare a luogo 59
    gameState.continueCallback = function() {
      teleportToBarrier();
    };
    
    return {
      accepted: true,
      resultType: 'NARRATIVE',
      message: ENDING_TEXT_1B,
      awaitingContinue: true,
      showLocation: false
    };
  };
  
  return {
    accepted: true,
    resultType: 'NARRATIVE',
    message: ENDING_TEXT_1A,
    awaitingContinue: true,
    showLocation: false  // Non mostrare descrizione luogo standard
  };
}

// Testi costanti
const ENDING_TEXT_1A = `
Da un angolo sbuca Ferenc: 
- Sono felice di rivederti, Liebermann. Vedo che hai i documenti: 
molto bene. Herr Wiesenthal saprà farne buon uso - 

Ferenc prende i documenti che tu gli porgi e velocemente gli dà 
una occhiata. Si infila le carte in una logora borsa. 

- Seguimi senza far rumore: sta per albeggiare e bisogna fare presto - 

Apre la porta con cautela e uscite insieme dalla casa.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Premere BARRA o INVIO per continuare]
`;

const ENDING_TEXT_1B = `
Fai fatica a tenere il suo passo svelto tipico della persona che 
deve sempre fare in fretta e di nascosto. 

Dopo qualche minuto, in cui avete girato per vie secondarie, passato 
reticolati e evitato posti di blocco, si arresta e te ne indica uno 
più avanti. 

- Io sono arrivato. Quella è la barriera col settore americano: 
fai l'indifferente e vedrai che a quest'ora passerai senza problemi. 
Poi prosegui per l'aereoporto: ti aspettano. Io provvederò alla 
consegna dei documenti. Addio - 

Lo guardi scomparire velocemente nel dedalo di strade alle tue spalle, 
tenendosi stretta la sua borsa logora.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Premere BARRA o INVIO per continuare]
`;
```

---

### 3.3 Funzione: Teleport a Barriera

```javascript
/**
 * Teleporta il giocatore al luogo ID=59 (Barriera americana).
 * Blocca tutti i movimenti tranne comando PORGI DOCUMENTI.
 * 
 * @returns {Object} - Result object con descrizione luogo 59
 */
function teleportToBarrier() {
  console.log('🚀 Teleport a luogo ID=59 (Barriera)');
  
  // Cambia luogo
  gameState.currentLocationId = 59;
  
  // Blocca movimenti
  gameState.movementBlocked = true;
  
  // Reset counter comandi inappropriati
  gameState.unusefulCommandsCounter = 0;
  
  // Imposta stato narrativo
  gameState.narrativeState = NARRATIVE_STATES.ENDING_PHASE_2_WAIT;
  gameState.awaitingContinue = false;  // Non in attesa, aspetta comando
  gameState.narrativePhase = 3;
  
  // Trova descrizione luogo 59
  const luogo59 = global.odessaData.Luoghi.find(l => l.ID === 59);
  const descrizione = luogo59 ? luogo59.Descrizione : 'Sei davanti alla barriera.';
  
  return {
    accepted: true,
    resultType: 'TELEPORT',
    message: descrizione + '\n\n💡 SUGGERIMENTO: Devi porgere i documenti alla guardia.',
    showLocation: true,
    locationId: 59
  };
}
```

**Note:**
- ⚠️ `movementBlocked = true` impedisce TUTTI i comandi NAVIGATION
- ⚠️ `unusefulCommandsCounter = 0` reset counter per nuova sequenza
- ✅ Mostra descrizione luogo + hint per non bloccare il giocatore

---

### 3.4 Funzione: Game Over Guardia Insospettita

```javascript
/**
 * Game Over per comportamento sospetto al luogo 59.
 * Chiamare quando unusefulCommandsCounter >= LIMITE_COMANDI_INUTILI.
 * 
 * @returns {Object} - GameOver result
 */
function gameOverGuardiaSospetta() {
  console.log('💀 Game Over: Guardia insospettita');
  
  gameState.ended = true;
  
  return {
    accepted: true,
    resultType: 'GAME_OVER',
    message: `
🚨 La guardia nota il tuo comportamento strano e nervoso.

- Cosa state facendo? Venite qui! -

Ti fermano per un controllo più approfondito. Quando scoprono 
i documenti falsi e i dossier segreti che trasporti, sei perduto.

💀 SEI MORTO - Giustiziato come spia occidentale.

[GAME OVER - Guardia insospettita]
    `,
    deathReason: 'GUARDIA_SOSPETTA',
    showLocation: false
  };
}
```

**Note implementative:**
- ✅ Chiamare quando `gameState.unusefulCommandsCounter >= 3`
- ✅ Imposta `gameState.ended = true` per terminare gioco
- ⚠️ Questo game over è alternativo alla vittoria (mutually exclusive)

---

### 3.5 Interazione: PORGI DOCUMENTI (Luogo 59)

**File:** `src/data-internal/Interazioni.json`

```json
{
  "id": "porgi_documenti_59",
  "trigger": {
    "verbo": "PORGERE",
    "oggetto": "DOCUMENTI"
  },
  "condizioni": {
    "luogo": 59,
    "prerequisiti": [
      {
        "tipo": "STATO_NARRATIVO",
        "valore": "ENDING_PHASE_2_WAIT"
      }
    ]
  },
  "risposta": "Porgi i documenti e la guardia li guarda con cura. Sono attimi importanti.\n\n[Premere BARRA o INVIO per continuare]",
  "effetti": [
    {
      "tipo": "SET_NARRATIVE_STATE",
      "state": "ENDING_PHASE_2A"
    },
    {
      "tipo": "AWAIT_CONTINUE",
      "callback": "continueVictoryPhase2B"
    }
  ],
  "ripetibile": false
}
```

**Note:**
- ⚠️ Richiede nuovo tipo prerequisito: `STATO_NARRATIVO`
- ⚠️ Richiede nuovo tipo effetto: `SET_NARRATIVE_STATE` e `AWAIT_CONTINUE`

---

### 3.6 Funzione: Continue Victory Phase 2B

```javascript
/**
 * Continua sequenza finale - Fase 2B (Guardia sorride).
 * Chiamata da callback AWAIT_CONTINUE dopo FASE 2A.
 * 
 * @returns {Object} - Result object con testo guardia sorride
 */
function continueVictoryPhase2B() {
  gameState.narrativeState = NARRATIVE_STATES.ENDING_PHASE_2B;
  gameState.awaitingContinue = true;
  gameState.narrativePhase = 4;
  
  // Callback per vittoria finale
  gameState.continueCallback = function() {
    return showVictoryFinal();
  };
  
  return {
    accepted: true,
    resultType: 'NARRATIVE',
    message: ENDING_TEXT_2B,
    awaitingContinue: true,
    showLocation: false
  };
}

const ENDING_TEXT_2B = `
La guardia ti guarda, sorride e ti ritorna i documenti. 
Poi solleva la sbarra e ti fa segno di passare.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Premere BARRA o INVIO per continuare]
`;
```

---

### 3.7 Funzione: Vittoria Finale

```javascript
/**
 * Mostra schermata finale di vittoria.
 * Chiamata da callback AWAIT_CONTINUE dopo FASE 2B.
 * 
 * @returns {Object} - Result object con messaggio vittoria
 */
function showVictoryFinal() {
  console.log('🎉🎉🎉 VITTORIA!');
  
  // Imposta stato vittoria
  gameState.ended = true;
  gameState.victory = true;
  gameState.narrativeState = NARRATIVE_STATES.ENDING_PHASE_2C;
  gameState.awaitingContinue = false;
  gameState.narrativePhase = 5;
  
  return {
    accepted: true,
    resultType: 'VICTORY',
    message: VICTORY_TEXT,
    showLocation: false
  };
}

const VICTORY_TEXT = `
╔═══════════════════════════════════════╗
║   🎉 MISSIONE COMPLETATA! 🎉          ║
╚═══════════════════════════════════════╝

Ce l'hai fatta. Sei nel settore americano e fra poco sarai 
su un aereo diretto a Linz. 

I documenti arriveranno a destinazione attraverso i canali 
dei servizi di informazione gestiti da Ferenc. 

Hai terminato la missione!! 

Sei un agente di prima categoria: arrivederci alla tua 
prossima missione, Liebermann.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[VITTORIA]

Vuoi giocare di nuovo? (s/n)
`;
```

---

### 3.8 Integrazione in executeCommand()

```javascript
export function executeCommand(parseResult) {
  if (!parseResult || parseResult.IsValid !== true) {
    return { /* ... errore ... */ };
  }
  
  // ====================================================
  // STEP 0: Check stato awaiting continue
  // ====================================================
  if (gameState.awaitingContinue) {
    // Qualsiasi input processa il continue
    if (gameState.continueCallback) {
      const result = gameState.continueCallback();
      return result;
    } else {
      console.error('❌ awaitingContinue=true ma nessun callback definito');
      gameState.awaitingContinue = false;
      return { accepted: false, resultType: 'ERROR', message: 'Errore stato narrativo' };
    }
  }
  
  // ====================================================
  // STEP 1: Check timer torcia (come prima)
  // ====================================================
  const torciaGameOver = checkTorciaEsaurita(parseResult);
  if (torciaGameOver) return torciaGameOver;
  
  // ====================================================
  // STEP 2: Processa comando normalmente
  // ====================================================
  let result;
  
  switch (parseResult.CommandType) {
    case 'NAVIGATION':
      // === CHECK: Movimenti bloccati? ===
      if (gameState.movementBlocked) {
        return {
          accepted: true,
          resultType: 'BLOCKED',
          message: '🚫 Non puoi muoverti ora. Devi completare la sequenza corrente.',
          showLocation: false
        };
      }
      
      result = handleNavigation(parseResult);
      
      // === CHECK: Vittoria se arrivo a luogo 1 ===
      if (result.accepted && result.resultType === 'OK') {
        if (gameState.currentLocationId === 1 && checkVictoryConditions()) {
          // Attiva sequenza finale
          return startEndingSequence();
        }
        
        // Check lampada abbandonata (come prima)
        const lampadaGameOver = checkLampadaAbbandonata();
        if (lampadaGameOver) return lampadaGameOver;
      }
      break;
    
    case 'ACTION':
      // === CHECK: Luogo 59 - Comando appropriato? ===
      if (gameState.currentLocationId === 59 && 
          gameState.narrativeState === NARRATIVE_STATES.ENDING_PHASE_2_WAIT) {
        
        const concept = (parseResult.VerbConcept || '').toUpperCase();
        const noun = (parseResult.NounConcept || parseResult.CanonicalNoun || '').toUpperCase();
        
        // Comando appropriato: PORGERE DOCUMENTI
        if (concept === 'PORGERE' && noun === 'DOCUMENTI') {
          // Processa interazione normalmente (cercaEseguiInterazione gestirà)
          result = handleAction(parseResult);
        } else {
          // Comando inappropriato
          gameState.unusefulCommandsCounter = (gameState.unusefulCommandsCounter || 0) + 1;
          
          console.log(`⚠️ Comando inappropriato al luogo 59: ${concept} ${noun} (counter: ${gameState.unusefulCommandsCounter})`);
          
          // Check limite superato
          if (gameState.unusefulCommandsCounter >= LIMITE_COMANDI_INUTILI) {
            return gameOverGuardiaSospetta();
          }
          
          // Risposta generica
          return {
            accepted: true,
            resultType: 'OK',
            message: 'Non vedo alcuna utilità in questo.',
            showLocation: false
          };
        }
      } else {
        // Altri luoghi: gestione normale
        result = handleAction(parseResult);
      }
      break;
    
    case 'SYSTEM':
      result = handleSystem(parseResult);
      break;
    
    default:
      return { accepted: false, resultType: 'ERROR', message: 'Tipo comando sconosciuto' };
  }
  
  // ====================================================
  // STEP 3: Check intercettazione (come prima)
  // ====================================================
  if (result.accepted && result.resultType !== 'GAME_OVER') {
    const intercettazioneResult = checkIntercettazione();
    if (intercettazioneResult?.resultType === 'GAME_OVER') {
      return intercettazioneResult;
    } else if (intercettazioneResult?.type === 'WARNING') {
      result.message += '\n\n' + intercettazioneResult.message;
    }
  }
  
  return result;
}
```

**Ordine check critici:**
1. **awaitingContinue** (priorità massima - blocca tutto)
2. Timer torcia (solo se non meta-comando)
3. Movimenti bloccati (sequenza finale - solo NAVIGATION)
4. Vittoria (se NAVIGATION a luogo 1)
5. Comandi inappropriati luogo 59 (solo ACTION, esclusi SYSTEM)
6. Elaborazione normale
7. Intercettazione

**Meta-comandi (SYSTEM):**
- ✅ INVENTARIO, AIUTO, PUNTI, SALVARE, CARICARE
- ✅ **NON incrementano** timer mosse
- ✅ **NON incrementano** unusefulCommandsCounter
- ✅ Sempre consentiti (anche al luogo 59)

---

## 4. Gestione Input "Premere Barra"

### 4.1 Problema Tecnico

**Attuale:** Sistema input processa comandi testuali parsati

**Richiesto:** Premere BARRA (o INVIO) per continuare, senza parsing

### 4.2 Soluzione A - Bypass Parser (RACCOMANDATO)

**In frontend (odessa1.js):**

```javascript
async function sendCommand(input) {
  // === CHECK: In attesa di continue? ===
  if (engineModule.getGameState().awaitingContinue) {
    // Bypass parser, chiama direttamente continue
    const result = await engineModule.processContinue();
    displayResult(result);
    return;
  }
  
  // Altrimenti, parsing normale
  const parseResult = parserModule.parseCommand(input);
  const result = await engineModule.executeCommand(parseResult);
  displayResult(result);
}
```

**In engine.js:**

```javascript
export function processContinue() {
  if (!gameState.awaitingContinue) {
    return { 
      accepted: false, 
      resultType: 'ERROR', 
      message: 'Non in attesa di input continue' 
    };
  }
  
  if (gameState.continueCallback) {
    const result = gameState.continueCallback();
    return result;
  } else {
    console.error('❌ Nessun callback per continue');
    gameState.awaitingContinue = false;
    return { 
      accepted: false, 
      resultType: 'ERROR', 
      message: 'Errore callback continue' 
    };
  }
}

export function getGameState() {
  return gameState;
}
```

**Pro:**
- ✅ Semplice da implementare
- ✅ Input utente può essere qualsiasi (barra, invio, qualsiasi comando)
- ✅ Non richiede modifiche al parser

**Contro:**
- ⚠️ Richiede access al gameState dal frontend

---

### 4.3 Soluzione B - Comando Speciale "CONTINUE"

**Alternativa:** Mappare input vuoto o barra a comando speciale

```javascript
// In frontend
async function sendCommand(input) {
  // Se input vuoto o solo spazi, consideralo "CONTINUE"
  const trimmed = input.trim();
  if (trimmed === '' || trimmed === ' ') {
    input = 'CONTINUE';
  }
  
  // Parsing normale
  const parseResult = parserModule.parseCommand(input);
  // ...
}
```

```javascript
// In parser - aggiungere comando speciale
if (input.toUpperCase() === 'CONTINUE') {
  return {
    IsValid: true,
    CommandType: 'SYSTEM',
    CanonicalVerb: 'CONTINUE',
    VerbConcept: 'CONTINUE'
  };
}
```

```javascript
// In engine - gestire comando CONTINUE
case 'SYSTEM':
  const concept = parseResult.VerbConcept || parseResult.CanonicalVerb;
  
  if (concept === 'CONTINUE') {
    if (gameState.awaitingContinue && gameState.continueCallback) {
      return gameState.continueCallback();
    } else {
      return { 
        accepted: false, 
        resultType: 'ERROR', 
        message: 'Comando CONTINUE non valido ora' 
      };
    }
  }
  // ... altri comandi SYSTEM ...
```

**Pro:**
- ✅ Usa architettura esistente (parser → engine)
- ✅ No accesso diretto a gameState da frontend

**Contro:**
- ⚠️ Richiede modifiche al parser
- ⚠️ Input vuoto potrebbe confondere utente

---

### 4.4 Raccomandazione

**Usa Soluzione A (Bypass Parser):**
- Più pulita dal punto di vista UX
- Frontend controlla `awaitingContinue` flag e bypassa parser
- Qualsiasi input (anche comando normale) fa avanzare
- User-friendly: se utente scrive "nord" per errore, non blocca

---

## 5. Persistenza (Save/Load)

### 5.1 Salvataggio Stato Narrativo

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
      timers: gameState.timers,
      
      // === NUOVO: Stato narrativo e vittoria ===
      narrativeState: gameState.narrativeState,
      narrativePhase: gameState.narrativePhase,
      victory: gameState.victory,
      movementBlocked: gameState.movementBlocked,
      unusefulCommandsCounter: gameState.unusefulCommandsCounter,
      awaitingContinue: gameState.awaitingContinue
      
      // NOTE: continueCallback NON è serializzabile (è funzione)
      // Deve essere ricostruito al load in base a narrativeState
    };
    
    localStorage.setItem('odessa_save', JSON.stringify(savedState));
    console.log('✅ Partita salvata con stato narrativo');
    return true;
  } catch (error) {
    console.error('❌ Errore salvataggio:', error);
    return false;
  }
}
```

---

### 5.2 Caricamento e Ricostruzione Callback

```javascript
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
    gameState.timers = loadedState.timers;
    
    // === NUOVO: Ripristina stato narrativo ===
    gameState.narrativeState = loadedState.narrativeState || null;
    gameState.narrativePhase = loadedState.narrativePhase || 0;
    gameState.victory = loadedState.victory || false;
    gameState.movementBlocked = loadedState.movementBlocked || false;
    gameState.unusefulCommandsCounter = loadedState.unusefulCommandsCounter || 0;
    gameState.awaitingContinue = loadedState.awaitingContinue || false;
    
    // === RICOSTRUISCI CALLBACK in base a narrativeState ===
    gameState.continueCallback = reconstructCallback(gameState.narrativeState);
    
    console.log('✅ Partita caricata con stato narrativo:', gameState.narrativeState);
    return true;
  } catch (error) {
    console.error('❌ Errore caricamento:', error);
    return false;
  }
}

/**
 * Ricostruisce callback in base allo stato narrativo salvato.
 * 
 * @param {string} narrativeState - Stato narrativo corrente
 * @returns {Function|null} - Callback appropriato o null
 */
function reconstructCallback(narrativeState) {
  switch (narrativeState) {
    case NARRATIVE_STATES.ENDING_PHASE_1A:
      // Callback per andare a fase 1B
      return function() {
        gameState.narrativeState = NARRATIVE_STATES.ENDING_PHASE_1B;
        gameState.awaitingContinue = true;
        gameState.narrativePhase = 2;
        gameState.continueCallback = function() {
          return teleportToBarrier();
        };
        return {
          accepted: true,
          resultType: 'NARRATIVE',
          message: ENDING_TEXT_1B,
          awaitingContinue: true,
          showLocation: false
        };
      };
    
    case NARRATIVE_STATES.ENDING_PHASE_1B:
      // Callback per teleport a luogo 59
      return function() {
        return teleportToBarrier();
      };
    
    case NARRATIVE_STATES.ENDING_PHASE_2A:
      // Callback per fase 2B
      return function() {
        return continueVictoryPhase2B();
      };
    
    case NARRATIVE_STATES.ENDING_PHASE_2B:
      // Callback per vittoria finale
      return function() {
        return showVictoryFinal();
      };
    
    default:
      return null;
  }
}
```

**Note implementative:**
- ⚠️ Callback NON serializzabili in JSON → ricostruire al load
- ✅ Usa `narrativeState` per determinare quale callback ricostruire
- ✅ Se save in mezzo a sequenza, ripristina correttamente

---

### 5.3 Problemi Save/Load Durante Sequenza

**Scenario problematico:**
- Giocatore è in ENDING_PHASE_1A (Ferenc parla)
- Salva partita (comando SALVARE funziona?)
- Chiude gioco
- Riapre e carica
- Si aspetta di vedere testo Ferenc + "Premere BARRA"

**Soluzione:**

1. **Opzione A - Disabilitare SALVARE durante sequenza:**
   ```javascript
   case 'SALVARE':
     if (gameState.awaitingContinue || gameState.narrativeState !== null) {
       return {
         accepted: true,
         resultType: 'BLOCKED',
         message: '🚫 Non puoi salvare durante una sequenza narrativa.',
         showLocation: false
       };
     }
     // ... salva normalmente ...
   ```

2. **Opzione B - Salvare e ripristinare testo corrente:**
   - Salvare anche `currentNarrativeText` nel save file
   - Al load, mostrare quel testo + "Premere BARRA"
   - Più complesso ma user-friendly

**Raccomandazione:** **Opzione A** (blocca salvataggio durante sequenza)

---

## 6. UI/UX Frontend

### 6.1 Indicatore Visuale "Premere BARRA"

**File:** `web/index.html`

```html
<div id="continue-prompt" class="continue-prompt hidden">
  <span class="continue-text">▸ Premere BARRA SPAZIATRICE o INVIO per continuare</span>
  <span class="continue-blink">_</span>
</div>
```

**File:** `web/css/style.css`

```css
.continue-prompt {
  position: fixed;
  bottom: 60px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.9);
  color: #00ff00;
  padding: 15px 30px;
  border-radius: 8px;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  border: 2px solid #00ff00;
  z-index: 2000;
}

.continue-prompt.hidden {
  display: none;
}

.continue-blink {
  animation: blink 1s infinite;
  margin-left: 5px;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}
```

**File:** `web/js/odessa1.js` - Update UI

```javascript
function displayResult(result) {
  // ... gestione result normale ...
  
  // === Mostra/Nascondi continue prompt ===
  const continuePrompt = document.getElementById('continue-prompt');
  
  if (result.awaitingContinue) {
    continuePrompt.classList.remove('hidden');
  } else {
    continuePrompt.classList.add('hidden');
  }
  
  // === Gestione VICTORY ===
  if (result.resultType === 'VICTORY') {
    // Mostra messaggio vittoria + disabilita input (opzionale)
    disableInput();
    showVictoryOverlay();
  }
}

function disableInput() {
  const inputField = document.getElementById('command-input');
  if (inputField) {
    inputField.disabled = true;
    inputField.placeholder = 'Gioco terminato';
  }
}

function showVictoryOverlay() {
  // Opzionale: overlay celebrazione con confetti, etc.
  // Vedere librerie tipo canvas-confetti
}
```

---

### 6.2 Keyboard Handling Barra Spazio

```javascript
// In odessa1.js - Event listener tastiera
document.getElementById('command-input').addEventListener('keydown', function(e) {
  // INVIO: submit normale (già gestito)
  if (e.key === 'Enter') {
    e.preventDefault();
    const input = this.value.trim();
    sendCommand(input);
    this.value = '';
    return;
  }
  
  // === BARRA SPAZIATRICE: Continue se awaiting ===
  if (e.key === ' ' && engineModule.getGameState().awaitingContinue) {
    e.preventDefault();  // Previeni spazio in input field
    sendCommand('');     // Trigger continue (input vuoto)
    return;
  }
});
```

**Note:**
- ✅ BARRA funziona SOLO se `awaitingContinue === true`
- ✅ Altrimenti, barra spazio è normale (scrivere comandi)
- ⚠️ Richiede access a `gameState` dal frontend (via `getGameState()`)

---

## 7. Testing - Test Cases

### 7.1 Test Condizioni Vittoria

| ID | Descrizione | Setup | Expected |
|----|-------------|-------|----------|
| V01 | Vittoria con tutti oggetti | Documenti+Lista+Dossier in inventario, vai a luogo 1 | Sequenza finale inizia |
| V02 | NO vittoria senza Documenti | Solo Lista+Dossier, vai a luogo 1 | Nessuna sequenza, luogo normale |
| V03 | NO vittoria senza Lista | Solo Documenti+Dossier, vai a luogo 1 | Nessuna sequenza |
| V04 | NO vittoria senza Dossier | Solo Documenti+Lista, vai a luogo 1 | Nessuna sequenza |
| V05 | NO vittoria se morto | Tutti oggetti, ma gameState.ended=true | Nessuna sequenza |
| V06 | Vittoria al secondo ritorno | Prima volta senza oggetti, seconda volta con tutti | Sequenza alla seconda |

---

### 7.2 Test Sequenza Narrativa

| ID | Descrizione | Azioni | Expected |
|----|-------------|--------|----------|
| V10 | Sequenza completa | Trigger vittoria → BARRA → BARRA → PORGI DOCUMENTI → BARRA → BARRA | Vittoria finale |
| V11 | Testo Ferenc appare | Trigger vittoria | Testo Ferenc con "Premere BARRA" |
| V12 | Continue fase 1A→1B | In fase 1A, premi BARRA | Testo cammino appare |
| V13 | Teleport dopo fase 1B | In fase 1B, premi BARRA | Luogo 59, movimenti bloccati |
| V14 | Bloccato al luogo 59 | Al luogo 59, prova NORD | Messaggio "Non puoi muoverti" |
| V15 | Porgi documenti funziona | Al luogo 59, PORGI DOCUMENTI | Testo guardia controlla |
| V16 | Comando inappropriato | Al luogo 59, PRENDI BASTONE | "Non vedo alcuna utilità in questo" |
| V17 | Counter incrementa | Al luogo 59, 2 comandi inappropriati | Counter = 2, nessun game over |
| V18 | Game over dopo 3 inappropriati | Al luogo 59, NORD + PRENDI X + ESAMINA Y | Game Over guardia sospetta |
| V19 | Meta-comandi OK | Al luogo 59, INVENTARIO + AIUTO | Funzionano normalmente, counter non incrementa |
| V20 | PORGI funziona dopo inappropriati | Al luogo 59, 2 inappropriati + PORGI DOCUMENTI | Vittoria procede normalmente |

---

### 7.3 Test Save/Load Durante Sequenza

| ID | Descrizione | Azioni | Expected |
|----|-------------|--------|----------|
| V25 | Salvare durante fase 1A | In fase 1A Ferenc, comando SALVARE | Messaggio "Non puoi salvare ora" (se Opzione A) |
| V26 | Salvare prima sequenza | Con oggetti ma non ancora a luogo 1, SALVARE | Salvataggio ok |
| V27 | Caricare dopo vittoria | Vinci, salva, carica | Stato vittoria ripristinato |
| V28 | Salvare al luogo 59 | Al luogo 59 pre-PORGI, comando SALVARE | Bloccato (Opzione A) |
| V29 | Salvare con counter inappropriati | Al luogo 59, 2 inappropriati, SALVARE | Counter salvato = 2 |
| V30 | Caricare con counter | Salva con counter=2, carica, 1 inappropriato | Game Over (totale 3) |

---

### 7.4 Test Edge Cases

| ID | Descrizione | Scenario | Expected |
|----|-------------|----------|----------|
| V35 | Comando errato durante continue | In fase 1A, scrivi "nord" invece di premere BARRA | Avanza comunque (Soluzione A) |
| V36 | INVENTARIO al luogo 59 | Al luogo 59, comando INVENTARIO | Funziona, counter NON incrementa |
| V37 | AIUTO al luogo 59 | Al luogo 59, comando AIUTO | Funziona, counter NON incrementa |
| V38 | Vittoria con timer torcia attivo | Vittoria a mossa 5 (timer attivo) | Sequenza finale, timer disabilitato |
| V39 | Vittoria in luogo pericoloso | Luogo 1 è anche pericoloso? No, ma test comunque | Timer intercettazione non interferisce |
| V40 | Ritorno a luogo 1 dopo vittoria | Dopo vittoria, caricare save precedente e tornare a luogo 1 | Non trigger nuova vittoria (già vinto) |
| V41 | NAVIGATION bloccato non incrementa | Al luogo 59, NORD (bloccato) | Counter NON incrementa |

---

## 8. Estensioni Future (Post-MVP)

### 8.1 Multiple Ending (Opzionale)

**Scenario:** Diversi finali basati su oggetti portati

**Esempio:**
- **Ending A (Ottimale):** Documenti + Lista + Dossier + Fascicolo
  → Ferenc: "Hai fatto un lavoro eccezionale!"
  
- **Ending B (Standard):** Documenti + Lista + Dossier
  → Ferenc: "Molto bene, Liebermann."
  
- **Ending C (Minimo):** Solo Documenti
  → Ferenc: "Peccato non aver trovato altro, ma i documenti sono l'essenziale."

**Implementazione:**

```javascript
function determineEnding() {
  const inv = gameState.Oggetti.filter(o => o.IDLuogo === 0);
  
  const hasDocumenti = inv.some(o => o.Oggetto === 'Documenti');
  const hasLista = inv.some(o => o.Oggetto === 'Lista di servizio');
  const hasDossier = inv.some(o => o.Oggetto === 'Dossier');
  const hasFascicolo = inv.some(o => o.Oggetto === 'Fascicolo');
  
  if (hasDocumenti && hasLista && hasDossier && hasFascicolo) {
    return 'ENDING_A_OPTIMAL';
  } else if (hasDocumenti && hasLista && hasDossier) {
    return 'ENDING_B_STANDARD';
  } else if (hasDocumenti) {
    return 'ENDING_C_MINIMAL';
  } else {
    return null;  // Non può vincere
  }
}
```

---

### 8.2 Statistiche Finale

**Mostrare statistiche al termine:**

```
╔═══════════════════════════════════════╗
║   🎉 MISSIONE COMPLETATA! 🎉          ║
╚═══════════════════════════════════════╝

Ce l'hai fatta, Liebermann!

📊 STATISTICHE MISSIONE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏱️  Mosse totali:       45
🗺️  Luoghi scoperti:    38/57
🔍 Oggetti raccolti:   7
🎯 Misteri risolti:    5/9
🏆 Punteggio:          87

🌟 RANKING: Agente Esperto

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Vuoi giocare di nuovo? (s/n)
```

**Integrazione con sistema punteggio:** Se implementato, mostrare punteggio finale

---

### 8.3 Achievements Post-Vittoria

**Sbloccare achievement speciali:**

```javascript
const ACHIEVEMENTS = {
  SPEED_RUN: {
    name: 'Velocista',
    condition: (stats) => stats.mosse <= 30,
    message: '⚡ Hai completato la missione in meno di 30 mosse!'
  },
  COMPLETIONIST: {
    name: 'Collezionista',
    condition: (stats) => stats.oggettiRaccolti >= 10,
    message: '📦 Hai raccolto tutti gli oggetti disponibili!'
  },
  EXPLORER: {
    name: 'Esploratore',
    condition: (stats) => stats.luoghiScoperti === 57,
    message: '🗺️ Hai esplorato tutti i luoghi del gioco!'
  }
};
```

---

## 9. Rischi e Mitigazioni

### 9.1 Rischio: Giocatore Confuso al Luogo 59

**Problema:** Arrivi a luogo 59, non capisci cosa fare

**Mitigazione:**
- ✅ Hint esplicito: "Devi porgere i documenti alla guardia" (in descrizione luogo)
- ✅ Descrizione luogo chiara: "Vedi una guardia"
- ✅ Comandi inappropriati: "Non vedo alcuna utilità in questo" (messaggio neutro)
- ⚠️ Dopo 3 tentativi: Game Over con messaggio chiaro su cosa è andato storto
- ✅ Meta-comandi (INVENTARIO, AIUTO) sempre disponibili per non bloccare completamente

---

### 9.2 Rischio: Trigger Accidentale Prima di Esplorare

**Problema:** Giocatore torna a luogo 1 con oggetti ma non ha finito esplorazione

**Mitigazione:**

**Opzione A - Prompt Conferma:**
```javascript
function checkVictoryConditions() {
  // ... check oggetti ...
  
  if (conditionsMet) {
    // Prima di iniziare sequenza, chiedi conferma
    return {
      accepted: true,
      resultType: 'CONFIRM_VICTORY',
      message: `
Ferenc ti aspetta in un angolo dell'atrio.

Hai con te tutti i documenti necessari. Se esci ora con lui, 
la missione terminerà.

Sei pronto a completare la missione e uscire? (s/n)
      `,
      awaitingConfirm: true
    };
  }
}
```

**Opzione B - Punto di Non Ritorno Esplicito:**
- Ferenc non appare automaticamente
- Serve comando speciale: "CHIAMA FERENC" o "ESCI"
- Giocatore ha controllo totale

**Raccomandazione:** **Opzione A** (prompt conferma), più user-friendly

---

### 9.3 Rischio: Meta-Comandi Contano Come Inappropriati?

**Problema:** Giocatore al luogo 59 usa INVENTARIO, AIUTO per capire cosa fare

**Decisione:**
- ✅ **Meta-comandi NON contano** come inappropriati
- ✅ INVENTARIO, AIUTO, PUNTI, SALVARE, CARICARE sempre OK
- ✅ Solo comandi ACTION (es. PRENDI, ESAMINA, APRI) incrementano counter
- ✅ Comandi NAVIGATION già bloccati (messaggio diverso)

**Rationale:**
- Meta-comandi sono UI/sistema, non azioni in-game
- Permettere al giocatore di orientarsi senza penalità
- Separazione logica: comandi diegetici vs non-diegetici

**Implementazione:**
```javascript
// In executeCommand()
switch (parseResult.CommandType) {
  case 'SYSTEM':
    // Meta-comandi: sempre OK, non incrementano counter
    result = handleSystem(parseResult);
    break;
  
  case 'ACTION':
    // Solo qui check inappropriati e incremento counter
    if (gameState.currentLocationId === 59 /* ... */) {
      // gestione counter
    }
    break;
}
```

---

### 9.4 Rischio: Bug Durante Sequenza

**Problema:** Errore JavaScript durante callback → giocatore bloccato

**Mitigazione:**

```javascript
function processContinue() {
  if (!gameState.awaitingContinue) {
    return { accepted: false, resultType: 'ERROR', message: 'Errore stato' };
  }
  
  try {
    if (gameState.continueCallback) {
      const result = gameState.continueCallback();
      return result;
    } else {
      throw new Error('Nessun callback definito');
    }
  } catch (error) {
    console.error('❌ Errore durante continue:', error);
    
    // Reset stato per sbloccare giocatore
    gameState.awaitingContinue = false;
    gameState.narrativeState = null;
    gameState.movementBlocked = false;
    
    return {
      accepted: false,
      resultType: 'ERROR',
      message: `Errore durante sequenza narrativa. Stato resettato.\n\nPuoi continuare a giocare normalmente.`
    };
  }
}
```

**Strategia:** Try-catch + reset stato in caso di errore

---

## 10. Roadmap Implementazione

### 10.1 Fase 1: Core Vittoria (3-4 ore)

**Obiettivo:** Check condizioni + trigger sequenza

1. ✅ Estendere `gameState` con campi narrativi
2. ✅ Implementare `checkVictoryConditions()`
3. ✅ Implementare `startEndingSequence()` (solo FASE 1A testo Ferenc)
4. ✅ Implementare `processContinue()` e bypass parser in frontend
5. ✅ Integrare check vittoria in `executeCommand()` → NAVIGATION a luogo 1
6. ✅ Testing: Vittoria trigger quando hai oggetti e vai a luogo 1

**File modificati:**
- `src/logic/engine.js` (gameState, checkVictoryConditions, startEndingSequence, processContinue, executeCommand)
- `web/js/odessa1.js` (bypass parser se awaitingContinue)

---

### 10.2 Fase 2: Sequenza Completa (2-3 ore)

**Obiettivo:** Implementare tutte le fasi

1. ✅ Implementare FASE 1B (testo cammino) in callback FASE 1A
2. ✅ Implementare `teleportToBarrier()` (luogo 59 + blocco movimenti)
3. ✅ Implementare interazione `porgi_documenti_59` in Interazioni.json
4. ✅ Implementare effetti `SET_NARRATIVE_STATE` e `AWAIT_CONTINUE` in `applicaEffetti()`
5. ✅ Implementare `continueVictoryPhase2B()` (guardia sorride)
6. ✅ Implementare `showVictoryFinal()` (vittoria)
7. ✅ Testing: Sequenza completa dall'inizio alla fine

**File modificati:**
- `src/logic/engine.js` (teleportToBarrier, continueVictoryPhase2B, showVictoryFinal, applicaEffetti)
- `src/data-internal/Interazioni.json` (nuova interazione porgi_documenti_59)

---

### 10.3 Fase 3: Blocco Movimenti/Azioni (1-2 ore)

**Obiettivo:** Gestire limitazioni al luogo 59

1. ✅ Implementare check `movementBlocked` in `executeCommand()` → NAVIGATION
2. ✅ Implementare check `allowedActions` in `executeCommand()` → ACTION
3. ✅ Implementare `getHintForCurrentState()` per messaggi di aiuto
4. ✅ Testing: Provare comandi non permessi al luogo 59

**File modificati:**
- `src/logic/engine.js` (executeCommand, getHintForCurrentState)

---

### 10.4 Fase 4: Persistenza (2-3 ore)

**Obiettivo:** Save/Load con sequenza narrativa

1. ✅ Modificare `saveGame()` per includere stato narrativo
2. ✅ Modificare `loadGame()` per ripristinare stato narrativo
3. ✅ Implementare `reconstructCallback()` per ricostruire callbacks
4. ✅ Implementare blocco SALVARE durante sequenza (Opzione A)
5. ✅ Testing: Salvare/caricare in vari punti della sequenza

**File modificati:**
- `web/js/odessa1.js` (saveGame, loadGame, reconstructCallback)
- `src/logic/engine.js` (blocco SALVARE in executeCommand)

---

### 10.5 Fase 5: UI Continue Prompt (1-2 ore) - OPZIONALE

**Obiettivo:** Indicatore visuale "Premere BARRA"

1. ✅ Aggiungere HTML `#continue-prompt` in index.html
2. ✅ CSS styling per continue prompt con animazione blink
3. ✅ JavaScript per mostrare/nascondere prompt in `displayResult()`
4. ✅ Event listener per BARRA SPAZIATRICE
5. ✅ Testing: Prompt appare quando awaitingContinue=true

**File modificati:**
- `web/index.html` (continue-prompt HTML)
- `web/css/style.css` (stili continue prompt)
- `web/js/odessa1.js` (displayResult, keyboard handler)

---

### 10.6 Fase 6: Polish & Testing (2-3 ore)

**Obiettivo:** Testing completo e bug fixing

1. ✅ Eseguire tutti i test cases (V01-V34)
2. ✅ Verificare testi narrativi corretti e formattati
3. ✅ Verificare blocchi movimenti/azioni funzionanti
4. ✅ Testing save/load in tutti gli stati
5. ✅ Verificare vittoria non retriggerable
6. ✅ Code review e documentation
7. ✅ Aggiornare RELEASE_NOTES.md

**Durata totale stimata:** 11-17 ore

---

## 11. File Modificati - Summary

| File | Tipo | Modifiche Principali |
|------|------|---------------------|
| `src/logic/engine.js` | EDIT | gameState extension (narrative fields + unusefulCommandsCounter), checkVictoryConditions() (solo ID=6, no check ended), startEndingSequence(), teleportToBarrier(), gameOverGuardiaSospetta(), continueVictoryPhase2B(), showVictoryFinal(), processContinue(), reconstructCallback(), applicaEffetti() esteso, executeCommand() integrazione (gestione comandi inappropriati) |
| `src/data-internal/Interazioni.json` | EDIT | Aggiungere interazione "porgi_documenti_59" |
| `web/js/odessa1.js` | EDIT | Bypass parser per awaitingContinue, displayResult() per continue prompt, keyboard handler BARRA, saveGame/loadGame estesi, reconstructCallback() |
| `web/index.html` | EDIT | Continue prompt UI (opzionale) |
| `web/css/style.css` | EDIT | Stili continue prompt (opzionale) |

---

## 12. Riferimenti

- [data-modeling.md](./data-modeling.md) - Struttura dati esistente
- [raccomandazioni.md](./raccomandazioni.md) - Best practices progetto
- [sistema-punteggio.md](./sistema-punteggio.md) - Sistema punteggio (integrabile con vittoria)
- [sistema-temporizzazione.md](./sistema-temporizzazione.md) - Timer (non interferisce con vittoria)
- [20251228 - Luoghi azioni effetti - v2.md](./miscellaneous/20251228 - Luoghi azioni effetti - v2.md) - Documento riferimento sequenza finale
- [engine.js](../src/logic/engine.js) - Game engine corrente
- [Oggetti.json](../src/data-internal/Oggetti.json) - Lista oggetti (Documenti ID=35, Lista ID=6/28, Dossier ID=34)
- [Luoghi.json](../src/data-internal/Luoghi.json) - Lista luoghi (Atrio ID=1, Barriera ID=59)

---

**Document Status:** ✅ Ready for Review  
**Next Step:** Approvazione design → Implementazione Fase 1 (Core Vittoria)

**Critical Decision Points:**
1. ✅ **CONFERMATO:** Input "Premere BARRA" → Soluzione A (bypass parser)
2. ✅ **CONFERMATO:** Meta-comandi NON contano come inappropriati
3. ✅ **CONFERMATO:** Lista di servizio solo ID=6 (eliminare ID=28 da Oggetti.json)
4. ✅ **CONFERMATO:** Limite 3 comandi inappropriati → Game Over guardia
5. ❓ Salvare durante sequenza: bloccare vs permettere? (Raccomandato: BLOCCARE)
6. ❓ Prompt conferma prima di vincere? (Raccomandato: SÌ, Opzione A)
7. ❓ UI continue prompt visuale? (Raccomandato: SÌ per UX)
8. ❓ Multiple endings futuri? (Opzionale, post-MVP)

---

*Ultimo aggiornamento: 30 dicembre 2025*
