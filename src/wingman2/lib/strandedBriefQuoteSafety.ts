// Leaf module on purpose: the shared stranded-brief wording is imported by
// projectStore.ts (bundled into the eager app-core chunk) and by the
// recommendation-evidence builder. Keeping it dependency-free stops the eager
// graph from pulling the discovery question catalog in with it — see
// tools/check-size-budgets.mjs (source:discovery-page / initial:js budgets).

/** Shared wording for quote-safety surfaces when a stranded brief blocks the
 *  quote: the recommendation evidence builder and the project store's
 *  evidence override both use it so the reason reads the same everywhere. */
export const STRANDED_BRIEF_QUOTE_SAFETY_MESSAGE =
  "Do not quote yet - the discovery brief still carries an answer that no longer fits your current answers. Resolve it on the discovery page first.";
