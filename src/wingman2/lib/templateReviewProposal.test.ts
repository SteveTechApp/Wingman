import JSZip from "jszip";
import { Packer } from "docx";
import { describe, expect, it } from "vitest";
import type { StoredProject, StoredVideowallSummary } from "../data/projectStore";
import { buildProposalDocx } from "./proposalDocxExport";
import { createProposalWizardDefaults } from "./proposalWizard";
import { roomTemplates } from "./roomTemplates";
import { buildTemplateProposal, savedTemplateWall, templateBomRows } from "./templateReviewProposal";
import { templatePricingDraft, type TemplateProposalPricing } from "./templateProposalPricing";
import { defaultWallRequirements, wallCanvasPlan, wallResolutionSummary } from "./videowallOptions";

const wall = (savedAt: string, templateId?: string): StoredVideowallSummary => ({
  savedAt,
  wallType: "lcd",
  summary: { version: 2, requirements: { application: "lcd-loop" } },
  ...(templateId ? { templateId } : {}),
});

function project(id: string, templateId: string, updatedAt: string, videowall?: StoredVideowallSummary): StoredProject {
  return {
    id,
    name: id,
    owner: "Wingman user",
    stage: "Templates",
    status: "recommended",
    updated: "Just now",
    resumeTo: "/wingman/templates",
    createdAt: updatedAt,
    updatedAt,
    discoveryBrief: { savedAt: updatedAt, roomModel: { sourceTemplateId: templateId } },
    ...(videowall ? { videowall } : {}),
  } as StoredProject;
}

describe("savedTemplateWall", () => {
  it("returns the wall saved against this template", () => {
    const projects = [project("a", "tpl-huddle", "2026-10-01T00:00:00.000Z", wall("2026-10-01T00:00:00.000Z", "tpl-huddle"))];

    expect(savedTemplateWall(projects, "tpl-huddle")?.savedAt).toBe("2026-10-01T00:00:00.000Z");
  });

  it("takes the newest wall when the template has been saved more than once", () => {
    const projects = [
      project("old", "tpl-huddle", "2026-10-01T00:00:00.000Z", wall("2026-10-01T00:00:00.000Z", "tpl-huddle")),
      project("new", "tpl-huddle", "2026-10-09T00:00:00.000Z", wall("2026-10-09T00:00:00.000Z", "tpl-huddle")),
    ];

    expect(savedTemplateWall(projects, "tpl-huddle")?.savedAt).toBe("2026-10-09T00:00:00.000Z");
  });

  it("never falls back to a project's room model", () => {
    // The codec fills the link on load, so a wall without one is a wall that
    // belongs to no template — not evidence to match on here.
    const projects = [project("legacy", "tpl-huddle", "2026-10-09T00:00:00.000Z", wall("2026-10-09T00:00:00.000Z"))];

    expect(savedTemplateWall(projects, "tpl-huddle")).toBeNull();
  });

  it("reads the template a wall records, not the room model it sits in", () => {
    const projects = [
      // The wall records this template but its project's room model now names another.
      project("moved", "tpl-huddle", "2026-10-12T00:00:00.000Z", wall("2026-10-11T00:00:00.000Z", "tpl-boardroom")),
      // A legacy wall matching by room model and newer than the recorded one.
      project("newer-legacy", "tpl-boardroom", "2026-10-13T00:00:00.000Z", wall("2026-10-13T00:00:00.000Z")),
    ];

    expect(savedTemplateWall(projects, "tpl-boardroom")?.savedAt).toBe("2026-10-11T00:00:00.000Z");
  });

  it("orders recorded walls by the wall's own save time", () => {
    const projects = [
      // The project updated most recently holds the older wall.
      project("a", "", "2026-10-14T00:00:00.000Z", wall("2026-10-10T00:00:00.000Z", "tpl-boardroom")),
      project("b", "", "2026-10-01T00:00:00.000Z", wall("2026-10-15T00:00:00.000Z", "tpl-boardroom")),
    ];

    expect(savedTemplateWall(projects, "tpl-boardroom")?.savedAt).toBe("2026-10-15T00:00:00.000Z");
  });

  it("gives the template DOCX a transport column that the wall-less export cannot print", async () => {
    const template = roomTemplates[0];
    const proposal = buildTemplateProposal(template, template.bom);
    const bomRows = templateBomRows(template, template.bom);
    const wizard = createProposalWizardDefaults({
      projectId: `template-${template.id}`,
      projectName: template.name,
      preparedBy: "",
      executiveSummary: template.customerNarrative,
      architectureNarrative: template.architecture,
    });
    const requirements = { ...defaultWallRequirements, application: "lcd-loop" as const, columns: 2, rows: 2, windows: 1, sources: 1 };
    const plan = wallCanvasPlan(requirements);
    const resolution = wallResolutionSummary(requirements);
    const withWall = await Packer.toBuffer(buildProposalDocx(proposal, bomRows, wizard, {}, {
      savedAt: "2026-10-20T00:00:00.000Z",
      wallType: "lcd",
      summary: {
        version: 2,
        requirements,
        resolution: { canvas: resolution.canvas, display: resolution.display, source: resolution.source, mapping: resolution.label },
        canvasPlan: { canvas: plan.canvas, native: plan.native, perPanel: plan.perPanel, recommended: plan.recommended, rationale: plan.rationale, text: plan.text },
      },
    }));
    const withWallXml = await (await JSZip.loadAsync(withWall)).file("word/document.xml")!.async("string");
    const withWallText = withWallXml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

    expect(withWallText).toContain("Transport");
    expect(withWallText).toContain("passive limit");

    // Without the wall the schedule stops at the catalogue rows, which is why
    // the template review has to pass the saved wall in.
    const withoutWall = await Packer.toBuffer(buildProposalDocx(proposal, bomRows, wizard));
    const withoutWallXml = await (await JSZip.loadAsync(withoutWall)).file("word/document.xml")!.async("string");
    const withoutWallText = withoutWallXml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    expect(withoutWallText).not.toContain("passive limit");
  });

  it("scores an over-limit saved wall inside the proposal it builds", () => {
    const template = roomTemplates[0];
    const clean = buildTemplateProposal(template, template.bom);
    const walled = buildTemplateProposal(template, template.bom, {
      ...defaultWallRequirements,
      application: "lcd-direct",
      layout: "independent",
      columns: 2,
      rows: 1,
      sources: 2,
      windows: 2,
      measuredRuns: { "display-2": 40 },
    });

    // The template page refuses the export, so the document's own readiness
    // score has to carry the same deduction rather than reading as ready.
    expect(walled.readinessScore ?? 0).toBeLessThan(clean.readinessScore ?? 0);
  });

  it("ignores walls from other templates and projects without a wall", () => {
    const projects = [
      project("other", "tpl-boardroom", "2026-10-10T00:00:00.000Z", wall("2026-10-10T00:00:00.000Z")),
      project("empty", "tpl-huddle", "2026-10-11T00:00:00.000Z"),
    ];

    expect(savedTemplateWall(projects, "tpl-huddle")).toBeNull();
    expect(savedTemplateWall(projects, "")).toBeNull();
  });

  it("prints the prices entered on the template instead of TBC", async () => {
    const template = roomTemplates[0];
    const proposal = buildTemplateProposal(template, template.bom);
    const bomRows = templateBomRows(template, template.bom);
    const defaults = createProposalWizardDefaults({
      projectId: `template-${template.id}`,
      projectName: template.name,
      preparedBy: "",
      executiveSummary: template.customerNarrative,
      architectureNarrative: template.architecture,
    });

    const documentText = async (wizard: typeof defaults) => {
      const buffer = await Packer.toBuffer(buildProposalDocx(proposal, bomRows, wizard));
      const xml = await (await JSZip.loadAsync(buffer)).file("word/document.xml")!.async("string");
      return xml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    };

    // The template path exports without the wizard, so an unpriced template is
    // what printed a page of TBC before the review page could price it.
    expect(await documentText(defaults)).toContain(
      "COMMERCIAL HOLD: one or more equipment prices are missing",
    );

    const pricing: TemplateProposalPricing = {
      currency: "GBP",
      bomUnitPrices: Object.fromEntries(bomRows.map((row) => [row.sku, "100"])),
      installationUnitPrices: {},
    };
    const priced = await documentText(templatePricingDraft(defaults, pricing));

    expect(priced).toContain("The equipment total is £");
    expect(priced).not.toContain("COMMERCIAL HOLD: one or more equipment prices are missing");
  });
});
