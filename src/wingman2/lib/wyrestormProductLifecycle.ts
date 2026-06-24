/**
 * WyreStorm product lifecycle facade.
 *
 * Single runtime entry point for "is this product current, and what replaces it?"
 * It combines two existing sources of truth:
 *   - business status from the authoritative 2026 business lists
 *     (`wyrestormSkuBusinessStatus.ts`: active / discontinued / do-not-spec / cable),
 *   - supersession (predecessor -> current successor) from the canonical alias map
 *     (`skuAliasResolver.ts`), plus a curated override list for cases the alias map
 *     does not cover.
 *
 * Use `resolveProductLifecycle(sku)` anywhere the app is about to position a SKU
 * (Compare leads, Finder results, Product Positioning, Proposal) so an EoL or
 * superseded product is never presented as current without a flag.
 *
 * The offline reconciliation tool (`tools/reconcile-wyrestorm-lifecycle.mjs`,
 * npm `lifecycle:reconcile`) reports drift against the live index and stories and
 * surfaces version pairs to promote into WYRESTORM_SUPERSESSIONS below.
 */

import { normaliseSkuKey } from "./skuAliasResolver";
import {
  getWyreStormSkuBusinessStatus,
  type WyreStormSkuBusinessStatus,
} from "./wyrestormSkuBusinessStatus";

export type WyreStormSupersession = {
  predecessor: string;
  successor: string;
  reason: string;
};

/**
 * Curated, human-vetted supersessions for cases the canonical alias map does not
 * already cover. Keep this list driven by the reconciliation report: promote a
 * flagged version pair here only once a human has confirmed the successor is the
 * correct, current replacement (and that the successor is itself active).
 */
export const WYRESTORM_SUPERSESSIONS: readonly WyreStormSupersession[] = [
  // Promoted from the reconciliation report (npm run lifecycle:reconcile): each
  // predecessor is on the 2026 discontinued list and each successor is on the
  // active list, so the replacement is confirmed.
  {
    predecessor: "SYN-TOUCH10",
    successor: "SYN-TOUCH10-V2",
    reason: "SYN-TOUCH10 is discontinued; SYN-TOUCH10-V2 is the current touch panel.",
  },
  {
    predecessor: "MXV-0808-H2A-V2",
    successor: "MXV-0808-H2A-MK2",
    reason: "MXV-0808-H2A-V2 is discontinued; MXV-0808-H2A-MK2 is the current 8x8 HDBaseT matrix.",
  },
  {
    predecessor: "NHD-500-IW-TX",
    successor: "NHD-500-IW-TX-V2",
    reason: "NHD-500-IW-TX is discontinued; NHD-500-IW-TX-V2 is the current in-wall 500-series encoder.",
  },
];

const SUPERSESSION_BY_KEY = new Map<string, WyreStormSupersession>();
for (const entry of WYRESTORM_SUPERSESSIONS) {
  SUPERSESSION_BY_KEY.set(normaliseSkuKey(entry.predecessor), entry);
}

export type ProductLifecycle = {
  sku: string;
  status: WyreStormSkuBusinessStatus;
  /** Safe to position as a current lead recommendation. */
  recommendable: boolean;
  /** The current SKU that replaces this one, when it is superseded. */
  supersededBy?: string;
  /** Plain-language guidance for the rep. */
  note: string;
};

/**
 * The current SKU that replaces `sku`, or null if it is not known to be
 * superseded. Driven by the curated WYRESTORM_SUPERSESSIONS map. (Loose/typed
 * forms of a still-current SKU are handled separately by the alias resolver, so
 * they are not supersessions; only a genuinely different, discontinued
 * predecessor belongs here.)
 */
export function getWyreStormSupersession(sku: string): WyreStormSupersession | null {
  const key = normaliseSkuKey(sku);
  if (!key) return null;
  return SUPERSESSION_BY_KEY.get(key) ?? null;
}

export function resolveProductLifecycle(sku: string): ProductLifecycle {
  const status = getWyreStormSkuBusinessStatus(sku);
  const supersession = getWyreStormSupersession(sku);
  const recommendable = status === "active" && !supersession;

  let note: string;
  if (supersession) {
    note = `${sku} is superseded - position ${supersession.successor} instead.`;
  } else {
    switch (status) {
      case "active":
        note = `${sku} is a current, recommendable WyreStorm product.`;
        break;
      case "discontinued":
        note = `${sku} is discontinued - do not position it as a current lead; check for a current replacement before quoting.`;
        break;
      case "do-not-spec":
        note = `${sku} is on the do-not-spec list - do not position it as a lead product direction.`;
        break;
      case "cable":
        note = `${sku} is a cable or accessory - it is not a lead product direction.`;
        break;
      case "unlisted":
      default:
        note = `${sku} is not in the current WyreStorm business lists - treat it as unverified and review before quoting.`;
        break;
    }
  }

  return {
    sku,
    status,
    recommendable,
    supersededBy: supersession?.successor,
    note,
  };
}
