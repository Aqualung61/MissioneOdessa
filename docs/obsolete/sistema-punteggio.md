# Sistema di Punteggio - Missione Odessa

**Versione:** 1.0 (proposta)  
**Data:** 29 dicembre 2025  
**Status:** Design Document (non implementato)

---

## 1. Panoramica

Sistema di punteggio per incentivare l'esplorazione e premiare i progressi narrativi nel gioco. Il punteggio si basa su quattro categorie di achievement:

| Categoria | Punti | Descrizione |
|-----------|-------|-------------|
| Luogo visitato | 1 | Primo accesso a ogni luogo |
| Interazione chiave | 2 | Scoperta oggetti/direzioni |
| Mistero risolto | 3 | Obiettivi narrativi complessi |
| Gioco completato | 4 | Raggiungimento finale |

**Punteggio massimo stimato:** 106-131 punti

---

## 2. Struttura Dati - gameState Extension

### 2.1 Modello Dati

```javascript
gameState = {
  // ... campi esistenti ...
  
  punteggio: {
    totale: 0,                          // Punteggio corrente
    luoghiVisitati: new Set(),          // Set<luogoId>
    interazioniPunteggio: new Set(),    // Set<interazioneId>
    misteriRisolti: new Set(),          // Set<misteroId>
    giocoCompletato: false              // Boolean
  }
}
```

### 2.2 Persistenza

**Problema:** `Set` non è serializzabile in JSON.

**Soluzione - Conversione per Save/Load:**

```javascript
// SALVATAGGIO in localStorage
const savedState = {
  ...gameState,
  punteggio: {
    totale: gameState.punteggio.totale,
    luoghiVisitati: Array.from(gameState.punteggio.luoghiVisitati),
    interazioniPunteggio: Array.from(gameState.punteggio.interazioniPunteggio),
    misteriRisolti: Array.from(gameState.punteggio.misteriRisolti),
    giocoCompletato: gameState.punteggio.giocoCompletato
  }
};
localStorage.setItem('odessa_save', JSON.stringify(savedState));

// CARICAMENTO da localStorage
const loadedState = JSON.parse(localStorage.getItem('odessa_save'));
gameState.punteggio.luoghiVisitati = new Set(loadedState.punteggio.luoghiVisitati);
gameState.punteggio.interazioniPunteggio = new Set(loadedState.punteggio.interazioniPunteggio);
gameState.punteggio.misteriRisolti = new Set(loadedState.punteggio.misteriRisolti);
```

---

## 3. Punti per Luoghi Visitati (1 punto)

### 3.1 Implementazione

**File:** `src/logic/engine.js` - gestione NAVIGATION

```javascript
case 'NAVIGATION':
  const destinazione = getDirezioneDestinazione(direzione);
  
  if (destinazione) {
    // Check se primo accesso
    if (!gameState.punteggio.luoghiVisitati.has(destinazione)) {
      gameState.punteggio.luoghiVisitati.add(destinazione);
      gameState.punteggio.totale += 1;
      
      // Messaggio opzionale: "+1 punto: nuovo luogo scoperto!"
    }
    
    gameState.currentLocationId = destinazione;
    return { accepted: true, resultType: 'OK', showLocation: true };
  }
```

### 3.2 Calcolo Massimo

- **Luoghi totali:** 57 (da `Luoghi.json`)
- **Punteggio massimo categoria:** 57 punti
- **Luogo iniziale:** ID=1 già visitato all'inizio (56 punti disponibili)

### 3.3 Considerazioni

- ✅ Incentiva esplorazione completa
- ⚠️ Direzioni toggle (es. pulsante ID=44) non devono dare punti extra se si ritorna
- ⚠️ Valutare se contare anche luoghi "obbligati" nel percorso principale

---

## 4. Punti per Interazioni (2 punti)

### 4.1 Criteri di Assegnazione

**Interazioni da premiare:**
- Sbloccano direzioni (`SBLOCCA_DIREZIONE`)
- Rivelano oggetti nascosti (`VISIBILITA` con valore > 0)
- Puzzle e milestone narrative

**Interazioni da NON premiare:**
- Comandi base: PRENDI, POSA, ESAMINA (senza interazione custom)
- Toggle ripetibili: PREMI pulsante, RUOTA sedile
- Letture informative di oggetti già visibili

### 4.2 Opzione A - Metadata Esplicito (RACCOMANDATO)

**Modificare:** `src/data-internal/Interazioni.json`

Aggiungere campo opzionale `punteggio` alle interazioni chiave:

```json
{
  "id": "scava_macerie_49",
  "trigger": {
    "verbo": "SCAVARE",
    "oggetto": "MACERIE"
  },
  "condizioni": {
    "luogo": 49,
    "prerequisiti": [
      {
        "tipo": "OGGETTO_IN_INVENTARIO",
        "target": "Badile arruginito"
      }
    ]
  },
  "risposta": "Dopo alcuni minuti di fatica, liberi il passaggio. Ora puoi andare ad ovest!",
  "effetti": [
    {
      "tipo": "SBLOCCA_DIREZIONE",
      "da": 49,
      "a": 50,
      "direzione": "ovest"
    }
  ],
  "punteggio": 2,    // <--- NUOVO campo
  "ripetibile": false
}
```

**In engine.js:**

```javascript
function applicaEffetti(effetti, interazioneId, interazione) {
  // ... applicazione effetti esistenti ...
  
  // Assegna punteggio se definito e interazione non già premiata
  if (interazione.punteggio && 
      !gameState.punteggio.interazioniPunteggio.has(interazioneId)) {
    gameState.punteggio.interazioniPunteggio.add(interazioneId);
    gameState.punteggio.totale += interazione.punteggio;
    
    // Opzionale: messaggio "+2 punti: nuova scoperta!"
  }
  
  // ... resto del codice ...
}
```

### 4.3 Opzione B - Deduzione Automatica

**Assegnare automaticamente 2 punti** se l'interazione contiene effetti significativi:

```javascript
function applicaEffetti(effetti, interazioneId, interazione) {
  // Check se interazione merita punteggio
  const haScoperta = effetti.some(e => 
    e.tipo === 'SBLOCCA_DIREZIONE' || 
    (e.tipo === 'VISIBILITA' && e.valore > 0)
  );
  
  if (haScoperta && !gameState.punteggio.interazioniPunteggio.has(interazioneId)) {
    gameState.punteggio.interazioniPunteggio.add(interazioneId);
    gameState.punteggio.totale += 2;
  }
  
  // ... applicazione effetti ...
}
```

**Pro/Contro:**

| Aspetto | Opzione A (Metadata) | Opzione B (Auto) |
|---------|---------------------|------------------|
| Controllo | ✅ Granulare | ⚠️ Limitato |
| Manutenzione | ⚠️ Manuale | ✅ Automatica |
| Flessibilità | ✅ Alta | ❌ Bassa |
| Interazioni narrative | ✅ Possibile | ❌ Non premiate |

**Raccomandazione:** **Opzione A** per maggiore controllo.

### 4.4 Interazioni Chiave da Premiare (Stima)

Circa 15-20 interazioni principali:
- `sposta_quadro_24` - Rivela cassaforte
- `scava_macerie_49` - Sblocca passaggio ovest
- `carica_pesa_57` - Apre botola
- `esamina_botola_57` - Rivela dossier
- `infila_medaglione_forma_20` - Sblocca stanza segreta sud
- `infila_medaglione_forma_36` - Sblocca stanza torture
- `ruota_sedile_42` - Rivela paratia
- `sposta_fermacarte_25` - Rivela scomparto
- ...

**Punteggio massimo categoria:** 30-40 punti

---

## 5. Punti per Misteri (3 punti)

### 5.1 Definizione Misteri

I **misteri** sono obiettivi narrativi/gameplay più ampi di singole interazioni. Rappresentano milestone del gioco.

### 5.2 File Misteri.json (NUOVO)

**Percorso:** `src/data-internal/Misteri.json`

```json
[
  {
    "id": "mistero_cassaforte",
    "nome": "Il Segreto della Cassaforte",
    "descrizione": "Hai aperto la cassaforte nascosta dietro il quadro",
    "punteggio": 3,
    "prerequisito": {
      "tipo": "SEQUENZA_COMPLETATA",
      "target": "cassaforte_24"
    }
  },
  {
    "id": "mistero_stanza_segreta_sud",
    "nome": "La Stanza Segreta Sud",
    "descrizione": "Hai scoperto la stanza segreta sud usando il medaglione",
    "punteggio": 3,
    "prerequisito": {
      "tipo": "LUOGO_VISITATO",
      "target": 21
    }
  },
  {
    "id": "mistero_torture",
    "nome": "La Stanza delle Torture",
    "descrizione": "Hai scoperto la stanza delle torture",
    "punteggio": 3,
    "prerequisito": {
      "tipo": "LUOGO_VISITATO",
      "target": 37
    }
  },
  {
    "id": "mistero_macerie",
    "nome": "Il Passaggio Liberato",
    "descrizione": "Hai liberato il passaggio ad ovest scavando le macerie",
    "punteggio": 3,
    "prerequisito": {
      "tipo": "INTERAZIONE_ESEGUITA",
      "target": "scava_macerie_49"
    }
  },
  {
    "id": "mistero_dossier",
    "nome": "Il Dossier ODESSA",
    "descrizione": "Hai recuperato il dossier segreto dell'organizzazione",
    "punteggio": 3,
    "prerequisito": {
      "tipo": "OGGETTO_IN_INVENTARIO",
      "target": "Dossier"
    }
  },
  {
    "id": "mistero_documenti_identita",
    "nome": "I Documenti di Identità",
    "descrizione": "Hai trovato i documenti falsi di David Liebermann",
    "punteggio": 3,
    "prerequisito": {
      "tipo": "OGGETTO_IN_INVENTARIO",
      "target": "Documenti"
    }
  },
  {
    "id": "mistero_lista_ss",
    "nome": "La Lista delle SS",
    "descrizione": "Hai trovato la lista di servizio con 1.500 nominativi",
    "punteggio": 3,
    "prerequisito": {
      "tipo": "OGGETTO_IN_INVENTARIO",
      "target": "Lista di servizio"
    }
  },
  {
    "id": "mistero_fascicolo_bb",
    "nome": "Il Fascicolo B-B",
    "descrizione": "Hai trovato il piano di fuga Brema-Bari",
    "punteggio": 3,
    "prerequisito": {
      "tipo": "OGGETTO_IN_INVENTARIO",
      "target": "Fascicolo"
    }
  },
  {
    "id": "mistero_uscita",
    "nome": "La Via d'Uscita",
    "descrizione": "Hai trovato l'uscita dal bunker",
    "punteggio": 3,
    "prerequisito": {
      "tipo": "DIREZIONE_SBLOCCATA",
      "da": 44,
      "a": 45
    }
  }
]
```

### 5.3 Tipi di Prerequisiti Supportati

```javascript
// In engine.js - funzione verificaPrerequisito()
switch (prerequisito.tipo) {
  case 'SEQUENZA_COMPLETATA':
    return gameState.sequenze[prerequisito.target]?.completata === true;
  
  case 'LUOGO_VISITATO':
    return gameState.punteggio.luoghiVisitati.has(prerequisito.target);
  
  case 'INTERAZIONE_ESEGUITA':
    return gameState.interazioniEseguite.includes(prerequisito.target);
  
  case 'OGGETTO_IN_INVENTARIO':
    return gameState.Oggetti.some(obj => 
      obj.Oggetto === prerequisito.target && obj.IDLuogo === 0
    );
  
  case 'DIREZIONE_SBLOCCATA':
    const key = `${prerequisito.da}_${prerequisito.a}`;
    return gameState.direzioniSbloccate[key] !== undefined;
  
  // ... altri tipi ...
}
```

### 5.4 Verifica Automatica

**In engine.js - chiamare dopo ogni azione:**

```javascript
function verificaMisteriRisolti() {
  if (!global.odessaData.Misteri) return;
  
  global.odessaData.Misteri.forEach(mistero => {
    // Skip se già risolto
    if (gameState.punteggio.misteriRisolti.has(mistero.id)) return;
    
    // Verifica prerequisito
    const risolto = verificaPrerequisito(mistero.prerequisito);
    
    if (risolto) {
      gameState.punteggio.misteriRisolti.add(mistero.id);
      gameState.punteggio.totale += mistero.punteggio;
      
      // Messaggio: "+3 punti: Mistero risolto - [nome]!"
      console.log(`🏆 Mistero risolto: ${mistero.nome}`);
    }
  });
}

// Chiamare in executeCommand dopo ogni azione
export function executeCommand(parseResult) {
  const result = /* ... logica esistente ... */;
  
  // Check misteri dopo ogni comando
  verificaMisteriRisolti();
  
  return result;
}
```

### 5.5 Calcolo Massimo

- **Misteri definiti:** 9 (esempio sopra)
- **Punteggio massimo categoria:** 27 punti
- **Espandibile:** Fino a 10-12 misteri (~30-36 punti)

---

## 6. Completamento Gioco (4 punti)

### 6.1 Win Condition

**Scenario attuale:** Il gioco termina quando si raggiunge un luogo specifico (da definire).

**Implementazione proposta:**

```javascript
// In engine.js - gestione NAVIGATION
case 'NAVIGATION':
  const destinazione = getDirezioneDestinazione(direzione);
  
  if (destinazione === LUOGO_FINALE_ID) {  // es. luogo 45 (uscita)
    // Check prerequisiti vittoria
    const haDocumentiNecessari = verificaDocumentiVittoria();
    
    if (haDocumentiNecessari && !gameState.punteggio.giocoCompletato) {
      gameState.punteggio.giocoCompletato = true;
      gameState.punteggio.totale += 4;
      
      return {
        accepted: true,
        resultType: 'WIN',
        message: generateVictoryMessage(),
        punteggioFinale: gameState.punteggio.totale,
        showLocation: true
      };
    }
  }
```

### 6.2 Prerequisiti Vittoria (da definire)

Possibili condizioni per completare il gioco:

- ✅ Avere il Dossier ODESSA
- ✅ Avere i Documenti di identità
- ✅ Avere il Fascicolo B-B
- ✅ Raggiungere l'uscita (luogo 45?)

**Da confermare** con la narrativa del gioco.

### 6.3 Schermata Finale

```javascript
function generateVictoryMessage() {
  const stats = {
    punteggio: gameState.punteggio.totale,
    luoghi: gameState.punteggio.luoghiVisitati.size,
    interazioni: gameState.punteggio.interazioniPunteggio.size,
    misteri: gameState.punteggio.misteriRisolti.size
  };
  
  return `
╔═══════════════════════════════════════╗
║   🎉 MISSIONE ODESSA COMPLETATA! 🎉   ║
╚═══════════════════════════════════════╝

Hai portato a termine la tua missione
investigativa e scoperto i segreti di ODESSA!

📊 STATISTICHE FINALI:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 Punteggio totale:    ${stats.punteggio} punti
🗺️  Luoghi scoperti:     ${stats.luoghi}/57
🔍 Interazioni risolte: ${stats.interazioni}
🎯 Misteri svelati:     ${stats.misteri}/9

${getRank(stats.punteggio)}

Grazie per aver giocato!
  `;
}

function getRank(punteggio) {
  if (punteggio >= 120) return '⭐⭐⭐ RANGO: Investigatore Leggendario';
  if (punteggio >= 100) return '⭐⭐ RANGO: Detective Esperto';
  if (punteggio >= 80) return '⭐ RANGO: Agente Capace';
  return 'RANGO: Sopravvissuto';
}
```

---

## 7. Visualizzazione Punteggio

### 7.1 Comando PUNTI

**File:** `src/logic/engine.js` - caso SISTEMA

```javascript
case 'PUNTI':
  const luoghiTotali = global.odessaData.Luoghi.length;
  const misteriTotali = global.odessaData.Misteri?.length || 0;
  
  return {
    accepted: true,
    resultType: 'OK',
    message: `
═══════════ PUNTEGGIO ═══════════

🗺️  Luoghi scoperti:
   ${gameState.punteggio.luoghiVisitati.size}/${luoghiTotali} 
   (${gameState.punteggio.luoghiVisitati.size} punti)

🔍 Interazioni risolte:
   ${gameState.punteggio.interazioniPunteggio.size}
   (${gameState.punteggio.interazioniPunteggio.size * 2} punti)

🎯 Misteri svelati:
   ${gameState.punteggio.misteriRisolti.size}/${misteriTotali}
   (${gameState.punteggio.misteriRisolti.size * 3} punti)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 TOTALE: ${gameState.punteggio.totale} punti

[Completamento: ${Math.round((gameState.punteggio.totale / PUNTEGGIO_MASSIMO) * 100)}%]
    `,
    showLocation: false
  };
```

### 7.2 HUD Permanente (Opzionale)

**File:** `web/js/odessa1.js`

```html
<!-- In index.html -->
<div id="score-bar" class="score-display">
  🏆 Punteggio: <span id="current-score">0</span>
  <span id="score-details" class="score-tooltip">
    Luoghi: <span id="score-luoghi">0</span> | 
    Scoperte: <span id="score-scoperte">0</span> | 
    Misteri: <span id="score-misteri">0</span>
  </span>
</div>
```

```javascript
// In odessa1.js - aggiornare dopo ogni comando
function updateScoreDisplay() {
  const score = gameState.punteggio;
  document.getElementById('current-score').textContent = score.totale;
  document.getElementById('score-luoghi').textContent = score.luoghiVisitati.size;
  document.getElementById('score-scoperte').textContent = score.interazioniPunteggio.size;
  document.getElementById('score-misteri').textContent = score.misteriRisolti.size;
}
```

### 7.3 Notifiche Punteggio

**Mostrare temporaneamente quando si guadagnano punti:**

```javascript
function showScoreNotification(punti, messaggio) {
  const notification = document.createElement('div');
  notification.className = 'score-notification';
  notification.innerHTML = `
    <span class="score-plus">+${punti}</span>
    <span class="score-message">${messaggio}</span>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => notification.remove(), 500);
  }, 3000);
}

// Esempi
showScoreNotification(1, 'Nuovo luogo scoperto!');
showScoreNotification(2, 'Passaggio segreto trovato!');
showScoreNotification(3, 'Mistero risolto: La Cassaforte');
```

**CSS:**

```css
.score-notification {
  position: fixed;
  top: 20px;
  right: 20px;
  background: rgba(0, 128, 0, 0.9);
  color: white;
  padding: 12px 20px;
  border-radius: 8px;
  animation: slideIn 0.3s ease-out;
  z-index: 1000;
}

.score-plus {
  font-size: 1.2em;
  font-weight: bold;
  margin-right: 8px;
}

.fade-out {
  opacity: 0;
  transition: opacity 0.5s;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
```

---

## 8. Punteggio Massimo e Bilanciamento

### 8.1 Calcolo Punteggio Massimo

| Categoria | Quantità | Punti Unitari | Totale |
|-----------|----------|---------------|--------|
| Luoghi visitati | 57 | 1 | 57 |
| Interazioni chiave | 15-20 | 2 | 30-40 |
| Misteri | 9-12 | 3 | 27-36 |
| Completamento | 1 | 4 | 4 |
| **TOTALE MASSIMO** | | | **118-137** |

**Punteggio realistico normalizzato:** ~120 punti

### 8.2 Bilanciamento

**Principi:**
- ✅ **No grinding**: Ogni azione dà punti UNA SOLA VOLTA (tracciata in Set)
- ✅ **Incentivo esplorazione**: Punti per luoghi opzionali, non solo percorso principale
- ✅ **Milestone narrative**: Misteri da 3 punti per obiettivi significativi
- ❌ **No backtracking inutile**: Tornare in un luogo già visitato non dà punti extra

**Difficoltà raggiungere 100%:**
- Richiede visitare TUTTI i 57 luoghi
- Trovare TUTTE le interazioni chiave
- Risolvere TUTTI i misteri
- Completare il gioco

**Obiettivo realistico prima playthrough:** 70-85% (~85-100 punti)

---

## 9. Implementazione - Roadmap

### 9.1 Fase 1: MVP (Minimo Funzionante)

**Durata stimata:** 2-3 ore

**File da modificare:**
- ✅ `src/logic/engine.js` - Estendere `gameState` con campo `punteggio`
- ✅ `src/logic/engine.js` - Aggiungere check luoghi visitati in NAVIGATION
- ✅ `src/logic/engine.js` - Modificare comando PUNTI (rimuovere stub)
- ✅ `web/js/odessa1.js` - Gestire serializzazione Set↔Array in save/load

**Test:**
- [x] Navigare tra luoghi e verificare incremento punteggio
- [x] Comando PUNTI mostra luoghi visitati
- [x] Salvare e caricare partita mantiene punteggio

### 9.2 Fase 2: Interazioni Chiave

**Durata stimata:** 3-4 ore

**File da modificare:**
- ✅ `src/data-internal/Interazioni.json` - Aggiungere campo `punteggio: 2` alle ~15-20 interazioni chiave
- ✅ `src/logic/engine.js` - Modificare `applicaEffetti()` per assegnare punteggio

**Interazioni da identificare e premiare:**
- [ ] sposta_quadro_24
- [ ] scava_macerie_49
- [ ] carica_pesa_57
- [ ] esamina_botola_57
- [ ] infila_medaglione_forma_20
- [ ] infila_medaglione_forma_36
- [ ] ruota_sedile_42
- [ ] sposta_fermacarte_25
- [ ] ... altre da definire

**Test:**
- [x] Eseguire interazione chiave → verificare +2 punti
- [x] Ripetere interazione → NON dare punti extra
- [x] Comando PUNTI mostra interazioni risolte

### 9.3 Fase 3: Sistema Misteri

**Durata stimata:** 4-5 ore

**File da creare/modificare:**
- ✅ `src/data-internal/Misteri.json` (NUOVO) - Definizione 9-12 misteri
- ✅ `src/logic/data-loader.js` - Caricare Misteri.json in `global.odessaData.Misteri`
- ✅ `src/logic/engine.js` - Implementare `verificaMisteriRisolti()`
- ✅ `src/logic/engine.js` - Chiamare verifica dopo ogni comando

**Test:**
- [x] Completare prerequisito mistero → verificare +3 punti
- [x] Comando PUNTI mostra misteri risolti
- [x] Verificare prerequisiti complessi (SEQUENZA_COMPLETATA, etc.)

### 9.4 Fase 4: UI Visuale

**Durata stimata:** 2-3 ore

**File da modificare:**
- ✅ `web/index.html` - Aggiungere `<div id="score-bar">`
- ✅ `web/css/style.css` (o equivalente) - Stili per score bar e notifiche
- ✅ `web/js/odessa1.js` - Implementare `updateScoreDisplay()` e `showScoreNotification()`

**Test:**
- [x] Score bar aggiornato real-time
- [x] Notifiche appaiono quando si guadagnano punti
- [x] UI non invasiva, integrata con design esistente

### 9.5 Fase 5: Completamento Gioco

**Durata stimata:** 1-2 ore

**File da modificare:**
- ✅ `src/logic/engine.js` - Implementare win condition in NAVIGATION
- ✅ `src/logic/engine.js` - Funzione `generateVictoryMessage()`
- ✅ `web/js/odessa1.js` - Gestire resultType 'WIN' nel frontend

**Test:**
- [x] Raggiungere luogo finale con prerequisiti → schermata vittoria
- [x] Verificare punteggio finale e rank
- [x] Salvare/caricare dopo vittoria

---

## 10. Testing e QA

### 10.1 Test Cases

| ID | Descrizione | Expected | Priority |
|----|-------------|----------|----------|
| T01 | Visitare nuovo luogo | +1 punto | Alta |
| T02 | Rivisitare luogo | 0 punti | Alta |
| T03 | Eseguire interazione chiave | +2 punti | Alta |
| T04 | Ripetere interazione | 0 punti | Alta |
| T05 | Completare prerequisito mistero | +3 punti | Alta |
| T06 | Completare gioco | +4 punti | Alta |
| T07 | Salvare partita con punteggio | Punteggio persistito | Critica |
| T08 | Caricare partita | Punteggio ripristinato | Critica |
| T09 | Comando PUNTI | Mostra statistiche corrette | Media |
| T10 | Notifica punteggio | Appare e scompare | Bassa |

### 10.2 Edge Cases

- ⚠️ Navigare via direzioni toggle (pulsante) non deve dare punti per "nuovo luogo"
- ⚠️ Interazione non ripetibile eseguita 2+ volte deve dare punti solo alla prima
- ⚠️ Mistero con prerequisito già soddisfatto a inizio gioco deve dare punti immediatamente
- ⚠️ Save/load con Set vuoti non deve crashare
- ⚠️ Completare gioco senza aver visitato tutti i luoghi deve funzionare

---

## 11. Considerazioni Future

### 11.1 Espansioni Possibili

**Achievement System:**
- 🕵️ "Detective": Trova tutti i documenti segreti (3/3)
- 🗝️ "Maestro delle Serrature": Apri cassaforte e tutte le porte
- 🌍 "Esploratore": Visita tutti i 57 luoghi
- 🏆 "Perfezionista": Completa il gioco con punteggio massimo
- 👻 "Velocista": Completa in meno di X comandi/minuti

**Leaderboard:**
- Salvare punteggi migliori (top 5)
- Mostrare in schermata iniziale
- Export/condivisione punteggio

**Modalità di Gioco:**
- **Narrativa:** Sistema punteggio disabilitato, focus sulla storia
- **Arcade:** Punteggio con moltiplicatori e bonus tempo
- **Speedrun:** Timer + penalità per errori

### 11.2 Accessibilità

**Opzioni:**
- Toggle per disabilitare notifiche visive punteggio
- Comando alternativo `STATO` per utenti screen reader
- Score bar opzionale (on/off nelle impostazioni)

### 11.3 Analytics

**Metriche da tracciare (opzionale):**
- Punteggio medio raggiunto dai giocatori
- % completamento per categoria
- Misteri più/meno risolti
- Luoghi meno visitati (per bilanciamento)

---

## 12. File Modificati - Summary

| File | Tipo | Modifiche Principali |
|------|------|---------------------|
| `src/logic/engine.js` | EDIT | gameState extension, check luoghi, interazioni, misteri, comando PUNTI, win condition |
| `src/data-internal/Interazioni.json` | EDIT | Aggiungere campo `punteggio: 2` a 15-20 interazioni |
| `src/data-internal/Misteri.json` | NEW | Definizione 9-12 misteri con prerequisiti |
| `src/logic/data-loader.js` | EDIT | Caricare Misteri.json |
| `web/js/odessa1.js` | EDIT | Serializzazione Set, updateScoreDisplay, notifiche |
| `web/index.html` | EDIT | Aggiungere score bar UI |
| `web/css/style.css` | EDIT | Stili per score bar e notifiche |

---

## 13. Riferimenti

- [data-modeling.md](./data-modeling.md) - Struttura dati esistente
- [raccomandazioni.md](./raccomandazioni.md) - Best practices progetto
- [Interazioni.json](../src/data-internal/Interazioni.json) - File interazioni esistenti
- [Luoghi.json](../src/data-internal/Luoghi.json) - Lista luoghi (57 totali)
- [engine.js](../src/logic/engine.js) - Game engine corrente

---

**Document Status:** ✅ Ready for Review  
**Next Step:** Approvazione design → Implementazione Fase 1 MVP

---

*Ultimo aggiornamento: 29 dicembre 2025*
