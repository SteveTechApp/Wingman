import { ProjectScopeSchedule } from "../components/ProjectScopeSchedule";
import { completeProjectServiceRows, PROJECT_SCOPE_SECTIONS, projectScopeSection, type ProjectScopeSectionId } from "../lib/projectScope";
import { useUiMode } from "../data/uiMode";
import { writeDiscoveryHandoff } from "../lib/discoveryTemplateHandoff";
import { templateRoomBuilderHandoff } from "../lib/templateRoomBuilderHandoff";
import { lazy, Suspense, useCallback, type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Check, CheckCircle2, ChevronRight, Download, FileText,
  LayoutTemplate, MoreHorizontal, RotateCcw, Save, X,
  AlertTriangle,
} from "lucide-react";
import { routeCatalogByKey } from "../app/routeCatalog";
import { PageHero } from "../components/PageHero";
// The static reference diagrams are small, but keep them behind the lazy route
// chunk so the template page itself never pays for them.
const ExcalidrawBlockSchematic = lazy(() =>
  import("../components/ExcalidrawBlockSchematic"),
);
import { TemplateSchematic } from "../components/TemplateSchematic";
import { TemplateRoomBrief, TemplateDesignReview } from "../components/TemplateRoomBrief";
import { NativeTemplateSchematic } from "../components/NativeTemplateSchematic";
import VisualStudioCanvas from "../components/visualStudioCanvasEntry";
import { InDeskConnectivityWizard } from "../components/InDeskConnectivityWizard";
import { EquipmentLibraryPanel } from "../components/EquipmentLibraryPanel";
import { canonicalManufacturerName, isWyreStormManufacturer } from "../lib/equipmentLibrary";
import { postWingmanJson } from "../api/wingmanApi";
import { applyProductPageDetailsToBomRow, type ProductPageDetails } from "../lib/productPageIntake";
import { buildTemplateVisualDiagram } from "../lib/schematic/templateVisualDiagram";
import { upsertStoredProject } from "../data/projectStore";
import { exportBomCsv } from "../lib/proposalExport";
import { exportProposalDocx } from "../lib/proposalDocxExport";
import { createProposalWizardDefaults } from "../lib/proposalWizard";
import { saveRoomTemplateCopy, useCustomRoomTemplates } from "../lib/customRoomTemplates";
import { roomTemplates, type TemplateBomRow, type RoomTemplate } from "../lib/roomTemplates";
import { validateProposalExport, type ExportValidationResult } from "../lib/proposalExportValidation";
import { proposalReadiness, type ProposalReadiness } from "../lib/proposalReadiness";
import { searchProducts, type ProductSearchResult } from "../lib/productSearch";
import { classifyProduct, checkRoleCompatibility } from "../lib/roleCompatibility";
import { getTemplateApplicationProfile } from "../lib/templateApplicationProfiles";
import { templateImageFor } from "../lib/templateImages";
import { templateBomRows, templateProducts, buildTemplateProposal, buildTemplateProject } from "../lib/templateReviewProposal";
const tabs = ["Room design", "Drawings", "Proposal"] as const;
type Tab = (typeof tabs)[number];
function normalizeProductIdentity(row: TemplateBomRow): TemplateBomRow {
  if (!row.manufacturer?.trim()) return row;
  const manufacturer = canonicalManufacturerName(row.manufacturer);
  if (isWyreStormManufacturer(manufacturer)) return { ...row, manufacturer, productRelationship: undefined };
  return { ...row, manufacturer, owner: row.owner === "wyrestorm" ? "integrator" : row.owner, productRelationship: row.productRelationship || "complementary" };
}

export function TemplateReviewPage() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const { isGuided, setMode } = useUiMode();
  const previousGuided = useRef(isGuided);
  const customTemplates = useCustomRoomTemplates();
  const availableTemplates = useMemo(() => [...customTemplates, ...roomTemplates], [customTemplates]);
  const selectedTemplate = useMemo(() => availableTemplates.find((template) => template.id === templateId), [availableTemplates, templateId]);
  const [briefEdits, setBriefEdits] = useState<Partial<RoomTemplate>>({});
  const editedTemplate = useMemo(() => selectedTemplate ? { ...selectedTemplate, ...briefEdits } : undefined, [selectedTemplate, briefEdits]);
  const [designStep, setDesignStep] = useState<"brief" | "schedule" | "review">("brief");
  const [selectedRows, setSelectedRows] = useState<TemplateBomRow[]>(() => selectedTemplate ? completeProjectServiceRows(selectedTemplate.bom, selectedTemplate.id).map(normalizeProductIdentity) : []);
  const [activeTab, setActiveTab] = useState<Tab>("Room design");
  const [dirty, setDirty] = useState(false);
  const [savedProjectPath, setSavedProjectPath] = useState("");
  const [savedTemplatePath, setSavedTemplatePath] = useState("");
  const [detailRow, setDetailRow] = useState<TemplateBomRow | null>(null);
  const [modelSearchResults, setModelSearchResults] = useState<ProductSearchResult[]>([]);
  const [productPageUrl, setProductPageUrl] = useState("");
  const [readingProductPage, setReadingProductPage] = useState(false);
  const [productPageMessage, setProductPageMessage] = useState("");
  const lastSyncedRowIdRef = useRef<string | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [connectivityView, setConnectivityView] = useState<"excalidraw" | "generated" | "native" | "visual-studio">("native");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (selectedTemplate) {
      setBriefEdits({}); setDesignStep("brief");
      setSelectedRows(completeProjectServiceRows(selectedTemplate.bom, selectedTemplate.id).map(normalizeProductIdentity)); setDirty(false); setActiveTab("Room design");
      setSavedProjectPath(""); setSavedTemplatePath(""); setDetailRow(null);
    }
  }, [selectedTemplate]);

  const openFullRoomBuilder = useCallback(() => {
    if (!editedTemplate) return;
    writeDiscoveryHandoff(templateRoomBuilderHandoff(editedTemplate, selectedRows));
    setMode("unguided");
    navigate(routeCatalogByKey.discovery.path);
  }, [editedTemplate, selectedRows, setMode, navigate]);
  useEffect(() => {
    if (previousGuided.current && !isGuided) openFullRoomBuilder();
    previousGuided.current = isGuided;
  }, [isGuided, openFullRoomBuilder]);

  // Derived values computed BEFORE the early return (React hooks rules).
  const bomRows = useMemo(
    () => (editedTemplate ? templateBomRows(editedTemplate, selectedRows) : []),
    [editedTemplate, selectedRows],
  );
  const products = useMemo(() => templateProducts(selectedRows), [selectedRows]);

  // Run the proposal export validator — same checks the main wizard uses.
  const exportValidation: ExportValidationResult = useMemo(
    () => validateProposalExport({ products, bomRows }),
    [products, bomRows],
  );

  // Real readiness score via the unified scorer — same formula as the discovery path.
  const readiness: ProposalReadiness = useMemo(() => {
    if (!selectedTemplate) return { score: 0, reviewRequired: true, exportValidation, summary: "No template", breakdown: { base: 0, blockerDeduction: 0, warningDeduction: 0, validationItemDeduction: 0, assumptionDeduction: 0, productBonus: 0 } };
    return proposalReadiness({
      products,
      bomRows,
      assumptions: [...(editedTemplate?.assumptions || []), ...(editedTemplate?.validationItems || []).map((item) => `Unverified: ${item}`)],
      validationItems: editedTemplate?.validationItems || [],
      exportValidation,
    });
  }, [products, bomRows, selectedTemplate, editedTemplate, exportValidation]);
  const readinessScore = readiness.score;

  /* Keep the product-page field aligned with whichever placeholder row is open. */
  useEffect(() => {
    if (detailRow?.id === lastSyncedRowIdRef.current) return;
    lastSyncedRowIdRef.current = detailRow?.id ?? null;
    setProductPageUrl(detailRow?.sourceUrl ?? "");
    setProductPageMessage("");
  }, [detailRow]);

  /* Product search for BY-OTHERS replacement — must be before the early return */
  const handleModelSearch = useCallback((query: string, _rowId: string) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (query.length < 2) { setModelSearchResults([]); return; }
    searchTimerRef.current = setTimeout(async () => {
      const results = await searchProducts(query, 6);
      setModelSearchResults(results);
    }, 250);
  }, []);

  if (!selectedTemplate) return <div data-wingman-template-detail-page="true" className="pb-10"><PageHero eyebrow="Room templates" title="Template not found." purpose="The selected room design template could not be found." nextMove="Go back to the template library and pick a room design to review." actions={[{ label: "Back to templates", to: routeCatalogByKey.templates.path }]} /></div>;

  const template = editedTemplate!, applicationProfile = getTemplateApplicationProfile(editedTemplate!);
  function updateBrief(patch: Partial<RoomTemplate>) { setBriefEdits(current => ({ ...current, ...patch })); setDirty(true); }

  function mutateRows(updater: (rows: TemplateBomRow[]) => TemplateBomRow[]) { setSelectedRows((current) => updater(current).map(normalizeProductIdentity)); setDirty(true); }
  function updateRowQty(rowId: string, qty: number) {
    const safeQty = Math.max(0, Math.min(99, Number.isFinite(qty) ? qty : 0));
    mutateRows((current) => current.map((row) => row.id !== rowId ? row : {
      ...row, qty: safeQty, status: safeQty === 0 ? "excluded" : row.status === "excluded" ? (row.type === "Required" ? "included" : row.type.toLowerCase()) : row.status,
    }));
  }
  function updateRowField(rowId: string, field: string, value: string) {
    mutateRows((current) => current.map((row) => row.id !== rowId ? row : { ...row, [field]: value }));
  }
  function updateManufacturer(rowId: string, manufacturer: string) {
    manufacturer = canonicalManufacturerName(manufacturer);
    const wyreStormProduct = isWyreStormManufacturer(manufacturer);
    const nextOwner = wyreStormProduct ? "wyrestorm" : detailRow?.owner === "wyrestorm" ? "integrator" : detailRow?.owner || "integrator";
    const nextRelationship = wyreStormProduct ? undefined : detailRow?.productRelationship || "complementary";
    mutateRows((current) => current.map((row) => row.id !== rowId ? row : { ...row, manufacturer, owner: nextOwner, productRelationship: nextRelationship }));
    setDetailRow((previous) => previous && previous.id === rowId ? { ...previous, manufacturer, owner: nextOwner, productRelationship: nextRelationship } : previous);
  }

  function selectSearchResult(rowId: string, result: ProductSearchResult) {
    updateManufacturer(rowId, result.brand || "WyreStorm");
    updateRowField(rowId, "model", result.sku);
    setDetailRow((prev) => prev && prev.id === rowId ? { ...prev, model: result.sku } : prev);
    setModelSearchResults([]);
  }

  async function readProductPage(rowId: string) {
    const url = productPageUrl.trim();
    if (!url) { setProductPageMessage("Paste the manufacturer's product page URL first."); return; }
    setReadingProductPage(true);
    setProductPageMessage("Reading the manufacturer product page…");
    try {
      const details = await postWingmanJson<ProductPageDetails>("/api/wingman/equipment/inspect-product-page", { productUrl: url });
      if (!details.ok) throw new Error("Wingman couldn't read product details from that page.");
      mutateRows((current) => current.map((row) => row.id === rowId ? applyProductPageDetailsToBomRow(row, details) : row));
      setDetailRow((previous) => previous && previous.id === rowId ? applyProductPageDetailsToBomRow(previous, details) : previous);
      setProductPageUrl(String(details.resolvedUrl || url));
      setProductPageMessage("Product details added as suggestions. Check the exact model and specifications before issuing.");
    } catch (error) {
      setProductPageMessage(error instanceof Error ? `${error.message} You can still enter the product details yourself.` : "Could not read that page. Enter the product details yourself.");
    } finally {
      setReadingProductPage(false);
    }
  }

  function toggleRow(rowId: string) {
    mutateRows((current) => current.map((row) => {
      if (row.id !== rowId) return row;
      const status = row.status === "excluded" ? (row.type === "Required" ? "included" : row.type.toLowerCase()) : "excluded";
      return { ...row, status, qty: status === "excluded" ? 0 : Math.max(1, row.qty) };
    }));
  }
  function resetEquipment() { setSelectedRows(completeProjectServiceRows(selectedTemplate!.bom, template.id).map(normalizeProductIdentity)); setBriefEdits({}); setDirty(false); setDetailRow(null); }
  function exportTemplateBom() { exportBomCsv(buildTemplateProposal(template, selectedRows), bomRows); }
  async function exportTemplateProposal() {
    const proposal = buildTemplateProposal(template, selectedRows);
    const wizard = createProposalWizardDefaults({
      projectId: `template-${template.id}`,
      projectName: template.name,
      preparedBy: "",
      executiveSummary: template.customerNarrative,
      architectureNarrative: template.architecture,
      assumptions: template.assumptions,
    });
    await exportProposalDocx(proposal, bomRows, wizard);
  }
  function saveTemplateProject() { const project = upsertStoredProject(buildTemplateProject(template, selectedRows)); setSavedProjectPath(`/wingman/projects/${project.id}`); setDirty(false); }
  function createProposalVisual() {
    upsertStoredProject(buildTemplateProject(template, selectedRows));
    setDirty(false);
    navigate(`${routeCatalogByKey.proposalVisuals.path}?mode=block-diagram&sourceTemplateId=${encodeURIComponent(template.id)}`);
  }
  function createProposal() {
    upsertStoredProject(buildTemplateProject(template, selectedRows));
    setDirty(false);
    navigate(routeCatalogByKey.proposal.path);
  }
  function saveTemplateDesign() { const copy = saveRoomTemplateCopy(template, selectedRows); setSavedTemplatePath(`${routeCatalogByKey.templates.path}/${copy.id}`); setDirty(false); }
  function addScopeItem(section: ProjectScopeSectionId) {
    const service = section === "engineering" || section === "maintenance";
    const row: TemplateBomRow = { id: crypto.randomUUID(), sku: "BY-OTHERS-CUSTOM", description: service ? "New service allowance" : "New room item", role: PROJECT_SCOPE_SECTIONS.find(item => item.id === section)!.title,
      scopeSection: section, unit: service ? "allowance" : "each", qty: 1, type: "Validate", status: "validate", owner: "integrator",
      evidence: "Added during room design review; confirm suitability and scope.", notes: "Agree the specification, supplier, quantity and delivery responsibility before pricing." };
    mutateRows(rows => [...rows, row]); setDetailRow(row);
  }
  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault(); setActiveTab(tabs[next]); tabRefs.current[next]?.focus();
  }

  return (
    <div className="wm-template-workspace wm-room-design-page pb-10" data-wingman-template-detail-page="true">
      <header className="wm-template-compact-header">
        <div className="wm-template-breadcrumb"><Link to={routeCatalogByKey.templates.path}>Templates</Link><ChevronRight /> <span>{template.name}</span></div>
        <div className="wm-template-header-row">
          <div>
            <div className="wm-template-title-line"><h1>{template.name}</h1>{dirty ? <span className="wm-status is-unsaved">Unsaved changes</span> : <span className="wm-status is-saved"><Check /> {savedProjectPath || savedTemplatePath ? "Saved" : "Template starting point"}</span>}</div>
            <p>{template.summary}</p>
          </div>
          <div className="wm-template-header-actions">
            <Link className="wm-button is-secondary" to={routeCatalogByKey.templates.path}><ArrowLeft /> Back to templates</Link>
            <button className="wm-button is-secondary" type="button" onClick={saveTemplateProject}><Save /> Save as project</button>
            <button className="wm-button is-primary" type="button" onClick={() => setActiveTab("Proposal")}><FileText /> Continue to proposal</button>
            <details className="wm-template-overflow"><summary className="wm-icon-button" aria-label="More template actions"><MoreHorizontal /></summary><div>
              <button type="button" onClick={openFullRoomBuilder}>Open full room builder</button>
              <button type="button" onClick={createProposalVisual}><LayoutTemplate /> Create visual</button>
              <button type="button" onClick={resetEquipment}><RotateCcw /> Reset room schedule</button>
              <button type="button" onClick={exportTemplateBom}><Download /> Export BOM</button>
              <button type="button" onClick={saveTemplateDesign}><LayoutTemplate /> Save as template</button>
            </div></details>
          </div>
        </div>
        <div className="wm-template-context-strip"><img src={templateImageFor(template)} alt={`${template.name} application`} />
          <div><span>{applicationProfile.canonicalMarket} · {template.scale}</span><strong>{applicationProfile.architectureFamily}</strong></div>
        </div>
      </header>

      {(savedProjectPath || savedTemplatePath) ? <div className="wm-template-save-notice"><CheckCircle2 />
        {savedTemplatePath ? <span>Room design saved as a custom template.</span> : null}
        {savedProjectPath ? <span>Room design saved as a project.</span> : null}
        {savedProjectPath ? <Link to={savedProjectPath}>Open project</Link> : null}
        {savedTemplatePath ? <Link to={savedTemplatePath}>Open template</Link> : null}
      </div> : null}

      <div className="wm-template-tab-row">
        <div className="wm-template-tabs" role="tablist" aria-label="Template workspace">
          {tabs.map((tab, index) => <button key={tab} ref={(node) => { tabRefs.current[index] = node; }} type="button" role="tab" id={`template-tab-${tab}`} aria-selected={activeTab === tab} aria-controls={`template-panel-${tab}`} tabIndex={activeTab === tab ? 0 : -1} onClick={() => setActiveTab(tab)} onKeyDown={(event) => onTabKeyDown(event, index)}>{tab}{tab === "Room design" && dirty ? <i aria-label="Unsaved changes" /> : null}</button>)}
        </div>

      </div>

      <main id={`template-panel-${activeTab}`} role="tabpanel" aria-labelledby={`template-tab-${activeTab}`} tabIndex={0}>
        {activeTab === "Drawings" ? (
          <div className="wm-template-connectivity">
            <label className="wm-drawing-choice">Drawing view <select value={connectivityView} onChange={event => setConnectivityView(event.target.value as typeof connectivityView)}><option value="native">System schematic — current room connections</option><option value="visual-studio">Drawing studio — technical sheet and exports</option><option value="generated">Equipment block diagram</option><option value="excalidraw">Reference diagram — illustrative only</option></select></label>
            {connectivityView === "excalidraw" ? (
              <Suspense fallback={<div className="wm-excalidraw-empty"><p>Loading block schematic…</p></div>}>
                <ExcalidrawBlockSchematic />
              </Suspense>
            ) : connectivityView === "native" ? (
              <NativeTemplateSchematic template={template} rows={selectedRows} />
            ) : connectivityView === "visual-studio" ? (
              <VisualStudioCanvas model={buildTemplateVisualDiagram(template, selectedRows)} mode="technical" />
            ) : (
              <TemplateSchematic template={template} rows={selectedRows} />
            )}
          </div>
        ) : null}

        {activeTab === "Room design" ? <>
          <div className="wm-review-step"><label>Working on <select aria-label="Room design step" value={designStep} onChange={event => setDesignStep(event.target.value as typeof designStep)}><option value="brief">1. Room brief</option><option value="schedule">2. Equipment and services</option><option value="review">3. Review and confirmations</option></select></label><p>Template → your brief and schedule → checked design → saved project and proposal.</p></div>
          {designStep === "brief" ? <TemplateRoomBrief template={template} onChange={updateBrief} /> : null}
          {designStep === "review" ? <TemplateDesignReview template={template} onChange={updateBrief} /> : null}
          {designStep === "schedule" ? <ProjectScopeSchedule template={template} rows={selectedRows} onQuantity={updateRowQty} onToggle={toggleRow} onEdit={setDetailRow} onAdd={addScopeItem}
            library={<EquipmentLibraryPanel locations={[{ id: "room", name: template.name }]} onSelect={(item, _location, quantity) => {
              const own = isWyreStormManufacturer(item.manufacturer);
              mutateRows(rows => [...rows, { id: crypto.randomUUID(), sku: own ? item.model : `BY-OTHERS:${item.model}`, description: `${item.manufacturer} ${item.model}`, role: item.role, qty: quantity, type: "Validate", status: "validate", manufacturer: item.manufacturer, model: item.model, owner: own ? "wyrestorm" : "integrator", productRelationship: own ? undefined : item.relationship, evidence: item.sourceUrl || "Specifications to confirm", notes: [item.description, item.connections, item.specifications, item.accessories, item.notes].filter(Boolean).join("; ") }]);
            }} />} /> : null}
          <div className="wm-review-step-actions">{designStep !== "brief" ? <button type="button" onClick={() => setDesignStep(designStep === "review" ? "schedule" : "brief")}>Previous step</button> : null}<button type="button" onClick={() => { if (designStep === "review") setActiveTab("Proposal"); else setDesignStep(designStep === "brief" ? "schedule" : "review"); }}>{designStep === "brief" ? "Review equipment and services" : designStep === "schedule" ? "Review assumptions and checks" : "Preview proposal"}</button></div>
        </> : null}

        {activeTab === "Proposal" ? <div className="wm-proposal-handoff">
          <section><span className="wm-status is-validate">{template.validationItems.length} unresolved</span><h2>{exportValidation.allowed ? "Proposal is ready with assumptions" : "Export blocked — resolve blockers first"}</h2><p>{exportValidation.allowed ? "The equipment schedule can move forward, but the following points remain unverified and will be labelled as assumptions." : "The proposal export validator has found issues that must be resolved before this template can be exported."}</p><div className="wm-proposal-readiness"><strong>{readinessScore}%</strong><span>Proposal readiness</span></div></section>
          {exportValidation.blockers.length > 0 && (
            <section className="wm-template-validation-blockers">
              <h3><AlertTriangle /> Export blockers ({exportValidation.blockers.length})</h3>
              <ul>
                {exportValidation.blockers.map((blocker) => (
                  <li key={blocker.id} className="wm-validation-blocker">
                    <strong>{blocker.domain}</strong>: {blocker.message}
                    <span className="wm-validation-fix">{blocker.fix}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {exportValidation.warnings.length > 0 && (
            <section className="wm-template-validation-warnings">
              <h3>Warnings ({exportValidation.warnings.length})</h3>
              <ul>
                {exportValidation.warnings.map((warning) => (
                  <li key={warning.id} className="wm-validation-warning">
                    <strong>{warning.domain}</strong>: {warning.message}
                    <span className="wm-validation-fix">{warning.fix}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section><h3>Unresolved assumptions</h3><ul>{template.validationItems.map((item) => <li key={item}><span>Validate</span>{item}</li>)}</ul></section>
          <aside>
            <button className="wm-button is-primary is-full" type="button" onClick={createProposal} disabled={!exportValidation.allowed} title={exportValidation.allowed ? "Create proposal" : `Export blocked: ${exportValidation.blockers.length} blocker(s) must be resolved first`}><FileText /> Create proposal</button>
            <button className="wm-button is-secondary is-full" type="button" onClick={exportTemplateProposal} disabled={!exportValidation.allowed} title={exportValidation.allowed ? "Export proposal" : `Export blocked: ${exportValidation.blockers.length} blocker(s) must be resolved first`}><Download /> Export proposal</button>
            <button className="wm-button is-secondary is-full" type="button" onClick={exportTemplateBom}><Download /> Export equipment schedule</button>
            <button className="wm-button is-secondary is-full" type="button" onClick={saveTemplateProject}><Save /> Save as project</button>
            <button className="wm-button is-secondary is-full" type="button" onClick={saveTemplateDesign}><LayoutTemplate /> Save as template</button>
          </aside>
        </div> : null}
      </main>

      {detailRow ? <div className="wm-equipment-drawer-backdrop"><button type="button" className="absolute inset-0 cursor-default" onClick={() => setDetailRow(null)} aria-label="Close equipment details" /><aside className="wm-equipment-drawer" role="dialog" aria-modal="true" aria-labelledby="equipment-drawer-title">
        <button className="wm-icon-button wm-drawer-close" type="button" onClick={() => setDetailRow(null)} aria-label="Close equipment details"><X /></button>
        <span className="wm-status is-assumed">{detailRow.type}</span><h2 id="equipment-drawer-title">{detailRow.sku}</h2><p>{detailRow.description}</p>
        <dl><div><dt>System role</dt><dd>{detailRow.role}</dd></div><div><dt>Evidence</dt><dd>{detailRow.evidence}</dd></div><div><dt>Notes</dt><dd>{detailRow.notes}</dd></div></dl>
        <label>Quantity<input type="number" step="any" min="0" max="99" value={selectedRows.find((row) => row.id === detailRow.id)?.qty ?? 0} onChange={(event) => updateRowQty(detailRow.id, Number(event.target.value))} /></label>
        {!(["engineering", "maintenance"].includes(projectScopeSection(detailRow))) && (detailRow.sku.startsWith("BY-OTHERS") || detailRow.sku.startsWith("CUSTOM")) && (
          <div className="wm-drawer-fields">
            <h4>Populate from the manufacturer's product page</h4>
            <label className="wm-drawer-model-field">Product page URL<input type="url" value={productPageUrl} placeholder="Paste a public https product page URL" onChange={(event) => setProductPageUrl(event.target.value)} /></label>
            <div className="wm-room-wizard-actions">
              <button type="button" className="wm-ui-button wm-ui-button-secondary" disabled={!productPageUrl.trim() || readingProductPage} onClick={() => readProductPage(detailRow.id)}>{readingProductPage ? "Reading product page…" : "Read product details"}</button>
              {detailRow.sourceUrl ? <a className="wm-ui-button wm-ui-button-secondary" href={detailRow.sourceUrl} target="_blank" rel="noreferrer">Open product page{detailRow.sourceCheckedOn ? ` (read ${detailRow.sourceCheckedOn})` : ""}</a> : null}
            </div>
            {productPageMessage ? <p role="status">{productPageMessage}</p> : null}
            <h4>Replace placeholder</h4>
            <label>Manufacturer<input type="text" value={detailRow.manufacturer ?? ""} placeholder="e.g. WyreStorm, Crestron, Extron" onChange={(event) => updateManufacturer(detailRow.id, event.target.value)} /></label>
            <label className="wm-drawer-model-field">Model<input type="text" value={detailRow.model ?? ""} placeholder="Type SKU or product name to search catalogue..." onChange={(event) => { updateRowField(detailRow.id, "model", event.target.value); setDetailRow((prev) => prev && prev.id === detailRow.id ? { ...prev, model: event.target.value } : prev); handleModelSearch(event.target.value, detailRow.id); }} /></label>
            {detailRow.manufacturer && !isWyreStormManufacturer(detailRow.manufacturer) && <label>Product relationship<select value={detailRow.productRelationship ?? "complementary"} onChange={(event) => { updateRowField(detailRow.id, "productRelationship", event.target.value); setDetailRow((prev) => prev && prev.id === detailRow.id ? { ...prev, productRelationship: event.target.value as TemplateBomRow["productRelationship"] } : prev); }}><option value="complementary">Complements the WyreStorm system</option><option value="competitor">Alternative to a WyreStorm product</option></select></label>}
            {modelSearchResults.length > 0 && detailRow.id && (
              <div className="wm-drawer-search-results" role="listbox" aria-label="Product catalogue search results">
                {modelSearchResults.map((result) => {
                  const productTags = classifyProduct(result);
                  const roleCheck = detailRow.role ? checkRoleCompatibility(detailRow.role, productTags) : null;
                  return (
                    <button key={result.sku} type="button" className={`wm-drawer-search-result ${roleCheck && !roleCheck.compatible ? "wm-drawer-search-result--incompatible" : ""}`} role="option" aria-selected="false" onClick={() => selectSearchResult(detailRow.id, result)}>
                      <div className="wm-drawer-search-result-header">
                        <span className="wm-drawer-search-sku">{result.sku}</span>
                        {roleCheck && !roleCheck.compatible && (
                          <span className="wm-drawer-search-role-badge wm-drawer-search-role-badge--error" title={roleCheck.message}>⚠ role mismatch</span>
                        )}
                      </div>
                      <span className="wm-drawer-search-name">{result.name}</span>
                      <span className="wm-drawer-search-meta">{result.category} — {result.lifecycleStatus}</span>
                      {result.connectors.length > 0 && (
                        <span className="wm-drawer-search-connectors">{result.connectors.slice(0, 4).join(', ')}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            <label>Owner<select value={isWyreStormManufacturer(detailRow.manufacturer) ? detailRow.owner ?? "wyrestorm" : detailRow.owner === "wyrestorm" ? "integrator" : detailRow.owner ?? "integrator"} onChange={(event) => { updateRowField(detailRow.id, "owner", event.target.value); setDetailRow((prev) => prev && prev.id === detailRow.id ? { ...prev, owner: event.target.value } : prev); }}>
              <option value="customer">Customer supply</option>
              <option value="integrator">Integrator supply</option>
              <option value="wyrestorm" disabled={!isWyreStormManufacturer(detailRow.manufacturer)}>WyreStorm supply</option>
            </select></label>
            {detailRow.manufacturer && detailRow.model && (
              <div className="wm-drawer-resolved">
                <strong>{detailRow.manufacturer} {detailRow.model}</strong>
                <small> — {detailRow.owner === "customer" ? "Customer supplies" : detailRow.owner === "wyrestorm" ? "Add to WyreStorm scope" : "Integrator supplies"}</small>
              </div>
            )}
            {detailRow.manufacturer && detailRow.model && detailRow.role && (() => {
              const productTags = classifyProduct({ sku: detailRow.model, name: detailRow.model });
              const roleCheck = checkRoleCompatibility(detailRow.role, productTags);
              if (roleCheck.compatible) return null;
              return (
                <div className="wm-drawer-role-warning" role="alert">
                  <AlertTriangle size={14} />
                  <span>{roleCheck.message}</span>
                </div>
              );
            })()}
          </div>
        )}
        <label>Item description<input value={detailRow.description} onChange={event => { updateRowField(detailRow.id, "description", event.target.value); setDetailRow({ ...detailRow, description: event.target.value }); }} /></label>
        <label>Design section<select value={projectScopeSection(detailRow)} onChange={event => { updateRowField(detailRow.id, "scopeSection", event.target.value); setDetailRow({ ...detailRow, scopeSection: event.target.value as ProjectScopeSectionId }); }}>{PROJECT_SCOPE_SECTIONS.map(section => <option key={section.id} value={section.id}>{section.title}</option>)}</select></label>
        <label>Quantity unit<select value={detailRow.unit || "each"} onChange={event => { updateRowField(detailRow.id, "unit", event.target.value); setDetailRow({ ...detailRow, unit: event.target.value as TemplateBomRow["unit"] }); }}>{["each", "allowance", "days", "metres", "year"].map(unit => <option key={unit} value={unit}>{unit}</option>)}</select></label>
        <label>Scope and delivery notes<textarea value={detailRow.notes} onChange={event => { updateRowField(detailRow.id, "notes", event.target.value); setDetailRow({ ...detailRow, notes: event.target.value }); }} /></label>
        {["engineering", "maintenance"].includes(projectScopeSection(detailRow)) ? <label>Service provider<input value={detailRow.manufacturer || ""} onChange={event => { updateRowField(detailRow.id, "manufacturer", event.target.value); setDetailRow({ ...detailRow, manufacturer: event.target.value }); }} /></label> : null}
        {(detailRow.description?.toLowerCase().includes("in-desk") || detailRow.role?.toLowerCase().includes("in-desk")) && (
          <InDeskConnectivityWizard
            selectedSku={detailRow.model}
            onSelect={(sku) => {
              updateManufacturer(detailRow.id, "WyreStorm");
              updateRowField(detailRow.id, "model", sku);
              setDetailRow((prev) => prev && prev.id === detailRow.id ? { ...prev, model: sku } : prev);
            }}
          />
        )}
        <button className="wm-button is-primary is-full" type="button" onClick={() => setDetailRow(null)}>Done</button>
      </aside></div> : null}
    </div>
  );
}
