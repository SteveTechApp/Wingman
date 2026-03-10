[CmdletBinding()]
param(
    [switch]$Apply,
    [string]$RepoRoot = (Get-Location).Path
)

$ErrorActionPreference = "Stop"
if (-not $Apply) { throw "Run with -Apply" }

function Ensure-Directory {
    param([string]$Path)
    if ($Path -and -not (Test-Path $Path)) {
        New-Item -ItemType Directory -Force -Path $Path | Out-Null
    }
}

function Save-Utf8NoBom {
    param([string]$Path,[string]$Content)
    $parent = Split-Path $Path -Parent
    Ensure-Directory $parent
    [System.IO.File]::WriteAllText($Path,$Content,[System.Text.UTF8Encoding]::new($false))
}

function Backup-IfExists {
    param([string]$Path,[string]$BackupRoot,[string]$RepoRoot)
    if (-not (Test-Path $Path)) { return }
    $resolved = (Resolve-Path $Path).Path
    $rel = $resolved.Substring($RepoRoot.Length).TrimStart("\")
    $dest = Join-Path $BackupRoot $rel
    Ensure-Directory (Split-Path $dest -Parent)
    Copy-Item $resolved $dest -Force
}

$RepoRoot = (Resolve-Path $RepoRoot).Path
Set-Location $RepoRoot

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$rescue = Join-Path $RepoRoot "_RESCUE_UiNavigationClarity_$stamp"
Ensure-Directory $rescue

$tokensPath = Join-Path $RepoRoot "src\design\system\tokens.css"
$layoutPath = Join-Path $RepoRoot "src\design\system\layout.css"
$componentsPath = Join-Path $RepoRoot "src\design\system\components.css"

@($tokensPath,$layoutPath,$componentsPath) | ForEach-Object {
    Backup-IfExists -Path $_ -BackupRoot $rescue -RepoRoot $RepoRoot
}

# -------------------------------------------------------------------
# tokens.css
# -------------------------------------------------------------------

if (Test-Path $tokensPath) {
    $tokensRaw = Get-Content $tokensPath -Raw
    $tokensPatched = $tokensRaw

    $tokenBlock = @'

/* ===== Wingman navigation clarity tokens ===== */
:root{
  --wm-panel-strong: rgba(14, 27, 44, 0.98);
  --wm-panel-soft: rgba(255,255,255,0.025);
  --wm-border-focus: rgba(59,212,208,0.34);
  --wm-border-active: rgba(59,212,208,0.28);
  --wm-border-hover: rgba(119,166,230,0.22);
  --wm-highlight: rgba(59,212,208,0.14);
  --wm-highlight-strong: rgba(59,212,208,0.22);
  --wm-highlight-blue: rgba(75,141,255,0.16);
  --wm-highlight-orange: rgba(242,140,40,0.16);
  --wm-shadow-nav: 0 10px 28px rgba(0,0,0,0.22);
  --wm-shadow-card-strong: 0 18px 40px rgba(0,0,0,0.22);
}
'@

    if ($tokensPatched -notmatch 'Wingman navigation clarity tokens') {
        $tokensPatched = $tokensPatched.TrimEnd() + "`r`n`r`n" + $tokenBlock.Trim() + "`r`n"
    }

    if ($tokensPatched -ne $tokensRaw) {
        Save-Utf8NoBom -Path $tokensPath -Content $tokensPatched
    }
}

# -------------------------------------------------------------------
# layout.css
# -------------------------------------------------------------------

$layoutRaw = if (Test-Path $layoutPath) { Get-Content $layoutPath -Raw } else { "" }

$layoutBlock = @'

/* ===== Wingman UI navigation clarity pass ===== */

.wm-shell-root{
  background:
    radial-gradient(circle at top right, rgba(41,99,182,0.12), transparent 24%),
    linear-gradient(180deg, #07111d 0%, #07131f 100%);
}

.wm-shell-body{
  gap: 0;
}

.wm-shell-nav{
  background:
    linear-gradient(180deg, rgba(8,18,31,0.98) 0%, rgba(7,17,29,0.98) 100%);
  border-right: 1px solid rgba(119,166,230,0.12);
  box-shadow: inset -1px 0 0 rgba(255,255,255,0.02);
}

.wm-shell-main{
  padding: 20px;
}

.wm-page{
  gap: 20px;
}

.wm-page-header{
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.wm-nav{
  gap: 20px;
}

.wm-nav__top{
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.wm-nav__active-card{
  background: linear-gradient(180deg, rgba(13,26,42,0.98), rgba(10,21,34,0.98));
  border: 1px solid rgba(119,166,230,0.14);
  box-shadow: var(--wm-shadow-nav);
}

.wm-nav__sections{
  gap: 22px;
}

.wm-nav__section{
  gap: 10px;
}

.wm-nav__section-title{
  padding-left: 2px;
}

.wm-nav__list{
  gap: 10px;
}

.wm-nav__item{
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.02));
  border: 1px solid rgba(119,166,230,0.10);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.02);
  transition: background 140ms ease, border-color 140ms ease, transform 140ms ease;
}

.wm-nav__item::before{
  content: "";
  position: absolute;
  left: 0;
  top: 10px;
  bottom: 10px;
  width: 3px;
  border-radius: 999px;
  background: transparent;
  transition: background 140ms ease;
}

.wm-nav__item:hover{
  background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.03));
  border-color: var(--wm-border-hover);
  transform: translateY(-1px);
}

.wm-nav__item:hover::before{
  background: rgba(75,141,255,0.36);
}

.wm-nav__item.is-active{
  background: linear-gradient(180deg, rgba(59,212,208,0.14), rgba(59,212,208,0.09));
  border-color: var(--wm-border-active);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.04),
    0 0 0 1px rgba(59,212,208,0.06);
}

.wm-nav__item.is-active::before{
  background: rgba(59,212,208,0.9);
}

.wm-nav__item-badge{
  background: linear-gradient(180deg, rgba(75,141,255,0.18), rgba(75,141,255,0.10));
  border-color: rgba(75,141,255,0.22);
}

.wm-nav__item.is-active .wm-nav__item-badge{
  background: linear-gradient(180deg, rgba(59,212,208,0.34), rgba(59,212,208,0.18));
  border-color: rgba(59,212,208,0.30);
  color: #eefcff;
}

.wm-nav__item-title{
  color: #f2f7ff;
}

.wm-nav__item-desc{
  color: rgba(236,244,255,0.72);
}

.wm-nav__collapse{
  background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.03));
  border-color: rgba(119,166,230,0.16);
}

.wm-nav__collapse:hover{
  background: linear-gradient(180deg, rgba(59,212,208,0.14), rgba(59,212,208,0.08));
  border-color: rgba(59,212,208,0.26);
}

.wm-mc-intelligence,
.wm-mc-summary,
.wm-mc-readiness,
.wm-mc-architecture,
.wm-mc-solution,
.wm-mc-realbom,
.wm-discovery-bridge,
.wm-ui__card,
.wm-card{
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.02);
}

.wm-wizard-progress{
  padding: 6px 0 2px;
}

.wm-wizard-step{
  border-color: rgba(119,166,230,0.14);
  background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02));
}

.wm-wizard-step.active{
  background: linear-gradient(180deg, rgba(59,212,208,0.16), rgba(59,212,208,0.10));
  border-color: rgba(59,212,208,0.28);
}

.wm-wizard-divider{
  background: linear-gradient(90deg, rgba(255,255,255,0.02), rgba(119,166,230,0.12), rgba(255,255,255,0.02));
}

.wm-ui__miniItem{
  background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.025));
  border-color: rgba(119,166,230,0.12);
}

.wm-footer{
  border-top: 1px solid rgba(255,255,255,0.05);
  background: rgba(5,12,21,0.72);
}
'@

$layoutPatched = $layoutRaw
$layoutPatched = [regex]::Replace($layoutPatched,'(?s)/\* ===== Wingman UI navigation clarity pass ===== \*/.*?(?=(/\* =====)|\z)','')
$layoutPatched = $layoutPatched.TrimEnd() + "`r`n`r`n" + $layoutBlock.Trim() + "`r`n"

Save-Utf8NoBom -Path $layoutPath -Content $layoutPatched

# -------------------------------------------------------------------
# components.css
# -------------------------------------------------------------------

$componentsRaw = if (Test-Path $componentsPath) { Get-Content $componentsPath -Raw } else { "" }

$componentBlock = @'

/* ===== Wingman UI navigation clarity pass ===== */

.wm-card{
  background: linear-gradient(180deg, rgba(13,26,42,0.96), rgba(10,21,34,0.96));
  border-color: rgba(119,166,230,0.12);
}

.wm-kpi-card{
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(119,166,230,0.08);
  background: rgba(255,255,255,0.02);
}

.wm-kpi-label{
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 700;
  color: rgba(236,244,255,0.54);
}

.wm-btn,
.wm-ui__btn{
  border: 1px solid rgba(119,166,230,0.14);
  background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.025));
  color: #eef4ff;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.02);
  transition: background 140ms ease, border-color 140ms ease, transform 140ms ease;
}

.wm-btn:hover,
.wm-ui__btn:hover{
  border-color: rgba(119,166,230,0.24);
  background: linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.04));
  transform: translateY(-1px);
}

.wm-btn-primary,
.wm-ui__btn--primary{
  background: linear-gradient(180deg, rgba(60,223,216,1), rgba(34,199,184,0.98));
  color: #052424;
  border-color: transparent;
  box-shadow:
    0 8px 20px rgba(34,199,184,0.20),
    inset 0 1px 0 rgba(255,255,255,0.18);
}

.wm-btn-primary:hover,
.wm-ui__btn--primary:hover{
  background: linear-gradient(180deg, rgba(92,230,224,1), rgba(44,208,194,1));
}

.wm-ui__btn--ghost{
  background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015));
}

.wm-input,
.wm-ui__input,
.wm-ui__select,
.wm-ui__textarea{
  background: linear-gradient(180deg, rgba(8,18,31,0.96), rgba(9,20,34,0.96));
  border: 1px solid rgba(119,166,230,0.12);
  color: #eef4ff;
}

.wm-input:focus,
.wm-ui__input:focus,
.wm-ui__select:focus,
.wm-ui__textarea:focus{
  border-color: rgba(59,212,208,0.34);
  box-shadow: 0 0 0 1px rgba(59,212,208,0.16);
  outline: none;
}

.wm-ui__label{
  color: rgba(236,244,255,0.78);
}

.wm-badge,
.wm-ui__chip{
  background: linear-gradient(180deg, rgba(75,141,255,0.12), rgba(75,141,255,0.08));
  border: 1px solid rgba(75,141,255,0.16);
  color: #e8f2ff;
}

.wm-ui__chip--active,
.wm-badge.is-active{
  background: linear-gradient(180deg, rgba(59,212,208,0.18), rgba(59,212,208,0.10));
  border-color: rgba(59,212,208,0.26);
  color: #eefcff;
}

.wm-mc-confidence.is-low{
  background: linear-gradient(180deg, rgba(242,140,40,0.18), rgba(242,140,40,0.10));
  border-color: rgba(242,140,40,0.26);
}

.wm-mc-confidence.is-medium{
  background: linear-gradient(180deg, rgba(75,141,255,0.18), rgba(75,141,255,0.10));
  border-color: rgba(75,141,255,0.26);
}

.wm-mc-confidence.is-high{
  background: linear-gradient(180deg, rgba(62,220,133,0.18), rgba(62,220,133,0.10));
  border-color: rgba(62,220,133,0.26);
}

.wm-nav__active-card,
.wm-discovery-bridge,
.wm-ui__miniItem{
  box-shadow: var(--wm-shadow-nav);
}
'@

$componentsPatched = $componentsRaw
$componentsPatched = [regex]::Replace($componentsPatched,'(?s)/\* ===== Wingman UI navigation clarity pass ===== \*/.*?(?=(/\* =====)|\z)','')
$componentsPatched = $componentsPatched.TrimEnd() + "`r`n`r`n" + $componentBlock.Trim() + "`r`n"

Save-Utf8NoBom -Path $componentsPath -Content $componentsPatched

Write-Host ""
Write-Host "Wingman UI navigation clarity pass applied." -ForegroundColor Green
Write-Host ("Backup folder: {0}" -f $rescue) -ForegroundColor Yellow
Write-Host ""
Write-Host "Run next:" -ForegroundColor Cyan
Write-Host "  npm run typecheck" -ForegroundColor White
Write-Host "  npm run dev" -ForegroundColor White