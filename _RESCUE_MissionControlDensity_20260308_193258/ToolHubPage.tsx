import React from "react";
import { useNavigate } from "react-router-dom";
import { WINGMAN_FEATURES, WINGMAN_TOOLS } from "./toolFeatureModel";

function cardStyle(primary?: boolean): React.CSSProperties {
  return {
    borderRadius: 14,
    padding: 12,
    border: primary
      ? "1px solid rgba(101,232,255,0.24)"
      : "1px solid rgba(255,255,255,0.08)",
    background: "linear-gradient(180deg, rgba(10,20,32,0.88), rgba(7,13,22,0.92))",
    boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
    minHeight: 118,
  };
}

function smallButtonStyle(primary?: boolean): React.CSSProperties {
  return {
    appearance: "none",
    border: primary
      ? "1px solid rgba(101,232,255,0.35)"
      : "1px solid rgba(255,255,255,0.10)",
    background: primary
      ? "linear-gradient(90deg, rgba(26,165,143,0.98), rgba(27,141,120,0.98))"
      : "rgba(255,255,255,0.04)",
    color: "#eef6ff",
    borderRadius: 9,
    padding: "7px 10px",
    fontWeight: 700,
    fontSize: 12,
    cursor: "pointer",
  };
}

function tagStyle(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 999,
    padding: "4px 8px",
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: 0.4,
    color: "#d9eef9",
    background: "rgba(101,232,255,0.10)",
    border: "1px solid rgba(101,232,255,0.18)",
    whiteSpace: "nowrap",
  };
}

export default function ToolHubPage() {
  const navigate = useNavigate();
  const startProject = WINGMAN_FEATURES.find((x) => x.id === "start-project");

  return (
    <div
      style={{
        display: "grid",
        gap: 14,
        padding: "6px 8px 10px",
        minHeight: "calc(100vh - 140px)",
        alignContent: "start",
      }}
    >
      <section
        style={{
          borderRadius: 16,
          padding: "14px 16px",
          border: "1px solid rgba(101,232,255,0.12)",
          background: "linear-gradient(135deg, rgba(10,22,36,0.96), rgba(8,12,20,0.96))",
          boxShadow: "0 12px 32px rgba(0,0,0,0.18)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 12,
            alignItems: "center",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#f6fbff", lineHeight: 1.15 }}>
              Tools help you decide. Features help you build.
            </div>
            <div style={{ color: "rgba(226,235,244,0.78)", lineHeight: 1.45, fontSize: 11.5, marginTop: 3 }}>
              Tools are utilities available at any time. Features create designs, BOMs and proposals.
            </div>
          </div>

          {startProject ? (
            <button
              type="button"
              style={{
                ...smallButtonStyle(true),
                padding: "10px 16px",
                minWidth: 140,
              }}
              onClick={() => navigate(startProject.to)}
            >
              Start New Project
            </button>
          ) : null}
        </div>
      </section>

      <section style={{ display: "grid", gap: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 900, color: "#f2f7ff" }}>Tools</div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 10,
          }}
        >
          {WINGMAN_TOOLS.map((item) => (
            <div key={item.id} style={cardStyle()}>
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: "#f4f8ff" }}>{item.title}</div>
                  {item.tag ? <span style={tagStyle()}>{item.tag}</span> : null}
                </div>

                <div style={{ color: "rgba(225,234,244,0.80)", lineHeight: 1.35, fontSize: 11.5 }}>
                  {item.description}
                </div>

                <div>
                  <button type="button" style={smallButtonStyle()} onClick={() => navigate(item.to)}>
                    Open {item.title}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ display: "grid", gap: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 900, color: "#f2f7ff" }}>Features</div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 10,
          }}
        >
          {WINGMAN_FEATURES.map((item) => (
            <div key={item.id} style={cardStyle(item.id === "start-project")}>
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: "#f4f8ff" }}>{item.title}</div>
                  {item.tag ? <span style={tagStyle()}>{item.tag}</span> : null}
                </div>

                <div style={{ color: "rgba(225,234,244,0.80)", lineHeight: 1.35, fontSize: 11.5 }}>
                  {item.description}
                </div>

                <div>
                  <button
                    type="button"
                    style={smallButtonStyle(item.id === "start-project")}
                    onClick={() => navigate(item.to)}
                  >
                    Open {item.title}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}