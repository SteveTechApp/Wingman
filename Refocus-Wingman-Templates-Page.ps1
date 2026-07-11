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
$backupDirectory = Join-Path $RepoRoot ".wingman-backups\templates-page-refocus-$timestamp"
New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null

Copy-Item -LiteralPath $pagePath -Destination (Join-Path $backupDirectory "TemplatesPage.tsx") -Force
Copy-Item -LiteralPath $cssPath -Destination (Join-Path $backupDirectory "wingman-style-stack.css") -Force

Write-Host "==> Backup created" -ForegroundColor Cyan
Write-Host $backupDirectory

$page = [System.IO.File]::ReadAllText($pagePath)
$originalPage = $page

# ---------------------------------------------------------------------------
# Add explicit custom-template panel state.
# ---------------------------------------------------------------------------

$stateAnchor = '  const customTemplates = useCustomRoomTemplates();'

if (-not $page.Contains('const [showCustomTemplate, setShowCustomTemplate] = useState(false);')) {
    if (-not $page.Contains($stateAnchor)) {
        throw "Could not locate the customTemplates state anchor."
    }

    $page = $page.Replace(
        $stateAnchor,
        $stateAnchor + "`n  const [showCustomTemplate, setShowCustomTemplate] = useState(false);"
    )
}

# ---------------------------------------------------------------------------
# Close the panel after a successful create.
# ---------------------------------------------------------------------------

$submitResetAnchor = @'
    setNewTemplateSummary("");
'@

if (-not $page.Contains('    setShowCustomTemplate(false);')) {
    if (-not $page.Contains($submitResetAnchor)) {
        throw "Could not locate the custom-template reset block."
    }

    $page = $page.Replace(
        $submitResetAnchor,
        $submitResetAnchor + '    setShowCustomTemplate(false);' + "`n"
    )
}

# ---------------------------------------------------------------------------
# Replace the page header with a compact title + explicit create action.
# ---------------------------------------------------------------------------

$oldHeader = @'
      <header className="wm-page-header wm-template-hero">
        <div>
          <p className="wm-template-kicker wm-ui-kicker">Wingman / Templates</p>
          <h1 className="wm-page-title">Room and application templates</h1>
          <p className="wm-copy">
            Start from a complete governed room solution, filter by vertical, then review the VERIFIED BOM and application-led proposal content.
          </p>
        </div>
      </header>
'@

$newHeader = @'
      <header className="wm-page-header wm-template-hero wm-template-hero-refocused">
        <div className="wm-template-hero-copy">
          <p className="wm-template-kicker wm-ui-kicker">Wingman / Templates</p>
          <h1 className="wm-page-title">Room and application templates</h1>
          <p className="wm-copy">
            Start from a complete governed room solution, filter by vertical, then review the VERIFIED BOM and application-led proposal content.
          </p>
        </div>

        <div className="wm-template-hero-actions">
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
      </header>
'@

if (-not $page.Contains('className="wm-template-hero-actions"')) {
    if (-not $page.Contains($oldHeader)) {
        throw "Could not locate the current Templates page header."
    }

    $page = $page.Replace($oldHeader, $newHeader)
}

# ---------------------------------------------------------------------------
# Replace the always-visible form with an explicitly opened compact panel.
# ---------------------------------------------------------------------------

$oldCreateSection = @'
      <section className="wm-section-card wm-template-create-panel" aria-label="Create a custom template">
        <div>
          <p className="wm-template-kicker wm-ui-kicker">Start from scratch</p>
          <h2 className="wm-section-title">Create a custom template</h2>
          <p className="wm-copy">
            Save a brand-new reusable room template in this browser, then build out its BOM from the review page.
          </p>
        </div>

        <form className="wm-template-create-form" onSubmit={createTemplateFromScratch}>
          <label className="wm-field">
            Name
            <input
              className="wm-input"
              type="text"
              value={newTemplateName}
              onChange={(event) => setNewTemplateName(event.target.value)}
              placeholder="e.g. Council chamber custom room"
              required
            />
          </label>

          <label className="wm-field">
            Vertical
            <input
              className="wm-input"
              type="text"
              value={newTemplateVertical}
              onChange={(event) => setNewTemplateVertical(event.target.value)}
              placeholder="e.g. Government"
            />
          </label>

          <label className="wm-field">
            Application
            <input
              className="wm-input"
              type="text"
              value={newTemplateApplication}
              onChange={(event) => setNewTemplateApplication(event.target.value)}
              placeholder="e.g. Hybrid civic meetings"
            />
          </label>

          <label className="wm-field">
            Scale
            <input
              className="wm-input"
              type="text"
              value={newTemplateScale}
              onChange={(event) => setNewTemplateScale(event.target.value)}
              placeholder="e.g. Custom"
            />
          </label>

          <label className="wm-field wm-template-create-summary">
            Summary
            <textarea
              className="wm-input"
              value={newTemplateSummary}
              onChange={(event) => setNewTemplateSummary(event.target.value)}
              placeholder="Short description of this room design starting point."
              rows={2}
            />
          </label>

          <button type="submit" className="wm-button wm-button-primary">
            Create template
          </button>
        </form>

        {customTemplates.length > 0 ? (
          <p className="wm-copy wm-template-create-confirmation" role="status">
            {customTemplates.length} custom template{customTemplates.length === 1 ? "" : "s"} saved in this browser.
          </p>
        ) : null}
      </section>
'@

$newCreateSection = @'
      {showCustomTemplate ? (
        <section
          id="custom-template-panel"
          className="wm-section-card wm-template-create-panel wm-template-create-panel-collapsible"
          aria-label="Create a custom template"
        >
          <div className="wm-template-create-heading">
            <div>
              <p className="wm-template-kicker wm-ui-kicker">Optional</p>
              <h2 className="wm-section-title">Create a custom template</h2>
              <p className="wm-copy">
                Create a reusable starting point only when none of the governed templates fit the opportunity.
              </p>
            </div>

            <button
              type="button"
              className="wm-button wm-button-ghost"
              onClick={() => setShowCustomTemplate(false)}
            >
              Cancel
            </button>
          </div>

          <form className="wm-template-create-form wm-template-create-form-compact" onSubmit={createTemplateFromScratch}>
            <label className="wm-field wm-template-create-name">
              Name
              <input
                className="wm-input"
                type="text"
                value={newTemplateName}
                onChange={(event) => setNewTemplateName(event.target.value)}
                placeholder="e.g. Council chamber custom room"
                required
                autoFocus
              />
            </label>

            <label className="wm-field">
              Vertical
              <input
                className="wm-input"
                type="text"
                value={newTemplateVertical}
                onChange={(event) => setNewTemplateVertical(event.target.value)}
                placeholder="e.g. Government"
              />
            </label>

            <label className="wm-field">
              Application
              <input
                className="wm-input"
                type="text"
                value={newTemplateApplication}
                onChange={(event) => setNewTemplateApplication(event.target.value)}
                placeholder="e.g. Hybrid civic meetings"
              />
            </label>

            <label className="wm-field">
              Scale
              <input
                className="wm-input"
                type="text"
                value={newTemplateScale}
                onChange={(event) => setNewTemplateScale(event.target.value)}
                placeholder="e.g. Custom"
              />
            </label>

            <label className="wm-field wm-template-create-summary">
              Summary
              <textarea
                className="wm-input"
                value={newTemplateSummary}
                onChange={(event) => setNewTemplateSummary(event.target.value)}
                placeholder="Short description of this room design starting point."
                rows={2}
              />
            </label>

            <div className="wm-template-create-actions">
              <button type="submit" className="wm-button wm-button-primary">
                Create template
              </button>
              <button
                type="button"
                className="wm-button wm-button-secondary"
                onClick={() => setShowCustomTemplate(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      ) : null}
'@

if (-not $page.Contains('wm-template-create-panel-collapsible')) {
    if (-not $page.Contains($oldCreateSection)) {
        throw "Could not locate the existing always-visible custom-template section."
    }

    $page = $page.Replace($oldCreateSection, $newCreateSection)
}

foreach ($marker in @(
    'const [showCustomTemplate, setShowCustomTemplate] = useState(false);',
    'aria-controls="custom-template-panel"',
    'wm-template-hero-actions',
    'showCustomTemplate ? (',
    'wm-template-create-panel-collapsible',
    'wm-template-create-form-compact',
    'setShowCustomTemplate(false);'
)) {
    if (-not $page.Contains($marker)) {
        throw "Templates page refocus marker is missing: $marker"
    }
}

$page = $page.Replace("`r`n", "`n").Replace("`r", "`n")
$page = $page.TrimEnd([char[]]"`r`n") + "`n"
Write-Utf8NoBom -Path $pagePath -Content $page
Write-Host "Refocused TemplatesPage.tsx." -ForegroundColor Green

# ---------------------------------------------------------------------------
# Add a compact, targeted CSS layer.
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

$targetedCss = @'
/* WINGMAN TEMPLATES OPTIONAL CUSTOM FLOW START */

.wm-route-templates .wm-template-hero-refocused {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.wm-route-templates .wm-template-hero-copy {
  min-width: 0;
  max-width: 920px;
}

.wm-route-templates .wm-template-hero-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 10px;
}

.wm-route-templates .wm-template-custom-count {
  color: var(--wm-app-muted, #a8b7ca);
  font-size: 0.78rem;
  font-weight: 700;
  white-space: nowrap;
}

.wm-route-templates .wm-template-filter-panel {
  margin-bottom: 10px;
}

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

@media (max-width: 1080px) {
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

@media (max-width: 720px) {
  .wm-route-templates .wm-template-hero-refocused,
  .wm-route-templates .wm-template-create-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .wm-route-templates .wm-template-hero-actions {
    justify-content: space-between;
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
$css = $css.TrimEnd([char[]]"`r`n") + "`n`n" + $targetedCss.Trim() + "`n"
Write-Utf8NoBom -Path $cssPath -Content $css
Write-Host "Added compact Templates page styling." -ForegroundColor Green

# ---------------------------------------------------------------------------
# Validation.
# ---------------------------------------------------------------------------

Write-Host ""
Write-Host "==> TypeScript validation" -ForegroundColor Cyan
Invoke-Npm -Arguments @("run", "typecheck")

Write-Host ""
Write-Host "==> Sales-facing language validation" -ForegroundColor Cyan
Invoke-Npm -Arguments @("run", "check:sales-facing-language")

$packageJson = Get-Content -LiteralPath (Join-Path $RepoRoot "package.json") -Raw | ConvertFrom-Json
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
Write-Host "==> Relevant diff" -ForegroundColor Cyan
$diff = Invoke-NativeCaptured -Command $git -Arguments @(
    "diff",
    "--",
    "src/wingman2/pages/TemplatesPage.tsx",
    "src/wingman2/styles/wingman-style-stack.css"
)
$diff.Lines | ForEach-Object { Write-Host $_ }

Write-Host ""
Write-Host "Templates page refocus completed." -ForegroundColor Green
Write-Host "Backup: $backupDirectory"
