import * as React from "react";
import PageFrame from "@/app/layout/PageFrame";
import PageSection from "@/app/layout/PageSection";

export default function CompetitorComparePage() {
  return (
    <PageFrame
      title="Competitor Compare"
      subtitle="Position WyreStorm against alternative options with a simpler comparison workflow."
    >
      <PageSection compact>
        <div className="wm-hero">
          <div className="wm-heroCard">
            <span className="wm-kicker">Focused Layout</span>
            <h3>Competitor Compare</h3>
            <p>Keep the compare page focused on substitutions and decision support.</p>
          </div>

          <div className="wm-heroCard">
            <span className="wm-kicker">Wingman Guidance</span>
            <h3>Keep the task obvious</h3>
            <p>
              Use one primary action, reduce competing panels, and show supporting detail only where it helps
              the sales or design workflow progress.
            </p>
          </div>
        </div>
      </PageSection>

      <PageSection
        title="Comparison Workspace"
        subtitle="Position WyreStorm against alternative options with a simpler comparison workflow."
      >
        <div className="wm-tool-grid">
          <div className="wm-tool">
            <div>
              <span className="wm-tool__tag">Primary</span>
              <h4>Comparison Workspace</h4>
              <p>Start with category matching, then show strengths, differences, and recommended substitutes.</p>
            </div>
          </div>

          <div className="wm-tool">
            <div>
              <span className="wm-tool__tag">Support</span>
              <h4>Decision Support</h4>
              <p>Avoid large dense matrices unless the user explicitly drills down.</p>
            </div>
          </div>
        </div>
      </PageSection>
    </PageFrame>
  );
}