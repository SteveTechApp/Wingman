import type {
  BlockDiagramEdge,
  BlockDiagramNode,
  CableScheduleItem,
  DesignBundle,
  DiscoverySeed,
  ProjectDevice,
  TemplateSeed,
  VideoWallSeed,
} from "./designTypes";

function n(v?: string, fallback = 0): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
}

function id(prefix: string, idx: number) {
  return `${prefix}-${idx}`;
}

function text(v?: string, fallback = "-") {
  return v && v.trim() ? v : fallback;
}

function inferFamilies(discovery: DiscoverySeed, template?: TemplateSeed | null): string[] {
  const found = [...(discovery.recommendedFamilies ?? []), ...(template?.defaultFamilies ?? [])]
    .filter(Boolean)
    .map((x) => x.trim());

  return Array.from(new Set(found));
}

function defaultRouteLength(discovery: DiscoverySeed): number {
  const longest = n(discovery.cableDistanceM, 0);
  if (longest > 0) return longest;
  return 12;
}

function shortPatch(): number {
  return 3;
}

function makeDevices(discovery: DiscoverySeed, template?: TemplateSeed | null, videoWall?: VideoWallSeed | null) {
  const sourceCount = Math.max(1, n(discovery.sourceCount, template ? template.starterDevices.filter(x => x.role === "source").length : 1));
  const displayCount = Math.max(1, n(discovery.displayCount, template ? template.starterDevices.filter(x => x.role === "display").length : 1));
  const families = inferFamilies(discovery, template);
  const devices: ProjectDevice[] = [];

  for (let i = 1; i <= sourceCount; i++) {
    devices.push({
      id: id("src", i),
      name: `Source ${i}`,
      role: "source",
      location: text(discovery.sourceLocation, "Table / Rack"),
      ports: [{ id: "hdmi-out", name: "HDMI Out", kind: "HDMI", direction: "out" }],
    });
  }

  for (let i = 1; i <= displayCount; i++) {
    devices.push({
      id: id("disp", i),
      name: displayCount === 1 ? "Primary Display" : `Display ${i}`,
      role: "display",
      location: text(discovery.displayLocation, "Display Wall"),
      ports: [{ id: "video-in", name: "Video In", kind: "HDMI", direction: "in" }],
    });
  }

  if (families.includes("AVoIP")) {
    devices.push({
      id: "net-1",
      name: "AV Network Switch",
      role: "network",
      manufacturer: "WyreStorm",
      family: "AVoIP",
      location: "Rack",
      ports: [{ id: "lan", name: "LAN", kind: "LAN", direction: "bidirectional" }],
    });
  } else {
    devices.push({
      id: "core-1",
      name: families.includes("Apollo") ? "Apollo Core" : families.includes("Matrix") ? "Matrix Core" : "Switching Core",
      role: "switcher",
      manufacturer: "WyreStorm",
      family: families.join(" / "),
      location: text(discovery.rackLocation, "Rack"),
      ports: [
        { id: "hdmi-in", name: "HDMI In", kind: "HDMI", direction: "in" },
        { id: "video-out", name: "Video Out", kind: families.includes("HDBaseT") ? "HDBaseT" : "HDMI", direction: "out" },
      ],
    });
  }

  if (videoWall && videoWall.rows * videoWall.columns > 1) {
    devices.push({
      id: "vw-1",
      name: "Video Wall Processor",
      role: "processor",
      manufacturer: "WyreStorm / 3rd Party",
      family: "Video Wall",
      location: "Rack",
      ports: [{ id: "video-in", name: "Video In", kind: "HDMI", direction: "in" }],
    });
  }

  if ((discovery.usbNeeds ?? "").toLowerCase().includes("usb")) {
    devices.push({
      id: "usb-1",
      name: "USB Peripheral Group",
      role: "usb",
      location: "Table / Display",
      ports: [{ id: "usb", name: "USB", kind: "USB 3.x", direction: "bidirectional" }],
    });
  }

  if ((discovery.audioNeeds ?? "").toLowerCase().includes("dante") || (discovery.audioNeeds ?? "").toLowerCase().includes("micro")) {
    devices.push({
      id: "audio-1",
      name: "Audio / DSP Endpoint",
      role: "audio",
      location: "Rack / Room",
      ports: [{ id: "audio", name: "Audio", kind: "Audio", direction: "bidirectional" }],
    });
  }

  if ((discovery.controlNeeds ?? "").toLowerCase() !== "none" && (discovery.controlNeeds ?? "").trim()) {
    devices.push({
      id: "ctrl-1",
      name: "Control Endpoint",
      role: "control",
      location: "Rack / Table",
      ports: [{ id: "control", name: "Control", kind: "RS-232", direction: "bidirectional" }],
    });
  }

  return { devices, families, sourceCount, displayCount };
}

function addCable(items: CableScheduleItem[], next: CableScheduleItem) {
  items.push(next);
}

function buildCables(
  discovery: DiscoverySeed,
  template: TemplateSeed | null | undefined,
  videoWall: VideoWallSeed | null | undefined,
  devices: ProjectDevice[],
  families: string[],
  sourceCount: number,
  displayCount: number,
) {
  const items: CableScheduleItem[] = [];
  const longest = defaultRouteLength(discovery);
  const short = shortPatch();

  const coreId = devices.find(x => x.id === "core-1")?.id;
  const netId = devices.find(x => x.id === "net-1")?.id;
  const wallId = devices.find(x => x.id === "vw-1")?.id;
  const usbId = devices.find(x => x.id === "usb-1")?.id;
  const audioId = devices.find(x => x.id === "audio-1")?.id;
  const ctrlId = devices.find(x => x.id === "ctrl-1")?.id;

  for (let i = 1; i <= sourceCount; i++) {
    if (netId) {
      addCable(items, {
        id: `c-src-net-${i}`,
        fromDeviceId: `src-${i}`,
        fromPort: "HDMI Out",
        toDeviceId: netId,
        toPort: "LAN",
        signalType: "video",
        cableType: "Category Cable",
        connectorA: "HDMI",
        connectorB: "RJ45",
        estimatedLengthM: short,
        quantity: 1,
        routeNote: "Source to encoder / network entry",
        assumption: "AVoIP workflow assumed",
      });
    } else if (coreId) {
      addCable(items, {
        id: `c-src-core-${i}`,
        fromDeviceId: `src-${i}`,
        fromPort: "HDMI Out",
        toDeviceId: coreId,
        toPort: "HDMI In",
        signalType: "video",
        cableType: "HDMI Cable",
        connectorA: "HDMI",
        connectorB: "HDMI",
        estimatedLengthM: short,
        quantity: 1,
        routeNote: "Source to core",
      });
    }
  }

  for (let i = 1; i <= displayCount; i++) {
    if (wallId) {
      addCable(items, {
        id: `c-wall-disp-${i}`,
        fromDeviceId: wallId,
        fromPort: "Video In",
        toDeviceId: `disp-${i}`,
        toPort: "Video In",
        signalType: "video",
        cableType: "HDMI / Display Interconnect",
        connectorA: "HDMI",
        connectorB: "HDMI",
        estimatedLengthM: short,
        quantity: 1,
        routeNote: "Processor to display leg",
      });
      continue;
    }

    if (netId) {
      addCable(items, {
        id: `c-net-disp-${i}`,
        fromDeviceId: netId,
        fromPort: "LAN",
        toDeviceId: `disp-${i}`,
        toPort: "Video In",
        signalType: "video",
        cableType: "Category Cable",
        connectorA: "RJ45",
        connectorB: "RJ45 / Decoder",
        estimatedLengthM: longest,
        quantity: 1,
        routeNote: "AV network to display endpoint",
        assumption: "Decoder endpoint implied",
      });
    } else if (families.includes("HDBaseT")) {
      addCable(items, {
        id: `c-core-disp-${i}`,
        fromDeviceId: coreId ?? "core-1",
        fromPort: "Video Out",
        toDeviceId: `disp-${i}`,
        toPort: "Video In",
        signalType: "video",
        cableType: "Cat6 / HDBaseT",
        connectorA: "RJ45",
        connectorB: "RJ45 / RX",
        estimatedLengthM: longest,
        quantity: 1,
        routeNote: "Rack to display route",
        assumption: "Receiver endpoint implied at display",
      });
    } else {
      addCable(items, {
        id: `c-core-disp-${i}`,
        fromDeviceId: coreId ?? "core-1",
        fromPort: "Video Out",
        toDeviceId: `disp-${i}`,
        toPort: "Video In",
        signalType: "video",
        cableType: "HDMI Cable",
        connectorA: "HDMI",
        connectorB: "HDMI",
        estimatedLengthM: longest,
        quantity: 1,
        routeNote: "Core to display route",
      });
    }
  }

  if (wallId && coreId) {
    addCable(items, {
      id: "c-core-wall",
      fromDeviceId: coreId,
      fromPort: "Video Out",
      toDeviceId: wallId,
      toPort: "Video In",
      signalType: "video",
      cableType: "HDMI / Processor Feed",
      connectorA: "HDMI",
      connectorB: "HDMI",
      estimatedLengthM: short,
      quantity: 1,
      routeNote: "Core to processor",
    });
  } else if (wallId && netId) {
    addCable(items, {
      id: "c-net-wall",
      fromDeviceId: netId,
      fromPort: "LAN",
      toDeviceId: wallId,
      toPort: "Video In",
      signalType: "video",
      cableType: "Category Cable",
      connectorA: "RJ45",
      connectorB: "RJ45 / Network Uplink",
      estimatedLengthM: short,
      quantity: 1,
      routeNote: "Network to wall processor",
    });
  }

  if (usbId && coreId) {
    addCable(items, {
      id: "c-usb-core",
      fromDeviceId: usbId,
      fromPort: "USB",
      toDeviceId: coreId,
      toPort: "HDMI In",
      signalType: "usb",
      cableType: "USB Extension / USB-C",
      connectorA: "USB",
      connectorB: "USB",
      estimatedLengthM: longest > 5 ? longest : 5,
      quantity: 1,
      routeNote: "USB transport path",
      assumption: "Dedicated USB extension may be required",
    });
  }

  if (audioId && coreId) {
    addCable(items, {
      id: "c-core-audio",
      fromDeviceId: coreId,
      fromPort: "Video Out",
      toDeviceId: audioId,
      toPort: "Audio",
      signalType: "audio",
      cableType: "Audio / DSP Interconnect",
      connectorA: "Audio",
      connectorB: "Audio",
      estimatedLengthM: short,
      quantity: 1,
      routeNote: "Core to audio chain",
    });
  }

  if (ctrlId && coreId) {
    addCable(items, {
      id: "c-ctrl-core",
      fromDeviceId: ctrlId,
      fromPort: "Control",
      toDeviceId: coreId,
      toPort: "Control",
      signalType: "control",
      cableType: "Control Cable",
      connectorA: "RS-232 / LAN",
      connectorB: "RS-232 / LAN",
      estimatedLengthM: short,
      quantity: 1,
      routeNote: "Control integration path",
    });
  }

  return items;
}

function buildDiagram(devices: ProjectDevice[], cables: CableScheduleItem[]) {
  const nodes: BlockDiagramNode[] = devices.map((d) => ({
    id: d.id,
    label: d.name,
    kind: d.role,
    zone: d.location,
  }));

  const edges: BlockDiagramEdge[] = cables.map((c) => ({
    id: c.id,
    source: c.fromDeviceId,
    target: c.toDeviceId,
    label: `${c.signalType.toUpperCase()} - ${c.cableType}`,
    signalType: c.signalType,
  }));

  return { nodes, edges };
}

export function buildDesignBundle(
  discovery: DiscoverySeed,
  template?: TemplateSeed | null,
  videoWall?: VideoWallSeed | null,
): DesignBundle {
  const assumptions: string[] = [];
  const { devices, families, sourceCount, displayCount } = makeDevices(discovery, template, videoWall);
  const cables = buildCables(discovery, template, videoWall, devices, families, sourceCount, displayCount);
  const { nodes, edges } = buildDiagram(devices, cables);

  assumptions.push(`Discovery room: ${text(discovery.roomName, "Unnamed room")}`);
  assumptions.push(`Application: ${text(discovery.applicationType, "General AV")}`);
  assumptions.push(`Estimated longest installed route: ${defaultRouteLength(discovery)}m`);
  assumptions.push(`Display count: ${displayCount}`);
  assumptions.push(`Source count: ${sourceCount}`);

  if (template) assumptions.push(`Template applied: ${template.name}`);
  if (videoWall) assumptions.push(`Video wall mode: ${videoWall.displayType} ${videoWall.rows}x${videoWall.columns}`);
  if ((discovery.usbNeeds ?? "").trim()) assumptions.push(`USB need: ${discovery.usbNeeds}`);
  if ((discovery.audioNeeds ?? "").trim()) assumptions.push(`Audio need: ${discovery.audioNeeds}`);
  if ((discovery.controlNeeds ?? "").trim()) assumptions.push(`Control need: ${discovery.controlNeeds}`);

  assumptions.push("Cable lengths are estimated and should be validated against actual containment routes.");
  assumptions.push("Allow service loops, dressing, and local patching in final install quantities.");

  return {
    discovery,
    template,
    videoWall,
    devices,
    cables,
    nodes,
    edges,
    assumptions,
  };
}