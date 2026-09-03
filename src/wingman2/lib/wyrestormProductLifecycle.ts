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
import { getAdminProductOverride, type AdminProductOverride } from "./adminProductOverrides";

export type { AdminProductOverride } from "./adminProductOverrides";

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
 *
 * The table is PINNED to the same active-successor rule the lifecycle CSV
 * successor column enforces (tools/check-lifecycle-successor-refs.mjs): a
 * remap may only point at a SKU whose business status is `active`.
 * collectWyreStormSupersessionProblems() runs at module load and logs any
 * violation, entries whose successor is not active are excluded from the
 * resolved map so the runtime can never redirect a rep onto a discontinued
 * SKU, and the supersession pin suite (wyrestormProductLifecycle.test.ts)
 * fails CI if the table drifts.
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
  // APO-VX20-UC -> APO-VX20-UC-V2 is deliberately NOT listed here: the alias
  // resolver (skuAliasResolver.ts) already canonicalises APO-VX20-UC to the V2
  // SKU, so a supersession entry would both duplicate that mapping and make the
  // predecessor look active (alias-resolved) while declaring a successor - the
  // active-successor pin flags exactly that class. Only successors the alias map
  // does not cover belong in this table.
];

/**
 * Human-readable problems for a supersession table, mirroring the predicate of
 * tools/check-lifecycle-successor-refs.mjs (collectSuccessorProblems): every
 * successor must resolve to an ACTIVE SKU, an active product cannot declare a
 * successor, and no row may name itself. Empty array = the table is clean.
 */
export function collectWyreStormSupersessionProblems(
  entries: readonly WyreStormSupersession[] = WYRESTORM_SUPERSESSIONS,
): string[] {
  const problems: string[] = [];
  for (const entry of entries) {
    const predecessor = normaliseSkuKey(entry.predecessor);
    const successor = normaliseSkuKey(entry.successor);
    const predecessorStatus = getWyreStormSkuBusinessStatus(entry.predecessor);
    const successorStatus = getWyreStormSkuBusinessStatus(entry.successor);

    if (predecessorStatus === "active") {
      problems.push(
        `supersession: "${entry.predecessor}" is active but names successor "${entry.successor}" - a current product cannot be superseded by another SKU.`,
      );
    }
    if (successor === predecessor) {
      problems.push(`supersession: "${entry.predecessor}" names itself as its own successor.`);
      continue;
    }
    if (successorStatus === "unlisted") {
      problems.push(
        `supersession: successor "${entry.successor}" of "${entry.predecessor}" does not resolve to any lifecycle row. A remap to an unknown SKU never attaches to a product.`,
      );
      continue;
    }
    if (successorStatus !== "active") {
      problems.push(
        `supersession: successor "${entry.successor}" of "${entry.predecessor}" is lifecycle "${successorStatus}" - a remap must point at an active, quotable product.`,
      );
    }
  }
  return problems;
}

// Build the resolved map from redirect-SAFE entries only: a supersession whose
// successor is not an active, known SKU (or that names itself) is never served,
// so a promoted remap can never direct a rep onto a discontinued product even
// before the table is fixed. Data-quality violations still fail CI via the pin
// suite and are logged loudly at import time below.
function buildSupersessionMap(): Map<string, WyreStormSupersession> {
  const map = new Map<string, WyreStormSupersession>();
  for (const entry of WYRESTORM_SUPERSESSIONS) {
    const predecessor = normaliseSkuKey(entry.predecessor);
    const successor = normaliseSkuKey(entry.successor);
    const successorStatus = getWyreStormSkuBusinessStatus(entry.successor);
    if (successor !== predecessor && successorStatus === "active") {
      map.set(predecessor, entry);
    }
  }
  return map;
}

const SUPERSESSION_BY_KEY = buildSupersessionMap();

const SUPERSESSION_PROBLEMS = collectWyreStormSupersessionProblems();
if (SUPERSESSION_PROBLEMS.length > 0) {
  // Loud but non-fatal: the supersession pin suite fails CI on the same
  // problems, and the fail-closed map above already stops serving bad remaps.
  // eslint-disable-next-line no-console
  console.error(
    `[wingman:supersession] WYRESTORM_SUPERSESSIONS violates the active-successor rule (${SUPERSESSION_PROBLEMS.length}):`,
  );
  for (const problem of SUPERSESSION_PROBLEMS) {
    // eslint-disable-next-line no-console
    console.error(`  - ${problem}`);
  }
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
  /** True when an admin has manually blocked this SKU (doNotUse or hidden visibility). */
  adminBlocked: boolean;
  /** The admin's override record, if one exists (blocked or not). */
  adminOverride?: AdminProductOverride;
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
  const adminOverride = getAdminProductOverride(sku) ?? undefined;
  const adminBlocked = Boolean(adminOverride?.doNotUse) || adminOverride?.visibility === "hidden";
  const recommendable = status === "active" && !supersession && !adminBlocked;

  let note: string;
  if (adminBlocked) {
    note = adminOverride?.adminNotes?.trim()
      ? `${sku} is blocked by an admin override: ${adminOverride.adminNotes.trim()}`
      : `${sku} is blocked by an admin override - do not position it as a current lead.`;
  } else if (supersession) {
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
    adminBlocked,
    adminOverride,
  };
}
