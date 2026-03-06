import * as React from "react";
// src/features/projects/ProjectNewPage.tsx

import { useNavigate } from "react-router-dom";
import { createProject } from "@/features/projects/projectStore";

function card(): React.CSSProperties {
  return {
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 16,
    background: "rgba(16,22,32,0.72)",
    padding: 14,
  };
}

function buttonStyle(primary?: boolean): React.CSSProperties {
  return {
    borderRadius: 12,
    border: primary
      ? "1px solid rgba(120,200,255,0.26)"
      : "1px solid rgba(255,255,255,0.12)",
    background: primary
      ? "rgba(120,200,255,0.14)"
      : "rgba(255,255,255,0.08)",
    color: "rgba(255,255,255,0.92)",
    padding: "9px 12px",
    minHeight: 36,
    cursor: "pointer",
    font: "inherit",
    whiteSpace: "nowrap",
  };
}

export default function ProjectNewPage() {
  const nav = useNavigate();
  const [name, setName] = React.useState("");
  const [customer, setCustomer] = React.useState("");
  const [site, setSite] = React.useState("");

  function create() {
    const p = createProject({
      name: name.trim() || "New Project",
      customer: customer.trim(),
      site: site.trim(),
    });
    nav("/app/tools/discovery");
    return p;
  }

  return (
    <div style={{ minHeight: "100%", padding: 16, color: "rgba(255,255,255,0.92)" }}>
      <div style={{ ...card(), marginBottom: 14 }}>
        <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 6 }}>Start New Project</div>
        <div style={{ opacity: 0.78, fontSize: 13 }}>
          Create the workspace first, then complete discovery and generate the starter proposal.
        </div>
      </div>

      <div style={card()}>
        <div style={{ display: "grid", gap: 10 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ opacity: 0.82, fontSize: 12 }}>Project name</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g: Boardroom Upgrade"
              style={{
                width: "100%",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.05)",
                color: "rgba(255,255,255,0.92)",
                padding: "10px 10px",
                outline: "none",
                font: "inherit",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ opacity: 0.82, fontSize: 12 }}>Customer</div>
            <input
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              placeholder="e.g: Acme Ltd"
              style={{
                width: "100%",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.05)",
                color: "rgba(255,255,255,0.92)",
                padding: "10px 10px",
                outline: "none",
                font: "inherit",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ opacity: 0.82, fontSize: 12 }}>Site</div>
            <input
              value={site}
              onChange={(e) => setSite(e.target.value)}
              placeholder="e.g: London HQ"
              style={{
                width: "100%",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.05)",
                color: "rgba(255,255,255,0.92)",
                padding: "10px 10px",
                outline: "none",
                font: "inherit",
              }}
            />
          </label>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
            <button type="button" onClick={() => nav("/app/projects")} style={buttonStyle()}>
              Cancel
            </button>
            <button type="button" onClick={create} style={buttonStyle(true)}>
              Create and open Discovery
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
