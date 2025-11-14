import sqlite3
import os

def generate_db_documentation(db_path, output_path):
    try:
        # Connessione al database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Recupera lo schema del database
        cursor.execute("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
        tables = cursor.fetchall()

        # Genera la documentazione
        with open(output_path, "w", encoding="utf-8") as f:
            f.write("# Documentazione del Database\n\n")
            f.write(f"**Percorso Database:** {db_path}\n\n")

            for table_name, table_sql in tables:
                f.write(f"## Tabella: {table_name}\n\n")
                f.write("### Struttura:\n\n")
                f.write(f"```sql\n{table_sql}\n```\n\n")

                # Recupera informazioni sulle colonne
                cursor.execute(f"PRAGMA table_info({table_name});")
                columns = cursor.fetchall()

                f.write("### Colonne:\n\n")
                f.write("| Nome | Tipo | Not Null | Predefinito | Chiave Primaria |\n")
                f.write("|------|------|----------|-------------|----------------|\n")
                for col in columns:
                    col_name, col_type, not_null, default_val, pk = col[1:6]
                    f.write(f"| {col_name} | {col_type} | {'Sì' if not_null else 'No'} | {default_val or ''} | {'Sì' if pk else 'No'} |\n")
                f.write("\n")

        print(f"Documentazione generata con successo in: {output_path}")

    except sqlite3.Error as e:
        print(f"Errore durante la connessione al database: {e}")

    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    # Percorso del database e file di output
    db_path = "c:\\Users\\mauro\\OneDrive\\Documenti\\20251029 - Missione Odessa App\\db\\odessa.db"
    output_path = "c:\\Users\\mauro\\OneDrive\\Documenti\\20251029 - Missione Odessa App\\docs\\Documentazione_DB.md"

    # Crea la directory di output se non esiste
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # Genera la documentazione
    generate_db_documentation(db_path, output_path)