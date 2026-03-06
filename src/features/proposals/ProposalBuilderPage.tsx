import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  getActiveProjectContext,
  updateActiveProjectBrief,
  updateProjectStatus,
} from "@/features/projects/projectDraftStore";
import { buildProposalPositioningBlock, type CompareHandoff } from "./proposalPositioning";
import {
  buildProposalExportText,
  copyProposalExportText,
  downloadProposalExportText,
} from "./proposalRender";
import {
  buildProposalDocxBridgePayload,
  downloadProposalBridgeJson,
} from "./proposalDocxBridge";
import { downloadProposalExport } from "./proposalExportFacade";
import { downloadProposalDocx } from "./proposalDocxFacade";
import {
  buildAssumptionsTemplate,
  buildCommercialNotesTemplate,
  buildExecutiveSummaryTemplate,
  buildExclusionsTemplate,
  buildNextStepsTemplate,
  buildSolutionOverviewTemplate,
} from "./proposalTemplates";

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

function compareSummary(handoff: CompareHandoff): string {
  const wy = [handoff.wyrestormSku, handoff.wyrestormName].filter(Boolean).join(" - ");
  const cp = [handoff.competitorBrand, handoff.competitorSku, handoff.competitorName]
    .filter(Boolean)
    .join(" - ");

  return [
    wy ? `WyreStorm reference: ${wy}` : "",
    cp ? `Competitive context: ${cp}` : "",
    handoff.family ? `Family: ${handoff.family}` : "",
    handoff.category ? `Category: ${handoff.category}` : "",
  ]
    .filter(Boolean)
    .join(" | ");
}

function compareCommercialSeed(handoff: CompareHandoff): string {
  const wy = [handoff.wyrestormSku, handoff.wyrestormName].filter(Boolean).join(" - ");
  const cp = [handoff.competitorBrand, handoff.competitorSku, handoff.competitorName]
    .filter(Boolean)
    .join(" - ");

  return [
    "Commercial positioning generated from competitor compare workflow.",
    wy ? `Recommended WyreStorm option: ${wy}.` : "",
    cp ? `Alternative considered: ${cp}.` : "",
    handoff.family ? `Position the solution around ${handoff.family} workflow fit.` : "",
    handoff.category ? `Emphasise suitability for ${handoff.category} application requirements.` : "",
    "Focus on AV workflow fit, control capability, extension method, and commercial clarity."
  ]
    .filter(Boolean)
    .join(" ");
}

function safeFileName(value: string): string {
  const v = String(value || "").trim();
  return (v || "proposal").replace(/[^a-z0-9_\-]+/gi, "_");
}

export default function ProposalBuilderPage() {
  const nav = useNavigate();
  const ctx = React.useMemo(() => getActiveProjectContext(), []);
  const [saved, setSaved] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [docxState, setDocxState] = React.useState("");
  const [handoff, setHandoff] = React.useState<CompareHandoff | null>(null);

  const [customerName, setCustomerName] = React.useState("");
  const [companyName, setCompanyName] = React.useState("");
  const [executiveSummary, setExecutiveSummary] = React.useState("");
  const [solutionOverview, setSolutionOverview] = React.useState("");
  const [assumptions, setAssumptions] = React.useState("");
  const [exclusions, setExclusions] = React.useState("");
  const [commercialNotes, setCommercialNotes] = React.useState("");
  const [positioningBlock, setPositioningBlock] = React.useState("");
  const [nextSteps, setNextSteps] = React.useState("");
  const [equipmentBlock, setEquipmentBlock] = React.useState("");
  const [currency, setCurrency] = React.useState("GBP");
  const [equipmentSubtotal, setEquipmentSubtotal] = React.useState("");
  const [installationAllowance, setInstallationAllowance] = React.useState("");
  const [programmingAllowance, setProgrammingAllowance] = React.useState("");
  const [totalBudgetNote, setTotalBudgetNote] = React.useState("");

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("wm_compare_handoff");
      if (!raw) return;
      const parsed = JSON.parse(raw) as CompareHandoff;
      setHandoff(parsed);
    } catch {}
  }, []);

  React.useEffect(() => {
    if (!ctx) return;

    const compare = handoff ? compareSummary(handoff) : "";

    setExecutiveSummary(
      ctx.brief.proposal.executiveSummary ||
      buildExecutiveSummaryTemplate({
        projectName: ctx.projectName,
        verticalMarket: ctx.verticalMarket.name,
        roomType: ctx.roomType.name,
        tier: ctx.tier.label,
        compareSummary: compare,
      })
    );

    setSolutionOverview(
      ctx.brief.proposal.solutionOverview ||
      buildSolutionOverviewTemplate({
        projectName: ctx.projectName,
        verticalMarket: ctx.verticalMarket.name,
        roomType: ctx.roomType.name,
        tier: ctx.tier.label,
        compareSummary: compare,
      })
    );

    setAssumptions(
      ctx.brief.proposal.assumptions ||
      buildAssumptionsTemplate({
        projectName: ctx.projectName,
        verticalMarket: ctx.verticalMarket.name,
        roomType: ctx.roomType.name,
        tier: ctx.tier.label,
      })
    );

    setExclusions(
      ctx.brief.proposal.exclusions ||
      buildExclusionsTemplate({
        projectName: ctx.projectName,
        verticalMarket: ctx.verticalMarket.name,
        roomType: ctx.roomType.name,
        tier: ctx.tier.label,
      })
    );

    const seededCommercial = buildCommercialNotesTemplate({
      projectName: ctx.projectName,
      verticalMarket: ctx.verticalMarket.name,
      roomType: ctx.roomType.name,
      tier: ctx.tier.label,
      compareSummary: compare,
    });

    const compareCommercial = handoff ? compareCommercialSeed(handoff) : "";
    const existingCommercial =
      ctx.brief.proposal?.commercialNotes || ctx.tier.commercialNote || "";

    const mergedCommercial = [existingCommercial, seededCommercial, compareCommercial]
      .filter(Boolean)
      .join("\n\n");

    setCommercialNotes(mergedCommercial);

    if (handoff) {
      setPositioningBlock(buildProposalPositioningBlock(handoff));
    } else {
      setPositioningBlock("");
    }

    setNextSteps(
      buildNextStepsTemplate({
        projectName: ctx.projectName,
        verticalMarket: ctx.verticalMarket.name,
        roomType: ctx.roomType.name,
        tier: ctx.tier.label,
      })
    );
  }, [ctx, handoff]);

  function clearHandoff() {
    try {
      localStorage.removeItem("wm_compare_handoff");
    } catch {}
    setHandoff(null);
    setPositioningBlock("");
  }

  function saveProposalDraft() {
    if (!ctx) return;

    updateActiveProjectBrief({
      proposal: {
        executiveSummary,
        solutionOverview,
        assumptions,
        exclusions,
        commercialNotes,
        positioningBlock,
        nextSteps,
      } as any,
    });

    updateProjectStatus(ctx.projectId, "In Progress");
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  }

  const parsedEquipment = React.useMemo(() => {
    return equipmentBlock
      .split(/\r?\n/)
      .map((x) => x.trim())
      .filter(Boolean)
      .map((line) => ({
        name: line,
        qty: 1,
      }));
  }, [equipmentBlock]);

  const compare = handoff ? compareSummary(handoff) : "";

  const exportInput = React.useMemo(() => ({
    projectName: ctx?.projectName,
    customerName,
    companyName,
    verticalMarket: ctx?.verticalMarket?.name,
    roomType: ctx?.roomType?.name,
    tier: ctx?.tier?.label,
    executiveSummary,
    solutionOverview,
    assumptions,
    exclusions,
    commercialNotes,
    positioningBlock,
    compareSummary: compare,
    nextSteps,
    equipment: parsedEquipment,
    pricing: {
      currency,
      equipmentSubtotal,
      installationAllowance,
      programmingAllowance,
      totalBudgetNote,
    },
  }), [
    ctx,
    customerName,
    companyName,
    executiveSummary,
    solutionOverview,
    assumptions,
    exclusions,
    commercialNotes,
    positioningBlock,
    compare,
    nextSteps,
    parsedEquipment,
    currency,
    equipmentSubtotal,
    installationAllowance,
    programmingAllowance,
    totalBudgetNote,
  ]);

  const exportText = React.useMemo(() => {
    return buildProposalExportText(exportInput);
  }, [exportInput]);

  async function copyOutput() {
    const ok = await copyProposalExportText(exportText);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  function downloadOutput() {
    const fileName = `${safeFileName(ctx?.projectName || "proposal")}_proposal.txt`;
    downloadProposalExportText(fileName, exportText);
  }

  function downloadBridgePayload() {
    const payload = buildProposalDocxBridgePayload(exportInput);
    downloadProposalBridgeJson(payload);
  }

  async function downloadDocx() {
    const result = await downloadProposalDocx(exportInput);
    if (!result.ok) {
      setDocxState("DOCX export failed");
      return;
    }
    if (result.mode === "rendered-docx") {
      setDocxState("DOCX downloaded");
    } else if (result.mode === "fallback-docx") {
      setDocxState("DOCX fallback downloaded");
    } else {
      setDocxState("DOCX bridge JSON downloaded");
    }
    window.setTimeout(() => setDocxState(""), 1600);
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

            {handoff ? (
              <section className="wm-card" style={{ padding: 18, borderRadius: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.62)" }}>
                  Compare handoff
                </div>
                <div style={{ marginTop: 8, fontSize: 14, lineHeight: 1.5, color: "rgba(255,255,255,0.88)" }}>
                  {compareSummary(handoff)}
                </div>
                <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="wm-btn"
                    style={{ height: 40, padding: "0 16px" }}
                    onClick={clearHandoff}
                  >
                    Clear compare handoff
                  </button>
                </div>
              </section>
            ) : null}

            <section className="wm-card" style={{ padding: 18, borderRadius: 18, display: "grid", gap: 14 }}>
              <Area label="Customer name" value={customerName} onChange={setCustomerName} rows={2} />
              <Area label="Company name" value={companyName} onChange={setCompanyName} rows={2} />
              <Area label="Executive summary" value={executiveSummary} onChange={setExecutiveSummary} rows={4} />
              <Area label="Solution overview" value={solutionOverview} onChange={setSolutionOverview} rows={4} />
              <Area label="Assumptions" value={assumptions} onChange={setAssumptions} rows={4} />
              <Area label="Exclusions" value={exclusions} onChange={setExclusions} rows={4} />
              <Area label="Commercial notes" value={commercialNotes} onChange={setCommercialNotes} rows={5} />
              <Area label="Positioning block" value={positioningBlock} onChange={setPositioningBlock} rows={6} />
              <Area label="Next steps" value={nextSteps} onChange={setNextSteps} rows={4} />
              <Area label="Equipment items (one per line)" value={equipmentBlock} onChange={setEquipmentBlock} rows={5} />
              <Area label="Equipment subtotal" value={equipmentSubtotal} onChange={setEquipmentSubtotal} rows={2} />
              <Area label="Installation allowance" value={installationAllowance} onChange={setInstallationAllowance} rows={2} />
              <Area label="Programming allowance" value={programmingAllowance} onChange={setProgrammingAllowance} rows={2} />
              <Area label="Total budget note" value={totalBudgetNote} onChange={setTotalBudgetNote} rows={2} />

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

            <section className="wm-card" style={{ padding: 18, borderRadius: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.62)" }}>
                Proposal output preview
              </div>

              <pre
                style={{
                  marginTop: 10,
                  whiteSpace: "pre-wrap",
                  fontFamily: "inherit",
                  fontSize: 14,
                  lineHeight: 1.55,
                  color: "rgba(255,255,255,0.88)",
                }}
              >
                {exportText}
              </pre>

              <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <button
                  type="button"
                  className="wm-btn"
                  style={{ height: 40, padding: "0 16px" }}
                  onClick={copyOutput}
                >
                  Copy output text
                </button>

                <button
                  type="button"
                  className="wm-btn"
                  style={{ height: 40, padding: "0 16px" }}
                  onClick={downloadOutput}
                >
                  Download .txt
                </button>

                <button
                  type="button"
                  className="wm-btn"
                  style={{ height: 40, padding: "0 16px" }}
                  onClick={downloadBridgePayload}
                >
                  Download export payload
                </button>

                <button
                  type="button"
                  className="wm-btn"
                  style={{ height: 40, padding: "0 16px" }}
                  onClick={() => downloadProposalExport(exportInput, "md")}
                >
                  Download .md
                </button>

                <button
                  type="button"
                  className="wm-btn"
                  style={{ height: 40, padding: "0 16px" }}
                  onClick={() => downloadProposalExport(exportInput, "json")}
                >
                  Download canonical JSON
                </button>

                <button
                  type="button"
                  className="wm-btn"
                  style={{ height: 40, padding: "0 16px" }}
                  onClick={downloadDocx}
                >
                  Download DOCX
                </button>

                {copied ? (
                  <span style={{ fontSize: 12, color: "rgba(134,239,172,0.95)", fontWeight: 700 }}>
                    Copied
                  </span>
                ) : null}

                {docxState ? (
                  <span style={{ fontSize: 12, color: "rgba(134,239,172,0.95)", fontWeight: 700 }}>
                    {docxState}
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