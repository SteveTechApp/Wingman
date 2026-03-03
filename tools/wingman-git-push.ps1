param(
  [string]$Message = "",
  [string]$Branch = "",
  [string]$OriginUrl = "",
  [switch]$NoPull,
  [switch]$ForcePush
)

$ErrorActionPreference = "Stop"

function Fail([string]$msg) { throw $msg }
function Info([string]$msg) { Write-Host "[wingman] $msg" -ForegroundColor Cyan }
function Warn([string]$msg) { Write-Host "[wingman] $msg" -ForegroundColor Yellow }
function Ok([string]$msg)   { Write-Host "[wingman] $msg" -ForegroundColor Green }

function Require-Cmd([string]$cmd) {
  if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) { Fail "Required command not found: $cmd" }
}

function RunGit([string[]]$gitArgs) {
  Info ("git " + ($gitArgs -join " "))
  & git @gitArgs
  if ($LASTEXITCODE -ne 0) { Fail ("Git failed (exit $LASTEXITCODE): git " + ($gitArgs -join " ")) }
}

function GetGit([string[]]$gitArgs) {
  $out = & git @gitArgs 2>$null
  return ($out | Out-String).Trim()
}

Require-Cmd git

# Sanity check: git actually runs
$ver = GetGit @("version")
if ([string]::IsNullOrWhiteSpace($ver) -or $ver -notmatch "^git version") {
  Fail "Git did not run correctly inside the script. Try running: git version"
}
Info $ver

# Ensure repo root
if (-not (Test-Path ".git")) { if (Test-Path "..\.git") { Set-Location ".." } }
if (-not (Test-Path ".git")) { Fail "Not a git repository. Run from C:\Users\steve\wingman" }

Info "Repo: $((Get-Location).Path)"

# Stop lingering git processes (optional)
try { Get-Process git -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue } catch {}

# Remove stale locks
$locks = @(".git\index.lock",".git\HEAD.lock",".git\config.lock",".git\packed-refs.lock")
foreach ($l in $locks) {
  if (Test-Path $l) { Warn "Removing stale lock: $l"; Remove-Item $l -Force -ErrorAction SilentlyContinue }
}

# Ensure origin exists
$origin = GetGit @("remote","get-url","origin")
if ([string]::IsNullOrWhiteSpace($origin)) {
  if ([string]::IsNullOrWhiteSpace($OriginUrl)) {
    Fail "No 'origin' remote. Run with -OriginUrl https://github.com/<you>/<repo>.git"
  }
  Info "Adding origin remote: $OriginUrl"
  RunGit @("remote","add","origin",$OriginUrl)
  $origin = GetGit @("remote","get-url","origin")
}
Info "Origin: $origin"

# Determine branch
if ([string]::IsNullOrWhiteSpace($Branch)) { $Branch = GetGit @("rev-parse","--abbrev-ref","HEAD") }
if ([string]::IsNullOrWhiteSpace($Branch) -or $Branch -eq "HEAD") { Fail "Could not determine current branch. Pass -Branch main (or your branch)." }
Info "Branch: $Branch"

# Status
RunGit @("status","-sb")

# Pull/rebase optional
if (-not $NoPull) {
  RunGit @("fetch","origin")
  try { RunGit @("rebase","origin/$Branch") }
  catch {
    Warn "Rebase failed; aborting rebase..."
    & git rebase --abort 2>$null | Out-Null
    Fail "Rebase failed. Resolve conflicts manually, then re-run (or use -NoPull)."
  }
} else {
  Warn "Skipping pull/rebase (-NoPull)"
}

# Stage + commit if needed
RunGit @("add","-A")

$porcelain = GetGit @("status","--porcelain")
if (-not [string]::IsNullOrWhiteSpace($porcelain)) {
  if ([string]::IsNullOrWhiteSpace($Message)) { $Message = "Wingman update ($(Get-Date -Format "yyyy-MM-dd HH:mm"))" }
  RunGit @("commit","-m",$Message)
} else {
  Warn "No file changes detected to commit."
}

# Push
if ($ForcePush) {
  Warn "Force push enabled (-ForcePush)."
  RunGit @("push","--force-with-lease","origin",$Branch)
} else {
  RunGit @("push","origin",$Branch)
}

Ok "Done."
RunGit @("status","-sb")
