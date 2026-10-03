/**
 * Reader for the admin product override database (`data/admin/wingman-product-admin-db.json`,
 * managed via `tools/admin-product-db.mjs`). Lets an admin manually block or hide a SKU
 * (`doNotUse` / `visibility: "hidden"`) independently of the generated catalogue or the
 * 2026 business lists - e.g. to suppress an invalid SKU string before the underlying data
 * is corrected upstream.
 *
 * This is a leaf module (no dependency on wyrestormSkuBusinessStatus.ts or
 * wyrestormProductLifecycle.ts) so both of those can import it without a circular
 * dependency.
 */

import { normaliseSkuKey, resolveWyrestormSkuAlias } from "./skuAliasResolver";
import adminProductDb from "../../../data/admin/wingman-product-admin-db.json";

export type AdminProductOverride = {
  sku: string;
  statusOverride: string;
  doNotUse: boolean;
  visibility: "default" | "hidden";
  adminNotes: string;
  evidenceUrl: string;
  updatedBy: string;
  updatedAt: string;
};

type AdminProductDb = {
  schemaVersion: number;
  records: Record<string, AdminProductOverride>;
};

const ADMIN_OVERRIDE_BY_KEY = new Map<string, AdminProductOverride>();
for (const record of Object.values((adminProductDb as AdminProductDb).records ?? {})) {
  const key = normaliseSkuKey(record.sku);
  if (key) ADMIN_OVERRIDE_BY_KEY.set(key, record);
}

/**
 * The admin's manual override record for `sku`, or null if none exists. A record
 * existing does not itself mean the SKU is blocked - check `doNotUse`/`visibility`,
 * or just use `isSkuAdminBlocked(sku)`. Checks the exact SKU first (so a record
 * keyed to a legacy/alias SKU string still applies to that exact string), then
 * falls back to the alias-resolved canonical SKU (so blocking the canonical SKU
 * also blocks any of its known legacy aliases).
 */
export function getAdminProductOverride(sku: string): AdminProductOverride | null {
  const exactKey = normaliseSkuKey(sku);
  if (!exactKey) return null;

  const exact = ADMIN_OVERRIDE_BY_KEY.get(exactKey);
  if (exact) return exact;

  const canonicalKey = normaliseSkuKey(resolveWyrestormSkuAlias(sku));
  if (!canonicalKey || canonicalKey === exactKey) return null;
  return ADMIN_OVERRIDE_BY_KEY.get(canonicalKey) ?? null;
}

/** True when an admin has manually blocked this SKU from recommendation/display. */
export function isSkuAdminBlocked(sku: string): boolean {
  const override = getAdminProductOverride(sku);
  return Boolean(override?.doNotUse) || override?.visibility === "hidden";
}
