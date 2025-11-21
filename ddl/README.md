# Guida ripristino DB Missione Odessa

Questa directory contiene tutti i file necessari per ricreare e ripopolare il database SQLite `odessa.db`. Tutti gli script SQL sono ora qui: non esistono altre subdir dedicate.

## Struttura dei file

- `01_create_<Tabella>.sql` — DDL di creazione per ogni tabella
- `11_insert_<Tabella>.sql` — SQL con tutte le INSERT dei dati attuali
- `99_drop_all_tables.sql` — DDL per eliminare tutte le tabelle

## Procedura di ripristino

1. **Drop di tutte le tabelle** (opzionale, solo se vuoi azzerare il DB):
   ```sh
   sqlite3 odessa.db < 99_drop_all_tables.sql
   ```
2. **Creazione delle tabelle**:
   Esegui in ordine tutti i file `01_create_<Tabella>.sql`:
   ```sh
   sqlite3 odessa.db < 01_create_Lingue.sql
   sqlite3 odessa.db < 02_create_Piattaforme.sql
   ...
   sqlite3 odessa.db < 08_create_Luoghi.sql
   ```
3. **Popolamento dati**:
   Esegui in ordine tutti i file `11_insert_<Tabella>.sql`:
   ```sh
   sqlite3 odessa.db < 11_insert_Lingue.sql
   sqlite3 odessa.db < 12_insert_Piattaforme.sql
   ...
   sqlite3 odessa.db < 18_insert_Luoghi.sql
   ```

## Note
- Puoi eseguire tutti i file in batch con uno script PowerShell o Bash.
- I file sono generati con la numerazione per facilitare l’ordine di esecuzione.
- Se usi un DB vuoto, basta partire dal punto 2.

## Sicurezza
Effettua sempre un backup del file `odessa.db` prima di sovrascrivere o azzerare il database.

---
Per domande o problemi, consulta la documentazione di progetto o chiedi supporto.
