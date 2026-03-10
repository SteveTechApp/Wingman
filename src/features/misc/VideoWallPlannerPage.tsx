import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  applyVideoWallToProject,
  createProject,
  ensureActiveProject,
  getActiveProject,
  setActiveProjectId,
  type ProjectVideoWall,
  type VideoWallTechnology,
} from "@/features/projects/projectStore";

type DraftState = {
  technology: VideoWallTechnology;
  sourceCount: string;
  qualityProfile: "cost" | "balanced" | "premium";
  processorInputMode: "single-source" | "multiview";
  contentAspect: "16:9" | "16:10" | "21:9" | "32:9" | "custom";
  contentAspectCustom: string;
  lcdRows: string;
  lcdCols: string;
  lcdPanelDiagonalIn: string;
  lcdBezelMm: string;
  lcdDriveStrategy: "decoder-per-screen" | "tile-loop-multiview" | "dedicated-processor";
  ledPixelPitchMm: string;
  ledCabinetRows: string;
  ledCabinetCols: string;
  ledCabinetWidthPx: string;
  ledCabinetHeightPx: string;
  ledCabinetWidthMm: string;
  ledCabinetHeightMm: string;
  ledTechnologyProfileId: string;
  ledProcessorProfileId: string;
  ledScreenClass: "modular" | "all-in-one-96-120";
  viewingDistanceM: string;
};

type RecommendationItem = {
  sku: string;
  quantity: number;
  role: string;
};

type DistortionRiskLevel = "Low" | "Medium" | "High";

type LcdDistortionAssessment = {
  score: number;
  level: DistortionRiskLevel;
  hardWarnings: string[];
};

type LedProcessorProfile = {
  id: string;
  label: string;
  maxPixels: number;
  maxWidthPx: number;
  maxHeightPx: number;
  maxInputs: number;
  maxWindows: number;
  notes: string;
};

type LedTechnologyProfile = {
  id: string;
  label: string;
  manufacturer: string;
  screenClass: DraftState["ledScreenClass"];
  defaultPixelPitchMm: number;
  defaultCabinetRows: number;
  defaultCabinetCols: number;
  cabinetWidthPx: number;
  cabinetHeightPx: number;
  cabinetWidthMm: number;
  cabinetHeightMm: number;
  defaultProcessorProfileId: string;
  notes: string;
};

type PlannerRecommendation = {
  title: string;
  summary: string;
  outputTopology: string;
  warnings: string[];
  items: RecommendationItem[];
};

const LED_TECHNOLOGY_PROFILES: LedTechnologyProfile[] = [
  {
    id: "hisense-xim-aio-120-class",
    label: "Hisense XIM all-in-one LED (96-120in class)",
    manufacturer: "Hisense",
    screenClass: "all-in-one-96-120",
    defaultPixelPitchMm: 1.56,
    defaultCabinetRows: 1,
    defaultCabinetCols: 1,
    cabinetWidthPx: 1920,
    cabinetHeightPx: 1080,
    cabinetWidthMm: 2650,
    cabinetHeightMm: 1490,
    defaultProcessorProfileId: "hisense-xim-integrated-controller",
    notes: "Planning profile for all-in-one LED where processing is typically integrated and receives a single HDMI feed.",
  },
  {
    id: "hisense-xihfe-cob-p1-25-class",
    label: "Hisense XIHFE COB fine pitch P1.25 class",
    manufacturer: "Hisense",
    screenClass: "modular",
    defaultPixelPitchMm: 1.25,
    defaultCabinetRows: 6,
    defaultCabinetCols: 10,
    cabinetWidthPx: 480,
    cabinetHeightPx: 270,
    cabinetWidthMm: 600,
    cabinetHeightMm: 337.5,
    defaultProcessorProfileId: "novastar-vx1000-class",
    notes: "Planning profile for fine-pitch modular LED walls with a 16:9 cabinet format.",
  },
  {
    id: "hisense-xihfe-cob-p1-56-class",
    label: "Hisense XIHFE COB fine pitch P1.56 class",
    manufacturer: "Hisense",
    screenClass: "modular",
    defaultPixelPitchMm: 1.56,
    defaultCabinetRows: 6,
    defaultCabinetCols: 10,
    cabinetWidthPx: 384,
    cabinetHeightPx: 216,
    cabinetWidthMm: 600,
    cabinetHeightMm: 337.5,
    defaultProcessorProfileId: "novastar-vx600-class",
    notes: "Planning profile for balanced fine-pitch corporate walls where lower bandwidth per cabinet is preferred.",
  },
  {
    id: "hisense-xihfe-cob-p0-94-class",
    label: "Hisense XIHFE COB fine pitch P0.94 class",
    manufacturer: "Hisense",
    screenClass: "modular",
    defaultPixelPitchMm: 0.94,
    defaultCabinetRows: 4,
    defaultCabinetCols: 8,
    cabinetWidthPx: 640,
    cabinetHeightPx: 360,
    cabinetWidthMm: 600,
    cabinetHeightMm: 337.5,
    defaultProcessorProfileId: "novastar-mx40pro-class",
    notes: "Planning profile for ultra-fine pitch LED where processor capacity and heat strategy are critical.",
  },
];

const LED_PROCESSOR_PROFILES: LedProcessorProfile[] = [
  {
    id: "hisense-xim-integrated-controller",
    label: "Hisense XIM integrated controller class",
    maxPixels: 2_300_000,
    maxWidthPx: 4096,
    maxHeightPx: 2160,
    maxInputs: 1,
    maxWindows: 2,
    notes: "Planning profile for integrated all-in-one control electronics with a single external input path.",
  },
  {
    id: "novastar-vx600-class",
    label: "NovaStar VX600 class",
    maxPixels: 3_900_000,
    maxWidthPx: 10_240,
    maxHeightPx: 8_192,
    maxInputs: 4,
    maxWindows: 3,
    notes: "Planning profile for mid-range all-in-one LED controllers.",
  },
  {
    id: "novastar-vx1000-class",
    label: "NovaStar VX1000 class",
    maxPixels: 6_500_000,
    maxWidthPx: 10_240,
    maxHeightPx: 8_192,
    maxInputs: 5,
    maxWindows: 3,
    notes: "Planning profile for higher-capacity all-in-one LED controllers.",
  },
  {
    id: "novastar-mx40pro-class",
    label: "NovaStar MX40 Pro class",
    maxPixels: 9_900_000,
    maxWidthPx: 16_384,
    maxHeightPx: 8_192,
    maxInputs: 6,
    maxWindows: 4,
    notes: "Planning profile for larger premium canvases and higher multi-window headroom.",
  },
];

function toNumber(value: string, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function calcLcdWallWidthM(cols: number, panelDiagonalIn: number, bezelMm: number): number {
  if (cols <= 0 || panelDiagonalIn <= 0) return 0;
  const panelWidthM = panelDiagonalIn * 0.8716 * 0.0254;
  const bezelM = bezelMm / 1000;
  return cols * panelWidthM + Math.max(cols - 1, 0) * bezelM;
}

function calcLcdWallHeightM(rows: number, panelDiagonalIn: number, bezelMm: number): number {
  if (rows <= 0 || panelDiagonalIn <= 0) return 0;
  const panelHeightM = panelDiagonalIn * 0.4903 * 0.0254;
  const bezelM = bezelMm / 1000;
  return rows * panelHeightM + Math.max(rows - 1, 0) * bezelM;
}

function calcDiagonalIn(widthM: number, heightM: number): number {
  if (widthM <= 0 || heightM <= 0) return 0;
  const diagonalM = Math.sqrt(widthM * widthM + heightM * heightM);
  return diagonalM / 0.0254;
}

function parseContentAspectRatio(
  aspect: DraftState["contentAspect"],
  custom: string
): { label: string; ratio: number } {
  if (aspect === "custom") {
    const value = custom.trim();
    if (value.includes(":")) {
      const [w, h] = value.split(":").map((x) => Number(x.trim()));
      if (Number.isFinite(w) && Number.isFinite(h) && h > 0) {
        return { label: value, ratio: w / h };
      }
    } else {
      const ratio = Number(value);
      if (Number.isFinite(ratio) && ratio > 0) {
        return { label: value, ratio };
      }
    }
    return { label: "16:9 (fallback)", ratio: 16 / 9 };
  }

  const map: Record<Exclude<DraftState["contentAspect"], "custom">, number> = {
    "16:9": 16 / 9,
    "16:10": 16 / 10,
    "21:9": 21 / 9,
    "32:9": 32 / 9,
  };
  return { label: aspect, ratio: map[aspect] };
}

function isNonStandardLcdLayout(rows: number, cols: number): boolean {
  if (rows === 2 && cols === 2) return false;
  if (rows === 3 && cols === 3) return false;
  if (rows === 4 && cols === 4) return false;
  if (rows === 1 || cols === 1) return false;
  return true;
}

function assessLcdDistortion(args: {
  rows: number;
  cols: number;
  sourceCount: number;
  driveStrategy: DraftState["lcdDriveStrategy"];
  contentAspect: { label: string; ratio: number };
}): LcdDistortionAssessment {
  const wallAspect = (args.cols * 16) / (args.rows * 9);
  const mismatchRatio = Math.abs(args.contentAspect.ratio - wallAspect) / Math.max(wallAspect, 0.01);
  const mismatchPct = Math.round(mismatchRatio * 100);
  const is4x2 = args.rows === 2 && args.cols === 4;
  const nonStandard = isNonStandardLcdLayout(args.rows, args.cols);

  let score = Math.round(mismatchPct * 1.8);
  if (nonStandard) score += 14;
  if (is4x2) score += 18;
  if (args.sourceCount <= 1) score += 10;
  if (args.driveStrategy === "tile-loop-multiview") score += 8;
  if (args.driveStrategy !== "decoder-per-screen" && mismatchRatio > 0.18) score += 16;

  score = Math.max(0, Math.min(100, score));
  const level: DistortionRiskLevel = score >= 70 ? "High" : score >= 40 ? "Medium" : "Low";

  const hardWarnings: string[] = [];
  if (level === "High") {
    hardWarnings.push("LCD distortion risk is high. Engineering review is required before customer handoff.");
  }
  if (is4x2 && args.contentAspect.label === "16:10" && args.driveStrategy !== "decoder-per-screen") {
    hardWarnings.push("4x2 LCD with a 16:10 primary source can stretch content. Use decoder-per-screen or authored content.");
  }
  if (nonStandard && args.driveStrategy !== "decoder-per-screen" && args.sourceCount <= 1) {
    hardWarnings.push("Non-standard single-source LCD walls should be driven per screen to avoid geometric distortion.");
  }
  if (mismatchRatio > 0.24 && args.sourceCount <= 1) {
    hardWarnings.push("Primary source aspect differs strongly from wall aspect. Distortion or letterboxing is likely.");
  }

  return {
    score,
    level,
    hardWarnings,
  };
}

function assessLedProcessorFit(args: {
  profile: LedProcessorProfile;
  canvasWidthPx: number;
  canvasHeightPx: number;
  sourceCount: number;
  mode: DraftState["processorInputMode"];
}): { warnings: string[]; hardWarnings: string[] } {
  const pixels = args.canvasWidthPx * args.canvasHeightPx;
  const warnings: string[] = [];
  const hardWarnings: string[] = [];

  if (pixels > args.profile.maxPixels) {
    hardWarnings.push(
      `Canvas ${args.canvasWidthPx}x${args.canvasHeightPx}px (${pixels.toLocaleString()} px) exceeds processor pixel load (${args.profile.maxPixels.toLocaleString()} px).`
    );
  }
  if (args.canvasWidthPx > args.profile.maxWidthPx) {
    hardWarnings.push(
      `Canvas width ${args.canvasWidthPx}px exceeds processor width limit (${args.profile.maxWidthPx}px).`
    );
  }
  if (args.canvasHeightPx > args.profile.maxHeightPx) {
    hardWarnings.push(
      `Canvas height ${args.canvasHeightPx}px exceeds processor height limit (${args.profile.maxHeightPx}px).`
    );
  }
  if (args.sourceCount > args.profile.maxInputs) {
    warnings.push(
      `Source count (${args.sourceCount}) is above the processor input profile (${args.profile.maxInputs}); switcher or input expansion may be required.`
    );
  }
  if (args.mode === "multiview" && args.sourceCount > args.profile.maxWindows) {
    warnings.push(
      `Multiview source count (${args.sourceCount}) exceeds processor window profile (${args.profile.maxWindows}).`
    );
  }

  return { warnings, hardWarnings };
}

function findLedTechnologyProfile(id: string | undefined): LedTechnologyProfile {
  return LED_TECHNOLOGY_PROFILES.find((item) => item.id === id) ?? LED_TECHNOLOGY_PROFILES[0];
}

function findLedProcessorProfile(id: string | undefined): LedProcessorProfile {
  return LED_PROCESSOR_PROFILES.find((item) => item.id === id) ?? LED_PROCESSOR_PROFILES[0];
}

function recommendLcdWall(args: {
  rows: number;
  cols: number;
  sourceCount: number;
  qualityProfile: DraftState["qualityProfile"];
  driveStrategy: DraftState["lcdDriveStrategy"];
  contentAspect: { label: string; ratio: number };
}): PlannerRecommendation {
  const panelCount = args.rows * args.cols;
  const wallAspect = (args.cols * 16) / (args.rows * 9);
  const aspectMismatch = Math.abs(args.contentAspect.ratio - wallAspect) / wallAspect;
  const warnings: string[] = [];
  const is4x2 = args.rows === 2 && args.cols === 4;

  if (isNonStandardLcdLayout(args.rows, args.cols) && args.driveStrategy !== "decoder-per-screen") {
    warnings.push("Non-standard LCD layouts are safer with decoder-per-screen driving.");
  }
  if (is4x2 && args.contentAspect.label === "16:10" && args.driveStrategy !== "decoder-per-screen") {
    warnings.push("4x2 + 16:10 risks stretch unless content is authored for the wall canvas.");
  }
  if (args.sourceCount <= 1 && aspectMismatch > 0.2 && args.driveStrategy !== "decoder-per-screen") {
    warnings.push("Single-source content aspect does not match wall aspect. Distortion risk is high.");
  }

  if (args.driveStrategy === "decoder-per-screen") {
    const decoderSku = args.qualityProfile === "premium" ? "NHD-600-TRX" : "NHD-500-RX";
    const encoderSku = args.qualityProfile === "premium" ? "NHD-600-TRX" : "NHD-500-TX";
    return {
      title: "Decoder-per-screen (recommended)",
      summary: "Best fit for flexible zones, 4x2/non-standard walls, and bezel-conscious installs.",
      outputTopology: `${args.cols}x${args.rows} independent panel mapping`,
      warnings,
      items: [
        { sku: decoderSku, quantity: panelCount, role: "One decoder per panel" },
        { sku: encoderSku, quantity: Math.max(1, args.sourceCount), role: "Source ingest" },
        { sku: "NHD-CTL-PRO", quantity: 1, role: "NetworkHD controller" },
      ],
    };
  }

  if (args.driveStrategy === "tile-loop-multiview") {
    const multiviewSku = args.qualityProfile === "premium" ? "NHD-600-TRX" : "NHD-150-RX";
    return {
      title: "Tile-loop multiview",
      summary: "Single composite feed into tile-mode display chain.",
      outputTopology: "Single wall feed to display tile loop",
      warnings,
      items: [
        {
          sku: multiviewSku,
          quantity: 1,
          role: multiviewSku === "NHD-150-RX" ? "Up to 9-window low-bandwidth multiview" : "Premium high-quality multiview",
        },
      ],
    };
  }

  const processorSku = panelCount <= 4 ? "SW-0204-VW" : "SW-0206-VW";
  return {
    title: "Dedicated processor",
    summary: "Simple fixed-layout video wall processor path.",
    outputTopology: "Processor-managed LCD wall map",
    warnings,
    items: [
      {
        sku: processorSku,
        quantity: processorSku === "SW-0206-VW" ? Math.ceil(panelCount / 6) : 1,
        role: "Wall processing core",
      },
    ],
  };
}

function recommendLedWall(args: {
  sourceCount: number;
  qualityProfile: DraftState["qualityProfile"];
  mode: DraftState["processorInputMode"];
  canvasWidthPx: number;
  canvasHeightPx: number;
}): PlannerRecommendation {
  const warnings: string[] = [];
  if (args.mode === "multiview" && args.sourceCount > 9 && args.qualityProfile !== "premium") {
    warnings.push("More than 9 windows usually requires a premium multiview path.");
  }
  if (args.mode === "multiview" && args.sourceCount > 16) {
    warnings.push("Source count exceeds common single-device multiview limits.");
  }

  if (args.mode === "single-source") {
    const sku = args.qualityProfile === "premium" ? "NHD-600-TRX" : "NHD-500-RX";
    return {
      title: "Single-canvas LED feed",
      summary: "LED walls are fed as one 1x1 output into the LED processor.",
      outputTopology: "1x1 signal output to LED processor",
      warnings,
      items: [{ sku, quantity: 1, role: "Single source to LED processor input" }],
    };
  }

  const sku = args.qualityProfile === "premium" || args.sourceCount > 9 ? "NHD-600-TRX" : "NHD-150-RX";
  return {
    title: "Multiview LED feed",
    summary: "Create a single composite canvas feed before the LED processor.",
    outputTopology: "1x1 signal output to LED processor",
    warnings: [
      ...warnings,
      `Target canvas ${args.canvasWidthPx}x${args.canvasHeightPx}px is delivered as one output.`,
    ],
    items: [
      {
        sku,
        quantity: 1,
        role: sku === "NHD-150-RX" ? "Low-bandwidth pinch/zoom multiview" : "Premium fixed-grid/high-fidelity multiview",
      },
    ],
  };
}

function buildMountingNotes(technology: VideoWallTechnology, rows: number, cols: number, outputRows: number, outputCols: number): string[] {
  const notes = [
    "Confirm power and service access before final mounting design.",
    "Allow structured cable paths and clear rear access where possible.",
  ];

  if (technology === "LCD") {
    notes.push("Check bezel alignment tolerance and colour uniformity across panels.");
    if (rows * cols >= 6) notes.push("Use a precision mounting system with fine adjustment.");
  } else {
    notes.push(`Signal topology is fixed at ${outputCols}x${outputRows} output into the LED processor.`);
    notes.push("Confirm cabinet service strategy: front service or rear service.");
    notes.push("Validate viewing distance against chosen pixel pitch.");
    if (rows * cols >= 12) notes.push("Plan processor location, redundancy expectations, and thermal management.");
  }

  return notes;
}

export default function VideoWallPlannerPage() {
  const nav = useNavigate();
  const activeProject = getActiveProject();

  const [draft, setDraft] = React.useState<DraftState>({
    technology: "LCD",
    sourceCount: "1",
    qualityProfile: "balanced",
    processorInputMode: "single-source",
    contentAspect: "16:9",
    contentAspectCustom: "",
    lcdRows: "2",
    lcdCols: "2",
    lcdPanelDiagonalIn: "55",
    lcdBezelMm: "3.5",
    lcdDriveStrategy: "decoder-per-screen",
    ledPixelPitchMm: "1.9",
    ledCabinetRows: "6",
    ledCabinetCols: "10",
    ledCabinetWidthPx: "192",
    ledCabinetHeightPx: "192",
    ledCabinetWidthMm: "500",
    ledCabinetHeightMm: "500",
    ledTechnologyProfileId: "hisense-xihfe-cob-p1-25-class",
    ledProcessorProfileId: "novastar-vx1000-class",
    ledScreenClass: "modular",
    viewingDistanceM: "3",
  });

  const sourceCount = Math.max(1, toNumber(draft.sourceCount, 1));
  const lcdRows = Math.max(1, toNumber(draft.lcdRows, 1));
  const lcdCols = Math.max(1, toNumber(draft.lcdCols, 1));
  const ledCabinetRows = Math.max(1, toNumber(draft.ledCabinetRows, 1));
  const ledCabinetCols = Math.max(1, toNumber(draft.ledCabinetCols, 1));
  const viewingDistanceM = Math.max(0, toNumber(draft.viewingDistanceM, 0));
  const outputRows = draft.technology === "LED" ? 1 : lcdRows;
  const outputCols = draft.technology === "LED" ? 1 : lcdCols;
  const physicalRows = draft.technology === "LED" ? ledCabinetRows : lcdRows;
  const physicalCols = draft.technology === "LED" ? ledCabinetCols : lcdCols;
  const displays = physicalRows * physicalCols;
  const selectedLedTechnologyProfile = React.useMemo(
    () => findLedTechnologyProfile(draft.ledTechnologyProfileId),
    [draft.ledTechnologyProfileId]
  );
  const selectedLedProcessorProfile = React.useMemo(
    () => findLedProcessorProfile(draft.ledProcessorProfileId),
    [draft.ledProcessorProfileId]
  );

  const computed = React.useMemo(() => {
    if (draft.technology === "LCD") {
      const panelDiagonalIn = Math.max(0, toNumber(draft.lcdPanelDiagonalIn, 55));
      const bezelMm = Math.max(0, toNumber(draft.lcdBezelMm, 3.5));
      const widthM = calcLcdWallWidthM(lcdCols, panelDiagonalIn, bezelMm);
      const heightM = calcLcdWallHeightM(lcdRows, panelDiagonalIn, bezelMm);
      const diagonalIn = calcDiagonalIn(widthM, heightM);
      const contentAspect = parseContentAspectRatio(draft.contentAspect, draft.contentAspectCustom);
      const recommendation = recommendLcdWall({
        rows: lcdRows,
        cols: lcdCols,
        sourceCount,
        qualityProfile: draft.qualityProfile,
        driveStrategy: draft.lcdDriveStrategy,
        contentAspect,
      });
      const distortionAssessment = assessLcdDistortion({
        rows: lcdRows,
        cols: lcdCols,
        sourceCount,
        driveStrategy: draft.lcdDriveStrategy,
        contentAspect,
      });
      const summary = `LCD video wall: ${lcdCols}x${lcdRows}, approx ${widthM.toFixed(2)}m x ${heightM.toFixed(2)}m, ${sourceCount} source(s), ${draft.lcdDriveStrategy.replaceAll("-", " ")} strategy.`;

      return {
        widthM,
        heightM,
        diagonalIn,
        summary,
        recommendation,
        warnings: recommendation.warnings,
        hardWarnings: distortionAssessment.hardWarnings,
        distortionRiskScore: distortionAssessment.score,
        distortionRiskLevel: distortionAssessment.level,
        ledTechnologyProfile: undefined as LedTechnologyProfile | undefined,
        ledProcessorProfile: undefined as LedProcessorProfile | undefined,
        sourceCount,
        outputRows: lcdRows,
        outputCols: lcdCols,
        physicalRows: lcdRows,
        physicalCols: lcdCols,
        panelDiagonalIn,
        bezelMm,
        pixelPitchMm: undefined as number | undefined,
        canvasWidthPx: undefined as number | undefined,
        canvasHeightPx: undefined as number | undefined,
        contentAspectLabel: contentAspect.label,
      };
    }

    const cabinetWidthPx = Math.max(1, toNumber(draft.ledCabinetWidthPx, selectedLedTechnologyProfile.cabinetWidthPx));
    const cabinetHeightPx = Math.max(1, toNumber(draft.ledCabinetHeightPx, selectedLedTechnologyProfile.cabinetHeightPx));
    const cabinetWidthMm = Math.max(1, toNumber(draft.ledCabinetWidthMm, selectedLedTechnologyProfile.cabinetWidthMm));
    const cabinetHeightMm = Math.max(1, toNumber(draft.ledCabinetHeightMm, selectedLedTechnologyProfile.cabinetHeightMm));
    const canvasWidthPx = ledCabinetCols * cabinetWidthPx;
    const canvasHeightPx = ledCabinetRows * cabinetHeightPx;
    const widthM = (ledCabinetCols * cabinetWidthMm) / 1000;
    const heightM = (ledCabinetRows * cabinetHeightMm) / 1000;
    const pixelPitchMm = Math.max(0, toNumber(draft.ledPixelPitchMm, selectedLedTechnologyProfile.defaultPixelPitchMm));
    const diagonalIn = calcDiagonalIn(widthM, heightM);
    const recommendation = recommendLedWall({
      sourceCount,
      qualityProfile: draft.qualityProfile,
      mode: draft.processorInputMode,
      canvasWidthPx,
      canvasHeightPx,
    });
    const processorAssessment = assessLedProcessorFit({
      profile: selectedLedProcessorProfile,
      canvasWidthPx,
      canvasHeightPx,
      sourceCount,
      mode: draft.processorInputMode,
    });
    const allInOneShapeWarning =
      draft.ledScreenClass === "all-in-one-96-120" && (ledCabinetRows > 1 || ledCabinetCols > 1)
        ? ["All-in-one LED class should normally be modeled as a 1x1 physical display. Use modular class for tiled cabinets."]
        : [];
    const summary = `LED video wall: physical ${ledCabinetCols}x${ledCabinetRows} cabinets, output fixed at 1x1 into LED processor, canvas ${canvasWidthPx}x${canvasHeightPx}px.`;

    return {
      widthM,
      heightM,
      diagonalIn,
      summary,
      recommendation,
      warnings: [
        ...recommendation.warnings,
        ...processorAssessment.warnings,
      ],
      hardWarnings: [
        ...allInOneShapeWarning,
        ...processorAssessment.hardWarnings,
      ],
      distortionRiskScore: undefined as number | undefined,
      distortionRiskLevel: undefined as DistortionRiskLevel | undefined,
      ledTechnologyProfile: selectedLedTechnologyProfile,
      ledProcessorProfile: selectedLedProcessorProfile,
      sourceCount,
      outputRows: 1,
      outputCols: 1,
      physicalRows: ledCabinetRows,
      physicalCols: ledCabinetCols,
      panelDiagonalIn: undefined as number | undefined,
      bezelMm: undefined as number | undefined,
      pixelPitchMm,
      canvasWidthPx,
      canvasHeightPx,
      contentAspectLabel: undefined as string | undefined,
    };
  }, [
    draft,
    lcdCols,
    lcdRows,
    ledCabinetCols,
    ledCabinetRows,
    selectedLedProcessorProfile,
    selectedLedTechnologyProfile,
    sourceCount,
  ]);

  const notes = React.useMemo(
    () => buildMountingNotes(draft.technology, physicalRows, physicalCols, outputRows, outputCols),
    [draft.technology, outputCols, outputRows, physicalCols, physicalRows]
  );

  const applyLedTechnologyProfile = React.useCallback((profileId: string) => {
    const profile = findLedTechnologyProfile(profileId);
    setDraft((prev) => ({
      ...prev,
      ledTechnologyProfileId: profile.id,
      ledScreenClass: profile.screenClass,
      ledPixelPitchMm: String(profile.defaultPixelPitchMm),
      ledCabinetRows: String(profile.defaultCabinetRows),
      ledCabinetCols: String(profile.defaultCabinetCols),
      ledCabinetWidthPx: String(profile.cabinetWidthPx),
      ledCabinetHeightPx: String(profile.cabinetHeightPx),
      ledCabinetWidthMm: String(profile.cabinetWidthMm),
      ledCabinetHeightMm: String(profile.cabinetHeightMm),
      ledProcessorProfileId:
        LED_PROCESSOR_PROFILES.some((item) => item.id === prev.ledProcessorProfileId)
          ? prev.ledProcessorProfileId
          : profile.defaultProcessorProfileId,
    }));
  }, []);

  const buildPayload = (): ProjectVideoWall => {
    const leadItem = computed.recommendation.items[0];
    if (draft.technology === "LED") {
      return {
        technology: "LED",
        rows: 1,
        cols: 1,
        outputRows: 1,
        outputCols: 1,
        panelCount: 1,
        cabinetRows: physicalRows,
        cabinetCols: physicalCols,
        widthM: Number(computed.widthM.toFixed(2)),
        heightM: Number(computed.heightM.toFixed(2)),
        diagonalIn: Number(computed.diagonalIn.toFixed(1)),
        pixelPitchMm: computed.pixelPitchMm,
        canvasWidthPx: computed.canvasWidthPx,
        canvasHeightPx: computed.canvasHeightPx,
        ledTechnologyProfileId: computed.ledTechnologyProfile?.id,
        ledProcessorProfileId: computed.ledProcessorProfile?.id,
        ledProcessorMaxPixels: computed.ledProcessorProfile?.maxPixels,
        ledProcessorMaxWidthPx: computed.ledProcessorProfile?.maxWidthPx,
        ledProcessorMaxHeightPx: computed.ledProcessorProfile?.maxHeightPx,
        ledProcessorMaxInputs: computed.ledProcessorProfile?.maxInputs,
        ledProcessorMaxWindows: computed.ledProcessorProfile?.maxWindows,
        sourceCount,
        viewingDistanceM,
        ledProcessorMode: draft.processorInputMode,
        ledScreenClass: draft.ledScreenClass,
        recommendedSku: leadItem?.sku,
        recommendedSkuQty: leadItem?.quantity,
        processorRecommendation: `${computed.recommendation.title}: ${computed.recommendation.summary}`,
        mountingNotes: notes,
        warnings: computed.warnings,
        hardWarnings: computed.hardWarnings,
        summary: computed.summary,
        createdAt: new Date().toISOString(),
      };
    }

    return {
      technology: "LCD",
      rows: physicalRows,
      cols: physicalCols,
      outputRows,
      outputCols,
      panelCount: displays,
      widthM: Number(computed.widthM.toFixed(2)),
      heightM: Number(computed.heightM.toFixed(2)),
      diagonalIn: Number(computed.diagonalIn.toFixed(1)),
      panelDiagonalIn: computed.panelDiagonalIn,
      bezelMm: computed.bezelMm,
      sourceCount,
      viewingDistanceM,
      lcdDriveStrategy: draft.lcdDriveStrategy,
      contentAspectRatio: computed.contentAspectLabel,
      distortionRiskScore: computed.distortionRiskScore,
      distortionRiskLevel: computed.distortionRiskLevel,
      recommendedSku: leadItem?.sku,
      recommendedSkuQty: leadItem?.quantity,
      processorRecommendation: `${computed.recommendation.title}: ${computed.recommendation.summary}`,
      mountingNotes: notes,
      warnings: computed.warnings,
      hardWarnings: computed.hardWarnings,
      summary: computed.summary,
      createdAt: new Date().toISOString(),
    };
  };

  const update = <K extends keyof DraftState>(key: K, value: DraftState[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const applyToActiveProject = () => {
    const active = ensureActiveProject({
      customer: activeProject?.customer || "Sample customer",
      site: activeProject?.site || "",
      roomName: activeProject?.roomName || "Video Wall",
      stage: "Design",
      status: activeProject?.status || "Draft",
    });

    applyVideoWallToProject(active.id, buildPayload());
    setActiveProjectId(active.id);
    nav(`/app/projects/${encodeURIComponent(active.id)}`);
  };

  const createProjectFromWall = () => {
    const payload = buildPayload();
    const created = createProject({
      name: payload.technology === "LED"
        ? `LED Wall ${physicalCols}x${physicalRows} (1x1 feed)`
        : `LCD Wall ${physicalCols}x${physicalRows}`,
      customer: activeProject?.customer || "Sample customer",
      site: activeProject?.site || "",
      roomName: "Video Wall",
      stage: "Design",
      status: "Draft",
      notes: computed.summary,
      videowall: payload,
      discovery: {
        customer: activeProject?.customer || "Sample customer",
        site: activeProject?.site || "",
        roomName: "Video Wall",
        applicationType: payload.technology === "LED" ? "LED Video Wall" : "LCD Video Wall",
        notes: computed.summary,
        recommendedFamilies: ["Video Wall"],
        createdAt: new Date().toISOString(),
      },
    });

    setActiveProjectId(created.id);
    nav(`/app/projects/${encodeURIComponent(created.id)}`);
  };

  return (
    <div className="wm-dashboard">
      <section className="wm-dashboard__hero">
        <div>
          <div className="wm-dashboard__eyebrow">Video Wall Wizard</div>
          <h1 className="wm-dashboard__title">LED / LCD video wall planner</h1>
          <p className="wm-dashboard__subtitle">
            LED mode models a single 1x1 signal output canvas into an LED processor (with Hisense technology presets), while LCD mode supports panel-by-panel, tile-loop, and processor paths.
          </p>

          <div className="wm-dashboard__meta">
            <span className="wm-chip">Technology: {draft.technology}</span>
            <span className="wm-chip">Signal output: {outputCols}x{outputRows}</span>
            <span className="wm-chip">Physical layout: {physicalCols}x{physicalRows}</span>
            {draft.technology === "LED" ? (
              <span className="wm-chip">Profile: {selectedLedTechnologyProfile.label}</span>
            ) : null}
            {computed.canvasWidthPx && computed.canvasHeightPx ? (
              <span className="wm-chip">Canvas: {computed.canvasWidthPx}x{computed.canvasHeightPx}px</span>
            ) : null}
            {computed.distortionRiskLevel ? (
              <span className="wm-chip">Distortion risk: {computed.distortionRiskLevel}</span>
            ) : null}
            <span className="wm-chip">Approx size: {computed.widthM.toFixed(2)}m x {computed.heightM.toFixed(2)}m</span>
          </div>
        </div>

        <div className="wm-dashboard__heroactions">
          <button type="button" className="wm-btn wm-btn--ghost" onClick={() => nav("/app/dashboard")}>
            Dashboard
          </button>
          <button type="button" className="wm-btn wm-btn--ghost" onClick={() => nav("/app/projects")}>
            Projects
          </button>
          <button type="button" className="wm-btn wm-btn--primary" onClick={createProjectFromWall}>
            Create Project From Wall
          </button>
        </div>
      </section>

      <section className="wm-page-grid-sidebar">
        <div className="wm-card">
          <div className="wm-card__title">Wall inputs</div>
          <div className="wm-card__subtitle">Choose LCD or LED and define the key planning parameters.</div>

          <div className="wm-field-wrap" style={{ marginTop: 12 }}>
            <span className="wm-label">Technology</span>
            <div className="wm-tier-picker">
              {(["LCD", "LED"] as VideoWallTechnology[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  className={draft.technology === item ? "wm-tier-btn is-active" : "wm-tier-btn"}
                  onClick={() => update("technology", item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="wm-form-grid" style={{ marginTop: 12 }}>
            <label className="wm-field-wrap">
              <span className="wm-label">Source count</span>
              <input className="wm-field" value={draft.sourceCount} onChange={(e) => update("sourceCount", e.target.value)} />
            </label>

            <label className="wm-field-wrap">
              <span className="wm-label">Viewing distance (m)</span>
              <input className="wm-field" value={draft.viewingDistanceM} onChange={(e) => update("viewingDistanceM", e.target.value)} />
            </label>

            <label className="wm-field-wrap">
              <span className="wm-label">Quality profile</span>
              <select className="wm-field" value={draft.qualityProfile} onChange={(e) => update("qualityProfile", e.target.value as DraftState["qualityProfile"])}>
                <option value="cost">Cost-aware</option>
                <option value="balanced">Balanced</option>
                <option value="premium">Premium</option>
              </select>
            </label>

            {draft.technology === "LCD" ? (
              <>
                <label className="wm-field-wrap">
                  <span className="wm-label">Rows</span>
                  <input className="wm-field" value={draft.lcdRows} onChange={(e) => update("lcdRows", e.target.value)} />
                </label>

                <label className="wm-field-wrap">
                  <span className="wm-label">Columns</span>
                  <input className="wm-field" value={draft.lcdCols} onChange={(e) => update("lcdCols", e.target.value)} />
                </label>

                <label className="wm-field-wrap">
                  <span className="wm-label">Panel diagonal (in)</span>
                  <input className="wm-field" value={draft.lcdPanelDiagonalIn} onChange={(e) => update("lcdPanelDiagonalIn", e.target.value)} />
                </label>

                <label className="wm-field-wrap">
                  <span className="wm-label">Combined bezel (mm)</span>
                  <input className="wm-field" value={draft.lcdBezelMm} onChange={(e) => update("lcdBezelMm", e.target.value)} />
                </label>

                <label className="wm-field-wrap">
                  <span className="wm-label">LCD drive strategy</span>
                  <select className="wm-field" value={draft.lcdDriveStrategy} onChange={(e) => update("lcdDriveStrategy", e.target.value as DraftState["lcdDriveStrategy"])}>
                    <option value="decoder-per-screen">Decoder per screen</option>
                    <option value="tile-loop-multiview">Tile-loop multiview</option>
                    <option value="dedicated-processor">Dedicated processor</option>
                  </select>
                </label>

                <label className="wm-field-wrap">
                  <span className="wm-label">Primary source aspect</span>
                  <select className="wm-field" value={draft.contentAspect} onChange={(e) => update("contentAspect", e.target.value as DraftState["contentAspect"])}>
                    <option value="16:9">16:9</option>
                    <option value="16:10">16:10</option>
                    <option value="21:9">21:9</option>
                    <option value="32:9">32:9</option>
                    <option value="custom">Custom</option>
                  </select>
                </label>

                {draft.contentAspect === "custom" ? (
                  <label className="wm-field-wrap">
                    <span className="wm-label">Custom aspect ratio</span>
                    <input className="wm-field" value={draft.contentAspectCustom} onChange={(e) => update("contentAspectCustom", e.target.value)} placeholder="e.g. 48:9 or 3.5" />
                  </label>
                ) : null}
              </>
            ) : (
              <>
                <label className="wm-field-wrap">
                  <span className="wm-label">Hisense LED profile</span>
                  <select
                    className="wm-field"
                    value={draft.ledTechnologyProfileId}
                    onChange={(e) => applyLedTechnologyProfile(e.target.value)}
                  >
                    {LED_TECHNOLOGY_PROFILES.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="wm-field-wrap">
                  <span className="wm-label">LED processor profile</span>
                  <select
                    className="wm-field"
                    value={draft.ledProcessorProfileId}
                    onChange={(e) => update("ledProcessorProfileId", e.target.value)}
                  >
                    {LED_PROCESSOR_PROFILES.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="wm-field-wrap">
                  <span className="wm-label">Processor input mode</span>
                  <select className="wm-field" value={draft.processorInputMode} onChange={(e) => update("processorInputMode", e.target.value as DraftState["processorInputMode"])}>
                    <option value="single-source">Single source</option>
                    <option value="multiview">Multiview</option>
                  </select>
                </label>

                <label className="wm-field-wrap">
                  <span className="wm-label">Screen class</span>
                  <select className="wm-field" value={draft.ledScreenClass} onChange={(e) => update("ledScreenClass", e.target.value as DraftState["ledScreenClass"])}>
                    <option value="modular">Modular cabinets</option>
                    <option value="all-in-one-96-120">All-in-one (96-120in)</option>
                  </select>
                </label>

                <label className="wm-field-wrap">
                  <span className="wm-label">Cabinet rows</span>
                  <input className="wm-field" value={draft.ledCabinetRows} onChange={(e) => update("ledCabinetRows", e.target.value)} />
                </label>

                <label className="wm-field-wrap">
                  <span className="wm-label">Cabinet columns</span>
                  <input className="wm-field" value={draft.ledCabinetCols} onChange={(e) => update("ledCabinetCols", e.target.value)} />
                </label>

                <label className="wm-field-wrap">
                  <span className="wm-label">Cabinet width (px)</span>
                  <input className="wm-field" value={draft.ledCabinetWidthPx} onChange={(e) => update("ledCabinetWidthPx", e.target.value)} />
                </label>

                <label className="wm-field-wrap">
                  <span className="wm-label">Cabinet height (px)</span>
                  <input className="wm-field" value={draft.ledCabinetHeightPx} onChange={(e) => update("ledCabinetHeightPx", e.target.value)} />
                </label>

                <label className="wm-field-wrap">
                  <span className="wm-label">Cabinet width (mm)</span>
                  <input className="wm-field" value={draft.ledCabinetWidthMm} onChange={(e) => update("ledCabinetWidthMm", e.target.value)} />
                </label>

                <label className="wm-field-wrap">
                  <span className="wm-label">Cabinet height (mm)</span>
                  <input className="wm-field" value={draft.ledCabinetHeightMm} onChange={(e) => update("ledCabinetHeightMm", e.target.value)} />
                </label>

                <label className="wm-field-wrap">
                  <span className="wm-label">Pixel pitch (mm)</span>
                  <input className="wm-field" value={draft.ledPixelPitchMm} onChange={(e) => update("ledPixelPitchMm", e.target.value)} />
                </label>
              </>
            )}
          </div>

          <div className="wm-inline-actions">
            <button type="button" className="wm-btn wm-btn--primary" onClick={applyToActiveProject}>
              Apply To Active Project
            </button>
            <button type="button" className="wm-btn wm-btn--ghost" onClick={createProjectFromWall}>
              Create New Video Wall Project
            </button>
          </div>
        </div>

        <div className="wm-section-stack">
          <div className="wm-card">
            <div className="wm-card__title">Wall summary</div>
            <div className="wm-card__subtitle">{computed.summary}</div>

            <div className="wm-summary-list">
              <div className="wm-summary-row"><span>Technology</span><strong>{draft.technology}</strong></div>
              <div className="wm-summary-row"><span>Signal output map</span><strong>{outputCols} x {outputRows}</strong></div>
              <div className="wm-summary-row"><span>Physical layout</span><strong>{physicalCols} x {physicalRows}</strong></div>
              <div className="wm-summary-row"><span>Approx wall width</span><strong>{computed.widthM.toFixed(2)}m</strong></div>
              <div className="wm-summary-row"><span>Approx wall height</span><strong>{computed.heightM.toFixed(2)}m</strong></div>
              <div className="wm-summary-row"><span>Approx diagonal</span><strong>{computed.diagonalIn.toFixed(1)}in</strong></div>
              {computed.ledTechnologyProfile ? (
                <div className="wm-summary-row"><span>LED technology profile</span><strong>{computed.ledTechnologyProfile.label}</strong></div>
              ) : null}
              {computed.ledProcessorProfile ? (
                <div className="wm-summary-row"><span>LED processor profile</span><strong>{computed.ledProcessorProfile.label}</strong></div>
              ) : null}
              {computed.canvasWidthPx && computed.canvasHeightPx ? (
                <div className="wm-summary-row"><span>Canvas resolution</span><strong>{computed.canvasWidthPx} x {computed.canvasHeightPx}px</strong></div>
              ) : null}
              {computed.contentAspectLabel ? (
                <div className="wm-summary-row"><span>Content aspect</span><strong>{computed.contentAspectLabel}</strong></div>
              ) : null}
              {computed.distortionRiskLevel ? (
                <div className="wm-summary-row"><span>Distortion risk</span><strong>{computed.distortionRiskLevel} ({computed.distortionRiskScore}/100)</strong></div>
              ) : null}
              <div className="wm-summary-row"><span>Displays / cabinets context</span><strong>{displays}</strong></div>
            </div>
          </div>

          <div className="wm-page-grid-2">
            <div className="wm-card">
              <div className="wm-card__title">Processor recommendation</div>
              <div className="wm-card__subtitle">{computed.recommendation.title}</div>

              <div className="wm-summary-list">
                <div className="wm-summary-row"><span>Design summary</span><strong>{computed.recommendation.summary}</strong></div>
                <div className="wm-summary-row"><span>Output topology</span><strong>{computed.recommendation.outputTopology}</strong></div>
                {computed.recommendation.items.map((item) => (
                  <div className="wm-summary-row" key={`${item.sku}-${item.role}`}>
                    <span>{item.role}</span>
                    <strong>{item.sku} x{item.quantity}</strong>
                  </div>
                ))}
                {draft.technology === "LED" && computed.pixelPitchMm ? (
                  <div className="wm-summary-row"><span>Pixel pitch</span><strong>{computed.pixelPitchMm}mm</strong></div>
                ) : null}
                {computed.ledProcessorProfile ? (
                  <>
                    <div className="wm-summary-row"><span>Processor max pixels</span><strong>{computed.ledProcessorProfile.maxPixels.toLocaleString()} px</strong></div>
                    <div className="wm-summary-row"><span>Processor limits</span><strong>{computed.ledProcessorProfile.maxWidthPx}w x {computed.ledProcessorProfile.maxHeightPx}h</strong></div>
                    <div className="wm-summary-row"><span>Processor windows</span><strong>{computed.ledProcessorProfile.maxWindows} max</strong></div>
                  </>
                ) : null}
                {draft.technology === "LCD" && computed.panelDiagonalIn ? (
                  <div className="wm-summary-row"><span>Panel diagonal</span><strong>{computed.panelDiagonalIn}in</strong></div>
                ) : null}
                {draft.technology === "LCD" && computed.bezelMm != null ? (
                  <div className="wm-summary-row"><span>Bezel</span><strong>{computed.bezelMm}mm</strong></div>
                ) : null}
                <div className="wm-summary-row"><span>Viewing distance</span><strong>{viewingDistanceM || 0}m</strong></div>
              </div>
            </div>

            <div className="wm-card">
              <div className="wm-card__title">Mounting notes</div>
              <div className="wm-card__subtitle">These notes are written into the project when you apply the design.</div>

              <div className="wm-summary-list">
                {notes.map((item) => (
                  <div className="wm-summary-row" key={item}>
                    <span>Note</span>
                    <strong>{item}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {computed.warnings.length > 0 ? (
            <div className="wm-card">
              <div className="wm-card__title">Design warnings</div>
              <div className="wm-card__subtitle">Review before proposal sign-off.</div>

              <div className="wm-summary-list">
                {computed.warnings.map((warning) => (
                  <div className="wm-summary-row" key={warning}>
                    <span>Warning</span>
                    <strong>{warning}</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {computed.hardWarnings.length > 0 ? (
            <div className="wm-card">
              <div className="wm-card__title">Hard warnings</div>
              <div className="wm-card__subtitle">Resolve these issues before customer-facing recommendation.</div>

              <div className="wm-summary-list">
                {computed.hardWarnings.map((warning) => (
                  <div className="wm-summary-row" key={warning}>
                    <span>Critical</span>
                    <strong>{warning}</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="wm-card">
            <div className="wm-card__title">Project target</div>
            <div className="wm-card__subtitle">
              {activeProject
                ? `Current active project: ${activeProject.name}`
                : "No active project selected. Applying will use or create a live project record."}
            </div>

            <div className="wm-summary-list">
              <div className="wm-summary-row"><span>Customer</span><strong>{activeProject?.customer || "Sample customer"}</strong></div>
              <div className="wm-summary-row"><span>Site</span><strong>{activeProject?.site || "Not set"}</strong></div>
              <div className="wm-summary-row"><span>Current stage</span><strong>{activeProject?.stage || "Discovery"}</strong></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
