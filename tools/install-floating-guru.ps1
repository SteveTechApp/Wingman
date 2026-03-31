Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = "C:\Users\steve\wingman"

function Save-Utf8NoBom {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][AllowEmptyString()][string]$Content
  )

  $dir = Split-Path $Path -Parent
  if ($dir -and -not (Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }

  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $utf8)
}

function Backup-File {
  param([Parameter(Mandatory = $true)][string]$Path)

  if (-not (Test-Path $Path)) {
    throw "File not found: $Path"
  }

  $rescueDir = Join-Path $root "_RESCUE"
  if (-not (Test-Path $rescueDir)) {
    New-Item -ItemType Directory -Force -Path $rescueDir | Out-Null
  }

  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $leaf = Split-Path $Path -Leaf
  $dest = Join-Path $rescueDir "$stamp-$leaf.bak"
  Copy-Item $Path $dest -Force
  Write-Host "Backup created: $dest"
}

# ------------------------------------------------------------
# 1. Guru context helper
# ------------------------------------------------------------
$logicPath = Join-Path $root "src\features\guru\guruContext.ts"

$logicContent = @'
export type GuruSuggestion = {
  title: string;
  copy: string;
};

export type GuruContext = {
  heading: string;
  body: string;
  suggestions: GuruSuggestion[];
};

export function getGuruContext(pathname: string): GuruContext {
  if (pathname.startsWith("/app/tools/discovery")) {
    return {
      heading: "Discovery guidance",
      body: "Capture the application first, then validate routing complexity, distance, USB needs and whether the network is suitable for AVoIP.",
      suggestions: [
        { title: "Ask about network", copy: "Confirm whether an AV VLAN or managed switch is available before leaning into AVoIP." },
        { title: "Check future growth", copy: "Expansion plans often change the correct architecture." },
        { title: "Avoid product-first design", copy: "Start from room behaviour, not from a preferred SKU." },
      ],
    };
  }

  if (pathname.startsWith("/app/tools/proposal")) {
    return {
      heading: "Proposal guidance",
      body: "Use the proposal page to explain why the recommendation is correct, why the tier is appropriate, and what must be confirmed before quote issue.",
      suggestions: [
        { title: "Use the tier properly", copy: "Bronze is lean, Silver is balanced, Gold is premium and future-ready." },
        { title: "Tell the story", copy: "Explain why this architecture fits the room better than a simpler or more complex alternative." },
        { title: "Review BOM logic", copy: "Check the bill of materials against the real workflow, not just the room quantity." },
      ],
    };
  }

  if (pathname.startsWith("/app/tools/video-wall")) {
    return {
      heading: "Video wall guidance",
      body: "Decide whether this is a fixed-layout wall, an advanced multiview wall, or a scalable AVoIP wall before selecting the BOM.",
      suggestions: [
        { title: "Fixed or flexible?", copy: "Processor-led walls are often better for simpler fixed layouts." },
        { title: "AVoIP only when justified", copy: "Use AVoIP when scale, flexibility or multiview genuinely matter." },
        { title: "Confirm content format", copy: "Wall aspect ratio, source count and layout behaviour drive the right choice." },
      ],
    };
  }

  if (pathname.startsWith("/app/tools/sales")) {
    return {
      heading: "Sales guidance",
      body: "Position the recommendation around application fit, user experience and lower design risk rather than only technical features.",
      suggestions: [
        { title: "Why WyreStorm", copy: "Use the practical single-vendor story across switching, transport, wall and control." },
        { title: "Challenge over-design", copy: "A more complex system is not always the better commercial answer." },
        { title: "Protect the quote", copy: "Confirm the key workflow assumptions before commercial issue." },
      ],
    };
  }

  if (pathname.startsWith("/app/dashboard")) {
    return {
      heading: "Mission control",
      body: "Start from the stage of the opportunity. Discovery is for qualification, Proposal is for output, Video Wall is for canvas-led design.",
      suggestions: [
        { title: "New enquiry", copy: "Start in Discovery or the project launcher." },
        { title: "Known room type", copy: "Use a template or jump straight into the right specialist tool." },
        { title: "Customer-facing output", copy: "Move into Proposal once the architecture is stable." },
      ],
    };
  }

  return {
    heading: "Wingman Guru",
    body: "Use Wingman as a guided AV design and sales assistant. Start with requirements, validate architecture, then produce a commercial output.",
    suggestions: [
      { title: "Capture first", copy: "Discovery should define architecture before product choice." },
      { title: "Use the right tool", copy: "Choose Proposal, Video Wall or Sales based on the opportunity stage." },
      { title: "Keep it practical", copy: "The best system is the one that fits the application with the right level of complexity." },
    ],
  };
}
'@

Save-Utf8NoBom -Path $logicPath -Content $logicContent

# ------------------------------------------------------------
# 2. Floating Guru component
# ------------------------------------------------------------
$componentPath = Join-Path $root "src\features\guru\FloatingGuru.tsx"

$componentContent = @'
import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { getGuruContext } from "@/features/guru/guruContext";

export default function FloatingGuru() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(true);

  const context = useMemo(() => getGuruContext(location.pathname), [location.pathname]);

  return (
    <div
      style={{
        position: "fixed",
        right: 20,
        bottom: 20,
        zIndex: 60,
        width: isOpen ? 360 : 172,
        transition: "width 160ms ease",
      }}
    >
      <div
        style={{
          borderRadius: 18,
          border: "1px solid rgba(96,165,250,0.24)",
          background: "linear-gradient(180deg, rgba(8,15,28,0.96), rgba(10,20,38,0.92))",
          boxShadow: "0 20px 40px rgba(2,8,23,0.30)",
          overflow: "hidden",
          backdropFilter: "blur(12px)",
        }}
      >
        <button
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            padding: "14px 16px",
            border: 0,
            background: "transparent",
            color: "#ffffff",
            cursor: "pointer",
          }}
        >
          <div style={{ display: "grid", gap: 3, textAlign: "left" }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "#93c5fd",
              }}
            >
              Wingman Guru
            </div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>
              {context.heading}
            </div>
          </div>

          <div
            style={{
              minWidth: 28,
              height: 28,
              display: "grid",
              placeItems: "center",
              borderRadius: 999,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              fontWeight: 900,
            }}
          >
            {isOpen ? "−" : "+"}
          </div>
        </button>

        {isOpen ? (
          <div style={{ display: "grid", gap: 14, padding: "0 16px 16px 16px" }}>
            <div
              style={{
                padding: 12,
                borderRadius: 14,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(148,163,184,0.10)",
                color: "rgba(226,232,240,0.82)",
                lineHeight: 1.55,
              }}
            >
              {context.body}
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {context.suggestions.map((item) => (
                <div
                  key={item.title}
                  style={{
                    display: "grid",
                    gap: 4,
                    padding: 12,
                    borderRadius: 14,
                    background: "rgba(255,255,255,0.035)",
                    border: "1px solid rgba(148,163,184,0.10)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "#93c5fd",
                    }}
                  >
                    {item.title}
                  </div>
                  <div style={{ color: "rgba(226,232,240,0.78)", lineHeight: 1.5 }}>
                    {item.copy}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div
            style={{
              padding: "0 16px 16px 16px",
              color: "rgba(226,232,240,0.72)",
              fontSize: 12,
            }}
          >
            Open for guidance
          </div>
        )}
      </div>
    </div>
  );
}
'@

Save-Utf8NoBom -Path $componentPath -Content $componentContent

# ------------------------------------------------------------
# 3. AppShell full replacement
# ------------------------------------------------------------
$appShellPath = Join-Path $root "src\app\shell\AppShell.tsx"
if (Test-Path $appShellPath) {
  Backup-File -Path $appShellPath
}

$appShellContent = @'
import { Outlet } from "react-router-dom";
import TopBar from "@/app/navigation/TopBar";
import MissionControlNav from "@/ui2/nav/MissionControlNav";
import FloatingGuru from "@/features/guru/FloatingGuru";

export default function AppShell() {
  return (
    <div
      className="wm-shell-root"
      data-shell="wingman"
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100vh",
        minHeight: "100vh",
        overflow: "hidden",
        background: "transparent",
        color: "white",
      }}
    >
      <TopBar />

      <div
        className="wm-shell-content"
        style={{
          display: "grid",
          gridTemplateColumns: "280px minmax(0, 1fr)",
          minHeight: 0,
          flex: 1,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            minHeight: 0,
            overflowY: "auto",
            borderRight: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <MissionControlNav />
        </div>

        <main
          className="wm-app-main"
          style={{
            minHeight: 0,
            overflowY: "auto",
            padding: 18,
          }}
        >
          <Outlet />
        </main>
      </div>

      <FloatingGuru />
    </div>
  );
}
'@

Save-Utf8NoBom -Path $appShellPath -Content $appShellContent

# ------------------------------------------------------------
# 4. Optional CSS layer for Guru
# ------------------------------------------------------------
$cssPath = Join-Path $root "src\styles\wm-guru-pass.css"
$cssContent = @'
@media (max-width: 1100px) {
  .wm-shell-content {
    grid-template-columns: 1fr !important;
  }

  .wm-shell-content > div:first-child {
    display: none;
  }
}
'@

Save-Utf8NoBom -Path $cssPath -Content $cssContent

# ------------------------------------------------------------
# 5. Ensure CSS import in main.tsx
# ------------------------------------------------------------
$mainPath = Join-Path $root "src\main.tsx"
if (Test-Path $mainPath) {
  Backup-File -Path $mainPath
  $mainContent = Get-Content $mainPath -Raw

  if ($mainContent -notmatch 'wm-guru-pass\.css') {
    if ($mainContent -match 'import\s+"\.\/styles\/wm-shell-polish-pass\.css";') {
      $mainContent = $mainContent -replace 'import\s+"\.\/styles\/wm-shell-polish-pass\.css";', @'
import "./styles/wm-shell-polish-pass.css";
import "./styles/wm-guru-pass.css";
'@
    }
    elseif ($mainContent -match "import './styles/wm-shell-polish-pass\.css';") {
      $mainContent = $mainContent -replace "import './styles/wm-shell-polish-pass\.css';", @"
import './styles/wm-shell-polish-pass.css';
import './styles/wm-guru-pass.css';
"@
    }

    Save-Utf8NoBom -Path $mainPath -Content $mainContent
  }
}

Write-Host ""
Write-Host "Floating Guru installed."
Write-Host "Run:"
Write-Host "  npm run typecheck"
Write-Host "  npm run dev"