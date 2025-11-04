# Conformità Parser a REQ01 (2025-11-04)

Questo documento sintetizza lo stato di conformità del Parser rispetto a REQ01.

## Lessico e dati (DB)
- TipiLessico: VERBO_AZIONE, NAVIGAZIONE, SISTEMA, NOUN, STOPWORD
- Conteggi attuali (Lingua=IT):
  - NAVIGAZIONE: Termini=6, Voci=14
  - SISTEMA: Termini=5, Voci=9
  - NOUN: Termini=25, Voci=25
  - VERBO_AZIONE: Termini=32, Voci=33
  - STOPWORD: Termini=1, Voci=20 (include articoli e preposizioni articolate)
- Navigazione: sinonimi e abbreviazioni conforme (N/NORD, SU/SALI/ALTO, GIU/SCENDI/BASSO, ...)
- Sistema: INVENTARIO/COSA/?, SALVA/SAVE, CARICA/LOAD, PUNTI, FINE
- NOUN: lista SME (esempi REQ01) precaricata e idempotente

## Parser: comportamento
- Normalizzazione: trim, uppercase, spazi multipli → singolo; rimozione diacritici; tolleranza punteggiatura (eccetto '?')
- Stopword: articoli e preposizioni articolate rimosse
- Grammatica valida:
  - NAV/SYS singolo token
  - ACTION singolo per DORMI/SCAPPA/SORRIDI
  - ACTION + NOUN (+ indice opzionale)
- Errori e messaggi (mappa):
  - COMMAND_UNKNOWN → ?NON CAPISCO QUESTA PAROLA.
  - SYNTAX_ACTION_INCOMPLETE → ?COSA VUOI?
  - SYNTAX_NOUN_UNKNOWN → ?NON VEDO NESSUN "X" QUI.
  - SYNTAX_INVALID_STRUCTURE → ?NON CAPISCO.

## API e UI
- /api/parser/parse, /api/parser/reload, /api/parser/stats
- /api/engine/execute, /api/engine/state, /api/engine/reset
- web/parser.html: analisi, esecuzione, riepilogo, help; pulsanti Stato/Reset stato

## Test automatici
- Copertura:
  - Parser: casi base, errori, sinonimi NAV/SYS, canonici NAV, verbi ACTION (lista REQ01), punteggiatura/accenti
  - Engine stub esteso: INVENTARIO, PRENDI/POSA, ESAMINA, APRI/CHIUDI
- Esito corrente: tutti i test passano

## Note
- La tabella nel requisito elenca 33 verbi; una dicitura iniziale "36" pare non allineata all'elenco. Il set è comunque estendibile via DB.
- I verbi ACTION che non richiedono oggetto sono in una whitelist nel codice; possono diventare configurabili.
