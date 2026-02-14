import React from "react";
import { Link } from "react-router-dom";
import ToolPageLayout from "@/components/layout/ToolPageLayout";

export default function ProductCatalogPage() {
  return (
    <ToolPageLayout
      title="Product Catalog"
      subtitle="Browse WyreStorm categories and jump into active workspace flows."
    >
      <div className="wm-card wm-card-pad">
        <div className="wm-h2">Quick links</div>
        <div className="wm-row" style={{ marginTop: 10, gap: 8, flexWrap: "wrap" }}>
          <Link className="wm-btn wm-btn-primary" to="/app/projects">
            Open Projects
          </Link>
          <Link className="wm-btn" to="/tools/room-wizard">
            Open Room Wizard
          </Link>
        </div>
      </div>
    </ToolPageLayout>
  );
}
