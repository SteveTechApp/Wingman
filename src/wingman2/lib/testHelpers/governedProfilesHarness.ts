/**
 * Governed-profiles test harness.
 *
 * The compare / catalog / product-pitch badge surface reads the governed
 * technical profiles through a direct `.json` import
 * (`data/governance/wyrestorm-technical-profiles.json`). A coverage-loss
 * regression - a profile that disappears, or drops back to review-required -
 * can therefore be injected by mocking that JSON module in a test and running
 * the real payload through one of the pure helpers below.
 *
 * `vi.mock` DOES intercept the JSON module, but the mock path must resolve to
 * the actual file. The relative depth depends on the TEST FILE's location and
 * must reach the project root first: from `src/wingman2/pages/` that is
 * `../../../data/governance/wyrestorm-technical-profiles.json` (three levels
 * up), from `src/wingman2/lib/testHelpers/` it is `../../../../` (four levels
 * up). A shallower path resolves to a nonexistent `src/...` location and
 * vitest silently registers no mock - the factory never runs.
 *
 * Example usage in a test file (top level, so vitest can hoist the call):
 *
 * ```ts
 * import { governedProfilesWithoutSkus } from "../lib/testHelpers/governedProfilesHarness";
 *
 * vi.mock("../../../data/governance/wyrestorm-technical-profiles.json", async () => {
 *   const actual = await vi.importActual<
 *     typeof import("../../../data/governance/wyrestorm-technical-profiles.json")
 *   >("../../../data/governance/wyrestorm-technical-profiles.json");
 *   return { default: governedProfilesWithoutSkus(actual.default, ["MX-0404-SCL"]) };
 * });
 * ```
 */

export type GovernedProfilesPayload = {
  profiles: Array<{ sku: string } & Record<string, unknown>>;
  [key: string]: unknown;
};

export type GovernedProfileStatus =
  | "verified"
  | "verified-with-warning"
  | "review-required"
  | string;

/**
 * Coverage-loss scenario: return the payload with the given SKUs removed, so
 * those products resolve as unprofiled and their cards must honestly fall back
 * to the "not resolved" badge instead of claiming verified data.
 */
export function governedProfilesWithoutSkus(
  payload: GovernedProfilesPayload,
  removedSkus: string[],
): GovernedProfilesPayload {
  const removed = new Set(removedSkus.map((sku) => sku.toUpperCase()));
  return {
    ...payload,
    profiles: payload.profiles.filter((profile) => !removed.has(profile.sku.toUpperCase())),
  };
}

/**
 * Held-batch scenario: return the payload with the given SKUs demoted to
 * `review-required` (or any other status), so those cards must show the
 * honest "review required" badge rather than verified data.
 */
export function governedProfilesWithStatus(
  payload: GovernedProfilesPayload,
  skus: string[],
  status: GovernedProfileStatus,
): GovernedProfilesPayload {
  const targets = new Set(skus.map((sku) => sku.toUpperCase()));
  return {
    ...payload,
    profiles: payload.profiles.map((profile) =>
      targets.has(profile.sku.toUpperCase()) ? { ...profile, status } : profile,
    ),
  };
}

/**
 * Human-confirmation scenario: mark every profile EXCEPT the excluded SKUs as
 * human-confirmed (`status: "verified"` + a `verifiedBy` record), so those
 * cards may honestly claim the verified tier while the excluded ones stay
 * machine-transcribed and render at the official-structured tier. Mirrors a
 * governed program where a human has confirmed the spec-critical fields for
 * the lead profiles.
 */
export function governedProfilesHumanVerifiedExcept(
  payload: GovernedProfilesPayload,
  excludedSkus: string[],
): GovernedProfilesPayload {
  const excluded = new Set(excludedSkus.map((sku) => sku.toUpperCase()));
  return {
    ...payload,
    profiles: payload.profiles.map((profile) =>
      excluded.has(profile.sku.toUpperCase())
        ? profile
        : { ...profile, status: "verified", verifiedBy: "Human review pass" },
    ),
  };
}
