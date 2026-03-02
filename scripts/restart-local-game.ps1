param(
  [switch]$NoBrowser,
  [switch]$Headless
)

$ErrorActionPreference = 'Stop'

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$pidFile = Join-Path $projectRoot 'local-server.pid'

function Stop-ProcessIfRunning {
  param([int]$ProcessId)

  $process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
  if ($process) {
    Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
    return $true
  }

  return $false
}

if (Test-Path $pidFile) {
  $pidText = (Get-Content $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1).Trim()
  if ($pidText -match '^\d+$') {
    [void](Stop-ProcessIfRunning -ProcessId ([int]$pidText))
  }
  Remove-Item -Path $pidFile -ErrorAction SilentlyContinue
}

$listeners = Get-NetTCPConnection -LocalPort 3003 -State Listen -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique

if (-not $listeners) {
  $listeners = netstat -ano |
    Select-String ':3003' |
    ForEach-Object {
      $parts = ($_.ToString() -split '\s+') | Where-Object { $_ }
      $parts[-1]
    } |
    Select-Object -Unique
}

foreach ($owningPid in $listeners) {
  $process = Get-Process -Id $owningPid -ErrorAction SilentlyContinue
  if ($process -and $process.ProcessName -eq 'node') {
    Stop-Process -Id $owningPid -Force -ErrorAction SilentlyContinue
  }
}

Start-Sleep -Seconds 1

$args = @(
  '-NoProfile',
  '-ExecutionPolicy',
  'Bypass',
  '-File',
  (Join-Path $PSScriptRoot 'start-local-game.ps1')
)

if ($NoBrowser) {
  $args += '-NoBrowser'
}
if ($Headless) {
  $args += '-Headless'
}

& powershell @args
