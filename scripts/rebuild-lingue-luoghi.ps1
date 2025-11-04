param(
  [string]$DbPath = ".\db\Odessa.db",
  [switch]$IncludeLexiconAligned
)

# Esegue il reset di Lingue/Luoghi e ricostruisce le tabelle con i nuovi script
# Requisiti: sqlite3 CLI nel PATH

$ErrorActionPreference = 'Stop'

function Invoke-Sqlite {
  param(
    [string]$SqlFile
  )
  if (!(Test-Path $SqlFile)) {
    throw "File SQL non trovato: $SqlFile"
  }
  Write-Host "-- Eseguo: $SqlFile"
  # Costruisci l'argomento come UNA singola stringa per sqlite3, con path tra apici singoli
  # In PowerShell gli apici singoli non interpretano escape, e sqlite3 gestisce gli apici singoli internamente
  $readArg = ".read '$SqlFile'"
  & sqlite3 $DbPath $readArg
  if ($LASTEXITCODE -ne 0) {
    throw "sqlite3 ha restituito codice $LASTEXITCODE per $SqlFile"
  }
}

if (!(Test-Path $DbPath)) {
  throw "DB non trovato: $DbPath"
}

$ddlDir = Join-Path $PSScriptRoot "..\ddl" | Resolve-Path

# Se sqlite3 è disponibile, usa la CLI; altrimenti fallback al runner Node
if (Get-Command sqlite3 -ErrorAction SilentlyContinue) {
  $sequence = @(
    "00_drop_lingue_luoghi.sql",
    "01_create_lingue.sql",
    "10_popola_lingue.sql",
    "08_create_luoghi.sql",
    "14_popola_luoghi.sql"
  )

  if ($IncludeLexiconAligned.IsPresent) {
    $sequence += @(
      "29_drop_lexicon_aligned.sql",
      "31_create_piattaforme_aligned.sql",
      "30_create_lexicon_schema_aligned.sql",
      "32_popola_comandi_stopword_aligned.sql",
      "33_popola_software_aligned.sql",
      "37_popola_nouns_aligned.sql",
      "34_mappa_voci_a_software_aligned.sql",
      "35_unifica_sinonimi_osservare.sql",
      "36_add_indexes_aligned.sql",
      "38_create_view_nouns.sql"
    )
  }
  foreach ($f in $sequence) {
    $path = Join-Path $ddlDir $f
    Invoke-Sqlite -SqlFile $path
  }
  Write-Host "Completato: ricostruzione di Lingue e Luoghi eseguita con successo (sqlite3)."
} else {
  Write-Host "sqlite3 non trovato nel PATH: uso il runner Node per l'operazione."
  $nodeRunner = Join-Path $PSScriptRoot "rebuild-lingue-luoghi.mjs"
  if (!(Test-Path $nodeRunner)) {
    throw "Runner Node non trovato: $nodeRunner"
  }
  $nodeArgs = @('--db', $DbPath)
  if ($IncludeLexiconAligned.IsPresent) { $nodeArgs += '--lexicon-aligned' }
  & node $nodeRunner @nodeArgs
  if ($LASTEXITCODE -ne 0) {
    throw "Runner Node ha restituito codice $LASTEXITCODE"
  }
}