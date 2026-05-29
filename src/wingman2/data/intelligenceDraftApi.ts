export type IntelligenceDraftBuildRequest = {
  brand?: string;
  sku: string;
  productName?: string;
  productUrl?: string;
  rawText?: string;
  allowWeb?: boolean;
};

export type IntelligenceDraftBuildResponse = {
  ok: boolean;
  mode?: string;
  error?: string;
  record?: unknown;
  warnings?: string[];
  file?: string;
};

function wingmanApiBase() {
  const meta = import.meta as unknown as { env?: Record<string, string | undefined> };
  const env = meta.env ?? {};
  return (env.VITE_WINGMAN_API_BASE_URL || env.VITE_WINGMAN_API_BASE || "http://127.0.0.1:8787").replace(/\/$/, "");
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${wingmanApiBase()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof payload?.error === "string" ? payload.error : `Request failed: ${response.status}`);
  }
  return payload as T;
}

export function buildCompetitorIntelligenceDraft(input: IntelligenceDraftBuildRequest) {
  return postJson<IntelligenceDraftBuildResponse>("/api/intelligence/build-competitor", input);
}

export function buildWyrestormIntelligenceDraft(input: IntelligenceDraftBuildRequest) {
  return postJson<IntelligenceDraftBuildResponse>("/api/intelligence/build-wyrestorm", input);
}

export async function getIntelligenceDrafts(query = "") {
  const url = new URL(`${wingmanApiBase()}/api/intelligence/drafts`);
  if (query.trim()) url.searchParams.set("q", query.trim());

  const response = await fetch(url.toString(), { credentials: "include" });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(typeof payload?.error === "string" ? payload.error : `Request failed: ${response.status}`);
  }

  return payload;
}