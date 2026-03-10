import React from "react";
import { useNavigate } from "react-router-dom";
import { WINGMAN_FEATURES, WINGMAN_TOOLS, type WingmanItem } from "./toolFeatureModel";

function sectionStyle(): React.CSSProperties {
  return {
    display: "grid",
    gap: 16,
  };
}

function gridStyle(): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 16,
  };
}

function cardStyle(primary?: boolean): React.CSSProperties {
  return {
    borderRadius: 18,
    padding: primary ? 20 : 18,
    border: primary
      ? "1px solid rgba(101,232,255,0.30)"
      : "1px solid rgba(255,255,255,0.10)",
    background: primary
      ? "linear-gradient(180deg, rgba(16,31,44,0.96), rgba(8,16,27,0.96))"
      : "linear-gradient(180deg, rgba(13,21,33,0.94), rgba(8,13,22,0.92))",
    boxShadow: primary
      ? "0 18px 50px rgba(0,0,0,0.28)"
      : "0 10px 28px rgba(0,0,0,0.18)",
  };
}

function buttonStyle(primary?: boolean): React.CSSProperties {
  return {
    appearance: "none",
    border: primary ? "1px solid rgba(101,232,255,0.35)" : "1px solid rgba(255,255,255,0.10)",
    background: primary
      ? "linear-gradient(90deg, rgba(26,165,143,0.98), rgba(27,141,120,0.98))"
      : "rgba(255,255,255,0.04)",
    color: "#eef6ff",
    borderRadius: 12,
    padding: "11px 14px",
    fontWeight: 700,
    cursor: "pointer",
    textAlign: "left" as const,
  };
}

function pillStyle(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.3,
    color: "#d9eef9",
    background: "rgba(101,232,255,0.10)",
    border: "1px solid rgba(101,232,255,0.18)",
  };
}

function itemCard(item: WingmanItem, navigate: ReturnType<typeof useNavigate>, primary?: boolean) {
  return (
    <div key={item.id} style={cardStyle(primary)}>
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ fontSize: primary ? 22 : 18, fontWeight: 800, color: "#f4f8ff" }}>
            {item.title}
          </div>
          {item.tag ? <span style={pillStyle()}>{item.tag}</span> : null}
        </div>

        <div style={{ color: "rgba(225,234,244,0.84)", lineHeight: 1.55, fontSize: 14 }}>
          {item.description}
        </div>

        {item.highlight ? (
          <div style={{ color: "rgba(101,232,255,0.92)", fontSize: 13, fontWeight: 700 }}>
            {item.highlight}
          </div>
        ) : null}

        <div>
          <button type="button" style={buttonStyle(primary)} onClick={() => navigate(item.to)}>
            Open {item.title}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ToolHubPage() {
  const navigate = useNavigate();
  const startProject = WINGMAN_FEATURES.find((x) => x.id === "start-project");

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <section
        style={{
          borderRadius: 22,
          padding: 24,
          border: "1px solid rgba(101,232,255,0.14)",
          background: "linear-gradient(135deg, rgba(12,24,38,0.98), rgba(8,12,20,0.96))",
          boxShadow: "0 18px 50px rgba(0,0,0,0.24)",
        }}
      >
        <div style={{ display: "grid", gap: 14 }}>
          <div style={pillStyle()}>Launchpad</div>

          <div style={{ fontSize: 30, fontWeight: 900, color: "#f6fbff", lineHeight: 1.1 }}>
            Tools help you decide.
            <br />
            Features help you build.
          </div>

          <div style={{ maxWidth: 920, color: "rgba(226,235,244,0.82)", lineHeight: 1.6, fontSize: 15 }}>
            Use tools as always-available utilities during design and sales conversations. Use features when you want to
            create a project output, proposal path, or guided workflow.
          </div>

          {startProject ? (
            <div style={{ paddingTop: 4 }}>
              <button
                type="button"
                style={{
                  ...buttonStyle(true),
                  minWidth: 220,
                  textAlign: "center",
                }}
                onClick={() => navigate(startProject.to)}
              >
                Start New Project
              </button>
            </div>
          ) : null}
        </div>
      </section>

      <section style={sectionStyle()}>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#f2f7ff" }}>Tools</div>
          <div style={{ color: "rgba(219,229,239,0.76)", fontSize: 14 }}>
            Standalone utilities you can open at any point during a project.
          </div>
        </div>
        <div style={gridStyle()}>
          {WINGMAN_TOOLS.map((item) => itemCard(item, navigate))}
        </div>
      </section>

      <section style={sectionStyle()}>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#f2f7ff" }}>Features</div>
          <div style={{ color: "rgba(219,229,239,0.76)", fontSize: 14 }}>
            Guided workflows that help create projects, designs, BOMs, and proposals.
          </div>
        </div>
        <div style={gridStyle()}>
          {WINGMAN_FEATURES.map((item) => itemCard(item, navigate, item.id === "start-project"))}
        </div>
      </section>
    </div>
  );
}