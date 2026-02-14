import React from "react";
import RoomWizard from "@/components/RoomWizard";
import ToolPageLayout from "@/components/layout/ToolPageLayout";

export default function RoomWizardPage() {
  return (
    <ToolPageLayout
      title="Room Wizard"
      subtitle="Guided room design flow with implementation recommendations."
    >
      <div className="wm-card wm-card-pad">
        <RoomWizard />
      </div>
    </ToolPageLayout>
  );
}
