# Runs backend + frontend concurrently (best-effort simple orchestrator)
Param(
  [string]$ApiPort = '3001',
  [string]$WebPort = '3000'
)
$ErrorActionPreference = 'Stop'

Write-Host '==> Spawning backend (API)'
$backend = Start-Process pwsh -ArgumentList "-NoLogo","-NoProfile","-ExecutionPolicy","Bypass","-File","$PSScriptRoot/dev-backend.ps1" -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 5

Write-Host '==> Spawning frontend (gadmin)'
$frontend = Start-Process pwsh -ArgumentList "-NoLogo","-NoProfile","-ExecutionPolicy","Bypass","-File","$PSScriptRoot/dev-frontend.ps1","-Port",$WebPort -PassThru -WindowStyle Hidden

Write-Host "Backend PID: $($backend.Id)  Frontend PID: $($frontend.Id)"
Write-Host 'Press Ctrl+C to terminate both.'

# Wait loop to forward Ctrl+C
try {
  while ($backend.HasExited -eq $false -or $frontend.HasExited -eq $false) {
    Start-Sleep -Seconds 2
  }
} finally {
  if ($backend -and $backend.HasExited -eq $false) { Stop-Process -Id $backend.Id -Force }
  if ($frontend -and $frontend.HasExited -eq $false) { Stop-Process -Id $frontend.Id -Force }
}
