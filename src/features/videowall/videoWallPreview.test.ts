import { describe, expect, it } from "vitest";

import type { VideoWallSeed } from "@/features/systemDesign/designTypes";

import { deriveVideoWallPreview } from "./videoWallPreview";

function makeSeed(overrides: Partial<VideoWallSeed> = {}): VideoWallSeed {
  return {
    displayType: "LCD",
    rows: 2,
    columns: 2,
    sourceCount: 1,
    processorPreference: "Auto",
    processorInputMode: "single-source",
    qualityProfile: "balanced",
    lcdDriveMode: "decoder-per-screen",
    outputRows: 2,
    outputColumns: 2,
    cabinetRows: 6,
    cabinetColumns: 10,
    cabinetWidthPx: 192,
    cabinetHeightPx: 192,
    cabinetWidthMm: 500,
    cabinetHeightMm: 500,
    contentAspectRatio: "16:9",
    ...overrides,
  };
}

describe("video wall preview", () => {
  it("derives LCD wall metrics and content fit", () => {
    const preview = deriveVideoWallPreview(makeSeed({ rows: 2, columns: 2 }));

    expect(preview.displayCount).toBe(4);
    expect(preview.outputCount).toBe(4);
    expect(preview.wallAspectRatio).toBeCloseTo(16 / 9, 2);
    expect(preview.contentFit).toBe("fill");
    expect(preview.cells[0]?.outputIndex).toBe(1);
    expect(preview.cells[3]?.outputIndex).toBe(4);
  });

  it("maps grouped LCD outputs across a larger wall", () => {
    const preview = deriveVideoWallPreview(
      makeSeed({
        rows: 2,
        columns: 4,
        outputRows: 2,
        outputColumns: 2,
      }),
    );

    expect(preview.displayCount).toBe(8);
    expect(preview.outputCount).toBe(4);
    expect(preview.cells[0]?.outputIndex).toBe(1);
    expect(preview.cells[1]?.outputIndex).toBe(1);
    expect(preview.cells[2]?.outputIndex).toBe(2);
    expect(preview.cells[6]?.outputIndex).toBe(4);
    expect(preview.contentFit).toBe("pillarbox");
  });

  it("derives LED canvas and processor mode", () => {
    const preview = deriveVideoWallPreview(
      makeSeed({
        displayType: "LED",
        rows: 1,
        columns: 1,
        cabinetRows: 6,
        cabinetColumns: 10,
        cabinetWidthMm: 500,
        cabinetHeightMm: 500,
        cabinetWidthPx: 192,
        cabinetHeightPx: 192,
        processorInputMode: "multiview",
      }),
    );

    expect(preview.displayCount).toBe(60);
    expect(preview.outputCount).toBe(1);
    expect(preview.wallWidthMm).toBe(5000);
    expect(preview.wallHeightMm).toBe(3000);
    expect(preview.canvasWidthPx).toBe(1920);
    expect(preview.canvasHeightPx).toBe(1152);
    expect(preview.processorMode).toBe("LED multiview feed");
    expect(preview.cells[0]?.label).toBe("C1");
  });
});
