import * as React from "react";
import PageFrame from "@/app/layout/PageFrame";
import PageSection from "@/app/layout/PageSection";
import LiveProjectStrip from "@/app/widgets/LiveProjectStrip";
import { loadProjectState, updateProjectState } from "@/core/workflow/projectState";

export default function ProposalBuilderPage() {
  const [state, setState] = React.useState(() => loadProjectState());

  function moveToProposal() {
    const next = updateProjectState({ stage: "Proposal" });
    setState(next);
  }

  return (
    <PageFrame
      title="Proposal Builder"
      subtitle="Prepare BOM structure and proposal-ready notes using carried-forward project data."
      actions={
        <button type="button" className="wm-btn-primary" onClick={moveToProposal}>
          Mark Proposal Stage
        </button>
      }
    >
      <div className="wm-dashboard">
        <LiveProjectStrip />
        <PageSection
          title="Project Summary"
          subtitle="This proposal view is reading the active project state."
          compact
        >
          <div className="wm-summaryCard">
            <p><strong>Project:</strong> {state.name}</p>
            <p><strong>Customer:</strong> {state.customer || "-"}</p>
            <p><strong>Room Type:</strong> {state.roomType || "-"}</p>
            <p><strong>Application:</strong> {state.application || "-"}</p>
            <p><strong>Displays:</strong> {state.displayCount ?? 0}</p>
            <p><strong>Sources:</strong> {state.sourceCount ?? 0}</p>
            <p><strong>Distance:</strong> {state.distanceM ?? 0}m</p>
            <p><strong>Budget:</strong> {state.budgetBand || "-"}</p>
          </div>
        </PageSection>

        <PageSection
          title="Carried Design Inputs"
          subtitle="Data from AV Guide and VideoWall Designer is available here for proposal framing."
          compact
        >
          <div className="wm-summaryCard">
            <p><strong>Control:</strong> {state.avGuide?.control || "-"}</p>
            <p><strong>USB:</strong> {state.avGuide?.usb || "-"}</p>
            <p><strong>Audio:</strong> {state.avGuide?.audio || "-"}</p>
            <p><strong>Wall Type:</strong> {state.videoWall?.wallType || "-"}</p>
            <p><strong>Wall Layout:</strong> {state.videoWall?.layout || "-"}</p>
            <p><strong>Wall Processor:</strong> {state.videoWall?.processor || "-"}</p>
          </div>
        </PageSection>

        <PageSection
          title="Current BOM"
          subtitle="Current items saved in the active project."
          compact
        >
          <div className="wm-bomList">
            {(state.bom ?? []).length === 0 ? (
              <div className="wm-summaryCard">
                <p>No BOM items added yet.</p>
              </div>
            ) : (
              (state.bom ?? []).map((row, idx) => (
                <div key={idx} className="wm-bomRow">
                  <div><strong>{row.sku}</strong></div>
                  <div>{row.desc}</div>
                  <div>Qty: {row.qty}</div>
                  <div>{row.role}</div>
                </div>
              ))
            )}
          </div>
        </PageSection>
      </div>
    </PageFrame>
  );
}