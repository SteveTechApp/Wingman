/**
 * repScript — the single source of truth for the rep-facing comparison
 * narrative.
 *
 * One function turns the engine result into the complete story a rep needs:
 * the explicit confidence tier, the verdict heading + plain-language line,
 * what the competitor product IS, why the WyreStorm candidate fits, the
 * checks before quoting, and what to tell the customer when there is no
 * equivalent (or evidence is still pending).
 *
 * Every surface that talks about a comparison in rep language — the Compare
 * verdict lead, saved run summaries, the project evidence trace, and the
 * proposal/response-pack evidence basis (which snapshots the tier label at
 * save time) — draws from this module, so the copy can never drift apart.
 *
 * The input types are intentionally structural: the Compare page's own
 * `CompetitorSummary` / `ScoredCandidate` satisfy them without importing the
 * page.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RepStatus = "match" | "checks" | "partial" | "no-match";
export type RepTierTone = "strong" | "confirm" | "pending" | "none";

/** The subset of a competitor summary repScript reads. */
export type RepCompetitor = {
  heading: string;
  recognisedClass: string;
  role: string;
  identityItems?: string[];
  knownFeatures?: string[];
  verifyItems: string[];
  warning?: string;
  ecosystem?: string;
};

/** The subset of a scored WyreStorm candidate repScript reads. */
export type RepCandidate = {
  product: { sku: string; name: string; role?: string; family?: string };
  matched: string[];
  partialMatches: string[];
  mismatches: string[];
  blockers: string[];
  unknowns: string[];
  dependencies: string[];
  checks: string[];
  gaps: string[];
};

export type RepScript = {
  tier: { label: string; tone: RepTierTone };
  heading: string;
  line: string;
  purposeLine: string;
  whyBullets: string[];
  difference: string;
  quoteChecks: string[];
  whatToSay: string;
  nextSteps: string[];
};

// ---------------------------------------------------------------------------
// Confidence tier
// ---------------------------------------------------------------------------

/**
 * The explicit confidence tier for the verdict lead banner, derived from the
 * same `RepStatus` the prose heading uses — so the short tier chip and the
 * full heading can never disagree. Three levels map to the engine's
 * assessment ladder: "Strong direction" (match), "Plausible — confirm"
 * (partial / checks), "No equivalent" (reviewed or generic no-match). The
 * evidence-pending case is deliberately its own tier: the banner says
 * "nothing is ruled out", so a "No equivalent" chip there would contradict it.
 */
export function compareVerdictTier(
  status: RepStatus,
  opts: { reviewedBy?: string; evidencePending?: boolean } = {},
): { label: string; tone: RepTierTone } {
  switch (status) {
    case "match":
      return { label: "Strong direction", tone: "strong" };
    case "partial":
    case "checks":
      return { label: "Plausible — confirm", tone: "confirm" };
    default:
      if (opts.evidencePending) {
        return { label: "Evidence pending", tone: "pending" };
      }
      return { label: "No equivalent", tone: "none" };
  }
}

/**
 * The tier label for a STORED compare run. Runs saved before the confidence
 * field existed carry only a matchType (or nothing at all); the honest
 * fallback stays "Comparison saved" rather than inventing confidence.
 */
export function repTierLabelFromRun(run: { confidence?: string; matchType?: string }): string {
  return run.confidence || run.matchType || "Comparison saved";
}

// ---------------------------------------------------------------------------
// Shared copy utilities
// ---------------------------------------------------------------------------

/** Dedupe a list of copy lines (case-insensitive), keeping the first N. */
export function uniqueText(values: Array<string | null | undefined>, limit = 4): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of values) {
    const text = String(value || "").trim();

    if (!text) {
      continue;
    }

    const key = text.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    output.push(text);

    if (output.length >= limit) {
      break;
    }
  }

  return output;
}

/** Turn engine/technical wording into plain sales language. */
export function commercializeCompareCopy(value: string | undefined): string {
  const input = String(value ?? "").trim();

  if (!input) {
    return "";
  }

  const replacements: Array<[RegExp, string]> = [
    [/^Why this matters:\s*/i, ""],
    [/^Educational point:\s*/i, ""],
    [/Wingman has limited local data for this competitor SKU\.\s*Treat this as product-direction guidance, not a confirmed direct equivalent\./i, "Closest direction only until the competitor specification is confirmed."],
    [/Treat this as product-direction guidance, not a confirmed direct equivalent\./i, "Closest direction only until the competitor specification is confirmed."],
    [/Confirm exact video format, bandwidth and connector expectations before external quote use\./i, "Video format, bandwidth and connector expectations need checking before quote."],
    [/Confirm control, audio and USB behaviour before treating this as a direct equivalent\./i, "Control, audio and USB behaviour need checking before quote."],
    [/Confirm whether the customer wants the same architecture or is open to a different WyreStorm system direction\./i, "Confirm whether the quote stays in the same architecture or moves to a different WyreStorm system."],
    [/USB-C or USB behaviour not verified locally\./i, "USB behaviour needs checking before quote."],
    [/USB standard and port behaviour not verified locally\./i, "USB count and behaviour need checking before quote."],
    [/LAN port count and network control details not verified locally\./i, "LAN port count and network control need checking before quote."],
    [/Resolution ceiling not verified locally\./i, "Maximum resolution needs checking before quote."],
    [/Maximum supported resolution not verified locally\./i, "Maximum resolution needs checking before quote."],
    [/Endpoint role not proven from local competitor data\./i, "Exact product role needs checking before quote."],
    [/Transport type not proven from local competitor data\./i, "Transport type needs checking before quote."],
    [/Input connector not confirmed locally\./i, "Input connector needs checking before quote."],
    [/Input connector types not verified locally\./i, "Input connector types need checking before quote."],
    [/Output connector types not verified locally\./i, "Output connector types need checking before quote."],
    [/HDMI version not verified locally\./i, "HDMI version needs checking before quote."],
    [/HDCP version not verified locally\./i, "HDCP version needs checking before quote."],
    [/HDBaseT class\/distance not verified locally\./i, "HDBaseT class and distance need checking before quote."],
    [/Controller or managed-network requirement not verified locally\./i, "Controller and managed-network requirements need checking before quote."],
    [/Control ports and control behaviour not verified locally\./i, "Control ports and behaviour need checking before quote."],
    [/Audio handling not verified locally\./i, "Audio handling needs checking before quote."],
    [/Scaling behaviour not verified locally\./i, "Scaling behaviour needs checking before quote."],
    [/No verified local competitor specification profile found\./i, "Competitor specification needs checking before quote."],
    [/Correct WyreStorm direction, not a drop-in replacement\./i, "Closest direction, not confirmed one-box replacement."],
    [/This is the closest WyreStorm direction from the local evidence, but it should be positioned as a system-fit answer rather than a guaranteed one-box replacement\./i, "Closest direction, not confirmed one-box replacement."],
    [/Do not quote this as a direct AVoIP replacement\./i, "Closest direction, not a direct AVoIP swap."],
  ];

  let line = input.replace(/\s+/g, " ");
  replacements.forEach(([pattern, replacement]) => {
    line = line.replace(pattern, replacement);
  });

  if (/not verified locally\./i.test(line)) {
    line = line.replace(/ not verified locally\./i, " needs checking before quote.");
  }

  line = line.replace(/\s+\./g, ".").trim();

  return line;
}

// ---------------------------------------------------------------------------
// Narrative builders
// ---------------------------------------------------------------------------

/** What the competitor product IS, in plain language. */
export function competitorPlainEnglishPurpose(competitor: RepCompetitor): string {
  if (/ndi camera/i.test(competitor.recognisedClass) || /ndi camera/i.test(competitor.role)) {
    return "capture the room as an NDI-capable camera source";
  }

  if (/ptz camera/i.test(competitor.recognisedClass) || /ptz camera/i.test(competitor.role)) {
    return "capture the room as a controllable PTZ camera source";
  }

  if (/wireless casting/i.test(competitor.recognisedClass) || /wireless casting/i.test(competitor.role)) {
    return "let users share content wirelessly into the room system";
  }

  if (/av-over-ip/i.test(competitor.recognisedClass) && /encoder|transmitter/i.test(competitor.role)) {
    const verifiedText = [...(competitor.identityItems || []), ...(competitor.knownFeatures || [])].join(" ");

    if (/HDMI input/i.test(verifiedText)) {
      return "put a local HDMI source into an AV-over-IP distribution system";
    }

    return "put a local source into an AV-over-IP distribution system";
  }

  if (/av-over-ip/i.test(competitor.recognisedClass) && /decoder|receiver/i.test(competitor.role)) {
    return "pull a stream back out of an AV-over-IP system at the display end";
  }

  if (/hdbaset/i.test(competitor.recognisedClass) || /extender/i.test(competitor.role)) {
    return "extend a source to a remote display or device over category cable";
  }

  if (/matrix/i.test(competitor.recognisedClass)) {
    return "route multiple sources to different display destinations";
  }

  if (/presentation/i.test(competitor.recognisedClass)) {
    return "switch room sources cleanly for a meeting-room or presentation workflow";
  }

  if (/video wall/i.test(competitor.recognisedClass)) {
    return "build and control a dedicated video wall layout";
  }

  return "solve the same system requirement in the competitor ecosystem";
}

/** Why the WyreStorm candidate is the direction: matched + partial items. */
export function salesWhyBullets(candidate: RepCandidate): string[] {
  return uniqueText([
    ...candidate.matched,
    ...candidate.partialMatches,
  ], 4);
}

/** The single most important difference to explain to the customer. */
export function salesImportantDifference(competitor: RepCompetitor, candidate: RepCandidate): string {
  if (/av-over-ip/i.test(competitor.recognisedClass) && /^NHD-5/i.test(candidate.product.sku)) {
    return `Correct WyreStorm direction, not a drop-in replacement. ${competitor.ecosystem} and WyreStorm NetworkHD are separate ecosystems, so this should be positioned as the right system direction rather than a one-box swap.`;
  }

  if (/hdbaset/i.test(competitor.recognisedClass) && /^EX-/i.test(candidate.product.sku)) {
    return "This stays in the same point-to-point extension lane, but HDMI version, HDBaseT class, cable distance and USB/control behaviour still need to match before it is treated as equivalent.";
  }

  if (/matrix/i.test(competitor.recognisedClass) && /^MX/i.test(candidate.product.sku)) {
    return "This is the right WyreStorm matrix direction, but it is only a safe match if the routed I/O size, output behaviour and required signal format really line up with the competitor design.";
  }

  if (candidate.mismatches[0]) {
    return candidate.mismatches[0];
  }

  return "This is the closest WyreStorm direction from the local evidence, but it should be positioned as a system-fit answer rather than a guaranteed one-box replacement.";
}

/** The distinct checks to run before quoting (deduped, capped at three). */
export function compactCompareQuoteChecks(
  competitor: RepCompetitor,
  candidate: RepCandidate,
  status: RepStatus,
): string[] {
  const hasClassMatch = [...candidate.matched, ...candidate.partialMatches]
    .some((item) => /technology class match/i.test(item));
  const seenCategories = new Set<string>();
  const checks: string[] = [];
  const rawChecks = [
    ...candidate.blockers,
    ...candidate.mismatches,
    ...candidate.unknowns,
    ...candidate.dependencies,
    ...candidate.checks,
    ...candidate.gaps,
    ...competitor.verifyItems,
    competitor.warning,
  ];

  for (const rawCheck of rawChecks) {
    const check = commercializeCompareCopy(String(rawCheck || "")
      .replace(/^Compare warning:\s*/i, "")
      .replace(/^Why not direct equivalent:\s*/i, ""));

    if (!check || (hasClassMatch && /no technology class has been verified/i.test(check))) continue;

    const category = /datasheet|current specification|required accessories|mandatory features/i.test(check)
      ? "datasheet"
      : /lifecycle|region/i.test(check)
        ? "lifecycle"
        : check.toLowerCase();

    if (seenCategories.has(category)) continue;
    seenCategories.add(category);
    checks.push(check);
    if (checks.length === 3) break;
  }

  if (checks.length) return checks;
  if (status === "match") return ["Confirm current lifecycle, region and required accessories before quotation."];
  return ["Confirm the unresolved technical differences and required dependencies before quotation."];
}

/** The verdict heading + plain-language line for a given assessment. */
function repVerdictCopy(
  competitor: RepCompetitor,
  candidate: RepCandidate | null,
  status: RepStatus,
  opts: { reviewedBy?: string; evidencePending?: boolean } = {},
): { heading: string; line: string } {
  const competitorName = competitor.heading;
  const sku = candidate?.product.sku ?? null;

  switch (status) {
    case "match":
      return {
        heading: "A close WyreStorm match exists",
        line: `${sku} is the closest WyreStorm product to the ${competitorName} — they do the same job. Run the small checks below before you quote.`,
      };
    case "partial":
      return {
        heading: "Possibly similar — confirm the main difference",
        line: `${sku} covers most of what the ${competitorName} does. The main difference below is what you will need to explain to the customer.`,
      };
    case "checks":
      return {
        heading: "The direction looks plausible — confirm a few things first",
        line: `${sku} is the closest WyreStorm direction from the current evidence. A few technical points still need confirming before you rely on it.`,
      };
    default:
      if (opts.reviewedBy) {
        return {
          heading: "No suitable WyreStorm match — confirmed by review",
          line: `${opts.reviewedBy} reviewed this competitor and confirmed that no WyreStorm product in the current data replaces the ${competitorName} safely.`,
        };
      }
      if (opts.evidencePending) {
        return {
          heading: "Evidence still being reviewed",
          line: `${competitorName} is not in the local data yet, so Wingman cannot yet confirm whether a WyreStorm equivalent exists. Nothing is ruled out — the verification steps below are gathering the official specification.`,
        };
      }
      return {
        heading: "No close WyreStorm equivalent found",
        line: `No WyreStorm product in the current data matches the ${competitorName} closely enough to suggest safely.`,
      };
  }
}

/**
 * Plain, honest guidance for the no-match path: what the rep should actually
 * say to the customer. A specific engine reason is the honest answer;
 * otherwise the message depends on whether evidence is still being gathered
 * (unknown SKU / review-required) or genuinely absent.
 */
function repWhatToSay(
  competitor: RepCompetitor,
  opts: { reviewedBy?: string; evidencePending?: boolean; noMatchReason?: string } = {},
): string {
  const { reviewedBy, evidencePending, noMatchReason } = opts;

  if (reviewedBy) {
    return `Say it plainly: "There is no direct WyreStorm equivalent for this model." This was confirmed by review rather than guessed, so it is the honest answer, not a gap in the data. Offer the closest adjacent WyreStorm product if the customer can accept a different architecture, or ask what the product must actually do.`;
  }

  if (evidencePending) {
    return `Say: "We are verifying this one — the model is not in our local catalogue yet, so I cannot confirm a WyreStorm equivalent right now." Nothing is ruled out;${noMatchReason ? ` ${noMatchReason}` : ""} The verification steps below are gathering the official specification.`;
  }

  if (noMatchReason) {
    return `Say it plainly: "There is no direct WyreStorm equivalent for this model." ${noMatchReason} This is the honest answer, not a gap in the data. Offer the closest adjacent WyreStorm product if the customer can accept a different architecture, or ask what the product must actually do.`;
  }

  return `Say it plainly: "I cannot confirm a WyreStorm equivalent for this model from the current data." Nothing is ruled out — verifying the latest specification may still turn up a match. Ask the customer what the product must actually do and re-check.`;
}

/** Constructive next moves that keep the conversation alive. */
function repNextSteps(competitor: RepCompetitor): string[] {
  return uniqueText([
    "Ask the customer what the product must actually do — the same job may be met by a different WyreStorm product.",
    ...competitor.verifyItems.slice(0, 2),
    "Start a new comparison if the requirement has changed.",
  ], 3);
}

/**
 * The complete rep-facing narrative for a comparison, derived from the same
 * engine result every surface consumes.
 */
export function repScript(input: {
  competitor: RepCompetitor;
  candidate: RepCandidate | null;
  status: RepStatus;
  reviewedBy?: string;
  evidencePending?: boolean;
  noMatchReason?: string;
}): RepScript {
  const { competitor, candidate, status } = input;
  const opts = {
    reviewedBy: input.reviewedBy,
    evidencePending: input.evidencePending,
  };

  const { heading, line } = repVerdictCopy(competitor, candidate, status, opts);

  return {
    tier: compareVerdictTier(status, opts),
    heading,
    line,
    purposeLine: `${competitor.heading} is used to ${competitorPlainEnglishPurpose(competitor)}.`,
    whyBullets: candidate ? salesWhyBullets(candidate).slice(0, 2) : [],
    difference: candidate ? salesImportantDifference(competitor, candidate) : "",
    quoteChecks: candidate
      ? compactCompareQuoteChecks(competitor, candidate, status)
      : competitor.verifyItems.slice(0, 3),
    whatToSay: candidate ? "" : repWhatToSay(competitor, input),
    nextSteps: repNextSteps(competitor),
  };
}
