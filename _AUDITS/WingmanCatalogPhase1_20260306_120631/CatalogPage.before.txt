import * as React from "react";
import { useNavigate } from "react-router-dom";
import CollapsibleCard from "@/ui2/components/CollapsibleCard";
import { CATALOG_SEED, type CatalogEntry } from "./catalogSeed";

function EntryCard({
  item,
  onOpen,
}: {
  item: CatalogEntry;
  onOpen: (route: string) => void;
}) {
  return (
    <div
      className="wm-hover-lift"
      style={{
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(255,255,255,0.045)",
        padding: 14,
        display: "grid",
        gap: 10,
      }}
    >
      <div>
        <div style={{ fontWeight: 900, fontSize: 15 }}>{item.name}</div>
        <div style={{ marginTop: 4, fontSize: 12, color: "rgba(255,255,255,0.74)" }}>
          {item.family}
        </div>
      </div>

      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.84)", lineHeight: 1.45 }}>
        <strong style={{ color: "rgba(255,255,255,0.96)" }}>Use case:</strong> {item.useCase}
      </div>

      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.82)", lineHeight: 1.45 }}>
        {item.summary}
      </div>

      <button
        type="button"
        className="wm-btn"
        style={{ height: 34, justifyContent: "center" as any }}
        onClick={() => onOpen(item.nextRoute)}
      >
        {item.nextLabel}
      </button>
    </div>
  );
}

function StartOption({
  title,
  text,
  cta,
  onClick,
}: {
  title: string;
  text: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <div
      className="wm-hover-lift"
      style={{
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(255,255,255,0.05)",
        padding: 14,
      }}
    >
      <div style={{ fontWeight: 800, fontSize: 14, color: "rgba(255,255,255,0.96)" }}>
        {title}
      </div>
      <div
        style={{
          marginTop: 6,
          fontSize: 12,
          lineHeight: 1.45,
          color: "rgba(255,255,255,0.82)",
        }}
      >
        {text}
      </div>
      <button
        type="button"
        className="wm-btn"
        style={{ marginTop: 12, height: 34, padding: "0 12px" }}
        onClick={onClick}
      >
        {cta}
      </button>
    </div>
  );
}

export default function CatalogPage() {
  const nav = useNavigate();
  const [query, setQuery] = React.useState("");
  const [family, setFamily] = React.useState("All");

  const families = React.useMemo(() => {
    return ["All", ...Array.from(new Set(CATALOG_SEED.map((x) => x.family)))];
  }, []);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();

    return CATALOG_SEED.filter((item) => {
      const familyMatch = family === "All" || item.family === family;
      if (!familyMatch) return false;
      if (!q) return true;

      const haystack = [
        item.name,
        item.family,
        item.useCase,
        item.summary,
        item.tags.join(" "),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [query, family]);

  return (
    <div
      className="wm-page wm-animate-in"
      style={{ width: "100%", maxWidth: "none", margin: 0, minWidth: 0 }}
    >
      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <div className="wm-page-eyebrow">PRODUCTS</div>
          <h1 className="wm-page-title" style={{ marginBottom: 8 }}>
            Product Catalog
          </h1>
          <div
            style={{
              maxWidth: 760,
              fontSize: 14,
              color: "rgba(255,255,255,0.88)",
              lineHeight: 1.45,
            }}
          >
            Find the right product family first, then move into the best next tool.
          </div>
        </div>

        <section className="wm-card wm-animate-in" style={{ padding: 16, borderRadius: 18 }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontWeight: 900, fontSize: 16, letterSpacing: "-0.01em" }}>
                Search the catalog
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  color: "rgba(255,255,255,0.82)",
                  lineHeight: 1.4,
                }}
              >
                Filter by family or keyword to find the best starting point.
              </div>
            </div>

            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.76)" }}>
              {filtered.length} result{filtered.length === 1 ? "" : "s"}
            </div>
          </div>

          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.4fr) minmax(180px, 0.6fr)",
              gap: 12,
            }}
          >
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by use case, family, or keyword"
              style={{
                height: 40,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.05)",
                padding: "0 12px",
                color: "rgba(255,255,255,0.96)",
              }}
            />

            <select
              value={family}
              onChange={(e) => setFamily(e.target.value)}
              style={{
                height: 40,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.05)",
                padding: "0 12px",
                color: "rgba(255,255,255,0.96)",
              }}
            >
              {families.map((f) => (
                <option key={f} value={f} style={{ color: "#111" }}>
                  {f}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="wm-card wm-animate-in" style={{ padding: 16, borderRadius: 18 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16, letterSpacing: "-0.01em" }}>
              Catalog results
            </div>
            <div
              style={{
                marginTop: 4,
                fontSize: 12,
                color: "rgba(255,255,255,0.82)",
                lineHeight: 1.4,
              }}
            >
              Use these starter cards to move into the right tool.
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            {filtered.length === 0 ? (
              <div
                style={{
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.035)",
                  padding: 16,
                  fontSize: 13,
                  color: "rgba(255,255,255,0.84)",
                }}
              >
                No matches yet. Try a broader keyword or switch back to <strong>All</strong>.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: 12,
                }}
              >
                {filtered.map((item) => (
                  <EntryCard key={item.id} item={item} onOpen={(route) => nav(route)} />
                ))}
              </div>
            )}
          </div>
        </section>

        <CollapsibleCard
          id="catalog_other_paths"
          title="Other ways to start"
          subtitle="Use these when the customer conversation is already more specific."
          defaultCollapsed
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
              gap: 12,
            }}
          >
            <StartOption
              title="Browse solutions"
              text="Use templates to review proven room patterns and tiered paths."
              cta="Open Templates"
              onClick={() => nav("/app/templates")}
            />
            <StartOption
              title="Match competitor"
              text="Translate another brand's part number into a practical Wingman-aligned direction."
              cta="Open Competitor Compare"
              onClick={() => nav("/app/tools/competitor")}
            />
            <StartOption
              title="Build from requirements"
              text="Use Room Wizard when you know the room constraints and need guided logic."
              cta="Open Room Wizard"
              onClick={() => nav("/app/tools/room")}
            />
          </div>
        </CollapsibleCard>
      </div>
    </div>
  );
}