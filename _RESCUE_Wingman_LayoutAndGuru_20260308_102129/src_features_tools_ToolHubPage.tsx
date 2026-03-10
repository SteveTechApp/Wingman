import * as React from "react";
import PageFrame from "@/app/layout/PageFrame";
import PageSection from "@/app/layout/PageSection";

export default function ToolHubPage() {
  return (
    <PageFrame
      title="ToolHub"
      subtitle="Launch the right Wingman tool quickly without hunting through navigation."
    >
      <PageSection compact>
        <div className="wm-hero">
          <div className="wm-heroCard">
            <span className="wm-kicker">Focused Layout</span>
            <h3>ToolHub</h3>
            <p>This page should feel like a fast launcher, not a crowded admin screen.</p>
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
        title="Tool Launcher"
        subtitle="Launch the right Wingman tool quickly without hunting through navigation."
      >
        <div className="wm-tool-grid">
          <div className="wm-tool">
            <div>
              <span className="wm-tool__tag">Primary</span>
              <h4>Tool Launcher</h4>
              <p>Group tools by workflow stage so sales, pre-sales, and design users can move faster.</p>
            </div>
          </div>

          <div className="wm-tool">
            <div>
              <span className="wm-tool__tag">Support</span>
              <h4>Recommended Flow</h4>
              <p>Discovery should lead to design, then product selection, then proposal output.</p>
            </div>
          </div>
        </div>
      </PageSection>
    </PageFrame>
  );
}