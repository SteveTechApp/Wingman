import React from "react";
import { useNavigate } from "react-router-dom";
import { WINGMAN_FEATURES, WINGMAN_TOOLS } from "./toolFeatureModel";

function cardStyle(primary?: boolean): React.CSSProperties {
  return {
    borderRadius: 12,
    padding: 10,
    border: primary
      ? "1px solid rgba(101,232,255,0.22)"
      : "1px solid rgba(255,255,255,0.06)",
    background: "linear-gradient(180deg, rgba(9,18,30,0.88), rgba(6,12,22,0.92))",
    boxShadow: "0 6px 18px rgba(0,0,0,0.16)",
    minHeight: 106,
  };
}

function smallButtonStyle(primary?: boolean): React.CSSProperties {
  return {
    appearance: "none",
    border: primary
      ? "1px solid rgba(101,232,255,0.34)"
      : "1px solid rgba(255,255,255,0.08)",
    background: primary
      ? "linear-gradient(90deg, rgba(26,165,143,0.98), rgba(27,141,120,0.98))"
      : "rgba(255,255,255,0.035)",
    color: "#eef6ff",
    borderRadius: 8,
    padding: "6px 9px",
    fontWeight: 700,
    fontSize: 11.5,
    cursor: "pointer",
  };
}

function tagStyle(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 999,
    padding: "3px 7px",
    fontSize: 9.5,
    fontWeight: 800,
    letterSpacing: 0.35,
    color: "#d9eef9",
    background: "rgba(101,232,255,0.09)",
    border: "1px solid rgba(101,232,255,0.16)",
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
        gap: 12,
        padding: "2px 2px 8px",
        minHeight: "calc(100vh - 132px)",
        alignContent: "start",
      }}
    >
      <section
        style={{
          borderRadius: 14,
          padding: "12px 14px",
          border: "1px solid rgba(101,232,255,0.10)",
          background: "linear-gradient(135deg, rgba(8,19,32,0.96), rgba(6,11,19,0.96))",
          boxShadow: "0 10px 24px rgba(0,0,0,0.16)",
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
            <div style={{ fontSize: 15, fontWeight: 900, color: "#f6fbff", lineHeight: 1.15 }}>
              Tools help you decide. Features help you build.
            </div>
            <div style={{ color: "rgba(226,235,244,0.76)", lineHeight: 1.4, fontSize: 11, marginTop: 2 }}>
              Use tools during design and sales conversations. Use features to create designs, BOMs and proposals.
            </div>
          </div>

          {startProject ? (
            <button
              type="button"
              style={{
                ...smallButtonStyle(true),
                padding: "9px 14px",
                minWidth: 134,
              }}
              onClick={() => navigate(startProject.to)}
            >
              Start New Project
            </button>
          ) : null}
        </div>
      </section>

      <section style={{ display: "grid", gap: 6 }}>
        <div style={{ fontSize: 13, fontWeight: 900, color: "#f2f7ff" }}>Tools</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: 8,
          }}
        >
          {WINGMAN_TOOLS.map((item) => (
            <div key={item.id} style={cardStyle()}>
              <div style={{ display: "grid", gap: 7 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#f4f8ff" }}>{item.title}</div>
                  {item.tag ? <span style={tagStyle()}>{item.tag}</span> : null}
                </div>

                <div style={{ color: "rgba(225,234,244,0.78)", lineHeight: 1.3, fontSize: 11 }}>
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

      <section style={{ display: "grid", gap: 6 }}>
        <div style={{ fontSize: 13, fontWeight: 900, color: "#f2f7ff" }}>Features</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: 8,
          }}
        >
          {WINGMAN_FEATURES.map((item) => (
            <div key={item.id} style={cardStyle(item.id === "start-project")}>
              <div style={{ display: "grid", gap: 7 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#f4f8ff" }}>{item.title}</div>
                  {item.tag ? <span style={tagStyle()}>{item.tag}</span> : null}
                </div>

                <div style={{ color: "rgba(225,234,244,0.78)", lineHeight: 1.3, fontSize: 11 }}>
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