# Installa gli hook Git dalla cartella ./hooks nella cartella locale .git/hooks
param()

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent
$src = Join-Path $repoRoot 'hooks'
$dst = Join-Path $repoRoot '.git/hooks'

if (-not (Test-Path $dst)) {
  Write-Error ".git/hooks non trovato. Assicurati di essere in un repo Git inizializzato."
  exit 1
}

Get-ChildItem -Path $src -File | ForEach-Object {
  $target = Join-Path $dst $_.Name
  Copy-Item $_.FullName $target -Force
}

Write-Host "Hook installati in $dst"
Write-Host "Nota: su Windows Git usa sh per eseguire gli hook. Se necessario, rendere eseguibili i file (Git Bash)."