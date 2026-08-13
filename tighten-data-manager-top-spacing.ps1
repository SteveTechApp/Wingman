$ErrorActionPreference = "Stop"

$Repo = "C:\Users\steve\wingman"
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$CssFile = Join-Path $Repo "src\wingman2\styles\wingman-workflow-theme.css"

function Write-Utf8NoBom($Path, $Text) {
    $utf8 = [System.Text.UTF8Encoding]::new($false)
    [System.IO.File]::WriteAllText($Path, $Text, $utf8)
}

Set-Location $Repo

if (-not (Test-Path $CssFile)) {
    throw "CSS file not found: $CssFile"
}

$Backup = "$CssFile.$Timestamp.bak"
Copy-Item $CssFile $Backup -Force

Write-Host "Backup created:"
Write-Host $Backup

$css = Get-Content $CssFile -Raw

# Remove previous copy if rerun
$css = [regex]::Replace(
    $css,
    '(?s)/\* WINGMAN_DATA_MANAGER_TOP_TIGHTEN_START \*/.*?/\* WINGMAN_DATA_MANAGER_TOP_TIGHTEN_END \*/',
    ''
)

$patch = @'

/* WINGMAN_DATA_MANAGER_TOP_TIGHTEN_START */

/* Reduce wasted space at top of Data Manager */

html[data-wingman-route="data-manager"] .wingman-page-host {
  padding-top: 0 !important;
}

html[data-wingman-route="data-manager"] .wm-data-manager-page {
  padding-top: 2px !important;
}

html[data-wingman-route="data-manager"] .wm-data-manager-header {
  padding-top: 0 !important;
  padding-bottom: 4px !important;
  margin-top: 0 !important;
  margin-bottom: 2px !important;
}

html[data-wingman-route="data-manager"] .wm-data-manager-header .wm-ui-kicker {
  margin-top: 0 !important;
  margin-bottom: 1px !important;
}

html[data-wingman-route="data-manager"] .wm-data-manager-header h1 {
  margin-top: 0 !important;
  margin-bottom: 1px !important;
  line-height: 1 !important;
}

html[data-wingman-route="data-manager"] .wm-data-manager-header p {
  margin-top: 0 !important;
  margin-bottom: 0 !important;
  line-height: 1.15 !important;
}

html[data-wingman-route="data-manager"] .wm-data-tabs {
  margin-top: 3px !important;
  margin-bottom: 4px !important;
}

/* WINGMAN_DATA_MANAGER_TOP_TIGHTEN_END */

'@

$css = $css.TrimEnd() + "`r`n`r`n" + $patch.Trim() + "`r`n"

Write-Utf8NoBom $CssFile $css

npm run typecheck

if ($LASTEXITCODE -ne 0) {
    throw "Typecheck failed."
}

npm run build

if ($LASTEXITCODE -ne 0) {
    throw "Build failed."
}

Write-Host ""
Write-Host "Top spacing reduced."
Write-Host "Restart with: npm run dev"
Write-Host "Then hard refresh Data Manager with Ctrl+Shift+R."