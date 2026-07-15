import { describe, expect, it } from "vitest";
import {
  generateProjectTopologyFromDiscovery,
  projectTopologyConnectionTypes,
  projectTopologyLongestRun,
  projectTopologyMissingInformation,
  projectTopologyToMermaid,
} from "./projectTopology";

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
