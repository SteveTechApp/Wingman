export type GuruMode =
  | "general"
  | "wyrestorm"
  | "project"
  | "design"
  | "troubleshooting"
  | "training";

export type GuruResponse = {
  answer: string;
  confidence: string;
  sources: string[];
  suggestedSkus: string[];
  reasoning: string[];
  followOns: string[];
};

export type AskGuruRequest = {
  question: string;
  extraContext?: string;
  mode: GuruMode;
  history?: string[];
};

export type GuruHealth = {
  ok: boolean;
  model: string;
  hasKey: boolean;
};

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((x) => String(x)).filter(Boolean) : [];
}

function normalizeGuruResponse(raw: any): GuruResponse {
  return {
    answer:
      typeof raw?.answer === "string" && raw.answer.trim()
        ? raw.answer.trim()
        : "No answer returned.",
    confidence:
      typeof raw?.confidence === "string" && raw.confidence.trim()
        ? raw.confidence.trim()
        : "Medium",
    sources: asStringArray(raw?.sources),
    suggestedSkus: asStringArray(raw?.suggestedSkus),
    reasoning: asStringArray(raw?.reasoning),
    followOns: asStringArray(raw?.followOns),
  };
}

export async function getGuruHealth(signal?: AbortSignal): Promise<GuruHealth> {
  const response = await fetch("/api/wingman/guru/health", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Guru health check failed (${response.status}).`);
  }

  return response.json();
}

export async function askGuru(
  payload: AskGuruRequest,
  signal?: AbortSignal
): Promise<GuruResponse> {
  const response = await fetch("/api/wingman/guru/ask", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    signal,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let detail = "";
    try {
      const err = await response.json();
      if (typeof err?.error === "string" && err.error.trim()) {
        detail = " " + err.error.trim();
      }
    } catch {
      // ignore
    }

    throw new Error(`Guru request failed (${response.status}).${detail}`);
  }

  const data = await response.json();
  return normalizeGuruResponse(data);
}
