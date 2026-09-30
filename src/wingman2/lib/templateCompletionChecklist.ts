import type { RoomCompletionDesign } from "./roomTemplateDeployment";
import type { RoomTemplate, TemplateBomRow } from "./roomTemplates";

/**
 * Whole-room checklist layer model (docs/AV_COMPLETE_ROOM_DESIGN_REFERENCE.md
 * §2): a defensible AV design is a room, not a signal chain. Each layer's
 * status is derived from what the authored design states — "covered" when the
 * transport core or completion block addresses it, "by-others" when the
 * checklist emits a BY-OTHERS allowance row for it, "not-applicable" when the
 * authored design explicitly rules the layer out, and "unspecified" when the
 * template is silent (the guidance surface for inexperienced users).
 */
export type ChecklistLayerStatus = "covered" | "by-others" | "not-applicable" | "unspecified";
export const checklistLayerStatusLabels: Record<ChecklistLayerStatus, string> = {
  covered: "Covered",
  "by-others": "By others",
  "not-applicable": "Not applicable",
  unspecified: "Not addressed",
};
export type ChecklistLayerId = "transport" | "humanFactors" | "controlExperience" | "environment" | "assurance" | "compliance";
export type ChecklistLayer = {
  id: ChecklistLayerId;
  name: string;
  summary: string;
  status: ChecklistLayerStatus;
  detail: string;
};
export type TemplateCompletionChecklist = {
  layers: ChecklistLayer[];
  counts: { covered: number; byOthers: number; notApplicable: number; unspecified: number };
  hasCompletion: boolean;
};

const otherKeys = (rows: TemplateBomRow[]) => new Set(rows.filter((r) => r.sku.startsWith("BY-OTHERS-")).map((r) => r.sku.slice("BY-OTHERS-".length)));

export function templateCompletionChecklist(template: RoomTemplate): TemplateCompletionChecklist {
  const completion: RoomCompletionDesign | undefined = template.concept?.completion;
  const byOthers = otherKeys(template.bom);
  const layers: ChecklistLayer[] = [];

  layers.push({
    id: "transport",
    name: "Signal transport",
    summary: "Sources, switching, extension and displays — the template's core.",
    status: "covered",
    detail: template.concept
      ? `${template.concept.sourceCount} scheduled source position(s) and ${template.concept.outputCount} output(s) routed through the ${template.concept.architectureFamily} architecture. Extension sets, cabling, power and rack allowances follow in the equipment schedule.`
      : "The signal chain is described by the equipment schedule and architecture notes.",
  });

  const hf = completion?.humanFactors;
  layers.push({
    id: "humanFactors",
    name: "Experience & human factors",
    summary: "Image sizing, brightness versus ambient light, camera framing.",
    status: hf ? "covered" : "unspecified",
    detail: hf
      ? [
          hf.farthestViewerMetres !== undefined ? `Farthest viewer ${hf.farthestViewerMetres} m; size the image with AVIXA DISCAS (V202.01) for ${hf.contentClass === "adm" ? "analytical decision-making" : "basic decision-making"} content.` : null,
          hf.ambientLight && hf.ambientLight !== "controlled" ? `Ambient condition "${hf.ambientLight}" drives panel brightness — verify the measured level on survey.` : null,
          hf.cameraFov ?? null,
          hf.speechPrivacy === true ? "Speech privacy is stated as required; masking scope follows as a by-others allowance." : null,
        ].filter((line): line is string => line !== null).join(" ")
      : "No viewing distance, ambient-light or camera-framing basis is stated. A correct matrix in an unwatchable room still fails acceptance — record the farthest viewer, content class and ambient condition.",
  });

  const control = completion?.controlExperience;
  const controlRow = byOthers.has("SCHEDULING-PANEL") || byOthers.has("MONITORING-NOC");
  layers.push({
    id: "controlExperience",
    name: "Control & user experience",
    summary: "Who operates the room, scheduling, monitoring.",
    status: control ? "covered" : controlRow ? "by-others" : "unspecified",
    detail: control
      ? [
          control.scheduling === true ? "Room scheduling is scheduled scope (by-others allowance)." : control.scheduling === false ? "Scheduling is stated as not applicable for this room." : null,
          control.monitoring === "24-7-noc" ? "24/7 monitoring with a contracted response is part of the design." : control.monitoring === "basic" ? "A documented basic monitoring routine is part of the design." : null,
        ].filter((line): line is string => line !== null).join(" ") || "The operator profile is stated; scheduling and monitoring are not addressed."
      : controlRow
        ? "Scheduling/monitoring allowances exist in the equipment schedule, but the operator profile is not stated."
        : "No operator profile, scheduling or monitoring basis is stated. The first-time room builder's most common omission is assuming the equipment is the experience.",
  });

  const env = completion?.environment;
  layers.push({
    id: "environment",
    name: "Environment",
    summary: "Reverberation, acoustic treatment, lighting, rack heat.",
    status: env ? "covered" : "unspecified",
    detail: env
      ? [
          env.rt60Target ? `Reverberation target ${env.rt60Target} — verify with the space furnished; DSP cannot shorten room RT60.` : null,
          env.acousticTreatment && env.acousticTreatment !== "none" ? `Acoustic treatment (${env.acousticTreatment}) is part of the design basis.` : null,
          env.illuminationControls === true ? "Lighting/blind integration is scheduled as a by-others allowance." : null,
          env.rackThermal && env.rackThermal !== "passive" ? `Rack thermal design (${env.rackThermal}) is part of the design basis.` : null,
        ].filter((line): line is string => line !== null).join(" ") || "Environment values are recorded; no specific targets are set."
      : "No reverberation, treatment, illumination or rack-thermal basis is stated. Rooms fail on echo, glare and overheated racks more often than on bandwidth.",
  });

  const assurance = completion?.assurance;
  const assuranceRow = byOthers.has("SPARES") || byOthers.has("MONITORING-NOC");
  layers.push({
    id: "assurance",
    name: "Services & assurance",
    summary: "Acceptance testing, training, warranty, monitoring, spares.",
    status: assurance ? "covered" : assuranceRow ? "by-others" : "unspecified",
    detail: assurance
      ? [
          assurance.acceptanceTest === true ? "Formal acceptance testing is part of delivery." : assurance.acceptanceTest === false ? "Acceptance is by demonstration only." : null,
          assurance.trainingAudience ? `Operator training covers ${assurance.trainingAudience}.` : null,
          assurance.warrantyTier ? `Support tier: ${assurance.warrantyTier}.` : null,
          assurance.monitoringContract === true ? "A monitoring/response contract is scheduled scope." : null,
          assurance.sparesHeld ? `Spares held: ${assurance.sparesHeld}.` : null,
        ].filter((line): line is string => line !== null).join(" ") || "Assurance values are recorded; no specific commitments are set."
      : assuranceRow
        ? "Monitoring/spares allowances exist in the equipment schedule, but the support commitments are not stated."
        : "No acceptance, training, warranty or spares basis is stated. Decide the support tier before quotation — it changes price and is discovered at first fault otherwise.",
  });

  const compliance = completion?.compliance;
  const complianceRow = byOthers.has("ASSISTIVE-LISTENING") || byOthers.has("VA-PAGING-INTERFACE");
  const complianceWaived = compliance?.assistiveListening === "not-required" && !compliance.lifeSafetyAudioPriority && !compliance.recordingConsentPolicy && !compliance.cameraPrivacy && !compliance.informationClassification;
  layers.push({
    id: "compliance",
    name: "Compliance & governance",
    summary: "Assistive listening, life-safety audio priority, privacy, consent.",
    status: compliance ? (complianceWaived ? "not-applicable" : "covered") : complianceRow ? "by-others" : "unspecified",
    detail: compliance
      ? [
          compliance.assistiveListening === "required" ? "Assistive listening is a required system (by-others allowance follows)." : compliance.assistiveListening === "recommended" ? "Assistive listening is recommended — confirm with the venue and price as an option." : compliance.assistiveListening === "not-required" ? "Assistive listening is recorded as not required for this venue." : null,
          compliance.lifeSafetyAudioPriority === true ? "Programme audio must yield to life-safety/voice-alarm announcements (engineered interface follows)." : null,
          compliance.recordingConsentPolicy ?? null,
          compliance.cameraPrivacy ?? null,
          compliance.informationClassification ?? null,
        ].filter((line): line is string => line !== null).join(" ") || "Compliance values are recorded; no specific obligations are set."
      : complianceRow
        ? "Compliance allowances exist in the equipment schedule, but the governing obligations are not stated."
        : "No assistive-listening, life-safety, privacy or consent position is stated. Assistive listening is a legal accessibility requirement in many jurisdictions and life-safety audio priority is never an amplifier setting.",
  });

  const counts = { covered: 0, byOthers: 0, notApplicable: 0, unspecified: 0 };
  for (const layer of layers) {
    if (layer.status === "covered") counts.covered += 1;
    else if (layer.status === "by-others") counts.byOthers += 1;
    else if (layer.status === "not-applicable") counts.notApplicable += 1;
    else counts.unspecified += 1;
  }
  return { layers, counts, hasCompletion: completion !== undefined };
}
