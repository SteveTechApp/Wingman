# tools/wingman-install.ps1
# Installs prerequisites and sets up Wingman on a Windows machine.
# Usage:
#   pwsh -NoProfile -ExecutionPolicy Bypass -File tools\wingman-install.ps1 -RepoRoot "C:\Users\steve\wingman"
# If -RepoRoot omitted, script searches upward from current directory for package.json.

[CmdletBinding()]
param(
  [string]$RepoRoot = ""
)

$ErrorActionPreference = "Stop"

function Find-RepoRoot([string]$start) {
  $p = if ($start) { $start } else { (Get-Location).Path }
  $cur = Resolve-Path -LiteralPath $p
  while ($true) {
    $pkg = Join-Path $cur "package.json"
    if (Test-Path -LiteralPath $pkg) { return $cur }
    $parent = Split-Path -Parent $cur
    if (-not $parent -or $parent -eq $cur) { throw "Could not find repo root (package.json) from: $p" }
    $cur = $parent
  }
}

function Has-Command([string]$name) {
  return $null -ne (Get-Command $name -ErrorAction SilentlyContinue)
}

function Run([string]$cmd, [string[]]$args) {
  Write-Host ("== {0} {1}" -f $cmd, ($args -join " "))
  $p = Start-Process -FilePath $cmd -ArgumentList $args -NoNewWindow -Wait -PassThru
  if ($p.ExitCode -ne 0) { throw "Command failed ($cmd). ExitCode=$($p.ExitCode)" }
}

$repo = Find-RepoRoot $RepoRoot
Write-Host ("Repo: {0}" -f $repo)

# 1) winget presence
if (-not (Has-Command "winget")) {
  Write-Host "winget not found. Install 'App Installer' from Microsoft Store, then re-run."
  throw "winget missing"
}

# 2) Install Git
if (-not (Has-Command "git")) {
  Run "winget" @("install","--id","Git.Git","-e","--source","winget","--accept-package-agreements","--accept-source-agreements")
} else {
  Write-Host "Git already present."
}

# 3) Install Node.js LTS
if (-not (Has-Command "node")) {
  Run "winget" @("install","--id","OpenJS.NodeJS.LTS","-e","--source","winget","--accept-package-agreements","--accept-source-agreements")
} else {
  Write-Host "Node already present."
}

# Refresh PATH in current session (best effort)
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

if (-not (Has-Command "node")) { throw "Node still not available after install. Open a new PowerShell window and re-run." }
if (-not (Has-Command "npm")) { throw "npm not available. Node install may have failed." }

Run "node" @("--version")
Run "npm"  @("--version")

# 4) Install deps
Push-Location $repo
try {
  if (Test-Path -LiteralPath (Join-Path $repo "package-lock.json")) {
    Run "npm" @("ci")
  } else {
    Run "npm" @("install")
  }

  # 5) env file
  $envExample = Join-Path $repo ".env.example"
  $envLocal = Join-Path $repo ".env.local"
  if ((Test-Path -LiteralPath $envExample) -and (-not (Test-Path -LiteralPath $envLocal))) {
    Copy-Item -LiteralPath $envExample -Destination $envLocal -Force
    Write-Host ("Created: {0} (from .env.example)" -f $envLocal)
  }

  # 6) Build
  Run "npm" @("run","build")

  # 7) Desktop shortcut to run dev server
  $desktop = [Environment]::GetFolderPath("Desktop")
  $lnkPath = Join-Path $desktop "Wingman (Dev).lnk"

  $wsh = New-Object -ComObject WScript.Shell
  $lnk = $wsh.CreateShortcut($lnkPath)
  $lnk.TargetPath = "pwsh.exe"
  $lnk.Arguments = "-NoProfile -ExecutionPolicy Bypass -Command `"cd `"$repo`"; npm run dev`""
  $lnk.WorkingDirectory = $repo
  $lnk.IconLocation = "$env:SystemRoot\System32\SHELL32.dll, 220"
  $lnk.Save()

  Write-Host ("Shortcut created: {0}" -f $lnkPath)

  Write-Host ""
  Write-Host "Install complete."
  Write-Host "Run:"
  Write-Host "  npm run dev"
  Write-Host ""
} finally {
  Pop-Location
}
