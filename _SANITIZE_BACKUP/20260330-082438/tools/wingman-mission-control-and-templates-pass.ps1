param(
  [string]$Root = "C:\Users\steve\wingman"
)

$ErrorActionPreference = "Stop"
$utf8 = New-Object System.Text.UTF8Encoding($false)

function Save-Utf8NoBom {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Content
  )

  $dir = Split-Path $Path -Parent
  if ($dir -and -not (Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }

  [System.IO.File]::WriteAllText($Path, $Content, $utf8)
}

function Update-FileText {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][scriptblock]$Transform
  )

  if (-not (Test-Path $Path)) {
    throw "File not found: $Path"
  }

  $old = Get-Content -Path $Path -Raw
  $new = & $Transform $old

  if (-not ($new -is [string])) {
    throw "Transform for $Path did not return a string."
  }

  if ($new -ne $old) {
    [System.IO.File]::WriteAllText($Path, $new, $utf8)
    Write-Host "Updated: $Path" -ForegroundColor Green
  }
  else {
    Write-Host "No change: $Path" -ForegroundColor DarkYellow
  }
}

if (-not (Test-Path $Root)) {
  throw "Root path not found: $Root"
}

Set-Location $Root

$navPath = Join-Path $Root "src\ui2\nav\MissionControlNav.tsx"
$cssPath = Join-Path $Root "src\styles\wm-final-override-pass.css"
$templatesPath = Join-Path $Root "src\features\templates\TemplatesPage.tsx"

# -------------------------------------------------
# 1) Replace MissionControlNav with clean classed version
# -------------------------------------------------
$navContent = @'
import { useLocation, useNavigate } from "react-router-dom";

type NavItem = {
  label: string;
  route: string;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const sections: NavSection[] = [
  {
    title: "Start",
    items: [
      { label: "Dashboard", route: "/app/dashboard" },
      { label: "Tools", route: "/app/tools" },
      { label: "Projects", route: "/app/projects" },
    ],
  },
  {
    title: "Capture",
    items: [
      { label: "Discovery", route: "/app/tools/discovery" },
      { label: "Import", route: "/app/tools/import-intake" },
      { label: "Room", route: "/app/tools/room-wizard" },
    ],
  },
  {
    title: "Design",
    items: [
      { label: "Catalogue", route: "/app/tools/catalog" },
      { label: "Compare", route: "/app/tools/compare" },
      { label: "Navigator", route: "/app/tools/navigator" },
      { label: "Video Wall", route: "/app/tools/video-wall" },
    ],
  },
  {
    title: "Deliver",
    items: [
      { label: "Proposal", route: "/app/tools/proposal" },
      { label: "Templates", route: "/app/tools/templates" },
      { label: "Training", route: "/app/tools/training" },
      { label: "Guru", route: "/app/tools/guru" },
    ],
  },
];

export default function MissionControlNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="wm-nav" aria-label="Mission Control">
      {sections.map((section) => (
        <section key={section.title} className="wm-nav__section">
          <div className="wm-nav__title">{section.title}</div>

          <div className="wm-nav__items">
            {section.items.map((item) => {
              const active =
                location.pathname === item.route ||
                location.pathname.startsWith(item.route + "/");

              return (
                <button
                  key={item.route}
                  type="button"
                  className={`wm-nav__item${active ? " wm-nav__item--active" : ""}`}
                  aria-current={active ? "page" : undefined}
                  onClick={() => navigate(item.route)}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </nav>
  );
}
'@
Save-Utf8NoBom -Path $navPath -Content $navContent

# -------------------------------------------------
# 2) Append mission control styling if missing
# -------------------------------------------------
$navCss = @'

/* -----------------------------------------
   MISSION CONTROL REAL STYLING
----------------------------------------- */

.wm-nav {
  display: grid;
  gap: 14px;
  padding: 12px;
}

.wm-nav__section {
  display: grid;
  gap: 8px;
}

.wm-nav__title {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(148,163,184,0.70);
}

.wm-nav__items {
  display: grid;
  gap: 6px;
}

.wm-nav__item {
  appearance: none;
  border: 1px solid rgba(148,163,184,0.12);
  background: rgba(255,255,255,0.04);
  color: #e2e8f0;
  border-radius: 10px;
  padding: 8px 10px;
  min-height: 36px;
  font-size: 12px;
  font-weight: 700;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
  transition: all 120ms ease;
}

.wm-nav__item:hover {
  background: rgba(255,255,255,0.08);
  transform: translateY(-1px);
}

.wm-nav__item--active {
  background: linear-gradient(135deg, rgba(37,99,235,0.35), rgba(56,189,248,0.25));
  border-color: rgba(96,165,250,0.28);
  color: #ffffff;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
}
'@

if (Test-Path $cssPath) {
  $css = Get-Content -Path $cssPath -Raw
} else {
  $css = ""
}

if ($css -notmatch 'MISSION CONTROL REAL STYLING') {
  $css = $css.TrimEnd() + "`r`n`r`n" + $navCss
  Save-Utf8NoBom -Path $cssPath -Content $css
  Write-Host "Updated: $cssPath" -ForegroundColor Green
} else {
  Write-Host "No change: $cssPath" -ForegroundColor DarkYellow
}

# -------------------------------------------------
# 3) Templates page: add adopt class if possible
# -------------------------------------------------
if (Test-Path $templatesPath) {
  Update-FileText -Path $templatesPath -Transform {
    param($text)

    if ($text -match 'className="wm-page"' -and $text -notmatch 'className="wm-page wmu-adopt"') {
      $text = $text -replace 'className="wm-page"', 'className="wm-page wmu-adopt"'
    }

    if ($text -match 'className="wm-fit-page"' -and $text -notmatch 'className="wm-fit-page wmu-adopt"') {
      $text = $text -replace 'className="wm-fit-page"', 'className="wm-fit-page wmu-adopt"'
    }

    return $text
  }
}

# -------------------------------------------------
# 4) Clean restart
# -------------------------------------------------
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process esbuild -ErrorAction SilentlyContinue | Stop-Process -Force

$viteCachePath = Join-Path $Root "node_modules\.vite"
if (Test-Path $viteCachePath) {
  Remove-Item $viteCachePath -Recurse -Force
}

Set-Location $Root
npm run dev