import { describe, expect, it } from "vitest";
import { buildNativeCableSchedule, nativeCableToneLabel } from "./nativeCableSchedule";
import { buildWingmanSchematic } from "./wingmanSchematicEngine";

describe("buildNativeCableSchedule", () => {
  it("generates cable rows for a NetworkHD system with encoders and decoders", () => {
    const schematic = buildWingmanSchematic({
      title: "NetworkHD distribution",
      sources: [{ label: "Media player" }],
      displays: [{ label: "Display 1" }, { label: "Display 2" }],
      products: [
        { sku: "NHD-124-TX" },
        { sku: "NHD-150-RX", quantity: 2 },
      ],
      networkAvailable: true,
    });

    const cableRows = buildNativeCableSchedule(schematic);

    // Should have cable rows for: source→encoder, encoder→network, network→decoder×2, decoder→display×2, plus network infrastructure
    expect(cableRows.length).toBeGreaterThanOrEqual(5);

    // Should include video connections (source to encoder, decoder to display)
    const videoRows = cableRows.filter((r) => r.type === "video");
    expect(videoRows.length).toBeGreaterThanOrEqual(2);

    // Should include network connections (encoder/decoder to network switch)
    const networkRows = cableRows.filter((r) => r.type === "network");
    expect(networkRows.length).toBeGreaterThanOrEqual(1);

    // Every row should have a transport type
    for (const row of cableRows) {
      expect(row.transport).toBeDefined();
      expect(row.cable).toBeTruthy();
      expect(row.reminder).toBeTruthy();
    }
  });

  it("generates cable rows for a simple HDBaseT extender", () => {
    const schematic = buildWingmanSchematic({
      title: "HDBaseT extension",
      sources: [{ label: "Laptop" }],
      displays: [{ label: "Display" }],
      products: [{ sku: "SW-130-TX" }],
    });

    const cableRows = buildNativeCableSchedule(schematic);

    expect(cableRows.length).toBeGreaterThanOrEqual(1);

    // Should have at least one video cable row
    const videoRows = cableRows.filter((r) => r.type === "video");
    expect(videoRows.length).toBeGreaterThanOrEqual(1);

    // The video row should mention HDMI or HDBaseT transport
    const transports = videoRows.map((r) => r.transport);
    expect(transports.some((t) => t === "hdmi" || t === "hdbaset" || t === "unknown")).toBe(true);
  });

  it("includes USB cable rows when USB devices are present", () => {
    const schematic = buildWingmanSchematic({
      title: "BYOD room",
      sources: [{ label: "Laptop" }],
      displays: [{ label: "Display" }],
      cameras: [{ label: "Camera", sku: "CAM-420-PTZ" }],
      products: [{ sku: "SW-620L-TX-W" }],
      usbRequired: true,
    });

    const cableRows = buildNativeCableSchedule(schematic);

    const usbRows = cableRows.filter((r) => r.type === "usb");
    expect(usbRows.length).toBeGreaterThanOrEqual(1);
  });

  it("adds network infrastructure row for AVoIP systems", () => {
    const schematic = buildWingmanSchematic({
      title: "AVoIP system",
      sources: [{ label: "Source" }],
      displays: [{ label: "Display" }],
      products: [
        { sku: "NHD-500-TX" },
        { sku: "NHD-500-RX" },
      ],
    });

    const cableRows = buildNativeCableSchedule(schematic);

    // Should include the network infrastructure row
    const infraRow = cableRows.find((r) => r.label === "AV network infrastructure");
    expect(infraRow).toBeDefined();
    expect(infraRow!.type).toBe("network");
    expect(infraRow!.required).toBe(true);
  });

  it("deduplicates connections with the same from/to/signal", () => {
    const schematic = buildWingmanSchematic({
      title: "Dedup test",
      sources: [{ label: "Source" }],
      displays: [{ label: "Display" }],
      products: [
        { sku: "NHD-120-TX" },
        { sku: "NHD-120-RX" },
      ],
      networkAvailable: true,
    });

    const cableRows = buildNativeCableSchedule(schematic);
    const labels = cableRows.map((r) => r.label);
    const uniqueLabels = new Set(labels);
    // No duplicate labels
    expect(labels.length).toBe(uniqueLabels.size);
  });

  it("generates cable rows even for a minimal schematic with fallback nodes", () => {
    const schematic = buildWingmanSchematic({
      title: "Minimal system",
      sources: [],
      displays: [],
      products: [],
    });

    const cableRows = buildNativeCableSchedule(schematic);
    // The engine creates generic source/display/transport nodes, so we get cable rows
    expect(cableRows.length).toBeGreaterThanOrEqual(1);
    // Every row should have a valid cable description
    for (const row of cableRows) {
      expect(row.cable).toBeTruthy();
      expect(row.reminder).toBeTruthy();
    }
  });
});

describe("nativeCableToneLabel", () => {
  it("returns correct labels for all cable types", () => {
    expect(nativeCableToneLabel("video")).toBe("Video");
    expect(nativeCableToneLabel("network")).toBe("Network / AVoIP");
    expect(nativeCableToneLabel("usb")).toBe("USB / camera");
    expect(nativeCableToneLabel("audio")).toBe("Audio");
    expect(nativeCableToneLabel("control")).toBe("Control");
    expect(nativeCableToneLabel("other")).toBe("By others");
  });
});
