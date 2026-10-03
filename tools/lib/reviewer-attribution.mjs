/**
 * Reviewer attribution rule for governed technical profiles.
 *
 * Regression class: a confirmation recorded under a bare first name or a
 * placeholder instead of the reviewer of record's full name. The 2026-08-16
 * passes were signed `verifiedBy: "Steve"`; on 2026-09-30 all 116 were
 * re-signed to "Steve Goodwin" — this module is the permanent gate that
 * keeps partial attribution from landing again. The full store now carries
 * `verifiedBy: "Steve Goodwin"` on all 206 profiles.
 *
 * A `verifiedBy` value is REJECTED when it:
 *   - exactly matches one of the known partial names (the historical
 *     constant, case-insensitively) — the specific regression this guards;
 *   - is a placeholder ("admin-bulk", "SET-ME", ...) — anonymous sign-offs
 *     must never be attributed;
 *   - is a single bare word that is not a known full reviewer name — full
 *     names carry an internal space, which is the shape rule for this rule's
 *     scope;
 *   - matches a known full name case-insensitively but with wrong casing —
 *     attribution must be byte-consistent so group-bys cannot split.
 *
 * A single-word name that IS in KNOWN_FULL_REVIEWERS passes (future-proofing:
 * a legitimately single-word full name must not be grandfathered out by the
 * shape rule). The known-full-name list and the bare-constant list are the
 * ONLY registries here — extending coverage is a deliberate edit, so the
 * gate can never silently reclassify a name.
 */

/** Historical bare constants that must never appear again. Case-insensitive. */
export const REJECTED_BARE_NAMES = ["steve"];

/** Placeholders that mean "not really attributed". Case-insensitive. */
export const PLACEHOLDER_NAMES = ["admin-bulk", "admin", "set-me", "todo", "tbd", "n/a", "wingman", "unknown", "reviewer"];

/** Reviewer names that are known-complete (may be single-word by design). */
export const KNOWN_FULL_REVIEWERS = ["Steve Goodwin"];

function normalise(value) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function quoted(list) {
  return list.map((entry) => `"${entry}"`).join(", ");
}

/**
 * Pure core: which profiles carry an unacceptable `verifiedBy` (and why).
 * `payload` is the parsed governed-profiles JSON (or any object with a
 * `profiles` array); every profile with a non-empty `verifiedBy` is checked,
 * so a bare constant is caught wherever it appears, not only on
 * human-verified rows. Empty/missing `verifiedBy` is NOT a rejection here —
 * an unconfirmed profile legitimately has none, and the confirmation-aging
 * gate already enforces that clock.
 */
export function rejectBareReviewerAttributions(payload) {
  const profiles = Array.isArray(payload?.profiles) ? payload.profiles : [];
  const rejections = [];
  const placeholders = new Set(PLACEHOLDER_NAMES.map(normalise));
  const bare = new Set(REJECTED_BARE_NAMES.map(normalise));

  for (const profile of profiles) {
    const sku = String(profile?.sku ?? "").trim();
    const value = String(profile?.verifiedBy ?? "").trim();
    if (!value) continue;

    const lowered = normalise(value);
    let reason = null;

    // The canonical spelling of a known reviewer, when the value matches one
    // case-insensitively (whitespace-collapsed) - null when it matches none.
    const canonical = KNOWN_FULL_REVIEWERS.find((name) => normalise(name) === lowered) ?? null;

    if (bare.has(lowered)) {
      reason = `bare constant (${quoted(REJECTED_BARE_NAMES)}) - re-sign to the reviewer of record's full name`;
    } else if (placeholders.has(lowered)) {
      reason = `placeholder (${quoted(PLACEHOLDER_NAMES.slice(0, 4))}...) - a confirmation must be attributed to a real reviewer`;
    } else if (canonical && value !== canonical) {
      // Byte-consistency: the recorded name must match the canonical registry
      // spelling exactly, so group-bys can never split an attribution.
      reason = `wrong casing for a known reviewer (${quoted(KNOWN_FULL_REVIEWERS)}) - attribution must be byte-consistent`;
    } else if (!canonical && !value.includes(" ")) {
      reason = "single bare word - use the reviewer of record's full name";
    }

    if (reason) rejections.push({ sku, verifiedBy: value, reason });
  }
  return rejections;
}

/** Gate-style message for one rejection. */
export function describeRejection(rejection) {
  return `wyrestorm-technical-profiles: ${rejection.sku} carries verifiedBy ${JSON.stringify(rejection.verifiedBy)} - ${rejection.reason}.`;
}
