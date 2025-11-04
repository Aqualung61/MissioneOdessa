# Aggiorna la cartella di preproduzione (deploy) con la versione corrente in sviluppo (ROOT)
# Esegui questo script da PowerShell nella cartella ROOT del progetto

$source = Get-Location
$dest = Join-Path $source 'deploy'

Write-Host "Backup preproduzione: $source -> $dest"

# Cancella tutto il contenuto della cartella deploy tranne la cartella stessa
Get-ChildItem -Path $dest -Recurse -Force | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue


 # Copia tutti i file e cartelle dalla ROOT alla cartella deploy, escludendo 'deploy', 'backup', 'node_modules', 'docs', 'test-results'
Get-ChildItem -Path $source -Exclude 'deploy','backup','node_modules','docs','test-results' | ForEach-Object {
    if ($_.PSIsContainer) {
        Copy-Item $_.FullName $dest -Recurse -Force
    } else {
        Copy-Item $_.FullName $dest -Force
    }
}

Write-Host "Aggiornamento preproduzione completato."

# Installa le dipendenze di produzione in deploy
Write-Host "Eseguo npm install --omit=dev in deploy..."
Push-Location $dest
npm install --omit=dev
Write-Host "Installazione completata. Avvio backend (npm run start)..."
npm run start
Pop-Location
