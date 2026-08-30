import { lazy, Suspense, type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Check, CheckCircle2, ChevronRight, Download, FileText,
  LayoutTemplate, Minus, MoreHorizontal, Pencil, Plus, RotateCcw, Save, X,
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
import { NativeTemplateSchematic } from "../components/NativeTemplateSchematic";
import VisualStudioCanvas from "../components/VisualStudioCanvas";
import { buildTemplateVisualDiagram } from "../lib/schematic/templateVisualDiagram";
import { upsertStoredProject, type StoredProductSelection, type StoredProject, type StoredProjectProposal } from "../data/projectStore";
import { exportBomCsv } from "../lib/proposalExport";
import { exportProposalDocx } from "../lib/proposalDocxExport";
import { createProposalWizardDefaults } from "../lib/proposalWizard";
import { buildWingmanCoachState } from "../lib/wingmanCoach";
import { saveRoomTemplateCopy, useCustomRoomTemplates } from "../lib/customRoomTemplates";
import { roomTemplates, type RoomTemplate, type TemplateBomRow } from "../lib/roomTemplates";
import type { SalesBomRow } from "../lib/salesReadiness";
import { compileTemplateApplicationProposal } from "../lib/proposalCompiler";
import { loadTemplateDraft } from "../lib/solutionTemplates";
import { validateProposalExport, type ExportValidationResult } from "../lib/proposalExportValidation";

const includedStatuses = new Set(["included", "optional", "validate"]);
const tabs = ["Overview", "Connectivity", "Equipment", "Proposal"] as const;
type Tab = (typeof tabs)[number];
const equipmentGroups = ["Required", "Requires validation", "Optional", "Third-party scope"] as const;
type EquipmentGroup = (typeof equipmentGroups)[number];

/** Step-by-step guidance shown at the top of the Equipment tab */
const STEPS = [
  { label: "Required", desc: "Core products are included. Check quantities match the room." },
  { label: "Validate", desc: "Site-specific items — confirm against the real room before quoting." },
  { label: "Optional", desc: "Add only when the room needs them. Remove extras to keep the BOM tight." },
  { label: "Third-party", desc: "Design scope for others — review but don't include in the WyreStorm quote." },
  { label: "Proposal", desc: "Ready to go. Continue to proposal when the equipment list is finalised." },
];

const groupCaptions: Record<string, string> = {
  Required: "Core WyreStorm products.",
  "Requires validation": "Confirm against the real room before issue.",
  Optional: "Include only when the room needs them.",
  "Third-party scope": "Other AV design scope, supplied by others and not quoted by WyreStorm.",
};

function cloneRows(rows: TemplateBomRow[]) { return rows.map((row) => ({ ...row })); }
function groupFor(row: TemplateBomRow) {
  const role = row.role.toLowerCase();
  const isThirdParty = row.sku === "BY-OTHERS" || role.includes("third-party") || role.includes("by others");
  if (isThirdParty) return "Third-party scope";
  if (row.type === "Required") return "Required";
  if (row.type === "Validate") return "Requires validation";
  return "Optional";
}
function templateBomRows(template: RoomTemplate, rows: TemplateBomRow[]): SalesBomRow[] {
  return rows.filter((row) => includedStatuses.has(row.status) && row.qty > 0).map((row, index) => ({
    item: index + 1, sku: row.sku, description: row.description, role: row.role, qty: row.qty,
    type: row.type, status: row.status, evidence: row.evidence, notes: `${row.notes} Template: ${template.name}.`,
  }));
}
function templateProducts(rows: TemplateBomRow[]): StoredProductSelection[] {
  return rows.filter((row) => includedStatuses.has(row.status) && row.qty > 0 && !row.sku.startsWith("BY-OTHERS")).map((row) => ({
    sku: row.sku, quantity: row.qty, title: row.description, category: row.role,
    status: row.type === "Required" ? "recommended" : "alternative",
    source: "Room Template", evidence: [row.evidence], cautions: [row.notes], addedAt: new Date().toISOString(),
  }));
}
function buildTemplateProposal(template: RoomTemplate, rows: TemplateBomRow[]): StoredProjectProposal {
  const bomRows = templateBomRows(template, rows);
  const products = templateProducts(rows);
  // readinessScore is now calculated by the component via validateProposalExport.
  // This fallback is only used inside buildTemplateProposal where the real score isn't available yet.
  const readinessScore = template.validationItems.length > 4 ? 78 : 84;
  const coach = buildWingmanCoachState({
    source: "proposal-template", audience: "dealer",
    discovery: { projectTitle: template.name, summary: template.customerNarrative, roomSize: template.application, displays: template.vertical },
    selectedProducts: products, bomRows, assumptions: [...template.assumptions, ...template.validationItems.map((item) => `Unverified: ${item}`)], readinessScore,
  });
  const personalisation = loadTemplateDraft(template.id)?.personalisation;
  return {
    title: personalisation?.documentTitle || template.name,
    summary: personalisation?.executiveSummary || template.customerNarrative,
    sections: ["Cover", "Application", "Architecture", "WyreStorm BOM", "Design Scope", "Assumptions", "Validation", "Upgrade Paths"],
    products, assumptions: [...template.assumptions, ...template.validationItems.map((item) => `Unverified: ${item}`)],
    outputPurpose: {
      motion: "Room/tender BOM", summary: `Use this as a ${template.vertical} ${template.application.toLowerCase()} boilerplate.`,
      customerOutput: "A pre-populated WyreStorm BOM with supporting AV design notes, assumptions, and validation points.",
      nextAction: "Adjust quantities and optional rows, then validate site-specific dependencies before customer issue.",
    },
    governedDependencies: [], bomRows, evidence: bomRows.map((row) => `${row.sku}: ${row.evidence}`),
    repGuidance: ["Use the template as a real-room starting point rather than a discovery questionnaire.", "Adjust only quantities and optional rows that differ from the known room.", "Escalate when room behaviour departs from the template architecture."],
    governanceWarnings: template.validationItems, validationNotes: template.designNotes.map((item) => `${item.label}: ${item.description}`),
    visualBlocks: coach.visualBlocks,
    applicationProposal: compileTemplateApplicationProposal(template, rows),
    proposalFooter: personalisation?.footer,
    readinessScore, updatedAt: new Date().toISOString(),
  };
}
function buildTemplateProject(template: RoomTemplate, rows: TemplateBomRow[]): StoredProject {
  const timestamp = new Date().toISOString();
  const proposal = buildTemplateProposal(template, rows);
  return {
    id: `template-${template.id}-${Date.now()}`, name: template.name, owner: "Wingman user", stage: "Templates",
    status: "recommended", updated: "Just now", resumeTo: `${routeCatalogByKey.templates.path}/${template.id}`,
    createdAt: timestamp, updatedAt: timestamp, productSelections: proposal.products, proposal,
    discoveryBrief: {
      savedAt: timestamp,
      capturedPercent: 72,
      roomModel: {
        clientName: loadTemplateDraft(template.id)?.personalisation.customerName || "",
        siteName: loadTemplateDraft(template.id)?.personalisation.site || "",
        application: template.application,
        vertical: template.vertical,
        roomType: template.name,
        scale: template.scale,
        summary: template.customerNarrative,
        inferredArchitectureDirection: template.architecture,
        sourceTemplateId: template.id,
        sourceTemplateName: template.name,
      },
      inference: { summary: template.customerNarrative, architecture: template.architecture },
      missingInformation: template.validationItems,
      nextBestQuestion: template.validationItems[0] || "Confirm the final room scope.",
    },
    workflow: { source: "Room Templates", lastStep: "Template review page", nextRoute: routeCatalogByKey.proposal.path, updatedAt: timestamp },
  };
}

export function TemplateReviewPage() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const customTemplates = useCustomRoomTemplates();
  const availableTemplates = useMemo(() => [...customTemplates, ...roomTemplates], [customTemplates]);
  const selectedTemplate = useMemo(() => availableTemplates.find((template) => template.id === templateId), [availableTemplates, templateId]);
  const [selectedRows, setSelectedRows] = useState<TemplateBomRow[]>(() => selectedTemplate ? cloneRows(selectedTemplate.bom) : []);
  const [activeTab, setActiveTab] = useState<Tab>("Equipment");
  const [dirty, setDirty] = useState(false);
  const [savedProjectPath, setSavedProjectPath] = useState("");
  const [savedTemplatePath, setSavedTemplatePath] = useState("");
  const [detailRow, setDetailRow] = useState<TemplateBomRow | null>(null);
  const [filter, setFilter] = useState("All");
  const [equipmentGroup, setEquipmentGroup] = useState<EquipmentGroup>("Required");
  const [connectivityView, setConnectivityView] = useState<"excalidraw" | "generated" | "native" | "visual-studio">("excalidraw");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (selectedTemplate) {
      setSelectedRows(cloneRows(selectedTemplate.bom)); setDirty(false); setActiveTab("Equipment"); setEquipmentGroup("Required");
      setSavedProjectPath(""); setSavedTemplatePath(""); setDetailRow(null);
    }
  }, [selectedTemplate]);

  // Derived values computed BEFORE the early return (React hooks rules).
  const template = selectedTemplate;
  const bomRows = template ? templateBomRows(template, selectedRows) : [];
  const products = templateProducts(selectedRows);

  // Run the proposal export validator — same checks the main wizard uses.
  const exportValidation: ExportValidationResult = useMemo(
    () => validateProposalExport({ products, bomRows }),
    [products, bomRows],
  );

  // Real readiness score: start from 100%, deduct for blockers and warnings
  const readinessScore = useMemo(() => {
    const base = 100;
    const blockerDeduction = exportValidation.blockers.length * 15;
    const warningDeduction = exportValidation.warnings.length * 5;
    const validationDeduction = template ? template.validationItems.length * 3 : 0;
    return Math.max(0, Math.min(100, base - blockerDeduction - warningDeduction - validationDeduction));
  }, [exportValidation, template]);

  if (!selectedTemplate) return <div data-wingman-template-detail-page="true" className="pb-10"><PageHero eyebrow="Room templates" title="Template not found." purpose="The selected room design template could not be found." nextMove="Go back to the template library and pick a room design to review." actions={[{ label: "Back to templates", to: routeCatalogByKey.templates.path }]} /></div>;

  const counts = {
    Required: selectedRows.filter((row) => row.type === "Required" && row.status !== "excluded").length,
    Validate: selectedRows.filter((row) => row.type === "Validate" && row.status !== "excluded").length,
    Optional: selectedRows.filter((row) => row.type === "Optional" && row.status !== "excluded").length,
    Excluded: selectedRows.filter((row) => row.status === "excluded").length,
  };
  const categories = ["All", ...Array.from(new Set(selectedRows.map((row) => row.role.split(" ")[0])))];
  const groupedRows = equipmentGroups.map((name) => ({
    name, rows: selectedRows.filter((row) => groupFor(row) === name && (filter === "All" || row.role.startsWith(filter))),
  }));
  const visibleEquipmentGroup = groupedRows.find((group) => group.name === equipmentGroup)!;

  function mutateRows(updater: (rows: TemplateBomRow[]) => TemplateBomRow[]) { setSelectedRows(updater); setDirty(true); }
  function updateRowQty(rowId: string, qty: number) {
    const safeQty = Math.max(0, Math.min(99, Number.isFinite(qty) ? qty : 0));
    mutateRows((current) => current.map((row) => row.id !== rowId ? row : {
      ...row, qty: safeQty, status: safeQty === 0 ? "excluded" : row.status === "excluded" ? (row.type === "Required" ? "included" : row.type.toLowerCase()) : row.status,
    }));
  }
  function toggleRow(rowId: string) {
    mutateRows((current) => current.map((row) => {
      if (row.id !== rowId) return row;
      const status = row.status === "excluded" ? (row.type === "Required" ? "included" : row.type.toLowerCase()) : "excluded";
      return { ...row, status, qty: status === "excluded" ? 0 : Math.max(1, row.qty) };
    }));
  }
  function resetEquipment() { setSelectedRows(cloneRows(template.bom)); setDirty(false); setDetailRow(null); }
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
  function addPlaceholder(thirdParty: boolean) {
    const id = `custom-${Date.now()}`;
    mutateRows((rows) => [...rows, {
      id, sku: thirdParty ? "BY-OTHERS" : "CUSTOM", description: thirdParty ? "Third-party placeholder" : "Added product",
      role: thirdParty ? "Third-party scope" : "Additional equipment", qty: 1, type: "Optional",
      status: thirdParty ? "excluded" : "optional", evidence: "Added during template review.", notes: "Confirm product, ownership and technical requirements.",
    }]);
    setEquipmentGroup(thirdParty ? "Third-party scope" : "Optional");
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
    <div className="wm-template-workspace pb-10" data-wingman-template-detail-page="true">
      <header className="wm-template-compact-header">
        <div className="wm-template-breadcrumb"><Link to={routeCatalogByKey.templates.path}>Templates</Link><ChevronRight /> <span>{template.name}</span></div>
        <div className="wm-template-header-row">
          <div>
            <div className="wm-template-title-line"><h1>{template.name}</h1><span className="wm-status is-confirmed">Ready to configure</span>{dirty ? <span className="wm-status is-unsaved">Unsaved changes</span> : <span className="wm-status is-saved"><Check /> Saved</span>}</div>
            <p>{template.summary}</p>
          </div>
          <div className="wm-template-header-actions">
            <Link className="wm-button is-secondary" to={routeCatalogByKey.templates.path}><ArrowLeft /> Back to templates</Link>
            <button className="wm-button is-secondary" type="button" onClick={saveTemplateProject}><Save /> Save as project</button>
            <button className="wm-button is-secondary" type="button" onClick={createProposalVisual}><LayoutTemplate /> Create visual</button>
            <button className="wm-button is-primary" type="button" onClick={() => setActiveTab("Proposal")}><FileText /> Continue to proposal</button>
            <details className="wm-template-overflow"><summary className="wm-icon-button" aria-label="More template actions"><MoreHorizontal /></summary><div>
              <button type="button" onClick={resetEquipment}><RotateCcw /> Reset equipment</button>
              <button type="button" onClick={exportTemplateBom}><Download /> Export BOM</button>
              <button type="button" onClick={saveTemplateDesign}><LayoutTemplate /> Save as template</button>
            </div></details>
          </div>
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
          {tabs.map((tab, index) => <button key={tab} ref={(node) => { tabRefs.current[index] = node; }} type="button" role="tab" id={`template-tab-${tab}`} aria-selected={activeTab === tab} aria-controls={`template-panel-${tab}`} tabIndex={activeTab === tab ? 0 : -1} onClick={() => { setActiveTab(tab); if (tab === "Equipment") setEquipmentGroup("Required"); }} onKeyDown={(event) => onTabKeyDown(event, index)}>{tab}{tab === "Equipment" && dirty ? <i aria-label="Unsaved changes" /> : null}</button>)}
        </div>
        {activeTab === "Equipment" ? <nav className="wm-equipment-scope-switcher" aria-label="Equipment scope">
          {equipmentGroups.slice(1).map((group) => <button type="button" key={group} aria-label={`${group} equipment group`} className={equipmentGroup === group ? "is-active" : ""} aria-pressed={equipmentGroup === group} onClick={() => setEquipmentGroup(group)}><span>{group}</span><small>{groupedRows.find((item) => item.name === group)?.rows.length ?? 0}</small></button>)}
        </nav> : null}
      </div>

      <main id={`template-panel-${activeTab}`} role="tabpanel" aria-labelledby={`template-tab-${activeTab}`} tabIndex={0}>
        {activeTab === "Overview" ? <div className="wm-template-overview">
          <section className="wm-template-overview-main">
            <div className="wm-template-section-heading"><div><span>System at a glance</span><h2>Signal flow</h2></div><span className="wm-status is-assumed">Template assumptions</span></div>
            <div className="wm-overview-flow">
              {["Sources", "WyreStorm core", "Transport", "Outputs"].map((stage, index) => <div key={stage}><small>0{index + 1}</small><strong>{stage}</strong><p>{index === 0 ? "Room inputs and UC" : index === 1 ? template.bom[0]?.sku || "Core platform" : index === 2 ? "AVoIP / extension" : "Displays and room systems"}</p></div>)}
            </div>
            <div className="wm-secondary-paths">
              {["USB", "Camera", "Audio", "Control", "Third-party scope"].map((path, index) => <div key={path}><span className={index === 4 ? "is-others" : index < 2 ? "is-validate" : "is-assumed"} /> <strong>{path}</strong><small>{index === 4 ? "By others" : index < 2 ? "Validate" : "Assumed"}</small></div>)}
            </div>
            <div className="wm-template-overview-notes">
              <div><span>Application</span><p>{template.application}</p></div>
              <div><span>Architecture</span><p>{template.architecture}</p></div>
            </div>
          </section>
          <aside className="wm-template-readiness">
            <div><span>Template readiness</span><strong>{readinessScore}%</strong></div>
            <div className="wm-readiness-bar"><i style={{ width: `${readinessScore}%` }} /></div>
            <div className="wm-count-strip"><div><strong>{counts.Required}</strong><span>Required</span></div><div><strong>{counts.Validate}</strong><span>Validate</span></div><div><strong>{counts.Optional}</strong><span>Optional</span></div></div>
            <h3>Priority validation</h3>
            <ol>{template.validationItems.slice(0, 3).map((item) => <li key={item}><span>?</span>{item}</li>)}</ol>
            <button className="wm-button is-primary is-full" type="button" onClick={() => setActiveTab("Equipment")}>Review validation items</button>
            <button className="wm-button is-secondary is-full" type="button" onClick={() => setActiveTab("Proposal")}>Continue with assumptions</button>
          </aside>
        </div> : null}

        {activeTab === "Connectivity" ? (
          <div className="wm-template-connectivity">
            <div className="wm-connectivity-view-switcher" role="tablist" aria-label="Block schematic view">
              <button type="button" role="tab" aria-selected={connectivityView === "excalidraw"} className={connectivityView === "excalidraw" ? "is-active" : ""} onClick={() => setConnectivityView("excalidraw")}>Reference block schematic</button>
              <button type="button" role="tab" aria-selected={connectivityView === "generated"} className={connectivityView === "generated" ? "is-active" : ""} onClick={() => setConnectivityView("generated")}>Generated for this template</button>
              <button type="button" role="tab" aria-selected={connectivityView === "native"} className={connectivityView === "native" ? "is-active" : ""} onClick={() => setConnectivityView("native")}>Topology-aware schematic</button>
              <button type="button" role="tab" aria-selected={connectivityView === "visual-studio"} className={connectivityView === "visual-studio" ? "is-active" : ""} onClick={() => setConnectivityView("visual-studio")}>Visual Studio canvas</button>
            </div>
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

        {activeTab === "Equipment" ? <div className="wm-equipment-workspace">
          <div className="wm-template-section-heading"><div><span>Equipment schedule</span><h2>Editable WyreStorm BOM</h2></div><span className="wm-status is-assumed">Edit quantities and scope</span></div>
          <div className="wm-template-steps" aria-label="Template configuration steps">
            {STEPS.map((step, index) => {
              const isActive = equipmentGroup === step.label ||
                (step.label === "Required" && equipmentGroup === "Required") ||
                (step.label === "Validate" && equipmentGroup === "Requires validation");
              const stepGroup = step.label === "Validate" ? "Requires validation" : step.label;
              return (
                <button
                  key={step.label}
                  type="button"
                  aria-label={`Step ${index + 1}: ${step.label}`}
                  className={`wm-template-step ${isActive ? "is-active" : ""} ${index < STEPS.length - 1 ? "has-connector" : ""}`}
                  onClick={() => {
                    setEquipmentGroup(stepGroup as EquipmentGroup);
                    if (step.label === "Proposal") setActiveTab("Proposal");
                  }}
                >
                  <span className="wm-template-step-num">{index + 1}</span>
                  <span className="wm-template-step-label">{step.label}</span>
                  <span className="wm-template-step-desc">{step.desc}</span>
                </button>
              );
            })}
          </div>
          <div className="wm-equipment-summary">{Object.entries(counts).map(([label, count]) => <div key={label}><strong>{count}</strong><span>{label}</span></div>)}</div>
          <div className="wm-equipment-toolbar">
            <div className="wm-equipment-toolbar-cluster"><div className="wm-category-filters" aria-label="Equipment category filters">{categories.slice(0, 6).map((category) => <button type="button" key={category} className={filter === category ? "is-active" : ""} onClick={() => setFilter(category)}>{category}</button>)}</div></div>
            <div className="wm-equipment-toolbar-cluster"><div><button type="button" onClick={() => addPlaceholder(false)}><Plus /> Add product</button><button type="button" onClick={() => addPlaceholder(true)}><Plus /> Add third-party</button><button type="button" onClick={resetEquipment}><RotateCcw /> Reset</button><button type="button" onClick={exportTemplateBom}><Download /> Export</button><button className="is-primary" type="button" onClick={() => setDirty(false)}><Save /> Save</button></div></div>
          </div>
          <div className="wm-equipment-groups">
            <section key={visibleEquipmentGroup.name}>
              <header className="wm-equipment-group-heading"><span><strong>{visibleEquipmentGroup.name}</strong><em>{groupCaptions[visibleEquipmentGroup.name]}</em></span><small>{visibleEquipmentGroup.rows.length}</small></header>
              <div>{visibleEquipmentGroup.rows.map((row) => {
                const enabled = includedStatuses.has(row.status);
                const thirdParty = visibleEquipmentGroup.name === "Third-party scope";
                return <article className={`wm-equipment-row ${enabled ? "" : "is-excluded"} ${thirdParty ? "is-third-party" : ""}`} key={row.id}>
                  <input type="checkbox" checked={enabled} onChange={() => toggleRow(row.id)} aria-label={`Include ${row.sku}`} />
                  <div className="wm-equipment-identity"><strong>{thirdParty ? row.description : row.sku}</strong><span>{thirdParty ? row.role : row.description}</span></div>
                  <span className="wm-equipment-role">{thirdParty ? "By others" : row.role}</span>
                  <div className="wm-quantity-stepper"><button type="button" onClick={() => updateRowQty(row.id, row.qty - 1)} aria-label={`Reduce ${row.sku} quantity`}><Minus /></button><input type="number" min="0" max="99" value={row.qty} onChange={(event) => updateRowQty(row.id, Number(event.target.value))} aria-label={`Quantity for ${row.sku}`} /><button type="button" onClick={() => updateRowQty(row.id, row.qty + 1)} aria-label={`Increase ${row.sku} quantity`}><Plus /></button></div>
                  <span className={`wm-status ${row.type === "Required" ? "is-confirmed" : row.type === "Validate" ? "is-validate" : enabled ? "is-assumed" : "is-others"}`}>{enabled ? row.type : "Excluded"}</span>
                  <button type="button" className="wm-icon-button" onClick={() => setDetailRow(row)} aria-label={`Edit ${row.sku}`}><Pencil /></button>
                </article>;
              })}</div>
            </section>
          </div>
        </div> : null}

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
        <label>Quantity<input type="number" min="0" max="99" value={selectedRows.find((row) => row.id === detailRow.id)?.qty ?? 0} onChange={(event) => updateRowQty(detailRow.id, Number(event.target.value))} /></label>
        <button className="wm-button is-primary is-full" type="button" onClick={() => setDetailRow(null)}>Done</button>
      </aside></div> : null}
    </div>
  );
}
