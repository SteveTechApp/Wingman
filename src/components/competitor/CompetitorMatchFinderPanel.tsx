import * as React from "react";

const BRANDS = [
  "Crestron",
  "Extron",
  "Kramer",
  "Atlona",
  "Lightware",
  "Blustream",
  "ZeeVee",
];

type LocalMatch = {
  brand: string;
  sku: string;
  name?: string;
  family?: string;
  category?: string;
  wyrestormSku?: string;
  wyrestormName?: string;
  score: number;
};

type Props = {
  brand: string;
  sku: string;
  running?: boolean;
  hasLocalMatch: boolean;
  localMatches: LocalMatch[];
  onBrandChange: (v: string) => void;
  onSkuChange: (v: string) => void;
  onRun: (mode: "local" | "web") => void;
};

const fieldShell: React.CSSProperties = {
  display: "grid",
  gap: 8,
};

const fieldLabel: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: 0.3,
  textTransform: "uppercase",
  opacity: 0.84,
};

const fieldStyle: React.CSSProperties = {
  height: 50,
  borderRadius: 14,
  background: "rgba(255,255,255,0.09)",
  border: "1px solid rgba(255,255,255,0.22)",
  color: "#f5fbff",
  padding: "0 14px",
  outline: "none",
  fontSize: 16,
  fontWeight: 600,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
};

export default function CompetitorMatchFinderPanel({
  brand,
  sku,
  running = false,
  hasLocalMatch,
  localMatches,
  onBrandChange,
  onSkuChange,
  onRun,
}: Props) {
  const canRun = brand.trim().length > 0 && sku.trim().length > 0 && !running;
  const bestMatch = localMatches[0];

  return (
    <div
      className="wm-card wm-card-pad"
      style={{
        padding: 22,
        borderRadius: 22,
        background: "linear-gradient(180deg, rgba(9,24,44,0.96), rgba(7,20,36,0.92))",
        border: "1px solid rgba(92,225,230,0.14)",
        boxShadow: "0 18px 48px rgba(0,0,0,0.22)",
      }}
    >
      <div style={{ display: "grid", gap: 6, marginBottom: 18 }}>
        <div className="wm-section-title" style={{ margin: 0 }}>
          Competitor Match Finder
        </div>
        <div style={{ fontSize: 14, opacity: 0.78, lineHeight: 1.5 }}>
          Check your local competitor catalogue first. If no held SKU is found, continue with a live web lookup.
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: 14,
          gridTemplateColumns: "minmax(220px, 0.9fr) minmax(320px, 1.1fr)",
          alignItems: "end",
        }}
      >
        <label style={fieldShell}>
          <span style={fieldLabel}>Competitor brand</span>
          <select
            value={brand}
            onChange={(e) => onBrandChange(e.target.value)}
            style={fieldStyle}
          >
            {BRANDS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label style={fieldShell}>
          <span style={fieldLabel}>Competitor SKU</span>
          <input
            value={sku}
            onChange={(e) => onSkuChange(e.target.value)}
            placeholder="Enter competitor SKU"
            style={fieldStyle}
          />
        </label>
      </div>

      <div
        style={{
          marginTop: 18,
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={() => onRun("local")}
          disabled={!canRun}
          style={{
            minWidth: 140,
            height: 44,
            padding: "0 16px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.16)",
            background: canRun
              ? "linear-gradient(135deg, rgba(36,166,173,0.95), rgba(29,113,187,0.92))"
              : "rgba(255,255,255,0.10)",
            color: canRun ? "#f5fbff" : "rgba(255,255,255,0.52)",
            fontWeight: 800,
            fontSize: 14,
            cursor: canRun ? "pointer" : "default",
            boxShadow: canRun ? "0 10px 24px rgba(29,113,187,0.22)" : "none",
          }}
        >
          {running ? "Checking..." : "Check local"}
        </button>

        {!hasLocalMatch ? (
          <button
            type="button"
            onClick={() => onRun("web")}
            disabled={!canRun}
            style={{
              minWidth: 140,
              height: 44,
              padding: "0 16px",
              borderRadius: 12,
              border: "1px solid rgba(92,225,230,0.22)",
              background: "rgba(255,255,255,0.06)",
              color: canRun ? "#dffbff" : "rgba(255,255,255,0.52)",
              fontWeight: 800,
              fontSize: 14,
              cursor: canRun ? "pointer" : "default",
            }}
          >
            Search web
          </button>
        ) : null}

        <div style={{ fontSize: 12, opacity: 0.72 }}>
          {hasLocalMatch
            ? "Local SKU found. Start with the internal match before using web lookup."
            : "No local SKU match found yet. Web search is available as the next step."}
        </div>
      </div>

      <div
        style={{
          marginTop: 18,
          padding: 14,
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.04)",
          display: "grid",
          gap: 8,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.82, textTransform: "uppercase" }}>
          Local lookup result
        </div>

        {bestMatch ? (
          <>
            <div style={{ fontSize: 15, fontWeight: 700 }}>
              {bestMatch.brand} {bestMatch.sku}
            </div>

            {bestMatch.name ? (
              <div style={{ fontSize: 13, opacity: 0.82 }}>
                {bestMatch.name}
              </div>
            ) : null}

            <div style={{ fontSize: 13, opacity: 0.8 }}>
              Score: {bestMatch.score}
              {bestMatch.category ? ` - ${bestMatch.category}` : ""}
              {bestMatch.family ? ` - ${bestMatch.family}` : ""}
            </div>

            <div
              style={{
                marginTop: 4,
                padding: 10,
                borderRadius: 12,
                background: "rgba(92,225,230,0.08)",
                border: "1px solid rgba(92,225,230,0.16)",
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              <strong>Suggested WyreStorm match:</strong>{" "}
              {bestMatch.wyrestormSku || bestMatch.wyrestormName
                ? `${bestMatch.wyrestormSku || ""}${bestMatch.wyrestormSku && bestMatch.wyrestormName ? " - " : ""}${bestMatch.wyrestormName || ""}`
                : "No mapped WyreStorm SKU stored yet in the local catalogue."}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 13, opacity: 0.72 }}>
            No local match shown yet. Run a local check to search the held competitor catalogue.
          </div>
        )}
      </div>
    </div>
  );
}
