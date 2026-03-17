import React from "react";

import type { CompetitorCompareCandidate } from "@/services/competitorCompareSearch";
import type { ManualCompetitorComparisonInput } from "@/services/manualCompetitorComparisonStore";

type CompetitorManualComparisonPanelProps = {
  brand: string;
  query: string;
  selectedCandidate?: CompetitorCompareCandidate;
  saveMessage?: string;
  onSave?: (input: ManualCompetitorComparisonInput) => void | Promise<void>;
  onDelete?: (brand: string, competitorSku: string) => void | Promise<void>;
};

type FormState = {
  competitorSku: string;
  competitorName: string;
  category: string;
  summary: string;
  features: string;
  wyrestormSku: string;
  rationale: string;
  notes: string;
};

function tidy(value: unknown): string {
  return String(value ?? "").trim();
}

function formFromSelection(
  brand: string,
  query: string,
  selectedCandidate?: CompetitorCompareCandidate,
): FormState {
  const comparison = selectedCandidate?.comparison;
  return {
    competitorSku: tidy(comparison?.competitorSku) || tidy(query).toUpperCase(),
    competitorName: tidy(comparison?.competitorName),
    category: tidy(comparison?.category),
    summary: tidy(comparison?.summary),
    features: Array.isArray(comparison?.features) ? comparison.features.join(", ") : "",
    wyrestormSku: tidy(comparison?.wyrestormSku),
    rationale: tidy(comparison?.rationale),
    notes: Array.isArray(comparison?.notes) ? comparison.notes.join("\n") : "",
  };
}

function inputStyle(multiline = false): React.CSSProperties {
  return {
    minHeight: multiline ? 96 : 42,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    color: "#eef5ff",
    padding: multiline ? "10px 12px" : "0 12px",
    outline: "none",
    resize: multiline ? "vertical" : "none",
    fontFamily: "inherit",
    fontSize: 13,
  };
}

export default function CompetitorManualComparisonPanel(
  props: CompetitorManualComparisonPanelProps,
) {
  const { brand, query, selectedCandidate, saveMessage, onSave, onDelete } = props;
  const [form, setForm] = React.useState<FormState>(() =>
    formFromSelection(brand, query, selectedCandidate),
  );

  React.useEffect(() => {
    setForm(formFromSelection(brand, query, selectedCandidate));
  }, [brand, query, selectedCandidate]);

  const sourceIsManual = selectedCandidate?.sourceType === "manual";

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSave() {
    if (!onSave) return;

    onSave({
      brand,
      competitorSku: form.competitorSku,
      competitorName: form.competitorName,
      category: form.category,
      summary: form.summary,
      features: form.features,
      wyrestormSku: form.wyrestormSku,
      rationale: form.rationale,
      notes: form.notes,
    });
  }

  function handleDelete() {
    if (!onDelete) return;
    onDelete(brand, form.competitorSku);
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gap: 4 }}>
        <div style={{ fontSize: 16, fontWeight: 800 }}>Manual fallback mapping</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.64)", lineHeight: 1.5 }}>
          Save a competitor-to-WyreStorm comparison when live or seeded data is incomplete. Stored mappings are searchable in future compare sessions.
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        }}
      >
        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 700 }}>Competitor brand</label>
          <input value={brand} disabled style={{ ...inputStyle(), opacity: 0.75 }} />
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 700 }}>Competitor SKU</label>
          <input
            value={form.competitorSku}
            onChange={(event) => update("competitorSku", event.target.value.toUpperCase())}
            placeholder="Example: IP300UHD-RX"
            style={inputStyle()}
          />
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 700 }}>Competitor product name</label>
          <input
            value={form.competitorName}
            onChange={(event) => update("competitorName", event.target.value)}
            placeholder="Optional product title"
            style={inputStyle()}
          />
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 700 }}>Category</label>
          <input
            value={form.category}
            onChange={(event) => update("category", event.target.value)}
            placeholder="Switcher, AVoIP, Extender..."
            style={inputStyle()}
          />
        </div>

        <div style={{ display: "grid", gap: 6, gridColumn: "1 / -1" }}>
          <label style={{ fontSize: 12, fontWeight: 700 }}>Competitor summary</label>
          <textarea
            value={form.summary}
            onChange={(event) => update("summary", event.target.value)}
            placeholder="Short summary of what this competitor product does"
            style={inputStyle(true)}
          />
        </div>

        <div style={{ display: "grid", gap: 6, gridColumn: "1 / -1" }}>
          <label style={{ fontSize: 12, fontWeight: 700 }}>Key features</label>
          <input
            value={form.features}
            onChange={(event) => update("features", event.target.value)}
            placeholder="Comma-separated features"
            style={inputStyle()}
          />
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 700 }}>WyreStorm SKU</label>
          <input
            value={form.wyrestormSku}
            onChange={(event) => update("wyrestormSku", event.target.value.toUpperCase())}
            placeholder="Example: NHD-500-RX"
            style={inputStyle()}
          />
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 700 }}>Positioning rationale</label>
          <input
            value={form.rationale}
            onChange={(event) => update("rationale", event.target.value)}
            placeholder="Why this is the best fit"
            style={inputStyle()}
          />
        </div>

        <div style={{ display: "grid", gap: 6, gridColumn: "1 / -1" }}>
          <label style={{ fontSize: 12, fontWeight: 700 }}>Notes</label>
          <textarea
            value={form.notes}
            onChange={(event) => update("notes", event.target.value)}
            placeholder="One note per line for caveats or talk tracks"
            style={inputStyle(true)}
          />
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={!brand || !form.competitorSku || !form.wyrestormSku}
          style={{
            height: 40,
            padding: "0 14px",
            borderRadius: 10,
            border: "1px solid rgba(92,225,230,0.24)",
            background: "rgba(92,225,230,0.12)",
            color: "#dffcff",
            fontWeight: 800,
            cursor: !brand || !form.competitorSku || !form.wyrestormSku ? "not-allowed" : "pointer",
            opacity: !brand || !form.competitorSku || !form.wyrestormSku ? 0.6 : 1,
          }}
        >
          Save Searchable Mapping
        </button>

        {sourceIsManual ? (
          <button
            type="button"
            onClick={handleDelete}
            style={{
              height: 40,
              padding: "0 14px",
              borderRadius: 10,
              border: "1px solid rgba(255,190,92,0.26)",
              background: "rgba(255,190,92,0.10)",
              color: "#ffe6b7",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Delete Saved Mapping
          </button>
        ) : null}
      </div>

      <div style={{ fontSize: 12, color: saveMessage ? "#d6ffe4" : "rgba(255,255,255,0.54)" }}>
        {saveMessage || "Saved mappings become part of the local comparison library for future searches."}
      </div>
    </div>
  );
}
