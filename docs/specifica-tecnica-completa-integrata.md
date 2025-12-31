# Specifica Tecnica Unificata - Missione Odessa

**Versione:** 1.1  
**Data:** 30 dicembre 2025  
**Status:** Approved for Implementation - Integrata  
**Riferimenti:** `sistema-punteggio.md`, `sistema-temporizzazione.md`, `sistema-vittoria.md`

---

# CAPITOLO 1: HIGH LEVEL DESIGN (HLD)

Questo capitolo descrive le logiche funzionali, l'esperienza utente e le regole di gioco, indipendentemente dall'implementazione tecnica.

## 1.1 Sistema di Punteggio

L'obiettivo è incentivare l'esplorazione completa e premiare la risoluzione di enigmi, senza imporre grinding.

### 1.1.1 Categorie di Punteggio
Il punteggio totale (stimato ~122 punti) è la somma di quattro categorie:

| Categoria | Valore | Condizione di Assegnazione | Note |
|-----------|--------|----------------------------|------|
| **Esplorazione** | 1 pto | Primo ingresso in un nuovo luogo | Totale 57 luoghi. Backtracking non premia. |
| **Interazioni** | 2 pti | Azioni che sbloccano passaggi o rivelano oggetti | Es. Spostare un quadro, aprire una botola. |
| **Misteri** | 3 pti | Risoluzione di obiettivi narrativi complessi | Es. Trovare la combinazione, accedere al bunker. |
| **Completamento** | 4 pti | Raggiungimento del finale di gioco | Assegnato alla vittoria. |

### 1.1.2 Feedback Utente
- **Comando PUNTI:** Visualizza il dettaglio (Luoghi, Interazioni, Misteri) e il rango raggiunto.
- **Notifiche:** (Opzionale) Feedback visivo immediato quando si guadagnano punti.
- **HUD:** (Opzionale) Contatore sempre visibile nell'interfaccia web.

### 1.1.3 Sistema di Ranghi
Il giocatore ottiene un rango in base al punteggio totale accumulato:

| Punteggio | Rango | Descrizione |
|-----------|-------|-------------|
| 0-30 | Apprendista | Hai appena iniziato |
| 31-60 | Agente Novizio | Stai imparando le basi |
| 61-90 | Agente Capace | Buone capacità investigative |
| 91-110 | Agente Esperto | Ottima esplorazione |
| 111-122 | Agente Eccellente | Hai scoperto quasi tutto! |
| 122 | Perfezionista | Completamento al 100%! |

**Punteggio massimo:** 122 punti (57 luoghi + ~34 interazioni + 27 misteri + 4 completamento)

### 1.1.4 Definizione Misteri
I **misteri** sono obiettivi narrativi complessi che premiano milestone significative del gioco:

1. **Il Segreto della Cassaforte** - Aprire la cassaforte nascosta
2. **La Stanza Segreta Sud** - Scoprire la stanza del Gauleiter
3. **La Stanza delle Torture** - Trovare la sala di torture
4. **Il Passaggio Liberato** - Scavare le macerie
5. **Il Dossier ODESSA** - Recuperare il dossier segreto
6. **I Documenti di Identità** - Trovare i documenti falsi
7. **La Lista delle SS** - Scoprire la lista di servizio
8. **Il Fascicolo B-B** - Trovare il piano di fuga Brema-Bari
9. **La Via d'Uscita** - Trovare l'uscita dal bunker

---

## 1.2 Sistema di Temporizzazione (Survival)

Il gioco introduce tre meccaniche di "morte a tempo" per aumentare la tensione e il realismo.

### 1.2.1 Evento A: Torcia Difettosa (6 mosse)
- **Contesto:** Il giocatore inizia con una torcia che sta per rompersi.
- **Regola:** Dopo **6 mosse** (comandi di azione/movimento), se il giocatore non ha acceso una fonte di luce alternativa (Lampada), la torcia muore.
- **Comandi che contano:** NAVIGATION (NORD, SUD...), ACTION (PRENDI, LASCIA, USA...), EXAMINE
- **Comandi esclusi:** INVENTARIO, AIUTO, PUNTI, SALVA, CARICA, GUARDA (senza parametro)
- **Conseguenza:** Game Over con messaggio "Oscurità Fatale"
- **Soluzione:** Trovare la Lampada (Luogo 6), prendere i Fiammiferi, e usare comando `ACCENDI LAMPADA` entro 6 mosse.

#### Comando ACCENDI LAMPADA
- **Sintassi:** `ACCENDI LAMPADA`, `ILLUMINA LAMPADA`, `USA LAMPADA`
- **Prerequisito:** Fiammiferi in inventario (Oggetto ID=4)
- **Effetto:** Lampada diventa fonte di luce principale, timer torcia disattivato
- **Messaggio successo:** "Accendi la lampada con i fiammiferi. Ora hai una fonte di luce affidabile!"
- **Messaggio senza fiammiferi:** "Non hai niente per accendere la lampada."
- **Nota:** I fiammiferi sono riutilizzabili (non si consumano)

### 1.2.2 Evento B: Intercettazione (3 turni in zona pericolosa)
- **Contesto:** Alcuni luoghi esterni sono sorvegliati da pattuglie sovietiche.
- **Luoghi Pericolosi:** 
  - ID=51: Grossa piazza
  - ID=52: Filo spinato (nord)
  - ID=53: Posto di blocco
  - ID=55: Strada
  - ID=56: Filo spinato (est)
  - ID=58: Filo spinato (sud)
  - **Nota:** ID=54 (Posto di blocco - Fine) è un **luogo terminale** raggiungibile da ID=53 tramite direzione Sud. Causa Game Over immediato all'ingresso (morte istantanea), NON tramite timer. Gestione identica a ID=40 (Dentro pozzo). Non è incluso in `LUOGHI_PERICOLOSI`.
  - **Nota:** ID=57 (Capanno attrezzi) è intenzionalmente **sicuro** (rifugio)

**Tabella Completa Luoghi Critici:**

| ID | Nome | Tipo | Campo Terminale | Timer | Comportamento | Game Over |
|----|------|------|----------------|-------|---------------|-----------||
| 8 | Cima ascensore | Terminale | -1 | ❌ | Morte all'ingresso | Immediato |
| 40 | Dentro pozzo | Terminale | -1 | ❌ | Morte all'ingresso | Immediato |
| 54 | Posto di blocco - Fine | Terminale | -1 | ❌ | Morte all'ingresso | Immediato |
| 51 | Grossa piazza | Pericoloso | 0 | ✅ | 3 azioni consecutive | "Catturato!" |
| 52 | Filo spinato (nord) | Pericoloso | 0 | ✅ | 3 azioni consecutive | "Catturato!" |
| 53 | Posto di blocco | Pericoloso | 0 | ✅ | 3 azioni consecutive | "Catturato!" |
| 55 | Strada | Pericoloso | 0 | ✅ | 3 azioni consecutive | "Catturato!" |
| 56 | Filo spinato (est) | Pericoloso | 0 | ✅ | 3 azioni consecutive | "Catturato!" |
| 58 | Filo spinato (sud) | Pericoloso | 0 | ✅ | 3 azioni consecutive | "Catturato!" |
| 57 | Capanno attrezzi | Rifugio | 0 | ❌ | Zona sicura | Nessuno |

**Note Implementative:**
- La costante `LUOGHI_PERICOLOSI` deve contenere solo: [51, 52, 53, 55, 56, 58]
- Esclude ID=54 (terminale, gestito separatamente) e ID=57 (rifugio sicuro)
- ID=53 è pericoloso, ma la direzione Sud verso ID=54 causa morte istantanea senza timer

- **Regola:** Eseguire **3 azioni consecutive** mentre si è in un luogo pericoloso attiva l'intercettazione.
- **Reset:** Il counter si azzera **solo** uscendo dalla zona pericolosa. Spostarsi tra luoghi pericolosi **NON resetta** il counter.
- **Esempio:** Luogo 51 (3 azioni) → Game Over. Luogo 51 → Luogo 55 → counter continua. Luogo 51 → Luogo 47 → counter resettato.
- **Conseguenza:** Game Over con messaggio "Catturato!"

### 1.2.3 Evento C: Lampada Abbandonata
- **Contesto:** La lampada è l'unica fonte di luce affidabile dopo che la torcia si esaurisce.
- **Regola:** Se il giocatore lascia la lampada accesa a terra e si sposta in un altro luogo.
- **Conseguenza:** Game Over immediato al cambio stanza con messaggio "Buio Mortale"
- **Soluzione:** Usare `PRENDI LAMPADA` prima di muoversi se è stata lasciata a terra.

### 1.2.4 Messaggi Game Over
Ogni evento di morte mostra un messaggio narrativo dettagliato con suggerimenti:

**Torcia Esaurita:**
```
💀 OSCURITÀ FATALE

La tua torcia emette un ultimo tremulo bagliore, poi si spegne definitivamente. 

Nell'oscurità totale, inciampi su una trave marcescente e cadi pesantemente: 
il tonfo sordo è seguito da un dolore lancinante alla testa. 

Lentamente, perdi i sensi mentre la casa ti inghiotte nel buio eterno...

*** SEI MORTO ***

Motivo: Torcia difettosa esaurita
Mosse effettuate: [N]
Suggerimento: Cerca la lampada nel ripostiglio e accendila con i fiammiferi 
entro le prime 6 mosse.
```

**Intercettazione:**
```
💀 CATTURATO!

Rimanere fermi in una zona pattugliata è stato fatale. 

Una pattuglia sovietica ti ha individuato e circondato: non c'è via di fuga. 

Vieni trascinato al comando locale dove, dopo un breve interrogatorio, 
sei fucilato come spia occidentale.

*** SEI MORTO ***

Motivo: Intercettazione da pattuglia
Azioni in zona pericolosa: [N]
Suggerimento: Non restare più di 2 azioni consecutive nello stesso luogo 
pericoloso. Continua a muoverti!
```

**Lampada Abbandonata:**
```
💀 BUIO MORTALE

Lasciare la lampada accesa in un'altra stanza è stato un errore imperdonabile. 

Nel momento in cui varchi la soglia, l'oscurità ti avvolge completamente. 
Perdi l'equilibrio, cadi in una botola nascosta e precipiti fino al piano 
inferiore: l'impatto è fatale.

*** SEI MORTO ***

Motivo: Movimento senza fonte di luce
Suggerimento: La lampada deve essere sempre con te quando ti muovi al buio. 
PRENDI LAMPADA prima di lasciare una stanza.
```

**Guardia Sospetta (Luogo 59):**
```
💀 SOSPETTI FATALI

Il tuo comportamento strano e esitante ha insospettito la guardia di frontiera. 

Con un gesto secco, ordina ad altri soldati di circonderti. Sei stato 
identificato come agente nemico e portato via per essere giustiziato.

*** SEI MORTO ***

Motivo: Comportamento sospetto alla barriera
Comandi inappropriati: [N]
Suggerimento: Usa il comando PORGI DOCUMENTI alla barriera per superare il controllo.
```

---

## 1.3 Sistema di Vittoria e Sequenza Finale

La vittoria non è istantanea ma richiede una sequenza narrativa specifica.

### 1.3.1 Prerequisiti di Innesco
La sequenza finale si attiva entrando nell'**Atrio (Luogo ID=1)** solo se:
1.  **Documenti** in inventario (ID=35).
2.  **Lista di servizio** in inventario (ID=6). *Nota: ID=28 è un duplicato da rimuovere.*
3.  **Dossier** in inventario (ID=34).
4.  **Stato:** Il giocatore è vivo (implicito).

### 1.3.2 Flusso Narrativo (5 Fasi)
1.  **Fase 1A (Atrio):** Incontro con Ferenc. Dialogo automatico. Input: `BARRA SPAZIO`.
2.  **Fase 1B (Viaggio):** Descrizione del cammino verso il confine. Input: `BARRA SPAZIO` -> Teletrasporto automatico al Luogo 59.
3.  **Fase 2_WAIT (Barriera):** Il giocatore è bloccato davanti alla guardia.
    *   Tutti i movimenti sono disabilitati.
    *   Unico comando corretto: `PORGI DOCUMENTI`.
    *   **Meccanica "Guardia Sospetta":** Se il giocatore inserisce >3 comandi inappropriati (es. "Prendi sasso"), scatta un Game Over alternativo.
    *   *Eccezione:* I comandi di sistema (INVENTARIO, AIUTO, PUNTI, SALVA, CARICA, GUARDA) non contano come inappropriati.
4.  **Fase 2A/2B (Controllo):** La guardia controlla e approva.
5.  **Fase 2C (Vittoria):** Schermata finale e statistiche.

### 1.3.3 Comando PORGI DOCUMENTI
- **Sintassi:** `PORGI DOCUMENTI`, `DAI DOCUMENTI`, `CONSEGNA DOCUMENTI`, `MOSTRA DOCUMENTI`
- **Contesto:** Comando speciale che funziona **solo** al Luogo 59 durante la sequenza finale
- **Prerequisito:** Documenti (ID=35) in inventario
- **Effetto:** Avanza alla fase di controllo (Fase 2A)
- **Messaggi:**
  - **Successo:** "Porgi i documenti e la guardia li guarda con cura. Sono attimi importanti.\n\n[Premere BARRA per continuare]"
  - **Senza documenti:** "Non hai documenti da porgere."
  - **Fuori contesto:** "Non c'è nessuno a cui porgere qualcosa."
  - **Oggetto sbagliato:** "La guardia non è interessata a questo. Vuole vedere i documenti."

### 1.3.4 Teleport e Rimozione Oggetti
Durante il teleport da Luogo 1 a Luogo 59:
- **Lista di servizio (ID=6):** Rimossa dall'inventario (Ferenc la prende)
- **Dossier (ID=34):** Rimosso dall'inventario (Ferenc lo prende)
- **Documenti (ID=35):** **Rimangono** in inventario (necessari per la guardia)
- **Altri oggetti:** Conservati nell'inventario

**Importante:** Il Luogo 59 è **accessibile solo via teleport**. Nel database Luoghi.json, il Luogo 1 ha `Ovest: 0` per impedire l'accesso diretto. Questo garantisce che la sequenza vittoria possa essere attivata solo quando i prerequisiti sono soddisfatti (presenza di Documenti, Lista e Dossier in inventario al Luogo 1).

---

# CAPITOLO 2: TECHNICAL DESIGN (TD)

Questo capitolo dettaglia le modifiche al codice, le strutture dati e gli algoritmi.

## 2.1 Architettura Dati Unificata

Estensione dell'oggetto `gameState` in `src/logic/engine.js` per supportare tutti i sistemi.

```javascript
gameState = {
  // ... campi esistenti ...

  // === SISTEMA PUNTEGGIO ===
  punteggio: {
    totale: 0,
    luoghiVisitati: new Set(),       // ID luoghi (Set per unicità)
    interazioniPunteggio: new Set(), // ID interazioni completate
    misteriRisolti: new Set()        // ID misteri completati
  },

  // === SISTEMA TEMPORIZZAZIONE ===
  timers: {
    movementCounter: 0,              // Contatore globale mosse (per Torcia)
    torciaDifettosa: true,           // True all'inizio, False se accendi lampada
    lampadaAccesa: false,            // Stato della lampada
    azioniInLuogoPericoloso: 0,      // Counter per Intercettazione
    ultimoLuogoPericoloso: null      // ID per reset al cambio stanza
  },

  // === SISTEMA VITTORIA ===
  narrativeState: null,              // Enum: ENDING_PHASE_1A, etc.
  narrativePhase: 0,                 // Progressivo numerico (opzionale)
  victory: false,                    // Flag vittoria finale
  movementBlocked: false,            // Blocca NAVIGATION (per luogo 59)
  unusefulCommandsCounter: 0,        // Counter comandi errati al luogo 59
  awaitingContinue: false,           // Se true, engine aspetta solo BARRA SPAZIO
  continueCallback: null             // Funzione da eseguire alla pressione di BARRA
};
```

**Nota sulla Persistenza:** I `Set` del punteggio devono essere convertiti in `Array` durante il salvataggio (JSON.stringify) e riconvertiti in `Set` al caricamento.

## 2.2 Implementazione Punteggio

### 2.2.1 Logica
*   **Luoghi:** Inserire check nel case `NAVIGATION` di `executeCommand`. Se `destinazione` non è nel Set, +1 punto.
*   **Interazioni:** Modificare `applicaEffetti`. Se l'interazione ha metadata `punteggio: 2`, aggiungere al Set e incrementare totale.
*   **Misteri:** Nuova funzione `verificaMisteriRisolti()` chiamata alla fine di ogni ciclo di comando. Controlla `src/data-internal/Misteri.json`.

### 2.2.2 File Dati e Definizioni

#### Interazioni con Punteggio (15-20 totali stimati)
Le seguenti interazioni devono avere `"punteggio": 2` in Interazioni.json:

| ID Interazione | Descrizione | Luogo | Effetto |
|----------------|-------------|-------|---------|
| `sposta_quadro_24` | Sposta quadro | 24 | Rivela cassaforte |
| `scava_macerie_49` | Scava macerie con badile | 49 | Sblocca passaggio ovest |
| `carica_pesa_57` | Carica pesa con attrezzi | 57 | Apre botola |
| `esamina_botola_57` | Esamina botola aperta | 57 | Rivela dossier nascosto |
| `infila_medaglione_forma_20` | Infila medaglione in forma | 20 | Sblocca stanza segreta sud (21) |
| `infila_medaglione_forma_36` | Infila medaglione in forma | 36 | Sblocca stanza torture (37) |
| `ruota_sedile_42` | Ruota sedile | 42 | Rivela paratia nascosta |
| `sposta_fermacarte_25` | Sposta fermacarte | 25 | Rivela scomparto segreto |

**Nota:** Identificare 7-12 interazioni aggiuntive da Interazioni.json analizzando effetti `SBLOCCA_DIREZIONE` e `VISIBILITA`.

**⚠️ OPEN POINT #1:** Lista completa interazioni con punteggio da completare durante Fase 2 (analisi Interazioni.json). Target: 15-20 interazioni totali per raggiungere ~34 punti. Questo open point non blocca l'avvio della Fase 1.

#### Struttura Misteri.json
**File:** `src/data-internal/Misteri.json`

```json
[
  {
    "id": "mistero_cassaforte",
    "nome": "Il Segreto della Cassaforte",
    "descrizione": "Hai aperto la cassaforte nascosta dietro il quadro",
    "punteggio": 3,
    "prerequisito": {
      "tipo": "INTERAZIONI_MULTIPLE",
      "targets": ["sposta_quadro_24", "ruota_combinazione_cassaforte"]
    },
    "messaggio": "Hai svelato il segreto della cassaforte!",
    "nota": "Richiede ENTRAMBE le azioni: spostare il quadro E completare la sequenza ruota destra/sinistra"
  },
  {
    "id": "mistero_stanza_segreta_sud",
    "nome": "La Stanza Segreta Sud",
    "descrizione": "Hai scoperto la stanza segreta sud usando il medaglione",
    "punteggio": 3,
    "prerequisito": {
      "tipo": "LUOGO_VISITATO",
      "target": 21
    },
    "messaggio": "Hai scoperto la stanza segreta del Gauleiter!"
  },
  {
    "id": "mistero_torture",
    "nome": "La Stanza delle Torture",
    "descrizione": "Hai scoperto la stanza delle torture",
    "punteggio": 3,
    "prerequisito": {
      "tipo": "LUOGO_VISITATO",
      "target": 37
    },
    "messaggio": "Hai trovato la sinistra sala di torture!"
  },
  {
    "id": "mistero_macerie",
    "nome": "Il Passaggio Liberato",
    "descrizione": "Hai liberato il passaggio ad ovest scavando le macerie",
    "punteggio": 3,
    "prerequisito": {
      "tipo": "INTERAZIONE_ESEGUITA",
      "target": "scava_macerie_49"
    },
    "messaggio": "Hai aperto una nuova via verso l'ignoto!"
  },
  {
    "id": "mistero_dossier",
    "nome": "Il Dossier ODESSA",
    "descrizione": "Hai recuperato il dossier segreto dell'organizzazione",
    "punteggio": 3,
    "prerequisito": {
      "tipo": "OGGETTO_IN_INVENTARIO",
      "target": 34
    },
    "messaggio": "Hai trovato il dossier che Simon Wiesenthal stava cercando!"
  },
  {
    "id": "mistero_documenti_identita",
    "nome": "I Documenti di Identità",
    "descrizione": "Hai trovato i documenti falsi di David Liebermann",
    "punteggio": 3,
    "prerequisito": {
      "tipo": "OGGETTO_IN_INVENTARIO",
      "target": 35
    },
    "messaggio": "Hai i documenti per superare la barriera americana!"
  },
  {
    "id": "mistero_lista_ss",
    "nome": "La Lista delle SS",
    "descrizione": "Hai trovato la lista di servizio con 1.500 nominativi",
    "punteggio": 3,
    "prerequisito": {
      "tipo": "OGGETTO_IN_INVENTARIO",
      "target": 6
    },
    "messaggio": "Hai trovato la lista di servizio: prova inconfutabile dei crimini nazisti!"
  },
  {
    "id": "mistero_fascicolo_bb",
    "nome": "Il Fascicolo B-B",
    "descrizione": "Hai trovato il piano di fuga Brema-Bari",
    "punteggio": 3,
    "prerequisito": {
      "tipo": "OGGETTO_IN_INVENTARIO",
      "target": 33
    },
    "messaggio": "Hai scoperto la rotta di fuga dei gerarchi nazisti!"
  },
  {
    "id": "mistero_uscita_bunker",
    "nome": "La Via d'Uscita",
    "descrizione": "Hai trovato l'uscita dal bunker",
    "punteggio": 3,
    "prerequisito": {
      "tipo": "LUOGO_VISITATO",
      "target": 46
    },
    "messaggio": "Hai trovato la via d'uscita dal bunker segreto!"
  }
]
```

#### Logica Verifica Misteri

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
      gameState.punteggio.totale += 3;
      mostraMessaggio(mistero.messaggio);
    }
  });
}

function verificaPrerequisito(prerequisito) {
  switch (prerequisito.tipo) {
    case 'INTERAZIONE_ESEGUITA':
      return gameState.punteggio.interazioniPunteggio.has(prerequisito.target);
    
    case 'INTERAZIONI_MULTIPLE':
      // Verifica che TUTTE le interazioni siano state completate
      return prerequisito.targets.every(target => 
        gameState.punteggio.interazioniPunteggio.has(target)
      );
    
    case 'LUOGO_VISITATO':
      return gameState.punteggio.luoghiVisitati.has(prerequisito.target);
    
    case 'OGGETTO_IN_INVENTARIO':
      return gameState.Oggetti.some(obj => 
        obj.ID === prerequisito.target && obj.IDLuogo === 0 && obj.Attivo >= 3
      );
    
    default:
      return false;
  }
}
```

---

## 2.3 Implementazione Temporizzazione

### 2.3.1 Costanti e Configurazione

**IMPORTANTE:** Verificare che la costante sia correttamente definita nel codice esistente. La lista deve escludere:
- ID=54 (luogo terminale con morte istantanea, vedi tabella HLD 1.2.2)
- ID=57 (rifugio sicuro)

```javascript
// Luoghi pericolosi (esclude ID=54 che è luogo terminale raggiungibile da ID=53 Sud, e ID=57 che è rifugio)
// ID=54 causa morte immediata all'ingresso (gestito come ID=8, ID=40), NON tramite timer intercettazione
const LUOGHI_PERICOLOSI = [51, 52, 53, 55, 56, 58];

// System commands che NON incrementano timer
const SYSTEM_COMMANDS = [
  'INVENTARIO', 'INV', 'I', 'COSA', '?',
  'AIUTO', 'HELP',
  'PUNTI', 'PUNTEGGIO', 'SCORE',
  'SALVA', 'SAVE',
  'CARICA', 'LOAD',
  'GUARDA_STANZA',  // GUARDA senza parametro
  'RESTART', 'RICOMINCIA',
  'QUIT', 'ESCI'
];

function isSystemCommand(comando) {
  return SYSTEM_COMMANDS.includes(comando.toUpperCase());
}
```

### 2.3.2 Funzioni di Check
Le funzioni devono essere chiamate in ordine di priorità dentro `executeCommand`.

**1. checkTorciaEsaurita():**
```javascript
function checkTorciaEsaurita() {
  if (!gameState.timers.torciaDifettosa) return null;
  
  if (gameState.timers.movementCounter >= 6) {
    return {
      resultType: 'GAME_OVER',
      deathReason: 'TORCIA_ESAURITA',
      message: GAME_OVER_MESSAGES.TORCIA_ESAURITA,
      stats: {
        mosse: gameState.timers.movementCounter,
        punteggio: gameState.punteggio.totale
      }
    };
  }
  return null;
}
```

**2. checkLampadaAbbandonata():**
```javascript
function checkLampadaAbbandonata() {
  if (!gameState.timers.lampadaAccesa) return null;
  
  // Check se lampada in inventario
  const lampadaInInventario = gameState.Oggetti.some(obj => 
    obj.Oggetto === 'Lampada' && obj.IDLuogo === 0 && obj.Attivo >= 3
  );
  
  if (!lampadaInInventario) {
    return {
      resultType: 'GAME_OVER',
      deathReason: 'LAMPADA_ABBANDONATA',
      message: GAME_OVER_MESSAGES.LAMPADA_ABBANDONATA
    };
  }
  return null;
}
```

**3. checkIntercettazione():**
```javascript
function checkIntercettazione() {
  const luogoAttuale = gameState.currentLocationId;
  const isPericoloso = LUOGHI_PERICOLOSI.includes(luogoAttuale);
  
  if (isPericoloso) {
    // Incrementa counter
    gameState.timers.azioniInLuogoPericoloso++;
    
    // Check limite
    if (gameState.timers.azioniInLuogoPericoloso >= 3) {
      return {
        resultType: 'GAME_OVER',
        deathReason: 'INTERCETTAZIONE',
        message: GAME_OVER_MESSAGES.INTERCETTAZIONE,
        stats: {
          azioni: gameState.timers.azioniInLuogoPericoloso
        }
      };
    }
  } else {
    // Reset solo se esci dalla zona pericolosa
    gameState.timers.azioniInLuogoPericoloso = 0;
  }
  
  return null;
}
```

### 2.3.3 Implementazione Comando ACCENDI LAMPADA

```javascript
// In executeCommand - case ACTION
if (verbo === 'ACCENDI' && oggetto === 'LAMPADA') {
  // Check lampada in inventario
  const lampadaInInventario = gameState.Oggetti.some(obj => 
    obj.Oggetto === 'Lampada' && obj.IDLuogo === 0 && obj.Attivo >= 3
  );
  
  if (!lampadaInInventario) {
    return { message: "Non hai la lampada con te." };
  }
  
  // Check lampada già accesa
  if (gameState.timers.lampadaAccesa) {
    return { message: "La lampada è già accesa." };
  }
  
  // Check fiammiferi in inventario
  const fiammiferiInInventario = gameState.Oggetti.some(obj => 
    obj.ID === 4 && obj.IDLuogo === 0 && obj.Attivo >= 3
  );
  
  if (!fiammiferiInInventario) {
    return { message: "Non hai niente per accendere la lampada." };
  }
  
  // Accendi lampada
  gameState.timers.lampadaAccesa = true;
  gameState.timers.torciaDifettosa = false;
  
  return { 
    message: "Accendi la lampada con i fiammiferi. Ora hai una fonte di luce affidabile!",
    accepted: true 
  };
}
```

### 2.3.4 Strutture Dati Game Over

```javascript
const GAME_OVER_MESSAGES = {
  TORCIA_ESAURITA: {
    titolo: "💀 OSCURITÀ FATALE",
    testo: `La tua torcia emette un ultimo tremulo bagliore, poi si spegne definitivamente. 

Nell'oscurità totale, inciampi su una trave marcescente e cadi pesantemente: il tonfo sordo è seguito da un dolore lancinante alla testa. 

Lentamente, perdi i sensi mentre la casa ti inghiotte nel buio eterno...

*** SEI MORTO ***

Motivo: Torcia difettosa esaurita
Suggerimento: Cerca la lampada nel ripostiglio e accendila con i fiammiferi entro le prime 6 mosse.`
  },
  
  INTERCETTAZIONE: {
    titolo: "💀 CATTURATO!",
    testo: `Rimanere fermi in una zona pattugliata è stato fatale. 

Una pattuglia sovietica ti ha individuato e circondato: non c'è via di fuga. 

Vieni trascinato al comando locale dove, dopo un breve interrogatorio, sei fucilato come spia occidentale.

*** SEI MORTO ***

Motivo: Intercettazione da pattuglia
Suggerimento: Non restare più di 2 azioni consecutive nello stesso luogo pericoloso. Continua a muoverti!`
  },
  
  LAMPADA_ABBANDONATA: {
    titolo: "💀 BUIO MORTALE",
    testo: `Lasciare la lampada accesa in un'altra stanza è stato un errore imperdonabile. 

Nel momento in cui varchi la soglia, l'oscurità ti avvolge completamente. Perdi l'equilibrio, cadi in una botola nascosta e precipiti fino al piano inferiore: l'impatto è fatale.

*** SEI MORTO ***

Motivo: Movimento senza fonte di luce
Suggerimento: La lampada deve essere sempre con te quando ti muovi al buio. PRENDI LAMPADA prima di lasciare una stanza.`
  },
  
  GUARDIA_SOSPETTA: {
    titolo: "💀 SOSPETTI FATALI",
    testo: `Il tuo comportamento strano e esitante ha insospettito la guardia di frontiera. 

Con un gesto secco, ordina ad altri soldati di circonderti. Sei stato identificato come agente nemico e portato via per essere giustiziato.

*** SEI MORTO ***

Motivo: Comportamento sospetto alla barriera
Suggerimento: Usa il comando PORGI DOCUMENTI alla barriera per superare il controllo.`
  }
};
```

---

## 2.4 Implementazione Vittoria

### 2.4.1 State Machine Narrativa - Enum Completo

```javascript
const NARRATIVE_STATE = {
  // Stato normale
  NORMAL: null,
  
  // Sequenza finale - Fase Atrio
  ENDING_PHASE_1A: 'ENDING_PHASE_1A',  // Incontro Ferenc (primo testo)
  ENDING_PHASE_1B: 'ENDING_PHASE_1B',  // Viaggio verso confine (secondo testo)
  
  // Sequenza finale - Fase Barriera
  ENDING_PHASE_2_WAIT: 'ENDING_PHASE_2_WAIT',  // Attesa comando PORGI DOCUMENTI
  ENDING_PHASE_2A: 'ENDING_PHASE_2A',          // Controllo documenti
  ENDING_PHASE_2B: 'ENDING_PHASE_2B',          // Guardia approva
  ENDING_PHASE_2C: 'ENDING_PHASE_2C',          // Vittoria finale
  
  // Stato terminale
  GAME_OVER: 'GAME_OVER'
};
```

**Gestione:** Se `gameState.awaitingContinue` è true, qualsiasi input chiama `processContinue()` invece di `parseInput()`.

### 2.4.2 Check Condizioni Vittoria

```javascript
function checkVictoryConditions() {
  if (gameState.currentLocationId !== 1) return false;
  
  const inventario = gameState.Oggetti.filter(obj => 
    obj.IDLuogo === 0 && obj.Attivo >= 3
  );
  
  const hasDocumenti = inventario.some(obj => obj.ID === 35);
  const hasLista = inventario.some(obj => obj.ID === 6);  // Solo ID=6!
  const hasDossier = inventario.some(obj => obj.ID === 34);
  
  return hasDocumenti && hasLista && hasDossier;
}
```

### 2.4.3 Logica Luogo 59 (Barriera)

```javascript
// In executeCommand - case ACTION
if (gameState.currentLocationId === 59 && 
    gameState.narrativeState === 'ENDING_PHASE_2_WAIT') {
  
  if (verbo === 'PORGI' && oggettoTarget === 'DOCUMENTI') {
    // Check presenza documenti in inventario
    const hasDocumenti = gameState.Oggetti.some(obj => 
      obj.ID === 35 && obj.IDLuogo === 0 && obj.Attivo >= 3
    );
    
    if (hasDocumenti) {
      return avanzaNarrativaFase2A();
    } else {
      return { message: "Non hai documenti da porgere." };
    }
  }
  
  // System commands permessi
  if (isSystemCommand(comando)) {
    return eseguiComandoSistema();
  }
  
  // Altri comandi: incrementa counter inappropriati
  gameState.unusefulCommandsCounter++;
  if (gameState.unusefulCommandsCounter >= 3) {
    return gameOverGuardiaSospetta();
  }
  
  return { message: "Non vedo alcuna utilità in questo." };
}
```

### 2.4.4 Implementazione Verb PORGI

**Aggiungere al Lessico.json:**
```json
{
  "ID_TipoLessico": 2,
  "Verbo": "PORGI",
  "Concetto": "Concetto: Porge Oggetto",
  "Sinonimi": ["PORGERE", "DAI", "DARE", "CONSEGNA", "CONSEGNARE", "MOSTRA", "MOSTRARE"]
}
```

### 2.4.5 Meccanica Teleport

```javascript
function teleportaALuogo59() {
  // 1. Cambia luogo corrente
  gameState.currentLocationId = 59;
  
  // 2. Rimuovi oggetti narrativi dall'inventario
  gameState.Oggetti.forEach(obj => {
    if ((obj.ID === 6 || obj.ID === 34) && obj.IDLuogo === 0) {
      // Lista (6) e Dossier (34) scompaiono (Ferenc li prende)
      obj.IDLuogo = -1;  // -1 = fuori dal gioco
      obj.Attivo = 0;    // Disattivati
    }
    // Documenti (ID=35) rimangono in inventario per PORGI DOCUMENTI
  });
  
  // 3. Blocca movimenti
  gameState.movementBlocked = true;
  
  // 4. Imposta stato narrativo
  gameState.narrativeState = NARRATIVE_STATE.ENDING_PHASE_2_WAIT;
  
  // 5. Reset counter comandi inappropriati
  gameState.unusefulCommandsCounter = 0;
  
  // 6. Mostra descrizione luogo 59
  return {
    resultType: 'NARRATIVE_TELEPORT',
    message: descriviLuogo(59),
    showLocation: true
  };
}
```

### 2.4.6 Cleanup Dati
*   **Oggetti.json:** Eliminare entry ID=28 (Lista di servizio duplicata). Usare solo ID=6.

---

## 2.5 Integrazione Core: Flusso di Esecuzione

Il cuore del sistema sarà la funzione `executeCommand` rivisitata:

```javascript
export function executeCommand(parseResult) {
  // 1. Check Awaiting Continue
  if (gameState.awaitingContinue) {
    return processContinue();
  }
  
  // 2. Check System Commands (NON incrementano timer)
  if (isSystemCommand(parseResult.comando)) {
    return eseguiComandoSistema(parseResult);
  }
  
  // 3. Incrementa movement counter (esclusi system commands)
  if (!isSystemCommand(parseResult.comando)) {
    gameState.timers.movementCounter++;
  }
  
  // 4. Check Torcia Esaurita
  const gameOverTorcia = checkTorciaEsaurita();
  if (gameOverTorcia) return gameOverTorcia;
  
  // 5. Check Movement Block (Luogo 59)
  if (gameState.movementBlocked && parseResult.tipo === 'NAVIGATION') {
    return { message: "Non puoi muoverti. La guardia ti sta osservando." };
  }
  
  // 6. Check Vittoria (NAVIGATION verso Luogo 1)
  if (parseResult.tipo === 'NAVIGATION' && parseResult.destinazione === 1) {
    if (checkVictoryConditions()) {
      return avviaNarrativaVittoria();
    }
  }
  
  // 7. Check Luogo 59 - Logica "Guardia Sospetta"
  if (gameState.currentLocationId === 59 && 
      gameState.narrativeState === 'ENDING_PHASE_2_WAIT') {
    return handleLuogo59Commands(parseResult);
  }
  
  // 8. Esecuzione Standard
  const result = eseguiComandoStandard(parseResult);
  
  // 9. Post-esecuzione: Check Lampada Abbandonata (solo dopo NAVIGATION)
  if (parseResult.tipo === 'NAVIGATION' && result.accepted) {
    const gameOverLampada = checkLampadaAbbandonata();
    if (gameOverLampada) return gameOverLampada;
  }
  
  // 10. Check Intercettazione
  const gameOverIntercettazione = checkIntercettazione();
  if (gameOverIntercettazione) return gameOverIntercettazione;
  
  // 11. Update Punteggio - Verifica Misteri
  verificaMisteriRisolti();
  
  return result;
}
```

---

# CAPITOLO 3: PIANO DI IMPLEMENTAZIONE

Sequenza ottimizzata per minimizzare rischi di regressione e facilitare il testing.

## Fase 1: Fondamenta e Pulizia Dati (Basso Rischio)
*   **Obiettivo:** Preparare il terreno senza alterare la logica di gioco attuale.
*   **Task:**
    1.  Eliminare oggetto ID=28 da `Oggetti.json`.
    2.  Estendere `gameState` in `engine.js` con tutte le nuove strutture (punteggio, timers, narrative).
    3.  Aggiornare `saveGame`/`loadGame` per gestire i nuovi campi (inclusa serializzazione Set).
    4.  Creare file `Misteri.json` in `src/data-internal/`.
    5.  Aggiungere verbo PORGI al `Lessico.json`.
*   **Test:** Verificare che il gioco carichi, salvi e ricarichi senza errori.

## Fase 2: Sistema di Punteggio (Basso Rischio)
*   **Obiettivo:** Implementare il sistema di reward (non bloccante).
*   **Task:**
    1.  Identificare e marcare 15-20 interazioni in `Interazioni.json` con `"punteggio": 2`.
    2.  Implementare logica punteggio in `engine.js`:
        - Luoghi: incremento al primo accesso
        - Interazioni: incremento se metadata presente
        - Misteri: funzione `verificaMisteriRisolti()`
    3.  Implementare comando `PUNTI` con visualizzazione ranghi.
*   **Test:** 
    - Visitare 10 luoghi → Verificare +10 punti
    - Eseguire interazione con punteggio → Verificare +2 punti
    - Prendere oggetto per mistero → Verificare +3 punti
    - Comando PUNTI → Verificare output corretto

## Fase 3: Sistema di Temporizzazione (Medio Rischio)
*   **Obiettivo:** Introdurre le condizioni di morte.
*   **Task:**
    1.  Implementare costanti `LUOGHI_PERICOLOSI` e `SYSTEM_COMMANDS`.
    2.  Implementare funzione `isSystemCommand()`.
    3.  Implementare le 3 funzioni di check con messaggi Game Over:
        - `checkTorciaEsaurita()`
        - `checkLampadaAbbandonata()`
        - `checkIntercettazione()`
    4.  Implementare comando `ACCENDI LAMPADA`.
    5.  Integrare i check in `executeCommand` rispettando l'ordine di priorità.
    6.  Gestire incremento `movementCounter` (esclusi system commands).
*   **Test:**
    - Aspettare 6 turni senza accendere lampada → Morte torcia
    - Stare 3 turni in luogo 51 → Morte intercettazione
    - Spostarsi tra luoghi 51 e 55 → Counter NON resetta
    - Spostarsi da 51 a 47 → Counter resetta
    - Lasciare lampada accesa e uscire → Morte buio
    - Accendere lampada con fiammiferi → Timer torcia disattivato
    - System commands → NON incrementano counter

## Fase 4: Sistema di Vittoria (Alto Rischio)
*   **Obiettivo:** Implementare il finale e la state machine.
*   **Task:**
    1.  Implementare enum `NARRATIVE_STATE` completo.
    2.  Implementare `checkVictoryConditions()` (oggetti ID=6, 34, 35).
    3.  Implementare logica `awaitingContinue` e bypass parser.
    4.  Implementare sequenza narrativa (Fase 1A, 1B, Teleport):
        - Dialoghi Ferenc
        - Meccanica BARRA SPAZIO
        - Funzione `teleportaALuogo59()`
    5.  Implementare logica Luogo 59:
        - Blocco movimento (`movementBlocked`)
        - Comando PORGI DOCUMENTI
        - Counter comandi inappropriati
        - Game Over guardia sospetta
    6.  Implementare fasi finali (2A, 2B, 2C) e schermata vittoria.
*   **Test:**
    - Arrivare al luogo 1 senza oggetti → Nulla accade
    - Arrivare con solo 2 oggetti → Nulla accade
    - Arrivare con 3 oggetti (6, 34, 35) → Parte sequenza 1A
    - Premere BARRA in fase 1A → Avanza a 1B
    - Premere BARRA in fase 1B → Teleport a luogo 59
    - Al luogo 59: verificare Lista e Dossier rimossi, Documenti rimasti
    - Tentare movimento al luogo 59 → Bloccato
    - Provare 3 comandi inutili al luogo 59 → Game Over guardia
    - System commands al luogo 59 → NON incrementano counter
    - PORGI DOCUMENTI al luogo 59 → Avanza a 2A
    - Completare sequenza → Vittoria e statistiche

## Fase 5: UI e Polish (Basso Rischio)
*   **Obiettivo:** Migliorare l'esperienza utente.
*   **Task:**
    1.  (Opzionale) Aggiungere barra punteggio in HTML/CSS.
    2.  Rifinire testi e messaggi Game Over.
    3.  Bilanciamento finale punteggi.
    4.  Playtest completo con utenti esterni.
    5.  Documentare achievement nascosti.

---

## 3.1 Open Points e Decisioni Rinviate

Questioni identificate durante la stesura della specifica che richiedono ulteriore analisi o implementazione successiva:

### OP-01: Interazioni con Punteggio (Priorità: Alta)
**Status:** Da completare in Fase 2  
**Descrizione:** Identificare 7-12 interazioni aggiuntive oltre alle 8 già mappate per raggiungere il target di 15-20 interazioni totali (~34 punti).  
**Azione richiesta:** Analizzare `Interazioni.json` completo cercando effetti `SBLOCCA_DIREZIONE`, `VISIBILITA`, `AGGIUNGI_OGGETTO`.  
**Blocca:** Nessuna fase (non bloccante per Fase 1).

### OP-02: Casi Limite Testing (Priorità: Media)
**Status:** Parzialmente risolto (punto 2 implementato)  
**Domande aperte:**
1. Cosa succede se il giocatore accende la lampada DOPO che la torcia si è già esaurita? (Game Over già attivato o possibile recovery?)
2. ~~Cosa succede se il giocatore entra in luogo 59 prima di completare la sequenza vittoria?~~ **RISOLTO:** Luogo 59 non accessibile tramite movimento (ID=1 campo Ovest=0). Raggiungibile solo via teleport in Fase 1B.
3. Che messaggi riceve il giocatore se prova `PORGI DOCUMENTI` in luogo diverso da 59 o prima di Fase 2_WAIT?  
**Azione richiesta:** Definire comportamenti edge case durante implementazione e testing.  
**Blocca:** Nessuna fase (da gestire con test di regressione).

### OP-03: Bilanciamento Punteggio Finale (Priorità: Bassa)
**Status:** Da validare post-implementazione  
**Descrizione:** Verificare che il punteggio massimo di 122 punti sia effettivamente raggiungibile completando tutte le interazioni identificate in OP-01.  
**Azione richiesta:** Playtest completo in Fase 5 con utente che tenta 100% completion.  
**Blocca:** Solo Fase 5 (Polish).

---

## 3.2 Raccomandazioni Implementative

### 3.2.1 Priorità di Sviluppo
1.  **Fase 1 (Setup):** Essenziale - blocca tutte le altre fasi
2.  **Fase 2 (Punteggio):** Alta priorità - migliora UX senza rischi
3.  **Fase 3 (Timer):** Media priorità - richiede testing accurato
4.  **Fase 4 (Vittoria):** Alta priorità - core feature
5.  **Fase 5 (Polish):** Bassa priorità - post-release

### 3.2.2 Gestione Rischi
- **Regressioni:** Creare branch Git separato per ogni fase
- **Testing:** Eseguire test manuali completi dopo ogni fase
- **Rollback:** Mantenere backup di `Oggetti.json` e `Interazioni.json`
- **Debugging:** Aggiungere console.log strategici per tracciare stato

### 3.2.3 Note Tecniche
- **Performance:** I `Set` sono O(1) per check membership - preferibili ad Array
- **Memoria:** Limite 9 misteri × 3pt = 27pt - non eccedere per bilanciamento
- **Serializzazione:** Testare save/load dopo ogni modifica a `gameState`
- **Compatibilità:** Verificare funzionamento su Chrome, Firefox, Safari, Edge

### 3.2.4 Chiarimenti Finali Risolti
- ✅ Luogo 54: Luogo terminale raggiungibile da ID=53 via direzione Sud (morte istantanea, gestito come ID=8/ID=40)
- ✅ Luogo 57 (Capanno attrezzi): intenzionalmente **non pericoloso** (rifugio)
- ✅ Mistero cassaforte: Richiede ENTRAMBE le azioni (sposta quadro + sequenza ruota destra/sinistra)
- ✅ Interazioni con punteggio: 8 identificate + 7-12 da completare (vedi OP-01)
- ✅ Numero misteri: 9 totali per bilanciamento (27 punti)
- ✅ Punteggio massimo: **122 punti** (57 + 34 + 27 + 4)
- ✅ Reset intercettazione: solo uscendo da zone pericolose (opzione A)
- ✅ System commands: whitelist completa definita (non contano per timer)
- ✅ Teleport: Lista e Dossier rimossi, Documenti conservati
- ✅ Verbo PORGI: solo luogo 59, sintassi "PORGI DOCUMENTI"

---

# FINE SPECIFICA TECNICA INTEGRATA

**Prossimi Step:**
1. Review finale con stakeholder
2. Approval per implementazione
3. Creazione task Jira/GitHub Issues per ogni fase
4. Kickoff sviluppo Fase 1
