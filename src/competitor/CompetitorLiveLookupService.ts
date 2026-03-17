import type { CompetitorLookupTrace, CompetitorSpecRecord, LiveLookupResult } from "./types";

const LIVE_LOOKUP_ENABLED =
  String(import.meta.env.VITE_COMPETITOR_LIVE_LOOKUP ?? "").toLowerCase() === "true";

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
    trace("web", "Checking live manufacturer data", {
      sourceLabel: "Live lookup",
      usedLiveData: false,
    }),
  );

  try {
    const response = await fetch("http://127.0.0.1:8787/api/wingman/competitor-lookup", {
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

    const data = (await response.json()) as {
      checkedUrl?: string;
      product?: CompetitorSpecRecord;
      confidence?: number;
    };

    output.push(
      trace("extract", "Live specification data received", {
        sourceLabel: "Manufacturer website",
        checkedUrl: data.checkedUrl,
        usedLiveData: Boolean(data.product),
        confidence: data.confidence,
      }),
    );

    output.push(
      trace("match", "Normalising specifications and finding WyreStorm equivalent", {
        sourceLabel: "Comparison engine",
        checkedUrl: data.checkedUrl,
        usedLiveData: Boolean(data.product),
        confidence: data.confidence,
      }),
    );

    output.push(
      trace(
        "done",
        data.product ? "Live verification completed" : "No live product page data found",
        {
          sourceLabel: "Manufacturer website",
          checkedUrl: data.checkedUrl,
          usedLiveData: Boolean(data.product),
          confidence: data.confidence,
        },
      ),
    );

    return {
      trace: output,
      record: data.product,
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
    };
  }
}