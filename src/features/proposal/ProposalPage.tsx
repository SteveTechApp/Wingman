import React from "react";
import ExecutiveSummary from "./components/ExecutiveSummary";
import SystemDesign from "./components/SystemDesign";
import BOMTable from "./components/BOMTable";
import ProposalConfidencePanel from "./components/ProposalConfidencePanel";
import { useProposalProjectData } from "./hooks/useProposalProjectData";

export default function ProposalPage() {
  const model = useProposalProjectData();

  return (
    <div
      className="wm-page"
      style={{
        maxWidth: 1240,
        margin: "0 auto",
        width: "100%",
        display: "grid",
        gap: 18,
      }}
    >
      <ExecutiveSummary model={model} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 2fr) minmax(320px, 1fr)",
          gap: 18,
          alignItems: "start",
        }}
      >
        <div style={{ display: "grid", gap: 18 }}>
          <section style={{ display: "grid", gap: 10 }}>
            <div style={{ fontSize: 15, fontWeight: 900 }}>System Design</div>
            <SystemDesign model={model} />
          </section>

          <section style={{ display: "grid", gap: 10 }}>
            <div style={{ fontSize: 15, fontWeight: 900 }}>Bill of Materials</div>
            <BOMTable model={model} />
          </section>
        </div>

        <div style={{ display: "grid", gap: 18 }}>
          <ProposalConfidencePanel model={model} />
        </div>
      </div>
    </div>
  );
}