import type { WingmanShellInput, WingmanUxPipelineResult, WingmanBomItem } from "./types";

function toNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function pickPrimaryFamily(state: WingmanShellInput): string {
  const displays = toNumber(state.displayCount, 0);
  const sources = toNumber(state.sourceCount, 0);
  const distance = toNumber(state.distanceM, 0);
  const wallType = state.videoWall?.wallType?.toLowerCase() ?? "";
  const application = state.application?.toLowerCase() ?? "";

  if (wallType || application.includes("video wall") || displays >= 4) {
    return "Video Wall Solution";
  }

  if (distance > 70 || displays > 8 || sources > 8) {
    return "AV over IP";
  }

  if (sources > 1 && displays > 1) {
    return "Matrix Switching";
  }

  if (sources === 1 && displays > 1) {
    return "Splitter / Distribution";
  }

  return "Point-to-Point Extension";
}

function buildBom(state: WingmanShellInput, family: string): WingmanBomItem[] {
  const displays = Math.max(1, toNumber(state.displayCount, 1));
  const sources = Math.max(1, toNumber(state.sourceCount, 1));
  const bom: WingmanBomItem[] = [];

  if (family === "Video Wall Solution") {
    bom.push({ name: "SW-0206-VW Video Wall Processor", qty: 1 });
    bom.push({ name: "Display Endpoints / Feeds", qty: displays });
    bom.push({ name: "HDMI Interconnects", qty: displays + sources });
    return bom;
  }

  if (family === "AV over IP") {
    bom.push({ name: "Network Switch", qty: 1 });
    bom.push({ name: "AVoIP Encoders", qty: sources });
    bom.push({ name: "AVoIP Decoders", qty: displays });
    return bom;
  }

  if (family === "Matrix Switching") {
    bom.push({ name: "Matrix Switcher", qty: 1 });
    bom.push({ name: "Input Source Connections", qty: sources });
    bom.push({ name: "Display Connections", qty: displays });
    return bom;
  }

  if (family === "Splitter / Distribution") {
    bom.push({ name: "Distribution Amplifier / Splitter", qty: 1 });
    bom.push({ name: "Display Connections", qty: displays });
    return bom;
  }

  bom.push({ name: "Extender Set", qty: 1 });
  bom.push({ name: "Display Connection", qty: displays });
  return bom;
}

export async function runWingmanUxPipeline(
  state: WingmanShellInput
): Promise<WingmanUxPipelineResult> {
  const sources = Math.max(1, toNumber(state.sourceCount, 1));
  const displays = Math.max(1, toNumber(state.displayCount, 1));
  const distance = toNumber(state.distanceM, 10);
  const family = pickPrimaryFamily(state);

  const transport =
    family === "AV over IP"
      ? "1GbE / 10GbE AVoIP"
      : family === "Matrix Switching"
      ? "Direct matrix switching"
      : family === "Video Wall Solution"
      ? "Video wall processor distribution"
      : "Point-to-point extension";

  const topologyArchitecture =
    family === "Video Wall Solution"
      ? "Centralised video wall architecture"
      : family === "AV over IP"
      ? "Network-distributed AV architecture"
      : family === "Matrix Switching"
      ? "Central matrix architecture"
      : family === "Splitter / Distribution"
      ? "One-to-many distribution"
      : "Direct source-to-display path";

  const switchRecommendation =
    family === "AV over IP"
      ? "Managed multicast-capable switch recommended"
      : family === "Video Wall Solution"
      ? "Switching optional depending on source aggregation"
      : "Dedicated network switch not primary requirement";

  const bandwidthEstimate =
    family === "AV over IP"
      ? `Estimated ${Math.max(sources + displays, 2)} active AV endpoints. Confirm switch uplink and multicast policy.`
      : family === "Video Wall Solution"
      ? `Display wall with ${displays} outputs. Confirm canvas mode, scaling mode, and source composition.`
      : `Source count ${sources}, display count ${displays}, distance ${distance}m.`;

  const whyThisAnswer = [
    `Project profile suggests ${family.toLowerCase()}.`,
    `Source count: ${sources}.`,
    `Display count: ${displays}.`,
    `Distance: ${distance}m.`,
  ];

  const whatsMissing = [
    "Confirm control requirements.",
    "Confirm USB and audio breakaway needs.",
    "Confirm rack location and cable routes.",
  ];

  const suggestedBom = buildBom(state, family);

  const links = Array.from({ length: Math.max(sources, displays) }).map((_, i) => ({
    from: `Source ${Math.min(i + 1, sources)}`,
    to: `Display ${Math.min(i + 1, displays)}`,
    label: transport,
  }));

  const proposalSummary =
    `${family} recommended for ${state.projectName ?? "this project"} ` +
    `with ${sources} source(s) and ${displays} display(s).`;

  return {
    recommendation: {
      primaryFamily: family,
      confidenceLabel: "Provisional",
      whyThisAnswer,
      whatsMissing,
      context: {
        application: state.application,
        roomType: state.roomType,
      },
      summaries: {
        proposal: proposalSummary,
      },
    },
    topology: {
      architecture: topologyArchitecture,
      bandwidthEstimate,
      transport,
      switchRecommendation,
    },
    signalPath: {
      links,
    },
    room: {
      nextTool: family === "Video Wall Solution" ? "Video Wall Planner" : "Proposal Builder",
      suggestedBom,
    },
    proposal: {
      title: `${state.customer ?? "Customer"} Proposal Draft`,
      sections: [
        {
          title: "Recommended Architecture",
          body: proposalSummary,
        },
        {
          title: "Topology Notes",
          body: bandwidthEstimate,
        },
        {
          title: "Commercial Scope",
          body: "Confirm final product selection, accessories, mounting, and commissioning scope.",
        },
      ],
    },
  };
}