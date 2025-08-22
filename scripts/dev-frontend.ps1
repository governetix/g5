Param(
  [string]$Port = '3000'
)
$ErrorActionPreference = 'Stop'
Write-Host '==> Starting gadmin (Next.js) dev server on port' $Port
Push-Location "$PSScriptRoot/../apps/gadmin"
if (Get-Command pnpm -ErrorAction SilentlyContinue) {
  pnpm install
  $env:PORT=$Port
  pnpm dev
} elseif (Get-Command npm -ErrorAction SilentlyContinue) {
  npm install
  $env:PORT=$Port
  npm run dev
} else {
  throw 'pnpm or npm not found'
}
Pop-Location
