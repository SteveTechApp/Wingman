[CmdletBinding()]
param(
    [string]$RepoRoot = "C:\Users\steve\wingman",
    [switch]$RunBuild,
    [switch]$RunFullVerify
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

    $Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $Utf8NoBom)
}

function Invoke-NativeCaptured {
    param(
        [Parameter(Mandatory)]
        [System.Management.Automation.CommandInfo]$Command,

        [Parameter(Mandatory)]
        [string[]]$Arguments
    )

    $PreviousPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"

    try {
        $Output = & $Command.Source @Arguments 2>&1
        $ExitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $PreviousPreference
    }

    [PSCustomObject]@{
        ExitCode = $ExitCode
        Lines = @($Output | ForEach-Object { [string]$_ })
    }
}

function Invoke-Npm {
    param(
        [Parameter(Mandatory)]
        [string[]]$Arguments
    )

    $Result = Invoke-NativeCaptured -Command $script:Npm -Arguments $Arguments
    $Result.Lines | ForEach-Object { Write-Host $_ }

    if ($Result.ExitCode -ne 0) {
        throw "npm $($Arguments -join ' ') failed with exit code $($Result.ExitCode)."
    }
}

$RepoRoot = (Resolve-Path -LiteralPath $RepoRoot).Path
Set-Location -LiteralPath $RepoRoot

$script:Npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $script:Npm) {
    $script:Npm = Get-Command npm -ErrorAction Stop
}

$Git = Get-Command git.exe -ErrorAction SilentlyContinue
if (-not $Git) {
    $Git = Get-Command git -ErrorAction Stop
}

$CssPath = Join-Path $RepoRoot "src\wingman2\styles\wingman-style-stack.css"

if (-not (Test-Path -LiteralPath $CssPath)) {
    throw "Wingman stylesheet was not found: $CssPath"
}

$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupDirectory = Join-Path $RepoRoot ".wingman-backups\templates-hero-compact-$Timestamp"
New-Item -ItemType Directory -Path $BackupDirectory -Force | Out-Null

$BackupPath = Join-Path $BackupDirectory "wingman-style-stack.css"
Copy-Item -LiteralPath $CssPath -Destination $BackupPath -Force

Write-Host "==> Backup created" -ForegroundColor Cyan
Write-Host $BackupPath

$Css = [System.IO.File]::ReadAllText($CssPath)

$StartMarker = "/* WINGMAN TEMPLATES COMPACT HERO START */"
$EndMarker = "/* WINGMAN TEMPLATES COMPACT HERO END */"

if ($Css.Contains($StartMarker)) {
    $Css = [regex]::Replace(
        $Css,
        "(?s)\s*" + [regex]::Escape($StartMarker) + ".*?" + [regex]::Escape($EndMarker) + "\s*",
        "`n",
        1
    )
}

$CompactHeroCss = @'
/* WINGMAN TEMPLATES COMPACT HERO START */

/*
 * Flatten the Templates header into one governed surface and use the
 * available horizontal space for useful copy instead of nested empty panels.
 */
.wm-route-templates .wm-template-hero-refocused {
  display: block !important;
  min-height: 0 !important;
  margin-bottom: 10px !important;
  padding: 13px 18px !important;
  background:
    linear-gradient(135deg, rgba(13, 33, 52, 0.96), rgba(8, 24, 39, 0.96)) !important;
  border: 1px solid rgba(94, 234, 212, 0.20) !important;
  border-radius: 14px !important;
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.18) !important;
}

.wm-route-templates .wm-template-hero-refocused > .wm-template-hero-copy {
  display: grid !important;
  grid-template-columns: minmax(470px, 0.95fr) minmax(320px, 1.05fr) !important;
  grid-template-areas:
    "kicker kicker"
    "title summary" !important;
  gap: 3px 28px !important;
  width: 100% !important;
  max-width: none !important;
  min-width: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  align-items: end !important;
  color: inherit !important;
  background: transparent !important;
  border: 0 !important;
  border-color: transparent !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  outline: 0 !important;
}

.wm-route-templates .wm-template-hero-refocused .wm-template-kicker {
  grid-area: kicker !important;
  margin: 0 0 1px !important;
  color: var(--wm-app-heading-secondary, #67e8f9) !important;
  font-size: 0.67rem !important;
  line-height: 1.1 !important;
}

.wm-route-templates .wm-template-hero-refocused .wm-page-title {
  grid-area: title !important;
  min-width: 0 !important;
  margin: 0 !important;
  color: var(--wm-app-heading, #5eead4) !important;
  font-size: clamp(1.8rem, 1.55vw + 0.9rem, 2.45rem) !important;
  line-height: 1.02 !important;
  white-space: nowrap !important;
}

.wm-route-templates .wm-template-hero-refocused .wm-copy {
  grid-area: summary !important;
  align-self: end !important;
  max-width: none !important;
  margin: 0 0 2px !important;
  color: var(--wm-app-copy-soft, #dbeafe) !important;
  font-size: 0.84rem !important;
  line-height: 1.35 !important;
}

/* Remove any legacy nested hero decoration that targets direct children. */
.wm-route-templates .wm-template-hero-refocused > div,
.wm-route-templates .wm-template-hero-refocused > div::before,
.wm-route-templates .wm-template-hero-refocused > div::after {
  background-image: none !important;
  box-shadow: none !important;
}

@media (max-width: 1120px) {
  .wm-route-templates .wm-template-hero-refocused > .wm-template-hero-copy {
    grid-template-columns: minmax(380px, 0.9fr) minmax(280px, 1.1fr) !important;
    gap: 3px 20px !important;
  }

  .wm-route-templates .wm-template-hero-refocused .wm-page-title {
    font-size: clamp(1.65rem, 1.8vw + 0.75rem, 2.15rem) !important;
  }
}

@media (max-width: 900px) {
  .wm-route-templates .wm-template-hero-refocused > .wm-template-hero-copy {
    grid-template-columns: 1fr !important;
    grid-template-areas:
      "kicker"
      "title"
      "summary" !important;
    gap: 3px !important;
  }

  .wm-route-templates .wm-template-hero-refocused .wm-page-title {
    white-space: normal !important;
  }

  .wm-route-templates .wm-template-hero-refocused .wm-copy {
    margin-top: 3px !important;
  }
}

/* WINGMAN TEMPLATES COMPACT HERO END */
'@

$Css = $Css.Replace("`r`n", "`n").Replace("`r", "`n")
$Css = $Css.TrimEnd([char[]]"`r`n") + "`n`n" + $CompactHeroCss.Trim() + "`n"
Write-Utf8NoBom -Path $CssPath -Content $Css

Write-Host "Installed compact Templates hero styling." -ForegroundColor Green

Write-Host ""
Write-Host "==> Git diff check" -ForegroundColor Cyan

$DiffCheck = Invoke-NativeCaptured -Command $Git -Arguments @("diff", "--check")

$RealFindings = @(
    $DiffCheck.Lines | Where-Object {
        $_ -notmatch "^warning: in the working copy of .*CRLF will be replaced by LF"
    }
)

if ($RealFindings.Count -gt 0 -or $DiffCheck.ExitCode -ne 0) {
    $RealFindings | ForEach-Object {
        Write-Host $_ -ForegroundColor Yellow
    }

    throw "git diff --check reports a real whitespace problem."
}

Write-Host "git diff --check passed." -ForegroundColor Green

Write-Host ""
Write-Host "==> TypeScript validation" -ForegroundColor Cyan
Invoke-Npm -Arguments @("run", "typecheck")

$PackagePath = Join-Path $RepoRoot "package.json"
$PackageJson = Get-Content -LiteralPath $PackagePath -Raw | ConvertFrom-Json

if ($PackageJson.scripts.PSObject.Properties.Name -contains "check:app-page-style") {
    Write-Host ""
    Write-Host "==> App page style audit" -ForegroundColor Cyan
    Invoke-Npm -Arguments @("run", "check:app-page-style")
}

if ($RunBuild -or $RunFullVerify) {
    Write-Host ""
    Write-Host "==> Production build" -ForegroundColor Cyan
    Invoke-Npm -Arguments @("run", "build")
}

if ($RunFullVerify) {
    Write-Host ""
    Write-Host "==> Full verification" -ForegroundColor Cyan
    Invoke-Npm -Arguments @("run", "verify")
}

Write-Host ""
Write-Host "Templates hero compaction completed." -ForegroundColor Green
Write-Host "Backup: $BackupDirectory"
