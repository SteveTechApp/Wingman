[CmdletBinding()]
param(
  # Example: C:\Users\steve\OLDwingman
  [Parameter(Mandatory=$true)]
  [string]$OldRoot,

  # Example: C:\Users\steve\wingman
  [Parameter(Mandatory=$true)]
  [string]$NewRoot,

  # What to bring across (default = all key items)
  [string[]]$Features = @("competitor","guru","productLogic","rules"),

  # If set, will overwrite destination files (with backups). If not, only copies missing files.
  [switch]$Overwrite = $true
)

$ErrorActionPreference = "Stop"

function WriteSection([string]$t) { Write-Host ""; Write-Host ("== {0} ==" -f $t) -ForegroundColor Cyan }
function EnsureDir([string]$p) { if (-not (Test-Path -LiteralPath $p)) { New-Item -ItemType Directory -Force -Path $p | Out-Null } }
function Stamp() { Get-Date -Format "yyyyMMdd_HHmmss" }

function Backup-Path([string]$dstPath) {
  if (Test-Path -LiteralPath $dstPath) {
    $bak = $dstPath + ".bak_" + (Stamp)
    Copy-Item -LiteralPath $dstPath -Destination $bak -Recurse -Force
    return $bak
  }
  return $null
}

function Copy-ItemSafe([string]$src, [string]$dst) {
  if (-not (Test-Path -LiteralPath $src)) { return @{ ok=$false; reason="missing"; src=$src; dst=$dst } }

  $dstDir = Split-Path -Parent $dst
  if ($dstDir) { EnsureDir $dstDir }

  if ((Test-Path -LiteralPath $dst) -and (-not $Overwrite)) {
    return @{ ok=$true; reason="exists_skip"; src=$src; dst=$dst }
  }

  $bak = Backup-Path $dst
  Copy-Item -LiteralPath $src -Destination $dst -Recurse -Force
  return @{ ok=$true; reason=($(if($bak){"overwrote_backup"}else{"copied"})); backup=$bak; src=$src; dst=$dst }
}

function Copy-FolderSafe([string]$srcDir, [string]$dstDir) {
  if (-not (Test-Path -LiteralPath $srcDir)) { return @{ ok=$false; reason="missing"; src=$srcDir; dst=$dstDir } }
  EnsureDir $dstDir

  # mirror-style copy but keep it simple with Copy-Item
  if ((Test-Path -LiteralPath $dstDir) -and $Overwrite) {
    # backup dest folder (lightweight: only if it contains anything)
    $has = Get-ChildItem -LiteralPath $dstDir -Force -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($has) { Backup-Path $dstDir | Out-Null }
  }

  Copy-Item -LiteralPath (Join-Path $srcDir "*") -Destination $dstDir -Recurse -Force
  return @{ ok=$true; reason="folder_copied"; src=$srcDir; dst=$dstDir }
}

function TryRead([string]$p) { if (Test-Path -LiteralPath $p) { Get-Content -LiteralPath $p -Raw } else { "" } }
function WriteUtf8NoBom([string]$path, [string]$content) {
  $dir = Split-Path -Parent $path
  if ($dir) { EnsureDir $dir }
  [IO.File]::WriteAllText($path, $content, (New-Object System.Text.UTF8Encoding($false)))
}

# Normalise paths
$OldRoot = (Get-Item -LiteralPath $OldRoot).FullName
$NewRoot = (Get-Item -LiteralPath $NewRoot).FullName

$reportDir = Join-Path $NewRoot "tools\transfer_reports"
EnsureDir $reportDir
$reportPath = Join-Path $reportDir ("transfer_" + (Stamp) + ".txt")

$log = New-Object System.Collections.Generic.List[string]
$log.Add("Transfer report: " + (Get-Date).ToString("s"))
$log.Add("OldRoot: $OldRoot")
$log.Add("NewRoot: $NewRoot")
$log.Add("Features: " + ($Features -join ", "))
$log.Add("Overwrite: " + $Overwrite)
$log.Add("")

WriteSection "Plan (what will be transferred)"
Write-Host "competitor: pages/components/guru mappings + competitor catalogs"
Write-Host "guru: guru UI + contexts/services used by Guru Ask"
Write-Host "productLogic: WyreStorm SKU catalog + matching logic"
Write-Host "rules: wizard/requirements/rules helpers (if present)"

# -------------------------
# 0) Sweep (quick inventory)
# -------------------------
WriteSection "Sweep OLDWingman (inventory)"
$sweepTargets = @(
  "src\pages\ComparisonPage.tsx",
  "src\pages\CompetitorMatchPage.tsx",
  "src\pages\CompetitorComparePage.tsx",
  "src\guru",
  "src\data\competitorSkuCatalog.ts",
  "src\guru\competitorMappings.ts",
  "src\guru\wyrestormSkuCatalog.ts",
  "src\components\guru",
  "src\components\competitor",
  "src\services\guru",
  "src\contexts\GuruContext.tsx"
)

foreach ($rel in $sweepTargets) {
  $p = Join-Path $OldRoot $rel
  if (Test-Path -LiteralPath $p) {
    Write-Host ("FOUND: {0}" -f $rel) -ForegroundColor Green
    $log.Add("FOUND: $rel")
  } else {
    Write-Host ("MISS:  {0}" -f $rel) -ForegroundColor DarkYellow
    $log.Add("MISS:  $rel")
  }
}

# -------------------------
# 1) Ensure alias config in NEW (so @/ imports work)
# -------------------------
WriteSection "Ensure @ alias config in NEW"
$tsconfig = Join-Path $NewRoot "tsconfig.json"
$viteCfg  = Join-Path $NewRoot "vite.config.ts"

$ts = TryRead $tsconfig
if ($ts -and ($ts -notmatch '"paths"\s*:\s*\{[\s\S]*"@/\*"\s*:\s*\[\s*"\.\/src/\*"\s*\]')) {
  # Patch tsconfig minimally (best-effort, not a full JSON parser)
  $bak = Backup-Path $tsconfig
  $log.Add("tsconfig backup: $bak")

  if ($ts -match '"compilerOptions"\s*:\s*\{') {
    # Add baseUrl+paths if missing
    if ($ts -notmatch '"baseUrl"\s*:') {
      $ts = $ts -replace '"compilerOptions"\s*:\s*\{', '"compilerOptions": {' + "`r`n    `"baseUrl`": `"`.`","
    }
    if ($ts -notmatch '"paths"\s*:') {
      $ts = $ts -replace '"compilerOptions"\s*:\s*\{', '"compilerOptions": {' + "`r`n    `"paths`": { `"@/*`": [`"./src/*`"] },"
    } else {
      # If paths exists but no @/* mapping, we do a conservative inject near "paths": {
      if ($ts -match '"paths"\s*:\s*\{') {
        $ts = [Text.RegularExpressions.Regex]::Replace(
          $ts,
          '"paths"\s*:\s*\{',
          '"paths": {' + "`r`n      `"@/*`": [`"./src/*`"],",
          1
        )
      }
    }
  }

  WriteUtf8NoBom $tsconfig $ts
  Write-Host "Patched tsconfig.json for @/* path mapping." -ForegroundColor Yellow
  $log.Add("Patched tsconfig.json: added/ensured @/* -> ./src/*")
} else {
  Write-Host "tsconfig.json already looks OK (or missing; skipped)." -ForegroundColor Green
  $log.Add("tsconfig: OK or skipped")
}

# (Vite alias check is project-specific; we only warn here)
if (-not (Test-Path -LiteralPath $viteCfg)) {
  Write-Host "WARN: vite.config.ts not found in NEW (alias may be missing)." -ForegroundColor Yellow
  $log.Add("WARN: vite.config.ts missing in NEW")
} else {
  $v = TryRead $viteCfg
  if ($v -notmatch "alias" -or $v -notmatch "['""]@['""]") {
    Write-Host "WARN: vite.config.ts may not define alias '@' (imports like @/ may fail)." -ForegroundColor Yellow
    $log.Add("WARN: vite alias '@' not detected (manual check recommended)")
  } else {
    Write-Host "OK: vite alias '@' appears present." -ForegroundColor Green
    $log.Add("vite alias '@' detected")
  }
}

# -------------------------
# 2) Transfer feature clusters
# -------------------------
WriteSection "Transfer selected features"
$actions = New-Object System.Collections.Generic.List[object]

function AddAction($o) { $actions.Add($o) | Out-Null; $log.Add(($o | ConvertTo-Json -Compress)) }

# competitor
if ($Features -contains "competitor") {
  WriteSection "Transfer: competitor feature"
  $candidatePages = @(
    "src\pages\ComparisonPage.tsx",
    "src\pages\CompetitorMatchPage.tsx",
    "src\pages\CompetitorComparePage.tsx",
    "src\data\competitorSkuCatalog.ts"
  )
  foreach ($rel in $candidatePages) {
    $src = Join-Path $OldRoot $rel
    $dst = Join-Path $NewRoot $rel
    AddAction (Copy-ItemSafe $src $dst)
  }

  # often used by competitor pages
  AddAction (Copy-FolderSafe (Join-Path $OldRoot "src\components\competitor") (Join-Path $NewRoot "src\components\competitor"))
  AddAction (Copy-FolderSafe (Join-Path $OldRoot "src\guru") (Join-Path $NewRoot "src\guru"))
}

# guru
if ($Features -contains "guru") {
  WriteSection "Transfer: guru feature"
  AddAction (Copy-FolderSafe (Join-Path $OldRoot "src\components\guru") (Join-Path $NewRoot "src\components\guru"))
  AddAction (Copy-FolderSafe (Join-Path $OldRoot "src\services\guru") (Join-Path $NewRoot "src\services\guru"))
  AddAction (Copy-ItemSafe (Join-Path $OldRoot "src\contexts\GuruContext.tsx") (Join-Path $NewRoot "src\contexts\GuruContext.tsx"))
}

# productLogic (SKU catalogs/mappings)
if ($Features -contains "productLogic") {
  WriteSection "Transfer: updated product logic/catalogs"
  $productFiles = @(
    "src\guru\wyrestormSkuCatalog.ts",
    "src\guru\competitorMappings.ts",
    "src\data\competitorSkuCatalog.ts"
  )
  foreach ($rel in $productFiles) {
    AddAction (Copy-ItemSafe (Join-Path $OldRoot $rel) (Join-Path $NewRoot $rel))
  }

  # backend catalog (if you use it)
  $backendCatalog = "backend\data\wyrestormSkuCatalog.json"
  AddAction (Copy-ItemSafe (Join-Path $OldRoot $backendCatalog) (Join-Path $NewRoot $backendCatalog))
}

# rules (wizard requirements + derive logic etc.)
if ($Features -contains "rules") {
  WriteSection "Transfer: rules/wizard logic (best-effort)"
  $ruleCandidates = @(
    "src\wizard",
    "src\wizard\deriveRoomRequirements.ts",
    "src\utils\rules.ts",
    "src\utils\validation.ts",
    "src\services\rules"
  )

  foreach ($rel in $ruleCandidates) {
    $src = Join-Path $OldRoot $rel
    $dst = Join-Path $NewRoot $rel
    if (Test-Path -LiteralPath $src) {
      if ((Get-Item -LiteralPath $src).PSIsContainer) { AddAction (Copy-FolderSafe $src $dst) }
      else { AddAction (Copy-ItemSafe $src $dst) }
    } else {
      $log.Add("MISS_RULE: $rel")
    }
  }
}

# -------------------------
# 3) Write report + run checks
# -------------------------
WriteSection "Write transfer report"
$logText = ($log -join "`r`n")
WriteUtf8NoBom $reportPath $logText
Write-Host ("Report: {0}" -f $reportPath) -ForegroundColor Green

WriteSection "Run typecheck + build in NEW"
Push-Location $NewRoot
try {
  if (-not (Test-Path -LiteralPath (Join-Path $NewRoot "node_modules"))) {
    Write-Host "node_modules missing in NEW: running npm ci" -ForegroundColor Yellow
    npm ci | Out-Host
  }

  Write-Host "npm run typecheck" -ForegroundColor Cyan
  try { npm run typecheck | Out-Host } catch { Write-Host "WARN: typecheck failed (see console output)" -ForegroundColor Yellow }

  Write-Host "npm run build" -ForegroundColor Cyan
  try { npm run build | Out-Host } catch { Write-Host "WARN: build failed (see console output)" -ForegroundColor Yellow }

} finally {
  Pop-Location
}

WriteSection "Done"
Write-Host "Next: address any missing imports reported by typecheck/build, then commit." -ForegroundColor Green
