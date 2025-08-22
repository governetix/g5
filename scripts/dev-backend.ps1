Param(
  [switch]$Recreate
)

$ErrorActionPreference = 'Stop'

Write-Host '==> Starting local dev environment (Postgres + Redis)...'
# Start only required services in detached mode
 docker compose up -d postgres redis

if ($LASTEXITCODE -ne 0) { throw 'docker compose up failed' }

if ($Recreate) {
  Write-Host '==> Recreate flag set: dropping and recreating database objects (if script logic added later).'
}

Push-Location "$PSScriptRoot/../apps/g5-core-api"

# Ensure node modules (using pnpm if available)
if (Get-Command pnpm -ErrorAction SilentlyContinue) {
  Write-Host '==> Installing dependencies with pnpm'
  pnpm install
} elseif (Get-Command npm -ErrorAction SilentlyContinue) {
  Write-Host '==> Installing dependencies with npm'
  npm install
} else {
  throw 'Neither pnpm nor npm found in PATH.'
}

# Run TypeORM migrations (assuming script defined in package.json as "migration:run")
Write-Host '==> Running database migrations'
if (Test-Path package.json) {
  $pkg = Get-Content package.json -Raw | ConvertFrom-Json
  if ($pkg.scripts.'migration:run') {
    if (Get-Command pnpm -ErrorAction SilentlyContinue) { pnpm run migration:run } else { npm run migration:run }
  } else {
    Write-Warning 'migration:run script not defined; skipping explicit migration execution.'
  }
}

Write-Host '==> Starting NestJS in watch mode'
if (Get-Command pnpm -ErrorAction SilentlyContinue) { pnpm run start:dev } else { npm run start:dev }

Pop-Location
