import { beforeEach, describe, expect, it } from "vitest";
import {
  productSelectionsFromVideowallSummary,
  readProjectStore,
  resetProjectStore,
  saveVideowallToProject,
} from "./projectStore";

describe("video wall product handoff", () => {
  beforeEach(() => resetProjectStore());

  it("converts recommended SKUs into structured product selections", () => {
    const selections = productSelectionsFromVideowallSummary({
      recommendation: {
        title: "NetworkHD 150 multiview direction",
        rationale: "A composed output is required.",
        products: ["NHD-124-TX", "NHD-150-RX", "Suitable network switching"],
      },
    }, "2026-08-14T06:00:00.000Z");

    expect(selections.map((selection) => selection.sku)).toEqual(["NHD-124-TX", "NHD-150-RX"]);
    expect(selections[0]).toMatchObject({
      status: "recommended",
      source: "Video Wall Builder",
      category: "Video Wall",
    });
  });

  it("persists suggested products for the downstream proposal workflow", () => {
    const saved = saveVideowallToProject({
      wallType: "lcd",
      summary: {
        recommendation: {
          title: "LCD video wall processor",
          products: ["SW-0204-VW", "SW-0206-VW"],
        },
      },
    });

    const project = readProjectStore().projects.find((item) => item.id === saved.id);
    expect(project?.productSelections?.map((selection) => selection.sku)).toEqual([
      "SW-0204-VW",
      "SW-0206-VW",
    ]);
  });
});
