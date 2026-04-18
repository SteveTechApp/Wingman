[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$ProjectRoot = "."
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ProjectRoot = (Resolve-Path $ProjectRoot).Path
$backupBase = Join-Path $ProjectRoot ".wingman-backup"

function Get-RelativePath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$BasePath,

        [Parameter(Mandatory = $true)]
        [string]$TargetPath
    )

    $baseFull = [System.IO.Path]::GetFullPath($BasePath)
    $targetFull = [System.IO.Path]::GetFullPath($TargetPath)

    if (-not $baseFull.EndsWith([System.IO.Path]::DirectorySeparatorChar)) {
        $baseFull += [System.IO.Path]::DirectorySeparatorChar
    }

    $baseUri = New-Object System.Uri($baseFull)
    $targetUri = New-Object System.Uri($targetFull)
    $relativeUri = $baseUri.MakeRelativeUri($targetUri)

    return [System.Uri]::UnescapeDataString(
        $relativeUri.ToString().Replace('/', [System.IO.Path]::DirectorySeparatorChar)
    )
}

if (-not (Test-Path $backupBase)) {
    throw "No backup folder found at $backupBase"
}

$latestBackup = Get-ChildItem -Path $backupBase -Directory |
    Sort-Object Name -Descending |
    Select-Object -First 1

if (-not $latestBackup) {
    throw "No timestamped backup folders found in $backupBase"
}

$files = Get-ChildItem -Path $latestBackup.FullName -File -Recurse

foreach ($file in $files) {
    $relative = Get-RelativePath -BasePath $latestBackup.FullName -TargetPath $file.FullName
    $target = Join-Path $ProjectRoot $relative
    $targetDir = Split-Path $target -Parent

    if (-not (Test-Path $targetDir)) {
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    }

    Copy-Item -Path $file.FullName -Destination $target -Force
    Write-Host "Restored $target"
}

Write-Host ""
Write-Host "Restore complete from: $($latestBackup.FullName)"