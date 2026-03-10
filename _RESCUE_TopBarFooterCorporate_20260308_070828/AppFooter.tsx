import * as React from "react";

export default function AppFooter() {
  return (
    <footer
      className="wm-app-footer"
      style={{
        minHeight: 28,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        flexWrap: "wrap",
        fontSize: 11,
        lineHeight: 1.2,
        color: "rgba(220,230,245,0.72)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontWeight: 800, color: "#eef6ff" }}>WyreStorm Wingman</span>
        <span style={{ opacity: 0.6 }}>•</span>
        <span>Sales and design workspace</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span>© 2026 WyreStorm</span>
      </div>
    </footer>
  );
}