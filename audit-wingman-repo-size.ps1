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
    return [System.IO.Path]::GetRelativePath($Root, $FullName)
}

$RepoRoot = (Resolve-Path -LiteralPath $RepoRoot).Path
Set-Location -LiteralPath $RepoRoot

if (-not (Test-Path -LiteralPath (Join-Path $RepoRoot "package.json"))) {
    throw "package.json not found. Run this from the Wingman repository or pass -RepoRoot."
}

$outDir = Join-Path $RepoRoot "docs\repo-audit"
New-Item -ItemType Directory -Path $outDir -Force | Out-Null

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$ignoredDirNames = @(
    "node_modules", ".git", "dist", "build", "coverage", ".vite", ".turbo",
    ".cache", "tmp", "temp"
)

function Is-Ignored([System.IO.FileInfo]$File) {
    $parts = (RelPath $RepoRoot $File.FullName) -split '[\\/]'
    foreach ($part in $parts) {
        if ($ignoredDirNames -contains $part) { return $true }
    }
    return $false
}

Step "1. Inventorying repository"

$files = Get-ChildItem -LiteralPath $RepoRoot -Recurse -File -Force |
    Where-Object { -not (Is-Ignored $_) }

$inventory = foreach ($f in $files) {
    $rel = RelPath $RepoRoot $f.FullName
    $top = ($rel -split '[\\/]')[0]
    $ext = if ($f.Extension) { $f.Extension.ToLowerInvariant() } else { "(none)" }
    [pscustomobject]@{
        Path = $rel
        TopFolder = $top
        Extension = $ext
        Bytes = $f.Length
        KB = [math]::Round($f.Length / 1KB, 2)
    }
}

$inventory | Export-Csv -LiteralPath (Join-Path $outDir "all-files.csv") -NoTypeInformation -Encoding utf8

$folderStats = $inventory |
    Group-Object TopFolder |
    ForEach-Object {
        [pscustomobject]@{
            Folder = $_.Name
            Files = $_.Count
            MB = [math]::Round((($_.Group | Measure-Object Bytes -Sum).Sum / 1MB), 2)
        }
    } |
    Sort-Object MB -Descending

$folderStats | Export-Csv -LiteralPath (Join-Path $outDir "folder-sizes.csv") -NoTypeInformation -Encoding utf8

$extStats = $inventory |
    Group-Object Extension |
    ForEach-Object {
        [pscustomobject]@{
            Extension = $_.Name
            Files = $_.Count
            MB = [math]::Round((($_.Group | Measure-Object Bytes -Sum).Sum / 1MB), 2)
        }
    } |
    Sort-Object MB -Descending

$extStats | Export-Csv -LiteralPath (Join-Path $outDir "extension-sizes.csv") -NoTypeInformation -Encoding utf8

$largest = $inventory | Sort-Object Bytes -Descending | Select-Object -First 75
$largest | Export-Csv -LiteralPath (Join-Path $outDir "largest-files.csv") -NoTypeInformation -Encoding utf8

Step "2. Finding likely stale / backup / generated clutter"

$junkPatterns = @(
    '\.bak$','\.old$','\.orig$','\.tmp$','\.temp$','\.rej$','\.patch$',
    '\.backup$','~$','\.save$','\.copy$'
)

$junk = $inventory | Where-Object {
    $p = $_.Path.ToLowerInvariant()
    ($junkPatterns | Where-Object { $p -match $_ }).Count -gt 0 -or
    $p -match '(^|[\\/])(archive|archives|backup|backups|deprecated|legacy|obsolete)([\\/]|$)'
}

$junk | Sort-Object Bytes -Descending |
    Export-Csv -LiteralPath (Join-Path $outDir "stale-candidates.csv") -NoTypeInformation -Encoding utf8

Step "3. Hashing duplicate files"

$hashable = $files | Where-Object {
    $_.Length -gt 0 -and $_.Length -lt 25MB
}

$hashed = foreach ($f in $hashable) {
    try {
        $hash = (Get-FileHash -LiteralPath $f.FullName -Algorithm SHA256).Hash
        [pscustomobject]@{
            Hash = $hash
            Bytes = $f.Length
            Path = RelPath $RepoRoot $f.FullName
        }
    } catch {}
}

$duplicates = $hashed |
    Group-Object Hash |
    Where-Object { $_.Count -gt 1 } |
    ForEach-Object {
        $group = $_.Group
        foreach ($item in $group) {
            [pscustomobject]@{
                Hash = $_.Name
                Copies = $group.Count
                BytesEach = $item.Bytes
                Path = $item.Path
            }
        }
    } |
    Sort-Object Hash, Path

$duplicates | Export-Csv -LiteralPath (Join-Path $outDir "duplicate-files.csv") -NoTypeInformation -Encoding utf8

Step "4. Auditing source and CSS footprint"

$sourceExts = @(".ts",".tsx",".js",".jsx",".mjs",".cjs",".css",".scss",".json")
$sourceFiles = $files | Where-Object { $sourceExts -contains $_.Extension.ToLowerInvariant() }

$loc = foreach ($f in $sourceFiles) {
    try {
        $lines = (Get-Content -LiteralPath $f.FullName | Measure-Object -Line).Lines
        [pscustomobject]@{
            Path = RelPath $RepoRoot $f.FullName
            Extension = $f.Extension.ToLowerInvariant()
            Lines = $lines
            KB = [math]::Round($f.Length / 1KB, 2)
        }
    } catch {}
}

$loc | Sort-Object Lines -Descending |
    Export-Csv -LiteralPath (Join-Path $outDir "largest-source-files.csv") -NoTypeInformation -Encoding utf8

$cssFiles = $files | Where-Object { $_.Extension -eq ".css" }
$cssAudit = foreach ($f in $cssFiles) {
    $text = Get-Content -LiteralPath $f.FullName -Raw
    $important = ([regex]::Matches($text, '!important')).Count
    $selection = ([regex]::Matches($text, '::selection')).Count
    $rootBlocks = ([regex]::Matches($text, '(?m)^\s*:root\s*\{')).Count
    $mediaBlocks = ([regex]::Matches($text, '@media')).Count
    [pscustomobject]@{
        Path = RelPath $RepoRoot $f.FullName
        KB = [math]::Round($f.Length / 1KB, 2)
        Lines = ($text -split "`r?`n").Count
        ImportantRules = $important
        RootBlocks = $rootBlocks
        SelectionRules = $selection
        MediaBlocks = $mediaBlocks
    }
}

$cssAudit | Sort-Object KB -Descending |
    Export-Csv -LiteralPath (Join-Path $outDir "css-audit.csv") -NoTypeInformation -Encoding utf8

Step "5. Finding CSS import sites"

$codeFiles = $files | Where-Object { @(".ts",".tsx",".js",".jsx",".mjs",".cjs") -contains $_.Extension.ToLowerInvariant() }

$cssImports = foreach ($f in $codeFiles) {
    $lines = Get-Content -LiteralPath $f.FullName
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match 'import\s+.*["''](.+?\.css)["'']') {
            [pscustomobject]@{
                File = RelPath $RepoRoot $f.FullName
                Line = $i + 1
                Import = $Matches[1]
            }
        }
    }
}

$cssImports | Export-Csv -LiteralPath (Join-Path $outDir "css-imports.csv") -NoTypeInformation -Encoding utf8

Step "6. Finding oversized scripts and tests"

$tools = $inventory | Where-Object { $_.Path -match '^tools[\\/]' } | Sort-Object Bytes -Descending
$tests = $inventory | Where-Object { $_.Path -match '(__tests__|\.test\.|\.spec\.)' } | Sort-Object Bytes -Descending

$tools | Export-Csv -LiteralPath (Join-Path $outDir "tools-files.csv") -NoTypeInformation -Encoding utf8
$tests | Export-Csv -LiteralPath (Join-Path $outDir "test-files.csv") -NoTypeInformation -Encoding utf8

Step "7. Auditing package scripts and dependencies"

$packagePath = Join-Path $RepoRoot "package.json"
$pkg = Get-Content -LiteralPath $packagePath -Raw | ConvertFrom-Json

$scripts = @()
if ($pkg.scripts) {
    foreach ($p in $pkg.scripts.PSObject.Properties) {
        $scripts += [pscustomobject]@{ Name = $p.Name; Command = [string]$p.Value }
    }
}
$scripts | Sort-Object Name |
    Export-Csv -LiteralPath (Join-Path $outDir "package-scripts.csv") -NoTypeInformation -Encoding utf8

$deps = @()
foreach ($kind in @("dependencies","devDependencies")) {
    $obj = $pkg.$kind
    if ($obj) {
        foreach ($p in $obj.PSObject.Properties) {
            $deps += [pscustomobject]@{
                Type = $kind
                Package = $p.Name
                Version = [string]$p.Value
            }
        }
    }
}
$deps | Sort-Object Type, Package |
    Export-Csv -LiteralPath (Join-Path $outDir "package-dependencies.csv") -NoTypeInformation -Encoding utf8

Step "8. Writing summary report"

$totalMB = [math]::Round((($inventory | Measure-Object Bytes -Sum).Sum / 1MB), 2)
$sourceLines = ($loc | Measure-Object Lines -Sum).Sum
$cssLines = (($loc | Where-Object Extension -eq ".css") | Measure-Object Lines -Sum).Sum
$toolsMB = [math]::Round((($tools | Measure-Object Bytes -Sum).Sum / 1MB), 2)
$testsMB = [math]::Round((($tests | Measure-Object Bytes -Sum).Sum / 1MB), 2)

$dupGroups = ($duplicates | Select-Object -ExpandProperty Hash -Unique).Count
$junkMB = [math]::Round((($junk | Measure-Object Bytes -Sum).Sum / 1MB), 2)

$report = @"
# Wingman Repository Reduction Audit

Generated: $timestamp

## Headline footprint

- Files scanned: $($inventory.Count)
- Repository size scanned (excluding node_modules/.git/dist/build/coverage): **$totalMB MB**
- Source/config lines scanned: **$sourceLines**
- CSS files: **$($cssFiles.Count)**
- CSS lines: **$cssLines**
- Tool files: **$($tools.Count)** / **$toolsMB MB**
- Test files: **$($tests.Count)** / **$testsMB MB**
- package.json scripts: **$($scripts.Count)**
- package dependencies + devDependencies: **$($deps.Count)**
- Exact duplicate hash groups: **$dupGroups**
- Stale/backup/archive candidates: **$($junk.Count)** / **$junkMB MB**

## Largest top-level areas

$(
    ($folderStats | Select-Object -First 15 | ForEach-Object {
        "- $($_.Folder): $($_.Files) files / $($_.MB) MB"
    }) -join "`r`n"
)

## Largest source files

$(
    ($loc | Sort-Object Lines -Descending | Select-Object -First 20 | ForEach-Object {
        "- $($_.Path): $($_.Lines) lines / $($_.KB) KB"
    }) -join "`r`n"
)

## Largest CSS files

$(
    ($cssAudit | Select-Object -First 15 | ForEach-Object {
        "- $($_.Path): $($_.Lines) lines / $($_.KB) KB / !important=$($_.ImportantRules) / :root=$($_.RootBlocks)"
    }) -join "`r`n"
)

## Recommended review order

1. **CSS consolidation**
   - Review css-audit.csv and css-imports.csv.
   - Collapse duplicate theme/override layers into one governed style stack.
   - Remove temporary specificity/density patches after canonical rules are fixed.

2. **Tool/script consolidation**
   - Review tools-files.csv and package-scripts.csv.
   - Look for many wrappers that call the same underlying check.
   - Prefer grouped commands over one npm alias per historical fix.

3. **Dead/legacy source**
   - Review stale-candidates.csv.
   - Run the existing orphan-module/retired-feature checks before deleting code.

4. **Oversized modules**
   - Review largest-source-files.csv.
   - Split only where it reduces duplication or clarifies ownership; do not split purely to make files shorter.

5. **Tests**
   - Preserve behaviour/scenario tests.
   - Consolidate duplicate marker/contract tests that verify the same condition.

6. **Dependencies**
   - Review package-dependencies.csv against actual imports before removing packages.

## Important

This audit does **not delete or modify application code**.
Use it to create a controlled cleanup plan, then remove code in small validated passes.
"@

$reportPath = Join-Path $outDir "wingman-repo-audit.md"
[System.IO.File]::WriteAllText($reportPath, $report, (New-Object System.Text.UTF8Encoding($false)))

Step "9. Complete"

Write-Host "Read-only audit complete." -ForegroundColor Green
Write-Host ""
Write-Host "Main report:"
Write-Host "  $reportPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "Supporting CSVs:"
Write-Host "  $outDir"
Write-Host ""
Write-Host "No application files were changed or deleted."
Write-Host "Upload wingman-repo-audit.md here and I can turn it into a safe reduction/refactor pass."
