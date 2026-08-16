export type CompareDecisionType =
  | "confirmed-equivalent"
  | "closest-technical-match"
  | "architecture-alternative"
  | "review-required"
  | "no-suitable-match";

export type CompareDecisionReviewStatus =
  | "draft"
  | "pending-review"
  | "approved"
  | "rejected";

export type CompareEndpointRole =
  | "transmitter"
  | "receiver"
  | "transceiver"
  | "matrix"
  | "switcher"
  | "extender-kit"
  | "processor"
  | "controller"
  | "accessory"
  | "unknown";

export type CompareTransportClass =
  | "hdmi"
  | "hdbaset"
  | "avoip-1g"
  | "avoip-10g"
  | "usb"
  | "hybrid"
  | "unknown";

export interface CompareTechnicalFingerprint {
  productClass: string;
  endpointRole: CompareEndpointRole;
  transportClass: CompareTransportClass;
  codec?: string | null;
  maxResolution?: string | null;
  chroma?: string | null;
  hdr?: boolean | null;
  inputCount?: number | null;
  routedOutputCount?: number | null;
  mirroredOutputCount?: number | null;
  loopOutputCount?: number | null;
  usb?: string | null;
  audio?: string | null;
  control?: string | null;
  distanceMetres?: number | null;
  dependencies: string[];
  notes: string[];
}

export interface CompareDecisionEvidence {
  sourceUrl: string;
  sourceType:
    | "manufacturer"
    | "datasheet"
    | "manual"
    | "distributor"
    | "review"
    | "other";
  checkedAt: string;
  note?: string | null;
}

export interface CompetitorMatchDecision {
  id: string;
  competitorManufacturer: string;
  competitorSku: string;
  fingerprint: CompareTechnicalFingerprint;
  wyrestormSku?: string | null;
  decisionType: CompareDecisionType;
  reviewStatus: CompareDecisionReviewStatus;
  reviewer?: string | null;
  reviewedAt?: string | null;
  matchedPoints: string[];
  importantDifferences: string[];
  dependencies: string[];
  quoteBlockers: string[];
  evidence: CompareDecisionEvidence[];
  createdAt: string;
  updatedAt: string;
}

export interface CompetitorMatchDecisionLedger {
  version: 1;
  updatedAt: string | null;
  decisions: CompetitorMatchDecision[];
}

export interface CompareDecisionStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const COMPETITOR_MATCH_DECISION_STORAGE_KEY =
  "wingman.compare.match-decisions.v1";

const DECISION_TYPES = new Set<CompareDecisionType>([
  "confirmed-equivalent",
  "closest-technical-match",
  "architecture-alternative",
  "review-required",
  "no-suitable-match",
]);

const REVIEW_STATUSES = new Set<CompareDecisionReviewStatus>([
  "draft",
  "pending-review",
  "approved",
  "rejected",
]);

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function cleanList(values: unknown): string[] {
  if (!Array.isArray(values)) return [];

  return [...new Set(values.map(clean).filter(Boolean))];
}

function normaliseSku(value: unknown): string {
  return clean(value).toUpperCase();
}

function makeDecisionIdentity(
  manufacturer: string,
  competitorSku: string,
  wyrestormSku?: string | null,
): string {
  return [
    clean(manufacturer).toLowerCase(),
    normaliseSku(competitorSku),
    normaliseSku(wyrestormSku),
  ].join("::");
}

function makeCompetitorIdentity(decision: {
  competitorManufacturer: string;
  competitorSku: string;
}): string {
  return [
    clean(decision.competitorManufacturer).toLowerCase(),
    normaliseSku(decision.competitorSku),
  ].join("::");
}

export function emptyCompetitorMatchDecisionLedger(): CompetitorMatchDecisionLedger {
  return {
    version: 1,
    updatedAt: null,
    decisions: [],
  };
}

export function validateCompetitorMatchDecision(
  decision: CompetitorMatchDecision,
): string[] {
  const errors: string[] = [];

  if (!clean(decision.id)) errors.push("Decision ID is required.");
  if (!clean(decision.competitorManufacturer)) {
    errors.push("Competitor manufacturer is required.");
  }
  if (!normaliseSku(decision.competitorSku)) {
    errors.push("Competitor SKU is required.");
  }
  if (!DECISION_TYPES.has(decision.decisionType)) {
    errors.push(`Unsupported decision type: ${decision.decisionType}`);
  }
  if (!REVIEW_STATUSES.has(decision.reviewStatus)) {
    errors.push(`Unsupported review status: ${decision.reviewStatus}`);
  }
  if (!clean(decision.fingerprint?.productClass)) {
    errors.push("Product class is required.");
  }
  if (!decision.fingerprint?.endpointRole) {
    errors.push("Endpoint role is required.");
  }
  if (!decision.fingerprint?.transportClass) {
    errors.push("Transport class is required.");
  }

  const wyrestormSku = normaliseSku(decision.wyrestormSku);

  if (
    decision.decisionType !== "no-suitable-match" &&
    decision.decisionType !== "review-required" &&
    !wyrestormSku
  ) {
    errors.push("A WyreStorm SKU is required for this decision type.");
  }

  if (decision.decisionType === "no-suitable-match" && wyrestormSku) {
    errors.push("A no-suitable-match decision must not include a WyreStorm SKU.");
  }

  if (decision.decisionType === "confirmed-equivalent") {
    if (decision.reviewStatus !== "approved") {
      errors.push("Confirmed equivalents must be approved.");
    }
    if (!clean(decision.reviewer)) {
      errors.push("Confirmed equivalents require a reviewer.");
    }
    if (!clean(decision.reviewedAt)) {
      errors.push("Confirmed equivalents require a review date.");
    }
    if (decision.evidence.length === 0) {
      errors.push("Confirmed equivalents require supporting evidence.");
    }
  }

  return errors;
}

export function normaliseCompetitorMatchDecision(
  decision: CompetitorMatchDecision,
): CompetitorMatchDecision {
  const now = new Date().toISOString();

  return {
    ...decision,
    id: clean(decision.id),
    competitorManufacturer: clean(decision.competitorManufacturer),
    competitorSku: normaliseSku(decision.competitorSku),
    wyrestormSku: normaliseSku(decision.wyrestormSku) || null,
    reviewer: clean(decision.reviewer) || null,
    reviewedAt: clean(decision.reviewedAt) || null,
    matchedPoints: cleanList(decision.matchedPoints),
    importantDifferences: cleanList(decision.importantDifferences),
    dependencies: cleanList(decision.dependencies),
    quoteBlockers: cleanList(decision.quoteBlockers),
    evidence: Array.isArray(decision.evidence)
      ? decision.evidence
          .map((item) => ({
            sourceUrl: clean(item.sourceUrl),
            sourceType: item.sourceType,
            checkedAt: clean(item.checkedAt),
            note: clean(item.note) || null,
          }))
          .filter((item) => item.sourceUrl && item.checkedAt)
      : [],
    fingerprint: {
      ...decision.fingerprint,
      productClass: clean(decision.fingerprint.productClass),
      codec: clean(decision.fingerprint.codec) || null,
      maxResolution: clean(decision.fingerprint.maxResolution) || null,
      chroma: clean(decision.fingerprint.chroma) || null,
      usb: clean(decision.fingerprint.usb) || null,
      audio: clean(decision.fingerprint.audio) || null,
      control: clean(decision.fingerprint.control) || null,
      dependencies: cleanList(decision.fingerprint.dependencies),
      notes: cleanList(decision.fingerprint.notes),
    },
    createdAt: clean(decision.createdAt) || now,
    updatedAt: now,
  };
}

export function readCompetitorMatchDecisionLedger(
  storage?: CompareDecisionStorage | null,
): CompetitorMatchDecisionLedger {
  if (!storage) return emptyCompetitorMatchDecisionLedger();

  const raw = storage.getItem(COMPETITOR_MATCH_DECISION_STORAGE_KEY);
  if (!raw) return emptyCompetitorMatchDecisionLedger();

  try {
    const parsed = JSON.parse(raw) as Partial<CompetitorMatchDecisionLedger>;

    if (parsed.version !== 1 || !Array.isArray(parsed.decisions)) {
      return emptyCompetitorMatchDecisionLedger();
    }

    return {
      version: 1,
      updatedAt: clean(parsed.updatedAt) || null,
      decisions: parsed.decisions,
    };
  }
  catch {
    return emptyCompetitorMatchDecisionLedger();
  }
}

export function saveCompetitorMatchDecision(
  storage: CompareDecisionStorage,
  decision: CompetitorMatchDecision,
): CompetitorMatchDecisionLedger {
  const normalised = normaliseCompetitorMatchDecision(decision);
  const errors = validateCompetitorMatchDecision(normalised);

  if (errors.length > 0) {
    throw new Error(errors.join(" "));
  }

  const ledger = readCompetitorMatchDecisionLedger(storage);
  const identity = makeDecisionIdentity(
    normalised.competitorManufacturer,
    normalised.competitorSku,
    normalised.wyrestormSku,
  );

  const decisions = ledger.decisions.filter(
    (existing) =>
      makeDecisionIdentity(
        existing.competitorManufacturer,
        existing.competitorSku,
        existing.wyrestormSku,
      ) !== identity,
  );

  decisions.unshift(normalised);

  const nextLedger: CompetitorMatchDecisionLedger = {
    version: 1,
    updatedAt: new Date().toISOString(),
    decisions,
  };

  storage.setItem(
    COMPETITOR_MATCH_DECISION_STORAGE_KEY,
    JSON.stringify(nextLedger),
  );

  return nextLedger;
}

/**
 * Overlay the governed ledger's approved decisions (fetched from the server)
 * onto the local per-browser ledger. An approved server decision is the
 * authoritative human review of that competitor product, so it replaces any
 * local entry for the same manufacturer + SKU and takes precedence in
 * runtime resolution - a queue approval therefore changes what a rep sees
 * immediately, not just on the next batch.
 */
export function mergeApprovedLedgerDecisions(
  local: CompetitorMatchDecisionLedger,
  approved: CompetitorMatchDecision[],
): CompetitorMatchDecisionLedger {
  if (approved.length === 0) return local;

  const approvedIdentities = new Set(
    approved.map(makeCompetitorIdentity),
  );

  const localDecisions = local.decisions.filter(
    (decision) => !approvedIdentities.has(makeCompetitorIdentity(decision)),
  );

  return {
    version: 1,
    updatedAt: approved[0]?.updatedAt ?? local.updatedAt,
    decisions: [...approved, ...localDecisions],
  };
}

export function findApprovedCompetitorMatchDecision(
  ledger: CompetitorMatchDecisionLedger,
  manufacturer: string,
  competitorSku: string,
): CompetitorMatchDecision | null {
  const normalisedManufacturer = clean(manufacturer).toLowerCase();
  const normalisedCompetitorSku = normaliseSku(competitorSku);

  return (
    ledger.decisions.find(
      (decision) =>
        decision.reviewStatus === "approved" &&
        clean(decision.competitorManufacturer).toLowerCase() ===
          normalisedManufacturer &&
        normaliseSku(decision.competitorSku) === normalisedCompetitorSku,
    ) ?? null
  );
}