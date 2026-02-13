param(
  [Parameter(Mandatory=$true)][string]$ScriptName,
  [string]$RepoRoot = "C:\Users\steve\wingman",
  [string[]]$Args
)
$ErrorActionPreference = "Stop"

$toolsDir = Join-Path $RepoRoot "tools"
$sn = $ScriptName.Trim()
if ($sn -notmatch '\.ps1$') { $sn = $sn + '.ps1' }
$sn = ($sn -replace '^\.\\tools\\','') -replace '^tools\\',''
$scriptPath = Join-Path $toolsDir $sn
if (!(Test-Path $scriptPath)) { throw "Tool not found: $scriptPath" }

Push-Location $RepoRoot
try {
  & pwsh -NoProfile -ExecutionPolicy Bypass -File $scriptPath @Args
} finally {
  Pop-Location
}