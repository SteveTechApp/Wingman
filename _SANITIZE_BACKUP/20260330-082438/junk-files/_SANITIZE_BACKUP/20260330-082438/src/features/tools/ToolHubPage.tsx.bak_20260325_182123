import React from "react";
import { useNavigate } from "react-router-dom";

import { getWingmanFeatures, getWingmanTools } from "@/core/wingman/wingmanData";
import { useAuth } from "@/context/AuthContext";
import type { WingmanItem } from "@/features/tools/toolFeatureModel";

const CORE_TOOL_IDS = ["navigator", "guru", "catalogue", "competitor-compare", "videowall", "product-intelligence"];
const ADMIN_TOOL_IDS = ["competitor-lookup-diagnostics"];
const ENABLEMENT_FEATURE_IDS = ["training"];
const GUIDANCE_TOOL_IDS = ["navigator", "guru"];
const DESIGN_REFERENCE_TOOL_IDS = ["videowall", "catalogue", "product-intelligence"];
const POSITIONING_TOOL_IDS = ["competitor-compare"];
const SUPPORT_TOOL_IDS = ["training", "competitor-lookup-diagnostics"];

type ItemCopyOverride = Partial<Pick<WingmanItem, "title" | "description" | "tag" | "highlight">>;

const TOOL_COPY_OVERRIDES: Record<string, ItemCopyOverride> = {
  navigator: {
    description: "Guide early customer calls with plain-English prompts.",
    tag: "Sales Helper",
    highlight: "Guide the first call",
  },
  guru: {
    description: "Get fast AV answers, product direction, and technical help.",
    tag: "Sales Assistant",
    highlight: "Ask for a steer",
  },
  catalogue: {
    description: "Browse WyreStorm ranges, specs, and family context.",
    tag: "Reference",
    highlight: "Browse products",
  },
  videowall: {
    description: "Plan LCD and LED walls, sizing, and supporting architecture.",
    tag: "Design Utility",
    highlight: "Plan the wall",
  },
  "competitor-compare": {
    description: "Position WyreStorm against competitors with clear trade-offs.",
    tag: "Sales Utility",
    highlight: "Handle the comparison",
  },
  "competitor-lookup-diagnostics": {
    description: "Check lookup health, cache, and provenance records.",
    tag: "Diagnostics",
    highlight: "Check pipeline health",
  },
  "product-intelligence": {
    description: "Review trusted records, evidence, and approval confidence.",
    tag: "Trusted Data",
    highlight: "Review trusted data",
  },
};

const FEATURE_COPY_OVERRIDES: Record<string, ItemCopyOverride> = {
  training: {
    description: "Build product, positioning, and AV design confidence on demand.",
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
  featured = false,
}: {
  item: WingmanItem;
  onOpen: (to: string) => void;
  featured?: boolean;
}) {
  const Icon = item.Icon;
  const tone = itemTone(item.accentRgb);

  return (
    <article
      className={`wm-work-card wm-tool-hub__tool-card${featured ? " wm-tool-hub__tool-card--featured" : ""}`}
      style={
        {
          "--wm-tool-tone-rgb": item.accentRgb,
        } as React.CSSProperties
      }
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
              fontSize: 10,
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

function pickItemsInOrder(items: WingmanItem[], ids: string[]) {
  const itemMap = new Map(items.map((item) => [item.id, item]));

  return ids.reduce<WingmanItem[]>((acc, id) => {
    const item = itemMap.get(id);
    if (!item) return acc;

    acc.push(item);
    return acc;
  }, []);
}

function ToolSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="wm-tool-hub__cluster">
      <div className="wm-tool-hub__cluster-head">
        <div className="wm-tool-hub__cluster-title">{title}</div>
        <div className="wm-tool-hub__cluster-copy">{description}</div>
      </div>
      {children}
    </section>
  );
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
  const guidanceTools = React.useMemo(
    () => pickItemsInOrder(boardTools, GUIDANCE_TOOL_IDS),
    [boardTools],
  );
  const designReferenceTools = React.useMemo(
    () => pickItemsInOrder(boardTools, DESIGN_REFERENCE_TOOL_IDS),
    [boardTools],
  );
  const positioningTools = React.useMemo(
    () => pickItemsInOrder(boardTools, POSITIONING_TOOL_IDS),
    [boardTools],
  );
  const supportTools = React.useMemo(
    () => pickItemsInOrder(boardTools, SUPPORT_TOOL_IDS),
    [boardTools],
  );

  const reservedSlots = Math.max(0, 8 - boardTools.length);
  const heroMetrics = [
    { label: "Live tools", value: String(boardTools.length) },
    { label: "Guidance", value: String(guidanceTools.length) },
    { label: "Reference", value: String(designReferenceTools.length) },
    { label: "Support", value: String(supportTools.length) },
  ].filter((metric) => metric.value !== "0");

  return (
    <div className="wm-page wm-tool-hub-page">
      <section className="wm-hero wm-tool-hub__hero">
        <div className="wm-tool-hub__hero-shell">
          <div className="wm-tool-hub__hero-copy">
            <div className="wm-tool-hub__eyebrow">Tool library</div>
            <div className="wm-title-xl">Open the right tool without losing pace.</div>
            <div className="wm-body-sm wm-page-subtitle-muted">
              Guidance, design, evidence, and enablement tools grouped by the job you are trying
              to do.
            </div>
          </div>

          <div className="wm-tool-hub__hero-panel">
            <div className="wm-tool-hub__hero-panel-label">At a glance</div>
            <div className="wm-tool-hub__hero-panel-title">
              {boardTools.length} live tools in the current workspace.
            </div>
            <div className="wm-tool-hub__hero-panel-copy">
              Start with guidance when the conversation is still forming, then move into reference,
              design, or comparison once the job is clearer.
            </div>

            <div className="wm-tool-hub__hero-metrics">
              {heroMetrics.map((metric) => (
                <div key={metric.label} className="wm-tool-hub__hero-metric">
                  <span className="wm-tool-hub__hero-metric-value">{metric.value}</span>
                  <span className="wm-tool-hub__hero-metric-label">{metric.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="wm-section wm-section--tone-cyan wm-tool-hub__board-section">
        <div className="wm-tool-hub__board">
          <div className="wm-tool-hub__board-main">
            {guidanceTools.length ? (
              <ToolSection
                title="Quick guidance"
                description="Use these when you need a steer fast and do not want to leave the workspace."
              >
                <div className="wm-tool-hub__cluster-grid wm-tool-hub__cluster-grid--split">
                  {guidanceTools.map((item) => (
                    <CompactRow
                      key={item.id}
                      item={item}
                      featured
                      onOpen={(to) => navigate(to)}
                    />
                  ))}
                </div>
              </ToolSection>
            ) : null}

            {designReferenceTools.length ? (
              <ToolSection
                title="Design and reference"
                description="Move from early thinking into specifications, product context, and canvas planning."
              >
                <div className="wm-tool-hub__cluster-grid">
                  {designReferenceTools.map((item) => (
                    <CompactRow key={item.id} item={item} onOpen={(to) => navigate(to)} />
                  ))}
                </div>
              </ToolSection>
            ) : null}
          </div>

          <div className="wm-tool-hub__board-side">
            {positioningTools.length ? (
              <ToolSection
                title="Sales and positioning"
                description="Keep commercial answers close when the conversation turns competitive."
              >
                <div className="wm-tool-hub__cluster-grid">
                  {positioningTools.map((item) => (
                    <CompactRow key={item.id} item={item} onOpen={(to) => navigate(to)} />
                  ))}
                </div>
              </ToolSection>
            ) : null}

            {supportTools.length ? (
              <ToolSection
                title="Support and learning"
                description="Use these to stay confident, verify the data, and keep moving."
              >
                <div className="wm-tool-hub__cluster-grid">
                  {supportTools.map((item) => (
                    <CompactRow key={item.id} item={item} onOpen={(to) => navigate(to)} />
                  ))}
                </div>
              </ToolSection>
            ) : null}

            {reservedSlots > 0 ? (
              <section className="wm-tool-hub__future-panel">
                <div className="wm-tool-hub__future-title">Reserved space</div>
                <div className="wm-tool-hub__future-copy">
                  Room is held for the next tool without crowding the current workspace.
                </div>
                <div className="wm-tool-hub__future-strip">
                  {Array.from({ length: reservedSlots }).map((_, index) => (
                    <span key={`future-slot-${index + 1}`} className="wm-tool-hub__future-chip">
                      Reserved slot {index + 1}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
