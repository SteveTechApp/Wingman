import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CollapsibleCard from "@/ui2/components/CollapsibleCard";

function ActionChip({
  label,
  hint,
  onClick,
  accent,
}: {
  label: string;
  hint: string;
  onClick: () => void;
  accent?: string;
}) {
  const rgb = accent || "255,255,255";

  return (
    <button
      type="button"
      onClick={onClick}
      className="wm-hover-lift"
      style={{
        width: "100%",
        minHeight: 74,
        textAlign: "left",
        borderRadius: 14,
        border: `1px solid rgba(${rgb}, ${accent ? "0.28" : "0.20"})`,
        background: accent
          ? `linear-gradient(180deg, rgba(${rgb},0.16) 0%, rgba(${rgb},0.08) 100%)`
          : "rgba(255,255,255,0.09)",
        padding: "12px 14px",
        cursor: "pointer",
        color: "rgba(255,255,255,0.96)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        boxShadow: accent ? `inset 0 1px 0 rgba(${rgb},0.10)` : "none",
      }}
    >
      <div
        style={{
          width: 42,
          height: 4,
          borderRadius: 999,
          background: `rgba(${rgb}, 0.95)`,
          marginBottom: 10,
        }}
      />
      <div style={{ fontWeight: 900, fontSize: 15, color: "rgba(255,255,255,0.98)" }}>{label}</div>
      <div style={{ marginTop: 4, fontSize: 12, color: "rgba(255,255,255,0.84)", lineHeight: 1.3 }}>{hint}</div>
    </button>
  );
}

function StartCard({
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
        border: "1px solid rgba(255,255,255,0.18)",
        background: "rgba(255,255,255,0.075)",
        padding: 14,
        color: "rgba(255,255,255,0.96)",
      }}
    >
      <div style={{ fontWeight: 900, fontSize: 15 }}>{title}</div>
      <div style={{ marginTop: 6, fontSize: 13, color: "rgba(255,255,255,0.84)", lineHeight: 1.4 }}>{text}</div>
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

function Metric({
  k,
  v,
  accent,
}: {
  k: string;
  v: string;
  accent?: string;
}) {
  const rgb = accent || "255,255,255";

  return (
    <div
      style={{
        borderRadius: 14,
        border: `1px solid rgba(${rgb}, ${accent ? "0.22" : "0.18"})`,
        background: accent
          ? `linear-gradient(180deg, rgba(${rgb},0.10) 0%, rgba(${rgb},0.045) 100%)`
          : "rgba(255,255,255,0.055)",
        padding: 12,
        minHeight: 72,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <div style={{ fontSize: 11, letterSpacing: "0.14em", color: "rgba(255,255,255,0.76)", textTransform: "uppercase" }}>{k}</div>
      <div style={{ marginTop: 6, fontSize: 20, fontWeight: 900, letterSpacing: "-0.01em" }}>{v}</div>
    </div>
  );
}

export default function DashboardPage() {
  const nav = useNavigate();
  const [stacked, setStacked] = useState(false);

  useEffect(() => {
    const onResize = () => setStacked(window.innerWidth < 1220);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div className="wm-page wm-animate-in" style={{ width: "100%", maxWidth: "none", margin: 0, minWidth: 0 }}>
      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <div className="wm-page-eyebrow">WORKSPACE</div>
          <h1 className="wm-page-title" style={{ marginBottom: 8 }}>Dashboard</h1>
          <div style={{ maxWidth: 980, fontSize: 15, color: "rgba(255,255,255,0.90)", lineHeight: 1.45 }}>
            A shorter, sales-first workspace: start with the customer outcome, then move into design, quote, or guidance.
          </div>
        </div>

        <CollapsibleCard
          id="dash_quick_actions"
          title="Quick actions"
          subtitle="Best starting points for sales and pre-sales."
          right={
            <span
              className="wm-btn"
              style={{
                height: 32,
                display: "inline-flex",
                alignItems: "center",
                padding: "0 12px",
                borderColor: "rgba(77,183,255,0.24)",
                background: "rgba(77,183,255,0.12)",
                color: "rgba(255,255,255,0.94)",
              }}
            >
              Hot paths
            </span>
          }
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 }}>
            <ActionChip label="New Opportunity" hint="Capture the customer need" accent="77,183,255" onClick={() => nav("/app/survey-import")} />
            <ActionChip label="Match Competitor" hint="Like-for-like starting point" accent="244,114,182" onClick={() => nav("/app/tools/competitor")} />
            <ActionChip label="Build Room" hint="Start from a known template" accent="94,234,212" onClick={() => nav("/app/templates")} />
            <ActionChip label="Create Quote" hint="Move into proposal / BOM" accent="251,191,36" onClick={() => nav("/app/tools/proposal")} />
            <ActionChip label="Ask Wingman" hint="Get guided product direction" accent="168,85,247" onClick={() => nav("/app/tools/guru")} />
          </div>
        </CollapsibleCard>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12 }}>
          <Metric k="Active project" v="None selected" accent="77,183,255" />
          <Metric k="Next action" v="Start a design" accent="94,234,212" />
          <Metric k="Default market" v="UK-first" accent="251,191,36" />
          <Metric k="Mode" v="Install-realistic" accent="248,113,113" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: stacked ? "1fr" : "minmax(0, 1.55fr) minmax(360px, 0.95fr)", gap: 14, alignItems: "start" }}>
          <div style={{ display: "grid", gap: 14, minWidth: 0 }}>
            <CollapsibleCard
              id="dash_start_here"
              title="Start here"
              subtitle="Three practical ways to begin, without repeating the whole workflow."
              right={
                <span
                  className="wm-btn"
                  style={{
                    height: 32,
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "0 12px",
                    borderColor: "rgba(94,234,212,0.24)",
                    background: "rgba(94,234,212,0.12)",
                    color: "rgba(255,255,255,0.94)",
                  }}
                >
                  Recommended
                </span>
              }
            >
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
                <StartCard title="Start from brief" text="Use intake first when the customer need is still forming." cta="Open Survey Import" onClick={() => nav("/app/survey-import")} />
                <StartCard title="Start from template" text="Use a proven room pattern when the use case is already clear." cta="Open Templates" onClick={() => nav("/app/templates")} />
                <StartCard title="Start from competitor" text="Use this when the customer is referencing another brand or part code." cta="Open Competitor Compare" onClick={() => nav("/app/tools/competitor")} />
              </div>
            </CollapsibleCard>
          </div>

          <div style={{ display: "grid", gap: 14, minWidth: 0 }}>
            <CollapsibleCard
              id="dash_guru"
              title="Guru"
              subtitle="Use Wingman when you need a guided answer rather than a manual search."
              right={
                <span
                  className="wm-btn wm-glow"
                  style={{
                    height: 32,
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "0 12px",
                    borderColor: "rgba(168,85,247,0.30)",
                    background: "rgba(168,85,247,0.16)",
                    color: "rgba(255,255,255,0.96)",
                  }}
                >
                  Live
                </span>
              }
            >
              <div style={{ display: "grid", gap: 12 }}>
                <button
                  type="button"
                  className="wm-btn wm-hover-lift"
                  style={{ height: 38, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}
                  onClick={() => nav("/app/tools/guru")}
                >
                  Open Guru
                </button>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.84)", lineHeight: 1.45 }}>
                  Example: "Small meeting room, 2 displays, 4 sources, 20m - suggest Bronze/Silver/Gold and explain the trade-offs."
                </div>
              </div>
            </CollapsibleCard>

            <CollapsibleCard
              id="dash_reference"
              title="Reference tools"
              subtitle="Keep specialist tools available without making the page long."
              defaultCollapsed={false}
            >
              <div style={{ display: "grid", gap: 10 }}>
                <button
                  type="button"
                  className="wm-btn wm-hover-lift"
                  style={{ height: 38, fontSize: 14 }}
                  onClick={() => nav("/app/tools/training")}
                >
                  Open Training Hub
                </button>
                <button
                  type="button"
                  className="wm-btn wm-hover-lift"
                  style={{ height: 38, fontSize: 14 }}
                  onClick={() => nav("/app/tools/videowall")}
                >
                  Open Video Wall Planner
                </button>
              </div>
            </CollapsibleCard>
          </div>
        </div>

        <div style={{ height: 4 }} />
      </div>
    </div>
  );
}