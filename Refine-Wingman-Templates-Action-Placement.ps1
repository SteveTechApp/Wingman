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

$pagePath = Join-Path $RepoRoot "src\wingman2\pages\TemplatesPage.tsx"
$cssPath = Join-Path $RepoRoot "src\wingman2\styles\wingman-style-stack.css"

foreach ($requiredPath in @($pagePath, $cssPath)) {
    if (-not (Test-Path -LiteralPath $requiredPath)) {
        throw "Required file was not found: $requiredPath"
    }
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDirectory = Join-Path $RepoRoot ".wingman-backups\templates-action-placement-$timestamp"
New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null

Copy-Item -LiteralPath $pagePath -Destination (Join-Path $backupDirectory "TemplatesPage.tsx") -Force
Copy-Item -LiteralPath $cssPath -Destination (Join-Path $backupDirectory "wingman-style-stack.css") -Force

Write-Host "==> Backup created" -ForegroundColor Cyan
Write-Host $backupDirectory

$page = [System.IO.File]::ReadAllText($pagePath)

# ---------------------------------------------------------------------------
# 1. Remove the custom-template action from the hero.
# ---------------------------------------------------------------------------

$heroActionsPattern = '(?s)\r?\n\s*<div className="wm-template-hero-actions">.*?</div>\r?\n\s*</header>'

if ([regex]::IsMatch($page, $heroActionsPattern)) {
    $page = [regex]::Replace(
        $page,
        $heroActionsPattern,
        "`n      </header>",
        1
    )
}

# ---------------------------------------------------------------------------
# 2. Replace the filter panel with search, verticals and a right-aligned action.
# ---------------------------------------------------------------------------

$filterPanelPattern = '(?s)<section className="wm-section-card wm-template-filter-panel" aria-label="Template filters">.*?</section>'

$newFilterPanel = @'
<section className="wm-section-card wm-template-filter-panel" aria-label="Template filters">
        <label className="wm-field wm-template-search">
          Search templates
          <input
            className="wm-input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search room, vertical, SKU or application"
          />
        </label>

        <div className="wm-template-filter-group" aria-label="Vertical filter">
          <span className="wm-template-filter-label">Vertical</span>
          <div className="wm-template-filter-strip">
            {verticals.map((item) => (
              <button
                key={item}
                type="button"
                className={`wm-filter-chip${item === vertical ? " is-active" : ""}`}
                onClick={() => setVertical(item)}
                aria-pressed={item === vertical}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="wm-template-filter-actions">
          {customTemplates.length > 0 ? (
            <span className="wm-template-custom-count">
              {customTemplates.length} custom
            </span>
          ) : null}

          <button
            type="button"
            className="wm-button wm-button-secondary"
            onClick={() => setShowCustomTemplate((current) => !current)}
            aria-expanded={showCustomTemplate}
            aria-controls="custom-template-panel"
          >
            {showCustomTemplate ? "Close custom template" : "Create custom template"}
          </button>
        </div>
      </section>
'@

if (-not [regex]::IsMatch($page, $filterPanelPattern)) {
    throw "Could not locate the Templates filter panel."
}

$page = [regex]::Replace(
    $page,
    $filterPanelPattern,
    $newFilterPanel,
    1
)

foreach ($requiredMarker in @(
    'className="wm-template-filter-actions"',
    'aria-controls="custom-template-panel"',
    'showCustomTemplate ? "Close custom template" : "Create custom template"'
)) {
    if (-not $page.Contains($requiredMarker)) {
        throw "Required action-placement marker is missing: $requiredMarker"
    }
}

if ($page.Contains('className="wm-template-hero-actions"')) {
    throw "The obsolete hero action container still remains."
}

$page = $page.Replace("`r`n", "`n").Replace("`r", "`n")
$page = $page.TrimEnd([char[]]"`r`n") + "`n"
Write-Utf8NoBom -Path $pagePath -Content $page
Write-Host "Moved custom-template action into the filter panel." -ForegroundColor Green

# ---------------------------------------------------------------------------
# 3. Replace the previous Templates custom-flow CSS with the corrected layout.
# ---------------------------------------------------------------------------

$css = [System.IO.File]::ReadAllText($cssPath)

$startMarker = "/* WINGMAN TEMPLATES OPTIONAL CUSTOM FLOW START */"
$endMarker = "/* WINGMAN TEMPLATES OPTIONAL CUSTOM FLOW END */"

if ($css.Contains($startMarker)) {
    $css = [regex]::Replace(
        $css,
        "(?s)\s*" + [regex]::Escape($startMarker) + ".*?" + [regex]::Escape($endMarker) + "\s*",
        "`n",
        1
    )
}

$replacementCss = @'
/* WINGMAN TEMPLATES OPTIONAL CUSTOM FLOW START */

/* Keep the page hero as one compact content block. */
.wm-route-templates .wm-template-hero-refocused {
  display: block;
  min-height: 0;
  padding: 16px 18px;
}

.wm-route-templates .wm-template-hero-refocused .wm-template-hero-copy {
  width: 100%;
  max-width: none;
  margin: 0;
  padding: 0;
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
}

.wm-route-templates .wm-template-hero-refocused .wm-page-title {
  margin-bottom: 6px;
}

.wm-route-templates .wm-template-hero-refocused .wm-copy {
  max-width: 980px;
  margin-bottom: 0;
}

/* Search, vertical filters and optional custom action share one row. */
.wm-route-templates .wm-template-filter-panel {
  display: grid;
  grid-template-columns:
    minmax(270px, 320px)
    minmax(0, 1fr)
    auto;
  gap: 14px;
  align-items: end;
  margin-bottom: 10px;
  padding: 16px 18px;
}

.wm-route-templates .wm-template-filter-group {
  min-width: 0;
}

.wm-route-templates .wm-template-filter-strip {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: 6px;
}

.wm-route-templates .wm-template-filter-actions {
  display: flex;
  min-width: max-content;
  align-items: center;
  justify-content: flex-end;
  gap: 9px;
  align-self: end;
}

.wm-route-templates .wm-template-filter-actions .wm-button {
  white-space: nowrap;
}

.wm-route-templates .wm-template-custom-count {
  color: var(--wm-app-muted, #a8b7ca);
  font-size: 0.76rem;
  font-weight: 700;
  white-space: nowrap;
}

/* Opened custom form remains compact and secondary. */
.wm-route-templates .wm-template-create-panel-collapsible {
  margin: 0 0 10px;
  padding: 16px 18px;
  border-color: rgba(94, 234, 212, 0.34) !important;
}

.wm-route-templates .wm-template-create-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.wm-route-templates .wm-template-create-heading .wm-copy {
  max-width: 760px;
  margin-bottom: 0;
}

.wm-route-templates .wm-template-create-form-compact {
  display: grid;
  grid-template-columns:
    minmax(240px, 1.25fr)
    minmax(150px, 0.65fr)
    minmax(220px, 1fr)
    minmax(130px, 0.55fr);
  gap: 10px 12px;
  align-items: end;
}

.wm-route-templates .wm-template-create-form-compact .wm-field {
  min-width: 0;
}

.wm-route-templates .wm-template-create-form-compact .wm-template-create-summary {
  grid-column: 1 / -2;
}

.wm-route-templates .wm-template-create-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  align-self: end;
}

.wm-route-templates .wm-template-results-header {
  margin-top: 0;
}

@media (max-width: 1180px) {
  .wm-route-templates .wm-template-filter-panel {
    grid-template-columns: minmax(250px, 320px) minmax(0, 1fr);
  }

  .wm-route-templates .wm-template-filter-actions {
    grid-column: 1 / -1;
    justify-content: flex-end;
  }
}

@media (max-width: 880px) {
  .wm-route-templates .wm-template-filter-panel {
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  .wm-route-templates .wm-template-filter-actions {
    grid-column: 1;
    justify-content: space-between;
  }

  .wm-route-templates .wm-template-create-form-compact {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .wm-route-templates .wm-template-create-form-compact .wm-template-create-summary {
    grid-column: 1 / -1;
  }

  .wm-route-templates .wm-template-create-actions {
    grid-column: 1 / -1;
    justify-content: flex-start;
  }
}

@media (max-width: 620px) {
  .wm-route-templates .wm-template-create-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .wm-route-templates .wm-template-create-form-compact {
    grid-template-columns: 1fr;
  }

  .wm-route-templates .wm-template-create-form-compact .wm-template-create-summary,
  .wm-route-templates .wm-template-create-actions {
    grid-column: 1;
  }
}

/* WINGMAN TEMPLATES OPTIONAL CUSTOM FLOW END */
'@

$css = $css.Replace("`r`n", "`n").Replace("`r", "`n")
$css = $css.TrimEnd([char[]]"`r`n") + "`n`n" + $replacementCss.Trim() + "`n"
Write-Utf8NoBom -Path $cssPath -Content $css
Write-Host "Corrected Templates hero and action placement styling." -ForegroundColor Green

# ---------------------------------------------------------------------------
# 4. Validation.
# ---------------------------------------------------------------------------

Write-Host ""
Write-Host "==> TypeScript validation" -ForegroundColor Cyan
Invoke-Npm -Arguments @("run", "typecheck")

Write-Host ""
Write-Host "==> Sales-facing language validation" -ForegroundColor Cyan
Invoke-Npm -Arguments @("run", "check:sales-facing-language")

$packagePath = Join-Path $RepoRoot "package.json"
$packageJson = Get-Content -LiteralPath $packagePath -Raw | ConvertFrom-Json

if ($packageJson.scripts.PSObject.Properties.Name -contains "check:app-page-style") {
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

Write-Host ""
Write-Host "Templates action placement refinement completed." -ForegroundColor Green
Write-Host "Backup: $backupDirectory"
