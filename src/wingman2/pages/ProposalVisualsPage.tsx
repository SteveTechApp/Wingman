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
  const selectedMode = modes.find((item) => item.kind === kind) ?? modes[1];
  const SelectedModeIcon = selectedMode.icon;

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
      <header className="wm-vs-header grid items-center gap-6 rounded-3xl border p-6 lg:grid-cols-3">
        <div className="wm-vs-header-copy">
          <p className="wm-vs-eyebrow">Proposal Visuals</p>
          <h1>Turn the active project into one clear visual</h1>
          <p>Choose the drawing your audience needs, confirm its purpose, then generate a governed visual ready for review and reuse.</p>
        </div>
        <div className="wm-pv-header-status grid gap-1 rounded-xl border-l-4 border-cyan-300 p-4 wm-ui-card lg:col-start-3" aria-label="Workflow status">
          <span className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Active source</span>
          <strong>{activeProject?.name ?? "Select a project first"}</strong>
          <small className="text-sm wm-ui-copy">{activeProject ? `${activeProject.productSelections?.length ?? 0} product selections available` : "A project is required to create a visual"}</small>
        </div>
      </header>

      <section className="wm-pv-step wm-pv-step--choose grid gap-4 rounded-3xl border p-5 wm-ui-card" aria-labelledby="proposal-visual-step-one">
        <div className="wm-pv-step-heading flex items-center gap-3">
          <span className="wm-pv-step-number grid h-9 w-9 shrink-0 place-items-center rounded-full border border-cyan-300 font-black text-cyan-300">1</span>
          <div><p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Choose the output</p><h2 id="proposal-visual-step-one">What should this visual explain?</h2></div>
        </div>
        <div className="wm-pv-mode-grid grid gap-3 md:grid-cols-3" aria-label="Visual type">
          {modes.map((item) => { const Icon = item.icon; return (
            <button key={item.kind} type="button" aria-pressed={kind === item.kind} className={`wm-pv-mode grid min-h-28 grid-cols-[2.5rem_minmax(0,1fr)_1.5rem] items-center gap-3 rounded-xl border p-4 text-left transition hover:-translate-y-0.5 hover:border-cyan-300 ${kind === item.kind ? "is-active border-cyan-300 bg-cyan-300/10" : "wm-ui-card"}`} onClick={() => setKind(item.kind)}>
              <Icon className="h-8 w-8 text-cyan-300" aria-hidden="true" /><span className="grid gap-1"><strong>{item.label}</strong><small className="text-sm wm-ui-copy">{item.copy}</small></span><span className={kind === item.kind ? "font-black text-cyan-300" : "invisible"} aria-hidden="true">✓</span>
            </button>
          ); })}
        </div>
      </section>

      <section className="wm-pv-step wm-pv-generate-bar grid gap-4 rounded-3xl border p-5 wm-ui-card" aria-labelledby="proposal-visual-step-two">
        <div className="wm-pv-step-heading flex items-center gap-3">
          <span className="wm-pv-step-number grid h-9 w-9 shrink-0 place-items-center rounded-full border border-cyan-300 font-black text-cyan-300">2</span>
          <div><p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Confirm the brief</p><h2 id="proposal-visual-step-two">Project source and audience</h2></div>
        </div>
        <div className="wm-pv-brief-grid grid items-stretch gap-3 lg:grid-cols-3">
          <div className="wm-pv-source-card grid content-center gap-1 rounded-xl border p-4 wm-ui-card"><span className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Source project</span><strong>{activeProject?.name ?? "No active project selected"}</strong><small className="text-sm wm-ui-copy">{kind === "room-concept" ? "Creates a project-derived illustrative room visual." : "Builds the current project into a governed diagram."}</small></div>
          <label className="wm-pv-purpose grid content-center gap-2 rounded-xl border p-4 wm-ui-card"><span className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Used for</span>
            <select className="min-h-11 w-full rounded-lg border px-3" value={purpose} onChange={(event) => setPurpose(event.target.value as ProposalVisualPurpose)}>
              <option value="proposal">Proposal</option><option value="customer-explanation">Customer explanation</option>
              <option value="technical-review">Technical review</option><option value="handover">Internal handover</option>
            </select>
          </label>
          <div className="wm-pv-generate-action flex items-center justify-end gap-3"><span className="wm-pv-step-number grid h-9 w-9 shrink-0 place-items-center rounded-full border border-cyan-300 font-black text-cyan-300">3</span><button type="button" aria-label={generatedKind === kind ? "Regenerate visual" : "Generate visual"} className="wm-vs-button wm-vs-button-primary min-h-14" disabled={!activeProject} onClick={() => { setGeneratedKind(kind); setGeneration((value) => value + 1); setMessage(""); }}><Sparkles aria-hidden="true" />{generatedKind === kind ? "Regenerate visual" : `Generate ${selectedMode.label.toLowerCase()}`}</button></div>
        </div>
      </section>

      {kind === "room-concept" && generatedKind !== kind ? (
        <section className="wm-pv-concept-note">
          <Camera aria-hidden="true" />
          <div><h2>Concept visual</h2><p>The project-aware brief is ready to save. Photorealistic generation remains review-gated; it must not imply verified dimensions, finishes or installation positions.</p></div>
        </section>
      ) : null}

      {message ? <p className="wm-pv-message" role="status">{message}</p> : null}
      {generatedKind === kind ? (kind === "room-concept" ? <RoomConceptVisual key={generation} project={activeProject} onSave={saveRender} /> : <VisualStudioCanvas key={generation} model={model} mode={canvasMode} onSaveAsset={saveRender} />) : (
        <section className="wm-pv-empty grid min-h-64 items-center gap-8 rounded-3xl border border-dashed p-6 wm-ui-card lg:grid-cols-2">
          <div className="wm-pv-empty-preview flex min-h-48 items-center justify-around rounded-xl border p-6 wm-ui-card" aria-hidden="true"><SelectedModeIcon className="h-12 w-12 rounded-lg border border-cyan-300 p-2 text-cyan-300" /><span className="h-11 w-11 rounded-lg border border-cyan-300"></span><span className="h-11 w-11 rounded-lg border border-cyan-300"></span><span className="h-11 w-11 rounded-lg border border-cyan-300"></span></div>
          <div className="grid gap-2"><p className="wm-vs-eyebrow">Ready to build</p><h2>{selectedMode.label}</h2><p className="wm-ui-copy">{selectedMode.copy} Wingman will use the active project data and flag assumptions that need review.</p><ul className="flex flex-wrap gap-2"><li className="rounded-full border px-3 py-1 text-sm wm-ui-copy">Project-derived content</li><li className="rounded-full border px-3 py-1 text-sm wm-ui-copy">Governed revision history</li><li className="rounded-full border px-3 py-1 text-sm wm-ui-copy">Review notes included</li></ul></div>
        </section>
      )}
    </main>
  );
}

export default ProposalVisualsPage;
