import React from "react";

export default function Footer() {
  return (
    <footer
      className="wm-footer"
      role="contentinfo"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "14px 18px",
        flexWrap: "nowrap",
      }}
    >
      <div
        className="wm-footer-left"
        style={{ display: "flex", alignItems: "center", gap: 10, whiteSpace: "nowrap", minWidth: 0 }}
      >
        <div style={{ fontWeight: 650 }}>WyreStorm Wingman</div>
        <div style={{ opacity: 0.8 }}>Build 2026.02</div>
      </div>

      <nav
        className="wm-footer-right"
        aria-label="Corporate links"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginLeft: "auto",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ opacity: 0.35 }}> </span>
        <a href="https://www.wyrestorm.com" target="_blank" rel="noreferrer">
          WyreStorm Corporate
        </a>
        <a href="https://support.wyrestorm.com" target="_blank" rel="noreferrer">
          Support
        </a>
      </nav>
    </footer>
  );
}