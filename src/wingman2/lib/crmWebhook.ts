/**
 * CRM Webhook — configurable endpoint for sending project summaries
 * to ZoHo CRM or any webhook-compatible CRM platform.
 *
 * The webhook URL is stored in localStorage and can be changed at any time.
 * The payload is a JSON object containing the project summary, products,
 * room details, and CRM metadata.
 */

import type { DiscoveryConversationItem } from "../data/projectStore";
import { recordStorageReclaim, storageEntryBytes } from "./retiredStorage";

const CRM_WEBHOOK_URL_KEY = "wingman-crm-webhook-url";
const CRM_WEBHOOK_HISTORY_KEY = "wingman-crm-webhook-history";
/**
 * Where the boot sweep leaves the count of sends it had to drop.
 *
 * Not the rows and not who they were for — that is exactly what was given up —
 * just the count, so the CRM panel can say what happened. Boot is the wrong place
 * to interrupt a rep with a dialog, and the same note on every load would be
 * noise, so the count waits here until a rep reads it in the panel that shows the
 * list it came out of.
 */
/**
 * Where the unread drop count is kept. Exported so a spec can seed the note the
 * boot sweep would have written, rather than spelling the key out again.
 */
export const CRM_WEBHOOK_DROPS_KEY = "wingman-crm-webhook-history-drops-v1";

export type CrmWebhookStatus = "idle" | "sending" | "success" | "error";

export type CrmWebhookHistoryEntry = {
  id: string;
  projectId: string;
  projectName: string;
  sentAt: string;
  status: "success" | "error";
  errorMessage?: string;
  httpStatus?: number;
  /**
   * The discovery Q&A trail exactly as it was included in the sent payload,
   * so reps can verify what conversation reached the CRM for this send.
   */
  discoveryConversation?: DiscoveryConversationItem[];
  /**
   * The exact body a failed send POSTed, kept so the rep can retry it from the
   * history row: the endpoint receives the same snapshot — same `generatedAt`,
   * same attachment — instead of a rebuild from a project that has moved on
   * since. A send that landed keeps none: there is nothing to retry, and twenty
   * of these (each carrying the base64 discovery brief) would crowd the
   * browser's storage out from under the project store. A retry that lands drops
   * it too — the snapshot has been delivered and can never be sent again, so
   * keeping it would leave the largest part of a finished row in storage.
   */
  payload?: CrmWebhookPayload;
  /**
   * When a retry of this failure was accepted by the endpoint.
   *
   * The failure stays — its reason and its time are the record of what went
   * wrong first — but the row stops offering its body again, and the batch
   * action stops counting it, because the snapshot it holds has been delivered.
   */
  retriedAt?: string;
};

/**
 * What a sweep had to give up, waiting to be told.
 *
 * `droppedRows` adds up across sweeps until the rep reads it, because the note is
 * written in the past tense: two loads that each dropped a send have dropped two
 * between them, and a note that reset to the last load would understate what the
 * list lost.
 */
export type CrmWebhookHistoryDrops = {
  /** How many older sends this browser dropped since the rep was last told. */
  droppedRows: number;
};

export type CrmWebhookPayload = {
  /** Wingman project ID */
  projectId: string;
  /** Project name / opportunity title */
  projectName: string;
  /** Customer / account name */
  customer: string;
  /** Site / location name */
  site: string;
  /** Current project stage */
  stage: string;
  /** Deal outcome if recorded */
  dealOutcome?: string;
  /** Deal outcome "why" text */
  dealOutcomeWhy?: string;
  /** Room model summary from discovery */
  roomModel?: Record<string, unknown>;
  /** Discovery Q&A trail (question, governed answer, customer wording, confirmed status) */
  discoveryConversation?: DiscoveryConversationItem[];
  /** Selected products with SKU, title, quantity */
  products: Array<{
    sku: string;
    title?: string;
    quantity?: number;
    family?: string;
    category?: string;
    status?: string;
    evidence?: string[];
  }>;
  /** Proposal title if available */
  proposalTitle?: string;
  /** Proposal summary if available */
  proposalSummary?: string;
  /** BOM rows if available */
  bomRows?: Array<{
    sku: string;
    description: string;
    role: string;
    qty: number;
    notes?: string;
  }>;
  /**
   * Base64-encoded discovery brief HTML (full Q&A trail) attached so the CRM
   * receives the conversation document alongside the structured fields — the
   * same document the rep can download via "Export discovery brief".
   */
  discoveryBriefAttachment?: {
    filename: string;
    mimeType: string;
    /** Base64 (UTF-8) encoded HTML content. */
    content: string;
  };
  /** Timestamp when this payload was generated */
  generatedAt: string;
  /** Wingman version marker */
  source: "wingman";
};

/**
 * Read the configured webhook URL from localStorage.
 */
export function getWebhookUrl(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(CRM_WEBHOOK_URL_KEY) ?? "";
}

/**
 * Save the webhook URL to localStorage.
 */
export function setWebhookUrl(url: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CRM_WEBHOOK_URL_KEY, url.trim());
}

/**
 * Send the webhook payload to the configured endpoint.
 * Returns the HTTP response status or throws on network error.
 */
export async function sendWebhook(payload: CrmWebhookPayload): Promise<{
  ok: boolean;
  status: number;
  statusText: string;
}> {
  const url = getWebhookUrl();
  if (!url) {
    throw new Error("No webhook URL configured. Set it in the CRM Integration panel.");
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error(`Invalid webhook URL: ${url}`);
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error("Webhook URL must use http:// or https://");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
  });

  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
  };
}

/**
 * Re-POST an earlier recorded payload to the currently configured webhook URL.
 *
 * Resend deliberately submits the *exact* body that was recorded for that
 * send (including its generatedAt and any attachment), rather than rebuilding
 * from the live project — so reps can push an unchanged snapshot to the CRM
 * regardless of edits made since. Throws if the entry carries no stored
 * payload or no webhook URL is configured.
 */
export async function resendHistoryEntry(entry: CrmWebhookHistoryEntry): Promise<{
  ok: boolean;
  status: number;
  statusText: string;
}> {
  if (!entry.payload) {
    throw new Error("This send was recorded without a payload snapshot and cannot be resent.");
  }
  // Reuse the exact recorded body, not a fresh build.
  return sendWebhook(entry.payload);
}

/**
 * The failed sends for one project that this browser still holds a body for.
 *
 * The history is one list across every room, so a panel has to ask for its own
 * room's failures: a rep resending "the ones that failed" means the sends this
 * project made, not another project's. Only a failure that kept its payload can
 * be resent — a row recorded before bodies were stored has nothing to post
 * again, and it is left out rather than queued as a guaranteed failure — and a
 * failure already resent is left out too, or the batch would deliver the same
 * snapshot twice.
 */
export function resendableProjectFailures(
  history: readonly CrmWebhookHistoryEntry[],
  projectId: string,
): Array<CrmWebhookHistoryEntry & { payload: CrmWebhookPayload }> {
  return history.filter(
    (entry): entry is CrmWebhookHistoryEntry & { payload: CrmWebhookPayload } =>
      entry.projectId === projectId &&
      entry.status === "error" &&
      entry.payload !== undefined &&
      entry.retriedAt === undefined,
  );
}

/**
 * Note on a failed row that a retry of its body was accepted.
 *
 * The history is rewritten in place rather than appended to: the mark belongs to
 * the attempt that failed, so that row keeps its position, its reason and its
 * time, and only the offer to send its body again is withdrawn. The body goes
 * with it: it has been delivered, so nothing can resend it, and a stored
 * snapshot (the base64 brief included) is the largest thing a row holds — an old
 * failure a rep has already resolved should not keep crowding the browser's
 * storage. A retry that is refused again marks nothing — the failure is still
 * the current state, and the row must stay resendable with its body.
 */
export function markWebhookHistoryRetried(entryId: string, retriedAt = new Date().toISOString()): void {
  if (typeof window === "undefined") return;

  try {
    const raw = localStorage.getItem(CRM_WEBHOOK_HISTORY_KEY);
    const history: CrmWebhookHistoryEntry[] = raw ? JSON.parse(raw) : [];
    if (!history.some((entry) => entry.id === entryId)) return;
    localStorage.setItem(
      CRM_WEBHOOK_HISTORY_KEY,
      JSON.stringify(
        history.map((entry) => {
          if (entry.id !== entryId) return entry;
          const marked: CrmWebhookHistoryEntry = { ...entry, retriedAt };
          delete marked.payload;
          return marked;
        }),
      ),
    );
  } catch {
    // Ignore storage errors
  }
}

/**
 * Bring this browser's stored history back inside the rules it was written by.
 *
 * Two cleanups in one read and one write, because both are storage nobody asks
 * for: a row a resend already delivered still carries its snapshot — impossible
 * to send again and, with the base64 brief, the largest thing a row holds — and a
 * history written before the byte budget existed can sit over it. Only
 * `recordWebhookHistory` appends, so without this the second case would wait for a
 * rep to send again, and a browser that never sends again keeps the space for as
 * long as it lives.
 *
 * Idempotent: a history already cleaned and inside both ceilings is read and not
 * written, so a clean browser pays one read per load and nothing else. It reports
 * only what it did — a refused or unreadable store is left alone, because this
 * runs at boot, before any surface exists to say so.
 *
 * A drop is not left silent, though: the count goes into `readWebhookHistoryDrops`
 * for the CRM panel to print, because a rep whose list lost rows should learn it
 * somewhere they can ask about the list. Nothing interrupts the load with it — the
 * panel says it once, when a rep is already looking at what the browser holds.
 *
 * The space it gave back goes to the boot storage strip, through
 * `recordStorageReclaim`, so the load after this one says everything boot took
 * back rather than only the retired store's share. The size is measured as the
 * difference the rewrite made to this entry — the serialized history before and
 * after, counted the way a `localStorage` entry is — rather than assumed from the
 * payloads' own lengths, because the bytes a browser actually holds are what the
 * strip promises came back. A sweep that had nothing to clean contributes nothing,
 * so a clean browser stays read-only and its strip reports no history it did not
 * give back.
 */
export function sweepWebhookHistory(): { clearedPayloads: number; droppedRows: number } {
  const nothing = { clearedPayloads: 0, droppedRows: 0 };
  if (typeof window === "undefined") return nothing;

  try {
    const raw = localStorage.getItem(CRM_WEBHOOK_HISTORY_KEY);
    if (!raw) return nothing;
    const history: CrmWebhookHistoryEntry[] = JSON.parse(raw);
    let clearedPayloads = 0;
    const pruned = history.map((entry) => {
      if (!entry.retriedAt || entry.payload === undefined) return entry;
      const delivered: CrmWebhookHistoryEntry = { ...entry };
      delete delivered.payload;
      clearedPayloads += 1;
      return delivered;
    });
    const kept = withinHistoryCeilings(pruned);
    const droppedRows = pruned.length - kept.length;
    const keptJson = JSON.stringify(kept);
    if (clearedPayloads > 0 || droppedRows > 0) {
      localStorage.setItem(CRM_WEBHOOK_HISTORY_KEY, keptJson);
      // Measured from the two documents rather than counted per removed field: a
      // row's cost is not its payload's length (the separators, the other fields
      // and the JSON quoting are the entry the browser actually holds), and the
      // strip promises the space that came back.
      const reclaimedBytes = storageEntryBytes(CRM_WEBHOOK_HISTORY_KEY, raw)
        - storageEntryBytes(CRM_WEBHOOK_HISTORY_KEY, keptJson);
      if (reclaimedBytes > 0) recordStorageReclaim(reclaimedBytes, reclaimedBytes);
    }
    if (droppedRows > 0) {
      // The note is a courtesy, so a store that refuses it must not turn a trim
      // that already happened into a sweep that reports nothing.
      try {
        recordDroppedSends(droppedRows);
      } catch {
        // The rows are gone either way.
      }
    }
    return { clearedPayloads, droppedRows };
  } catch {
    // Ignore storage errors: a history that cannot be read is left alone.
    return nothing;
  }
}

/**
 * What the send history may cost the browser, in bytes of its serialized form.
 *
 * A row count does not bound this store, because the largest thing a row holds is
 * not fixed-size: a failed send keeps the exact body it POSTed, and that body
 * carries the discovery brief as base64. Three long captures therefore weigh
 * more than twenty short sends, and the count alone let them fill the origin —
 * taking the room the project store needs with them. This is the ceiling those
 * rows share: enough for the handful of failures a rep actually retries, small
 * enough that the history cannot be what fills storage.
 */
export const CRM_WEBHOOK_HISTORY_BUDGET_BYTES = 512 * 1024;

/** How many sends the history keeps when they are light enough to fit. */
const CRM_WEBHOOK_HISTORY_ROW_LIMIT = 20;

/** The size of a history as the browser stores it: its serialized JSON. */
function historyByteLength(history: readonly CrmWebhookHistoryEntry[]): number {
  const json = JSON.stringify(history);
  return typeof TextEncoder !== "undefined" ? new TextEncoder().encode(json).length : json.length;
}

/**
 * Fit a history inside the byte budget, dropping the oldest sends first.
 *
 * The newest row is never dropped, even when it alone is over the budget: it is
 * the send the rep just made, and a history that silently omitted it would say
 * nothing about the attempt that failed. An oversized single send is therefore
 * kept as the whole history rather than trimmed to an empty list, and the next
 * send trims it from the old end.
 */
export function fitWebhookHistoryToBudget(
  history: readonly CrmWebhookHistoryEntry[],
  budgetBytes: number = CRM_WEBHOOK_HISTORY_BUDGET_BYTES,
): CrmWebhookHistoryEntry[] {
  const kept = [...history];
  while (kept.length > 1 && historyByteLength(kept) > budgetBytes) kept.pop();
  return kept;
}

/**
 * A history inside both ceilings, in the order they answer: the row count picks
 * which sends, then the budget decides how many of those fit. The write path and
 * the boot sweep both go through here, so a stored history and a freshly written
 * one cannot obey different rules.
 */
function withinHistoryCeilings(history: readonly CrmWebhookHistoryEntry[]): CrmWebhookHistoryEntry[] {
  return fitWebhookHistoryToBudget(history.slice(0, CRM_WEBHOOK_HISTORY_ROW_LIMIT));
}

/**
 * Record a webhook send attempt in history (localStorage).
 *
 * Two ceilings decide what is kept, because they answer different questions: the
 * row count bounds how many sends a rep has to scroll past, and the byte budget
 * bounds what the history costs the browser. A few long discoveries reach the
 * second one well before the first, so the count is applied to pick the sends and
 * the budget to fit them.
 *
 * Returns whether the row was stored. A write can be refused — most often because
 * the origin is full, since this history shares it with the project store — and
 * the caller is the only place that can tell the rep. A row that was not stored
 * is missing from the list the panel prints, which for the send the rep just made
 * reads as a send that never happened, and for a failed one means the body it
 * would have resent is gone too. So the refusal is reported rather than dropped.
 */
export function recordWebhookHistory(entry: CrmWebhookHistoryEntry): boolean {
  if (typeof window === "undefined") return false;

  try {
    const raw = localStorage.getItem(CRM_WEBHOOK_HISTORY_KEY);
    const history: CrmWebhookHistoryEntry[] = raw ? JSON.parse(raw) : [];
    history.unshift(entry);
    const kept = withinHistoryCeilings(history);
    localStorage.setItem(CRM_WEBHOOK_HISTORY_KEY, JSON.stringify(kept));
    return true;
  } catch {
    return false;
  }
}

/**
 * Read webhook send history.
 */
export function getWebhookHistory(): CrmWebhookHistoryEntry[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(CRM_WEBHOOK_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Clear webhook send history.
 */
export function clearWebhookHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CRM_WEBHOOK_HISTORY_KEY);
}

/**
 * Drop one send from this browser's history, and leave every other row where it
 * is.
 *
 * The ceilings keep the newest row even when it alone is over the budget, and a
 * failed send carries the body it POSTed — the base64 discovery brief included,
 * which is the largest thing a row holds. One oversized failure can therefore be
 * the whole history, and clearing it used to mean clearing every room's rows with
 * it: the record of the sends the CRM accepted went with the one row a rep
 * wanted rid of. That case is what this answers, so the space a long failed send
 * holds is given back one row at a time and the list keeps everything else, in
 * the order it was in.
 *
 * The row is dropped rather than marked, which is the difference between this and
 * a resend: a delivered body is a finished attempt whose failure is still worth
 * telling a rep about, while a dropped row is one the rep asked to be rid of.
 * An unknown id writes nothing. Removing the last row removes the key, because an
 * empty history is the absent key everywhere else — the write path cannot store
 * an empty list — so a browser that drops every row one by one ends in the same
 * state as one that cleared the list.
 */
export function removeWebhookHistoryEntry(entryId: string): void {
  if (typeof window === "undefined") return;

  try {
    const raw = localStorage.getItem(CRM_WEBHOOK_HISTORY_KEY);
    const history: CrmWebhookHistoryEntry[] = raw ? JSON.parse(raw) : [];
    const kept = history.filter((entry) => entry.id !== entryId);
    if (kept.length === history.length) return;
    if (kept.length === 0) {
      localStorage.removeItem(CRM_WEBHOOK_HISTORY_KEY);
      return;
    }
    localStorage.setItem(CRM_WEBHOOK_HISTORY_KEY, JSON.stringify(kept));
  } catch {
    // Ignore storage errors: a row this browser will not rewrite stays listed.
  }
}

/**
 * The drops a sweep has not told a rep about yet, or null when there are none.
 *
 * A stored value that is not a positive count — a hand-edited key, a shape from
 * another build — reads as nothing to say rather than as a note about zero sends.
 */
export function readWebhookHistoryDrops(): CrmWebhookHistoryDrops | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(CRM_WEBHOOK_DROPS_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as Partial<CrmWebhookHistoryDrops> | null;
    const droppedRows = stored?.droppedRows;
    return typeof droppedRows === "number" && droppedRows > 0 ? { droppedRows } : null;
  } catch {
    return null;
  }
}

/**
 * The one sentence about a sweep's drops, wherever a rep meets it.
 *
 * Two surfaces print it — the CRM panel, where a rep about to read the list would
 * ask, and the project record's activity log, so a rep who never opens the panel
 * still learns that sends went — and it names no list of its own: the panel's is
 * called Recent Sends and the record's has no such thing, so its subject is the
 * browser's CRM send history. Both surfaces read the same
 * `readWebhookHistoryDrops`, and this keeps them from saying that number two
 * ways.
 */
export function droppedSendsNote(droppedRows: number): string {
  const sends = droppedRows === 1 ? "1 older send" : `${droppedRows} older sends`;
  return `This browser dropped ${sends} from its CRM send history to keep it inside its storage. Every send the CRM accepted is still listed.`;
}

/**
 * Forget the drops the rep has now read.
 *
 * Called from the dismissal on either surface that prints the note, and from the
 * panel's clearing of the history: in the second case the rows the note counts
 * are gone, so a note about their number would outlive its subject. One note
 * about one browser, so a rep who reads it on the record's activity log does not
 * meet it again in the panel.
 */
export function acknowledgeWebhookHistoryDrops(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CRM_WEBHOOK_DROPS_KEY);
}

/**
 * Leave the count of dropped sends for a surface to print.
 *
 * It adds to whatever the rep has not read yet, and it is written after the trim
 * it describes. A browser that refuses even this small write is left silent: the
 * rows are already gone, and a load is the wrong place to fail loudly.
 */
function recordDroppedSends(droppedRows: number): void {
  const unread = readWebhookHistoryDrops()?.droppedRows ?? 0;
  localStorage.setItem(CRM_WEBHOOK_DROPS_KEY, JSON.stringify({ droppedRows: unread + droppedRows }));
}

/**
 * Generate a cURL command snippet for the given payload.
 * Useful for testing the webhook endpoint outside of Wingman.
 */
export function generateCurlSnippet(url: string, payload: CrmWebhookPayload): string {
  return `curl -X POST "${url}" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(payload, null, 2).replace(/'/g, "'\\''")}'`;
}
