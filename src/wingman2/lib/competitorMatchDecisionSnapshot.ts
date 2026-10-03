/**
 * Competitor match decision snapshot - golden baseline for the spec engine.
 *
 * The committed ledger (`data/governance/competitor-match-decisions.json`)
 * records the engine's CURRENT outcome for every approved competitor row as a
 * `pending-review` machine baseline (never a human approval - the runtime only
 * promotes `approved` rows, so these baselines are inert at runtime). The
 * drift gate re-runs the engine and fails loudly when any outcome flips:
 * a decision-type change, a lead-candidate change, or a different option set.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import competitorCatalogRaw from "../../../data/catalog/competitor-products.generated.json";
import { runSpecShowdown } from "./compareSpecEngine";
import {
  type CompareDecisionType,
  type CompareEndpointRole,
  type CompareTransportClass,
  type CompetitorMatchDecision,
  type CompetitorMatchDecisionLedger,
} from "./competitorMatchDecisionLedger";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const COMPETITOR_DECISION_LEDGER_PATH = path.resolve(
  HERE,
  "../../../data/governance/competitor-match-decisions.json",
);

type CompetitorRow = Record<string, unknown>;

/** Engine outcome kept in the ledger for drift comparison. */
export interface EngineOutcome {
  decisionType: CompareDecisionType;
  wyrestormSku: string | null;
  topSkus: string[];
  rating: number;
  comparableFields: number;
  gapFields: number;
  verified: boolean;
}

/** Ledger rows carry the outcome as an extra `engineSnapshot` field. */
export interface SnapshotDecision extends CompetitorMatchDecision {
  engineSnapshot: EngineOutcome;
}

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function cleanList(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return Array.from(new Set(values.map(text).filter(Boolean)));
}

function endpointRoleFor(row: CompetitorRow): CompareEndpointRole {
  const blob = [row.category, row.role, row.technology, row.subcategory, row.summary]
    .map(text)
    .join(" ")
    .toLowerCase();
  if (/transceiver|encoder\/decoder|\btrx\b/.test(blob)) return "transceiver";
  if (/matrix/.test(blob)) return "matrix";
  // A wireless conferencing / presentation hub is the room-side receiving unit
  // of the casting system (ClickShare hub vs the laptop-side button/dongle),
  // mirroring the base catalogue rows labelled "receiver / hub".
  if (/\bhub\b/.test(blob) && /wireless|conferencing|presentation/.test(blob) && !/peripheral/.test(blob)) return "receiver";
  if (/switcher|presentation/.test(blob)) return "switcher";
  if (/encoder|transmitter|\btx\b/.test(blob)) return "transmitter";
  if (/decoder|receiver|\brx\b/.test(blob)) return "receiver";
  if (/extender/.test(blob)) return "extender-kit";
  if (/processor|multiview|video wall/.test(blob)) return "processor";
  if (/controller|control system/.test(blob)) return "controller";
  if (/accessory|cable|mount|power supply/.test(blob)) return "accessory";
  return "unknown";
}

function transportClassFor(row: CompetitorRow): CompareTransportClass {
  const blob = [row.technology, row.transport, row.category, row.summary]
    .map(text)
    .join(" ")
    .toLowerCase();
  if (/\b10\s*g(?:be|bps)?\b|sdvoe/.test(blob)) return "avoip-10g";
  if (/\b1\s*g(?:be|bps)?\b|avoip|networkhd|jpeg[\s-]?xs|h\.?26[45]|ndi/.test(blob)) return "avoip-1g";
  if (/hdbaset|hdbt|tps/.test(blob)) return "hdbaset";
  if (/usb/.test(blob) && /hdmi|video|hdbaset|wireless/.test(blob)) return "hybrid";
  if (/usb/.test(blob)) return "usb";
  if (/hdmi/.test(blob)) return "hdmi";
  return "unknown";
}

function codecFor(row: CompetitorRow): string | null {
  const blob = [row.summary, row.features, row.technology].map(text).join(" ").toLowerCase();
  if (/sdvoe/.test(blob)) return "SDVoE";
  if (/jpeg[\s-]?xs/.test(blob)) return "JPEG XS";
  if (/h\.?265|hevc/.test(blob)) return "H.265";
  if (/h\.?264|avc/.test(blob)) return "H.264";
  if (/ndi/.test(blob)) return "NDI";
  return null;
}

function fingerprintFor(row: CompetitorRow): CompetitorMatchDecision["fingerprint"] {
  const summary = text(row.summary);
  const specs = (row.specs ?? {}) as Record<string, unknown>;
  const video = (specs.video ?? {}) as Record<string, unknown>;
  const distance = (specs.distance ?? {}) as Record<string, unknown>;
  const inputCount = Number(row.routedInputCount ?? row.matrixInputs ?? specs.matrixInputs);
  const routedOutputCount = Number(row.routedOutputCount ?? row.matrixOutputs ?? specs.matrixOutputs);
  const control = Array.isArray(row.control) ? (row.control as unknown[]).map(text) : [];
  const audio = Array.isArray(row.audio) ? (row.audio as unknown[]).map(text) : [];
  const blob = [summary, ...audio, ...(Array.isArray(row.features) ? (row.features as unknown[]).map(text) : [])].join(" ");

  return {
    productClass: text(row.category) || "Unknown product class",
    endpointRole: endpointRoleFor(row),
    transportClass: transportClassFor(row),
    codec: codecFor(row),
    maxResolution: text(video.maxResolution || row.video ? (row.video as Record<string, unknown>).maxResolution : "") || null,
    chroma: text(video.chroma) || null,
    hdr: /hdr|dolby vision/i.test(blob) ? true : null,
    inputCount: Number.isFinite(inputCount) && inputCount > 0 ? inputCount : null,
    routedOutputCount: Number.isFinite(routedOutputCount) && routedOutputCount > 0 ? routedOutputCount : null,
    mirroredOutputCount: null,
    loopOutputCount: null,
    usb: /usb/i.test(blob) ? "USB present" : null,
    audio: audio.length ? audio.join(" / ") : null,
    control: control.length ? control.join(" / ") : null,
    distanceMetres: Number.isFinite(Number(distance.metersLong)) && Number(distance.metersLong) > 0 ? Number(distance.metersLong) : null,
    dependencies: [],
    notes: cleanList([row.notes, row.knownLimitations]).slice(0, 6),
  };
}

/** The engine's current decision for one competitor row, fail-closed. */
export async function computeEngineOutcome(brand: string, sku: string): Promise<EngineOutcome> {
  const result = await runSpecShowdown(brand, sku);
  if (result.coverage === "missing") {
    return {
      decisionType: "no-suitable-match",
      wyrestormSku: null,
      topSkus: [],
      rating: 0,
      comparableFields: 0,
      gapFields: 0,
      verified: false,
    };
  }
  if (result.matches.length === 0) {
    return {
      decisionType: "review-required",
      wyrestormSku: null,
      topSkus: [],
      rating: 0,
      comparableFields: 0,
      gapFields: 0,
      verified: false,
    };
  }
  const top = result.matches[0];
  return {
    decisionType: top.decision,
    wyrestormSku: top.sheet.sku,
    topSkus: result.matches.map((match) => match.sheet.sku),
    rating: top.rating,
    comparableFields: top.comparableFields,
    gapFields: top.gapFields,
    verified: result.verified,
  };
}

/** Approved competitor rows from the curated catalogue, in stable order. */
export function approvedCompetitorRows(): CompetitorRow[] {
  const raw = competitorCatalogRaw as CompetitorRow[] | { products?: CompetitorRow[] };
  const rows = Array.isArray(raw) ? raw : (raw.products ?? []);
  return rows
    .filter((row) => text(row.status).toLowerCase() === "approved" && text(row.sku))
    .sort((a, b) => `${text(a.brand)}::${text(a.sku)}`.localeCompare(`${text(b.brand)}::${text(b.sku)}`));
}

export function buildSnapshotDecision(row: CompetitorRow, outcome: EngineOutcome): SnapshotDecision {
  const manufacturer = text(row.brand) || text(row.manufacturer) || "Unknown";
  const sku = text(row.sku);
  const wyrestormSku = outcome.wyrestormSku ?? null;
  const now = new Date().toISOString();
  return {
    id: [manufacturer.toLowerCase().replace(/[^a-z0-9]+/g, "-"), sku, wyrestormSku ?? outcome.decisionType]
      .join("--")
      .replace(/-{2,}/g, "-"),
    competitorManufacturer: manufacturer,
    competitorSku: sku,
    fingerprint: fingerprintFor(row),
    wyrestormSku,
    decisionType: outcome.decisionType,
    // Machine baseline, never a human approval: the runtime only promotes
    // `approved` rows, so these snapshots cannot influence live comparisons.
    reviewStatus: "pending-review",
    reviewer: null,
    reviewedAt: null,
    matchedPoints: [],
    importantDifferences: [],
    dependencies: [],
    quoteBlockers: [],
    evidence: [],
    engineSnapshot: outcome,
    createdAt: now,
    updatedAt: now,
  };
}

/** Build the full ledger from the current engine, one decision per approved row. */
export async function buildLedgerFromEngine(): Promise<
  Omit<CompetitorMatchDecisionLedger, "decisions"> & { decisions: SnapshotDecision[] }
> {
  const rows = approvedCompetitorRows();
  const decisions: SnapshotDecision[] = [];
  const concurrency = 12;
  for (let index = 0; index < rows.length; index += concurrency) {
    const batch = rows.slice(index, index + concurrency);
    const outcomes = await Promise.all(
      batch.map((row) => computeEngineOutcome(text(row.brand), text(row.sku))),
    );
    outcomes.forEach((outcome, offset) => {
      decisions.push(buildSnapshotDecision(batch[offset], outcome));
    });
  }
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    decisions,
  };
}

function identityKey(manufacturer: string, sku: string): string {
  return `${text(manufacturer).toLowerCase()}::${text(sku).toUpperCase()}`;
}

/**
 * Re-run the engine over every catalogue row and update ONLY the rows whose
 * outcome changed, preserving every other field byte-for-byte - human
 * approvals included. The committed baseline is the source of truth for what a
 * rep sees; this is the deliberate "engine or data moved" path that the drift
 * gate forces, but without the destructive full rewrite of the plain snapshot
 * writer (which wipes approvals).
 *
 * If an APPROVED row's outcome changes, the approval is demoted to
 * pending-review: the reviewer approved the old answer, so the new answer must
 * be re-reviewed before it can promote again. The caller fails loudly if that
 * happens so a human sees the move.
 */
export async function refreshLedgerOutcomes(ledger: CompetitorMatchDecisionLedger): Promise<{
  ledger: CompetitorMatchDecisionLedger;
  changed: Array<{ manufacturer: string; sku: string; from: string; to: string }>;
  approvedDemoted: Array<{ manufacturer: string; sku: string; from: string; to: string }>;
}> {
  const rows = approvedCompetitorRows();
  const decisions = [...(ledger.decisions as SnapshotDecision[])];
  const byKey = new Map(decisions.map((decision) => [identityKey(decision.competitorManufacturer, decision.competitorSku), decision]));
  const changed: Array<{ manufacturer: string; sku: string; from: string; to: string }> = [];
  const approvedDemoted: Array<{ manufacturer: string; sku: string; from: string; to: string }> = [];
  const now = new Date().toISOString();

  const concurrency = 12;
  for (let index = 0; index < rows.length; index += concurrency) {
    const batch = rows.slice(index, index + concurrency);
    const outcomes = await Promise.all(
      batch.map((row) => computeEngineOutcome(text(row.brand), text(row.sku))),
    );
    outcomes.forEach((outcome, offset) => {
      const row = batch[offset];
      const manufacturer = text(row.brand) || text(row.manufacturer) || "Unknown";
      const sku = text(row.sku);
      const decision = byKey.get(identityKey(manufacturer, sku));
      if (!decision) {
        changed.push({ manufacturer, sku, from: "(no ledger entry)", to: outcome.decisionType });
        return;
      }

      const committed = decision.engineSnapshot;
      const same =
        committed.decisionType === outcome.decisionType &&
        (committed.wyrestormSku ?? null) === (outcome.wyrestormSku ?? null) &&
        committed.topSkus.join("|") === outcome.topSkus.join("|");
      if (same) return;

      const from = `${committed.decisionType}${committed.wyrestormSku ? ` -> ${committed.wyrestormSku}` : ""}`;
      const to = `${outcome.decisionType}${outcome.wyrestormSku ? ` -> ${outcome.wyrestormSku}` : ""}`;
      changed.push({ manufacturer, sku, from, to });

      const wasApproved = decision.reviewStatus === "approved";
      decision.decisionType = outcome.decisionType;
      decision.wyrestormSku = outcome.wyrestormSku ?? null;
      decision.engineSnapshot = outcome;
      decision.id = [
        manufacturer.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        sku,
        outcome.wyrestormSku ?? outcome.decisionType,
      ].join("--").replace(/-{2,}/g, "-");
      decision.updatedAt = now;

      if (wasApproved) {
        // The old approval no longer describes the answer a rep would see -
        // demote so the reviewer must re-confirm the new outcome.
        approvedDemoted.push({ manufacturer, sku, from, to });
        decision.reviewStatus = "pending-review";
        decision.reviewer = null;
        decision.reviewedAt = null;
      }
    });
  }

  return { ledger: { ...ledger, updatedAt: now, decisions }, changed, approvedDemoted };
}

export function readLedgerFile(): CompetitorMatchDecisionLedger {
  return JSON.parse(fs.readFileSync(COMPETITOR_DECISION_LEDGER_PATH, "utf8")) as CompetitorMatchDecisionLedger;
}

export function writeLedgerFile(ledger: CompetitorMatchDecisionLedger): void {
  fs.writeFileSync(COMPETITOR_DECISION_LEDGER_PATH, `${JSON.stringify(ledger, null, 2)}\n`, "utf8");
}

export interface OutcomeFlip {
  manufacturer: string;
  sku: string;
  field: "decisionType" | "wyrestormSku" | "topSkus" | "missing";
  committed: string;
  current: string;
}

/** Compare every approved row's committed baseline against the live engine. */
export async function diffLedgerAgainstEngine(ledger: CompetitorMatchDecisionLedger): Promise<{
  flips: OutcomeFlip[];
  approvedCount: number;
  coveredCount: number;
}> {
  const rows = approvedCompetitorRows();
  const byKey = new Map(
    (ledger.decisions as SnapshotDecision[]).map((decision) => [
      `${text(decision.competitorManufacturer).toLowerCase()}::${text(decision.competitorSku).toUpperCase()}`,
      decision,
    ]),
  );

  const flips: OutcomeFlip[] = [];
  const concurrency = 12;
  for (let index = 0; index < rows.length; index += concurrency) {
    const batch = rows.slice(index, index + concurrency);
    const outcomes = await Promise.all(
      batch.map((row) => computeEngineOutcome(text(row.brand), text(row.sku))),
    );
    outcomes.forEach((outcome, offset) => {
      const row = batch[offset];
      const manufacturer = text(row.brand) || text(row.manufacturer) || "Unknown";
      const sku = text(row.sku);
      const committed = byKey.get(`${manufacturer.toLowerCase()}::${sku.toUpperCase()}`);

      if (!committed) {
        flips.push({ manufacturer, sku, field: "missing", committed: "(no ledger entry)", current: outcome.decisionType });
        return;
      }

      const committedOutcome = committed.engineSnapshot;
      if (committedOutcome.decisionType !== outcome.decisionType) {
        flips.push({ manufacturer, sku, field: "decisionType", committed: committedOutcome.decisionType, current: outcome.decisionType });
      }
      if ((committedOutcome.wyrestormSku ?? null) !== (outcome.wyrestormSku ?? null)) {
        flips.push({ manufacturer, sku, field: "wyrestormSku", committed: committedOutcome.wyrestormSku ?? "none", current: outcome.wyrestormSku ?? "none" });
      }
      const committedTop = committedOutcome.topSkus.join("|");
      const currentTop = outcome.topSkus.join("|");
      if (committedTop !== currentTop) {
        flips.push({ manufacturer, sku, field: "topSkus", committed: committedTop, current: currentTop });
      }
    });
  }

  return { flips, approvedCount: rows.length, coveredCount: byKey.size };
}

export function formatFlips(flips: OutcomeFlip[]): string {
  const lines = flips.map(
    (flip) => `- ${flip.manufacturer} ${flip.sku}: ${flip.field} flipped (${flip.committed} → ${flip.current})`,
  );
  return lines.join("\n");
}
