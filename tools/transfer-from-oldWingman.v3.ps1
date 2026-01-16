[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)]
  [string]$OldRoot,

  [Parameter(Mandatory=$true)]
  [string]$NewRoot,

  [string[]]$Features = @("competitor","guru","productLogic","rules"),

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
    Write-Host ("Backup: {0}" -f $bak) -ForegroundColor DarkYellow
    return $bak
  }
  return $null
}

function WriteUtf8NoBom([string]$path, [string]$content) {
  $dir = Split-Path -Parent $path
  if ($dir) { EnsureDir $dir }
  [IO.File]::WriteAllText($path, $content, (New-Object System.Text.UTF8Encoding($false)))
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
  if ($Overwrite) { Backup-Path $dstDir | Out-Null }
  Copy-Item -LiteralPath (Join-Path $srcDir "*") -Destination $dstDir -Recurse -Force
  return @{ ok=$true; reason="folder_copied"; src=$srcDir; dst=$dstDir }
}

function Ensure-TsconfigAlias([string]$tsconfigPath) {
  if (-not (Test-Path -LiteralPath $tsconfigPath)) {
    Write-Host "WARN: tsconfig.json not found; skipping alias patch." -ForegroundColor Yellow
    return "skipped_missing"
  }

  $raw = Get-Content -LiteralPath $tsconfigPath -Raw
  $json = $null
  try {
    $json = $raw | ConvertFrom-Json -ErrorAction Stop
  } catch {
    Write-Host "WARN: tsconfig.json is not valid JSON; skipping alias patch." -ForegroundColor Yellow
    return "skipped_invalid_json"
  }

  # Ensure compilerOptions is a mutable object
  if (-not $json.PSObject.Properties.Name -contains "compilerOptions" -or -not $json.compilerOptions) {
    $json | Add-Member -NotePropertyName "compilerOptions" -NotePropertyValue ([ordered]@{}) -Force
  } elseif ($json.compilerOptions -isnot [psobject]) {
    # If it's something weird, replace it
    $json.compilerOptions = ([ordered]@{})
  }

  # baseUrl
  if (-not $json.compilerOptions.PSObject.Properties.Name -contains "baseUrl") {
    $json.compilerOptions | Add-Member -NotePropertyName "baseUrl" -NotePropertyValue "." -Force
  } else {
    $json.compilerOptions.baseUrl = "."
  }

  # paths
  if (-not $json.compilerOptions.PSObject.Properties.Name -contains "paths" -or -not $json.compilerOptions.paths) {
    $json.compilerOptions | Add-Member -NotePropertyName "paths" -NotePropertyValue ([ordered]@{}) -Force
  } elseif ($json.compilerOptions.paths -isnot [psobject]) {
    $json.compilerOptions.paths = ([ordered]@{})
  }

  # @/* mapping
  if (-not $json.compilerOptions.paths.PSObject.Properties.Name -contains "@/*") {
    $json.compilerOptions.paths | Add-Member -NotePropertyName "@/*" -NotePropertyValue @("./src/*") -Force
  } else {
    $json.compilerOptions.paths."@/*" = @("./src/*")
  }

  $out = $json | ConvertTo-Json -Depth 80
  Backup-Path $tsconfigPath | Out-Null
  WriteUtf8NoBom $tsconfigPath ($out + "`r`n")
  Write-Host "Patched tsconfig.json: ensured baseUrl + @/* paths" -ForegroundColor Green
  return "patched"
}

# Normalize paths
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
Write-Host "competitor: ComparisonPage + guru mappings + competitor catalogs"
Write-Host "guru: components/guru + related contexts/services if present"
Write-Host "productLogic: SKU catalog + mappings"
Write-Host "rules: wizard/requirements/rules helpers (if present)"

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

WriteSection "Ensure @ alias config in NEW (tsconfig.json)"
$tsconfig = Join-Path $NewRoot "tsconfig.json"
$result = Ensure-TsconfigAlias $tsconfig
$log.Add("tsconfig_alias_result: $result")

WriteSection "Transfer selected features"
function AddLog([string]$s) { $log.Add($s) | Out-Null }

# competitor
if ($Features -contains "competitor") {
  WriteSection "Transfer: competitor"
  $candidateFiles = @(
    "src\pages\ComparisonPage.tsx",
    "src\data\competitorSkuCatalog.ts",
    "src\guru\competitorMappings.ts",
    "src\guru\wyrestormSkuCatalog.ts"
  )
  foreach ($rel in $candidateFiles) {
    $r = Copy-ItemSafe (Join-Path $OldRoot $rel) (Join-Path $NewRoot $rel)
    AddLog (($r | ConvertTo-Json -Compress))
  }
  $r = Copy-FolderSafe (Join-Path $OldRoot "src\guru") (Join-Path $NewRoot "src\guru"); AddLog (($r | ConvertTo-Json -Compress))
  $r = Copy-FolderSafe (Join-Path $OldRoot "src\components\guru") (Join-Path $NewRoot "src\components\guru"); AddLog (($r | ConvertTo-Json -Compress))
}

# guru
if ($Features -contains "guru") {
  WriteSection "Transfer: guru"
  $r = Copy-FolderSafe (Join-Path $OldRoot "src\components\guru") (Join-Path $NewRoot "src\components\guru"); AddLog (($r | ConvertTo-Json -Compress))
  $r = Copy-FolderSafe (Join-Path $OldRoot "src\services\guru") (Join-Path $NewRoot "src\services\guru"); AddLog (($r | ConvertTo-Json -Compress))
  $r = Copy-ItemSafe (Join-Path $OldRoot "src\contexts\GuruContext.tsx") (Join-Path $NewRoot "src\contexts\GuruContext.tsx"); AddLog (($r | ConvertTo-Json -Compress))
}

# productLogic
if ($Features -contains "productLogic") {
  WriteSection "Transfer: product logic/catalogs"
  $productFiles = @(
    "src\guru\wyrestormSkuCatalog.ts",
    "src\guru\competitorMappings.ts",
    "src\data\competitorSkuCatalog.ts"
  )
  foreach ($rel in $productFiles) {
    $r = Copy-ItemSafe (Join-Path $OldRoot $rel) (Join-Path $NewRoot $rel)
    AddLog (($r | ConvertTo-Json -Compress))
  }
  $backendCatalog = "backend\data\wyrestormSkuCatalog.json"
  $r = Copy-ItemSafe (Join-Path $OldRoot $backendCatalog) (Join-Path $NewRoot $backendCatalog)
  AddLog (($r | ConvertTo-Json -Compress))
}

# rules
if ($Features -contains "rules") {
  WriteSection "Transfer: rules/wizard (best-effort)"
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
      if ((Get-Item -LiteralPath $src).PSIsContainer) {
        $r = Copy-FolderSafe $src $dst
      } else {
        $r = Copy-ItemSafe $src $dst
      }
      AddLog (($r | ConvertTo-Json -Compress))
    } else {
      AddLog ("MISS_RULE: $rel")
    }
  }
}

WriteSection "Write transfer report"
WriteUtf8NoBom $reportPath (($log -join "`r`n") + "`r`n")
Write-Host ("Report: {0}" -f $reportPath) -ForegroundColor Green

WriteSection "Run typecheck + build in NEW"
Push-Location $NewRoot
try {
  if (-not (Test-Path -LiteralPath (Join-Path $NewRoot "node_modules"))) {
    Write-Host "node_modules missing in NEW: running npm ci" -ForegroundColor Yellow
    npm ci | Out-Host
  }

  Write-Host "npm run typecheck" -ForegroundColor Cyan
  try { npm run typecheck | Out-Host } catch { Write-Host "WARN: typecheck failed" -ForegroundColor Yellow }

  Write-Host "npm run build" -ForegroundColor Cyan
  try { npm run build | Out-Host } catch { Write-Host "WARN: build failed" -ForegroundColor Yellow }

} finally {
  Pop-Location
}

WriteSection "Done"
Write-Host "Next: paste the first build/typecheck error; we’ll pull missing deps from OLDwingman in batches." -ForegroundColor Green
