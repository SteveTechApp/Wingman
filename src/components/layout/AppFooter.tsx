import React from "react";

export default function AppFooter() {
  return (
    <>
      <div className="wm-footer-muted">© {new Date().getFullYear()} WyreStorm</div>
      <div className="wm-footer-right">
        <span className="wm-footer-link">Wingman Pre-Sales Toolkit</span>
      </div>
    </>
  );
}
