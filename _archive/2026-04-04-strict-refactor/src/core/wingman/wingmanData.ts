import { WINGMAN_FEATURES, WINGMAN_TOOLS } from "@/features/tools/toolFeatureModel";

export type WingmanProjectSummary = {
  id: string;
  title: string;
  stage: string;
  customer: string;
  summary: string;
};

export type WingmanCatalogueItem = {
  sku: string;
  family: string;
  title: string;
  note: string;
};

function safeReadJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function getWingmanFeatures() {
  return WINGMAN_FEATURES;
}

export function getWingmanTools() {
  return WINGMAN_TOOLS;
}

export function getProjects(): WingmanProjectSummary[] {
  const fromLocal = safeReadJson<WingmanProjectSummary[]>("wm_projects", []);
  if (fromLocal.length > 0) return fromLocal;

  return [
    {
      id: "proj-1",
      title: "Corporate Boardroom Refresh",
      stage: "Discovery",
      customer: "Example Client",
      summary: "High-value room upgrade with switching, USB and BYOD requirements.",
    },
    {
      id: "proj-2",
      title: "Education Lecture Space",
      stage: "Design",
      customer: "Sample University",
      summary: "Template-led teaching space with presentation, audio and room control needs.",
    },
    {
      id: "proj-3",
      title: "Reception Video Wall",
      stage: "Proposal",
      customer: "Demo Account",
      summary: "Large-format display design requiring video wall planning and proposal output.",
    },
  ];
}

export function getRecentProjectCount(): number {
  return getProjects().length;
}

export function getCatalogueItems(): WingmanCatalogueItem[] {
  const fromLocal = safeReadJson<WingmanCatalogueItem[]>("wm_catalogue_items", []);
  if (fromLocal.length > 0) return fromLocal;

  return [
    { sku: "SW-100-TX", family: "HDBaseT", title: "Transmitter", note: "Entry transport device for short-to-mid distance extension." },
    { sku: "SW-100-RX", family: "HDBaseT", title: "Receiver", note: "Matched receiver with simple room-end deployment." },
    { sku: "AVoIP-TX", family: "AVoIP", title: "Network Encoder", note: "Flexible AVoIP encoder for scalable distribution projects." },
    { sku: "AVoIP-RX", family: "AVoIP", title: "Network Decoder", note: "Network decoder for display endpoints and multizone viewing." },
    { sku: "APO-DG1", family: "Apollo", title: "Collaboration Node", note: "Workspace product for USB-C and meeting room workflows." },
  ];
}

export function getProjectStages(): string[] {
  return ["Discovery", "Design", "Proposal"];
}