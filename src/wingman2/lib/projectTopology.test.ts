import { describe, expect, it } from "vitest";
import {
  ROUTE_PLANNING_MARKER,
  createBlankProjectTopology,
  generateProjectTopologyFromDiscovery,
  projectTopologyConnectionTypes,
  projectTopologyLongestRun,
  projectTopologyMissingInformation,
  projectTopologySurveyState,
  projectTopologyToMermaid,
  type ProjectTopology,
} from "./projectTopology";

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
