[CmdletBinding()]
param(
  [string]$RepoRoot = (Get-Location).Path,
  [int]$ViteSmokeSeconds = 6,
  [string]$ViteUrl = "http://localhost:3000/",
  [switch]$AlsoRunBuild = $false
)

$ErrorActionPreference = "Stop"

function WriteSection([string]$t) { Write-Host ""; Write-Host ("== {0} ==" -f $t) -ForegroundColor Cyan }
function Fail([string]$m) { Write-Host ("FAIL: {0}" -f $m) -ForegroundColor Red; exit 1 }
function Warn([string]$m) { Write-Host ("WARN: {0}" -f $m) -ForegroundColor Yellow }
function Ok([string]$m) { Write-Host ("OK: {0}" -f $m) -ForegroundColor Green }
function Exists([string]$p) { Test-Path -LiteralPath $p }
function EnsureDir([string]$p) { if (-not (Test-Path -LiteralPath $p)) { New-Item -ItemType Directory -Force -Path $p | Out-Null } }

try { $RepoRoot = (Get-Item -LiteralPath $RepoRoot).FullName } catch { Fail "RepoRoot not found: $RepoRoot" }
function RPath([string]$rel) { Join-Path $RepoRoot $rel }

WriteSection "Repo root"
Ok $RepoRoot
Set-Location $RepoRoot

WriteSection "Tooling checks"
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Fail "git not found" }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Fail "node not found" }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { Fail "npm not found" }
Ok ("node: " + (node -v))
Ok ("npm:  " + (npm -v))
Ok ("git:  " + (git --version))

WriteSection "PostCSS + Tailwind v4 checks"
$postcss = RPath "postcss.config.cjs"
if (-not (Exists $postcss)) { Fail "postcss.config.cjs missing at repo root." }
$postcssTxt = Get-Content -LiteralPath $postcss -Raw
if ($postcssTxt -notmatch "@tailwindcss/postcss") { Fail "postcss.config.cjs does not reference @tailwindcss/postcss" }
Ok "postcss.config.cjs references @tailwindcss/postcss"

$tailwindPostcssPkg = RPath "node_modules\@tailwindcss\postcss\package.json"
if (-not (Exists $tailwindPostcssPkg)) { Fail "@tailwindcss/postcss not installed (missing node_modules/@tailwindcss/postcss)." }
Ok "@tailwindcss/postcss installed"

WriteSection "Vite smoke test (no stdout blocking; log redirected)"
if (-not (Exists (RPath "node_modules"))) {
  Warn "node_modules missing — running npm ci"
  npm ci | Out-Host
}

$logDir = RPath "tools"
EnsureDir $logDir
$logPath = Join-Path $logDir ("_vite_smoke_" + (Get-Date -Format "yyyyMMdd_HHmmss") + ".log")

# Run via cmd.exe and redirect output to file so PowerShell never blocks on streams
$cmd = $env:ComSpec  # usually C:\Windows\System32\cmd.exe
if (-not $cmd) { $cmd = "cmd.exe" }

# Quote paths carefully
$cmdArgs = "/c cd /d `"$RepoRoot`" && npm run dev -- --host > `"$logPath`" 2>&1"

$p = Start-Process -FilePath $cmd -ArgumentList $cmdArgs -PassThru -WindowStyle Hidden

# Probe the dev server for up to ViteSmokeSeconds
$ok = $false
$deadline = (Get-Date).AddSeconds($ViteSmokeSeconds)

while ((Get-Date) -lt $deadline) {
  try {
    $resp = Invoke-WebRequest -Uri $ViteUrl -UseBasicParsing -TimeoutSec 2
    if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 500) { $ok = $true; break }
  } catch {
    Start-Sleep -Milliseconds 400
  }
}

# Stop vite (kill tree)
try {
  Start-Process -FilePath $cmd -ArgumentList "/c taskkill /PID $($p.Id) /T /F >nul 2>&1" -WindowStyle Hidden | Out-Null
} catch {}

if (-not (Test-Path -LiteralPath $logPath)) {
  Warn "Smoke log was not created (unexpected)."
} else {
  $logText = Get-Content -LiteralPath $logPath -Raw -ErrorAction SilentlyContinue
  if ($logText -match "\[postcss\]" -or $logText -match "Internal server error" -or $logText -match "Failed to resolve import") {
    Fail ("Vite output contains fatal errors. See log: $logPath")
  }
}

if (-not $ok) {
  Fail ("Vite did not respond on $ViteUrl within ${ViteSmokeSeconds}s. See log: $logPath")
}

Ok ("Vite responded on $ViteUrl and no fatal PostCSS/import errors detected. Log: $logPath")

if ($AlsoRunBuild) {
  WriteSection "npm run build (strong check)"
  try { npm run build | Out-Host; Ok "Build succeeded." }
  catch { Fail "Build failed." }
}

WriteSection "Git status"
git status | Out-Host

WriteSection "All checks passed"
Ok "Stabilisation claims verified."
