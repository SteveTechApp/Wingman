import * as React from "react";

import { Link } from "react-router-dom";
import PageShell from "@/app/layout/PageShell";
import LogoLockup from "@/components/brand/LogoLockup";

function FeatureTile(props: { title: string; desc: string }) {
  return (
    <div className="wm-tile">
      <div className="wm-tile-title">{props.title}</div>
      <div className="wm-tile-sub">{props.desc}</div>
    </div>
  );
}

export default function PublicLandingPage() {
  return (
    <PageShell>
      <div className="wm-container" style={{ display: "grid", gap: 14 }}>
        <div className="wm-hero">
          <LogoLockup />

          <div style={{ position: "relative", zIndex: 1, textAlign: "center", display: "grid", gap: 10 }}>
            <div className="wm-kicker">Design | Compare | Propose | Win</div>

            <div className="wm-h1">AV Sales. Simplified.</div>

            <div className="wm-subtitle">
              Design systems, compare competitors, generate proposals and win projects faster | all from one intelligent platform.
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 6 }}>
              <Link className="wm-btn wm-btn-primary" to="/login">Log in</Link>
              <Link className="wm-btn" to="/signup">Create account</Link>
              <Link className="wm-btn" to="/app/tools">Open ToolHub</Link>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 8 }}>
              <span className="wm-chip">Fast product selection</span>
              <span className="wm-chip">Proposal tiers</span>
              <span className="wm-chip">Competitor matching</span>
              <span className="wm-chip">Guided wizards</span>
            </div>
          </div>
        </div>

        <div className="wm-grid wm-grid-3">
          <FeatureTile title="ToolHub" desc="One place to launch every Wingman workflow, from room design to videowalls." />
          <FeatureTile title="Projects" desc="Centralised project context so tools stay consistent and proposals stay accurate." />
          <FeatureTile title="Competitor Compare" desc="Quick matching and position guidance to help you win more bids." />
        </div>

        <div className="wm-section" style={{ padding: 14 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 900, fontSize: 14 }}>Uniform UI, everywhere</div>
            <div style={{ color: "var(--wm-muted)", fontSize: 12, lineHeight: 1.35 }}>
              This UI uses the Wingman design system so every page shares the same spacing, surfaces, borders and typography.
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

