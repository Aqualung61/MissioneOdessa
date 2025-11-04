# DDL e dump DB

Questo folder contiene due insiemi di SQL:

1) Snapshot reale dal DB (autoritative)
- 01_schema_from_db.sql: schema estratto da db/Odessa.db
- 02_data_from_db.sql: dati attuali (INSERT)

2) Schema progettuale del parser (lessico) e popolamenti
- 01..07_create_*.sql: proposta di schema (versione iniziale)
- 10..21_popola_*.sql: script di esempio/popola base (ITA)

3) Schema lessico allineato al DB reale (consigliato)
- 30_create_lexicon_schema_aligned.sql: crea tabelle TipiLessico/TerminiLessico/VociLessico/Software/LessicoSoftware usando Lingue.ID esistente (nessun duplicato della tabella Lingue)
- 32_popola_comandi_stopword_aligned.sql: popolamento completo verbi/navigazione/sistema/stopword per Italiano (LinguaID=1)

Note su differenze chiave:
- DB reale ha tabelle: Lingue(ID, IDLingua, Descrizione) e Luoghi(...). Non esistono ancora tabelle lessico.
- Gli script 01..07_create_* definiscono anche "Lingue" con schema diverso; usare invece 30_create_lexicon_schema_aligned.sql per evitare conflitti.
- Gli script 20/21 originali usano colonne ID_Termine/ID_Lingua; usare la variante 32_* che adopera TermineID/LinguaID e vincola a Lingue(ID).

Ordine consigliato (aggiungere lessico al DB attuale):
1. (opzionale) Eseguire 01_schema_from_db.sql + 02_data_from_db.sql su un DB vuoto per ricostruire lo stato corrente
2. Eseguire 30_create_lexicon_schema_aligned.sql
3. Eseguire 32_popola_comandi_stopword_aligned.sql (inserisce anche i TipiLessico se mancanti)

Prossimi passi (opzionali):
- Aggiungere i NOUN (sostantivi di gioco) in una 33_popola_noun_it.sql
- Collegare le VociLessico al Software con una 34_popola_lessico_software.sql
- Valutare indici/constraint aggiuntivi su Luoghi (es. coerenza direzioni)

## Reset e ricostruzione di Lingue e Luoghi

Per riallineare lo schema e i dati delle tabelle core `Lingue` e `Luoghi`:

1) Drop tabelle (ATTENZIONE: cancella dati)
- 00_drop_lingue_luoghi.sql

2) Creazione e popolamento aggiornati
- 01_create_lingue.sql
- 10_popola_lingue.sql
- 08_create_luoghi.sql
- 14_popola_luoghi.sql

Esecuzione automatizzata (Windows/PowerShell, richiede `sqlite3` nel PATH):

```powershell
cd "$PSScriptRoot\..\.."  # opzionale: portarsi alla radice repo
./scripts/rebuild-lingue-luoghi.ps1 -DbPath .\db\Odessa.db
# includere anche lo schema lessico allineato
./scripts/rebuild-lingue-luoghi.ps1 -DbPath .\db\Odessa.db -IncludeLexiconAligned
```

Note:
- Gli script di creazione abilitano `PRAGMA foreign_keys=ON`.
- `Luoghi.IDLingua` ha default 1 e vincolo FK verso `Lingue(ID)`.

Suggerimento: lo script PowerShell tenta automaticamente di usare `sqlite3` se disponibile; in caso contrario effettua un fallback al runner Node incluso nel progetto.
Esecuzione diretta del runner Node (alternativa cross-platform):

```powershell
node ./scripts/rebuild-lingue-luoghi.mjs --db .\db\Odessa.db
# includere anche lo schema lessico allineato
node ./scripts/rebuild-lingue-luoghi.mjs --db .\db\Odessa.db --lexicon-aligned
```
