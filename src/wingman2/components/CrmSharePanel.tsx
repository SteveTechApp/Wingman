import { useState, useEffect } from "react";
import { ExternalLink, Copy, Check, Building2, Send, Settings, History, AlertCircle, AlertTriangle, Loader2, ChevronDown, ChevronUp, RotateCcw, Trash2 } from "lucide-react";
import type { StoredProject } from "../data/projectStore";
import {
  getWebhookUrl,
  setWebhookUrl,
  sendWebhook,
  resendHistoryEntry,
  resendableProjectFailures,
  markWebhookHistoryRetried,
  recordWebhookHistory,
  getWebhookHistory,
  clearWebhookHistory,
  removeWebhookHistoryEntry,
  acknowledgeWebhookHistoryDrops,
  generateCurlSnippet,
  type CrmWebhookStatus,
  type CrmWebhookHistoryEntry,
  type CrmWebhookPayload,
} from "../lib/crmWebhook";
import { buildWebhookPayload } from "../lib/crmWebhookPayload";
import { WebhookDropsNote } from "./WebhookDropsNote";

type CrmPlatform = {
  id: string;
  name: string;
  color: string;
  buildUrl: (data: ProjectCrmData) => string;
};

type ProjectCrmData = {
  name: string;
  description: string;
  products: string;
  stage: string;
  status: string;
  customer: string;
  site: string;
};

function extractCrmData(project: StoredProject): ProjectCrmData {
  const products = (project.productSelections ?? [])
    .map((p) => `${p.sku}${p.title ? ` - ${p.title}` : ""}${(p.quantity ?? 1) > 1 ? ` x${p.quantity}` : ""}`)
    .join("\n");

  const brief = project.discoveryBrief;
  const roomModel = (brief?.roomModel ?? {}) as Record<string, unknown>;
  const getString = (key: string) => typeof roomModel[key] === "string" ? String(roomModel[key]) : "";
  const description = [
    getString("application") ? `Application: ${getString("application")}` : "",
    getString("scale") ? `Scale: ${getString("scale")}` : "",
    getString("sourceCount") ? `Sources: ${getString("sourceCount")}` : "",
    getString("displayCount") ? `Displays: ${getString("displayCount")}` : "",
    getString("cableRun") ? `Cable run: ${getString("cableRun")}` : "",
    getString("summary") ? `Summary: ${getString("summary")}` : "",
  ].filter(Boolean).join("\n");

  return {
    name: project.name || "Untitled Opportunity",
    description,
    products: products || "No products selected",
    stage: project.stage || "Discovery",
    status: project.status || "",
    customer: getString("clientName") || project.owner || "",
    site: getString("siteName") || "",
  };
}

const CRM_PLATFORMS: CrmPlatform[] = [
  {
    id: "salesforce",
    name: "Salesforce",
    color: "text-blue-400",
    buildUrl: (data) => {
      const params = new URLSearchParams({
        opp3: data.name,
        opp11: data.stage === "Proposal Builder" ? "Proposal" : "Qualification",
        opp9: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        retURL: "/",
      });
      return `https://login.salesforce.com/p/lead/LeadNew?${params.toString()}`;
    },
  },
  {
    id: "hubspot",
    name: "HubSpot",
    color: "text-orange-400",
    buildUrl: (data) => {
      const params = new URLSearchParams({
        deal_name: data.name,
        deal_stage: "QUALIFICATION",
      });
      return `https://app.hubspot.com/crm-deal/new?${params.toString()}`;
    },
  },
  {
    id: "zoho",
    name: "Zoho CRM",
    color: "text-red-400",
    buildUrl: (data) => {
      const params = new URLSearchParams({
        module: "Deals",
        Deal_name: data.name,
        Stage: "Qualification",
      });
      return `https://crm.zoho.com/crm/NewRecord.do?${params.toString()}`;
    },
  },
  {
    id: "pipedrive",
    name: "Pipedrive",
    color: "text-green-400",
    buildUrl: (data) => {
      const params = new URLSearchParams({
        title: data.name,
      });
      return `https://app.pipedrive.com/deal/edit?${params.toString()}`;
    },
  },
];

/**
 * One row of the send history, from the outcome of an attempt.
 *
 * A failed attempt keeps the payload it tried to POST, because that is the body
 * a rep can retry from the row: the endpoint receives the same snapshot rather
 * than a rebuild of a project that may have changed since. A send that landed
 * keeps none — there is nothing to retry, and the discovery brief attachment
 * makes a payload large enough that twenty of them would crowd the browser's
 * storage.
 *
 * The row names the project the attempt was for, so a retry launched from this
 * project's panel still files under the project the send belonged to: the
 * history is one list across every project.
 */
function sendHistoryEntry(
  sent: { id: string; name: string },
  payload: CrmWebhookPayload,
  outcome: { result?: { ok: boolean; status: number; statusText: string }; error?: string },
): CrmWebhookHistoryEntry {
  const failure =
    outcome.error ??
    (outcome.result && !outcome.result.ok
      ? `HTTP ${outcome.result.status} ${outcome.result.statusText}`
      : undefined);

  return {
    id: `wh-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    projectId: sent.id,
    projectName: sent.name,
    sentAt: new Date().toISOString(),
    status: failure ? "error" : "success",
    ...(outcome.result ? { httpStatus: outcome.result.status } : {}),
    ...(failure ? { errorMessage: failure, payload } : {}),
    discoveryConversation: payload.discoveryConversation,
  };
}

/**
 * What one bulk resend did, in the words the panel prints.
 *
 * The count attempted is named apart from the outcome because a rep who clicks
 * this is asking about the rows they can see failing, and the body may accept
 * some and refuse others. Failures recorded before bodies were stored are
 * counted separately: they were not sent again, and saying so is what stops the
 * red rows that remain from reading as sends this action missed.
 */
function bulkResendNote(counts: { attempted: number; accepted: number; failed: number; stale: number }) {
  const sends = counts.attempted === 1 ? "failed send" : "failed sends";
  const lines = [
    `Resent ${counts.attempted} ${sends} — ${counts.accepted} accepted, ${counts.failed} failed again.`,
  ];
  if (counts.stale > 0) {
    lines.push(
      `${
        counts.stale === 1 ? "1 earlier failure stored no payload" : `${counts.stale} earlier failures stored no payload`
      }, so ${
        counts.stale === 1 ? "it was" : "they were"
      } left as recorded.`,
    );
  }
  return lines.join(" ");
}

/**
 * What the panel says when a send happened but its history row did not.
 *
 * The two outcomes are said separately, because they ask different things of the
 * rep: a send the endpoint accepted has already gone, so the only loss is that
 * this list will not offer it again, while a send that failed has to be sent
 * again by hand — the body a retry would have posted was never stored. Silence
 * would read as a send that never happened, which is the one reading this panel
 * must not give: the list below is where a rep checks what reached the CRM.
 */
function historyRecordWarning(counts: { unrecorded: number; landed: number; failed: number }): string {
  const leads =
    counts.unrecorded === 1
      ? "This browser could not record that send in Recent Sends — its storage is full or unavailable."
      : `This browser could not record ${counts.unrecorded} of those sends in Recent Sends — its storage is full or unavailable.`;
  const consequences: string[] = [];
  if (counts.landed > 0) {
    consequences.push(
      counts.landed === 1
        ? "The endpoint accepted it, so the CRM has it, but nothing listed below can resend it."
        : `The endpoint accepted ${counts.landed} of them, so the CRM has those, but nothing listed below can resend them.`,
    );
  }
  if (counts.failed > 0) {
    consequences.push(
      counts.failed === 1
        ? "It failed, and with no record there is no body to resend."
        : `${counts.failed} of them failed, and with no record there is no body to resend.`,
    );
  }
  return `${leads} ${consequences.join(" ")}`.trim();
}

/**
 * What dropping one row of the history costs, said before the row goes.
 *
 * A row is not only a line of the list: a failed send holds the body a retry
 * would post, so dropping it is the last copy of a snapshot the CRM never
 * received. The three sentences are the row's own three shapes — a failure with
 * a body to lose, a failure recorded before bodies were kept, and a send the
 * endpoint accepted — because what the rep gives up differs, and the clear action
 * beside the list draws the same line at the whole-list scale.
 */
function historyRemovalNote(entry: CrmWebhookHistoryEntry): string {
  if (entry.payload) {
    return "Dropping it takes the body kept for a resend with it, so this failure cannot be sent again from here.";
  }
  if (entry.status === "error") {
    return "Dropping it removes this browser's record of the failure. It stored no body, so nothing here could be resent.";
  }
  return "Dropping it removes this browser's record of the send. The CRM keeps what it accepted.";
}

export function CrmSharePanel({ project }: { project: StoredProject }) {
  const [copied, setCopied] = useState(false);
  const [showWebhook, setShowWebhook] = useState(false);
  const [webhookUrl, setWebhookUrlState] = useState("");
  const [webhookStatus, setWebhookStatus] = useState<CrmWebhookStatus>("idle");
  const [webhookError, setWebhookError] = useState("");
  const [webhookHistory, setWebhookHistory] = useState<CrmWebhookHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [retryingHistoryId, setRetryingHistoryId] = useState<string | null>(null);
  const [bulkRetrying, setBulkRetrying] = useState(false);
  const [retryNote, setRetryNote] = useState("");
  // Says which sends the browser could not keep a record of. Separate from the
  // send outcome, because both can be true at once: the endpoint took the body
  // and storage refused the row.
  const [recordWarning, setRecordWarning] = useState("");
  // The clear action asks before it goes. A rep reaches for it exactly when the
  // warning above has said the origin is full, and what it drops is not just
  // bytes: the bodies kept for the failures that can still be resent live only
  // here, so the rep has to see what the room costs before it is given back.
  const [clearConfirm, setClearConfirm] = useState(false);
  const [clearNote, setClearNote] = useState("");
  // The row a rep has asked to drop, armed and waiting for the second click.
  // One at a time, so arming another row disarms this one, and a blur puts the
  // destructive offer away rather than leaving it under the cursor.
  const [confirmingHistoryId, setConfirmingHistoryId] = useState<string | null>(null);
  // Restarts the shared drops note when this panel settles it (see
  // `handleClearHistory`).
  const [dropsNoteKey, setDropsNoteKey] = useState(0);
  const [showCurl, setShowCurl] = useState(false);
  const [showPayload, setShowPayload] = useState(false);

  useEffect(() => {
    setWebhookUrlState(getWebhookUrl());
    setWebhookHistory(getWebhookHistory());
  }, []);

  const data = extractCrmData(project);

  // The same Q&A trail the webhook sends, formatted for pasting into a CRM
  // note field — so a manual paste captures the conversation too.
  const conversation = project.discoveryBrief?.discoveryConversation ?? [];
  const conversationLines: string[] = [];
  if (conversation.length === 0) {
    conversationLines.push("No discovery conversation captured.");
  } else {
    for (const item of conversation) {
      conversationLines.push(`Q: ${item.question}`);
      conversationLines.push(`A: ${item.answer}`);
      if (item.note) conversationLines.push(`   Customer said: ${item.note}`);
      if (item.confirmed) conversationLines.push("   Confirmed with customer");
      conversationLines.push("");
    }
  }

  const clipboardText = [
    `Opportunity: ${data.name}`,
    `Customer: ${data.customer || "Not specified"}`,
    `Site: ${data.site || "Not specified"}`,
    `Stage: ${data.stage}`,
    `Status: ${data.status}`,
    "",
    "Products:",
    data.products,
    "",
    "Room Details:",
    data.description,
    "",
    "Discovery conversation:",
    ...conversationLines,
  ]
    .join("\n")
    .replace(/\n+$/, "");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(clipboardText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text
    }
  }

  function handleSaveWebhookUrl() {
    setWebhookUrl(webhookUrl);
  }

  async function handleSendWebhook() {
    if (!webhookUrl) {
      setWebhookError("Enter a webhook URL first.");
      return;
    }

    setWebhookStatus("sending");
    setWebhookError("");
    setRetryNote("");
    setRecordWarning("");

    try {
      const payload = buildWebhookPayload(project);
      const result = await sendWebhook(payload);

      const stored = recordWebhookHistory(sendHistoryEntry(project, payload, { result }));
      setRecordWarning(
        stored
          ? ""
          : historyRecordWarning({ unrecorded: 1, landed: result.ok ? 1 : 0, failed: result.ok ? 0 : 1 }),
      );
      setWebhookHistory(getWebhookHistory());

      if (result.ok) {
        setWebhookStatus("success");
        setTimeout(() => setWebhookStatus("idle"), 3000);
      } else {
        setWebhookStatus("error");
        setWebhookError(`Server responded with HTTP ${result.status} ${result.statusText}`);
      }
    } catch (err) {
      setWebhookStatus("error");
      const message = err instanceof Error ? err.message : "Unknown error";
      setWebhookError(message);

      const stored = recordWebhookHistory(sendHistoryEntry(project, buildWebhookPayload(project), { error: message }));
      setRecordWarning(stored ? "" : historyRecordWarning({ unrecorded: 1, landed: 0, failed: 1 }));
      setWebhookHistory(getWebhookHistory());
    }
  }

  /**
   * Send a failed attempt's own payload again.
   *
   * The body comes from the record, not from the project, so the endpoint gets
   * the same snapshot the rep first sent even if the room has changed since.
   * The retry is its own attempt: it lands as a new history row, and the row it
   * started from keeps the failure it recorded.
   */
  async function handleRetrySend(entry: CrmWebhookHistoryEntry) {
    const payload = entry.payload;
    if (!payload || retryingHistoryId) return;

    setRetryingHistoryId(entry.id);
    setRetryNote("");
    setRecordWarning("");

    const sent = { id: entry.projectId, name: entry.projectName };
    try {
      const result = await resendHistoryEntry(entry);
      // Only a landed retry marks the row: a refused one leaves the failure as
      // the current state, so the rep can send that body again.
      if (result.ok) markWebhookHistoryRetried(entry.id);
      const stored = recordWebhookHistory(sendHistoryEntry(sent, payload, { result }));
      setRecordWarning(
        stored
          ? ""
          : historyRecordWarning({ unrecorded: 1, landed: result.ok ? 1 : 0, failed: result.ok ? 0 : 1 }),
      );
      setRetryNote(
        result.ok
          ? `Retried the ${new Date(entry.sentAt).toLocaleTimeString()} send — the endpoint accepted it.`
          : `Retried the ${new Date(entry.sentAt).toLocaleTimeString()} send — HTTP ${result.status} ${result.statusText}.`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      const stored = recordWebhookHistory(sendHistoryEntry(sent, payload, { error: message }));
      setRecordWarning(stored ? "" : historyRecordWarning({ unrecorded: 1, landed: 0, failed: 1 }));
      setRetryNote(`Retried the ${new Date(entry.sentAt).toLocaleTimeString()} send — ${message}`);
    } finally {
      setRetryingHistoryId(null);
      setWebhookHistory(getWebhookHistory());
    }
  }

  /**
   * Resend every failed send this project stored a body for, one at a time.
   *
   * Each retry is its own attempt, exactly like the row action: its outcome is
   * recorded as a new history row, and the failures it started from keep the
   * reason they failed, because that is the record of what went wrong first.
   * They go in order rather than all at once so a refusal is attributed to the
   * send that met it instead of becoming a pile of rejections a rep has to match
   * to rows, and so one endpoint never receives three requests at once.
   */
  async function handleResendFailedSends() {
    if (bulkRetrying || retryingHistoryId) return;

    const failures = resendableProjectFailures(webhookHistory, project.id);
    if (failures.length === 0) return;

    setBulkRetrying(true);
    setRetryNote("");
    setRecordWarning("");

    let accepted = 0;
    let failed = 0;
    // Attempts whose outcome the endpoint returned but whose history row this
    // browser refused, counted by what the endpoint did: the warning asks the rep
    // to send again only for the ones that failed.
    let unrecordedLanded = 0;
    let unrecordedFailed = 0;
    for (const entry of failures) {
      const sent = { id: entry.projectId, name: entry.projectName };
      try {
        const result = await resendHistoryEntry(entry);
        const stored = recordWebhookHistory(sendHistoryEntry(sent, entry.payload, { result }));
        if (!stored) {
          if (result.ok) unrecordedLanded += 1;
          else unrecordedFailed += 1;
        }
        if (result.ok) {
          accepted += 1;
          markWebhookHistoryRetried(entry.id);
        } else failed += 1;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        const stored = recordWebhookHistory(sendHistoryEntry(sent, entry.payload, { error: message }));
        if (!stored) unrecordedFailed += 1;
        failed += 1;
      }
    }

    setBulkRetrying(false);
    setRecordWarning(
      unrecordedLanded + unrecordedFailed > 0
        ? historyRecordWarning({
            unrecorded: unrecordedLanded + unrecordedFailed,
            landed: unrecordedLanded,
            failed: unrecordedFailed,
          })
        : "",
    );
    setWebhookHistory(getWebhookHistory());
    setRetryNote(
      bulkResendNote({
        attempted: failures.length,
        accepted,
        failed,
        stale: staleFailures,
      }),
    );
  }

  /**
   * Give the browser its room back, at the rep's request.
   *
   * The record warning says a send could not be stored because the origin is
   * full; this is the way out of that state, and it is the rep's action rather
   * than something the panel does on its own. What it drops is this browser's
   * record of every attempt — no send leaves the CRM — but a failure's stored
   * body is the only copy a retry can post, so the count of sends that could
   * still be resent is named in the confirmation and in the note afterwards.
   */
  function handleClearHistory() {
    const cleared = webhookHistory.length;
    const resendable = resendableFailures.length;
    clearWebhookHistory();
    setWebhookHistory([]);
    setExpandedHistoryId(null);
    // A resend note describes rows the batch was working from; those rows are
    // gone, so the note goes with them rather than reading as a recent result.
    setRetryNote("");
    setClearConfirm(false);
    // The rows the sweep's note counts are among those just cleared, so the note
    // goes with them rather than outliving what it describes. It is its own
    // component now, so this restarts it instead of reaching into its state: a
    // remount reads the acknowledged key and finds nothing to say.
    acknowledgeWebhookHistoryDrops();
    setDropsNoteKey((key) => key + 1);
    setClearNote(
      resendable > 0
        ? `Cleared ${cleared === 1 ? "1 send" : `${cleared} sends`} from this browser, including ${
            resendable === 1 ? "the failed send" : `${resendable} failed sends`
          } that could be resent. Every send the CRM accepted is still there.`
        : `Cleared ${cleared === 1 ? "1 send" : `${cleared} sends`} from this browser. Every send the CRM accepted is still there.`,
    );
  }

  /**
   * Drop one row from this browser's list, at the rep's request.
   *
   * The ceilings keep the newest send even when it alone is over the budget, so
   * one oversized failure can be the whole history — and until now the only way
   * out was clearing every room's rows with it. Dropping the row is asked in two
   * clicks, like the clear action beside the list, because a failed row holds the
   * only copy of the body a retry could post. The store is re-read rather than
   * filtered here: a write this browser refuses leaves the row recorded, and the
   * list has to show the sends it holds rather than the ones the rep asked it to
   * let go of. The resend note is left alone — this drops one row, not the rows
   * that note was written from.
   */
  function handleRemoveHistoryClick(entry: CrmWebhookHistoryEntry) {
    if (confirmingHistoryId !== entry.id) {
      setConfirmingHistoryId(entry.id);
      return;
    }

    removeWebhookHistoryEntry(entry.id);
    const remaining = getWebhookHistory();
    setWebhookHistory(remaining);
    setConfirmingHistoryId(null);
    if (expandedHistoryId === entry.id) setExpandedHistoryId(null);
    // The clear confirmation counts the rows it would drop, and a history with
    // nothing left has nothing to confirm — the header's action goes the same way.
    if (remaining.length === 0) setClearConfirm(false);
  }

  // The failures this project recorded, the ones it can still resend, and the
  // ones with no body to post at all. That last count is what the bulk note
  // accounts for: a row already resent, or stored before bodies were kept, is
  // not a send the batch missed.
  const projectFailures = webhookHistory.filter(
    (entry) => entry.projectId === project.id && entry.status === "error",
  );
  // A failure the batch cannot offer is one that never stored a body. A row a
  // retry already delivered has no body either — the mark drops it — but it is
  // not a send this action missed, so it is not counted as one.
  const staleFailures = projectFailures.filter(
    (entry) => !entry.payload && !entry.retriedAt,
  ).length;
  const resendableFailures = resendableProjectFailures(webhookHistory, project.id);

  const payload = buildWebhookPayload(project);
  const curlSnippet = generateCurlSnippet(webhookUrl || "https://your-crm-webhook.example.com", payload);
  return (
    <div className="wm-crm-share-panel wm-ui-card rounded-2xl border p-5">
      <header className="mb-3">
        <div className="flex items-center gap-2 mb-1">
          <Building2 size={18} className="text-cyan-400" aria-hidden="true" />
          <p className="wm-ui-kicker">CRM Integration</p>
        </div>
        <h2 className="wm-ui-title text-lg font-black">Share to CRM</h2>
        <p className="wm-ui-copy text-sm opacity-70">
          Create an opportunity in your CRM platform with this project's details.
        </p>
      </header>

      {/* Copy summary */}
      <div className="mb-4">
        <button
          type="button"
          className="wm-ui-button wm-ui-button-secondary text-xs flex items-center gap-2"
          onClick={handleCopy}
        >
          {copied ? (
            <>
              <Check size={14} className="text-emerald-400" aria-hidden="true" />
              <span className="text-emerald-400">Copied to clipboard</span>
            </>
          ) : (
            <>
              <Copy size={14} aria-hidden="true" />
              Copy project summary to clipboard
            </>
          )}
        </button>
      </div>

      {/* CRM links */}
      <div className="wm-crm-platforms">
        {CRM_PLATFORMS.map((platform) => (
          <a
            key={platform.id}
            href={platform.buildUrl(data)}
            target="_blank"
            rel="noopener noreferrer"
            className="wm-crm-platform-link"
          >
            <span className={`font-bold text-sm ${platform.color}`}>{platform.name}</span>
            <ExternalLink size={12} className="opacity-40" aria-hidden="true" />
          </a>
        ))}
      </div>

      {/* Webhook section */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <button
          type="button"
          className="wm-ui-button wm-ui-button-secondary text-xs flex items-center gap-2 w-full justify-between"
          onClick={() => setShowWebhook(!showWebhook)}
        >
          <span className="flex items-center gap-2">
            <Send size={14} aria-hidden="true" />
            Send to CRM via Webhook
          </span>
          <Settings size={12} className="opacity-50" aria-hidden="true" />
        </button>

        {showWebhook && (
          <div className="mt-3 space-y-3">
            {/* Webhook URL input */}
            <div>
              <label htmlFor="webhook-url" className="block text-xs font-medium text-white/60 mb-1">
                Webhook Endpoint URL
              </label>
              <div className="flex gap-2">
                <input
                  id="webhook-url"
                  type="url"
                  placeholder="https://your-zoho-webhook.example.com"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrlState(e.target.value)}
                  className="wm-ui-input flex-1 text-xs"
                />
                <button
                  type="button"
                  className="wm-ui-button wm-ui-button-secondary text-xs px-3"
                  onClick={handleSaveWebhookUrl}
                >
                  Save
                </button>
              </div>
              <p className="text-[10px] text-white/40 mt-1">
                Configure a ZoHo CRM workflow webhook or any HTTP endpoint that accepts JSON.
              </p>
            </div>

            {/* Send button */}
            <div className="flex gap-2">
              <button
                type="button"
                className="wm-ui-button wm-ui-button-primary text-xs flex items-center gap-2 flex-1 justify-center"
                onClick={handleSendWebhook}
                disabled={webhookStatus === "sending" || !webhookUrl}
              >
                {webhookStatus === "sending" ? (
                  <>
                    <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                    Sending...
                  </>
                ) : webhookStatus === "success" ? (
                  <>
                    <Check size={14} className="text-emerald-400" aria-hidden="true" />
                    <span className="text-emerald-400">Sent successfully</span>
                  </>
                ) : (
                  <>
                    <Send size={14} aria-hidden="true" />
                    Send Project Summary
                  </>
                )}
              </button>
              <button
                type="button"
                className="wm-ui-button wm-ui-button-secondary text-xs px-3"
                onClick={() => setShowHistory(!showHistory)}
                title="Webhook send history"
              >
                <History size={14} aria-hidden="true" />
              </button>
            </div>

            {/* Payload preview — the exact JSON that will be sent */}
            <div>
              <button
                type="button"
                className="text-[10px] text-white/40 hover:text-white/60 flex items-center gap-1"
                onClick={() => setShowPayload(!showPayload)}
                aria-expanded={showPayload}
              >
                {showPayload ? "Hide" : "View"} payload — exact JSON sent to your endpoint
              </button>
              {showPayload && (
                <div className="mt-2">
                  <p className="text-[10px] text-white/40 mb-1">
                    Includes the discovery conversation trail (
                    {(payload.discoveryConversation ?? []).length} rows), room model,
                    products and proposal details.
                  </p>
                  <pre
                    className="wm-crm-webhook-curl text-[10px] overflow-x-auto max-h-72 overflow-y-auto"
                    data-testid="crm-webhook-payload"
                  >
                    {JSON.stringify(payload, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Error display */}
            {webhookStatus === "error" && webhookError && (
              <div className="wm-crm-webhook-error">
                <AlertCircle size={14} className="text-red-400 flex-shrink-0" aria-hidden="true" />
                <span className="text-xs text-red-300">{webhookError}</span>
              </div>
            )}

            {/* A send whose record this browser refused. The list below is where
                a rep checks what reached the CRM, so the missing row is named
                rather than left to be noticed. */}
            {recordWarning ? (
              <div
                className="wm-crm-webhook-error"
                role="alert"
                data-testid="crm-webhook-record-warning"
              >
                <AlertCircle size={14} className="text-amber-400 flex-shrink-0" aria-hidden="true" />
                <span className="text-xs text-amber-200">
                  {recordWarning}
                  {/* The way out is only offered while the history holds rows
                      for it to free, so the pointer goes when the action does. */}
                  {webhookHistory.length > 0 ? " Clearing the send history gives that storage back." : null}
                </span>
              </div>
            ) : null}

            {/* What the boot sweep had to drop. It is not an alert: nothing
                failed, and the rep is already where they would ask about the
                list. The note is shared with the project record's activity log
                — one wording, one dismissal — so this is the copy, not the
                only place it can be read. */}
            <WebhookDropsNote key={dropsNoteKey} />

            {/* cURL preview */}
            <div>
              <button
                type="button"
                className="text-[10px] text-white/40 hover:text-white/60 flex items-center gap-1"
                onClick={() => setShowCurl(!showCurl)}
              >
                {showCurl ? "Hide" : "Show"} cURL command for testing
              </button>
              {showCurl && (
                <pre className="wm-crm-webhook-curl mt-2 text-[10px] overflow-x-auto">
                  {curlSnippet}
                </pre>
              )}
            </div>

            {/* Webhook history */}
            {showHistory && (
              <div className="wm-crm-webhook-history">
                {/* The header carries the section name and up to two actions, so
                    it wraps rather than squeezing them on a narrow panel. */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <p className="text-xs font-medium text-white/60">Recent Sends</p>
                  {resendableFailures.length > 0 ? (
                    // One action for the whole row of red statuses, so a rep who
                    // changed the endpoint does not have to click each failure
                    // back in. It names this project because the list below is
                    // every project's sends.
                    <button
                      type="button"
                      className="wm-ui-button wm-ui-button-secondary text-[10px] flex items-center gap-1.5 disabled:opacity-40"
                      onClick={handleResendFailedSends}
                      disabled={bulkRetrying || retryingHistoryId !== null}
                      data-testid="crm-webhook-retry-failed"
                      aria-label={`Resend ${
                        resendableFailures.length === 1
                          ? "the failed send"
                          : `all ${resendableFailures.length} failed sends`
                      } for ${project.name}`}
                      title="Resend every failed send this project stored a payload for"
                    >
                      {bulkRetrying ? (
                        <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                      ) : (
                        <RotateCcw size={12} aria-hidden="true" />
                      )}
                      {resendableFailures.length === 1
                        ? "Resend the failed send"
                        : `Resend ${resendableFailures.length} failed sends`}
                    </button>
                  ) : null}
                  {webhookHistory.length > 0 && !clearConfirm ? (
                    // The way out of a full origin, offered beside the list it
                    // would free rather than only where a rep is told the send
                    // was not recorded, because the rows are what fills it.
                    <button
                      type="button"
                      className="wm-ui-button wm-ui-button-secondary text-[10px] flex items-center gap-1.5 disabled:opacity-40"
                      onClick={() => setClearConfirm(true)}
                      disabled={bulkRetrying || retryingHistoryId !== null}
                      data-testid="crm-webhook-clear-history"
                      aria-label="Clear the send history stored in this browser"
                      title="Delete every recorded send from this browser"
                    >
                      <Trash2 size={12} aria-hidden="true" />
                      Clear history
                    </button>
                  ) : null}
                </div>
                {clearConfirm ? (
                  // The list is every room's sends, and so is what this clears:
                  // the note says so, and says what the failures among them lose.
                  <div className="wm-crm-webhook-history-clear">
                    <p className="text-[10px] text-amber-200">
                      Clears all {webhookHistory.length} recorded sends from this browser, for every
                      room — not only this one.{" "}
                      {resendableFailures.length > 0
                        ? `${resendableFailures.length === 1 ? "The 1 failed send" : `The ${resendableFailures.length} failed sends`} this room can still resend ${
                            resendableFailures.length === 1 ? "loses" : "lose"
                          } the body kept ${resendableFailures.length === 1 ? "for it" : "for them"}.`
                        : "Nothing here can be resent, so no body is lost."}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="wm-ui-button wm-ui-button-secondary text-[10px] flex items-center gap-1.5"
                        onClick={handleClearHistory}
                        data-testid="crm-webhook-clear-history-confirm"
                        aria-label={`Clear all ${webhookHistory.length} recorded sends`}
                      >
                        <Trash2 size={12} aria-hidden="true" />
                        Clear {webhookHistory.length === 1 ? "1 send" : `${webhookHistory.length} sends`}
                      </button>
                      <button
                        type="button"
                        className="wm-ui-button wm-ui-button-secondary text-[10px]"
                        onClick={() => setClearConfirm(false)}
                        data-testid="crm-webhook-clear-history-cancel"
                      >
                        Keep history
                      </button>
                    </div>
                  </div>
                ) : null}
                {webhookHistory.length === 0 ? (
                  <p className="text-[10px] text-white/40">No webhook sends yet.</p>
                ) : (
                  <div className="space-y-1">
                    {webhookHistory.slice(0, 5).map((entry) => (
                      <div key={entry.id} className="wm-crm-webhook-history-item">
                        <div className="wm-crm-webhook-history-entry">
                          <span
                            className={`inline-block w-2 h-2 rounded-full ${
                              entry.status === "success" ? "bg-emerald-400" : "bg-red-400"
                            }`}
                          />
                          <span
                            className="wm-crm-webhook-history-name text-[10px] text-white/70 truncate flex-1"
                            title={entry.projectName}
                          >
                            {entry.projectName}
                          </span>
                          <span className="text-[10px] text-white/40">
                            {entry.httpStatus ?? "ERR"}
                          </span>
                          <span className="text-[10px] text-white/30">
                            {new Date(entry.sentAt).toLocaleTimeString()}
                          </span>
                          {entry.status === "error" && entry.retriedAt ? (
                            // The body was delivered on a later attempt, so the
                            // row stops offering it. The failure above stays:
                            // it is the record of what went wrong first.
                            <span
                              className="text-[10px] text-emerald-400 flex items-center gap-1"
                              data-testid={`crm-webhook-retried-${entry.id}`}
                              title={`Resent at ${new Date(entry.retriedAt).toLocaleTimeString()}`}
                            >
                              <Check size={12} aria-hidden="true" />
                              Resent
                            </span>
                          ) : entry.status === "error" && entry.payload ? (
                            // Only a failed send keeps its body, so only a failed
                            // send has something to resend. The row it started
                            // from stays as it was: the retry is its own attempt.
                            <button
                              type="button"
                              className="text-white/40 hover:text-white/70 disabled:opacity-40"
                              onClick={() => handleRetrySend(entry)}
                              disabled={retryingHistoryId !== null || bulkRetrying}
                              data-testid={`crm-webhook-retry-${entry.id}`}
                              aria-label={`Resend the attempt for ${entry.projectName} sent at ${new Date(entry.sentAt).toLocaleTimeString()}`}
                              title="Resend this attempt with the payload it stored"
                            >
                              {retryingHistoryId === entry.id ? (
                                <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                              ) : (
                                <RotateCcw size={12} aria-hidden="true" />
                              )}
                            </button>
                          ) : null}
                          {/* One row rather than all of them: the row a rep
                              wants gone can be the oversized one, and clearing
                              the list to reach it also drops every room's
                              record of the sends the CRM accepted. */}
                          <button
                            type="button"
                            className={`disabled:opacity-40 ${
                              confirmingHistoryId === entry.id
                                ? "text-amber-300 hover:text-amber-200"
                                : "text-white/40 hover:text-white/70"
                            }`}
                            onClick={() => handleRemoveHistoryClick(entry)}
                            onBlur={() => setConfirmingHistoryId(null)}
                            disabled={retryingHistoryId !== null || bulkRetrying}
                            data-testid={`crm-webhook-remove-${entry.id}`}
                            aria-label={
                              confirmingHistoryId === entry.id
                                ? `Confirm dropping the recorded send for ${entry.projectName}`
                                : `Drop the recorded send for ${entry.projectName} sent at ${new Date(entry.sentAt).toLocaleTimeString()}`
                            }
                            title={
                              confirmingHistoryId === entry.id
                                ? "Click again to drop this send from this browser's list"
                                : "Drop this send from this browser's list"
                            }
                          >
                            {confirmingHistoryId === entry.id ? (
                              <AlertTriangle size={12} aria-hidden="true" />
                            ) : (
                              <Trash2 size={12} aria-hidden="true" />
                            )}
                          </button>
                          <button
                            type="button"
                            className="text-white/40 hover:text-white/70"
                            onClick={() =>
                              setExpandedHistoryId(
                                expandedHistoryId === entry.id ? null : entry.id,
                              )
                            }
                            aria-expanded={expandedHistoryId === entry.id}
                            aria-label={`View conversation sent to CRM for ${entry.projectName}`}
                            title="View the discovery conversation that was sent"
                          >
                            {expandedHistoryId === entry.id ? (
                              <ChevronUp size={12} aria-hidden="true" />
                            ) : (
                              <ChevronDown size={12} aria-hidden="true" />
                            )}
                          </button>
                        </div>
                        {confirmingHistoryId === entry.id ? (
                          // Under the row it belongs to, which is why the item owns
                          // the divider: the cost is named where the rep is
                          // looking, and the row alone cannot carry a second line.
                          <p
                            className="text-[10px] text-amber-300 mt-1"
                            data-testid={`crm-webhook-remove-note-${entry.id}`}
                          >
                            {historyRemovalNote(entry)}
                          </p>
                        ) : null}
                        {entry.status === "error" && entry.errorMessage?.trim() ? (
                          // The row's "ERR" says that the send failed; this says
                          // why, so a rep does not have to guess at a status code.
                          <p
                            className="wm-crm-webhook-history-failure"
                            data-testid={`crm-webhook-failure-${entry.id}`}
                            title={entry.errorMessage.trim()}
                          >
                            {entry.errorMessage.trim()}
                          </p>
                        ) : null}
                        {expandedHistoryId === entry.id && (
                          <div
                           
                            data-testid={`crm-history-conversation-${entry.id}`}
                          >
                            {(entry.discoveryConversation ?? []).length === 0 ? (
                              <p className="text-[10px] text-white/40">
                                No discovery conversation captured for this send.
                              </p>
                            ) : (
                              <ul className="space-y-1.5">
                                {entry.discoveryConversation?.map((item, index) => (
                                  <li key={index} className="text-[10px]">
                                    <span className="text-white/60">{item.question}</span>
                                    <span className="text-white/80 block mt-0.5">
                                      {item.answer}
                                    </span>
                                    {item.note ? (
                                      <span className="text-white/40 block italic">
                                        “{item.note}”
                                      </span>
                                    ) : null}
                                    {item.confirmed ? (
                                      <span className="inline-block mt-0.5 text-[9px] text-emerald-400">
                                        ✓ Confirmed with customer
                                      </span>
                                    ) : null}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {retryNote ? (
                  <p
                    className="text-[10px] text-white/60 mt-2"
                    role="status"
                    data-testid="crm-webhook-retry-note"
                  >
                    {retryNote}
                  </p>
                ) : null}
                {/* Printed without a status role: the send warning owns that
                    role in this panel, and two of them make the announcement
                    ambiguous rather than twice as clear. */}
                {clearNote ? (
                  <p
                    className="text-[10px] text-white/60 mt-2"
                    data-testid="crm-webhook-clear-note"
                  >
                    {clearNote}
                  </p>
                ) : null}
              </div>
            )}
          </div>
        )}
      </div>

      <p className="text-xs opacity-40 mt-3">
        Opens a new deal form pre-filled with project details. Products and room specifications are copied to the clipboard for pasting into the CRM.
      </p>
    </div>
  );
}
