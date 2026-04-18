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

function Prepend-LineIfMissing {
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

function Get-MainEntryFile {
    $mainCandidates = @(
        "src/main.tsx",
        "src/main.jsx",
        "src/main.ts",
        "src/main.js"
    ) | ForEach-Object { Join-Path $ProjectRoot $_ }

    return ($mainCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1)
}

function Ensure-WingmanCssImport {
    $entryImport = 'import "./wingman-v2/styles/entry.css";'

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

        if ($cssContent -match "@tailwind\s+base;" -or $cssContent -match "@import\s+.*tailwind") {
            $themeImport = '@import "./wingman-v2/styles/theme.css";'
            if ($cssContent -notmatch [regex]::Escape($themeImport)) {
                Backup-File -Path $cssFile
                Set-Content -Path $cssFile -Value ($themeImport + [Environment]::NewLine + $cssContent) -Encoding utf8
                Write-Host "Imported theme into existing CSS file: $cssFile"
            }
            else {
                Write-Host "Theme import already present in $cssFile"
            }

            $mainFile = Get-MainEntryFile
            if ($mainFile) {
                $mainContent = Get-Content -Path $mainFile -Raw
                if ($mainContent -notmatch [regex]::Escape($entryImport)) {
                    Write-Host "Existing Tailwind CSS file detected. Skipping entry.css import in main file."
                }
            }
            return
        }
    }

    $mainFile = Get-MainEntryFile
    if (-not $mainFile) {
        throw "No main entry file found under src."
    }

    $mainContent = Get-Content -Path $mainFile -Raw
    if ($mainContent -notmatch [regex]::Escape($entryImport)) {
        Backup-File -Path $mainFile
        Set-Content -Path $mainFile -Value ($entryImport + [Environment]::NewLine + $mainContent) -Encoding utf8
        Write-Host "Imported Wingman entry.css into $mainFile"
    }
    else {
        Write-Host "Wingman entry.css already imported in $mainFile"
    }
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

$files["tailwind.config.js"] = @'
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
'@

$files["postcss.config.js"] = @'
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
'@

$files["tools/generate-product-intelligence-index.mjs"] = @'
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const sourceCandidates = [
  "data/products.json",
  "data/catalog.json",
  "src/data/products.json",
  "src/data/catalog.json",
  "src/content/products.json",
  "src/content/catalog.json",
  "public/products.json",
  "public/catalog.json",
  "public/data/products.json",
  "public/data/catalog.json",
];

const outputTargets = [
  { type: "json", path: "src/generated/product-intelligence-index.json" },
  { type: "ts", path: "src/generated/product-intelligence-index.ts" },
  { type: "json", path: "src/data/product-intelligence-index.json" },
  { type: "ts", path: "src/data/product-intelligence-index.ts" },
  { type: "json", path: "public/product-intelligence-index.json" },
];

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonFile(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

function ensureArrayPayload(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    if (Array.isArray(value.products)) return value.products;
    if (Array.isArray(value.items)) return value.items;
    if (Array.isArray(value.catalog)) return value.catalog;
    if (Array.isArray(value.data)) return value.data;
  }
  return [];
}

function asString(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizeProduct(item, index, sourceFile) {
  const sku =
    asString(item?.sku) ||
    asString(item?.SKU) ||
    asString(item?.partNumber) ||
    asString(item?.part_number) ||
    asString(item?.model) ||
    asString(item?.id);

  const name =
    asString(item?.name) ||
    asString(item?.title) ||
    asString(item?.productName) ||
    asString(item?.product_name) ||
    sku ||
    `Product ${index + 1}`;

  const description =
    asString(item?.description) ||
    asString(item?.summary) ||
    asString(item?.overview);

  const category =
    asString(item?.category) ||
    asString(item?.family) ||
    asString(item?.productFamily) ||
    asString(item?.product_family);

  const technologies = Array.isArray(item?.technologies)
    ? item.technologies.map(asString).filter(Boolean)
    : [];

  const connectors = Array.isArray(item?.connectors)
    ? item.connectors.map(asString).filter(Boolean)
    : [];

  const features = Array.isArray(item?.features)
    ? item.features
        .map((feature) =>
          typeof feature === "string"
            ? feature.trim()
            : asString(feature?.name || feature?.label || feature)
        )
        .filter(Boolean)
    : [];

  const applications = Array.isArray(item?.applications)
    ? item.applications.map(asString).filter(Boolean)
    : [];

  const searchTerms = [
    sku,
    name,
    category,
    description,
    ...technologies,
    ...connectors,
    ...features,
    ...applications,
  ]
    .map((value) => value.toLowerCase())
    .filter(Boolean);

  return {
    id: sku || `generated-${index + 1}`,
    sku,
    name,
    description,
    category,
    technologies,
    connectors,
    features,
    applications,
    searchTerms: Array.from(new Set(searchTerms)),
    source: path.relative(projectRoot, sourceFile).replace(/\\/g, "/"),
    raw: item,
  };
}

function dedupeProducts(products) {
  const seen = new Set();
  const results = [];

  for (const product of products) {
    const key = [
      product.sku?.toLowerCase() || "",
      product.name?.toLowerCase() || "",
    ].join("::");

    if (seen.has(key)) continue;
    seen.add(key);
    results.push(product);
  }

  return results;
}

function buildIndex(products, discoveredSources) {
  const bySku = {};
  const byName = {};

  for (const product of products) {
    if (product.sku) bySku[product.sku] = product.id;
    if (product.name) byName[product.name] = product.id;
  }

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      sourceFiles: discoveredSources.map((filePath) =>
        path.relative(projectRoot, filePath).replace(/\\/g, "/")
      ),
      count: products.length,
      generator: "tools/generate-product-intelligence-index.mjs",
    },
    products,
    lookup: {
      bySku,
      byName,
    },
  };
}

async function writeFileEnsured(targetPath, content) {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, content, "utf8");
}

function toTsModule(indexObject) {
  const serialized = JSON.stringify(indexObject, null, 2);
  return `export const productIntelligenceIndex = ${serialized} as const;\n\nexport default productIntelligenceIndex;\n`;
}

async function main() {
  const discoveredSources = [];
  const normalizedProducts = [];

  for (const relativePath of sourceCandidates) {
    const absolutePath = path.join(projectRoot, relativePath);

    if (!(await pathExists(absolutePath))) continue;

    try {
      const parsed = await readJsonFile(absolutePath);
      const items = ensureArrayPayload(parsed);

      if (items.length === 0) continue;

      discoveredSources.push(absolutePath);

      items.forEach((item, index) => {
        normalizedProducts.push(normalizeProduct(item, index, absolutePath));
      });
    } catch (error) {
      console.warn(`[product-intelligence-index] Skipping ${relativePath}: ${error.message}`);
    }
  }

  const products = dedupeProducts(normalizedProducts);
  const index = buildIndex(products, discoveredSources);

  for (const target of outputTargets) {
    const absoluteOutputPath = path.join(projectRoot, target.path);

    if (target.type === "json") {
      await writeFileEnsured(absoluteOutputPath, JSON.stringify(index, null, 2) + "\n");
    } else {
      await writeFileEnsured(absoluteOutputPath, toTsModule(index));
    }

    console.log(`[product-intelligence-index] Wrote ${target.path}`);
  }

  if (products.length === 0) {
    console.log(
      "[product-intelligence-index] No source product JSON files were found. Generated an empty index so the build can continue."
    );
  } else {
    console.log(
      `[product-intelligence-index] Indexed ${products.length} product entries from ${discoveredSources.length} source file(s).`
    );
  }
}

main().catch((error) => {
  console.error("[product-intelligence-index] Generation failed.");
  console.error(error);
  process.exit(1);
});
'@

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

html,
body,
#root {
  min-height: 100%;
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

.wingman-grid {
  background-image:
    linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
  background-size: 28px 28px;
}
'@

$files["src/wingman-v2/styles/entry.css"] = @'
@import "./theme.css";

@tailwind base;
@tailwind components;
@tailwind utilities;
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

$files["src/wingman-v2/components/PageHero.tsx"] = @'
type PageHeroProps = {
  eyebrow: string;
  title: string;
  purpose: string;
  nextMove: string;
};

export function PageHero({ eyebrow, title, purpose, nextMove }: PageHeroProps) {
  return (
    <div className="mb-8 rounded-3xl wingman-panel wingman-grid p-8 lg:p-10">
      <p className="wingman-kicker">{eyebrow}</p>

      <h1 className="wingman-display mt-3 max-w-5xl text-4xl font-medium text-white lg:text-6xl">
        {title}
      </h1>

      <p className="mt-4 max-w-4xl text-base leading-7 text-slate-200">
        {purpose}
      </p>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
        <p className="text-sm font-medium text-slate-100">
          <span className="mr-2 uppercase tracking-[0.18em] text-slate-400">Next move</span>
          {nextMove}
        </p>
      </div>
    </div>
  );
}
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
import type { ReactNode } from "react";
import {
  ClipboardList,
  FileText,
  FileUp,
  FolderKanban,
  LayoutDashboard,
  LayoutTemplate,
  LifeBuoy,
  Scale,
  Search,
} from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

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
  { to: "/wingman/ingest", label: "Document Ingest", icon: FileUp },
  { to: "/wingman/proposal", label: "Proposal Builder", icon: FileText },
  { to: "/wingman/support", label: "Support", icon: LifeBuoy },
];

export function AppShell({ children }: AppShellProps) {
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
    </div>
  );
}

export default AppShell;
'@

$files["src/wingman-v2/pages/DashboardPage.tsx"] = @'
import { FileUp, LayoutTemplate, Scale, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHero } from "../components/PageHero";
import { RecommendationCard } from "../components/RecommendationCard";
import { SectionCard } from "../components/SectionCard";

const quickActions = [
  { label: "Start Discovery", icon: Search },
  { label: "Compare Competitor SKU", icon: Scale },
  { label: "Browse Room Templates", icon: LayoutTemplate },
  { label: "Upload Customer Files", icon: FileUp },
];

const statCards = [
  {
    label: "Active projects",
    value: "14",
    href: "/wingman/projects",
    helper: "Open project management",
  },
  {
    label: "Proposal-ready drafts",
    value: "6",
    href: "/wingman/projects",
    helper: "Open project management",
  },
  {
    label: "High-confidence matches",
    value: "82%",
    helper: "Current workspace signal",
  },
];

export function DashboardPage() {
  return (
    <div className="pb-10">
      <PageHero
        eyebrow="Dashboard"
        title="Start from the sales motion, not the product list."
        purpose="This workspace is the fast-control center for distributor reps who need to qualify demand, position WyreStorm clearly, and move toward a recommendation without hesitation."
        nextMove="Choose the workflow that matches the conversation: Discovery, Competitor Compare, Room Templates, or Upload Customer Files."
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
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-5 py-5 text-left transition hover:border-slate-300 hover:bg-white"
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
            {statCards.map((card) =>
              card.href ? (
                <Link
                  key={card.label}
                  to={card.href}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-orange-300 hover:shadow-[0_10px_30px_rgba(251,146,60,0.12)]"
                >
                  <p className="text-sm text-slate-500">{card.label}</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{card.value}</p>
                  <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-orange-600 opacity-0 transition group-hover:opacity-100">
                    {card.helper}
                  </p>
                </Link>
              ) : (
                <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="text-sm text-slate-500">{card.label}</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{card.value}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">{card.helper}</p>
                </div>
              ),
            )}
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

$files["src/wingman-v2/pages/ProjectsPage.tsx"] = @'
import { Link } from "react-router-dom";
import { PageHero } from "../components/PageHero";
import { SectionCard } from "../components/SectionCard";
import { StatusChip } from "../components/StatusChip";

const activeProjects = [
  {
    name: "Northbridge Meeting Room Refresh",
    owner: "Steve",
    stage: "Discovery",
    status: "recommended" as const,
    updated: "2 hours ago",
  },
  {
    name: "Harbour Retail Signage Rollout",
    owner: "Channel Sales",
    stage: "Competitor Compare",
    status: "alternative" as const,
    updated: "Today",
  },
  {
    name: "Westbrook Classroom Standard",
    owner: "Pre-sales",
    stage: "Proposal Builder",
    status: "recommended" as const,
    updated: "Yesterday",
  },
];

const proposalDrafts = [
  {
    name: "Boardroom AV Upgrade Proposal",
    customer: "Apex Group",
    state: "Ready for review",
  },
  {
    name: "Meeting Room Standard Bundle",
    customer: "Northbridge",
    state: "Waiting on assumptions",
  },
  {
    name: "Retail Display Distribution Pack",
    customer: "Harbour Retail",
    state: "Ready for export",
  },
];

export function ProjectsPage() {
  return (
    <div className="pb-10">
      <PageHero
        eyebrow="Project Management"
        title="Keep live opportunities, drafts, and next actions in one place."
        purpose="This page gives the sales team a working view of active opportunities so they can reopen discovery, move stalled comparisons forward, and keep proposal output aligned to the current state of the project."
        nextMove="Open the priority project, update its stage, and continue the workflow from discovery, comparison, or proposal."
      />

      <div className="space-y-6">
        <SectionCard
          title="Active projects"
          subtitle="Use this table to reopen active opportunities and move them to the next stage."
        >
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-5 py-4 font-semibold">Project</th>
                  <th className="px-5 py-4 font-semibold">Owner</th>
                  <th className="px-5 py-4 font-semibold">Stage</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Last updated</th>
                  <th className="px-5 py-4 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {activeProjects.map((project) => (
                  <tr key={project.name} className="border-t border-slate-100">
                    <td className="px-5 py-4 font-medium text-slate-900">{project.name}</td>
                    <td className="px-5 py-4 text-slate-700">{project.owner}</td>
                    <td className="px-5 py-4 text-slate-700">{project.stage}</td>
                    <td className="px-5 py-4">
                      <StatusChip
                        label={project.status === "recommended" ? "On track" : "Needs review"}
                        variant={project.status}
                      />
                    </td>
                    <td className="px-5 py-4 text-slate-700">{project.updated}</td>
                    <td className="px-5 py-4">
                      <Link
                        to="/wingman/dashboard"
                        className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                      >
                        Open project
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard
          title="Proposal-ready drafts"
          subtitle="Keep proposal output visible so sales users can see what is ready, what is blocked, and what can be sent next."
        >
          <div className="grid gap-4 lg:grid-cols-3">
            {proposalDrafts.map((draft) => (
              <div key={draft.name} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">{draft.customer}</p>
                <h3 className="mt-2 text-lg font-semibold text-slate-900">{draft.name}</h3>
                <p className="mt-3 text-sm text-slate-600">{draft.state}</p>
                <div className="mt-5">
                  <Link
                    to="/wingman/proposal"
                    className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    Open draft
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
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
        title="Turn a loose customer request into a usable technical brief."
        purpose="This page keeps the conversation structured so a less experienced rep can gather the right details, expose uncertainty early, and build toward a recommendation that sounds credible."
        nextMove="Complete the open discovery points, then push the brief into Product Finder for a pre-filled recommendation path."
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
        title="Match the requirement to the right WyreStorm direction."
        purpose="This page narrows discovery into a commercially useful shortlist, making the recommendation logic clear enough for a sales rep to explain with confidence."
        nextMove="Review the best match, validate any cautions, then add the preferred path to Competitor Compare or Proposal Builder."
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
        title="Replace competitor SKUs with a clear, defensible WyreStorm answer."
        purpose="This is the page that helps distributor reps sound technically solid in live conversations by showing the equivalent, the differentiation, and the cautions without ambiguity."
        nextMove="Run the comparison, confirm any partial-match areas, then carry the preferred replacement into the proposal or room solution flow."
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
        title="Begin with a room type the customer already recognizes."
        purpose="This page accelerates solution building by letting reps start from familiar AV scenarios, then attach the right WyreStorm product stack and commercial narrative."
        nextMove="Select the closest room template, apply it to the project, and use it to pre-fill discovery, product matching, and proposal content."
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
        title="Convert customer documents into structured sales direction."
        purpose="This page turns emails, tenders, PDFs, and schematics into usable requirements so Wingman can reduce ambiguity, surface missing information, and start the solution story faster."
        nextMove="Upload the source material, review the extracted requirements, then turn the cleaned brief into a proposal draft or matched solution."
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
        title="Turn internal solution logic into a customer-ready story."
        purpose="This page is where recommendation quality becomes presentation quality, packaging discovery, matching, comparison, and room logic into an output a distributor rep can use with confidence."
        nextMove="Review the proposal sections, tighten the assumptions, and finalize the output for customer presentation or internal approval."
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
        title="Create a clean handoff when confidence drops."
        purpose="This page exists to stop uncertainty becoming risk by giving users a clear route to technical review, escalation, or branded follow-through when the answer is not yet safe enough."
        nextMove="Use escalation when the match is partial, the topology is unclear, or the proposal needs a second-pass technical review."
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
import { ProjectsPage } from "../pages/ProjectsPage";
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
      { path: "projects", element: <ProjectsPage /> },
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

Ensure-WingmanCssImport

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
Write-Host "Install complete."
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