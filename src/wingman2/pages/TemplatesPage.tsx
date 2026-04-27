import { useMemo, useState } from "react";
import { CheckCircle2, Download, FileText, RotateCcw, Save, SlidersHorizontal } from "lucide-react";
import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { PageHero } from "../components/PageHero";
import { SectionCard } from "../components/SectionCard";
import {
  upsertStoredProject,
  type StoredProductSelection,
  type StoredProject,
  type StoredProjectProposal,
} from "../data/projectStore";
import { exportBomCsv, exportProposalHtml } from "../lib/proposalExport";
import { roomTemplates, roomTemplateVerticals, type RoomTemplate, type TemplateBomRow } from "../lib/roomTemplates";
import type { SalesBomRow } from "../lib/salesReadiness";

type TemplateBomState = Record<string, TemplateBomRow[]>;

const includedStatuses = new Set(["included", "optional", "validate"]);

function cloneRows(rows: TemplateBomRow[]) {
  return rows.map((row) => ({ ...row }));
}

function initialBomState(): TemplateBomState {
  return Object.fromEntries(roomTemplates.map((template) => [template.id, cloneRows(template.bom)]));
}

function templateBomRows(template: RoomTemplate, rows: TemplateBomRow[]): SalesBomRow[] {
  return rows
    .filter((row) => includedStatuses.has(row.status) && row.qty > 0)
    .map((row, index) => ({
      item: index + 1,
      sku: row.sku,
      description: row.description,
      role: row.role,
      qty: row.qty,
      type: row.type,
      status: row.status,
      evidence: row.evidence,
      notes: `${row.notes} Template: ${template.name}.`,
    }));
}

function templateProducts(rows: TemplateBomRow[]): StoredProductSelection[] {
  return rows
    .filter((row) => includedStatuses.has(row.status) && row.qty > 0)
    .map((row) => ({
      sku: row.sku,
      title: row.description,
      category: row.role,
      status: row.type === "Required" ? "recommended" : "alternative",
      source: "Room Template",
      evidence: [row.evidence],
      cautions: [row.notes],
      addedAt: new Date().toISOString(),
    }));
}

function buildTemplateProposal(template: RoomTemplate, rows: TemplateBomRow[]): StoredProjectProposal {
  const bomRows = templateBomRows(template, rows);

  return {
    title: template.name,
    summary: template.customerNarrative,
    sections: [
      "Cover",
      "Application",
      "Architecture",
      "WyreStorm BOM",
      "Design Scope",
      "Assumptions",
      "Validation",
      "Upgrade Paths",
    ],
    products: templateProducts(rows),
    assumptions: template.assumptions,
    outputPurpose: {
      motion: "Room/tender BOM",
      summary: `Use this as a ${template.vertical} ${template.application.toLowerCase()} boilerplate.`,
      customerOutput: "A pre-populated WyreStorm BOM with supporting AV design notes, assumptions, and validation points.",
      nextAction: "Adjust quantities and optional rows, then validate site-specific dependencies before customer issue.",
    },
    governedDependencies: [],
    bomRows,
    evidence: bomRows.map((row) => `${row.sku}: ${row.evidence}`),
    repGuidance: [
      "Use the template as a real-room starting point rather than a discovery questionnaire.",
      "Adjust only the quantities and optional rows that differ from the customer's known room.",
      "Escalate to pre-sales when the room behaviour departs from the template architecture.",
    ],
    governanceWarnings: template.validationItems,
    validationNotes: template.designNotes.map((item) => `${item.label}: ${item.description}`),
    readinessScore: template.validationItems.length > 4 ? 78 : 84,
    updatedAt: new Date().toISOString(),
  };
}

function buildTemplateProject(template: RoomTemplate, rows: TemplateBomRow[]): StoredProject {
  const timestamp = new Date().toISOString();
  const proposal = buildTemplateProposal(template, rows);

  return {
    id: `template-${template.id}-${Date.now()}`,
    name: template.name,
    owner: "Wingman user",
    stage: "Templates",
    status: "recommended",
    updated: "Just now",
    resumeTo: routeCatalogByKey.templates.path,
    createdAt: timestamp,
    updatedAt: timestamp,
    productSelections: proposal.products,
    proposal,
    workflow: {
      source: "Room Templates",
      lastStep: "Standalone template BOM saved",
      nextRoute: routeCatalogByKey.proposal.path,
      updatedAt: timestamp,
    },
  };
}

export function TemplatesPage() {
  const [activeVertical, setActiveVertical] = useState("All");
  const [selectedTemplateId, setSelectedTemplateId] = useState(roomTemplates[0]?.id ?? "");
  const [bomState, setBomState] = useState<TemplateBomState>(() => initialBomState());
  const [savedProjectPath, setSavedProjectPath] = useState("");

  const visibleTemplates = useMemo(
    () =>
      activeVertical === "All"
        ? roomTemplates
        : roomTemplates.filter((template) => template.vertical === activeVertical),
    [activeVertical],
  );

  const selectedTemplate = roomTemplates.find((template) => template.id === selectedTemplateId) ?? visibleTemplates[0] ?? roomTemplates[0];
  const selectedRows = bomState[selectedTemplate.id] ?? selectedTemplate.bom;
  const bomRows = templateBomRows(selectedTemplate, selectedRows);
  const requiredCount = selectedRows.filter((row) => row.type === "Required" && includedStatuses.has(row.status)).length;
  const optionalCount = selectedRows.filter((row) => row.type !== "Required" && includedStatuses.has(row.status)).length;
  const verticalCount = roomTemplateVerticals.length - 1;

  function selectVertical(vertical: string) {
    setActiveVertical(vertical);
    const nextTemplate = vertical === "All" ? roomTemplates[0] : roomTemplates.find((template) => template.vertical === vertical);
    if (nextTemplate) setSelectedTemplateId(nextTemplate.id);
  }

  function updateRowQty(rowId: string, qty: number) {
    const safeQty = Math.max(0, Math.min(99, Number.isFinite(qty) ? qty : 0));
    setBomState((current) => ({
      ...current,
      [selectedTemplate.id]: (current[selectedTemplate.id] ?? selectedTemplate.bom).map((row) =>
        row.id === rowId ? { ...row, qty: safeQty, status: safeQty === 0 ? "excluded" : row.status === "excluded" ? row.type === "Required" ? "included" : row.type.toLowerCase() : row.status } : row,
      ),
    }));
  }

  function toggleRow(rowId: string) {
    setBomState((current) => ({
      ...current,
      [selectedTemplate.id]: (current[selectedTemplate.id] ?? selectedTemplate.bom).map((row) => {
        if (row.id !== rowId) return row;
        const nextStatus = row.status === "excluded" ? (row.type === "Required" ? "included" : row.type.toLowerCase()) : "excluded";
        return { ...row, status: nextStatus, qty: nextStatus === "excluded" ? 0 : Math.max(1, row.qty) };
      }),
    }));
  }

  function resetTemplateBom() {
    setBomState((current) => ({
      ...current,
      [selectedTemplate.id]: cloneRows(selectedTemplate.bom),
    }));
  }

  function exportTemplateBom() {
    exportBomCsv(buildTemplateProposal(selectedTemplate, selectedRows), bomRows);
  }

  function exportTemplateProposal() {
    const proposal = buildTemplateProposal(selectedTemplate, selectedRows);
    exportProposalHtml(proposal, bomRows);
  }

  function saveTemplateProject() {
    const project = upsertStoredProject(buildTemplateProject(selectedTemplate, selectedRows));
    setSavedProjectPath(`/wingman/projects/${project.id}`);
  }

  return (
    <div className="pb-10">
      <PageHero
        eyebrow="Room Solution Templates"
        title="Start from a real-room boilerplate."
        purpose="Templates are standalone vertical designs with pre-populated WyreStorm BOMs, customer-safe narratives, assumptions, and AV design notes."
        nextMove="Choose the closest room, adjust the BOM rows that differ, then export or save the boilerplate as project-ready proposal content."
        actions={[
          { label: "Open projects", to: routeCatalogByKey.projects.path },
          { label: "Open proposal", to: routeCatalogByKey.proposal.path, variant: "secondary" },
        ]}
      />

      <SectionCard
        title="Template library"
        subtitle={`${roomTemplates.length} real-room boilerplates across ${verticalCount} market verticals. Templates do not require discovery before use.`}
        rightSlot={
          <div className="flex flex-wrap gap-2">
            {roomTemplateVerticals.map((vertical) => (
              <button
                key={vertical}
                type="button"
                onClick={() => selectVertical(vertical)}
                className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                  activeVertical === vertical
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {vertical}
              </button>
            ))}
          </div>
        }
      >
        <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
          <div className="space-y-3">
            {visibleTemplates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => setSelectedTemplateId(template.id)}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  selectedTemplate.id === template.id
                    ? "border-slate-900 bg-slate-950 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-800 hover:border-slate-400"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="wingman-kicker">{template.vertical}</p>
                    <h3 className="mt-2 text-base font-black">{template.name}</h3>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-black ${
                      selectedTemplate.id === template.id ? "bg-white/10 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {template.bom.length} rows
                  </span>
                </div>
                <p className={`mt-3 text-sm leading-6 ${selectedTemplate.id === template.id ? "text-slate-300" : "text-slate-600"}`}>
                  {template.summary}
                </p>
              </button>
            ))}
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="wingman-kicker">{selectedTemplate.vertical} template</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">{selectedTemplate.name}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">{selectedTemplate.customerNarrative}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={resetTemplateBom}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset BOM
                  </button>
                  <button
                    type="button"
                    onClick={exportTemplateBom}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Download className="h-4 w-4" />
                    Export BOM
                  </button>
                  <button
                    type="button"
                    onClick={exportTemplateProposal}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <FileText className="h-4 w-4" />
                    Export proposal
                  </button>
                  <button
                    type="button"
                    onClick={saveTemplateProject}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    <Save className="h-4 w-4" />
                    Save as project
                  </button>
                </div>
              </div>

              {savedProjectPath ? (
                <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-semibold">Template saved as a standalone project.</span>
                  <Link to={savedProjectPath} className="rounded-full border border-emerald-300 px-3 py-1 font-semibold hover:bg-white">
                    Open project
                  </Link>
                </div>
              ) : null}

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="wingman-kicker">Application</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{selectedTemplate.application}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="wingman-kicker">Scale</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{selectedTemplate.scale}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="wingman-kicker">BOM state</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {requiredCount} required rows, {optionalCount} optional or validate rows.
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="wingman-kicker">Architecture</p>
                <p className="mt-2 text-sm leading-7 text-slate-700">{selectedTemplate.architecture}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="wingman-kicker">Editable WyreStorm BOM</p>
                  <h3 className="mt-2 text-xl font-black text-slate-950">Template rows</h3>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700">
                  <SlidersHorizontal className="h-4 w-4" />
                  Small quantity and include/exclude edits
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Use</th>
                      <th className="px-4 py-3 font-semibold">SKU</th>
                      <th className="px-4 py-3 font-semibold">Role</th>
                      <th className="px-4 py-3 font-semibold">Qty</th>
                      <th className="px-4 py-3 font-semibold">Type</th>
                      <th className="px-4 py-3 font-semibold">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRows.map((row) => {
                      const enabled = includedStatuses.has(row.status);

                      return (
                        <tr key={row.id} className={`border-t border-slate-100 ${enabled ? "bg-white" : "bg-slate-50 text-slate-400"}`}>
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={enabled}
                              onChange={() => toggleRow(row.id)}
                              className="h-4 w-4 rounded border-slate-300"
                              aria-label={`Include ${row.sku}`}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-black text-slate-900">{row.sku}</p>
                            <p className="mt-1 text-xs text-slate-500">{row.description}</p>
                          </td>
                          <td className="px-4 py-3 text-slate-700">{row.role}</td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="0"
                              max="99"
                              value={row.qty}
                              onChange={(event) => updateRowQty(row.id, Number(event.target.value))}
                              className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-sm text-slate-900"
                              aria-label={`Quantity for ${row.sku}`}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-black ${
                                row.type === "Required"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : row.type === "Optional"
                                    ? "bg-sky-100 text-sky-800"
                                    : "bg-amber-100 text-amber-900"
                              }`}
                            >
                              {row.type}
                            </span>
                          </td>
                          <td className="max-w-md px-4 py-3 text-slate-600">{row.notes}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="wingman-kicker">Other AV design scope</p>
                <div className="mt-3 space-y-3">
                  {selectedTemplate.designNotes.map((item) => (
                    <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6">
                      <p className="font-black text-slate-900">{item.label}</p>
                      <p className="mt-1 text-slate-600">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="wingman-kicker">Validation and upgrades</p>
                <div className="mt-3 grid gap-3">
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
                    <p className="font-black">Validate before customer issue</p>
                    <ul className="mt-2 space-y-1">
                      {selectedTemplate.validationItems.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-sky-200 bg-sky-50 p-3 text-sm leading-6 text-sky-950">
                    <p className="font-black">Useful upgrade paths</p>
                    <ul className="mt-2 space-y-1">
                      {selectedTemplate.upgradePaths.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
