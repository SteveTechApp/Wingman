import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CATALOG_SEED, type CatalogEntry } from "./catalogSeed";

function Surface({
  title,
  subtitle,
  children,
  right,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <section className="wm-card wm-animate-in" style={{ padding: 16 }}>
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
          <div style={{ fontWeight: 900, fontSize: 16, letterSpacing: "-0.01em" }}>{title}</div>
          {subtitle ? (
            <div style={{ marginTop: 4, fontSize: 12, color: "rgba(255,255,255,0.82)", lineHeight: 1.4 }}>
              {subtitle}
            </div>
          ) : null}
        </div>
        {right ? <div>{right}</div> : null}
      </div>
      {children ? <div style={{ marginTop: 14 }}>{children}</div> : null}
    </section>
  );
}

function ActionTile({
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
        border: "1px solid rgba(255,255,255,0.16)",
        background: "rgba(255,255,255,0.06)",
        padding: 14,
        color: "rgba(255,255,255,0.96)",
      }}
    >
      <div style={{ fontWeight: 900, fontSize: 15 }}>{title}</div>
      <div style={{ marginTop: 6, fontSize: 12, color: "rgba(255,255,255,0.84)", lineHeight: 1.4 }}>
        {text}
      </div>
      <button
        type="button"
        className="wm-btn wm-btn-primary"
        style={{ marginTop: 12, height: 36, padding: "0 14px" }}
        onClick={onClick}
      >
        {cta}
      </button>
    </div>
  );
}

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
        <div style={{ marginTop: 4, fontSize: 12, color: "rgba(255,255,255,0.74)" }}>{item.family}</div>
      </div>

      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.84)", lineHeight: 1.45 }}>
        <strong style={{ color: "rgba(255,255,255,0.96)" }}>Use case:</strong> {item.useCase}
      </div>

      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.82)", lineHeight: 1.45 }}>
        {item.summary}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {item.tags.map((tag) => (
          <span
            key={tag}
            style={{
              padding: "4px 8px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.04)",
              fontSize: 11,
              color: "rgba(255,255,255,0.82)",
            }}
          >
            {tag}
          </span>
        ))}
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

export default function CatalogPage() {
  const nav = useNavigate();
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState("All");

  const families = useMemo(() => {
    return ["All", ...Array.from(new Set(CATALOG_SEED.map((x) => x.family)))];
  }, []);

  const filtered = useMemo(() => {
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
    <div className="wm-page wm-animate-in" style={{ width: "100%", maxWidth: "none", margin: 0, minWidth: 0 }}>
      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <div className="wm-page-eyebrow">PRODUCTS</div>
          <h1 className="wm-page-title" style={{ marginBottom: 8 }}>Product Catalog</h1>
          <div style={{ maxWidth: 980, fontSize: 15, color: "rgba(255,255,255,0.90)", lineHeight: 1.45 }}>
            This is now a real catalog destination. It is workflow-first by design: help the user identify the right product family and then move into the best next tool.
          </div>
        </div>

        <Surface
          title="Catalog entry points"
          subtitle="Choose the path that best matches the customer conversation."
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 12 }}>
            <ActionTile
              title="Browse solutions"
              text="Use templates to review proven room patterns and tiered output paths."
              cta="Open Templates"
              onClick={() => nav("/app/templates")}
            />
            <ActionTile
              title="Match competitor"
              text="Translate another brand's part number into a practical Wingman-aligned direction."
              cta="Open Competitor Compare"
              onClick={() => nav("/app/tools/competitor")}
            />
            <ActionTile
              title="Build from requirements"
              text="Use Room Wizard when you know the room constraints and need guided design logic."
              cta="Open Room Wizard"
              onClick={() => nav("/app/tools/room")}
            />
          </div>
        </Surface>

        <Surface
          title="Search the catalog"
          subtitle="Filter by family or keyword to find the best starting point."
          right={
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.76)" }}>
              {filtered.length} result{filtered.length === 1 ? "" : "s"}
            </div>
          }
        >
          <div
            style={{
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
        </Surface>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.45fr) minmax(320px, 0.85fr)",
            gap: 14,
            alignItems: "start",
          }}
        >
          <Surface
            title="Catalog results"
            subtitle="Use these starter cards to move into the right tool, not to replace full design logic."
          >
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
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
                {filtered.map((item) => (
                  <EntryCard key={item.id} item={item} onOpen={(route) => nav(route)} />
                ))}
              </div>
            )}
          </Surface>

          <Surface
            title="What this completes"
            subtitle="This turns Catalog into a real working feature instead of a silent redirect."
          >
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.82)", lineHeight: 1.5 }}>
                Delivered in this version:
              </div>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: 18,
                  display: "grid",
                  gap: 6,
                  fontSize: 12,
                  color: "rgba(255,255,255,0.82)",
                }}
              >
                <li>Dedicated route at <strong>/app/tools/catalog</strong></li>
                <li>Searchable family/use-case starter dataset</li>
                <li>Direct handoff into Templates, Room Wizard, Proposal, Competitor Compare, and Guru</li>
              </ul>

              <button
                type="button"
                className="wm-btn"
                style={{ height: 34, marginTop: 4 }}
                onClick={() => nav("/app/templates")}
              >
                Continue to Templates
              </button>
            </div>
          </Surface>
        </div>

        <div style={{ height: 4 }} />
      </div>
    </div>
  );
}