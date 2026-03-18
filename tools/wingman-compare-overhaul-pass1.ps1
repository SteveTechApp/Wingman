[CmdletBinding()]
param(
  [string]$Root = "",
  [switch]$Apply
)

$ErrorActionPreference = "Stop"
if (-not $Apply) { throw "Run with -Apply" }

function Find-RepoRoot {
  param([string]$Start = "")
  $dir = if ($Start) { (Resolve-Path $Start).Path } else { (Get-Location).Path }
  while ($true) {
    if (Test-Path (Join-Path $dir "package.json")) { return $dir }
    $parent = Split-Path $dir -Parent
    if ($parent -eq $dir) { throw "Could not find package.json from $dir" }
    $dir = $parent
  }
}

function Read-Text {
  param([Parameter(Mandatory = $true)][string]$Path)
  return [System.IO.File]::ReadAllText($Path)
}

function Save-Utf8NoBom {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Content
  )
  [System.IO.File]::WriteAllText($Path, $Content, [System.Text.UTF8Encoding]::new($false))
}

function Backup-File {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$RepoRoot,
    [Parameter(Mandatory = $true)][string]$BackupRoot
  )
  $relative = $Path.Substring($RepoRoot.Length).TrimStart('\','/')
  $dest = Join-Path $BackupRoot $relative
  $destDir = Split-Path $dest -Parent
  New-Item -ItemType Directory -Force -Path $destDir | Out-Null
  Copy-Item $Path $dest -Force
}

$repoRoot = Find-RepoRoot -Start $Root

$pagePath = Join-Path $repoRoot "src\features\compare\CompetitorComparePage.tsx"
$resultsPath = Join-Path $repoRoot "src\components\competitor\CompetitorCompareResultsPanel.tsx"

if (-not (Test-Path $pagePath)) { throw "File not found: $pagePath" }
if (-not (Test-Path $resultsPath)) { throw "File not found: $resultsPath" }

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupRoot = Join-Path $repoRoot "_RESCUE\compare-overhaul-pass1-$stamp"
New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null

Backup-File -Path $pagePath -RepoRoot $repoRoot -BackupRoot $backupRoot
Backup-File -Path $resultsPath -RepoRoot $repoRoot -BackupRoot $backupRoot

# ------------------------------------------------------------
# 1) Tighten CompetitorComparePage.tsx
# ------------------------------------------------------------
$page = Read-Text $pagePath

$page = $page.Replace(
@'
      <div className="wm-page-body" style={{ display: "grid", gap: 14 }}>
'@,
@'
      <div className="wm-page-body" style={{ display: "grid", gap: 12 }}>
'@
)

$page = $page.Replace(
@'
        <div className="wm-card" style={{ padding: 14 }}>
'@,
@'
        <div className="wm-card" style={{ padding: 10 }}>
'@
)

$page = $page.Replace(
@'
        <div
          style={{
            display: "grid",
            gap: 14,
            gridTemplateColumns: "minmax(0, 1.25fr) minmax(320px, 0.95fr)",
            alignItems: "start",
          }}
        >
'@,
@'
        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "minmax(0, 1.6fr) 320px",
            alignItems: "start",
          }}
        >
'@
)

$page = $page.Replace(
@'
          <div className="wm-card" style={{ padding: 14 }}>
'@,
@'
          <div className="wm-card" style={{ padding: 10 }}>
'@
)

$page = $page.Replace(
@'
          <div style={{ display: "grid", gap: 14 }}>
'@,
@'
          <div
            style={{
              display: "grid",
              gap: 10,
              alignContent: "start",
              position: "sticky",
              top: 16,
            }}
          >
'@
)

$page = $page.Replace(
@'
            <div className="wm-card" style={{ padding: 14 }}>
'@,
@'
            <div className="wm-card" style={{ padding: 10 }}>
'@
)

Save-Utf8NoBom -Path $pagePath -Content $page

# ------------------------------------------------------------
# 2) Replace CompetitorCompareResultsPanel.tsx with a compact layout
# ------------------------------------------------------------
$resultsContent = @'
import React from "react";

import type {
  CompetitorCompareCandidate,
  CompetitorCompareLiveResult,
  CompetitorCompareSearchResult,
} from "@/services/competitorCompareSearch";
import type {
  CompetitorCompareMatrixStatus,
  CompetitorCompareOption,
} from "@/services/competitorCompareFit";

type CompetitorCompareResultsPanelProps = {
  result: CompetitorCompareSearchResult;
  selectedCandidateId?: string;
  selectedOptionId?: string;
  liveResult?: CompetitorCompareLiveResult | null;
  onSelectCandidate?: (candidate: CompetitorCompareCandidate) => void;
  onVerifyCandidate?: (candidate: CompetitorCompareCandidate) => void;
  onSelectOption?: (
    candidate: CompetitorCompareCandidate,
    option: CompetitorCompareOption,
  ) => void;
};

type CompactSectionTitleProps = {
  title: string;
  subtitle: string;
};

function chipStyle(
  accent: "blue" | "green" | "amber" | "gray",
): React.CSSProperties {
  if (accent === "green") {
    return {
      border: "1px solid rgba(122,236,160,0.24)",
      background: "rgba(122,236,160,0.12)",
      color: "#d6ffe4",
    };
  }

  if (accent === "amber") {
    return {
      border: "1px solid rgba(255,190,92,0.26)",
      background: "rgba(255,190,92,0.12)",
      color: "#ffe6b7",
    };
  }

  if (accent === "gray") {
    return {
      border: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(255,255,255,0.05)",
      color: "rgba(255,255,255,0.72)",
    };
  }

  return {
    border: "1px solid rgba(92,225,230,0.24)",
    background: "rgba(92,225,230,0.12)",
    color: "#dffcff",
  };
}

function confidenceAccent(
  confidence: "High" | "Medium" | "Low",
): "green" | "amber" | "gray" {
  if (confidence === "High") return "green";
  if (confidence === "Medium") return "amber";
  return "gray";
}

function matrixAccent(
  status: CompetitorCompareMatrixStatus,
): React.CSSProperties {
  if (status === "better") {
    return {
      color: "#d6ffe4",
      background: "rgba(122,236,160,0.08)",
      border: "1px solid rgba(122,236,160,0.18)",
    };
  }
  if (status === "match") {
    return {
      color: "#dffcff",
      background: "rgba(92,225,230,0.08)",
      border: "1px solid rgba(92,225,230,0.18)",
    };
  }
  if (status === "gap") {
    return {
      color: "#ffe6b7",
      background: "rgba(255,190,92,0.08)",
      border: "1px solid rgba(255,190,92,0.18)",
    };
  }
  return {
    color: "rgba(255,255,255,0.78)",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
  };
}

function selectedCandidate(
  result: CompetitorCompareSearchResult,
  selectedCandidateId?: string,
): CompetitorCompareCandidate | undefined {
  return (
    result.candidates.find((candidate) => candidate.id === selectedCandidateId) ||
    result.bestCandidate
  );
}

function selectedOption(
  candidate: CompetitorCompareCandidate | undefined,
  selectedOptionId?: string,
): CompetitorCompareOption | undefined {
  if (!candidate) return undefined;
  return (
    candidate.options.find((option) => option.id === selectedOptionId) ||
    candidate.primaryOption
  );
}

function sectionTitle({ title, subtitle }: CompactSectionTitleProps) {
  return (
    <div style={{ display: "grid", gap: 2 }}>
      <div style={{ fontSize: 15, fontWeight: 800 }}>{title}</div>
      <div
        style={{
          fontSize: 11,
          color: "rgba(255,255,255,0.60)",
          lineHeight: 1.35,
        }}
      >
        {subtitle}
      </div>
    </div>
  );
}

export default function CompetitorCompareResultsPanel(
  props: CompetitorCompareResultsPanelProps,
) {
  const {
    result,
    selectedCandidateId,
    selectedOptionId,
    liveResult,
    onSelectCandidate,
    onVerifyCandidate,
    onSelectOption,
  } = props;

  const activeCandidate = selectedCandidate(result, selectedCandidateId);
  const activeOption = selectedOption(activeCandidate, selectedOptionId);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {sectionTitle({
        title: "Match shortlist",
        subtitle:
          "Review likely competitor targets and compare the strongest WyreStorm options.",
      })}

      <div
        style={{
          padding: 12,
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.03)",
          display: "grid",
          gap: 8,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700 }}>{result.summary}</div>

        {result.suggestedWyrestormSkus.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {result.suggestedWyrestormSkus.map((sku) => (
              <span
                key={sku}
                style={{
                  padding: "5px 8px",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 700,
                  ...chipStyle("blue"),
                }}
              >
                {sku}
              </span>
            ))}
          </div>
        ) : null}

        {result.clarifyingQuestions.length > 0 ? (
          <div style={{ display: "grid", gap: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#ffe6b7" }}>
              Clarify before quoting
            </div>
            {result.clarifyingQuestions.map((question) => (
              <div
                key={question}
                style={{ fontSize: 11, color: "rgba(255,255,255,0.72)" }}
              >
                - {question}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {result.candidates.length === 0 ? (
        <div
          style={{
            padding: 14,
            borderRadius: 12,
            border: "1px dashed rgba(255,255,255,0.12)",
            color: "rgba(255,255,255,0.54)",
            fontSize: 12,
          }}
        >
          No comparison candidates yet.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {result.candidates.map((candidate) => {
            const active = candidate.id === activeCandidate?.id;
            const primary = candidate.primaryOption;

            return (
              <div
                key={candidate.id}
                style={{
                  display: "grid",
                  gap: 10,
                  padding: 12,
                  borderRadius: 12,
                  border: active
                    ? "1px solid rgba(92,225,230,0.28)"
                    : "1px solid rgba(255,255,255,0.08)",
                  background: active
                    ? "rgba(92,225,230,0.08)"
                    : "rgba(255,255,255,0.02)",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gap: 8,
                    gridTemplateColumns: "minmax(0, 1fr) minmax(190px, 220px)",
                    alignItems: "start",
                  }}
                >
                  <div style={{ display: "grid", gap: 5 }}>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
                        alignItems: "center",
                      }}
                    >
                      <div style={{ fontSize: 15, fontWeight: 800 }}>
                        {candidate.comparison.brand} {candidate.comparison.competitorSku}
                      </div>
                      <span
                        style={{
                          padding: "3px 7px",
                          borderRadius: 999,
                          fontSize: 10,
                          fontWeight: 700,
                          ...chipStyle(confidenceAccent(candidate.searchConfidence)),
                        }}
                      >
                        Search {candidate.searchConfidence}
                      </span>
                      <span
                        style={{
                          padding: "3px 7px",
                          borderRadius: 999,
                          fontSize: 10,
                          fontWeight: 700,
                          ...chipStyle(
                            candidate.sourceType === "manual" ? "amber" : "gray",
                          ),
                        }}
                      >
                        {candidate.sourceLabel}
                      </span>
                    </div>

                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.80)" }}>
                      {candidate.comparison.competitorName || candidate.comparison.summary}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.56)" }}>
                      {candidate.comparison.category}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.68)" }}>
                      {candidate.searchReasons.join(" ")}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gap: 4,
                      justifyItems: "end",
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        letterSpacing: 0.35,
                        textTransform: "uppercase",
                        opacity: 0.60,
                      }}
                    >
                      Primary WyreStorm path
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#dffcff" }}>
                      {primary?.wyrestormSku || candidate.comparison.wyrestormSku}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "rgba(255,255,255,0.68)",
                        textAlign: "right",
                      }}
                    >
                      {primary?.label || "Current mapping"}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => onSelectCandidate?.(candidate)}
                    style={{
                      height: 32,
                      padding: "0 10px",
                      borderRadius: 9,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.05)",
                      color: "#eef5ff",
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    {active ? "Selected" : "Review match"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onVerifyCandidate?.(candidate)}
                    style={{
                      height: 32,
                      padding: "0 10px",
                      borderRadius: 9,
                      border: "1px solid rgba(92,225,230,0.24)",
                      background: "rgba(92,225,230,0.12)",
                      color: "#dffcff",
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    Verify live
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeCandidate ? (
        <div
          style={{
            display: "grid",
            gap: 12,
            padding: 14,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <div style={{ display: "grid", gap: 2 }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>
              WyreStorm options for {activeCandidate.comparison.competitorSku}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.60)",
                lineHeight: 1.35,
              }}
            >
              Compare the strongest replacement paths before positioning one to the customer.
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gap: 8,
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            }}
          >
            {activeCandidate.options.map((option) => {
              const active = option.id === activeOption?.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onSelectOption?.(activeCandidate, option)}
                  style={{
                    display: "grid",
                    gap: 6,
                    padding: 12,
                    textAlign: "left",
                    borderRadius: 12,
                    border: active
                      ? "1px solid rgba(92,225,230,0.28)"
                      : "1px solid rgba(255,255,255,0.08)",
                    background: active
                      ? "rgba(92,225,230,0.08)"
                      : "rgba(255,255,255,0.03)",
                    color: "#eef5ff",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.82 }}>
                      {option.label}
                    </div>
                    <span
                      style={{
                        padding: "3px 7px",
                        borderRadius: 999,
                        fontSize: 10,
                        fontWeight: 700,
                        ...chipStyle(confidenceAccent(option.fitConfidence)),
                      }}
                    >
                      {option.fitConfidence}
                    </span>
                  </div>

                  <div style={{ fontSize: 15, fontWeight: 800, color: "#dffcff" }}>
                    {option.wyrestormSku}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.72)" }}>
                    {option.wyrestormName || option.wyrestormCategory}
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.56)" }}>
                    Fit {option.fitScore}/100
                  </div>
                </button>
              );
            })}
          </div>

          {activeOption ? (
            <div
              style={{
                display: "grid",
                gap: 12,
                gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, 0.95fr)",
                alignItems: "start",
              }}
            >
              <div style={{ display: "grid", gap: 12 }}>
                <div
                  style={{
                    display: "grid",
                    gap: 6,
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid rgba(92,225,230,0.16)",
                    background: "rgba(92,225,230,0.06)",
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 800 }}>
                    {activeOption.label}: {activeOption.wyrestormSku}
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.76)" }}>
                    {activeOption.reasons.join(" ")}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.66)" }}>
                    {activeOption.positioningSummary}
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: 6,
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.03)",
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 800 }}>
                    Sales talk track
                  </div>
                  {activeOption.salesStory.map((line) => (
                    <div
                      key={line}
                      style={{
                        fontSize: 11,
                        color: "rgba(255,255,255,0.70)",
                        lineHeight: 1.35,
                      }}
                    >
                      - {line}
                    </div>
                  ))}
                  {activeOption.cautions.map((line) => (
                    <div
                      key={line}
                      style={{
                        fontSize: 11,
                        color: "#ffe6b7",
                        lineHeight: 1.35,
                      }}
                    >
                      - {line}
                    </div>
                  ))}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 6,
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 800 }}>
                  Side-by-side matrix
                </div>
                {activeOption.matrix.map((row) => (
                  <div
                    key={row.id}
                    style={{
                      display: "grid",
                      gap: 6,
                      gridTemplateColumns: "120px minmax(0, 1fr) minmax(0, 1fr)",
                      alignItems: "start",
                      padding: 8,
                      borderRadius: 10,
                      ...matrixAccent(row.status),
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 800 }}>{row.label}</div>
                    <div style={{ display: "grid", gap: 2 }}>
                      <div style={{ fontSize: 10, opacity: 0.64 }}>Competitor</div>
                      <div style={{ fontSize: 11 }}>{row.competitorValue}</div>
                    </div>
                    <div style={{ display: "grid", gap: 2 }}>
                      <div style={{ fontSize: 10, opacity: 0.64 }}>WyreStorm</div>
                      <div style={{ fontSize: 11 }}>{row.wyrestormValue}</div>
                      {row.note ? (
                        <div style={{ fontSize: 10, opacity: 0.74 }}>{row.note}</div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {liveResult?.record ? (
        <div
          style={{
            display: "grid",
            gap: 8,
            padding: 12,
            borderRadius: 12,
            border: "1px solid rgba(122,236,160,0.24)",
            background: "rgba(122,236,160,0.10)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              alignItems: "center",
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 800 }}>Live verification</div>
            <span
              style={{
                padding: "4px 8px",
                borderRadius: 999,
                fontSize: 10,
                fontWeight: 700,
                ...chipStyle("green"),
              }}
            >
              {liveResult.sourceLabel}
            </span>
          </div>

          <div
            style={{ fontSize: 12, color: "rgba(255,255,255,0.80)", lineHeight: 1.4 }}
          >
            {liveResult.record.brand} {liveResult.record.competitorSku} compares closest to{" "}
            <strong>
              {liveResult.candidate?.primaryOption?.wyrestormSku ||
                liveResult.record.wyrestormSku}
            </strong>
            {liveResult.record.wyrestormName
              ? ` (${liveResult.record.wyrestormName})`
              : ""}.
          </div>

          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.68)" }}>
            {liveResult.record.rationale}
          </div>

          {liveResult.intelligence?.summary ? (
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.68)" }}>
              {liveResult.intelligence.summary}
            </div>
          ) : null}

          {liveResult.warnings.length > 0 ? (
            <div style={{ display: "grid", gap: 4 }}>
              {liveResult.warnings.map((warning) => (
                <div
                  key={warning}
                  style={{ fontSize: 11, color: "#ffe6b7" }}
                >
                  - {warning}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gap: 6,
          padding: 12,
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 800 }}>Sales decode</div>
        {result.salesAdvice.map((item) => (
          <div
            key={item}
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.70)",
              lineHeight: 1.35,
            }}
          >
            - {item}
          </div>
        ))}
      </div>
    </div>
  );
}
'@

Save-Utf8NoBom -Path $resultsPath -Content $resultsContent

Write-Host ""
Write-Host "Patched files:" -ForegroundColor Green
Write-Host "  $pagePath" -ForegroundColor Green
Write-Host "  $resultsPath" -ForegroundColor Green
Write-Host ""
Write-Host "Backup:" -ForegroundColor Yellow
Write-Host "  $backupRoot" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next:" -ForegroundColor Cyan
Write-Host "  npm run typecheck"
Write-Host "  npm run dev"