param(
    [string]$RepoRoot = (Get-Location).Path,
    [switch]$Apply
)

$ErrorActionPreference = "Stop"

function Step([string]$Text) {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor DarkCyan
    Write-Host $Text -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor DarkCyan
}

function Write-Utf8NoBom([string]$Path, [string]$Text) {
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Text, $utf8)
}

function Copy-Backup([string]$Source, [string]$BackupRoot, [string]$Relative) {
    $dest = Join-Path $BackupRoot $Relative
    $parent = Split-Path -Parent $dest
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
    Copy-Item -LiteralPath $Source -Destination $dest -Force
}

$RepoRoot = (Resolve-Path -LiteralPath $RepoRoot).Path
Set-Location -LiteralPath $RepoRoot

if (-not (Test-Path -LiteralPath (Join-Path $RepoRoot "package.json"))) {
    throw "package.json not found. Run from the Wingman repository or pass -RepoRoot."
}

$mainPath = Join-Path $RepoRoot "src\main.tsx"
$stylesDir = Join-Path $RepoRoot "src\wingman2\styles"
$stackPath = Join-Path $stylesDir "wingman-style-stack.css"
$registerPath = Join-Path $stylesDir "CSS_MIGRATION_REGISTER.md"

$mergeFiles = @(
    "wingman-reference-theme.css",
    "wingman-workflow-theme.css",
    "wingman-polish-navigation.css",
    "wingman-reference-global.css",
    "wingman-product-tools-visual-weight.css"
)

Step "1. Safety checks"

foreach ($required in @($mainPath, $stackPath, $registerPath)) {
    if (-not (Test-Path -LiteralPath $required)) {
        throw "Required file missing: $required"
    }
}

foreach ($name in $mergeFiles) {
    $path = Join-Path $stylesDir $name
    if (-not (Test-Path -LiteralPath $path)) {
        throw "Expected active stylesheet missing: $path"
    }
}

$register = [System.IO.File]::ReadAllText($registerPath)

# The migration register is guidance only. Local wording may differ from GitHub,
# so do not abort based on one exact sentence. The real safety contract for this
# pass is the current src\main.tsx import list plus successful typecheck/build.
if ($register -match 'wingman-style-stack\.css') {
    Write-Host "Migration register references wingman-style-stack.css." -ForegroundColor Green
}
else {
    Write-Warning "Migration register wording differs or does not mention wingman-style-stack.css. Continuing with source-based safety checks."
}

$main = [System.IO.File]::ReadAllText($mainPath)

$expectedImports = @(
    './wingman2/styles/wingman-style-stack.css',
    './wingman2/styles/wingman-reference-theme.css',
    './wingman2/styles/wingman-workflow-theme.css',
    './wingman2/styles/wingman-polish-navigation.css',
    './wingman2/styles/wingman-reference-global.css',
    './wingman2/styles/wingman-product-tools-visual-weight.css'
)

foreach ($imp in $expectedImports) {
    if ($main -notmatch [regex]::Escape('import "' + $imp + '";')) {
        throw "Expected import not found in src\main.tsx: $imp"
    }
}

$branch = (& git branch --show-current 2>$null)
Write-Host "Repository: $RepoRoot"
Write-Host "Branch:     $branch"

$status = (& git status --short)
if ($status) {
    Write-Host ""
    Write-Host "Working tree currently has changes:" -ForegroundColor Yellow
    $status | ForEach-Object { Write-Host "  $_" }
    Write-Host ""
    Write-Host "This script only modifies src\main.tsx and the CSS files named in its plan." -ForegroundColor DarkGray
}

Step "2. Building consolidation plan"

$stackBytes = (Get-Item -LiteralPath $stackPath).Length
$mergeBytes = 0L
foreach ($name in $mergeFiles) {
    $mergeBytes += (Get-Item -LiteralPath (Join-Path $stylesDir $name)).Length
}

Write-Host "Canonical owner:"
Write-Host "  src\wingman2\styles\wingman-style-stack.css" -ForegroundColor Green
Write-Host ""
Write-Host "Merge into canonical stack, preserving current cascade order:"
foreach ($name in $mergeFiles) {
    $item = Get-Item -LiteralPath (Join-Path $stylesDir $name)
    Write-Host ("  {0,-45} {1,8:N1} KB" -f $name, ($item.Length / 1KB))
}
Write-Host ""
Write-Host ("Current stack:       {0:N1} KB" -f ($stackBytes / 1KB))
Write-Host ("Imported additions:  {0:N1} KB" -f ($mergeBytes / 1KB))
Write-Host ""
Write-Host "After successful validation:"
Write-Host "  - src\main.tsx imports only wingman-style-stack.css (plus XYFlow vendor CSS)"
Write-Host "  - retired imported CSS files are deleted only if no other source file references them"
Write-Host "  - wingman-products-light-graphics.css is NOT touched in this pass"
Write-Host ""
Write-Host "Visual cascade is preserved by concatenating in the exact current import order."

if (-not $Apply) {
    Step "3. DRY RUN complete"
    Write-Host "No files were changed." -ForegroundColor Green
    Write-Host ""
    Write-Host "Apply with:"
    Write-Host "  .\consolidate-wingman-css-pass1.ps1 -Apply" -ForegroundColor Cyan
    exit 0
}

Step "3. Creating external recovery backup"

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupRoot = Join-Path $env:TEMP ("wingman-css-pass1-" + $stamp)
New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null

Copy-Backup $mainPath $backupRoot "src\main.tsx"
Copy-Backup $stackPath $backupRoot "src\wingman2\styles\wingman-style-stack.css"
foreach ($name in $mergeFiles) {
    Copy-Backup (Join-Path $stylesDir $name) $backupRoot ("src\wingman2\styles\" + $name)
}

Write-Host "Recovery backup: $backupRoot" -ForegroundColor Green

Step "4. Consolidating active CSS in current cascade order"

$stack = [System.IO.File]::ReadAllText($stackPath).TrimEnd()

$combined = New-Object System.Text.StringBuilder
[void]$combined.Append($stack)
[void]$combined.Append([Environment]::NewLine)
[void]$combined.Append([Environment]::NewLine)

foreach ($name in $mergeFiles) {
    $sourcePath = Join-Path $stylesDir $name
    $content = [System.IO.File]::ReadAllText($sourcePath).Trim()

    [void]$combined.Append("/* ============================================================")
    [void]$combined.Append([Environment]::NewLine)
    [void]$combined.Append("   CONSOLIDATED FROM: " + $name)
    [void]$combined.Append([Environment]::NewLine)
    [void]$combined.Append("   Preserved in former src/main.tsx import order.")
    [void]$combined.Append([Environment]::NewLine)
    [void]$combined.Append("   ============================================================ */")
    [void]$combined.Append([Environment]::NewLine)
    [void]$combined.Append($content)
    [void]$combined.Append([Environment]::NewLine)
    [void]$combined.Append([Environment]::NewLine)
}

Write-Utf8NoBom $stackPath $combined.ToString()

Step "5. Reducing src\main.tsx to the governed import contract"

$newMainLines = @()
foreach ($line in ([System.IO.File]::ReadAllLines($mainPath))) {
    $remove = $false
    foreach ($name in $mergeFiles) {
        $importText = 'import "./wingman2/styles/' + $name + '";'
        if ($line.Trim() -eq $importText) {
            $remove = $true
            break
        }
    }
    if (-not $remove) {
        $newMainLines += $line
    }
}

$newMain = $newMainLines -join [Environment]::NewLine
Write-Utf8NoBom $mainPath ($newMain + [Environment]::NewLine)

$mainCheck = [System.IO.File]::ReadAllText($mainPath)
foreach ($name in $mergeFiles) {
    if ($mainCheck -match [regex]::Escape($name)) {
        throw "Import removal failed for $name"
    }
}

if ($mainCheck -notmatch [regex]::Escape('import "./wingman2/styles/wingman-style-stack.css";')) {
    throw "Canonical wingman-style-stack.css import is missing after rewrite."
}

Step "6. Checking remaining references before deleting retired files"

$canDelete = @()
$keep = @()

$codeFiles = Get-ChildItem -LiteralPath (Join-Path $RepoRoot "src") -Recurse -File |
    Where-Object { @(".ts",".tsx",".js",".jsx",".mjs",".cjs",".css") -contains $_.Extension.ToLowerInvariant() }

foreach ($name in $mergeFiles) {
    $refs = @()

    foreach ($file in $codeFiles) {
        if ($file.FullName -eq (Join-Path $stylesDir $name)) { continue }

        $reader = New-Object System.IO.StreamReader($file.FullName)
        $lineNo = 0
        try {
            while ($null -ne ($line = $reader.ReadLine())) {
                $lineNo++
                if ($line -match [regex]::Escape($name)) {
                    $refs += ($file.FullName.Substring($RepoRoot.Length).TrimStart('\','/') + ":" + $lineNo)
                }
            }
        }
        finally {
            $reader.Dispose()
        }
    }

    if ($refs.Count -eq 0) {
        $canDelete += $name
        Write-Host "No remaining references: $name" -ForegroundColor Green
    }
    else {
        $keep += $name
        Write-Host "Keeping $name because references remain:" -ForegroundColor Yellow
        $refs | ForEach-Object { Write-Host "  $_" }
    }
}

Step "7. Validating consolidated application before deletion"

& npm run typecheck
if ($LASTEXITCODE -ne 0) {
    Write-Host "Typecheck failed. Restoring changed files..." -ForegroundColor Red
    Copy-Item -LiteralPath (Join-Path $backupRoot "src\main.tsx") -Destination $mainPath -Force
    Copy-Item -LiteralPath (Join-Path $backupRoot "src\wingman2\styles\wingman-style-stack.css") -Destination $stackPath -Force
    throw "Typecheck failed. src\main.tsx and wingman-style-stack.css were restored."
}

& npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed. Restoring changed files..." -ForegroundColor Red
    Copy-Item -LiteralPath (Join-Path $backupRoot "src\main.tsx") -Destination $mainPath -Force
    Copy-Item -LiteralPath (Join-Path $backupRoot "src\wingman2\styles\wingman-style-stack.css") -Destination $stackPath -Force
    throw "Build failed. src\main.tsx and wingman-style-stack.css were restored."
}

Step "8. Deleting retired CSS files with no remaining references"

foreach ($name in $canDelete) {
    $path = Join-Path $stylesDir $name
    if (Test-Path -LiteralPath $path) {
        Remove-Item -LiteralPath $path -Force
        Write-Host "Deleted: src\wingman2\styles\$name" -ForegroundColor Green
    }
}

if ($keep.Count -gt 0) {
    Write-Host ""
    Write-Host "Not deleted because references remain:" -ForegroundColor Yellow
    $keep | ForEach-Object { Write-Host "  $_" }
}

Step "9. Final validation"

& npm run typecheck
if ($LASTEXITCODE -ne 0) {
    throw "Final typecheck failed after retired-file deletion. Recovery backup: $backupRoot"
}

& npm run build
if ($LASTEXITCODE -ne 0) {
    throw "Final build failed after retired-file deletion. Recovery backup: $backupRoot"
}

Write-Host ""
Write-Host "Git status:" -ForegroundColor Cyan
& git status --short

Step "10. Complete"

Write-Host "CSS consolidation pass 1 completed." -ForegroundColor Green
Write-Host ""
Write-Host "Expected structural result:"
Write-Host "  - one governed Wingman CSS import in src\main.tsx"
Write-Host "  - former imported CSS preserved in identical cascade order inside wingman-style-stack.css"
Write-Host "  - unreferenced retired CSS files removed"
Write-Host "  - visual behaviour should remain unchanged"
Write-Host ""
Write-Host "Recovery backup (outside repository):"
Write-Host "  $backupRoot"
Write-Host ""
Write-Host "Do not commit until the main Wingman pages have been visually checked."
