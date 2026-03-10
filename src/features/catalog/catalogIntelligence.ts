import type { WingmanProjectState } from "@/core/workflow/projectState";

export type CatalogRecommendation = {
  family: string;
  reason: string;
  products: Array<{
    sku: string;
    name: string;
    role: string;
  }>;
};

export type CatalogIntelligence = {
  primaryFamily: string;
  reasoning: string;
  shortlist: Array<{
    sku: string;
    name: string;
    role: string;
  }>;
  nextTool: string;
  nextToolPath: string;
};

function txt(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function apolloProducts() {
  return [
    { sku: "APO-210-UC", name: "Apollo UC Switcher", role: "Room hub / collaboration" },
    { sku: "APO-100-TX", name: "Apollo Input Transmitter", role: "Local source input" },
    { sku: "APO-100-RX", name: "Apollo Receiver", role: "Display endpoint" },
  ];
}

function hdbtProducts() {
  return [
    { sku: "EX-70-H2", name: "HDBaseT Extender Set", role: "Point-to-point transport" },
    { sku: "MX-0402-HDBT", name: "HDBaseT Matrix", role: "Switching and extension" },
    { sku: "RX-HDBT-SCALER", name: "Scaled HDBaseT Receiver", role: "Display endpoint" },
  ];
}

function avoipProducts() {
  return [
    { sku: "NHD-500-TX", name: "NetworkHD Encoder", role: "Source encoder" },
    { sku: "NHD-500-RX", name: "NetworkHD Decoder", role: "Display decoder" },
    { sku: "NHD-CTL-PRO", name: "NetworkHD Controller", role: "System orchestration" },
  ];
}

function videoWallProducts() {
  return [
    { sku: "VW-PROC-4K", name: "Video Wall Processor", role: "Wall processing" },
    { sku: "NHD-DEC-WALL", name: "Wall Display Decoder", role: "Wall endpoint" },
    { sku: "CTRL-WALL-TOUCH", name: "Wall Control Interface", role: "Control layer" },
  ];
}

function defaultProducts() {
  return [
    { sku: "SW-0401-H2", name: "4x1 Switcher", role: "Core switching" },
    { sku: "DA-14-H2", name: "1x4 Distribution Amplifier", role: "Signal distribution" },
    { sku: "EXT-USB-H2", name: "USB / HDMI Extension", role: "Extension support" },
  ];
}

export function buildCatalogIntelligence(state: WingmanProjectState): CatalogIntelligence {
  const room = txt(state.roomType).toLowerCase();
  const app = txt(state.application).toLowerCase();
  const distance = num(state.distanceM);
  const displays = num(state.displayCount);
  const sources = num(state.sourceCount);
  const usb = txt(state.avGuide?.usb).toLowerCase();
  const videoWall = txt(state.videoWall?.wallType).toLowerCase();

  let primaryFamily = "Core AV Switching";
  let reasoning = "The current project points to a standard switching and distribution workflow.";
  let shortlist = defaultProducts();

  if (
    videoWall === "lcd" ||
    videoWall === "led" ||
    app.includes("video wall") ||
    room.includes("video wall") ||
    displays >= 4
  ) {
    primaryFamily = "Video Wall";
    reasoning = "Display count or wall-design context suggests wall processing, mapped outputs, and specialist display workflow.";
    shortlist = videoWallProducts();
  } else if (
    app.includes("teams") ||
    app.includes("meeting") ||
    room.includes("meeting")
  ) {
    primaryFamily = "Apollo";
    reasoning = "Meeting-room collaboration and room-hub workflows suggest Apollo as the strongest starting family.";
    shortlist = apolloProducts();
  } else if (sources >= 4 || displays >= 3) {
    primaryFamily = "AVoIP / NetworkHD";
    reasoning = "Higher source/display counts suggest a distributed architecture and flexible endpoint routing.";
    shortlist = avoipProducts();
  } else if (distance >= 15) {
    primaryFamily = "HDBaseT";
    reasoning = "Recorded transport distance suggests extension-led architecture and HDBaseT-style signal transport.";
    shortlist = hdbtProducts();
  } else if (usb.includes("camera") || usb.includes("byod")) {
    primaryFamily = "Apollo";
    reasoning = "USB collaboration requirements suggest a room-hub workflow is likely to be the best fit.";
    shortlist = apolloProducts();
  }

  return {
    primaryFamily,
    reasoning,
    shortlist,
    nextTool: "Proposal Builder",
    nextToolPath: "/app/tools/proposal",
  };
}
