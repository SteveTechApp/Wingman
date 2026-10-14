#requires -Version 7.0

<##
.SYNOPSIS
    Repairs the recommendation-safety script's Windows line-ending matcher.

.DESCRIPTION
    Creates a side-by-side backup, then replaces only the Replace-Once helper
    in implement-recommendation-safety.ps1. No Wingman source files are changed.
#>

param(
    [string]$TargetScript
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

if (-not $TargetScript) {
    $TargetScript = Join-Path $PSScriptRoot "implement-recommendation-safety.ps1"
}

$resolvedTarget = Resolve-Path -LiteralPath $TargetScript -ErrorAction Stop
$targetPath = $resolvedTarget.Path
$content = [System.IO.File]::ReadAllText($targetPath, [System.Text.UTF8Encoding]::new($false))

if ($content.Contains('$normalisedContent')) {
    Write-Host "OK     The recommendation-safety script is already repaired."
    exit 0
}

$pattern = '(?ms)^function Replace-Once \{.*?^function Add-FilePatch \{'
$matches = [regex]::Matches($content, $pattern)
if ($matches.Count -ne 1) {
    throw "Expected exactly one Replace-Once helper in $targetPath, found $($matches.Count). No files were changed."
}

$replacement = @'
function Replace-Once {
    param(
        [string]$Path,
        [string]$Content,
        [string]$Old,
        [string]$New,
        [string]$Description
    )

    # Match LF internally so anchors also work against Windows CRLF files,
    # then restore the original line-ending style in the updated content.
    $sourceNewline = if ($Content.Contains("`r`n")) { "`r`n" } else { "`n" }
    $normalisedContent = $Content.Replace("`r`n", "`n")
    $normalisedOld = $Old.Replace("`r`n", "`n")
    $normalisedNew = $New.Replace("`r`n", "`n")

    $count = ([regex]::Matches($normalisedContent, [regex]::Escape($normalisedOld))).Count
    if ($count -ne 1) {
        throw "Anchor check failed for '$Description' in $Path. Expected 1 match, found $count. No files have been written."
    }

    Write-Host "  PATCH  $Description"
    $updated = $normalisedContent.Replace($normalisedOld, $normalisedNew)
    if ($sourceNewline -eq "`r`n") {
        $updated = $updated.Replace("`n", "`r`n")
    }
    return $updated
}
function Add-FilePatch {
'@

$sourceNewline = if ($content.Contains("`r`n")) { "`r`n" } else { "`n" }
if ($sourceNewline -eq "`r`n") {
    $replacement = $replacement.Replace("`n", "`r`n")
}

$match = $matches[0]
$updatedContent = $content.Substring(0, $match.Index) + $replacement + $content.Substring($match.Index + $match.Length)

$backupPath = "$targetPath.bak-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Copy-Item -LiteralPath $targetPath -Destination $backupPath -ErrorAction Stop
[System.IO.File]::WriteAllText($targetPath, $updatedContent, [System.Text.UTF8Encoding]::new($false))

Write-Host "BACKUP $backupPath"
Write-Host "PATCH  $targetPath"
Write-Host "OK     The existing script now supports CRLF source files."
