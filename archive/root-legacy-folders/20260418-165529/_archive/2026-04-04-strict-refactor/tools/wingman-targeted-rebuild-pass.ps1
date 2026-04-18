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

if (-not (Test-Path $Root)) {
  throw "Root path not found: $Root"
}

Set-Location $Root

$navPath = Join-Path $Root "src\ui2\nav\MissionControlNav.tsx"
$templatesPath = Join-Path $Root "src\features\templates\TemplatesPage.tsx"
$cssPath = Join-Path $Root "src\styles\wm-targeted-rebuild.css"
$mainPath = Join-Path $Root "src\main.tsx"

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

$templatesContent = @'
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import GlowGuide from "@/ui2/page/GlowGuide";

type TemplateView = "visual" | "bom" | "sales";
type TemplateTier = "Bronze" | "Silver" | "Gold";

type TemplateCard = {
  id: string;
  name: string;
  application: string;
  tier: TemplateTier;
  summary: string;
  visual: string[];
  bom: string[];
  sales: string[];
};

const templates: TemplateCard[] = [
  {
    id: "meeting-bronze",
    name: "Small Meeting Room",
    application: "Presentation / UC",
    tier: "Bronze",
    summary: "Entry-level meeting room template with simple switching and minimal infrastructure.",
    visual: ["Single display", "Simple switching", "Short cable runs"],
    bom: ["Presentation switcher", "Display connectivity", "Basic control"],
    sales: ["Fast to quote", "Low cost entry", "Ideal for small rooms"],
  },
  {
    id: "meeting-silver",
    name: "Medium Collaboration Room",
    application: "Presentation / UC",
    tier: "Silver",
    summary: "Balanced room with stronger connectivity and better UX.",
    visual: ["Improved workflow", "Better source flexibility", "Structured cabling"],
    bom: ["Apollo platform", "USB extension", "Infrastructure"],
    sales: ["Strong upsell", "Better UX", "Future-ready"],
  },
  {
    id: "education-gold",
    name: "Training / Learning Space",
    application: "Education",
    tier: "Gold",
    summary: "Scalable design for larger or more complex spaces.",
    visual: ["Instructor-led control", "Long distance transport", "Expandable"],
    bom: ["Matrix / AVoIP", "Transport layer", "Control + audio"],
    sales: ["High value", "Consultant-ready", "Scalable"],
  },
];

export default function TemplatesPage() {
  const navigate = useNavigate();
  const [activeTemplateId, setActiveTemplateId] = useState(templates[0].id);
  const [view, setView] = useState<TemplateView>("visual");
  const [tierFilter, setTierFilter] = useState<"All" | TemplateTier>("All");

  const visibleTemplates = useMemo(() => {
    return templates.filter((t) => tierFilter === "All" || t.tier === tierFilter);
  }, [tierFilter]);

  const activeTemplate =
    visibleTemplates.find((t) => t.id === activeTemplateId) ?? visibleTemplates[0];

  const items =
    view === "visual"
      ? activeTemplate.visual
      : view === "bom"
      ? activeTemplate.bom
      : activeTemplate.sales;

  return (
    <div className="wm-fit-page wmu-adopt">
      <section className="wm-surface-card wm-target-hero">
        <div>
          <div className="wm-page-kicker">Templates</div>
          <div className="wm-page-title">Start from a structured room pattern</div>
          <div className="wm-page-copy">
            Keep this page lightweight. Select a template, then explore one layer of detail at a time.
          </div>
        </div>

        <GlowGuide
          title="Current priority"
          activeIndex={1}
          steps={[
            { title: "Choose template", copy: "Pick the closest room type." },
            { title: "Select detail view", copy: "Visual, BOM or sales." },
            { title: "Continue workflow", copy: "Move into catalogue or proposal." },
          ]}
        />
      </section>

      <section className="wm-target-grid">
        <aside className="wm-surface-card wm-target-panel">
          <div className="wm-section-title">Template browser</div>
          <div className="wm-section-copy">Filter by tier and select a room.</div>

          <div className="wm-toolbar-row">
            {["All", "Bronze", "Silver", "Gold"].map((t) => (
              <button
                key={t}
                type="button"
                className={`wm-chip${tierFilter === t ? " wm-chip--active" : ""}`}
                onClick={() => setTierFilter(t as "All" | TemplateTier)}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="wm-target-list">
            {visibleTemplates.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`wm-target-list__item${t.id === activeTemplate.id ? " wm-target-list__item--active" : ""}`}
                onClick={() => setActiveTemplateId(t.id)}
              >
                <div className="wm-target-list__title">{t.name}</div>
                <div className="wm-target-list__meta">{t.application}</div>
              </button>
            ))}
          </div>
        </aside>

        <section className="wm-surface-card wm-target-panel">
          <div className="wm-toolbar-row wm-toolbar-row--between">
            <div>
              <div className="wm-section-title">Detail view</div>
              <div className="wm-section-copy">Switch between information layers.</div>
            </div>

            <div className="wm-toolbar-row">
              <button type="button" className={`wm-chip${view === "visual" ? " wm-chip--active" : ""}`} onClick={() => setView("visual")}>
                Visual
              </button>
              <button type="button" className={`wm-chip${view === "bom" ? " wm-chip--active" : ""}`} onClick={() => setView("bom")}>
                BOM
              </button>
              <button type="button" className={`wm-chip${view === "sales" ? " wm-chip--active" : ""}`} onClick={() => setView("sales")}>
                Sales
              </button>
            </div>
          </div>

          <div className="wm-product-card">
            <div className="wm-product-card__title">{activeTemplate.name}</div>
            <div className="wm-product-card__copy">{activeTemplate.summary}</div>
          </div>

          <div className="wm-target-list">
            {items.map((item) => (
              <div key={item} className="wm-target-list__card">
                {item}
              </div>
            ))}
          </div>

          <div className="wm-toolbar-row wm-toolbar-row--end">
            <button type="button" className="wm-btn-secondary" onClick={() => navigate(WM_ROUTES.catalog)}>
              Open catalogue
            </button>
            <button type="button" className="wm-btn-primary" onClick={() => navigate(WM_ROUTES.proposal)}>
              Continue
            </button>
          </div>
        </section>
      </section>
    </div>
  );
}
'@

$cssContent = @'
/* =========================================
   TARGETED REBUILD PASS
========================================= */

.wm-target-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 16px;
  align-items: start;
  padding: 14px;
}

.wm-target-grid {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 14px;
  min-width: 0;
}

.wm-target-panel {
  display: grid;
  gap: 12px;
  align-self: start;
  min-width: 0;
}

.wm-target-list {
  display: grid;
  gap: 10px;
  min-width: 0;
}

.wm-target-list__item {
  appearance: none;
  width: 100%;
  text-align: left;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid rgba(148,163,184,0.12);
  background: rgba(255,255,255,0.04);
  color: #ffffff;
  cursor: pointer;
  transition: all 140ms ease;
}

.wm-target-list__item:hover {
  transform: translateY(-1px);
  background: rgba(255,255,255,0.08);
}

.wm-target-list__item--active {
  border-color: rgba(56,189,248,0.35);
  background: linear-gradient(135deg, rgba(37,99,235,0.24), rgba(56,189,248,0.14));
  box-shadow: 0 0 24px rgba(56,189,248,0.08);
}

.wm-target-list__title {
  font-size: 15px;
  font-weight: 800;
  color: #ffffff;
  margin-bottom: 4px;
}

.wm-target-list__meta {
  font-size: 12px;
  line-height: 1.4;
  color: rgba(226,232,240,0.74);
}

.wm-target-list__card {
  border-radius: 16px;
  border: 1px solid rgba(148,163,184,0.10);
  background: linear-gradient(180deg, rgba(15,23,42,0.58), rgba(15,23,42,0.44));
  color: rgba(226,232,240,0.78);
  padding: 14px;
}

@media (max-width: 1180px) {
  .wm-target-hero,
  .wm-target-grid {
    grid-template-columns: 1fr;
  }
}
'@

Save-Utf8NoBom -Path $navPath -Content $navContent
Save-Utf8NoBom -Path $templatesPath -Content $templatesContent

$existingCss = ""
if (Test-Path $cssPath) {
  $existingCss = Get-Content -Path $cssPath -Raw
}
if ($existingCss -notmatch 'TARGETED REBUILD PASS') {
  Save-Utf8NoBom -Path $cssPath -Content $cssContent
}

$main = Get-Content -Path $mainPath -Raw
if ($main -notmatch 'import "@/styles/wm-targeted-rebuild.css";') {
  $main = 'import "@/styles/wm-targeted-rebuild.css";' + "`r`n" + $main
  Save-Utf8NoBom -Path $mainPath -Content $main
}

Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process esbuild -ErrorAction SilentlyContinue | Stop-Process -Force

$viteCachePath = Join-Path $Root "node_modules\.vite"
if (Test-Path $viteCachePath) {
  Remove-Item $viteCachePath -Recurse -Force
}

Set-Location $Root
npm run dev