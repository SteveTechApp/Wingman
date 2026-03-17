import * as React from "react";
import PageFrame from "@/app/layout/PageFrame";
import PageSection from "@/app/layout/PageSection";
import { useTextHistory } from "@/hooks/useTextHistory";
import { RECENT_TEXT_HISTORY_KEYS } from "@/services/ui/textHistoryService";

const RESOLVE_MATCH_ENDPOINT = String(
  import.meta.env.VITE_COMPETITOR_RESOLVE_MATCH_ENDPOINT ?? "/api/competitor/resolveMatch"
).trim();

type CompareStatus =
  | { tone: "idle"; text: string }
  | { tone: "working"; text: string }
  | { tone: "success"; text: string }
  | { tone: "warning"; text: string };

type MatchBreakdown = {
  categoryScore?: number;
  inputsScore?: number;
  outputsScore?: number;
  resolutionScore?: number;
  transportScore?: number;
  audioFeatureScore?: number;
  latencyScore?: number;
};


type ComparisonRow = {
  label: string;
  competitor: string;
  wyrestorm: string;
  matches: boolean;
};
type RankedMatch = {
  comparison_rows?: ComparisonRow[];
  sku: string;
  name: string;
  match_score: number;
  match_type?: string;
  confidence?: string;
  confidence_score?: number;
  io_coverage?: number;
  feature_coverage?: number;
  resolvedUrl?: string;
  summary?: string;
  breakdown?: MatchBreakdown;
  verified_catalog_sku?: boolean;
  live_spec_extracted?: boolean;
};

type ResolveMatchResponse = {
  ok: boolean;
  error?: string;
  cacheHit?: boolean;
  fetchedAt?: string;
  competitor_product?: {
    manufacturer?: string;
    model?: string;
    title?: string;
    category?: string;
    transport?: string;
    role?: string;
    summary?: string;
    resolvedUrl?: string;
    ports?: Record<string, number>;
    video?: Record<string, string>;
    features?: Record<string, boolean>;
  };
  best_match?: RankedMatch | null;
  alternatives?: RankedMatch[];
  shortlist_count?: number;
  resolved_competitor_url?: string;
};

function pct(value: number | undefined): string {
  return `${Math.max(0, Math.min(100, Math.round(value ?? 0)))}%`;
}

function scoreLine(label: string, value?: number): string {
  return `${label}: ${Math.round(value ?? 0)}`;
}

function renderBreakdown(breakdown?: MatchBreakdown): string[] {
  if (!breakdown) return [];
  return [
    scoreLine("Category", breakdown.categoryScore),
    scoreLine("Inputs", breakdown.inputsScore),
    scoreLine("Outputs", breakdown.outputsScore),
    scoreLine("Resolution", breakdown.resolutionScore),
    scoreLine("Transport", breakdown.transportScore),
    scoreLine("Audio / features", breakdown.audioFeatureScore),
    scoreLine("Latency", breakdown.latencyScore),
  ];
}

function renderPorts(ports?: Record<string, number>): string[] {
  if (!ports) return [];
  return Object.entries(ports)
    .filter(([, value]) => Number(value) > 0)
    .map(([key, value]) => `${key}: ${value}`);
}

function renderFeatureNames(features?: Record<string, boolean>): string[] {
  if (!features) return [];
  return Object.entries(features)
    .filter(([, value]) => Boolean(value))
    .map(([key]) => key);
}

function badgeStyle(): React.CSSProperties {
  return {
    borderRadius: 999,
    padding: "6px 10px",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    fontSize: 12,
    fontWeight: 600,
  };
}

export default function CompetitorComparePage() {
  const [manufacturer, setManufacturer] = React.useState("");
  const [model, setModel] = React.useState("");
  const [productUrl, setProductUrl] = React.useState("");
  const [status, setStatus] = React.useState<CompareStatus>({
    tone: "idle",
    text: "Enter a manufacturer and competitor model to begin.",
  });
  const [result, setResult] = React.useState<ResolveMatchResponse | null>(null);
  const [busy, setBusy] = React.useState(false);

  const manufacturerHistory = useTextHistory(RECENT_TEXT_HISTORY_KEYS.manufacturer);
  const modelHistory = useTextHistory(RECENT_TEXT_HISTORY_KEYS.competitorModel);

  const canCompare = manufacturer.trim().length > 0 && model.trim().length > 0;

  async function handleCompare() {
    manufacturerHistory.saveRecentValue(manufacturer);
    modelHistory.saveRecentValue(model);

    setBusy(true);
    setResult(null);
    setStatus({
      tone: "working",
      text: "Resolving competitor product, enriching WyreStorm shortlist, comparing structured details, and ranking the strongest matches...",
    });

    try {
      const response = await fetch(RESOLVE_MATCH_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          manufacturer,
          model,
          productUrl,
        }),
      });

      const payload = (await response.json()) as ResolveMatchResponse;

      if (!response.ok || !payload.ok) {
        setStatus({
          tone: "warning",
          text: payload.error || "Resolve match failed.",
        });
        setResult(null);
        return;
      }

      setResult(payload);

      if (payload.best_match) {
        setStatus({
          tone: "success",
          text: `Best match: ${payload.best_match.sku} at ${pct(payload.best_match.match_score)} (${payload.best_match.match_type || "ranked"}).`,
        });
      } else {
        setStatus({
          tone: "warning",
          text: "No ranked WyreStorm match was returned.",
        });
      }
    } catch (error) {
      setStatus({
        tone: "warning",
        text: error instanceof Error ? error.message : "Resolve match failed.",
      });
      setResult(null);
    } finally {
      setBusy(false);
    }
  }

  const alternatives = result?.alternatives ?? [];
  const competitorPorts = renderPorts(result?.competitor_product?.ports);
  const competitorFeatures = renderFeatureNames(result?.competitor_product?.features);

  return (
    <PageFrame
      title="Competitor Compare"
      subtitle="Resolve a competitor product, enrich likely WyreStorm matches, and rank the strongest alternatives with score breakdown and coverage signals."
      actions={
        <div className="wm-toolbar">
          <button className="wm-btn-secondary" type="button">
            Export Comparison
          </button>
          <button
            className="wm-btn-primary"
            type="button"
            onClick={handleCompare}
            disabled={!canCompare || busy}
          >
            {busy ? "Resolving..." : "Run Comparison"}
          </button>
        </div>
      }
    >
      <PageSection compact>
        <div className="wm-hero">
          <div className="wm-heroCard">
            <span className="wm-kicker">Comparison Intelligence</span>
            <h3>Best match is always ranked first</h3>
            <p>
              Wingman now sorts backend results by highest match score first, then uses confidence as the tie-breaker.
            </p>
          </div>

          <div className="wm-heroCard">
            <span className="wm-kicker">Trust Signals</span>
            <h3>Explain the ranking, not just the percentage</h3>
            <p>
              Each suggestion now includes confidence, I/O coverage, feature coverage, match type, and a score breakdown.
            </p>
          </div>
        </div>
      </PageSection>

      <PageSection
        title="Comparison Input"
        subtitle="Provide manufacturer and model. Add a product URL when you want to force a specific live lookup page."
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 16,
          }}
        >
          <label style={{ display: "grid", gap: 8 }}>
            <span>Manufacturer</span>
            <input
              className="wm-input"
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value)}
              onBlur={() => manufacturerHistory.saveRecentValue(manufacturer)}
              placeholder="Extron, Atlona, Crestron, Kramer..."
            />
            {manufacturerHistory.recentValues.length > 0 ? (
              <div className="wm-toolbar" style={{ gap: 8, flexWrap: "wrap" }}>
                {manufacturerHistory.recentValues.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="wm-btn-secondary"
                    onClick={() => setManufacturer(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            ) : null}
          </label>

          <label style={{ display: "grid", gap: 8 }}>
            <span>Competitor model</span>
            <input
              className="wm-input"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              onBlur={() => modelHistory.saveRecentValue(model)}
              placeholder="e.g. AT-OME-MS42 or DM-NVX-360"
            />
            {modelHistory.recentValues.length > 0 ? (
              <div className="wm-toolbar" style={{ gap: 8, flexWrap: "wrap" }}>
                {modelHistory.recentValues.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="wm-btn-secondary"
                    onClick={() => setModel(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            ) : null}
          </label>
        </div>

        <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
          <label style={{ display: "grid", gap: 8 }}>
            <span>Live product page URL</span>
            <input
              className="wm-input"
              value={productUrl}
              onChange={(e) => setProductUrl(e.target.value)}
              placeholder="Optional. Leave blank to let Wingman construct or discover the most likely URL."
            />
          </label>
        </div>
      </PageSection>

      <PageSection
        title="Status"
        subtitle="Shows whether the resolve-and-rank pipeline completed successfully."
      >
        <div
          style={{
            borderRadius: 16,
            padding: 16,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <strong>{status.tone.toUpperCase()}</strong>
          <p style={{ marginTop: 8 }}>{status.text}</p>
        </div>
      </PageSection>

      {result?.competitor_product ? (
        <PageSection
          title="Resolved Competitor Product"
          subtitle="This profile drives the WyreStorm shortlist and the final ranking."
        >
          <div
            style={{
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
              padding: 18,
              display: "grid",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div>
                <div className="wm-kicker">Competitor</div>
                <h3 style={{ margin: 0 }}>
                  {result.competitor_product.manufacturer} {result.competitor_product.model}
                </h3>
                <div className="wm-muted">{result.competitor_product.title}</div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignSelf: "start" }}>
                <span style={badgeStyle()}>{result.competitor_product.category || "Unknown category"}</span>
                <span style={badgeStyle()}>{result.competitor_product.transport || "Unknown transport"}</span>
                <span style={badgeStyle()}>{result.competitor_product.role || "Unknown role"}</span>
                <span style={badgeStyle()}>Shortlist {result.shortlist_count ?? 0}</span>
              </div>
            </div>

            {result.competitor_product.summary ? (
              <p style={{ margin: 0 }}>{result.competitor_product.summary}</p>
            ) : null}

            {competitorPorts.length > 0 ? (
              <div>
                <div className="wm-kicker">Detected ports</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                  {competitorPorts.map((item) => (
                    <span key={item} style={badgeStyle()}>{item}</span>
                  ))}
                </div>
              </div>
            ) : null}

            {competitorFeatures.length > 0 ? (
              <div>
                <div className="wm-kicker">Detected features</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                  {competitorFeatures.map((item) => (
                    <span key={item} style={badgeStyle()}>{item}</span>
                  ))}
                </div>
              </div>
            ) : null}

            {result.resolved_competitor_url ? (
              <div>
                <a href={result.resolved_competitor_url} target="_blank" rel="noreferrer">
                  Open resolved competitor page
                </a>
              </div>
            ) : null}
          </div>
        </PageSection>
      ) : null}

      {result?.best_match ? (
        <PageSection
          title="Best WyreStorm Match"
          subtitle="Highest ranked result returned by the backend."
        >
          <div
            style={{
              borderRadius: 18,
              border: "1px solid rgba(90, 214, 255, 0.28)",
              background: "linear-gradient(180deg, rgba(16,34,48,0.98), rgba(9,20,32,0.96))",
              padding: 18,
              display: "grid",
              gap: 14,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div>
                <div className="wm-kicker">Recommended</div>
                <h3 style={{ margin: 0 }}>{result.best_match.sku}</h3>
                <div className="wm-muted">{result.best_match.name}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="wm-kicker">Match score</div>
                <div style={{ fontSize: 30, fontWeight: 800 }}>{pct(result.best_match.match_score)}</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={badgeStyle()}>{result.best_match.match_type || "Unclassified"}</span>
              <span style={badgeStyle()}>Confidence {result.best_match.confidence || "Unknown"}</span>
              <span style={badgeStyle()}>I/O coverage {pct(result.best_match.io_coverage)}</span>
              <span style={badgeStyle()}>Feature coverage {pct(result.best_match.feature_coverage)}</span>
              {result.best_match.verified_catalog_sku ? <span style={badgeStyle()}>Verified SKU</span> : null}
              {result.best_match.live_spec_extracted ? <span style={badgeStyle()}>Live spec extracted</span> : null}
            </div>

            {result.best_match.summary ? (
              <p style={{ margin: 0 }}>{result.best_match.summary}</p>
            ) : null}

            {result.best_match.resolvedUrl ? (
              <div>
                <a href={result.best_match.resolvedUrl} target="_blank" rel="noreferrer">
                  Open WyreStorm product page
                </a>
              </div>
            ) : null}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1.4fr) minmax(260px, 0.9fr)",
                gap: 16,
              }}
            >
              <div
                style={{
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.03)",
                  padding: 14,
                  display: "grid",
                  gap: 6,
                }}
              >
                <div className="wm-kicker">Score breakdown</div>
                {renderBreakdown(result.best_match.breakdown).map((line) => (
                  <div key={line} className="wm-muted">{line}</div>
                ))}
              </div>

              <div
                style={{
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.03)",
                  padding: 14,
                  display: "grid",
                  gap: 6,
                }}
              >
                <div className="wm-kicker">Trust signals</div>
                <div className="wm-muted">Highest score is always presented first.</div>
                <div className="wm-muted">Confidence combines score, I/O coverage, and feature coverage.</div>
                <div className="wm-muted">WyreStorm product data is cached for faster future comparisons.</div>
              </div>
            </div>
          </div>
        </PageSection>
      ) : null}

      
            {result?.best_match?.comparison_rows?.length ? (
              <div
                style={{
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.03)",
                  padding: 14,
                  display: "grid",
                  gap: 8,
                }}
              >
                <div className="wm-kicker">Structured comparison</div>
                <div style={{ display: "grid", gap: 6 }}>
                  {result.best_match!.comparison_rows!.map((row) => (
                    <div
                      key={row.label}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(140px, 0.9fr) minmax(0, 1fr) minmax(0, 1fr)",
                        gap: 10,
                        alignItems: "start",
                        padding: "6px 0",
                        borderTop: "1px solid rgba(255,255,255,0.05)",
                      }}
                    >
                      <div className="wm-muted">{row.label}</div>
                      <div>{row.competitor}</div>
                      <div style={{ fontWeight: row.matches ? 700 : 500 }}>
                        {row.wyrestorm}
                        <span className="wm-muted" style={{ marginLeft: 8 }}>
                          {row.matches ? "�?,???o�??s�?.??o" : "�?,???o�??s��"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
{alternatives.length > 0 ? (
        <PageSection
          title="Other Potential Matches"
          subtitle="Alternative WyreStorm options ranked below the best match."
        >
          <div style={{ display: "grid", gap: 12 }}>
            {alternatives.map((item) => (
              <div
                key={item.sku}
                style={{
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.03)",
                  padding: 16,
                  display: "grid",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                  <div>
                    <strong>{item.sku}</strong>
                    <div className="wm-muted">{item.name}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 800 }}>{pct(item.match_score)}</div>
                    <div className="wm-muted" style={{ fontSize: 12 }}>{item.match_type || "Ranked alternative"}</div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={badgeStyle()}>Confidence {item.confidence || "Unknown"}</span>
                  <span style={badgeStyle()}>I/O {pct(item.io_coverage)}</span>
                  <span style={badgeStyle()}>Features {pct(item.feature_coverage)}</span>
                </div>

                {item.summary ? <p style={{ margin: 0 }}>{item.summary}</p> : null}

                {item.resolvedUrl ? (
                  <div>
                    <a href={item.resolvedUrl} target="_blank" rel="noreferrer">
                      Open WyreStorm product page
                    </a>
                  </div>
                ) : null}

                <div style={{ display: "grid", gap: 4 }}>
                  {renderBreakdown(item.breakdown).slice(0, 4).map((line) => (
                    <div key={line} className="wm-muted">{line}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </PageSection>
      ) : null}
    </PageFrame>
  );
}