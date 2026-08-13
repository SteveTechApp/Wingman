param(
    [string]$RepoRoot = (Get-Location).Path
)

$ErrorActionPreference = "Stop"

function Step([string]$Text) {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor DarkCyan
    Write-Host $Text -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor DarkCyan
}

function RelPath([string]$Root, [string]$FullName) {
    $rootPath = [System.IO.Path]::GetFullPath($Root).TrimEnd('\','/')
    $fullPath = [System.IO.Path]::GetFullPath($FullName)
    if ($fullPath.StartsWith($rootPath, [System.StringComparison]::OrdinalIgnoreCase)) {
        return $fullPath.Substring($rootPath.Length).TrimStart('\','/')
    }
    return $fullPath
}

$RepoRoot = (Resolve-Path -LiteralPath $RepoRoot).Path
Set-Location -LiteralPath $RepoRoot

if (-not (Test-Path -LiteralPath (Join-Path $RepoRoot "package.json"))) {
    throw "package.json not found. Run from the Wingman repository or pass -RepoRoot."
}

$stylesDir = Join-Path $RepoRoot "src\wingman2\styles"
$mainPath = Join-Path $RepoRoot "src\main.tsx"
$outDir = Join-Path $RepoRoot "docs\repo-audit"

if (-not (Test-Path -LiteralPath $stylesDir)) {
    throw "src\wingman2\styles was not found."
}
if (-not (Test-Path -LiteralPath $mainPath)) {
    throw "src\main.tsx was not found."
}

New-Item -ItemType Directory -Path $outDir -Force | Out-Null

Step "1. Inventorying active Wingman CSS"

$cssFiles = Get-ChildItem -LiteralPath $stylesDir -File -Filter "*.css" | Sort-Object Name

$summary = foreach ($f in $cssFiles) {
    $reader = New-Object System.IO.StreamReader($f.FullName)
    $lines = 0
    $important = 0
    $media = 0
    $rootBlocks = 0
    $selection = 0
    try {
        while ($null -ne ($line = $reader.ReadLine())) {
            $lines++
            $important += ([regex]::Matches($line, '!important')).Count
            $media += ([regex]::Matches($line, '@media')).Count
            $selection += ([regex]::Matches($line, '::selection')).Count
            if ($line -match '^\s*:root\s*\{') { $rootBlocks++ }
        }
    }
    finally {
        $reader.Dispose()
    }

    [pscustomobject]@{
        File = RelPath $RepoRoot $f.FullName
        KB = [math]::Round($f.Length / 1KB, 2)
        Lines = $lines
        Important = $important
        RootBlocks = $rootBlocks
        MediaBlocks = $media
        SelectionRules = $selection
    }
}

$summary | Export-Csv -LiteralPath (Join-Path $outDir "active-css-summary.csv") -NoTypeInformation -Encoding UTF8

Step "2. Reading CSS import order"

$imports = @()
$mainReader = New-Object System.IO.StreamReader($mainPath)
$lineNo = 0
try {
    while ($null -ne ($line = $mainReader.ReadLine())) {
        $lineNo++
        if ($line -match '^\s*import\s+["''](.+?\.css)["''];?\s*$') {
            $imports += [pscustomobject]@{
                File = "src\main.tsx"
                Line = $lineNo
                Import = $Matches[1]
            }
        }
    }
}
finally {
    $mainReader.Dispose()
}

$imports | Export-Csv -LiteralPath (Join-Path $outDir "active-css-import-order.csv") -NoTypeInformation -Encoding UTF8

Step "3. Finding selector duplication"

$selectorRows = @()

foreach ($f in $cssFiles) {
    $text = [System.IO.File]::ReadAllText($f.FullName)
    $text = [regex]::Replace($text, '(?s)/\*.*?\*/', '')

    $matches = [regex]::Matches($text, '(?ms)(^|[}])\s*([^@{}][^{}]*?)\s*\{')

    foreach ($m in $matches) {
        $selector = $m.Groups[2].Value.Trim()
        $selector = [regex]::Replace($selector, '\s+', ' ')
        if ([string]::IsNullOrWhiteSpace($selector)) { continue }
        if ($selector.Length -gt 500) { continue }

        foreach ($part in ($selector -split ',')) {
            $normalized = [regex]::Replace($part.Trim(), '\s+', ' ')
            if (-not [string]::IsNullOrWhiteSpace($normalized)) {
                $selectorRows += [pscustomobject]@{
                    Selector = $normalized
                    File = RelPath $RepoRoot $f.FullName
                }
            }
        }
    }
}

$selectorGroups = $selectorRows |
    Group-Object Selector |
    Where-Object { $_.Count -gt 1 } |
    ForEach-Object {
        $files = ($_.Group.File | Sort-Object -Unique) -join "; "
        [pscustomobject]@{
            Selector = $_.Name
            Occurrences = $_.Count
            Files = $files
        }
    } |
    Sort-Object Occurrences -Descending

$selectorGroups | Export-Csv -LiteralPath (Join-Path $outDir "duplicate-css-selectors.csv") -NoTypeInformation -Encoding UTF8

Step "4. Finding historical patch and repair markers"

$markerRows = @()

foreach ($f in $cssFiles) {
    $reader = New-Object System.IO.StreamReader($f.FullName)
    $lineNo = 0
    try {
        while ($null -ne ($line = $reader.ReadLine())) {
            $lineNo++
            if (
                $line -match 'WINGMAN.*(PATCH|FIX|REPAIR|OVERRIDE|MIGRATION|HOTFIX|DENSITY|COMPACT|CORRECTION)' -or
                $line -match '(PATCH|HOTFIX|TEMPORARY|LEGACY|DEPRECATED|REPAIR).*WINGMAN'
            ) {
                $markerRows += [pscustomobject]@{
                    File = RelPath $RepoRoot $f.FullName
                    Line = $lineNo
                    Text = $line.Trim()
                }
            }
        }
    }
    finally {
        $reader.Dispose()
    }
}

$markerRows | Export-Csv -LiteralPath (Join-Path $outDir "css-patch-markers.csv") -NoTypeInformation -Encoding UTF8

Step "5. Finding repeated core UI selectors"

$corePatterns = @(
    '^:root$',
    '^body$',
    '^\.wm-page$',
    '^\.wm-section-card$',
    '^\.wm-data-toolbar$',
    '^\.wm-data-quality-summary$',
    '^\.wm-data-table-card$',
    '^\.wm-sidebar$',
    '^\.wingman-sidebar$',
    '^\.wm-page-header$',
    '^\.wm-button$',
    '^\.wm-btn$'
)

$core = @($selectorGroups | Where-Object {
    $s = $_.Selector
    $matched = $false
    foreach ($p in $corePatterns) {
        if ($s -match $p) {
            $matched = $true
            break
        }
    }
    $matched
})

$core | Export-Csv -LiteralPath (Join-Path $outDir "core-selector-conflicts.csv") -NoTypeInformation -Encoding UTF8

Step "6. Writing CSS refactor plan"

$totalKB = [math]::Round((($summary | Measure-Object KB -Sum).Sum), 2)
$totalLines = ($summary | Measure-Object Lines -Sum).Sum
$totalImportant = ($summary | Measure-Object Important -Sum).Sum

$topFilesLines = @()
foreach ($item in ($summary | Sort-Object KB -Descending | Select-Object -First 10)) {
    $topFilesLines += ("- " + $item.File + ": " + $item.Lines + " lines / " + $item.KB + " KB / !important=" + $item.Important)
}
$topFiles = $topFilesLines -join [Environment]::NewLine

$importLines = @()
foreach ($item in $imports) {
    $importLines += ("- line " + $item.Line + ": " + $item.Import)
}
if ($importLines.Count -eq 0) {
    $importLines += "- No CSS imports detected."
}
$importText = $importLines -join [Environment]::NewLine

$coreLines = @()
foreach ($item in $core) {
    $coreLines += ("- " + $item.Selector + " - " + $item.Occurrences + " occurrences - " + $item.Files)
}
if ($coreLines.Count -eq 0) {
    $coreLines += "- No core selector conflicts detected by the simple scanner."
}
$coreText = $coreLines -join [Environment]::NewLine

$dupeLines = @()
foreach ($item in ($selectorGroups | Select-Object -First 25)) {
    $dupeLines += ("- " + $item.Selector + " - " + $item.Occurrences + " occurrences - " + $item.Files)
}
if ($dupeLines.Count -eq 0) {
    $dupeLines += "- No duplicate selectors detected."
}
$dupeText = $dupeLines -join [Environment]::NewLine

$reportLines = @(
    "# Wingman CSS Consolidation Audit",
    "",
    "Generated: " + (Get-Date -Format "yyyy-MM-dd HH:mm:ss"),
    "",
    "## Active CSS footprint",
    "",
    "- Active CSS files: " + $summary.Count,
    "- Combined active CSS size: " + $totalKB + " KB",
    "- Combined active CSS lines: " + $totalLines,
    "- Total !important declarations: " + $totalImportant,
    "- Duplicate selectors detected: " + @($selectorGroups).Count,
    "- Historical patch/fix marker lines detected: " + @($markerRows).Count,
    "",
    "## Largest active CSS files",
    "",
    $topFiles,
    "",
    "## CSS import order from src/main.tsx",
    "",
    $importText,
    "",
    "## Core selector conflicts",
    "",
    $coreText,
    "",
    "## Most repeated selectors",
    "",
    $dupeText,
    "",
    "## Recommended consolidation sequence",
    "",
    "1. Fix core selectors first: root variables, page frame, cards, navigation, buttons and Data Manager shared primitives.",
    "2. Preserve the current import/cascade order while moving canonical rules into one owner file.",
    "3. Remove historical patch/repair blocks only after their behaviour has been absorbed into canonical selectors.",
    "4. Reduce !important usage once competing selectors have been removed.",
    "5. Retire the smaller override CSS files one at a time, validating after each retirement.",
    "6. Keep page-specific CSS only where a component genuinely needs unique layout behaviour.",
    "",
    "## Generated evidence",
    "",
    "- active-css-summary.csv",
    "- active-css-import-order.csv",
    "- duplicate-css-selectors.csv",
    "- css-patch-markers.csv",
    "- core-selector-conflicts.csv",
    "",
    "## Safety",
    "",
    "This pass is read-only. It does not modify application CSS.",
    "The next apply-pass should be based on these conflict lists rather than deleting styles by filename."
)

$reportPath = Join-Path $outDir "wingman-css-refactor-plan.md"
[System.IO.File]::WriteAllText(
    $reportPath,
    ($reportLines -join [Environment]::NewLine),
    (New-Object System.Text.UTF8Encoding($false))
)

Step "7. Complete"

Write-Host "CSS consolidation audit complete." -ForegroundColor Green
Write-Host ""
Write-Host "Main report:"
Write-Host "  $reportPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "No CSS or application files were changed."
