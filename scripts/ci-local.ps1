<#
.SYNOPSIS
  Runs what CI runs, with the same commands and in the same order, on this machine against a native PostgreSQL, so a
  green run here means a green run in CI. Stops at the first failure and prints each step's time.
.EXAMPLE
  ./scripts/ci-local.ps1                 # everything CI runs on a pull request, end-to-end tests included
  ./scripts/ci-local.ps1 -SkipE2E        # everything but the end-to-end tests
  ./scripts/ci-local.ps1 -Base origin/develop
#>
param(
  [string]$Base = 'origin/measure-module',
  [string]$TestDatabaseUrl = 'postgres://mapp@127.0.0.1:5432/postgres?sslmode=disable',
  [switch]$SkipE2E
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root 'backend'
$frontend = Join-Path $root 'frontend'
$timings = [System.Collections.Generic.List[string]]::new()

function Invoke-Step([string]$Name, [string]$Dir, [scriptblock]$Command) {
  Write-Output "== $Name"
  $clock = [System.Diagnostics.Stopwatch]::StartNew()
  Push-Location $Dir
  try { & $Command } finally { Pop-Location }
  $ok = $LASTEXITCODE -eq 0
  $timings.Add(('{0,6:N1} min  {1}' -f $clock.Elapsed.TotalMinutes, $Name))
  if (-not $ok) {
    Write-Output "FAILED: $Name"
    $timings | ForEach-Object { Write-Output $_ }
    exit 1
  }
}

function Assert-Empty([string]$Text, [string]$Message) {
  if ($Text) { Write-Output $Message; Write-Output $Text; $global:LASTEXITCODE = 1 } else { $global:LASTEXITCODE = 0 }
}

$env:TEST_DATABASE_URL = $TestDatabaseUrl
$mergeBase = git -C $root merge-base $Base HEAD

$rules = Join-Path $root 'scripts/check-rules.ps1'
if (Test-Path $rules) { Invoke-Step 'Rules' $root { pwsh -NoProfile -File $rules -Base $Base } }
Invoke-Step 'Backend format' $backend {
  $unformatted = @(gofmt -s -l .) + @(go run golang.org/x/tools/cmd/goimports@v0.52.0 -local mapp -l .) | Where-Object { $_ }
  Assert-Empty ($unformatted -join "`n") 'Not formatted - run: golangci-lint fmt ./...'
}
Invoke-Step 'Generated queries' $backend {
  go run github.com/sqlc-dev/sqlc/cmd/sqlc@v1.31.1 generate
  if ($LASTEXITCODE -eq 0) { go run github.com/sqlc-dev/sqlc/cmd/sqlc@v1.31.1 vet }
  if ($LASTEXITCODE -eq 0) { Assert-Empty (git status --porcelain -- internal/platform/database/sqlcdb | Out-String).Trim() 'Generated queries are out of date' }
}
Invoke-Step 'Timing tests' $backend {
  go test -count=1 -run 'TestQueryLog_50000Entries_SC006|TestQuery_StressYear_SC004|TestImport_FiveThousandRows_SC004|TestTransactions_TwentyThousand_SC004|TestHome_LargeScope_SC004' ./internal/history/ ./internal/allwork/ ./internal/financials/ ./internal/home/
}
Invoke-Step 'Vulnerabilities' $backend { go run golang.org/x/vuln/cmd/govulncheck@v1.9.0 ./... }
Invoke-Step 'Vet' $backend { go vet ./... }
Invoke-Step 'Lint' $backend { golangci-lint run --timeout=15m "--new-from-rev=$mergeBase" ./... }
Invoke-Step 'Backend tests (all packages, race)' $backend { go test -race -count=1 ./... }

Invoke-Step 'Install' $frontend { pnpm install --frozen-lockfile }
Invoke-Step 'Frontend format' $frontend { pnpm run format:check }
Invoke-Step 'Typecheck' $frontend { pnpm run typecheck }
Invoke-Step 'Frontend lint' $frontend { pnpm run lint }
Invoke-Step 'API types current' $frontend { pnpm run api:check }
Invoke-Step 'Build' $frontend { pnpm run build }
Invoke-Step 'Audit' $frontend { pnpm audit --prod --audit-level high }
Invoke-Step 'Frontend tests (all)' $frontend { pnpm run test:coverage }
if (-not $SkipE2E) {
  Invoke-Step 'End-to-end (all specs)' $frontend { pnpm run test:e2e }
}

Write-Output '== All green'
$timings | ForEach-Object { Write-Output $_ }
exit 0
