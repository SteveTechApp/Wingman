import { useEffect, useState } from "react";
import type { StoredProject, StoredProposalBomRow } from "../data/projectStore";
import type { RoomTemplate, TemplateBomRow, TemplateBomType } from "./roomTemplates";
import { normaliseProjectTopology, type ProjectTopology } from "./projectTopology";

export const CUSTOM_ROOM_TEMPLATE_EVENT = "wingman:custom-room-templates-updated";

const CUSTOM_ROOM_TEMPLATE_KEY = "wingman-custom-room-templates-v1";
const defaultTemplateBomType: TemplateBomType = "Validate";

// Bump when the CustomRoomTemplate shape gains fields that older saved records
// won't have. normalizeTemplate() always fills safe defaults for missing fields,
// so older records keep loading; this just records what was captured.
export const CUSTOM_ROOM_TEMPLATE_SCHEMA_VERSION = 3;

export type DiscoveryAnswerMap = Record<string, string | string[]>;
export type DiscoveryNoteMap = Record<string, string>;

export type CustomRoomTemplate = RoomTemplate & {
  customTemplate: true;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
  sourceTemplateId?: string;
  sourceProjectId?: string;
  // Raw Discovery question answers/notes captured when this template was
  // created or edited via Discovery's template-creation mode. Reusing
  // Discovery's own answer shape avoids a second, parallel room-data model.
  discoveryAnswers: DiscoveryAnswerMap;
  discoveryNotes: DiscoveryNoteMap;
  topology?: ProjectTopology;
};

export type CreateCustomRoomTemplateInput = {
  name: string;
  vertical: string;
  application: string;
  scale: string;
  summary: string;
  customerNarrative?: string;
  architecture?: string;
  assumptions?: string[];
  validationItems?: string[];
  discoveryAnswers?: DiscoveryAnswerMap;
  discoveryNotes?: DiscoveryNoteMap;
  topology?: ProjectTopology;
};

function nowIso() {
  return new Date().toISOString();
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function browserStorageAvailable() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function dispatchTemplateEvent() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CUSTOM_ROOM_TEMPLATE_EVENT));
  }
}

function safeString(value: unknown, fallback: string) {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function safeStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;

  const values = value.map((item) => String(item ?? "").trim()).filter(Boolean);
  return values.length ? values : fallback;
}

function safeBomType(value: unknown): TemplateBomType {
  return value === "Required" || value === "Optional" || value === "Validate" ? value : defaultTemplateBomType;
}

function safeSchemaVersion(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : 1;
}

function safeDiscoveryAnswers(value: unknown): DiscoveryAnswerMap {
  if (!value || typeof value !== "object") return {};

  const record = value as Record<string, unknown>;
  const result: DiscoveryAnswerMap = {};

  for (const [key, raw] of Object.entries(record)) {
    if (Array.isArray(raw)) {
      const values = raw.map((item) => String(item ?? "").trim()).filter(Boolean);
      if (values.length) result[key] = values;
      continue;
    }

    const text = String(raw ?? "").trim();
    if (text) result[key] = text;
  }

  return result;
}

function safeDiscoveryNotes(value: unknown): DiscoveryNoteMap {
  if (!value || typeof value !== "object") return {};

  const record = value as Record<string, unknown>;
  const result: DiscoveryNoteMap = {};

  for (const [key, raw] of Object.entries(record)) {
    const text = String(raw ?? "").trim();
    if (text) result[key] = text;
  }

  return result;
}

function normalizeBomRow(row: unknown, index: number): TemplateBomRow | null {
  if (!row || typeof row !== "object") return null;

  const record = row as Record<string, unknown>;
  const sku = safeString(record.sku, "");
  const description = safeString(record.description, safeString(record.title, ""));
  if (!sku && !description) return null;

  const qty = Number(record.qty);

  return {
    id: safeString(record.id, `custom-row-${index + 1}`),
    sku: sku || "CUSTOM-ITEM",
    description: description || "Custom room item",
    role: safeString(record.role, safeString(record.category, "Room design item")),
    qty: Number.isFinite(qty) ? Math.max(0, Math.min(99, qty)) : 1,
    type: safeBomType(record.type),
    status: safeString(record.status, "included"),
    evidence: safeString(record.evidence, "Added from a user-created room template."),
    notes: safeString(record.notes, "Validate quantity, connectivity and installation scope before customer issue."),
  };
}

function placeholderBomRow(templateId: string): TemplateBomRow {
  return {
    id: `${templateId}-custom-scope`,
    sku: "CUSTOM-SCOPE",
    description: "Customer-specific room design allowance",
    role: "Scope placeholder",
    qty: 1,
    type: "Validate",
    status: "validate",
    evidence: "Created by the Wingman user.",
    notes: "Replace this placeholder with confirmed WyreStorm products before proposal output.",
  };
}

function normalizeTemplate(template: unknown, index: number): CustomRoomTemplate | null {
  if (!template || typeof template !== "object") return null;

  const record = template as Record<string, unknown>;
  const id = safeString(record.id, `custom-template-${index + 1}`);
  const timestamp = nowIso();
  const bom = Array.isArray(record.bom)
    ? record.bom.map((row, rowIndex) => normalizeBomRow(row, rowIndex)).filter((row): row is TemplateBomRow => Boolean(row))
    : [];

  return {
    id,
    name: safeString(record.name, "Custom room template"),
    vertical: safeString(record.vertical, "Custom"),
    application: safeString(record.application, "User-created room design"),
    scale: safeString(record.scale, "Custom"),
    summary: safeString(record.summary, "A user-created room template saved in this browser."),
    customerNarrative: safeString(
      record.customerNarrative,
      "Use this saved room design as the starting point for a customer-specific proposal.",
    ),
    architecture: safeString(record.architecture, "Confirm the room architecture, sources, displays, control and network requirements."),
    bom: bom.length ? bom : [placeholderBomRow(id)],
    designNotes: Array.isArray(record.designNotes)
      ? record.designNotes
          .map((item) => {
            if (!item || typeof item !== "object") return null;
            const note = item as Record<string, unknown>;
            return {
              label: safeString(note.label, "Design note"),
              description: safeString(note.description, "Review this custom room note before customer issue."),
            };
          })
          .filter((item): item is { label: string; description: string } => Boolean(item))
      : [{ label: "Custom template", description: "Created by a Wingman user and saved locally." }],
    assumptions: safeStringArray(record.assumptions, ["Confirm site constraints, cable paths and product availability."]),
    validationItems: safeStringArray(record.validationItems, ["Validate the saved design before using it for a live customer proposal."]),
    upgradePaths: safeStringArray(record.upgradePaths, ["Add optional enhancements after the base room requirement is confirmed."]),
    customTemplate: true,
    createdAt: safeString(record.createdAt, timestamp),
    updatedAt: safeString(record.updatedAt, timestamp),
    schemaVersion: safeSchemaVersion(record.schemaVersion),
    sourceTemplateId: safeString(record.sourceTemplateId, ""),
    sourceProjectId: safeString(record.sourceProjectId, ""),
    discoveryAnswers: safeDiscoveryAnswers(record.discoveryAnswers),
    discoveryNotes: safeDiscoveryNotes(record.discoveryNotes),
    topology: normaliseProjectTopology(record.topology),
  };
}

function readCustomTemplates(): CustomRoomTemplate[] {
  if (!browserStorageAvailable()) return [];

  try {
    const raw = window.localStorage.getItem(CUSTOM_ROOM_TEMPLATE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((template, index) => normalizeTemplate(template, index))
      .filter((template): template is CustomRoomTemplate => Boolean(template));
  } catch {
    return [];
  }
}

function writeCustomTemplates(templates: CustomRoomTemplate[]) {
  if (!browserStorageAvailable()) return;

  window.localStorage.setItem(CUSTOM_ROOM_TEMPLATE_KEY, JSON.stringify(templates));
  dispatchTemplateEvent();
}

export function getCustomRoomTemplates(): CustomRoomTemplate[] {
  return readCustomTemplates();
}

export function createCustomTemplateId(name: string, existingTemplates = readCustomTemplates()) {
  const base = slugify(name) || "room-template";
  const existingIds = new Set(existingTemplates.map((template) => template.id));
  let candidate = `custom-${base}`;
  let suffix = 2;

  while (existingIds.has(candidate)) {
    candidate = `custom-${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

export function createBlankCustomRoomTemplate(input: CreateCustomRoomTemplateInput): CustomRoomTemplate {
  const existingTemplates = readCustomTemplates();
  const id = createCustomTemplateId(input.name, existingTemplates);
  const timestamp = nowIso();
  const summary = safeString(input.summary, "A reusable room template created by the Wingman user.");

  return {
    id,
    name: safeString(input.name, "Custom room template"),
    vertical: safeString(input.vertical, "Custom"),
    application: safeString(input.application, "User-created room design"),
    scale: safeString(input.scale, "Custom"),
    summary,
    customerNarrative: safeString(input.customerNarrative, summary),
    architecture: safeString(
      input.architecture,
      "Add sources, displays, routing, control, USB, audio and network notes as the room design matures.",
    ),
    bom: [placeholderBomRow(id)],
    designNotes: [{ label: "Custom starting point", description: "Replace the placeholder row with confirmed products and design notes." }],
    assumptions: input.assumptions?.length ? input.assumptions : ["Room details are user-created and should be validated before proposal output."],
    validationItems: input.validationItems?.length ? input.validationItems : ["Confirm product fit, quantities, dependencies and installation scope."],
    upgradePaths: ["Add optional expansion paths once the base room is confirmed."],
    customTemplate: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    schemaVersion: CUSTOM_ROOM_TEMPLATE_SCHEMA_VERSION,
    discoveryAnswers: input.discoveryAnswers ?? {},
    discoveryNotes: input.discoveryNotes ?? {},
    topology: normaliseProjectTopology(input.topology),
  };
}

export function saveCustomRoomTemplate(
  template: RoomTemplate & { discoveryAnswers?: DiscoveryAnswerMap; discoveryNotes?: DiscoveryNoteMap; topology?: ProjectTopology },
  options: { id?: string; sourceTemplateId?: string; sourceProjectId?: string } = {},
) {
  const existingTemplates = readCustomTemplates();
  const timestamp = nowIso();
  const id = options.id || createCustomTemplateId(template.name, existingTemplates);
  const existingTemplate = existingTemplates.find((item) => item.id === id);
  const customTemplate = normalizeTemplate(
    {
      ...template,
      id,
      customTemplate: true,
      createdAt: existingTemplate?.createdAt || timestamp,
      updatedAt: timestamp,
      schemaVersion: CUSTOM_ROOM_TEMPLATE_SCHEMA_VERSION,
      sourceTemplateId: options.sourceTemplateId ?? existingTemplate?.sourceTemplateId,
      sourceProjectId: options.sourceProjectId ?? existingTemplate?.sourceProjectId,
      discoveryAnswers: template.discoveryAnswers ?? existingTemplate?.discoveryAnswers,
      discoveryNotes: template.discoveryNotes ?? existingTemplate?.discoveryNotes,
      topology: template.topology ?? existingTemplate?.topology,
    },
    existingTemplates.length,
  );

  if (!customTemplate) {
    throw new Error("Unable to save custom room template.");
  }

  writeCustomTemplates([customTemplate, ...existingTemplates.filter((item) => item.id !== id)]);
  return customTemplate;
}

export function duplicateCustomRoomTemplate(templateId: string): CustomRoomTemplate {
  const existingTemplates = readCustomTemplates();
  const source = existingTemplates.find((template) => template.id === templateId);

  if (!source) {
    throw new Error("Custom template not found.");
  }

  const timestamp = nowIso();
  const name = `${source.name} Copy`;
  const id = createCustomTemplateId(name, existingTemplates);

  const duplicate: CustomRoomTemplate = {
    ...source,
    id,
    name,
    bom: source.bom.map((row) => ({ ...row })),
    designNotes: source.designNotes.map((note) => ({ ...note })),
    assumptions: [...source.assumptions],
    validationItems: [...source.validationItems],
    upgradePaths: [...source.upgradePaths],
    discoveryAnswers: { ...source.discoveryAnswers },
    discoveryNotes: { ...source.discoveryNotes },
    customTemplate: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    schemaVersion: CUSTOM_ROOM_TEMPLATE_SCHEMA_VERSION,
  };

  writeCustomTemplates([duplicate, ...existingTemplates]);
  return duplicate;
}

export function saveRoomTemplateCopy(template: RoomTemplate, rows?: TemplateBomRow[]) {
  return saveCustomRoomTemplate(
    {
      ...template,
      name: `${template.name} - Custom`,
      summary: `Custom copy of ${template.name}. ${template.summary}`,
      bom: rows?.length ? rows.map((row) => ({ ...row })) : template.bom.map((row) => ({ ...row })),
    },
    { sourceTemplateId: template.id },
  );
}

function projectBomRows(project: StoredProject): TemplateBomRow[] {
  const proposalRows = project.proposal?.bomRows ?? [];
  const bomRows = proposalRows.map((row: StoredProposalBomRow, index): TemplateBomRow => ({
    id: `${project.id}-bom-${index + 1}`,
    sku: row.sku || "CUSTOM-ITEM",
    description: row.description || "Project BOM item",
    role: row.role || "Project item",
    qty: Number.isFinite(Number(row.qty)) ? Number(row.qty) : 1,
    type: safeBomType(row.type),
    status: row.status || "included",
    evidence: row.evidence || `Saved from project ${project.name}.`,
    notes: row.notes || "Validate this saved project row before reusing it as a template.",
  }));

  if (bomRows.length) return bomRows;

  return (project.productSelections ?? []).map((product, index): TemplateBomRow => ({
    id: `${project.id}-product-${index + 1}`,
    sku: product.sku,
    description: product.title || product.family || product.category || "Selected project product",
    role: product.category || product.family || "Selected product",
    qty: 1,
    type: product.status === "recommended" ? "Required" : "Optional",
    status: product.status === "alternative" ? "optional" : "included",
    evidence: product.evidence?.[0] || `Saved from project ${project.name}.`,
    notes: product.cautions?.[0] || "Validate product role and dependencies before reuse.",
  }));
}

export function saveProjectAsRoomTemplate(project: StoredProject) {
  const summary =
    project.proposal?.summary ||
    project.discoveryBrief?.nextBestQuestion ||
    project.recommendationEvidence?.customerRequirement ||
    `Reusable room template saved from ${project.name}.`;
  const direction = project.recommendationEvidence?.productDirection || project.productSelections?.[0]?.family || "Project design";
  const timestamp = nowIso();

  return saveCustomRoomTemplate(
    {
      id: project.id,
      name: `${project.name} template`,
      vertical: project.productSelections?.[0]?.category || project.stage || "Custom",
      application: direction,
      scale: project.discoveryBrief?.roomModel ? "Project-derived" : "Custom",
      summary,
      customerNarrative: project.proposal?.summary || summary,
      architecture:
        project.recommendationEvidence?.systemShape ||
        project.proposal?.outputPurpose?.summary ||
        "Project-derived room design. Review architecture before reuse.",
      bom: projectBomRows(project),
      designNotes: [
        { label: "Saved from project", description: `${project.name} was converted to a reusable room template on ${timestamp}.` },
        ...(project.proposal?.validationNotes ?? []).slice(0, 4).map((note) => ({ label: "Proposal note", description: note })),
      ],
      assumptions: project.proposal?.assumptions?.length
        ? project.proposal.assumptions
        : ["Project-derived template assumptions should be reviewed before customer issue."],
      validationItems: project.proposal?.governanceWarnings?.length
        ? project.proposal.governanceWarnings
        : ["Confirm the project-derived template still matches the next customer's room."],
      upgradePaths: project.recommendationEvidence?.optionalUpgrades?.length
        ? project.recommendationEvidence.optionalUpgrades
        : ["Add optional upgrades after confirming the base design."],
    },
    { sourceProjectId: project.id },
  );
}

export function deleteCustomRoomTemplate(templateId: string) {
  writeCustomTemplates(readCustomTemplates().filter((template) => template.id !== templateId));
}

export function useCustomRoomTemplates() {
  const [templates, setTemplates] = useState<CustomRoomTemplate[]>(() => readCustomTemplates());

  useEffect(() => {
    const refresh = () => setTemplates(readCustomTemplates());

    if (typeof window === "undefined") return undefined;

    window.addEventListener(CUSTOM_ROOM_TEMPLATE_EVENT, refresh);
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener(CUSTOM_ROOM_TEMPLATE_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return templates;
}
