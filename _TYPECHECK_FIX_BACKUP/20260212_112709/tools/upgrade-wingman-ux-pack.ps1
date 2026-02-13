<#
tools\upgrade-wingman-ux-pack.ps1

Implements 4 upgrades:
1) Graphic logos everywhere (landing uses heroLogo.png, app header uses wyrestorm-wingman-logo.png) + logo clickable
2) Universal header + footer navigation on all authenticated pages (AppShell)
3) ToolHub wiring: ensure all available applets appear as tiles linking to real routes
4) Landing page conversion polish: CTA emphasis + fix bad © encoding

Run:
  pwsh -NoProfile -ExecutionPolicy Bypass -File tools\upgrade-wingman-ux-pack.ps1
#>

param(
  [string]$Root = "C:\Users\steve\wingman",
  [switch]$WhatIf
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Utf8NoBom([string]$Path, [string]$Content) {
  if ($WhatIf) { Write-Host "[WhatIf] Write $Path"; return }
  [System.IO.File]::WriteAllText($Path, $Content, [System.Text.UTF8Encoding]::new($false))
}

function Backup-File([string]$Path) {
  if (!(Test-Path $Path)) { return }
  $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $bak = "$Path.bak_$stamp"
  if ($WhatIf) { Write-Host "[WhatIf] Backup $Path -> $bak"; return }
  Copy-Item $Path $bak -Force
}

function Ensure-Dir([string]$Dir) {
  if ($WhatIf) { Write-Host "[WhatIf] Ensure dir $Dir"; return }
  New-Item -ItemType Directory -Force -Path $Dir | Out-Null
}

function Replace-OrThrow([string]$Text, [string]$Pattern, [string]$Replacement, [string]$Err) {
  $n = [regex]::Replace($Text, $Pattern, $Replacement, "Singleline")
  if ($n -eq $Text) { throw $Err }
  return $n
}

function Safe-Replace([string]$Text, [string]$Pattern, [string]$Replacement) {
  return [regex]::Replace($Text, $Pattern, $Replacement, "Singleline")
}

# -------------------- Validate root --------------------
if (!(Test-Path $Root)) { throw "Root not found: $Root" }
Set-Location $Root

$landingPath  = Join-Path $Root "src\pages\PublicLandingPage.tsx"
$appShellPath = Join-Path $Root "src\layout\AppShell.tsx"
$toolHubPath  = Join-Path $Root "src\pages\ToolHubPage.tsx"
$footerPath   = Join-Path $Root "src\components\layout\AppFooter.tsx"

$logoHero = Join-Path $Root "src\assets\branding\heroLogo.png"
$logoApp  = Join-Path $Root "src\assets\branding\wyrestorm-wingman-logo.png"

if (!(Test-Path $logoHero)) { Write-Warning "Missing: $logoHero (landing will still import it and Vite will error until file exists)" }
if (!(Test-Path $logoApp))  { Write-Warning "Missing: $logoApp  (header will still import it and Vite will error until file exists)" }

# ======================================================
# (1) Landing page: use heroLogo.png graphic, better CTA, fix © encoding
# ======================================================
if (Test-Path $landingPath) {
  Backup-File $landingPath
  $t = Get-Content $landingPath -Raw

  # Ensure imports
  if ($t -notmatch 'from\s+"react-router-dom"') {
    throw "PublicLandingPage.tsx missing react-router-dom import; open file and confirm structure."
  }
  if ($t -notmatch 'heroLogo\.png') {
    # ensure import heroLogo
    if ($t -match 'import\s+.*from\s+"react-router-dom";') {
      $t = $t -replace '(import\s+\{[^}]*Link[^}]*\}\s+from\s+"react-router-dom";\s*)',
        "`$1`nimport heroLogo from `"`@/assets/branding/heroLogo.png`";`n"
    } elseif ($t -match 'import\s+\{?\s*Link[^}]*\}?\s+from\s+"react-router-dom";') {
      $t = $t -replace '(import\s+\{?\s*Link[^;]*;\s*)',
        "`$1`nimport heroLogo from `"`@/assets/branding/heroLogo.png`";`n"
    } else {
      # fallback: insert near top
      $t = "import heroLogo from `"`@/assets/branding/heroLogo.png`";`n" + $t
    }
  }

  # Fix broken Â© occurrences anywhere in file
  $t = $t -replace 'Â©', '©'

  # Ensure the header uses image logo (replace any text brand block heuristically)
  # Look for <header ...> ... </header> and ensure it includes the img.
  if ($t -match '(?s)<header[^>]*>.*?</header>') {
    $t = [regex]::Replace($t, '(?s)<header[^>]*>.*?</header>', {
      @"
<header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
  <Link to="/" className="flex items-center gap-3">
    <img src={heroLogo} alt="WyreStorm Wingman" className="h-14 w-auto" />
  </Link>
  <nav className="flex items-center gap-3">
    <Link className="inline-flex items-center justify-center rounded-xl px-5 py-2.5 font-semibold transition border border-white/20 text-white/90 hover:bg-white/5" to="/login">Log in</Link>
    <Link className="inline-flex items-center justify-center rounded-xl px-5 py-2.5 font-semibold transition border border-emerald-400 bg-emerald-500 text-black hover:bg-emerald-400" to="/signup">Create account</Link>
  </nav>
</header>
"@
    }, 1)
  }

  # Ensure hero CTA buttons encourage signup + enter workspace + guru
  if ($t -match 'AV Sales\. Simplified\.') {
    # If the file is your rewritten version, keep it; otherwise, inject a conversion CTA block under the H1.
    if ($t -notmatch 'Create free account|Create account|Create free') {
      $t = $t -replace '(AV Sales\. Simplified\.[\s\S]*?</h1>)',
        "`$1`n<p className=`"mx-auto mt-5 max-w-2xl text-white/75`">Design systems faster, compare competitors confidently, and generate proposals in minutes — from one guided workspace.</p>`n" +
        "<div className=`"mt-8 flex flex-col sm:flex-row items-center justify-center gap-3`">" +
        "<Link className=`"inline-flex items-center justify-center rounded-xl px-6 py-3 font-semibold transition border border-emerald-400 bg-emerald-500 text-black hover:bg-emerald-400`" to=`"/signup`">Create free account</Link>" +
        "<Link className=`"inline-flex items-center justify-center rounded-xl px-6 py-3 font-semibold transition border border-white/20 text-white/90 hover:bg-white/5`" to=`"/app/dashboard`">Enter workspace</Link>" +
        "<Link className=`"inline-flex items-center justify-center rounded-xl px-6 py-3 font-semibold transition border border-white/20 text-white/90 hover:bg-white/5`" to=`"/app/tools/ask`">Ask Wingman (Guru)</Link>" +
        "</div>`n"
    }
  }

  # Ensure footer uses correct ©
  $t = $t -replace '©\s*\{new Date\(\)\.getFullYear\(\)\}[^<]*', '© {new Date().getFullYear()} WyreStorm Technologies — Wingman'

  Write-Utf8NoBom $landingPath $t
  Write-Host "✔ Landing upgraded: $landingPath"
} else {
  Write-Warning "Not found: $landingPath"
}

# ======================================================
# (2) Universal header + footer nav in AppShell, header logo uses wyrestorm-wingman-logo.png, logo clickable
# ======================================================
if (Test-Path $appShellPath) {
  Backup-File $appShellPath
  $t = Get-Content $appShellPath -Raw

  # Ensure imports
  if ($t -notmatch 'Outlet') {
    throw "AppShell.tsx does not appear to be the routing shell (missing Outlet). Open AppShell.tsx and confirm."
  }
  if ($t -notmatch 'import\s+AppFooter') {
    $t = $t -replace '(import\s+.*Outlet.*\r?\n)', "`$1import AppFooter from `"`@/components/layout/AppFooter`";`n"
  }
  if ($t -notmatch 'import\s+\{?\s*Link') {
    # Ensure Link import from react-router-dom exists (many shells already import Outlet)
    if ($t -match 'from\s+"react-router-dom";') {
      $t = $t -replace 'import\s+\{\s*Outlet\s*\}\s+from\s+"react-router-dom";',
        'import { Link, Outlet } from "react-router-dom";'
    }
  }
  if ($t -notmatch 'wyrestorm-wingman-logo\.png') {
    $t = "import appLogo from `"`@/assets/branding/wyrestorm-wingman-logo.png`";`n" + $t
  }

  # Add GuruFab globally if exists and not already used
  $guruPath = Join-Path $Root "src\guru\GuruFab.tsx"
  if ((Test-Path $guruPath) -and ($t -notmatch 'GuruFab')) {
    $t = $t -replace '(import\s+AppFooter[^\r\n]*\r?\n)', "`$1import GuruFab from `"`@/guru/GuruFab`";`n"
  }

  # Inject a simple header if none exists; otherwise replace logo area to image-link
  if ($t -notmatch '<header') {
    # Wrap existing layout with header above Outlet
    $t = $t -replace '(<Outlet\s*/>\s*)', @"
<header className="wm-header flex items-center justify-between gap-4 px-4 py-3 border-b border-white/10">
  <Link to="/app/dashboard" className="flex items-center gap-3">
    <img src={appLogo} alt="WyreStorm Wingman" className="h-10 w-auto" />
  </Link>
  <nav className="flex items-center gap-2">
    <Link className="px-3 py-2 rounded-lg border border-white/10 text-white/80 hover:bg-white/5 hover:border-white/20" to="/app/dashboard">Dashboard</Link>
    <Link className="px-3 py-2 rounded-lg border border-white/10 text-white/80 hover:bg-white/5 hover:border-white/20" to="/app/toolhub">ToolHub</Link>
    <Link className="px-3 py-2 rounded-lg border border-white/10 text-white/80 hover:bg-white/5 hover:border-white/20" to="/app/projects">Projects</Link>
    <Link className="px-3 py-2 rounded-lg border border-white/10 text-white/80 hover:bg-white/5 hover:border-white/20" to="/app/import">Import</Link>
    <Link className="px-3 py-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 text-emerald-200 hover:border-emerald-400/50" to="/app/tools/ask">Guru</Link>
  </nav>
</header>
$1
"@
  } else {
    # Replace any existing "Logo" component usage with the image logo link (heuristic)
    $t = $t -replace '<Logo\s*/>', '<Link to="/app/dashboard"><img src={appLogo} alt="WyreStorm Wingman" className="h-10 w-auto" /></Link>'
  }

  # Ensure footer is present after Outlet
  if ($t -notmatch '<AppFooter\s*/>') {
    $t = $t -replace '(<Outlet\s*/>\s*)', "`$1`n<AppFooter />`n"
  }

  # Ensure GuruFab is mounted at shell level
  if (($t -match 'GuruFab') -and ($t -notmatch '<GuruFab\s*/>')) {
    $t = $t -replace '(<AppFooter\s*/>\s*)', "`$1`n<GuruFab />`n"
  }

  Write-Utf8NoBom $appShellPath $t
  Write-Host "✔ AppShell upgraded: $appShellPath"
} else {
  Write-Warning "Not found: $appShellPath"
}

# ======================================================
# (2b) Create/overwrite AppFooter (visible on all authenticated pages)
# ======================================================
Ensure-Dir (Split-Path -Parent $footerPath)
Backup-File $footerPath

$footerCode = @'
import React from "react";
import { Link, useLocation } from "react-router-dom";

const links = [
  { to: "/app/dashboard", label: "Dashboard" },
  { to: "/app/toolhub", label: "ToolHub" },
  { to: "/app/projects", label: "Projects" },
  { to: "/app/import", label: "Import" },
  { to: "/app/tools/videowall", label: "VideoWall" },
  { to: "/app/tools/competitor-compare", label: "Competitor" },
  { to: "/app/tools/compare", label: "Compare" },
  { to: "/app/tools/proposal", label: "Proposal" },
  { to: "/app/tools/ask", label: "Guru" },
];

export default function AppFooter() {
  const { pathname } = useLocation();
  return (
    <footer className="mt-6 border-t border-white/10 pt-4">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-2 px-4">
        {links.map((l) => {
          const active = pathname === l.to || pathname.startsWith(l.to + "/");
          return (
            <Link
              key={l.to}
              to={l.to}
              className={
                "rounded-lg px-3 py-2 text-sm border transition " +
                (active
                  ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                  : "border-white/10 text-white/70 hover:text-white hover:border-white/20 hover:bg-white/5")
              }
            >
              {l.label}
            </Link>
          );
        })}
      </div>
      <div className="mx-auto mt-3 max-w-7xl px-4 pb-4 text-center text-xs text-white/50">
        © {new Date().getFullYear()} WyreStorm Technologies — Wingman
      </div>
    </footer>
  );
}
'@

Write-Utf8NoBom $footerPath $footerCode
Write-Host "✔ AppFooter written: $footerPath"

# ======================================================
# (3) ToolHub wiring: ensure all applets are present as tiles
# ======================================================
if (Test-Path $toolHubPath) {
  Backup-File $toolHubPath
  $t = Get-Content $toolHubPath -Raw

  # Identify whether ToolHub already has a list/array of tools; if not, inject a minimal grid.
  $needsRewrite = $false
  if ($t -notmatch 'ToolHub|toolhub|tools' -and $t -notmatch 'to="/app') { $needsRewrite = $true }

  $tileBlock = @'
const TOOL_LINKS: Array<{ title: string; desc: string; to: string }> = [
  { title: "Dashboard", desc: "Overview and quick access.", to: "/app/dashboard" },
  { title: "Projects", desc: "Create and manage projects.", to: "/app/projects" },
  { title: "Import Intake", desc: "Paste requirements and extract key needs.", to: "/app/import" },

  { title: "VideoWall Designer", desc: "Plan a wall and outputs.", to: "/app/tools/videowall" },
  { title: "Competitor Compare", desc: "Find WyreStorm matches.", to: "/app/tools/competitor-compare" },
  { title: "Compare", desc: "Compare products/configs.", to: "/app/tools/compare" },
  { title: "Proposal", desc: "Generate a proposal output.", to: "/app/tools/proposal" },
  { title: "Analytics", desc: "Project insights & summaries.", to: "/app/tools/analytics" },
  { title: "Training", desc: "Training hub content.", to: "/app/tools/training" },
  { title: "Discovery Wizard", desc: "Guided discovery questions.", to: "/app/tools/discovery" },
  { title: "Guided Project Wizard", desc: "Step-by-step project build.", to: "/app/tools/guided-project" },
  { title: "Room Designer", desc: "Room/IO planning entry.", to: "/app/tools/room" },
  { title: "Templates", desc: "Browse solution templates.", to: "/app/tools/templates" },
  { title: "Guru (Ask Wingman)", desc: "Get help instantly.", to: "/app/tools/ask" },
  { title: "CoPilot", desc: "AI design assistant.", to: "/app/tools/copilot" },
  { title: "Video Generator", desc: "Generate product videos.", to: "/app/tools/video-generator" },
];

function ToolTile({ title, desc, to }: { title: string; desc: string; to: string }) {
  return (
    <Link
      to={to}
      className="block rounded-2xl border border-white/10 bg-white/5 p-6 hover:bg-white/7 hover:border-white/20 transition"
    >
      <div className="text-lg font-semibold text-white">{title}</div>
      <div className="mt-2 text-sm text-white/70">{desc}</div>
      <div className="mt-4 text-sm font-semibold text-emerald-300">Open →</div>
    </Link>
  );
}
'@

  if ($needsRewrite -or ($t -notmatch 'TOOL_LINKS')) {
    # Ensure Link is imported
    if ($t -notmatch 'Link') {
      if ($t -match 'from\s+"react-router-dom";') {
        $t = $t -replace 'from\s+"react-router-dom";', 'from "react-router-dom";'
      }
    }
    if ($t -notmatch 'import\s+\{\s*Link') {
      $t = $t -replace '(import\s+React[^\r\n]*\r?\n)', "`$1import { Link } from `"react-router-dom`";`n"
    }

    # Inject TOOL_LINKS block after imports
    if ($t -notmatch 'const TOOL_LINKS') {
      $t = $t -replace '(import[\s\S]*?\r?\n\r?\n)', "`$1`n$tileBlock`n"
    }

    # Replace component body with a grid if it doesn't already render a grid of links
    if ($t -match 'export default function ToolHubPage\(\)') {
      $t = [regex]::Replace($t, '(?s)export default function ToolHubPage\(\)\s*\{.*\}\s*$', @'
export default function ToolHubPage() {
  return (
    <div className="wm-page">
      <div className="wm-page-header mb-4">
        <h1 className="text-2xl font-bold text-white">ToolHub</h1>
        <p className="mt-1 text-sm text-white/70">All Wingman applets in one place.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {TOOL_LINKS.map((t) => (
          <ToolTile key={t.to} title={t.title} desc={t.desc} to={t.to} />
        ))}
      </div>
    </div>
  );
}
'@, 1)
    }
  }

  Write-Utf8NoBom $toolHubPath $t
  Write-Host "✔ ToolHub wired: $toolHubPath"
} else {
  Write-Warning "Not found: $toolHubPath (skipping ToolHub wiring)"
}

# ======================================================
# Done
# ======================================================
Write-Host ""
Write-Host "✔ UX Pack complete."
Write-Host "Next:"
Write-Host "  1) Ensure these two files exist:"
Write-Host "     - src\assets\branding\heroLogo.png"
Write-Host "     - src\assets\branding\wyrestorm-wingman-logo.png"
Write-Host "  2) Restart dev server:"
Write-Host "     npm run dev"
