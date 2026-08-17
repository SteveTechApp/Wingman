/**
 * Governed-profile confirmation backlog.
 *
 * \"Verified\" requires a human: a profile only claims the verified tier when a
 * reviewer confirmed its spec-critical fields and recorded `verifiedBy`. This
 * module turns the (currently all-zero) human-verified count into an
 * actionable list - every machine-transcribed profile that still awaits human
 * confirmation, with the spec-critical fields that are present (ready for a
 * human to sign off) vs those with no readable value yet (data work first).
 *
 * Spec-critical fields mirror the promotion gate and the resolver's readiness
 * rule: max resolution (for video or dependency-bearing products), routed I/O,
 * and power.
 */

import governedTechnicalProfilesRaw from "../../../data/governance/wyrestorm-technical-profiles.json";
import agingConfig from "../../../data/governance/profile-confirmation-aging.json";

/** Thresholds shared with the CI gate (data/governance/profile-confirmation-aging.json). */
export const PROFILE_CONFIRMATION_WARN_AFTER_DAYS = Number(agingConfig.warnAfterDays) || 14;
export const PROFILE_CONFIRMATION_FAIL_AFTER_DAYS = Number(agingConfig.failAfterDays) || 30;

export type SpecCriticalField = "max-resolution" | "routed-io" | "power";

export type AgingState = "fresh" | "aging" | "overdue";

export type AwaitingProfile = {
  sku: string;
  productClass: string;
  role: string;
  /** Spec-critical fields with readable values - ready for a human to confirm. */
  awaitingConfirmation: SpecCriticalField[];
  /** Spec-critical fields with no readable value - data work needed first. */
  missingData: SpecCriticalField[];
  /** Human-readable current value per spec-critical field ("" when missing). */
  values: Record<SpecCriticalField, string>;
  /** Days since the profile's newest evidence timestamp; null when undatable. */
  ageDays: number | null;
  /** Confirmation aging: "fresh" < warn threshold, "aging" between warn and fail, "overdue" at/past fail (or undatable). */
  aging: AgingState;
};

export type VerifiedProfile = {
  sku: string;
  productClass: string;
  verifiedBy: string;
  /** ISO timestamp of the confirmation write. */
  verifiedAt: string;
  /** YYYY-MM-DD from the latest evidence entry (falls back to the verifiedAt date). */
  reviewedOn: string;
  confirmedFields: SpecCriticalField[];
  /** Official source the reviewer confirmed against. */
  evidenceUrl: string;
};

export type ConfirmationBacklog = {
  total: number;
  humanVerified: number;
  awaiting: AwaitingProfile[];
  /** Human-confirmed profiles with their reviewer trail (who, when, source). */
  verified: VerifiedProfile[];
  /** Profiles whose spec-critical fields all have readable values. */
  readyToConfirm: number;
  /** Profiles missing at least one spec-critical value. */
  needDataWork: number;
  /** Unconfirmed profiles past the warn threshold (the visible backlog). */
  aging: number;
  /** Unconfirmed profiles past the fail threshold, or undatable (gate-enforced). */
  overdue: number;
};

type EvidenceRecord = { sourceUrl?: string; reviewedOn?: string; checkedAt?: string; reviewer?: string };

type ProfileRecord = {
  sku?: string;
  status?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  confirmedFields?: unknown[];
  evidence?: unknown[];
  productClass?: string;
  role?: string;
  maxResolution?: string;
  inputCount?: number;
  outputCount?: number;
  dependencies?: unknown[];
  power?: unknown[];
  ports?: Array<{ category?: string; direction?: string; count?: number }>;
  specs?: Record<string, unknown>;
};

const PLACEHOLDER_PATTERNS = [
  /not yet confirmed/i,
  /must be confirmed/i,
  /verify datasheet/i,
  /to be confirmed/i,
  /confirm source count/i,
  /requires verification/i,
  /not available/i,
];

const VIDEO_CLASSES = new Set(["AVOIP", "MATRIX", "VIDEO_WALL", "MULTIVIEW", "HDBASET", "PRESENTATION"]);

const POWER_SPEC_KEYS = ["poe", "poh", "poc", "internalPsu", "externalPsu", "powerSupply"];

const FIELD_LABEL: Record<SpecCriticalField, string> = {
  "max-resolution": "Max resolution",
  "routed-io": "Routed I/O",
  power: "Power",
};

export function specCriticalFieldLabel(field: SpecCriticalField): string {
  return FIELD_LABEL[field];
}

function text(value: unknown): string {
  return String(value ?? "").trim();
}

/** Readable routed-I/O value: explicit counts, directional port sums, or a port presence note. */
function routedIoValue(profile: ProfileRecord): string {
  const inputCount = Number(profile.inputCount);
  const outputCount = Number(profile.outputCount);
  if (inputCount > 0 && outputCount > 0) {
    return `${inputCount} in / ${outputCount} out`;
  }
  const byDirection: { input: number; output: number } = { input: 0, output: 0 };
  for (const port of profile.ports ?? []) {
    const count = Number(port.count) > 0 ? Number(port.count) : 1;
    const direction = text(port.direction);
    if (/^input$/i.test(direction)) byDirection.input += count;
    else if (/^output$/i.test(direction)) byDirection.output += count;
  }
  if (byDirection.input > 0 || byDirection.output > 0) {
    return `${byDirection.input || "?"} in / ${byDirection.output || "?"} out (from ports)`;
  }
  return (profile.ports ?? []).some((port) => port.category === "video")
    ? "Video I/O present - counts unlisted"
    : "";
}

/** Readable power value: first power note or the first populated power spec key. */
function powerValue(profile: ProfileRecord): string {
  const notes = (profile.power ?? []).map(text).filter(Boolean);
  if (notes.length > 0) return notes.join(" · ");
  const specs = profile.specs ?? {};
  for (const key of POWER_SPEC_KEYS) {
    const value = specs[key];
    if (value !== undefined && value !== null && text(value) !== "" && value !== false) {
      return String(value);
    }
  }
  return "";
}

function specFieldValue(profile: ProfileRecord, field: SpecCriticalField): string {
  if (field === "max-resolution") return text(profile.maxResolution);
  if (field === "routed-io") return routedIoValue(profile);
  return powerValue(profile);
}

function isHumanConfirmed(profile: ProfileRecord): boolean {
  return profile.status === "verified" && Boolean(text(profile.verifiedBy));
}

/** Max resolution is spec-critical when the product carries video I/O or a mandatory host dependency. */
function maxResolutionRequired(profile: ProfileRecord): boolean {
  const hasVideoIo = (profile.ports ?? []).some((port) => port.category === "video");
  const hasMandatoryDependency = (profile.dependencies ?? []).length > 0;
  return hasVideoIo || hasMandatoryDependency || VIDEO_CLASSES.has(text(profile.productClass));
}

function maxResolutionReadable(profile: ProfileRecord): boolean {
  if (!maxResolutionRequired(profile)) return true;
  const value = text(profile.maxResolution);
  return Boolean(value) && !PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value));
}

function routedIoReadable(profile: ProfileRecord): boolean {
  const hasExplicitCounts = Number(profile.inputCount) > 0 && Number(profile.outputCount) > 0;
  const ports = profile.ports ?? [];
  const hasDirectionalPort =
    ports.some((port) => /^input$/i.test(text(port.direction))) ||
    ports.some((port) => /^output$/i.test(text(port.direction)));
  const hasVideoPort = ports.some((port) => port.category === "video");
  return hasExplicitCounts || hasDirectionalPort || hasVideoPort;
}

function powerReadable(profile: ProfileRecord): boolean {
  if ((profile.power ?? []).length > 0) return true;
  const specs = profile.specs ?? {};
  return POWER_SPEC_KEYS.some((key) => {
    const value = specs[key];
    return value !== undefined && value !== null && text(value) !== "" && value !== false;
  });
}

function specFieldState(profile: ProfileRecord): {
  awaitingConfirmation: SpecCriticalField[];
  missingData: SpecCriticalField[];
} {
  const awaitingConfirmation: SpecCriticalField[] = [];
  const missingData: SpecCriticalField[] = [];

  // Max resolution is only spec-critical for video or dependency-bearing
  // products - a non-video product (e.g. an audio amplifier) must not be
  // asked to confirm a resolution it does not have.
  if (maxResolutionRequired(profile)) {
    (maxResolutionReadable(profile) ? awaitingConfirmation : missingData).push("max-resolution");
  }
  (routedIoReadable(profile) ? awaitingConfirmation : missingData).push("routed-io");
  (powerReadable(profile) ? awaitingConfirmation : missingData).push("power");

  return { awaitingConfirmation, missingData };
}

function latestEvidence(profile: ProfileRecord): EvidenceRecord {
  const list = Array.isArray(profile.evidence) ? (profile.evidence as EvidenceRecord[]) : [];
  return list[list.length - 1] ?? {};
}

/** Newest evidence date (YYYY-MM-DD) across all entries; "" when undatable. */
function newestEvidenceDate(profile: ProfileRecord): string {
  let newest = "";
  for (const evidence of Array.isArray(profile.evidence) ? (profile.evidence as EvidenceRecord[]) : []) {
    const date = text(evidence.reviewedOn) || text(evidence.checkedAt).slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(date) && date > newest) newest = date;
  }
  return newest;
}

function agingStateFor(ageDays: number | null): AgingState {
  if (ageDays === null) return "overdue";
  if (ageDays >= PROFILE_CONFIRMATION_FAIL_AFTER_DAYS) return "overdue";
  if (ageDays >= PROFILE_CONFIRMATION_WARN_AFTER_DAYS) return "aging";
  return "fresh";
}

function toVerifiedProfile(profile: ProfileRecord): VerifiedProfile {
  const evidence = latestEvidence(profile);
  const confirmedFields = (Array.isArray(profile.confirmedFields) ? profile.confirmedFields : []) as SpecCriticalField[];
  return {
    sku: text(profile.sku),
    productClass: text(profile.productClass) || "Unknown class",
    verifiedBy: text(profile.verifiedBy),
    verifiedAt: text(profile.verifiedAt),
    reviewedOn: text(evidence.reviewedOn) || text(profile.verifiedAt).slice(0, 10),
    confirmedFields,
    evidenceUrl: text(evidence.sourceUrl),
  };
}

export function governedConfirmationBacklog(): ConfirmationBacklog {
  const payload = governedTechnicalProfilesRaw as { profiles?: ProfileRecord[] };
  const profiles = Array.isArray(payload.profiles) ? payload.profiles : [];

  let humanVerified = 0;
  const awaiting: AwaitingProfile[] = [];
  const verified: VerifiedProfile[] = [];

  for (const profile of profiles) {
    if (isHumanConfirmed(profile)) {
      verified.push(toVerifiedProfile(profile));
      humanVerified += 1;
      continue;
    }
    const { awaitingConfirmation, missingData } = specFieldState(profile);
    const newestDate = newestEvidenceDate(profile);
    const ageDays = newestDate
      ? Math.max(0, Math.floor((Date.now() - Date.parse(`${newestDate}T00:00:00Z`)) / 86_400_000))
      : null;
    awaiting.push({
      sku: text(profile.sku),
      productClass: text(profile.productClass) || "Unknown class",
      role: text(profile.role) || "Unknown role",
      awaitingConfirmation,
      missingData,
      values: {
        "max-resolution": specFieldValue(profile, "max-resolution"),
        "routed-io": specFieldValue(profile, "routed-io"),
        power: specFieldValue(profile, "power"),
      },
      ageDays,
      aging: agingStateFor(ageDays),
    });
  }

  const agingRank = { overdue: 0, aging: 1, fresh: 2 };
  // Actionable first: profiles ready to confirm, then the aging backlog (most
  // overdue at the top), then the rest by SKU.
  awaiting.sort(
    (a, b) =>
      Number(a.missingData.length > 0) - Number(b.missingData.length > 0) ||
      agingRank[a.aging] - agingRank[b.aging] ||
      (b.ageDays ?? -1) - (a.ageDays ?? -1) ||
      a.sku.localeCompare(b.sku),
  );
  verified.sort((a, b) => a.sku.localeCompare(b.sku));

  const readyToConfirm = awaiting.filter((profile) => profile.missingData.length === 0).length;

  return {
    total: profiles.length,
    humanVerified,
    awaiting,
    verified,
    readyToConfirm,
    needDataWork: awaiting.length - readyToConfirm,
    aging: awaiting.filter((profile) => profile.aging === "aging").length,
    overdue: awaiting.filter((profile) => profile.aging === "overdue").length,
  };
}
