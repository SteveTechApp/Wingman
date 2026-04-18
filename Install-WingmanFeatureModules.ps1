[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$ProjectRoot = ".",

    [Parameter(Mandatory = $false)]
    [switch]$PatchApp,

    [Parameter(Mandatory = $false)]
    [switch]$ArchiveLegacy,

    [Parameter(Mandatory = $false)]
    [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ProjectRoot = (Resolve-Path $ProjectRoot).Path
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupRoot = Join-Path $ProjectRoot ".wingman-backup\$Timestamp"
$ArchiveRoot = Join-Path $ProjectRoot "archive\wingman-legacy\$Timestamp"
$RestoreScriptPath = Join-Path $ProjectRoot "Restore-WingmanLegacyArchive.ps1"

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

function Ensure-ImportLine {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,

        [Parameter(Mandatory = $true)]
        [string]$Line
    )

    if (-not (Test-Path $Path)) {
        return
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

function Get-MainEntryFile {
    $mainCandidates = @(
        "src/main.tsx",
        "src/main.jsx",
        "src/main.ts",
        "src/main.js"
    ) | ForEach-Object { Join-Path $ProjectRoot $_ }

    return ($mainCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1)
}

function Ensure-WingmanEntryImport {
    $mainFile = Get-MainEntryFile
    if (-not $mainFile) {
        return
    }

    Ensure-ImportLine -Path $mainFile -Line 'import "./wingman-v2/styles/entry.css";'
}

function Get-LegacyWingmanRelativePaths {
    $paths = New-Object System.Collections.Generic.List[string]

    $explicitCandidates = @(
        "src/wingman",
        "src/Wingman",
        "src/features/dashboard",
        "src/features/discovery",
        "src/features/product-finder",
        "src/features/productFinder",
        "src/features/compare",
        "src/features/competitor-compare",
        "src/features/competitorCompare",
        "src/features/templates",
        "src/features/room-templates",
        "src/features/roomTemplates",
        "src/features/ingest",
        "src/features/proposal",
        "src/features/support",
        "src/features/videowall",
        "src/features/video-wall",
        "src/features/sales-helper",
        "src/features/salesHelper",
        "src/features/call-cards",
        "src/features/callCards",
        "src/pages/wingman",
        "src/pages/Wingman",
        "src/routes/wingman",
        "src/routes/Wingman",
        "src/components/wingman",
        "src/components/Wingman"
    )

    foreach ($relative in $explicitCandidates) {
        $absolute = Join-Path $ProjectRoot $relative
        if (Test-Path $absolute) {
            $paths.Add($relative)
        }
    }

    $srcRoot = Join-Path $ProjectRoot "src"
    if (Test-Path $srcRoot) {
        Get-ChildItem -Path $srcRoot -Directory -Recurse |
            Where-Object {
                $_.FullName -notlike "*\node_modules\*" -and
                $_.FullName -notlike "*\archive\*" -and
                $_.FullName -notlike "*\src\wingman-v2*" -and
                $_.Name -match "wingman"
            } |
            ForEach-Object {
                $relative = Get-RelativePath -BasePath $ProjectRoot -TargetPath $_.FullName
                if ($relative -ne "src\wingman-v2" -and $relative -ne "src/wingman-v2") {
                    $paths.Add($relative)
                }
            }
    }

    return $paths | Sort-Object -Unique
}

function Archive-ItemByRelativePath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RelativePath
    )

    $source = Join-Path $ProjectRoot $RelativePath
    if (-not (Test-Path $source)) {
        return
    }

    $normalizedRelative = $RelativePath.Replace("/", [System.IO.Path]::DirectorySeparatorChar)
    $target = Join-Path $ArchiveRoot $normalizedRelative
    Ensure-Directory -Path (Split-Path $target -Parent)

    Move-Item -Path $source -Destination $target -Force
    Write-Host "Archived $RelativePath -> $target"
}

function Write-RestoreScript {
    $content = @'
[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$ProjectRoot = "."
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ProjectRoot = (Resolve-Path $ProjectRoot).Path
$archiveBase = Join-Path $ProjectRoot "archive\wingman-legacy"

if (-not (Test-Path $archiveBase)) {
    throw "No legacy archive folder found at $archiveBase"
}

$latestArchive = Get-ChildItem -Path $archiveBase -Directory |
    Sort-Object Name -Descending |
    Select-Object -First 1

if (-not $latestArchive) {
    throw "No timestamped archive folders found in $archiveBase"
}

Get-ChildItem -Path $latestArchive.FullName -Recurse | Sort-Object FullName | ForEach-Object {
    $relative = $_.FullName.Substring($latestArchive.FullName.Length).TrimStart('\')
    if (-not $relative) {
        return
    }

    $destination = Join-Path $ProjectRoot $relative

    if ($_.PSIsContainer) {
        if (-not (Test-Path $destination)) {
            New-Item -ItemType Directory -Path $destination -Force | Out-Null
        }
    }
    else {
        $destinationDir = Split-Path $destination -Parent
        if (-not (Test-Path $destinationDir)) {
            New-Item -ItemType Directory -Path $destinationDir -Force | Out-Null
        }
        Copy-Item -Path $_.FullName -Destination $destination -Force
        Write-Host "Restored $destination"
    }
}

Write-Host ""
Write-Host "Restore complete from: $($latestArchive.FullName)"
'@

    Write-TextFile -Path $RestoreScriptPath -Content $content
}

$files = @{}

$files["src/wingman-v2/components/WingmanGuruFab.tsx"] = @'
import { Bot } from "lucide-react";

type WingmanGuruFabProps = {
  open: boolean;
  onClick: () => void;
};

export function WingmanGuruFab({ open, onClick }: WingmanGuruFabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "fixed bottom-6 right-6 z-50 inline-flex items-center gap-3 rounded-full border px-5 py-3 shadow-2xl transition-all duration-200",
        open
          ? "border-orange-400 bg-orange-500 text-slate-950"
          : "border-orange-400/40 bg-slate-950 text-orange-100 hover:border-orange-300 hover:bg-slate-900",
      ].join(" ")}
      aria-label="Toggle Wingman Guru helper"
    >
      <Bot className="h-5 w-5" />
      <span className="text-sm font-semibold">Wingman Guru</span>
    </button>
  );
}
'@

$files["src/wingman-v2/components/WingmanGuruDrawer.tsx"] = @'
import { Bot, Lightbulb, MessageSquare, Monitor, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

type WingmanGuruDrawerProps = {
  open: boolean;
  onClose: () => void;
};

type HelperContext = {
  label: string;
  purpose: string;
  nextMove: string;
  quickLinks: { label: string; to: string; icon: "sales" | "videowall" | "helper" }[];
};

const pageHelp: Record<string, HelperContext> = {
  "/wingman/dashboard": {
    label: "Workspace guidance",
    purpose: "Use Guru to route the rep into the right motion quickly and reduce hesitation at the start of a sales conversation.",
    nextMove: "Pick a path: Discovery for clarification, Competitor Compare for replacement, or Projects to resume live work.",
    quickLinks: [
      { label: "Open Sales Helper", to: "/wingman/sales-helper", icon: "sales" },
      { label: "Open Call Cards", to: "/wingman/call-cards", icon: "helper" },
      { label: "Open Videowall Builder", to: "/wingman/videowall", icon: "videowall" },
    ],
  },
  "/wingman/discovery": {
    label: "Discovery coaching",
    purpose: "Guide the rep to ask smarter questions, expose technical uncertainty early, and capture the right brief.",
    nextMove: "Use the helper cards to decide what to ask next and what missing detail is still blocking confidence.",
    quickLinks: [
      { label: "Discovery call cards", to: "/wingman/call-cards", icon: "helper" },
      { label: "Sales positioning help", to: "/wingman/sales-helper", icon: "sales" },
      { label: "Back to projects", to: "/wingman/projects", icon: "helper" },
    ],
  },
  "/wingman/finder": {
    label: "Positioning support",
    purpose: "Help the rep explain why a recommended product is the right commercial and technical fit.",
    nextMove: "Use sales helper prompts to strengthen positioning before carrying the result into compare or proposal.",
    quickLinks: [
      { label: "Sales positioning helper", to: "/wingman/sales-helper", icon: "sales" },
      { label: "Competitor compare", to: "/wingman/compare", icon: "helper" },
      { label: "Call cards", to: "/wingman/call-cards", icon: "helper" },
    ],
  },
  "/wingman/compare": {
    label: "Replacement guidance",
    purpose: "Make competitor replacement safer by surfacing talking points, cautions, and next-best actions.",
    nextMove: "Check objections, confirm partial-match risks, and use call cards to guide the rest of the sales conversation.",
    quickLinks: [
      { label: "Sales objection helper", to: "/wingman/sales-helper", icon: "sales" },
      { label: "Call cards", to: "/wingman/call-cards", icon: "helper" },
      { label: "Proposal builder", to: "/wingman/proposal", icon: "helper" },
    ],
  },
  "/wingman/videowall": {
    label: "Videowall design help",
    purpose: "Use Guru to shape LED or LCD wall requirements into a proposal-ready recommendation path.",
    nextMove: "Confirm wall type, size, resolution, and signal/control approach before adding the design into the project.",
    quickLinks: [
      { label: "Sales helper", to: "/wingman/sales-helper", icon: "sales" },
      { label: "Projects", to: "/wingman/projects", icon: "helper" },
      { label: "Proposal builder", to: "/wingman/proposal", icon: "helper" },
    ],
  },
};

function iconFor(kind: "sales" | "videowall" | "helper") {
  if (kind === "sales") return <Lightbulb className="h-4 w-4" />;
  if (kind === "videowall") return <Monitor className="h-4 w-4" />;
  return <MessageSquare className="h-4 w-4" />;
}

export function WingmanGuruDrawer({ open, onClose }: WingmanGuruDrawerProps) {
  const location = useLocation();
  const context = pageHelp[location.pathname] ?? {
    label: "Wingman Guru",
    purpose: "Use the floating helper to bring sales prompts, next moves, and supporting tools into the current workflow.",
    nextMove: "Open the supporting module that best helps the current conversation move forward.",
    quickLinks: [
      { label: "Sales helper", to: "/wingman/sales-helper", icon: "sales" },
      { label: "Call cards", to: "/wingman/call-cards", icon: "helper" },
      { label: "Videowall builder", to: "/wingman/videowall", icon: "videowall" },
    ],
  };

  return (
    <div
      className={[
        "fixed inset-y-0 right-0 z-40 w-full max-w-[420px] transform transition-transform duration-300",
        open ? "translate-x-0" : "translate-x-full",
      ].join(" ")}
    >
      <div className="flex h-full flex-col border-l border-white/10 bg-slate-950/95 p-6 text-white shadow-2xl backdrop-blur-xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <p className="wingman-kicker text-slate-400">Floating helper</p>
            <div className="mt-2 flex items-center gap-3">
              <Bot className="h-6 w-6 text-orange-300" />
              <h2 className="text-2xl font-semibold">Wingman Guru</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-300">{context.label}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 p-2 text-slate-300 transition hover:bg-white/5 hover:text-white"
            aria-label="Close Wingman Guru"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 space-y-6 overflow-y-auto">
          <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="wingman-kicker text-slate-400">Purpose</p>
            <p className="mt-3 text-sm leading-6 text-slate-200">{context.purpose}</p>
          </section>

          <section className="rounded-2xl border border-orange-400/20 bg-orange-500/10 p-4">
            <p className="wingman-kicker text-orange-200">Next move</p>
            <p className="mt-3 text-sm leading-6 text-orange-50">{context.nextMove}</p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="wingman-kicker text-slate-400">Quick actions</p>
            <div className="mt-4 space-y-3">
              {context.quickLinks.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  onClick={onClose}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 transition hover:border-orange-300/40 hover:bg-slate-900"
                >
                  <span className="inline-flex items-center gap-3">
                    {iconFor(item.icon)}
                    {item.label}
                  </span>
                  <span className="text-xs uppercase tracking-[0.18em] text-slate-400">Open</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="wingman-kicker text-slate-400">Suggested helper cards</p>
            <div className="mt-4 space-y-3 text-sm text-slate-200">
              <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
                <p className="font-semibold">Ask this next</p>
                <p className="mt-2 text-slate-300">
                  What technical constraint, competitor pressure, or customer uncertainty is still blocking the decision?
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
                <p className="font-semibold">Position this clearly</p>
                <p className="mt-2 text-slate-300">
                  Use simpler language first, then justify the recommendation with one technical strength and one commercial advantage.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
                <p className="font-semibold">Watch for risk</p>
                <p className="mt-2 text-slate-300">
                  If the topology, USB path, or wall-control requirement is unclear, escalate before finalizing the proposal.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
'@

$files["src/wingman-v2/layout/AppShell.tsx"] = @'
import type { ReactNode } from "react";
import { useState } from "react";
import {
  Bot,
  ClipboardList,
  FileText,
  FileUp,
  FolderKanban,
  LayoutDashboard,
  LayoutTemplate,
  LifeBuoy,
  Monitor,
  Scale,
  Search,
} from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { WingmanGuruDrawer } from "../components/WingmanGuruDrawer";
import { WingmanGuruFab } from "../components/WingmanGuruFab";

type AppShellProps = {
  children?: ReactNode;
};

const navItems = [
  { to: "/wingman/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/wingman/projects", label: "Project Management", icon: FolderKanban },
  { to: "/wingman/discovery", label: "Discovery", icon: ClipboardList },
  { to: "/wingman/finder", label: "Product Finder", icon: Search },
  { to: "/wingman/compare", label: "Competitor Compare", icon: Scale },
  { to: "/wingman/templates", label: "Room Templates", icon: LayoutTemplate },
  { to: "/wingman/videowall", label: "Videowall Builder", icon: Monitor },
  { to: "/wingman/sales-helper", label: "Sales Helper", icon: Bot },
  { to: "/wingman/call-cards", label: "Call Cards", icon: ClipboardList },
  { to: "/wingman/ingest", label: "Document Ingest", icon: FileUp },
  { to: "/wingman/proposal", label: "Proposal Builder", icon: FileText },
  { to: "/wingman/support", label: "Support", icon: LifeBuoy },
];

export function AppShell({ children }: AppShellProps) {
  const [guruOpen, setGuruOpen] = useState(false);

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
                  [
                    "flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition-all duration-200",
                    isActive
                      ? "border-orange-400/50 bg-orange-500/12 text-orange-100 shadow-[0_0_0_1px_rgba(251,146,60,0.18),0_0_30px_rgba(251,146,60,0.24)]"
                      : "border-transparent text-slate-300 hover:border-white/10 hover:bg-white/5 hover:text-white",
                  ].join(" ")
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">{children ?? <Outlet />}</main>
      </div>

      <WingmanGuruFab open={guruOpen} onClick={() => setGuruOpen((current) => -not $false -eq $false ? !current : !current)} />
      <WingmanGuruDrawer open={guruOpen} onClose={() => setGuruOpen(false)} />
    </div>
  );
}

export default AppShell;
'@

$files["src/wingman-v2/pages/VideowallBuilderPage.tsx"] = @'
import { PageHero } from "../components/PageHero";
import { RecommendationCard } from "../components/RecommendationCard";
import { SectionCard } from "../components/SectionCard";

const wallTypes = [
  {
    label: "LED videowall",
    summary: "Use when bezel-free impact, scalable size, and viewing distance flexibility are priority.",
  },
  {
    label: "LCD videowall",
    summary: "Use when cost control, indoor clarity, and standard panel structures fit the application.",
  },
];

const designFactors = [
  "Overall wall width and height",
  "Viewing distance",
  "Pixel pitch or bezel strategy",
  "Content resolution and aspect ratio",
  "Signal distribution and controller path",
  "Mounting, service, and control requirements",
];

export function VideowallBuilderPage() {
  return (
    <div className="pb-10">
      <PageHero
        eyebrow="LED / LCD Videowall Builder"
        title="Shape a videowall concept into a commercially credible design path."
        purpose="This builder helps distributor reps move from a rough videowall requirement into a structured LED or LCD solution with clearer sizing, control, signal, and proposal guidance."
        nextMove="Choose wall type, set the core wall dimensions, then validate resolution, control, and service assumptions before carrying the design into proposal output."
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard
          title="Videowall configuration"
          subtitle="Use this workspace to compare LED and LCD design logic and frame the right customer conversation."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            {wallTypes.map((type) => (
              <div key={type.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">{type.label}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{type.summary}</p>
                <button className="mt-5 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white">
                  Select path
                </button>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-900">Core design inputs</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                {designFactors.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-semibold text-slate-900">Example wall summary</p>
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <div>
                  <p className="text-slate-500">Wall type</p>
                  <p className="font-semibold text-slate-900">LED videowall</p>
                </div>
                <div>
                  <p className="text-slate-500">Wall size</p>
                  <p className="font-semibold text-slate-900">6.0m x 2.0m</p>
                </div>
                <div>
                  <p className="text-slate-500">Target environment</p>
                  <p className="font-semibold text-slate-900">Corporate foyer / experience area</p>
                </div>
                <div>
                  <p className="text-slate-500">Signal path</p>
                  <p className="font-semibold text-slate-900">Controller + distribution + control layer</p>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        <div className="space-y-6">
          <RecommendationCard
            title="Suggested design direction"
            sku="VIDEOWALL-LED-CONCEPT"
            status="recommended"
            confidence={84}
            rationale={[
              "Strong path for premium large-format presentation impact.",
              "Supports a clearer story around scale, control, and future flexibility.",
              "Can feed directly into project, compare, and proposal flows.",
            ]}
            caution="Confirm service access, viewing distance, and controller architecture before final recommendation."
          />

          <SectionCard
            title="Builder outputs"
            subtitle="Use these outputs to keep the sales motion structured."
          >
            <div className="grid gap-3 text-sm">
              {[
                "Create videowall project brief",
                "Send summary to proposal builder",
                "Attach recommended signal/control path",
                "Create customer assumptions list",
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-slate-700">
                  {item}
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
'@

$files["src/wingman-v2/pages/SalesHelperPage.tsx"] = @'
import { PageHero } from "../components/PageHero";
import { SectionCard } from "../components/SectionCard";

const positioningCards = [
  {
    title: "How to position the recommendation",
    text: "Lead with user simplicity first, then explain the technical strength that makes the design credible.",
  },
  {
    title: "How to handle uncertainty",
    text: "Be explicit where the answer is partial. Confidence rises when the rep shows what still needs confirmation.",
  },
  {
    title: "How to differentiate from competitors",
    text: "Use one commercial reason and one operational or deployment reason instead of drowning the customer in specs.",
  },
];

const objectionCards = [
  {
    title: "Price pressure",
    text: "Reframe around deployment efficiency, supportability, and the cost of choosing a weaker fit.",
  },
  {
    title: "Customer already requested competitor brand",
    text: "Acknowledge the request, then show the closest equivalent and where WyreStorm improves the use case.",
  },
  {
    title: "Technical hesitation from the rep",
    text: "Use Guru prompts and structured helper cards to keep the conversation moving until deeper technical review is needed.",
  },
];

export function SalesHelperPage() {
  return (
    <div className="pb-10">
      <PageHero
        eyebrow="Sales Q&A Positioning Helper"
        title="Give the rep a better answer before the customer hears the wrong one."
        purpose="This module turns product information into sales language by helping less experienced distributor reps ask better questions, position more cleanly, and handle common objections with confidence."
        nextMove="Use the positioning cards for the live conversation, then move into Compare, Finder, or Proposal with a clearer commercial story."
      />

      <div className="space-y-6">
        <SectionCard
          title="Positioning guidance"
          subtitle="Use these cards to frame the recommendation in a way that is fast, clear, and commercially useful."
        >
          <div className="grid gap-4 lg:grid-cols-3">
            {positioningCards.map((card) => (
              <div key={card.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">{card.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{card.text}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Objection handling"
          subtitle="Use these cards to keep control of common commercial and technical pushback."
        >
          <div className="grid gap-4 lg:grid-cols-3">
            {objectionCards.map((card) => (
              <div key={card.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">{card.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{card.text}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Suggested live prompts"
          subtitle="These are the kinds of prompts Wingman should eventually generate dynamically from project context."
        >
          <div className="grid gap-3 text-sm">
            {[
              "What is the customer really trying to make simpler for the end user?",
              "Which current requirement matters most: source flexibility, distance, control, or future expansion?",
              "Is the competitor SKU being used as a specification anchor or just a reference point?",
              "What still needs confirming before the recommendation is safe to present as final?",
            ].map((prompt) => (
              <div key={prompt} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-slate-700">
                {prompt}
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
'@

$files["src/wingman-v2/pages/CallCardsPage.tsx"] = @'
import { PageHero } from "../components/PageHero";
import { SectionCard } from "../components/SectionCard";

const callCards = [
  {
    title: "Discovery call card",
    ask: "What does the room need to do that it cannot do today?",
    position: "Use this to move from vague problem statement into application-driven discovery.",
    watch: "Do not jump to SKU discussion before clarifying sources, displays, control, and cable constraints.",
  },
  {
    title: "Competitor replacement card",
    ask: "Is the customer committed to the competitor model, or just using it as a familiar reference?",
    position: "Use this to open the door to a WyreStorm equivalent without sounding defensive.",
    watch: "Be explicit when the match is partial or when accessory assumptions still exist.",
  },
  {
    title: "Videowall opportunity card",
    ask: "Is the priority impact, resolution, maintenance, or budget control?",
    position: "Use this to steer the customer toward LED or LCD logic before the conversation gets lost in display detail.",
    watch: "Wall size, viewing distance, and service access are easy to under-qualify.",
  },
  {
    title: "Proposal closing card",
    ask: "What would the customer need to see before they are comfortable moving to the next stage?",
    position: "Use this to frame the proposal as the next logical decision tool rather than a passive document.",
    watch: "Unclear assumptions weaken proposal confidence fast.",
  },
];

export function CallCardsPage() {
  return (
    <div className="pb-10">
      <PageHero
        eyebrow="Sales Call Helper Cards"
        title="Keep the conversation moving with structured call prompts."
        purpose="These cards are built to support inexperienced sales users in live conversations by giving them simple prompts for what to ask, how to position, and what risk to watch next."
        nextMove="Use the most relevant card during the conversation, then push the outcome into Discovery, Compare, Videowall Builder, or Proposal Builder."
      />

      <SectionCard
        title="Call card library"
        subtitle="These cards should eventually be filtered by application, workflow stage, competitor, and opportunity type."
      >
        <div className="grid gap-4 xl:grid-cols-2">
          {callCards.map((card) => (
            <div key={card.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-slate-900">{card.title}</h3>

              <div className="mt-5 space-y-4 text-sm leading-6">
                <div>
                  <p className="wingman-kicker">Ask this next</p>
                  <p className="mt-2 text-slate-700">{card.ask}</p>
                </div>

                <div>
                  <p className="wingman-kicker">Position it like this</p>
                  <p className="mt-2 text-slate-700">{card.position}</p>
                </div>

                <div>
                  <p className="wingman-kicker">Watch for risk</p>
                  <p className="mt-2 text-slate-700">{card.watch}</p>
                </div>
              </div>
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
import { CallCardsPage } from "../pages/CallCardsPage";
import { ComparePage } from "../pages/ComparePage";
import { DashboardPage } from "../pages/DashboardPage";
import { DiscoveryPage } from "../pages/DiscoveryPage";
import { FinderPage } from "../pages/FinderPage";
import { IngestPage } from "../pages/IngestPage";
import { ProjectsPage } from "../pages/ProjectsPage";
import { ProposalPage } from "../pages/ProposalPage";
import { SalesHelperPage } from "../pages/SalesHelperPage";
import { SupportPage } from "../pages/SupportPage";
import { TemplatesPage } from "../pages/TemplatesPage";
import { VideowallBuilderPage } from "../pages/VideowallBuilderPage";

export const wingmanRoutes: RouteObject[] = [
  {
    path: "/wingman",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "projects", element: <ProjectsPage /> },
      { path: "discovery", element: <DiscoveryPage /> },
      { path: "finder", element: <FinderPage /> },
      { path: "compare", element: <ComparePage /> },
      { path: "templates", element: <TemplatesPage /> },
      { path: "videowall", element: <VideowallBuilderPage /> },
      { path: "sales-helper", element: <SalesHelperPage /> },
      { path: "call-cards", element: <CallCardsPage /> },
      { path: "ingest", element: <IngestPage /> },
      { path: "proposal", element: <ProposalPage /> },
      { path: "support", element: <SupportPage /> },
    ],
  },
];
'@

$files["src/wingman-v2/app/WingmanStandalone.tsx"] = @'
import "../styles/entry.css";
import { Navigate, useRoutes } from "react-router-dom";
import { wingmanRoutes } from "./wingmanRoutes";

export default function WingmanStandalone() {
  return useRoutes([
    ...wingmanRoutes,
    { path: "*", element: <Navigate to="/wingman/dashboard" replace /> },
  ]);
}
'@

foreach ($relativePath in $files.Keys) {
    $absolutePath = Join-Path $ProjectRoot $relativePath
    Write-TextFile -Path $absolutePath -Content $files[$relativePath]
}

Ensure-WingmanEntryImport

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
        Write-Host "Patched $appFile to load WingmanStandalone."
    }
    else {
        Write-Warning "No App.tsx/App.jsx file found to patch."
    }
}

if ($ArchiveLegacy) {
    Ensure-Directory -Path $ArchiveRoot

    $legacyRelativePaths = Get-LegacyWingmanRelativePaths
    foreach ($relativePath in $legacyRelativePaths) {
        $normalized = $relativePath.Replace("/", [System.IO.Path]::DirectorySeparatorChar)
        if ($normalized -like "src\wingman-v2*" -or $normalized -like "archive\wingman-legacy*") {
            continue
        }

        Archive-ItemByRelativePath -RelativePath $relativePath
    }

    Write-RestoreScript

    $manifestPath = Join-Path $ArchiveRoot "_archive-manifest.txt"
    $manifest = @()
    $manifest += "Archived at: $Timestamp"
    $manifest += "Project root: $ProjectRoot"
    $manifest += ""
    $manifest += "Archived items:"
    $manifest += ($legacyRelativePaths | Sort-Object -Unique)
    Set-Content -Path $manifestPath -Value $manifest -Encoding utf8
    Write-Host "Wrote archive manifest: $manifestPath"
    Write-Host "Wrote restore script: $RestoreScriptPath"
}

Write-Host ""
Write-Host "Feature module install complete."
Write-Host "Run next:"
Write-Host "  npm run build"
Write-Host "  npm run dev"
if ($PatchApp) {
    Write-Host "App entry patched to WingmanStandalone."
}
if ($ArchiveLegacy) {
    Write-Host "Legacy content archived to: $ArchiveRoot"
}
Write-Host "Backup folder: $BackupRoot"