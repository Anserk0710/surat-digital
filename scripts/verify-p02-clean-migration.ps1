$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$pgBin = 'C:\Program Files\PostgreSQL\18\bin'
$tempParent = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
$tempRoot = Join-Path $tempParent ('surat-p02-clean-' + [guid]::NewGuid().ToString('N'))
$cluster = Join-Path $tempRoot 'data'
$evidencePath = Join-Path $root 'docs/evidence/P02/clean-migration.json'
$started = $false
$result = [ordered]@{
  test = 'P02-T01'
  status = 'FAIL'
  kind = 'Empty local PostgreSQL 18 database, all Prisma migrations'
  timestamp = (Get-Date).ToUniversalTime().ToString('o')
}
$originalDirect = $env:DIRECT_URL
$originalDatabase = $env:DATABASE_URL
$originalMigrationRole = $env:P02_MIGRATION_ROLE_NAME

function Run-Native([string]$program, [string[]]$arguments) {
  & $program @arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$program exited with $LASTEXITCODE"
  }
}

try {
  New-Item -ItemType Directory -Path $tempRoot | Out-Null
  $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
  $listener.Start()
  $port = $listener.LocalEndpoint.Port
  $listener.Stop()

  Run-Native (Join-Path $pgBin 'initdb.exe') @('-D', $cluster, '-A', 'trust', '-U', 'postgres', '-E', 'UTF8', '--no-instructions')
  Run-Native (Join-Path $pgBin 'pg_ctl.exe') @('-D', $cluster, '-o', "-p $port -h 127.0.0.1", '-l', (Join-Path $tempRoot 'postgres.log'), 'start')
  $started = $true
  Run-Native (Join-Path $pgBin 'psql.exe') @('-h', '127.0.0.1', '-p', "$port", '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', 'CREATE ROLE surat_migrator LOGIN; CREATE ROLE surat_runtime LOGIN; CREATE ROLE anon; CREATE ROLE authenticated;')
  Run-Native (Join-Path $pgBin 'psql.exe') @('-h', '127.0.0.1', '-p', "$port", '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', 'CREATE DATABASE surat_p02 OWNER surat_migrator;')
  $env:DIRECT_URL = "postgresql://surat_migrator@127.0.0.1:$port/surat_p02?schema=public"
  $env:DATABASE_URL = "postgresql://surat_runtime@127.0.0.1:$port/surat_p02?schema=public"
  $env:P02_MIGRATION_ROLE_NAME = 'surat_migrator'
  Push-Location (Join-Path $root 'apps/api')
  try {
    Run-Native 'npm.cmd' @('run', 'db:migrate:deploy')
  } finally {
    Pop-Location
  }
  $migrationCount = & (Join-Path $pgBin 'psql.exe') -h 127.0.0.1 -p $port -U surat_migrator -d surat_p02 -At -v ON_ERROR_STOP=1 -c 'SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL;'
  if ($LASTEXITCODE -ne 0) { throw 'Migration count query failed.' }
  $expected = @(Get-ChildItem (Join-Path $root 'apps/api/prisma/migrations') -Directory).Count
  if ([int]$migrationCount -ne $expected) {
    throw "Expected $expected migrations; found $migrationCount."
  }
  $result.status = 'PASS'
  $result.migrationsApplied = [int]$migrationCount
  Write-Output "P02-T01 clean migration: PASS ($migrationCount migrations)"
} catch {
  $result.error = $_.Exception.Message
  Write-Error $_
} finally {
  $env:DIRECT_URL = $originalDirect
  $env:DATABASE_URL = $originalDatabase
  $env:P02_MIGRATION_ROLE_NAME = $originalMigrationRole
  if ($started) {
    & (Join-Path $pgBin 'pg_ctl.exe') -D $cluster -m immediate stop | Out-Null
  }
  $resolved = [IO.Path]::GetFullPath($tempRoot)
  if ($resolved.StartsWith($tempParent, [StringComparison]::OrdinalIgnoreCase) -and (Split-Path -Leaf $resolved).StartsWith('surat-p02-clean-')) {
    Remove-Item -LiteralPath $resolved -Recurse -Force
  }
  [IO.File]::WriteAllText($evidencePath, ($result | ConvertTo-Json -Depth 5), (New-Object System.Text.UTF8Encoding($false)))
  if ($result.status -ne 'PASS') { exit 1 }
}
