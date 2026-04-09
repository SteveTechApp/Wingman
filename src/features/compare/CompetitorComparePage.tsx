import { useMemo, useState } from "react";
import { ArrowRight, ExternalLink, RefreshCcw, Save, Search } from "lucide-react";

import {
  WingmanEmptyState,
  WingmanPageFrame,
  WingmanSection,
  WingmanStatStrip,
  type WingmanStatItem,
} from "@/components/wm";

type JsonMap = Record<string, unknown>;
type CompareTab = "selected" | "shortlist" | "manual";

type NormalizedLookupResult = {
  status: string;
  matches: JsonMap[];
  shortlist: JsonMap[];
  selectedFit: JsonMap | null;
  manualMapping: unknown;
  message: string;
};

const BRAND_OPTIONS = [
  "Atlona",
  "Extron",
  "Kramer",
  "Lightware",
  "Crestron",
  "AMX",
  "Aurora",
  "Liberty",
  "Visionary",
  "Other",
];

function isRecord(value: unknown): value is JsonMap {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asArray(value: unknown): JsonMap[] {
  if (Array.isArray(value)) {
    return value.filter(isRecord);
  }
  return [];
}

function firstRecord(...values: unknown[]): JsonMap | null {
    for (const value of values) {
    if (isRecord(value)) return value;
  }
  return null;
}

function pickText(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

function normalizeLookupResponse(raw: unknown): NormalizedLookupResult {
  if (!isRecord(raw)) {
    return {
      status: "No response",
      matches: [],
      shortlist: [],
      selectedFit: null,
      manualMapping: null,
      message: "The service did not return a structured payload.",
    };
  }

  const matches =
    asArray(raw.matches) ??
    asArray(raw.candidates) ??
    asArray(raw.results) ??
    asArray(raw.shortlist);

  const shortlist =
    asArray(raw.shortlist).length > 0
      ? asArray(raw.shortlist)
      : matches;

  const selectedFit =
    firstRecord(raw.selectedFit, raw.bestFit, raw.bestMatch, raw.fit) ??
    (matches.length > 0 ? matches[0] : null);

  const manualMapping =
    raw.manualMapping ??
    raw.mapping ??
    raw.fallback ??
    raw.alternatives ??
    null;

  const status = pickText(
    raw.status,
    raw.outcome,
    raw.state,
    matches.length > 0 ? "Lookup complete" : "No matches"
  ) || "Lookup complete";

  const message = pickText(
    raw.message,
    raw.summary,
    raw.note,
    matches.length > 0
      ? "Review the selected fit and shortlist below."
      : "No shortlist was returned by the lookup."
  );

  return {
    status,
    matches,
    shortlist,
    selectedFit,
    manualMapping,
    message,
  };
}

function getItemTitle(item: JsonMap | null): string {
  if (!item) return "No fit selected";

  return (
    pickText(
      item.title,
      item.name,
      item.productName,
      item.model,
      item.sku,
      item.id
    ) || "Untitled result"
  );
}

function getItemSubtitle(item: JsonMap | null): string {
  if (!item) return "";

  const brand = pickText(item.brand, item.vendor, item.manufacturer);
  const sku = pickText(item.sku, item.model, item.partNumber);
  const confidence = pickText(item.confidence, item.score, item.matchScore);

  const parts = [brand, sku ? `SKU ${sku}` : "", confidence ? `Confidence ${confidence}` : ""]
    .filter(Boolean);

  return parts.join(" â€¢ ");
}

function renderValue(value: unknown): string {
  if (value === null || value === undefined) return "â€”";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "â€”";
  }
}

async function tryLookup(brand: string, sku: string): Promise<NormalizedLookupResult> {
  const encodedBrand = encodeURIComponent(brand);
  const encodedSku = encodeURIComponent(sku);

  const attempts: Array<{
    url: string;
    method: "GET" | "POST";
    body?: unknown;
  }> = [
    {
      url: "/api/competitor-lookup",
      method: "POST",
      body: { brand, sku },
    },
    {
      url: "/api/competitor-lookup",
      method: "POST",
      body: { competitorBrand: brand, competitorSku: sku },
    },
    {
      url: `/api/competitor-lookup?brand=${encodedBrand}&sku=${encodedSku}`,
      method: "GET",
    },
    {
      url: `/api/competitor-lookup?competitorBrand=${encodedBrand}&competitorSku=${encodedSku}`,
      method: "GET",
    },
  ];

  let lastError = "Lookup failed.";

  for (const attempt of attempts) {
    try {
      const response = await fetch(attempt.url, {
        method: attempt.method,
        headers: attempt.method === "POST" ? { "Content-Type": "application/json" } : undefined,
        body: attempt.method === "POST" ? JSON.stringify(attempt.body ?? {}) : undefined,
      });

      if (!response.ok) {
        lastError = `Lookup failed (${response.status})`;
        continue;
      }

      const json = (await response.json()) as unknown;
      return normalizeLookupResponse(json);
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Lookup failed.";
    }
  }

  throw new Error(lastError);
}

function ResultCard({
  item,
  onSelect,
  selected = false,
}: {
  item: JsonMap;
  onSelect?: () => void;
  selected?: boolean;
}) {
  const title = getItemTitle(item);
  const subtitle = getItemSubtitle(item);
  const reason = pickText(item.reason, item.rationale, item.summary, item.notes);

  return (
    <div
      className="wm-stat"
      style={{
        borderColor: selected ? "var(--wm-accent-line)" : undefined,
        background: selected ? "var(--wm-accent-wash)" : undefined,
      }}
    >
      <div className="wm-stack-sm">
        <div className="wm-stack-xs">
          <p className="wm-stat__label">Candidate</p>
          <p className="wm-stat__value" style={{ fontSize: 20 }}>{title}</p>
          {subtitle ? <p className="wm-stat__meta">{subtitle}</p> : null}
        </div>

        {reason ? (
          <p className="wm-soft" style={{ margin: 0 }}>
            {reason}
          </p>
        ) : null}

        {onSelect ? (
          <div className="wm-flex">
            <button
              type="button"
              className={selected ? "wm-btn wm-btn--primary" : "wm-btn wm-btn--secondary"}
              onClick={onSelect}
            >
              {selected ? "Selected" : "Use as selected fit"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ManualMappingView({ value }: { value: unknown }) {
  if (Array.isArray(value) && value.length === 0) {
    return <WingmanEmptyState title="No manual mapping returned" body="The lookup did not return fallback mapping guidance." />;
  }

  if (isRecord(value)) {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return <WingmanEmptyState title="No manual mapping returned" body="The lookup did not return fallback mapping guidance." />;
    }

    return (
      <div className="wm-grid wm-grid--2">
        {entries.map(([key, itemValue]) => (
          <div className="wm-stat" key={key}>
            <p className="wm-stat__label">{key}</p>
            <pre
              className="wm-soft"
              style={{
                margin: 0,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontFamily: "inherit",
              }}
            >
              {renderValue(itemValue)}
            </pre>
          </div>
        ))}
      </div>
    );
  }

  if (Array.isArray(value)) {
    return (
      <div className="wm-grid wm-grid--2">
        {value.map((item, index) => (
          <div className="wm-stat" key={index}>
            <p className="wm-stat__label">Mapping {index + 1}</p>
            <pre
              className="wm-soft"
              style={{
                margin: 0,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontFamily: "inherit",
              }}
            >
              {renderValue(item)}
            </pre>
          </div>
        ))}
      </div>
    );
  }

  if (value === null || value === undefined || value === "") {
    return <WingmanEmptyState title="No manual mapping returned" body="The lookup did not return fallback mapping guidance." />;
  }

  return (
    <div className="wm-stat">
      <p className="wm-stat__label">Manual mapping</p>
      <pre
        className="wm-soft"
        style={{
          margin: 0,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontFamily: "inherit",
        }}
      >
        {renderValue(value)}
      </pre>
    </div>
  );
}

export default function CompetitorComparePage() {
  const [brand, setBrand] = useState("Atlona");
  const [sku, setSku] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<CompareTab>("selected");
  const [error, setError] = useState("");
  const [lookupResult, setLookupResult] = useState<NormalizedLookupResult | null>(null);
  const [selectedFit, setSelectedFit] = useState<JsonMap | null>(null);
  const [savedFit, setSavedFit] = useState(false);

  const statItems = useMemo<WingmanStatItem[]>(() => {
    const matchesCount = lookupResult?.matches.length ?? 0;
    const statusValue = loading ? "Looking up" : lookupResult?.status ?? "Idle";

    return [
      {
        label: "Status",
        value: statusValue,
        meta: error ? error : lookupResult?.message ?? "Enter a competitor SKU to enable lookup.",
      },
      {
        label: "Matches",
        value: String(matchesCount),
        meta: matchesCount > 0 ? "Candidate matches returned" : "No matches loaded",
      },
      {
        label: "Saved fit",
        value: savedFit ? "Saved" : "Not saved",
        meta: savedFit ? "Stored locally for this browser session" : "Ready to save selected fit",
      },
    ];
  }, [error, loading, lookupResult, savedFit]);

  const currentSelectedFit = selectedFit ?? lookupResult?.selectedFit ?? null;
  const shortlist = lookupResult?.shortlist ?? [];
  const manualMapping = lookupResult?.manualMapping ?? null;

  async function handleLookup() {
    const trimmedSku = sku.trim();
    if (!trimmedSku) {
      setError("Enter a competitor SKU to enable lookup.");
      return;
    }

    setLoading(true);
    setError("");
    setSavedFit(false);

    try {
      const result = await tryLookup(brand, trimmedSku);
      setLookupResult(result);
      setSelectedFit(result.selectedFit);
      setTab("selected");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lookup failed.";
      setLookupResult(null);
      setSelectedFit(null);
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setSku("");
    setError("");
    setLookupResult(null);
    setSelectedFit(null);
    setSavedFit(false);
    setTab("selected");
  }

  function handleSaveFit() {
    if (!currentSelectedFit) return;

    try {
      localStorage.setItem(
        "wm:competitor-compare:lastFit",
        JSON.stringify({
          brand,
          sku,
          savedAt: new Date().toISOString(),
          fit: currentSelectedFit,
        })
      );
      setSavedFit(true);
    } catch {
      setSavedFit(false);
      setError("Could not save fit in local storage.");
    }
  }

  return (
    <WingmanPageFrame
      eyebrow="Quick Reference"
      title="Competitor Compare"
      subtitle="Search on the left, then review the fit, shortlist, and manual mapping in a consistent Wingman workflow."
      actions={
        <>
          <button
            type="button"
            className="wm-btn wm-btn--secondary"
            onClick={() => {
              window.location.href = "/app/dashboard";
            }}
          >
            General sales mode
          </button>
          <button
            type="button"
            className="wm-btn wm-btn--brand"
            onClick={() => {
              window.location.href = "/app/tools";
            }}
          >
            Tools
          </button>
        </>
      }
      toolbar={
        <div className="wm-between" style={{ width: "100%" }}>
          <div className="wm-soft">Open catalogue to review mapped WyreStorm options and continue project flow.</div>
          <div className="wm-flex">
            <button
              type="button"
              className="wm-btn wm-btn--secondary"
              onClick={() => {
                window.location.href = "/app/tools/catalog";
              }}
            >
              Open catalogue
              <ExternalLink size={16} />
            </button>
          </div>
        </div>
      }
    >
      <WingmanSection
        eyebrow="Step 1"
        title="Competitor lookup"
        description="Start with a brand and competitor SKU or model. Live lookup will populate fit analysis and fallback mapping."
        actions={
          <div className="wm-flex">
            <button type="button" className="wm-btn wm-btn--secondary" onClick={handleClear}>
              <RefreshCcw size={16} />
              Clear
            </button>
            <button
              type="button"
              className="wm-btn wm-btn--primary"
              onClick={handleLookup}
              disabled={loading}
            >
              <Search size={16} />
              {loading ? "Looking up..." : "Look up live"}
            </button>
          </div>
        }
      >
        <div className="wm-grid wm-grid--3">
          <label className="wm-field">
            <span className="wm-field__label">Competitor brand</span>
            <select value={brand} onChange={(e) => setBrand(e.target.value)}>
              {BRAND_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="wm-field">
            <span className="wm-field__label">Competitor SKU or model</span>
            <input
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="Example: ZyPer4K or DTP3"
            />
          </label>

          <div className="wm-field">
            <span className="wm-field__label">Workflow guidance</span>
            <div className="wm-stat" style={{ height: "100%" }}>
              <p className="wm-soft" style={{ margin: 0 }}>
                {error
                  ? error
                  : sku.trim()
                    ? "Run lookup to populate fit, shortlist, and manual mapping."
                    : "Enter a competitor SKU to enable lookup."}
              </p>
            </div>
          </div>
        </div>
      </WingmanSection>

      <WingmanStatStrip items={statItems} />

      <WingmanSection
        eyebrow="Step 2"
        title="Comparison output"
        description="Review the selected fit, shortlist alternatives, and any manual mapping guidance returned by the service."
        actions={
          <div className="wm-flex">
            <button
              type="button"
              className={tab === "selected" ? "wm-pill is-active" : "wm-pill"}
              onClick={() => setTab("selected")}
            >
              Selected fit
            </button>
            <button
              type="button"
              className={tab === "shortlist" ? "wm-pill is-active" : "wm-pill"}
              onClick={() => setTab("shortlist")}
            >
              Shortlist
            </button>
            <button
              type="button"
              className={tab === "manual" ? "wm-pill is-active" : "wm-pill"}
              onClick={() => setTab("manual")}
            >
              Manual mapping
            </button>
          </div>
        }
      >
        {tab === "selected" ? (
          currentSelectedFit ? (
            <div className="wm-stack-md">
              <ResultCard item={currentSelectedFit} selected />

              <div className="wm-flex">
                <button type="button" className="wm-btn wm-btn--brand" onClick={handleSaveFit}>
                  <Save size={16} />
                  Save selected fit
                </button>

                <button
                  type="button"
                  className="wm-btn wm-btn--secondary"
                  onClick={() => {
                    window.location.href = "/app/tools/catalog";
                  }}
                >
                  Continue to catalogue
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          ) : (
            <WingmanEmptyState
              title="No comparison loaded yet"
              body="Search for a competitor SKU to populate the best-fit view and shortlist."
            />
          )
        ) : null}

        {tab === "shortlist" ? (
          shortlist.length > 0 ? (
            <div className="wm-grid wm-grid--2">
              {shortlist.map((item, index) => (
                <ResultCard
                  key={`${getItemTitle(item)}-${index}`}
                  item={item}
                  selected={currentSelectedFit === item}
                  onSelect={() => {
                    setSelectedFit(item);
                    setTab("selected");
                    setSavedFit(false);
                  }}
                />
              ))}
            </div>
          ) : (
            <WingmanEmptyState
              title="No shortlist available"
              body="Run a competitor lookup to populate candidate WyreStorm options."
            />
          )
        ) : null}

        {tab === "manual" ? <ManualMappingView value={manualMapping} /> : null}
      </WingmanSection>
    </WingmanPageFrame>
  );
}