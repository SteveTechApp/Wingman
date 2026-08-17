/**
 * Single source of truth for what counts as a "current, specifiable, lead"
 * WyreStorm product in the canonical product store.
 *
 * Owned jointly by the campaign tool (tools/draft-missing-technical-profiles.mjs)
 * and the coverage gate (tools/check-wyrestorm-technical-data.mjs) so the two
 * can never disagree: the gate fails exactly when the campaign tool would
 * draft, and a lifecycle mislabel can never silently hide a coverage gap.
 *
 * Semantics: `active` lifecycle always; `review` lifecycle only when an
 * official WyreStorm page was successfully captured (live on the site,
 * currency pending human confirmation - a profile can only be drafted from
 * captured official evidence). Discontinued, do-not-spec and
 * cable/accessory/rack-mount/power-accessory/software-app products are never
 * part of the current catalog - the honesty badge legitimately shows
 * "Technical data not resolved" for them at runtime, so they must not fail
 * the gate.
 */

export const CURRENT_CATALOG_EXCLUDED_ROLES = new Set([
  "cable",
  "accessory",
  "rack-mount",
  "power-accessory",
  "software-app",
]);

const text = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

export function isCurrentAndCaptured(product) {
  const lifecycle = text(product?.lifecycleStatus).toLowerCase();
  if (lifecycle === "active") return true;
  if (lifecycle === "review") {
    const quality = product?.technicalProfile?.sourceQuality ?? {};
    return quality.livePageUsed === true && Number(quality.officialPageStatus) === 200;
  }
  return false;
}

export function isCurrentCatalogProduct(product) {
  return (
    isCurrentAndCaptured(product) &&
    product?.doNotSpec !== true &&
    !CURRENT_CATALOG_EXCLUDED_ROLES.has(text(product?.productRole).toLowerCase())
  );
}
