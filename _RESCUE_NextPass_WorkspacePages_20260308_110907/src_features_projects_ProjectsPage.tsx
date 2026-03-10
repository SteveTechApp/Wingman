import * as React from "react";
import PageFrame from "@/app/layout/PageFrame";
import PageSection from "@/app/layout/PageSection";

export default function ProjectsPage() {
  return (
    <PageFrame
      title="Projects"
      subtitle="Open, resume, and manage active Wingman workspaces."
    >
      <PageSection compact>
        <div className="wm-hero">
          <div className="wm-heroCard">
            <span className="wm-kicker">Focused Layout</span>
            <h3>Projects</h3>
            <p>Use this area to continue active opportunities and keep each customer project organised.</p>
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
        title="Saved Workspaces"
        subtitle="Open, resume, and manage active Wingman workspaces."
      >
        <div className="wm-tool-grid">
          <div className="wm-tool">
            <div>
              <span className="wm-tool__tag">Primary</span>
              <h4>Saved Workspaces</h4>
              <p>Present recent projects first, then allow quick resume, rename, archive, and status review.</p>
            </div>
          </div>

          <div className="wm-tool">
            <div>
              <span className="wm-tool__tag">Support</span>
              <h4>Project Actions</h4>
              <p>Keep the main actions visible: create new project, open recent project, and review stage progress.</p>
            </div>
          </div>
        </div>
      </PageSection>
    </PageFrame>
  );
}