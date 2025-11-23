# Test DDL e INSERT su nuovo DB odessatest.db
# Esegue tutti i DDL di creazione e gli script di insert su un DB vuoto

$ddlDir = "$(Resolve-Path "$PSScriptRoot/../ddl")"
$dbPath = "$(Resolve-Path "$PSScriptRoot/../test-results/odessatest.db")"

# Rimuovi il DB di test se esiste
if (Test-Path $dbPath) { Remove-Item $dbPath }

# Crea il DB vuoto
sqlite3 $dbPath ".databases"

# Esegui tutti i DDL di creazione (ordinati per numero)
Get-ChildItem -Path $ddlDir -Filter "[0-9][0-9]_create_*.sql" | Sort-Object Name | ForEach-Object {
    Write-Host "Eseguo DDL: $($_.Name)"
    Get-Content $_.FullName | sqlite3 $dbPath
}

# Esegui tutti gli script di insert (ordinati per numero)
Get-ChildItem -Path $ddlDir -Filter "[0-9][0-9]_insert_*.sql" | Sort-Object Name | ForEach-Object {
    Write-Host "Eseguo INSERT: $($_.Name)"
    Get-Content $_.FullName | sqlite3 $dbPath
}

Write-Host "Test completato. Verifica il DB in test-results/odessatest.db"
