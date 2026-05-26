export type CompareIntelligenceRequest = {
  brand: string;
  sku: string;
  productName?: string;
  rawText?: string;
  productUrl?: string;
  allowWeb?: boolean;
};

export type CompareIntelligenceResult = {
  ok: boolean;
  query?: {
    brand?: string;
    sku?: string;
    productName?: string;
    productUrl?: string;
    allowWeb?: boolean;
  };
  competitor?: {
    brand?: string;
    sku?: string;
    productName?: string;
    category?: string;
    categoryLabel?: string;
    categoryConfidence?: number;
    wyrestormOverlap?: boolean;
    purposeRole?: string;
    purposeLabel?: string;
    purposeConfidence?: string;
    specProfile?: Record<string, unknown>;
    alternatives?: Array<Record<string, unknown>>;
  };
  wyrestorm?: {
    attempted?: boolean;
    matchStatus?: string;
    message?: string;
    candidates?: Array<{
      sku?: string;
      name?: string;
      family?: string;
      score?: number;
      confidence?: number;
      activeSku?: string;
      lifecycleStatus?: string;
      recommendationStatus?: string;
      lifecycleSource?: string;
      lifecycleWarning?: string;
      candidateCategory?: string;
      candidateCategoryLabel?: string;
      competitorPurpose?: string;
      candidatePurpose?: string;
      purposeRole?: string;
      purposeMatch?: string;
      reasons?: string[];
    }>;
  };
  evidence?: {
    webSearchAttempted?: boolean;
    queries?: string[];
    pagesRead?: number;
    usefulPages?: number;
    sources?: Array<{
      url?: string;
      title?: string;
      status?: number;
      ok?: boolean;
      containsSku?: boolean;
      containsName?: boolean;
      excerpt?: string;
    }>;
  };
  error?: string;
};

function resolveCompareApiBaseUrl() {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  const configured = (env?.VITE_COMPARE_INTELLIGENCE_URL || env?.VITE_COMPETITOR_LOOKUP_URL || "").trim();

  if (configured.length > 0) {
    return configured.replace(/\/+$/, "");
  }

  if (typeof window !== "undefined") {
    const host = window.location.hostname;

    if (host === "127.0.0.1" || host === "localhost") {
      return "http://127.0.0.1:13000";
    }
  }

  return "";
}

export async function lookupCompareIntelligence(
  request: CompareIntelligenceRequest,
): Promise<CompareIntelligenceResult> {
  const baseUrl = resolveCompareApiBaseUrl();

  const response = await fetch(`${baseUrl}/api/compare/intelligence`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(request),
  });

  const result = (await response.json()) as CompareIntelligenceResult;

  if (!response.ok) {
    throw new Error(result.error || `Compare lookup failed with HTTP ${response.status}`);
  }

  return result;
}
