import { WorkflowPages, useWorkflowPage } from "../components/WorkflowPages";
import { useEffect, useMemo, useState } from "react";
import { Camera, Network, Sparkles, Workflow } from "lucide-react";
import VisualStudioCanvas from "../components/visualStudioCanvasEntry";
import RoomConceptVisual from "../components/RoomConceptVisual";
import { saveProposalVisualAsset, useProjectStore, type ProposalVisualKind, type ProposalVisualPurpose } from "../data/projectStore";
import { buildWholeProjectVisualDiagram } from "../lib/schematic/wholeProjectVisualDiagram";
import { buildSingleProductVisualDiagram } from "../lib/schematic/singleProductVisualDiagram";
import { loadProductIntelligenceSummary } from "../lib/productIntelligenceIndexCache";
import type { VisualDiagramMode } from "../lib/visualStudioTypes";

const modes = [
  { kind: "block-diagram" as const, label: "Block diagram", copy: "A clear overview of the products and system roles.", icon: Network },
  { kind: "technical-schematic" as const, label: "Technical schematic", copy: "Product and connection detail, with items to confirm.", icon: Workflow },
  { kind: "room-concept" as const, label: "Room concept", copy: "An illustrative room view based on project details.", icon: Camera },
];

export function ProposalVisualsPage() {
  const { go } = useWorkflowPage([{id:"type",label:"Visual type"},{id:"brief",label:"Project & audience"},{id:"preview",label:"Preview & save"}], "visual-step");
  const { activeProject } = useProjectStore();
  const query = new URLSearchParams(window.location.search);
  const [seedSku] = useState(() => {
    const requestedSku = query.get("seedSku")?.trim();
    if (requestedSku) return requestedSku;
    if (query.get("source") !== "product-discussion") return "";
    try {
      const saved = JSON.parse(window.sessionStorage.getItem("wingman.visualStudio.productSeed") ?? "null") as { sku?: unknown } | null;
      return typeof saved?.sku === "string" ? saved.sku.trim() : "";
    } catch {
      return "";
    }
  });
  const [seedProduct, setSeedProduct] = useState<Record<string, unknown> | null>(null);
  const [productLoading, setProductLoading] = useState(Boolean(seedSku));
  const [productError, setProductError] = useState("");
  const [kind, setKind] = useState<ProposalVisualKind>(() => {
    const requested = new URLSearchParams(window.location.search).get("mode");
    return requested === "block-diagram" || requested === "room-concept" || requested === "technical-schematic" ? requested : "technical-schematic";
  });
  const [purpose, setPurpose] = useState<ProposalVisualPurpose>("proposal");
  const [message, setMessage] = useState("");
  const [generatedKind, setGeneratedKind] = useState<ProposalVisualKind | null>(null);
  const [generation, setGeneration] = useState(0);
  useEffect(() => {
    if (!seedSku) return;
    let current = true;
    setProductLoading(true);
    loadProductIntelligenceSummary()
      .then((payload) => {
        const products = Array.isArray(payload) ? payload : payload.products ?? [];
        const key = seedSku.toUpperCase().replace(/[^A-Z0-9]+/g, "");
        const match = products.find((product) => String(product.sku ?? "").toUpperCase().replace(/[^A-Z0-9]+/g, "") === key);
        if (current) {
          setSeedProduct(match ?? null);
          setProductError(match ? "" : `The catalogue does not contain ${seedSku}. Return to Product Discussion and reopen this visual.`);
        }
      })
      .catch(() => {
        if (current) setProductError("The product catalogue could not be loaded. Try again after reopening this visual from Product Discussion.");
      })
      .finally(() => { if (current) setProductLoading(false); });
    return () => { current = false; };
  }, [seedSku]);

  const productSource = useMemo(() => !activeProject && seedProduct ? {
    sku: String(seedProduct.sku ?? seedSku),
    name: typeof seedProduct.name === "string" ? seedProduct.name : undefined,
    family: typeof seedProduct.family === "string" ? seedProduct.family : undefined,
    category: typeof seedProduct.category === "string" ? seedProduct.category : undefined,
    description: typeof seedProduct.description === "string" ? seedProduct.description : undefined,
    connectors: Array.isArray(seedProduct.connectors) ? seedProduct.connectors.filter((item): item is string => typeof item === "string") : [],
  } : null, [activeProject, seedProduct, seedSku]);
  const productModel = useMemo(() => productSource ? buildSingleProductVisualDiagram(productSource) : null, [productSource]);
  const model = useMemo(() => activeProject ? buildWholeProjectVisualDiagram(activeProject) : productModel, [activeProject, productModel]);
  const canGenerate = Boolean(activeProject || (productSource && kind !== "room-concept"));
  const canvasMode: VisualDiagramMode = kind === "technical-schematic" ? "technical" : "customer";
  const selectedMode = modes.find((item) => item.kind === kind) ?? modes[1];
  const SelectedModeIcon = selectedMode.icon;

  function saveRender(render: { svg: string; width: number; height: number }) {
    if (!activeProject) {
      setMessage("Start or select a project before saving a visual.");
      return;
    }
    if (!model) return;
    const warnings = [...model.missingInformation, ...model.quoteRisks];
    const saved = saveProposalVisualAsset(activeProject.id, {
      kind,
      title: model.title,
      purpose,
      status: warnings.length ? "review-required" : "draft",
      source: {
        productSkus: activeProject.productSelections?.map((product) => product.sku) ?? [],
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
          <h1>Create a visual</h1>
          
        </div>
        <div className="wm-pv-header-status grid gap-1 rounded-xl border-l-4 border-cyan-300 p-4 wm-ui-card lg:col-start-3" aria-label="Workflow status">
          <span className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Active source</span>
          <strong>{activeProject?.name ?? (productSource ? `${productSource.sku} · single product` : productLoading ? "Loading selected product…" : "Choose a project or product")}</strong>
          <small className="text-sm wm-ui-copy">{activeProject ? `${activeProject.productSelections?.length ?? 0} product selections available` : productSource ? "A product-only visual is ready; no room or connected devices are assumed." : "Start from a project, or open Visualise in Studio from a product discussion."}</small>
        </div>
      </header>

      <WorkflowPages label="Visual pages" parameter="visual-step" pages={[
{ id: "type", label: "Visual type", content: <><section className="wm-pv-step grid gap-4 rounded-3xl border p-5 wm-ui-card" aria-labelledby="proposal-visual-step-one">
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
      </section></> },
{ id: "brief", label: "Source & purpose", content: <><section className="wm-pv-step grid gap-4 rounded-3xl border p-5 wm-ui-card" aria-labelledby="proposal-visual-step-two">
        <div className="wm-pv-step-heading flex items-center gap-3">
          <span className="wm-pv-step-number grid h-9 w-9 shrink-0 place-items-center rounded-full border border-cyan-300 font-black text-cyan-300">2</span>
          <div><p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Confirm the brief</p><h2 id="proposal-visual-step-two">Project source and audience</h2></div>
        </div>
        <div className="wm-pv-brief-grid grid items-stretch gap-3 lg:grid-cols-3">
          <div className="wm-pv-source-card grid content-center gap-1 rounded-xl border p-4 wm-ui-card"><span className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Visual source</span><strong>{activeProject?.name ?? (productSource ? `${productSource.sku} · ${productSource.name ?? "Selected product"}` : productLoading ? "Loading selected product" : "No source selected")}</strong><small className="text-sm wm-ui-copy">{activeProject ? "Uses this project’s saved products and discovery details." : productSource ? "Uses catalogue data for this product. Connected devices and signal paths still need confirmation." : "Open this from a project or Product Discussion to bring in a source."}</small></div>
          <label className="wm-pv-purpose grid content-center gap-2 rounded-xl border p-4 wm-ui-card"><span className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Used for</span>
            <select className="min-h-11 w-full rounded-lg border px-3" value={purpose} onChange={(event) => setPurpose(event.target.value as ProposalVisualPurpose)}>
              <option value="proposal">Proposal</option><option value="customer-explanation">Customer explanation</option>
              <option value="technical-review">Technical review</option><option value="handover">Internal handover</option>
            </select>
          </label>
          <div className="wm-pv-generate-action flex items-center justify-end gap-3"><span className="wm-pv-step-number grid h-9 w-9 shrink-0 place-items-center rounded-full border border-cyan-300 font-black text-cyan-300">3</span><div className="grid gap-2"><button type="button" aria-label={generatedKind === kind ? "Regenerate visual" : "Generate visual"} className="wm-vs-button wm-vs-button-primary min-h-14" disabled={!canGenerate} onClick={() => { setGeneratedKind(kind); setGeneration((value) => value + 1); setMessage(""); go("preview"); }}><Sparkles aria-hidden="true" />{generatedKind === kind ? "Regenerate visual" : `Generate ${selectedMode.label.toLowerCase()}`}</button>{kind === "room-concept" && productSource && !activeProject ? <small className="wm-ui-copy">Room concepts need a project with room details.</small> : !activeProject && !productSource ? <small className="wm-ui-copy">Choose a project or reopen this page from a product discussion.</small> : null}</div></div>
        </div>
      </section></> },
{ id: "preview", label: "Preview & save", content: <>

      {kind === "room-concept" && generatedKind !== kind ? (
        <section>
          <Camera aria-hidden="true" />
          <div><h2>Concept visual</h2><p>The project-aware brief is ready to save. Photorealistic generation remains review-gated; it must not imply verified dimensions, finishes or installation positions.</p></div>
        </section>
      ) : null}

      {message ? <p role="status">{message}</p> : null}
      {productError ? <p className="rounded-xl border border-amber-400/50 p-4 text-sm wm-ui-copy" role="alert">{productError}</p> : null}
      {generatedKind === kind && model ? (kind === "room-concept" ? <RoomConceptVisual key={generation} project={activeProject} onSave={saveRender} /> : <VisualStudioCanvas key={generation} model={model} mode={canvasMode} onSaveAsset={activeProject ? saveRender : undefined} />) : (
        <section className="wm-pv-empty grid min-h-64 items-center gap-8 rounded-3xl border border-dashed p-6 wm-ui-card lg:grid-cols-2">
          <div className="grid gap-4 rounded-xl border p-5 wm-ui-card"><div className="flex items-center gap-3"><SelectedModeIcon className="h-10 w-10 rounded-lg border border-cyan-300 p-2 text-cyan-300" aria-hidden="true"/><div><p className="wm-vs-eyebrow">Your visual will show</p><strong>{selectedMode.label}</strong></div></div><ol className="grid list-none gap-3 text-sm wm-ui-copy"><li><strong className="text-cyan-300">1.</strong> {activeProject ? `Start with ${activeProject.name} and its saved design details.` : productSource ? `Show ${productSource.sku} using verified catalogue details.` : "Choose a project or open this page from a product discussion."}</li><li><strong className="text-cyan-300">2.</strong> {kind === "technical-schematic" ? "Flag missing product, connection, and site details for review." : kind === "block-diagram" ? "Explain the system at a high level, with unknowns called out." : "Use project room details for a clearly labeled concept."}</li><li><strong className="text-cyan-300">3.</strong> {activeProject ? "Review the diagram, then save it to the project or export it." : "Review and export it. Saving to a project becomes available after selecting one."}</li></ol></div>
          <div className="grid gap-2"><p className="wm-vs-eyebrow">{productLoading ? "Loading source" : canGenerate ? "Ready to generate" : "Source needed"}</p><h2>{selectedMode.label}</h2><p className="wm-ui-copy">{productSource ? model?.technicalSummary : selectedMode.copy} {productSource && kind === "room-concept" ? "Choose a project to create a room concept." : "Select Generate when you’re ready to review the first draft."}</p>{!activeProject && !productSource ? <a className="wm-vs-button min-h-12 justify-self-start" href="/wingman/projects">Choose a project</a> : null}<button type="button" className="wm-vs-button wm-vs-button-primary min-h-12 justify-self-start" disabled={!canGenerate || productLoading} onClick={() => { setGeneratedKind(kind); setGeneration((value) => value + 1); setMessage(""); go("preview"); }}><Sparkles aria-hidden="true"/>Generate {selectedMode.label.toLowerCase()}</button></div>
        </section>
      )}
</> },
]} />
    </main>
  );
}

export default ProposalVisualsPage;
