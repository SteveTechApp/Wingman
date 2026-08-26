import { useState, useEffect } from "react";
import { ExternalLink, Copy, Check, Building2, Send, Settings, History, AlertCircle, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import type { StoredProject } from "../data/projectStore";
import {
  getWebhookUrl,
  setWebhookUrl,
  buildWebhookPayload,
  sendWebhook,
  recordWebhookHistory,
  getWebhookHistory,
  generateCurlSnippet,
  type CrmWebhookStatus,
  type CrmWebhookHistoryEntry,
} from "../lib/crmWebhook";

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

export function CrmSharePanel({ project }: { project: StoredProject }) {
  const [copied, setCopied] = useState(false);
  const [showWebhook, setShowWebhook] = useState(false);
  const [webhookUrl, setWebhookUrlState] = useState("");
  const [webhookStatus, setWebhookStatus] = useState<CrmWebhookStatus>("idle");
  const [webhookError, setWebhookError] = useState("");
  const [webhookHistory, setWebhookHistory] = useState<CrmWebhookHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
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

    try {
      const payload = buildWebhookPayload(project);
      const result = await sendWebhook(payload);

      const historyEntry: CrmWebhookHistoryEntry = {
        id: `wh-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        projectId: project.id,
        projectName: project.name,
        sentAt: new Date().toISOString(),
        status: result.ok ? "success" : "error",
        httpStatus: result.status,
        errorMessage: result.ok ? undefined : `HTTP ${result.status} ${result.statusText}`,
        discoveryConversation: payload.discoveryConversation,
      };

      recordWebhookHistory(historyEntry);
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

      const historyEntry: CrmWebhookHistoryEntry = {
        id: `wh-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        projectId: project.id,
        projectName: project.name,
        sentAt: new Date().toISOString(),
        status: "error",
        errorMessage: message,
        discoveryConversation: payload.discoveryConversation,
      };
      recordWebhookHistory(historyEntry);
      setWebhookHistory(getWebhookHistory());
    }
  }

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
                <p className="text-xs font-medium text-white/60 mb-2">Recent Sends</p>
                {webhookHistory.length === 0 ? (
                  <p className="text-[10px] text-white/40">No webhook sends yet.</p>
                ) : (
                  <div className="space-y-1">
                    {webhookHistory.slice(0, 5).map((entry) => (
                      <div key={entry.id}>
                        <div className="wm-crm-webhook-history-entry">
                          <span
                            className={`inline-block w-2 h-2 rounded-full ${
                              entry.status === "success" ? "bg-emerald-400" : "bg-red-400"
                            }`}
                          />
                          <span className="text-[10px] text-white/70 truncate flex-1">
                            {entry.projectName}
                          </span>
                          <span className="text-[10px] text-white/40">
                            {entry.httpStatus ?? "ERR"}
                          </span>
                          <span className="text-[10px] text-white/30">
                            {new Date(entry.sentAt).toLocaleTimeString()}
                          </span>
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
                        {expandedHistoryId === entry.id && (
                          <div
                            className="wm-crm-webhook-history-conversation"
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
