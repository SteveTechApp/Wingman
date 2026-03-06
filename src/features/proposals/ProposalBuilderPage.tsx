import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  getActiveProjectContext,
  updateActiveProjectBrief,
  updateProjectStatus,
} from "@/features/projects/projectDraftStore";

function Area({
  label,
  value,
  onChange,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  rows?: number;
}) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.62)",
        }}
      >
        {label}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        style={{
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.04)",
          color: "rgba(255,255,255,0.94)",
          padding: 12,
          outline: "none",
          resize: "vertical",
        }}
      />
    </label>
  );
}

export default function ProposalBuilderPage() {
  const nav = useNavigate();
  const ctx = React.useMemo(() => getActiveProjectContext(), []);
  const [saved, setSaved] = React.useState(false);

  const [executiveSummary, setExecutiveSummary] = React.useState("");
  const [solutionOverview, setSolutionOverview] = React.useState("");
  const [assumptions, setAssumptions] = React.useState("");
  const [exclusions, setExclusions] = React.useState("");
  const [commercialNotes, setCommercialNotes] = React.useState("");

  React.useEffect(() => {
    if (!ctx) return;

    setExecutiveSummary(
      ctx.brief.proposal.executiveSummary ||
      `${ctx.projectName} is based on a ${ctx.tier.label} ${ctx.roomType.name.toLowerCase()} design for ${ctx.verticalMarket.name.toLowerCase()} use.`
    );

    setSolutionOverview(
      ctx.brief.proposal.solutionOverview ||
      `The proposed solution is positioned to support ${ctx.roomType.name.toLowerCase()} requirements with ${ctx.tier.summary.toLowerCase()}`
    );

    setAssumptions(ctx.brief.proposal.assumptions);
    setExclusions(ctx.brief.proposal.exclusions);
    setCommercialNotes(
      ctx.brief.proposal?.commercialNotes || ctx.tier.commercialNote || ""
    );
  }, [ctx]);

  function saveProposalDraft() {
    if (!ctx) return;

    updateActiveProjectBrief({
      proposal: {
        executiveSummary,
        solutionOverview,
        assumptions,
        exclusions,
        commercialNotes,
      },
    });

    updateProjectStatus(ctx.projectId, "In Progress");
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  }

  return (
    <div className="wm-page wm-animate-in" style={{ width: "100%", maxWidth: "none", margin: 0, minWidth: 0 }}>
      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <div className="wm-page-eyebrow">TOOL</div>
          <h1 className="wm-page-title" style={{ marginBottom: 8 }}>Proposal Builder</h1>
          <div style={{ maxWidth: 980, fontSize: 14, color: "rgba(255,255,255,0.86)", lineHeight: 1.5 }}>
            Draft customer-facing proposal sections and save them into the active project.
          </div>
        </div>

        {!ctx ? (
          <section className="wm-card" style={{ padding: 18, borderRadius: 18 }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>No active project</div>
            <div style={{ marginTop: 8, fontSize: 14, color: "rgba(255,255,255,0.82)", lineHeight: 1.5 }}>
              Select a project first.
            </div>
            <div style={{ marginTop: 14 }}>
              <button
                type="button"
                className="wm-btn wm-btn-primary"
                style={{ height: 40, padding: "0 16px" }}
                onClick={() => nav("/app/projects")}
              >
                Open Projects
              </button>
            </div>
          </section>
        ) : (
          <>
            <section className="wm-card" style={{ padding: 18, borderRadius: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.62)" }}>
                Active project
              </div>
              <div style={{ marginTop: 8, fontWeight: 900, fontSize: 22 }}>{ctx.projectName}</div>
              <div style={{ marginTop: 8, fontSize: 13, color: "rgba(255,255,255,0.84)", lineHeight: 1.45 }}>
                {ctx.verticalMarket.name} / {ctx.roomType.name} / {ctx.tier.label}
              </div>
            </section>

            <section className="wm-card" style={{ padding: 18, borderRadius: 18, display: "grid", gap: 14 }}>
              <Area label="Executive summary" value={executiveSummary} onChange={setExecutiveSummary} rows={4} />
              <Area label="Solution overview" value={solutionOverview} onChange={setSolutionOverview} rows={4} />
              <Area label="Assumptions" value={assumptions} onChange={setAssumptions} rows={4} />
              <Area label="Exclusions" value={exclusions} onChange={setExclusions} rows={4} />
              <Area label="Commercial notes" value={commercialNotes} onChange={setCommercialNotes} rows={4} />

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <button
                  type="button"
                  className="wm-btn wm-btn-primary"
                  style={{ height: 40, padding: "0 16px" }}
                  onClick={saveProposalDraft}
                >
                  Save proposal draft
                </button>

                <button
                  type="button"
                  className="wm-btn"
                  style={{ height: 40, padding: "0 16px" }}
                  onClick={() => nav("/app/projects")}
                >
                  Back to Projects
                </button>

                {saved ? (
                  <span style={{ fontSize: 12, color: "rgba(134,239,172,0.95)", fontWeight: 700 }}>
                    Saved to active project
                  </span>
                ) : null}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}