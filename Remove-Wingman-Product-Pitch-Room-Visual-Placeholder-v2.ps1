[CmdletBinding()]
param(
    [string]$RepoRoot = "C:\Users\steve\wingman",
    [switch]$RunVerify
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Utf8NoBom {
    param(
        [Parameter(Mandatory)]
        [string]$Path,

        [Parameter(Mandatory)]
        [string]$Content
    )

    $utf8 = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $utf8)
}

function Invoke-NativeCaptured {
    param(
        [Parameter(Mandatory)]
        [System.Management.Automation.CommandInfo]$Command,

        [Parameter(Mandatory)]
        [string[]]$Arguments
    )

    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"

    try {
        $output = & $Command.Source @Arguments 2>&1
        $exitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }

    [PSCustomObject]@{
        ExitCode = $exitCode
        Lines = @($output | ForEach-Object { [string]$_ })
    }
}

function Invoke-Npm {
    param(
        [Parameter(Mandatory)]
        [string[]]$Arguments
    )

    $result = Invoke-NativeCaptured -Command $script:Npm -Arguments $Arguments
    $result.Lines | ForEach-Object { Write-Host $_ }

    if ($result.ExitCode -ne 0) {
        throw "npm $($Arguments -join ' ') failed with exit code $($result.ExitCode)."
    }
}

$RepoRoot = (Resolve-Path -LiteralPath $RepoRoot).Path
Set-Location -LiteralPath $RepoRoot

$script:Npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $script:Npm) {
    $script:Npm = Get-Command npm -ErrorAction Stop
}

$git = Get-Command git.exe -ErrorAction SilentlyContinue
if (-not $git) {
    $git = Get-Command git -ErrorAction Stop
}

$filePath = Join-Path $RepoRoot "src\wingman2\pages\ProductPitchPage.tsx"

if (-not (Test-Path -LiteralPath $filePath)) {
    throw "ProductPitchPage.tsx was not found: $filePath"
}

$content = [System.IO.File]::ReadAllText($filePath)
$original = $content

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDirectory = Join-Path $RepoRoot ".wingman-backups\remove-product-pitch-room-visual-v2-$timestamp"
New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null
$backupPath = Join-Path $backupDirectory "ProductPitchPage.tsx"
Copy-Item -LiteralPath $filePath -Destination $backupPath -Force

Write-Host "==> Backup created" -ForegroundColor Cyan
Write-Host $backupPath

# Remove "visual" from the ProductTab union even if spacing differs.
$content = [regex]::Replace(
    $content,
    'type\s+ProductTab\s*=\s*"overview"\s*\|\s*"sales"\s*\|\s*"spec"\s*\|\s*"diagram"\s*\|\s*"visual"\s*;',
    'type ProductTab = "overview" | "sales" | "spec" | "diagram";'
)

# Remove the complete VisualTab component using its surrounding function names.
$visualComponentPattern = '(?s)\r?\nfunction\s+VisualTab\s*\(.*?\r?\nfunction\s+ProductWorkspace\s*\('
if ([regex]::IsMatch($content, $visualComponentPattern)) {
    $content = [regex]::Replace(
        $content,
        $visualComponentPattern,
        "`nfunction ProductWorkspace(",
        1
    )
}

# Remove the Room Visual tab button whether it is one line or formatted over several lines.
$roomVisualTabPattern = '(?s)\s*<TabButton\b(?:(?!<TabButton\b).)*?label\s*=\s*"Room Visual"(?:(?!<TabButton\b).)*?/>'
$content = [regex]::Replace($content, $roomVisualTabPattern, "", 1)

# Remove the VisualTab render branch whether written on one or several lines.
$visualRenderPattern = '(?s)\s*\{\s*activeTab\s*===\s*"visual"\s*\?\s*<VisualTab\b.*?/>\s*:\s*null\s*\}'
$content = [regex]::Replace($content, $visualRenderPattern, "", 1)

# Exact structural checks only. Generic prose containing "Room Visual" elsewhere
# is not enough to fail this repair.
$forbiddenPatterns = [ordered]@{
    'VisualTab component' = 'function\s+VisualTab\s*\('
    'Room Visual tab button' = '<TabButton\b[^>]*label\s*=\s*"Room Visual"'
    'visual render branch' = 'activeTab\s*===\s*"visual"'
    'visual tab setter' = 'setActiveTab\s*\(\s*"visual"\s*\)'
    'visual ProductTab member' = 'type\s+ProductTab[^\r\n;]*\|\s*"visual"'
}

foreach ($entry in $forbiddenPatterns.GetEnumerator()) {
    if ([regex]::IsMatch($content, $entry.Value, [System.Text.RegularExpressions.RegexOptions]::Singleline)) {
        throw "Obsolete Product Pitch structure remains: $($entry.Key)"
    }
}

if ($content -eq $original) {
    Write-Host "No Product Pitch Room Visual placeholder structure was found." -ForegroundColor Yellow
}
else {
    $content = $content.Replace("`r`n", "`n").Replace("`r", "`n")
    $content = $content.TrimEnd([char[]]"`r`n") + "`n"
    Write-Utf8NoBom -Path $filePath -Content $content
    Write-Host "Removed the Product Pitch Room Visual placeholder." -ForegroundColor Green
}

Write-Host ""
Write-Host "==> Remaining generic Room Visual text, if any" -ForegroundColor Cyan
$remainingText = Select-String -Path $filePath -Pattern "Room Visual" -SimpleMatch
if ($remainingText) {
    $remainingText | ForEach-Object {
        Write-Host "  line $($_.LineNumber): $($_.Line.Trim())" -ForegroundColor Yellow
    }
}
else {
    Write-Host "No remaining Room Visual text." -ForegroundColor Green
}

Write-Host ""
Write-Host "==> TypeScript validation" -ForegroundColor Cyan
Invoke-Npm -Arguments @("run", "typecheck")

Write-Host ""
Write-Host "==> Sales-facing language check" -ForegroundColor Cyan
Invoke-Npm -Arguments @("run", "check:sales-facing-language")

Write-Host ""
Write-Host "==> Git diff check" -ForegroundColor Cyan
$diffCheck = Invoke-NativeCaptured -Command $git -Arguments @("diff", "--check")

$realFindings = @(
    $diffCheck.Lines | Where-Object {
        $_ -notmatch "^warning: in the working copy of .*CRLF will be replaced by LF"
    }
)

if ($realFindings.Count -gt 0 -or $diffCheck.ExitCode -ne 0) {
    $realFindings | ForEach-Object { Write-Host $_ -ForegroundColor Yellow }
    throw "git diff --check reports a real whitespace problem."
}

Write-Host "git diff --check passed." -ForegroundColor Green

if ($RunVerify) {
    Write-Host ""
    Write-Host "==> Full verification" -ForegroundColor Cyan
    Invoke-Npm -Arguments @("run", "verify")
}

Write-Host ""
Write-Host "==> Relevant diff" -ForegroundColor Cyan
$diff = Invoke-NativeCaptured -Command $git -Arguments @(
    "diff",
    "--",
    "src/wingman2/pages/ProductPitchPage.tsx"
)
$diff.Lines | ForEach-Object { Write-Host $_ }

Write-Host ""
Write-Host "Product Pitch room-visual placeholder removal passed." -ForegroundColor Green
Write-Host "Backup: $backupDirectory"
