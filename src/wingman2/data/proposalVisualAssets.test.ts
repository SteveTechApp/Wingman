import { beforeEach, describe, expect, it } from "vitest";
import { readProjectStore, resetProjectStore, saveProposalVisualAsset } from "./projectStore";

describe("proposal visual assets", () => {
  beforeEach(() => resetProjectStore());

  it("saves a versioned project asset and links its rendered visual into an existing proposal", () => {
    const project = readProjectStore().projects[0];
    expect(project).toBeTruthy();
    const saved = saveProposalVisualAsset(project.id, {
      kind: "technical-schematic",
      title: "Room schematic",
      purpose: "proposal",
      status: "review-required",
      source: { productSkus: ["TEST-1"] },
      render: { svg: "data:image/svg+xml,test", width: 1600, height: 900 },
      caption: "Signal path",
      assumptions: [],
      warnings: ["Review port evidence"],
    });

    expect(saved?.revision).toBe(1);
    const updated = readProjectStore().projects.find((item) => item.id === project.id);
    expect(updated?.visualAssets?.[0].render.svg).toContain("data:image/svg+xml");
    if (updated?.proposal) {
      expect(updated.proposal.visualBlocks?.[0]).toMatchObject({ assetId: saved?.id, renderSrc: "data:image/svg+xml,test" });
    }
  });
});
