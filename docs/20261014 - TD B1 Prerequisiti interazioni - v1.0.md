# TD B1 — Prerequisiti delle interazioni: FLAG_FALSE, risposte dedicate, tipi sconosciuti, test di schema

| Campo | Valore |
|---|---|
| Documento | Specifica tecnica (TD) |
| Versione | v1.0 — approvata il 2026-10-14 |
| Data | 2026-10-14 |
| Issue | #93 — milestone `v1.4.0 (Stabilità: sessioni e difetti)` |
| Track | Fast con specifica breve |
| Baseline | `main` @ `1ace7a7` (dopo #91) |
| Modello consigliato per l'implementazione | Claude Sonnet 5.5, effort medio |

## 1. Valutazione del rischio di regressione

**Livello complessivo: basso.**

Motivazione:
- La modifica di comportamento visibile riguarda **una sola interazione**, `accendi_lampada`: cambia il messaggio quando mancano lampada o fiammiferi.
- Per tutte le altre interazioni il comportamento resta identico, perché il nuovo meccanismo agisce solo sui prerequisiti che dichiarano una risposta (oggi nessuno, a parte quelli della lampada).
- Il resto è un test di schema sui dati, che non cambia il gioco.

Aree esposte:

| Area | Rischio | Perché |
|---|---|---|
| Interazioni che "cadono" sulla successiva quando un prerequisito fallisce (`esamina_cassaforte_vuota_24` → `esamina_cassaforte_con_medaglione_24`) | **Medio, se mal implementato** | La regola va rispettata alla lettera: senza risposta dichiarata, il prerequisito fallito fa passare all'interazione successiva come oggi (§4.2) |
| `accendi_lampada` | Basso | Cambia solo il testo nei casi di insuccesso; nessun effetto applicato, nessun punteggio, turno consumato come oggi |
| Punteggio | Nullo | Il punteggio si assegna dopo i prerequisiti, invariato |
| Dati IT/EN | Basso | Migrazione di tre campi per lingua, verificata dal test di schema |

Copertura attuale: nessun test esercita oggi `accendi lampada` né i prerequisiti in modo diretto. Vengono aggiunti (§7).

Contenimento: test sulle catene di interazioni con fallback (TB-05) e test di schema sui dati (TB-07…TB-10). Rollback: revert della PR.

## 2. Problema

1. **`FLAG_FALSE` non è gestito.** `verificaPrerequisiti` ignora i tipi che non conosce, quindi `FLAG_FALSE` (usato da `accendi_lampada` su `timers.lampadaAccesa`) risulta sempre soddisfatto.
2. **Ogni tipo sconosciuto è accettato in silenzio.** Un errore di battitura nei dati (`OGGETO_IN_INVENTARIO`) renderebbe il prerequisito sempre vero, senza alcun segnale.
3. **Le risposte dedicate non sono mai usate.** `risposta_no_lampada` e `risposta_no_fiammiferi` esistono nei dati (IT ed EN) ma il motore non le legge. Se un prerequisito fallisce, l'interazione viene saltata e risponde il gestore generico: "Non puoi accendere lampada." invece di "Non hai la lampada.".
4. **Nessun test verifica lo schema di `Interazioni.json`**: tipi ammessi, campi letti dal motore, coerenza IT/EN.

## 3. Obiettivi e non obiettivi

Obiettivi:
1. Implementare `FLAG_FALSE`.
2. Comportamento esplicito per i tipi di prerequisito ed effetto sconosciuti.
3. Messaggio dedicato quando fallisce un prerequisito che lo dichiara.
4. Test di schema su `Interazioni.json`.

Non obiettivi:
- effetti condizionali e reversibili (#96);
- nuove interazioni o modifiche ai testi esistenti, salvo lo spostamento delle tre risposte di §4.3;
- aggiornare la Figura 7 del report as-built v1.3.4, che descrive la versione 1.3.4.

## 4. Soluzione

### 4.1 `FLAG_FALSE`

Prerequisito soddisfatto se il valore al percorso `flag` (notazione a punti, come per `SET_FLAG`) è falsy. Aggiungere un helper `getNestedProperty(obj, path)` accanto a `setNestedProperty`; percorso inesistente → `undefined` → soddisfatto.

### 4.2 Risposta per prerequisito

Ogni prerequisito può avere un campo opzionale `risposta` (stringa).

`verificaPrerequisiti` restituisce, invece di un booleano, un oggetto:

```js
{ ok: true }                      // tutti soddisfatti
{ ok: false, prerequisito: req }  // primo prerequisito fallito, nell'ordine dei dati
```

In `cercaEseguiInterazione`:
- se `ok` → comportamento attuale;
- se fallisce un prerequisito **con** `risposta` → restituire `{ accepted: true, resultType: 'OK', message: req.risposta, effects: [] }`. L'interazione non viene registrata come eseguita, non assegna punti, non applica effetti;
- se fallisce un prerequisito **senza** `risposta` → `continue` verso l'interazione successiva, **esattamente come oggi**.

L'ordine dei prerequisiti nei dati determina quale messaggio prevale.

### 4.3 Migrazione dei dati di `accendi_lampada` (IT ed EN)

| Prerequisito | Campo `risposta` aggiunto (IT) | (EN) |
|---|---|---|
| `OGGETTO_IN_INVENTARIO` Lampada / Lamp | "Non hai la lampada." | "You don't have the lamp." |
| `OGGETTO_IN_INVENTARIO` Fiammiferi / Matches | "Non hai i fiammiferi per accendere la lampada." | "You don't have any matches to light the lamp." |
| `FLAG_FALSE` `timers.lampadaAccesa` | "La lampada è già accesa." | "The lamp is already lit." |

Poi rimuovere dal livello dell'interazione `risposta_no_lampada` e `risposta_no_fiammiferi`. `risposta_gia_eseguita` resta: è letto dal motore per le interazioni non ripetibili già eseguite.

I testi sono quelli già presenti nei dati, senza modifiche.

### 4.4 Tipi sconosciuti

- **Prerequisito** di tipo sconosciuto: considerato **non soddisfatto** (fail-closed) e segnalato con `console.warn` una sola volta per tipo e processo. Non deve generare eccezioni verso il giocatore.
- **Effetto** di tipo sconosciuto in `applicaEffetti`: ignorato come oggi, ma segnalato con `console.warn` una sola volta per tipo.

Il test di schema (§4.5) impedisce che tipi sconosciuti arrivino in produzione; il comportamento runtime è solo una difesa.

### 4.5 Test di schema `tests/interazioni.schema.test.ts`

Per ogni record di `Interazioni.json`:
- chiavi di primo livello ammesse: `id`, `IDLingua`, `trigger`, `condizioni`, `effetti`, `ripetibile` e le risposte lette dal motore: `risposta`, `risposta_apri`, `risposta_chiudi`, `risposta_step`, `risposta_completa`, `risposta_errore`, `risposta_gia_eseguita`;
- tipi di prerequisito ammessi: `OGGETTO_IN_INVENTARIO`, `OGGETTO_IN_LUOGO`, `OGGETTO_VISIBILE`, `SEQUENZA_COMPLETATA`, `INTERAZIONE_ESEGUITA`, `FLAG_FALSE`; chiavi del prerequisito ammesse: `tipo`, `target`, `luogo`, `flag`, `risposta`;
- campi obbligatori per tipo: `target` per i tipi oggetto, sequenza e interazione; `luogo` per `OGGETTO_IN_LUOGO` e `OGGETTO_VISIBILE`; `flag` per `FLAG_FALSE`;
- tipi di effetto ammessi: `VISIBILITA`, `SPOSTA_OGGETTO`, `SBLOCCA_DIREZIONE`, `TOGGLE_DIREZIONE`, `SEQUENZA`, `SET_FLAG`, `RESET_COUNTER`, `VITTORIA`;
- coerenza IT/EN: stessi `id` in entrambe le lingue; per ogni `id`, stessi tipi di prerequisito ed effetto nello stesso ordine; un prerequisito con `risposta` in una lingua la ha anche nell'altra.

Gli insiemi ammessi vanno definiti come costanti in un unico punto, per esempio `src/logic/interactionSchema.js`, importato dal motore e dal test: così motore e test non possono divergere.

## 5. File coinvolti

| File | Modifica |
|---|---|
| `src/logic/engine.js` | `getNestedProperty`, `verificaPrerequisiti` (oggetto risultato, `FLAG_FALSE`, tipi sconosciuti), `cercaEseguiInterazione` (§4.2), avviso per effetti sconosciuti |
| `src/logic/interactionSchema.js` (nuovo) | Insiemi dei tipi e dei campi ammessi |
| `src/data-internal/Interazioni.json` | Migrazione di §4.3 (IT ed EN) |
| `tests/interazioni.schema.test.ts` (nuovo) | Test di schema |
| `tests/unit/interaction-prerequisites.test.ts` (nuovo) | TB-01…TB-06 |
| `docs/release-notes/Unreleased.md` | Voce #93 |

## 6. Criteri di accettazione

| ID | Criterio |
|---|---|
| AC-1 | Lint, build, typecheck e test PASS; test esistenti invariati |
| AC-2 | `accendi lampada` restituisce i messaggi di §4.3 nei tre casi di insuccesso, in IT ed EN |
| AC-3 | Le interazioni con fallback mantengono il comportamento attuale (TB-05) |
| AC-4 | Un tipo di prerequisito sconosciuto rende il prerequisito non soddisfatto, senza eccezioni |
| AC-5 | Il test di schema passa sui dati attuali e fallisce se si introduce un tipo o un campo non ammesso (TB-10) |
| AC-6 | Nessuna chiave `risposta_no_*` resta nei dati |

## 7. Testbook

| ID | Caso | Precondizioni | Azione | Atteso |
|---|---|---|---|---|
| TB-01 | Lampada assente | Lingua IT, lampada non in inventario | `accendi lampada` | "Non hai la lampada."; `lampadaAccesa` resta `false`; nessun punto |
| TB-02 | Fiammiferi assenti | Lampada in inventario, fiammiferi posati | `accendi lampada` | "Non hai i fiammiferi per accendere la lampada." |
| TB-03 | Successo | Lampada e fiammiferi in inventario | `accendi lampada` | Risposta di successo; `lampadaAccesa` = `true`; +2 punti come oggi |
| TB-04 | Già accesa | Dopo TB-03 | `accendi lampada` | "La lampada è già accesa." (via `risposta_gia_eseguita`, come oggi) |
| TB-05 | Fallback invariato | Cassaforte aperta, medaglione non in inventario, luogo 24 | `esamina cassaforte` | Risponde `esamina_cassaforte_con_medaglione_24` come oggi (rende visibile il medaglione) |
| TB-06 | `FLAG_FALSE` | `lampadaAccesa` = `true` impostato a mano, interazione non ancora eseguita | `accendi lampada` | "La lampada è già accesa." dal prerequisito `FLAG_FALSE` |
| TB-07 | Schema: tipi | Dati attuali | Test di schema | PASS |
| TB-08 | Schema: chiavi | Dati attuali | Test di schema | PASS; nessuna `risposta_no_*` |
| TB-09 | Schema: IT/EN | Dati attuali | Test di schema | PASS |
| TB-10 | Schema: negativo | Copia in memoria dei dati con un tipo `OGGETO_IN_INVENTARIO` e una chiave `risposta_xyz` | Funzione di validazione | Restituisce entrambi gli errori |
| TB-11 | EN | Lingua EN, casi TB-01 e TB-02 | `light lamp` | Messaggi EN di §4.3 |

Per TB-10, la validazione va scritta come funzione che restituisce l'elenco degli errori, chiamata dal test sui dati reali (attesi zero errori) e su dati costruiti (attesi errori specifici).

## 8. Rollback

Revert della PR. Nessuna migrazione dei salvataggi: lo stato di gioco non cambia formato.
