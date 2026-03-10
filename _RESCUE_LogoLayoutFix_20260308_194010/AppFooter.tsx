import * as React from "react";

const linkStyle: React.CSSProperties = {
  color: "rgba(216,230,255,0.82)",
  textDecoration: "none",
  fontSize: 12,
  fontWeight: 600,
  whiteSpace: "nowrap",
};

export default function AppFooter() {
  const year = new Date().getFullYear();

  return (
    <footer
      style={{
        width: "100%",
        minHeight: 44,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "0 18px",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        background: "linear-gradient(180deg, rgba(5,15,28,0.98), rgba(4,12,23,0.98))",
        color: "rgba(216,230,255,0.78)",
        fontSize: 12,
        lineHeight: 1,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          minWidth: 0,
          overflow: "hidden",
          flexWrap: "nowrap",
        }}
      >
        <span style={{ fontWeight: 700, color: "#eef5ff", whiteSpace: "nowrap" }}>
          WyreStorm Wingman
        </span>
        <span style={{ whiteSpace: "nowrap" }}>| Sales and design workspace</span>
      </div>

      <nav
        aria-label="Corporate WyreStorm links"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          justifyContent: "flex-end",
          flexWrap: "nowrap",
        }}
      >
        <a href="https://www.wyrestorm.com" target="_blank" rel="noreferrer" style={linkStyle}>WyreStorm</a>
        <a href="https://www.wyrestorm.com/support/" target="_blank" rel="noreferrer" style={linkStyle}>Support</a>
        <a href="https://www.wyrestorm.com/contact/" target="_blank" rel="noreferrer" style={linkStyle}>Contact</a>
        <a href="https://www.wyrestorm.com/privacy-policy/" target="_blank" rel="noreferrer" style={linkStyle}>Privacy</a>
        <a href="https://www.wyrestorm.com/terms-conditions/" target="_blank" rel="noreferrer" style={linkStyle}>Terms</a>
        <span style={{ whiteSpace: "nowrap" }}>Copyright {year} WyreStorm</span>
      </nav>
    </footer>
  );
}