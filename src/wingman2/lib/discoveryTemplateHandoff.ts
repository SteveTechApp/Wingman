import type { CustomRoomTemplate } from "./customRoomTemplates";
import type { RoomTemplate, TemplateBomRow } from "./roomTemplates";

export type DiscoveryHandoffMode = "standard" | "template-create" | "template-edit";
export type DiscoveryHandoffAnswers = Record<string, string | string[]>;
export type DiscoveryHandoffNotes = Record<string, string>;

export type DiscoveryHandoff = {
  mode: DiscoveryHandoffMode;
  templateId?: string;
  templateName?: string;
  templateMarket?: string;
  sourceTemplateId?: string;
  sourceTemplateName?: string;
  answers?: DiscoveryHandoffAnswers;
  notes?: DiscoveryHandoffNotes;
};

const DISCOVERY_HANDOFF_KEY = "wingman:discovery-handoff";

function storageAvailable(): boolean {
  return typeof window !== "undefined" && Boolean(window.sessionStorage);
}

export function readDiscoveryHandoff(): DiscoveryHandoff | null {
  if (!storageAvailable()) return null;

  const raw = window.sessionStorage.getItem(DISCOVERY_HANDOFF_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as DiscoveryHandoff;
  } catch {
    return null;
  }
}

export function writeDiscoveryHandoff(handoff: DiscoveryHandoff): void {
  if (!storageAvailable()) return;
  window.sessionStorage.setItem(DISCOVERY_HANDOFF_KEY, JSON.stringify(handoff));
}

export function clearDiscoveryHandoff(): void {
  if (!storageAvailable()) return;
  window.sessionStorage.removeItem(DISCOVERY_HANDOFF_KEY);
}

function bomRowsMatching(rows: TemplateBomRow[], keywords: string[]): string {
  const matches = rows.filter((row) => {
    const text = `${row.role} ${row.description} ${row.sku}`.toLowerCase();
    return keywords.some((keyword) => text.includes(keyword));
  });

  if (!matches.length) return "";

  return matches.map((row) => `${row.qty}x ${row.description} (${row.role})`).join("; ");
}

function designNotesMatching(template: RoomTemplate, keywords: string[]): string {
  const matches = template.designNotes.filter((note) =>
    keywords.some((keyword) => note.label.toLowerCase().includes(keyword)),
  );

  if (!matches.length) return "";

  return matches.map((note) => `${note.label}: ${note.description}`).join(" ");
}

// Built-in templates were not captured through Discovery, so there is no exact
// question-answer mapping to restore. This produces a best-effort set of capture
// notes (quantities, USB/audio/control/network direction, assumptions and
// blockers) so Discovery opens pre-populated rather than blank, per template
// handoff requirements.
export function buildDiscoveryNotesFromTemplate(template: RoomTemplate): DiscoveryHandoffNotes {
  const notes: DiscoveryHandoffNotes = {};
  const blockers = [...template.assumptions, ...template.validationItems].filter(Boolean).join(" | ");

  notes.opportunity = [
    `From template "${template.name}": ${template.application}`,
    blockers ? `Assumptions / validate: ${blockers}` : "",
  ]
    .filter(Boolean)
    .join(" — ");

  if (template.scale) notes.scale = template.scale;

  const sources = bomRowsMatching(template.bom, ["source", "encoder", "transmitter", " tx"]);
  if (sources) notes.sources = sources;

  const displays = bomRowsMatching(template.bom, ["display", "decoder", "receiver", " rx"]);
  if (displays) notes.displays = displays;

  const usb = bomRowsMatching(template.bom, ["usb"]);
  if (usb) notes.usb = usb;

  const audio = designNotesMatching(template, ["audio"]);
  if (audio) notes.audio = audio;

  const control = designNotesMatching(template, ["control"]);
  if (control) notes.control = control;

  const network = designNotesMatching(template, ["network"]);
  if (network) notes.infrastructure = network;

  return notes;
}

function isCustomTemplate(
  template: RoomTemplate | CustomRoomTemplate,
): template is CustomRoomTemplate {
  return "customTemplate" in template && template.customTemplate === true;
}

export function buildDiscoveryHandoffFromTemplate(template: RoomTemplate | CustomRoomTemplate): DiscoveryHandoff {
  if (isCustomTemplate(template) && template.discoveryAnswers && Object.keys(template.discoveryAnswers).length > 0) {
    return {
      mode: "standard",
      sourceTemplateId: template.id,
      sourceTemplateName: template.name,
      answers: template.discoveryAnswers,
      notes: template.discoveryNotes ?? {},
    };
  }

  return {
    mode: "standard",
    sourceTemplateId: template.id,
    sourceTemplateName: template.name,
    notes: buildDiscoveryNotesFromTemplate(template),
  };
}
