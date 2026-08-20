param(
    [string]$RepoRoot = "C:\Users\steve\wingman"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Step([string]$Text) {
    Write-Host ""
    Write-Host "==> $Text" -ForegroundColor Cyan
}
function Ok([string]$Text) {
    Write-Host "    $Text" -ForegroundColor Green
}
function Warn([string]$Text) {
    Write-Host "    $Text" -ForegroundColor Yellow
}
function Fail([string]$Text) {
    throw $Text
}
function Write-Utf8NoBom([string]$Path, [string]$Text) {
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    $parent = Split-Path -Parent $Path
    if ($parent) {
        New-Item -ItemType Directory -Force -Path $parent | Out-Null
    }
    [System.IO.File]::WriteAllText($Path, $Text, $utf8)
}

$RepoRoot = [System.IO.Path]::GetFullPath($RepoRoot)
$worktree = Join-Path $RepoRoot ".wingman-work\av-product-semantics"

if (-not (Test-Path -LiteralPath $worktree)) {
    Fail "Semantic worktree not found: $worktree"
}

Set-Location $worktree

Step "Checking semantic worktree"

$currentBranch = (& git branch --show-current).Trim()
if ($currentBranch -ne "feature/av-product-semantics") {
    Fail "Expected feature/av-product-semantics, found '$currentBranch'."
}
Ok "On feature/av-product-semantics"

Step "Adding a permanent semantic safety gate for competitor decisions"

$testPath = Join-Path $worktree "src\wingman2\lib\competitorMatchDecisions.semanticSafety.test.ts"

$test = @'
import competitorCatalogRaw from "../../../data/catalog/competitor-products.generated.json";
import index from "../../../public/product-intelligence-index.json";
import { describe, expect, it, vi } from "vitest";

vi.mock("./productIntelligenceIndexCache", () => ({
  loadProductIntelligenceIndex: vi.fn().mockResolvedValue(index),
}));

import {
  runSpecShowdown,
  type ShowdownMatch,
  type SpecSheet,
} from "./compareSpecEngine";

type Row = Record<string, unknown>;

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function fanout(sheet: SpecSheet): number | null {
  return sheet.mirroredOut ?? sheet.physicalOut ?? sheet.hdmiOut;
}

function transportGap(match: ShowdownMatch): boolean {
  return match.verdicts.some(
    (verdict) => verdict.field === "transport" && verdict.verdict === "gap",
  );
}

const approvedRows = (competitorCatalogRaw as Row[]).filter(
  (row) =>
    text(row.status).toLowerCase() === "approved" &&
    text(row.brand) &&
    text(row.sku),
);

describe("competitor decision semantic safety", () => {
  it("never leads with insufficient mandatory topology or routed capacity", async () => {
    const failures: string[] = [];

    for (const row of approvedRows) {
      const brand = text(row.brand);
      const sku = text(row.sku);
      const result = await runSpecShowdown(brand, sku);

      if (result.coverage !== "found" || result.matches.length === 0) continue;

      const competitor = result.competitor;
      const lead = result.matches[0];
      const offered = lead.sheet;

      if (competitor.specClass === "DISTRIBUTION") {
        const requiredFanout = fanout(competitor);
        const offeredFanout = fanout(offered);

        if (
          requiredFanout != null &&
          (offeredFanout == null || offeredFanout < requiredFanout)
        ) {
          failures.push(
            `${brand} ${sku}: distribution requires ${requiredFanout} outputs but lead ${offered.sku} evidences ${offeredFanout ?? "unknown"}`,
          );
        }

        // Some "splitter" products also switch between multiple sources.
        // Those cannot be replaced by a one-input DA simply because fan-out
        // matches.
        if (
          competitor.routedIn != null &&
          competitor.routedIn > 1 &&
          (offered.routedIn == null || offered.routedIn < competitor.routedIn)
        ) {
          failures.push(
            `${brand} ${sku}: switched distribution requires ${competitor.routedIn} selectable inputs but lead ${offered.sku} evidences ${offered.routedIn ?? "unknown"}`,
          );
        }
      }

      if (
        competitor.specClass === "MATRIX" ||
        competitor.specClass === "PRESENTATION"
      ) {
        if (
          competitor.routedIn != null &&
          (offered.routedIn == null || offered.routedIn < competitor.routedIn)
        ) {
          failures.push(
            `${brand} ${sku}: requires ${competitor.routedIn} routed inputs but lead ${offered.sku} evidences ${offered.routedIn ?? "unknown"}`,
          );
        }

        if (
          competitor.routedOut != null &&
          (offered.routedOut == null || offered.routedOut < competitor.routedOut)
        ) {
          failures.push(
            `${brand} ${sku}: requires ${competitor.routedOut} routed outputs but lead ${offered.sku} evidences ${offered.routedOut ?? "unknown"}`,
          );
        }
      }

      if (transportGap(lead) && lead.decision !== "architecture-alternative") {
        failures.push(
          `${brand} ${sku}: ${offered.sku} has a transport/architecture gap but decision is ${lead.decision}`,
        );
      }
    }

    expect(failures).toEqual([]);
  }, 30000);

  it("keeps the reviewed hybrid and HDBaseT distribution edge cases safe", async () => {
    const sy = await runSpecShowdown("SY Electronics", "HDBT-231-100");
    expect(sy.coverage).toBe("found");
    if (sy.coverage === "found") {
      // It is a 2-input switcher feeding a mirrored 4-output distribution
      // topology. No single-product answer may silently drop the source
      // switching requirement.
      for (const match of sy.matches) {
        expect(match.sheet.routedIn).not.toBeNull();
        expect(match.sheet.routedIn!).toBeGreaterThanOrEqual(2);
        expect(fanout(match.sheet)).not.toBeNull();
        expect(fanout(match.sheet)!).toBeGreaterThanOrEqual(4);
      }
    }

    for (const [brand, sku] of [
      ["Kramer", "VM-4HDT"],
      ["Crestron", "DM-DA4-4K-C"],
    ] as const) {
      const result = await runSpecShowdown(brand, sku);
      expect(result.coverage).toBe("found");

      if (result.coverage === "found" && result.matches.length > 0) {
        const lead = result.matches[0];
        expect(fanout(lead.sheet)).not.toBeNull();
        expect(fanout(lead.sheet)!).toBeGreaterThanOrEqual(4);

        // These competitors distribute over HDBaseT/DM transport. A local HDMI
        // splitter can be a system-design direction, but not a direct product
        // equivalent.
        if (lead.sheet.transport !== "hdbaset") {
          expect(lead.decision).toBe("architecture-alternative");
        }
      }
    }
  });
});
'@

Write-Utf8NoBom $testPath $test
Ok "Added competitorMatchDecisions.semanticSafety.test.ts"

Step "Running the semantic decision safety gate"

npx vitest run `
    "src/wingman2/lib/competitorMatchDecisions.semanticSafety.test.ts" `
    "src/wingman2/lib/compareSpecEngine.distributionRightSizing.test.ts" `
    "src/wingman2/lib/compareSpecEngine.topologyPurposeIntegrity.test.ts" `
    "src/wingman2/lib/compareEligibilityEngine.distributionUndersize.test.ts" `
    "src/wingman2/lib/compareVerdictPipeline.fitPenaltyAuthority.test.ts" `
    "src/wingman2/lib/compareVerdictPipeline.runtimeAuthority.test.ts" `
    "src/wingman2/pages/ComparePageNew.semanticDistribution.test.tsx"

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Semantic decision review found an unsafe remaining recommendation." -ForegroundColor Yellow
    Write-Host "Nothing was refreshed, committed or pushed." -ForegroundColor Yellow
    Write-Host "Paste the first failing block." -ForegroundColor Yellow
    exit $LASTEXITCODE
}

Ok "Current competitor decision changes satisfy mandatory semantic safety"

Step "Running product-data governance before touching the golden ledger"

npm run check:product-semantic-integrity
if ($LASTEXITCODE -ne 0) {
    Fail "Product semantic integrity gate failed."
}

npm run wm:check-routed-io
if ($LASTEXITCODE -ne 0) {
    Fail "Routed-I/O governance gate failed."
}

npm run check:data-sources
if ($LASTEXITCODE -ne 0) {
    Fail "Data-source gate failed."
}

Ok "Product-data governance passed"

Step "Running typecheck and build"

npm run typecheck
if ($LASTEXITCODE -ne 0) {
    Fail "Typecheck failed."
}

npm run build
if ($LASTEXITCODE -ne 0) {
    Fail "Production build failed."
}

Ok "Typecheck and production build passed"

Step "Refreshing only changed machine decisions while preserving human approvals"

Write-Host ""
Write-Host "The current drift has now passed semantic safety review." -ForegroundColor Gray
Write-Host "Using the preserve-mode refresh; it will refuse to overwrite a moved human-approved decision." -ForegroundColor Gray
Write-Host ""

npm run refresh:competitor-decisions
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Preserve-mode refresh stopped." -ForegroundColor Yellow
    Write-Host "Most likely an existing human-approved decision moved and requires explicit re-review." -ForegroundColor Yellow
    Write-Host "The refresh implementation throws BEFORE writing when that occurs." -ForegroundColor Yellow
    Write-Host "Nothing was committed or pushed." -ForegroundColor Yellow
    exit $LASTEXITCODE
}

Ok "Changed machine baseline decisions refreshed; existing human approvals preserved"

Step "Verifying the refreshed golden decision ledger"

npm run check:competitor-decisions
if ($LASTEXITCODE -ne 0) {
    Fail "Competitor decision drift remains after preserve-mode refresh."
}

Ok "Golden competitor decision ledger now matches the live engine"

Step "Running full repository verification"

npm run verify
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Full verify found a remaining repository failure." -ForegroundColor Yellow
    Write-Host "Nothing was committed or pushed." -ForegroundColor Yellow
    Write-Host "Paste only the final failing section." -ForegroundColor Yellow
    exit $LASTEXITCODE
}

Ok "Full repository verification passed"

Step "Checking diff hygiene"

git diff --check
if ($LASTEXITCODE -ne 0) {
    Fail "git diff --check failed."
}

Ok "git diff --check passed"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "Semantic product-data and Compare baseline are green" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Completed:" -ForegroundColor Gray
Write-Host "  - universal routed / physical / mirrored output semantics" -ForegroundColor Gray
Write-Host "  - distribution fan-out safety" -ForegroundColor Gray
Write-Host "  - multi-source switched-distribution safety" -ForegroundColor Gray
Write-Host "  - Compare right-sizing regressions" -ForegroundColor Gray
Write-Host "  - preserve-mode competitor decision baseline refresh" -ForegroundColor Gray
Write-Host "  - full repository verification" -ForegroundColor Gray
Write-Host ""
Write-Host "No commit or push was performed." -ForegroundColor Yellow
Write-Host ""
git status --short
Write-Host ""
git diff --stat
