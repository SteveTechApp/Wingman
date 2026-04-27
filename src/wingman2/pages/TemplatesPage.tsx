import { useMemo, useState, type ComponentType } from "react";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Download,
  FileText,
  GraduationCap,
  HeartPulse,
  Hotel,
  Landmark,
  Monitor,
  RotateCcw,
  Save,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Users,
} from "lucide-react";
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

type VerticalVisual = {
  name: string;
  strapline: string;
  image: string;
  Icon: ComponentType<{ className?: string }>;
};

const includedStatuses = new Set(["included", "optional", "validate"]);

const verticalVisuals: VerticalVisual[] = [
  {
    name: "All",
    strapline: "Browse every template",
    image: "/template-visuals/vertical-all.svg",
    Icon: Sparkles,
  },
  {
    name: "Corporate",
    strapline: "Meeting, boardroom and UC spaces",
    image: "/template-visuals/vertical-corporate.svg",
    Icon: Building2,
  },
  {
    name: "Education",
    strapline: "Classrooms, theatres and capture",
    image: "/template-visuals/vertical-education.svg",
    Icon: GraduationCap,
  },
  {
    name: "Hospitality",
    strapline: "Ballrooms, venues and sports bars",
    image: "/template-visuals/vertical-hospitality.svg",
    Icon: Hotel,
  },
  {
    name: "Retail",
    strapline: "Signage, feature walls and zones",
    image: "/template-visuals/vertical-retail.svg",
    Icon: ShoppingBag,
  },
  {
    name: "Government",
    strapline: "Civic and public sector rooms",
    image: "/template-visuals/vertical-government.svg",
    Icon: Landmark,
  },
  {
    name: "Healthcare",
    strapline: "Simulation, review and clinical AV",
    image: "/template-visuals/vertical-healthcare.svg",
    Icon: HeartPulse,
  },
];

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

function countTemplatesForVertical(vertical: string) {
  if (vertical === "All") return roomTemplates.length;
  return roomTemplates.filter((template) => template.vertical === vertical).length;
}

function roomVisualFor(template: RoomTemplate) {
  const blob = `${template.id} ${template.name} ${template.application}`.toLowerCase();

  if (blob.includes("huddle") || blob.includes("apollo")) return "/template-visuals/room-huddle.svg";
  if (blob.includes("boardroom")) return "/template-visuals/room-boardroom.svg";
  if (blob.includes("classroom")) return "/template-visuals/room-classroom.svg";
  if (blob.includes("lecture")) return "/template-visuals/room-lecture.svg";
  if (blob.includes("divisible") || blob.includes("ballroom")) return "/template-visuals/room-divisible.svg";
  if (blob.includes("signage")) return "/template-visuals/room-signage.svg";
  if (blob.includes("sports")) return "/template-visuals/room-sports.svg";
  if (blob.includes("wall")) return "/template-visuals/room-feature-wall.svg";
  if (blob.includes("simulation") || blob.includes("healthcare")) return "/template-visuals/room-simulation.svg";
  if (blob.includes("training")) return "/template-visuals/room-training.svg";
  if (blob.includes("control")) return "/template-visuals/room-control.svg";

  return "/template-visuals/room-training.svg";
}

function verticalImageFor(vertical: string) {
  return verticalVisuals.find((item) => item.name === vertical)?.image ?? "/template-visuals/vertical-all.svg";
}

function peopleHint(template: RoomTemplate) {
  const blob = `${template.name} ${template.scale}`.toLowerCase();

  if (blob.includes("huddle")) return "4-6";
  if (blob.includes("boardroom")) return "12-20";
  if (blob.includes("classroom")) return "20-30";
  if (blob.includes("lecture")) return "50-200";
  if (blob.includes("sports")) return "Venue";
  if (blob.includes("ballroom") || blob.includes("divisible")) return "10-100";
  if (blob.includes("simulation")) return "Clinical";
  if (blob.includes("retail") || blob.includes("signage")) return "Public";

  return template.scale;
}

function displayHint(template: RoomTemplate) {
  const blob = `${template.name} ${template.application}`.toLowerCase();

  if (blob.includes("networkhd") || blob.includes("sports")) return "Multi-display";
  if (blob.includes("boardroom")) return "2-3 displays";
  if (blob.includes("lecture")) return "2-4 displays";
  if (blob.includes("wall")) return "Video wall";
  if (blob.includes("signage")) return "1-8 displays";
  if (blob.includes("simulation")) return "Observation";
  if (blob.includes("huddle")) return "1 display";

  return "Room AV";
}

function difficultyHint(template: RoomTemplate) {
  const blob = `${template.id} ${template.name}`.toLowerCase();

  if (template.validationItems.length > 5 || blob.includes("networkhd") || blob.includes("simulation")) return "Advanced";
  if (blob.includes("ballroom") || blob.includes("sports") || blob.includes("lecture")) return "Popular";
  return "Easy";
}

function difficultyClass(label: string) {
  if (label === "Advanced") return "bg-red-950/70 text-red-100 ring-red-400/30";
  if (label === "Popular") return "bg-amber-950/70 text-amber-100 ring-amber-400/30";
  return "bg-emerald-950/70 text-emerald-100 ring-emerald-400/30";
}

function primarySkus(rows: TemplateBomRow[]) {
  return rows
    .filter((row) => row.type === "Required")
    .slice(0, 3)
    .map((row) => row.sku)
    .join(" / ");
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

  const selectedTemplate =
    roomTemplates.find((template) => template.id === selectedTemplateId) ?? visibleTemplates[0] ?? roomTemplates[0];

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
    }));
  }

  function toggleRow(rowId: string) {
    setBomState((current) => ({
      ...current,
      [selectedTemplate.id]: (current[selectedTemplate.id] ?? selectedTemplate.bom).map((row) => {
        if (row.id !== rowId) return row;

        const nextStatus = row.status === "excluded" ? (row.type === "Required" ? "included" : row.type.toLowerCase()) : "excluded";

        return {
          ...row,
          status: nextStatus,
          qty: nextStatus === "excluded" ? 0 : Math.max(1, row.qty),
        };
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
        title="Choose a visual starting point."
        purpose="Templates are standalone vertical designs with pre-populated WyreStorm BOMs, customer-safe narratives, assumptions, and AV design notes."
        nextMove="Choose a market, pick the closest room type, adjust the BOM rows that differ, then export or save the boilerplate as project-ready proposal content."
        actions={[
          { label: "Open projects", to: routeCatalogByKey.projects.path },
          { label: "Open proposal", to: routeCatalogByKey.proposal.path, variant: "secondary" },
        ]}
      />

      <SectionCard
        title="Template landing page"
        subtitle={`${roomTemplates.length} real-room boilerplates across ${verticalCount} market verticals. Use the image cards to start from the closest customer environment.`}
        rightSlot={
          <button
            type="button"
            onClick={() => selectVertical("All")}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-800 transition hover:bg-slate-50"
          >
            View all templates
          </button>
        }
      >
        <div className="space-y-6">
          <section className="wm-template-landing-panel">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="wingman-kicker">Vertical markets</p>
                <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Start with the customer environment</h3>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-600">
                {activeVertical === "All" ? `${roomTemplates.length} templates` : `${countTemplatesForVertical(activeVertical)} templates`}
              </span>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
              {verticalVisuals.map((market) => {
                const Icon = market.Icon;
                const count = countTemplatesForVertical(market.name);
                const active = activeVertical === market.name;

                return (
                  <button
                    key={market.name}
                    type="button"
                    onClick={() => selectVertical(market.name)}
                    className={`wm-template-market-card ${active ? "wm-template-market-card-active" : ""}`}
                  >
                    <div className="wm-template-market-image" style={{ backgroundImage: `url(${market.image})` }} />
                    <div className="wm-template-market-label">
                      <Icon className="h-5 w-5 text-amber-400" />
                      <div>
                        <strong>{market.name === "All" ? "All markets" : market.name}</strong>
                        <span>{market.strapline}</span>
                      </div>
                      <small>{count}</small>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="wm-template-landing-panel">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="wingman-kicker">Room templates</p>
                <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Pick the closest room type</h3>
              </div>
              <Link
                to={routeCatalogByKey.proposal.path}
                className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white transition hover:bg-slate-800"
              >
                Build proposal
              </Link>
            </div>

            {visibleTemplates.length === 0 ? (
              <div className="mt-4 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <p className="text-lg font-black text-slate-950">No templates in this vertical yet.</p>
                <p className="mt-2 text-sm text-slate-600">Choose another market or view all room templates.</p>
                <button
                  type="button"
                  onClick={() => selectVertical("All")}
                  className="mt-4 rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white"
                >
                  View all templates
                </button>
              </div>
            ) : (
              <div className="mt-4 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                {visibleTemplates.map((template) => {
                  const active = selectedTemplate.id === template.id;
                  const difficulty = difficultyHint(template);

                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => setSelectedTemplateId(template.id)}
                      className={`wm-template-room-card ${active ? "wm-template-room-card-active" : ""}`}
                    >
                      <div
                        className="wm-template-room-image"
                        style={{
                          backgroundImage: `linear-gradient(180deg, rgba(2,6,23,0.08), rgba(2,6,23,0.72)), url(${roomVisualFor(template)})`,
                        }}
                      >
                        <span>{template.vertical}</span>
                      </div>

                      <div className="wm-template-room-body">
                        <div>
                          <h4>{template.name}</h4>
                          <p>{template.summary}</p>
                        </div>

                        <div className="wm-template-room-meta">
                          <span>
                            <Users className="h-3.5 w-3.5" />
                            {peopleHint(template)}
                          </span>
                          <span>
                            <Monitor className="h-3.5 w-3.5" />
                            {displayHint(template)}
                          </span>
                          <span className={difficultyClass(difficulty)}>{difficulty}</span>
                        </div>

                        <div className="wm-template-room-footer">
                          <small>{primarySkus(template.bom)}</small>
                          <ArrowRight className="h-5 w-5" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="wm-template-detail-shell">
            <div
              className="wm-template-detail-hero"
              style={{
                backgroundImage: `linear-gradient(90deg, rgba(2,6,23,0.92), rgba(2,6,23,0.62), rgba(2,6,23,0.18)), url(${roomVisualFor(
                  selectedTemplate,
                )})`,
              }}
            >
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

            <details className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
              <summary className="cursor-pointer text-sm font-black text-slate-950">Show architecture, validation and upgrade notes</summary>
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

const TEMPLATE_WORKFLOW_MARKER_OTHER_AV_DESIGN_SCOPE = "Other AV design scope";
void TEMPLATE_WORKFLOW_MARKER_OTHER_AV_DESIGN_SCOPE;
