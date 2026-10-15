# Test completo per il completamento del gioco

| Campo | Valore |
|---|---|
| Documento | Descrizione del test di riferimento (testbook automatico) |
| Versione | v1.0 |
| Data | 2026-10-15 |
| Issue | #99 — test di riferimento |
| Baseline | v1.4.0 (`f0f3fe3`) |
| Test | `tests/walkthrough.test.ts` |
| Dati | `tests/fixtures/walkthrough/` |

## 1. Scopo

È il controllo principale contro le regressioni sul **meccanismo di gioco**. Gioca partite complete dall'inizio alla vittoria, con il parser e il motore reali, e confronta ogni passo con i valori registrati sulla v1.4.0.

Due percorsi, ciascuno in italiano e in inglese:

| Percorso | Obiettivo | Comandi | Turni all'incontro con Ferenc | Punteggio finale |
|---|---|---|---|---|
| **Minimo** | Vincere con il minor numero di turni | 95 | 94 | 104 |
| **Completo** | Vincere visitando tutti i luoghi e risolvendo tutte le interazioni e i misteri | 147 | 146 | **138** (massimo) |

Il percorso minimo misura il margine sul limite dell'alba (200 turni, decisione R3 del documento `20261015 - Decisioni fedeltà originale - v1.0`). Il percorso completo dimostra che il punteggio massimo dichiarato è raggiungibile.

## 2. Cosa verifica

Per ogni comando di ciascun percorso:
- il comando è accettato: nessun `ERROR`, nessun `GAME_OVER`;
- tipo di risultato, luogo, turni consumati e punteggio coincidono con i valori registrati.

Alla fine di ciascun percorso:
- vittoria e partita conclusa;
- turni consumati all'incontro con Ferenc (risultato `TELEPORT`) uguali al valore registrato; per il percorso minimo, inoltre, non più di 100;
- punteggio finale, elenco dei luoghi visitati, delle interazioni con punteggio e dei misteri risolti uguali ai valori registrati.

Il percorso completo verifica inoltre:
- 56 luoghi (tutti quelli non terminali), 17 interazioni con punteggio, 15 voci tra misteri e sequenza della cassaforte, punteggio 138.

**Compatibilità dei salvataggi.** Il file `save_v140_full_it_step91.json` è un salvataggio prodotto dalla v1.4.0 al passo 91 del percorso completo italiano (dopo `prendi fascicolo`). Il test lo carica in un motore nuovo e prosegue con i passi 92–147: i valori devono coincidere con quelli registrati, fino alla vittoria con 138 punti. Così ogni versione successiva deve saper continuare una partita salvata con la v1.4.0.

## 3. Cosa non verifica

- Il livello HTTP (sessioni, route, rate limiting) e l'interfaccia: restano la prova manuale e i test dedicati.
- Le regole che un giocatore esperto non attiva: morte al buio, sosta in zona aperta, avvisi dell'alba, timer della guardia, fiammiferi esauriti, comandi errati, risposte "di colore". Ogni specifica che introduce o modifica una di queste regole porta i propri test mirati.
- I testi delle risposte: il test confronta stato ed esiti, non i messaggi.

## 4. Regole di manutenzione

1. I file in `tests/fixtures/walkthrough/` sono valori di riferimento: **non si rigenerano per far passare il test**.
2. Si modificano solo nella stessa PR di una decisione approvata che cambia il percorso, con l'elenco dei passi cambiati e la motivazione nella descrizione della PR.
3. Ogni modifica aggiorna questo documento (versione e tabelle) nella stessa PR.
4. Il salvataggio v1.4.0 non si modifica mai: rappresenta i file già nelle mani dei giocatori.

## 5. Esecuzione

```bash
npx vitest run tests/walkthrough.test.ts
```

Il test fa parte della suite (`npm test`) ed è eseguito dalla CI su Node 18.20.x e 20.x.

## 6. Note sui percorsi

- **Limite di 5 oggetti.** Servono contemporaneamente lampada, badile, lista, statuetta e medaglione: per questo i documenti si posano subito nella reception e si riprendono al ritorno, e fiammiferi, torcia e badile si posano quando non servono più.
- **Zona aperta (regola v1.4.0).** Il contatore dei turni passati nella piazza, nella strada e davanti ai fili spinati si azzera solo uscendo dalla zona e uccide al quinto turno. Il percorso completo visita i vicoli ciechi in più passaggi separati, uscendo ogni volta verso l'atrio (47) o il capanno (57).
- **Passaggio crollato (36).** Dopo il passaggio verso sud il ritorno a nord è chiuso: camera, studio, bagno e cucina (31, 33–35) si visitano prima.
- **Medaglione.** Si usa due volte: nella forma circolare dello studio (20) per la saletta segreta, poi nel passaggio crollato (36) per il ritorno attraverso la sala di torture (37).
- **Luoghi mortali esclusi.** 8 (dentro l'elevatore), 40 (dentro il pozzo), 54 (posto di blocco) sono terminali e non contano nel punteggio.

## 7. Percorso minimo (IT ed EN)

| # | Comando IT | Comando EN | Luogo dopo il comando | Turni | Punti | Note |
|---|---|---|---|---|---|---|
| 1 | `e` | `e` | 2 – Reception | 1 | 2 |  |
| 2 | `posa documenti` | `drop documents` | 2 – Reception | 2 | 2 | Limite di 5 oggetti: i documenti si riprendono nella reception al ritorno |
| 3 | `n` | `n` | 6 – Ripostiglio | 3 | 3 |  |
| 4 | `prendi lampada` | `take lamp` | 6 – Ripostiglio | 4 | 3 |  |
| 5 | `accendi lampada` | `light lamp` | 6 – Ripostiglio | 5 | 5 | Fonte di luce per tutto il resto della partita |
| 6 | `posa fiammiferi` | `drop matches` | 6 – Ripostiglio | 6 | 5 | Lampada accesa: i fiammiferi non servono più (regole v1.4.0) |
| 7 | `s` | `s` | 2 – Reception | 7 | 5 |  |
| 8 | `s` | `s` | 5 – Ampio e umido corridoio | 8 | 6 |  |
| 9 | `e` | `e` | 14 – Grande salone | 9 | 7 |  |
| 10 | `e` | `e` | 15 – Ex sala radio | 10 | 8 |  |
| 11 | `e` | `e` | 16 – Cortile esterno | 11 | 9 |  |
| 12 | `s` | `s` | 17 – Cortile | 12 | 10 |  |
| 13 | `s` | `s` | 18 – Garage | 13 | 11 |  |
| 14 | `posa torcia` | `drop flashlight` | 18 – Garage | 14 | 11 | Torcia guasta dopo 6 turni: libera un posto |
| 15 | `prendi badile` | `take spade` | 18 – Garage | 15 | 11 |  |
| 16 | `n` | `n` | 17 – Cortile | 16 | 11 |  |
| 17 | `n` | `n` | 16 – Cortile esterno | 17 | 11 |  |
| 18 | `o` | `w` | 15 – Ex sala radio | 18 | 11 |  |
| 19 | `o` | `w` | 14 – Grande salone | 19 | 11 |  |
| 20 | `o` | `w` | 5 – Ampio e umido corridoio | 20 | 11 |  |
| 21 | `s` | `s` | 23 – Ampio e umido corridoio | 21 | 12 |  |
| 22 | `s` | `s` | 24 – Ex biblioteca | 22 | 13 |  |
| 23 | `sposta quadro` | `move painting` | 24 – Ex biblioteca | 23 | 18 |  |
| 24 | `ruota destra` | `turn right` | 24 – Ex biblioteca | 24 | 18 |  |
| 25 | `ruota sinistra` | `turn left` | 24 – Ex biblioteca | 25 | 18 |  |
| 26 | `ruota sinistra` | `turn left` | 24 – Ex biblioteca | 26 | 18 |  |
| 27 | `ruota destra` | `turn right` | 24 – Ex biblioteca | 27 | 18 |  |
| 28 | `ruota sinistra` | `turn left` | 24 – Ex biblioteca | 28 | 20 |  |
| 29 | `esamina cassaforte` | `examine safe` | 24 – Ex biblioteca | 29 | 25 | Compare il medaglione |
| 30 | `prendi medaglione` | `take medallion` | 24 – Ex biblioteca | 30 | 25 |  |
| 31 | `n` | `n` | 23 – Ampio e umido corridoio | 31 | 25 |  |
| 32 | `e` | `e` | 20 – Studio | 32 | 26 |  |
| 33 | `sposta arazzo` | `move tapestry` | 20 – Studio | 33 | 31 |  |
| 34 | `infila medaglione` | `insert medallion` | 20 – Studio | 34 | 36 |  |
| 35 | `s` | `s` | 21 – Piccola saletta | 35 | 37 |  |
| 36 | `prendi lista` | `take roster` | 21 – Piccola saletta | 36 | 37 |  |
| 37 | `e` | `e` | 22 – Sala trofei | 37 | 38 |  |
| 38 | `prendi statuetta` | `take statuette` | 22 – Sala trofei | 38 | 38 |  |
| 39 | `o` | `w` | 21 – Piccola saletta | 39 | 38 |  |
| 40 | `n` | `n` | 20 – Studio | 40 | 38 |  |
| 41 | `prendi medaglione` | `take medallion` | 20 – Studio | 41 | 38 | Ripreso dalla forma circolare: serve nel passaggio crollato |
| 42 | `o` | `w` | 23 – Ampio e umido corridoio | 42 | 38 |  |
| 43 | `n` | `n` | 5 – Ampio e umido corridoio | 43 | 38 |  |
| 44 | `o` | `w` | 13 – Pianerottolo | 44 | 39 |  |
| 45 | `giu` | `down` | 26 – Pianerottolo inferiore | 45 | 40 |  |
| 46 | `e` | `e` | 27 – Corridoio del seminterrato | 46 | 41 |  |
| 47 | `infila statuetta` | `insert statuette` | 27 – Corridoio del seminterrato | 47 | 49 |  |
| 48 | `n` | `n` | 28 – Atrio del bunker | 48 | 50 |  |
| 49 | `n` | `n` | 29 – Stretto passaggio | 49 | 51 |  |
| 50 | `e` | `e` | 30 – Stretto passaggio | 50 | 52 |  |
| 51 | `e` | `e` | 32 – Stretto passaggio | 51 | 53 |  |
| 52 | `s` | `s` | 36 – Stretto passaggio | 52 | 54 |  |
| 53 | `infila medaglione` | `insert medallion` | 36 – Stretto passaggio | 53 | 59 |  |
| 54 | `e` | `e` | 41 – Passaggio Est - Ovest | 54 | 60 |  |
| 55 | `n` | `n` | 42 – Ampia sala | 55 | 61 |  |
| 56 | `ruota sedile` | `turn seat` | 42 – Ampia sala | 56 | 66 |  |
| 57 | `e` | `e` | 43 – Stanza segreta | 57 | 67 |  |
| 58 | `prendi fascicolo` | `take folder` | 43 – Stanza segreta | 58 | 67 |  |
| 59 | `o` | `w` | 42 – Ampia sala | 59 | 67 |  |
| 60 | `s` | `s` | 41 – Passaggio Est - Ovest | 60 | 67 |  |
| 61 | `e` | `e` | 44 – Passaggio | 61 | 68 |  |
| 62 | `premi pulsante` | `press button` | 44 – Passaggio | 62 | 73 |  |
| 63 | `e` | `e` | 45 – Scala a chiocciola | 63 | 74 |  |
| 64 | `su` | `up` | 46 – Scala a chiocciola | 64 | 75 |  |
| 65 | `e` | `e` | 47 – Atrio | 65 | 76 |  |
| 66 | `s` | `s` | 49 – Tinello | 66 | 77 |  |
| 67 | `scava macerie` | `dig rubble` | 49 – Tinello | 67 | 82 |  |
| 68 | `posa badile` | `drop spade` | 49 – Tinello | 68 | 82 | Il badile non serve più |
| 69 | `o` | `w` | 50 – Piccola cucina | 69 | 83 |  |
| 70 | `prendi peso` | `take weight` | 50 – Piccola cucina | 70 | 83 |  |
| 71 | `e` | `e` | 49 – Tinello | 71 | 83 |  |
| 72 | `n` | `n` | 47 – Atrio | 72 | 83 |  |
| 73 | `e` | `e` | 51 – Grossa piazza | 73 | 84 |  |
| 74 | `e` | `e` | 55 – Strada | 74 | 85 |  |
| 75 | `n` | `n` | 57 – Capanno degli attrezzi | 75 | 86 |  |
| 76 | `metti peso` | `put weight` | 57 – Capanno degli attrezzi | 76 | 91 |  |
| 77 | `esamina botola` | `examine hatch` | 57 – Capanno degli attrezzi | 77 | 96 |  |
| 78 | `prendi dossier` | `take dossier` | 57 – Capanno degli attrezzi | 78 | 96 |  |
| 79 | `s` | `s` | 55 – Strada | 79 | 96 |  |
| 80 | `o` | `w` | 51 – Grossa piazza | 80 | 96 |  |
| 81 | `o` | `w` | 47 – Atrio | 81 | 96 |  |
| 82 | `o` | `w` | 46 – Scala a chiocciola | 82 | 96 |  |
| 83 | `giu` | `down` | 45 – Scala a chiocciola | 83 | 96 |  |
| 84 | `o` | `w` | 44 – Passaggio | 84 | 96 |  |
| 85 | `o` | `w` | 41 – Passaggio Est - Ovest | 85 | 96 |  |
| 86 | `o` | `w` | 36 – Stretto passaggio | 86 | 96 |  |
| 87 | `o` | `w` | 37 – Sala di torture | 87 | 97 |  |
| 88 | `o` | `w` | 27 – Corridoio del seminterrato | 88 | 97 |  |
| 89 | `o` | `w` | 26 – Pianerottolo inferiore | 89 | 97 |  |
| 90 | `su` | `up` | 13 – Pianerottolo | 90 | 97 |  |
| 91 | `e` | `e` | 5 – Ampio e umido corridoio | 91 | 97 |  |
| 92 | `n` | `n` | 2 – Reception | 92 | 97 |  |
| 93 | `prendi documenti` | `take documents` | 2 – Reception | 93 | 97 | Documenti necessari alla barriera |
| 94 | `o` | `w` | 59 – Barriera col settore americano | 94 | 102 | Incontro con Ferenc e trasferimento alla barriera |
| 95 | `porgi documenti` | `give documents` | 59 – Barriera col settore americano | 95 | 104 | Vittoria |

## 8. Percorso completo (IT ed EN)

| # | Comando IT | Comando EN | Luogo dopo il comando | Turni | Punti | Note |
|---|---|---|---|---|---|---|
| 1 | `e` | `e` | 2 – Reception | 1 | 2 |  |
| 2 | `posa documenti` | `drop documents` | 2 – Reception | 2 | 2 | Limite di 5 oggetti: i documenti si riprendono nella reception al ritorno |
| 3 | `n` | `n` | 6 – Ripostiglio | 3 | 3 |  |
| 4 | `prendi lampada` | `take lamp` | 6 – Ripostiglio | 4 | 3 |  |
| 5 | `accendi lampada` | `light lamp` | 6 – Ripostiglio | 5 | 5 | Fonte di luce per tutto il resto della partita |
| 6 | `posa fiammiferi` | `drop matches` | 6 – Ripostiglio | 6 | 5 | Lampada accesa: i fiammiferi non servono più (regole v1.4.0) |
| 7 | `s` | `s` | 2 – Reception | 7 | 5 |  |
| 8 | `e` | `e` | 3 – Grande corridoio impolverato | 8 | 6 |  |
| 9 | `n` | `n` | 7 – Grosso scalone | 9 | 7 |  |
| 10 | `su` | `up` | 9 – Scalone | 10 | 8 |  |
| 11 | `s` | `s` | 10 – Corridoio diroccato | 11 | 9 |  |
| 12 | `o` | `w` | 11 – Stanzetta - ufficio | 12 | 10 |  |
| 13 | `s` | `s` | 12 – Grande sala | 13 | 11 |  |
| 14 | `n` | `n` | 11 – Stanzetta - ufficio | 14 | 11 |  |
| 15 | `e` | `e` | 10 – Corridoio diroccato | 15 | 11 |  |
| 16 | `n` | `n` | 9 – Scalone | 16 | 11 |  |
| 17 | `giu` | `down` | 7 – Grosso scalone | 17 | 11 |  |
| 18 | `s` | `s` | 3 – Grande corridoio impolverato | 18 | 11 |  |
| 19 | `e` | `e` | 4 – Elevatore | 19 | 12 |  |
| 20 | `o` | `w` | 3 – Grande corridoio impolverato | 20 | 12 |  |
| 21 | `o` | `w` | 2 – Reception | 21 | 12 |  |
| 22 | `s` | `s` | 5 – Ampio e umido corridoio | 22 | 13 |  |
| 23 | `e` | `e` | 14 – Grande salone | 23 | 14 |  |
| 24 | `e` | `e` | 15 – Ex sala radio | 24 | 15 |  |
| 25 | `e` | `e` | 16 – Cortile esterno | 25 | 16 |  |
| 26 | `s` | `s` | 17 – Cortile | 26 | 17 |  |
| 27 | `s` | `s` | 18 – Garage | 27 | 18 |  |
| 28 | `posa torcia` | `drop flashlight` | 18 – Garage | 28 | 18 | Torcia guasta dopo 6 turni: libera un posto |
| 29 | `prendi badile` | `take spade` | 18 – Garage | 29 | 18 |  |
| 30 | `n` | `n` | 17 – Cortile | 30 | 18 |  |
| 31 | `n` | `n` | 16 – Cortile esterno | 31 | 18 |  |
| 32 | `o` | `w` | 15 – Ex sala radio | 32 | 18 |  |
| 33 | `s` | `s` | 19 – Armeria | 33 | 19 |  |
| 34 | `o` | `w` | 20 – Studio | 34 | 20 |  |
| 35 | `o` | `w` | 23 – Ampio e umido corridoio | 35 | 21 |  |
| 36 | `s` | `s` | 24 – Ex biblioteca | 36 | 22 |  |
| 37 | `sposta quadro` | `move painting` | 24 – Ex biblioteca | 37 | 27 |  |
| 38 | `ruota destra` | `turn right` | 24 – Ex biblioteca | 38 | 27 |  |
| 39 | `ruota sinistra` | `turn left` | 24 – Ex biblioteca | 39 | 27 |  |
| 40 | `ruota sinistra` | `turn left` | 24 – Ex biblioteca | 40 | 27 |  |
| 41 | `ruota destra` | `turn right` | 24 – Ex biblioteca | 41 | 27 |  |
| 42 | `ruota sinistra` | `turn left` | 24 – Ex biblioteca | 42 | 29 |  |
| 43 | `esamina cassaforte` | `examine safe` | 24 – Ex biblioteca | 43 | 34 | Compare il medaglione |
| 44 | `prendi medaglione` | `take medallion` | 24 – Ex biblioteca | 44 | 34 |  |
| 45 | `esamina cassaforte` | `examine safe` | 24 – Ex biblioteca | 45 | 36 | Cassaforte vuota: interazione con punteggio |
| 46 | `n` | `n` | 23 – Ampio e umido corridoio | 46 | 36 |  |
| 47 | `o` | `w` | 25 – Vecchio archivio | 47 | 37 |  |
| 48 | `sposta fermacarte` | `move paperweight` | 25 – Vecchio archivio | 48 | 42 |  |
| 49 | `esamina scomparto` | `examine compartment` | 25 – Vecchio archivio | 49 | 47 |  |
| 50 | `e` | `e` | 23 – Ampio e umido corridoio | 50 | 47 |  |
| 51 | `e` | `e` | 20 – Studio | 51 | 47 |  |
| 52 | `sposta arazzo` | `move tapestry` | 20 – Studio | 52 | 52 |  |
| 53 | `infila medaglione` | `insert medallion` | 20 – Studio | 53 | 57 |  |
| 54 | `s` | `s` | 21 – Piccola saletta | 54 | 58 |  |
| 55 | `prendi lista` | `take roster` | 21 – Piccola saletta | 55 | 58 |  |
| 56 | `e` | `e` | 22 – Sala trofei | 56 | 59 |  |
| 57 | `prendi statuetta` | `take statuette` | 22 – Sala trofei | 57 | 59 |  |
| 58 | `o` | `w` | 21 – Piccola saletta | 58 | 59 |  |
| 59 | `n` | `n` | 20 – Studio | 59 | 59 |  |
| 60 | `prendi medaglione` | `take medallion` | 20 – Studio | 60 | 59 | Ripreso dalla forma circolare: serve nel passaggio crollato |
| 61 | `o` | `w` | 23 – Ampio e umido corridoio | 61 | 59 |  |
| 62 | `n` | `n` | 5 – Ampio e umido corridoio | 62 | 59 |  |
| 63 | `o` | `w` | 13 – Pianerottolo | 63 | 60 |  |
| 64 | `giu` | `down` | 26 – Pianerottolo inferiore | 64 | 61 |  |
| 65 | `e` | `e` | 27 – Corridoio del seminterrato | 65 | 62 |  |
| 66 | `s` | `s` | 38 – Piccola saletta | 66 | 63 |  |
| 67 | `n` | `n` | 27 – Corridoio del seminterrato | 67 | 63 |  |
| 68 | `infila statuetta` | `insert statuette` | 27 – Corridoio del seminterrato | 68 | 71 |  |
| 69 | `n` | `n` | 28 – Atrio del bunker | 69 | 72 |  |
| 70 | `n` | `n` | 29 – Stretto passaggio | 70 | 73 |  |
| 71 | `e` | `e` | 30 – Stretto passaggio | 71 | 74 |  |
| 72 | `s` | `s` | 31 – Piccola cucina | 72 | 75 |  |
| 73 | `n` | `n` | 30 – Stretto passaggio | 73 | 75 |  |
| 74 | `n` | `n` | 33 – Camera da letto | 74 | 76 |  |
| 75 | `e` | `e` | 34 – Studio adiacente | 75 | 77 |  |
| 76 | `o` | `w` | 33 – Camera da letto | 76 | 77 |  |
| 77 | `o` | `w` | 35 – Bagno adiacente | 77 | 78 |  |
| 78 | `e` | `e` | 33 – Camera da letto | 78 | 78 |  |
| 79 | `s` | `s` | 30 – Stretto passaggio | 79 | 78 |  |
| 80 | `e` | `e` | 32 – Stretto passaggio | 80 | 79 |  |
| 81 | `s` | `s` | 36 – Stretto passaggio | 81 | 80 |  |
| 82 | `s` | `s` | 39 – Pozzo | 82 | 81 |  |
| 83 | `n` | `n` | 36 – Stretto passaggio | 83 | 81 |  |
| 84 | `infila medaglione` | `insert medallion` | 36 – Stretto passaggio | 84 | 86 |  |
| 85 | `o` | `w` | 37 – Sala di torture | 85 | 87 |  |
| 86 | `e` | `e` | 36 – Stretto passaggio | 86 | 87 |  |
| 87 | `e` | `e` | 41 – Passaggio Est - Ovest | 87 | 88 |  |
| 88 | `n` | `n` | 42 – Ampia sala | 88 | 89 |  |
| 89 | `ruota sedile` | `turn seat` | 42 – Ampia sala | 89 | 94 |  |
| 90 | `e` | `e` | 43 – Stanza segreta | 90 | 95 |  |
| 91 | `prendi fascicolo` | `take folder` | 43 – Stanza segreta | 91 | 95 |  |
| 92 | `o` | `w` | 42 – Ampia sala | 92 | 95 |  |
| 93 | `s` | `s` | 41 – Passaggio Est - Ovest | 93 | 95 |  |
| 94 | `e` | `e` | 44 – Passaggio | 94 | 96 |  |
| 95 | `premi pulsante` | `press button` | 44 – Passaggio | 95 | 101 |  |
| 96 | `e` | `e` | 45 – Scala a chiocciola | 96 | 102 |  |
| 97 | `su` | `up` | 46 – Scala a chiocciola | 97 | 103 |  |
| 98 | `e` | `e` | 47 – Atrio | 98 | 104 |  |
| 99 | `n` | `n` | 48 – Stanza della domestica | 99 | 105 |  |
| 100 | `s` | `s` | 47 – Atrio | 100 | 105 |  |
| 101 | `s` | `s` | 49 – Tinello | 101 | 106 |  |
| 102 | `scava macerie` | `dig rubble` | 49 – Tinello | 102 | 111 |  |
| 103 | `esamina macerie` | `examine rubble` | 49 – Tinello | 103 | 113 |  |
| 104 | `posa badile` | `drop spade` | 49 – Tinello | 104 | 113 | Il badile non serve più |
| 105 | `o` | `w` | 50 – Piccola cucina | 105 | 114 |  |
| 106 | `prendi peso` | `take weight` | 50 – Piccola cucina | 106 | 114 |  |
| 107 | `e` | `e` | 49 – Tinello | 107 | 114 |  |
| 108 | `n` | `n` | 47 – Atrio | 108 | 114 |  |
| 109 | `e` | `e` | 51 – Grossa piazza | 109 | 115 |  |
| 110 | `n` | `n` | 52 – Filo spinato | 110 | 116 |  |
| 111 | `s` | `s` | 51 – Grossa piazza | 111 | 116 |  |
| 112 | `o` | `w` | 47 – Atrio | 112 | 116 |  |
| 113 | `e` | `e` | 51 – Grossa piazza | 113 | 116 |  |
| 114 | `s` | `s` | 53 – Posto di blocco | 114 | 117 |  |
| 115 | `n` | `n` | 51 – Grossa piazza | 115 | 117 |  |
| 116 | `o` | `w` | 47 – Atrio | 116 | 117 |  |
| 117 | `e` | `e` | 51 – Grossa piazza | 117 | 117 |  |
| 118 | `e` | `e` | 55 – Strada | 118 | 118 |  |
| 119 | `n` | `n` | 57 – Capanno degli attrezzi | 119 | 119 |  |
| 120 | `metti peso` | `put weight` | 57 – Capanno degli attrezzi | 120 | 124 |  |
| 121 | `esamina botola` | `examine hatch` | 57 – Capanno degli attrezzi | 121 | 129 |  |
| 122 | `prendi dossier` | `take dossier` | 57 – Capanno degli attrezzi | 122 | 129 |  |
| 123 | `s` | `s` | 55 – Strada | 123 | 129 |  |
| 124 | `e` | `e` | 56 – Filo spinato | 124 | 130 |  |
| 125 | `o` | `w` | 55 – Strada | 125 | 130 |  |
| 126 | `n` | `n` | 57 – Capanno degli attrezzi | 126 | 130 |  |
| 127 | `s` | `s` | 55 – Strada | 127 | 130 |  |
| 128 | `s` | `s` | 58 – Filo spinato | 128 | 131 |  |
| 129 | `n` | `n` | 55 – Strada | 129 | 131 |  |
| 130 | `n` | `n` | 57 – Capanno degli attrezzi | 130 | 131 |  |
| 131 | `s` | `s` | 55 – Strada | 131 | 131 |  |
| 132 | `o` | `w` | 51 – Grossa piazza | 132 | 131 |  |
| 133 | `o` | `w` | 47 – Atrio | 133 | 131 |  |
| 134 | `o` | `w` | 46 – Scala a chiocciola | 134 | 131 |  |
| 135 | `giu` | `down` | 45 – Scala a chiocciola | 135 | 131 |  |
| 136 | `o` | `w` | 44 – Passaggio | 136 | 131 |  |
| 137 | `o` | `w` | 41 – Passaggio Est - Ovest | 137 | 131 |  |
| 138 | `o` | `w` | 36 – Stretto passaggio | 138 | 131 |  |
| 139 | `o` | `w` | 37 – Sala di torture | 139 | 131 |  |
| 140 | `o` | `w` | 27 – Corridoio del seminterrato | 140 | 131 |  |
| 141 | `o` | `w` | 26 – Pianerottolo inferiore | 141 | 131 |  |
| 142 | `su` | `up` | 13 – Pianerottolo | 142 | 131 |  |
| 143 | `e` | `e` | 5 – Ampio e umido corridoio | 143 | 131 |  |
| 144 | `n` | `n` | 2 – Reception | 144 | 131 |  |
| 145 | `prendi documenti` | `take documents` | 2 – Reception | 145 | 131 | Documenti necessari alla barriera |
| 146 | `o` | `w` | 59 – Barriera col settore americano | 146 | 136 | Incontro con Ferenc e trasferimento alla barriera |
| 147 | `porgi documenti` | `give documents` | 59 – Barriera col settore americano | 147 | 138 | Vittoria |
