import React from "react";
import { useNavigate } from "react-router-dom";

import { getWingmanFeatures, getWingmanTools } from "@/core/wingman/wingmanData";
import { useAuth } from "@/context/AuthContext";
import type { WingmanItem } from "@/features/tools/toolFeatureModel";

const CORE_TOOL_IDS = ["guru", "catalogue", "competitor-compare", "videowall", "product-intelligence"];
const ADMIN_TOOL_IDS = ["competitor-lookup-diagnostics"];
const ENABLEMENT_FEATURE_IDS = ["training"];
const GRID_SLOTS = 9;

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
      className="wm-work-card wm-tool-hub__tool-card"
      style={{
        border: tone.border,
        background: "rgba(8,14,24,0.78)",
        boxShadow: "none",
      }}
    >
      <div className="wm-tool-hub__tool-head">
        <span
          className="wm-tool-hub__tool-icon"
          style={{
            background: tone.icon,
            border: `1px solid ${tone.iconBorder}`,
          }}
        >
          <Icon size={18} />
        </span>
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

      <div className="wm-tool-hub__tool-copy">
        <div className="wm-title-lg wm-tool-hub__tool-title">{item.title}</div>
        <div
          className="wm-body-sm wm-tool-hub__tool-desc"
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
            className="wm-tool-hub__tool-highlight"
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
          className="wm-btn wm-tool-hub__tool-open"
          onClick={() => onOpen(item.to)}
        style={{ whiteSpace: "nowrap" }}
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
  const auth = useAuth();
  const canAdmin = Boolean(
    auth.permissions.canManageWorkspace ||
    auth.workspaceRole === "admin" ||
    auth.workspaceRole === "owner" ||
    auth.user?.role === "admin",
  );
  const tools = getWingmanTools();
  const features = getWingmanFeatures();

  const coreTools = React.useMemo(
    () => selectItemsInOrder(tools, CORE_TOOL_IDS, TOOL_COPY_OVERRIDES),
    [tools],
  );
  const adminTools = React.useMemo(
    () => (canAdmin ? selectItemsInOrder(tools, ADMIN_TOOL_IDS, TOOL_COPY_OVERRIDES) : []),
    [canAdmin, tools],
  );
  const enablementTools = React.useMemo(
    () => selectItemsInOrder(features, ENABLEMENT_FEATURE_IDS, FEATURE_COPY_OVERRIDES),
    [features],
  );
  const boardTools = React.useMemo(
    () => [...coreTools, ...adminTools, ...enablementTools],
    [adminTools, coreTools, enablementTools],
  );

  const reservedSlots = Math.max(0, GRID_SLOTS - boardTools.length);

  return (
    <div className="wm-page wm-tool-hub-page">
      <section className="wm-hero wm-tool-hub__hero">
        <div className="wm-tool-hub__hero-copy">
          <div className="wm-tool-hub__eyebrow">Toolbox</div>
          <div className="wm-title-xl">Open any tool directly.</div>
          <div className="wm-body-sm wm-page-subtitle-muted">
            Fixed 3x3 board for fast access. Active tools stay in place, with reserved slots ready for future upgrades.
          </div>
        </div>
      </section>

      <section className="wm-section wm-section--tone-cyan">
        <div className="wm-tool-hub__grid">
          {boardTools.map((item) => (
            <CompactRow key={item.id} item={item} onOpen={(to) => navigate(to)} />
          ))}

          {Array.from({ length: reservedSlots }).map((_, index) => (
            <article key={`future-slot-${index + 1}`} className="wm-work-card wm-tool-hub__tool-card wm-tool-hub__tool-card--future">
              <div className="wm-tool-hub__future-label">Future upgrade</div>
              <div className="wm-tool-hub__future-title">Reserved slot {index + 1}</div>
              <div className="wm-body-sm wm-tool-hub__future-copy">
                Space held for upcoming tools.
              </div>
              <button type="button" className="wm-btn wm-tool-hub__tool-open" disabled>
                Coming soon
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
