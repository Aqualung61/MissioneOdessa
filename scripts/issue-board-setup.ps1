Param(
  [string]$Repo = "Aqualung61/MissioneOdessa"
)

# Richiede GitHub CLI (gh) autenticato.
# Crea etichette standard se mancanti. Idempotente.

$ErrorActionPreference = 'Stop'

function Set-RepoLabel {
  param([string]$Name, [string]$Color, [string]$Description)
  $exists = gh label list --repo $Repo --search $Name | Select-String -Pattern "^$Name\b" -Quiet
  if (-not $exists) {
    gh label create $Name --color $Color --description $Description --repo $Repo | Out-Null
    Write-Host "Label created: $Name"
  } else {
    Write-Host "Label exists: $Name"
  }
}

# Tipi
Set-RepoLabel "type:feature" "1f883d" "Nuova funzionalità o miglioramento"
Set-RepoLabel "type:bug"     "d73a4a" "Bug o regressione"
Set-RepoLabel "type:chore"   "c5def5" "Manutenzione, refactor, setup"
Set-RepoLabel "type:docs"    "0e8a16" "Documentazione"
Set-RepoLabel "type:test"    "5319e7" "Test e QA"

# Aree
Set-RepoLabel "area:parser"  "bfdadc" "Parser e lessico"
Set-RepoLabel "area:engine"  "bfe5ff" "Motore di gioco"
Set-RepoLabel "area:db"      "c2e0c6" "Database e DDL"
Set-RepoLabel "area:ui"      "fef2c0" "Interfaccia utente"
Set-RepoLabel "area:api"     "e99695" "API e server"
Set-RepoLabel "area:ci"      "0366d6" "CI/CD, tooling"

# Priorità
Set-RepoLabel "priority:P0"  "000000" "Bloccante"
Set-RepoLabel "priority:P1"  "b60205" "Alta"
Set-RepoLabel "priority:P2"  "dbab09" "Media"
Set-RepoLabel "priority:P3"  "fbca04" "Bassa"

# Triage
Set-RepoLabel "triage"       "cccccc" "Da classificare"

Write-Host "Done. Labels ensured for $Repo."

# Nota: La creazione del Project board verrà fatta domani manualmente o via:
# gh project create --owner Aqualung61 --title "Missione Odessa Board"
# e poi aggiungere issue come items con: gh project item-add --project <ID> --url <issue-url>