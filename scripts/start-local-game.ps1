param(
  [switch]$NoBrowser,
  [switch]$Headless
)

$ErrorActionPreference = 'Stop'

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$serverScript = Join-Path $projectRoot 'server.js'
$pidFile = Join-Path $projectRoot 'local-server.pid'
$serverUrl = 'http://localhost:3003/'

function Test-ServerReady {
  param([string]$Url)

  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
    return $response.StatusCode -eq 200
  } catch {
    return $false
  }
}

function Wait-ServerReady {
  param(
    [string]$Url,
    [int]$TimeoutSeconds = 20
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-ServerReady -Url $Url) {
      return $true
    }

    Start-Sleep -Milliseconds 500
  }

  return $false
}

function Get-ServerPid {
  $listener = Get-NetTCPConnection -LocalPort 3003 -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique |
    Select-Object -First 1

  if (-not $listener) {
    $netstatLine = netstat -ano | Select-String ':3003' | Select-Object -First 1
    if ($netstatLine) {
      $parts = ($netstatLine.ToString() -split '\s+') | Where-Object { $_ }
      $listener = $parts[-1]
    }
  }

  return $listener
}

if (-not (Test-Path $serverScript)) {
  throw "server.js not found: $serverScript"
}

if (Test-ServerReady -Url $serverUrl) {
  Write-Host "Server already running: $serverUrl"
  if (-not $NoBrowser) {
    Start-Process $serverUrl | Out-Null
  }
  exit 0
}

if ($Headless) {
  $stdoutLog = Join-Path $projectRoot 'server.run.log'
  $stderrLog = Join-Path $projectRoot 'server.run.err.log'
  [void](Start-Process `
    -FilePath 'node' `
    -ArgumentList 'server.js' `
    -WorkingDirectory $projectRoot `
    -RedirectStandardOutput $stdoutLog `
    -RedirectStandardError $stderrLog `
    -PassThru)
} else {
  $command = "Set-Location -LiteralPath '$projectRoot'; node server.js"
  [void](Start-Process `
    -FilePath 'powershell' `
    -ArgumentList '-NoExit', '-Command', $command `
    -WorkingDirectory $projectRoot)
}

if (-not (Wait-ServerReady -Url $serverUrl -TimeoutSeconds 20)) {
  throw "Server failed to start. Check the server window or server.run.err.log."
}

$serverPid = Get-ServerPid
if ($serverPid) {
  Set-Content -Path $pidFile -Value $serverPid
}

Write-Host ('Server started. PID={0}' -f $serverPid)
Write-Host ('Server URL: {0}' -f $serverUrl)

if (-not $NoBrowser) {
  Start-Process $serverUrl | Out-Null
}
