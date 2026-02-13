
import React from "react";
import PageShell from "@/components/layout/PageShell";
import CompetitorMatchFinderPanel from "@/components/app/tools/competitor-compare/CompetitorMatchFinderPanel";

export default function CompetitorComparisonPage() {
  return (
    <PageShell>
      <div className="wm-page">
      <div className="wm-page-header">
        <div>
          <div className="wm-page-title">Competitor Comparison</div>
          <div className="wm-page-sub">Map competitor SKUs to WyreStorm equivalents.</div>
        </div>
      </div>

      <div className="wm-page-body" style={{ display: "grid", gap: "var(--wm-gap)" }}>
        <div className="wm-card">
          <CompetitorMatchFinderPanel />
        </div>
      </div>
    </div>
    </PageShell>
  );
}

