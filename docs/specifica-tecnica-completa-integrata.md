# Specifica Tecnica Unificata - Missione Odessa

**Versione:** 2.0  
**Data:** 01 gennaio 2026  
**Status:** Approved for Implementation - Integrata  
**Riferimenti:** `sistema-punteggio.md`, `sistema-temporizzazione.md`, `sistema-vittoria.md`

---

# CAPITOLO 1: HIGH LEVEL DESIGN (HLD)

Questo capitolo descrive le logiche funzionali, l'esperienza utente e le regole di gioco, indipendentemente dall'implementazione tecnica.

## 1.1 Sistema di Punteggio

L'obiettivo è incentivare l'esplorazione completa e premiare la risoluzione di enigmi, senza imporre grinding.

### 1.1.1 Categorie di Punteggio
Il punteggio totale (massimo 132 punti) è la somma di quattro categorie:

| Categoria | Valore | Condizione di Assegnazione | Note |
|-----------|--------|----------------------------|------|
| **Esplorazione** | 1 pto | Primo ingresso in un nuovo luogo | Totale 57 luoghi. Backtracking non premia. |
| **Interazioni** | 2 pti | Azioni che sbloccano passaggi o rivelano oggetti | Totale 15 interazioni. Anche ripetibili contano alla prima esecuzione. |
| **Misteri** | 3 pti | Effetti strutturali automatici (oggetto visibile, direzione sbloccata) | Totale 13 misteri. Assegnati automaticamente al verificarsi dell'effetto. |
| **Sequenza Cassaforte** | 2 pti | Completamento pattern D-S-S-D-S (5 rotazioni) | Award al completamento della sequenza completa. |
| **Completamento** | 4 pti | Raggiungimento del finale di gioco | Assegnato alla vittoria. |

### 1.1.2 Feedback Utente
- **Comando PUNTI:** Visualizza il dettaglio (Luoghi, Interazioni, Misteri) e il rango raggiunto.
- **Notifiche:** (Opzionale) Feedback visivo immediato quando si guadagnano punti.
- **HUD:** (Opzionale) Contatore sempre visibile nell'interfaccia web.

### 1.1.3 Sistema di Ranghi
Il giocatore ottiene un rango in base al punteggio totale accumulato:

| Punteggio | Rango | Descrizione |
|-----------|-------|-------------|
| 0-33 | Novizio | Hai appena iniziato |
| 34-66 | Esploratore | Stai imparando le basi |
| 67-99 | Investigatore | Buone capacità investigative |
| 100-131 | Maestro | Ottima esplorazione |
| 132 | Perfezionista | Completamento al 100%! |

**Punteggio massimo:** 132 punti (57 luoghi + 30 interazioni + 39 misteri + 2 sequenza + 4 completamento)

### 1.1.4 Definizione Misteri
I **misteri** sono effetti strutturali automatici che premiano la prima volta che si verificano eventi significativi:

**Tipi di Mistero:**

1. **VISIBILITA (9 misteri)**: Oggetto diventa visibile/prendibile
   - Cassaforte, Forma circolare, Scomparto segreto, Foglio (Documenti), Porta aperta, Botola, Dossier, Bastone comando, Medaglione

2. **SBLOCCA_DIREZIONE (4 misteri)**: Passaggio bidirezionale permanente si apre
   - Passaggio 20↔21 (Stanza segreta sud), Passaggio 27↔28, Passaggio 36↔37 (Torture), Passaggio 49↔50
   - **Nota:** Direzioni bidirezionali contano come 1 mistero unico

3. **TOGGLE_DIREZIONE (2 misteri)**: Passaggio toggle si apre per la prima volta
   - Passaggio 44↔45 (pulsante), Passaggio 42↔43 (sedile)
   - **Nota:** Solo prima apertura (0→valore) dà punti, chiusure/riaperture successive ignorate

**Totale:** 13 misteri × +3 = 39 punti massimi

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
- **Luoghi Pericolosi:** ID=51, 52, 53, 55, 56, 58 (vedi Tabella Luoghi Critici sotto per dettagli completi)
  - **Nota:** ID=54 (Posto di blocco - Fine) è un **luogo terminale** raggiungibile da ID=53 tramite direzione Sud. Causa Game Over immediato all'ingresso (morte istantanea), NON tramite timer. Gestione identica a ID=40 (Dentro pozzo). Non è incluso in costante implementativa `LUOGHI_PERICOLOSI`.
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

**⚠️ DESIGN DECISION:** Durante l'analisi del codice esistente (post § 3.1) è emerso che esiste già un sistema `visitedPlaces: Set` funzionante che traccia i luoghi visitati con prevenzione automatica dei doppi conteggi. Per evitare duplicazione, **riutilizzeremo `visitedPlaces`** invece di creare `punteggio.luoghiVisitati`. Vedere § 2.1.1 per dettagli.

```javascript
gameState = {
  // ... campi esistenti ...
  visitedPlaces: new Set([1]),     // ✅ ESISTENTE - Riutilizzato per punteggio luoghi

  // === SISTEMA PUNTEGGIO ===
  punteggio: {
    totale: 0,
    // luoghiVisitati: RIMOSSO - usa visitedPlaces esistente
    interazioniPunteggio: new Set(), // ID interazioni completate (per +2)
    misteriRisolti: new Set()        // ID misteri risolti (per +3 automatico su effetti)
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

### 2.1.1 Design Decision: Riuso visitedPlaces e Misteri Automatici

#### Decisione 1: Riuso visitedPlaces

**Contesto:** L'applicazione possiede già un sistema `visitedPlaces` implementato e funzionante:
- **Lato client:** `web/js/odessa1.js` mantiene `let visitedPlaces = new Set()` aggiornato automaticamente ad ogni movimento
- **Lato server:** `src/logic/engine.js` ha `visitedPlaces: new Set([1])` nel gameState
- **Serializzazione:** Save/load già gestiscono correttamente Set ↔ Array conversion
- **UI:** Già visualizza contatore "Luoghi visitati: N" nell'interfaccia
- **Prevenzione doppi conteggi:** Il `Set` nativo JavaScript impedisce automaticamente duplicati

**Problema identificato:** Il server non sincronizza `visitedPlaces` quando cambia location (funzione `setCurrentLocation()` non aggiorna il Set).

**Decisione implementativa:**
1. ✅ **Riutilizzare `visitedPlaces`** per il calcolo punteggio luoghi (eliminare `punteggio.luoghiVisitati`)
2. ✅ Aggiornare `setCurrentLocation()` per sincronizzare il Set server con cambio location
3. ✅ Calcolare punti luoghi con `visitedPlaces.size` invece di gestire Set separato

**Rationale:**
- Elimina duplicazione dati (un solo Set invece di due)
- Riutilizza codice esistente, testato e funzionante
- UI già mostra il conteggio senza modifiche
- Serializzazione già implementata e validata
- Semplifica implementazione § 3.2 (da 30 min a 5 min per logica luoghi)

**Impatto:** Riduzione effort § 3.2 da ~1.5h a ~1h totale.

#### Decisione 2: Misteri come Effetti Automatici

**Contesto:** Originariamente Misteri.json conteneva 9 definizioni di "obiettivi narrativi" da +3 punti ciascuno. L'analisi ha rivelato che 8 su 9 erano conseguenze automatiche di altre azioni già premiate (es. "trova dossier" +3 dopo "esamina botola" +2 = +5 per stessa azione).

**Problema:**
- Doppio conteggio: interazione +2 + mistero automatico +3 = +5 per singola azione
- Ambiguità su cosa è "mistero" vs "interazione"
- File Misteri.json ridondante con sistema effetti già esistente

**Soluzione adottata:**
- **Mistero = effetto strutturale automatico** (VISIBILITA, SBLOCCA_DIREZIONE, TOGGLE_DIREZIONE)
- Award +3 inline quando effetto si verifica per la prima volta
- Tracking in `punteggio.misteriRisolti` per evitare duplicati
- Eliminazione completa di Misteri.json

**Vantaggi:**
- Logica unificata: 1 interazione → 1 effetto → punti correlati
- Coerenza UX: giocatore capisce perché riceve punti (oggetto appare, porta si apre)
- Manutenibilità: modifiche agli effetti aggiornano automaticamente i misteri

**Caso speciale 1:** Direzioni bidirezionali (es. 20↔21) contano come 1 mistero unico nonostante creino 2 effetti SBLOCCA_DIREZIONE. Tracking su direzione primaria (es. "direzione_20_Sud").

**Caso speciale 2:** TOGGLE_DIREZIONE assegna mistero solo alla prima apertura (0→valore), ignorando chiusure e riaperture successive.

**Caso speciale 3:** Sequenza cassaforte gestita separatamente, assegna +2 (non +3) al completamento D-S-S-D-S.

---

## 2.2 Implementazione Punteggio

### 2.2.1 Componenti e Logica

#### A) Luoghi Visitati (+1 ciascuno)
- **Massimo:** 57 punti
- **Tracking:** Set `gameState.visitedPlaces` (riuso esistente)
- **Award:** Automatico alla prima visita del luogo
- **Implementazione:** Modificare `setCurrentLocation(locationId)` aggiungendo `gameState.visitedPlaces.add(locationId)` per sincronizzazione server. Calcolo punti: `visitedPlaces.size × 1`.
- **Effort:** 5 min (una riga di codice)

#### B) Interazioni Eseguite (+2 ciascuna)
- **Massimo:** 30 punti (15 interazioni)
- **Tracking:** Set `gameState.punteggio.interazioniPunteggio`
- **Award:** Immediato alla prima esecuzione
- **Ripetibili:** Anche interazioni ripetibili contano +2 alla prima esecuzione
- **Implementazione:** Modificare `cercaEseguiInterazione()` per controllare se ID già in Set, altrimenti aggiungere e incrementare totale di +2.
- **Effort:** 20 min

**Elenco 15 Interazioni:**
1. sposta_quadro_24
2. sposta_arazzo_20
3. muovi_fermacarte_25
4. esamina_scomparto_25
5. infila_medaglione_forma_20
6. infila_statuetta_nicchia_27
7. infila_medaglione_forma_36
8. carica_pesa_57
9. esamina_botola_57 (ripetibile, conta prima volta)
10. premi_pulsante_44 (ripetibile, conta prima volta)
11. ruota_sedile_42 (ripetibile, conta prima volta)
12. scava_macerie_11 (ripetibile, conta prima volta)
13. scava_macerie_49
14. esamina_cassaforte_con_medaglione_24 (ripetibile, conta prima volta)
15. porgi_documenti_59

#### C) Misteri Risolti (+3 ciascuno)
- **Massimo:** 39 punti (13 misteri)
- **Tracking:** Set `gameState.punteggio.misteriRisolti`
- **Award:** Automatico quando interazione produce effetto strutturale
- **Definizione:** Mistero = effetto VISIBILITA, SBLOCCA_DIREZIONE, o TOGGLE_DIREZIONE (solo prima apertura)
- **Implementazione:** Nuova funzione `assegnaPunteggioMistero(effetto, gameState)` chiamata per ogni effetto applicato. Controlla tipo effetto e assegna +3 se prima volta.
- **Effort:** 40 min

**Tipi di Mistero:**

1. **VISIBILITA (9 misteri):** Oggetto diventa visibile/prendibile
   - ID formato: `"visibilita_NomeOggetto"`
   - Esempi: "visibilita_Cassaforte", "visibilita_Medaglione", "visibilita_Dossier"
   - Logica: `const misteroId = \`visibilita_${effetto.target}\`; if (!misteriRisolti.has(misteroId)) { totale += 3; misteriRisolti.add(misteroId); }`
   
2. **SBLOCCA_DIREZIONE (4 misteri):** Passaggio bidirezionale permanente
   - ID formato: `"direzione_Luogo_Direzione"`
   - Conta come 1 mistero unico anche se crea 2 direzioni (andata+ritorno)
   - Esempi: "direzione_20_Sud" (rappresenta 20↔21), "direzione_36_Ovest" (36↔37)
   - Logica: `const misteroId = \`direzione_${effetto.luogo}_${effetto.direzione}\`; if (!misteriRisolti.has(misteroId)) { totale += 3; misteriRisolti.add(misteroId); }`
   
3. **TOGGLE_DIREZIONE (2 misteri):** Passaggio toggle alla prima apertura
   - ID formato: `"direzione_Luogo_Direzione"`
   - Award solo quando direzione passa da 0 a valore (apertura)
   - Chiusure/riaperture successive NON danno punti
   - Esempi: "direzione_44_Est" (pulsante), "direzione_42_Est" (sedile)
   - Logica: `const direzionePrima = luoghi[effetto.luogo][effetto.direzione]; if (direzionePrima === 0 && effetto.destinazione > 0) { const misteroId = \`direzione_${effetto.luogo}_${effetto.direzione}\`; if (!misteriRisolti.has(misteroId)) { totale += 3; misteriRisolti.add(misteroId); } }`

#### D) Sequenza Cassaforte (+2)
- **Tracking:** Verifica `SEQUENZA_COMPLETATA` per "cassaforte_24"
- **Award:** Al completamento pattern D-S-S-D-S (5 rotazioni corrette)
- **Implementazione:** Quando sequenza completata, verificare se "sequenza_cassaforte" già in `misteriRisolti`, altrimenti aggiungere e incrementare totale di +2.
- **Nota:** Gestione separata dalle interazioni normali tramite sistema SEQUENZA esistente
- **Effort:** 15 min

#### E) Completamento Gioco (+4)
- Award al comando `PORGI DOCUMENTI` al luogo 59

**Punteggio Massimo Totale:** 57 + 30 + 39 + 2 + 4 = **132 punti**

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

**⚠️ OPEN POINT #1:** Lista completa interazioni con punteggio da completare durante § 3.2 (analisi Interazioni.json). Target: 15-20 interazioni totali per raggiungere ~34 punti. Questo open point non blocca l'avvio della § 3.1 (Setup). Dettagli: vedere § 3.6 OP-01.

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
      return gameState.visitedPlaces.has(prerequisito.target); // ✅ Usa visitedPlaces esistente
    
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

## 3.1 Fondamenta e Pulizia Dati (Basso Rischio) ✅ **COMPLETATO**
*   **Obiettivo:** Preparare il terreno senza alterare la logica di gioco attuale.
*   **Task:**
    1.  ✅ Eliminare oggetto ID=28 da `Oggetti.json`.
    2.  ✅ Estendere `gameState` in `engine.js` con tutte le nuove strutture (punteggio, timers, narrative).
    3.  ✅ Aggiornare `saveGame`/`loadGame` per gestire i nuovi campi (inclusa serializzazione Set).
    4.  ✅ Creare file `Misteri.json` in `src/data-internal/`.
    5.  ✅ Aggiungere verbo PORGI al `VociLessico.json` e `TerminiLessico.json`.
*   **Test:** ✅ Verificato che il gioco carichi, salvi e ricarichi senza errori.
*   **Note post-implementazione:** Durante l'analisi è emerso che `visitedPlaces` esiste già e funziona correttamente. La struttura `punteggio.luoghiVisitati` aggiunta in questo sprint è **ridondante** e verrà **eliminata in § 3.2** a favore del riuso di `visitedPlaces` esistente. Vedere § 2.1.1 per design decision completa.

## 3.2 Sistema di Punteggio Unificato +2/+3 (Basso Rischio)
*   **Obiettivo:** Implementare il sistema di reward con misteri automatici inline.
*   **Effort totale:** ~90 min (1.5 ore)
*   **Strategia:** Suddivisione in 3 sottosprint per isolare task critico e garantire checkpoint testabili.

---

### 3.2.1 Fondamenta Punteggio (25 min) - **SOTTOSPRINT 1** ✅ **COMPLETATO** (2026-01-01)
*   **Obiettivo:** Sistema base luoghi + interazioni funzionante
*   **Effort:** 25 min
*   **Status:** ✅ Implementato e testato
*   **Commit:** `dff7fb9` - feat(scoring): implement base scoring system (§3.2.1 - locations + interactions)
*   **Task:****
    1.  **Pulizia gameState** (5 min): Rimuovere campo `punteggio.luoghiVisitati` da definizione gameState e funzione resetGameState. Verificare serializzazione corretta di `punteggio.misteriRisolti` in `getGameStateSnapshot()` e `setGameState()`.
    
    2.  **Sincronizzazione Luoghi** (10 min): Modificare `setCurrentLocation(locationId)` aggiungendo:
        ```javascript
        if (!gameState.visitedPlaces.has(locationId)) {
          gameState.visitedPlaces.add(locationId);
          gameState.punteggio.totale += 1;
        }
        ```
    
    3.  **Logica Interazioni** (10 min): Modificare `cercaEseguiInterazione()` per aggiungere dopo esecuzione interazione:
        ```javascript
        if (!gameState.punteggio.interazioniPunteggio.has(interazioneId)) {
          gameState.punteggio.totale += 2;
          gameState.punteggio.interazioniPunteggio.add(interazioneId);
          // Feedback: "+2 punti: interazione completata!"
        }
        ```

*   **Test Sottosprint 1:**
    - [x] ✅ Visitare 3 luoghi nuovi → Verificare +3 punti totali
    - [x] ✅ Eseguire interazione → Verificare +2 punti
    - [x] ✅ Rieseguire stessa interazione → Verificare NO +2 (già contata)
    - [x] ✅ Salva/Carica → Verificare persistenza punteggio base (già gestito correttamente da getGameStateSnapshot/setGameState)
    - **Note:** 5/8 test passano in scoring.base.test.ts; 3 test skippati richiedono prerequisiti specifici (saranno risolti in § 3.2.2)

*   **Deliverable:** Sistema punteggio base (57 luoghi + 30 interazioni) funzionante
*   **Git Commit:** `feat: implement base scoring system (locations + interactions)`

---

### 3.2.2 Misteri Automatici (45 min) - **SOTTOSPRINT 2 ⚠️ CRITICO**
*   **Obiettivo:** Implementare logica misteri inline con 3 tipi effetti
*   **Effort:** 45 min
*   **Task:**
    4.  **Logica Misteri Automatici** (40 min): Creare funzione `assegnaPunteggioMistero(effetto, gameState)` che analizza tipo effetto:
        
        **Sottotask 4a - VISIBILITA** (10 min):
        ```javascript
        if (effetto.tipo === "VISIBILITA") {
          const misteroId = `visibilita_${effetto.target}`;
          if (!gameState.punteggio.misteriRisolti.has(misteroId)) {
            gameState.punteggio.totale += 3;
            gameState.punteggio.misteriRisolti.add(misteroId);
          }
        }
        ```
        
        **Sottotask 4b - SBLOCCA_DIREZIONE** (10 min):
        ```javascript
        if (effetto.tipo === "SBLOCCA_DIREZIONE") {
          const misteroId = `direzione_${effetto.luogo}_${effetto.direzione}`;
          if (!gameState.punteggio.misteriRisolti.has(misteroId)) {
            gameState.punteggio.totale += 3;
            gameState.punteggio.misteriRisolti.add(misteroId);
          }
        }
        ```
        **Nota:** Direzioni bidirezionali (es. 20↔21) contano come 1 mistero unico perché tracking è su direzione primaria.
        
        **Sottotask 4c - TOGGLE_DIREZIONE** (20 min):
        ```javascript
        if (effetto.tipo === "TOGGLE_DIREZIONE") {
          // Leggi stato PRIMA dell'applicazione effetto
          const direzionePrima = gameState.luoghi[effetto.luogo][effetto.direzione];
          
          // Solo se sta APRENDO (0 → valore)
          if (direzionePrima === 0 && effetto.destinazione > 0) {
            const misteroId = `direzione_${effetto.luogo}_${effetto.direzione}`;
            if (!gameState.punteggio.misteriRisolti.has(misteroId)) {
              gameState.punteggio.totale += 3;
              gameState.punteggio.misteriRisolti.add(misteroId);
            }
          }
          // Chiusure (valore → 0) e riaperture: NO +3
        }
        ```
        
        Chiamare `assegnaPunteggioMistero()` per ogni effetto in `applicaEffetti()` dopo applicazione effetto.

*   **Test Sottosprint 2 (dettagliati):**
    - [ ] Interazione con VISIBILITA → +2 (interazione) + +3 (mistero) = +5 totali
    - [ ] Interazione con SBLOCCA → +2 + +3 = +5 totali
    - [ ] Direzione bidirezionale (es. 20↔21) → +3 una volta sola (non +6)
    - [ ] Toggle prima apertura (es. pulsante 44) → +2 (int) + +3 (mist) = +5
    - [ ] Toggle chiusura → +2 (int), NO +3 mistero ✓
    - [ ] Toggle riapertura → +2 (int), NO +3 mistero ✓
    - [ ] Verificare Set `misteriRisolti` contiene ID corretti
    - [ ] Salva/Carica → Verificare persistenza misteri

*   **Deliverable:** Sistema misteri completo (39 punti massimi da misteri)
*   **Git Commit:** `feat: implement automatic mysteries scoring system`

---

### 3.2.3 Sequenza, UI e Polish (20 min) - **SOTTOSPRINT 3**
*   **Obiettivo:** Completare feature con sequenza cassaforte e interfaccia utente
*   **Effort:** 20 min (task 8 già completato)
*   **Task:**
    5.  **Logica Sequenza Cassaforte** (10 min): Dopo completamento sequenza "cassaforte_24":
        ```javascript
        const misteroId = "sequenza_cassaforte";
        if (!gameState.punteggio.misteriRisolti.has(misteroId)) {
          gameState.punteggio.totale += 2;  // +2 per sequenza (non +3)
          gameState.punteggio.misteriRisolti.add(misteroId);
        }
        ```
    
    6.  **Comando PUNTI** (5 min): Implementare comando che mostra:
        ```
        Punteggio totale: X/132
        - Luoghi visitati: X/57
        - Interazioni eseguite: X/15
        - Misteri risolti: X/13
        - Sequenza cassaforte: [completata/da completare]
        - Completamento: [sì/no]
        
        Rango: [Novizio/Esploratore/Investigatore/Maestro/Perfezionista]
        ```
        Ranghi: 0-33 Novizio, 34-66 Esploratore, 67-99 Investigatore, 100-131 Maestro, 132 Perfezionista.
    
    7.  ~~**UI Punteggio**~~ ✅ **COMPLETATO ANTICIPATAMENTE** (2026-01-01): 
        - **Commit:** `0abea54` + `02a46c0` - feat(ui): add score display + refactor(ui): unify stats logic
        - Aggiunto `<div id="scoreCount">` in web/odessa_main.html (colore oro #ffd700, grassetto)
        - Creata funzione `updateGameStats()` che recupera da endpoint `/api/engine/stats`
        - **Decisione architetturale:** Unificata logica visualizzazione statistiche:
          - Prima: visitedCount (client Set locale) ❌ + scoreCount (server API) ✅ → inconsistente
          - Dopo: entrambi da `/api/engine/stats` (single source of truth: server gameState) ✅
          - Benefici: coerenza, affidabilità SALVA/CARICA, 1 API call invece di 2
    
    8.  ~~**Eliminazione Misteri.json**~~ ✅ **GIÀ COMPLETATO** (2026-01-01): File eliminato, nessun riferimento nel codice.

*   **Test Sottosprint 3 (finali):**
    - [ ] Completare sequenza D-S-S-D-S → Verificare +2 una sola volta
    - [ ] Comando PUNTI mostra dettaglio corretto e rango appropriato
    - [x] ✅ UI mostra punteggio aggiornato in tempo reale (anticipato, già testato)
    - [ ] Test E2E: Visitare 5 luoghi, fare 3 interazioni con misteri → Verificare calcolo corretto (es. 5+6+9=20 punti)
    - [ ] Salva/Carica → Verificare persistenza completa (totale, Set, UI sincronizzata)

*   **Deliverable:** Feature § 3.2 completa con UI e comando PUNTI
*   **Git Commit:** `feat: add cassaforte sequence + PUNTI command + UI scoring display`

---

**Vantaggi Suddivisione:**
- ✅ Checkpoint intermedi testabili e deployabili
- ✅ Isolamento task critico (3.2.2) per massima attenzione
- ✅ Rollback granulare (puoi tornare a 3.2.1 stabile se 3.2.2 fallisce)
- ✅ Testing incrementale (più facile identificare regressioni)
- ✅ 3 commit chiari nella history invece di 1 monolitico

## 3.3 Sistema di Temporizzazione (Medio Rischio)
*   **Obiettivo:** Introdurre le condizioni di morte.
*   **Task:**
    1.  Estendere `gameState.timers` con campi per 3 timer.
    2.  Implementare check functions (`checkTorciaEsaurita`, `checkIntercettazione`, `checkLampadaAbbandonata`).
    3.  Integrare check nel flusso `executeCommand`.
    4.  Implementare comando `ACCENDI LAMPADA`.
*   **Test:**
    - Trigger manuale dei 3 game over (30 min)
    - Verificare messaggi dettagliati
    - Test E2E: morte torcia, morte intercettazione, morte lampada

## 3.4 Sequenza Vittoria (Alto Rischio)
*   **Obiettivo:** Implementare il finale di gioco completo.
*   **Task:**
    1.  Estendere `gameState` per narrativa (state machine ENDING_PHASE_*).
    2.  Implementare check condizioni vittoria (3 oggetti in Luogo 1).
    3.  Implementare sequenze Fase 1A/1B con BARRA SPAZIO.
    4.  Implementare teleport Luogo 59 + rimozione Lista/Dossier.
    5.  Implementare comando PORGI DOCUMENTI.
    6.  Implementare fasi 2A/2B/2C con schermata vittoria.
*   **Test:**
    - Playtest completo inizio→fine (45 min)
    - Verificare prerequisiti (mancanza Documenti = no trigger)
    - Test comandi inappropriati al Luogo 59 (game over)
    - Verificare statistiche finali

---

# CAPITOLO 4: REFACTORING OPZIONALE (TD)

**Status:** Non prioritario per v1.0 - Da valutare post-release  
**Effort stimato:** 5-7 ore  
**Prerequisito:** Completamento §§ 3.1-3.4 (feature implementation) + Deploy v1.0  
**Riferimento decisionale:** Vedere `considerazioni-architettura-interventi.md` § 6.4 per analisi costo/beneficio strategico

---

## 4.1 Contesto: Analisi Complessità Codice

### 4.1.1 Misurazione ESLint Complexity Rules

Applicando le regole standard di complessità enterprise:
- **`complexity`**: max 10 (complessità ciclomatica)
- **`max-lines-per-function`**: max 50 LOC
- **`max-depth`**: max 4 (nesting depth)

**Risultati misurazione:**
- **Funzioni totali:** 23 `export function` in .js files
- **Conformi:** 21 (91.3%)
- **Violazioni:** 2 (8.7%)

### 4.1.2 Violazioni Identificate

#### Violazione Critica: executeCommand()

**File:** `src/logic/engine.js` (linea 503)  
**Metriche:**
- **LOC:** 173 (violation: 3.5x soglia max 50)
- **Complessità ciclomatica:** 64 (violation: 6.4x soglia max 10)
- **Nesting depth:** 4-5 livelli (violation borderline)

**Categoria:** God Function  
**Responsabilità attuali:**
1. Validazione input (`parseResult.IsValid`)
2. Routing per tipo comando (switch su `CommandType`)
3. Esecuzione logica NAVIGATION (stub)
4. Esecuzione logica SYSTEM (7 comandi: INVENTARIO, AIUTO, SALVARE, CARICARE, PUNTI, FINE, fallback)
5. Esecuzione logica ACTION (6 verbi: ESAMINA, GUARDA, APRI, CHIUDI, PRENDI, POSA/LASCIA + generic)
6. Gestione interazioni custom (lookup `Interazioni.json`)
7. Gestione stato oggetti (mutazione `gameState.Oggetti`)
8. Gestione stato aperture (mutazione `gameState.openStates`)
9. Formattazione messaggi i18n

**Problemi:**
- **Cognitive load:** Difficile comprendere flusso completo in singola lettura
- **Testing:** Impossibile testare singoli verbi isolatamente (setup pesante)
- **Manutenzione:** Modifica a PRENDI rischia regressione su APRI
- **Estensibilità:** Aggiungere nuovo verbo richiede modifica monolite

#### Violazione Minore: ensureVocabulary()

**File:** `src/logic/parser.js`  
**Metriche:**
- **LOC:** 77 (violation: 1.5x soglia max 50)
- **Complessità:** <10 (conforme)

**Categoria:** Setup complesso vocabolario multilingua  
**Nota:** Priorità bassa, violation solo su lunghezza non complessità.

---

## 4.2 High-Level Design: Decomposizione Funzionale

### 4.2.1 Obiettivo Architetturale

Scomporre `executeCommand()` da:
- **Monolite:** 1 funzione (173 LOC, complessità 64)
- **Modulare:** 1 router (15-20 LOC, complessità 4) + 20 handler specializzati (max 30 LOC ciascuno)

**Pattern applicato:** Router + Handler Specializzati (variant di Strategy Pattern)

### 4.2.2 Architettura Target

```
executeCommand(parseResult)              [Router - 17 LOC, complessità 4]
  ├─ validateParseResult(parseResult)    [Validation - 10 LOC]
  │   └─ return null | ErrorResult
  │
  ├─ handleNavigationCommand(parseResult) [Handler - 5 LOC]
  │   └─ return EngineResult (stub)
  │
  ├─ handleSystemCommand(parseResult)     [Dispatcher - 25 LOC]
  │   ├─ handleInventoryCommand()         [Sub-handler - 15 LOC]
  │   ├─ handleHelpCommand()              [Sub-handler - 5 LOC]
  │   ├─ handleSaveCommand()              [Sub-handler - 3 LOC]
  │   ├─ handleLoadCommand()              [Sub-handler - 3 LOC]
  │   ├─ handleScoreCommand()             [Sub-handler - 5 LOC]
  │   ├─ handleEndCommand()               [Sub-handler - 3 LOC]
  │   └─ handleSystemFallback()           [Sub-handler - 5 LOC]
  │
  ├─ handleActionCommand(parseResult)     [Dispatcher - 30 LOC]
  │   ├─ handleExamineAction()            [Sub-handler - 20 LOC]
  │   ├─ handleOpenCloseAction()          [Sub-handler - 25 LOC]
  │   ├─ handleTakeAction()               [Sub-handler - 20 LOC]
  │   ├─ handleDropAction()               [Sub-handler - 15 LOC]
  │   └─ handleGenericAction()            [Sub-handler - 15 LOC]
  │
  └─ handleManipulationCommand()          [Stub - 5 LOC]

[Utilities Layer]
  ├─ createErrorResult(key, params)       [Factory - 5 LOC]
  ├─ createSuccessResult(...)             [Factory - 8 LOC]
  ├─ findObject(noun)                     [Query - 5 LOC]
  ├─ findObjectInLocation(noun, locId)    [Query - 5 LOC]
  └─ findObjectInInventory(noun)          [Query - 5 LOC]
```

**Principi applicati:**
- **Single Responsibility:** Ogni handler gestisce 1 tipo comando o 1 verbo
- **Separation of Concerns:** Router (what) vs Handler (how)
- **DRY:** Utilities layer per logiche comuni
- **Open/Closed:** Aggiungere verbo = nuovo handler, non modifica esistente

### 4.2.3 Benefici Attesi

| Metrica | Prima | Dopo | Delta |
|---------|-------|------|-------|
| **executeCommand() LOC** | 173 | 17 | **-90%** ✅ |
| **Complessità ciclomatica** | 64 | 4 | **-94%** ✅ |
| **Max LOC/function** | 173 | 30 | **-83%** ✅ |
| **Funzioni totali** | 23 | 43 | **+87%** (20 handler nuovi) |
| **Handler specializzati** | 0 | 20 | **+20** ✅ |
| **Testabilità** | Monolitica | Modulare | **+400%** (unit test per handler) |
| **Manutenibilità** | God Function | Single Responsibility | **+300%** |
| **Conformità ESLint** | 91.3% | 100% | **+8.7%** ✅ |

---

## 4.3 Technical Design: Implementazione Sprint

### 4.3.1 Strategia Generale

**Nome Sprint:** "Command Handler Decomposition"  
**Durata totale:** 5-7 ore  
**Approccio:** Refactoring incrementale con backward compatibility garantita

**Garanzie per ogni sotto-sprint:**
- ✅ Zero breaking changes per client
- ✅ Tutti i 42 test esistenti passano
- ✅ Deployable autonomamente (no half-implemented state)
- ✅ Rollback strategy: Git tag per ogni sotto-sprint

**Struttura file:**
- `src/logic/engine.js` → mantiene `executeCommand()` come router + `gameState`
- `src/logic/engine-handlers.js` → nuovo file con tutti gli handler (20+ funzioni)

### 4.3.2 Sotto-Sprint Dettagliati

#### 4.3.2.0 - Sprint 0: Foundation & Router (1 ora)

**Obiettivo:** Creare architettura base con zero regression

**Task:**
1. Creare file `src/logic/engine-handlers.js`
2. Implementare utilities layer:
   ```javascript
   export function validateParseResult(parseResult) { ... }
   export function createErrorResult(messageKey, params = []) { ... }
   export function createSuccessResult(messageKey, effects = [], showLocation = false, params = []) { ... }
   function normalizeForComparison(str) { ... }
   export function findObject(noun) { ... }
   export function findObjectInLocation(noun, locationId) { ... }
   export function findObjectInInventory(noun) { ... }
   ```

3. Refactorare `executeCommand()` in `engine.js`:
   ```javascript
   export function executeCommand(parseResult) {
     const validationError = validateParseResult(parseResult);
     if (validationError) return validationError;
     
     // FALLBACK: usa logica esistente (ancora non refactored)
     return executeCommandLegacy(parseResult);
   }
   
   function executeCommandLegacy(parseResult) {
     // TUTTA la logica attuale spostata qui (switch gigante)
     // Questo garantisce zero breaking changes
   }
   ```

**Deliverable:**
- File `src/logic/engine-handlers.js` con 7 utilities
- File `engine.js` con router skeleton + legacy fallback
- Test `tests/engine-handlers-foundation.test.ts` (utilities coverage 100%)

**Acceptance Criteria:**
- [ ] Tutti i 42 test esistenti passano senza modifiche
- [ ] Test manuale: gioco funziona identicamente
- [ ] Utilities testate: `validateParseResult`, `findObject`, etc.

---

#### 4.3.2.1 - Sprint 1: Navigation Handler (30 min)

**Obiettivo:** Estrarre e integrare gestione NAVIGATION

**Task:**
1. Implementare in `engine-handlers.js`:
   ```javascript
   export function handleNavigationCommand(parseResult) {
     return {
       accepted: true,
       resultType: 'OK',
       message: `Stub: spostamento verso ${parseResult.CanonicalVerb}`,
       effects: [],
     };
   }
   ```

2. Modificare router in `engine.js`:
   ```javascript
   switch (parseResult.CommandType) {
     case 'NAVIGATION':
       return handleNavigationCommand(parseResult); // ✅ nuovo
     default:
       return executeCommandLegacy(parseResult); // fallback
   }
   ```

3. Rimuovere case 'NAVIGATION' da `executeCommandLegacy()`

**Deliverable:**
- Handler `handleNavigationCommand()` in engine-handlers.js
- Router integrato in engine.js
- Test `tests/engine-handlers-navigation.test.ts`

**Acceptance Criteria:**
- [ ] Test N/S/E/O funzionanti (stub)
- [ ] Tutti 42 test + 3 nuovi passano
- [ ] Navigation estratta, resto invariato

---

#### 4.3.2.2 - Sprint 2: System Commands Handler (1.5 ore)

**Obiettivo:** Estrarre gestione SYSTEM + 7 sub-handler

**Task:**
1. Implementare sub-handlers in `engine-handlers.js`:
   ```javascript
   function handleInventoryCommand() { ... }    // 15 LOC
   function handleHelpCommand() { ... }         // 5 LOC  
   function handleSaveCommand() { ... }         // 3 LOC
   function handleLoadCommand() { ... }         // 3 LOC
   function handleScoreCommand() { ... }        // 5 LOC
   function handleEndCommand() { ... }          // 3 LOC
   function handleSystemFallback(verb) { ... }  // 5 LOC
   ```

2. Implementare dispatcher:
   ```javascript
   export function handleSystemCommand(parseResult) {
     const concept = (parseResult.VerbConcept || parseResult.CanonicalVerb || '').toUpperCase();
     
     const systemHandlers = {
       'INVENTARIO': handleInventoryCommand,
       'AIUTO': handleHelpCommand,
       'SALVARE': handleSaveCommand,
       'CARICARE': handleLoadCommand,
       'PUNTI': handleScoreCommand,
       'FINE': handleEndCommand,
     };
     
     const handler = systemHandlers[concept];
     return handler ? handler(parseResult) : handleSystemFallback(parseResult);
   }
   ```

3. Integrare in router + rimuovere SYSTEM da legacy

**Deliverable:**
- Handler `handleSystemCommand()` + 7 sub-handlers
- Test `tests/engine-handlers-system.test.ts` (12 test)

**Acceptance Criteria:**
- [ ] INVENTARIO: lista corretta oggetti (filtro lingua)
- [ ] PUNTI: visualizza punteggio (se Fase 2 implementata)
- [ ] SALVA/CARICA: resultType corretto
- [ ] 42 + 12 test passano (54 totali)

---

#### 4.3.2.3 - Sprint 3: Action - Examine (45 min)

**Obiettivo:** Estrarre ESAMINA/GUARDA + skeleton ACTION dispatcher

**Task:**
1. Implementare `handleExamineAction()` (20 LOC)
2. Creare dispatcher parziale:
   ```javascript
   export function handleActionCommand(parseResult) {
     const verb = (parseResult.CanonicalVerb || '').toUpperCase();
     const concept = (parseResult.VerbConcept || '').toUpperCase();
     const noun = (parseResult.NounConcept || parseResult.CanonicalNoun || '').toUpperCase();
     
     // PRIORITÀ 1: Interazioni custom
     if (noun && concept) {
       const interazioneResult = cercaEseguiInterazione(concept, noun);
       if (interazioneResult) return interazioneResult;
     }
     
     // PRIORITÀ 2: Handler implementati
     if (concept === 'ESAMINARE' || concept === 'GUARDARE') {
       return handleExamineAction(parseResult, verb, concept, noun);
     }
     
     // FALLBACK: legacy per altri verbi (temporaneo)
     return handleActionLegacy(parseResult, verb, concept, noun);
   }
   ```

**Deliverable:**
- Handler `handleExamineAction()` + dispatcher skeleton
- Test `tests/engine-handlers-action-examine.test.ts`

**Acceptance Criteria:**
- [ ] ESAMINA (no noun): descrizione luogo + oggetti visibili
- [ ] ESAMINA OGGETTO: descrizione oggetto
- [ ] Altri verbi ACTION via legacy (temporaneo)

---

#### 4.3.2.4 - Sprint 4: Action - Open/Close (30 min)

**Obiettivo:** Estrarre APRI/CHIUDI

**Task:**
1. Implementare `handleOpenCloseAction()` (25 LOC)
2. Integrare in dispatcher ACTION
3. Rimuovere APRI/CHIUDI da `handleActionLegacy()`

**Deliverable:**
- Handler `handleOpenCloseAction()`
- Test `tests/engine-handlers-action-openclose.test.ts`

**Acceptance Criteria:**
- [ ] APRI: aggiorna `gameState.openStates[noun] = true`
- [ ] CHIUDI: aggiorna `gameState.openStates[noun] = false`
- [ ] Messaggi alreadyOpen/alreadyClosed corretti

---

#### 4.3.2.5 - Sprint 5: Action - Take/Drop (45 min)

**Obiettivo:** Estrarre PRENDI/POSA/LASCIA

**Task:**
1. Implementare `handleTakeAction()` (20 LOC) + `handleDropAction()` (15 LOC)
2. Integrare in dispatcher
3. Rimuovere da legacy

**Deliverable:**
- Handlers `handleTakeAction()` + `handleDropAction()`
- Test `tests/engine-handlers-action-takedrop.test.ts`

**Acceptance Criteria:**
- [ ] PRENDI: oggetto.IDLuogo = 0 (inventario)
- [ ] POSA: oggetto.IDLuogo = currentLocationId
- [ ] Limite 5 oggetti in inventario rispettato
- [ ] Test sequence: PRENDI → INVENTARIO → POSA

---

#### 4.3.2.6 - Sprint 6: Action - Completion (30 min)

**Obiettivo:** Completare dispatcher ACTION + cleanup legacy

**Task:**
1. Implementare `handleGenericAction()` per verbi non gestiti
2. Completare dispatcher con routing a tutti handler
3. **Eliminare `executeCommandLegacy()` completamente**

**Deliverable:**
- Handler `handleGenericAction()`
- Dispatcher ACTION completo
- Test `tests/engine-handlers-action-complete.test.ts`
- Cleanup: executeCommandLegacy() rimosso

**Acceptance Criteria:**
- [ ] executeCommandLegacy() non esiste più
- [ ] executeCommand() LOC = 17 (verifica manuale)
- [ ] Tutti 42 originali + ~25 nuovi = 67 test passano
- [ ] Zero fallback legacy rimasti

---

#### 4.3.2.7 - Sprint 7: Manipulation Stub + Final Verification (20 min)

**Obiettivo:** Stub MANIPULATION + verifica finale metriche

**Task:**
1. Implementare stub:
   ```javascript
   export function handleManipulationCommand(parseResult) {
     return {
       accepted: true,
       resultType: 'OK',
       message: 'I comandi di manipolazione complessa non sono ancora implementati.',
       effects: [],
     };
   }
   ```

2. Integrare nel router (case 'MANIPULATION')
3. Aggiungere JSDoc completo a tutti handler
4. Verificare metriche finali
5. Aggiornare `docs/STATISTICHE_PROGETTO.md`

**Deliverable:**
- Handler stub `handleManipulationCommand()`
- JSDoc completo
- Metriche verificate
- Documentazione aggiornata

**Acceptance Criteria:**
- [ ] **Metriche finali:**
  - executeCommand() LOC: 17 (era 173) → -90% ✅
  - Complessità ciclomatica: 4 (era 64) → -94% ✅
  - Handler specializzati: 20 nuovi ✅
  - Funzioni totali: 23 → 43 (+20) ✅
- [ ] **Test suite completa:**
  - 42 test originali passano ✅
  - ~30 test nuovi passano ✅
  - Total: 72 test passing ✅
- [ ] **Conformità ESLint:** 100% (era 91.3%) ✅
- [ ] **PRODUCTION READY** 🚀

---

## 4.4 Priorità e Dipendenze

### 4.4.1 Pre-condizioni

**Bloccanti:**
- ✅ §§ 3.1-3.4 implementazione feature complete (punteggio, timer, vittoria)
- ✅ Suite E2E testing validata (10 scenari passing)
- ✅ Deploy v1.0 in produzione
- ✅ Smoke testing post-release (0 bug critici)

**Raccomandati:**
- ✅ Feedback primi 10-20 utenti raccolto
- ✅ Hotfix urgenti applicati (se presenti)
- ✅ Stabilità v1.0 confermata (7+ giorni senza incident)

### 4.4.2 Ordine di Esecuzione

**Timeline consigliata:**

```
Ora → v1.0 Release → +1 settimana → +2 settimane → Refactoring
│                    │                │              │
│                    │                │              └─ Sprint 0-7 (5-7h)
│                    │                └─ Raccolta feedback utenti
│                    └─ Monitoring stabilità
└─ Completamento §§ 3.1-3.4
```

**Rationale postponimento:**
1. **Feature mancanti sono bloccanti** per release → priorità assoluta
2. **Refactoring è qualitativo** non funzionale → può attendere
3. **Rischio regression** minore post-release (meno pressione time-to-market)
4. **Validazione utente** può rivelare altre priorità (es. nuove feature richieste)

### 4.4.3 Trigger Decision Point

**Valutare refactoring SE (almeno 1 condizione vera):**

| Condizione | Come Misurare | Threshold |
|------------|---------------|----------|
| **Bug architetturali frequenti** | Issue tracker | ≥3 bug in executeCommand() in 30 giorni |
| **Team expansion** | Headcount | ≥2 developer full-time sul progetto |
| **Previste espansioni** | Product roadmap | DLC/sequel confermati in pianificazione |
| **Performance degradation** | Profiling | Risposta comando >200ms (era <100ms) |
| **Difficoltà manutenzione** | Velocity | Tempo medio fix bug +50% vs baseline |

**Missione Odessa attualmente: 0/5 condizioni soddisfatte**

**Decisione:** Refactoring rimane "debt tecnico documentato" ma non pagato fino a trigger.

---

## 4.5 Alternative Considerate e Respinte

### 4.5.1 Opzione B: Refactoring a Classi OOP

**Proposta:**
```javascript
class CommandExecutor {
  constructor(gameState) {
    this.gameState = gameState;
  }
  
  execute(parseResult) { ... }
  private handleSystem() { ... }
  private handleAction() { ... }
}
```

**Pro:**
- Encapsulation di gameState
- Pattern OOP standard enterprise

**Contro:**
- ❌ Introduce OOP in codebase **100% funzionale puro**
- ❌ Incoerenza architetturale (23 funzioni esistenti, 1 classe)
- ❌ Overhead (constructor, this binding)
- ❌ Non risolvibile da AI (richiede decisione architetturale umana)

**Verdict:** ❌ Respinto per incoerenza con pattern esistente

---

### 4.5.2 Opzione C: Strategy Pattern Formale

**Proposta:**
```javascript
const strategies = {
  NAVIGATION: new NavigationStrategy(),
  SYSTEM: new SystemStrategy(),
  ACTION: new ActionStrategy()
};

strategies[parseResult.CommandType].execute(parseResult);
```

**Pro:**
- Pattern GoF canonico
- Estensibilità via plugin

**Contro:**
- ❌ Over-engineering per 4 tipi comando fissi
- ❌ Richiede class instances (vedi Opzione B)
- ❌ Complessità eccessiva per scope progetto

**Verdict:** ❌ Respinto per over-engineering

---

### 4.5.3 Opzione D: Refactoring Parziale (Solo SYSTEM)

**Proposta:** Estrarre solo i comandi SYSTEM (7 handler), lasciare ACTION monolitico.

**Pro:**
- Effort ridotto (2-3h vs 5-7h)
- Risk minore

**Contro:**
- ❌ **God Function parzialmente risolta** (ACTION rimane 100+ LOC)
- ❌ Complessità ciclomatica ancora ~40 (vs target 10)
- ❌ Lascia debt tecnico maggiore non risolto
- ❌ Peggio di non fare nulla (inconsistenza: SYSTEM modulare, ACTION monolitico)

**Verdict:** ❌ Respinto perché "half-refactoring" crea più problemi di quanti ne risolva

---

### 4.5.4 Opzione E: No Refactoring (Status Quo)

**Proposta:** Accettare God Function come debt tecnico permanente.

**Pro:**
- ✅ Zero effort speso
- ✅ Zero risk regression
- ✅ Architettura attuale funzionante

**Contro:**
- ⚠️ Debt tecnico permanente (8.7% non-conformità ESLint)
- ⚠️ Difficoltà onboarding future developer (se team si espande)
- ⚠️ Test coverage difficile (setup pesante per unit test)

**Verdict:** ✅ **Opzione raccomandata per v1.0**, rivalutare per v1.1+ se condizioni cambiano

---

## 4.6 Metriche di Successo Post-Refactoring

### 4.6.1 Metriche Quantitative

| Metrica | Baseline (Pre) | Target (Post) | Misurazione |
|---------|----------------|---------------|-------------|
| **executeCommand() LOC** | 173 | ≤20 | `wc -l src/logic/engine.js` (funzione specifica) |
| **Complessità ciclomatica** | 64 | ≤5 | ESLint `complexity` rule |
| **Max LOC/function** | 173 | ≤50 | ESLint `max-lines-per-function` rule |
| **Nesting depth** | 4-5 | ≤4 | ESLint `max-depth` rule |
| **Conformità ESLint** | 91.3% (21/23) | 100% (43/43) | `eslint src/**/*.js --rule complexity:error` |
| **Test coverage handlers** | 0% (no test isolati) | ≥95% | Vitest coverage report |
| **Test suite size** | 42 test | ≥70 test | `npm test -- --reporter=json` |

### 4.6.2 Metriche Qualitative

| Aspetto | Baseline | Target | Validazione |
|---------|----------|--------|-------------|
| **Testabilità** | Setup 30 righe boilerplate | Setup 5 righe | Code review test files |
| **Manutenibilità** | Modifica 1 verbo = risk 10 verbi | Modifica isolata | Git diff analysis |
| **Comprensibilità** | Cognitive load alto (173 LOC) | Funzione auto-documentante | Developer survey |
| **Estensibilità** | Nuovo verbo = modifica monolite | Nuovo handler = nuovo file | Time to implement feature |

### 4.6.3 Criteri Go/No-Go

**GO per merge in main SE:**
- [ ] Tutti i 42 test originali passano (zero regression)
- [ ] ≥30 nuovi test handler passano (coverage nuove funzioni)
- [ ] executeCommand() LOC ≤20 (verificato manualmente)
- [ ] Complessità ≤5 (ESLint passing)
- [ ] Code review approvato (peer review)
- [ ] Smoke test manuale completo OK (playtest 30 min)

**NO-GO (rollback a pre-refactoring) SE:**
- [ ] >2 test regressati e non fixabili in 1h
- [ ] Bug critici scoperti in smoke test
- [ ] Performance degradation >20% (benchmark comandi)

---

## 4.7 Rollback Strategy

### 4.7.1 Git Workflow

```bash
# Ogni sotto-sprint è un commit atomico
git checkout -b refactor/command-handlers

# SS0
git commit -m "refactor: SS0 - Foundation & Router"
git tag refactor-ss0

# SS1  
git commit -m "refactor: SS1 - Navigation Handler"
git tag refactor-ss1

# ... SS2-SS7

# Merge finale
git checkout main
git merge refactor/command-handlers
```

### 4.7.2 Rollback Procedure

**Se sotto-sprint N fallisce:**
```bash
# Rollback a sotto-sprint N-1
git reset --hard refactor-ss{N-1}

# Re-implementare SS N con fix
# Oppure: stop refactoring, merge fino a SS N-1
```

**Esempio:** SS4 (Open/Close) introduce bug → rollback a `refactor-ss3`, merge SS0-SS3, postpone SS4-SS7.

---

## 4.8 Considerazioni Finali

### 4.8.1 Quando NON fare questo refactoring

**Skip refactoring SE:**
- Gioco rimane one-shot release (no DLC, no sequel)
- Team rimane single developer + AI
- Zero bug architetturali emergono in 6+ mesi post-release
- Budget disponibile <10h (refactoring richiede 5-7h + validazione)

**Investire effort altrove:**
- Nuove feature richieste da utenti
- Porting ad altre piattaforme (mobile, Steam)
- Localizzazioni aggiuntive (FR, DE, ES)

### 4.8.2 Quando FARE questo refactoring

**Trigger immediato SE:**
- Team si espande a ≥2 developer full-time
- Pianificate espansioni/DLC con 10+ nuove interazioni
- Bug architetturali ≥3 in executeCommand() in 30 giorni
- Performance degrada >50% (profiling identifica executeCommand())

**Segnali precoci (valutare):**
- Onboarding nuovo developer richiede >1 settimana per capire engine
- Fix bug in executeCommand() richiede >2h in media
- Test E2E failano per regression non catturate da unit test

---

**Riferimento decisionale:** Vedere `considerazioni-architettura-interventi.md` § 6.4 per contesto strategico e analisi ROI completa.

**Status corrente:** Debt tecnico documentato, non prioritario per v1.0, rivalutare post-release.

---

## 3.5 Open Points e Decisioni Rinviate

Questioni identificate durante la stesura della specifica che richiedono ulteriore analisi o implementazione successiva:

### OP-01: Lista Completa Interazioni con Punteggio (Priorità: Alta) ✅ **RISOLTO**
**Status:** ✅ Completato (2026-01-01)  
**Descrizione:** Identificare tutte le interazioni che assegnano +2 punti.  
**Risoluzione:** Lista completa di 15 interazioni identificata e documentata in § 2.2.1. Tutte le interazioni (incluse ripetibili) danno +2 alla prima esecuzione. Nessuna modifica necessaria a Interazioni.json (punteggio gestito via tracking Set, non metadata file).  
**Lista finale:** sposta_quadro_24, sposta_arazzo_20, muovi_fermacarte_25, esamina_scomparto_25, infila_medaglione_forma_20, infila_statuetta_nicchia_27, infila_medaglione_forma_36, carica_pesa_57, esamina_botola_57, premi_pulsante_44, ruota_sedile_42, scava_macerie_11, scava_macerie_49, esamina_cassaforte_con_medaglione_24, porgi_documenti_59.

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
**Descrizione:** Verificare che il punteggio massimo di 132 punti sia effettivamente raggiungibile completando tutte le 15 interazioni, risolvendo i 13 misteri automatici, e completando la sequenza cassaforte.  
**Azione richiesta:** Playtest completo con utente che tenta 100% completion.  
**Calcolo teorico:** 57 luoghi + 15 interazioni×2 + 13 misteri×3 + 1 sequenza×2 + 1 completamento×4 = 57+30+39+2+4 = 132 punti.  
**Blocca:** Solo polish finale (post-implementazione).

---

## 3.6 Raccomandazioni Implementative

### 3.6.1 Priorità di Sviluppo
1.  **§ 3.1 (Setup):** Essenziale - blocca tutte le altre fasi
2.  **§ 3.2 (Punteggio):** Alta priorità - migliora UX senza rischi
3.  **§ 3.3 (Timer):** Media priorità - richiede testing accurato
4.  **§ 3.4 (Vittoria):** Alta priorità - core feature
5.  **Polish finale:** Bassa priorità - post-release

### 3.6.2 Gestione Rischi
- **Regressioni:** Creare branch Git separato per ogni fase
- **Testing:** Eseguire test manuali completi dopo ogni fase
- **Rollback:** Mantenere backup di `Oggetti.json` e `Interazioni.json`
- **Debugging:** Aggiungere console.log strategici per tracciare stato

### 3.6.3 Note Tecniche
- **Performance:** I `Set` sono O(1) per check membership - preferibili ad Array
- **Memoria:** Limite 9 misteri × 3pt = 27pt - non eccedere per bilanciamento
- **Serializzazione:** Testare save/load dopo ogni modifica a `gameState`
- **Compatibilità:** Verificare funzionamento su Chrome, Firefox, Safari, Edge

### 3.6.4 Chiarimenti Finali Risolti
- ✅ Luogo 54: Luogo terminale raggiungibile da ID=53 via direzione Sud (morte istantanea, gestito come ID=8/ID=40)
- ✅ Luogo 57 (Capanno attrezzi): intenzionalmente **non pericoloso** (rifugio)
- ✅ Sequenza cassaforte: Pattern D-S-S-D-S (5 rotazioni), award +2 al completamento
- ✅ Interazioni con punteggio: 15 identificate complete, tutte danno +2 alla prima esecuzione
- ✅ Misteri automatici: 13 totali (9 VISIBILITA + 4 SBLOCCA + 2 TOGGLE prima apertura), danno +3 inline quando effetto si verifica
- ✅ Punteggio massimo: **132 punti** (57 luoghi + 30 interazioni + 39 misteri + 2 sequenza + 4 completamento)
- ✅ Direzioni bidirezionali: contano come 1 mistero unico (+3), non 2
- ✅ TOGGLE_DIREZIONE: mistero solo prima apertura (0→valore), chiusure/riaperture non danno punti
- ✅ Eliminazione Misteri.json: file obsoleto, logica misteri ora inline negli effetti
- ✅ Reset intercettazione: solo uscendo da zone pericolose (opzione A)
- ✅ System commands: whitelist completa definita (non contano per timer)
- ✅ Teleport: Lista e Dossier rimossi, Documenti conservati
- ✅ Verbo PORGI: solo luogo 59, sintassi "PORGI DOCUMENTI"
- ✅ **visitedPlaces:** Sistema esistente riutilizzato per punteggio luoghi invece di creare `punteggio.luoghiVisitati` duplicato (decisione post-§ 3.1, vedere § 2.1.1)
- ✅ **2026-01-01:** Sistema punteggio unificato +2/+3 con definizione automatica misteri (VISIBILITA, SBLOCCA_DIREZIONE, TOGGLE_DIREZIONE). Molte interazioni producono entrambi: +2 (azione) + +3 (effetto) = +5 totali. Vedere § 2.1.1 per design decision completa.

---

# PROSSIMI STEP

**Roadmap implementativa:**
1. Review finale con stakeholder
2. Approval per implementazione  
3. Creazione task Jira/GitHub Issues per §§ 3.1-3.4
4. Kickoff sviluppo § 3.1 (Setup)
5. Iterazione sequenziale §§ 3.2 → 3.3 → 3.4
6. Valutazione Capitolo 4 (Refactoring) post-release v1.0

---

**Fine Documento**  
**Ultima revisione:** 01 gennaio 2026  
**Versione:** 2.0
