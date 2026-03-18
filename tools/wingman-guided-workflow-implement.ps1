$ErrorActionPreference = "Stop"

Set-Location "C:\Users\steve\wingman"
$root = (Get-Location).Path
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$rescueRoot = Join-Path $root "_RESCUE\guided-workflow-$stamp"
$auditRoot  = Join-Path $root "_AUDITS"
$workflowDir = Join-Path $root "src\features\workflow"

New-Item -ItemType Directory -Force -Path $rescueRoot | Out-Null
New-Item -ItemType Directory -Force -Path $auditRoot | Out-Null
New-Item -ItemType Directory -Force -Path $workflowDir | Out-Null

function Save-Utf8NoBom {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Content
  )

  $dir = Split-Path $Path -Parent
  if ($dir) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }

  $utf8 = [System.Text.UTF8Encoding]::new($false)
  [System.IO.File]::WriteAllText($Path, $Content, $utf8)
}

function Backup-IfExists {
  param([Parameter(Mandatory = $true)][string]$Path)

  if (Test-Path $Path) {
    $relative = $Path.Substring($root.Length).TrimStart('\')
    $dest = Join-Path $rescueRoot $relative
    $destDir = Split-Path $dest -Parent
    if ($destDir) {
      New-Item -ItemType Directory -Force -Path $destDir | Out-Null
    }
    Copy-Item -Path $Path -Destination $dest -Force
  }
}

function Set-FileContent {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Content
  )

  Backup-IfExists -Path $Path
  Save-Utf8NoBom -Path $Path -Content $Content
}

function Ensure-ExportLine {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Line
  )

  if (-not (Test-Path $Path)) {
    Save-Utf8NoBom -Path $Path -Content ($Line + "`r`n")
    return
  }

  $text = Get-Content -Raw -Path $Path
  if ($text -match [regex]::Escape($Line)) {
    return
  }

  $updated = $text.TrimEnd() + "`r`n" + $Line + "`r`n"
  Save-Utf8NoBom -Path $Path -Content $updated
}

$typesFile = Join-Path $workflowDir "types.ts"
$hookFile = Join-Path $workflowDir "useGuidedWorkflow.ts"
$sectionFile = Join-Path $workflowDir "GuidedFocusSection.tsx"
$railFile = Join-Path $workflowDir "WorkflowStepRail.tsx"
$shellFile = Join-Path $workflowDir "GuidedWorkflowShell.tsx"
$indexFile = Join-Path $workflowDir "index.ts"
$readmeFile = Join-Path $workflowDir "README.md"
$exampleFile = Join-Path $workflowDir "WorkflowExample.tsx"
$auditFile = Join-Path $auditRoot "guided-workflow-candidates-$stamp.md"

$typesContent = @'
export type GuidedStep = {
  id: string;
  title: string;
  description?: string;
  optional?: boolean;
};

export type GuidedStepState = "upcoming" | "active" | "complete";

export type GuidedWorkflowOptions = {
  storageKey?: string;
  initialStepId?: string;
  scrollBehavior?: ScrollBehavior;
  scrollBlock?: ScrollLogicalPosition;
};

export type GuidedWorkflowApi = {
  steps: GuidedStep[];
  activeStepId: string;
  activeIndex: number;
  progressPercent: number;
  canGoBack: boolean;
  canGoNext: boolean;
  setActiveStepId: (stepId: string) => void;
  goBack: () => void;
  goNext: () => void;
  isActive: (stepId: string) => boolean;
  isComplete: (stepId: string) => boolean;
  getState: (stepId: string) => GuidedStepState;
};
'@

$hookContent = @'
import * as React from "react";
import type { GuidedStep, GuidedStepState, GuidedWorkflowApi, GuidedWorkflowOptions } from "./types";

function resolveInitialStepId(steps: GuidedStep[], initialStepId?: string): string {
  if (initialStepId && steps.some((step) => step.id === initialStepId)) {
    return initialStepId;
  }

  if (steps.length > 0) {
    return steps[0].id;
  }

  return "";
}

export function useGuidedWorkflow(
  steps: GuidedStep[],
  options: GuidedWorkflowOptions = {}
): GuidedWorkflowApi {
  const {
    storageKey,
    initialStepId,
    scrollBehavior = "smooth",
    scrollBlock = "center"
  } = options;

  const initialResolved = React.useMemo(
    () => resolveInitialStepId(steps, initialStepId),
    [steps, initialStepId]
  );

  const [activeStepId, setActiveStepIdState] = React.useState<string>(() => {
    if (typeof window !== "undefined" && storageKey) {
      try {
        const stored = window.localStorage.getItem(storageKey);
        if (stored && steps.some((step) => step.id === stored)) {
          return stored;
        }
      } catch {
      }
    }

    return initialResolved;
  });

  React.useEffect(() => {
    if (!activeStepId && initialResolved) {
      setActiveStepIdState(initialResolved);
    }
  }, [activeStepId, initialResolved]);

  const activeIndex = React.useMemo(() => {
    const index = steps.findIndex((step) => step.id === activeStepId);
    return index >= 0 ? index : 0;
  }, [steps, activeStepId]);

  const stableActiveStepId = steps[activeIndex]?.id ?? "";

  React.useEffect(() => {
    if (!storageKey || !stableActiveStepId || typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(storageKey, stableActiveStepId);
    } catch {
    }
  }, [storageKey, stableActiveStepId]);

  React.useEffect(() => {
    if (!stableActiveStepId || typeof document === "undefined") {
      return;
    }

    const el = document.getElementById(`guided-${stableActiveStepId}`);
    if (!el) {
      return;
    }

    try {
      el.scrollIntoView({ behavior: scrollBehavior, block: scrollBlock });
    } catch {
      el.scrollIntoView();
    }
  }, [stableActiveStepId, scrollBehavior, scrollBlock]);

  const setActiveStepId = React.useCallback(
    (stepId: string) => {
      if (!steps.some((step) => step.id === stepId)) {
        return;
      }
      setActiveStepIdState(stepId);
    },
    [steps]
  );

  const goBack = React.useCallback(() => {
    const prev = steps[activeIndex - 1];
    if (!prev) {
      return;
    }
    setActiveStepIdState(prev.id);
  }, [steps, activeIndex]);

  const goNext = React.useCallback(() => {
    const next = steps[activeIndex + 1];
    if (!next) {
      return;
    }
    setActiveStepIdState(next.id);
  }, [steps, activeIndex]);

  const isActive = React.useCallback(
    (stepId: string) => stableActiveStepId === stepId,
    [stableActiveStepId]
  );

  const isComplete = React.useCallback(
    (stepId: string) => {
      const stepIndex = steps.findIndex((step) => step.id === stepId);
      return stepIndex >= 0 && stepIndex < activeIndex;
    },
    [steps, activeIndex]
  );

  const getState = React.useCallback(
    (stepId: string): GuidedStepState => {
      if (isActive(stepId)) return "active";
      if (isComplete(stepId)) return "complete";
      return "upcoming";
    },
    [isActive, isComplete]
  );

  const progressPercent = steps.length > 1
    ? Math.round((activeIndex / (steps.length - 1)) * 100)
    : steps.length === 1
      ? 100
      : 0;

  return {
    steps,
    activeStepId: stableActiveStepId,
    activeIndex,
    progressPercent,
    canGoBack: activeIndex > 0,
    canGoNext: activeIndex < steps.length - 1,
    setActiveStepId,
    goBack,
    goNext,
    isActive,
    isComplete,
    getState
  };
}
'@

$sectionContent = @'
import * as React from "react";

type Props = {
  stepId: string;
  title: string;
  description?: string;
  active: boolean;
  complete: boolean;
  children: React.ReactNode;
  badgeText?: string;
  style?: React.CSSProperties;
};

function tone(active: boolean, complete: boolean): React.CSSProperties {
  if (active) {
    return {
      border: "2px solid rgba(94,234,212,0.95)",
      background: "linear-gradient(180deg, rgba(10,18,28,0.98), rgba(16,26,38,0.94))",
      boxShadow: "0 0 0 4px rgba(94,234,212,0.12), 0 22px 48px rgba(0,0,0,0.28)",
      transform: "scale(1.01)"
    };
  }

  if (complete) {
    return {
      border: "1px solid rgba(74,222,128,0.35)",
      background: "linear-gradient(180deg, rgba(8,18,16,0.94), rgba(11,18,22,0.92))",
      boxShadow: "0 16px 32px rgba(0,0,0,0.18)",
      transform: "scale(1)"
    };
  }

  return {
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
    boxShadow: "none",
    transform: "scale(1)"
  };
}

export default function GuidedFocusSection({
  stepId,
  title,
  description,
  active,
  complete,
  children,
  badgeText,
  style
}: Props) {
  const stateLabel = active ? "Current focus" : complete ? "Completed" : "Upcoming";

  return (
    <section
      id={`guided-${stepId}`}
      data-guided-step={stepId}
      data-active={active ? "true" : "false"}
      data-complete={complete ? "true" : "false"}
      style={{
        position: "relative",
        borderRadius: 22,
        padding: 20,
        marginBottom: 18,
        transition: "all 180ms ease",
        ...tone(active, complete),
        ...style
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          marginBottom: 12,
          flexWrap: "wrap"
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 0.7,
              textTransform: "uppercase",
              color: active
                ? "#99f6e4"
                : complete
                  ? "#86efac"
                  : "rgba(255,255,255,0.58)"
            }}
          >
            {stateLabel}
          </div>

          <div
            style={{
              fontSize: 20,
              fontWeight: 900,
              color: "white",
              marginTop: 2
            }}
          >
            {title}
          </div>

          {description ? (
            <div
              style={{
                marginTop: 4,
                fontSize: 13,
                lineHeight: 1.5,
                color: "rgba(255,255,255,0.72)",
                maxWidth: 900
              }}
            >
              {description}
            </div>
          ) : null}
        </div>

        <div
          style={{
            borderRadius: 999,
            padding: "6px 10px",
            background: active
              ? "rgba(94,234,212,0.14)"
              : complete
                ? "rgba(74,222,128,0.12)"
                : "rgba(255,255,255,0.04)",
            border: active
              ? "1px solid rgba(94,234,212,0.35)"
              : complete
                ? "1px solid rgba(74,222,128,0.28)"
                : "1px solid rgba(255,255,255,0.08)",
            color: active
              ? "#ccfbf1"
              : complete
                ? "#dcfce7"
                : "rgba(255,255,255,0.68)",
            fontSize: 12,
            fontWeight: 800,
            whiteSpace: "nowrap"
          }}
        >
          {badgeText ?? (active ? "Focus here" : complete ? "Done" : "Queued")}
        </div>
      </div>

      <div>{children}</div>
    </section>
  );
}
'@

$railContent = @'
import * as React from "react";
import type { GuidedStep } from "./types";

type Props = {
  steps: GuidedStep[];
  activeStepId: string;
  activeIndex: number;
  onSelectStep: (stepId: string) => void;
};

export default function WorkflowStepRail({
  steps,
  activeStepId,
  activeIndex,
  onSelectStep
}: Props) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        marginTop: 14
      }}
    >
      {steps.map((step, index) => {
        const active = step.id === activeStepId;
        const complete = index < activeIndex;

        return (
          <button
            key={step.id}
            type="button"
            onClick={() => onSelectStep(step.id)}
            style={{
              appearance: "none",
              borderRadius: 999,
              padding: "8px 12px",
              cursor: "pointer",
              border: active
                ? "1px solid rgba(94,234,212,0.45)"
                : complete
                  ? "1px solid rgba(74,222,128,0.28)"
                  : "1px solid rgba(255,255,255,0.08)",
              background: active
                ? "rgba(94,234,212,0.12)"
                : complete
                  ? "rgba(74,222,128,0.10)"
                  : "rgba(255,255,255,0.04)",
              color: "white",
              fontWeight: active ? 800 : 600,
              fontSize: 12,
              transition: "all 160ms ease"
            }}
            aria-current={active ? "step" : undefined}
            title={step.description ?? step.title}
          >
            {index + 1}. {step.title}
          </button>
        );
      })}
    </div>
  );
}
'@

$shellContent = @'
import * as React from "react";
import WorkflowStepRail from "./WorkflowStepRail";
import type { GuidedStep } from "./types";

type Props = {
  title: string;
  subtitle?: string;
  steps: GuidedStep[];
  activeStepId: string;
  activeIndex: number;
  progressPercent: number;
  canGoBack: boolean;
  canGoNext: boolean;
  onBack: () => void;
  onNext: () => void;
  onSelectStep: (stepId: string) => void;
  children: React.ReactNode;
  showDimmer?: boolean;
  topSlot?: React.ReactNode;
  bottomSlot?: React.ReactNode;
};

export default function GuidedWorkflowShell({
  title,
  subtitle,
  steps,
  activeStepId,
  activeIndex,
  progressPercent,
  canGoBack,
  canGoNext,
  onBack,
  onNext,
  onSelectStep,
  children,
  showDimmer = false,
  topSlot,
  bottomSlot
}: Props) {
  const currentStep = steps[activeIndex];

  return (
    <div style={{ position: "relative" }}>
      {showDimmer ? (
        <div
          aria-hidden="true"
          style={{
            pointerEvents: "none",
            position: "fixed",
            inset: 0,
            background:
              "radial-gradient(circle at center, rgba(0,0,0,0) 0%, rgba(0,0,0,0.18) 55%, rgba(0,0,0,0.38) 100%)",
            zIndex: 0
          }}
        />
      ) : null}

      <div style={{ position: "relative", zIndex: 1 }}>
        <div
          style={{
            position: "sticky",
            top: 12,
            zIndex: 20,
            marginBottom: 18,
            borderRadius: 20,
            padding: 18,
            background: "rgba(10,16,24,0.92)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(10px)",
            boxShadow: "0 16px 40px rgba(0,0,0,0.22)"
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.60)",
              textTransform: "uppercase",
              letterSpacing: 0.8
            }}
          >
            Guided workflow
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 16,
              flexWrap: "wrap",
              marginTop: 8
            }}
          >
            <div style={{ minWidth: 280 }}>
              <div
                style={{
                  fontSize: 24,
                  lineHeight: 1.15,
                  fontWeight: 900,
                  color: "white"
                }}
              >
                {title}
              </div>

              {subtitle ? (
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 13,
                    lineHeight: 1.5,
                    color: "rgba(255,255,255,0.74)",
                    maxWidth: 860
                  }}
                >
                  {subtitle}
                </div>
              ) : null}

              {currentStep ? (
                <div style={{ marginTop: 12 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: 0.7,
                      color: "#99f6e4"
                    }}
                  >
                    Current focus
                  </div>

                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 900,
                      color: "white",
                      marginTop: 2
                    }}
                  >
                    {currentStep.title}
                  </div>

                  {currentStep.description ? (
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 13,
                        color: "rgba(255,255,255,0.72)"
                      }}
                    >
                      {currentStep.description}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div style={{ minWidth: 220 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                  alignItems: "center"
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.72)"
                  }}
                >
                  Progress
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: "white"
                  }}
                >
                  {progressPercent}%
                </div>
              </div>

              <div
                style={{
                  height: 8,
                  marginTop: 8,
                  borderRadius: 999,
                  overflow: "hidden",
                  background: "rgba(255,255,255,0.08)"
                }}
              >
                <div
                  style={{
                    width: `${progressPercent}%`,
                    height: "100%",
                    background: "linear-gradient(90deg, #14b8a6, #60a5fa)"
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginTop: 14,
                  flexWrap: "wrap"
                }}
              >
                <button
                  type="button"
                  onClick={onBack}
                  disabled={!canGoBack}
                  style={{
                    appearance: "none",
                    borderRadius: 12,
                    padding: "10px 14px",
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: canGoBack ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.03)",
                    color: canGoBack ? "white" : "rgba(255,255,255,0.40)",
                    fontWeight: 700,
                    cursor: canGoBack ? "pointer" : "not-allowed"
                  }}
                >
                  Back
                </button>

                <button
                  type="button"
                  onClick={onNext}
                  disabled={!canGoNext}
                  style={{
                    appearance: "none",
                    borderRadius: 12,
                    padding: "10px 14px",
                    border: "1px solid rgba(94,234,212,0.25)",
                    background: canGoNext ? "rgba(94,234,212,0.12)" : "rgba(255,255,255,0.03)",
                    color: canGoNext ? "#ccfbf1" : "rgba(255,255,255,0.40)",
                    fontWeight: 800,
                    cursor: canGoNext ? "pointer" : "not-allowed"
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          <WorkflowStepRail
            steps={steps}
            activeStepId={activeStepId}
            activeIndex={activeIndex}
            onSelectStep={onSelectStep}
          />

          {topSlot ? <div style={{ marginTop: 14 }}>{topSlot}</div> : null}
        </div>

        <div>{children}</div>

        {bottomSlot ? <div style={{ marginTop: 18 }}>{bottomSlot}</div> : null}
      </div>
    </div>
  );
}
'@

$indexContent = @'
export * from "./types";
export * from "./useGuidedWorkflow";
export { default as GuidedFocusSection } from "./GuidedFocusSection";
export { default as WorkflowStepRail } from "./WorkflowStepRail";
export { default as GuidedWorkflowShell } from "./GuidedWorkflowShell";
'@

$readmeContent = @"
# Guided Workflow System

This folder provides a shared pattern for every multi-step process in Wingman.

## Core pieces

- useGuidedWorkflow.ts
- GuidedWorkflowShell.tsx
- GuidedFocusSection.tsx
- WorkflowStepRail.tsx

## Intended use

Use this system for:
- Discovery
- Extend a Signal
- Room Wizard
- Video Wall
- LED Wall
- Proposal Builder
- Intake / Import review
- Compare workflows

## Standard UX rules

- same sticky top shell
- same step rail
- same current focus language
- highlight the current object
- scroll active sections into view
- Back / Next consistent
"@