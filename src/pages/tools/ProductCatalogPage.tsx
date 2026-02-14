import React from "react";
import { Link } from "react-router-dom";

export default function ProductCatalogPage() {
  return (
    <div className="wm-page">
      <div className="wm-page-header">
        <div>
          <div className="wm-page-title">Product Catalog</div>
          <div className="wm-page-sub">Browse WyreStorm categories and jump into active workspace flows.</div>
        </div>
      </div>

      <div className="wm-page-body" style={{ display: "grid", gap: "var(--wm-gap)" }}>
        <div className="wm-card wm-card-pad">
          <div className="wm-h2">Quick links</div>
          <div className="wm-row" style={{ marginTop: 10, gap: 8, flexWrap: "wrap" }}>
            <Link className="wm-btn wm-btn-primary" to="/app/projects">Open Projects</Link>
            <Link className="wm-btn" to="/tools/room-wizard">Open Room Wizard</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
