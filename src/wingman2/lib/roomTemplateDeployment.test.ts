import { describe, expect, it } from "vitest";
import { roomTemplates } from "./roomTemplates";
import { createDeploymentTemplate, type ScheduleItem } from "./roomTemplateDeployment";
import { compileTemplateApplicationProposal } from "./proposalCompiler";
import { templateBomToSchematicBrief } from "./schematic/templateBomToSchematicBrief";
import { getCustomRoomTemplates, saveRoomTemplateCopy } from "./customRoomTemplates";

describe("complete deployment concepts", () => {
  // The whole-room completion layers (docs/AV_COMPLETE_ROOM_DESIGN_REFERENCE.md):
  // an authored completion block must emit labelled design notes plus the
  // corresponding BY-OTHERS allowance rows, and absence must change nothing.
  it("emits whole-room guidance rows and notes only for populated completion blocks", () => {
    const base = {
      id: "completion-test", name: "Completion Test", vertical: "Corporate",
      space: "A 9m × 6m test room with two displays and a controlled ceiling.",
      construction: "Assume reinforced display walls, an accessible suspended ceiling and controlled daylight.",
      occupancy: "12–16 people",
      activity: "Presenters share content and join calls using the room system.",
      transport: "matrix4" as const,
      sources: [["Room PC HDMI output", 1, "credenza"]] as ScheduleItem[],
      outputs: [["75-inch front display", 2, "front wall"]] as ScheduleItem[],
      speakers: 0,
      microphones: 0,
      audio: {
        approach: "silent" as const,
        experience: "No audio system is included.",
        zones: [],
        microphones: "No room reinforcement microphones are included.",
        processing: "No audio processing is included.",
        connectivity: "No audio connectivity is included.",
        dante: false,
        aec: false,
        programmeFeeds: 0,
        routing: "No audio routing is included.",
      },
      rationale: "One source and two mirrored outputs need a fixed matrix and nothing more.",
      alternative: "A switcher and splitter could replace the matrix for a single shared picture.",
      constraints: ["Confirm display cable lengths by survey."],
    };

    const plain = createDeploymentTemplate(base);
    expect(plain.designNotes.some((note) => note.label === "Image size and reading distance")).toBe(false);
    expect(plain.bom.some((r) => r.sku === "BY-OTHERS-ASSISTIVE-LISTENING")).toBe(false);

    const complete = createDeploymentTemplate({
      ...base,
      completion: {
        humanFactors: { farthestViewerMetres: 9, contentClass: "adm", speechPrivacy: true },
        controlExperience: { operator: "facilitator", scheduling: true, monitoring: "24-7-noc" },
        environment: { rt60Target: "≤0.6 s", illuminationControls: true, rackThermal: "forced" },
        assurance: { warrantyTier: "on-site-nbd", sparesHeld: "one spare endpoint and PSU per 10", trainingAudience: "the facilitator team" },
        compliance: { assistiveListening: "required", lifeSafetyAudioPriority: true, informationClassification: "Internal — approved feeds only" },
      },
    });

    const noteLabels = complete.designNotes.map((note) => note.label);
    for (const label of [
      "Image size and reading distance",
      "Speech privacy",
      "Who operates this room",
      "Room scheduling",
      "Monitoring and response",
      "Reverberation target",
      "Rack thermal design",
      "Warranty and support tier",
      "Training",
      "Assistive listening",
      "Life-safety audio priority",
      "Information classification",
    ]) {
      expect(noteLabels, label).toContain(label);
    }
    const completionSkus = [
      "BY-OTHERS-SOUND-MASKING",
      "BY-OTHERS-SCHEDULING-PANEL",
      "BY-OTHERS-MONITORING-NOC",
      "BY-OTHERS-LIGHTING-INTERFACE",
      "BY-OTHERS-SPARES",
      "BY-OTHERS-ASSISTIVE-LISTENING",
      "BY-OTHERS-VA-PAGING-INTERFACE",
    ];
    for (const sku of completionSkus) {
      const scope = complete.bom.find((r) => r.sku === sku);
      expect(scope, sku).toMatchObject({ type: "Required", owner: "integrator" });
      expect(scope!.qty).toBeGreaterThan(0);
    }
    // Completion rows must not collide with the base manifest ids.
    expect(new Set(complete.bom.map((r) => r.id)).size).toBe(complete.bom.length);
    // The DISCAS note carries the measured distance and content class.
    const discas = complete.designNotes.find((note) => note.label === "Image size and reading distance")!;
    expect(discas.description).toContain("9 m");
    expect(discas.description).toContain("analytical decision-making");
  });

  it("gives all 59 designs a physical environment, explicit I/O and a complete editable system scope", () => {
    expect(roomTemplates).toHaveLength(59);
    expect(new Set(roomTemplates.map((t) => t.id)).size).toBe(59);
    for (const template of roomTemplates) {
      const c = template.concept!;
      expect(c.statement, template.id).toContain("Assumed setting:");
      expect(c.environment.length).toBeGreaterThan(50);
      expect(c.construction.length).toBeGreaterThan(50);
      expect(c.rationale.length).toBeGreaterThan(60);
      expect(c.sourceCount).toBe(c.sources.reduce((n, row) => n + row[1], 0));
      expect(c.outputCount).toBe(c.outputs.reduce((n, row) => n + row[1], 0));
      expect(new Set(template.bom.map((row) => row.id)).size).toBe(template.bom.length);
      for (const sku of ["MOUNTS", "ROOM-CONTROL", "POWER-RACK", "SIGNAL-CABLING", "LABOUR", "COMMISSIONING", "DESIGN"]) {
        const scope = template.bom.find((r) => r.sku === `BY-OTHERS-${sku}`);
        expect(scope, `${template.id}: ${sku}`).toMatchObject({ type: "Required", status: "included", owner: "integrator" });
      }
      expect(template.bom.every((row) => Number.isInteger(row.qty) && row.qty > 0)).toBe(true);
    }
  });
  it("sizes bounded matrices and retains NHD only with an authored distribution case", () => {
    for (const template of roomTemplates) {
      const c = template.concept!;
      const limit = c.transport === "matrix4" ? 4 : c.transport === "matrix8" ? 8 : c.transport === "hybrid" ? 6 : 0;
      if (limit) {
        expect(c.outputCount, template.id).toBeLessThanOrEqual(limit);
        expect(c.sourceCount, template.id).toBeLessThanOrEqual(c.transport === "hybrid" ? 8 : limit);
        expect(template.bom.some((r) => r.sku.startsWith("NHD-")), template.id).toBe(false);
      }
      if (c.transport.startsWith("nhd")) {
        const sources = template.bom.filter((r) => r.role === "Source encoder").reduce((n, r) => n + r.qty, 0);
        const outputs = template.bom.filter((r) => r.role === "Display decoder").reduce((n, r) => n + r.qty, 0);
        expect(sources).toBe(c.sourceCount); expect(outputs).toBe(c.outputCount);
        const switches = template.bom.find((r) => r.sku === "BY-OTHERS-AV-SWITCH")!;
        expect(switches.qty * 24).toBeGreaterThanOrEqual(Math.ceil((sources + outputs + 3) * 1.2));
        expect(template.bom.some((r) => r.sku === "BY-OTHERS-ROOM-CONTROL")).toBe(true);
      }
    }
    const boardroom = roomTemplates.find((t) => t.id === "corporate-boardroom-networkhd500")!;
    expect(boardroom.concept).toMatchObject({ transport: "matrix4", sourceCount: 4, outputCount: 3 });
    expect(boardroom.bom.find((r) => r.role === "Display extension set")?.qty).toBe(3);
  });
  it("does not invent extra schematic screens from spare matrix ports", () => {
    const template = roomTemplates.find((t) => t.id === "corporate-boardroom-networkhd500")!;
    const brief = templateBomToSchematicBrief(template, template.bom);
    expect(brief.displays?.reduce((n, row) => n + (row.quantity ?? 1), 0)).toBe(3);
    expect(brief.sources?.reduce((n, row) => n + (row.quantity ?? 1), 0)).toBe(4);
  });
  it("carries the concept and selected third-party supplier into the sales proposal", () => {
    const template = roomTemplates[0];
    const rows = template.bom.map((row) => row.sku === "BY-OTHERS-DISPLAY-1" ? { ...row, manufacturer: "Example Displays", model: "Panel 65", owner: "customer" } : row);
    const proposal = compileTemplateApplicationProposal(template, rows);
    expect(proposal.executiveSummary).toContain(template.concept!.statement);
    expect(proposal.solutionOverview).toContain(template.concept!.rationale);
    expect(proposal.verifiedDesignParameters).toEqual([]);
    expect(proposal.thirdPartyScope?.some((r) => r.description.includes("Example Displays · Panel 65") && r.responsibility === "customer")).toBe(true);
  });
  it("provides loaded audio circuits and a two-way AEC path wherever calls are included", () => {
    for (const template of roomTemplates) {
      const audio = template.concept!.audio!;
      expect(audio.experience.length, template.id).toBeGreaterThan(60);
      if (template.concept!.capabilities.includes("uc")) expect(audio.aec, template.id).toBe(true);
      for (const zone of audio.zones) {
        if (zone.topology === "100V") expect(zone.speakers * zone.tapWatts!, template.id).toBeLessThanOrEqual(zone.amplifierWatts * 0.8);
        if (zone.amplifierSku === "AMP-2120-DNT") expect(zone).toMatchObject({ topology: "100V", amplifierWatts: 240 });
      }
      expect(template.bom.some((r) => r.sku === "BY-OTHERS-AUDIO-DANTE-NETWORK")).toBe(audio.dante);
      if (audio.approach === "integrated" || audio.approach === "silent") expect(template.bom.some((r) => r.sku.startsWith("BY-OTHERS-AUDIO-AMPLIFIER"))).toBe(false);
      const proposal = compileTemplateApplicationProposal(template, template.bom);
      expect(proposal.solutionOverview).toContain(audio.experience);
      expect(proposal.technicalFacts.join(" ")).toContain(audio.connectivity);
      for (const specialist of audio.specialistSystems ?? []) {
        expect(template.bom.some((row) => row.description === specialist.name && row.qty === specialist.qty && row.sku.startsWith("BY-OTHERS") && row.type === "Required"), template.id).toBe(true);
        expect(proposal.technicalFacts.join(" ")).toContain(specialist.reason);
      }
      if (audio.acousticTreatment) {
        expect(template.bom.find((row) => row.sku === "BY-OTHERS-AUDIO-ACOUSTIC-TREATMENT")).toMatchObject({ qty: 1, type: "Required", owner: "integrator" });
        expect(proposal.technicalFacts.join(" ")).toContain(audio.acousticTreatment.reason);
      }
    }
  });
  it("retains authored concepts and completed supplier details when a custom copy is reloaded", () => {
    window.localStorage.clear();
    const template = roomTemplates[0];
    const rows = template.bom.map((row) => row.sku === "BY-OTHERS-DISPLAY-1" ? { ...row, manufacturer: "Example Displays", model: "Panel 65", owner: "customer" } : row);
    const saved = saveRoomTemplateCopy(template, rows);
    const reloaded = getCustomRoomTemplates().find((t) => t.id === saved.id)!;
    expect(reloaded.concept).toEqual(template.concept);
    expect(reloaded.bom.find((r) => r.sku === "BY-OTHERS-DISPLAY-1")).toMatchObject({ manufacturer: "Example Displays", model: "Panel 65", owner: "customer" });
    window.localStorage.clear();
  });
});
