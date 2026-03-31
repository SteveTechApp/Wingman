Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = "C:\Users\steve\wingman"
$reportDir = Join-Path $root "_AUDITS"
if (-not (Test-Path $reportDir)) {
  New-Item -ItemType Directory -Force -Path $reportDir | Out-Null
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$reportPath = Join-Path $reportDir "style-pipeline-audit-$stamp.txt"

$lines = New-Object System.Collections.Generic.List[string]

function Add-Line {
  param([string]$Text)
  $lines.Add($Text) | Out-Null
}

Add-Line "Wingman Style Pipeline Audit"
Add-Line "Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Add-Line ""

# ------------------------------------------------------------
# 1. main.tsx style imports
# ------------------------------------------------------------
Add-Line "=== 1. main.tsx style imports ==="
$mainPath = Join-Path $root "src\main.tsx"
if (Test-Path $mainPath) {
  $main = Get-Content $mainPath
  $imports = $main | Select-String -Pattern 'import .*styles/|import .*\.css'
  if ($imports) {
    foreach ($item in $imports) {
      Add-Line $item.Line
    }
  } else {
    Add-Line "No style imports found in src\main.tsx"
  }
} else {
  Add-Line "src\main.tsx not found"
}
Add-Line ""

# ------------------------------------------------------------
# 2. CSS files present
# ------------------------------------------------------------
Add-Line "=== 2. CSS files present in src\styles ==="
$stylesPath = Join-Path $root "src\styles"
if (Test-Path $stylesPath) {
  Get-ChildItem $stylesPath -File | Sort-Object Name | ForEach-Object {
    Add-Line $_.Name
  }
} else {
  Add-Line "src\styles folder not found"
}
Add-Line ""

# ------------------------------------------------------------
# 3. Components with inline styles
# ------------------------------------------------------------
Add-Line "=== 3. Components with inline style usage ==="
$tsxFiles = Get-ChildItem (Join-Path $root "src") -Recurse -Include *.tsx -File
$inlineStyleHits = Select-String -Path $tsxFiles.FullName -Pattern 'style=\{\{' | Sort-Object Path, LineNumber
if ($inlineStyleHits) {
  foreach ($hit in $inlineStyleHits) {
    Add-Line "$($hit.Path):$($hit.LineNumber): $($hit.Line.Trim())"
  }
} else {
  Add-Line "No inline style usage found"
}
Add-Line ""

# ------------------------------------------------------------
# 4. Core shell files
# ------------------------------------------------------------
Add-Line "=== 4. Core shell files ==="
$coreFiles = @(
  "src\app\shell\AppShell.tsx",
  "src\app\navigation\TopBar.tsx",
  "src\ui2\nav\MissionControlNav.tsx",
  "src\features\dashboard\DashboardPage.tsx",
  "src\features\discovery\DiscoveryWizardPage.tsx",
  "src\features\proposal\ProposalPage.tsx",
  "src\features\misc\videoWall\VideoWallPlannerRebuild.tsx"
)

foreach ($rel in $coreFiles) {
  $full = Join-Path $root $rel
  Add-Line "--- $rel ---"
  if (Test-Path $full) {
    $inlineCount = (Select-String -Path $full -Pattern 'style=\{\{' | Measure-Object).Count
    $classCount = (Select-String -Path $full -Pattern 'className=' | Measure-Object).Count
    Add-Line "inline style count: $inlineCount"
    Add-Line "className count: $classCount"
  } else {
    Add-Line "missing"
  }
  Add-Line ""
}

# ------------------------------------------------------------
# 5. CSS imports across src
# ------------------------------------------------------------
Add-Line "=== 5. CSS import references across src ==="
$srcFiles = Get-ChildItem (Join-Path $root "src") -Recurse -Include *.ts,*.tsx -File
$cssRefs = Select-String -Path $srcFiles.FullName -Pattern 'import .*\.css'
if ($cssRefs) {
  foreach ($hit in ($cssRefs | Sort-Object Path, LineNumber)) {
    Add-Line "$($hit.Path):$($hit.LineNumber): $($hit.Line.Trim())"
  }
} else {
  Add-Line "No CSS imports found across src"
}
Add-Line ""

# ------------------------------------------------------------
# 6. Likely legacy style files still referenced
# ------------------------------------------------------------
Add-Line "=== 6. Likely legacy style files still referenced ==="
$legacyPatterns = @(
  "wingman-global.css",
  "wm-consistency-pass.css",
  "wm-enterprise-pass.css",
  "wm-shell-modern.css",
  "wm-shell-normalize.css",
  "wm-dashboard-layout.css",
  "wm-design-system.css",
  "wm-polish-pass.css",
  "wm-shell-polish-pass.css",
  "wm-guru-pass.css"
)

foreach ($pattern in $legacyPatterns) {
  $hits = Select-String -Path $srcFiles.FullName -Pattern ([regex]::Escape($pattern))
  if ($hits) {
    Add-Line "$pattern referenced in:"
    foreach ($hit in $hits) {
      Add-Line "  $($hit.Path):$($hit.LineNumber)"
    }
  }
}
Add-Line ""

[System.IO.File]::WriteAllLines($reportPath, $lines, (New-Object System.Text.UTF8Encoding($false)))

Write-Host ""
Write-Host "Audit complete:"
Write-Host $reportPath
Write-Host ""
Write-Host "Open it with:"
Write-Host "notepad `"$reportPath`""