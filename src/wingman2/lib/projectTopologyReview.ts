import { normaliseProjectTopology, PROJECT_TRANSPORT_OPTIONS, type ProjectConnectionScope, type ProjectConnectionService, type ProjectDevice } from "./projectTopology";

export function projectTopologyLongestRun(value: unknown): number | undefined {
  const topology = normaliseProjectTopology(value);
  const values = topology.connections
    .map((item) => item.lengthMetres)
    .filter((item): item is number => typeof item === "number" && Number.isFinite(item));
  return values.length ? Math.max(...values) : undefined;
}

export type ProjectTopologyDistanceSummary = {
  localPatchMaxMetres?: number;
  endpointRouteMaxMetres?: number;
  infrastructureMaxMetres?: number;
};

export function projectTopologyDistanceSummary(value: unknown): ProjectTopologyDistanceSummary {
  const topology = normaliseProjectTopology(value);
  const maximum = (scope: ProjectConnectionScope) => {
    const lengths = topology.connections
      .filter((connection) => connection.scope === scope && connection.lengthMode !== "unknown")
      .map((connection) => connection.lengthMetres)
      .filter((length): length is number => typeof length === "number" && Number.isFinite(length));
    return lengths.length ? Math.max(...lengths) : undefined;
  };
  return {
    localPatchMaxMetres: maximum("local-patch"),
    endpointRouteMaxMetres: maximum("endpoint-route"),
    infrastructureMaxMetres: maximum("infrastructure"),
  };
}

export function projectTopologyConnectionTypes(value: unknown): string[] {
  const topology = normaliseProjectTopology(value);
  const labelByValue = new Map(PROJECT_TRANSPORT_OPTIONS.map((item) => [item.value, item.label]));
  return Array.from(new Set(topology.connections.map((item) => labelByValue.get(item.transport) ?? item.transport)));
}

export function projectTopologyNetworkSummary(value: unknown): string {
  const topology = normaliseProjectTopology(value);
  const networkConnections = topology.connections.filter((item) =>
    ["ip-av-vlan", "shared-ip-network", "point-to-point-network", "dante-aes67"].includes(item.transport),
  );
  if (!networkConnections.length) return "No network transport currently indicated";
  return networkConnections.some((item) => item.transport === "ip-av-vlan")
    ? "Dedicated or governed AV-over-IP VLAN indicated"
    : "Customer/shared network transport indicated";
}

export function projectTopologySummary(value: unknown): string {
  const topology = normaliseProjectTopology(value);
  if (!topology.devices.length) return "Locations and connections not captured";
  const longest = projectTopologyLongestRun(topology);
  const estimated = topology.connections.filter((item) => item.lengthMode === "estimated").length;
  const unknown = topology.connections.filter((item) => item.lengthMode === "unknown").length;
  return [
    `${topology.devices.length} devices across ${topology.locations.length} locations`,
    `${topology.connections.length} defined connections`,
    longest !== undefined ? `longest recorded run ${longest} m` : "lengths not yet confirmed",
    estimated ? `${estimated} estimated` : "",
    unknown ? `${unknown} unknown` : "",
  ].filter(Boolean).join("; ");
}

export function projectTopologyMissingInformation(value: unknown): string[] {
  const topology = normaliseProjectTopology(value);
  const missing: string[] = [];
  if (!topology.devices.length) missing.push("Add the sources, processing devices and destinations required by this room.");
  if (!topology.connections.length && topology.devices.length) missing.push("Define the signal routes between the required endpoints and any processing devices.");
  if (topology.devices.some((item) => !item.locationId || item.status === "unknown")) {
    missing.push("Confirm the location and identity of devices still marked unknown.");
  }
  if (topology.devices.some((item) => !item.ownership || item.ownership === "unassigned")) {
    missing.push("Assign an owner for equipment still marked unassigned.");
  }
  if (topology.devices.some((item) => !item.signalRole)) {
    missing.push("Classify each device as a source, processor, destination, infrastructure or other item so the signal design can be reviewed end to end.");
  }
  const sources = topology.devices.filter((item) => item.signalRole === "source");
  const destinations = topology.devices.filter((item) => item.signalRole === "destination");
  if (sources.some((item) => !item.ports?.some((port) => port.direction === "output"))) {
    missing.push("Confirm the output interfaces and signal services for each source.");
  }
  if (destinations.some((item) => !item.ports?.some((port) => port.direction === "input"))) {
    missing.push("Confirm the input interfaces and signal services for each destination.");
  }
  if (topology.devices.some((item) => item.ports?.some((port) => port.status === "unknown"))) {
    missing.push("Confirm interface details that are still marked unknown.");
  }
  if (topology.devices.some((item) => item.ports?.some((port) => port.status === "assumed"))) {
    missing.push("Validate assumed interface details against product documentation or the installed equipment.");
  }
  if (topology.devices.some((item) => item.ports?.some((port) => !port.connector || !port.services.length))) {
    missing.push("Record the connector or protocol and carried services for each declared interface, or mark the details to confirm.");
  }
  const deviceById = new Map(topology.devices.map((item) => [item.id, item]));
  const unitLabel = (device: ProjectDevice, unit: number) => device.quantity > 1 ? `${device.name} unit ${unit}` : device.name;
  const validUnit = (device: ProjectDevice | undefined, unit: number) => Boolean(device && Number.isInteger(unit) && unit >= 1 && unit <= device.quantity);
  if (topology.connections.some((connection) => {
    const source = deviceById.get(connection.fromDeviceId);
    const destination = deviceById.get(connection.toDeviceId);
    const sourcePort = source?.ports?.find((port) => port.id === connection.fromPort);
    const destinationPort = destination?.ports?.find((port) => port.id === connection.toPort);
    return Boolean(
      !sourcePort || sourcePort.direction !== "output"
      || !destinationPort || destinationPort.direction !== "input",
    );
  })) {
    missing.push("Select a declared output on each source device and a declared input on each receiving device.");
  }
  if (topology.connections.some((connection) => {
    const source = deviceById.get(connection.fromDeviceId);
    const destination = deviceById.get(connection.toDeviceId);
    const sourcePort = source?.ports?.find((port) => port.id === connection.fromPort);
    const destinationPort = destination?.ports?.find((port) => port.id === connection.toPort);
    return connection.services.some((service) => Boolean(
      (sourcePort?.services.length && !sourcePort.services.includes(service))
      || (destinationPort?.services.length && !destinationPort.services.includes(service)),
    ));
  })) {
    missing.push("Review routes that request a service not declared on a selected source or receiving interface.");
  }
  if (topology.connections.some((item) => !item.services.length)) {
    missing.push("Confirm what each route carries, such as video, audio, USB, control or network traffic.");
  }
  if (topology.connections.some((item) => item.status === "unknown")) {
    missing.push("Review routes that are still marked to confirm.");
  }
  if (topology.connections.some((item) => item.transport === "unknown")) {
    missing.push("Confirm the transport type for connections still marked unknown.");
  }
  if (topology.connections.some((item) => item.lengthMode === "unknown")) {
    missing.push("Confirm cable-route lengths currently marked unknown.");
  }
  if (topology.connections.some((item) => item.lengthMode === "estimated")) {
    missing.push("Validate estimated cable lengths against the installed route before final quoting.");
  }
  if (topology.connections.some((item) => item.lengthMode !== "unknown" && item.lengthMetres === undefined)) {
    missing.push("Record the estimated or measured length for each route marked estimated or confirmed.");
  }
  topology.connections.forEach((connection) => {
    const from = deviceById.get(connection.fromDeviceId);
    const to = deviceById.get(connection.toDeviceId);
    const fromUnit = connection.fromUnit ?? 1;
    const toUnit = connection.toUnit ?? 1;
    if (!validUnit(from, fromUnit) || !validUnit(to, toUnit)) {
      missing.push(`Route ${from?.name ?? connection.fromDeviceId} unit ${fromUnit} to ${to?.name ?? connection.toDeviceId} unit ${toUnit} refers to a unit outside the recorded equipment quantity.`);
    }
  });

  const requirements = topology.signalRequirements ?? [];
  if (sources.length && destinations.length && !requirements.length) {
    missing.push("Define which sources must reach which destinations and what services each path must carry.");
  }
  if (sources.length && !destinations.length) missing.push("Add or classify at least one intended destination for the recorded sources.");
  if (destinations.length && !sources.length) missing.push("Add or classify at least one intended source for the recorded destinations.");
  const firstUncoveredUnit = (deviceId: string, quantity: number, field: "from" | "to") => {
    const covered = new Set(requirements
      .filter((item) => item[`${field}DeviceId`] === deviceId)
      .map((item) => item[`${field}Unit`])
      .filter((unit) => Number.isInteger(unit) && unit >= 1 && unit <= quantity));
    if (covered.size >= quantity) return undefined;
    const sorted = [...covered].sort((left, right) => left - right);
    let next = 1;
    for (const unit of sorted) {
      if (unit === next) next += 1;
      else if (unit > next) break;
    }
    return next;
  };
  if (requirements.length) {
    for (const source of sources) {
      const unit = firstUncoveredUnit(source.id, source.quantity, "from");
      if (unit) missing.push(`Choose at least one destination and required service for ${unitLabel(source, unit)} and every other source unit not yet mapped.`);
    }
    for (const destination of destinations) {
      const unit = firstUncoveredUnit(destination.id, destination.quantity, "to");
      if (unit) missing.push(`Choose at least one intended source and required service for ${unitLabel(destination, unit)} and every other destination unit not yet mapped.`);
    }
  }
  const hasServicePath = (fromDeviceId: string, fromUnit: number, toDeviceId: string, toUnit: number, service: ProjectConnectionService) => {
    const start = `${fromDeviceId}\u001f${fromUnit}`;
    const target = `${toDeviceId}\u001f${toUnit}`;
    const visited = new Set<string>([start]);
    const pending = [start];
    while (pending.length) {
      const current = pending.shift()!;
      if (current === target) return true;
      for (const connection of topology.connections) {
        const fromDevice = deviceById.get(connection.fromDeviceId);
        const toDevice = deviceById.get(connection.toDeviceId);
        const fromUnit = connection.fromUnit ?? 1;
        const toUnit = connection.toUnit ?? 1;
        if (`${connection.fromDeviceId}\u001f${fromUnit}` !== current
          || !validUnit(fromDevice, fromUnit)
          || !validUnit(toDevice, toUnit)
          || !connection.services.includes(service)) continue;
        const next = `${connection.toDeviceId}\u001f${toUnit}`;
        if (!visited.has(next)) {
          visited.add(next);
          pending.push(next);
        }
      }
    }
    return false;
  };
  requirements.forEach((requirement) => {
    const from = deviceById.get(requirement.fromDeviceId);
    const to = deviceById.get(requirement.toDeviceId);
    if (!from || !to) {
      missing.push(`Required signal path ${requirement.id} refers to equipment that is no longer in the room inventory.`);
      return;
    }
    if (from.signalRole !== "source" || to.signalRole !== "destination") {
      missing.push(`Required signal path ${requirement.id} must start at a source and end at a destination.`);
    }
    if (from.id === to.id) {
      missing.push(`Required signal path ${requirement.id} must connect different source and destination equipment.`);
      return;
    }
    if (!validUnit(from, requirement.fromUnit) || !validUnit(to, requirement.toUnit)) {
      missing.push(`Required signal path ${unitLabel(from, requirement.fromUnit)} to ${unitLabel(to, requirement.toUnit)} refers to a unit outside the recorded equipment quantity.`);
      return;
    }
    if (!requirement.services.length) {
      missing.push(`Choose at least one required signal service for ${unitLabel(from, requirement.fromUnit)} to ${unitLabel(to, requirement.toUnit)}.`);
      return;
    }
    for (const service of requirement.services) {
      if (!hasServicePath(from.id, requirement.fromUnit, to.id, requirement.toUnit, service)) {
        missing.push(`No recorded route carries ${service} from ${unitLabel(from, requirement.fromUnit)} to ${unitLabel(to, requirement.toUnit)}.`);
      }
    }
  });
  if (topology.devices.some((device) => {
    if (device.signalRole !== "processor") return false;
    const incomingUnits = new Set(topology.connections
      .filter((connection) => connection.toDeviceId === device.id && validUnit(device, connection.toUnit ?? 1))
      .map((connection) => connection.toUnit ?? 1));
    const outgoingUnits = new Set(topology.connections
      .filter((connection) => connection.fromDeviceId === device.id && validUnit(device, connection.fromUnit ?? 1))
      .map((connection) => connection.fromUnit ?? 1));
    return incomingUnits.size < device.quantity || outgoingUnits.size < device.quantity;
  })) {
    missing.push("Connect each physical processing unit to an upstream device and a downstream device.");
  }
  if (topology.connections.some((item) => item.services.includes("usb-3") && (item.lengthMetres ?? 0) > 3 && item.transport === "usb-data")) {
    missing.push("Validate the high-bandwidth USB 3.x extension method; the current direct USB path exceeds the planning allowance.");
  }
  if (topology.connections.some((item) => item.transport === "ip-av-vlan" || item.transport === "shared-ip-network")) {
    missing.push("Confirm network ownership, switch suitability, multicast/IGMP, bandwidth and VLAN policy with IT.");
  }
  // WINGMAN_DISCOVERY_UC_MISSING_INFORMATION_START
  if (
    topology.devices.some(
      (item) => item.id === "device-uc-host-tbc",
    )
  ) {
    missing.push(
      "Confirm whether conferencing is hosted by a user laptop, room PC or UC appliance.",
    );
  }

  if (
    topology.devices.some(
      (item) => item.id === "device-room-microphone",
    )
  ) {
    missing.push(
      "Confirm microphone type, quantity, connection method, DSP and echo-cancellation requirements.",
    );
  }

  if (
    topology.devices.some(
      (item) => item.id === "device-recording-capture",
    )
  ) {
    missing.push(
      "Confirm the recording or streaming platform, capture inputs, audio mix, resolution and destination.",
    );
  }

  if (
    topology.devices.some(
      (item) => item.id === "device-camera-routing-bridge",
    )
  ) {
    missing.push(
      "Confirm whether camera distribution uses USB, HDMI, NDI or AV-over-IP and select the required bridge or routing path.",
    );
  }

  if (
    topology.devices.some(
      (item) => item.id === "device-network-video-source",
    )
  ) {
    missing.push(
      "Confirm the network video format, network ownership, routing destination and encoder/decoder or bridge dependency.",
    );
  }
  // WINGMAN_DISCOVERY_UC_MISSING_INFORMATION_END

  return Array.from(new Set(missing));
}

export function projectTopologyEvidenceLines(value: unknown): string[] {
  const topology = normaliseProjectTopology(value);
  const locationById = new Map(topology.locations.map((item) => [item.id, item.name]));
  const deviceById = new Map(topology.devices.map((item) => [item.id, item]));
  const portName = (device: ProjectDevice | undefined, portId: string | undefined) =>
    device?.ports?.find((port) => port.id === portId)?.name;
  const unitName = (device: ProjectDevice | undefined, unit: number) =>
    `${device?.name ?? "Equipment to confirm"}${device && device.quantity > 1 ? ` · unit ${unit}` : ""}`;
  const transportLabel = new Map(PROJECT_TRANSPORT_OPTIONS.map((item) => [item.value, item.label]));
  return topology.connections.map((connection) => {
    const from = deviceById.get(connection.fromDeviceId);
    const to = deviceById.get(connection.toDeviceId);
    const length = connection.lengthMode === "unknown"
      ? "length unknown"
      : connection.lengthMetres === undefined
        ? `length value to confirm (${connection.lengthMode})`
        : `${connection.lengthMetres} m ${connection.lengthMode}`;
    return [
      `${unitName(from, connection.fromUnit ?? 1)}${portName(from, connection.fromPort) ? ` · ${portName(from, connection.fromPort)}` : " · output to confirm"} (${locationById.get(from?.locationId ?? "") ?? "unknown location"})`,
      "to",
      `${unitName(to, connection.toUnit ?? 1)}${portName(to, connection.toPort) ? ` · ${portName(to, connection.toPort)}` : " · input to confirm"} (${locationById.get(to?.locationId ?? "") ?? "unknown location"})`,
      transportLabel.get(connection.transport) ?? connection.transport,
      connection.services.length ? connection.services.join(" + ") : "service to confirm",
      length,
      `route ${connection.status}`,
    ].join(" | ");
  });
}

export function projectTopologySignalRequirementLines(value: unknown): string[] {
  const topology = normaliseProjectTopology(value);
  const devices = new Map(topology.devices.map((device) => [device.id, device]));
  const describe = (device: ProjectDevice | undefined, unit: number) =>
    `${device?.name ?? "Equipment to confirm"}${device && device.quantity > 1 ? ` · unit ${unit}` : ""}`;
  return (topology.signalRequirements ?? []).map((requirement) => [
    `${describe(devices.get(requirement.fromDeviceId), requirement.fromUnit)} → ${describe(devices.get(requirement.toDeviceId), requirement.toUnit)}`,
    requirement.services.length ? requirement.services.join(" + ") : "required service to confirm",
  ].join(" | "));
}

function mermaidId(value: string): string {
  const clean = value.replace(/[^a-zA-Z0-9_]/g, "_");
  return /^[A-Za-z_]/.test(clean) ? clean : `node_${clean}`;
}

function mermaidLabel(value: string): string {
  return value.replace(/["[\]{}|]/g, " ").replace(/\s+/g, " ").trim();
}

export function projectTopologyToMermaid(value: unknown): string {
  const topology = normaliseProjectTopology(value);
  const transportLabel = new Map(PROJECT_TRANSPORT_OPTIONS.map((item) => [item.value, item.label]));
  const lines = ["flowchart LR"];
  topology.locations.forEach((location) => {
    lines.push(`  subgraph ${mermaidId(`location_${location.id}`)}["${mermaidLabel(location.name)}"]`);
    topology.devices.filter((device) => device.locationId === location.id).forEach((device) => {
      lines.push(`    ${mermaidId(device.id)}["${mermaidLabel(device.name)}"]`);
    });
    lines.push("  end");
  });
  topology.connections.forEach((connection) => {
    const length = connection.lengthMode === "unknown"
      ? "length TBC"
      : connection.lengthMetres === undefined ? `length TBC (${connection.lengthMode})` : `${connection.lengthMetres}m ${connection.lengthMode}`;
    const from = topology.devices.find((device) => device.id === connection.fromDeviceId);
    const to = topology.devices.find((device) => device.id === connection.toDeviceId);
    const fromPort = from?.ports?.find((port) => port.id === connection.fromPort)?.name ?? "output TBC";
    const toPort = to?.ports?.find((port) => port.id === connection.toPort)?.name ?? "input TBC";
    const services = connection.services.length ? connection.services.join(" + ") : "service TBC";
    const fromUnit = from && from.quantity > 1 ? `unit ${connection.fromUnit ?? 1} ` : "";
    const toUnit = to && to.quantity > 1 ? `unit ${connection.toUnit ?? 1} ` : "";
    const label = `${fromUnit}${fromPort} → ${toUnit}${toPort}; ${services}; ${transportLabel.get(connection.transport) ?? connection.transport}; ${length}`;
    lines.push(`  ${mermaidId(connection.fromDeviceId)} -->|"${mermaidLabel(label)}"| ${mermaidId(connection.toDeviceId)}`);
  });
  return lines.join("\n");
}

