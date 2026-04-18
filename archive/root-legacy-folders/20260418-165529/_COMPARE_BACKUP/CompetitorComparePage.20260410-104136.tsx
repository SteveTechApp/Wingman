import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ExternalLink, RefreshCcw, Save, Search } from "lucide-react";

import {
  WingmanEmptyState,
  WingmanPageFrame,
  WingmanSection,
  WingmanStatStrip,
  type WingmanStatItem,
} from "@/components/wm";
import { resolveCompetitorMatchEndpoint } from "@/app/api/runtimeEndpoint";
import {
  applyCompareToProject,
  ensureActiveProject,
  type ProjectCompareRecord,
} from "@/features/projects/projectStore";

type JsonMap = Record<string, unknown>;
type CompareTab = "selected" | "shortlist" | "detail";
type ComparisonRow = {
  label: string;
  competitor: string;
  wyrestorm: string;
  matches: boolean;
};

type NormalizedLookupResult = {
  status: string;
  matches: JsonMap[];
  shortlist: JsonMap[];
  selectedFit: JsonMap | null;
  manualMapping: unknown;
  message: string;
  cacheHit: boolean;
  competitorUrl: string;
};

const COMPETITOR_MATCH_ENDPOINT = resolveCompetitorMatchEndpoint();

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

function normalizeMatchCandidate(value: unknown): JsonMap | null {
  if (!isRecord(value)) return null;

  const profile = isRecord(value.profile) ? value.profile : null;
  const sku = pickText(value.sku, profile?.model);
  const title = pickText(value.name, profile?.title, sku);
  const summary = pickText(value.summary, profile?.summary);
  const matchType = pickText(value.match_type, value.status);
  const confidence = pickText(value.confidence, value.confidence_score);
  const matchScore = pickText(value.match_score, value.score);

  return {
    brand: "WyreStorm",
    sku,
    name: title,
    title,
    summary,
    category: pickText(profile?.category, value.category),
    confidence,
    score: matchScore,
    reason: [matchType, summary].filter(Boolean).join(". "),
    matchType,
    matchScore,
    resolvedUrl: pickText(value.resolvedUrl, profile?.resolvedUrl, profile?.sourceUrl),
    comparisonRows: Array.isArray(value.comparison_rows) ? value.comparison_rows : [],
    breakdown: isRecord(value.breakdown) ? value.breakdown : null,
    profile: profile ?? undefined,
  };
}

function normalizeMatchCandidates(values: unknown): JsonMap[] {
  if (!Array.isArray(values)) return [];

  const out: JsonMap[] = [];
  for (const value of values) {
    const candidate = normalizeMatchCandidate(value);
    if (candidate) out.push(candidate);
  }

  return out;
}

function asComparisonRows(value: unknown): ComparisonRow[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!isRecord(item)) return null;
      const label = pickText(item.label);
      if (!label) return null;

      return {
        label,
        competitor: pickText(item.competitor) || "Unknown",
        wyrestorm: pickText(item.wyrestorm) || "Unknown",
        matches: Boolean(item.matches),
      };
    })
    .filter((item): item is ComparisonRow => item !== null);
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
      cacheHit: false,
      competitorUrl: "",
    };
  }

  const bestMatchRaw = isRecord(raw.best_match) ? raw.best_match : null;
  const competitorProduct = isRecord(raw.competitor_product) ? raw.competitor_product : null;
  const matchAlternatives = normalizeMatchCandidates(raw.alternatives);
  const bestMatch = normalizeMatchCandidate(bestMatchRaw);
  const competitorUrl = pickText(
    raw.resolved_competitor_url,
    competitorProduct?.resolvedUrl,
    competitorProduct?.sourceUrl,
  );

  if (bestMatch || matchAlternatives.length > 0 || competitorProduct) {
    const matches = bestMatch ? [bestMatch, ...matchAlternatives] : matchAlternatives;
    const matchType = bestMatchRaw ? pickText(bestMatchRaw.match_type) : "";
    const confidence = bestMatchRaw
      ? pickText(bestMatchRaw.confidence, bestMatchRaw.confidence_score)
      : "";
    const bestSummary = bestMatchRaw ? pickText(bestMatchRaw.summary) : "";

    return {
      status: raw.cacheHit ? "Cached live compare" : "Live compare ready",
      matches,
      shortlist: matchAlternatives,
      selectedFit: bestMatch,
      manualMapping: {
        competitorProduct,
        competitorUrl,
        comparisonRows: bestMatchRaw?.comparison_rows ?? [],
        scoreBreakdown: bestMatchRaw?.breakdown ?? null,
        wyrestormProfile: bestMatchRaw?.profile ?? null,
      },
      message:
        [matchType, confidence ? `${confidence} confidence` : "", bestSummary]
          .filter(Boolean)
          .join(" | ") || "Live compare completed.",
      cacheHit: Boolean(raw.cacheHit),
      competitorUrl,
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
    cacheHit: false,
    competitorUrl: "",
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

  const parts = [brand, sku ? `SKU ${sku}` : "", confidence ? `Confidence ${confidence}` : ""].filter(Boolean);

  return parts.join(" | ");
}

function renderValue(value: unknown): string {
  if (value === null || value === undefined) return "--";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "--";
  }
}

function getItemLink(item: JsonMap | null): string {
  if (!item) return "";
  return pickText(item.resolvedUrl, item.url, item.sourceUrl);
}

async function tryLookup(brand: string, sku: string): Promise<NormalizedLookupResult> {
  if (!COMPETITOR_MATCH_ENDPOINT) {
    throw new Error("Competitor match endpoint is not configured.");
  }

  const response = await fetch(COMPETITOR_MATCH_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      manufacturer: brand,
      model: sku,
    }),
  });

  let payload: unknown = null;
  try {
    payload = (await response.json()) as unknown;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    if (isRecord(payload)) {
      throw new Error(
        pickText(payload.error, payload.message, `Live compare failed (${response.status}).`),
      );
    }
    throw new Error(`Live compare failed (${response.status}).`);
  }

  return normalizeLookupResponse(payload);
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

function ComparisonDetailView({ value }: { value: unknown }) {
  if (!isRecord(value)) {
    return (
      <WingmanEmptyState
        title="No comparison detail available"
        body="Run a live compare to populate competitor source and scoring detail."
      />
    );
  }

  const competitorProduct = isRecord(value.competitorProduct) ? value.competitorProduct : null;
  const comparisonRows = asComparisonRows(value.comparisonRows);
  const scoreBreakdown = isRecord(value.scoreBreakdown) ? value.scoreBreakdown : null;
  const competitorUrl = pickText(value.competitorUrl);

  if (!competitorProduct && comparisonRows.length === 0 && !scoreBreakdown) {
    return (
      <WingmanEmptyState
        title="No comparison detail available"
        body="Run a live compare to populate competitor source and scoring detail."
      />
    );
  }

  return (
    <div className="wm-stack-md">
      {competitorProduct ? (
        <div className="wm-stat">
          <div className="wm-stack-sm">
            <div className="wm-stack-xs">
              <p className="wm-stat__label">Competitor source</p>
              <p className="wm-stat__value" style={{ fontSize: 20 }}>
                {pickText(
                  competitorProduct.title,
                  competitorProduct.model,
                  competitorProduct.manufacturer,
                  "Competitor product",
                )}
              </p>
              <p className="wm-stat__meta">
                {[
                  pickText(competitorProduct.manufacturer),
                  pickText(competitorProduct.model),
                  pickText(competitorProduct.transport),
                ]
                  .filter(Boolean)
                  .join(" | ")}
              </p>
            </div>

            {pickText(competitorProduct.summary) ? (
              <p className="wm-soft" style={{ margin: 0 }}>
                {pickText(competitorProduct.summary)}
              </p>
            ) : null}

            {competitorUrl ? (
              <div className="wm-flex">
                <a
                  href={competitorUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="wm-btn wm-btn--secondary"
                >
                  Open competitor source
                  <ExternalLink size={16} />
                </a>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {comparisonRows.length > 0 ? (
        <div className="wm-grid wm-grid--2">
          {comparisonRows.map((row) => (
            <div
              className="wm-stat"
              key={row.label}
              style={{
                borderColor: row.matches ? "var(--wm-success)" : "var(--wm-border-default)",
                background: row.matches ? "var(--wm-success-soft)" : undefined,
              }}
            >
              <p className="wm-stat__label">{row.label}</p>
              <p className="wm-stat__value" style={{ fontSize: 18 }}>
                {row.wyrestorm}
              </p>
              <p className="wm-stat__meta">Competitor: {row.competitor}</p>
            </div>
          ))}
        </div>
      ) : null}

      {scoreBreakdown ? (
        <div className="wm-grid wm-grid--3">
          {Object.entries(scoreBreakdown).map(([key, itemValue]) => (
            <div className="wm-stat" key={key}>
              <p className="wm-stat__label">{key}</p>
              <p className="wm-stat__value" style={{ fontSize: 20 }}>
                {renderValue(itemValue)}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function normalizeCompareConfidence(value: unknown): "High" | "Medium" | "Low" {
  const text = pickText(value).toLowerCase();
  if (text.includes("high")) return "High";
  if (text.includes("low")) return "Low";

  const numeric = Number(text);
  if (Number.isFinite(numeric) && numeric >= 80) return "High";
  if (Number.isFinite(numeric) && numeric <= 40) return "Low";

  return "Medium";
}

function buildProjectCompareRecord(input: {
  brand: string;
  competitorSku: string;
  fit: JsonMap;
  lookupResult: NormalizedLookupResult | null;
}): ProjectCompareRecord {
  const profile =
    input.fit.profile && typeof input.fit.profile === "object" && !Array.isArray(input.fit.profile)
      ? (input.fit.profile as JsonMap)
      : null;

  const rawFeatures =
    Array.isArray(profile?.features) ? profile.features :
    Array.isArray(input.fit.features) ? input.fit.features :
    [];

  const features = rawFeatures
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim());

  const notes = [
    pickText(input.fit.matchType) ? `Match type: ${pickText(input.fit.matchType)}` : "",
    pickText(input.fit.matchScore, input.fit.score) ? `Match score: ${pickText(input.fit.matchScore, input.fit.score)}` : "",
    input.lookupResult?.competitorUrl ? `Competitor source: ${input.lookupResult.competitorUrl}` : "",
  ].filter(Boolean);

  return {
    brand: input.brand,
    competitorSku: input.competitorSku.trim(),
    category: pickText(input.fit.category, profile?.category, "Competitor compare"),
    summary: pickText(input.fit.summary, input.lookupResult?.message),
    features,
    wyrestormSku: pickText(input.fit.sku, profile?.model, "Manual review required"),
    wyrestormName: pickText(input.fit.name, input.fit.title),
    wyrestormCategory: pickText(input.fit.category, profile?.category),
    wyrestormVerified: Boolean(pickText(input.fit.sku, profile?.model)),
    confidence: normalizeCompareConfidence(pickText(input.fit.confidence, input.fit.matchScore, input.fit.score)),
    rationale: pickText(input.fit.reason, input.fit.summary, input.lookupResult?.message),
    notes,
    createdAt: new Date().toISOString(),
  };
}

export default function CompetitorComparePage() {
  const navigate = useNavigate();
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
    const sourceValue = loading
      ? "Connecting"
      : lookupResult
        ? lookupResult.cacheHit
          ? "Cached live result"
          : "Live backend"
        : "Waiting";

    return [
      {
        label: "Status",
        value: statusValue,
        meta: error ? error : lookupResult?.message ?? "Enter a competitor SKU to enable lookup.",
      },
      {
        label: "Source",
        value: sourceValue,
        meta: lookupResult?.competitorUrl
          ? "Manufacturer source resolved for the current compare."
          : "No live source resolved yet.",
      },
      {
        label: "Candidates",
        value: String(matchesCount),
        meta: matchesCount > 0 ? "Candidate matches returned" : "No matches loaded",
      },
      {
        label: "Saved fit",
        value: savedFit ? "Saved" : "Not saved",
        meta: savedFit ? "Saved back into the active project record" : "Ready to save selected fit into the project",
      },
    ];
  }, [error, loading, lookupResult, savedFit]);

  const currentSelectedFit = selectedFit ?? lookupResult?.selectedFit ?? null;
  const shortlist = lookupResult?.shortlist ?? [];
  const manualMapping = lookupResult?.manualMapping ?? null;
  const currentSelectedLink = getItemLink(currentSelectedFit);

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
      const project = ensureActiveProject({
        name: sku.trim() ? `${brand} ${sku.trim()} compare` : "Competitor Compare",
        stage: "Specify",
        status: "Draft",
      });

      const compareRecord = buildProjectCompareRecord({
        brand,
        competitorSku: sku,
        fit: currentSelectedFit,
        lookupResult,
      });

      const savedProject = applyCompareToProject(project.id, compareRecord);
      if (!savedProject) {
        throw new Error("Compare result could not be written to the active project.");
      }

      setSavedFit(true);
      setError("");
    } catch (err) {
      setSavedFit(false);
      setError(err instanceof Error ? err.message : "Could not save fit into the project.");
    }
  }

  return (
    <WingmanPageFrame
      eyebrow="Quick Reference"
      title="Competitor Compare"
      subtitle="Search on the left, then review the fit, shortlist, and live comparison detail in a consistent Wingman workflow."
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
          <div className="wm-soft">
            Live compare runs against the backend match resolver, then opens catalogue for the next project step.
          </div>
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
        description="Start with a brand and competitor SKU or model. Live compare will resolve the competitor source and rank WyreStorm candidates."
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
              {loading ? "Comparing..." : "Run live compare"}
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
                    ? "Run compare to populate the best fit, shortlist, and scoring detail."
                    : "Enter a competitor SKU to enable live compare."}
              </p>
            </div>
          </div>
        </div>
      </WingmanSection>

      <WingmanStatStrip items={statItems} />

      <WingmanSection
        eyebrow="Step 2"
        title="Comparison output"
        description="Review the selected fit, shortlist alternatives, and the comparison detail returned by the live match service."
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
              className={tab === "detail" ? "wm-pill is-active" : "wm-pill"}
              onClick={() => setTab("detail")}
            >
              Match detail
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

                {currentSelectedLink ? (
                  <a href={currentSelectedLink} target="_blank" rel="noreferrer" className="wm-btn wm-btn--secondary">
                    Open matched product
                    <ExternalLink size={16} />
                  </a>
                ) : null}
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
              body="Run a live compare to populate candidate WyreStorm options."
            />
          )
        ) : null}

        {tab === "detail" ? <ComparisonDetailView value={manualMapping} /> : null}
      </WingmanSection>
    </WingmanPageFrame>
  );
}
