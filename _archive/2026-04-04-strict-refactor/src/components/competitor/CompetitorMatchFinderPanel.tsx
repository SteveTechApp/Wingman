import React from "react";
import { getCompetitorBrands, getCompetitorProducts } from "@/competitor/repository";
import {
  getLiveProductDataToken,
  subscribeLiveProductData,
} from "@/services/liveProductDataStore";

type LocalCompetitorLookupMatch = {
  sku: string;
  name?: string;
  type?: string;
  score?: number;
};

type CompetitorMatchFinderPanelProps = {
  brand?: string;
  sku?: string;
  running?: boolean;
  hasLocalMatch?: boolean;
  localMatches?: LocalCompetitorLookupMatch[];
  onBrandChange?: React.Dispatch<React.SetStateAction<string>> | ((value: string) => void);
  onSkuChange?: React.Dispatch<React.SetStateAction<string>> | ((value: string) => void);
  onRun?: (mode: "local" | "web") => void;
};

type Suggestion = {
  sku: string;
  name: string;
  type: string;
};

const DEFAULT_BRANDS = [
  "Atlona",
  "Barco",
  "BluStream",
  "Crestron",
  "Extron",
  "Kramer",
  "Lightware",
  "ZeeVee",
];

const BRAND_SEARCH_DOMAINS: Record<string, string> = {
  Atlona: "atlona.com",
  Barco: "barco.com",
  BluStream: "blustream-us.com",
  Crestron: "crestron.com",
  Extron: "extron.com",
  Kramer: "kramerav.com",
  Lightware: "lightware.com",
  ZeeVee: "zeevee.com",
};

function normalise(value: string): string {
  return value.trim().toLowerCase();
}

function canonicalBrand(value: string): string {
  const normalized = normalise(value);
  if (normalized === "blustream" || normalized === "bluestream") return "BluStream";
  return value.trim();
}

function rankSuggestions(items: Suggestion[], query: string): Suggestion[] {
  const q = normalise(query);
  if (!q) return items.slice(0, 10);

  return items
    .map((item) => {
      const sku = normalise(item.sku);
      const name = normalise(item.name);
      const type = normalise(item.type);

      let score = 0;
      if (sku.startsWith(q)) score += 400;
      if (sku.includes(q)) score += 250;
      if (name.includes(q)) score += 120;
      if (type.includes(q)) score += 60;

      return { item, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.item.sku.localeCompare(b.item.sku))
    .map((entry) => entry.item)
    .slice(0, 10);
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function fireSetter(
  setter: CompetitorMatchFinderPanelProps["onBrandChange"] | CompetitorMatchFinderPanelProps["onSkuChange"],
  value: string
) {
  if (!setter) return;
  (setter as (value: string) => void)(value);
}

export default function CompetitorMatchFinderPanel(props: CompetitorMatchFinderPanelProps) {
  const {
    brand = "",
    sku = "",
    running = false,
    hasLocalMatch = false,
    localMatches = [],
    onBrandChange,
    onSkuChange,
    onRun,
  } = props;
  const [focused, setFocused] = React.useState(false);
  const [liveDataToken, setLiveDataToken] = React.useState(() => getLiveProductDataToken());

  React.useEffect(() => {
    return subscribeLiveProductData(() => {
      setLiveDataToken(getLiveProductDataToken());
    });
  }, []);

  const brands = React.useMemo(() => {
    void liveDataToken;
    const deployed = getCompetitorBrands();
    return deployed.length > 0 ? deployed : DEFAULT_BRANDS;
  }, [liveDataToken]);

  const brandItems = React.useMemo<Suggestion[]>(() => {
    void liveDataToken;
    const key = canonicalBrand(brand);
    if (!key) return [];

    const deduped = new Map<string, Suggestion>();
    for (const product of getCompetitorProducts()) {
      if (canonicalBrand(String(product.brand || "")) !== key) continue;
      const productSku = String(product.sku || "").trim();
      if (!productSku) continue;
      deduped.set(productSku, {
        sku: productSku,
        name: product.name || product.summary || "Stored competitor product",
        type: product.category || product.family || "Product",
      });
    }

    return Array.from(deduped.values()).sort((left, right) => left.sku.localeCompare(right.sku));
  }, [brand, liveDataToken]);

  const externalSuggestions = React.useMemo<Suggestion[]>(() => {
    return (localMatches ?? [])
      .filter((item) => item && typeof item.sku === "string" && item.sku.trim() !== "")
      .map((item) => ({
        sku: item.sku,
        name: asText(item.name) || "Known competitor model",
        type: asText(item.type) || "Product",
      }));
  }, [localMatches]);

  const skuOptions = React.useMemo(() => {
    const merged = new Map<string, Suggestion>();
    for (const item of brandItems) {
      merged.set(item.sku, item);
    }
    for (const item of externalSuggestions) {
      merged.set(item.sku, item);
    }
    return Array.from(merged.values()).sort((left, right) => left.sku.localeCompare(right.sku));
  }, [brandItems, externalSuggestions]);

  const suggestions = React.useMemo(() => {
    const ranked = rankSuggestions(skuOptions, sku);
    const currentSku = sku.trim();
    if (
      currentSku &&
      !ranked.some((item) => item.sku === currentSku) &&
      skuOptions.some((item) => item.sku === currentSku)
    ) {
      const currentItem = skuOptions.find((item) => item.sku === currentSku);
      if (currentItem) return [currentItem, ...ranked].slice(0, 10);
    }
    return ranked;
  }, [skuOptions, sku]);

  const hasTypedQuery = sku.trim().length > 0;
  const derivedHasLocalMatch = skuOptions.some(
    (item) => normalise(item.sku) === normalise(sku),
  );
  const localMatchState = hasLocalMatch || derivedHasLocalMatch;
  const noLocalMatch = brand !== "" && hasTypedQuery && !localMatchState;
  const canSearchWeb = noLocalMatch && !running;
  const searchWebHighlighted = noLocalMatch && !running;

  function handleBrandChange(value: string) {
    fireSetter(onBrandChange, value);
    fireSetter(onSkuChange, "");
    setFocused(false);
  }

  function handleSkuChange(value: string) {
    fireSetter(onSkuChange, value);
  }

  function chooseSuggestion(item: Suggestion) {
    fireSetter(onSkuChange, item.sku);
    setFocused(false);
  }

  function handleSearchWeb() {
    if (!noLocalMatch || !sku.trim()) {
      return;
    }

    if (onRun) {
      onRun("web");
      return;
    }

    const domain = BRAND_SEARCH_DOMAINS[canonicalBrand(brand)];
    const text = domain
      ? `site:${domain} "${sku}" ${brand}`.trim()
      : [brand, sku].filter(Boolean).join(" ");
    const url = "https://www.google.com/search?q=" + encodeURIComponent(text);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="wm-compare-finder" style={{ display: "grid", gap: 14, position: "relative", zIndex: 2 }}>
      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ fontSize: 16, fontWeight: 800 }}>Competitor comparison</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.72)", lineHeight: 1.5 }}>
          Pick a competitor brand and compare a stored SKU locally. If the exact SKU is missing, use Look up SKU to scrape the live product page and feed the compare matrix.
        </div>
      </div>

      <div
        className="wm-compare-finder__grid"
        style={{
          display: "grid",
          gap: 14,
          gridTemplateColumns: "minmax(190px, 240px) minmax(260px, 1fr) auto",
          alignItems: "start",
        }}
      >
        <div style={{ display: "grid", gap: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.3, opacity: 0.9 }}>
            Competitor brand
          </label>
          <select
            value={brand}
            onChange={(event) => handleBrandChange(event.target.value)}
            style={{
              height: 40,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.04)",
              color: brand ? "#eef5ff" : "rgba(255,255,255,0.52)",
              padding: "0 12px",
              outline: "none",
            }}
          >
            <option value="">Select competitor brand</option>
            {brands.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div
          style={{
            display: "grid",
            gap: 8,
            position: "relative",
            zIndex: focused ? 80 : 2,
          }}
        >
          <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.3, opacity: 0.9 }}>
            SKU / model
          </label>

          <input
            value={sku}
            disabled={!brand || running}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              window.setTimeout(() => setFocused(false), 140);
            }}
            onChange={(event) => handleSkuChange(event.target.value)}
            placeholder={brand ? "Pick or type competitor SKU / model" : "Choose a brand first"}
            style={{
              height: 40,
              borderRadius: 14,
              border: noLocalMatch
                ? "1px solid rgba(255,190,92,0.55)"
                : "1px solid rgba(255,255,255,0.14)",
              background: brand ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)",
              color: sku ? "#eef5ff" : "rgba(255,255,255,0.52)",
              padding: "0 12px",
              outline: "none",
              boxShadow: noLocalMatch ? "0 0 0 3px rgba(255,190,92,0.10)" : "none",
            }}
          />

          {focused && brand ? (
            <div
              className="wm-compare-finder__suggestions"
              style={{
                position: "absolute",
                top: 70,
                left: 0,
                right: 0,
                zIndex: 120,
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(9,12,20,0.98)",
                boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
                overflow: "hidden",
                maxHeight: 280,
                overflowY: "auto",
                overscrollBehavior: "contain",
              }}
            >
              {suggestions.length > 0 ? (
                suggestions.map((item) => (
                  <button
                    key={item.sku}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => chooseSuggestion(item)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 12px",
                      border: "none",
                      borderTop: "1px solid rgba(255,255,255,0.06)",
                      background: "transparent",
                      color: "#eef5ff",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <div style={{ fontWeight: 800 }}>{item.sku}</div>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>{item.type}</div>
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.76, marginTop: 4 }}>{item.name}</div>
                  </button>
                ))
              ) : (
                <div
                  style={{
                    padding: "10px 12px",
                    color: "rgba(255,255,255,0.62)",
                    fontSize: 12,
                    lineHeight: 1.45,
                  }}
                >
                  No stored SKU matches yet. Use Look up SKU for this model.
                </div>
              )}

              {noLocalMatch ? (
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={handleSearchWeb}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 12px",
                    border: "none",
                    borderTop: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(59,130,246,0.10)",
                    color: "#dbeafe",
                    cursor: "pointer",
                    fontWeight: 800,
                  }}
                >
                  {hasTypedQuery ? `Look up SKU "${sku.trim()}"` : "Look up SKU"}
                </button>
              ) : null}
            </div>
          ) : null}

          <div style={{ minHeight: 18, fontSize: 12 }}>
            {!brand ? (
              <span style={{ color: "rgba(255,255,255,0.45)" }}>
                Select a brand to load its stored products.
              </span>
            ) : noLocalMatch ? (
              <span style={{ color: "rgba(255,190,92,0.92)" }}>
                This exact SKU is not in the local library. Use Look up SKU to scrape the live spec page, then compare the returned match.
              </span>
            ) : skuOptions.length === 0 ? (
              <span style={{ color: "rgba(255,255,255,0.45)" }}>
                No stored products for this brand yet. Type a SKU and use Look up SKU.
              </span>
            ) : hasTypedQuery && localMatchState ? (
              <span style={{ color: "rgba(122,236,160,0.88)" }}>
                Stored SKU found. Wingman will compare it locally.
              </span>
            ) : (
              <span style={{ color: "rgba(255,255,255,0.45)" }}>
                Pick a stored model, or type a missing SKU to unlock live lookup.
              </span>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.3, opacity: 0.9 }}>
            Lookup
          </label>
          <button
            type="button"
            onClick={handleSearchWeb}
            disabled={!canSearchWeb}
            style={{
              height: 40,
              minWidth: 132,
              borderRadius: 14,
              border: searchWebHighlighted
                ? "1px solid rgba(255,190,92,0.65)"
                : "1px solid rgba(255,255,255,0.14)",
              background: !canSearchWeb
                ? "rgba(255,255,255,0.04)"
                : searchWebHighlighted
                ? "linear-gradient(135deg, rgba(255,190,92,0.20), rgba(255,140,60,0.18))"
                : "rgba(255,255,255,0.06)",
              color: !canSearchWeb ? "rgba(255,255,255,0.45)" : "#eef5ff",
              fontWeight: 800,
              cursor: canSearchWeb ? "pointer" : "not-allowed",
              boxShadow: searchWebHighlighted ? "0 0 0 3px rgba(255,190,92,0.10)" : "none",
            }}
          >
            {running
              ? "Looking up..."
              : localMatchState
                ? "Stored locally"
                : "Look up SKU"}
          </button>
        </div>
      </div>
    </div>
  );
}

