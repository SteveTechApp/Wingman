import React from "react";
import RoomWizard from "@/components/RoomWizard";

export default function RoomWizardPage() {
  return (
    <div className="wm-page">
      <div className="wm-page-header">
        <div>
          <div className="wm-page-title">Room Wizard</div>
          <div className="wm-page-sub">Guided room design flow with implementation recommendations.</div>
        </div>
      </div>

      <div className="wm-page-body" style={{ display: "grid", gap: "var(--wm-gap)" }}>
        <div className="wm-card wm-card-pad">
          <RoomWizard />
        </div>
      </div>
    </div>
  );
}
