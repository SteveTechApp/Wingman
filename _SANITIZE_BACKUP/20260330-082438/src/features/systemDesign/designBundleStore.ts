import type { DesignBundle } from "./designTypes";

export const DESIGN_BUNDLE_STORAGE_KEY = "wm_design_bundle_v1";

export function writeDesignBundle(bundle: DesignBundle) {
  try {
    localStorage.setItem(DESIGN_BUNDLE_STORAGE_KEY, JSON.stringify(bundle));
  } catch {
  }
}

export function readDesignBundle(): DesignBundle | null {
  try {
    const raw = localStorage.getItem(DESIGN_BUNDLE_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DesignBundle;
  } catch {
    return null;
  }
}

export function summariseDesignBundle(bundle: DesignBundle): {
  templateSummary: string;
  videoWallSummary: string;
  cableSummary: string;
  diagramSummary: string;
  proposalSummary: string;
} {
  const templateSummary = bundle.template
    ? `Template applied: ${bundle.template.name}. Default families: ${(bundle.template.defaultFamilies ?? []).join(", ") || "-"}.`
    : "No template applied.";

  const videoWallSummary = bundle.videoWall
    ? (() => {
        const wall = bundle.videoWall!;
        const outputRows = wall.outputRows ?? wall.rows;
        const outputColumns = wall.outputColumns ?? wall.columns;
        const physicalRows = wall.displayType === "LED" ? (wall.cabinetRows ?? wall.rows) : wall.rows;
        const physicalColumns = wall.displayType === "LED" ? (wall.cabinetColumns ?? wall.columns) : wall.columns;
        const canvas = wall.canvasWidthPx && wall.canvasHeightPx
          ? ` Canvas target: ${wall.canvasWidthPx}x${wall.canvasHeightPx}px.`
          : "";
        return `Video wall: ${wall.displayType} output ${outputRows} x ${outputColumns}, physical layout ${physicalRows} x ${physicalColumns}, ${wall.sourceCount} source(s), processor preference: ${wall.processorPreference}.${canvas}`;
      })()
    : "No video wall configuration stored.";

  const signalMix = Array.from(new Set(bundle.cables.map((x) => x.signalType)));
  const totalLength = bundle.cables.reduce((sum, item) => sum + (item.estimatedLengthM * item.quantity), 0);

  const cableSummary = bundle.cables.length > 0
    ? `Cable schedule includes ${bundle.cables.length} line item(s), approximately ${totalLength}m total estimated cable length, covering signal types: ${signalMix.join(", ")}.`
    : "No cable schedule generated.";

  const diagramSummary = bundle.nodes.length > 0 || bundle.edges.length > 0
    ? `Block diagram contains ${bundle.nodes.length} node(s) and ${bundle.edges.length} connection(s), representing the current interconnectivity model.`
    : "No block diagram generated.";

  const proposalSummary = [
    templateSummary,
    videoWallSummary,
    cableSummary,
    diagramSummary,
    "Design outputs are deterministic first-pass guidance and should be validated against the final device selection and route survey."
  ].join(" ");

  return {
    templateSummary,
    videoWallSummary,
    cableSummary,
    diagramSummary,
    proposalSummary,
  };
}
export function buildProposalSeedFromBundle(bundle: DesignBundle): {
  equipmentBlock: string;
  pricingNote: string;
  usedDevicesSummary: string;
} {
  const deviceLines = bundle.devices.map((d) => {
    const bits = [d.name, d.family, d.location].filter(Boolean);
    return bits.join(" - ");
  });

  const totalLength = bundle.cables.reduce((sum, item) => sum + (item.estimatedLengthM * item.quantity), 0);
  const cableCount = bundle.cables.length;
  const displayCount = bundle.devices.filter((d) => d.role === "display").length;
  const sourceCount = bundle.devices.filter((d) => d.role === "source").length;

  const pricingNote = [
    `Generated design baseline includes ${bundle.devices.length} device item(s).`,
    `Current cable schedule contains ${cableCount} line item(s) and approximately ${totalLength}m of estimated cabling.`,
    `Detected ${sourceCount} source device(s) and ${displayCount} display endpoint(s).`,
    "Final commercial pricing must be validated against actual product selection, route survey, labour scope, and regional cost basis."
  ].join(" ");

  const usedDevicesSummary = bundle.devices.length > 0
    ? bundle.devices.map((d) => `${d.name}${d.family ? ` (${d.family})` : ""}`).join(", ")
    : "No generated devices found.";

  return {
    equipmentBlock: deviceLines.join("\n"),
    pricingNote,
    usedDevicesSummary,
  };
}
