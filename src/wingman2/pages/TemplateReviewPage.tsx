import { TemplateProposalPanel } from "../components/TemplateProposalPanel";
import { ProjectScopeSchedule, ProjectScopeSectionTabs } from "../components/ProjectScopeSchedule";
import { completeProjectServiceRows, PROJECT_SCOPE_SECTIONS, projectScopeScheduleSections, projectScopeSection, type ProjectScopeSectionId } from "../lib/projectScope";
import { lazy, Suspense, type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
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
import { applyProductPageDetailsToBomRow, type ProductPageDetails } from "../lib/productPageIntake";
import { buildTemplateVisualDiagram } from "../lib/schematic/templateVisualDiagram";
import { useCustomRoomTemplates } from "../lib/customRoomTemplates";
import { roomTemplates, type TemplateBomRow, type RoomTemplate } from "../lib/roomTemplates";
import { applyHdbtReceiver } from "../lib/hdbtDisplayReceiver";
import { TEMPLATE_PRE_ISSUE_STAGE_PARAM } from "../lib/templatePreIssuePass";
import type { ProductSearchResult } from "../lib/productSearch";
import { classifyProduct, checkRoleCompatibility } from "../lib/roleCompatibility";
import { getTemplateApplicationProfile } from "../lib/templateApplicationProfiles";
import { templateImageFor } from "../lib/templateImages";
import { useTemplateHandoff } from "./template/useTemplateHandoff";
import { useProductPageDetails } from "./template/useProductPageDetails";
import { useTemplateProposal } from "./template/useTemplateProposal";
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
  const [searchParams, setSearchParams] = useSearchParams();
  const customTemplates = useCustomRoomTemplates();
  const availableTemplates = useMemo(() => [...customTemplates, ...roomTemplates], [customTemplates]);
  const selectedTemplate = useMemo(() => availableTemplates.find((template) => template.id === templateId), [availableTemplates, templateId]);
  const [briefEdits, setBriefEdits] = useState<Partial<RoomTemplate>>({});
  const editedTemplate = useMemo(() => selectedTemplate ? { ...selectedTemplate, ...briefEdits } : undefined, [selectedTemplate, briefEdits]);
  const [designStep, setDesignStep] = useState<"brief" | "schedule" | "review">("brief");
  // The schedule's design sections sit in the tab row beside Room design /
  // Drawings / Proposal, so the page owns which one is on screen.
  const [scopeSection, setScopeSection] = useState<ProjectScopeSectionId>("inputs");
  const [selectedRows, setSelectedRows] = useState<TemplateBomRow[]>(() => selectedTemplate ? completeProjectServiceRows(selectedTemplate.bom, selectedTemplate.id).map(normalizeProductIdentity) : []);
  // A surveyed run chooses the display receiver, so the schedule, the drawings,
  // the saved project and the proposal all read the rows that rule produced
  // rather than the receiver the template was authored with.
  const displayRows = useMemo(() => applyHdbtReceiver(selectedRows, editedTemplate ?? {}), [selectedRows, editedTemplate]);
  // A stage in the address is an address for the Proposal tab, so a link a rep
  // was sent opens the reading it points at rather than the room design.
  const [activeTab, setActiveTab] = useState<Tab>(() =>
    searchParams.get(TEMPLATE_PRE_ISSUE_STAGE_PARAM) ? "Proposal" : "Room design",
  );
  /**
   * Leaving the Proposal tab drops the stage from the address: an address that
   * names a stage nobody can see is one a reload would jump back to.
   */
  function chooseTab(tab: Tab) {
    setActiveTab(tab);
    if (tab !== "Proposal" && searchParams.has(TEMPLATE_PRE_ISSUE_STAGE_PARAM)) {
      const next = new URLSearchParams(searchParams);
      next.delete(TEMPLATE_PRE_ISSUE_STAGE_PARAM);
      setSearchParams(next, { replace: true });
    }
  }
  const [dirty, setDirty] = useState(false);
  const [savedProjectPath, setSavedProjectPath] = useState("");
  const [savedTemplatePath, setSavedTemplatePath] = useState("");
  const [detailRow, setDetailRow] = useState<TemplateBomRow | null>(null);
  const scopeSections = useMemo(() => projectScopeScheduleSections(selectedRows), [selectedRows]);
  const [connectivityView, setConnectivityView] = useState<"excalidraw" | "generated" | "native" | "visual-studio">("native");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  // The template the page was showing: a shared stage link sets the tab on the
  // first render, and only a move to another template may reset it.
  const mountedTemplateId = useRef<string | null>(null);

  useEffect(() => {
    if (selectedTemplate) {
      setBriefEdits({}); setDesignStep("brief"); setScopeSection("inputs");
      setSelectedRows(completeProjectServiceRows(selectedTemplate.bom, selectedTemplate.id).map(normalizeProductIdentity)); setDirty(false);
      // The address decides the tab on the first render; only a move to another
      // template resets it here, so a shared stage link is not overwritten by
      // the mount.
      if (mountedTemplateId.current && mountedTemplateId.current !== selectedTemplate.id) setActiveTab("Room design");
      mountedTemplateId.current = selectedTemplate.id;
      setSavedProjectPath(""); setSavedTemplatePath(""); setDetailRow(null);
    }
  }, [selectedTemplate]);

  const proposal = useTemplateProposal({
    templateId: templateId ?? "",
    template: editedTemplate,
    pricingTemplate: selectedTemplate,
    selectedRows: displayRows,
    navigate,
    onSavedProject: setSavedProjectPath,
    onSavedTemplate: setSavedTemplatePath,
    onSaved: () => setDirty(false),
  });
  // A template that includes wall processing is a wall design, so the full
  // builder for it is the Video Wall builder rather than room discovery.
  const { wallHandoff, openFullRoomBuilder } = useTemplateHandoff({ template: editedTemplate, selectedRows, navigate });

  /** What the manufacturer's page said about the open row, on the row and its drawer copy. */
  function applyProductPageDetails(rowId: string, details: ProductPageDetails) {
    mutateRows((current) => current.map((row) => row.id === rowId ? applyProductPageDetailsToBomRow(row, details) : row));
    setDetailRow((previous) => previous && previous.id === rowId ? applyProductPageDetailsToBomRow(previous, details) : previous);
  }
  const productPage = useProductPageDetails({ detailRow, onDetails: applyProductPageDetails });

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
    productPage.clearSearch();
  }

  function toggleRow(rowId: string) {
    mutateRows((current) => current.map((row) => {
      if (row.id !== rowId) return row;
      const status = row.status === "excluded" ? (row.type === "Required" ? "included" : row.type.toLowerCase()) : "excluded";
      return { ...row, status, qty: status === "excluded" ? 0 : Math.max(1, row.qty) };
    }));
  }
  function resetEquipment() { setSelectedRows(completeProjectServiceRows(selectedTemplate!.bom, template.id).map(normalizeProductIdentity)); setBriefEdits({}); setDirty(false); setDetailRow(null); }
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
    event.preventDefault(); chooseTab(tabs[next]); tabRefs.current[next]?.focus();
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
            <Link className="wm-button wm-button-secondary" to={routeCatalogByKey.templates.path}><ArrowLeft /> Back to templates</Link>
            {wallHandoff ? <button className="wm-button wm-button-secondary" type="button" onClick={openFullRoomBuilder}>Design the wall</button> : null}
            <button className="wm-button wm-button-secondary" type="button" onClick={proposal.saveProject}><Save /> Save as project</button>
            <button className="wm-button is-primary" type="button" onClick={() => setActiveTab("Proposal")}><FileText /> Continue to proposal</button>
            <details className="wm-template-overflow"><summary className="wm-icon-button" aria-label="More template actions"><MoreHorizontal /></summary><div>
              <button type="button" onClick={openFullRoomBuilder}>Open full room builder</button>
              <button type="button" onClick={proposal.createProposalVisual}><LayoutTemplate /> Create visual</button>
              <button type="button" onClick={resetEquipment}><RotateCcw /> Reset room schedule</button>
              <button type="button" onClick={proposal.exportSchedule}><Download /> Export BOM</button>
              <button type="button" onClick={proposal.saveTemplate}><LayoutTemplate /> Save as template</button>
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
          {tabs.map((tab, index) => <button key={tab} ref={(node) => { tabRefs.current[index] = node; }} type="button" role="tab" id={`template-tab-${tab}`} aria-selected={activeTab === tab} aria-controls={`template-panel-${tab}`} tabIndex={activeTab === tab ? 0 : -1} onClick={() => chooseTab(tab)} onKeyDown={(event) => onTabKeyDown(event, index)}>{tab}{tab === "Room design" && dirty ? <i aria-label="Unsaved changes" /> : null}</button>)}
        </div>
        {activeTab === "Room design" && designStep === "schedule" ? <ProjectScopeSectionTabs sections={scopeSections} sectionId={scopeSection} onSection={setScopeSection} /> : null}
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
              <NativeTemplateSchematic template={template} rows={displayRows} />
            ) : connectivityView === "visual-studio" ? (
              <VisualStudioCanvas model={buildTemplateVisualDiagram(template, displayRows)} mode="technical" />
            ) : (
              <TemplateSchematic template={template} rows={displayRows} />
            )}
          </div>
        ) : null}

        {activeTab === "Room design" ? <>
          <div className="wm-review-step"><label>Working on <select aria-label="Room design step" value={designStep} onChange={event => setDesignStep(event.target.value as typeof designStep)}><option value="brief">1. Room brief</option><option value="schedule">2. Equipment and services</option><option value="review">3. Review and confirmations</option></select></label><p>Template → your brief and schedule → checked design → saved project and proposal.</p></div>
          {designStep === "brief" ? <TemplateRoomBrief template={template} onChange={updateBrief} rows={displayRows} /> : null}
          {designStep === "review" ? <TemplateDesignReview template={template} onChange={updateBrief} /> : null}
          {designStep === "schedule" ? <ProjectScopeSchedule template={template} rows={displayRows} sectionId={scopeSection} onQuantity={updateRowQty} onToggle={toggleRow} onEdit={setDetailRow} onAdd={addScopeItem}
            library={<EquipmentLibraryPanel locations={[{ id: "room", name: template.name }]} onSelect={(item, _location, quantity) => {
              const own = isWyreStormManufacturer(item.manufacturer);
              mutateRows(rows => [...rows, { id: crypto.randomUUID(), sku: own ? item.model : `BY-OTHERS:${item.model}`, description: `${item.manufacturer} ${item.model}`, role: item.role, qty: quantity, type: "Validate", status: "validate", manufacturer: item.manufacturer, model: item.model, owner: own ? "wyrestorm" : "integrator", productRelationship: own ? undefined : item.relationship, evidence: item.sourceUrl || "Specifications to confirm", notes: [item.description, item.connections, item.specifications, item.accessories, item.notes].filter(Boolean).join("; ") }]);
            }} />} /> : null}
          <div className="wm-review-step-actions">{designStep !== "brief" ? <button type="button" onClick={() => setDesignStep(designStep === "review" ? "schedule" : "brief")}>Previous step</button> : null}<button type="button" onClick={() => { if (designStep === "review") setActiveTab("Proposal"); else setDesignStep(designStep === "brief" ? "schedule" : "review"); }}>{designStep === "brief" ? "Review equipment and services" : designStep === "schedule" ? "Review assumptions and checks" : "Preview proposal"}</button></div>
        </> : null}

        {activeTab === "Proposal" ? (
          <TemplateProposalPanel
            template={template}
            validation={proposal.exportValidation}
            readinessScore={proposal.readinessScore}
            pricingSummary={proposal.pricingSummary}
            surveyGaps={proposal.surveyGaps}
            onRecordSurveyDetail={proposal.savedWall?.projectId ? proposal.recordSurveyDetail : null}
            pricing={proposal.pricingDraft}
            bomRows={proposal.bomRows}
            installation={proposal.installation}
            rateCard={proposal.rateCard}
            rateCardError={proposal.rateCardError}
            onCurrency={proposal.setCurrency}
            onUnitPrice={proposal.setUnitPrice}
            onInstallationRate={proposal.setInstallationRate}
            onRestoreInstallationRates={proposal.restoreInstallationRates}
            tableRestore={false}
            onSaveRateCard={proposal.saveRateCard}
            onCreateProposal={proposal.createProposal}
            onExportProposal={proposal.exportProposal}
            onExportSchedule={proposal.exportSchedule}
            onSaveProject={proposal.saveProject}
            onSaveTemplate={proposal.saveTemplate}
          />
        ) : null}
      </main>

      {detailRow ? <div className="wm-equipment-drawer-backdrop"><button type="button" className="absolute inset-0 cursor-default" onClick={() => setDetailRow(null)} aria-label="Close equipment details" /><aside className="wm-equipment-drawer" role="dialog" aria-modal="true" aria-labelledby="equipment-drawer-title">
        <button className="wm-icon-button wm-drawer-close" type="button" onClick={() => setDetailRow(null)} aria-label="Close equipment details"><X /></button>
        <span className="wm-status is-assumed">{detailRow.type}</span><h2 id="equipment-drawer-title">{detailRow.sku}</h2><p>{detailRow.description}</p>
        <dl><div><dt>System role</dt><dd>{detailRow.role}</dd></div><div><dt>Evidence</dt><dd>{detailRow.evidence}</dd></div><div><dt>Notes</dt><dd>{detailRow.notes}</dd></div></dl>
        <label>Quantity<input type="number" step="any" min="0" max="99" value={selectedRows.find((row) => row.id === detailRow.id)?.qty ?? 0} onChange={(event) => updateRowQty(detailRow.id, Number(event.target.value))} /></label>
        {!(["engineering", "maintenance"].includes(projectScopeSection(detailRow))) && (detailRow.sku.startsWith("BY-OTHERS") || detailRow.sku.startsWith("CUSTOM")) && (
          <div className="wm-drawer-fields">
            <h4>Populate from the manufacturer's product page</h4>
            <label className="wm-drawer-model-field">Product page URL<input type="url" value={productPage.productPageUrl} placeholder="Paste a public https product page URL" onChange={(event) => productPage.setProductPageUrl(event.target.value)} /></label>
            <div className="wm-room-wizard-actions">
              <button type="button" className="wm-ui-button wm-ui-button-secondary" disabled={!productPage.productPageUrl.trim() || productPage.readingProductPage} onClick={() => productPage.readProductPage(detailRow.id)}>{productPage.readingProductPage ? "Reading product page…" : "Read product details"}</button>
              {detailRow.sourceUrl ? <a className="wm-ui-button wm-ui-button-secondary" href={detailRow.sourceUrl} target="_blank" rel="noreferrer">Open product page{detailRow.sourceCheckedOn ? ` (read ${detailRow.sourceCheckedOn})` : ""}</a> : null}
            </div>
            {productPage.productPageMessage ? <p role="status">{productPage.productPageMessage}</p> : null}
            <h4>Replace placeholder</h4>
            <label>Manufacturer<input type="text" value={detailRow.manufacturer ?? ""} placeholder="e.g. WyreStorm, Crestron, Extron" onChange={(event) => updateManufacturer(detailRow.id, event.target.value)} /></label>
            <label className="wm-drawer-model-field">Model<input type="text" value={detailRow.model ?? ""} placeholder="Type SKU or product name to search catalogue..." onChange={(event) => { updateRowField(detailRow.id, "model", event.target.value); setDetailRow((prev) => prev && prev.id === detailRow.id ? { ...prev, model: event.target.value } : prev); productPage.searchModels(event.target.value); }} /></label>
            {detailRow.manufacturer && !isWyreStormManufacturer(detailRow.manufacturer) && <label>Product relationship<select value={detailRow.productRelationship ?? "complementary"} onChange={(event) => { updateRowField(detailRow.id, "productRelationship", event.target.value); setDetailRow((prev) => prev && prev.id === detailRow.id ? { ...prev, productRelationship: event.target.value as TemplateBomRow["productRelationship"] } : prev); }}><option value="complementary">Complements the WyreStorm system</option><option value="competitor">Alternative to a WyreStorm product</option></select></label>}
            {productPage.modelSearchResults.length > 0 && detailRow.id && (
              <div className="wm-drawer-search-results" role="listbox" aria-label="Product catalogue search results">
                {productPage.modelSearchResults.map((result) => {
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
