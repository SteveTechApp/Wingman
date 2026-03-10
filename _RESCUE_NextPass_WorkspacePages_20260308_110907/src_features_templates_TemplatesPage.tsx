import * as React from "react";
import PageFrame from "@/app/layout/PageFrame";
import PageSection from "@/app/layout/PageSection";

export default function TemplatesPage() {
  return (
    <PageFrame
      title="Templates"
      subtitle="Use standardised room and market templates to accelerate solution building."
    >
      <PageSection compact>
        <div className="wm-hero">
          <div className="wm-heroCard">
            <span className="wm-kicker">Focused Layout</span>
            <h3>Templates</h3>
            <p>This page should be fast to scan and easy to apply to the active workspace.</p>
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
        title="Template Library"
        subtitle="Use standardised room and market templates to accelerate solution building."
      >
        <div className="wm-tool-grid">
          <div className="wm-tool">
            <div>
              <span className="wm-tool__tag">Primary</span>
              <h4>Template Library</h4>
              <p>Make templates easy to compare by market, room type, solution tier, and recommended families.</p>
            </div>
          </div>

          <div className="wm-tool">
            <div>
              <span className="wm-tool__tag">Support</span>
              <h4>Usage Guidance</h4>
              <p>Show why a template is useful before presenting deeper configuration choices.</p>
            </div>
          </div>
        </div>
      </PageSection>
    </PageFrame>
  );
}