import type { ProjectDevice, ProjectLocation, ProjectLocationType } from "./projectTopology";

type DiscoverySourcePlanContext = {
  answers: Record<string, unknown>;
  notes: Record<string, string>;
  blob: string;
  rack: ProjectLocation;
  table: ProjectLocation;
  front: ProjectLocation;
  ceiling: ProjectLocation | null;
  central: ProjectLocation | null;
  localCupboard: ProjectLocation | null;
  remoteRoom: ProjectLocation | null;
  remoteBuilding: ProjectLocation | null;
  network: ProjectLocation | null;
  addLocation: (id: string, name: string, type: ProjectLocationType) => ProjectLocation;
  addDevice: (input: Omit<ProjectDevice, "id"> & { id?: string }) => ProjectDevice;
};

function list(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item ?? "").trim()).filter(Boolean);
  const output = String(value ?? "").trim();
  return output ? [output] : [];
}

function hasAnswer(answers: Record<string, unknown>, key: string, expected: string): boolean {
  return list(answers[key]).includes(expected);
}

function sourceCountFrom(value: unknown): number {
  const source = list(value).join(" ");
  if (source.includes("nine-plus")) return 4;
  if (source.includes("five-eight")) return 3;
  if (source.includes("two-four")) return 2;
  return 1;
}

export function buildDiscoverySourcePlan(context: DiscoverySourcePlanContext) {
  const {
    answers, notes, blob, rack, table, front, ceiling, central, localCupboard,
    remoteRoom, remoteBuilding, network, addLocation, addDevice,
  } = context;
  const sourceTypes = list(answers["source-connection"]);
  const sourceWorkflowTypes = list(answers["source-device-workflows"]);
  const sourcePositionNotes = `${list(answers["locations-connections"]).join(" ")} ${notes["source-device-workflows"] ?? ""} ${notes["locations-connections"] ?? ""}`.toLowerCase();
  const sourceRackLocationId = /central|comms|communications room/.test(sourcePositionNotes)
    ? central?.id ?? addLocation("location-central-rack", "Central communications room", "central-rack").id
    : localCupboard?.id ?? rack.id;
  const explicitSourceCount = Number(answers["source-count-exact"]);
  const sourceCount = Number.isInteger(explicitSourceCount) && explicitSourceCount > 0 && explicitSourceCount <= 256
    ? explicitSourceCount : sourceCountFrom(answers.sources);
  const sourceDevices: ProjectDevice[] = [];
  const unifiedCommsValues = Array.from(new Set([
    ...list(answers["uc-purpose"]),
    ...list(answers["unified-comms"]),
    ...list(answers["camera-microphone-workflow"]),
    ...list(answers["camera-microphone-workflows"]),
    ...list(answers["camera-microphone-requirements"]),
  ]));
  const noUnifiedComms =
    unifiedCommsValues.includes("no-uc");
  const unifiedCommsUnknown =
    unifiedCommsValues.includes("unknown-uc");
  const unifiedCommsInactive =
    noUnifiedComms || unifiedCommsUnknown;
  const legacyCombinedWorkflow =
    unifiedCommsValues.includes("conferencing-recording");
  const conferencingRequired =
    !unifiedCommsInactive &&
    (
      unifiedCommsValues.includes("video-conferencing") ||
      legacyCombinedWorkflow
    );
  const recordingRequired =
    !unifiedCommsInactive &&
    (
      unifiedCommsValues.includes("recording-streaming") ||
      legacyCombinedWorkflow
    );
  const liveStreamRequired = !unifiedCommsInactive && unifiedCommsValues.includes("live-stream-out");
  const cameraDistributionRequired =
    !unifiedCommsInactive &&
    unifiedCommsValues.includes("camera-distribution-only");
  const microphonesOnlyRequired =
    !unifiedCommsInactive &&
    unifiedCommsValues.includes("microphones-only");
  const cameraRequiredByUnifiedComms =
    conferencingRequired ||
    recordingRequired ||
    cameraDistributionRequired;
  const cameraCountValue = list(answers["uc-camera-count"])[0] ?? "";
  const cameraSelections = list(answers["uc-camera"]);
  const explicitNoCamera = cameraSelections.includes("no-camera-source");
  const cameraQuantity = cameraCountValue === "two-cameras"
    ? 2
    : cameraCountValue === "three-four-cameras"
      ? 4
      : cameraCountValue === "five-plus-cameras"
        ? 5
        : 1;
  const multiCameraRequired = cameraQuantity > 1;
  const multiCameraPath = list(answers["uc-multi-camera-path"])[0] ?? "";
  const ndiMultiCamera = multiCameraRequired && multiCameraPath === "multi-camera-ndi";
  const standardMultiCamera = multiCameraRequired && multiCameraPath === "multi-camera-non-ndi";
  const ndiCameraSelected = cameraSelections.includes("ndi-network-camera");

  if (
    sourceTypes.some(
      (item) =>
        item === "mixed-hdmi-usbc" ||
        item === "laptops-wireless-inputs" ||
        item === "all-source-types",
    ) ||
    sourceWorkflowTypes.includes("user-laptops") || /laptop|byod|byom|usb-c/.test(blob)
  ) {
    sourceDevices.push(addDevice({
      id: "device-user-laptop",
      name: "User laptop / BYOD source",
      category: "source",
      locationId: table.id,
      quantity: 1,
      thirdParty: true,
      status: "assumed",
    }));
  }

  if (
    sourceTypes.some(
      (item) =>
        item === "laptops-wireless-inputs" ||
        item === "all-source-types",
    ) ||
    sourceWorkflowTypes.includes("wireless-casting-source") || /wireless presentation|casting/.test(blob)
  ) {
    sourceDevices.push(addDevice({
      id: "device-wireless-receiver",
      name: "Wireless presentation receiver",
      category: "source",
      locationId: sourceRackLocationId,
      quantity: 1,
      thirdParty: true,
      status: "assumed",
    }));
  }

  if (sourceTypes.includes("network-video-sources")) {
    sourceDevices.push(addDevice({
      id: "device-local-source-tbc",
      name: "Local fixed or user presentation source TBC",
      category: "source",
      locationId: table.id,
      quantity: 1,
      thirdParty: true,
      status: "unknown",
      notes:
        "Confirm whether the local source is fixed HDMI, user HDMI, USB-C or wireless presentation.",
    }));

    sourceDevices.push(addDevice({
      id: "device-network-video-source",
      name: /ndi/.test(blob)
        ? "NDI / network video source"
        : "AV-over-IP / network video source",
      category: "network-video-source",
      locationId: remoteRoom?.id ?? remoteBuilding?.id ?? network?.id ?? central?.id ?? rack.id,
      quantity: 1,
      thirdParty: true,
      status: "assumed",
      notes:
        "Confirm the network video format, ownership, encoder/decoder or bridge requirement and routing destination.",
    }));
  }

  const workflowSourceDefinitions: Record<string, { name: string; category: string; locationId: string }> = {
    "room-pc-uc-source": { name: "Room PC / UC appliance", category: "source", locationId: sourceRackLocationId },
    "signage-media-players": { name: "Signage / media player", category: "source", locationId: sourceRackLocationId },
    "broadcast-tv-feeds": { name: "Broadcast / TV / live-event feed", category: "source", locationId: sourceRackLocationId },
    "teaching-visualisers": { name: "Lectern / visualiser / teaching source", category: "source", locationId: table.id },
    "operational-workstations": { name: "Operational workstation / dashboard", category: "source", locationId: table.id },
    "cameras-production": { name: "Camera / production feed", category: "camera", locationId: ceiling?.id ?? front.id },
    "specialist-simulation-medical": { name: "Specialist / simulation / clinical source", category: "source", locationId: table.id },
    "network-remote-feeds": { name: "Network / remote-room source feed", category: "network-video-source", locationId: remoteRoom?.id ?? remoteBuilding?.id ?? network?.id ?? central?.id ?? rack.id },
    "mobile-tablet-sources": { name: "Customer phone / tablet source", category: "source", locationId: table.id },
    "customer-existing-source": { name: "Existing customer source — identify model and interface", category: "source", locationId: sourceRackLocationId },
    "other-source": { name: "Other source — identify device and interface", category: "source", locationId: sourceRackLocationId },
  };
  sourceWorkflowTypes.forEach((value) => {
    const definition = workflowSourceDefinitions[value];
    if (!definition || sourceDevices.some((device) => device.name === definition.name)) return;
    sourceDevices.push(addDevice({
      id: `device-workflow-${value}`,
      ...definition,
      quantity: 1,
      thirdParty: true,
      status: "assumed",
      notes: [
        "Confirm quantity, interfaces, operating role, control and every destination for this application-specific source.",
        notes["source-device-workflows"] ? `Customer source details: ${notes["source-device-workflows"]}` : "",
      ].filter(Boolean).join(" "),
    }));
  });

  const fixedSourcesExpected = sourceTypes.some((item) =>
    ["fixed-hdmi-sources", "mixed-hdmi-usbc", "all-source-types"].includes(item),
  );
  const sourceProfileOpen = sourceTypes.length === 0 || sourceTypes.includes("unknown-source-connectors");
  const sourcePositionsToIdentify = Math.max(0, sourceCount - sourceDevices.length);
  const addUnspecifiedSourcePositions = fixedSourcesExpected || (sourceProfileOpen && sourceWorkflowTypes.length === 0);
  if (addUnspecifiedSourcePositions) {
    for (let index = 0; index < sourcePositionsToIdentify; index += 1) {
      const position = sourceDevices.length + index + 1;
      sourceDevices.push(addDevice({
        id: `device-unconfirmed-source-${position}`,
        name: fixedSourcesExpected
          ? `Fixed room source ${position} — model and connector to confirm`
          : `Unspecified source ${position} — type to confirm`,
        category: "source",
        locationId: sourceRackLocationId,
        quantity: 1,
        thirdParty: true,
        status: sourceProfileOpen ? "unknown" : "assumed",
        notes: "Planning placeholder only; confirm the source type, quantity, connector and physical location before product selection.",
      }));
    }
  }

  const legacyCameraSourceSelected = sourceTypes.some(
    (item) =>
      item === "cameras-ndi-network-streams" ||
      item === "all-source-types",
  );

  if (
    legacyCameraSourceSelected ||
    (!unifiedCommsInactive && !explicitNoCamera && /ndi|ptz|camera/.test(blob)) ||
    cameraRequiredByUnifiedComms ||
    (cameraSelections.length > 0 && !explicitNoCamera)
  ) {
    sourceDevices.push(addDevice({
      id: "device-camera",
      name:
        ndiMultiCamera
          ? "CAM-210-NDI-PTZ camera"
          : standardMultiCamera
            ? "CAM-420-PTZ camera"
            : ndiCameraSelected
              ? "CAM-210-NDI-PTZ NDI camera"
            : legacyCameraSourceSelected || /ndi/.test(blob)
              ? "NDI / network camera"
              : "Room camera",
      category: "camera",
      locationId: ceiling?.id ?? front.id,
      quantity: cameraQuantity,
      manufacturer: ndiMultiCamera || standardMultiCamera || ndiCameraSelected ? "WyreStorm" : undefined,
      sku: ndiMultiCamera || ndiCameraSelected ? "CAM-210-NDI-PTZ" : standardMultiCamera ? "CAM-420-PTZ" : undefined,
      thirdParty: !(ndiMultiCamera || standardMultiCamera),
      status: cameraCountValue === "unknown-camera-count" ? "unknown" : "assumed",
      notes:
        cameraRequiredByUnifiedComms
          ? "Confirm camera count, framing, USB/HDMI/NDI output and whether a camera bridge is required."
          : undefined,
    }));
  }

  if (!sourceDevices.length) {
    sourceDevices.push(addDevice({
      id: "device-source-placeholder",
      name: "Customer source TBC",
      category: "source",
      locationId: table.id,
      quantity: 1,
      thirdParty: true,
      status: "unknown",
    }));
  }

  return {
    sourceDevices,
    unifiedCommsInactive,
    conferencingRequired,
    recordingRequired,
    liveStreamRequired,
    cameraDistributionRequired,
    microphonesOnlyRequired,
    cameraRequiredByUnifiedComms,
    cameraCountValue,
    cameraQuantity,
    multiCameraRequired,
    ndiMultiCamera,
    standardMultiCamera,
    explicitNoCamera,
  };
}
