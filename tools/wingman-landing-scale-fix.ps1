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
$rescue = Join-Path $RepoRoot "_RESCUE_LandingScaleFix_$stamp"
Ensure-Directory $rescue

$layoutPath = Join-Path $RepoRoot "src\design\system\layout.css"
$componentsPath = Join-Path $RepoRoot "src\design\system\components.css"
$tokensPath = Join-Path $RepoRoot "src\design\system\tokens.css"

@($layoutPath,$componentsPath,$tokensPath) | ForEach-Object {
    Backup-IfExists -Path $_ -BackupRoot $rescue -RepoRoot $RepoRoot
}

# -------------------------------------------------------------------
# tokens.css: slightly stronger base sizing
# -------------------------------------------------------------------

if (Test-Path $tokensPath) {
    $tokensRaw = Get-Content $tokensPath -Raw
    $tokensPatched = $tokensRaw

    $tokensPatched = $tokensPatched -replace '--wm-fs-body:\s*14px;','--wm-fs-body: 15px;'
    $tokensPatched = $tokensPatched -replace '--wm-fs-card:\s*16px;','--wm-fs-card: 17px;'
    $tokensPatched = $tokensPatched -replace '--wm-fs-section:\s*20px;','--wm-fs-section: 24px;'
    $tokensPatched = $tokensPatched -replace '--wm-fs-page:\s*32px;','--wm-fs-page: 44px;'
    $tokensPatched = $tokensPatched -replace '--wm-btn-h:\s*36px;','--wm-btn-h: 40px;'
    $tokensPatched = $tokensPatched -replace '--wm-page-pad:\s*18px;','--wm-page-pad: 20px;'
    $tokensPatched = $tokensPatched -replace '--wm-gap:\s*16px;','--wm-gap: 18px;'

    if ($tokensPatched -ne $tokensRaw) {
        Save-Utf8NoBom -Path $tokensPath -Content $tokensPatched
    }
}

# -------------------------------------------------------------------
# layout.css: replace landing blocks with better scale
# -------------------------------------------------------------------

$layoutRaw = if (Test-Path $layoutPath) { Get-Content $layoutPath -Raw } else { "" }

$landingCss = @'

/* ===== Wingman landing scale fix ===== */

.wm-landing-page{
  display:flex;
  flex-direction:column;
  gap:32px;
}

.wm-landing-hero{
  width:100%;
  padding:48px 28px 20px;
  display:flex;
  justify-content:center;
  background:
    radial-gradient(circle at 50% -8%, rgba(45,138,255,0.16), transparent 36%),
    linear-gradient(180deg, rgba(2,8,23,1) 0%, rgba(4,14,28,1) 100%);
}

.wm-landing-hero-inner{
  width:100%;
  max-width:1320px;
}

.wm-landing-hero-panel{
  width:100%;
  padding:12px 0 6px;
  display:flex;
  flex-direction:column;
  gap:22px;
  background:transparent;
  border:none;
  box-shadow:none;
}

.wm-landing-brand{
  display:flex;
  flex-direction:column;
  align-items:center;
  text-align:center;
  gap:16px;
}

.wm-landing-logo{
  width:auto;
  max-width:420px;
  max-height:112px;
  height:auto;
  object-fit:contain;
  filter:drop-shadow(0 0 18px rgba(59,212,208,0.14));
}

.wm-landing-brand-copy{
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:10px;
  max-width:980px;
  margin:0 auto;
}

.wm-landing-kicker{
  font-size:13px;
  font-weight:700;
  letter-spacing:0.06em;
  text-transform:uppercase;
  color:rgba(236,244,255,0.68);
}

.wm-landing-title{
  margin:0;
  font-size:clamp(36px,4.2vw,58px);
  line-height:1.03;
  font-weight:800;
  letter-spacing:-0.03em;
  max-width:980px;
}

.wm-landing-subtitle{
  margin:0;
  max-width:860px;
  font-size:18px;
  line-height:1.5;
  color:rgba(236,244,255,0.78);
}

.wm-landing-actions{
  margin-top:8px;
  display:flex;
  justify-content:center;
  gap:16px;
  flex-wrap:wrap;
}

.wm-landing-pill-row{
  display:flex;
  justify-content:center;
  gap:10px;
  flex-wrap:wrap;
}

.wm-landing-section{
  width:100%;
  max-width:1320px;
  margin:0 auto;
  padding:0 28px;
}

.wm-landing-section-head{
  display:grid;
  grid-template-columns:minmax(0,1.2fr) minmax(280px,0.8fr);
  gap:18px;
  align-items:end;
  margin-bottom:16px;
}

.wm-landing-section-kicker{
  font-size:12px;
  font-weight:700;
  letter-spacing:0.08em;
  text-transform:uppercase;
  color:rgba(236,244,255,0.58);
  margin-bottom:6px;
}

.wm-landing-section-title{
  margin:0;
}

.wm-landing-section-copy{
  margin:0;
  font-size:15px;
  line-height:1.55;
}

.wm-landing-workflow-strip{
  margin-top:6px;
  padding:20px;
  display:flex;
  flex-direction:column;
  gap:14px;
}

.wm-landing-workflow-row{
  display:flex;
  align-items:center;
  justify-content:center;
  gap:12px;
  flex-wrap:wrap;
}

.wm-landing-workflow-step{
  display:inline-flex;
  align-items:center;
  gap:10px;
  min-height:42px;
  padding:0 14px;
  border-radius:999px;
  background:rgba(255,255,255,0.04);
  border:1px solid rgba(119,166,230,0.14);
  font-weight:700;
  font-size:14px;
}

.wm-landing-workflow-index{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  width:28px;
  height:28px;
  border-radius:999px;
  background:rgba(40,205,210,0.12);
  border:1px solid rgba(40,205,210,0.20);
  font-size:11px;
  font-weight:800;
}

.wm-landing-workflow-arrow{
  color:rgba(236,244,255,0.56);
  font-size:18px;
  font-weight:700;
}

.wm-landing-workflow-copy{
  margin:0;
  text-align:center;
  font-size:15px;
}

.wm-landing-feature-grid{
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr));
  gap:16px;
}

.wm-landing-feature-card{
  min-height:188px;
  padding:18px;
  display:flex;
  flex-direction:column;
  gap:10px;
}

.wm-landing-card-kicker{
  font-size:12px;
  font-weight:700;
  letter-spacing:0.08em;
  text-transform:uppercase;
  color:rgba(236,244,255,0.60);
}

.wm-landing-card-title{
  margin:0;
  font-size:22px;
  line-height:1.15;
}

.wm-landing-card-copy{
  margin:0;
  font-size:15px;
  line-height:1.55;
}

@media (max-width: 1180px){
  .wm-landing-feature-grid{
    grid-template-columns:repeat(2,minmax(0,1fr));
  }

  .wm-landing-section-head{
    grid-template-columns:1fr;
    align-items:start;
  }
}

@media (max-width: 760px){
  .wm-landing-hero{
    padding:28px 16px 12px;
  }

  .wm-landing-section{
    padding:0 16px;
  }

  .wm-landing-feature-grid{
    grid-template-columns:1fr;
  }

  .wm-landing-logo{
    max-width:300px;
    max-height:82px;
  }

  .wm-landing-title{
    font-size:clamp(30px,8vw,40px);
  }

  .wm-landing-subtitle{
    font-size:16px;
  }

  .wm-landing-workflow-row{
    justify-content:flex-start;
  }

  .wm-landing-workflow-copy{
    text-align:left;
  }
}
'@

# strip prior landing override blocks by section headers if present
$layoutPatched = $layoutRaw
$layoutPatched = [regex]::Replace($layoutPatched,'(?s)/\* ===== Wingman landing workflow gateway ===== \*/.*?(?=(/\* =====)|\z)','')
$layoutPatched = [regex]::Replace($layoutPatched,'(?s)/\* ===== Wingman landing scale fix ===== \*/.*?(?=(/\* =====)|\z)','')
$layoutPatched = $layoutPatched.TrimEnd() + "`r`n`r`n" + $landingCss.Trim() + "`r`n"

Save-Utf8NoBom -Path $layoutPath -Content $layoutPatched

# -------------------------------------------------------------------
# components.css: make landing badges/buttons read better
# -------------------------------------------------------------------

$componentsRaw = if (Test-Path $componentsPath) { Get-Content $componentsPath -Raw } else { "" }

$componentsAdd = @'

/* ===== Wingman landing scale fix components ===== */

.wm-landing-page .wm-badge{
  min-height: 30px;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 700;
}

.wm-landing-page .wm-btn{
  min-width: 150px;
  height: 40px;
  padding: 0 14px;
  font-size: 14px;
  font-weight: 700;
}
'@

$componentsPatched = $componentsRaw
$componentsPatched = [regex]::Replace($componentsPatched,'(?s)/\* ===== Wingman landing scale fix components ===== \*/.*?(?=(/\* =====)|\z)','')
$componentsPatched = $componentsPatched.TrimEnd() + "`r`n`r`n" + $componentsAdd.Trim() + "`r`n"

Save-Utf8NoBom -Path $componentsPath -Content $componentsPatched

Write-Host ""
Write-Host "Wingman landing scale fix applied." -ForegroundColor Green
Write-Host ("Backup folder: {0}" -f $rescue) -ForegroundColor Yellow
Write-Host ""
Write-Host "Run next:" -ForegroundColor Cyan
Write-Host "  npm run dev" -ForegroundColor White