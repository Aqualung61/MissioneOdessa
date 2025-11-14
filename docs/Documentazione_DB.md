# Documentazione del Database

**Percorso Database:** c:\Users\mauro\OneDrive\Documenti\20251029 - Missione Odessa App\db\odessa.db

## Tabella: Lingue

### Struttura:

```sql
CREATE TABLE "Lingue" (
	"ID"	INTEGER NOT NULL UNIQUE,
	"IDLingua"	TEXT NOT NULL,
	"Descrizione"	TEXT NOT NULL,
	PRIMARY KEY("ID" AUTOINCREMENT)
)
```

### Colonne:

| Nome | Tipo | Not Null | Predefinito | Chiave Primaria |
|------|------|----------|-------------|----------------|
| ID | INTEGER | Sì |  | Sì |
| IDLingua | TEXT | Sì |  | No |
| Descrizione | TEXT | Sì |  | No |

## Tabella: Piattaforme

### Struttura:

```sql
CREATE TABLE Piattaforme (
    ID_Piattaforma INTEGER PRIMARY KEY AUTOINCREMENT,
    NomePiattaforma TEXT NOT NULL UNIQUE
)
```

### Colonne:

| Nome | Tipo | Not Null | Predefinito | Chiave Primaria |
|------|------|----------|-------------|----------------|
| ID_Piattaforma | INTEGER | No |  | Sì |
| NomePiattaforma | TEXT | Sì |  | No |

## Tabella: Software

### Struttura:

```sql
CREATE TABLE Software (
    ID_Software INTEGER PRIMARY KEY AUTOINCREMENT,
    NomeSoftware TEXT NOT NULL UNIQUE
)
```

### Colonne:

| Nome | Tipo | Not Null | Predefinito | Chiave Primaria |
|------|------|----------|-------------|----------------|
| ID_Software | INTEGER | No |  | Sì |
| NomeSoftware | TEXT | Sì |  | No |

## Tabella: TipiLessico

### Struttura:

```sql
CREATE TABLE TipiLessico (
    ID_TipoLessico INTEGER PRIMARY KEY AUTOINCREMENT,
    NomeTipo TEXT NOT NULL UNIQUE
)
```

### Colonne:

| Nome | Tipo | Not Null | Predefinito | Chiave Primaria |
|------|------|----------|-------------|----------------|
| ID_TipoLessico | INTEGER | No |  | Sì |
| NomeTipo | TEXT | Sì |  | No |

## Tabella: TerminiLessico

### Struttura:

```sql
CREATE TABLE TerminiLessico (
    ID_Termine INTEGER PRIMARY KEY AUTOINCREMENT,
    Concetto TEXT NOT NULL,
    ID_TipoLessico INTEGER NOT NULL,
    FOREIGN KEY (ID_TipoLessico) REFERENCES TipiLessico(ID_TipoLessico)
)
```

### Colonne:

| Nome | Tipo | Not Null | Predefinito | Chiave Primaria |
|------|------|----------|-------------|----------------|
| ID_Termine | INTEGER | No |  | Sì |
| Concetto | TEXT | Sì |  | No |
| ID_TipoLessico | INTEGER | Sì |  | No |

## Tabella: VociLessico

### Struttura:

```sql
CREATE TABLE VociLessico (
    ID_Voce INTEGER PRIMARY KEY AUTOINCREMENT,
    Voce TEXT NOT NULL,
    ID_Termine INTEGER NOT NULL,
    ID_Lingua INTEGER NOT NULL,
    FOREIGN KEY (ID_Termine) REFERENCES TerminiLessico(ID_Termine),
    FOREIGN KEY (ID_Lingua) REFERENCES Lingue(ID_Lingua)
)
```

### Colonne:

| Nome | Tipo | Not Null | Predefinito | Chiave Primaria |
|------|------|----------|-------------|----------------|
| ID_Voce | INTEGER | No |  | Sì |
| Voce | TEXT | Sì |  | No |
| ID_Termine | INTEGER | Sì |  | No |
| ID_Lingua | INTEGER | Sì |  | No |

## Tabella: LessicoSoftware

### Struttura:

```sql
CREATE TABLE LessicoSoftware (
    ID_Software INTEGER NOT NULL,
    ID_Voce INTEGER NOT NULL,
    PRIMARY KEY (ID_Software, ID_Voce),
    FOREIGN KEY (ID_Software) REFERENCES Software(ID_Software),
    FOREIGN KEY (ID_Voce) REFERENCES VociLessico(ID_Voce)
)
```

### Colonne:

| Nome | Tipo | Not Null | Predefinito | Chiave Primaria |
|------|------|----------|-------------|----------------|
| ID_Software | INTEGER | Sì |  | Sì |
| ID_Voce | INTEGER | Sì |  | Sì |

## Tabella: Luoghi

### Struttura:

```sql
CREATE TABLE "Luoghi" (
	"ID"	INTEGER NOT NULL UNIQUE,
	"IDLingua"	INTEGER NOT NULL DEFAULT 1,
	"Nome"	TEXT NOT NULL,
	"Descrizione"	TEXT NOT NULL,
	"Piano"	INTEGER NOT NULL,
	"Nord"	INTEGER NOT NULL,
	"Est"	INTEGER NOT NULL,
	"Sud"	INTEGER NOT NULL,
	"Ovest"	INTEGER NOT NULL,
	"Su"	INTEGER NOT NULL,
	"Giu"	INTEGER NOT NULL,
	"Terminale"	INTEGER NOT NULL,
	PRIMARY KEY("ID" AUTOINCREMENT),
	FOREIGN KEY("IDLingua") REFERENCES "Lingue"("ID")
)
```

### Colonne:

| Nome | Tipo | Not Null | Predefinito | Chiave Primaria |
|------|------|----------|-------------|----------------|
| ID | INTEGER | Sì |  | Sì |
| IDLingua | INTEGER | Sì | 1 | No |
| Nome | TEXT | Sì |  | No |
| Descrizione | TEXT | Sì |  | No |
| Piano | INTEGER | Sì |  | No |
| Nord | INTEGER | Sì |  | No |
| Est | INTEGER | Sì |  | No |
| Sud | INTEGER | Sì |  | No |
| Ovest | INTEGER | Sì |  | No |
| Su | INTEGER | Sì |  | No |
| Giu | INTEGER | Sì |  | No |
| Terminale | INTEGER | Sì |  | No |

## Tabella: Introduzione

### Struttura:

```sql
CREATE TABLE Introduzione (
    ID INTEGER PRIMARY KEY NOT NULL,
    IDLingua INTEGER NOT NULL,
    Testo TEXT NOT NULL,
    FOREIGN KEY (IDLingua) REFERENCES Lingue(ID)
)
```

### Colonne:

| Nome | Tipo | Not Null | Predefinito | Chiave Primaria |
|------|------|----------|-------------|----------------|
| ID | INTEGER | Sì |  | Sì |
| IDLingua | INTEGER | Sì |  | No |
| Testo | TEXT | Sì |  | No |

## Tabella: Luoghi_immagine

### Struttura:

```sql
CREATE TABLE "Luoghi_immagine" (
	"ID"	INTEGER NOT NULL,
	"ID_luoghi"	INTEGER NOT NULL,
	"Immagine"	TEXT NOT NULL,
	"Buio"	INTEGER NOT NULL DEFAULT 0,
	PRIMARY KEY("ID" AUTOINCREMENT),
	FOREIGN KEY("ID_luoghi") REFERENCES "Luoghi"("ID")
)
```

### Colonne:

| Nome | Tipo | Not Null | Predefinito | Chiave Primaria |
|------|------|----------|-------------|----------------|
| ID | INTEGER | Sì |  | Sì |
| ID_luoghi | INTEGER | Sì |  | No |
| Immagine | TEXT | Sì |  | No |
| Buio | INTEGER | Sì | 0 | No |

