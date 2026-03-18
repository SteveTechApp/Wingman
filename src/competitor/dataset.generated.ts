import type { CompetitorItem } from "./types";

export const competitorDatasetGenerated: CompetitorItem[] = [
  {
    id: "extron-dtp-001",
    brand: "Extron",
    sku: "DTP-001",
    name: "Extron Extender 1",
    category: "Extender",
    family: "Extron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDBaseT"], confidence: "medium", source: "seed" },
      transport: { value: "DTP", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 71, confidence: "low", source: "seed" },
      maxMeters4k: { value: 41, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 175, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "extron-dtp-002",
    brand: "Extron",
    sku: "DTP-002",
    name: "Extron Matrix 2",
    category: "Matrix",
    family: "Extron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "DTP", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 72, confidence: "low", source: "seed" },
      maxMeters4k: { value: 42, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 200, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "extron-dtp-003",
    brand: "Extron",
    sku: "DTP-003",
    name: "Extron Switcher 3",
    category: "Switcher",
    family: "Extron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "DTP", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 73, confidence: "low", source: "seed" },
      maxMeters4k: { value: 43, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 225, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "extron-dtp-004",
    brand: "Extron",
    sku: "DTP-004",
    name: "Extron Encoder 4",
    category: "Encoder",
    family: "Extron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: false, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      transport: { value: "DTP", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 74, confidence: "low", source: "seed" },
      maxMeters4k: { value: 44, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 250, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "extron-dtp-005",
    brand: "Extron",
    sku: "DTP-005",
    name: "Extron Decoder 5",
    category: "Decoder",
    family: "Extron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "DTP", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 75, confidence: "low", source: "seed" },
      maxMeters4k: { value: 45, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: true, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 275, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "extron-dtp-006",
    brand: "Extron",
    sku: "DTP-006",
    name: "Extron Extender 6",
    category: "Extender",
    family: "Extron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDBaseT"], confidence: "medium", source: "seed" },
      transport: { value: "DTP", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 76, confidence: "low", source: "seed" },
      maxMeters4k: { value: 46, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 300, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "extron-dtp-007",
    brand: "Extron",
    sku: "DTP-007",
    name: "Extron Matrix 7",
    category: "Matrix",
    family: "Extron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "DTP", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 77, confidence: "low", source: "seed" },
      maxMeters4k: { value: 47, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 325, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "extron-dtp-008",
    brand: "Extron",
    sku: "DTP-008",
    name: "Extron Switcher 8",
    category: "Switcher",
    family: "Extron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: false, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "DTP", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 78, confidence: "low", source: "seed" },
      maxMeters4k: { value: 48, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 350, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "extron-dtp-009",
    brand: "Extron",
    sku: "DTP-009",
    name: "Extron Encoder 9",
    category: "Encoder",
    family: "Extron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      transport: { value: "DTP", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 79, confidence: "low", source: "seed" },
      maxMeters4k: { value: 49, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 375, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "extron-dtp-010",
    brand: "Extron",
    sku: "DTP-010",
    name: "Extron Decoder 10",
    category: "Decoder",
    family: "Extron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "8K", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 40, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "DTP", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 80, confidence: "low", source: "seed" },
      maxMeters4k: { value: 50, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: true, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 400, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "extron-dtp-011",
    brand: "Extron",
    sku: "DTP-011",
    name: "Extron Extender 11",
    category: "Extender",
    family: "Extron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDBaseT"], confidence: "medium", source: "seed" },
      transport: { value: "DTP", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 81, confidence: "low", source: "seed" },
      maxMeters4k: { value: 51, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 425, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "extron-dtp-012",
    brand: "Extron",
    sku: "DTP-012",
    name: "Extron Matrix 12",
    category: "Matrix",
    family: "Extron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: false, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "DTP", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 82, confidence: "low", source: "seed" },
      maxMeters4k: { value: 52, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 450, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "extron-dtp-013",
    brand: "Extron",
    sku: "DTP-013",
    name: "Extron Switcher 13",
    category: "Switcher",
    family: "Extron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "DTP", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 83, confidence: "low", source: "seed" },
      maxMeters4k: { value: 53, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 475, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "extron-dtp-014",
    brand: "Extron",
    sku: "DTP-014",
    name: "Extron Encoder 14",
    category: "Encoder",
    family: "Extron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      transport: { value: "DTP", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 84, confidence: "low", source: "seed" },
      maxMeters4k: { value: 54, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 500, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "extron-dtp-015",
    brand: "Extron",
    sku: "DTP-015",
    name: "Extron Decoder 15",
    category: "Decoder",
    family: "Extron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "DTP", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 85, confidence: "low", source: "seed" },
      maxMeters4k: { value: 55, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: true, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 525, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "extron-dtp-016",
    brand: "Extron",
    sku: "DTP-016",
    name: "Extron Extender 16",
    category: "Extender",
    family: "Extron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: false, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDBaseT"], confidence: "medium", source: "seed" },
      transport: { value: "DTP", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 86, confidence: "low", source: "seed" },
      maxMeters4k: { value: 56, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 550, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "extron-dtp-017",
    brand: "Extron",
    sku: "DTP-017",
    name: "Extron Matrix 17",
    category: "Matrix",
    family: "Extron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "DTP", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 87, confidence: "low", source: "seed" },
      maxMeters4k: { value: 57, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 575, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "extron-dtp-018",
    brand: "Extron",
    sku: "DTP-018",
    name: "Extron Switcher 18",
    category: "Switcher",
    family: "Extron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "DTP", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 88, confidence: "low", source: "seed" },
      maxMeters4k: { value: 58, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 600, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "extron-dtp-019",
    brand: "Extron",
    sku: "DTP-019",
    name: "Extron Encoder 19",
    category: "Encoder",
    family: "Extron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      transport: { value: "DTP", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 89, confidence: "low", source: "seed" },
      maxMeters4k: { value: 59, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 625, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "extron-dtp-020",
    brand: "Extron",
    sku: "DTP-020",
    name: "Extron Decoder 20",
    category: "Decoder",
    family: "Extron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "8K", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 40, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: false, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "DTP", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 90, confidence: "low", source: "seed" },
      maxMeters4k: { value: 60, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: true, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 650, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "extron-dtp-021",
    brand: "Extron",
    sku: "DTP-021",
    name: "Extron Extender 21",
    category: "Extender",
    family: "Extron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDBaseT"], confidence: "medium", source: "seed" },
      transport: { value: "DTP", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 91, confidence: "low", source: "seed" },
      maxMeters4k: { value: 61, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 675, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "extron-dtp-022",
    brand: "Extron",
    sku: "DTP-022",
    name: "Extron Matrix 22",
    category: "Matrix",
    family: "Extron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "DTP", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 92, confidence: "low", source: "seed" },
      maxMeters4k: { value: 62, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 700, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "extron-dtp-023",
    brand: "Extron",
    sku: "DTP-023",
    name: "Extron Switcher 23",
    category: "Switcher",
    family: "Extron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "DTP", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 93, confidence: "low", source: "seed" },
      maxMeters4k: { value: 63, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 725, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "extron-dtp-024",
    brand: "Extron",
    sku: "DTP-024",
    name: "Extron Encoder 24",
    category: "Encoder",
    family: "Extron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: false, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      transport: { value: "DTP", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 94, confidence: "low", source: "seed" },
      maxMeters4k: { value: 64, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 750, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "extron-dtp-025",
    brand: "Extron",
    sku: "DTP-025",
    name: "Extron Decoder 25",
    category: "Decoder",
    family: "Extron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "DTP", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 95, confidence: "low", source: "seed" },
      maxMeters4k: { value: 65, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: true, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 775, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "extron-dtp-026",
    brand: "Extron",
    sku: "DTP-026",
    name: "Extron Extender 26",
    category: "Extender",
    family: "Extron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDBaseT"], confidence: "medium", source: "seed" },
      transport: { value: "DTP", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 96, confidence: "low", source: "seed" },
      maxMeters4k: { value: 66, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 800, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "extron-dtp-027",
    brand: "Extron",
    sku: "DTP-027",
    name: "Extron Matrix 27",
    category: "Matrix",
    family: "Extron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "DTP", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 97, confidence: "low", source: "seed" },
      maxMeters4k: { value: 67, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 825, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "extron-dtp-028",
    brand: "Extron",
    sku: "DTP-028",
    name: "Extron Switcher 28",
    category: "Switcher",
    family: "Extron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: false, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "DTP", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 98, confidence: "low", source: "seed" },
      maxMeters4k: { value: 68, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 850, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "extron-dtp-029",
    brand: "Extron",
    sku: "DTP-029",
    name: "Extron Encoder 29",
    category: "Encoder",
    family: "Extron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      transport: { value: "DTP", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 99, confidence: "low", source: "seed" },
      maxMeters4k: { value: 69, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 875, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "extron-dtp-030",
    brand: "Extron",
    sku: "DTP-030",
    name: "Extron Decoder 30",
    category: "Decoder",
    family: "Extron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "8K", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 40, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "DTP", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 100, confidence: "low", source: "seed" },
      maxMeters4k: { value: 70, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: true, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 900, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "kramer-tp-001",
    brand: "Kramer",
    sku: "TP-001",
    name: "Kramer Extender 1",
    category: "Extender",
    family: "Kramer Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDBaseT"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 71, confidence: "low", source: "seed" },
      maxMeters4k: { value: 41, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 175, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "kramer-tp-002",
    brand: "Kramer",
    sku: "TP-002",
    name: "Kramer Matrix 2",
    category: "Matrix",
    family: "Kramer Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 72, confidence: "low", source: "seed" },
      maxMeters4k: { value: 42, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 200, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "kramer-tp-003",
    brand: "Kramer",
    sku: "TP-003",
    name: "Kramer Switcher 3",
    category: "Switcher",
    family: "Kramer Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 73, confidence: "low", source: "seed" },
      maxMeters4k: { value: 43, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 225, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "kramer-tp-004",
    brand: "Kramer",
    sku: "TP-004",
    name: "Kramer Encoder 4",
    category: "Encoder",
    family: "Kramer Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: false, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 74, confidence: "low", source: "seed" },
      maxMeters4k: { value: 44, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 250, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "kramer-tp-005",
    brand: "Kramer",
    sku: "TP-005",
    name: "Kramer Decoder 5",
    category: "Decoder",
    family: "Kramer Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 75, confidence: "low", source: "seed" },
      maxMeters4k: { value: 45, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: true, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 275, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "kramer-tp-006",
    brand: "Kramer",
    sku: "TP-006",
    name: "Kramer Extender 6",
    category: "Extender",
    family: "Kramer Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDBaseT"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 76, confidence: "low", source: "seed" },
      maxMeters4k: { value: 46, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 300, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "kramer-tp-007",
    brand: "Kramer",
    sku: "TP-007",
    name: "Kramer Matrix 7",
    category: "Matrix",
    family: "Kramer Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 77, confidence: "low", source: "seed" },
      maxMeters4k: { value: 47, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 325, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "kramer-tp-008",
    brand: "Kramer",
    sku: "TP-008",
    name: "Kramer Switcher 8",
    category: "Switcher",
    family: "Kramer Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: false, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 78, confidence: "low", source: "seed" },
      maxMeters4k: { value: 48, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 350, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "kramer-tp-009",
    brand: "Kramer",
    sku: "TP-009",
    name: "Kramer Encoder 9",
    category: "Encoder",
    family: "Kramer Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 79, confidence: "low", source: "seed" },
      maxMeters4k: { value: 49, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 375, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "kramer-tp-010",
    brand: "Kramer",
    sku: "TP-010",
    name: "Kramer Decoder 10",
    category: "Decoder",
    family: "Kramer Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "8K", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 40, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 80, confidence: "low", source: "seed" },
      maxMeters4k: { value: 50, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: true, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 400, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "kramer-tp-011",
    brand: "Kramer",
    sku: "TP-011",
    name: "Kramer Extender 11",
    category: "Extender",
    family: "Kramer Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDBaseT"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 81, confidence: "low", source: "seed" },
      maxMeters4k: { value: 51, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 425, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "kramer-tp-012",
    brand: "Kramer",
    sku: "TP-012",
    name: "Kramer Matrix 12",
    category: "Matrix",
    family: "Kramer Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: false, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 82, confidence: "low", source: "seed" },
      maxMeters4k: { value: 52, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 450, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "kramer-tp-013",
    brand: "Kramer",
    sku: "TP-013",
    name: "Kramer Switcher 13",
    category: "Switcher",
    family: "Kramer Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 83, confidence: "low", source: "seed" },
      maxMeters4k: { value: 53, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 475, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "kramer-tp-014",
    brand: "Kramer",
    sku: "TP-014",
    name: "Kramer Encoder 14",
    category: "Encoder",
    family: "Kramer Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 84, confidence: "low", source: "seed" },
      maxMeters4k: { value: 54, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 500, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "kramer-tp-015",
    brand: "Kramer",
    sku: "TP-015",
    name: "Kramer Decoder 15",
    category: "Decoder",
    family: "Kramer Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 85, confidence: "low", source: "seed" },
      maxMeters4k: { value: 55, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: true, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 525, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "kramer-tp-016",
    brand: "Kramer",
    sku: "TP-016",
    name: "Kramer Extender 16",
    category: "Extender",
    family: "Kramer Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: false, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDBaseT"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 86, confidence: "low", source: "seed" },
      maxMeters4k: { value: 56, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 550, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "kramer-tp-017",
    brand: "Kramer",
    sku: "TP-017",
    name: "Kramer Matrix 17",
    category: "Matrix",
    family: "Kramer Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 87, confidence: "low", source: "seed" },
      maxMeters4k: { value: 57, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 575, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "kramer-tp-018",
    brand: "Kramer",
    sku: "TP-018",
    name: "Kramer Switcher 18",
    category: "Switcher",
    family: "Kramer Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 88, confidence: "low", source: "seed" },
      maxMeters4k: { value: 58, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 600, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "kramer-tp-019",
    brand: "Kramer",
    sku: "TP-019",
    name: "Kramer Encoder 19",
    category: "Encoder",
    family: "Kramer Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 89, confidence: "low", source: "seed" },
      maxMeters4k: { value: 59, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 625, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "kramer-tp-020",
    brand: "Kramer",
    sku: "TP-020",
    name: "Kramer Decoder 20",
    category: "Decoder",
    family: "Kramer Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "8K", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 40, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: false, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 90, confidence: "low", source: "seed" },
      maxMeters4k: { value: 60, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: true, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 650, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "kramer-tp-021",
    brand: "Kramer",
    sku: "TP-021",
    name: "Kramer Extender 21",
    category: "Extender",
    family: "Kramer Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDBaseT"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 91, confidence: "low", source: "seed" },
      maxMeters4k: { value: 61, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 675, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "kramer-tp-022",
    brand: "Kramer",
    sku: "TP-022",
    name: "Kramer Matrix 22",
    category: "Matrix",
    family: "Kramer Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 92, confidence: "low", source: "seed" },
      maxMeters4k: { value: 62, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 700, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "kramer-tp-023",
    brand: "Kramer",
    sku: "TP-023",
    name: "Kramer Switcher 23",
    category: "Switcher",
    family: "Kramer Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 93, confidence: "low", source: "seed" },
      maxMeters4k: { value: 63, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 725, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "kramer-tp-024",
    brand: "Kramer",
    sku: "TP-024",
    name: "Kramer Encoder 24",
    category: "Encoder",
    family: "Kramer Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: false, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 94, confidence: "low", source: "seed" },
      maxMeters4k: { value: 64, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 750, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "kramer-tp-025",
    brand: "Kramer",
    sku: "TP-025",
    name: "Kramer Decoder 25",
    category: "Decoder",
    family: "Kramer Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 95, confidence: "low", source: "seed" },
      maxMeters4k: { value: 65, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: true, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 775, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "kramer-tp-026",
    brand: "Kramer",
    sku: "TP-026",
    name: "Kramer Extender 26",
    category: "Extender",
    family: "Kramer Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDBaseT"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 96, confidence: "low", source: "seed" },
      maxMeters4k: { value: 66, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 800, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "kramer-tp-027",
    brand: "Kramer",
    sku: "TP-027",
    name: "Kramer Matrix 27",
    category: "Matrix",
    family: "Kramer Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 97, confidence: "low", source: "seed" },
      maxMeters4k: { value: 67, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 825, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "kramer-tp-028",
    brand: "Kramer",
    sku: "TP-028",
    name: "Kramer Switcher 28",
    category: "Switcher",
    family: "Kramer Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: false, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 98, confidence: "low", source: "seed" },
      maxMeters4k: { value: 68, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 850, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "kramer-tp-029",
    brand: "Kramer",
    sku: "TP-029",
    name: "Kramer Encoder 29",
    category: "Encoder",
    family: "Kramer Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 99, confidence: "low", source: "seed" },
      maxMeters4k: { value: 69, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 875, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "kramer-tp-030",
    brand: "Kramer",
    sku: "TP-030",
    name: "Kramer Decoder 30",
    category: "Decoder",
    family: "Kramer Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "8K", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 40, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 100, confidence: "low", source: "seed" },
      maxMeters4k: { value: 70, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: true, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 900, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "crestron-dm-001",
    brand: "Crestron",
    sku: "DM-001",
    name: "Crestron Extender 1",
    category: "Extender",
    family: "Crestron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDBaseT"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 71, confidence: "low", source: "seed" },
      maxMeters4k: { value: 41, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 175, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "crestron-dm-002",
    brand: "Crestron",
    sku: "DM-002",
    name: "Crestron Matrix 2",
    category: "Matrix",
    family: "Crestron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 72, confidence: "low", source: "seed" },
      maxMeters4k: { value: 42, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 200, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "crestron-dm-003",
    brand: "Crestron",
    sku: "DM-003",
    name: "Crestron Switcher 3",
    category: "Switcher",
    family: "Crestron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 73, confidence: "low", source: "seed" },
      maxMeters4k: { value: 43, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 225, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "crestron-dm-004",
    brand: "Crestron",
    sku: "DM-004",
    name: "Crestron Encoder 4",
    category: "Encoder",
    family: "Crestron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: false, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 74, confidence: "low", source: "seed" },
      maxMeters4k: { value: 44, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 250, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "crestron-dm-005",
    brand: "Crestron",
    sku: "DM-005",
    name: "Crestron Decoder 5",
    category: "Decoder",
    family: "Crestron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 75, confidence: "low", source: "seed" },
      maxMeters4k: { value: 45, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: true, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 275, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "crestron-dm-006",
    brand: "Crestron",
    sku: "DM-006",
    name: "Crestron Extender 6",
    category: "Extender",
    family: "Crestron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDBaseT"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 76, confidence: "low", source: "seed" },
      maxMeters4k: { value: 46, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 300, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "crestron-dm-007",
    brand: "Crestron",
    sku: "DM-007",
    name: "Crestron Matrix 7",
    category: "Matrix",
    family: "Crestron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 77, confidence: "low", source: "seed" },
      maxMeters4k: { value: 47, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 325, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "crestron-dm-008",
    brand: "Crestron",
    sku: "DM-008",
    name: "Crestron Switcher 8",
    category: "Switcher",
    family: "Crestron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: false, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 78, confidence: "low", source: "seed" },
      maxMeters4k: { value: 48, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 350, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "crestron-dm-009",
    brand: "Crestron",
    sku: "DM-009",
    name: "Crestron Encoder 9",
    category: "Encoder",
    family: "Crestron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 79, confidence: "low", source: "seed" },
      maxMeters4k: { value: 49, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 375, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "crestron-dm-010",
    brand: "Crestron",
    sku: "DM-010",
    name: "Crestron Decoder 10",
    category: "Decoder",
    family: "Crestron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "8K", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 40, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 80, confidence: "low", source: "seed" },
      maxMeters4k: { value: 50, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: true, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 400, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "crestron-dm-011",
    brand: "Crestron",
    sku: "DM-011",
    name: "Crestron Extender 11",
    category: "Extender",
    family: "Crestron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDBaseT"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 81, confidence: "low", source: "seed" },
      maxMeters4k: { value: 51, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 425, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "crestron-dm-012",
    brand: "Crestron",
    sku: "DM-012",
    name: "Crestron Matrix 12",
    category: "Matrix",
    family: "Crestron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: false, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 82, confidence: "low", source: "seed" },
      maxMeters4k: { value: 52, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 450, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "crestron-dm-013",
    brand: "Crestron",
    sku: "DM-013",
    name: "Crestron Switcher 13",
    category: "Switcher",
    family: "Crestron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 83, confidence: "low", source: "seed" },
      maxMeters4k: { value: 53, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 475, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "crestron-dm-014",
    brand: "Crestron",
    sku: "DM-014",
    name: "Crestron Encoder 14",
    category: "Encoder",
    family: "Crestron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 84, confidence: "low", source: "seed" },
      maxMeters4k: { value: 54, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 500, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "crestron-dm-015",
    brand: "Crestron",
    sku: "DM-015",
    name: "Crestron Decoder 15",
    category: "Decoder",
    family: "Crestron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 85, confidence: "low", source: "seed" },
      maxMeters4k: { value: 55, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: true, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 525, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "crestron-dm-016",
    brand: "Crestron",
    sku: "DM-016",
    name: "Crestron Extender 16",
    category: "Extender",
    family: "Crestron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: false, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDBaseT"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 86, confidence: "low", source: "seed" },
      maxMeters4k: { value: 56, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 550, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "crestron-dm-017",
    brand: "Crestron",
    sku: "DM-017",
    name: "Crestron Matrix 17",
    category: "Matrix",
    family: "Crestron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 87, confidence: "low", source: "seed" },
      maxMeters4k: { value: 57, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 575, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "crestron-dm-018",
    brand: "Crestron",
    sku: "DM-018",
    name: "Crestron Switcher 18",
    category: "Switcher",
    family: "Crestron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 88, confidence: "low", source: "seed" },
      maxMeters4k: { value: 58, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 600, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "crestron-dm-019",
    brand: "Crestron",
    sku: "DM-019",
    name: "Crestron Encoder 19",
    category: "Encoder",
    family: "Crestron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 89, confidence: "low", source: "seed" },
      maxMeters4k: { value: 59, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 625, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "crestron-dm-020",
    brand: "Crestron",
    sku: "DM-020",
    name: "Crestron Decoder 20",
    category: "Decoder",
    family: "Crestron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "8K", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 40, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: false, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 90, confidence: "low", source: "seed" },
      maxMeters4k: { value: 60, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: true, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 650, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "crestron-dm-021",
    brand: "Crestron",
    sku: "DM-021",
    name: "Crestron Extender 21",
    category: "Extender",
    family: "Crestron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDBaseT"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 91, confidence: "low", source: "seed" },
      maxMeters4k: { value: 61, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 675, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "crestron-dm-022",
    brand: "Crestron",
    sku: "DM-022",
    name: "Crestron Matrix 22",
    category: "Matrix",
    family: "Crestron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 92, confidence: "low", source: "seed" },
      maxMeters4k: { value: 62, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 700, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "crestron-dm-023",
    brand: "Crestron",
    sku: "DM-023",
    name: "Crestron Switcher 23",
    category: "Switcher",
    family: "Crestron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 93, confidence: "low", source: "seed" },
      maxMeters4k: { value: 63, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 725, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "crestron-dm-024",
    brand: "Crestron",
    sku: "DM-024",
    name: "Crestron Encoder 24",
    category: "Encoder",
    family: "Crestron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: false, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 94, confidence: "low", source: "seed" },
      maxMeters4k: { value: 64, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 750, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "crestron-dm-025",
    brand: "Crestron",
    sku: "DM-025",
    name: "Crestron Decoder 25",
    category: "Decoder",
    family: "Crestron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 95, confidence: "low", source: "seed" },
      maxMeters4k: { value: 65, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: true, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 775, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "crestron-dm-026",
    brand: "Crestron",
    sku: "DM-026",
    name: "Crestron Extender 26",
    category: "Extender",
    family: "Crestron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDBaseT"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 96, confidence: "low", source: "seed" },
      maxMeters4k: { value: 66, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 800, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "crestron-dm-027",
    brand: "Crestron",
    sku: "DM-027",
    name: "Crestron Matrix 27",
    category: "Matrix",
    family: "Crestron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 97, confidence: "low", source: "seed" },
      maxMeters4k: { value: 67, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 825, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "crestron-dm-028",
    brand: "Crestron",
    sku: "DM-028",
    name: "Crestron Switcher 28",
    category: "Switcher",
    family: "Crestron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: false, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 98, confidence: "low", source: "seed" },
      maxMeters4k: { value: 68, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 850, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "crestron-dm-029",
    brand: "Crestron",
    sku: "DM-029",
    name: "Crestron Encoder 29",
    category: "Encoder",
    family: "Crestron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 99, confidence: "low", source: "seed" },
      maxMeters4k: { value: 69, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 875, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "crestron-dm-030",
    brand: "Crestron",
    sku: "DM-030",
    name: "Crestron Decoder 30",
    category: "Decoder",
    family: "Crestron Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "8K", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 40, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 100, confidence: "low", source: "seed" },
      maxMeters4k: { value: 70, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: true, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 900, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "atlona-at-001",
    brand: "Atlona",
    sku: "AT-001",
    name: "Atlona Extender 1",
    category: "Extender",
    family: "Atlona Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDBaseT"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 71, confidence: "low", source: "seed" },
      maxMeters4k: { value: 41, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 175, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "atlona-at-002",
    brand: "Atlona",
    sku: "AT-002",
    name: "Atlona Matrix 2",
    category: "Matrix",
    family: "Atlona Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 72, confidence: "low", source: "seed" },
      maxMeters4k: { value: 42, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 200, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "atlona-at-003",
    brand: "Atlona",
    sku: "AT-003",
    name: "Atlona Switcher 3",
    category: "Switcher",
    family: "Atlona Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 73, confidence: "low", source: "seed" },
      maxMeters4k: { value: 43, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 225, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "atlona-at-004",
    brand: "Atlona",
    sku: "AT-004",
    name: "Atlona Encoder 4",
    category: "Encoder",
    family: "Atlona Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: false, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 74, confidence: "low", source: "seed" },
      maxMeters4k: { value: 44, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 250, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "atlona-at-005",
    brand: "Atlona",
    sku: "AT-005",
    name: "Atlona Decoder 5",
    category: "Decoder",
    family: "Atlona Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 75, confidence: "low", source: "seed" },
      maxMeters4k: { value: 45, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: true, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 275, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "atlona-at-006",
    brand: "Atlona",
    sku: "AT-006",
    name: "Atlona Extender 6",
    category: "Extender",
    family: "Atlona Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDBaseT"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 76, confidence: "low", source: "seed" },
      maxMeters4k: { value: 46, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 300, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "atlona-at-007",
    brand: "Atlona",
    sku: "AT-007",
    name: "Atlona Matrix 7",
    category: "Matrix",
    family: "Atlona Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 77, confidence: "low", source: "seed" },
      maxMeters4k: { value: 47, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 325, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "atlona-at-008",
    brand: "Atlona",
    sku: "AT-008",
    name: "Atlona Switcher 8",
    category: "Switcher",
    family: "Atlona Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: false, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 78, confidence: "low", source: "seed" },
      maxMeters4k: { value: 48, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 350, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "atlona-at-009",
    brand: "Atlona",
    sku: "AT-009",
    name: "Atlona Encoder 9",
    category: "Encoder",
    family: "Atlona Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 79, confidence: "low", source: "seed" },
      maxMeters4k: { value: 49, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 375, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "atlona-at-010",
    brand: "Atlona",
    sku: "AT-010",
    name: "Atlona Decoder 10",
    category: "Decoder",
    family: "Atlona Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "8K", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 40, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 80, confidence: "low", source: "seed" },
      maxMeters4k: { value: 50, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: true, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 400, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "atlona-at-011",
    brand: "Atlona",
    sku: "AT-011",
    name: "Atlona Extender 11",
    category: "Extender",
    family: "Atlona Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDBaseT"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 81, confidence: "low", source: "seed" },
      maxMeters4k: { value: 51, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 425, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "atlona-at-012",
    brand: "Atlona",
    sku: "AT-012",
    name: "Atlona Matrix 12",
    category: "Matrix",
    family: "Atlona Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: false, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 82, confidence: "low", source: "seed" },
      maxMeters4k: { value: 52, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 450, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "atlona-at-013",
    brand: "Atlona",
    sku: "AT-013",
    name: "Atlona Switcher 13",
    category: "Switcher",
    family: "Atlona Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 83, confidence: "low", source: "seed" },
      maxMeters4k: { value: 53, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 475, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "atlona-at-014",
    brand: "Atlona",
    sku: "AT-014",
    name: "Atlona Encoder 14",
    category: "Encoder",
    family: "Atlona Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 84, confidence: "low", source: "seed" },
      maxMeters4k: { value: 54, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 500, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "atlona-at-015",
    brand: "Atlona",
    sku: "AT-015",
    name: "Atlona Decoder 15",
    category: "Decoder",
    family: "Atlona Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 85, confidence: "low", source: "seed" },
      maxMeters4k: { value: 55, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: true, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 525, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "atlona-at-016",
    brand: "Atlona",
    sku: "AT-016",
    name: "Atlona Extender 16",
    category: "Extender",
    family: "Atlona Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: false, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDBaseT"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 86, confidence: "low", source: "seed" },
      maxMeters4k: { value: 56, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 550, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "atlona-at-017",
    brand: "Atlona",
    sku: "AT-017",
    name: "Atlona Matrix 17",
    category: "Matrix",
    family: "Atlona Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 87, confidence: "low", source: "seed" },
      maxMeters4k: { value: 57, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 575, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "atlona-at-018",
    brand: "Atlona",
    sku: "AT-018",
    name: "Atlona Switcher 18",
    category: "Switcher",
    family: "Atlona Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 88, confidence: "low", source: "seed" },
      maxMeters4k: { value: 58, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 600, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "atlona-at-019",
    brand: "Atlona",
    sku: "AT-019",
    name: "Atlona Encoder 19",
    category: "Encoder",
    family: "Atlona Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 89, confidence: "low", source: "seed" },
      maxMeters4k: { value: 59, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 625, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "atlona-at-020",
    brand: "Atlona",
    sku: "AT-020",
    name: "Atlona Decoder 20",
    category: "Decoder",
    family: "Atlona Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "8K", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 40, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: false, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 90, confidence: "low", source: "seed" },
      maxMeters4k: { value: 60, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: true, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 650, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "atlona-at-021",
    brand: "Atlona",
    sku: "AT-021",
    name: "Atlona Extender 21",
    category: "Extender",
    family: "Atlona Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDBaseT"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 91, confidence: "low", source: "seed" },
      maxMeters4k: { value: 61, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 675, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "atlona-at-022",
    brand: "Atlona",
    sku: "AT-022",
    name: "Atlona Matrix 22",
    category: "Matrix",
    family: "Atlona Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 92, confidence: "low", source: "seed" },
      maxMeters4k: { value: 62, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 700, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "atlona-at-023",
    brand: "Atlona",
    sku: "AT-023",
    name: "Atlona Switcher 23",
    category: "Switcher",
    family: "Atlona Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 93, confidence: "low", source: "seed" },
      maxMeters4k: { value: 63, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 725, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "atlona-at-024",
    brand: "Atlona",
    sku: "AT-024",
    name: "Atlona Encoder 24",
    category: "Encoder",
    family: "Atlona Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: false, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 94, confidence: "low", source: "seed" },
      maxMeters4k: { value: 64, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 750, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "atlona-at-025",
    brand: "Atlona",
    sku: "AT-025",
    name: "Atlona Decoder 25",
    category: "Decoder",
    family: "Atlona Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 95, confidence: "low", source: "seed" },
      maxMeters4k: { value: 65, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: true, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 775, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "atlona-at-026",
    brand: "Atlona",
    sku: "AT-026",
    name: "Atlona Extender 26",
    category: "Extender",
    family: "Atlona Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDBaseT"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 96, confidence: "low", source: "seed" },
      maxMeters4k: { value: 66, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 800, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "atlona-at-027",
    brand: "Atlona",
    sku: "AT-027",
    name: "Atlona Matrix 27",
    category: "Matrix",
    family: "Atlona Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 97, confidence: "low", source: "seed" },
      maxMeters4k: { value: 67, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 825, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "atlona-at-028",
    brand: "Atlona",
    sku: "AT-028",
    name: "Atlona Switcher 28",
    category: "Switcher",
    family: "Atlona Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: false, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 98, confidence: "low", source: "seed" },
      maxMeters4k: { value: 68, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 850, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "atlona-at-029",
    brand: "Atlona",
    sku: "AT-029",
    name: "Atlona Encoder 29",
    category: "Encoder",
    family: "Atlona Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 99, confidence: "low", source: "seed" },
      maxMeters4k: { value: 69, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 875, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "atlona-at-030",
    brand: "Atlona",
    sku: "AT-030",
    name: "Atlona Decoder 30",
    category: "Decoder",
    family: "Atlona Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "8K", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 40, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 100, confidence: "low", source: "seed" },
      maxMeters4k: { value: 70, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: true, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 900, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "blustream-blu-001",
    brand: "Blustream",
    sku: "BLU-001",
    name: "Blustream Extender 1",
    category: "Extender",
    family: "Blustream Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDBaseT"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 71, confidence: "low", source: "seed" },
      maxMeters4k: { value: 41, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 175, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "blustream-blu-002",
    brand: "Blustream",
    sku: "BLU-002",
    name: "Blustream Matrix 2",
    category: "Matrix",
    family: "Blustream Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 72, confidence: "low", source: "seed" },
      maxMeters4k: { value: 42, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 200, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "blustream-blu-003",
    brand: "Blustream",
    sku: "BLU-003",
    name: "Blustream Switcher 3",
    category: "Switcher",
    family: "Blustream Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 73, confidence: "low", source: "seed" },
      maxMeters4k: { value: 43, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 225, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "blustream-blu-004",
    brand: "Blustream",
    sku: "BLU-004",
    name: "Blustream Encoder 4",
    category: "Encoder",
    family: "Blustream Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: false, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 74, confidence: "low", source: "seed" },
      maxMeters4k: { value: 44, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 250, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "blustream-blu-005",
    brand: "Blustream",
    sku: "BLU-005",
    name: "Blustream Decoder 5",
    category: "Decoder",
    family: "Blustream Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 75, confidence: "low", source: "seed" },
      maxMeters4k: { value: 45, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: true, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 275, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "blustream-blu-006",
    brand: "Blustream",
    sku: "BLU-006",
    name: "Blustream Extender 6",
    category: "Extender",
    family: "Blustream Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDBaseT"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 76, confidence: "low", source: "seed" },
      maxMeters4k: { value: 46, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 300, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "blustream-blu-007",
    brand: "Blustream",
    sku: "BLU-007",
    name: "Blustream Matrix 7",
    category: "Matrix",
    family: "Blustream Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 77, confidence: "low", source: "seed" },
      maxMeters4k: { value: 47, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 325, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "blustream-blu-008",
    brand: "Blustream",
    sku: "BLU-008",
    name: "Blustream Switcher 8",
    category: "Switcher",
    family: "Blustream Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: false, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 78, confidence: "low", source: "seed" },
      maxMeters4k: { value: 48, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 350, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "blustream-blu-009",
    brand: "Blustream",
    sku: "BLU-009",
    name: "Blustream Encoder 9",
    category: "Encoder",
    family: "Blustream Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 79, confidence: "low", source: "seed" },
      maxMeters4k: { value: 49, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 375, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "blustream-blu-010",
    brand: "Blustream",
    sku: "BLU-010",
    name: "Blustream Decoder 10",
    category: "Decoder",
    family: "Blustream Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "8K", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 40, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 80, confidence: "low", source: "seed" },
      maxMeters4k: { value: 50, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: true, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 400, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "blustream-blu-011",
    brand: "Blustream",
    sku: "BLU-011",
    name: "Blustream Extender 11",
    category: "Extender",
    family: "Blustream Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDBaseT"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 81, confidence: "low", source: "seed" },
      maxMeters4k: { value: 51, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 425, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "blustream-blu-012",
    brand: "Blustream",
    sku: "BLU-012",
    name: "Blustream Matrix 12",
    category: "Matrix",
    family: "Blustream Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: false, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 82, confidence: "low", source: "seed" },
      maxMeters4k: { value: 52, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 450, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "blustream-blu-013",
    brand: "Blustream",
    sku: "BLU-013",
    name: "Blustream Switcher 13",
    category: "Switcher",
    family: "Blustream Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 83, confidence: "low", source: "seed" },
      maxMeters4k: { value: 53, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 475, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "blustream-blu-014",
    brand: "Blustream",
    sku: "BLU-014",
    name: "Blustream Encoder 14",
    category: "Encoder",
    family: "Blustream Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 84, confidence: "low", source: "seed" },
      maxMeters4k: { value: 54, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 500, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "blustream-blu-015",
    brand: "Blustream",
    sku: "BLU-015",
    name: "Blustream Decoder 15",
    category: "Decoder",
    family: "Blustream Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 85, confidence: "low", source: "seed" },
      maxMeters4k: { value: 55, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: true, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 525, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "blustream-blu-016",
    brand: "Blustream",
    sku: "BLU-016",
    name: "Blustream Extender 16",
    category: "Extender",
    family: "Blustream Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: false, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDBaseT"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 86, confidence: "low", source: "seed" },
      maxMeters4k: { value: 56, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 550, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "blustream-blu-017",
    brand: "Blustream",
    sku: "BLU-017",
    name: "Blustream Matrix 17",
    category: "Matrix",
    family: "Blustream Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 87, confidence: "low", source: "seed" },
      maxMeters4k: { value: 57, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 575, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "blustream-blu-018",
    brand: "Blustream",
    sku: "BLU-018",
    name: "Blustream Switcher 18",
    category: "Switcher",
    family: "Blustream Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 88, confidence: "low", source: "seed" },
      maxMeters4k: { value: 58, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 600, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "blustream-blu-019",
    brand: "Blustream",
    sku: "BLU-019",
    name: "Blustream Encoder 19",
    category: "Encoder",
    family: "Blustream Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 89, confidence: "low", source: "seed" },
      maxMeters4k: { value: 59, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 625, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "blustream-blu-020",
    brand: "Blustream",
    sku: "BLU-020",
    name: "Blustream Decoder 20",
    category: "Decoder",
    family: "Blustream Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "8K", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 40, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: false, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 90, confidence: "low", source: "seed" },
      maxMeters4k: { value: 60, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: true, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 650, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "blustream-blu-021",
    brand: "Blustream",
    sku: "BLU-021",
    name: "Blustream Extender 21",
    category: "Extender",
    family: "Blustream Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDBaseT"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 91, confidence: "low", source: "seed" },
      maxMeters4k: { value: 61, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 675, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "blustream-blu-022",
    brand: "Blustream",
    sku: "BLU-022",
    name: "Blustream Matrix 22",
    category: "Matrix",
    family: "Blustream Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 92, confidence: "low", source: "seed" },
      maxMeters4k: { value: 62, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 700, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "blustream-blu-023",
    brand: "Blustream",
    sku: "BLU-023",
    name: "Blustream Switcher 23",
    category: "Switcher",
    family: "Blustream Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 93, confidence: "low", source: "seed" },
      maxMeters4k: { value: 63, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 725, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "blustream-blu-024",
    brand: "Blustream",
    sku: "BLU-024",
    name: "Blustream Encoder 24",
    category: "Encoder",
    family: "Blustream Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: false, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 94, confidence: "low", source: "seed" },
      maxMeters4k: { value: 64, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 750, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "blustream-blu-025",
    brand: "Blustream",
    sku: "BLU-025",
    name: "Blustream Decoder 25",
    category: "Decoder",
    family: "Blustream Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 95, confidence: "low", source: "seed" },
      maxMeters4k: { value: 65, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: true, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 775, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "blustream-blu-026",
    brand: "Blustream",
    sku: "BLU-026",
    name: "Blustream Extender 26",
    category: "Extender",
    family: "Blustream Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDBaseT"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 96, confidence: "low", source: "seed" },
      maxMeters4k: { value: 66, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 800, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "blustream-blu-027",
    brand: "Blustream",
    sku: "BLU-027",
    name: "Blustream Matrix 27",
    category: "Matrix",
    family: "Blustream Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 97, confidence: "low", source: "seed" },
      maxMeters4k: { value: 67, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 825, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "blustream-blu-028",
    brand: "Blustream",
    sku: "BLU-028",
    name: "Blustream Switcher 28",
    category: "Switcher",
    family: "Blustream Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: false, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 98, confidence: "low", source: "seed" },
      maxMeters4k: { value: 68, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 850, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "blustream-blu-029",
    brand: "Blustream",
    sku: "BLU-029",
    name: "Blustream Encoder 29",
    category: "Encoder",
    family: "Blustream Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 99, confidence: "low", source: "seed" },
      maxMeters4k: { value: 69, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 875, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "blustream-blu-030",
    brand: "Blustream",
    sku: "BLU-030",
    name: "Blustream Decoder 30",
    category: "Decoder",
    family: "Blustream Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "8K", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 40, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 100, confidence: "low", source: "seed" },
      maxMeters4k: { value: 70, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: true, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 900, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "zeevee-zv-001",
    brand: "ZeeVee",
    sku: "ZV-001",
    name: "ZeeVee Encoder 1",
    category: "Encoder",
    family: "ZeeVee Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      transport: { value: "AVoIP", confidence: "medium", source: "brand-template" },
      poe: { value: true, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 71, confidence: "low", source: "seed" },
      maxMeters4k: { value: 41, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 175, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "zeevee-zv-002",
    brand: "ZeeVee",
    sku: "ZV-002",
    name: "ZeeVee Decoder 2",
    category: "Decoder",
    family: "ZeeVee Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "AVoIP", confidence: "medium", source: "brand-template" },
      poe: { value: true, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 72, confidence: "low", source: "seed" },
      maxMeters4k: { value: 42, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 200, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "zeevee-zv-003",
    brand: "ZeeVee",
    sku: "ZV-003",
    name: "ZeeVee Matrix 3",
    category: "Matrix",
    family: "ZeeVee Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "AVoIP", confidence: "medium", source: "brand-template" },
      poe: { value: true, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 73, confidence: "low", source: "seed" },
      maxMeters4k: { value: 43, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 225, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "zeevee-zv-004",
    brand: "ZeeVee",
    sku: "ZV-004",
    name: "ZeeVee Switcher 4",
    category: "Switcher",
    family: "ZeeVee Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: false, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "AVoIP", confidence: "medium", source: "brand-template" },
      poe: { value: true, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 74, confidence: "low", source: "seed" },
      maxMeters4k: { value: 44, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 250, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "zeevee-zv-005",
    brand: "ZeeVee",
    sku: "ZV-005",
    name: "ZeeVee Extender 5",
    category: "Extender",
    family: "ZeeVee Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDBaseT"], confidence: "medium", source: "seed" },
      transport: { value: "AVoIP", confidence: "medium", source: "brand-template" },
      poe: { value: true, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 75, confidence: "low", source: "seed" },
      maxMeters4k: { value: 45, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: true, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 275, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "zeevee-zv-006",
    brand: "ZeeVee",
    sku: "ZV-006",
    name: "ZeeVee Encoder 6",
    category: "Encoder",
    family: "ZeeVee Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      transport: { value: "AVoIP", confidence: "medium", source: "brand-template" },
      poe: { value: true, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 76, confidence: "low", source: "seed" },
      maxMeters4k: { value: 46, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 300, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "zeevee-zv-007",
    brand: "ZeeVee",
    sku: "ZV-007",
    name: "ZeeVee Decoder 7",
    category: "Decoder",
    family: "ZeeVee Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "AVoIP", confidence: "medium", source: "brand-template" },
      poe: { value: true, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 77, confidence: "low", source: "seed" },
      maxMeters4k: { value: 47, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 325, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "zeevee-zv-008",
    brand: "ZeeVee",
    sku: "ZV-008",
    name: "ZeeVee Matrix 8",
    category: "Matrix",
    family: "ZeeVee Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: false, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "AVoIP", confidence: "medium", source: "brand-template" },
      poe: { value: true, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 78, confidence: "low", source: "seed" },
      maxMeters4k: { value: 48, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 350, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "zeevee-zv-009",
    brand: "ZeeVee",
    sku: "ZV-009",
    name: "ZeeVee Switcher 9",
    category: "Switcher",
    family: "ZeeVee Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "AVoIP", confidence: "medium", source: "brand-template" },
      poe: { value: true, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 79, confidence: "low", source: "seed" },
      maxMeters4k: { value: 49, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 375, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "zeevee-zv-010",
    brand: "ZeeVee",
    sku: "ZV-010",
    name: "ZeeVee Extender 10",
    category: "Extender",
    family: "ZeeVee Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "8K", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 40, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDBaseT"], confidence: "medium", source: "seed" },
      transport: { value: "AVoIP", confidence: "medium", source: "brand-template" },
      poe: { value: true, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 80, confidence: "low", source: "seed" },
      maxMeters4k: { value: 50, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: true, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 400, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "zeevee-zv-011",
    brand: "ZeeVee",
    sku: "ZV-011",
    name: "ZeeVee Encoder 11",
    category: "Encoder",
    family: "ZeeVee Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      transport: { value: "AVoIP", confidence: "medium", source: "brand-template" },
      poe: { value: true, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 81, confidence: "low", source: "seed" },
      maxMeters4k: { value: 51, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 425, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "zeevee-zv-012",
    brand: "ZeeVee",
    sku: "ZV-012",
    name: "ZeeVee Decoder 12",
    category: "Decoder",
    family: "ZeeVee Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: false, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "AVoIP", confidence: "medium", source: "brand-template" },
      poe: { value: true, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 82, confidence: "low", source: "seed" },
      maxMeters4k: { value: 52, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 450, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "zeevee-zv-013",
    brand: "ZeeVee",
    sku: "ZV-013",
    name: "ZeeVee Matrix 13",
    category: "Matrix",
    family: "ZeeVee Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "AVoIP", confidence: "medium", source: "brand-template" },
      poe: { value: true, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 83, confidence: "low", source: "seed" },
      maxMeters4k: { value: 53, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 475, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "zeevee-zv-014",
    brand: "ZeeVee",
    sku: "ZV-014",
    name: "ZeeVee Switcher 14",
    category: "Switcher",
    family: "ZeeVee Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "AVoIP", confidence: "medium", source: "brand-template" },
      poe: { value: true, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 84, confidence: "low", source: "seed" },
      maxMeters4k: { value: 54, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 500, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "zeevee-zv-015",
    brand: "ZeeVee",
    sku: "ZV-015",
    name: "ZeeVee Extender 15",
    category: "Extender",
    family: "ZeeVee Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDBaseT"], confidence: "medium", source: "seed" },
      transport: { value: "AVoIP", confidence: "medium", source: "brand-template" },
      poe: { value: true, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 85, confidence: "low", source: "seed" },
      maxMeters4k: { value: 55, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: true, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 525, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "zeevee-zv-016",
    brand: "ZeeVee",
    sku: "ZV-016",
    name: "ZeeVee Encoder 16",
    category: "Encoder",
    family: "ZeeVee Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: false, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      transport: { value: "AVoIP", confidence: "medium", source: "brand-template" },
      poe: { value: true, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 86, confidence: "low", source: "seed" },
      maxMeters4k: { value: 56, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 550, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "zeevee-zv-017",
    brand: "ZeeVee",
    sku: "ZV-017",
    name: "ZeeVee Decoder 17",
    category: "Decoder",
    family: "ZeeVee Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "AVoIP", confidence: "medium", source: "brand-template" },
      poe: { value: true, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 87, confidence: "low", source: "seed" },
      maxMeters4k: { value: 57, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 575, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "zeevee-zv-018",
    brand: "ZeeVee",
    sku: "ZV-018",
    name: "ZeeVee Matrix 18",
    category: "Matrix",
    family: "ZeeVee Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "AVoIP", confidence: "medium", source: "brand-template" },
      poe: { value: true, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 88, confidence: "low", source: "seed" },
      maxMeters4k: { value: 58, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 600, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "zeevee-zv-019",
    brand: "ZeeVee",
    sku: "ZV-019",
    name: "ZeeVee Switcher 19",
    category: "Switcher",
    family: "ZeeVee Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "AVoIP", confidence: "medium", source: "brand-template" },
      poe: { value: true, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 89, confidence: "low", source: "seed" },
      maxMeters4k: { value: 59, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 625, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "zeevee-zv-020",
    brand: "ZeeVee",
    sku: "ZV-020",
    name: "ZeeVee Extender 20",
    category: "Extender",
    family: "ZeeVee Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "8K", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 40, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: false, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDBaseT"], confidence: "medium", source: "seed" },
      transport: { value: "AVoIP", confidence: "medium", source: "brand-template" },
      poe: { value: true, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 90, confidence: "low", source: "seed" },
      maxMeters4k: { value: 60, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: true, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 650, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "zeevee-zv-021",
    brand: "ZeeVee",
    sku: "ZV-021",
    name: "ZeeVee Encoder 21",
    category: "Encoder",
    family: "ZeeVee Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      transport: { value: "AVoIP", confidence: "medium", source: "brand-template" },
      poe: { value: true, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 91, confidence: "low", source: "seed" },
      maxMeters4k: { value: 61, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 675, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "zeevee-zv-022",
    brand: "ZeeVee",
    sku: "ZV-022",
    name: "ZeeVee Decoder 22",
    category: "Decoder",
    family: "ZeeVee Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "AVoIP", confidence: "medium", source: "brand-template" },
      poe: { value: true, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 92, confidence: "low", source: "seed" },
      maxMeters4k: { value: 62, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 700, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "zeevee-zv-023",
    brand: "ZeeVee",
    sku: "ZV-023",
    name: "ZeeVee Matrix 23",
    category: "Matrix",
    family: "ZeeVee Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "AVoIP", confidence: "medium", source: "brand-template" },
      poe: { value: true, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 93, confidence: "low", source: "seed" },
      maxMeters4k: { value: 63, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 725, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "zeevee-zv-024",
    brand: "ZeeVee",
    sku: "ZV-024",
    name: "ZeeVee Switcher 24",
    category: "Switcher",
    family: "ZeeVee Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: false, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "AVoIP", confidence: "medium", source: "brand-template" },
      poe: { value: true, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 94, confidence: "low", source: "seed" },
      maxMeters4k: { value: 64, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 750, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "zeevee-zv-025",
    brand: "ZeeVee",
    sku: "ZV-025",
    name: "ZeeVee Extender 25",
    category: "Extender",
    family: "ZeeVee Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDBaseT"], confidence: "medium", source: "seed" },
      transport: { value: "AVoIP", confidence: "medium", source: "brand-template" },
      poe: { value: true, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 95, confidence: "low", source: "seed" },
      maxMeters4k: { value: 65, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: true, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 775, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "zeevee-zv-026",
    brand: "ZeeVee",
    sku: "ZV-026",
    name: "ZeeVee Encoder 26",
    category: "Encoder",
    family: "ZeeVee Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      transport: { value: "AVoIP", confidence: "medium", source: "brand-template" },
      poe: { value: true, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 96, confidence: "low", source: "seed" },
      maxMeters4k: { value: 66, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 800, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "zeevee-zv-027",
    brand: "ZeeVee",
    sku: "ZV-027",
    name: "ZeeVee Decoder 27",
    category: "Decoder",
    family: "ZeeVee Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "AVoIP", confidence: "medium", source: "brand-template" },
      poe: { value: true, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 97, confidence: "low", source: "seed" },
      maxMeters4k: { value: 67, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 825, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "zeevee-zv-028",
    brand: "ZeeVee",
    sku: "ZV-028",
    name: "ZeeVee Matrix 28",
    category: "Matrix",
    family: "ZeeVee Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: false, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "AVoIP", confidence: "medium", source: "brand-template" },
      poe: { value: true, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 98, confidence: "low", source: "seed" },
      maxMeters4k: { value: 68, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 850, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "zeevee-zv-029",
    brand: "ZeeVee",
    sku: "ZV-029",
    name: "ZeeVee Switcher 29",
    category: "Switcher",
    family: "ZeeVee Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "AVoIP", confidence: "medium", source: "brand-template" },
      poe: { value: true, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 99, confidence: "low", source: "seed" },
      maxMeters4k: { value: 69, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 875, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "zeevee-zv-030",
    brand: "ZeeVee",
    sku: "ZV-030",
    name: "ZeeVee Extender 30",
    category: "Extender",
    family: "ZeeVee Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "8K", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 40, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDBaseT"], confidence: "medium", source: "seed" },
      transport: { value: "AVoIP", confidence: "medium", source: "brand-template" },
      poe: { value: true, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 100, confidence: "low", source: "seed" },
      maxMeters4k: { value: 70, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: true, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 900, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "lightware-lw-001",
    brand: "Lightware",
    sku: "LW-001",
    name: "Lightware Extender 1",
    category: "Extender",
    family: "Lightware Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDBaseT"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 71, confidence: "low", source: "seed" },
      maxMeters4k: { value: 41, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 175, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "lightware-lw-002",
    brand: "Lightware",
    sku: "LW-002",
    name: "Lightware Matrix 2",
    category: "Matrix",
    family: "Lightware Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 72, confidence: "low", source: "seed" },
      maxMeters4k: { value: 42, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 200, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "lightware-lw-003",
    brand: "Lightware",
    sku: "LW-003",
    name: "Lightware Switcher 3",
    category: "Switcher",
    family: "Lightware Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 73, confidence: "low", source: "seed" },
      maxMeters4k: { value: 43, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 225, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "lightware-lw-004",
    brand: "Lightware",
    sku: "LW-004",
    name: "Lightware Encoder 4",
    category: "Encoder",
    family: "Lightware Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: false, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 74, confidence: "low", source: "seed" },
      maxMeters4k: { value: 44, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 250, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "lightware-lw-005",
    brand: "Lightware",
    sku: "LW-005",
    name: "Lightware Decoder 5",
    category: "Decoder",
    family: "Lightware Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 75, confidence: "low", source: "seed" },
      maxMeters4k: { value: 45, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: true, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 275, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "lightware-lw-006",
    brand: "Lightware",
    sku: "LW-006",
    name: "Lightware Extender 6",
    category: "Extender",
    family: "Lightware Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDBaseT"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 76, confidence: "low", source: "seed" },
      maxMeters4k: { value: 46, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 300, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "lightware-lw-007",
    brand: "Lightware",
    sku: "LW-007",
    name: "Lightware Matrix 7",
    category: "Matrix",
    family: "Lightware Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 77, confidence: "low", source: "seed" },
      maxMeters4k: { value: 47, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 325, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "lightware-lw-008",
    brand: "Lightware",
    sku: "LW-008",
    name: "Lightware Switcher 8",
    category: "Switcher",
    family: "Lightware Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: false, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 78, confidence: "low", source: "seed" },
      maxMeters4k: { value: 48, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 350, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "lightware-lw-009",
    brand: "Lightware",
    sku: "LW-009",
    name: "Lightware Encoder 9",
    category: "Encoder",
    family: "Lightware Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 79, confidence: "low", source: "seed" },
      maxMeters4k: { value: 49, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 375, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "lightware-lw-010",
    brand: "Lightware",
    sku: "LW-010",
    name: "Lightware Decoder 10",
    category: "Decoder",
    family: "Lightware Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "8K", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 40, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 80, confidence: "low", source: "seed" },
      maxMeters4k: { value: 50, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: true, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 400, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "lightware-lw-011",
    brand: "Lightware",
    sku: "LW-011",
    name: "Lightware Extender 11",
    category: "Extender",
    family: "Lightware Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDBaseT"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 81, confidence: "low", source: "seed" },
      maxMeters4k: { value: 51, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 425, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "lightware-lw-012",
    brand: "Lightware",
    sku: "LW-012",
    name: "Lightware Matrix 12",
    category: "Matrix",
    family: "Lightware Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: false, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 82, confidence: "low", source: "seed" },
      maxMeters4k: { value: 52, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 450, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "lightware-lw-013",
    brand: "Lightware",
    sku: "LW-013",
    name: "Lightware Switcher 13",
    category: "Switcher",
    family: "Lightware Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 83, confidence: "low", source: "seed" },
      maxMeters4k: { value: 53, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 475, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "lightware-lw-014",
    brand: "Lightware",
    sku: "LW-014",
    name: "Lightware Encoder 14",
    category: "Encoder",
    family: "Lightware Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 84, confidence: "low", source: "seed" },
      maxMeters4k: { value: 54, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 500, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "lightware-lw-015",
    brand: "Lightware",
    sku: "LW-015",
    name: "Lightware Decoder 15",
    category: "Decoder",
    family: "Lightware Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 85, confidence: "low", source: "seed" },
      maxMeters4k: { value: 55, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: true, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 525, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "lightware-lw-016",
    brand: "Lightware",
    sku: "LW-016",
    name: "Lightware Extender 16",
    category: "Extender",
    family: "Lightware Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: false, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDBaseT"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 86, confidence: "low", source: "seed" },
      maxMeters4k: { value: 56, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 550, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "lightware-lw-017",
    brand: "Lightware",
    sku: "LW-017",
    name: "Lightware Matrix 17",
    category: "Matrix",
    family: "Lightware Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 87, confidence: "low", source: "seed" },
      maxMeters4k: { value: 57, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 575, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "lightware-lw-018",
    brand: "Lightware",
    sku: "LW-018",
    name: "Lightware Switcher 18",
    category: "Switcher",
    family: "Lightware Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 88, confidence: "low", source: "seed" },
      maxMeters4k: { value: 58, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 600, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "lightware-lw-019",
    brand: "Lightware",
    sku: "LW-019",
    name: "Lightware Encoder 19",
    category: "Encoder",
    family: "Lightware Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 89, confidence: "low", source: "seed" },
      maxMeters4k: { value: 59, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 625, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "lightware-lw-020",
    brand: "Lightware",
    sku: "LW-020",
    name: "Lightware Decoder 20",
    category: "Decoder",
    family: "Lightware Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "8K", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 40, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: false, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 90, confidence: "low", source: "seed" },
      maxMeters4k: { value: 60, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: true, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 650, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "lightware-lw-021",
    brand: "Lightware",
    sku: "LW-021",
    name: "Lightware Extender 21",
    category: "Extender",
    family: "Lightware Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDBaseT"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 91, confidence: "low", source: "seed" },
      maxMeters4k: { value: 61, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 675, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "lightware-lw-022",
    brand: "Lightware",
    sku: "LW-022",
    name: "Lightware Matrix 22",
    category: "Matrix",
    family: "Lightware Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 92, confidence: "low", source: "seed" },
      maxMeters4k: { value: 62, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 700, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "lightware-lw-023",
    brand: "Lightware",
    sku: "LW-023",
    name: "Lightware Switcher 23",
    category: "Switcher",
    family: "Lightware Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 93, confidence: "low", source: "seed" },
      maxMeters4k: { value: 63, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 725, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "lightware-lw-024",
    brand: "Lightware",
    sku: "LW-024",
    name: "Lightware Encoder 24",
    category: "Encoder",
    family: "Lightware Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: false, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 94, confidence: "low", source: "seed" },
      maxMeters4k: { value: 64, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 750, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "lightware-lw-025",
    brand: "Lightware",
    sku: "LW-025",
    name: "Lightware Decoder 25",
    category: "Decoder",
    family: "Lightware Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 95, confidence: "low", source: "seed" },
      maxMeters4k: { value: 65, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: true, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 775, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "lightware-lw-026",
    brand: "Lightware",
    sku: "LW-026",
    name: "Lightware Extender 26",
    category: "Extender",
    family: "Lightware Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDBaseT"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 96, confidence: "low", source: "seed" },
      maxMeters4k: { value: 66, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 800, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "lightware-lw-027",
    brand: "Lightware",
    sku: "LW-027",
    name: "Lightware Matrix 27",
    category: "Matrix",
    family: "Lightware Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 97, confidence: "low", source: "seed" },
      maxMeters4k: { value: 67, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 825, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "lightware-lw-028",
    brand: "Lightware",
    sku: "LW-028",
    name: "Lightware Switcher 28",
    category: "Switcher",
    family: "Lightware Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: false, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 98, confidence: "low", source: "seed" },
      maxMeters4k: { value: 68, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 850, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "lightware-lw-029",
    brand: "Lightware",
    sku: "LW-029",
    name: "Lightware Encoder 29",
    category: "Encoder",
    family: "Lightware Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 99, confidence: "low", source: "seed" },
      maxMeters4k: { value: 69, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 875, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "lightware-lw-030",
    brand: "Lightware",
    sku: "LW-030",
    name: "Lightware Decoder 30",
    category: "Decoder",
    family: "Lightware Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "8K", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 40, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "Unknown", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 100, confidence: "low", source: "seed" },
      maxMeters4k: { value: 70, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: true, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 900, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "avpro-edge-avp-001",
    brand: "AVPro Edge",
    sku: "AVP-001",
    name: "AVPro Edge Extender 1",
    category: "Extender",
    family: "AVPro Edge Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDBaseT"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 71, confidence: "low", source: "seed" },
      maxMeters4k: { value: 41, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 175, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "avpro-edge-avp-002",
    brand: "AVPro Edge",
    sku: "AVP-002",
    name: "AVPro Edge Matrix 2",
    category: "Matrix",
    family: "AVPro Edge Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 72, confidence: "low", source: "seed" },
      maxMeters4k: { value: 42, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 200, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "avpro-edge-avp-003",
    brand: "AVPro Edge",
    sku: "AVP-003",
    name: "AVPro Edge Switcher 3",
    category: "Switcher",
    family: "AVPro Edge Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 73, confidence: "low", source: "seed" },
      maxMeters4k: { value: 43, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 225, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "avpro-edge-avp-004",
    brand: "AVPro Edge",
    sku: "AVP-004",
    name: "AVPro Edge Encoder 4",
    category: "Encoder",
    family: "AVPro Edge Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: false, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 74, confidence: "low", source: "seed" },
      maxMeters4k: { value: 44, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 250, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "avpro-edge-avp-005",
    brand: "AVPro Edge",
    sku: "AVP-005",
    name: "AVPro Edge Decoder 5",
    category: "Decoder",
    family: "AVPro Edge Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 75, confidence: "low", source: "seed" },
      maxMeters4k: { value: 45, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: true, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 275, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "avpro-edge-avp-006",
    brand: "AVPro Edge",
    sku: "AVP-006",
    name: "AVPro Edge Extender 6",
    category: "Extender",
    family: "AVPro Edge Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDBaseT"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 76, confidence: "low", source: "seed" },
      maxMeters4k: { value: 46, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 300, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "avpro-edge-avp-007",
    brand: "AVPro Edge",
    sku: "AVP-007",
    name: "AVPro Edge Matrix 7",
    category: "Matrix",
    family: "AVPro Edge Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 77, confidence: "low", source: "seed" },
      maxMeters4k: { value: 47, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 325, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "avpro-edge-avp-008",
    brand: "AVPro Edge",
    sku: "AVP-008",
    name: "AVPro Edge Switcher 8",
    category: "Switcher",
    family: "AVPro Edge Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: false, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 78, confidence: "low", source: "seed" },
      maxMeters4k: { value: 48, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 350, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "avpro-edge-avp-009",
    brand: "AVPro Edge",
    sku: "AVP-009",
    name: "AVPro Edge Encoder 9",
    category: "Encoder",
    family: "AVPro Edge Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 79, confidence: "low", source: "seed" },
      maxMeters4k: { value: 49, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 375, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "avpro-edge-avp-010",
    brand: "AVPro Edge",
    sku: "AVP-010",
    name: "AVPro Edge Decoder 10",
    category: "Decoder",
    family: "AVPro Edge Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "8K", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 40, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 80, confidence: "low", source: "seed" },
      maxMeters4k: { value: 50, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: true, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 400, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "avpro-edge-avp-011",
    brand: "AVPro Edge",
    sku: "AVP-011",
    name: "AVPro Edge Extender 11",
    category: "Extender",
    family: "AVPro Edge Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDBaseT"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 81, confidence: "low", source: "seed" },
      maxMeters4k: { value: 51, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 425, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "avpro-edge-avp-012",
    brand: "AVPro Edge",
    sku: "AVP-012",
    name: "AVPro Edge Matrix 12",
    category: "Matrix",
    family: "AVPro Edge Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: false, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 82, confidence: "low", source: "seed" },
      maxMeters4k: { value: 52, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 450, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "avpro-edge-avp-013",
    brand: "AVPro Edge",
    sku: "AVP-013",
    name: "AVPro Edge Switcher 13",
    category: "Switcher",
    family: "AVPro Edge Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 83, confidence: "low", source: "seed" },
      maxMeters4k: { value: 53, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 475, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "avpro-edge-avp-014",
    brand: "AVPro Edge",
    sku: "AVP-014",
    name: "AVPro Edge Encoder 14",
    category: "Encoder",
    family: "AVPro Edge Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 84, confidence: "low", source: "seed" },
      maxMeters4k: { value: 54, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 500, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "avpro-edge-avp-015",
    brand: "AVPro Edge",
    sku: "AVP-015",
    name: "AVPro Edge Decoder 15",
    category: "Decoder",
    family: "AVPro Edge Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 85, confidence: "low", source: "seed" },
      maxMeters4k: { value: 55, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: true, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 525, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "avpro-edge-avp-016",
    brand: "AVPro Edge",
    sku: "AVP-016",
    name: "AVPro Edge Extender 16",
    category: "Extender",
    family: "AVPro Edge Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: false, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDBaseT"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 86, confidence: "low", source: "seed" },
      maxMeters4k: { value: 56, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 550, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "avpro-edge-avp-017",
    brand: "AVPro Edge",
    sku: "AVP-017",
    name: "AVPro Edge Matrix 17",
    category: "Matrix",
    family: "AVPro Edge Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 87, confidence: "low", source: "seed" },
      maxMeters4k: { value: 57, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 575, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "avpro-edge-avp-018",
    brand: "AVPro Edge",
    sku: "AVP-018",
    name: "AVPro Edge Switcher 18",
    category: "Switcher",
    family: "AVPro Edge Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 88, confidence: "low", source: "seed" },
      maxMeters4k: { value: 58, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 600, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "avpro-edge-avp-019",
    brand: "AVPro Edge",
    sku: "AVP-019",
    name: "AVPro Edge Encoder 19",
    category: "Encoder",
    family: "AVPro Edge Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 89, confidence: "low", source: "seed" },
      maxMeters4k: { value: 59, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 625, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "avpro-edge-avp-020",
    brand: "AVPro Edge",
    sku: "AVP-020",
    name: "AVPro Edge Decoder 20",
    category: "Decoder",
    family: "AVPro Edge Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "8K", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 40, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: false, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 90, confidence: "low", source: "seed" },
      maxMeters4k: { value: 60, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: true, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 650, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "avpro-edge-avp-021",
    brand: "AVPro Edge",
    sku: "AVP-021",
    name: "AVPro Edge Extender 21",
    category: "Extender",
    family: "AVPro Edge Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDBaseT"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 91, confidence: "low", source: "seed" },
      maxMeters4k: { value: 61, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 675, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "avpro-edge-avp-022",
    brand: "AVPro Edge",
    sku: "AVP-022",
    name: "AVPro Edge Matrix 22",
    category: "Matrix",
    family: "AVPro Edge Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 92, confidence: "low", source: "seed" },
      maxMeters4k: { value: 62, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 700, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "avpro-edge-avp-023",
    brand: "AVPro Edge",
    sku: "AVP-023",
    name: "AVPro Edge Switcher 23",
    category: "Switcher",
    family: "AVPro Edge Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 93, confidence: "low", source: "seed" },
      maxMeters4k: { value: 63, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 725, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "avpro-edge-avp-024",
    brand: "AVPro Edge",
    sku: "AVP-024",
    name: "AVPro Edge Encoder 24",
    category: "Encoder",
    family: "AVPro Edge Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: false, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 94, confidence: "low", source: "seed" },
      maxMeters4k: { value: 64, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 750, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "avpro-edge-avp-025",
    brand: "AVPro Edge",
    sku: "AVP-025",
    name: "AVPro Edge Decoder 25",
    category: "Decoder",
    family: "AVPro Edge Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 95, confidence: "low", source: "seed" },
      maxMeters4k: { value: 65, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: true, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 775, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "avpro-edge-avp-026",
    brand: "AVPro Edge",
    sku: "AVP-026",
    name: "AVPro Edge Extender 26",
    category: "Extender",
    family: "AVPro Edge Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDBaseT"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 96, confidence: "low", source: "seed" },
      maxMeters4k: { value: 66, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 800, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "avpro-edge-avp-027",
    brand: "AVPro Edge",
    sku: "AVP-027",
    name: "AVPro Edge Matrix 27",
    category: "Matrix",
    family: "AVPro Edge Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K30", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 10.2, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 97, confidence: "low", source: "seed" },
      maxMeters4k: { value: 67, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 825, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "avpro-edge-avp-028",
    brand: "AVPro Edge",
    sku: "AVP-028",
    name: "AVPro Edge Switcher 28",
    category: "Switcher",
    family: "AVPro Edge Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: false, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 98, confidence: "low", source: "seed" },
      maxMeters4k: { value: 68, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 850, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "avpro-edge-avp-029",
    brand: "AVPro Edge",
    sku: "AVP-029",
    name: "AVPro Edge Encoder 29",
    category: "Encoder",
    family: "AVPro Edge Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "4K60", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 18, confidence: "medium", source: "seed" },
      hdcp: { value: "2.3", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      outputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 99, confidence: "low", source: "seed" },
      maxMeters4k: { value: 69, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: false, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 875, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  },
  {
    id: "avpro-edge-avp-030",
    brand: "AVPro Edge",
    sku: "AVP-030",
    name: "AVPro Edge Decoder 30",
    category: "Decoder",
    family: "AVPro Edge Core",
    lifecycle: "active",
    notes: "Generated starter dataset record. Replace with verified distributor or manufacturer data during enrichment.",
    lastUpdated: "2026-03-18T00:00:00.000Z",
    sourceSummary: "Seeded by upgrade script",
    video: {
      maxResolution: { value: "8K", confidence: "medium", source: "seed" },
      bandwidthGbps: { value: 40, confidence: "medium", source: "seed" },
      hdcp: { value: "2.2", confidence: "medium", source: "seed" },
      hdr: { value: true, confidence: "low", source: "seed" }
    },
    connectivity: {
      inputs: { value: ["AV over IP"], confidence: "medium", source: "seed" },
      outputs: { value: ["HDMI"], confidence: "medium", source: "seed" },
      transport: { value: "HDBaseT", confidence: "medium", source: "brand-template" },
      poe: { value: false, confidence: "low", source: "brand-template" }
    },
    distance: {
      maxMeters1080p: { value: 100, confidence: "low", source: "seed" },
      maxMeters4k: { value: 70, confidence: "low", source: "seed" }
    },
    audio: {
      audioFormats: { value: ["PCM","Dolby Digital"], confidence: "low", source: "seed" },
      analogBreakout: { value: true, confidence: "low", source: "seed" }
    },
    commercial: {
      estimatedStreetPriceGbp: { value: 900, confidence: "low", source: "seed" },
      availability: { value: "unknown", confidence: "low", source: "seed" }
    }
  }
];