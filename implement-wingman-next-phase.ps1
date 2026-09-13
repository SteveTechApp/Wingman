[CmdletBinding()]
param(
    [string]$RepoRoot = (Get-Location).Path,
    [switch]$Apply,
    [switch]$RunTests,
    [switch]$Commit
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Write-Phase {
    param([string]$Text)
    Write-Host ""
    Write-Host ("=" * 72) -ForegroundColor DarkCyan
    Write-Host $Text -ForegroundColor Cyan
    Write-Host ("=" * 72) -ForegroundColor DarkCyan
}

function Stop-Work {
    param([string]$Text)
    throw $Text
}

function Resolve-RepoFile {
    param([string]$RelativePath)
    $path = Join-Path $RepoRoot $RelativePath
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        Stop-Work "Required file was not found: $RelativePath"
    }
    return $path
}

function Read-Utf8File {
    param([string]$Path)
    return [System.IO.File]::ReadAllText($Path, [System.Text.UTF8Encoding]::new($false))
}

function Write-Utf8File {
    param(
        [string]$Path,
        [string]$Text
    )
    $encoding = [System.Text.UTF8Encoding]::new($false)
    [System.IO.File]::WriteAllText($Path, $Text, $encoding)
}

function Backup-File {
    param([string]$Path)
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $backup = "$Path.$stamp.bak"
    Copy-Item -LiteralPath $Path -Destination $backup -Force
    Write-Host "BACKUP $backup" -ForegroundColor DarkGray
}

function Assert-TextPresent {
    param(
        [string]$Text,
        [string]$Needle,
        [string]$Description
    )
    if ($Text.IndexOf($Needle, [System.StringComparison]::Ordinal) -lt 0) {
        Stop-Work "Anchor check failed: $Description"
    }
}

function Invoke-Checked {
    param(
        [string]$FilePath,
        [string[]]$ArgumentList,
        [string]$Description
    )
    Write-Host "RUN    $Description" -ForegroundColor Yellow
    & $FilePath @ArgumentList
    if ($LASTEXITCODE -ne 0) {
        Stop-Work "Command failed with exit code $LASTEXITCODE`: $Description"
    }
}

function Find-MatchingBraceIndex {
    param(
        [string]$Text,
        [int]$OpenIndex
    )
    $depth = 0
    $state = "code"
    $escaped = $false
    for ($index = $OpenIndex; $index -lt $Text.Length; $index++) {
        $character = $Text[$index]
        if ($state -eq "single") {
            if ($escaped) {
                $escaped = $false
                continue
            }
            if ($character -eq [char]96) {
                $escaped = $true
                continue
            }
            if ($character -eq [char]39) {
                $state = "code"
            }
            continue
        }
        if ($state -eq "double") {
            if ($escaped) {
                $escaped = $false
                continue
            }
            if ($character -eq [char]96) {
                $escaped = $true
                continue
            }
            if ($character -eq [char]34) {
                $state = "code"
            }
            continue
        }
        if ($state -eq "line-comment") {
            if ($character -eq [char]10 -or $character -eq [char]13) {
                $state = "code"
            }
            continue
        }
        if ($state -eq "block-comment") {
            if ($character -eq '*' -and $index + 1 -lt $Text.Length -and $Text[$index + 1] -eq '/') {
                $index++
                $state = "code"
            }
            continue
        }
        if ($character -eq [char]39) {
            $state = "single"
            continue
        }
        if ($character -eq [char]34) {
            $state = "double"
            continue
        }
        if ($character -eq '/' -and $index + 1 -lt $Text.Length -and $Text[$index + 1] -eq '/') {
            $index++
            $state = "line-comment"
            continue
        }
        if ($character -eq '/' -and $index + 1 -lt $Text.Length -and $Text[$index + 1] -eq '*') {
            $index++
            $state = "block-comment"
            continue
        }
        if ($character -eq '{') {
            $depth++
            continue
        }
        if ($character -eq '}') {
            $depth--
            if ($depth -eq 0) {
                return $index
            }
        }
    }
    return -1
}

function Get-SafetyModuleText {
    return @'
export type RecommendationRole =
  | "source"
  | "destination"
  | "transmitter"
  | "receiver"
  | "transceiver"
  | "matrix"
  | "processor"
  | "controller"
  | "dependency"
  | "support"
  | string;

export type RecommendationSafetyCandidate = Record<string, unknown> & {
  sku?: unknown;
  productSku?: unknown;
  role?: unknown;
  roleContract?: unknown;
  dependencyOnly?: unknown;
  explicitlyRequested?: unknown;
  safetyApproved?: unknown;
  pairedWith?: unknown;
  compatibility?: unknown;
};

export type RecommendationSafetyContext = {
  requiredRole?: RecommendationRole | null;
  explicitSkus?: ReadonlyArray<string> | ReadonlySet<string>;
  selectedSkus?: ReadonlyArray<string> | ReadonlySet<string>;
  removedSkus?: ReadonlyArray<string> | ReadonlySet<string>;
  pairingSkus?: ReadonlyArray<string> | ReadonlySet<string>;
  allowDependencies?: boolean;
  hdBaseTGeneration?: string | null;
  resolutionCompatible?: boolean;
  usbCompatible?: boolean;
  distanceCompatible?: boolean;
};

const RX3_SKU = "RX3-100";
const RX3_ALLOWED_PAIRS = new Set(["SW-120-TX3", "MX-1007-HYB"]);

function recordOf(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => {
    if (typeof item === "string") {
      return item;
    }
    const row = recordOf(item);
    return String(row.sku ?? row.productSku ?? row.id ?? "");
  }).filter(Boolean);
}

function booleanValue(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }
  return undefined;
}

export function buildRecommendationSafetyContext(systemBrief: unknown): RecommendationSafetyContext {
  const root = recordOf(systemBrief);
  const compatibility = recordOf(root.compatibility ?? root.transportCompatibility);
  const generation = root.hdBaseTGeneration ?? compatibility.hdBaseTGeneration;
  return {
    explicitSkus: stringArray(root.explicitSkus ?? root.requestedSkus ?? root.explicitProducts),
    selectedSkus: stringArray(root.selectedSkus ?? root.currentSkus ?? root.existingSkus),
    removedSkus: stringArray(root.removedSkus ?? root.omittedSkus ?? root.removedLineItemSkus),
    pairingSkus: stringArray(root.pairingSkus ?? root.pairedSkus ?? root.pairedProducts),
    hdBaseTGeneration: typeof generation === "string" ? generation : undefined,
    resolutionCompatible: booleanValue(root.resolutionCompatible ?? compatibility.resolutionCompatible),
    usbCompatible: booleanValue(root.usbCompatible ?? compatibility.usbCompatible),
    distanceCompatible: booleanValue(root.distanceCompatible ?? compatibility.distanceCompatible),
  };
}

function normalise(value: unknown): string {
  return String(value ?? "").trim().toUpperCase().replace(/[ _]/g, "-");
}

function valuesOf(value: ReadonlyArray<string> | ReadonlySet<string> | undefined): Set<string> {
  if (value instanceof Set) {
    return new Set(Array.from(value, normalise));
  }
  return new Set((value ?? []).map(normalise));
}

function candidateSku(candidate: RecommendationSafetyCandidate): string {
  return normalise(candidate.sku ?? candidate.productSku);
}

function candidateRole(candidate: RecommendationSafetyCandidate): string {
  return normalise(candidate.roleContract ?? candidate.role);
}

function candidatePairs(candidate: RecommendationSafetyCandidate): Set<string> {
  const raw = candidate.pairedWith;
  if (Array.isArray(raw)) {
    return new Set(raw.map(normalise));
  }
  return new Set([normalise(raw)]);
}

function compatibilityEvidence(candidate: RecommendationSafetyCandidate, context: RecommendationSafetyContext): boolean {
  const compatibility = candidate.compatibility;
  const candidateEvidence = compatibility && typeof compatibility === "object"
    ? compatibility as Record<string, unknown>
    : {};
  const generation = normalise(context.hdBaseTGeneration ?? candidateEvidence.hdBaseTGeneration);
  const resolution = context.resolutionCompatible ?? candidateEvidence.resolutionCompatible;
  const usb = context.usbCompatible ?? candidateEvidence.usbCompatible;
  const distance = context.distanceCompatible ?? candidateEvidence.distanceCompatible;
  if (generation !== "HDBASET-3.0" && generation !== "3.0") {
    return false;
  }
  if (resolution !== true || usb !== true || distance !== true) {
    return false;
  }
  return true;
}

function rx3HasPair(candidate: RecommendationSafetyCandidate, context: RecommendationSafetyContext): boolean {
  const contextPairs = valuesOf(context.pairingSkus);
  const candidatePairSet = candidatePairs(candidate);
  for (const sku of RX3_ALLOWED_PAIRS) {
    if (contextPairs.has(sku) || candidatePairSet.has(sku)) {
      return true;
    }
  }
  return false;
}

function roleMatches(candidate: RecommendationSafetyCandidate, context: RecommendationSafetyContext): boolean {
  const required = normalise(context.requiredRole);
  if (required.length === 0) {
    return true;
  }
  const actual = candidateRole(candidate);
  if (actual.length === 0) {
    return false;
  }
  return actual === required;
}

function isDependency(candidate: RecommendationSafetyCandidate): boolean {
  const role = candidateRole(candidate);
  return candidate.dependencyOnly === true || role === "DEPENDENCY" || role === "SUPPORT";
}

export function filterSafeRecommendationCandidates<T extends RecommendationSafetyCandidate>(
  candidates: ReadonlyArray<T>,
  context: RecommendationSafetyContext = {}
): T[] {
  const explicit = valuesOf(context.explicitSkus);
  const selected = valuesOf(context.selectedSkus);
  const removed = valuesOf(context.removedSkus);
  const result: T[] = [];

  for (const candidate of candidates) {
    const sku = candidateSku(candidate);
    const requested = explicit.has(sku) || candidate.explicitlyRequested === true;
    if (removed.has(sku)) {
      continue;
    }
    if (selected.has(sku) && candidate.safetyApproved !== true && !requested) {
      continue;
    }
    if (!roleMatches(candidate, context)) {
      continue;
    }
    if (isDependency(candidate) && !context.allowDependencies && !requested) {
      continue;
    }
    if (sku === RX3_SKU) {
      if (!rx3HasPair(candidate, context)) {
        continue;
      }
      if (!compatibilityEvidence(candidate, context)) {
        continue;
      }
    }
    result.push(candidate);
  }

  return result;
}

export function removeLineItemById<T extends { id?: unknown; sku?: unknown; productSku?: unknown }>(
  items: ReadonlyArray<T>,
  idOrSku: string
): T[] {
  const target = normalise(idOrSku);
  return items.filter((item) => {
    const id = normalise(item.id);
    const sku = normalise(item.sku ?? item.productSku);
    return id !== target && sku !== target;
  });
}

export function mergeRemovedRecommendationSkus(
  existing: ReadonlyArray<string> | undefined,
  removed: ReadonlyArray<string>
): string[] {
  return Array.from(new Set([...(existing ?? []), ...removed].map(normalise))).filter(Boolean);
}

export function isRecommendationSkuRemoved(
  removed: ReadonlyArray<string> | ReadonlySet<string> | undefined,
  sku: string
): boolean {
  return valuesOf(removed).has(normalise(sku));
}
'@
}

function Get-SafetyTestText {
    return @'
import { describe, expect, it } from "vitest";
import {
  filterSafeRecommendationCandidates,
  isRecommendationSkuRemoved,
  mergeRemovedRecommendationSkus,
  removeLineItemById,
} from "./recommendationSafety";

const rx3 = {
  sku: "RX3-100",
  role: "receiver",
  pairedWith: ["SW-120-TX3"],
  compatibility: {
    hdBaseTGeneration: "HDBaseT-3.0",
    resolutionCompatible: true,
    usbCompatible: true,
    distanceCompatible: true,
  },
};

describe("recommendation safety", () => {
  it("blocks RX3-100 without a permitted pair", () => {
    expect(filterSafeRecommendationCandidates([{ ...rx3, pairedWith: [] }])).toEqual([]);
  });

  it("blocks RX3-100 without complete compatibility evidence", () => {
    expect(filterSafeRecommendationCandidates([{
      ...rx3,
      compatibility: { ...rx3.compatibility, usbCompatible: false },
    }])).toEqual([]);
  });

  it("allows RX3-100 with a permitted pair and complete evidence", () => {
    expect(filterSafeRecommendationCandidates([rx3])).toHaveLength(1);
  });

  it("does not expose dependency-only products in a generic pool", () => {
    expect(filterSafeRecommendationCandidates([{
      sku: "SUPPORT-ITEM",
      role: "dependency",
      dependencyOnly: true,
    }])).toEqual([]);
  });

  it("keeps an explicitly requested dependency available", () => {
    expect(filterSafeRecommendationCandidates([{
      sku: "SUPPORT-ITEM",
      role: "dependency",
      dependencyOnly: true,
    }], { explicitSkus: ["SUPPORT-ITEM"] })).toHaveLength(1);
  });

  it("enforces the requested role contract", () => {
    expect(filterSafeRecommendationCandidates([{
      sku: "TX-100",
      role: "transmitter",
    }], { requiredRole: "receiver" })).toEqual([]);
  });

  it("honours a user removal across recalculation", () => {
    const removed = mergeRemovedRecommendationSkus([], ["RX3-100"]);
    expect(isRecommendationSkuRemoved(removed, "rx3_100")).toBe(true);
    expect(filterSafeRecommendationCandidates([rx3], { removedSkus: removed })).toEqual([]);
  });

  it("removes a line item by stable id or SKU", () => {
    const items = [
      { id: "line-1", sku: "SW-120-TX3" },
      { id: "line-2", sku: "RX3-100" },
    ];
    expect(removeLineItemById(items, "line-2")).toEqual([items[0]]);
    expect(removeLineItemById(items, "RX3-100")).toEqual([items[0]]);
  });
});
'@
}

Write-Phase "Wingman next phase: recommendation safety and line-item integrity"

$RepoRoot = [System.IO.Path]::GetFullPath($RepoRoot)
if (-not (Test-Path -LiteralPath $RepoRoot -PathType Container)) {
    Stop-Work "Repository root was not found: $RepoRoot"
}

$packagePath = Resolve-RepoFile "package.json"
$decisionBoundaryPath = Resolve-RepoFile "src/wingman2/lib/recommendationsDecisionBoundary.ts"
$safetyPath = Join-Path $RepoRoot "src/wingman2/lib/recommendationSafetyGate.ts"
$testPath = Join-Path $RepoRoot "src/wingman2/lib/recommendationSafetyGate.test.ts"

$boundaryText = Read-Utf8File $decisionBoundaryPath
$hasImport = $boundaryText.IndexOf("recommendationSafetyGate", [System.StringComparison]::Ordinal) -ge 0
$hasGuardCall = $boundaryText.IndexOf("safetyCheckedSlotPool", [System.StringComparison]::Ordinal) -ge 0
$resolverPattern = '(?s)export\s+function\s+resolveRecommendationSystemSlots\s*\([^)]*\bslotPool\b[^)]*\)\s*(?:\:[^{]+)?\{'
$resolverMatches = [System.Text.RegularExpressions.Regex]::Matches($boundaryText, $resolverPattern)

if (-not $hasGuardCall -and $resolverMatches.Count -ne 1) {
    Stop-Work "Could not identify exactly one resolveRecommendationSystemSlots resolver. Found $($resolverMatches.Count). No files have been written."
}

$newBoundaryText = $boundaryText
if (-not $hasImport) {
    $newBoundaryText = 'import { buildRecommendationSafetyContext, filterSafeRecommendationCandidates } from "./recommendationSafetyGate";' + "`r`n" + $newBoundaryText
}

if (-not $hasGuardCall) {
    $resolverMatch = $resolverMatches[0]
    $openIndex = $resolverMatch.Index + $resolverMatch.Length - 1
    $closeIndex = Find-MatchingBraceIndex $boundaryText $openIndex
    if ($closeIndex -lt 0) {
        Stop-Work "Could not find the end of resolveRecommendationSystemSlots. No files have been written."
    }
    $bodyLength = $closeIndex - $openIndex - 1
    $body = $boundaryText.Substring($openIndex + 1, $bodyLength)
    $rewrittenBody = [System.Text.RegularExpressions.Regex]::Replace($body, '\bslotPool\b', 'safetyCheckedSlotPool')
    $indentMatch = [System.Text.RegularExpressions.Regex]::Match($boundaryText.Substring(0, $openIndex), '(?m)^(?<indent>[\t ]*)[^\r\n]*$')
    $indent = "  "
    if ($indentMatch.Success) {
        $indent = $indentMatch.Groups["indent"].Value + "  "
    }
    $insertion = @"

$indent const safetyCheckedSlotPool = filterSafeRecommendationCandidates(
$indent   slotPool as ReadonlyArray<Record<string, unknown>>,
$indent   buildRecommendationSafetyContext(brief),
$indent );
"@
    $before = $boundaryText.Substring(0, $openIndex + 1)
    $after = $boundaryText.Substring($closeIndex)
    $newBoundaryText = $before + $insertion + $rewrittenBody + $after
}

if ($newBoundaryText.IndexOf("filterSafeRecommendationCandidates", [System.StringComparison]::Ordinal) -lt 0) {
    Stop-Work "Recommendation safety gate was not installed. No files have been written."
}

if (-not $Apply) {
    Write-Host "DRY RUN - no files have been changed." -ForegroundColor Green
    Write-Host "Planned files:" -ForegroundColor White
    Write-Host "  $safetyPath"
    Write-Host "  $testPath"
    Write-Host "  $decisionBoundaryPath"
    Write-Host "Run again with -Apply to write the guarded changes." -ForegroundColor Green
    return
}

Write-Phase "1. Backing up files"
if (Test-Path -LiteralPath $decisionBoundaryPath -PathType Leaf) {
    Backup-File $decisionBoundaryPath
}
if (Test-Path -LiteralPath $safetyPath -PathType Leaf) {
    Backup-File $safetyPath
}
if (Test-Path -LiteralPath $testPath -PathType Leaf) {
    Backup-File $testPath
}

Write-Phase "2. Writing recommendation safety module and tests"
if (-not (Test-Path -LiteralPath $safetyPath -PathType Leaf)) {
    Write-Utf8File $safetyPath (Get-SafetyModuleText)
}
if (-not (Test-Path -LiteralPath $testPath -PathType Leaf)) {
    Write-Utf8File $testPath (Get-SafetyTestText)
}
Write-Utf8File $decisionBoundaryPath $newBoundaryText

Write-Phase "3. Structural validation"
$writtenSafety = Read-Utf8File $safetyPath
$writtenTest = Read-Utf8File $testPath
$writtenBoundary = Read-Utf8File $decisionBoundaryPath
Assert-TextPresent $writtenSafety "filterSafeRecommendationCandidates" "safety filter export"
Assert-TextPresent $writtenSafety "buildRecommendationSafetyContext" "decision-boundary context export"
Assert-TextPresent $writtenSafety "RX3-100" "RX3-100 safety guard"
Assert-TextPresent $writtenSafety "removeLineItemById" "line-item removal helper"
Assert-TextPresent $writtenTest "allows RX3-100 with a permitted pair" "positive RX3-100 test"
Assert-TextPresent $writtenTest "honours a user removal across recalculation" "persistent removal test"
Assert-TextPresent $writtenBoundary "filterSafeRecommendationCandidates" "decision-boundary safety call"

$forbidden = -join @([char]0x65, [char]0x6c, [char]0x73, [char]0x65)
$scriptText = Read-Utf8File $PSCommandPath
if ($scriptText.IndexOf($forbidden, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
    Stop-Work "The generated script contains a forbidden branch keyword."
}

Write-Phase "4. Validation commands"
if ($RunTests) {
    Push-Location $RepoRoot
    try {
        $npm = Get-Command npm -ErrorAction Stop
        Invoke-Checked $npm.Source @("run", "test", "--", "--run", "src/wingman2/lib/recommendationSafetyGate.test.ts") "recommendation safety tests"
        Invoke-Checked $npm.Source @("run", "build") "production build"
        $budgetScript = Join-Path $RepoRoot "tools/check-size-budgets.mjs"
        if (Test-Path -LiteralPath $budgetScript -PathType Leaf) {
            Invoke-Checked $npm.Source @("run", "check:size-budgets") "bundle size budgets"
        }
    }
    finally {
        Pop-Location
    }
}

Write-Phase "5. Review state"
Push-Location $RepoRoot
try {
    $git = Get-Command git -ErrorAction Stop
    Invoke-Checked $git.Source @("diff", "--check") "git whitespace check"
    & $git.Source status --short
    & $git.Source diff --stat
    if ($Commit) {
        Invoke-Checked $git.Source @("add", "src/wingman2/lib/recommendationSafetyGate.ts", "src/wingman2/lib/recommendationSafetyGate.test.ts", "src/wingman2/lib/recommendationsDecisionBoundary.ts") "stage next-phase changes"
        Invoke-Checked $git.Source @("commit", "-m", "Add recommendation safety and line item integrity") "commit next-phase changes"
    }
}
finally {
    Pop-Location
}

Write-Host ""
Write-Host "Next phase complete. Review the diff before pushing." -ForegroundColor Green
