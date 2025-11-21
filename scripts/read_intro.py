import sqlite3
import sys

paths = [
    r"c:\Users\mauro\OneDrive\Documenti\20251029 - Missione Odessa App\db\Odessa.db",
    r"c:\Users\mauro\OneDrive\Documenti\20251029 - Missione Odessa App\test-results\odessatest.db",
]

for p in paths:
    print(f"FILE: {p}")
    try:
        conn = sqlite3.connect(p)
        cur = conn.cursor()
        cur.execute("SELECT Testo FROM Introduzione LIMIT 1")
        row = cur.fetchone()
        if row is None:
            print("<NO ROW>")
        else:
            # Ensure we print raw content, preserving newlines
            print(row[0])
    except Exception as e:
        print(f"ERROR: {e}")
    print("---")
