/**
 * Competitor match decision approval - governed ledger write endpoint.
 *
 * The ledger (`data/governance/competitor-match-decisions.json`) records the
 * engine's decision for every approved competitor row. Rows start at
 * `pending-review` (machine baselines); a human reviewer approves one by
 * recording reviewer + evidence, which flips `reviewStatus` to `approved` -
 * mirroring the WyreStorm profile confirmation flow
 * (server/governance/profile-confirmation.mjs): same permission gate, same
 * validated read-modify-write, same evidence shape (every record names its
 * reviewer and review date, as the strict gates require).
 *
 * The review queue GET returns the pending decisions sorted by what reps
 * actually face first: recommendation-bearing decisions (confirmed-equivalent
 * / closest-technical-match / architecture-alternative) before hold-for-review
 * rows, and within a tier the lead product classes the compare feature leads
 * with (wireless presentation, matrix, AVoIP, presentation, HDBaseT) before
 * cameras / control / audio / accessories.
 *
 * Cross-machine story (competitor-decision-ledger-store.mjs): the committed
 * JSON is the seed; when Supabase is configured the store merges the remote
 * mirror into every read and pushes every approval write through to it, so a
 * review approved on one machine is visible on every other. `syncCompetitorDecisionLedger`
 * is the two-way reconcile, gated by the same drift check that guards commits.
 */

import { COMPETITOR_DECISION_LEDGER_FILE } from "../catalog/files.mjs";
import {
  ledgerSyncEnabled,
  pushDecisionToSupabase,
  readLedgerForApi,
  writeCommittedLedgerFile,
} from "./competitor-decision-ledger-store.mjs";

function text(value) {
  return String(value ?? "").trim();
}

function nowIso() {
  return new Date().toISOString();
}

/** Decision types that recommend a WyreStorm product, highest value first. */
const DECISION_TIER = {
  "confirmed-equivalent": 0,
  "closest-technical-match": 1,
  "architecture-alternative": 2,
  "review-required": 3,
  "no-suitable-match": 4,
};

/** Product classes the compare feature leads with (wireless, matrix, AVoIP). */
const LEAD_PRODUCT_CLASSES = new Set([
  "WIRELESS_PRESENTATION",
  "MATRIX",
  "AVOIP",
  "PRESENTATION",
  "HDBASET",
]);

function decisionTier(decisionType) {
  return Number.isFinite(DECISION_TIER[decisionType]) ? DECISION_TIER[decisionType] : 9;
}

function isLeadClass(productClass) {
  return LEAD_PRODUCT_CLASSES.has(text(productClass).toUpperCase()) ? 0 : 1;
}

function isApproved(decision) {
  return decision.reviewStatus === "approved";
}

function validateApproval({ competitorManufacturer, competitorSku, reviewer, evidenceUrl }) {
  if (!text(competitorManufacturer)) return { ok: false, error: "A competitor manufacturer is required." };
  if (!text(competitorSku)) return { ok: false, error: "A competitor SKU is required." };
  if (!text(reviewer)) return { ok: false, error: "Record the reviewer name before approving a decision." };
  try {
    const parsed = new URL(text(evidenceUrl));
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return { ok: false, error: "Add a valid manufacturer or datasheet source URL." };
    }
  } catch {
    return { ok: false, error: "Add a valid manufacturer or datasheet source URL." };
  }
  return { ok: true };
}

/**
 * Write a human approval back to the ledger.
 * `filePath` defaults to the governed ledger; tests inject a temp copy.
 * `note` (optional) records what the reviewer actually verified against the
 * evidence URL - the batch path uses it to name the official source checked.
 */
export async function saveCompetitorDecisionApproval(
  input,
  filePath = COMPETITOR_DECISION_LEDGER_FILE,
) {
  const competitorManufacturer = text(input?.competitorManufacturer);
  const competitorSku = text(input?.competitorSku);
  const reviewer = text(input?.reviewer);
  const evidenceUrl = text(input?.evidenceUrl);
  const note = text(input?.note);

  const validation = validateApproval({
    competitorManufacturer,
    competitorSku,
    reviewer,
    evidenceUrl,
  });
  if (!validation.ok) return { ok: false, error: validation.error };

  // Remote-aware read: when Supabase is enabled the merged ledger includes
  // approvals made on other machines, so this approval lands on top of the
  // whole team's state, not just this machine's committed file.
  const { ledger, mode, warnings } = await readLedgerForApi(filePath);
  if (!ledger || !Array.isArray(ledger.decisions)) {
    return { ok: false, error: "Competitor decision ledger is missing or malformed." };
  }

  const decisionIndex = ledger.decisions.findIndex(
    (decision) =>
      text(decision.competitorManufacturer).toLowerCase() === competitorManufacturer.toLowerCase() &&
      text(decision.competitorSku).toUpperCase() === competitorSku.toUpperCase(),
  );
  if (decisionIndex < 0) {
    return { ok: false, error: `No ledger decision exists for ${competitorManufacturer} ${competitorSku}.` };
  }

  const decision = ledger.decisions[decisionIndex];
  if (isApproved(decision)) {
    return {
      ok: false,
      error: `${competitorManufacturer} ${competitorSku} is already approved (reviewer ${text(decision.reviewer) || "unknown"}).`,
    };
  }

  const now = nowIso();
  const nextDecision = {
    ...decision,
    reviewStatus: "approved",
    reviewer,
    reviewedAt: now,
    evidence: [
      ...(Array.isArray(decision.evidence) ? decision.evidence : []),
      {
        sourceUrl: evidenceUrl,
        sourceType: "manufacturer",
        checkedAt: now,
        reviewedOn: now.slice(0, 10),
        reviewer,
        note: note || "Approved from the Compare decision review queue.",
      },
    ],
    updatedAt: now,
  };

  ledger.decisions[decisionIndex] = nextDecision;
  ledger.updatedAt = now;
  await writeCommittedLedgerFile(ledger, filePath);

  // Write-through mirror: the committed file stays the durable record AND the
  // approval is pushed to Supabase so it leaves this machine. Row-scoped on
  // purpose: pushing the whole merged ledger from a possibly-stale file could
  // overwrite another machine's concurrent approval.
  let remote = { ok: true, warnings: [] };
  if (ledgerSyncEnabled()) {
    remote = await pushDecisionToSupabase(nextDecision);
    if (!remote.ok) warnings.push(`Supabase push failed: ${remote.error}`);
  }

  return {
    ok: true,
    decision: nextDecision,
    total: ledger.decisions.length,
    approved: ledger.decisions.filter(isApproved).length,
    file: filePath,
    mode,
    warnings,
  };
}

/**
 * The ledger's approved decisions as full records - the durable set a queue
 * approval produces. The Compare page merges these into its runtime ledger so
 * an approved decision changes what reps see immediately (promotion), rather
 * than only recording the review for later batches.
 * `filePath` defaults to the governed ledger; tests inject a temp copy.
 */
export async function approvedCompetitorDecisions(filePath = COMPETITOR_DECISION_LEDGER_FILE) {
  const { ledger, mode, warnings } = await readLedgerForApi(filePath);
  if (!ledger || !Array.isArray(ledger.decisions)) {
    return { ok: false, error: "Competitor decision ledger is missing or malformed." };
  }

  const decisions = ledger.decisions.filter(isApproved);

  return {
    ok: true,
    total: ledger.decisions.length,
    approved: decisions.length,
    decisions,
    file: filePath,
    mode,
    warnings,
  };
}

/**
 * Pending (not yet approved) ledger decisions, sorted by what reps face first:
 * recommendation tier, then lead product class, then manufacturer / SKU.
 * `filePath` defaults to the governed ledger; tests inject a temp copy.
 */
export async function pendingDecisionQueue(filePath = COMPETITOR_DECISION_LEDGER_FILE, limit = 100) {
  const { ledger, mode, warnings } = await readLedgerForApi(filePath);
  if (!ledger || !Array.isArray(ledger.decisions)) {
    return { ok: false, error: "Competitor decision ledger is missing or malformed." };
  }

  const pending = ledger.decisions
    .filter((decision) => !isApproved(decision))
    .sort((a, b) => {
      const tier = decisionTier(a.decisionType) - decisionTier(b.decisionType);
      if (tier !== 0) return tier;
      const lead = isLeadClass(a.fingerprint?.productClass) - isLeadClass(b.fingerprint?.productClass);
      if (lead !== 0) return lead;
      return `${text(a.competitorManufacturer)}::${text(a.competitorSku)}`.localeCompare(
        `${text(b.competitorManufacturer)}::${text(b.competitorSku)}`,
      );
    });

  const safeLimit = Number.isFinite(Number(limit)) && Number(limit) > 0 ? Math.floor(Number(limit)) : 100;
  const queue = pending.slice(0, safeLimit).map((decision) => ({
    id: text(decision.id),
    competitorManufacturer: text(decision.competitorManufacturer),
    competitorSku: text(decision.competitorSku),
    decisionType: decision.decisionType,
    wyrestormSku: text(decision.wyrestormSku) || null,
    productClass: text(decision.fingerprint?.productClass),
    endpointRole: text(decision.fingerprint?.endpointRole),
    transportClass: text(decision.fingerprint?.transportClass),
    maxResolution: text(decision.fingerprint?.maxResolution) || null,
    inputCount: decision.fingerprint?.inputCount ?? null,
    routedOutputCount: decision.fingerprint?.routedOutputCount ?? null,
    lead: isLeadClass(decision.fingerprint?.productClass) === 0,
  }));

  return {
    ok: true,
    total: ledger.decisions.length,
    pending: pending.length,
    approved: ledger.decisions.filter(isApproved).length,
    queue,
    file: filePath,
    mode,
    warnings,
  };
}

export async function handleCompetitorDecisionApprovalPost(req, res, url, helpers) {
  const auth = await helpers.requireWingmanPermission(req, res, url, {
    permission: "canManageWorkspace",
    deniedMessage: "Competitor decision approval is restricted to workspace admins.",
  });
  if (!auth) return;

  let body = {};
  try {
    body = await helpers.parseJsonBody(req);
  } catch {
    helpers.sendJson(res, 400, { ok: false, error: "Invalid JSON body." });
    return;
  }

  const saved = await saveCompetitorDecisionApproval(body);
  if (!saved.ok) {
    helpers.sendJson(res, 400, { ok: false, error: saved.error });
    return;
  }

  helpers.sendJson(res, 200, {
    ok: true,
    competitorManufacturer: saved.decision.competitorManufacturer,
    competitorSku: saved.decision.competitorSku,
    decisionType: saved.decision.decisionType,
    wyrestormSku: saved.decision.wyrestormSku ?? null,
    reviewer: saved.decision.reviewer,
    reviewedAt: saved.decision.reviewedAt,
    approved: saved.approved,
    total: saved.total,
    file: saved.file,
  });
}

export async function handleCompetitorDecisionQueueGet(req, res, url, helpers) {
  const limit = Number(url.searchParams?.get("limit") || 100);
  const queue = await pendingDecisionQueue(COMPETITOR_DECISION_LEDGER_FILE, limit);
  if (!queue.ok) {
    helpers.sendJson(res, 400, { ok: false, error: queue.error });
    return;
  }
  helpers.sendJson(res, 200, queue);
}

export async function handleCompetitorDecisionApprovedGet(req, res, url, helpers) {
  const result = await approvedCompetitorDecisions(COMPETITOR_DECISION_LEDGER_FILE);
  if (!result.ok) {
    helpers.sendJson(res, 400, { ok: false, error: result.error });
    return;
  }
  helpers.sendJson(res, 200, result);
}
