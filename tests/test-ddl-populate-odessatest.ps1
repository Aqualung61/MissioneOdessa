# Test DDL e INSERT su nuovo DB odessatest.db
# Esegue tutti i DDL di creazione e gli script di insert su un DB vuoto

$ddlDir = "$(Resolve-Path "$PSScriptRoot/../ddl")"
$dbPath = "$(Resolve-Path "$PSScriptRoot/../test-results/odessatest.db")"

# Rimuovi il DB di test se esiste
if (Test-Path $dbPath) { Remove-Item $dbPath }

# Crea il DB vuoto
sqlite3 $dbPath ".databases"

# Esegui tutti i DDL di creazione (ordinati)
Get-ChildItem -Path $ddlDir -Filter "01_create_*.sql" | Sort-Object Name | ForEach-Object {
    Write-Host "Eseguo DDL: $($_.Name)"
    Get-Content $_.FullName | sqlite3 $dbPath
}
Get-ChildItem -Path $ddlDir -Filter "02_create_*.sql" | Sort-Object Name | ForEach-Object {
    Write-Host "Eseguo DDL: $($_.Name)"
    Get-Content $_.FullName | sqlite3 $dbPath
}
Get-ChildItem -Path $ddlDir -Filter "03_create_*.sql" | Sort-Object Name | ForEach-Object {
    Write-Host "Eseguo DDL: $($_.Name)"
    Get-Content $_.FullName | sqlite3 $dbPath
}
Get-ChildItem -Path $ddlDir -Filter "04_create_*.sql" | Sort-Object Name | ForEach-Object {
    Write-Host "Eseguo DDL: $($_.Name)"
    Get-Content $_.FullName | sqlite3 $dbPath
}
Get-ChildItem -Path $ddlDir -Filter "05_create_*.sql" | Sort-Object Name | ForEach-Object {
    Write-Host "Eseguo DDL: $($_.Name)"
    Get-Content $_.FullName | sqlite3 $dbPath
}
Get-ChildItem -Path $ddlDir -Filter "06_create_*.sql" | Sort-Object Name | ForEach-Object {
    Write-Host "Eseguo DDL: $($_.Name)"
    Get-Content $_.FullName | sqlite3 $dbPath
}
Get-ChildItem -Path $ddlDir -Filter "07_create_*.sql" | Sort-Object Name | ForEach-Object {
    Write-Host "Eseguo DDL: $($_.Name)"
    Get-Content $_.FullName | sqlite3 $dbPath
}
Get-ChildItem -Path $ddlDir -Filter "08_create_*.sql" | Sort-Object Name | ForEach-Object {
    Write-Host "Eseguo DDL: $($_.Name)"
    Get-Content $_.FullName | sqlite3 $dbPath
}
# Esegui il DDL per Luoghi_immagine (09)
$luoghiImg = Join-Path $ddlDir "09_create_Luoghi_immagine.sql"
if (Test-Path $luoghiImg) {
    Write-Host "Eseguo DDL: 09_create_Luoghi_immagine.sql"
    Get-Content $luoghiImg | sqlite3 $dbPath
}
Get-ChildItem -Path $ddlDir -Filter "14_create_*.sql" | Sort-Object Name | ForEach-Object {
    Write-Host "Eseguo DDL: $($_.Name)"
    Get-Content $_.FullName | sqlite3 $dbPath
}

# Esegui tutti gli script di insert (ordinati)
Get-ChildItem -Path $ddlDir -Filter "11_insert_*.sql" | Sort-Object Name | ForEach-Object {
    Write-Host "Eseguo INSERT: $($_.Name)"
    Get-Content $_.FullName | sqlite3 $dbPath
}
Get-ChildItem -Path $ddlDir -Filter "12_insert_*.sql" | Sort-Object Name | ForEach-Object {
    Write-Host "Eseguo INSERT: $($_.Name)"
    Get-Content $_.FullName | sqlite3 $dbPath
}
Get-ChildItem -Path $ddlDir -Filter "13_insert_*.sql" | Sort-Object Name | ForEach-Object {
    Write-Host "Eseguo INSERT: $($_.Name)"
    Get-Content $_.FullName | sqlite3 $dbPath
}
Get-ChildItem -Path $ddlDir -Filter "14_insert_*.sql" | Sort-Object Name | ForEach-Object {
    Write-Host "Eseguo INSERT: $($_.Name)"
    Get-Content $_.FullName | sqlite3 $dbPath
}
Get-ChildItem -Path $ddlDir -Filter "15_insert_*.sql" | Sort-Object Name | ForEach-Object {
    Write-Host "Eseguo INSERT: $($_.Name)"
    Get-Content $_.FullName | sqlite3 $dbPath
}
Get-ChildItem -Path $ddlDir -Filter "16_insert_*.sql" | Sort-Object Name | ForEach-Object {
    Write-Host "Eseguo INSERT: $($_.Name)"
    Get-Content $_.FullName | sqlite3 $dbPath
}
Get-ChildItem -Path $ddlDir -Filter "17_insert_*.sql" | Sort-Object Name | ForEach-Object {
    Write-Host "Eseguo INSERT: $($_.Name)"
    Get-Content $_.FullName | sqlite3 $dbPath
}
Get-ChildItem -Path $ddlDir -Filter "18_insert_*.sql" | Sort-Object Name | ForEach-Object {
    Write-Host "Eseguo INSERT: $($_.Name)"
    Get-Content $_.FullName | sqlite3 $dbPath
}

# Esegui anche gli script 19_insert_*.sql (es. Luoghi_immagine)
Get-ChildItem -Path $ddlDir -Filter "19_insert_*.sql" | Sort-Object Name | ForEach-Object {
    Write-Host "Eseguo INSERT: $($_.Name)"
    Get-Content $_.FullName | sqlite3 $dbPath
}

Write-Host "Test completato. Verifica il DB in test-results/odessatest.db"
