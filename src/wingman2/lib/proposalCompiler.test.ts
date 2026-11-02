import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { roomTemplates } from "./roomTemplates";
import { compileTemplateApplicationProposal } from "./proposalCompiler";
import { templateImageFor } from "./templateImages";

describe("template proposal compiler", () => {
  it("turns a room template into a market-led, complete-system proposal model", () => {
    const template = roomTemplates.find((item) => item.id === "government-control-room-networkhd600")
      ?? roomTemplates.find((item) => item.vertical.toLowerCase().includes("government"));
    expect(template).toBeDefined();

    const proposal = compileTemplateApplicationProposal(template!, template!.bom);

    expect(proposal.marketStory).toMatch(/operational|resilien|decision/i);
    expect(proposal.roomVisualUrl).toBe(templateImageFor(template!));
    expect(proposal.userJourney.length).toBeGreaterThanOrEqual(4);
    expect(proposal.acceptanceCriteria.length).toBeGreaterThanOrEqual(3);
    expect(proposal.productSpecifications?.some((item) => item.sku.includes("NHD"))).toBe(true);
    const scope = proposal.thirdPartyScope?.map((item) => `${item.category} ${item.description}`).join(" | ") ?? "";
    expect(scope).toMatch(/CCTS|cabl/i);
    expect(scope).toMatch(/first fix engineering/i);
    expect(scope).toMatch(/second fix engineering/i);
    expect(scope).toMatch(/project management/i);
    expect(scope).toMatch(/commissioning/i);
    expect(scope).toMatch(/CAD\/Visio|drawing|as-built/i);
  });
  it("shows the picture the template card shows", () => {
    // One question, one answer. The cover used to pick its own picture by matching
    // words in the template's paragraph, which put a gym on an operations desk
    // ("controlled") and put three sports rooms on a bar. Which photograph a room
    // gets is the reviewed assignment on the card, and the cover reads it.
    for (const template of roomTemplates) {
      expect(compileTemplateApplicationProposal(template, template.bom).roomVisualUrl, template.id).toBe(templateImageFor(template));
    }
  });

  it("names a cover image that exists in public/", () => {
    // A card assignment still arrives here as a file name, so a renamed or mistyped
    // photograph would reach a printed proposal as a broken image, not a failure.
    for (const template of roomTemplates) {
      const url = compileTemplateApplicationProposal(template, template.bom).roomVisualUrl;
      expect(url, template.id).toBeTruthy();
      expect(existsSync(resolve("public", url!.replace(/^\//, ""))), `${template.id} -> ${url}`).toBe(true);
    }
  });

  it("retains service exclusions without adding generic installation scope", () => {
    const template = roomTemplates[0];
    const rows = template.bom.map(row => row.scopeSection === "engineering" ? { ...row, status: "excluded" as const } : row);
    const proposal = compileTemplateApplicationProposal(template, rows);
    expect(proposal.thirdPartyScope?.some(item => /first fix|second fix|installation labour|maintenance agreement/i.test(item.description))).toBe(false);
  });
});
