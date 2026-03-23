import React from "react";
import ExecutiveSummary from "./components/ExecutiveSummary";
import SystemDesign from "./components/SystemDesign";
import BOMTable from "./components/BOMTable";
import ProposalConfidencePanel from "./components/ProposalConfidencePanel";
import { useProposalProjectData } from "./hooks/useProposalProjectData";

export default function ProposalPage() {
  const model = useProposalProjectData();

  return (
    <div className="wm-page wm-proposal-page">
      <div className="wm-proposal-page__stack">
        <section className="wm-proposal-page__intro">
          <div className="wm-kicker">Proposal Builder</div>
          <h1 className="wm-proposal-page__intro-title">Client-ready narrative and commercial scope</h1>
          <p className="wm-proposal-page__intro-copy">
            Review the executive story first, then tighten design logic, BOM scope, and confidence before you export or present.
          </p>
        </section>

        <ExecutiveSummary model={model} />

        <div className="wm-proposal-page__grid">
          <div className="wm-proposal-page__main">
            <section className="wm-proposal-page__section">
              <div className="wm-proposal-page__section-head">
                <div className="wm-proposal-page__section-title">System design</div>
                <div className="wm-proposal-page__section-copy">
                  Present the design in the same sequence a client or internal reviewer would walk it.
                </div>
              </div>
              <SystemDesign model={model} />
            </section>

            <section className="wm-proposal-page__section">
              <div className="wm-proposal-page__section-head">
                <div className="wm-proposal-page__section-title">Bill of materials</div>
                <div className="wm-proposal-page__section-copy">
                  Keep the scope visible and readable without overwhelming the commercial review.
                </div>
              </div>
              <BOMTable model={model} />
            </section>
          </div>

          <aside className="wm-proposal-page__rail">
            <ProposalConfidencePanel model={model} />
          </aside>
        </div>
      </div>
    </div>
  );
}
