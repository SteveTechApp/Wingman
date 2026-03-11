import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import { getWingmanFeatures, getWingmanTools } from "@/core/wingman/wingmanData";
import type { WingmanItem } from "@/features/tools/toolFeatureModel";

const FEATURED_FEATURE_IDS = ["start-project", "discovery", "templates"];
const BUILD_FEATURE_IDS = ["room-designer", "proposal-builder", "completion-workflow"];
const ENABLEMENT_FEATURE_IDS = ["training"];

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
}: {
  title: string;
  copy: string;
}) {
  return (
    <div className="wm-section__head">
      <div className="wm-section__titles">
        <h2>{title}</h2>
        <p>{copy}</p>
      </div>
    </div>
  );
}

function SpotlightCard({
  item,
  onOpen,
  step,
}: {
  item: WingmanItem;
  onOpen: (to: string) => void;
  step?: string;
}) {
  const Icon = item.Icon;
  const tone = itemTone(item.accentRgb);

  return (
    <article
      className="wm-work-card"
      style={{
        display: "grid",
        gap: 14,
        border: tone.border,
        background: "rgba(8,14,24,0.88)",
        boxShadow: "none",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
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

          <div>
            {step ? (
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: tone.muted,
                }}
              >
                {step}
              </div>
            ) : null}
            <div className="wm-title-lg" style={{ marginTop: step ? 4 : 0 }}>
              {item.title}
            </div>
          </div>
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

      <div className="wm-body" style={{ color: tone.muted, lineHeight: 1.5 }}>
        {item.description}
      </div>

      {item.highlight ? (
        <div
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            background: tone.panel,
            border: tone.border,
            fontSize: 13,
            color: tone.text,
            fontWeight: 700,
          }}
        >
          {item.highlight}
        </div>
      ) : null}

      <div>
        <button
          type="button"
          className="wm-btn"
          onClick={() => onOpen(item.to)}
          style={{
            minHeight: 40,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          Open
          <ArrowRight size={16} />
        </button>
      </div>
    </article>
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

function filterByIds(items: WingmanItem[], ids: string[]): WingmanItem[] {
  const wanted = new Set(ids);
  return items.filter((item) => wanted.has(item.id));
}

export default function ToolHubPage() {
  const navigate = useNavigate();
  const tools = getWingmanTools();
  const features = getWingmanFeatures();

  const featuredFeatures = React.useMemo(
    () => filterByIds(features, FEATURED_FEATURE_IDS),
    [features],
  );
  const buildFeatures = React.useMemo(
    () => filterByIds(features, BUILD_FEATURE_IDS),
    [features],
  );
  const enablementFeatures = React.useMemo(
    () => filterByIds(features, ENABLEMENT_FEATURE_IDS),
    [features],
  );

  return (
    <div className="wm-page">
      <section className="wm-hero">
        <div className="wm-page-hero-row">
          <div>
            <div className="wm-title-xl">Pick a starting lane, then open the tool you need.</div>
            <div className="wm-body-sm wm-page-subtitle" style={{ maxWidth: 760 }}>
              This version keeps the hub lighter on purpose: start paths at the top, build steps in the middle,
              and reference tools grouped separately so everything is easier to scan.
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gap: 8,
              minWidth: 220,
            }}
          >
            <div className="wm-chip">Start</div>
            <div className="wm-chip">Build</div>
            <div className="wm-chip">Reference</div>
          </div>
        </div>
      </section>

      <section className="wm-section wm-section--tone-cyan">
        <SectionLead
          title="Start Here"
          copy="These are the fastest, lowest-friction entry points for most opportunities."
        />

        <div className="wm-grid-cards">
          {featuredFeatures.map((item, index) => (
            <SpotlightCard
              key={item.id}
              item={item}
              step={`Step 0${index + 1}`}
              onOpen={(to) => navigate(to)}
            />
          ))}
        </div>
      </section>

      <div
        className="wm-tool-hub__split"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 14,
        }}
      >
        <section className="wm-section wm-section--tone-indigo">
          <SectionLead
            title="Build The Project"
            copy="Once the opportunity is moving, these workflow features turn the direction into design, BOM, and handoff output."
          />

          <div className="wm-tool-hub__stack" style={{ display: "grid", gap: 10 }}>
            {buildFeatures.map((item) => (
              <CompactRow key={item.id} item={item} onOpen={(to) => navigate(to)} />
            ))}

            {enablementFeatures.length > 0 ? (
              <div
                className="wm-tool-hub__stack"
                style={{
                  marginTop: 6,
                  paddingTop: 10,
                  borderTop: "1px solid rgba(255,255,255,0.08)",
                  display: "grid",
                  gap: 10,
                }}
              >
                <div className="wm-body-sm" style={{ opacity: 0.72 }}>
                  Enablement
                </div>
                {enablementFeatures.map((item) => (
                  <CompactRow key={item.id} item={item} onOpen={(to) => navigate(to)} />
                ))}
              </div>
            ) : null}
          </div>
        </section>

        <section className="wm-section wm-section--tone-emerald">
          <SectionLead
            title="Reference Tools"
            copy="Use these when you need help, comparison, validation, or product reference during the workflow."
          />

          <div className="wm-tool-hub__stack" style={{ display: "grid", gap: 10 }}>
            {tools.map((item) => (
              <CompactRow key={item.id} item={item} onOpen={(to) => navigate(to)} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
