import type { VideoWallSeed } from "@/features/systemDesign/designTypes";

export type VideoWallContentFit = "fill" | "letterbox" | "pillarbox";

export type VideoWallPreviewCell = {
  id: string;
  index: number;
  row: number;
  column: number;
  label: string;
  kind: "panel" | "cabinet";
  outputIndex: number;
  outputLabel: string;
};

export type VideoWallPreviewModel = {
  displayType: "LCD" | "LED";
  physicalRows: number;
  physicalColumns: number;
  signalRows: number;
  signalColumns: number;
  displayCount: number;
  outputCount: number;
  sources: number;
  wallAspectRatio: number;
  contentAspectRatio: number;
  contentFit: VideoWallContentFit;
  contentWidthPercent: number;
  contentHeightPercent: number;
  processorMode: string;
  surfaceLabel: string;
  wallWidthMm?: number;
  wallHeightMm?: number;
  canvasWidthPx?: number;
  canvasHeightPx?: number;
  cells: VideoWallPreviewCell[];
};

function clampInt(value: unknown, fallback: number, minimum = 1): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(minimum, Math.floor(parsed));
}

function parseAspectRatio(value: unknown): number {
  const text = String(value ?? "").trim();
  const matched = text.match(/(\d+(?:\.\d+)?)\s*[:/x]\s*(\d+(?:\.\d+)?)/i);
  if (!matched) return 16 / 9;
  const width = Number(matched[1]);
  const height = Number(matched[2]);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return 16 / 9;
  }
  return width / height;
}

function parseMetricMeters(value: unknown): number | undefined {
  const text = String(value ?? "").trim();
  if (!text) return undefined;
  const matched = text.match(/(\d+(?:\.\d+)?)/);
  if (!matched) return undefined;
  const parsed = Number(matched[1]);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
}

function wallAspectRatio(seed: VideoWallSeed, physicalColumns: number, physicalRows: number): number {
  if (seed.displayType === "LED") {
    const cabinetWidthMm = clampInt(seed.cabinetWidthMm, 500);
    const cabinetHeightMm = clampInt(seed.cabinetHeightMm, 500);
    return (physicalColumns * cabinetWidthMm) / Math.max(1, physicalRows * cabinetHeightMm);
  }

  const targetWidthM = parseMetricMeters(seed.targetWidthM);
  const targetHeightM = parseMetricMeters(seed.targetHeightM);
  if (targetWidthM && targetHeightM) {
    return targetWidthM / targetHeightM;
  }

  return (physicalColumns * 16) / Math.max(1, physicalRows * 9);
}

function contentPlacement(wallRatio: number, contentRatio: number): {
  fit: VideoWallContentFit;
  widthPercent: number;
  heightPercent: number;
} {
  const delta = Math.abs(wallRatio - contentRatio);
  if (delta < 0.02) {
    return { fit: "fill", widthPercent: 100, heightPercent: 100 };
  }

  if (contentRatio > wallRatio) {
    return {
      fit: "letterbox",
      widthPercent: 100,
      heightPercent: Math.max(40, Math.min(100, (wallRatio / contentRatio) * 100)),
    };
  }

  return {
    fit: "pillarbox",
    widthPercent: Math.max(40, Math.min(100, (contentRatio / wallRatio) * 100)),
    heightPercent: 100,
  };
}

function processorMode(seed: VideoWallSeed): string {
  if (seed.displayType === "LED") {
    return seed.processorInputMode === "multiview" ? "LED multiview feed" : "LED processor feed";
  }

  if (seed.lcdDriveMode === "tile-loop-multiview") return "Tile-loop multiview";
  if (seed.lcdDriveMode === "dedicated-processor") return "Dedicated processor";
  return "Decoder per screen";
}

export function deriveVideoWallPreview(seed: VideoWallSeed): VideoWallPreviewModel {
  const physicalRows = seed.displayType === "LED"
    ? clampInt(seed.cabinetRows, clampInt(seed.rows, 1))
    : clampInt(seed.rows, 1);
  const physicalColumns = seed.displayType === "LED"
    ? clampInt(seed.cabinetColumns, clampInt(seed.columns, 1))
    : clampInt(seed.columns, 1);
  const signalRows = seed.displayType === "LED"
    ? 1
    : Math.min(physicalRows, clampInt(seed.outputRows, physicalRows));
  const signalColumns = seed.displayType === "LED"
    ? 1
    : Math.min(physicalColumns, clampInt(seed.outputColumns, physicalColumns));
  const displayCount = physicalRows * physicalColumns;
  const outputCount = signalRows * signalColumns;
  const sources = clampInt(seed.sourceCount, 1);
  const ratio = wallAspectRatio(seed, physicalColumns, physicalRows);
  const contentRatio = parseAspectRatio(seed.contentAspectRatio);
  const content = contentPlacement(ratio, contentRatio);
  const wallWidthMm = seed.displayType === "LED"
    ? physicalColumns * clampInt(seed.cabinetWidthMm, 500)
    : undefined;
  const wallHeightMm = seed.displayType === "LED"
    ? physicalRows * clampInt(seed.cabinetHeightMm, 500)
    : undefined;
  const canvasWidthPx = seed.displayType === "LED"
    ? physicalColumns * clampInt(seed.cabinetWidthPx, 192)
    : undefined;
  const canvasHeightPx = seed.displayType === "LED"
    ? physicalRows * clampInt(seed.cabinetHeightPx, 192)
    : undefined;

  const cells: VideoWallPreviewCell[] = Array.from({ length: displayCount }).map((_, index) => {
    const row = Math.floor(index / physicalColumns);
    const column = index % physicalColumns;
    const signalRow = Math.min(signalRows - 1, Math.floor((row * signalRows) / Math.max(1, physicalRows)));
    const signalColumn = Math.min(signalColumns - 1, Math.floor((column * signalColumns) / Math.max(1, physicalColumns)));
    const outputIndex = signalRow * signalColumns + signalColumn + 1;
    return {
      id: `${seed.displayType.toLowerCase()}-${index + 1}`,
      index: index + 1,
      row,
      column,
      label: seed.displayType === "LED" ? `C${index + 1}` : `P${index + 1}`,
      kind: seed.displayType === "LED" ? "cabinet" : "panel",
      outputIndex,
      outputLabel: `OUT ${outputIndex}`,
    };
  });

  return {
    displayType: seed.displayType,
    physicalRows,
    physicalColumns,
    signalRows,
    signalColumns,
    displayCount,
    outputCount,
    sources,
    wallAspectRatio: ratio,
    contentAspectRatio: contentRatio,
    contentFit: content.fit,
    contentWidthPercent: content.widthPercent,
    contentHeightPercent: content.heightPercent,
    processorMode: processorMode(seed),
    surfaceLabel: seed.displayType === "LED" ? "LED cabinet" : "LCD panel",
    wallWidthMm,
    wallHeightMm,
    canvasWidthPx,
    canvasHeightPx,
    cells,
  };
}
