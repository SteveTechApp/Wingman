import * as React from "react";
import PageFrame from "@/app/layout/PageFrame";
import PageSection from "@/app/layout/PageSection";

export default function DiscoveryPage() {
  return (
    <PageFrame
      title="Discovery"
      subtitle="Capture room, customer, and system requirements before recommending hardware."
    >
      <PageSection compact>
        <div className="wm-hero">
          <div className="wm-heroCard">
            <span className="wm-kicker">Focused Layout</span>
            <h3>Discovery</h3>
            <p>Keep the user focused on key inputs first and summary output second.</p>
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
        title="Project Discovery"
        subtitle="Capture room, customer, and system requirements before recommending hardware."
      >
        <div className="wm-tool-grid">
          <div className="wm-tool">
            <div>
              <span className="wm-tool__tag">Primary</span>
              <h4>Project Discovery</h4>
              <p>Structure the page around customer details, room details, display counts, source counts, distances, control, audio, and budget.</p>
            </div>
          </div>

          <div className="wm-tool">
            <div>
              <span className="wm-tool__tag">Support</span>
              <h4>What To Capture</h4>
              <p>Reduce clutter by using larger grouped sections rather than many small cards.</p>
            </div>
          </div>
        </div>
      </PageSection>
    </PageFrame>
  );
}