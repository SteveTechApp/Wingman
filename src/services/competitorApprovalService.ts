import type { CompetitorLookupCacheEntrySummary } from "@/services/competitorLookupService";

export type CompetitorApprovalQueueRecord = {
  id: string;
  cacheKey: string;
  brand: string;
  sku: string;
  name: string;
  source: string;
  sourceUrl?: string;
  approvedAt: string;
  approvedBy: string;
  notes?: string;
};

export type SaveApprovedLookupResult = {
  ok: true;
  mode: "endpoint" | "queue";
  message: string;
  record: CompetitorApprovalQueueRecord;
  warnings: string[];
};

export type FlushApprovalQueueResult = {
  ok: true;
  sent: number;
  failed: number;
  remaining: number;
  warnings: string[];
};

const APPROVAL_QUEUE_KEY = "wm_competitor_approval_queue_v1";
const APPROVAL_ENDPOINT = String(import.meta.env.VITE_COMPETITOR_APPROVAL_ENDPOINT ?? "").trim();

function nowIso(): string {
  return new Date().toISOString();
}

function tidy(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeId(value: unknown): string {
  return tidy(value).toLowerCase().replace(/[\s_\-/]+/g, "");
}

function normalizeSku(value: unknown): string {
  return tidy(value).toUpperCase();
}

function recordId(brand: string, sku: string): string {
  return `${normalizeId(brand)}::${normalizeSku(sku)}`;
}

function readQueue(): CompetitorApprovalQueueRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(APPROVAL_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CompetitorApprovalQueueRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(records: CompetitorApprovalQueueRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(APPROVAL_QUEUE_KEY, JSON.stringify(records));
  } catch {
  }
}

function upsertQueue(record: CompetitorApprovalQueueRecord): void {
  const queue = readQueue();
  const index = queue.findIndex((item) => item.id === record.id);
  if (index >= 0) queue[index] = record;
  else queue.unshift(record);
  writeQueue(queue);
}

function removeQueueIds(ids: Set<string>): void {
  if (ids.size === 0) return;
  const next = readQueue().filter((item) => !ids.has(item.id));
  writeQueue(next);
}

async function postJsonWithRetry(
  endpoint: string,
  payload: unknown,
  options?: { attempts?: number; timeoutMs?: number },
): Promise<{ ok: boolean; status: number; warning?: string }> {
  if (!endpoint || typeof fetch !== "function") {
    return { ok: false, status: 0, warning: "Approval endpoint is not configured." };
  }

  const attempts = Math.max(1, Number(options?.attempts ?? 2));
  const timeoutMs = Math.max(1000, Number(options?.timeoutMs ?? 4500));

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller?.signal,
      });

      if (timeout != null) clearTimeout(timeout);
      if (response.ok) return { ok: true, status: response.status };
      if (attempt === attempts) {
        return {
          ok: false,
          status: response.status,
          warning: `Approval endpoint returned HTTP ${response.status}.`,
        };
      }
    } catch {
      if (timeout != null) clearTimeout(timeout);
      if (attempt === attempts) {
        return {
          ok: false,
          status: 0,
          warning: "Approval endpoint request failed.",
        };
      }
    }
  }

  return { ok: false, status: 0, warning: "Approval endpoint request failed." };
}

function toQueueRecord(
  entry: CompetitorLookupCacheEntrySummary,
  opts?: { notes?: string; approvedBy?: string },
): CompetitorApprovalQueueRecord {
  const brand = tidy(entry.brand) || "Unknown";
  const sku = normalizeSku(entry.sku);
  return {
    id: recordId(brand, sku),
    cacheKey: tidy(entry.cacheKey),
    brand,
    sku,
    name: tidy(entry.name) || sku,
    source: tidy(entry.source) || "unknown",
    sourceUrl: tidy(entry.sourceUrl) || undefined,
    approvedAt: nowIso(),
    approvedBy: tidy(opts?.approvedBy) || "wingman-user",
    notes: tidy(opts?.notes) || undefined,
  };
}

export function getCompetitorApprovalEndpoint(): string | null {
  return APPROVAL_ENDPOINT || null;
}

export function getApprovalQueueEntries(): CompetitorApprovalQueueRecord[] {
  return readQueue();
}

export function clearApprovalQueue(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(APPROVAL_QUEUE_KEY);
  } catch {
  }
}

export async function saveApprovedLookupEntry(
  entry: CompetitorLookupCacheEntrySummary,
  opts?: { notes?: string; approvedBy?: string },
): Promise<SaveApprovedLookupResult> {
  const record = toQueueRecord(entry, opts);
  const warnings: string[] = [];

  if (APPROVAL_ENDPOINT) {
    const posted = await postJsonWithRetry(APPROVAL_ENDPOINT, record);
    if (posted.ok) {
      return {
        ok: true,
        mode: "endpoint",
        message: `Approved ${record.brand} ${record.sku} saved to competitor DB endpoint.`,
        record,
        warnings,
      };
    }
    if (posted.warning) warnings.push(posted.warning);
  } else {
    warnings.push("Approval endpoint is not configured; record queued locally.");
  }

  upsertQueue(record);
  return {
    ok: true,
    mode: "queue",
    message: `Approved ${record.brand} ${record.sku} queued locally for later sync.`,
    record,
    warnings,
  };
}

export async function flushApprovalQueue(): Promise<FlushApprovalQueueResult> {
  const warnings: string[] = [];
  const queue = readQueue();
  if (!APPROVAL_ENDPOINT) {
    return {
      ok: true,
      sent: 0,
      failed: queue.length,
      remaining: queue.length,
      warnings: ["Approval endpoint is not configured."],
    };
  }

  let sent = 0;
  let failed = 0;
  const sentIds = new Set<string>();

  for (const entry of queue) {
    const posted = await postJsonWithRetry(APPROVAL_ENDPOINT, entry);
    if (posted.ok) {
      sent += 1;
      sentIds.add(entry.id);
    } else {
      failed += 1;
      if (posted.warning) warnings.push(`${entry.brand} ${entry.sku}: ${posted.warning}`);
    }
  }

  removeQueueIds(sentIds);
  const remaining = readQueue().length;

  return {
    ok: true,
    sent,
    failed,
    remaining,
    warnings,
  };
}

