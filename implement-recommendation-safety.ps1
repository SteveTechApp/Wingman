#requires -Version 7.0

<##
.SYNOPSIS
    Implements the recommendation-safety and product line-item controls for Wingman.

.DESCRIPTION
    This is a guarded, reversible source patch. It:
      - prevents RX3-100 from appearing as a generic standalone extender;
      - makes alternatives an explicit user action;
      - records removed product SKUs so a rebuilt system does not silently restore them;
      - adds product removal controls to Project Detail;
      - adds focused regression tests for the safety rules.

    The script is dry-run by default. Use -Apply to write changes.
    Backups and the change report are written below .wingman-work only.

.EXAMPLE
    pwsh -NoProfile -ExecutionPolicy Bypass -File tools\implement-recommendation-safety.ps1

.EXAMPLE
    pwsh -NoProfile -ExecutionPolicy Bypass -File tools\implement-recommendation-safety.ps1 -Apply -RunTests
#>

param(
    [string]$RepoRoot,
    [switch]$Apply,
    [switch]$RunTests
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Resolve-RepositoryRoot {
    param([string]$RequestedRoot)

    $candidates = @()
    if ($RequestedRoot) { $candidates += $RequestedRoot }
    $candidates += (Get-Location).Path
    if ($PSScriptRoot) { $candidates += (Join-Path $PSScriptRoot "..") }

    foreach ($candidate in $candidates) {
        $resolved = Resolve-Path -LiteralPath $candidate -ErrorAction SilentlyContinue
        if ($resolved -and (Test-Path -LiteralPath (Join-Path $resolved.Path "package.json"))) {
            return $resolved.Path
        }
    }

    throw "Could not find a Wingman repository root containing package.json. Use -RepoRoot C:\Users\steve\wingman."
}

function Read-Utf8NoBom {
    param([string]$Path)
    return [System.IO.File]::ReadAllText($Path, [System.Text.UTF8Encoding]::new($false))
}

function Write-Utf8NoBom {
    param([string]$Path, [string]$Content)
    [System.IO.File]::WriteAllText($Path, $Content, [System.Text.UTF8Encoding]::new($false))
}

function Assert-File {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "Required file is missing: $Path"
    }
}

function Replace-Once {
    param(
        [string]$Path,
        [string]$Content,
        [string]$Old,
        [string]$New,
        [string]$Description
    )

    $count = ([regex]::Matches($Content, [regex]::Escape($Old))).Count
    if ($count -ne 1) {
        throw "Anchor check failed for '$Description' in $Path. Expected 1 match, found $count. No files have been written."
    }

    Write-Host "  PATCH  $Description"
    return $Content.Replace($Old, $New)
}

function Add-FilePatch {
    param(
        [hashtable]$Changes,
        [string]$Path,
        [string]$Content,
        [string]$Description
    )

    if ($Changes.ContainsKey($Path)) {
        throw "A patch for $Path has already been staged."
    }

    $Changes[$Path] = [pscustomobject]@{
        Original = if (Test-Path -LiteralPath $Path) { Read-Utf8NoBom $Path } else { $null }
        Updated = $Content
        Description = $Description
    }
}

function Stage-Replacement {
    param(
        [hashtable]$Changes,
        [string]$Path,
        [string]$Old,
        [string]$New,
        [string]$Description
    )

    Assert-File $Path
    $content = if ($Changes.ContainsKey($Path)) { $Changes[$Path].Updated } else { Read-Utf8NoBom $Path }
    $updated = Replace-Once -Path $Path -Content $content -Old $Old -New $New -Description $Description
    $original = if ($Changes.ContainsKey($Path)) { $Changes[$Path].Original } else { Read-Utf8NoBom $Path }
    $Changes[$Path] = [pscustomobject]@{
        Original = $original
        Updated = $updated
        Description = $Description
    }
}

$root = Resolve-RepositoryRoot $RepoRoot
$workRoot = Join-Path $root ".wingman-work"
$runId = "recommendation-safety-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
$runRoot = Join-Path $workRoot $runId
$backupRoot = Join-Path $runRoot "backup"
$reportPath = Join-Path $runRoot "change-report.txt"
$utf8 = [System.Text.UTF8Encoding]::new($false)

New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null

$recommendationsPath = Join-Path $root "src\wingman2\pages\RecommendationsPage.tsx"
$projectStorePath = Join-Path $root "src\wingman2\data\projectStore.ts"
$projectDetailPath = Join-Path $root "src\wingman2\pages\ProjectDetailPage.tsx"
$safetyModulePath = Join-Path $root "src\wingman2\lib\recommendationSafety.ts"
$safetyTestPath = Join-Path $root "src\wingman2\lib\recommendationSafety.test.ts"

@($recommendationsPath, $projectStorePath, $projectDetailPath) | ForEach-Object { Assert-File $_ }

if (Test-Path -LiteralPath $safetyModulePath -PathType Leaf) {
    throw "Refusing to overwrite existing file: $safetyModulePath"
}
if (Test-Path -LiteralPath $safetyTestPath -PathType Leaf) {
    throw "Refusing to overwrite existing file: $safetyTestPath"
}

$changes = @{}

$safetyModule = @'
// Recommendation safety gates shared by the Recommendations page and tests.
// A product's marketing text is not enough to establish that it is a valid
// system-slot candidate: pairing, direction and dependency state matter.

function normalise(value: unknown): string {
  return String(value ?? "").trim().toUpperCase();
}

function searchable(value: unknown, output: string[] = []): string[] {
  if (value === null || value === undefined) return output;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    output.push(String(value));
    return output;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => searchable(item, output));
    return output;
  }
  if (typeof value === "object") {
    Object.values(value as Record<string, unknown>).forEach((item) => searchable(item, output));
  }
  return output;
}

export type RecommendationCandidateLike = {
  sku: string;
  product?: Record<string, unknown>;
};

/**
 * RX3-100 is a paired HDBaseT 3.0 receiver for SW-120-TX3 or MX-1007-HYB.
 * It is never a generic answer to "the display is far away".
 */
export function isRx3ReceiverPairConfirmed(context: readonly unknown[]): boolean {
  const text = searchable(context).join(" ");
  if (/\b(?:SW-120-TX3(?:-[A-Z0-9]+)?|MX-1007-HYB)\b/i.test(text)) return true;
  return /HDBaseT\s*3(?:\.0)?/.test(text) && /(?:transmitter|TX3|hybrid matrix)/i.test(text);
}

export function recommendationCandidateAllowed(
  decision: RecommendationCandidateLike,
  slotKind: string,
  context: readonly unknown[],
): boolean {
  const sku = normalise(decision.sku);

  // Keep RX3-100 out of every generic slot. It can only enter a deliberately
  // paired HDBaseT 3.0 design, never a broad extension candidate list.
  if (sku === "RX3-100") {
    return slotKind === "extension" && isRx3ReceiverPairConfirmed(context);
  }

  return true;
}

export function shouldShowRecommendationAlternatives(explicitlyRequested: boolean): boolean {
  return explicitlyRequested;
}

'@


$safetyTest = @'
import { describe, expect, it } from "vitest";
import {
  isRx3ReceiverPairConfirmed,
  recommendationCandidateAllowed,
  shouldShowRecommendationAlternatives,
} from "./recommendationSafety";

describe("recommendation safety", () => {
  it("does not treat RX3-100 as a generic extender", () => {
    expect(recommendationCandidateAllowed({ sku: "RX3-100" }, "extension", ["25m HDMI route"])).toBe(false);
  });

  it("allows RX3-100 only when the paired transmitter path is explicit", () => {
    expect(isRx3ReceiverPairConfirmed(["SW-120-TX3", "4K60 HDBaseT 3.0"])).toBe(true);
    expect(recommendationCandidateAllowed({ sku: "RX3-100" }, "extension", ["SW-120-TX3", "4K60 HDBaseT 3.0"])).toBe(true);
  });

  it("does not allow RX3-100 in an unrelated slot", () => {
    expect(recommendationCandidateAllowed({ sku: "RX3-100" }, "avoip-decoder", ["SW-120-TX3"])).toBe(false);
  });

  it("keeps alternatives opt-in", () => {
    expect(shouldShowRecommendationAlternatives(false)).toBe(false);
    expect(shouldShowRecommendationAlternatives(true)).toBe(true);
  });
});
'@

$recommendationsContent = Read-Utf8NoBom $recommendationsPath
$projectStoreContent = Read-Utf8NoBom $projectStorePath
$projectDetailContent = Read-Utf8NoBom $projectDetailPath

$recommendationsContent = Replace-Once $recommendationsPath $recommendationsContent 'import { getVisibleDiscoveryQuestions } from "./discovery/discoveryQuestions";' 'import { getVisibleDiscoveryQuestions } from "./discovery/discoveryQuestions";
import {
  recommendationCandidateAllowed,
  shouldShowRecommendationAlternatives,
} from "../lib/recommendationSafety";' "Import recommendation safety gates"

$recommendationsContent = Replace-Once $recommendationsPath $recommendationsContent '  const [stage, setStage] = useState<RecommendationStage>("overview");' '  const [stage, setStage] = useState<RecommendationStage>("overview");
  const [showAlternatives, setShowAlternatives] = useState(false);' "Add explicit alternatives state"

$oldCandidateBlock = @'
        candidates: slot.supply === "external" ? [] : slotPool
          .filter((decision) => decision.eligible)
          .filter((decision) => productMatchesSlot(decisionClassification(decision), slot))
          .slice(0, 4),
'@
$newCandidateBlock = @'
        candidates: slot.supply === "external" ? [] : slotPool
          .filter((decision) => decision.eligible)
          .filter((decision) => productMatchesSlot(decisionClassification(decision), slot))
          .filter((decision) => recommendationCandidateAllowed(
            decision,
            slot.kind,
            [systemBrief?.roomModel, need, activeProject?.productSelections],
          ))
          .slice(0, 4),
'@
$recommendationsContent = Replace-Once $recommendationsPath $recommendationsContent $oldCandidateBlock $newCandidateBlock "Gate slot candidates by pairing and dependency safety"

$recommendationsContent = Replace-Once $recommendationsPath $recommendationsContent '    const filled = systemSlots.filter((entry) => entry.candidates.length);' '    const omitted = new Set((activeProject?.omittedProductSkus ?? []).map((sku) => String(sku).trim().toUpperCase()));
    const filled = systemSlots.filter((entry) => entry.candidates.length && !omitted.has(entry.candidates[0].sku.trim().toUpperCase()));' "Do not silently re-add omitted products"

$recommendationsContent = Replace-Once $recommendationsPath $recommendationsContent '                  const alternatives = candidates.slice(1);' '                  const alternatives = shouldShowRecommendationAlternatives(showAlternatives) ? candidates.slice(1) : [];' "Make alternatives opt-in"

$oldStats = @'
                <div className="wm-rec-system-stats" aria-label="System design status">
                  <span><strong>{resolvedSystemSlots.length}/{requiredSystemSlots.length}</strong> required roles resolved</span>
                  <span><strong>{systemUnitCount}</strong> total units</span>
                  <span className={unfilledSlots.length ? "is-warning" : "is-ready"}>
                    {unfilledSlots.length ? `${unfilledSlots.length} role${unfilledSlots.length === 1 ? "" : "s"} need review` : "System roles covered"}
                  </span>
                </div>
'@
$newStats = @'
                <div className="wm-rec-system-stats" aria-label="System design status">
                  <span><strong>{resolvedSystemSlots.length}/{requiredSystemSlots.length}</strong> required roles resolved</span>
                  <span><strong>{systemUnitCount}</strong> total units</span>
                  <span className={unfilledSlots.length ? "is-warning" : "is-ready"}>
                    {unfilledSlots.length ? `${unfilledSlots.length} role${unfilledSlots.length === 1 ? "" : "s"} need review` : "System roles covered"}
                  </span>
                  <button
                    type="button"
                    className="wm-ui-button wm-ui-button-secondary"
                    onClick={() => setShowAlternatives((current) => !current)}
                    aria-pressed={showAlternatives}
                  >
                    {showAlternatives ? "Hide alternatives" : "Show alternatives"}
                  </button>
                </div>
'@
$recommendationsContent = Replace-Once $recommendationsPath $recommendationsContent $oldStats $newStats "Add explicit show/hide alternatives control"

$oldProjectType = @'
  productSelections?: StoredProductSelection[];
  ingest?: StoredIngestAnalysis;
'@
$newProjectType = @'
  productSelections?: StoredProductSelection[];
  /** SKUs deliberately removed by the user; automatic rebuilds must honour this list. */
  omittedProductSkus?: string[];
  ingest?: StoredIngestAnalysis;
'@
$projectStoreContent = Replace-Once $projectStorePath $projectStoreContent $oldProjectType $newProjectType "Persist omitted product SKUs on the project"

$oldHydration = @'
  const productSelections = normalizeProductSelections(record.productSelections);
  if (productSelections.length) project.productSelections = productSelections;
'@
$newHydration = @'
  const productSelections = normalizeProductSelections(record.productSelections);
  if (productSelections.length) project.productSelections = productSelections;
  const omittedProductSkus = stringArray(record.omittedProductSkus)
    .map((sku) => sku.trim().toUpperCase())
    .filter(Boolean);
  if (omittedProductSkus.length) project.omittedProductSkus = omittedProductSkus;
'@
$projectStoreContent = Replace-Once $projectStorePath $projectStoreContent $oldHydration $newHydration "Hydrate omitted product SKUs"

$oldSelectionAudit = @'
    productSelections,
    auditTrail: [
'@
$newSelectionAudit = @'
    productSelections,
    omittedProductSkus: (existing.omittedProductSkus ?? []).filter((sku) => sku.toUpperCase() !== selected.sku.toUpperCase()),
    auditTrail: [
'@
$projectStoreContent = Replace-Once $projectStorePath $projectStoreContent $oldSelectionAudit $newSelectionAudit "Clear an omission when a product is explicitly re-added"

$removeFunction = @'

/** Remove a product line from a project and remember the omission. */
export function removeProductSelectionFromProject(projectId: string, sku: string) {
  const snapshot = readProjectStore();
  const existing = snapshot.projects.find((project) => project.id === projectId);
  const targetSku = sku.trim().toUpperCase();
  if (!existing || !targetSku) return null;

  const current = existing.productSelections ?? [];
  const removed = current.find((item) => item.sku.trim().toUpperCase() === targetSku);
  if (!removed) return existing;

  const timestamp = nowIso();
  const omittedProductSkus = Array.from(new Set([
    ...(existing.omittedProductSkus ?? []),
    removed.sku.trim().toUpperCase(),
  ]));

  return upsertStoredProject({
    ...existing,
    productSelections: current.filter((item) => item.sku.trim().toUpperCase() !== targetSku),
    omittedProductSkus,
    updated: "Just now",
    updatedAt: timestamp,
    auditTrail: [
      {
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        action: "product-selection-remove",
        detail: `Removed product ${removed.sku} (${removed.title || removed.sku}) from project`,
        scope: "products",
        severity: "info" as const,
        actorName: "Wingman user",
        createdAt: timestamp,
      },
      ...(existing.auditTrail ?? []),
    ].slice(0, 50),
  });
}

export function removeProductSelectionFromCurrentProject(sku: string) {
  const existing = getCurrentWorkflowProject();
  return existing ? removeProductSelectionFromProject(existing.id, sku) : null;
}
'@
$oldCreateSelection = 'export function createProjectForProductSelection(name: string, selection: StoredProductSelection) {'
$newCreateSelection = $removeFunction + "`r`n" + $oldCreateSelection
$projectStoreContent = Replace-Once $projectStorePath $projectStoreContent $oldCreateSelection $newCreateSelection "Add persistent product removal API"

$oldProjectImports = @'
  saveDealOutcome,
  saveProjectRequirementsToProject,
'@
$newProjectImports = @'
  saveDealOutcome,
  removeProductSelectionFromProject,
  saveProjectRequirementsToProject,
'@
$projectDetailContent = Replace-Once $projectDetailPath $projectDetailContent $oldProjectImports $newProjectImports "Import product removal API"

$oldProjectHook = '  const { projects, deleteProject } = useProjectStore();'
$newProjectHook = @'
  const { projects, deleteProject } = useProjectStore();
'@
$projectDetailContent = Replace-Once $projectDetailPath $projectDetailContent $oldProjectHook $newProjectHook "Add Project Detail removal handler"

$oldProjectConst = '  const project = projects.find((item) => item.id === projectId) ?? null;'
$newProjectConst = @'
  const project = projects.find((item) => item.id === projectId) ?? null;

  function removeProductLine(sku: string) {
    if (!project || !window.confirm(`Remove ${sku} from this project?`)) return;
    const updated = removeProductSelectionFromProject(project.id, sku);
    setMessage(updated ? `${sku} removed from the project.` : `${sku} could not be removed.`);
  }
'@
$projectDetailContent = Replace-Once $projectDetailPath $projectDetailContent $oldProjectConst $newProjectConst "Add Project Detail removal handler"

$oldProductFamilyBlock = @'
          {/* Missing information */}
'@
$newProductFamilyBlock = @'
          {selectedProducts.length > 0 ? (
            <div className="mb-4 rounded-xl border p-4 wm-ui-card" aria-labelledby="project-products-title">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] wm-ui-kicker">Products currently in design</p>
                  <h3 id="project-products-title" className="mt-1 text-base font-black wm-ui-title">Review or remove line items</h3>
                </div>
                <span className="text-xs wm-ui-copy">{selectedProducts.length} item{selectedProducts.length === 1 ? "" : "s"}</span>
              </div>
              <div className="grid gap-2">
                {selectedProducts.map((product) => (
                  <div key={product.sku} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black wm-ui-copy">{product.sku}</p>
                      <p className="truncate text-xs wm-ui-copy">{product.title || product.family || "Product selection"}{product.quantity ? ` · Qty ${product.quantity}` : ""}</p>
                    </div>
                    <button type="button" className="wm-ui-button wm-ui-button-secondary shrink-0" onClick={() => removeProductLine(product.sku)}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Missing information */}
'@
$projectDetailContent = Replace-Once $projectDetailPath $projectDetailContent $oldProductFamilyBlock $newProductFamilyBlock "Add project line-item removal controls"

Add-FilePatch -Changes $changes -Path $safetyModulePath -Content $safetyModule -Description "Create recommendation safety module"
Add-FilePatch -Changes $changes -Path $safetyTestPath -Content $safetyTest -Description "Create recommendation safety regression tests"
Add-FilePatch -Changes $changes -Path $recommendationsPath -Content $recommendationsContent -Description "Patch Recommendations page"
Add-FilePatch -Changes $changes -Path $projectStorePath -Content $projectStoreContent -Description "Patch project store"
Add-FilePatch -Changes $changes -Path $projectDetailPath -Content $projectDetailContent -Description "Patch Project Detail"

$reportLines = @(
    "Wingman recommendation safety patch"
    "Repository: $root"
    "Run: $runId"
    "Mode: $(if ($Apply) { 'APPLY' } else { 'DRY-RUN' })"
    ""
    "Staged changes:"
)

foreach ($path in $changes.Keys) {
    $change = $changes[$path]
    $reportLines += "- $($change.Description): $path"
}

Write-Utf8NoBom $reportPath ($reportLines -join [Environment]::NewLine)

if (-not $Apply) {
    Write-Host ""
    Write-Host "DRY-RUN complete. No source files were changed."
    Write-Host "Report: $reportPath"
    Write-Host "Re-run with -Apply to write the staged changes."
    exit 0
}

foreach ($path in $changes.Keys) {
    $change = $changes[$path]
    if ($null -ne $change.Original) {
        $relative = $path.Substring($root.Length).TrimStart('\', '/')
        $backupPath = Join-Path $backupRoot $relative
        New-Item -ItemType Directory -Path (Split-Path -Parent $backupPath) -Force | Out-Null
        Copy-Item -LiteralPath $path -Destination $backupPath -Force
    }
}

foreach ($path in $changes.Keys) {
    Write-Utf8NoBom $path $changes[$path].Updated
}

Write-Host ""
Write-Host "APPLIED. Backups: $backupRoot"
Write-Host "Report: $reportPath"

if ($RunTests) {
    Push-Location $root
    try {
        & npm run typecheck
        if ($LASTEXITCODE -ne 0) { throw "npm run typecheck failed with exit code $LASTEXITCODE" }
        & npx vitest run src/wingman2/lib/recommendationSafety.test.ts
        if ($LASTEXITCODE -ne 0) { throw "recommendation safety tests failed with exit code $LASTEXITCODE" }
    }
    finally {
        Pop-Location
    }
}
