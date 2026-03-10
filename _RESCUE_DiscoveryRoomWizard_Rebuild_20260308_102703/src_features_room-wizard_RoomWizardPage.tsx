import * as React from "react";
import PageFrame from "@/app/layout/PageFrame";
import PageSection from "@/app/layout/PageSection";

export default function RoomWizardPage() {
  return (
    <PageFrame
      title="Room Wizard"
      subtitle="Start from proven room and market templates to reduce design time."
    >
      <PageSection compact>
        <div className="wm-hero">
          <div className="wm-heroCard">
            <span className="wm-kicker">Focused Layout</span>
            <h3>Room Wizard</h3>
            <p>This page should quickly guide the user from room type to recommended design pathway.</p>
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
        title="Template Selection"
        subtitle="Start from proven room and market templates to reduce design time."
      >
        <div className="wm-tool-grid">
          <div className="wm-tool">
            <div>
              <span className="wm-tool__tag">Primary</span>
              <h4>Template Selection</h4>
              <p>Lead with market type, room type, and expected use case before showing template options.</p>
            </div>
          </div>

          <div className="wm-tool">
            <div>
              <span className="wm-tool__tag">Support</span>
              <h4>Recommendation Logic</h4>
              <p>Show only the most relevant templates first, then let the user expand to alternatives.</p>
            </div>
          </div>
        </div>
      </PageSection>
    </PageFrame>
  );
}