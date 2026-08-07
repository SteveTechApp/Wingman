import { describe, expect, it } from "vitest";
import { roomTemplates } from "./roomTemplates";
import { compileTemplateApplicationProposal } from "./proposalCompiler";

describe("template proposal compiler", () => {
  it("turns a room template into a market-led, complete-system proposal model", () => {
    const template = roomTemplates.find((item) => item.id === "government-control-room-networkhd600")
      ?? roomTemplates.find((item) => item.vertical.toLowerCase().includes("government"));
    expect(template).toBeDefined();

    const proposal = compileTemplateApplicationProposal(template!, template!.bom);

    expect(proposal.marketStory).toMatch(/operational|resilien|decision/i);
    expect(proposal.roomVisualUrl).toMatch(/control-room|situation-room/);
    expect(proposal.userJourney.length).toBeGreaterThanOrEqual(4);
    expect(proposal.acceptanceCriteria.length).toBeGreaterThanOrEqual(3);
    expect(proposal.productSpecifications?.some((item) => item.sku.includes("NHD"))).toBe(true);
    expect(proposal.thirdPartyScope?.map((item) => item.category)).toEqual(expect.arrayContaining([
      "Cabling and connectors", "Installation labour", "Project management", "Commissioning", "Drawings and documentation",
    ]));
  });
});
