import { describe, it, expect } from "vitest";
import {
  buildSiteSurveyChecklist,
  generateSiteSurveyHtml,
  type SurveyChecklist,
} from "./siteSurveyChecklist";
import type { StoredProject } from "../data/projectStore";

function makeProject(overrides: Partial<StoredProject> = {}): StoredProject {
  return {
    id: "test-project",
    name: "Test Boardroom",
    owner: "Steve",
    stage: "Discovery",
    status: "recommended",
    updated: "Just now",
    resumeTo: "/wingman/discovery",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("buildSiteSurveyChecklist", () => {
  it("returns empty checklist when no topology exists", () => {
    const project = makeProject();
    const checklist = buildSiteSurveyChecklist(project);

    expect(checklist.projectName).toBe("Test Boardroom");
    expect(checklist.locations).toEqual([]);
    expect(checklist.cables).toEqual([]);
    expect(checklist.totalDevices).toBe(0);
    expect(checklist.totalCables).toBe(0);
  });

  it("builds checklist from topology with locations and devices", () => {
    const project = makeProject({
      discoveryBrief: {
        savedAt: "2026-01-01T00:00:00Z",
        roomModel: {
          clientName: "Acme Corp",
          siteName: "London HQ",
        },
        topology: {
          schemaVersion: 1,
          mode: "advanced",
          locations: [
            { id: "loc-1", name: "Table", type: "table" },
            { id: "loc-2", name: "Display Wall", type: "display-wall" },
            { id: "loc-3", name: "Room Rack", type: "room-rack" },
          ],
          devices: [
            { id: "dev-1", name: "Laptop Input", category: "Source", locationId: "loc-1", quantity: 1, thirdParty: false, status: "confirmed" },
            { id: "dev-2", name: "Main Display", category: "Display", locationId: "loc-2", quantity: 1, thirdParty: false, status: "confirmed" },
            { id: "dev-3", name: "NHD-500-TX", category: "Transmitter", locationId: "loc-1", sku: "NHD-500-TX", quantity: 1, thirdParty: false, status: "confirmed" },
            { id: "dev-4", name: "NHD-500-RX", category: "Receiver", locationId: "loc-2", sku: "NHD-500-RX", quantity: 1, thirdParty: false, status: "confirmed" },
          ],
          connections: [
            {
              id: "conn-1",
              fromDeviceId: "dev-1",
              toDeviceId: "dev-3",
              services: ["video"],
              transport: "hdmi",
              lengthMode: "confirmed",
              lengthMetres: 2,
              status: "confirmed",
            },
            {
              id: "conn-2",
              fromDeviceId: "dev-3",
              toDeviceId: "dev-4",
              services: ["video", "ethernet"],
              transport: "ip-av-vlan",
              lengthMode: "estimated",
              lengthMetres: 15,
              estimateReason: "Room rack to display",
              status: "assumed",
            },
            {
              id: "conn-3",
              fromDeviceId: "dev-4",
              toDeviceId: "dev-2",
              services: ["video"],
              transport: "hdmi",
              lengthMode: "confirmed",
              lengthMetres: 3,
              status: "confirmed",
            },
          ],
          generatedFromDiscovery: true,
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        },
      },
    });

    const checklist = buildSiteSurveyChecklist(project);

    expect(checklist.projectName).toBe("Test Boardroom");
    expect(checklist.customer).toBe("Acme Corp");
    expect(checklist.site).toBe("London HQ");
    expect(checklist.locations).toHaveLength(3);
    expect(checklist.totalDevices).toBe(4);
    expect(checklist.totalCables).toBe(3);

    // Cable statistics
    expect(checklist.confirmedCableMetres).toBe(5); // 2 + 3
    expect(checklist.estimatedCableMetres).toBe(15);
    expect(checklist.unknownCableCount).toBe(0);

    // Port summary
    expect(checklist.portSummary.length).toBeGreaterThan(0);
    const hdmiPort = checklist.portSummary.find((p) => p.transport === "HDMI");
    expect(hdmiPort).toBeDefined();
    expect(hdmiPort!.count).toBe(2);

    // Location devices
    const tableLoc = checklist.locations.find((l) => l.type === "table");
    expect(tableLoc).toBeDefined();
    expect(tableLoc!.devices).toHaveLength(2); // Laptop + TX
  });

  it("extracts customer and site from room model", () => {
    const project = makeProject({
      discoveryBrief: {
        roomModel: {
          clientName: "Widgets Inc",
          siteName: "Manchester Office",
        },
      },
    });

    const checklist = buildSiteSurveyChecklist(project);
    expect(checklist.customer).toBe("Widgets Inc");
    expect(checklist.site).toBe("Manchester Office");
  });

  it("falls back to owner when clientName is missing", () => {
    const project = makeProject({ owner: "Fallback Owner" });
    const checklist = buildSiteSurveyChecklist(project);
    expect(checklist.customer).toBe("Fallback Owner");
  });

  it("counts third-party devices", () => {
    const project = makeProject({
      discoveryBrief: {
        topology: {
          schemaVersion: 1,
          mode: "simple",
          locations: [{ id: "loc-1", name: "Room", type: "custom" }],
          devices: [
            { id: "dev-1", name: "WyreStorm TX", category: "TX", locationId: "loc-1", quantity: 1, thirdParty: false, status: "confirmed" },
            { id: "dev-2", name: "Crestron Panel", category: "Control", locationId: "loc-1", quantity: 1, thirdParty: true, status: "assumed" },
          ],
          connections: [],
          generatedFromDiscovery: false,
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        },
      },
    });

    const checklist = buildSiteSurveyChecklist(project);
    expect(checklist.thirdPartyDevices).toBe(1);
    expect(checklist.totalDevices).toBe(2);
  });
});

describe("generateSiteSurveyHtml", () => {
  it("generates valid HTML with project name", () => {
    const checklist: SurveyChecklist = {
      projectId: "test-project",
      projectName: "Boardroom Upgrade",
      customer: "Acme",
      site: "HQ",
      generatedAt: "2026-01-01T00:00:00Z",
      locations: [],
      cables: [],
      portSummary: [],
      totalDevices: 0,
      totalCables: 0,
      estimatedCableMetres: 0,
      confirmedCableMetres: 0,
      unknownCableCount: 0,
      thirdPartyDevices: 0,
    };

    const html = generateSiteSurveyHtml(checklist);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Boardroom Upgrade");
    expect(html).toContain("Acme");
    expect(html).toContain("HQ");
    expect(html).toContain("Site Survey Checklist");
    expect(html).toContain("qr-section");
    expect(html).toContain("Scan to update topology");
  });

  it("includes cable run table when cables exist", () => {
    const checklist: SurveyChecklist = {
      projectId: "test-project",
      projectName: "Test",
      customer: "",
      site: "",
      generatedAt: "2026-01-01T00:00:00Z",
      locations: [],
      cables: [
        {
          id: "c1",
          fromDevice: "Laptop",
          fromLocation: "Table",
          toDevice: "TX",
          toLocation: "Rack",
          transport: "HDMI",
          services: ["Video"],
          lengthMetres: 5,
          lengthMode: "confirmed",
          confirmedByIntegrator: false,
        },
      ],
      portSummary: [{ transport: "HDMI", count: 1, locations: ["Table"] }],
      totalDevices: 2,
      totalCables: 1,
      estimatedCableMetres: 0,
      confirmedCableMetres: 5,
      unknownCableCount: 0,
      thirdPartyDevices: 0,
    };

    const html = generateSiteSurveyHtml(checklist);
    expect(html).toContain("Laptop");
    expect(html).toContain("HDMI");
    expect(html).toContain("5m");
    expect(html).toContain("Cable Runs");
  });

  it("escapes HTML in project names to prevent XSS", () => {
    const checklist: SurveyChecklist = {
      projectId: "test-project",
      projectName: '<script>alert("xss")</script>',
      customer: "",
      site: "",
      generatedAt: "2026-01-01T00:00:00Z",
      locations: [],
      cables: [],
      portSummary: [],
      totalDevices: 0,
      totalCables: 0,
      estimatedCableMetres: 0,
      confirmedCableMetres: 0,
      unknownCableCount: 0,
      thirdPartyDevices: 0,
    };

    const html = generateSiteSurveyHtml(checklist);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
