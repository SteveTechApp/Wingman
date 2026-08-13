import { useMemo, useState } from "react";
import { Camera, Network, Sparkles, Workflow } from "lucide-react";
import VisualStudioCanvas from "../components/VisualStudioCanvas";
import RoomConceptVisual from "../components/RoomConceptVisual";
import { saveProposalVisualAsset, useProjectStore, type ProposalVisualKind, type ProposalVisualPurpose } from "../data/projectStore";
import { buildWholeProjectVisualDiagram } from "../lib/schematic/wholeProjectVisualDiagram";
import type { VisualDiagramMode } from "../lib/visualStudioTypes";

const modes = [
  { kind: "block-diagram" as const, label: "Block diagram", copy: "A simple customer-safe explanation.", icon: Network },
  { kind: "technical-schematic" as const, label: "Technical schematic", copy: "Products, signal paths, drawing key and review detail.", icon: Workflow },
  { kind: "room-concept" as const, label: "Room concept", copy: "A conceptual room/application visual for proposals.", icon: Camera },
];

export function ProposalVisualsPage() {
  const { activeProject } = useProjectStore();
  const [kind, setKind] = useState<ProposalVisualKind>(() => {
    const requested = new URLSearchParams(window.location.search).get("mode");
    return requested === "block-diagram" || requested === "room-concept" ? requested : "technical-schematic";
  });
  const [purpose, setPurpose] = useState<ProposalVisualPurpose>("proposal");
  const [message, setMessage] = useState("");
  const [generatedKind, setGeneratedKind] = useState<ProposalVisualKind | null>(null);
  const [generation, setGeneration] = useState(0);
  const model = useMemo(() => buildWholeProjectVisualDiagram(activeProject), [activeProject]);
  const canvasMode: VisualDiagramMode = kind === "technical-schematic" ? "technical" : "customer";

  function saveRender(render: { svg: string; width: number; height: number }) {
    if (!activeProject) {
      setMessage("Start or select a project before saving a visual.");
      return;
    }
    const warnings = [...model.missingInformation, ...model.quoteRisks];
    const saved = saveProposalVisualAsset(activeProject.id, {
      kind,
      title: model.title,
      purpose,
      status: warnings.length ? "review-required" : "draft",
      source: {
        projectRevision: activeProject.updatedAt,
        productSkus: (activeProject.productSelections ?? []).map((product) => product.sku),
      },
      model: model as unknown as Record<string, unknown>,
      render,
      caption: kind === "room-concept" ? `${model.customerSummary} Concept visual — dimensions, finishes and installation positions require confirmation.` : model.customerSummary,
      assumptions: model.assumptions,
      warnings,
    });
    setMessage(saved ? `Saved revision ${saved.revision} to ${activeProject.name}.` : "Visual could not be saved.");
  }

  return (
    <main className="wm-vs-page wm-proposal-visuals-page" data-wingman-proposal-visuals="true">
      <header className="wm-vs-header">
        <div className="wm-vs-header-copy">
          <p className="wm-vs-eyebrow">Proposal Visuals</p>
          <h1>Create one clear visual for the proposal</h1>
          <p>Build from the active project, review the assumptions, save a governed revision and reuse the actual visual in the proposal.</p>
        </div>
        <label className="wm-pv-purpose">Purpose
          <select value={purpose} onChange={(event) => setPurpose(event.target.value as ProposalVisualPurpose)}>
            <option value="proposal">Proposal</option><option value="customer-explanation">Customer explanation</option>
            <option value="technical-review">Technical review</option><option value="handover">Internal handover</option>
          </select>
        </label>
      </header>

      <section className="wm-pv-mode-grid" aria-label="Visual type">
        {modes.map((item) => { const Icon = item.icon; return (
          <button key={item.kind} type="button" className={`wm-pv-mode${kind === item.kind ? " is-active" : ""}`} onClick={() => setKind(item.kind)}>
            <Icon aria-hidden="true" /><span><strong>{item.label}</strong><small>{item.copy}</small></span>
          </button>
        ); })}
      </section>

      <section className="wm-pv-generate-bar">
        <div><strong>{activeProject ? `Source: ${activeProject.name}` : "No active project selected"}</strong><span>{kind === "room-concept" ? "Creates a project-derived illustrative room visual." : "Builds the current project into a governed diagram."}</span></div>
        <button type="button" className="wm-vs-button wm-vs-button-primary" disabled={!activeProject} onClick={() => { setGeneratedKind(kind); setGeneration((value) => value + 1); setMessage(""); }}><Sparkles aria-hidden="true" />{generatedKind === kind ? "Regenerate visual" : "Generate visual"}</button>
      </section>

      {kind === "room-concept" && generatedKind !== kind ? (
        <section className="wm-pv-concept-note">
          <Camera aria-hidden="true" />
          <div><h2>Concept visual</h2><p>The project-aware brief is ready to save. Photorealistic generation remains review-gated; it must not imply verified dimensions, finishes or installation positions.</p></div>
        </section>
      ) : null}

      {message ? <p className="wm-pv-message" role="status">{message}</p> : null}
      {generatedKind === kind ? (kind === "room-concept" ? <RoomConceptVisual key={generation} project={activeProject} onSave={saveRender} /> : <VisualStudioCanvas key={generation} model={model} mode={canvasMode} onSaveAsset={saveRender} />) : (
        <section className="wm-pv-empty"><Sparkles aria-hidden="true" /><h2>Ready to create</h2><p>Choose a visual type, then select Generate visual to build it from the active project.</p></section>
      )}
    </main>
  );
}

export default ProposalVisualsPage;
