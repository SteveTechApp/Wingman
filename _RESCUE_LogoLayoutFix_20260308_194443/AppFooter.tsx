import React from "react";

export default function AppFooter() {
  return (
    <footer
      style={{
        height: 32,
        minHeight: 32,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 12px",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(4,10,18,0.92)",
        color: "rgba(225,234,244,0.76)",
        fontSize: 11,
        lineHeight: 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, whiteSpace: "nowrap", overflow: "hidden" }}>
        <span style={{ fontWeight: 700 }}>WyreStorm</span>
        <span>Support</span>
        <span>Contact</span>
        <span>Privacy</span>
        <span>Terms</span>
      </div>

      <div style={{ whiteSpace: "nowrap" }}>Copyright 2026 WyreStorm</div>
    </footer>
  );
}