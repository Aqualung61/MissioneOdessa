# Analisi Visibilità Oggetti - Missione Odessa

## Riepilogo Completo - Correzioni Applicate a Oggetti.json

**STATO**: ✅ **MODIFICHE GIÀ COMPLETATE**

Tutte le modifiche descritte in questo documento sono state applicate al file `src/data-internal/Oggetti.json` in data 28 dicembre 2025.

### **OGGETTI CON STATO DI VISIBILITÀ ERRATO** (Da invisibili a visibili tramite azioni)

---

#### 1. **Forma circolare** (ID 29)
**Stato precedente**: 
```json
{
  "ID": 29,
  "IDLingua": 1,
  "Oggetto": "Forma circolare",
  "Attivo": 3,
  "IDLuogo": 36,
  "descrizione": "Forma circolare"
}
```

**Problema**: `"Attivo": 3` (visibile e prendibile) ❌  
**✅ MODIFICATO IN**: `"Attivo": 0` (invisibile)

**Azioni che rendono visibile l'oggetto**:

1. **Luogo 20**: Sposta Arazzo
   - **Effetto**: "Dietro c'è una strana forma sul muro, circolare"
   - **Risultato**: "Forma circolare diventa visibile"

2. **Luogo 36**: Sud (movimento con crollo)
   - **Effetto**: "Appena ti lasci alle spalle il tratto di passaggio, questo crolla"
   - **Risultato**: "Forma circolare diventa visibile"
   - **Note**: La forma appare anche al luogo 36 dopo il crollo

**Descrizione oggetto**: "Ha al suo interno una svastica rovesciata ed infossata, come un calco di una svastica regolare"

**Utilizzo successivo**: Serve per infilare il Medaglione e aprire passaggi segreti (luoghi 20 e 36)

---

#### 2. **Dossier** (ID 34)
**Stato precedente**:
```json
{
  "ID": 34,
  "IDLingua": 1,
  "Oggetto": "Dossier",
  "Attivo": 3,
  "IDLuogo": 57,
  "descrizione": "Dossier"
}
```

**Problema**: `"Attivo": 3` (visibile e prendibile) ❌  
**✅ MODIFICATO IN**: `"Attivo": 0` (invisibile)

**Sequenza di azioni per renderlo visibile**:

1. **Luogo 57**: Carica Pesa (con Peso)
   - **Effetto**: "Carichi la pesa: il piatto è ora sollevato in equilibrio col braccio della pesa. Con uno strano rumore il coperchio di una botola di apre davanti a te sul pavimento"
   - **Risultato**: "Botola diventa visibile"

2. **Luogo 57**: Esamina Botola
   - **Effetto**: "La botola rivela un piccolo nascondiglio sul pavimento. All'interno c'è un dossier"
   - **Risultato**: "Dossier diventa visibile"

**Descrizione oggetto**: "E' un voluminoso dossier. Aprendolo trovi una serie di documenti ancora da compilare, una lista di nomi presumibilmente di gerachi nazisti, delle carte geografiche del Sud America con sottolineate le località dell'Argentina. Un breve rapporto indica la costituzione di centri di controllo ogni 60-70km dal tragitto da compiere e fornisce nomi e indirizzi sul percorso Brema-Genoa. Su tutti i fogli c'è un timbro: ODESSA"

**Importanza**: Documento cruciale contenente i piani dell'organizzazione ODESSA

---

### **OGGETTI CON LUOGO ERRATO**

---

#### 3. **Scomparto segreto** (ID 38)
**Stato precedente**:
```json
{
  "ID": 38,
  "IDLingua": 1,
  "Oggetto": "Scomparto segreto",
  "Attivo": 0,
  "IDLuogo": 27,
  "descrizione": "Scomparto segreto"
}
```

**Problema**: `"IDLuogo": 27` ❌  
**✅ MODIFICATO IN**: `"IDLuogo": 25`

**Azione che rende visibile l'oggetto**:

**Luogo 25**: Muovi Fermacarte
- **Contesto**: Il fermacarte è fissato ad una guida sul tavolo
- **Effetto**: "Muovi il fermacarte lungo la guida: con uno scricchiolio si apre uno scomparto segreto su un fianco della scrivania"
- **Risultato**: "Scomparto diventa visibile"

**Descrizione luogo 25**: Scrivania in uno studio (non al luogo 27 che è il corridoio del seminterrato)

**Contenuto**: All'interno dello scomparto c'è un Foglio con la combinazione della cassaforte

---

#### 4. **Foglio** (ID 39)
**Stato precedente**:
```json
{
  "ID": 39,
  "IDLingua": 1,
  "Oggetto": "Foglio",
  "Attivo": 0,
  "IDLuogo": 27,
  "descrizione": "Foglio"
}
```

**Problema**: `"IDLuogo": 27` ❌  
**✅ MODIFICATO IN**: `"IDLuogo": 25`

**Sequenza di azioni per renderlo visibile**:

1. **Luogo 25**: Muovi Fermacarte
   - **Risultato**: "Scomparto diventa visibile"

2. **Luogo 25**: Esamina Scomparto
   - **Effetto**: "All'interno dello scomparto c'è un foglio dattiloscritto"
   - **Risultato**: "Foglio diventa visibile"

**Descrizione oggetto**: "Il foglio contiente solo delle lettere scritte a macchina: D S S D S. Sembra essere una combinazione di una cassaforte"

**Importanza**: Contiene la combinazione per aprire la cassaforte al luogo 24 (sequenza: Destra-Sinistra-Sinistra-Destra-Sinistra)

**Relazione con altri puzzle**: Il foglio fornisce indizi per il puzzle della cassaforte

---

### **OGGETTI MANCANTI**

---

#### 5. **Botola** - ✅ NUOVO OGGETTO AGGIUNTO
**Stato precedente**: Non presente nel JSON ❌

**✅ AGGIUNTO**:
```json
{
  "ID": 41,
  "IDLingua": 1,
  "Oggetto": "Botola",
  "Attivo": 0,
  "IDLuogo": 57,
  "descrizione": "Botola"
}
```

**Azione che rende visibile l'oggetto**:

**Luogo 57**: Carica Pesa
- **Prerequisito**: Avere il Peso (oggetto ID 21, disponibile al luogo 50)
- **Effetto**: "Carichi la pesa: il piatto è ora sollevato in equilibrio col braccio della pesa. Con uno strano rumore il coperchio di una botola di apre davanti a te sul pavimento"
- **Risultato**: "Botola diventa visibile"

**Descrizione oggetto** (quando esaminata): "La botola rivela un piccolo nascondiglio sul pavimento. All'interno c'è un dossier"

**Contenuto**: Contiene il Dossier (ID 34) con i documenti ODESSA

**Meccanismo**: La Pesa (ID 23, fissa al luogo 57) attiva un meccanismo a contrappeso che apre la botola

**Note**: La Botola è un contenitore intermedio nella catena: Carica Pesa → Botola visibile → Esamina Botola → Dossier visibile

---

## Riepilogo Totale Modifiche Applicate

### Tabella Riepilogativa

| ID | Oggetto | Campo | Valore Precedente | Valore Applicato | Stato | Azione che Rende Visibile |
|----|---------|-------|-------------------|------------------|-------|---------------------------|
| 29 | Forma circolare | Attivo | 3 | 0 | ✅ Modificato | Sposta Arazzo (luogo 20) o Sud con crollo (luogo 36) |
| 34 | Dossier | Attivo | 3 | 0 | ✅ Modificato | Carica Pesa → Esamina Botola (luogo 57) |
| 38 | Scomparto segreto | IDLuogo | 27 | 25 | ✅ Modificato | Muovi Fermacarte (luogo 25) |
| 39 | Foglio | IDLuogo | 27 | 25 | ✅ Modificato | Muovi Fermacarte → Esamina Scomparto (luogo 25) |
| 41 | Botola | - | NON ESISTEVA | NUOVO (ID 41) | ✅ Aggiunto | Carica Pesa (luogo 57) |

**Totale modifiche applicate**: 5 (4 modifiche + 1 nuovo oggetto)

---

## Catene di Dipendenze tra Oggetti

### Catena 1: Cassaforte → Medaglione → Passaggi Segreti
1. **Luogo 24**: Sposta Quadro → Cassaforte visibile
2. **Luogo 25**: Muovi Fermacarte → Scomparto visibile → Esamina Scomparto → Foglio visibile
3. **Luogo 24**: Usa combinazione (D-S-S-D-S) per aprire Cassaforte → Medaglione visibile
4. **Luogo 20**: Sposta Arazzo → Forma circolare visibile
5. **Luogo 20**: Infila Medaglione nella Forma → Apertura passaggio a sud

### Catena 2: Statuetta → Porta Segreta
1. **Luogo 22**: Prendi Statuetta
2. **Luogo 27**: Infila Statuetta nella Nicchia → Apertura porta a nord + Porta aperta visibile

### Catena 3: Pesa → Botola → Dossier
1. **Luogo 50**: Prendi Peso
2. **Luogo 57**: Carica Pesa (con Peso) → Botola visibile
3. **Luogo 57**: Esamina Botola → Dossier visibile
4. **Luogo 57**: Prendi Dossier

### Catena 4: Macerie → Passaggio Ovest
1. **Luogo 18**: Prendi Badile
2. **Luogo 49**: Scava Macerie (con Badile) → Apertura passaggio a ovest

---

## Note per l'Implementazione

### Sistema di Visibilità
Il campo `Attivo` ha 4 stati possibili:
- `0` = Invisibile (non appare nelle descrizioni)
- `1` = Visibile ma non interagibile (scenario, arredamento)
- `2` = Visibile e spostabile (ma non prendibile)
- `3` = Visibile e prendibile (può entrare nell'inventario)

### Oggetti che Cambiano Visibilità Dinamicamente
Alcuni oggetti passano da invisibile (0) a visibile (1, 2 o 3) durante il gioco:
- **Forma circolare**: 0 → 3 (diventa prendibile? o rimane 1?)
- **Cassaforte**: 0 → 1 (visibile ma non prendibile)
- **Medaglione**: 0 → 3 (diventa prendibile)
- **Scomparto**: 0 → 1 (visibile ma non prendibile)
- **Foglio**: 0 → 3 (diventa prendibile)
- **Botola**: 0 → 1 (visibile ma non prendibile)
- **Dossier**: 0 → 3 (diventa prendibile)
- **Porta aperta**: 0 → 1 (diventa visibile)

### Verifica Coerenza
Dopo le modifiche, verificare che:
1. Tutti gli oggetti citati nel documento sono presenti nel JSON
2. Gli oggetti invisibili (Attivo: 0) sono resi visibili da azioni appropriate
3. I luoghi degli oggetti corrispondono ai luoghi dove le azioni vengono eseguite
4. Le catene di dipendenze sono rispettate (es: Botola prima del Dossier)

---

**Data analisi**: 28 dicembre 2025  
**File di riferimento**: `docs/miscellaneous/20251228 - Luoghi azioni effetti - v2.md`  
**File JSON**: `src/data-internal/Oggetti.json`
