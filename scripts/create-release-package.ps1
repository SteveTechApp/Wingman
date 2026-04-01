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
    "RUN-WINGMAN.cmd"
)

foreach ($relativePath in $rootFiles) {
    $sourcePath = Join-Path $root $relativePath
    if (Test-Path $sourcePath) {
        Copy-Item -LiteralPath $sourcePath -Destination (Join-Path $packageDir $relativePath) -Force
    }
}

$manifest = @"
Wingman release package
Built: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

Contents
- dist/ production frontend build
- server/ backend source and package manifests
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
$zipSize = [math]::Round(((Get-Item $zipPath).Length) / 1MB, 2)

Write-Host ""
Write-Host "Release package ready:" -ForegroundColor Green
Write-Host "  Folder: $packageDir"
Write-Host "  Zip:    $zipPath"
Write-Host "  Dist:   $distSize MB"
Write-Host "  Server: $serverSize MB"
Write-Host "  Zip:    $zipSize MB"
