import * as React from "react";
import PageFrame from "@/app/layout/PageFrame";
import PageSection from "@/app/layout/PageSection";
import LiveProjectStrip from "@/app/widgets/LiveProjectStrip";
import { loadProjectState, updateProjectState } from "@/core/workflow/projectState";
import { buildProposalDraft } from "./proposalIntelligence";

export default function ProposalBuilderPage() {
  const [state, setState] = React.useState(() => loadProjectState());

  const draft = React.useMemo(() => buildProposalDraft(state), [state]);

  function refreshState() {
    setState(loadProjectState());
  }

  function moveToProposal() {
    const next = updateProjectState({ stage: "Proposal" });
    setState(next);
  }

  React.useEffect(() => {
    const onFocus = () => refreshState();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  return (
    <PageFrame
      title="Proposal Builder"
      subtitle="Prepare BOM structure and proposal-ready notes using carried-forward project data."
      actions={
        <div className="wm-toolbar">
          <button type="button" className="wm-btn-secondary" onClick={refreshState}>
            Refresh Data
          </button>
          <button type="button" className="wm-btn-primary" onClick={moveToProposal}>
            Mark Proposal Stage
          </button>
        </div>
      }
    >
      <div className="wm-dashboard">
        <LiveProjectStrip />

        <PageSection
          title="First-Draft Solution Summary"
          subtitle="Generated from the active AV Guide and VideoWall project data."
          compact
        >
          <div className="wm-summaryCard">
            <p>{draft.solutionSummary}</p>
          </div>
        </PageSection>

        <PageSection
          title="Project Summary"
          subtitle="Current saved project values used to frame the proposal."
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
          title="Assumptions"
          subtitle="Use these as the starting assumptions block for the proposal."
          compact
        >
          <div className="wm-listCard">
            {draft.assumptions.map((item, idx) => (
              <div key={idx} className="wm-listCard__row">
                <span className="wm-listCard__index">{idx + 1}</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </PageSection>

        <PageSection
          title="Commercial Notes"
          subtitle="Suggested commercial framing points for the draft document."
          compact
        >
          <div className="wm-listCard">
            {draft.commercialNotes.map((item, idx) => (
              <div key={idx} className="wm-listCard__row">
                <span className="wm-listCard__index">{idx + 1}</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </PageSection>

        <PageSection
          title="Recommended Next Steps"
          subtitle="Use these to move the opportunity toward issue-ready proposal status."
          compact
        >
          <div className="wm-listCard">
            {draft.nextSteps.map((item, idx) => (
              <div key={idx} className="wm-listCard__row">
                <span className="wm-listCard__index">{idx + 1}</span>
                <span>{item}</span>
              </div>
            ))}
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