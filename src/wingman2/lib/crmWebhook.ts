/**
 * CRM Webhook — configurable endpoint for sending project summaries
 * to ZoHo CRM or any webhook-compatible CRM platform.
 *
 * The webhook URL is stored in localStorage and can be changed at any time.
 * The payload is a JSON object containing the project summary, products,
 * room details, and CRM metadata.
 */

const CRM_WEBHOOK_URL_KEY = "wingman-crm-webhook-url";
const CRM_WEBHOOK_HISTORY_KEY = "wingman-crm-webhook-history";

export type CrmWebhookStatus = "idle" | "sending" | "success" | "error";

export type CrmWebhookHistoryEntry = {
  id: string;
  projectId: string;
  projectName: string;
  sentAt: string;
  status: "success" | "error";
  errorMessage?: string;
  httpStatus?: number;
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
 * Build the webhook payload from a StoredProject.
 */
export function buildWebhookPayload(project: {
  id: string;
  name: string;
  owner: string;
  stage: string;
  dealOutcome?: string;
  dealOutcomeWhy?: string;
  discoveryBrief?: { roomModel?: Record<string, unknown> };
  productSelections?: Array<{
    sku: string;
    title?: string;
    quantity?: number;
    family?: string;
    category?: string;
    status?: string;
    evidence?: string[];
  }>;
  proposal?: {
    title?: string;
    summary?: string;
    bomRows?: Array<{
      sku: string;
      description: string;
      role: string;
      qty: number;
      notes?: string;
    }>;
  };
}): CrmWebhookPayload {
  const roomModel = project.discoveryBrief?.roomModel ?? {};
  const getString = (key: string) =>
    typeof roomModel[key] === "string" ? String(roomModel[key]) : "";

  return {
    projectId: project.id,
    projectName: project.name || "Untitled Opportunity",
    customer: getString("clientName") || project.owner || "",
    site: getString("siteName") || "",
    stage: project.stage || "Discovery",
    dealOutcome: project.dealOutcome || undefined,
    dealOutcomeWhy: project.dealOutcomeWhy || undefined,
    roomModel: roomModel as Record<string, unknown>,
    products: (project.productSelections ?? []).map((p) => ({
      sku: p.sku,
      title: p.title,
      quantity: p.quantity ?? 1,
      family: p.family,
      category: p.category,
      status: p.status,
      evidence: p.evidence,
    })),
    proposalTitle: project.proposal?.title,
    proposalSummary: project.proposal?.summary,
    bomRows: project.proposal?.bomRows?.map((row) => ({
      sku: row.sku,
      description: row.description,
      role: row.role,
      qty: row.qty,
      notes: row.notes,
    })),
    generatedAt: new Date().toISOString(),
    source: "wingman",
  };
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
 * Record a webhook send attempt in history (localStorage).
 */
export function recordWebhookHistory(entry: CrmWebhookHistoryEntry): void {
  if (typeof window === "undefined") return;

  try {
    const raw = localStorage.getItem(CRM_WEBHOOK_HISTORY_KEY);
    const history: CrmWebhookHistoryEntry[] = raw ? JSON.parse(raw) : [];
    history.unshift(entry);
    // Keep last 20 entries
    localStorage.setItem(CRM_WEBHOOK_HISTORY_KEY, JSON.stringify(history.slice(0, 20)));
  } catch {
    // Ignore storage errors
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
 * Generate a cURL command snippet for the given payload.
 * Useful for testing the webhook endpoint outside of Wingman.
 */
export function generateCurlSnippet(url: string, payload: CrmWebhookPayload): string {
  return `curl -X POST "${url}" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(payload, null, 2).replace(/'/g, "'\\''")}'`;
}
