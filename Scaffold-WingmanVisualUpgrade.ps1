[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$ProjectRoot = ".",

    [Parameter(Mandatory = $false)]
    [switch]$PatchApp,

    [Parameter(Mandatory = $false)]
    [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ProjectRoot = (Resolve-Path $ProjectRoot).Path
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupRoot = Join-Path $ProjectRoot ".wingman-backup\$Timestamp"

function Get-RelativePath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$BasePath,

        [Parameter(Mandatory = $true)]
        [string]$TargetPath
    )

    $baseFull = [System.IO.Path]::GetFullPath($BasePath)
    $targetFull = [System.IO.Path]::GetFullPath($TargetPath)

    if (-not $baseFull.EndsWith([System.IO.Path]::DirectorySeparatorChar)) {
        $baseFull += [System.IO.Path]::DirectorySeparatorChar
    }

    $baseUri = New-Object System.Uri($baseFull)
    $targetUri = New-Object System.Uri($targetFull)
    $relativeUri = $baseUri.MakeRelativeUri($targetUri)

    return [System.Uri]::UnescapeDataString(
        $relativeUri.ToString().Replace('/', [System.IO.Path]::DirectorySeparatorChar)
    )
}

function Ensure-Directory {
    param([string]$Path)
    if (-not (Test-Path $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
    }
}

function Backup-File {
    param([string]$Path)
    if (Test-Path $Path) {
        Ensure-Directory -Path $BackupRoot
        $relative = Get-RelativePath -BasePath $ProjectRoot -TargetPath $Path
        $target = Join-Path $BackupRoot $relative
        Ensure-Directory -Path (Split-Path $target -Parent)
        Copy-Item -Path $Path -Destination $target -Force
    }
}

function Write-TextFile {
    param(
        [string]$Path,
        [string]$Content
    )

    Ensure-Directory -Path (Split-Path $Path -Parent)

    if ((Test-Path $Path) -and (-not $Force)) {
        Write-Host "Skipping existing file: $Path"
        return
    }

    if (Test-Path $Path) {
        Backup-File -Path $Path
    }

    Set-Content -Path $Path -Value $Content -Encoding utf8
    Write-Host "Wrote $Path"
}

function Add-LineIfMissingToTextFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,

        [Parameter(Mandatory = $true)]
        [string]$Line
    )

    if (-not (Test-Path $Path)) {
        throw "File not found: $Path"
    }

    $content = Get-Content -Path $Path -Raw
    if ($content -match [regex]::Escape($Line)) {
        Write-Host "Already present in $Path"
        return
    }

    Backup-File -Path $Path
    Set-Content -Path $Path -Value ($Line + [Environment]::NewLine + $content) -Encoding utf8
    Write-Host "Patched $Path"
}

$files = @{}

$files["src/wingman-v2/styles/theme.css"] = @'
:root {
  --wingman-shell: #071522;
  --wingman-shell-2: #0b2032;
  --wingman-panel: rgba(12, 31, 49, 0.92);
  --wingman-surface: #f4f7fb;
  --wingman-card: #ffffff;
  --wingman-border: #d7e0ea;
  --wingman-text: #e9f0f7;
  --wingman-muted: #8fa4b9;
  --wingman-ink: #0f1722;
  --wingman-accent: #76a9ff;
  --wingman-accent-2: #b9d4ff;
  --wingman-recommended: #22c55e;
  --wingman-alternative: #f59e0b;
  --wingman-caution: #ef4444;
  --wingman-shadow: 0 24px 60px rgba(3, 10, 18, 0.35);
}

body {
  background: linear-gradient(180deg, var(--wingman-shell) 0%, #0a1b2c 100%);
}

.wingman-shell {
  min-height: 100vh;
  color: var(--wingman-text);
  background:
    radial-gradient(circle at top right, rgba(118, 169, 255, 0.18), transparent 30%),
    radial-gradient(circle at bottom left, rgba(185, 212, 255, 0.10), transparent 25%),
    linear-gradient(180deg, var(--wingman-shell) 0%, var(--wingman-shell-2) 100%);
}

.wingman-panel {
  background: var(--wingman-panel);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: var(--wingman-shadow);
  backdrop-filter: blur(8px);
}

.wingman-surface {
  background:
    linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(244,247,251,0.98) 100%);
  color: var(--wingman-ink);
  border: 1px solid var(--wingman-border);
  box-shadow: 0 20px 50px rgba(15, 23, 34, 0.12);
}

.wingman-display {
  font-family: Georgia, "Times New Roman", serif;
  letter-spacing: -0.03em;
}

.wingman-kicker {
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-size: 0.72rem;
  color: var(--wingman-muted);
}

.wingman-subtle-border {
  border-color: rgba(255,255,255,0.08);
}

.wingman-grid {
  background-image:
    linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
  background-size: 28px 28px;
}
'@

$files["src/wingman-v2/types.ts"] = @'
export type StatusVariant = "recommended" | "alternative" | "caution";

export type CompareRow = {
  label: string;
  competitor: string;
  wyrestorm: string;
  verdict: "Match" | "Better" | "Partial" | "Verify";
};
'@

$files["src/wingman-v2/components/SectionCard.tsx"] = @'
import type { ReactNode } from "react";

type SectionCardProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  rightSlot?: ReactNode;
};

export function SectionCard({ title, subtitle, children, rightSlot }: SectionCardProps) {
  return (
    <section className="wingman-surface rounded-3xl p-6 lg:p-8">
      <div className="mb-5 flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="wingman-kicker">Wingman workspace</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-900">{title}</h2>
          {subtitle ? <p className="mt-2 max-w-3xl text-sm text-slate-600">{subtitle}</p> : null}
        </div>
        {rightSlot ? <div>{rightSlot}</div> : null}
      </div>
      {children}
    </section>
  );
}
'@

$files["src/wingman-v2/components/PageHero.tsx"] = @'
type PageHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PageHero({ eyebrow, title, description }: PageHeroProps) {
  return (
    <div className="mb-8 rounded-3xl wingman-panel wingman-grid p-8 lg:p-10">
      <p className="wingman-kicker">{eyebrow}</p>
      <h1 className="wingman-display mt-3 max-w-5xl text-4xl font-medium text-white lg:text-6xl">
        {title}
      </h1>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 lg:text-base">
        {description}
      </p>
    </div>
  );
}
'@

$files["src/wingman-v2/components/StatusChip.tsx"] = @'
import type { StatusVariant } from "../types";

type StatusChipProps = {
  label: string;
  variant: StatusVariant;
};

const classes: Record<StatusVariant, string> = {
  recommended: "bg-emerald-100 text-emerald-700 border-emerald-200",
  alternative: "bg-amber-100 text-amber-700 border-amber-200",
  caution: "bg-rose-100 text-rose-700 border-rose-200",
};

export function StatusChip({ label, variant }: StatusChipProps) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${classes[variant]}`}>
      {label}
    </span>
  );
}
'@

$files["src/wingman-v2/components/ConfidenceMeter.tsx"] = @'
type ConfidenceMeterProps = {
  score: number;
};

export function ConfidenceMeter({ score }: ConfidenceMeterProps) {
  const safe = Math.max(0, Math.min(100, score));
  const barClass =
    safe >= 80
      ? "bg-emerald-500"
      : safe >= 60
      ? "bg-amber-500"
      : "bg-rose-500";

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Confidence
        </span>
        <span className="text-sm font-semibold text-slate-800">{safe}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-200">
        <div className={`h-2 rounded-full ${barClass}`} style={{ width: `${safe}%` }} />
      </div>
    </div>
  );
}
'@

$files["src/wingman-v2/components/RecommendationCard.tsx"] = @'
import { ArrowRight, ShieldCheck, TriangleAlert } from "lucide-react";
import { ConfidenceMeter } from "./ConfidenceMeter";
import { StatusChip } from "./StatusChip";

type RecommendationCardProps = {
  title: string;
  sku: string;
  status: "recommended" | "alternative" | "caution";
  confidence: number;
  rationale: string[];
  caution?: string;
};

export function RecommendationCard({
  title,
  sku,
  status,
  confidence,
  rationale,
  caution,
}: RecommendationCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="wingman-kicker">Recommendation</p>
          <h3 className="mt-1 text-xl font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{sku}</p>
        </div>
        <StatusChip
          label={status === "recommended" ? "Recommended" : status === "alternative" ? "Alternative" : "Caution"}
          variant={status}
        />
      </div>

      <div className="mt-5">
        <ConfidenceMeter score={confidence} />
      </div>

      <ul className="mt-5 space-y-3 text-sm text-slate-700">
        {rationale.map((item) => (
          <li key={item} className="flex gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-600" />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      {caution ? (
        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <div className="flex gap-3">
            <TriangleAlert className="mt-0.5 h-4 w-4" />
            <span>{caution}</span>
          </div>
        </div>
      ) : null}

      <button className="mt-5 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white">
        Add to proposal <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
'@

$files["src/wingman-v2/components/ComparisonMatrix.tsx"] = @'
import type { CompareRow } from "../types";

type ComparisonMatrixProps = {
  title: string;
  competitorSku: string;
  wyrestormSku: string;
  rows: CompareRow[];
};

function verdictClass(verdict: CompareRow["verdict"]) {
  switch (verdict) {
    case "Better":
      return "bg-emerald-100 text-emerald-700";
    case "Match":
      return "bg-sky-100 text-sky-700";
    case "Partial":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-rose-100 text-rose-700";
  }
}

export function ComparisonMatrix({
  title,
  competitorSku,
  wyrestormSku,
  rows,
}: ComparisonMatrixProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <p className="wingman-kicker">Competitor compare</p>
        <h3 className="mt-1 text-lg font-semibold text-slate-900">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-5 py-3 font-semibold">Specification</th>
              <th className="px-5 py-3 font-semibold">{competitorSku}</th>
              <th className="px-5 py-3 font-semibold">{wyrestormSku}</th>
              <th className="px-5 py-3 font-semibold">Verdict</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-slate-100">
                <td className="px-5 py-3 font-medium text-slate-900">{row.label}</td>
                <td className="px-5 py-3 text-slate-700">{row.competitor}</td>
                <td className="px-5 py-3 text-slate-700">{row.wyrestorm}</td>
                <td className="px-5 py-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${verdictClass(row.verdict)}`}>
                    {row.verdict}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
'@

$files["src/wingman-v2/layout/AppShell.tsx"] = @'
import {
  LayoutDashboard,
  ClipboardList,
  Search,
  Scale,
  LayoutTemplate,
  FileUp,
  FileText,
  LifeBuoy,
} from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/wingman/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/wingman/discovery", label: "Discovery", icon: ClipboardList },
  { to: "/wingman/finder", label: "Product Finder", icon: Search },
  { to: "/wingman/compare", label: "Competitor Compare", icon: Scale },
  { to: "/wingman/templates", label: "Room Templates", icon: LayoutTemplate },
  { to: "/wingman/ingest", label: "Document Ingest", icon: FileUp },
  { to: "/wingman/proposal", label: "Proposal Builder", icon: FileText },
  { to: "/wingman/support", label: "Support", icon: LifeBuoy },
];

export function AppShell() {
  return (
    <div className="wingman-shell">
      <div className="mx-auto flex min-h-screen max-w-[1680px] gap-6 px-4 py-4 lg:px-6">
        <aside className="hidden w-[280px] shrink-0 rounded-3xl wingman-panel p-5 lg:block">
          <div className="border-b border-white/10 pb-5">
            <p className="wingman-kicker">WyreStorm</p>
            <h1 className="wingman-display mt-2 text-4xl text-white">Wingman</h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Fast pre-sales technical assistant for distributor sales teams.
            </p>
          </div>

          <nav className="mt-5 space-y-2">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition ${
                    isActive
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mb-6 rounded-3xl wingman-panel px-5 py-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="wingman-kicker">Distribution sales workspace</p>
                <p className="mt-1 text-sm text-slate-300">
                  Discovery, product matching, competitor replacement, room solutions, and proposal output.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button className="rounded-full border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/5">
                  Compare SKU
                </button>
                <button className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-900">
                  Start Discovery
                </button>
              </div>
            </div>
          </div>

          <Outlet />
        </main>
      </div>
    </div>
  );
}
'@

$files["src/wingman-v2/pages/DashboardPage.tsx"] = @'
import { FileUp, LayoutTemplate, Scale, Search } from "lucide-react";
import { PageHero } from "../components/PageHero";
import { RecommendationCard } from "../components/RecommendationCard";
import { SectionCard } from "../components/SectionCard";

const quickActions = [
  { label: "Start Discovery", icon: Search },
  { label: "Compare Competitor SKU", icon: Scale },
  { label: "Browse Room Templates", icon: LayoutTemplate },
  { label: "Upload Customer Files", icon: FileUp },
];

export function DashboardPage() {
  return (
    <div className="pb-10">
      <PageHero
        eyebrow="Dashboard"
        title="A premium pre-sales workspace for distributor teams."
        description="Guide less experienced reps from vague customer need to credible WyreStorm recommendation, with strong competitor replacement and polished proposal output."
      />

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <SectionCard
          title="Quick-start actions"
          subtitle="Start from problem type rather than product taxonomy."
        >
          <div className="grid gap-4 md:grid-cols-2">
            {quickActions.map(({ label, icon: Icon }) => (
              <button
                key={label}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-5 py-5 text-left hover:border-slate-300 hover:bg-white"
              >
                <div>
                  <p className="text-base font-semibold text-slate-900">{label}</p>
                  <p className="mt-1 text-sm text-slate-500">Guided flow with next-best actions</p>
                </div>
                <Icon className="h-5 w-5 text-slate-500" />
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              ["Active projects", "14"],
              ["Proposal-ready drafts", "6"],
              ["High-confidence matches", "82%"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-sm text-slate-500">{label}</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <div className="space-y-6">
          <RecommendationCard
            title="Recommended replacement path"
            sku="SW-640L-TX-W / SW-640L-RX-W"
            status="recommended"
            confidence={92}
            rationale={[
              "Aligns with small-to-medium meeting room switching needs.",
              "Strong fit for HDMI + USB-C source flexibility.",
              "Clear sales story versus competitor classroom matrix bundles.",
            ]}
            caution="Confirm USB host/device topology before finalizing the proposal."
          />

          <div className="rounded-3xl wingman-panel p-6">
            <p className="wingman-kicker">Recent insight</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Competitor compare is the hero workflow.</h3>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Surface clear differentiation, confidence scores, and next-best actions so distributor reps can move quickly in live conversations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
'@

$files["src/wingman-v2/pages/DiscoveryPage.tsx"] = @'
import { PageHero } from "../components/PageHero";
import { SectionCard } from "../components/SectionCard";

const steps = [
  "Application Type",
  "Room / Space",
  "Sources & Displays",
  "Signal Transport",
  "USB / Control",
  "Cable Constraints",
  "Budget & Preferences",
];

export function DiscoveryPage() {
  return (
    <div className="pb-10">
      <PageHero
        eyebrow="Guided Customer Discovery"
        title="Lead the conversation with structured discovery."
        description="Turn uncertain customer requests into a clear technical brief, while helping less experienced reps sound more confident."
      />

      <SectionCard
        title="Discovery workflow"
        subtitle="Each answer sharpens product matching, room template selection, and proposal-ready summaries."
      >
        <div className="grid gap-6 xl:grid-cols-[260px_1fr_340px]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Steps</p>
            <div className="mt-4 space-y-2">
              {steps.map((step, index) => (
                <div
                  key={step}
                  className={`rounded-2xl px-4 py-3 text-sm ${
                    index === 0
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  {index + 1}. {step}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-semibold text-slate-900">Current step: Application Type</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {[
                "Meeting room",
                "Boardroom",
                "Classroom",
                "Retail signage",
                "Hospitality",
                "Multi-zone",
              ].map((option) => (
                <button
                  key={option}
                  className={`rounded-2xl border px-4 py-4 text-left ${
                    option === "Meeting room"
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-800 hover:bg-white"
                  }`}
                >
                  <p className="font-semibold">{option}</p>
                  <p className="mt-1 text-sm opacity-80">Apply a guided question branch</p>
                </button>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Follow-up prompts</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                <li>How many displays are in the room?</li>
                <li>Will users connect with HDMI, USB-C, or both?</li>
                <li>Is USB camera/peripheral extension required?</li>
                <li>What is the furthest cable run?</li>
              </ul>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-900">Live summary</p>
            <div className="mt-4 space-y-4 text-sm">
              <div>
                <p className="text-slate-500">Application</p>
                <p className="font-semibold text-slate-900">Small meeting room</p>
              </div>
              <div>
                <p className="text-slate-500">Known needs</p>
                <p className="font-semibold text-slate-900">2 sources, 1 display, USB-C laptop support</p>
              </div>
              <div>
                <p className="text-slate-500">Missing information</p>
                <p className="font-semibold text-amber-700">Camera USB path and control requirements</p>
              </div>
              <div>
                <p className="text-slate-500">Suggested next action</p>
                <p className="font-semibold text-slate-900">Run product finder with pre-filled filters</p>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
'@

$files["src/wingman-v2/pages/FinderPage.tsx"] = @'
import { PageHero } from "../components/PageHero";
import { RecommendationCard } from "../components/RecommendationCard";
import { SectionCard } from "../components/SectionCard";
import { StatusChip } from "../components/StatusChip";

const products = [
  { sku: "SW-640L-TX-W", title: "4x1 Presentation Switcher", status: "recommended" as const },
  { sku: "SW-510W-TX", title: "Wireless / wired collaboration TX", status: "alternative" as const },
  { sku: "MX-0402-MST", title: "Matrix option for expanded routing", status: "caution" as const },
];

export function FinderPage() {
  return (
    <div className="pb-10">
      <PageHero
        eyebrow="Product Finder"
        title="Precision matching with guided commercial logic."
        description="Convert discovery answers into a shortlist, while making the recommendation rationale obvious enough to repeat in a sales conversation."
      />

      <SectionCard
        title="Finder workspace"
        subtitle="Filters on the left, best-match logic in the center, recommendation narrative on the right."
      >
        <div className="grid gap-6 xl:grid-cols-[250px_1fr_360px]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Filters</p>
            <div className="mt-4 space-y-4 text-sm">
              {[
                "Application: Meeting room",
                "Inputs: 2",
                "Display outputs: 1",
                "USB-C: Required",
                "Cable type: HDMI + USB-C",
                "Control: Basic room control",
              ].map((line) => (
                <div key={line} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-slate-700">
                  {line}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {products.map((product) => (
              <div key={product.sku} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{product.title}</h3>
                    <p className="mt-1 text-sm text-slate-500">{product.sku}</p>
                  </div>
                  <StatusChip
                    label={
                      product.status === "recommended"
                        ? "Recommended"
                        : product.status === "alternative"
                        ? "Alternative"
                        : "Caution"
                    }
                    variant={product.status}
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  {["Meeting room", "USB-C", "4K", "Presentation switch"].map((tag) => (
                    <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="mt-4 text-sm text-slate-700">
                  Strong fit for small meeting environments that need simple source selection, familiar cabling, and fast rep-friendly positioning.
                </p>
              </div>
            ))}
          </div>

          <RecommendationCard
            title="Best Match"
            sku="SW-640L-TX-W"
            status="recommended"
            confidence={89}
            rationale={[
              "Matches the requested room size and source count.",
              "Supports a strong 'simple but capable' distributor sales story.",
              "Easy path into proposal builder and room template bundle.",
            ]}
            caution="Validate whether a receiver and accessory set should be included as standard."
          />
        </div>
      </SectionCard>
    </div>
  );
}
'@

$files["src/wingman-v2/pages/ComparePage.tsx"] = @'
import { PageHero } from "../components/PageHero";
import { ComparisonMatrix } from "../components/ComparisonMatrix";
import { RecommendationCard } from "../components/RecommendationCard";
import { SectionCard } from "../components/SectionCard";
import type { CompareRow } from "../types";

const rows: CompareRow[] = [
  { label: "HDMI inputs", competitor: "4", wyrestorm: "4", verdict: "Match" },
  { label: "USB-C connectivity", competitor: "Optional", wyrestorm: "Native", verdict: "Better" },
  { label: "Auto switching", competitor: "Yes", wyrestorm: "Yes", verdict: "Match" },
  { label: "Control integration", competitor: "Basic", wyrestorm: "Expanded", verdict: "Better" },
  { label: "USB routing clarity", competitor: "Unknown", wyrestorm: "Verify by topology", verdict: "Verify" },
];

export function ComparePage() {
  return (
    <div className="pb-10">
      <PageHero
        eyebrow="Competitor Comparison"
        title="Make competitor replacement the most convincing screen in the product."
        description="Show the WyreStorm equivalent, the proof behind the match, the areas where it wins, and the areas that still need confirmation."
      />

      <SectionCard
        title="Competitor replacement workspace"
        subtitle="This page should carry the strongest commercial and technical confidence in the whole application."
        rightSlot={
          <div className="flex gap-3">
            <button className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700">Compare another SKU</button>
            <button className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white">Add matched solution</button>
          </div>
        }
      >
        <div className="grid gap-6 xl:grid-cols-[1.25fr_360px]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                <input
                  readOnly
                  value="Competitor SKU: DM-PSU-441"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800"
                />
                <input
                  readOnly
                  value="WyreStorm equivalent: SW-640L-TX-W"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800"
                />
                <button className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white">Run compare</button>
              </div>
            </div>

            <ComparisonMatrix
              title="Side-by-side equivalent review"
              competitorSku="DM-PSU-441"
              wyrestormSku="SW-640L-TX-W"
              rows={rows}
            />

            <div className="grid gap-4 md:grid-cols-3">
              {[
                ["Clear differentiation", "Highlight commercial and technical wins without overselling."],
                ["Visual confidence", "Use confidence, compatibility, and caution states consistently."],
                ["Next-best actions", "Send the user directly to proposal, accessories, or room templates."],
              ].map(([title, copy]) => (
                <div key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-base font-semibold text-slate-900">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{copy}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <RecommendationCard
              title="Equivalent recommendation"
              sku="SW-640L-TX-W"
              status="recommended"
              confidence={91}
              rationale={[
                "Commercially credible one-screen equivalent view.",
                "Clearer USB-C story for distributor conversations.",
                "Fast progression into proposal and room solution flows.",
              ]}
              caution="USB routing should be confirmed when customer peripherals are already specified."
            />

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-900">Positioning notes</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                <li>Lead with source flexibility and ease of deployment.</li>
                <li>Use control and accessory path as differentiation.</li>
                <li>Be explicit where the match is partial rather than direct.</li>
              </ul>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
'@

$files["src/wingman-v2/pages/TemplatesPage.tsx"] = @'
import { PageHero } from "../components/PageHero";
import { SectionCard } from "../components/SectionCard";

const templates = [
  "Huddle Room",
  "Meeting Room",
  "Boardroom",
  "Classroom",
  "Retail Signage",
  "Hospitality",
];

export function TemplatesPage() {
  return (
    <div className="pb-10">
      <PageHero
        eyebrow="Room Solution Templates"
        title="Start from familiar room types, not part numbers."
        description="Use recognizable AV scenarios to accelerate discovery, bundle products, and shape a polished solution story."
      />

      <SectionCard
        title="Template gallery"
        subtitle="Every template should pre-fill discovery answers, suggest a product bundle, and seed proposal sections."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {templates.map((template) => (
            <div key={template} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="h-44 bg-gradient-to-br from-slate-100 to-slate-200" />
              <div className="p-5">
                <h3 className="text-lg font-semibold text-slate-900">{template}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Includes room diagram, recommended core products, optional upgrades, and assumptions.
                </p>
                <button className="mt-4 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white">
                  Apply template
                </button>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
'@

$files["src/wingman-v2/pages/IngestPage.tsx"] = @'
import { PageHero } from "../components/PageHero";
import { SectionCard } from "../components/SectionCard";

export function IngestPage() {
  return (
    <div className="pb-10">
      <PageHero
        eyebrow="Document Ingest"
        title="Turn tenders, emails, PDFs, and schematics into structured sales requirements."
        description="This is where Wingman shifts from reference tool to real pre-sales assistant: ingest raw customer material, extract needs, flag unknowns, and create the first draft."
      />

      <SectionCard
        title="Upload to insight"
        subtitle="Files are converted into requirements, risks, and recommended next actions."
      >
        <div className="grid gap-6 xl:grid-cols-[1.05fr_1fr_340px]">
          <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <p className="text-lg font-semibold text-slate-900">Drop PDFs, emails, schematics, or tenders here</p>
            <p className="mt-2 text-sm text-slate-600">Supported flows already align with Mammoth and pdfjs usage in the project stack.</p>
            <button className="mt-5 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white">Select files</button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-semibold text-slate-900">Extracted requirements</p>
            <ul className="mt-4 space-y-3 text-sm text-slate-700">
              <li>Meeting room refresh for 8 people</li>
              <li>2 laptop sources + 1 in-room PC</li>
              <li>Single display, possible future dual-display expansion</li>
              <li>USB camera integration likely required</li>
              <li>Client prefers simple operation and minimal cable clutter</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-900">Unknowns / next actions</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              <li>Confirm USB host/device topology</li>
              <li>Confirm control expectations</li>
              <li>Confirm expansion path for second display</li>
            </ul>
            <button className="mt-5 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white">
              Create proposal draft
            </button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
'@

$files["src/wingman-v2/pages/ProposalPage.tsx"] = @'
import { PageHero } from "../components/PageHero";
import { SectionCard } from "../components/SectionCard";

export function ProposalPage() {
  return (
    <div className="pb-10">
      <PageHero
        eyebrow="Proposal Builder"
        title="Generate output that feels premium, branded, and customer-ready."
        description="The proposal view should echo the editorial polish of the product deck while preserving commercial clarity and technical confidence."
      />

      <SectionCard
        title="Proposal preview"
        subtitle="Use polished sectioning, large headings, room visuals, recommendation logic, assumptions, and next steps."
      >
        <div className="grid gap-6 xl:grid-cols-[260px_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Sections</p>
            <div className="mt-4 space-y-2 text-sm">
              {[
                "Cover",
                "Executive Summary",
                "Discovered Requirements",
                "Recommended Solution",
                "Competitor Replacement",
                "Room Diagram",
                "Assumptions",
                "Contact",
              ].map((item, index) => (
                <div
                  key={item}
                  className={`rounded-2xl px-4 py-3 ${
                    index === 0
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="bg-slate-950 px-8 py-10 text-white">
              <p className="wingman-kicker text-slate-400">WyreStorm Wingman proposal</p>
              <h2 className="wingman-display mt-3 text-5xl">Meeting Room AV Solution</h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
                A distributor-ready recommendation built from discovery, product matching, and competitor review.
              </p>
            </div>
            <div className="grid gap-6 p-8 lg:grid-cols-2">
              <div>
                <p className="wingman-kicker">Executive summary</p>
                <p className="mt-2 text-sm leading-7 text-slate-700">
                  This recommendation prioritizes fast deployment, simple user experience, and a clear path to future room expansion.
                </p>
              </div>
              <div>
                <p className="wingman-kicker">Recommended core products</p>
                <p className="mt-2 text-sm leading-7 text-slate-700">
                  SW-640L-TX-W, matched receiver path, and accessory bundle for connectivity and control.
                </p>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
'@

$files["src/wingman-v2/pages/SupportPage.tsx"] = @'
import { PageHero } from "../components/PageHero";
import { SectionCard } from "../components/SectionCard";

export function SupportPage() {
  return (
    <div className="pb-10">
      <PageHero
        eyebrow="Support / Escalation"
        title="Give users a clear human path when confidence drops."
        description="Low-confidence product matches and partial competitor equivalents should always offer a route to pre-sales escalation."
      />

      <SectionCard
        title="Support actions"
        subtitle="Use this area for contact details, escalation requests, and proposal footer details."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Escalate to pre-sales", "Route uncertain opportunities to a technical owner."],
            ["Request solution review", "Ask for a second-pass validation before sending the proposal."],
            ["Add branded contact footer", "Insert the correct sales or distributor contact details into the output."],
          ].map(([title, copy]) => (
            <div key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{copy}</p>
              <button className="mt-4 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white">
                Open
              </button>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
'@

$files["src/wingman-v2/app/wingmanRoutes.tsx"] = @'
import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { AppShell } from "../layout/AppShell";
import { ComparePage } from "../pages/ComparePage";
import { DashboardPage } from "../pages/DashboardPage";
import { DiscoveryPage } from "../pages/DiscoveryPage";
import { FinderPage } from "../pages/FinderPage";
import { IngestPage } from "../pages/IngestPage";
import { ProposalPage } from "../pages/ProposalPage";
import { SupportPage } from "../pages/SupportPage";
import { TemplatesPage } from "../pages/TemplatesPage";

export const wingmanRoutes: RouteObject[] = [
  {
    path: "/wingman",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "discovery", element: <DiscoveryPage /> },
      { path: "finder", element: <FinderPage /> },
      { path: "compare", element: <ComparePage /> },
      { path: "templates", element: <TemplatesPage /> },
      { path: "ingest", element: <IngestPage /> },
      { path: "proposal", element: <ProposalPage /> },
      { path: "support", element: <SupportPage /> },
    ],
  },
];
'@

$files["src/wingman-v2/app/WingmanStandalone.tsx"] = @'
import { BrowserRouter, Navigate, useRoutes } from "react-router-dom";
import { wingmanRoutes } from "./wingmanRoutes";

function WingmanRouter() {
  return useRoutes([
    ...wingmanRoutes,
    { path: "*", element: <Navigate to="/wingman/dashboard" replace /> },
  ]);
}

export default function WingmanStandalone() {
  return (
    <BrowserRouter>
      <WingmanRouter />
    </BrowserRouter>
  );
}
'@

foreach ($relativePath in $files.Keys) {
    $absolutePath = Join-Path $ProjectRoot $relativePath
    Write-TextFile -Path $absolutePath -Content $files[$relativePath]
}

$themeImportCss = '@import "./wingman-v2/styles/theme.css";'
$themeImportTs = 'import "./wingman-v2/styles/theme.css";'

$cssCandidates = @(
    "src/index.css",
    "src/main.css",
    "src/app.css",
    "src/styles.css",
    "src/globals.css"
) | ForEach-Object { Join-Path $ProjectRoot $_ }

$cssFile = $cssCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($cssFile) {
    $cssContent = Get-Content -Path $cssFile -Raw
    if ($cssContent -notmatch [regex]::Escape($themeImportCss)) {
        Backup-File -Path $cssFile
        Set-Content -Path $cssFile -Value ($themeImportCss + [Environment]::NewLine + $cssContent) -Encoding utf8
        Write-Host "Imported Wingman theme into $cssFile"
    }
    else {
        Write-Host "Theme import already present in $cssFile"
    }
}
else {
    $mainCandidates = @(
        "src/main.tsx",
        "src/main.jsx",
        "src/main.ts",
        "src/main.js"
    ) | ForEach-Object { Join-Path $ProjectRoot $_ }

    $mainFile = $mainCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

    if ($mainFile) {
        $mainContent = Get-Content -Path $mainFile -Raw
        if ($mainContent -notmatch [regex]::Escape($themeImportTs)) {
            Backup-File -Path $mainFile
            Set-Content -Path $mainFile -Value ($themeImportTs + [Environment]::NewLine + $mainContent) -Encoding utf8
            Write-Host "Imported Wingman theme into $mainFile"
        }
        else {
            Write-Host "Theme import already present in $mainFile"
        }
    }
    else {
        throw "No CSS entry file or main entry file found under src. Expected one of: index.css, main.css, app.css, styles.css, globals.css, main.tsx, main.jsx, main.ts, main.js"
    }
}

if ($PatchApp) {
    $appCandidates = @(
        "src/App.tsx",
        "src/App.jsx"
    ) | ForEach-Object { Join-Path $ProjectRoot $_ }

    $appFile = $appCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

    if ($appFile) {
        Backup-File -Path $appFile
        $content = 'export { default } from "./wingman-v2/app/WingmanStandalone";'
        Set-Content -Path $appFile -Value $content -Encoding utf8
        Write-Host "Patched $appFile to preview Wingman standalone routes."
    }
    else {
        Write-Warning "No App.tsx/App.jsx file found to patch."
    }
}

Write-Host ""
Write-Host "Done."
Write-Host "Preview route root: /wingman/dashboard"
if ($PatchApp) {
    Write-Host "Your original files were backed up under: $BackupRoot"
}
else {
    Write-Host "To preview quickly, rerun with -PatchApp"
}