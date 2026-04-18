[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$ProjectRoot = "."
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ProjectRoot = (Resolve-Path $ProjectRoot).Path
$archiveBase = Join-Path $ProjectRoot "archive\wingman-legacy"

if (-not (Test-Path $archiveBase)) {
    throw "No legacy archive folder found at $archiveBase"
}

$latestArchive = Get-ChildItem -Path $archiveBase -Directory |
    Sort-Object Name -Descending |
    Select-Object -First 1

if (-not $latestArchive) {
    throw "No timestamped archive folders found in $archiveBase"
}

Get-ChildItem -Path $latestArchive.FullName -Recurse | Sort-Object FullName | ForEach-Object {
    $relative = $_.FullName.Substring($latestArchive.FullName.Length).TrimStart('\')
    if (-not $relative) {
        return
    }

    $destination = Join-Path $ProjectRoot $relative

    if ($_.PSIsContainer) {
        if (-not (Test-Path $destination)) {
            New-Item -ItemType Directory -Path $destination -Force | Out-Null
        }
    }
    else {
        $destinationDir = Split-Path $destination -Parent
        if (-not (Test-Path $destinationDir)) {
            New-Item -ItemType Directory -Path $destinationDir -Force | Out-Null
        }
        Copy-Item -Path $_.FullName -Destination $destination -Force
        Write-Host "Restored $destination"
    }
}

Write-Host ""
Write-Host "Restore complete from: $($latestArchive.FullName)"
