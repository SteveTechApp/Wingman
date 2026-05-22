import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileText,
  RotateCcw,
  Save,
  SlidersHorizontal,
} from "lucide-react";
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
import { roomTemplates, type RoomTemplate, type TemplateBomRow } from "../lib/roomTemplates";
import type { SalesBomRow } from "../lib/salesReadiness";

const includedStatuses = new Set(["included", "optional", "validate"]);
const TEMPLATE_REVIEW_WORKFLOW_SCOPE = "Other AV design scope";
void TEMPLATE_REVIEW_WORKFLOW_SCOPE;

function templateVisualPath(fileName: string): string {
  const base = String(import.meta.env.BASE_URL || "/");
  const cleanBase = base.endsWith("/") ? base : `${base}/`;
  const cleanFileName = fileName.replace(/^\/?template-visuals\//, "");
  return `${cleanBase}template-visuals/${cleanFileName}`;
}

function cloneRows(rows: TemplateBomRow[]) {
  return rows.map((row) => ({ ...row }));
}


function templatePhotoPath(fileName: string): string {
  const base = String(import.meta.env.BASE_URL || "/");
  const cleanBase = base.endsWith("/") ? base : `${base}/`;
  const cleanFileName = fileName.replace(/^\/?template-photos\//, "");
  return `${cleanBase}template-photos/${cleanFileName}`;
}
function roomVisualFor(template: RoomTemplate) {
  const blob = `${template.id} ${template.name} ${template.application}`.toLowerCase();

  if (blob.includes("multi-camera") || blob.includes("camera bridge")) return templatePhotoPath("photo-multicamera-meeting.jpg");
  if (blob.includes("huddle") || blob.includes("apollo")) return templatePhotoPath("photo-huddle-room.jpg");
  if (blob.includes("boardroom")) return templatePhotoPath("photo-boardroom.jpg");
  if (blob.includes("school hall") || blob.includes("assembly") || blob.includes("projector")) return templatePhotoPath("photo-school-hall-projector.jpg");
  if (blob.includes("classroom")) return templatePhotoPath("photo-classroom.jpg");
  if (blob.includes("lecture")) return templatePhotoPath("photo-school-hall-projector.jpg");
  if (blob.includes("flexible learning")) return templatePhotoPath("photo-flexible-learning.jpg");
  if (blob.includes("hybrid collaboration") || blob.includes("hybrid teaching") || blob.includes("dante")) return templatePhotoPath("photo-hybrid-teaching.jpg");
  if (blob.includes("active learning") || blob.includes("600 local") || blob.includes("600-trx") || blob.includes("nhd600")) return templatePhotoPath("photo-situation-room.jpg");
  if (blob.includes("local pub") || blob.includes("8x8 matrix")) return templatePhotoPath("photo-pub-matrix.jpg");
  if (blob.includes("sports") || blob.includes("bar")) return templatePhotoPath("photo-sportsbar.jpg");
  if (blob.includes("casino")) return templatePhotoPath("photo-casino.jpg");
  if (blob.includes("bingo")) return templatePhotoPath("photo-bingo.jpg");
  if (blob.includes("led wall")) return templatePhotoPath("photo-led-wall.jpg");
  if (blob.includes("stadium") || blob.includes("concourse") || blob.includes("vip")) return templatePhotoPath("photo-stadium.jpg");
  if (blob.includes("security command")) return templatePhotoPath("photo-security-command.jpg");
  if (blob.includes("situation control") || blob.includes("situation room")) return templatePhotoPath("photo-situation-room.jpg");
  if (blob.includes("control")) return templatePhotoPath("photo-control-room.jpg");
  if (blob.includes("signage")) return templatePhotoPath("photo-signage.jpg");
  if (blob.includes("wall")) return templatePhotoPath("photo-led-wall.jpg");


  if (blob.includes("multi-camera") || blob.includes("camera bridge")) return templateVisualPath("room-multicamera.svg");
  if (blob.includes("school hall") || blob.includes("assembly") || blob.includes("projector")) return templateVisualPath("room-school-hall.svg");
  if (blob.includes("flexible learning")) return templateVisualPath("room-flex-learning.svg");
  if (blob.includes("hybrid collaboration") || blob.includes("hybrid teaching") || blob.includes("dante")) return templateVisualPath("room-hybrid-teaching.svg");
  if (blob.includes("active learning") || blob.includes("600 local") || blob.includes("600-trx") || blob.includes("nhd600")) return templateVisualPath("room-nhd600-lab.svg");
  if (blob.includes("local pub") || blob.includes("8x8 matrix")) return templateVisualPath("room-pub-matrix.svg");
  if (blob.includes("casino")) return templateVisualPath("room-casino.svg");
  if (blob.includes("bingo") || blob.includes("led wall")) return templateVisualPath("room-bingo-led.svg");
  if (blob.includes("stadium") || blob.includes("concourse") || blob.includes("vip")) return templateVisualPath("room-stadium.svg");
  if (blob.includes("security command")) return templateVisualPath("room-security-command.svg");
  if (blob.includes("situation control") || blob.includes("situation room")) return templateVisualPath("room-situation-room.svg");

  if (blob.includes("huddle") || blob.includes("apollo")) return templateVisualPath("room-huddle.svg");
  if (blob.includes("boardroom")) return templateVisualPath("room-boardroom.svg");
  if (blob.includes("classroom")) return templateVisualPath("room-classroom.svg");
  if (blob.includes("lecture") || blob.includes("hall") || blob.includes("auditorium") || blob.includes("assembly")) return templateVisualPath("room-lecture.svg");
  if (blob.includes("divisible") || blob.includes("ballroom")) return templateVisualPath("room-divisible.svg");
  if (blob.includes("signage") || blob.includes("casino") || blob.includes("stadium") || blob.includes("concourse") || blob.includes("vip")) return templateVisualPath("room-signage.svg");
  if (blob.includes("sports") || blob.includes("pub") || blob.includes("bar")) return templateVisualPath("room-sports.svg");
  if (blob.includes("wall") || blob.includes("bingo") || blob.includes("led")) return templateVisualPath("room-feature-wall.svg");
  if (blob.includes("simulation") || blob.includes("healthcare")) return templateVisualPath("room-simulation.svg");
  if (blob.includes("training")) return templateVisualPath("room-training.svg");
  if (blob.includes("control") || blob.includes("command") || blob.includes("situation") || blob.includes("security")) return templateVisualPath("room-control.svg");

  return templateVisualPath("room-training.svg");
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
    resumeTo: `${routeCatalogByKey.templates.path}/${template.id}`,
    createdAt: timestamp,
    updatedAt: timestamp,
    productSelections: proposal.products,
    proposal,
    workflow: {
      source: "Room Templates",
      lastStep: "Template review page",
      nextRoute: routeCatalogByKey.proposal.path,
      updatedAt: timestamp,
    },
  };
}

export function TemplateReviewPage() {
  const { templateId } = useParams();
  const selectedTemplate = useMemo(
    () => roomTemplates.find((template) => template.id === templateId) ?? roomTemplates[0],
    [templateId],
  );

  const [selectedRows, setSelectedRows] = useState<TemplateBomRow[]>(() =>
    selectedTemplate ? cloneRows(selectedTemplate.bom) : [],
  );
  const [savedProjectPath, setSavedProjectPath] = useState("");

  useEffect(() => {
    if (selectedTemplate) {
      setSelectedRows(cloneRows(selectedTemplate.bom));
      setSavedProjectPath("");
    }
  }, [selectedTemplate]);

  if (!selectedTemplate) {
    return (
      <div className="pb-10">
        <PageHero
          eyebrow="Room Template Review"
          title="Template not found."
          purpose="The selected room design template could not be found."
          nextMove="Return to the template selection page and choose another room type."
          actions={[{ label: "Back to templates", to: routeCatalogByKey.templates.path }]}
        />
      </div>
    );
  }

  const bomRows = templateBomRows(selectedTemplate, selectedRows);
  const requiredCount = selectedRows.filter((row) => row.type === "Required" && includedStatuses.has(row.status)).length;
  const optionalCount = selectedRows.filter((row) => row.type !== "Required" && includedStatuses.has(row.status)).length;

  function updateRowQty(rowId: string, qty: number) {
    const safeQty = Math.max(0, Math.min(99, Number.isFinite(qty) ? qty : 0));

    setSelectedRows((current) =>
      current.map((row) =>
        row.id === rowId
          ? {
              ...row,
              qty: safeQty,
              status:
                safeQty === 0
                  ? "excluded"
                  : row.status === "excluded"
                    ? row.type === "Required"
                      ? "included"
                      : row.type.toLowerCase()
                    : row.status,
            }
          : row,
      ),
    );
  }

  function toggleRow(rowId: string) {
    setSelectedRows((current) =>
      current.map((row) => {
        if (row.id !== rowId) return row;

        const nextStatus = row.status === "excluded" ? (row.type === "Required" ? "included" : row.type.toLowerCase()) : "excluded";

        return {
          ...row,
          status: nextStatus,
          qty: nextStatus === "excluded" ? 0 : Math.max(1, row.qty),
        };
      }),
    );
  }

  function resetTemplateBom() {
    setSelectedRows(cloneRows(selectedTemplate.bom));
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
        eyebrow="Room Template Review"
        title={selectedTemplate.name}
        purpose="Review the selected room design template, validate the architecture notes, adjust the BOM rows, then export or save it as a project."
        nextMove="Use this page as the template review stage before moving into a customer-specific proposal."
        actions={[
          { label: "Back to templates", to: routeCatalogByKey.templates.path, variant: "secondary" },
          { label: "Open proposal", to: routeCatalogByKey.proposal.path },
        ]}
      />

      <SectionCard
        title="Room design template"
        subtitle={`${selectedTemplate.vertical} template for ${selectedTemplate.application}.`}
        rightSlot={
          <Link
            to={routeCatalogByKey.templates.path}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-800 transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Select another template
          </Link>
        }
      >
        <div className="space-y-5">
          <section className="wm-template-detail-shell">
            <div className="wm-template-detail-hero">
              <img
                src={roomVisualFor(selectedTemplate)}
                alt=""
                className="wm-template-detail-visual"
                loading="lazy"
                decoding="async"
              />
              <div>
                <p className="wingman-kicker">{selectedTemplate.vertical} template</p>
                <h2>{selectedTemplate.name}</h2>
                <p>{selectedTemplate.customerNarrative}</p>
              </div>

              <div className="wm-template-detail-actions">
                <button type="button" onClick={resetTemplateBom}>
                  <RotateCcw className="h-5 w-5" />
                  <span>Reset BOM</span>
                </button>
                <button type="button" onClick={exportTemplateBom}>
                  <Download className="h-5 w-5" />
                  <span>Export BOM</span>
                </button>
                <button type="button" onClick={exportTemplateProposal}>
                  <FileText className="h-5 w-5" />
                  <span>Export proposal</span>
                </button>
                <button type="button" onClick={saveTemplateProject} className="wm-template-action-primary">
                  <Save className="h-5 w-5" />
                  <span>Save project</span>
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

            <div className="mt-5 grid gap-4 lg:grid-cols-3">
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

            <details className="mt-4 rounded-2xl border border-slate-200 bg-white p-4" open>
              <summary className="cursor-pointer text-sm font-black text-slate-950">
                Architecture, validation and upgrade notes
              </summary>
              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="wingman-kicker">Architecture</p>
                  <p className="mt-2 text-sm leading-7 text-slate-700">{selectedTemplate.architecture}</p>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                  <p className="font-black">Validate before customer issue</p>
                  <ul className="mt-2 list-disc space-y-1 pl-4">
                    {selectedTemplate.validationItems.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-950">
                  <p className="font-black">Useful upgrade paths</p>
                  <ul className="mt-2 list-disc space-y-1 pl-4">
                    {selectedTemplate.upgradePaths.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </details>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="wingman-kicker">Editable WyreStorm BOM</p>
                  <h3 className="mt-2 text-xl font-black text-slate-950">Template rows</h3>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700">
                  <SlidersHorizontal className="h-4 w-4" />
                  Quantity and include/exclude edits
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
          </section>
        </div>
      </SectionCard>
    </div>
  );
}
