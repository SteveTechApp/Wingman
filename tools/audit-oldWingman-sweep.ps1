[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)]
  [string]$RepoRoot,

  # If set, deletes noise folders/files. Otherwise it only reports.
  [switch]$DeleteNoise = $false
)

$ErrorActionPreference = "Stop"

function WriteSection([string]$t) { Write-Host ""; Write-Host ("== {0} ==" -f $t) -ForegroundColor Cyan }
function Exists([string]$p) { Test-Path -LiteralPath $p }
function RPath([string]$rel) { Join-Path $RepoRoot $rel }
function TryRead([string]$p) { if (Exists $p) { Get-Content -LiteralPath $p -Raw -ErrorAction SilentlyContinue } else { "" } }

function RemoveIfExists([string]$p) {
  if (Exists $p) {
    Remove-Item -LiteralPath $p -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host ("Removed: {0}" -f $p) -ForegroundColor Yellow
  }
}

WriteSection "Repo"
if (-not (Exists $RepoRoot)) { throw "RepoRoot not found: $RepoRoot" }
Write-Host ("RepoRoot: {0}" -f $RepoRoot)

# -------------------------
# 1) Noise sweep
# -------------------------
WriteSection "Noise scan (folders)"
$noiseFolders = @(
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".vite",
  ".cache",
  "test-results",
  "playwright-report",
  ".playwright",
  "_ARCHIVE",
  "backups"
)

$foundNoiseFolders = @()
foreach ($f in $noiseFolders) {
  $p = RPath $f
  if (Exists $p) { $foundNoiseFolders += $p }
}

if ($foundNoiseFolders.Count -eq 0) {
  Write-Host "No noise folders found."
} else {
  $foundNoiseFolders | ForEach-Object { Write-Host ("FOUND: {0}" -f $_) -ForegroundColor Yellow }
  if ($DeleteNoise) {
    WriteHost ""
    Write-Host "Deleting noise folders..." -ForegroundColor Yellow
    $foundNoiseFolders | ForEach-Object { RemoveIfExists $_ }
  }
}

WriteSection "Noise scan (backup files *.bak_* and *.bak)"
$bak = Get-ChildItem -LiteralPath $RepoRoot -Recurse -Force -File -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -match '\.bak(_\d{8}_\d{6})?$' }

if (-not $bak -or $bak.Count -eq 0) {
  Write-Host "No .bak artifacts found."
} else {
  $bak | Select-Object -First 50 | ForEach-Object { Write-Host ("FOUND: {0}" -f $_.FullName) -ForegroundColor Yellow }
  if ($bak.Count -gt 50) { Write-Host ("(showing first 50 of {0})" -f $bak.Count) }
  if ($DeleteNoise) {
    Write-Host "Deleting .bak artifacts..." -ForegroundColor Yellow
    $bak | ForEach-Object { Remove-Item -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue }
  }
}

# -------------------------
# 2) Alias config check
# -------------------------
WriteSection "Alias check (@/)"
$tsconfig = RPath "tsconfig.json"
$viteCfgTs = RPath "vite.config.ts"
$viteCfgJs = RPath "vite.config.js"
$viteCfgMjs = RPath "vite.config.mjs"

$ts = TryRead $tsconfig
$vite = ""
if (Exists $viteCfgTs) { $vite = TryRead $viteCfgTs }
elseif (Exists $viteCfgMjs) { $vite = TryRead $viteCfgMjs }
elseif (Exists $viteCfgJs) { $vite = TryRead $viteCfgJs }

$tsHasPaths = ($ts -match '"paths"\s*:\s*\{') -and ($ts -match '"@/\*"\s*:\s*\[\s*"\.\/src/\*"\s*\]')
$viteHasAliasAt = ($vite -match "alias\s*:\s*\[") -and ($vite -match "find\s*:\s*['""]@['""]")
$viteHasAliasAt2 = ($vite -match "alias\s*:\s*\{") -and ($vite -match "['""]@['""]\s*:\s*")

Write-Host ("tsconfig.json present: {0}" -f (Exists $tsconfig))
Write-Host ("vite config present:   {0}" -f ([bool]$vite))

if ($tsHasPaths) { Write-Host "OK: tsconfig has @/* -> ./src/*" -ForegroundColor Green }
else { Write-Host "WARN: tsconfig does NOT clearly define @/* -> ./src/*" -ForegroundColor Yellow }

if ($viteHasAliasAt -or $viteHasAliasAt2) { Write-Host "OK: vite config has alias for @" -ForegroundColor Green }
else { Write-Host "WARN: vite config does NOT clearly define alias for @" -ForegroundColor Yellow }

# -------------------------
# 3) AppProviders context imports exist?
# -------------------------
WriteSection "AppProviders dependencies"
$appProviders = RPath "src\AppProviders.tsx"
if (-not (Exists $appProviders)) {
  Write-Host "WARN: src/AppProviders.tsx not found." -ForegroundColor Yellow
} else {
  $ap = TryRead $appProviders
  $imports = @()
  $ap -split "`n" | ForEach-Object {
    if ($_ -match "^\s*import\s+.+\s+from\s+['""](.+)['""];") { $imports += $Matches[1] }
  }

  Write-Host ("Found {0} imports in AppProviders.tsx" -f $imports.Count)

  # Focus only on "@/contexts/..."
  $ctxImports = $imports | Where-Object { $_ -like "@/contexts/*" }
  if ($ctxImports.Count -eq 0) {
    Write-Host "No '@/contexts/*' imports found in AppProviders.tsx (nothing to validate there)."
  } else {
    foreach ($imp in $ctxImports) {
      # Map "@/x/y" to "src/x/y(.ts|.tsx)"
      $rel = $imp.Substring(2).Replace("/", "\")  # remove "@/"; -> "contexts\UserContext"
      $cand1 = RPath ("src\" + $rel + ".ts")
      $cand2 = RPath ("src\" + $rel + ".tsx")
      $ok = (Exists $cand1) -or (Exists $cand2)

      if ($ok) {
        Write-Host ("OK: {0}" -f $imp) -ForegroundColor Green
      } else {
        Write-Host ("MISSING: {0} (expected {1} or {2})" -f $imp, ("src\" + $rel + ".ts"), ("src\" + $rel + ".tsx")) -ForegroundColor Yellow
      }
    }
  }
}

# -------------------------
# 4) AppShell exists?
# -------------------------
WriteSection "AppShell check"
# allow AppShell.tsx or AppShell/index.tsx or AppShell.ts
$appShell1 = RPath "src\components\layout\AppShell.tsx"
$appShell2 = RPath "src\components\layout\AppShell\index.tsx"
$appShell3 = RPath "src\components\layout\AppShell.ts"

if (Exists $appShell1 -or Exists $appShell2 -or Exists $appShell3) {
  Write-Host "OK: AppShell exists." -ForegroundColor Green
  if (Exists $appShell1) { Write-Host (" - {0}" -f $appShell1) }
  if (Exists $appShell2) { Write-Host (" - {0}" -f $appShell2) }
  if (Exists $appShell3) { Write-Host (" - {0}" -f $appShell3) }
} else {
  Write-Host "WARN: AppShell not found at expected paths:" -ForegroundColor Yellow
  Write-Host " - src/components/layout/AppShell.tsx"
  Write-Host " - src/components/layout/AppShell/index.tsx"
  Write-Host " - src/components/layout/AppShell.ts"
}

# -------------------------
# 5) One-off scripts outside tools/
# -------------------------
WriteSection "One-off scripts outside tools/"
$scriptExt = @(".ps1",".sh",".bat",".cmd")
$scripts = Get-ChildItem -LiteralPath $RepoRoot -Recurse -Force -File -ErrorAction SilentlyContinue |
  Where-Object { $scriptExt -contains $_.Extension.ToLowerInvariant() }

$outsideTools = $scripts | Where-Object {
  $full = $_.FullName.ToLowerInvariant()
  -not $full.Contains(("\tools\"))
}

if (-not $outsideTools -or $outsideTools.Count -eq 0) {
  Write-Host "No scripts found outside tools/."
} else {
  Write-Host ("Found {0} scripts outside tools/ (review these):" -f $outsideTools.Count) -ForegroundColor Yellow
  $outsideTools | Select-Object -First 50 | ForEach-Object { Write-Host (" - {0}" -f $_.FullName) -ForegroundColor Yellow }
  if ($outsideTools.Count -gt 50) { Write-Host ("(showing first 50 of {0})" -f $outsideTools.Count) }
}

WriteSection "Audit complete"
Write-Host "If alias/context/AppShell checks show WARN/MISSING, that’s what will break the 'clean recovery' build first."
