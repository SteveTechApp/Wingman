import { describe, expect, it } from "vitest";
import {
  createBlankProjectTopology,
  generateProjectTopologyFromDiscovery,
  normaliseProjectTopology,
  type ProjectTopology,
} from "./projectTopology";
import { ROUTE_PLANNING_MARKER, projectTopologySurveyState } from "./projectTopologyPlanning";
import {
  projectTopologyConnectionTypes,
  projectTopologyLongestRun,
  projectTopologyMissingInformation,
  projectTopologyDistanceSummary,
  projectTopologySignalRequirementLines,
  projectTopologyToMermaid,
} from "./projectTopologyReview";

function topologyWithPlanningMarker(
  marker: Record<string, unknown>,
  connections: ProjectTopology["connections"],
): ProjectTopology {
  const base = createBlankProjectTopology();
  return {
    ...base,
    locations: [
      {
        id: "planning-equipment-position",
        name: "Equipment",
        type: "room-rack",
        notes: `${ROUTE_PLANNING_MARKER}${JSON.stringify(marker)}`,
      },
      { id: "loc-display", name: "Display", type: "display-wall" },
    ],
    devices: [
      {
        id: "dev-src",
        name: "Source",
        category: "source",
        locationId: "planning-equipment-position",
        quantity: 1,
        thirdParty: true,
        status: "assumed",
      },
      {
        id: "dev-disp",
        name: "Display",
        category: "display",
        locationId: "loc-display",
        quantity: 1,
        thirdParty: true,
        status: "assumed",
      },
    ],
    connections,
  };
}

describe("project topology discovery model", () => {
  it("separates short local HDMI patches from AV-network infrastructure distance", () => {
    const base = createBlankProjectTopology();
    const topology: ProjectTopology = {
      ...base,
      locations: [
        { id: "lectern", name: "Lectern", type: "lectern", roomId: "room-1" },
        { id: "network", name: "AV network", type: "network", buildingId: "building-1" },
        { id: "display", name: "Display", type: "display-wall", roomId: "room-1" },
      ],
      devices: [
        { id: "source", name: "Laptop", category: "source", locationId: "lectern", quantity: 1, thirdParty: true, status: "confirmed" },
        { id: "encoder", name: "Encoder", category: "encoder", locationId: "lectern", quantity: 1, thirdParty: false, status: "confirmed" },
        { id: "switch", name: "AV switch", category: "network", locationId: "network", quantity: 1, thirdParty: true, status: "confirmed" },
        { id: "decoder", name: "Decoder", category: "decoder", locationId: "display", quantity: 1, thirdParty: false, status: "confirmed" },
      ],
      connections: [
        { id: "patch", fromDeviceId: "source", toDeviceId: "encoder", services: ["video"], transport: "hdmi", lengthMode: "confirmed", lengthMetres: 2, status: "confirmed" },
        { id: "network-route", fromDeviceId: "encoder", toDeviceId: "switch", services: ["av-over-ip", "ethernet"], transport: "ip-av-vlan", lengthMode: "confirmed", lengthMetres: 70, status: "confirmed" },
      ],
    };

    expect(projectTopologyDistanceSummary(topology)).toEqual({
      localPatchMaxMetres: 2,
      endpointRouteMaxMetres: undefined,
      infrastructureMaxMetres: 70,
    });
  });

  it("generates meeting-room devices, locations and USB paths from discovery", () => {
    const topology = generateProjectTopologyFromDiscovery({
      application: "meeting-room",
      answers: {
        opportunity: "meeting-room",
        scale: "single-small-room",
        sources: "two-four-sources",
        "source-connection": ["mixed-hdmi-usbc"],
        displays: "two-displays",
        usb: ["byod-byom", "usb-camera-audio", "usb3-high-bandwidth-path"],
      },
      notes: {},
    });

    expect(topology.locations.length).toBeGreaterThanOrEqual(3);
    expect(topology.devices.some((item) => /laptop/i.test(item.name))).toBe(true);
    expect(topology.devices.some((item) => /display/i.test(item.name))).toBe(true);
    expect(topology.connections.some((item) => item.services.includes("usb-3"))).toBe(true);
  });

  it("migrates the old overall distance answer into the longest planning route", () => {
    const topology = generateProjectTopologyFromDiscovery({
      answers: {
        opportunity: "classroom",
        scale: "single-large-room",
        sources: "one-source",
        displays: "one-display",
        distance: "35-70m",
      },
      notes: {},
    });

    expect(projectTopologyLongestRun(topology)).toBe(50);
    expect(projectTopologyConnectionTypes(topology)).toContain("HDBaseT 3.0");
  });

  it("creates a governed network object and IT validation for AVoIP", () => {
    const topology = generateProjectTopologyFromDiscovery({
      application: "av-over-ip",
      answers: {
        opportunity: "av-over-ip",
        scale: "building-wide",
        sources: "five-eight-sources",
        displays: "nine-plus-displays",
        infrastructure: "managed-network",
      },
      notes: {},
    });

    expect(projectTopologyConnectionTypes(topology)).toContain("IP AV-VLAN");
    expect(projectTopologyMissingInformation(topology).some((item) => /network ownership|multicast|IGMP/i.test(item))).toBe(true);
  });

  it("exports devices and labelled paths for Visual Design Studio", () => {
    const topology = generateProjectTopologyFromDiscovery({
      answers: {
        opportunity: "meeting-room",
        sources: "one-source",
        displays: "one-display",
      },
      notes: {},
    });
    const mermaid = projectTopologyToMermaid(topology);

    expect(mermaid).toContain("flowchart LR");
    expect(mermaid).toContain("-->");
    expect(mermaid).toMatch(/HDMI|HDBaseT|USB-C/);
  });
});

describe("explicit custom signal requirements", () => {
  const base = createBlankProjectTopology();
  const devices = [
    { id: "source", name: "Camera", category: "source", signalRole: "source", ownership: "third-party", locationId: "room", quantity: 2, thirdParty: true, status: "confirmed" },
    { id: "display", name: "Display", category: "display", signalRole: "destination", ownership: "wyrestorm", locationId: "room", quantity: 2, thirdParty: false, status: "confirmed" },
  ];

  it("assigns legacy routes to unit one and leaves new requirements empty", () => {
    const topology = normaliseProjectTopology({
      ...base,
      locations: [{ id: "room", name: "Room", type: "custom" }],
      devices,
      connections: [{ id: "legacy", fromDeviceId: "source", toDeviceId: "display", services: ["video"], transport: "hdmi", lengthMode: "unknown", status: "confirmed" }],
    });

    expect(topology.connections[0]).toMatchObject({ fromUnit: 1, toUnit: 1 });
    expect(topology.signalRequirements).toEqual([]);
  });

  it("requires every declared source, destination, unit and service to have a matching route", () => {
    const topology = {
      ...base,
      locations: [{ id: "room", name: "Room", type: "custom" }],
      devices,
      connections: [
        { id: "camera-1", fromDeviceId: "source", fromUnit: 1, toDeviceId: "display", toUnit: 1, services: ["video"], transport: "hdmi", lengthMode: "unknown", status: "confirmed" },
        { id: "camera-2-wrong-service", fromDeviceId: "source", fromUnit: 2, toDeviceId: "display", toUnit: 2, services: ["embedded-audio"], transport: "hdmi", lengthMode: "unknown", status: "confirmed" },
      ],
      signalRequirements: [
        { id: "req-1", fromDeviceId: "source", fromUnit: 1, toDeviceId: "display", toUnit: 1, services: ["video"] },
        { id: "req-2", fromDeviceId: "source", fromUnit: 2, toDeviceId: "display", toUnit: 2, services: ["video"] },
      ],
    };

    const missing = projectTopologyMissingInformation(topology);
    expect(missing.some((item) => /video.*Camera.*unit 2.*Display.*unit 2/i.test(item))).toBe(true);

    const complete = projectTopologyMissingInformation({
      ...topology,
      connections: [...topology.connections, { id: "camera-2-video", fromDeviceId: "source", fromUnit: 2, toDeviceId: "display", toUnit: 2, services: ["video"], transport: "hdmi", lengthMode: "unknown", status: "confirmed" }],
    });
    expect(complete.some((item) => /video.*Camera.*unit 2.*Display.*unit 2/i.test(item))).toBe(false);
  });

  it("flags unrecorded required pairings and references outside device quantities", () => {
    const missingPair = projectTopologyMissingInformation({
      ...base,
      locations: [{ id: "room", name: "Room", type: "custom" }],
      devices,
      connections: [],
      signalRequirements: [],
    });
    expect(missingPair.some((item) => /define which sources.*destinations/i.test(item))).toBe(true);

    const invalidUnit = projectTopologyMissingInformation({
      ...base,
      locations: [{ id: "room", name: "Room", type: "custom" }],
      devices,
      connections: [],
      signalRequirements: [{ id: "bad-unit", fromDeviceId: "source", fromUnit: 3, toDeviceId: "display", toUnit: 1.5, services: ["video"] }],
    });
    expect(invalidUnit.some((item) => /outside.*quantity|unit 3/i.test(item))).toBe(true);
    expect(invalidUnit.some((item) => /unit 1\.5/i.test(item))).toBe(true);

    const partialCoverage = projectTopologyMissingInformation({
      ...base,
      locations: [{ id: "room", name: "Room", type: "custom" }],
      devices,
      connections: [],
      signalRequirements: [{ id: "only-unit-one", fromDeviceId: "source", fromUnit: 1, toDeviceId: "display", toUnit: 1, services: ["video"] }],
    });
    expect(partialCoverage.some((item) => /Camera unit 2.*source unit not yet mapped/i.test(item))).toBe(true);
    expect(partialCoverage.some((item) => /Display unit 2.*destination unit not yet mapped/i.test(item))).toBe(true);
  });

  it("accepts a required service routed through a processing device", () => {
    const topology = {
      ...base,
      locations: [{ id: "room", name: "Room", type: "custom" }],
      devices: [
        { id: "source", name: "Laptop", category: "source", signalRole: "source", ownership: "third-party", locationId: "room", quantity: 1, thirdParty: true, status: "confirmed" },
        { id: "processor", name: "Scaler", category: "processor", signalRole: "processor", ownership: "wyrestorm", locationId: "room", quantity: 1, thirdParty: false, status: "confirmed" },
        { id: "display", name: "Display", category: "display", signalRole: "destination", ownership: "wyrestorm", locationId: "room", quantity: 1, thirdParty: false, status: "confirmed" },
      ],
      connections: [
        { id: "in", fromDeviceId: "source", toDeviceId: "processor", services: ["video"], transport: "hdmi", lengthMode: "unknown", status: "confirmed" },
        { id: "out", fromDeviceId: "processor", toDeviceId: "display", services: ["video"], transport: "hdmi", lengthMode: "unknown", status: "confirmed" },
      ],
      signalRequirements: [{ id: "program-video", fromDeviceId: "source", fromUnit: 1, toDeviceId: "display", toUnit: 1, services: ["video"] }],
    };

    expect(projectTopologyMissingInformation(topology).some((item) => /No recorded route carries video/i.test(item))).toBe(false);
  });

  it("keeps unit identity visible in requirement and diagram output", () => {
    const topology = {
      ...base,
      locations: [{ id: "room", name: "Room", type: "custom" }],
      devices,
      connections: [{ id: "camera-2-display-2", fromDeviceId: "source", fromUnit: 2, toDeviceId: "display", toUnit: 2, services: ["video"], transport: "hdmi", lengthMode: "unknown", status: "confirmed" }],
      signalRequirements: [{ id: "req-2", fromDeviceId: "source", fromUnit: 2, toDeviceId: "display", toUnit: 2, services: ["video"] }],
    };

    expect(projectTopologySignalRequirementLines(topology)).toEqual(["Camera · unit 2 → Display · unit 2 | video"]);
    expect(projectTopologyToMermaid(topology)).toContain("unit 2 output TBC → unit 2 input TBC");
  });
});

describe("projectTopologySurveyState", () => {
  const bandMarker = {
    equipmentPosition: "room-rack",
    videoDistance: "typical-room",
    routeType: "ceiling-perimeter",
    usbDistance: "across-room",
    exceptionMode: "none",
  };
  const exactMarker = {
    ...bandMarker,
    videoDistanceMetres: 42,
    usbDistanceMetres: 7,
  };

  it("flags band-estimated video and USB routes as needing survey", () => {
    const topology = topologyWithPlanningMarker(bandMarker, [
      {
        id: "planning-video-path",
        fromDeviceId: "dev-src",
        toDeviceId: "dev-disp",
        services: ["video", "embedded-audio"],
        transport: "hdbaset-3",
        lengthMode: "estimated",
        lengthMetres: 50,
        estimateReason: "Across a typical room via Ceiling / room perimeter; planning allowance 50 m",
        status: "assumed",
      },
      {
        id: "planning-usb-path",
        fromDeviceId: "dev-src",
        toDeviceId: "dev-disp",
        services: ["usb-2"],
        transport: "usb-extender",
        lengthMode: "estimated",
        lengthMetres: 15,
        estimateReason: "USB host-to-device planning distance 15 m",
        status: "assumed",
      },
    ]);

    const survey = projectTopologySurveyState(topology);
    expect(survey.needsSurvey).toBe(true);
    expect(survey.reasons.some((reason) => /video cable route is band-estimated/i.test(reason))).toBe(true);
    expect(survey.reasons.some((reason) => /USB host-to-device path is band-estimated/i.test(reason))).toBe(true);
  });

  it("does not flag routes whose exact figures were entered during discovery", () => {
    const topology = topologyWithPlanningMarker(exactMarker, [
      {
        id: "planning-video-path",
        fromDeviceId: "dev-src",
        toDeviceId: "dev-disp",
        services: ["video", "embedded-audio"],
        transport: "hdbaset-3",
        lengthMode: "estimated",
        lengthMetres: 42,
        estimateReason: "Exact cable length entered during discovery: 42 m",
        status: "assumed",
      },
      {
        id: "planning-usb-path",
        fromDeviceId: "dev-src",
        toDeviceId: "dev-disp",
        services: ["usb-2"],
        transport: "usb-extender",
        lengthMode: "estimated",
        lengthMetres: 7,
        estimateReason: "USB host-to-device planning distance 7 m",
        status: "assumed",
      },
    ]);

    expect(projectTopologySurveyState(topology).needsSurvey).toBe(false);
  });

  it("flags the distance-exception route when only its band is known", () => {
    const topology = topologyWithPlanningMarker(
      { ...bandMarker, exceptionMode: "yes", exceptionDistance: "large-room" },
      [
        {
          id: "planning-exception-path",
          fromDeviceId: "dev-src",
          toDeviceId: "dev-disp",
          services: ["video", "embedded-audio"],
          transport: "hdbaset-3",
          lengthMode: "estimated",
          lengthMetres: 60,
          estimateReason: "Additional route exception planned at 60 m",
          status: "assumed",
        },
      ],
    );

    const survey = projectTopologySurveyState(topology);
    expect(survey.needsSurvey).toBe(true);
    expect(survey.reasons.some((reason) => /distance-exception route is band-estimated/i.test(reason))).toBe(true);
  });

  it("flags unknown-length routes even when another route is exact", () => {
    const topology = topologyWithPlanningMarker(exactMarker, [
      {
        id: "planning-video-path",
        fromDeviceId: "dev-src",
        toDeviceId: "dev-disp",
        services: ["video", "embedded-audio"],
        transport: "hdbaset-3",
        lengthMode: "estimated",
        lengthMetres: 42,
        estimateReason: "Exact cable length entered during discovery: 42 m",
        status: "assumed",
      },
      {
        id: "planning-exception-path",
        fromDeviceId: "dev-src",
        toDeviceId: "dev-disp",
        services: ["video", "embedded-audio"],
        transport: "unknown",
        lengthMode: "unknown",
        status: "unknown",
      },
    ]);

    const survey = projectTopologySurveyState(topology);
    expect(survey.needsSurvey).toBe(true);
    expect(survey.reasons.some((reason) => /no recorded length/i.test(reason))).toBe(true);
  });

  it("does not flag a topology with no connections", () => {
    expect(projectTopologySurveyState(createBlankProjectTopology()).needsSurvey).toBe(false);
  });
});
