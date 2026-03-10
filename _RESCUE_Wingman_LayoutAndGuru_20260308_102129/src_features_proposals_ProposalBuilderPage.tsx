import * as React from "react";
import PageFrame from "@/app/layout/PageFrame";
import PageSection from "@/app/layout/PageSection";

export default function ProposalBuilderPage() {
  return (
    <PageFrame
      title="Proposal Builder"
      subtitle="Turn approved project decisions into structured BOM and customer-facing output."
    >
      <PageSection compact>
        <div className="wm-hero">
          <div className="wm-heroCard">
            <span className="wm-kicker">Focused Layout</span>
            <h3>Proposal Builder</h3>
            <p>This page should feel like an output workspace with strong next actions.</p>
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
        title="Proposal Output"
        subtitle="Turn approved project decisions into structured BOM and customer-facing output."
      >
        <div className="wm-tool-grid">
          <div className="wm-tool">
            <div>
              <span className="wm-tool__tag">Primary</span>
              <h4>Proposal Output</h4>
              <p>Surface project summary, selected products, commercial notes, and document generation actions.</p>
            </div>
          </div>

          <div className="wm-tool">
            <div>
              <span className="wm-tool__tag">Support</span>
              <h4>Document Actions</h4>
              <p>Keep export, preview, and project summary actions visible at the top.</p>
            </div>
          </div>
        </div>
      </PageSection>
    </PageFrame>
  );
}