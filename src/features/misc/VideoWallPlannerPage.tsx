import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { findCatalogProductBySku } from "@/catalog/repository";
import type { CatalogProduct } from "@/catalog/types";
import { deriveVideoWallPreview } from "@/features/videowall/videoWallPreview";
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
  catalogSku?: string;
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

type ProductWindowPlacement = {
  x: number;
  y: number;
  z: number;
};

const QUALITY_TIER_OPTIONS: Array<{
  value: DraftState["qualityProfile"];
  label: string;
  description: string;
}> = [
  {
    value: "cost",
    label: "Bronze",
    description: "Cost-led path for simpler signage and budget-sensitive walls.",
  },
  {
    value: "balanced",
    label: "Silver",
    description: "Balanced path for most corporate video wall projects.",
  },
  {
    value: "premium",
    label: "Gold",
    description: "Higher-performance path for premium image quality and responsiveness.",
  },
];

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

function pushUnique(list: string[], message: string): void {
  if (!list.includes(message)) list.push(message);
}

function addAvoipNetworkWarnings(list: string[], qualityProfile: DraftState["qualityProfile"]): void {
  pushUnique(
    list,
    "NetworkHD requires a managed switch. Use a dedicated AV switch or a customer switch with a properly planned AV VLAN."
  );
  pushUnique(
    list,
    "If you plan to use the customer's existing network, engage the IT department early to confirm VLAN, multicast, IGMP, QoS, and security policy requirements."
  );

  if (qualityProfile === "premium") {
    pushUnique(
      list,
      "Premium 600-series designs require 10GbE switching and endpoint links. Validate optics, cabling, and switching capacity before committing."
    );
  }
}

function addLatencyGuidance(list: string[], qualityProfile: DraftState["qualityProfile"], mode: DraftState["processorInputMode"]): void {
  if (qualityProfile === "cost") {
    pushUnique(
      list,
      "Low-bandwidth AVoIP paths are best for signage, TV, and non-interactive display use. They are less suitable when lip-sync, live microphones, or control responsiveness are critical."
    );
  }
  if (mode === "multiview") {
    pushUnique(
      list,
      "Multiview composition adds processing overhead. Check live-audio sync and operator responsiveness before choosing a low-bandwidth path."
    );
  }
}

function addUsbBandwidthGuidance(list: string[], qualityProfile: DraftState["qualityProfile"]): void {
  if (qualityProfile !== "cost") {
    pushUnique(
      list,
      "If USB routing or KVM is required, confirm the endpoint model supports it and budget additional network bandwidth for video plus USB traffic."
    );
  }
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
  const avoipSwitchItem: RecommendationItem = {
    sku: "Project-specific",
    quantity: 1,
    role: "Managed AV network switch / VLAN fabric",
  };

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
    let decoderSku = "NHD-500-E-RX";
    let encoderSku = "NHD-500-TX";
    if (args.qualityProfile === "cost") {
      decoderSku = "NHD-120-RX";
      encoderSku = "NHD-120-TX";
    } else if (args.qualityProfile === "premium") {
      decoderSku = "NHD-600-TRX";
      encoderSku = "NHD-600-TRX";
    }
    addAvoipNetworkWarnings(warnings, args.qualityProfile);
    addLatencyGuidance(warnings, args.qualityProfile, "single-source");
    addUsbBandwidthGuidance(warnings, args.qualityProfile);
    return {
      title: "Decoder-per-screen (recommended)",
      summary: "Best fit for flexible zones, 4x2 or non-standard walls, and bezel-conscious installs where each panel needs its own mapped endpoint.",
      outputTopology: `${args.cols}x${args.rows} independent panel mapping`,
      warnings,
      items: [
        { sku: decoderSku, quantity: panelCount, role: "One decoder per panel" },
        { sku: encoderSku, quantity: Math.max(1, args.sourceCount), role: "Source ingest" },
        { sku: "NHD-CTL-PRO", quantity: 1, role: "NetworkHD controller" },
        avoipSwitchItem,
      ],
    };
  }

  if (args.driveStrategy === "tile-loop-multiview") {
    if (args.qualityProfile === "premium") {
      addAvoipNetworkWarnings(warnings, args.qualityProfile);
      addLatencyGuidance(warnings, args.qualityProfile, "multiview");
      addUsbBandwidthGuidance(warnings, args.qualityProfile);
      pushUnique(
        warnings,
        "NHD-600 multiview depends on secondary streams. Shared sources across multiple multiview decoders need matching layout expectations."
      );
      return {
        title: "600-series multiview into display tile loop",
        summary: "Premium AVoIP composition path for a single composite feed into a display-side tile wall.",
        outputTopology: "Single composite wall feed to first panel / display tile loop",
        warnings,
        items: [
          { sku: "NHD-600-TRX", quantity: Math.max(1, args.sourceCount), role: "Source-side transceivers" },
          { sku: "NHD-600-TRX", quantity: 1, role: "Composite wall-feed transceiver" },
          { sku: "NHD-CTL-PRO", quantity: 1, role: "NetworkHD controller" },
          avoipSwitchItem,
        ],
      };
    }

    if (args.qualityProfile === "balanced" && args.sourceCount <= 4) {
      addAvoipNetworkWarnings(warnings, args.qualityProfile);
      addLatencyGuidance(warnings, args.qualityProfile, "multiview");
      addUsbBandwidthGuidance(warnings, args.qualityProfile);
      return {
        title: "500-series multiview into display tile loop",
        summary: "Higher-quality single composite feed built with NetworkHD and a dedicated multiview processor.",
        outputTopology: "Single composite wall feed to first panel / display tile loop",
        warnings,
        items: [
          { sku: "NHD-500-TX", quantity: Math.max(1, args.sourceCount), role: "Source ingest" },
          { sku: "NHD-0401-MV", quantity: 1, role: "4-input multiview compositor" },
          { sku: "NHD-CTL-PRO", quantity: 1, role: "NetworkHD controller" },
          avoipSwitchItem,
        ],
      };
    }

    addAvoipNetworkWarnings(warnings, args.qualityProfile);
    addLatencyGuidance(warnings, args.qualityProfile, "multiview");
    pushUnique(
      warnings,
      "NHD-150-RX is a 100-series multiview receiver, not a per-panel wall decoder. Use this path only when the display chain itself handles the tile layout."
    );
    if (args.sourceCount > 9) {
      pushUnique(warnings, "NHD-150-RX supports up to 9 multiview tiles. Larger source counts require a different composition path.");
    }
    return {
      title: "100-series multiview into display tile loop",
      summary: "Budget composite-feed path for signage-style walls using the display's own tile mode.",
      outputTopology: "Single wall feed to display tile loop",
      warnings,
      items: [
        { sku: "NHD-120-TX", quantity: Math.max(1, args.sourceCount), role: "Source ingest" },
        { sku: "NHD-150-RX", quantity: 1, role: "Up to 9-window multiview output" },
        { sku: "NHD-CTL-PRO", quantity: 1, role: "NetworkHD controller" },
        avoipSwitchItem,
      ],
    };
  }

  const processorSku = panelCount <= 4 ? "SW-0204-VW" : "SW-0206-VW";
  if (args.sourceCount > 2) {
    pushUnique(
      warnings,
      "Dedicated wall processors are fixed-I/O devices. If you need more than a small number of live sources, plan an upstream switching layer."
    );
  }
  pushUnique(
    warnings,
    "Dedicated processor paths are less modular than AVoIP and do not provide the same networked USB-routing flexibility."
  );
  return {
    title: "Dedicated processor",
    summary: "Simple fixed-layout processor path when a traditional, fixed-I/O wall design is preferred over a modular AVoIP workflow.",
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
  const avoipSwitchItem: RecommendationItem = {
    sku: "Project-specific",
    quantity: 1,
    role: "Managed AV network switch / VLAN fabric",
  };
  if (args.mode === "multiview" && args.sourceCount > 9 && args.qualityProfile !== "premium") {
    warnings.push("More than 9 windows usually requires a premium multiview path.");
  }
  if (args.mode === "multiview" && args.sourceCount > 16) {
    warnings.push("Source count exceeds common single-device multiview limits.");
  }

  if (args.mode === "single-source") {
    if (args.qualityProfile === "cost") {
      addAvoipNetworkWarnings(warnings, args.qualityProfile);
      addLatencyGuidance(warnings, args.qualityProfile, args.mode);
      return {
        title: "100-series single-canvas LED feed",
        summary: "Budget AVoIP handoff for signage-style LED designs where latency sensitivity is low.",
        outputTopology: "1x1 signal output to LED processor",
        warnings,
        items: [
          { sku: "NHD-120-TX", quantity: 1, role: "Source ingest" },
          { sku: "NHD-120-RX", quantity: 1, role: "LED-processor-side decode" },
          { sku: "NHD-CTL-PRO", quantity: 1, role: "NetworkHD controller" },
          avoipSwitchItem,
        ],
      };
    }

    if (args.qualityProfile === "premium") {
      addAvoipNetworkWarnings(warnings, args.qualityProfile);
      addLatencyGuidance(warnings, args.qualityProfile, args.mode);
      addUsbBandwidthGuidance(warnings, args.qualityProfile);
      return {
        title: "600-series single-canvas LED feed",
        summary: "Premium zero-latency style handoff for LED processor inputs where quality and responsiveness are critical.",
        outputTopology: "1x1 signal output to LED processor",
        warnings,
        items: [
          { sku: "NHD-600-TRX", quantity: 1, role: "Source-side transceiver" },
          { sku: "NHD-600-TRX", quantity: 1, role: "LED-processor-side transceiver" },
          { sku: "NHD-CTL-PRO", quantity: 1, role: "NetworkHD controller" },
          avoipSwitchItem,
        ],
      };
    }

    addAvoipNetworkWarnings(warnings, args.qualityProfile);
    addLatencyGuidance(warnings, args.qualityProfile, args.mode);
    addUsbBandwidthGuidance(warnings, args.qualityProfile);
    return {
      title: "500-series single-canvas LED feed",
      summary: "Balanced-quality AVoIP handoff into the LED processor for most corporate and commercial LED walls.",
      outputTopology: "1x1 signal output to LED processor",
      warnings,
      items: [
        { sku: "NHD-500-TX", quantity: 1, role: "Source ingest" },
        { sku: "NHD-500-E-RX", quantity: 1, role: "LED-processor-side decode" },
        { sku: "NHD-CTL-PRO", quantity: 1, role: "NetworkHD controller" },
        avoipSwitchItem,
      ],
    };
  }

  if (args.qualityProfile === "premium" || args.sourceCount > 4) {
    addAvoipNetworkWarnings(warnings, "premium");
    addLatencyGuidance(warnings, "premium", args.mode);
    addUsbBandwidthGuidance(warnings, "premium");
    pushUnique(
      warnings,
      "600-series multiview uses secondary streams. Verify layout behavior if the same sources must feed more than one multiview destination."
    );
    return {
      title: "600-series multiview LED feed",
      summary: "Premium composed canvas for LED walls that need higher quality or more complex live-window layouts.",
      outputTopology: "1x1 signal output to LED processor",
      warnings: [
        ...warnings,
        `Target canvas ${args.canvasWidthPx}x${args.canvasHeightPx}px is delivered as one output.`,
      ],
      items: [
        { sku: "NHD-600-TRX", quantity: Math.max(1, args.sourceCount), role: "Source-side transceivers" },
        { sku: "NHD-600-TRX", quantity: 1, role: "Composed LED-processor feed" },
        { sku: "NHD-CTL-PRO", quantity: 1, role: "NetworkHD controller" },
        avoipSwitchItem,
      ],
    };
  }

  if (args.qualityProfile === "balanced" && args.sourceCount <= 4) {
    addAvoipNetworkWarnings(warnings, args.qualityProfile);
    addLatencyGuidance(warnings, args.qualityProfile, args.mode);
    addUsbBandwidthGuidance(warnings, args.qualityProfile);
    return {
      title: "500-series multiview LED feed",
      summary: "Higher-quality composed canvas using NetworkHD encoders and a dedicated multiview processor before the LED processor.",
      outputTopology: "1x1 signal output to LED processor",
      warnings: [
        ...warnings,
        `Target canvas ${args.canvasWidthPx}x${args.canvasHeightPx}px is delivered as one output.`,
      ],
      items: [
        { sku: "NHD-500-TX", quantity: Math.max(1, args.sourceCount), role: "Source ingest" },
        { sku: "NHD-0401-MV", quantity: 1, role: "4-input multiview compositor" },
        { sku: "NHD-CTL-PRO", quantity: 1, role: "NetworkHD controller" },
        avoipSwitchItem,
      ],
    };
  }

  addAvoipNetworkWarnings(warnings, args.qualityProfile);
  addLatencyGuidance(warnings, "cost", args.mode);
  return {
    title: "100-series multiview LED feed",
    summary: "Budget multiview composition path before the LED processor when cost matters more than latency or absolute image quality.",
    outputTopology: "1x1 signal output to LED processor",
    warnings: [
      ...warnings,
      `Target canvas ${args.canvasWidthPx}x${args.canvasHeightPx}px is delivered as one output.`,
    ],
    items: [
      { sku: "NHD-120-TX", quantity: Math.max(1, args.sourceCount), role: "Source ingest" },
      { sku: "NHD-150-RX", quantity: 1, role: "Up to 9-window multiview output" },
      { sku: "NHD-CTL-PRO", quantity: 1, role: "NetworkHD controller" },
      avoipSwitchItem,
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
  const [isNotesOpen, setIsNotesOpen] = React.useState(true);
  const [isAdvisoriesOpen, setIsAdvisoriesOpen] = React.useState(true);
  const [openProductSkus, setOpenProductSkus] = React.useState<string[]>([]);
  const [collapsedProductSkus, setCollapsedProductSkus] = React.useState<Record<string, boolean>>({});
  const [productWindowPlacements, setProductWindowPlacements] = React.useState<Record<string, ProductWindowPlacement>>({});
  const dragStateRef = React.useRef<{
    sku: string;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const highestProductWindowZ = React.useRef(40);

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

  const advisoryItems = React.useMemo(
    () => [
      ...computed.hardWarnings.map((message) => ({ tone: "critical" as const, label: "Critical", message })),
      ...computed.warnings.map((message) => ({ tone: "warning" as const, label: "Warning", message })),
    ],
    [computed.hardWarnings, computed.warnings]
  );

  const preview = React.useMemo(
    () =>
      deriveVideoWallPreview({
        displayType: draft.technology,
        rows: physicalRows,
        columns: physicalCols,
        sourceCount,
        processorPreference: computed.recommendation.title,
        processorInputMode: draft.processorInputMode,
        qualityProfile: draft.qualityProfile,
        pixelPitch: draft.ledPixelPitchMm,
        bezelMm: draft.lcdBezelMm,
        targetWidthM: computed.widthM.toFixed(2),
        targetHeightM: computed.heightM.toFixed(2),
        cabinetRows: draft.technology === "LED" ? physicalRows : undefined,
        cabinetColumns: draft.technology === "LED" ? physicalCols : undefined,
        cabinetWidthPx: draft.technology === "LED" ? toNumber(draft.ledCabinetWidthPx, selectedLedTechnologyProfile.cabinetWidthPx) : undefined,
        cabinetHeightPx: draft.technology === "LED" ? toNumber(draft.ledCabinetHeightPx, selectedLedTechnologyProfile.cabinetHeightPx) : undefined,
        cabinetWidthMm: draft.technology === "LED" ? toNumber(draft.ledCabinetWidthMm, selectedLedTechnologyProfile.cabinetWidthMm) : undefined,
        cabinetHeightMm: draft.technology === "LED" ? toNumber(draft.ledCabinetHeightMm, selectedLedTechnologyProfile.cabinetHeightMm) : undefined,
        canvasWidthPx: computed.canvasWidthPx,
        canvasHeightPx: computed.canvasHeightPx,
        outputRows,
        outputColumns: outputCols,
        lcdDriveMode: draft.lcdDriveStrategy,
        contentAspectRatio: computed.contentAspectLabel || "16:9",
      }),
    [
      computed.canvasHeightPx,
      computed.canvasWidthPx,
      computed.contentAspectLabel,
      computed.heightM,
      computed.recommendation.title,
      computed.widthM,
      draft.lcdBezelMm,
      draft.lcdDriveStrategy,
      draft.ledCabinetHeightMm,
      draft.ledCabinetHeightPx,
      draft.ledCabinetWidthMm,
      draft.ledCabinetWidthPx,
      draft.ledPixelPitchMm,
      draft.processorInputMode,
      draft.qualityProfile,
      draft.technology,
      outputCols,
      outputRows,
      physicalCols,
      physicalRows,
      selectedLedTechnologyProfile.cabinetHeightMm,
      selectedLedTechnologyProfile.cabinetHeightPx,
      selectedLedTechnologyProfile.cabinetWidthMm,
      selectedLedTechnologyProfile.cabinetWidthPx,
      sourceCount,
    ]
  );

  const isLcdDecoderPerScreen = draft.technology === "LCD" && draft.lcdDriveStrategy === "decoder-per-screen";
  const isLcdTileLoopMultiview = draft.technology === "LCD" && draft.lcdDriveStrategy === "tile-loop-multiview";
  const activeQualityTier =
    QUALITY_TIER_OPTIONS.find((item) => item.value === draft.qualityProfile) ?? QUALITY_TIER_OPTIONS[1];
  const previewWindows = React.useMemo(
    () => Array.from({ length: 6 }, (_, index) => `Window ${index + 1}`),
    []
  );
  const productPreviewRecords = React.useMemo(
    () =>
      openProductSkus
        .map((sku) => ({ sku, product: findCatalogProductBySku(sku) }))
        .filter((item): item is { sku: string; product: CatalogProduct } => Boolean(item.product)),
    [openProductSkus]
  );

  const getCenteredProductWindowPlacement = React.useCallback((index: number): ProductWindowPlacement => {
    const viewportWidth = typeof window === "undefined" ? 1360 : window.innerWidth;
    const viewportHeight = typeof window === "undefined" ? 900 : window.innerHeight;
    const width = 320;
    const height = 380;
    const offsetX = (index % 3) * 34;
    const offsetY = Math.floor(index / 3) * 30;
    const x = Math.max(20, Math.round((viewportWidth - width) / 2) - 120 + offsetX);
    const y = Math.max(112, Math.round((viewportHeight - height) / 2) - 36 + offsetY);

    highestProductWindowZ.current += 1;
    return { x, y, z: highestProductWindowZ.current };
  }, []);

  const bringProductWindowToFront = React.useCallback((sku: string) => {
    highestProductWindowZ.current += 1;
    setProductWindowPlacements((current) => {
      const placement = current[sku];
      if (!placement) return current;
      return {
        ...current,
        [sku]: {
          ...placement,
          z: highestProductWindowZ.current,
        },
      };
    });
  }, []);

  const openProductPreview = React.useCallback((sku: string) => {
    const normalized = String(sku || "").trim().toUpperCase();
    if (!normalized) return;

    setOpenProductSkus((current) => {
      if (current.includes(normalized)) {
        return current;
      }
      const next = [...current, normalized];
      setProductWindowPlacements((placements) =>
        placements[normalized]
          ? placements
          : {
              ...placements,
              [normalized]: getCenteredProductWindowPlacement(next.length - 1),
            }
      );
      return next;
    });
    setCollapsedProductSkus((current) => ({ ...current, [normalized]: false }));
    bringProductWindowToFront(normalized);
  }, [bringProductWindowToFront, getCenteredProductWindowPlacement]);

  const closeProductPreview = React.useCallback((sku: string) => {
    setOpenProductSkus((current) => current.filter((item) => item !== sku));
    setCollapsedProductSkus((current) => {
      const next = { ...current };
      delete next[sku];
      return next;
    });
    setProductWindowPlacements((current) => {
      const next = { ...current };
      delete next[sku];
      return next;
    });
  }, []);

  const toggleProductPreview = React.useCallback((sku: string) => {
    setCollapsedProductSkus((current) => ({ ...current, [sku]: !current[sku] }));
  }, []);

  const startDraggingProductWindow = React.useCallback(
    (sku: string, event: React.PointerEvent<HTMLDivElement>) => {
      if (event.target instanceof HTMLElement && event.target.closest("a, button")) {
        return;
      }

      const placement = productWindowPlacements[sku];
      if (!placement) return;

      event.preventDefault();
      bringProductWindowToFront(sku);
      dragStateRef.current = {
        sku,
        startX: event.clientX,
        startY: event.clientY,
        originX: placement.x,
        originY: placement.y,
      };
    },
    [bringProductWindowToFront, productWindowPlacements]
  );

  React.useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState) return;

      const maxX = Math.max(20, window.innerWidth - 340);
      const maxY = Math.max(88, window.innerHeight - 120);
      const nextX = Math.min(maxX, Math.max(20, dragState.originX + (event.clientX - dragState.startX)));
      const nextY = Math.min(maxY, Math.max(88, dragState.originY + (event.clientY - dragState.startY)));

      setProductWindowPlacements((current) => {
        const placement = current[dragState.sku];
        if (!placement) return current;
        return {
          ...current,
          [dragState.sku]: {
            ...placement,
            x: nextX,
            y: nextY,
          },
        };
      });
    };

    const handlePointerUp = () => {
      dragStateRef.current = null;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  const getCatalogHref = React.useCallback(
    (sku: string) => `/app/tools/catalog?sku=${encodeURIComponent(sku)}&q=${encodeURIComponent(sku)}`,
    []
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
        panelCount: displays,
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
        recommendedItems: computed.recommendation.items,
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
      recommendedItems: computed.recommendation.items,
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
    <div className="wm-dashboard wm-video-wall-page" data-page="video-wall">
      <section className="wm-dashboard__hero wm-video-wall-page__hero">
        <div className="wm-video-wall-page__hero-copy">
          <div className="wm-dashboard__eyebrow">Video Wall Wizard</div>
          <div className="wm-video-wall-page__hero-heading">
            <h1 className="wm-dashboard__title">LED / LCD video wall planner</h1>
          </div>
        </div>

        <div className="wm-video-wall-page__hero-center">
          <div className="wm-tier-picker wm-tier-picker--compact wm-video-wall-page__hero-tech-picker" aria-label="Video wall technology">
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

        <div className="wm-dashboard__heroactions">
          <button type="button" className="wm-btn wm-btn--ghost" onClick={() => nav("/app/dashboard")}>
            Dashboard
          </button>
          <button type="button" className="wm-btn wm-btn--ghost" onClick={() => nav("/app/projects")}>
            Projects
          </button>
        </div>
      </section>

      <section className="wm-page-grid-sidebar">
        <div className="wm-section-stack">
          <div className="wm-card wm-video-wall-page__card wm-video-wall-page__card--inputs">
          <div className="wm-card__title">Video wall data</div>
          <div className="wm-card__subtitle">Set the main wall geometry on one side and the signal options on the other.</div>

          <div className="wm-video-wall-page__data-columns" style={{ marginTop: 12 }}>
            <div className="wm-video-wall-page__data-section">
              <div className="wm-video-wall-page__data-section-header">
                <strong>Main video wall data</strong>
                <span>Set the physical layout and display dimensions.</span>
              </div>

              <div className="wm-form-grid wm-video-wall-page__planner-grid wm-video-wall-page__planner-grid--main">
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
                  </>
                ) : (
                  <>
                    <label className="wm-field-wrap wm-video-wall-page__field--span-2">
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

                    <label className="wm-field-wrap wm-video-wall-page__field--span-2">
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
            </div>

            <div className="wm-video-wall-page__data-section">
              <div className="wm-video-wall-page__data-section-header">
                <strong>Options</strong>
                <span>Set source, processing, and wall behavior options.</span>
              </div>

              <div className="wm-form-grid wm-video-wall-page__planner-grid wm-video-wall-page__planner-grid--options">
                <label className="wm-field-wrap">
                  <span className="wm-label">Source count</span>
                  <input className="wm-field" value={draft.sourceCount} onChange={(e) => update("sourceCount", e.target.value)} />
                </label>

                <label className="wm-field-wrap">
                  <span className="wm-label">Viewing distance (m)</span>
                  <input className="wm-field" value={draft.viewingDistanceM} onChange={(e) => update("viewingDistanceM", e.target.value)} />
                </label>

                {draft.technology === "LCD" ? (
                  <>
                    <label className="wm-field-wrap wm-video-wall-page__field--span-2">
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
                      <label className="wm-field-wrap wm-video-wall-page__field--span-2">
                        <span className="wm-label">Custom aspect ratio</span>
                        <input className="wm-field" value={draft.contentAspectCustom} onChange={(e) => update("contentAspectCustom", e.target.value)} placeholder="e.g. 48:9 or 3.5" />
                      </label>
                    ) : null}
                  </>
                ) : (
                  <>
                    <label className="wm-field-wrap wm-video-wall-page__field--span-2">
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

                    <label className="wm-field-wrap wm-video-wall-page__field--span-2">
                      <span className="wm-label">Processor input mode</span>
                      <select className="wm-field" value={draft.processorInputMode} onChange={(e) => update("processorInputMode", e.target.value as DraftState["processorInputMode"])}>
                        <option value="single-source">Single source</option>
                        <option value="multiview">Multiview</option>
                      </select>
                    </label>
                  </>
                )}
              </div>
            </div>
          </div>

          </div>

          <div className="wm-card wm-video-wall-page__card wm-video-wall-page__card--recommendation">
            <div className="wm-video-wall-page__recommendation-header">
              <div>
                <div className="wm-card__title">Product recommendation</div>
                <div className="wm-card__subtitle">Switch between Bronze, Silver, and Gold solution paths.</div>
              </div>

              <div className="wm-tier-picker wm-tier-picker--compact wm-video-wall-page__recommendation-tier-picker" aria-label="Recommendation tier">
                {QUALITY_TIER_OPTIONS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={draft.qualityProfile === item.value ? "wm-tier-btn is-active" : "wm-tier-btn"}
                    onClick={() => update("qualityProfile", item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="wm-video-wall-page__recommendation-tier-note">
              <span>{activeQualityTier.label} solution</span>
              <strong>{activeQualityTier.description}</strong>
            </div>

            {computed.recommendation.items.some((item) => item.sku === "NHD-500-E-RX") ? (
              <div className="wm-video-wall-page__recommendation-callout">
                For video wall endpoints, <strong>NHD-500-E-RX</strong> is preferred over <strong>NHD-500-RX</strong> because the extra receiver-side connections are not needed on this design.
              </div>
            ) : null}

            <div className="wm-summary-list">
              <div className="wm-summary-row"><span>Design summary</span><strong>{computed.recommendation.summary}</strong></div>
              <div className="wm-summary-row"><span>Output topology</span><strong>{computed.recommendation.outputTopology}</strong></div>
              {computed.recommendation.items.map((item) => (
                <div className="wm-summary-row" key={`${item.role}-${item.sku}`}>
                  <span>{item.role}</span>
                  {findCatalogProductBySku(item.catalogSku || item.sku) ? (
                    <strong className="wm-video-wall-page__sku-actions">
                      <button
                        type="button"
                        className="wm-video-wall-page__sku-link"
                        onClick={() => openProductPreview(item.catalogSku || item.sku)}
                      >
                        {item.sku}
                      </button>
                      <span>x{item.quantity}</span>
                    </strong>
                  ) : (
                    <strong className="wm-video-wall-page__sku-actions">
                      <span className="wm-video-wall-page__sku-static">{item.sku}</span>
                      <span>x{item.quantity}</span>
                    </strong>
                  )}
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

            <div className="wm-inline-actions action-row wm-video-wall-page__recommendation-actions">
              <button type="button" className="wm-btn wm-btn--primary" onClick={applyToActiveProject}>
                Apply To Active Project
              </button>
              <button type="button" className="wm-btn wm-btn--ghost" onClick={createProjectFromWall}>
                Create New Video Wall Project
              </button>
            </div>
          </div>
        </div>

        <div className="wm-section-stack">
          <div className="wm-video-wall-page__visual-workspace">
            <div className="wm-card wm-video-wall-page__card wm-video-wall-page__card--preview">
              <div className="wm-card__title">Preview visualisation</div>
              <div className="wm-card__subtitle">Live wall map showing physical surface, output grouping, and content fit.</div>

              <div className="wm-video-wall-preview">
                <div className="wm-video-wall-preview__frame">
                  <div
                    className={`wm-video-wall-preview__content is-${preview.contentFit}`}
                    style={{
                      width: `${preview.contentWidthPercent}%`,
                      height: `${preview.contentHeightPercent}%`,
                    }}
                  >
                    <span>{preview.contentFit === "fill" ? "Content fills wall" : preview.contentFit === "letterbox" ? "Content letterboxed" : "Content pillarboxed"}</span>
                  </div>

                  <div
                    className="wm-video-wall-preview__surface"
                    style={{
                      gridTemplateColumns: `repeat(${preview.physicalColumns}, minmax(0, 1fr))`,
                      gridTemplateRows: `repeat(${preview.physicalRows}, minmax(0, 1fr))`,
                    }}
                  >
                    {isLcdTileLoopMultiview ? (
                      <div className="wm-video-wall-preview__multiview" aria-hidden="true">
                        {previewWindows.map((label) => (
                          <span className="wm-video-wall-preview__window" key={label}>{label}</span>
                        ))}
                      </div>
                    ) : null}

                    {preview.cells.map((cell) => (
                      <div className="wm-video-wall-preview__cell" key={cell.id}>
                        <span className="wm-video-wall-preview__cell-label">{cell.label}</span>
                        <div className="wm-video-wall-preview__cell-meta">
                          {isLcdDecoderPerScreen ? (
                            <span className="wm-video-wall-preview__device">RX</span>
                          ) : null}
                          <span className="wm-video-wall-preview__cell-output">{cell.outputLabel}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {isLcdTileLoopMultiview ? (
                    <div className="wm-video-wall-preview__shared-device" aria-hidden="true">
                      <span className="wm-video-wall-preview__device">RX</span>
                      <strong>Shared multiview decoder</strong>
                    </div>
                  ) : null}
                </div>

                <div className="wm-video-wall-preview__meta">
                  <div className="wm-video-wall-preview__meta-item">
                    <span>Surface</span>
                    <strong>{preview.displayType} {preview.physicalColumns} x {preview.physicalRows}</strong>
                  </div>
                  <div className="wm-video-wall-preview__meta-item">
                    <span>Signal map</span>
                    <strong>{preview.signalColumns} x {preview.signalRows}</strong>
                  </div>
                  <div className="wm-video-wall-preview__meta-item">
                    <span>Content fit</span>
                    <strong>{preview.contentFit}</strong>
                  </div>
                  <div className="wm-video-wall-preview__meta-item">
                    <span>Processor mode</span>
                    <strong>{preview.processorMode}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="wm-card wm-video-wall-page__card wm-video-wall-page__drawer wm-video-wall-page__card--notes">
            <button
              type="button"
              className="wm-video-wall-page__drawer-toggle"
              onClick={() => setIsNotesOpen((value) => !value)}
              aria-expanded={isNotesOpen}
            >
              <span className="wm-video-wall-page__drawer-heading">
                <strong>Design notes</strong>
                <small>Mounting and install guidance saved with the wall plan.</small>
              </span>
              <span className="wm-video-wall-page__drawer-icon" aria-hidden="true">{isNotesOpen ? "-" : "+"}</span>
            </button>

            {isNotesOpen ? (
              <div className="wm-video-wall-page__drawer-body">
                <div className="wm-summary-list">
                  {notes.map((item) => (
                    <div className="wm-summary-row" key={item}>
                      <span>Note</span>
                      <strong>{item}</strong>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className={`wm-card wm-video-wall-page__card wm-video-wall-page__drawer ${computed.hardWarnings.length > 0 ? "wm-video-wall-page__card--critical" : "wm-video-wall-page__card--warnings"}`}>
            <button
              type="button"
              className="wm-video-wall-page__drawer-toggle"
              onClick={() => setIsAdvisoriesOpen((value) => !value)}
              aria-expanded={isAdvisoriesOpen}
            >
              <span className="wm-video-wall-page__drawer-heading">
                <strong>Technical advisories</strong>
                <small>Network, processor, and engineering checks before handoff.</small>
              </span>
              <span className="wm-video-wall-page__drawer-icon" aria-hidden="true">{isAdvisoriesOpen ? "-" : "+"}</span>
            </button>

            {isAdvisoriesOpen ? (
              <div className="wm-video-wall-page__drawer-body">
                <div className="wm-summary-list">
                  {advisoryItems.length > 0 ? advisoryItems.map((item) => (
                    <div className="wm-summary-row" key={`${item.label}-${item.message}`}>
                      <span>{item.label}</span>
                      <strong>{item.message}</strong>
                    </div>
                  )) : (
                    <div className="wm-summary-row">
                      <span>Status</span>
                      <strong>No current technical advisories for this wall.</strong>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {productPreviewRecords.length > 0 ? (
        <section className="wm-video-wall-page__product-layer wm-video-wall-page__product-layer--floating" aria-label="Open product previews">
          {productPreviewRecords.map(({ sku, product }, index) => {
            const isCollapsed = Boolean(collapsedProductSkus[sku]);
            const placement = productWindowPlacements[sku] || getCenteredProductWindowPlacement(index);

            return (
              <div
                className={`wm-card wm-video-wall-page__card wm-video-wall-page__product-window${isCollapsed ? " is-collapsed" : ""}`}
                key={sku}
                style={{
                  top: `${placement.y}px`,
                  left: `${placement.x}px`,
                  zIndex: placement.z,
                }}
                onMouseDown={() => bringProductWindowToFront(sku)}
              >
                <div
                  className="wm-video-wall-page__product-window-header"
                  onPointerDown={(event) => startDraggingProductWindow(sku, event)}
                >
                  <div className="wm-video-wall-page__product-window-title">
                    <span className="wm-video-wall-page__product-sku">{product.sku}</span>
                    <strong>{product.name}</strong>
                    <small>{product.family} �f�?s· {product.category}</small>
                  </div>

                  <div className="wm-video-wall-page__product-window-actions">
                    <Link className="wm-video-wall-page__product-window-link" to={getCatalogHref(product.sku)}>
                      Open in catalog
                    </Link>
                    <button
                      type="button"
                      className="wm-video-wall-page__product-window-btn"
                      onClick={() => toggleProductPreview(sku)}
                      aria-expanded={!isCollapsed}
                    >
                      {isCollapsed ? "+" : "-"}
                    </button>
                    <button
                      type="button"
                      className="wm-video-wall-page__product-window-btn"
                      onClick={() => closeProductPreview(sku)}
                      aria-label={`Close ${product.sku} preview`}
                    >
                      x
                    </button>
                  </div>
                </div>

                {!isCollapsed ? (
                  <div className="wm-video-wall-page__product-window-body">
                    <p className="wm-video-wall-page__product-summary">
                      {product.summary || product.notes || "Catalog reference preview."}
                    </p>

                    <div className="wm-video-wall-page__product-metrics">
                      <div><span>Transport</span><strong>{product.transport || "Unknown"}</strong></div>
                      <div><span>Video</span><strong>{product.video?.maxResolution || "Not set"}</strong></div>
                      <div><span>I/O</span><strong>{product.ioSummary || "Mixed I/O"}</strong></div>
                      <div><span>Reach</span><strong>{product.distance?.meters ? `${product.distance.meters}m` : product.distance?.notes || "Project-led"}</strong></div>
                    </div>

                    {(product.features || []).length > 0 ? (
                      <div className="wm-video-wall-page__product-tags">
                        {product.features?.slice(0, 4).map((feature) => (
                          <span key={feature}>{feature}</span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </section>
      ) : null}
    </div>
  );
}
