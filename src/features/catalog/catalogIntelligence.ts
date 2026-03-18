import type { WingmanProjectState } from "@/core/workflow/projectState";
import { buildAvRecommendationFromProjectState } from "@/services/av-recommendation/engine";

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

function matrixProducts() {
  return [
    { sku: "MX-0402-H2", name: "4x2 HDMI Matrix", role: "Core routing" },
    { sku: "MX-0808-H2A", name: "8x8 HDMI Matrix", role: "Larger routed switching" },
    { sku: "SW-510-TX", name: "5-Input Presentation Switcher", role: "Presentation-led switching" },
  ];
}

function usbExtensionProducts() {
  return [
    { sku: "EX-100-KVM-TX", name: "USB / KVM Transmitter", role: "Source-side USB extension" },
    { sku: "EX-100-KVM-RX", name: "USB / KVM Receiver", role: "Display / host-side USB extension" },
    { sku: "SW-640L-TX-W", name: "Wireless USB-C Presentation Switcher", role: "USB-aware collaboration switcher" },
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

function shortlistForFamily(family: string) {
  if (family === "Apollo") return apolloProducts();
  if (family === "HDBaseT") return hdbtProducts();
  if (family === "AVoIP") return avoipProducts();
  if (family === "Matrix") return matrixProducts();
  if (family === "USB Extension") return usbExtensionProducts();
  if (family === "Video Wall") return videoWallProducts();
  return defaultProducts();
}

export function buildCatalogIntelligence(state: WingmanProjectState): CatalogIntelligence {
  const recommendation = buildAvRecommendationFromProjectState(state);

  return {
    primaryFamily: recommendation.primaryFamily,
    reasoning:
      recommendation.summaries.salesperson ||
      recommendation.whyThisAnswer[0] ||
      recommendation.advice.summary,
    shortlist: shortlistForFamily(recommendation.primaryFamily),
    nextTool: "Proposal Builder",
    nextToolPath: recommendation.advice.nextToolPath || "/app/tools/proposal",
  };
}
