import { describe, expect, it } from "vitest";

import { createDeploymentTemplate, type RoomDeploymentDesign } from "./roomTemplateDeployment";
import { templateCompletionChecklist } from "./templateCompletionChecklist";

const baseDesign: RoomDeploymentDesign = {
  id: "chk-base", name: "Checklist base design", vertical: "Corporate", space: "12-seat boardroom, 4.5 × 7 m.",
  construction: "Fit-out within a shell-and-core office floor.", occupancy: "12 seats.", activity: "Hybrid meetings with in-room presentation.",
  transport: "matrix4",
  sources: [["Laptop at the table", 4, "Table positions 1–4"]], outputs: [["98\" display", 2, "Front wall"]],
  speakers: 4, microphones: 4,   audio: {
    approach: "programme-and-speech", experience: "Speech intelligibility for meetings with programme playback.",
    zones: [{ name: "Room", purpose: "Meeting audio", speakers: 4, topology: "lowZ", amplifierWatts: 240 }],
    microphones: "4 table microphones", processing: "DSP with AEC for conferencing.",
    connectivity: "Analogue mic lines to the DSP; Dante spare.", dante: false, aec: true,
    programmeFeeds: 0, routing: "Programme and speech mixed in the DSP.",
  },
  rationale: "Deterministic 4×4 routing for four table positions to two displays.",
  alternative: "An AV-over-IP fabric if the source count grows beyond four.",
  constraints: ["Confirm display brightness against window position."],
};

describe("templateCompletionChecklist", () => {
  it("treats transport as covered and everything else as unspecified when no completion block is authored", () => {
    const template = createDeploymentTemplate(baseDesign);
    const checklist = templateCompletionChecklist(template);

    expect(checklist.hasCompletion).toBe(false);
    expect(checklist.layers.map((layer) => layer.id)).toEqual(["transport", "humanFactors", "controlExperience", "environment", "assurance", "compliance"]);
    expect(checklist.layers.find((layer) => layer.id === "transport")?.status).toBe("covered");
    expect(checklist.layers.filter((layer) => layer.status === "unspecified").map((layer) => layer.id)).toEqual(["humanFactors", "controlExperience", "environment", "assurance", "compliance"]);
    expect(checklist.counts).toEqual({ covered: 1, byOthers: 0, notApplicable: 0, unspecified: 5 });
    expect(checklist.layers.find((layer) => layer.id === "compliance")?.detail).toMatch(/legal accessibility requirement/);
  });

  it("marks populated completion layers as covered and surfaces the authored values", () => {
    const template = createDeploymentTemplate({
      ...baseDesign,
      id: "chk-complete",
      completion: {
        humanFactors: { farthestViewerMetres: 5.5, contentClass: "bdm", ambientLight: "daylight" },
        controlExperience: { operator: "facilitator", scheduling: false, monitoring: "basic" },
        environment: { rt60Target: "≤ 0.6 s", acousticTreatment: "moderate", rackThermal: "forced" },
        assurance: { acceptanceTest: true, trainingAudience: "the facilitation team", warrantyTier: "advance-replacement" },
        compliance: { assistiveListening: "not-required", lifeSafetyAudioPriority: false },
      },
    });
    const checklist = templateCompletionChecklist(template);

    expect(checklist.hasCompletion).toBe(true);
    expect(checklist.counts).toEqual({ covered: 5, byOthers: 0, notApplicable: 1, unspecified: 0 });
    const hf = checklist.layers.find((layer) => layer.id === "humanFactors")!;
    expect(hf.detail).toContain("5.5 m");
    expect(hf.detail).toContain("DISCAS");
    expect(checklist.layers.find((layer) => layer.id === "assurance")!.detail).toContain("advance-replacement");
    const compliance = checklist.layers.find((layer) => layer.id === "compliance")!;
    expect(compliance.status).toBe("not-applicable");
    expect(compliance.detail).toContain("not required for this venue");
  });

  it("derives by-others status from the equipment schedule when only allowance rows exist", () => {
    const template = createDeploymentTemplate({ ...baseDesign, id: "chk-rows", completion: { controlExperience: { operator: "volunteer", scheduling: true } } });
    const rows = template.bom.filter((row) => row.sku.startsWith("BY-OTHERS-"));
    expect(rows.map((row) => row.sku)).toContain("BY-OTHERS-SCHEDULING-PANEL");

    const checklist = templateCompletionChecklist(template);
    expect(checklist.layers.find((layer) => layer.id === "controlExperience")!.status).toBe("covered");
    expect(checklist.layers.find((layer) => layer.id === "controlExperience")!.detail).toContain("by-others allowance");

    // Same rows without the authored block: schedule-derived by-others status.
    const rowsOnly = { ...template, concept: { ...template.concept!, completion: undefined } };
    const rowsChecklist = templateCompletionChecklist(rowsOnly);
    expect(rowsChecklist.layers.find((layer) => layer.id === "controlExperience")!.status).toBe("by-others");
    expect(rowsChecklist.counts.byOthers).toBe(1);
    expect(rowsChecklist.layers.find((layer) => layer.id === "controlExperience")!.detail).toContain("operator profile is not stated");
  });

  it("keeps neighbouring by-others rows from implying coverage they do not carry", () => {
    const template = createDeploymentTemplate({ ...baseDesign, id: "chk-scope", resilience: true, accessibility: true });
    const rows = template.bom.filter((row) => row.sku.startsWith("BY-OTHERS-"));
    expect(rows.map((row) => row.sku)).toContain("BY-OTHERS-UPS-RECOVERY");
    expect(rows.map((row) => row.sku)).toContain("BY-OTHERS-ACCESSIBILITY");

    const checklist = templateCompletionChecklist(template);
    // Neither the resilience allowance nor general accessibility scope implies
    // assurance or compliance coverage: the checklist only follows rows its
    // layers actually name (SPARES/MONITORING-NOC, ASSISTIVE-LISTENING/VA).
    expect(checklist.layers.find((layer) => layer.id === "assurance")!.status).toBe("unspecified");
    expect(checklist.layers.find((layer) => layer.id === "compliance")!.status).toBe("unspecified");
  });
});
