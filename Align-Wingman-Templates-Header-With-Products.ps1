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

$PagePath = Join-Path $RepoRoot "src\wingman2\pages\TemplatesPage.tsx"
$CssPath = Join-Path $RepoRoot "src\wingman2\styles\wingman-style-stack.css"

foreach ($RequiredPath in @($PagePath, $CssPath)) {
    if (-not (Test-Path -LiteralPath $RequiredPath)) {
        throw "Required file was not found: $RequiredPath"
    }
}

$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupDirectory = Join-Path $RepoRoot ".wingman-backups\templates-products-header-$Timestamp"
New-Item -ItemType Directory -Path $BackupDirectory -Force | Out-Null

Copy-Item -LiteralPath $PagePath -Destination (Join-Path $BackupDirectory "TemplatesPage.tsx") -Force
Copy-Item -LiteralPath $CssPath -Destination (Join-Path $BackupDirectory "wingman-style-stack.css") -Force

Write-Host "==> Backup created" -ForegroundColor Cyan
Write-Host $BackupDirectory

# ---------------------------------------------------------------------------
# Replace the Templates hero markup with the same hierarchy used by Products:
# left context, right page title.
# ---------------------------------------------------------------------------

$Page = [System.IO.File]::ReadAllText($PagePath)

$HeaderPattern = '(?s)<header className="wm-page-header wm-template-hero wm-template-hero-refocused">.*?</header>'

$NewHeader = @'
<header className="wm-page-header wm-template-hero wm-template-hero-refocused wm-template-products-style-header">
        <div className="wm-template-products-style-copy">
          <p className="wm-template-kicker wm-ui-kicker">Wingman / Templates</p>
          <p className="wm-copy">
            Start from a complete governed room solution, filter by vertical, then review the VERIFIED BOM and application-led proposal content.
          </p>
        </div>

        <h1 className="wm-page-title wm-template-products-style-title">Templates</h1>
      </header>
'@

if (-not [regex]::IsMatch($Page, $HeaderPattern)) {
    throw "Could not locate the current Templates hero markup."
}

$Page = [regex]::Replace(
    $Page,
    $HeaderPattern,
    $NewHeader,
    1
)

foreach ($Marker in @(
    'wm-template-products-style-header',
    'wm-template-products-style-copy',
    'wm-template-products-style-title',
    '>Templates</h1>'
)) {
    if (-not $Page.Contains($Marker)) {
        throw "Required Templates header marker is missing: $Marker"
    }
}

$Page = $Page.Replace("`r`n", "`n").Replace("`r", "`n")
$Page = $Page.TrimEnd([char[]]"`r`n") + "`n"
Write-Utf8NoBom -Path $PagePath -Content $Page

Write-Host "Updated Templates hero markup." -ForegroundColor Green

# ---------------------------------------------------------------------------
# Add a final targeted style layer matching the Products hub header.
# ---------------------------------------------------------------------------

$Css = [System.IO.File]::ReadAllText($CssPath)

$StartMarker = "/* WINGMAN TEMPLATES PRODUCTS-MATCH HEADER START */"
$EndMarker = "/* WINGMAN TEMPLATES PRODUCTS-MATCH HEADER END */"

if ($Css.Contains($StartMarker)) {
    $Css = [regex]::Replace(
        $Css,
        "(?s)\s*" + [regex]::Escape($StartMarker) + ".*?" + [regex]::Escape($EndMarker) + "\s*",
        "`n",
        1
    )
}

$HeaderCss = @'
/* WINGMAN TEMPLATES PRODUCTS-MATCH HEADER START */

/*
 * Match the navigation-hub Products header:
 * context and summary left, short page title right.
 */
.wm-route-templates .wm-template-products-style-header {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) auto !important;
  grid-template-areas: "copy title" !important;
  align-items: center !important;
  gap: 36px !important;
  min-height: 176px !important;
  margin-bottom: 12px !important;
  padding: 28px 30px !important;
  background:
    linear-gradient(135deg, rgba(16, 33, 54, 0.98), rgba(7, 20, 35, 0.98)) !important;
  border: 1px solid rgba(125, 211, 252, 0.18) !important;
  border-radius: 20px !important;
  box-shadow: none !important;
}

.wm-route-templates .wm-template-products-style-copy {
  grid-area: copy !important;
  display: flex !important;
  min-width: 0 !important;
  max-width: 920px !important;
  flex-direction: column !important;
  align-items: flex-start !important;
  justify-content: center !important;
  gap: 26px !important;
  margin: 0 !important;
  padding: 0 !important;
  color: inherit !important;
  background: transparent !important;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}

.wm-route-templates .wm-template-products-style-copy .wm-template-kicker {
  margin: 0 !important;
  color: var(--wm-app-heading-secondary, #67e8f9) !important;
  font-size: 0.82rem !important;
  font-weight: 850 !important;
  line-height: 1 !important;
  letter-spacing: 0.02em !important;
  text-transform: uppercase !important;
}

.wm-route-templates .wm-template-products-style-copy .wm-copy {
  max-width: 900px !important;
  margin: 0 !important;
  color: #91a9c6 !important;
  font-size: clamp(1rem, 0.42vw + 0.92rem, 1.22rem) !important;
  font-weight: 500 !important;
  line-height: 1.4 !important;
}

.wm-route-templates .wm-template-products-style-title {
  grid-area: title !important;
  align-self: start !important;
  margin: 0 !important;
  padding: 0 !important;
  color: var(--wm-app-heading, #5eead4) !important;
  font-size: clamp(2.7rem, 2.3vw + 1.3rem, 4rem) !important;
  font-weight: 850 !important;
  line-height: 0.95 !important;
  letter-spacing: -0.035em !important;
  text-align: right !important;
  white-space: nowrap !important;
}

@media (max-width: 900px) {
  .wm-route-templates .wm-template-products-style-header {
    grid-template-columns: 1fr !important;
    grid-template-areas:
      "title"
      "copy" !important;
    min-height: 0 !important;
    gap: 18px !important;
    padding: 22px !important;
  }

  .wm-route-templates .wm-template-products-style-title {
    justify-self: start !important;
    align-self: auto !important;
    font-size: clamp(2.2rem, 9vw, 3.2rem) !important;
    text-align: left !important;
  }

  .wm-route-templates .wm-template-products-style-copy {
    gap: 12px !important;
  }
}

/* WINGMAN TEMPLATES PRODUCTS-MATCH HEADER END */
'@

$Css = $Css.Replace("`r`n", "`n").Replace("`r", "`n")
$Css = $Css.TrimEnd([char[]]"`r`n") + "`n`n" + $HeaderCss.Trim() + "`n"
Write-Utf8NoBom -Path $CssPath -Content $Css

Write-Host "Installed Products-matched Templates header styling." -ForegroundColor Green

# ---------------------------------------------------------------------------
# Validation.
# ---------------------------------------------------------------------------

Write-Host ""
Write-Host "==> TypeScript validation" -ForegroundColor Cyan
Invoke-Npm -Arguments @("run", "typecheck")

Write-Host ""
Write-Host "==> Sales-facing language validation" -ForegroundColor Cyan
Invoke-Npm -Arguments @("run", "check:sales-facing-language")

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
Write-Host "Templates header now matches the Products hub hierarchy." -ForegroundColor Green
Write-Host "Backup: $BackupDirectory"
