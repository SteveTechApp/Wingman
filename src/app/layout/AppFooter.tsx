import React from "react";

export default function AppFooter() {
  return (
    <footer className="wm-footer">
      <div style={{ display: "flex", alignItems: "center", gap: 12, whiteSpace: "nowrap", overflow: "hidden" }}>
        <span style={{ fontWeight: 800 }}>WyreStorm Wingman</span>
        <span>Support</span>
        <span>Contact</span>
        <span>Privacy</span>
        <span>Terms</span>
      </div>

      <div style={{ whiteSpace: "nowrap" }}>Copyright 2026 WyreStorm</div>
    </footer>
  );
}