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
# 1. TopBar.tsx
# ------------------------------------------------------------
$topBarPath = Join-Path $root "src\app\navigation\TopBar.tsx"
if (Test-Path $topBarPath) {
  Backup-File -Path $topBarPath

  $topBarContent = @'
import { useLocation, useNavigate } from "react-router-dom";
import { brand } from "@/branding/brand";

const navItems = [
  { label: "Dashboard", to: "/app/dashboard" },
  { label: "Discovery", to: "/app/tools/discovery" },
  { label: "Catalogue", to: "/app/tools/catalog" },
  { label: "Proposal", to: "/app/tools/proposal" },
  { label: "Video Wall", to: "/app/tools/video-wall" },
];

export default function TopBar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <header
      className="wm-topbar"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        width: "100%",
      }}
    >
      <button
        type="button"
        onClick={() => navigate("/app/dashboard")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          border: 0,
          background: "transparent",
          cursor: "pointer",
          padding: 0,
          minWidth: 0,
        }}
      >
        <img
          src={brand.logo}
          alt={brand.fullName}
          style={{
            display: "block",
            height: 72,
            width: "auto",
            objectFit: "contain",
            flexShrink: 0,
          }}
        />

        <div style={{ display: "grid", gap: 2, textAlign: "left" }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 900,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#93c5fd",
            }}
          >
            WyreStorm
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 900,
              lineHeight: 1,
              color: "#ffffff",
            }}
          >
            Wingman
          </div>
          <div
            style={{
              fontSize: 12,
              color: "rgba(226,232,240,0.72)",
              lineHeight: 1.2,
            }}
          >
            Guided AV design and sales support
          </div>
        </div>
      </button>

      <nav
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          justifyContent: "flex-end",
        }}
      >
        {navItems.map((item) => {
          const active = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
          return (
            <button
              key={item.to}
              type="button"
              className={`wm-pill-button${active ? " wm-pill-button--active" : ""}`}
              onClick={() => navigate(item.to)}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
'@

  Save-Utf8NoBom -Path $topBarPath -Content $topBarContent
}

# ------------------------------------------------------------
# 2. MissionControlNav.tsx
# ------------------------------------------------------------
$navPath = Join-Path $root "src\ui2\nav\MissionControlNav.tsx"
if (Test-Path $navPath) {
  Backup-File -Path $navPath

  $navContent = @'
import { useLocation, useNavigate } from "react-router-dom";

type NavItem = {
  label: string;
  route: string;
  hint?: string;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const sections: NavSection[] = [
  {
    title: "Start",
    items: [
      { label: "Dashboard", route: "/app/dashboard", hint: "Mission control" },
      { label: "Projects", route: "/app/projects", hint: "Saved opportunities" },
      { label: "Tools", route: "/app/tools", hint: "All workflows" },
    ],
  },
  {
    title: "Capture",
    items: [
      { label: "Discovery", route: "/app/tools/discovery", hint: "Qualify the opportunity" },
      { label: "Import", route: "/app/tools/import-intake", hint: "Use an existing brief" },
      { label: "Room Wizard", route: "/app/tools/room-wizard", hint: "Define application fit" },
    ],
  },
  {
    title: "Design",
    items: [
      { label: "Catalogue", route: "/app/tools/catalog", hint: "Browse products" },
      { label: "Compare", route: "/app/tools/compare", hint: "Competitive fit" },
      { label: "Navigator", route: "/app/tools/navigator", hint: "Design direction" },
      { label: "Video Wall", route: "/app/tools/video-wall", hint: "Wall workflows" },
    ],
  },
  {
    title: "Deliver",
    items: [
      { label: "Proposal", route: "/app/tools/proposal", hint: "Customer output" },
      { label: "Sales", route: "/app/tools/sales", hint: "Commercial positioning" },
      { label: "Templates", route: "/app/tools/templates", hint: "Reusable starting points" },
      { label: "Training", route: "/app/tools/training", hint: "Internal enablement" },
      { label: "Guru", route: "/app/tools/guru", hint: "Guided assistance" },
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
                  title={item.hint || item.label}
                >
                  <span style={{ display: "grid", gap: 2 }}>
                    <span>{item.label}</span>
                    {item.hint ? (
                      <span
                        style={{
                          fontSize: 11,
                          color: active ? "rgba(255,255,255,0.82)" : "rgba(226,232,240,0.58)",
                          fontWeight: 500,
                        }}
                      >
                        {item.hint}
                      </span>
                    ) : null}
                  </span>
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
}

# ------------------------------------------------------------
# 3. DashboardPage.tsx
# ------------------------------------------------------------
$dashboardPath = Join-Path $root "src\features\dashboard\DashboardPage.tsx"
if (Test-Path $dashboardPath) {
  Backup-File -Path $dashboardPath

  $dashboardContent = @'
import type { ReactNode } from "react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import GlowGuide from "@/ui2/page/GlowGuide";

type StartPathItem = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  ctaLabel: string;
  route: string;
  icon: ReactNode;
};

function Icon({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        width: 42,
        height: 42,
        display: "grid",
        placeItems: "center",
        borderRadius: 14,
        background: "rgba(148,163,184,0.10)",
        border: "1px solid rgba(148,163,184,0.14)",
        color: "white",
        flex: "0 0 auto",
      }}
    >
      {children}
    </span>
  );
}

function StartCard({ item, onClick }: { item: StartPathItem; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="wm-product-card"
      style={{
        textAlign: "left",
        cursor: "pointer",
        minHeight: 220,
        padding: 18,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {item.icon}
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            color: "#93c5fd",
          }}
        >
          {item.eyebrow}
        </div>
      </div>

      <div style={{ fontSize: 26, fontWeight: 900, color: "#ffffff", lineHeight: 1.02 }}>
        {item.title}
      </div>

      <div style={{ fontSize: 13, lineHeight: 1.5, color: "rgba(226,232,240,0.84)" }}>
        {item.description}
      </div>

      <div
        style={{
          marginTop: "auto",
          fontSize: 14,
          fontWeight: 800,
          color: "#7dd3fc",
        }}
      >
        {item.ctaLabel} →
      </div>
    </button>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();

  const items = useMemo<StartPathItem[]>(
    () => [
      {
        id: "start",
        eyebrow: "Recommended",
        title: "Start a project",
        description:
          "Capture customer requirements and open a guided workflow for system design, product selection and proposal readiness.",
        ctaLabel: "Open launcher",
        route: WM_ROUTES.projectLauncher,
        icon: <Icon>◆</Icon>,
      },
      {
        id: "discovery",
        eyebrow: "Qualification",
        title: "Run discovery",
        description:
          "Use the Discovery workflow to identify architecture direction, room needs and the right next tool.",
        ctaLabel: "Open discovery",
        route: WM_ROUTES.discovery,
        icon: <Icon>◌</Icon>,
      },
      {
        id: "proposal",
        eyebrow: "Customer output",
        title: "Build proposal",
        description:
          "Open a cleaner proposal workspace with tier-driven BOM logic, commercial reasoning and customer-ready framing.",
        ctaLabel: "Open proposal",
        route: WM_ROUTES.proposal,
        icon: <Icon>▣</Icon>,
      },
      {
        id: "wall",
        eyebrow: "Display systems",
        title: "Plan video wall",
        description:
          "Explore video wall direction, design intent and recommended approach before moving to the full hardware path.",
        ctaLabel: "Open video wall",
        route: WM_ROUTES.videoWall,
        icon: <Icon>▤</Icon>,
      },
    ],
    []
  );

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section className="wm-fit-page__hero">
        <div style={{ display: "grid", gap: 10 }}>
          <div className="wm-page-kicker">Mission Control</div>
          <div className="wm-page-title">Design, qualify and position the right AV solution</div>
          <div className="wm-page-copy" style={{ maxWidth: 820 }}>
            Wingman should guide the user from requirements capture through system design, product
            selection and proposal output without relying on senior engineering support for every step.
          </div>

          <div className="wm-toolbar-row">
            <button
              type="button"
              className="wm-btn-primary"
              onClick={() => navigate(WM_ROUTES.projectLauncher)}
            >
              Start new project
            </button>

            <button
              type="button"
              className="wm-btn-secondary"
              onClick={() => navigate(WM_ROUTES.projects)}
            >
              Open projects
            </button>
          </div>
        </div>

        <GlowGuide
          title="Current priority"
          activeIndex={0}
          steps={[
            { title: "Choose a start path", copy: "Use the workflow that best matches the opportunity stage." },
            { title: "Capture intent", copy: "Keep the design driven by application, not by product-first thinking." },
            { title: "Build toward output", copy: "Move toward a proposal-ready recommendation." },
          ]}
          note="This page should feel like a launchpad, not a document dump."
        />
      </section>

      <section className="wm-surface-card" style={{ padding: 18, display: "grid", gap: 14 }}>
        <div>
          <div className="wm-section-title">Start paths</div>
          <div className="wm-body-sm">
            Choose the most useful entry point for the current opportunity.
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 14 }}>
          {items.map((item) => (
            <StartCard key={item.id} item={item} onClick={() => navigate(item.route)} />
          ))}
        </div>
      </section>
    </div>
  );
}
'@

  Save-Utf8NoBom -Path $dashboardPath -Content $dashboardContent
}

Write-Host ""
Write-Host "Dashboard and shell sweep installed."
Write-Host "Run:"
Write-Host "  npm run typecheck"
Write-Host "  npm run dev"