import type { CompetitorLookupTrace, CompetitorSpecRecord, LiveLookupResult } from "./types";

const LIVE_LOOKUP_ENABLED =
  String(import.meta.env.VITE_COMPETITOR_LIVE_LOOKUP ?? "").toLowerCase() === "true";
const DEFAULT_LOOKUP_ENDPOINT = "http://127.0.0.1:8787/api/wingman/competitor-lookup";

type BackendLookupTrace = {
  attempt?: number;
  status?: number;
  ok?: boolean;
  url?: string;
  error?: string;
  cacheHit?: boolean;
  rateLimited?: boolean;
  retryAfterMs?: number;
};

type BackendLookupPayload = {
  ok?: boolean;
  mode?: string;
  record?: CompetitorSpecRecord;
  warnings?: string[];
  trace?: BackendLookupTrace[];
  fetchedAt?: string;
};

function nowIso(): string {
  return new Date().toISOString();
}

function trace(
  stage: CompetitorLookupTrace["stage"],
  message: string,
  extra: Partial<CompetitorLookupTrace> = {},
): CompetitorLookupTrace {
  return {
    stage,
    message,
    updatedAt: nowIso(),
    ...extra,
  };
}

function lookupEndpoint(): string {
  const configured = String(import.meta.env.VITE_COMPETITOR_LOOKUP_ENDPOINT ?? "").trim();
  return configured || DEFAULT_LOOKUP_ENDPOINT;
}

function modeToLabel(mode: string | undefined, hasRecord: boolean): string {
  switch (mode) {
    case "manufacturer-lookup":
      return "Live manufacturer match";
    case "catalog-fallback":
      return "Merged catalog fallback";
    case "synthetic-fallback":
      return hasRecord ? "Synthetic fallback" : "No verified source found";
    case "disabled":
      return "Live lookup disabled";
    default:
      return hasRecord ? "Lookup resolved" : "Dataset only";
  }
}

function modeSourceLabel(mode: string | undefined): string {
  switch (mode) {
    case "manufacturer-lookup":
      return "Manufacturer source";
    case "catalog-fallback":
      return "Merged competitor catalog";
    case "synthetic-fallback":
      return "Fallback synthesis";
    default:
      return "Live lookup";
  }
}

function mapBackendTrace(entry: BackendLookupTrace, index: number): CompetitorLookupTrace {
  const status = Number(entry.status) || 0;
  const label = entry.cacheHit
    ? "Lookup cache"
    : entry.rateLimited
    ? "Rate limit"
    : `Web attempt ${entry.attempt || index + 1}`;

  let message = entry.cacheHit
    ? "Used cached lookup result"
    : entry.ok
    ? `Fetched ${status > 0 ? `HTTP ${status}` : "manufacturer source"}`
    : entry.rateLimited
    ? `Rate limited${entry.retryAfterMs ? `, retry in ${Math.ceil(entry.retryAfterMs / 1000)}s` : ""}`
    : entry.error || "Lookup attempt failed";

  if (entry.url) {
    message = `${message}: ${entry.url}`;
  }

  return trace("web", message, {
    sourceLabel: label,
    checkedUrl: entry.url,
    usedLiveData: Boolean(entry.ok || entry.cacheHit),
  });
}

export async function verifyCompetitorLive(
  brand: string,
  sku: string,
): Promise<LiveLookupResult> {
  const output: CompetitorLookupTrace[] = [];

  output.push(
    trace("dataset", "Searching internal competitor dataset", {
      sourceLabel: "Wingman dataset",
      usedLiveData: false,
    }),
  );

  if (!LIVE_LOOKUP_ENABLED) {
    output.push(
      trace("done", "Live lookup disabled. Using dataset-only comparison.", {
        sourceLabel: "Configuration",
        usedLiveData: false,
      }),
    );

    return { trace: output };
  }

  output.push(
    trace("web", "Checking manufacturer pages and wider web sources", {
      sourceLabel: "Live lookup",
      usedLiveData: false,
    }),
  );

  try {
    const response = await fetch(lookupEndpoint(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: [brand, sku].filter(Boolean).join(" ").trim(),
        brand,
        sku,
      }),
    });

    if (!response.ok) {
      throw new Error(`Lookup failed with status ${response.status}`);
    }

    const data = (await response.json()) as BackendLookupPayload;
    const backendTrace = Array.isArray(data.trace) ? data.trace.map((entry, index) => mapBackendTrace(entry, index)) : [];
    const warnings = Array.isArray(data.warnings) ? data.warnings.filter(Boolean) : [];
    const record = data.record;
    const sourceLabel = modeSourceLabel(data.mode);
    const checkedUrl = record?.sourceUrl || data.trace?.find((entry) => entry?.ok && entry.url)?.url;

    output.push(...backendTrace);
    output.push(
      ...warnings.slice(0, 3).map((warning) =>
        trace("web", warning, {
          sourceLabel,
          checkedUrl,
          usedLiveData: Boolean(record),
        }),
      ),
    );

    if (record) {
      output.push(
        trace("extract", "Competitor record received from active lookup source", {
          sourceLabel,
          checkedUrl,
          usedLiveData: data.mode === "manufacturer-lookup",
        }),
      );

      output.push(
        trace("match", "Normalising competitor record and finding WyreStorm equivalent", {
          sourceLabel: "Comparison engine",
          checkedUrl,
          usedLiveData: Boolean(record),
        }),
      );
    }

    output.push(
      trace(
        "done",
        modeToLabel(data.mode, Boolean(record)),
        {
          sourceLabel,
          checkedUrl,
          usedLiveData: data.mode === "manufacturer-lookup",
        },
      ),
    );

    return {
      trace: output,
      record,
      mode: data.mode,
      warnings,
    };
  } catch (error) {
    output.push(
      trace(
        "error",
        error instanceof Error ? error.message : "Unknown live lookup error",
        {
          sourceLabel: "Live lookup",
          usedLiveData: false,
        },
      ),
    );

    output.push(
      trace("done", "Falling back to dataset-only comparison", {
        sourceLabel: "Wingman dataset",
        usedLiveData: false,
      }),
    );

    return {
      trace: output,
      error: error instanceof Error ? error.message : "Unknown live lookup error",
      mode: "request-failed",
    };
  }
}
