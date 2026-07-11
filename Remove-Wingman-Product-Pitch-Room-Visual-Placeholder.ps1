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
$backupDirectory = Join-Path $RepoRoot ".wingman-backups\remove-product-pitch-room-visual-$timestamp"
New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null
$backupPath = Join-Path $backupDirectory "ProductPitchPage.tsx"
Copy-Item -LiteralPath $filePath -Destination $backupPath -Force

Write-Host "==> Backup created" -ForegroundColor Cyan
Write-Host $backupPath

# Remove the visual tab from the tab union.
$content = $content.Replace(
    'type ProductTab = "overview" | "sales" | "spec" | "diagram" | "visual";',
    'type ProductTab = "overview" | "sales" | "spec" | "diagram";'
)

# Remove the entire placeholder VisualTab component.
$visualStart = $content.IndexOf("function VisualTab(")
$productWorkspaceStart = $content.IndexOf("function ProductWorkspace(")

if ($visualStart -ge 0) {
    if ($productWorkspaceStart -lt 0 -or $productWorkspaceStart -le $visualStart) {
        throw "Could not safely locate the end of VisualTab."
    }

    $content = $content.Remove(
        $visualStart,
        $productWorkspaceStart - $visualStart
    )
}

# Remove the Room Visual tab button.
$content = [regex]::Replace(
    $content,
    '(?m)^[ \t]*<TabButton label="Room Visual"[^\r\n]*\r?\n',
    ""
)

# Remove the VisualTab render branch.
$content = [regex]::Replace(
    $content,
    '(?m)^[ \t]*\{activeTab === "visual" \? <VisualTab[^\r\n]*\r?\n',
    ""
)

$forbiddenMarkers = @(
    'Room Visual',
    'Room visual prompt',
    'Future workflow',
    'function VisualTab(',
    'activeTab === "visual"',
    'setActiveTab("visual")'
)

foreach ($marker in $forbiddenMarkers) {
    if ($content.Contains($marker)) {
        throw "Obsolete Product Pitch room-visual marker remains: $marker"
    }
}

if ($content -eq $original) {
    throw "No Product Pitch room-visual placeholder changes were applied."
}

$content = $content.Replace("`r`n", "`n").Replace("`r", "`n")
$content = $content.TrimEnd([char[]]"`r`n") + "`n"
Write-Utf8NoBom -Path $filePath -Content $content

Write-Host "Removed the Product Pitch Room Visual placeholder." -ForegroundColor Green

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
