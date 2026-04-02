param(
    [string]$OutputRoot = "_release",
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Write-Utf8NoBom {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Content
    )

    $directory = Split-Path -Parent $Path
    if ($directory -and -not (Test-Path $directory)) {
        New-Item -ItemType Directory -Force -Path $directory | Out-Null
    }

    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

function Copy-TreeWithoutNodeModules {
    param(
        [Parameter(Mandatory = $true)][string]$Source,
        [Parameter(Mandatory = $true)][string]$Destination
    )

    $files = Get-ChildItem -Path $Source -Recurse -File | Where-Object {
        $_.FullName -notmatch '\\node_modules\\' -and
        $_.FullName -notmatch '\\dist\\'
    }

    foreach ($file in $files) {
        $relative = $file.FullName.Substring($Source.Length).TrimStart('\')
        $target = Join-Path $Destination $relative
        $targetDir = Split-Path -Parent $target
        if ($targetDir -and -not (Test-Path $targetDir)) {
            New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
        }
        Copy-Item -LiteralPath $file.FullName -Destination $target -Force
    }
}

function Copy-ReleaseItem {
    param(
        [Parameter(Mandatory = $true)][string]$SourcePath,
        [Parameter(Mandatory = $true)][string]$DestinationPath
    )

    if (-not (Test-Path $SourcePath)) {
        return
    }

    $destinationDir = Split-Path -Parent $DestinationPath
    if ($destinationDir -and -not (Test-Path $destinationDir)) {
        New-Item -ItemType Directory -Force -Path $destinationDir | Out-Null
    }

    if (Test-Path $SourcePath -PathType Container) {
        Copy-Item -Recurse -Force -Path $SourcePath -Destination $DestinationPath
        return
    }

    Copy-Item -LiteralPath $SourcePath -Destination $DestinationPath -Force
}

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $root

if (-not $SkipBuild) {
    Write-Step "Building production frontend"
    npm run build
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$packageName = "wingman-release-$timestamp"
$stageDir = Join-Path $root $OutputRoot
$packageDir = Join-Path $stageDir $packageName
$zipPath = Join-Path $stageDir "$packageName.zip"

Write-Step "Preparing release folder"
if (Test-Path $packageDir) {
    Remove-Item -Recurse -Force $packageDir
}
if (Test-Path $zipPath) {
    Remove-Item -Force $zipPath
}
New-Item -ItemType Directory -Force -Path $packageDir | Out-Null

Write-Step "Copying frontend dist"
Copy-Item -Recurse -Force -Path (Join-Path $root "dist") -Destination (Join-Path $packageDir "dist")

Write-Step "Copying backend source without installed dependencies"
Copy-TreeWithoutNodeModules -Source (Join-Path $root "server") -Destination (Join-Path $packageDir "server")

Write-Step "Copying release essentials"
$rootFiles = @(
    ".env.example",
    "RUN-WINGMAN.cmd",
    "package.json",
    "package-lock.json"
)

foreach ($relativePath in $rootFiles) {
    $sourcePath = Join-Path $root $relativePath
    Copy-ReleaseItem -SourcePath $sourcePath -DestinationPath (Join-Path $packageDir $relativePath)
}

$scriptFiles = @(
    "scripts\run-wingman-full.mjs",
    "scripts\start-wingman-backend.mjs",
    "scripts\wingman-runtime-env.mjs"
)

foreach ($relativePath in $scriptFiles) {
    $sourcePath = Join-Path $root $relativePath
    Copy-ReleaseItem -SourcePath $sourcePath -DestinationPath (Join-Path $packageDir $relativePath)
}

$runtimeDataFiles = @(
    "data\competitor-approvals.json",
    "data\product-intelligence-db.json",
    "data\wyrestorm-product-intelligence.json",
    "src\data\wyrestormSkuCatalog.2026.json",
    "src\data\catalog\wyrestorm-catalog.phase1.json",
    "src\data\catalog\competitor-catalog.phase4.json",
    "src\data\catalog\competitor-compare.seed.json",
    "src\data\governance\wingman-governance.json"
)

foreach ($relativePath in $runtimeDataFiles) {
    $sourcePath = Join-Path $root $relativePath
    Copy-ReleaseItem -SourcePath $sourcePath -DestinationPath (Join-Path $packageDir $relativePath)
}

$manifest = @"
Wingman release package
Built: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

Contents
- dist/ production frontend build
- server/ backend source and package manifests
- scripts/ local startup helpers
- data/ runtime lookup and product intelligence stores
- src/data/ runtime seed catalogs and governance data
- package.json and package-lock.json for portable dependency install
- .env.example template configuration

Excluded on purpose
- root node_modules
- server/node_modules
- local dist history, rescue folders, and archives
- unused public working assets
"@

Write-Utf8NoBom -Path (Join-Path $packageDir "RELEASE-NOTES.txt") -Content $manifest

Write-Step "Creating zip archive"
Compress-Archive -Path (Join-Path $packageDir "*") -DestinationPath $zipPath -Force

$distSize = [math]::Round(((Get-ChildItem (Join-Path $packageDir "dist") -Recurse -File | Measure-Object Length -Sum).Sum) / 1MB, 2)
$serverSize = [math]::Round(((Get-ChildItem (Join-Path $packageDir "server") -Recurse -File | Measure-Object Length -Sum).Sum) / 1MB, 2)
$dataSize = [math]::Round(((Get-ChildItem (Join-Path $packageDir "data") -Recurse -File | Measure-Object Length -Sum).Sum) / 1MB, 2)
$zipSize = [math]::Round(((Get-Item $zipPath).Length) / 1MB, 2)

Write-Host ""
Write-Host "Release package ready:" -ForegroundColor Green
Write-Host "  Folder: $packageDir"
Write-Host "  Zip:    $zipPath"
Write-Host "  Dist:   $distSize MB"
Write-Host "  Server: $serverSize MB"
Write-Host "  Data:   $dataSize MB"
Write-Host "  Zip:    $zipSize MB"
