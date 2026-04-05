Set-Location C:\Users\steve\wingman
$ErrorActionPreference = "Stop"

function Save-Utf8NoBom {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Content
  )

  $fullPath = Join-Path (Get-Location).Path $Path
  $dir = Split-Path $fullPath -Parent

  if ($dir -and -not (Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }

  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($fullPath, $Content, $utf8)
}

$bridge = @'
export type GuruProjectSnapshot = {
  projectName?: string;
  customerName?: string;
  application?: string;
  roomType?: string;
  sourceCount?: number;
  displayCount?: number;
  distanceM?: number;
  architecture?: string;
  controlRequired?: boolean;
  usbRequired?: boolean;
  audioNotes?: string;
  selectedProducts?: string[];
  proposalNotes?: string;
};

function parseNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function parseBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const v = value.toLowerCase().trim();
    if (v === "true" || v === "yes") return true;
    if (v === "false" || v === "no") return false;
  }
  return undefined;
}

function parseStringArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return undefined;
}

function safeJsonParse(raw: string | null): unknown {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function coerceSnapshot(input: unknown): GuruProjectSnapshot | undefined {
  if (!input || typeof input !== "object") return undefined;
  const data = input as Record<string, unknown>;

  const snapshot: GuruProjectSnapshot = {
    projectName:
      typeof data.projectName === "string" ? data.projectName :
      typeof data.name === "string" ? data.name :
      typeof data.project_title === "string" ? data.project_title :
      undefined,

    customerName:
      typeof data.customerName === "string" ? data.customerName :
      typeof data.customer === "string" ? data.customer :
      undefined,

    application:
      typeof data.application === "string" ? data.application :
      typeof data.applicationType === "string" ? data.applicationType :
      typeof data.useCase === "string" ? data.useCase :
      undefined,

    roomType:
      typeof data.roomType === "string" ? data.roomType :
      typeof data.room === "string" ? data.room :
      undefined,

    sourceCount:
      parseNumber(data.sourceCount) ??
      parseNumber(data.sources) ??
      parseNumber(data.source_count),

    displayCount:
      parseNumber(data.displayCount) ??
      parseNumber(data.displays) ??
      parseNumber(data.display_count),

    distanceM:
      parseNumber(data.distanceM) ??
      parseNumber(data.distance) ??
      parseNumber(data.maxDistanceM) ??
      parseNumber(data.max_distance_m),

    architecture:
      typeof data.architecture === "string" ? data.architecture :
      typeof data.solutionType === "string" ? data.solutionType :
      typeof data.topology === "string" ? data.topology :
      undefined,

    controlRequired:
      parseBoolean(data.controlRequired) ??
      parseBoolean(data.control) ??
      parseBoolean(data.requiresControl),

    usbRequired:
      parseBoolean(data.usbRequired) ??
      parseBoolean(data.usb) ??
      parseBoolean(data.requiresUsb),

    audioNotes:
      typeof data.audioNotes === "string" ? data.audioNotes :
      typeof data.audio === "string" ? data.audio :
      undefined,

    selectedProducts:
      parseStringArray(data.selectedProducts) ??
      parseStringArray(data.products) ??
      parseStringArray(data.skus),

    proposalNotes:
      typeof data.proposalNotes === "string" ? data.proposalNotes :
      typeof data.notes === "string" ? data.notes :
      undefined,
  };

  const hasAnyValue = Object.values(snapshot).some((value) => {
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== null && value !== "";
  });

  return hasAnyValue ? snapshot : undefined;
}

function collectCandidates(): unknown[] {
  if (typeof window === "undefined") return [];

  const storageKeys = [
    "wingman.currentProject",
    "wingman.project.current",
    "wingman.activeProject",
    "wm.activeProject",
    "wm.currentProject",
    "currentProject",
    "activeProject",
  ];

  const candidates: unknown[] = [];

  for (const key of storageKeys) {
    candidates.push(safeJsonParse(window.sessionStorage.getItem(key)));
    candidates.push(safeJsonParse(window.localStorage.getItem(key)));
  }

  const win = window as unknown as {
    __WINGMAN_ACTIVE_PROJECT__?: unknown;
    __WM_ACTIVE_PROJECT__?: unknown;
  };

  candidates.push(win.__WINGMAN_ACTIVE_PROJECT__);
  candidates.push(win.__WM_ACTIVE_PROJECT__);

  return candidates;
}

export function getGuruProjectSnapshot(): GuruProjectSnapshot | undefined {
  const candidates = collectCandidates();

  for (const candidate of candidates) {
    const snapshot = coerceSnapshot(candidate);
    if (snapshot) return snapshot;
  }

  return undefined;
}

export function buildGuruInputFromProject(
  brief: string,
  snapshot?: GuruProjectSnapshot,
): string {
  const lines: string[] = [];

  if (brief.trim()) {
    lines.push(brief.trim());
  }

  if (!snapshot) {
    return lines.join(". ");
  }

  if (snapshot.projectName) lines.push("Project " + snapshot.projectName);
  if (snapshot.customerName) lines.push("Customer " + snapshot.customerName);
  if (snapshot.application) lines.push("Application " + snapshot.application);
  if (snapshot.roomType) lines.push("Room type " + snapshot.roomType);
  if (snapshot.sourceCount !== undefined) lines.push(String(snapshot.sourceCount) + " sources");
  if (snapshot.displayCount !== undefined) lines.push(String(snapshot.displayCount) + " displays");
  if (snapshot.distanceM !== undefined) lines.push(String(snapshot.distanceM) + "m max distance");
  if (snapshot.architecture) lines.push("Architecture " + snapshot.architecture);
  if (snapshot.controlRequired === true) lines.push("Control required");
  if (snapshot.usbRequired === true) lines.push("USB required");
  if (snapshot.audioNotes) lines.push("Audio " + snapshot.audioNotes);
  if (snapshot.selectedProducts && snapshot.selectedProducts.length > 0) {
    lines.push("Selected products " + snapshot.selectedProducts.join(", "));
  }
  if (snapshot.proposalNotes) lines.push("Proposal notes " + snapshot.proposalNotes);

  return lines.join(". ");
}
'@

$engine = @'
import type { GuruProjectSnapshot } from "./guruProjectBridge";

export type GuruConfidence = "low" | "medium" | "high";

export type GuruNextStep = {
  label: string;
  href: string;
  reason: string;
};

export type GuruAdvice = {
  contextLabel: string;
  summary: string;
  confidence: GuruConfidence;
  architecture: string;
  productDirection: string[];
  missingItems: string[];
  notes: string[];
  nextSteps: GuruNextStep[];
  prompts: string[];
};

type ParsedFacts = {
  sourceCount?: number;
  displayCount?: number;
  distanceM?: number;
  mentionsVideoWall: boolean;
  mentionsAvoip: boolean;
  mentionsMatrix: boolean;
  mentionsUsb: boolean;
  mentionsControl: boolean;
  mentionsMultiroom: boolean;
  mentionsEducation: boolean;
  mentionsMeetingRoom: boolean;
  mentionsKvm: boolean;
  mentionsLed: boolean;
};

function detectContext(pathname: string): string {
  const path = pathname.toLowerCase();

  if (path.includes("/discovery")) return "Discovery";
  if (path.includes("/catalog")) return "Catalogue";
  if (path.includes("/proposal")) return "Proposal";
  if (path.includes("/video-wall")) return "Video Wall";
  if (path.includes("/dashboard")) return "Dashboard";
  return "Guru";
}

function detectFacts(input: string): ParsedFacts {
  const text = input.toLowerCase();

  const sourceMatch = text.match(/(\d+)\s*(source|sources)/);
  const displayMatch = text.match(/(\d+)\s*(display|displays|screen|screens)/);
  const distanceMatch =
    text.match(/(\d+)\s*m\b/) ||
    text.match(/(\d+)\s*meter/) ||
    text.match(/(\d+)\s*metre/) ||
    text.match(/(\d+)\s*ft\b/);

  let distanceM: number | undefined;
  if (distanceMatch) {
    const raw = Number(distanceMatch[1]);
    if (!Number.isNaN(raw)) {
      distanceM = distanceMatch[0].includes("ft") ? Math.round(raw * 0.3048) : raw;
    }
  }

  return {
    sourceCount: sourceMatch ? Number(sourceMatch[1]) : undefined,
    displayCount: displayMatch ? Number(displayMatch[1]) : undefined,
    distanceM,
    mentionsVideoWall: /(video wall|2x2|3x3|4x4|bezel|multiview wall)/.test(text),
    mentionsAvoip: /(avoip|av over ip|networked video|decoder|encoder|many displays|scalable)/.test(text),
    mentionsMatrix: /(matrix|presentation switch|switching system|multiple sources to multiple displays)/.test(text),
    mentionsUsb: /\busb\b/.test(text),
    mentionsControl: /(control|rs-232|ir|api|tcp\/ip)/.test(text),
    mentionsMultiroom: /(multi room|multiple rooms|campus|many zones)/.test(text),
    mentionsEducation: /(education|campus|classroom|lecture)/.test(text),
    mentionsMeetingRoom: /(meeting room|boardroom|conference room|huddle)/.test(text),
    mentionsKvm: /\bkvm\b/.test(text),
    mentionsLed: /\bled\b/.test(text),
  };
}

function detectMissingItems(input: string, facts: ParsedFacts, snapshot?: GuruProjectSnapshot): string[] {
  const text = input.toLowerCase();
  const missing: string[] = [];

  if (!facts.sourceCount && snapshot?.sourceCount === undefined) missing.push("Source count is not defined.");
  if (!facts.displayCount && !facts.mentionsVideoWall && snapshot?.displayCount === undefined) missing.push("Display count is not defined.");
  if (!facts.distanceM && snapshot?.distanceM === undefined) missing.push("Transport distance is not defined.");
  if (!/(4k|1080p|resolution|60hz|refresh)/.test(text)) missing.push("Video format or performance target is not defined.");
  if (!facts.mentionsControl && snapshot?.controlRequired !== true) missing.push("Control requirement is not defined.");
  if (!facts.mentionsUsb && !facts.mentionsKvm && snapshot?.usbRequired !== true) missing.push("USB or KVM requirement is not defined.");
  if (!/(audio|de-embed|mic|speaker|dante)/.test(text) && !snapshot?.audioNotes) missing.push("Audio requirement is not defined.");
  if (!/(budget|cost|price|value engineered)/.test(text)) missing.push("Budget position is not defined.");

  return missing;
}

function recommendArchitecture(
  input: string,
  facts: ParsedFacts,
  snapshot?: GuruProjectSnapshot,
): { architecture: string; notes: string[]; productDirection: string[] } {
  const notes: string[] = [];
  const productDirection: string[] = [];
  const architectureHint = snapshot?.architecture?.toLowerCase() ?? "";

  if (facts.mentionsVideoWall || architectureHint.includes("video wall")) {
    notes.push("Video wall language or project architecture indicates wall-specific design logic should take priority.");
    if (facts.mentionsLed || architectureHint.includes("led")) {
      notes.push("LED workflow normally needs processor and resolution planning separate from standard flat panel wall logic.");
    }
    productDirection.push("Consider video wall workflow first.");
    productDirection.push("For non-AVoIP wall option, review SW-0206-VW.");
    productDirection.push("For flexible AVoIP wall paths, review NHD-150-RX and NHD-600-TRX based options.");
    return {
      architecture: "Video Wall",
      notes,
      productDirection,
    };
  }

  if (
    facts.mentionsAvoip ||
    architectureHint.includes("avoip") ||
    facts.mentionsMultiroom ||
    ((facts.sourceCount ?? snapshot?.sourceCount ?? 0) >= 4 &&
      (facts.displayCount ?? snapshot?.displayCount ?? 0) >= 4)
  ) {
    notes.push("Scale or distributed routing suggests AVoIP is likely the strongest fit.");
    productDirection.push("Review AVoIP architecture and encoder/decoder count.");
    productDirection.push("Check expansion, network and control requirements.");
    return {
      architecture: "AVoIP",
      notes,
      productDirection,
    };
  }

  if (
    facts.mentionsMatrix ||
    architectureHint.includes("matrix") ||
    (((facts.sourceCount ?? snapshot?.sourceCount ?? 0) > 1) &&
      ((facts.displayCount ?? snapshot?.displayCount ?? 0) > 1) &&
      ((facts.displayCount ?? snapshot?.displayCount ?? 0) <= 4) &&
      !facts.mentionsMultiroom)
  ) {
    notes.push("Multiple sources and displays in a contained room often indicate matrix or presentation switching.");
    productDirection.push("Review matrix or presentation-switching path.");
    productDirection.push("Confirm whether USB-C, wireless presentation or table connectivity is needed.");
    return {
      architecture: "Matrix / Presentation Switching",
      notes,
      productDirection,
    };
  }

  if (
    ((facts.displayCount ?? snapshot?.displayCount ?? 0) <= 2) &&
    ((facts.sourceCount ?? snapshot?.sourceCount ?? 0) <= 2) &&
    ((facts.sourceCount ?? snapshot?.sourceCount ?? 0) > 0 || (facts.displayCount ?? snapshot?.displayCount ?? 0) > 0)
  ) {
    notes.push("Small source and display counts suggest extender, switcher or simple room system logic.");
    productDirection.push("Review point-to-point extender or simple switcher path.");
    if ((facts.distanceM ?? snapshot?.distanceM ?? 0) > 20) {
      productDirection.push("Distance suggests HDBaseT or longer-reach transport should be checked.");
    }
    return {
      architecture: "Extender / Simple Room System",
      notes,
      productDirection,
    };
  }

  notes.push("Brief is not specific enough for a confident architecture recommendation.");
  productDirection.push("Start in Discovery and complete core requirement capture.");
  return {
    architecture: "Needs More Discovery",
    notes,
    productDirection,
  };
}

function buildNextSteps(contextLabel: string, architecture: string): GuruNextStep[] {
  const steps: GuruNextStep[] = [];

  if (contextLabel !== "Discovery") {
    steps.push({
      label: "Open Discovery Wizard",
      href: "/app/tools/discovery",
      reason: "Use Discovery to capture the requirement cleanly before product selection.",
    });
  }

  if (
    architecture === "AVoIP" ||
    architecture === "Matrix / Presentation Switching" ||
    architecture === "Extender / Simple Room System" ||
    architecture === "Needs More Discovery"
  ) {
    steps.push({
      label: "Open Catalogue",
      href: "/app/tools/catalog",
      reason: "Move into the product path once the technical direction is clear.",
    });
  }

  if (architecture === "Video Wall") {
    steps.push({
      label: "Open Video Wall Planner",
      href: "/app/tools/video-wall",
      reason: "Use the wall planner to model topology, layout and wall behaviour.",
    });
  }

  steps.push({
    label: "Open Proposal Builder",
    href: "/app/tools/proposal",
    reason: "Turn the technical direction into customer-facing output.",
  });

  return steps;
}

function buildPrompts(contextLabel: string, architecture: string, missingItems: string[]): string[] {
  const prompts: string[] = [];

  if (contextLabel === "Discovery") {
    prompts.push("How many sources and displays are involved?");
    prompts.push("What is the longest transport distance?");
    prompts.push("Is USB, control or audio breakaway required?");
  }

  if (contextLabel === "Catalogue") {
    prompts.push("Which WyreStorm family best matches this architecture?");
    prompts.push("Is the current path scalable if the project grows?");
  }

  if (contextLabel === "Proposal") {
    prompts.push("How should this design be explained in plain customer language?");
    prompts.push("What assumptions should be stated clearly in the proposal?");
  }

  if (architecture === "Video Wall") {
    prompts.push("Does the wall need single-canvas, multiview or per-display control?");
  }

  if (missingItems.length > 0) {
    prompts.push("Which missing inputs are blockers versus nice-to-have details?");
  }

  return prompts.slice(0, 5);
}

export function buildGuruAdvice(
  input: string,
  pathname: string,
  snapshot?: GuruProjectSnapshot,
): GuruAdvice {
  const contextLabel = detectContext(pathname);
  const facts = detectFacts(input);
  const missingItems = detectMissingItems(input, facts, snapshot);
  const recommendation = recommendArchitecture(input, facts, snapshot);
  const nextSteps = buildNextSteps(contextLabel, recommendation.architecture);
  const prompts = buildPrompts(contextLabel, recommendation.architecture, missingItems);

  let confidence: GuruConfidence = "medium";

  if (input.trim().length === 0 && !snapshot) {
    confidence = "low";
  } else if (missingItems.length <= 2) {
    confidence = "high";
  } else if (missingItems.length <= 4) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  const summary =
    recommendation.architecture === "Needs More Discovery"
      ? "Guru needs a better brief before recommending a confident solution path."
      : "Guru recommends " + recommendation.architecture + " as the current best-fit direction based on the information provided.";

  return {
    contextLabel,
    summary,
    confidence,
    architecture: recommendation.architecture,
    productDirection: recommendation.productDirection,
    missingItems,
    notes: recommendation.notes,
    nextSteps,
    prompts,
  };
}
'@

$page = @'
import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ClipboardList,
  FileText,
  Layers3,
  MapPinned,
  TriangleAlert,
} from "lucide-react";
import "./guru-shared.css";
import "./guru-tool-host-page.css";
import { buildGuruAdvice } from "./guruIntelligence";
import { buildGuruInputFromProject, getGuruProjectSnapshot } from "./guruProjectBridge";

const starterBrief = [
  "4 sources, 6 displays across two spaces, 35m max distance, central control required, audio de-embed preferred.",
  "3x3 video wall in reception, customer wants flexible layouts and simple operation.",
  "Meeting room with 2 sources, 2 displays, USB camera and BYOD switching.",
];

export default function GuruToolHostPage() {
  const location = useLocation();
  const [brief, setBrief] = useState("");

  const projectSnapshot = useMemo(() => getGuruProjectSnapshot(), []);
  const effectiveInput = useMemo(
    () => buildGuruInputFromProject(brief, projectSnapshot),
    [brief, projectSnapshot],
  );

  const advice = useMemo(
    () => buildGuruAdvice(effectiveInput, location.pathname, projectSnapshot),
    [effectiveInput, location.pathname, projectSnapshot],
  );

  const confidenceClass =
    advice.confidence === "high"
      ? "guru-confidence guru-confidence--high"
      : advice.confidence === "medium"
      ? "guru-confidence guru-confidence--medium"
      : "guru-confidence guru-confidence--low";

  return (
    <div className="guru-page">
      <section className="guru-hero">
        <div className="guru-hero-main">
          <div className="guru-kicker">
            <img src="/guru.png" alt="Wingman Guru" className="wm-guru-mark" />
            <span>Wingman Guru</span>
          </div>

          <h1>Context-aware AV guidance for the next decision.</h1>
          <p>
            Guru now reads the active project snapshot when available, so recommendations
            can reflect the current brief, architecture direction and selected products.
          </p>

          <div className="guru-context-row">
            <div className="guru-context-pill">
              <MapPinned size={14} />
              <span>Current context: {advice.contextLabel}</span>
            </div>
            <div className={confidenceClass}>
              <CheckCircle2 size={14} />
              <span>{advice.confidence} confidence</span>
            </div>
          </div>
        </div>

        <aside className="guru-hero-side">
          <div className="guru-side-card">
            <div className="guru-side-head">
              <Bot size={18} />
              <strong>Starter briefs</strong>
            </div>

            <div className="guru-starter-list">
              {starterBrief.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="guru-starter-button"
                  onClick={() => setBrief(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <section className="guru-workspace">
        <div className="guru-input-panel">
          <div className="guru-panel-head">
            <div className="guru-panel-title">
              <ClipboardList size={18} />
              <strong>Project brief</strong>
            </div>
            <button type="button" className="guru-clear-button" onClick={() => setBrief("")}>
              Clear
            </button>
          </div>

          <textarea
            className="guru-brief-input"
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder="Example: 4 sources, 8 displays, 40m max distance, control system required, USB camera support, customer wants easy expansion later."
          />

          {brief.length > 0 && (
            <div className="guru-live-indicator">Guru is analysing your brief and active project data...</div>
          )}

          <div className="guru-card guru-project-snapshot-card">
            <div className="guru-panel-title">
              <Layers3 size={18} />
              <strong>Active project snapshot</strong>
            </div>

            {projectSnapshot ? (
              <div className="guru-list">
                {projectSnapshot.projectName ? (
                  <div className="guru-list-row"><span>Project: {projectSnapshot.projectName}</span></div>
                ) : null}
                {projectSnapshot.customerName ? (
                  <div className="guru-list-row"><span>Customer: {projectSnapshot.customerName}</span></div>
                ) : null}
                {projectSnapshot.application ? (
                  <div className="guru-list-row"><span>Application: {projectSnapshot.application}</span></div>
                ) : null}
                {projectSnapshot.roomType ? (
                  <div className="guru-list-row"><span>Room type: {projectSnapshot.roomType}</span></div>
                ) : null}
                {projectSnapshot.sourceCount !== undefined ? (
                  <div className="guru-list-row"><span>Sources: {projectSnapshot.sourceCount}</span></div>
                ) : null}
                {projectSnapshot.displayCount !== undefined ? (
                  <div className="guru-list-row"><span>Displays: {projectSnapshot.displayCount}</span></div>
                ) : null}
                {projectSnapshot.distanceM !== undefined ? (
                  <div className="guru-list-row"><span>Distance: {projectSnapshot.distanceM}m</span></div>
                ) : null}
                {projectSnapshot.architecture ? (
                  <div className="guru-list-row"><span>Architecture: {projectSnapshot.architecture}</span></div>
                ) : null}
                {projectSnapshot.selectedProducts && projectSnapshot.selectedProducts.length > 0 ? (
                  <div className="guru-list-row"><span>Products: {projectSnapshot.selectedProducts.join(", ")}</span></div>
                ) : null}
              </div>
            ) : (
              <div className="guru-empty-state">
                No active project snapshot found yet. Guru will still use the typed brief.
              </div>
            )}
          </div>
        </div>

        <div className="guru-output-panel">
          <div className="guru-summary-card">
            <div className="guru-panel-head">
              <div className="guru-panel-title">
                <Layers3 size={18} />
                <strong>Guru recommendation</strong>
              </div>
            </div>

            <div className="guru-architecture-pill">{advice.architecture}</div>
            <p className="guru-summary-text">{advice.summary}</p>

            <div className="guru-note-list">
              {advice.notes.map((note) => (
                <div key={note} className="guru-note-item">
                  <CheckCircle2 size={16} />
                  <span>{note}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="guru-columns">
            <div className="guru-card">
              <div className="guru-panel-title">
                <TriangleAlert size={18} />
                <strong>Missing information</strong>
              </div>

              {advice.missingItems.length > 0 ? (
                <div className="guru-list">
                  {advice.missingItems.map((item) => (
                    <div key={item} className="guru-list-row guru-list-row--warn">
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="guru-empty-state">Core inputs look reasonably complete.</div>
              )}
            </div>

            <div className="guru-card">
              <div className="guru-panel-title">
                <Layers3 size={18} />
                <strong>Product direction</strong>
              </div>

              <div className="guru-list">
                {advice.productDirection.map((item) => (
                  <div key={item} className="guru-list-row">
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="guru-columns">
            <div className="guru-card">
              <div className="guru-panel-title">
                <Bot size={18} />
                <strong>Suggested prompts</strong>
              </div>

              <div className="guru-list">
                {advice.prompts.map((item) => (
                  <div key={item} className="guru-list-row">
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="guru-card">
              <div className="guru-panel-title">
                <FileText size={18} />
                <strong>Next tools</strong>
              </div>

              <div className="guru-next-step-list">
                {advice.nextSteps.map((step) => (
                  <Link key={step.label} to={step.href} className="guru-next-step">
                    <div>
                      <strong>{step.label}</strong>
                      <p>{step.reason}</p>
                    </div>
                    <ArrowRight size={16} />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
'@

$css = @'
.guru-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 18px;
  color: #e8eef8;
}

.guru-hero,
.guru-input-panel,
.guru-summary-card,
.guru-card,
.guru-side-card {
  border: 1px solid rgba(148, 163, 184, 0.14);
  background: linear-gradient(180deg, rgba(10, 20, 40, 0.92), rgba(4, 11, 24, 0.96));
  box-shadow: 0 16px 40px rgba(2, 8, 23, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.04);
  border-radius: 22px;
}

.guru-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(300px, 0.8fr);
  gap: 18px;
  padding: 18px;
}

.guru-hero-main h1 {
  margin: 14px 0 10px;
  font-size: clamp(1.9rem, 3vw, 2.8rem);
  line-height: 1.02;
  letter-spacing: -0.04em;
  color: #f8fbff;
}

.guru-hero-main p {
  margin: 0;
  max-width: 760px;
  color: rgba(226, 232, 240, 0.82);
  line-height: 1.6;
}

.guru-kicker,
.guru-context-pill,
.guru-confidence {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 700;
}

.guru-kicker,
.guru-context-pill {
  color: #dce9fb;
  background: rgba(15, 23, 42, 0.72);
  border: 1px solid rgba(96, 165, 250, 0.16);
}

.guru-context-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}

.guru-confidence--high {
  color: #dcfce7;
  background: rgba(20, 83, 45, 0.28);
  border: 1px solid rgba(74, 222, 128, 0.18);
}

.guru-confidence--medium {
  color: #fef3c7;
  background: rgba(120, 53, 15, 0.24);
  border: 1px solid rgba(251, 191, 36, 0.18);
}

.guru-confidence--low {
  color: #fee2e2;
  background: rgba(127, 29, 29, 0.28);
  border: 1px solid rgba(248, 113, 113, 0.18);
}

.guru-side-card {
  padding: 16px;
}

.guru-side-head,
.guru-panel-title {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #f8fbff;
}

.guru-starter-list {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.guru-starter-button {
  width: 100%;
  text-align: left;
  padding: 12px 13px;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  background: rgba(15, 23, 42, 0.64);
  color: #dce9fb;
  cursor: pointer;
}

.guru-starter-button:hover {
  border-color: rgba(96, 165, 250, 0.24);
  background: rgba(15, 23, 42, 0.8);
}

.guru-workspace {
  display: grid;
  grid-template-columns: minmax(340px, 0.8fr) minmax(0, 1.2fr);
  gap: 18px;
  align-items: start;
}

.guru-input-panel {
  padding: 16px;
  position: sticky;
  top: 16px;
}

.guru-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.guru-clear-button {
  min-height: 36px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  background: rgba(15, 23, 42, 0.72);
  color: #dce8fb;
  cursor: pointer;
}

.guru-brief-input {
  width: 100%;
  min-height: 220px;
  resize: vertical;
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  background: rgba(2, 8, 23, 0.7);
  color: #f8fbff;
  padding: 14px;
  line-height: 1.55;
}

.guru-live-indicator {
  margin-top: 10px;
  font-size: 0.8rem;
  color: #7dd3fc;
  opacity: 0.85;
}

.guru-project-snapshot-card {
  margin-top: 14px;
}

.guru-output-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.guru-summary-card,
.guru-card {
  padding: 16px;
}

.guru-architecture-pill {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 6px 12px;
  border-radius: 999px;
  margin: 12px 0 10px;
  color: #dff3ff;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.32), rgba(14, 165, 233, 0.18));
  border: 1px solid rgba(96, 165, 250, 0.18);
  font-weight: 800;
}

.guru-summary-text {
  margin: 0;
  color: rgba(226, 232, 240, 0.84);
  line-height: 1.6;
}

.guru-note-list,
.guru-list,
.guru-next-step-list {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.guru-note-item,
.guru-list-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 11px 12px;
  border-radius: 14px;
  color: #dce8fb;
  background: rgba(15, 23, 42, 0.58);
  border: 1px solid rgba(148, 163, 184, 0.1);
}

.guru-list-row--warn {
  border-color: rgba(248, 113, 113, 0.14);
  background: rgba(60, 12, 18, 0.34);
}

.guru-columns {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.guru-next-step {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 13px;
  border-radius: 14px;
  text-decoration: none;
  color: inherit;
  background: rgba(15, 23, 42, 0.58);
  border: 1px solid rgba(148, 163, 184, 0.1);
}

.guru-next-step strong {
  display: block;
  color: #f8fbff;
  margin-bottom: 4px;
}

.guru-next-step p {
  margin: 0;
  color: rgba(226, 232, 240, 0.74);
  font-size: 0.88rem;
  line-height: 1.5;
}

.guru-empty-state {
  margin-top: 14px;
  padding: 12px 13px;
  border-radius: 14px;
  color: #dcfce7;
  background: rgba(20, 83, 45, 0.22);
  border: 1px solid rgba(74, 222, 128, 0.14);
}

@media (max-width: 1180px) {
  .guru-hero,
  .guru-workspace,
  .guru-columns {
    grid-template-columns: 1fr;
  }

  .guru-input-panel {
    position: static;
  }
}

@media (max-width: 780px) {
  .guru-page {
    padding: 12px;
  }

  .guru-hero,
  .guru-input-panel,
  .guru-summary-card,
  .guru-card,
  .guru-side-card {
    border-radius: 18px;
  }
}
'@

Save-Utf8NoBom "src\features\ai\guru\guruProjectBridge.ts" $bridge
Save-Utf8NoBom "src\features\ai\guru\guruIntelligence.ts" $engine
Save-Utf8NoBom "src\features\ai\guru\GuruToolHostPage.tsx" $page
Save-Utf8NoBom "src\features\ai\guru\guru-tool-host-page.css" $css

Write-Host "Guru project bridge installed."
Write-Host "Next:"
Write-Host "1. npm run typecheck"
Write-Host "2. npm run dev"
Write-Host "3. Make sure your app stores the active project into one of these keys:"
Write-Host "   wingman.currentProject"
Write-Host "   wingman.project.current"
Write-Host "   wingman.activeProject"