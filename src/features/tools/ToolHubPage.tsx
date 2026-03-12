import React from "react";
import { useNavigate } from "react-router-dom";

import { getWingmanFeatures, getWingmanTools } from "@/core/wingman/wingmanData";
import type { WingmanItem } from "@/features/tools/toolFeatureModel";

const SALES_TOOL_IDS = ["guru", "competitor-compare", "videowall"];
const REFERENCE_TOOL_IDS = ["catalogue", "product-intelligence"];
const SUPPORT_TOOL_IDS = ["runtime-diagnostics", "competitor-lookup-diagnostics"];
const ENABLEMENT_FEATURE_IDS = ["training"];

type ItemCopyOverride = Partial<Pick<WingmanItem, "title" | "description" | "tag" | "highlight">>;

const TOOL_COPY_OVERRIDES: Record<string, ItemCopyOverride> = {
  guru: {
    description: "Ask for AV guidance, product direction, and technical answers whenever you need a fast steer.",
    tag: "Sales Assistant",
    highlight: "Ask Wingman anything",
  },
  catalogue: {
    description: "Browse WyreStorm products, key specifications, ranges, and family-level reference data.",
    tag: "Reference",
    highlight: "Browse products",
  },
  videowall: {
    description: "Plan LCD and LED wall layouts, sizing, viewing impact, and supporting architecture.",
    tag: "Design Utility",
    highlight: "Size and configure walls",
  },
  "competitor-compare": {
    description: "Compare WyreStorm against other brands to support positioning, objection handling, and trade-offs.",
    tag: "Sales Utility",
    highlight: "Position against competitors",
  },
  "runtime-diagnostics": {
    description: "Review recent runtime errors and clear diagnostics data when field feedback needs quick validation.",
    tag: "Diagnostics",
    highlight: "Inspect recent runtime errors",
  },
  "competitor-lookup-diagnostics": {
    description: "Inspect competitor lookup cache and provenance records to verify the comparison pipeline is healthy.",
    tag: "Diagnostics",
    highlight: "Inspect lookup pipeline",
  },
  "product-intelligence": {
    description: "Review trusted WyreStorm and competitor records, supporting evidence, and approval confidence.",
    tag: "Trusted Data",
    highlight: "Approve trusted product data",
  },
};

const FEATURE_COPY_OVERRIDES: Record<string, ItemCopyOverride> = {
  training: {
    description: "Build confidence across products, positioning, and AV design with self-serve learning support.",
    tag: "Enablement",
    highlight: "Learn as you go",
  },
};

function itemTone(accentRgb: string) {
  return {
    border: `1px solid rgba(${accentRgb},0.14)`,
    panel: `rgba(${accentRgb},0.08)`,
    icon: `rgba(${accentRgb},0.16)`,
    iconBorder: `rgba(${accentRgb},0.24)`,
    text: `rgba(255,255,255,0.94)`,
    muted: "rgba(255,255,255,0.74)",
  };
}

function SectionLead({
  title,
  copy,
  count,
}: {
  title: string;
  copy: string;
  count: number;
}) {
  return (
    <div className="wm-section__head">
      <div className="wm-section__titles">
        <h2>{title}</h2>
        <p>{copy}</p>
      </div>

      <div className="wm-tool-hub__section-count">
        {count} {count === 1 ? "tool" : "tools"}
      </div>
    </div>
  );
}

function CompactRow({
  item,
  onOpen,
}: {
  item: WingmanItem;
  onOpen: (to: string) => void;
}) {
  const Icon = item.Icon;
  const tone = itemTone(item.accentRgb);

  return (
    <article
      className="wm-work-card"
      style={{
        display: "grid",
        gridTemplateColumns: "44px minmax(0, 1fr) auto",
        gap: 12,
        alignItems: "center",
        padding: 14,
        border: tone.border,
        background: "rgba(8,14,24,0.78)",
        boxShadow: "none",
      }}
    >
      <span
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: tone.icon,
          border: `1px solid ${tone.iconBorder}`,
        }}
      >
        <Icon size={18} />
      </span>

      <div style={{ minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <div className="wm-title-lg" style={{ fontSize: 17 }}>
            {item.title}
          </div>
          {item.tag ? (
            <span
              className="wm-tag"
              style={{
                background: tone.panel,
                borderColor: tone.iconBorder,
                color: tone.text,
              }}
            >
              {item.tag}
            </span>
          ) : null}
        </div>

        <div
          className="wm-body-sm"
          style={{
            marginTop: 4,
            color: tone.muted,
            lineHeight: 1.45,
          }}
        >
          {item.description}
        </div>

        {item.highlight ? (
          <div
            style={{
              marginTop: 8,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 9px",
              borderRadius: 999,
              background: tone.panel,
              color: tone.text,
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {item.highlight}
          </div>
        ) : null}
      </div>

      <button
        type="button"
        className="wm-btn"
        onClick={() => onOpen(item.to)}
        style={{
          minHeight: 38,
          paddingInline: 14,
          whiteSpace: "nowrap",
        }}
      >
        Open
      </button>
    </article>
  );
}

function selectItemsInOrder(
  items: WingmanItem[],
  ids: string[],
  overrides: Record<string, ItemCopyOverride>,
): WingmanItem[] {
  const itemMap = new Map(items.map((item) => [item.id, item]));

  return ids.reduce<WingmanItem[]>((acc, id) => {
    const item = itemMap.get(id);
    if (!item) return acc;

    acc.push({
      ...item,
      ...overrides[id],
    });

    return acc;
  }, []);
}

export default function ToolHubPage() {
  const navigate = useNavigate();
  const tools = getWingmanTools();
  const features = getWingmanFeatures();

  const salesTools = React.useMemo(
    () => selectItemsInOrder(tools, SALES_TOOL_IDS, TOOL_COPY_OVERRIDES),
    [tools],
  );
  const referenceTools = React.useMemo(
    () => selectItemsInOrder(tools, REFERENCE_TOOL_IDS, TOOL_COPY_OVERRIDES),
    [tools],
  );
  const supportTools = React.useMemo(
    () => selectItemsInOrder(tools, SUPPORT_TOOL_IDS, TOOL_COPY_OVERRIDES),
    [tools],
  );
  const enablementTools = React.useMemo(
    () => selectItemsInOrder(features, ENABLEMENT_FEATURE_IDS, FEATURE_COPY_OVERRIDES),
    [features],
  );

  const totalTools = salesTools.length + referenceTools.length + supportTools.length + enablementTools.length;

  return (
    <div className="wm-page">
      <section className="wm-hero wm-tool-hub__hero">
        <div className="wm-tool-hub__hero-copy">
          <div className="wm-tool-hub__eyebrow">Toolbox</div>
          <div className="wm-title-xl">Independent sales tools, all in one place.</div>
          <div className="wm-body-sm wm-page-subtitle" style={{ maxWidth: 760 }}>
            Open any tool directly for research, positioning, sizing, troubleshooting, or training. This page is a
            standalone toolbox, so every item here should be useful on its own.
          </div>
        </div>

        <div className="wm-tool-hub__hero-panel">
          <div className="wm-tool-hub__hero-panel-title">Use it however the conversation needs</div>

          <div className="wm-tool-hub__hero-panel-list">
            <div className="wm-tool-hub__hero-panel-item">
              <strong>Research fast</strong>
              <span>Open Guru, catalogue, or trusted product data without setting up extra context first.</span>
            </div>

            <div className="wm-tool-hub__hero-panel-item">
              <strong>Position and size</strong>
              <span>Compare brands, shape an answer, or run a quick video wall design pass on demand.</span>
            </div>

            <div className="wm-tool-hub__hero-panel-item">
              <strong>Train and troubleshoot</strong>
              <span>Use diagnostics and enablement tools when you need clarity, not a workflow gate.</span>
            </div>
          </div>
        </div>
      </section>

      <section className="wm-tool-hub__signal-grid">
        <article className="wm-work-card wm-tool-hub__signal-card">
          <div className="wm-tool-hub__signal-label">Independent access</div>
          <div className="wm-tool-hub__signal-value">{totalTools}</div>
          <div className="wm-body-sm">Every tool launches directly from here without staged workflow steps.</div>
        </article>

        <article className="wm-work-card wm-tool-hub__signal-card">
          <div className="wm-tool-hub__signal-label">Sales coverage</div>
          <div className="wm-tool-hub__signal-value">Research to support</div>
          <div className="wm-body-sm">Reference, comparison, design utility, diagnostics, and enablement are grouped separately.</div>
        </article>

        <article className="wm-work-card wm-tool-hub__signal-card">
          <div className="wm-tool-hub__signal-label">Best used for</div>
          <div className="wm-tool-hub__signal-value">Fast answers</div>
          <div className="wm-body-sm">Use this page when you need a useful tool first and context can come later.</div>
        </article>
      </section>

      <div className="wm-tool-hub__split">
        <section className="wm-section wm-section--tone-cyan">
          <SectionLead
            title="Sales Utilities"
            copy="Commercial tools for fast answers, positioning, and early sizing work."
            count={salesTools.length}
          />

          <div className="wm-tool-hub__stack" style={{ display: "grid", gap: 10 }}>
            {salesTools.map((item) => (
              <CompactRow key={item.id} item={item} onOpen={(to) => navigate(to)} />
            ))}
          </div>
        </section>

        <section className="wm-section wm-section--tone-emerald">
          <SectionLead
            title="Product & Reference"
            copy="Trusted product lookup and reference sources you can open at any point."
            count={referenceTools.length}
          />

          <div className="wm-tool-hub__stack" style={{ display: "grid", gap: 10 }}>
            {referenceTools.map((item) => (
              <CompactRow key={item.id} item={item} onOpen={(to) => navigate(to)} />
            ))}
          </div>
        </section>

        <section className="wm-section wm-section--tone-indigo">
          <SectionLead
            title="Diagnostics & Support"
            copy="Checks for live issues, data quality, and backend confidence when something feels off."
            count={supportTools.length}
          />

          <div className="wm-tool-hub__stack" style={{ display: "grid", gap: 10 }}>
            {supportTools.map((item) => (
              <CompactRow key={item.id} item={item} onOpen={(to) => navigate(to)} />
            ))}
          </div>
        </section>

        <section className="wm-section wm-section--tone-amber">
          <SectionLead
            title="Enablement"
            copy="Learning support for product knowledge, positioning, and solution confidence."
            count={enablementTools.length}
          />

          <div className="wm-tool-hub__stack" style={{ display: "grid", gap: 10 }}>
            {enablementTools.map((item) => (
              <CompactRow key={item.id} item={item} onOpen={(to) => navigate(to)} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
