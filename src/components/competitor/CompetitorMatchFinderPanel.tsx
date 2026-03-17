import React from "react";
import { getCompetitorBrands } from "@/competitor/repository";

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
  "Blustream",
  "Crestron",
  "Extron",
  "Kramer",
  "Lightware",
  "ZeeVee",
];

const BRAND_SEARCH_DOMAINS: Record<string, string> = {
  Atlona: "atlona.com",
  Barco: "barco.com",
  Blustream: "blustream-us.com",
  Crestron: "crestron.com",
  Extron: "extron.com",
  Kramer: "kramerav.com",
  Lightware: "lightware.com",
  ZeeVee: "zeevee.com",
};

const LOCAL_SKUS: Record<string, Suggestion[]> = {
  Atlona: [
    { sku: "AT-UHD-EX-100CE-KIT", name: "4K HDR HDBaseT extender kit", type: "Extender" },
    { sku: "AT-OME-MS42", name: "4x2 matrix switcher", type: "Matrix" },
    { sku: "AT-OME-CS31-SA", name: "switcher with USB-C", type: "Switcher" },
  ],
  Blustream: [
    { sku: "HEX70CS", name: "HDBaseT extender set", type: "Extender" },
    { sku: "SW41AB-V2", name: "4x1 HDMI switch", type: "Switcher" },
    { sku: "MX44AB-V2", name: "4x4 matrix", type: "Matrix" },
  ],
  Crestron: [
    { sku: "HD-EXT3-C-B", name: "DM Lite transmitter", type: "Extender" },
    { sku: "HD-RX-4K-210-C-E", name: "receiver", type: "Receiver" },
    { sku: "HD-MD4X1-4KZ-E", name: "4x1 switcher", type: "Switcher" },
  ],
  Extron: [
    { sku: "DTP3 T 203", name: "DTP3 transmitter", type: "Extender" },
    { sku: "DTP3 R 201", name: "DTP3 receiver", type: "Receiver" },
    { sku: "IN1804", name: "presentation switcher", type: "Switcher" },
  ],
  Kramer: [
    { sku: "TP-580T", name: "HDBaseT transmitter", type: "Extender" },
    { sku: "TP-580R", name: "HDBaseT receiver", type: "Receiver" },
    { sku: "VS-44H2A", name: "4x4 matrix", type: "Matrix" },
  ],
  Lightware: [
    { sku: "TPX-TX95", name: "twisted pair transmitter", type: "Extender" },
    { sku: "TPX-RX95", name: "twisted pair receiver", type: "Receiver" },
    { sku: "MMX4x2-HT220", name: "matrix switcher", type: "Matrix" },
  ],
  ZeeVee: [
    { sku: "ZVPRO820", name: "encoder / modulator", type: "AV over RF" },
    { sku: "HDB2640", name: "HDMI encoder", type: "AV over IP" },
    { sku: "SDH2640", name: "decoder", type: "AV over IP" },
  ],
};

function normalise(value: string): string {
  return value.trim().toLowerCase();
}

function canonicalBrand(value: string): string {
  const normalized = normalise(value);
  if (normalized === "blustream" || normalized === "bluestream") return "Blustream";
  return value.trim();
}

function rankSuggestions(items: Suggestion[], query: string): Suggestion[] {
  const q = normalise(query);
  if (!q) return items.slice(0, 8);

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
    .slice(0, 8);
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

  const brands = React.useMemo(() => {
    const deployed = getCompetitorBrands();
    return deployed.length > 0 ? deployed : DEFAULT_BRANDS;
  }, []);

  const brandItems = React.useMemo(() => {
    const key = canonicalBrand(brand);
    return key ? LOCAL_SKUS[key] ?? [] : [];
  }, [brand]);

  const externalSuggestions = React.useMemo<Suggestion[]>(() => {
    return (localMatches ?? [])
      .filter((item) => item && typeof item.sku === "string" && item.sku.trim() !== "")
      .map((item) => ({
        sku: item.sku,
        name: asText(item.name) || "Known competitor model",
        type: asText(item.type) || "Product",
      }));
  }, [localMatches]);

  const suggestions = React.useMemo(() => {
    if (externalSuggestions.length > 0) {
      return rankSuggestions(externalSuggestions, sku);
    }
    return rankSuggestions(brandItems, sku);
  }, [externalSuggestions, brandItems, sku]);

  const hasTypedQuery = sku.trim().length > 0;
  const derivedHasLocalMatch = suggestions.length > 0;
  const localMatchState = hasLocalMatch || derivedHasLocalMatch;
  const noLocalMatch = brand !== "" && hasTypedQuery && !localMatchState;
  const canSearchWeb = brand !== "" && hasTypedQuery && !running;
  const searchWebHighlighted = noLocalMatch;

  function chooseSuggestion(item: Suggestion) {
    fireSetter(onSkuChange, item.sku);
    setFocused(false);
  }

  function handleBrandChange(value: string) {
    fireSetter(onBrandChange, value);
    fireSetter(onSkuChange, "");
  }

  function handleSkuChange(value: string) {
    fireSetter(onSkuChange, value);
  }

  function handleSearchWeb() {
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
    <div style={{ display: "grid", gap: 18 }}>
      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>Competitor comparison</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.72)", lineHeight: 1.5 }}>
          Select a competitor brand, then type a full or partial model/SKU. Wingman will shortlist local comparison matches first, and live verification can confirm the latest vendor result.
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "minmax(220px, 280px) minmax(320px, 1fr) auto",
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
              height: 44,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.04)",
              color: brand ? "#eef5ff" : "rgba(255,255,255,0.52)",
              padding: "0 14px",
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

        <div style={{ display: "grid", gap: 8, position: "relative" }}>
          <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.3, opacity: 0.9 }}>
            SKU / model
          </label>

          <input
            value={sku}
            disabled={!brand || running}
            onFocus={() => setFocused(true)}
            onBlur={() => { window.setTimeout(() => setFocused(false), 140); }}
            onChange={(event) => handleSkuChange(event.target.value)}
            placeholder={brand ? "Type competitor SKU or model" : "Choose a brand first"}
            style={{
              height: 44,
              borderRadius: 12,
              border: noLocalMatch
                ? "1px solid rgba(255,190,92,0.55)"
                : "1px solid rgba(255,255,255,0.14)",
              background: brand ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)",
              color: sku ? "#eef5ff" : "rgba(255,255,255,0.52)",
              padding: "0 14px",
              outline: "none",
              boxShadow: noLocalMatch ? "0 0 0 3px rgba(255,190,92,0.10)" : "none",
            }}
          />

          {focused && brand && suggestions.length > 0 ? (
            <div
              style={{
                position: "absolute",
                top: 74,
                left: 0,
                right: 0,
                zIndex: 20,
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(9,12,20,0.98)",
                boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
                overflow: "hidden",
              }}
            >
              {suggestions.map((item) => (
                <button
                  key={item.sku}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => chooseSuggestion(item)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "12px 14px",
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
              ))}
            </div>
          ) : null}

          <div style={{ minHeight: 20, fontSize: 12 }}>
            {!brand ? (
              <span style={{ color: "rgba(255,255,255,0.45)" }}>
                Select a brand to enable type-ahead model lookup.
              </span>
            ) : noLocalMatch ? (
              <span style={{ color: "rgba(255,190,92,0.92)" }}>
                No local match found yet. Verify live or add more SKU detail.
              </span>
            ) : hasTypedQuery && localMatchState ? (
              <span style={{ color: "rgba(122,236,160,0.88)" }}>
                Local comparison suggestions available.
              </span>
            ) : (
              <span style={{ color: "rgba(255,255,255,0.45)" }}>
                Start typing to see partial-SKU shortlist suggestions.
              </span>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.3, opacity: 0.9 }}>
            Search
          </label>
          <button
            type="button"
            onClick={handleSearchWeb}
            disabled={!canSearchWeb}
            style={{
              height: 44,
              minWidth: 148,
              borderRadius: 12,
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
            {running ? "Verifying..." : "Verify Live"}
          </button>
        </div>
      </div>
    </div>
  );
}
