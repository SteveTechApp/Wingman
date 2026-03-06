param(
  [switch]$Apply
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Set-Location C:\Users\steve\wingman

function Ensure-Dir([string]$Path){
  if(-not (Test-Path -LiteralPath $Path)){
    New-Item -ItemType Directory -Force -Path $Path | Out-Null
  }
}

function Write-Utf8NoBom([string]$Path,[string]$Content){
  $enc = [System.Text.UTF8Encoding]::new($false)
  [System.IO.File]::WriteAllText($Path,$Content,$enc)
}

function Backup-IfExists([string]$Root,[string]$RelativePath){
  $full = Join-Path $PWD $RelativePath
  if(Test-Path -LiteralPath $full){
    $dest = Join-Path $Root $RelativePath
    Ensure-Dir (Split-Path $dest -Parent)
    Copy-Item -LiteralPath $full -Destination $dest -Force
  }
}

$stamp  = Get-Date -Format "yyyyMMdd_HHmmss"
$rescue = "_RESCUE\UiPageHeadersForms_$stamp"
$audit  = "_AUDITS\UiPageHeadersForms_$stamp"

Ensure-Dir $rescue
Ensure-Dir $audit

Write-Host "`n== Wingman UI Next Phase: Page Headers + Forms ==" -ForegroundColor Cyan
Write-Host "Mode  :" $(if($Apply){"APPLY"}else{"DRY RUN"})
Write-Host "Rescue:" $rescue
Write-Host "Audit :" $audit

$pageChrome = @'
import * as React from "react";

export function pageWrapStyle(): React.CSSProperties {
  return {
    width: "100%",
    maxWidth: "none",
    margin: 0,
    minWidth: 0,
  };
}

export function stackStyle(gap = 14): React.CSSProperties {
  return {
    display: "grid",
    gap,
  };
}

export function cardStyle(): React.CSSProperties {
  return {
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 18,
    background: "linear-gradient(180deg, rgba(9,16,28,0.94), rgba(6,11,20,0.92))",
    boxShadow: "0 18px 48px rgba(0,0,0,0.22)",
    padding: 18,
  };
}

export function sectionTitleStyle(): React.CSSProperties {
  return {
    fontSize: 18,
    fontWeight: 800,
    color: "rgba(255,255,255,0.96)",
    letterSpacing: "-0.02em",
  };
}

export function sectionTextStyle(): React.CSSProperties {
  return {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 1.5,
    color: "rgba(255,255,255,0.72)",
  };
}

export function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 42,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.05)",
    color: "rgba(255,255,255,0.94)",
    padding: "10px 12px",
    outline: "none",
    font: "inherit",
  };
}

export function textareaStyle(rows?: number): React.CSSProperties {
  return {
    width: "100%",
    minHeight: Math.max(110, (rows || 4) * 24),
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.05)",
    color: "rgba(255,255,255,0.94)",
    padding: "10px 12px",
    outline: "none",
    font: "inherit",
    resize: "vertical",
  };
}

export function fieldLabelStyle(): React.CSSProperties {
  return {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.62)",
    marginBottom: 6,
  };
}

export function PageHeader({
  eyebrow = "TOOL",
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section
      style={{
        ...cardStyle(),
        background:
          "linear-gradient(135deg, rgba(7,31,49,0.98) 0%, rgba(4,17,31,0.98) 56%, rgba(8,62,54,0.92) 100%)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          alignItems: "start",
          flexWrap: "wrap",
        }}
      >
        <div style={{ maxWidth: 900 }}>
          <div
            style={{
              fontSize: 12,
              lineHeight: 1,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontWeight: 800,
              color: "rgba(120,208,189,0.82)",
            }}
          >
            {eyebrow}
          </div>

          <h1
            style={{
              margin: "10px 0 0",
              fontSize: 34,
              lineHeight: 1.04,
              letterSpacing: "-0.04em",
              fontWeight: 900,
              color: "rgba(255,255,255,0.98)",
            }}
          >
            {title}
          </h1>

          {description ? (
            <div
              style={{
                marginTop: 10,
                fontSize: 14,
                lineHeight: 1.55,
                color: "rgba(255,255,255,0.74)",
              }}
            >
              {description}
            </div>
          ) : null}
        </div>

        {actions ? (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {actions}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <div style={fieldLabelStyle()}>{label}</div>
      {children}
    </label>
  );
}
'@

$importPage = @'
import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  PageHeader,
  pageWrapStyle,
  stackStyle,
  cardStyle,
  sectionTitleStyle,
  sectionTextStyle,
  inputStyle,
  textareaStyle,
  Field,
} from "@/ui2/page/PageChrome";

export default function ImportIntakePage() {
  const nav = useNavigate();
  const [projectName, setProjectName] = React.useState("");
  const [customer, setCustomer] = React.useState("");
  const [site, setSite] = React.useState("");
  const [notes, setNotes] = React.useState("");

  return (
    <div className="wm-page wm-animate-in" style={pageWrapStyle()}>
      <div style={stackStyle(14)}>
        <PageHeader
          eyebrow="TOOL"
          title="Import Intake"
          description="Capture a basic opportunity record or prepare imported survey information before moving into discovery and design."
          actions={
            <>
              <button className="wm-btn" type="button" onClick={() => nav("/app/tools")}>
                Tool Hub
              </button>
              <button className="wm-btn wm-btn-primary" type="button" onClick={() => nav("/app/tools/discovery")}>
                Open Discovery
              </button>
            </>
          }
        />

        <section style={cardStyle()}>
          <div style={sectionTitleStyle()}>Opportunity intake</div>
          <div style={sectionTextStyle()}>
            Use this page as a clean starting point for a new requirement set.
          </div>

          <div
            style={{
              marginTop: 16,
              display: "grid",
              gap: 14,
              gridTemplateColumns: "repeat(2, minmax(0,1fr))",
            }}
          >
            <Field label="Project name">
              <input value={projectName} onChange={(e) => setProjectName(e.target.value)} style={inputStyle()} />
            </Field>

            <Field label="Customer">
              <input value={customer} onChange={(e) => setCustomer(e.target.value)} style={inputStyle()} />
            </Field>

            <Field label="Site">
              <input value={site} onChange={(e) => setSite(e.target.value)} style={inputStyle()} />
            </Field>

            <div />

            <div style={{ gridColumn: "1 / -1" }}>
              <Field label="Notes">
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} style={textareaStyle(5)} />
              </Field>
            </div>
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="wm-btn wm-btn-primary" type="button" onClick={() => nav("/app/tools/discovery")}>
              Continue to Discovery
            </button>
            <button className="wm-btn" type="button" onClick={() => nav("/app/projects")}>
              Open Projects
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
'@

$trainingPage = @'
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { TRAINING_MODULES, type TrainingModule } from "@/training/trainingModules";
import {
  PageHeader,
  pageWrapStyle,
  stackStyle,
  cardStyle,
  sectionTitleStyle,
  sectionTextStyle,
  inputStyle,
  Field,
} from "@/ui2/page/PageChrome";

function pill(level: TrainingModule["level"]) {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 700,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.05)",
    color: "rgba(255,255,255,0.86)",
  };
  return base;
}

export default function TrainingHubPage() {
  const nav = useNavigate();
  const [q, setQ] = React.useState("");
  const [track, setTrack] = React.useState<TrainingModule["track"] | "All">("All");
  const [level, setLevel] = React.useState<TrainingModule["level"] | "All">("All");
  const [openId, setOpenId] = React.useState<string | null>(TRAINING_MODULES[0]?.id ?? null);

  const tracks: Array<TrainingModule["track"] | "All"> = ["All", "Sales", "Design", "Products", "Tools"];
  const levels: Array<TrainingModule["level"] | "All"> = ["All", "Foundation", "Intermediate", "Advanced"];

  const filtered = React.useMemo(() => {
    const qq = q.trim().toLowerCase();
    return TRAINING_MODULES.filter((m) => {
      if (track !== "All" && m.track !== track) return false;
      if (level !== "All" && m.level !== level) return false;
      if (!qq) return true;
      const inTitle = m.title.toLowerCase().includes(qq);
      const inDesc = m.description.toLowerCase().includes(qq);
      const inLesson = m.lessons.some((l) => l.title.toLowerCase().includes(qq) || l.bullets.some((b) => b.toLowerCase().includes(qq)));
      return inTitle || inDesc || inLesson;
    });
  }, [q, track, level]);

  const open = filtered.find((m) => m.id === openId) ?? filtered[0] ?? null;

  return (
    <div className="wm-page wm-animate-in" style={pageWrapStyle()}>
      <div style={stackStyle(14)}>
        <PageHeader
          eyebrow="TRAINING"
          title="Training Hub"
          description="Modular learning blocks for sales discovery, system design, product positioning and tool use."
          actions={
            <button className="wm-btn" type="button" onClick={() => nav("/app/dashboard")}>
              Dashboard
            </button>
          }
        />

        <section style={cardStyle()}>
          <div style={sectionTitleStyle()}>Find a module</div>
          <div style={sectionTextStyle()}>
            Filter by track or level, then open a module for more detail.
          </div>

          <div
            style={{
              marginTop: 16,
              display: "grid",
              gap: 14,
              gridTemplateColumns: "2fr 1fr 1fr",
            }}
          >
            <Field label="Search">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search modules or lessons"
                style={inputStyle()}
              />
            </Field>

            <Field label="Track">
              <select value={track} onChange={(e) => setTrack(e.target.value as any)} style={inputStyle()}>
                {tracks.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Field>

            <Field label="Level">
              <select value={level} onChange={(e) => setLevel(e.target.value as any)} style={inputStyle()}>
                {levels.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        <div
          style={{
            display: "grid",
            gap: 14,
            gridTemplateColumns: "minmax(360px, 0.9fr) minmax(420px, 1.1fr)",
          }}
        >
          <section style={cardStyle()}>
            <div style={sectionTitleStyle()}>Modules</div>
            <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
              {filtered.map((m) => {
                const active = m.id === (open?.id ?? openId);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setOpenId(m.id)}
                    style={{
                      textAlign: "left",
                      borderRadius: 14,
                      border: active
                        ? "1px solid rgba(15,154,126,0.28)"
                        : "1px solid rgba(255,255,255,0.08)",
                      background: active
                        ? "linear-gradient(90deg, rgba(9,44,39,0.92), rgba(7,18,30,0.92))"
                        : "rgba(255,255,255,0.03)",
                      padding: 14,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontSize: 15, fontWeight: 800, color: "rgba(255,255,255,0.94)" }}>
                      {m.title}
                    </div>
                    <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.5, color: "rgba(255,255,255,0.68)" }}>
                      {m.description}
                    </div>
                    <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span style={pill(m.level)}>{m.level}</span>
                      <span style={pill(m.level)}>{m.track}</span>
                    </div>
                  </button>
                );
              })}

              {!filtered.length ? (
                <div style={{ ...sectionTextStyle(), marginTop: 0 }}>
                  No modules matched your filters.
                </div>
              ) : null}
            </div>
          </section>

          <section style={cardStyle()}>
            <div style={sectionTitleStyle()}>Module detail</div>

            {!open ? (
              <div style={sectionTextStyle()}>Select a module to view details.</div>
            ) : (
              <div style={{ marginTop: 14, display: "grid", gap: 14 }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "rgba(255,255,255,0.96)" }}>
                    {open.title}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 14, lineHeight: 1.55, color: "rgba(255,255,255,0.72)" }}>
                    {open.description}
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={pill(open.level)}>{open.level}</span>
                    <span style={pill(open.level)}>{open.track}</span>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  {open.lessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      style={{
                        borderRadius: 14,
                        border: "1px solid rgba(255,255,255,0.08)",
                        background: "rgba(255,255,255,0.03)",
                        padding: 14,
                      }}
                    >
                      <div style={{ fontSize: 15, fontWeight: 800, color: "rgba(255,255,255,0.94)" }}>
                        {lesson.title}
                      </div>
                      <div style={{ marginTop: 4, fontSize: 12, color: "rgba(255,255,255,0.58)" }}>
                        {lesson.minutes} min
                      </div>
                      <ul style={{ margin: "10px 0 0", paddingLeft: 18, color: "rgba(255,255,255,0.76)" }}>
                        {lesson.bullets.map((b, i) => <li key={i} style={{ marginTop: 6 }}>{b}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
'@

$videoWallPage = @'
import * as React from "react";
import CollapsibleCard from "@/ui2/components/CollapsibleCard";
import {
  PageHeader,
  pageWrapStyle,
  stackStyle,
  cardStyle,
  sectionTitleStyle,
  sectionTextStyle,
  inputStyle,
  Field,
} from "@/ui2/page/PageChrome";

type WallType = "LCD" | "LED";
type Layout = "2x2" | "3x3" | "4x4" | "Custom";
type MultiViewMode = "None" | "Fixed Windows" | "Active Windowing";

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "140px minmax(0,1fr)",
        gap: 10,
        alignItems: "start",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.60)",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 14,
          lineHeight: 1.45,
          color: "rgba(255,255,255,0.92)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default function VideoWallPlannerPage() {
  const [wallType, setWallType] = React.useState<WallType>("LED");
  const [layout, setLayout] = React.useState<Layout>("3x3");
  const [customRows, setCustomRows] = React.useState(2);
  const [customCols, setCustomCols] = React.useState(3);
  const [diagonalInches, setDiagonalInches] = React.useState(136);
  const [pixelPitch, setPixelPitch] = React.useState(1.2);
  const [multiview, setMultiview] = React.useState<MultiViewMode>("Fixed Windows");

  const grid = React.useMemo(() => {
    if (layout === "2x2") return { r: 2, c: 2 };
    if (layout === "3x3") return { r: 3, c: 3 };
    if (layout === "4x4") return { r: 4, c: 4 };
    return { r: Math.max(1, customRows), c: Math.max(1, customCols) };
  }, [layout, customRows, customCols]);

  const layoutLabel = React.useMemo(() => {
    return layout === "Custom" ? `${grid.r}x${grid.c}` : layout;
  }, [layout, grid.r, grid.c]);

  const displayCount = wallType === "LCD" ? grid.r * grid.c : 1;

  const planningNote = React.useMemo(() => {
    if (wallType === "LED") {
      return multiview === "None"
        ? "LED wall with a single-canvas presentation flow."
        : "LED wall with processor-led windowing or multiview handling.";
    }

    return multiview === "None"
      ? "LCD wall with standard tiled display routing."
      : "LCD wall with video-wall processing and multi-window source handling.";
  }, [wallType, multiview]);

  return (
    <div className="wm-page wm-animate-in" style={pageWrapStyle()}>
      <div style={stackStyle(14)}>
        <PageHeader
          eyebrow="TOOL"
          title="Video Wall Planner"
          description="Define the wall type, layout and viewing behaviour first, then use that as the basis for processing and BOM decisions."
        />

        <section style={cardStyle()}>
          <div style={sectionTitleStyle()}>Planner inputs</div>
          <div style={sectionTextStyle()}>
            Enter only the core planning inputs first.
          </div>

          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0,1fr))",
              gap: 14,
            }}
          >
            <Field label="Wall type">
              <select value={wallType} onChange={(e) => setWallType(e.target.value as WallType)} style={inputStyle()}>
                <option>LED</option>
                <option>LCD</option>
              </select>
            </Field>

            <Field label="Layout">
              <select value={layout} onChange={(e) => setLayout(e.target.value as Layout)} style={inputStyle()}>
                <option>2x2</option>
                <option>3x3</option>
                <option>4x4</option>
                <option>Custom</option>
              </select>
            </Field>

            <Field label="Approx. size (diagonal inches)">
              <input type="number" min={40} value={diagonalInches} onChange={(e) => setDiagonalInches(Number(e.target.value || 0))} style={inputStyle()} />
            </Field>

            <Field label="Multiview">
              <select value={multiview} onChange={(e) => setMultiview(e.target.value as MultiViewMode)} style={inputStyle()}>
                <option>None</option>
                <option>Fixed Windows</option>
                <option>Active Windowing</option>
              </select>
            </Field>
          </div>

          {layout === "Custom" ? (
            <div
              style={{
                marginTop: 14,
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(180px, 280px))",
                gap: 14,
              }}
            >
              <Field label="Rows">
                <input type="number" min={1} value={customRows} onChange={(e) => setCustomRows(Math.max(1, Number(e.target.value || 1)))} style={inputStyle()} />
              </Field>
              <Field label="Columns">
                <input type="number" min={1} value={customCols} onChange={(e) => setCustomCols(Math.max(1, Number(e.target.value || 1)))} style={inputStyle()} />
              </Field>
            </div>
          ) : null}

          {wallType === "LED" ? (
            <div style={{ marginTop: 14, maxWidth: 280 }}>
              <Field label="Pixel pitch (mm)">
                <input type="number" step="0.1" min={0.5} value={pixelPitch} onChange={(e) => setPixelPitch(Number(e.target.value || 0))} style={inputStyle()} />
              </Field>
            </div>
          ) : null}
        </section>

        <section style={cardStyle()}>
          <div style={sectionTitleStyle()}>Planning summary</div>
          <div style={sectionTextStyle()}>
            Use this as the starting point for processor, distribution and BOM decisions.
          </div>

          <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
            <SummaryRow label="Wall type" value={wallType} />
            <SummaryRow label="Layout" value={layoutLabel} />
            <SummaryRow label={wallType === "LCD" ? "Panels" : "Display object"} value={String(displayCount)} />
            <SummaryRow label="Approx. size" value={`${diagonalInches}"`} />
            {wallType === "LED" ? <SummaryRow label="Pixel pitch" value={`${pixelPitch} mm`} /> : null}
            <SummaryRow label="Multiview" value={multiview} />
            <SummaryRow label="Planning note" value={planningNote} />
          </div>
        </section>

        <CollapsibleCard
          id="videowall_next_steps"
          title="Next step"
          subtitle="Use this summary as the basis for BOM and processing logic."
          defaultCollapsed
        >
          <div
            style={{
              fontSize: 13,
              lineHeight: 1.5,
              color: "rgba(255,255,255,0.86)",
            }}
          >
            Next, split LED vs LCD workflows and apply WyreStorm processing, routing and multiview rules from this configuration.
          </div>
        </CollapsibleCard>
      </div>
    </div>
  );
}
'@

$themePatch = @'

/* __WM_PAGE_HEADERS_FORMS_V1__ */
@media (max-width: 1100px) {
  .wm-page {
    min-width: 0;
  }
}

@media (max-width: 960px) {
  .wm-page-title,
  .wm-h1 {
    font-size: 28px;
  }
}
'@

$targets = @(
  "src\ui2\page\PageChrome.tsx",
  "src\features\import\ImportIntakePage.tsx",
  "src\features\misc\TrainingHubPage.tsx",
  "src\features\misc\VideoWallPlannerPage.tsx",
  "src\styles\wingman-theme.css"
)

foreach($rel in $targets){
  Backup-IfExists $rescue $rel
}

if($Apply){
  $map = @{
    "src\ui2\page\PageChrome.tsx" = $pageChrome
    "src\features\import\ImportIntakePage.tsx" = $importPage
    "src\features\misc\TrainingHubPage.tsx" = $trainingPage
    "src\features\misc\VideoWallPlannerPage.tsx" = $videoWallPage
  }

  foreach($rel in $map.Keys){
    $full = Join-Path $PWD $rel
    Ensure-Dir (Split-Path $full -Parent)
    Write-Utf8NoBom $full $map[$rel]
    Write-Host "Wrote: $rel" -ForegroundColor Green
  }

  $cssPath = Join-Path $PWD "src\styles\wingman-theme.css"
  $css = if(Test-Path $cssPath){ Get-Content $cssPath -Raw } else { "" }
  if($css -notmatch "__WM_PAGE_HEADERS_FORMS_V1__"){
    $css = $css.TrimEnd() + "`r`n`r`n" + $themePatch.Trim() + "`r`n"
    Write-Utf8NoBom $cssPath $css
    Write-Host "Patched: src\styles\wingman-theme.css" -ForegroundColor Green
  }
}
else {
  Write-Host "Would write page chrome, import, training, and video wall pages" -ForegroundColor Yellow
}

@"
Page headers and form layout normalization complete.

Updated:
- src\ui2\page\PageChrome.tsx
- src\features\import\ImportIntakePage.tsx
- src\features\misc\TrainingHubPage.tsx
- src\features\misc\VideoWallPlannerPage.tsx
- src\styles\wingman-theme.css

Changes:
- reusable page header component
- reusable field and input styling
- cleaner training layout
- cleaner import intake layout
- cleaner video wall planner layout
- more consistent page composition across tools

Next:
- npm run typecheck
- review /app/tools/import
- review /app/tools/video-wall
- review /app/tools/training
"@ | Out-File (Join-Path $audit "SUMMARY.txt") -Encoding utf8

Write-Host "`nNext:" -ForegroundColor Cyan
Write-Host "npm run typecheck"
Write-Host "git status --short"