# Analisi Direzioni Luoghi - Missione Odessa

## Riepilogo Completo - Direzioni da Bloccare Inizialmente in Luoghi.json

### **DIREZIONI PERMANENTI** (Sbloccate da azioni specifiche, non tornano bloccate)

---

#### 1. **Passaggio Segreto: Studio → Piccola Saletta**
**Luogo 20 (Studio) → Sud → Luogo 21 (Piccola saletta)**
- **Stato attuale**: `"Sud": 21` ❌
- **Stato corretto**: `"Sud": 0`
- **Azione di sblocco**: Infila Medaglione nella Forma circolare (luogo 20)
- **Effetto**: "Infili il medaglione nella forma e di colpo la parete sud inizia a ruotare, rivelando una stanza segreta"
- **Meccanismo**: Parete rotante attivata da medaglione con svastica

**Luogo 21 (Piccola saletta) → Nord → Luogo 20 (Studio)**
- **Stato attuale**: `"Nord": 20` ❌
- **Stato corretto**: `"Nord": 0`
- **Azione di sblocco**: Stessa azione (bidirezionale)
- **Note**: Il ritorno deve essere abilitato contemporaneamente

---

#### 2. **Porta Segreta: Corridoio Seminterrato → Atrio Bunker**
**Luogo 27 (Corridoio del seminterrato) → Nord → Luogo 28 (Atrio del bunker)**
- **Stato attuale**: `"Nord": 28` ❌
- **Stato corretto**: `"Nord": 0`
- **Azione di sblocco**: Infila Statuetta nella Nicchia vuota (luogo 27)
- **Effetto**: "Infili la statuetta nella nicchia vuota: il fondo di questa si abbassa e scatta un meccanismo che apre una porta altrimenti invisibile a nord"
- **Meccanismo**: Meccanismo a peso che sblocca porta nascosta
- **Oggetto reso visibile**: "Porta aperta appare visibile"

**Luogo 28 (Atrio del bunker) → Sud → Luogo 27 (Corridoio del seminterrato)**
- **Stato attuale**: `"Sud": 27` ❌
- **Stato corretto**: `"Sud": 0`
- **Azione di sblocco**: Stessa azione (bidirezionale)
- **Note**: Il ritorno deve essere abilitato contemporaneamente

---

#### 3. **Passaggio Sala Torture: Stretto Passaggio → Sala di Torture**
**Luogo 36 (Stretto passaggio) → Ovest → Luogo 37 (Sala di torture)**
- **Stato attuale**: `"Ovest": 37` ❌
- **Stato corretto**: `"Ovest": 0`
- **Azione di sblocco**: Infila Medaglione nella Forma circolare (luogo 36)
- **Effetto**: "Infili il medaglione nella forma e di colpo la parete ovest inizia a ruotare, rivelando la stanza delle torture"
- **Meccanismo**: Parete rotante (stesso sistema del luogo 20)
- **Note**: La Forma circolare al luogo 36 diventa visibile dopo il crollo quando si va a Sud

**Luogo 37 (Sala di torture) → Est → Luogo 36 (Stretto passaggio)**
- **Stato attuale**: `"Est": 36` ❌
- **Stato corretto**: `"Est": 0`
- **Azione di sblocco**: Stessa azione (bidirezionale)
- **Note**: Il ritorno deve essere abilitato contemporaneamente

---

#### 4. **Passaggio Bloccato da Macerie: Tinello → Piccola Cucina**
**Luogo 49 (Tinello) → Ovest → Luogo 50 (Piccola cucina)**
- **Stato attuale**: `"Ovest": 50` ❌
- **Stato corretto**: `"Ovest": 0`
- **Azione di sblocco**: Scava Macerie (luogo 49)
- **Effetto**: "Scavando allarghi il passaggio ad ovest"
- **Meccanismo**: Rimozione fisica di macerie che bloccano il passaggio
- **Messaggio se si tenta prima**: "Delle macerie ti impediscono di andare ad ovest. Non si passa se non scavando."
- **Oggetto necessario**: Badile (presente al luogo 18)

**Luogo 50 (Piccola cucina) → Est → Luogo 49 (Tinello)**
- **Stato attuale**: `"Est": 49` ❌
- **Stato corretto**: `"Est": 0`
- **Azione di sblocco**: Stessa azione (bidirezionale)
- **Note**: Il ritorno deve essere abilitato contemporaneamente

---

### **DIREZIONI TOGGLE** (Alternano stato aperto/chiuso ad ogni azione)

---

#### 5. **Porta con Pulsante: Passaggio → Scala a Chiocciola**
**Luogo 44 (Passaggio) → Est → Luogo 45 (Scala a chiocciola)**
- **Stato attuale**: `"Est": 45` ❌
- **Stato corretto iniziale**: `"Est": 0` (porta chiusa all'inizio)
- **Azione di toggle**: Premi Pulsante (luogo 44)
- **Effetto apertura**: "Premi il pulsante e la porta ad est si apre con sinistri cigolii" → `"Est": 45`
- **Effetto chiusura**: "Premi il pulsante e la porta ad est si chiude con sinistri cigolii" → `"Est": 0`
- **Meccanismo**: Pulsante rosso con cartello "USCITA", meccanismo a scatto
- **Tentativo manuale**: "La porta è chiusa con un meccanismo a scatto" (comando Apri Porta fallisce)
- **Oggetto associato**: "Porta aperta" cambia visibilità

**Luogo 45 (Scala a chiocciola) → Ovest → Luogo 44 (Passaggio)**
- **Stato attuale**: `"Ovest": 44` ❌
- **Stato corretto iniziale**: `"Ovest": 0` (bloccata)
- **Azione di toggle**: Stessa azione dal luogo 44 (bidirezionale)
- **Note**: Il toggle controlla entrambe le direzioni contemporaneamente

---

#### 6. **Paratia con Sedile: Ampia Sala → Stanza Segreta**
**Luogo 42 (Ampia sala) → Est → Luogo 43 (Stanza segreta)**
- **Stato attuale**: `"Est": 43` ❌
- **Stato corretto iniziale**: `"Est": 0` (paratia chiusa all'inizio)
- **Azione di toggle**: Ruota Sedile (luogo 42)
- **Effetto apertura**: "Ruoti sedile: un meccanismo apre una paratia sulla parete est" → `"Est": 43`
- **Effetto chiusura**: "Ruoti sedile: un meccanismo chiude una paratia sulla parete est" → `"Est": 0`
- **Meccanismo**: Sedile rotante circolare fisso al pavimento, aziona paratia
- **Oggetto associato**: "Paratia" cambia stato (aperta/chiusa)

**Luogo 43 (Stanza segreta) → Ovest → Luogo 42 (Ampia sala)**
- **Stato attuale**: `"Ovest": 42` ❌
- **Stato corretto iniziale**: `"Ovest": 0` (bloccata)
- **Azione di toggle**: Stessa azione dal luogo 42 (bidirezionale)
- **Note**: Il toggle controlla entrambe le direzioni contemporaneamente

---

### **DIREZIONI GIÀ CORRETTE** (Blocchi irreversibili)

---

#### 7. **Crollo Permanente: Stretto Passaggio → Nord**
**Luogo 36 (Stretto passaggio) → Nord**
- **Stato attuale**: `"Nord": 0` ✅ CORRETTO
- **Evento**: Andando a Sud dal luogo precedente, il passaggio crolla
- **Effetto**: "Appena ti lasci alle spalle il tratto di passaggio, questo crolla: sei stato fortunato a non restare sepolto dal crollo ma da quella parte non si può più passare"
- **Descrizione aggiornata**: "Il soffitto è crollato a nord"
- **Note**: Blocco permanente, non reversibile

---

## Riepilogo Totale Modifiche Necessarie

### **Luoghi da modificare: 10**

| Luogo | Nome | Direzione | Da | A | Tipo | Azione Sblocco |
|-------|------|-----------|-----|-----|------|----------------|
| 20 | Studio | Sud | 21 | 0 | Permanente | Infila Medaglione (forma) |
| 21 | Piccola saletta | Nord | 20 | 0 | Permanente | Infila Medaglione (forma) |
| 27 | Corridoio seminterrato | Nord | 28 | 0 | Permanente | Infila Statuetta (nicchia) |
| 28 | Atrio del bunker | Sud | 27 | 0 | Permanente | Infila Statuetta (nicchia) |
| 36 | Stretto passaggio | Ovest | 37 | 0 | Permanente | Infila Medaglione (forma) |
| 37 | Sala di torture | Est | 36 | 0 | Permanente | Infila Medaglione (forma) |
| 49 | Tinello | Ovest | 50 | 0 | Permanente | Scava Macerie |
| 50 | Piccola cucina | Est | 49 | 0 | Permanente | Scava Macerie |
| 44 | Passaggio | Est | 45 | 0 | Toggle | Premi Pulsante |
| 45 | Scala a chiocciola | Ovest | 44 | 0 | Toggle | Premi Pulsante |
| 42 | Ampia sala | Est | 43 | 0 | Toggle | Ruota Sedile |
| 43 | Stanza segreta | Ovest | 42 | 0 | Toggle | Ruota Sedile |

**Totale direzioni da modificare: 12**

---

## Note per l'Implementazione

### Gestione delle Direzioni Permanenti
Le direzioni permanenti, una volta sbloccate, rimangono aperte per il resto del gioco. L'implementazione richiede:
1. Modifica del campo direzione in Luoghi.json (da N a 0)
2. Logica nell'azione che aggiorna il campo quando l'azione viene eseguita
3. Entrambi i luoghi (partenza e destinazione) devono essere aggiornati contemporaneamente

### Gestione delle Direzioni Toggle
Le direzioni toggle alternano tra aperto/chiuso ad ogni azione. L'implementazione richiede:
1. Stato iniziale bloccato (0) in Luoghi.json
2. Logica che verifica lo stato corrente
3. Logica che inverte lo stato (0→N o N→0)
4. Aggiornamento sincronizzato di entrambi i luoghi
5. Eventuale aggiornamento della visibilità di oggetti associati (Porta aperta, Paratia)

### Oggetti Correlati
Alcuni sblocchi di direzioni rendono visibili oggetti specifici:
- **Luogo 27**: "Porta aperta" (ID 19) diventa visibile quando si infila la statuetta
- **Luogo 44**: "Porta aperta" cambia visibilità con il toggle del pulsante
- **Luogo 42**: "Paratia" (ID 32) cambia stato con il toggle del sedile

---

**Data analisi**: 28 dicembre 2025  
**File di riferimento**: `docs/miscellaneous/20251228 - Luoghi azioni effetti - v2.md`
