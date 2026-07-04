import { describe, it, expect } from "vitest";
import {
  analyzeCompetitor,
  compareCompetitor,
  type WyrestormProduct,
} from "../wingman2/lib/competitorMatchEngine";

describe("analyzeCompetitor", () => {
  describe("brand detection", () => {
    it("should detect Crestron from DM-NVX SKU", () => {
      const result = analyzeCompetitor("DM-NVX-350");
      expect(result.brand).toBe("Crestron");
    });

    it("should detect Crestron from DM NVX SKUs with missing hyphens", () => {
      const result = analyzeCompetitor("DMNVX350");
      expect(result.brand).toBe("Crestron");
      expect(result.technologyClass).toBe("AVOIP");
      expect(result.role).toBe("transceiver");
    });

    it("should detect Extron from NAV SKU", () => {
      const result = analyzeCompetitor("NAV E 501");
      expect(result.brand).toBe("Extron");
    });

    it("should detect Extron DTP when spaces are omitted", () => {
      const result = analyzeCompetitor("DTP2T211");
      expect(result.brand).toBe("Extron");
      expect(result.technologyClass).toBe("HDBASET");
      expect(result.role).toBe("transmitter");
    });

    it("should detect Atlona from AT- prefix", () => {
      const result = analyzeCompetitor("AT-OME-EX-KIT");
      expect(result.brand).toBe("Atlona");
    });

    it("should detect Kramer from KDS SKU", () => {
      const result = analyzeCompetitor("KDS-7-EN7");
      expect(result.brand).toBe("Kramer");
    });

    it("should detect AMX from NMX SKU", () => {
      const result = analyzeCompetitor("NMX-ENC-N2412A");
      expect(result.brand).toBe("AMX");
    });

    it("should detect Barco from ClickShare", () => {
      const result = analyzeCompetitor("ClickShare CX-50");
      expect(result.brand).toBe("Barco");
    });

    it("should detect ZeeVee from ZyPer", () => {
      const result = analyzeCompetitor("ZyPer4K Encoder");
      expect(result.brand).toBe("ZeeVee");
    });

    it("should return Unknown for unrecognized SKU", () => {
      const result = analyzeCompetitor("XYZ-123-ABC");
      expect(result.brand).toBe("Unknown");
    });

    it("should use provided brand when specified", () => {
      const result = analyzeCompetitor("Custom-SKU-123", "Lightware");
      expect(result.brand).toBe("Lightware");
    });
  });

  describe("technology class detection", () => {
    it("should detect AVOIP for NVX products", () => {
      const result = analyzeCompetitor("DM-NVX-360");
      expect(result.technologyClass).toBe("AVOIP");
    });

    it("should detect AVOIP for NAV products", () => {
      const result = analyzeCompetitor("NAV E 501");
      expect(result.technologyClass).toBe("AVOIP");
    });

    it("should detect AVOIP for KDS products", () => {
      const result = analyzeCompetitor("KDS-7-EN7");
      expect(result.technologyClass).toBe("AVOIP");
    });

    it("should detect HDBASET for DTP products", () => {
      const result = analyzeCompetitor("DTP2 T 211");
      expect(result.technologyClass).toBe("HDBASET");
    });

    it("should detect MATRIX for matrix products", () => {
      const result = analyzeCompetitor("VS-88H2A Matrix");
      expect(result.technologyClass).toBe("MATRIX");
    });

    it("should detect PRESENTATION for switcher products", () => {
      const result = analyzeCompetitor("IN1608 xi presentation switcher");
      expect(result.technologyClass).toBe("PRESENTATION");
    });

    it("should detect USB_CONFERENCE for conferencing products", () => {
      const result = analyzeCompetitor("USB conference system BYOD");
      expect(result.technologyClass).toBe("USB_CONFERENCE");
    });

    it("should detect WIRELESS_PRESENTATION for ClickShare", () => {
      const result = analyzeCompetitor("ClickShare wireless");
      expect(result.technologyClass).toBe("WIRELESS_PRESENTATION");
    });

    it("should detect AUDIO for Dante products", () => {
      const result = analyzeCompetitor("Dante audio processor");
      expect(result.technologyClass).toBe("AUDIO");
    });
  });

  describe("role detection", () => {
    it("should detect encoder role", () => {
      const result = analyzeCompetitor("NMX-ENC-N2412A");
      expect(result.role).toBe("encoder");
    });

    it("should detect decoder role", () => {
      const result = analyzeCompetitor("NMX-DEC-N2422A");
      expect(result.role).toBe("decoder");
    });

    it("should detect transceiver role", () => {
      const result = analyzeCompetitor("transceiver bidirectional");
      expect(result.role).toBe("transceiver");
    });

    it("should detect common DM-NVX endpoint SKUs as transceiver-class products", () => {
      const result = analyzeCompetitor("DM-NVX-360");
      expect(result.role).toBe("transceiver");
    });

    it("should detect matrix role", () => {
      const result = analyzeCompetitor("MX-8x8 Matrix");
      expect(result.role).toBe("matrix");
    });

    it("should detect switcher role", () => {
      const result = analyzeCompetitor("SW-4x1 switch");
      expect(result.role).toBe("switcher");
    });
  });

  describe("capability extraction", () => {
    it("should extract 4K capability", () => {
      const result = analyzeCompetitor("4K60 encoder");
      expect(result.capabilities).toContain("4K");
    });

    it("should extract HDR capability", () => {
      const result = analyzeCompetitor("4K HDR encoder");
      expect(result.capabilities).toContain("HDR");
    });

    it("should extract PoE capability", () => {
      const result = analyzeCompetitor("PoE powered decoder");
      expect(result.capabilities).toContain("PoE");
    });

    it("should extract Dante capability", () => {
      const result = analyzeCompetitor("Dante audio network");
      expect(result.capabilities).toContain("Dante");
    });

    it("should extract USB-C capability", () => {
      const result = analyzeCompetitor("USB-C input");
      expect(result.capabilities).toContain("USB-C");
    });

    it("should extract multiple capabilities", () => {
      const result = analyzeCompetitor("4K60 HDR PoE encoder with USB-C");
      expect(result.capabilities).toContain("4K");
      expect(result.capabilities).toContain("HDR");
      expect(result.capabilities).toContain("PoE");
      expect(result.capabilities).toContain("USB-C");
    });
  });

  describe("confidence scoring", () => {
    it("should return high confidence when brand, tech class, and role are detected", () => {
      const result = analyzeCompetitor("DM-NVX-350 encoder");
      expect(result.confidence).toBe("high");
    });

    it("should return medium confidence when only brand or tech class detected", () => {
      const result = analyzeCompetitor("Crestron something");
      expect(result.confidence).toBe("medium");
    });

    it("should return low confidence when nothing detected", () => {
      const result = analyzeCompetitor("xyz123");
      expect(result.confidence).toBe("low");
    });
  });
});

describe("compareCompetitor", () => {
  const mockProducts: WyrestormProduct[] = [
    {
      sku: "NHD-500-TX",
      name: "NetworkHD 500 4K60 Encoder",
      family: "NetworkHD",
      role: "Encoder",
      features: ["4K60", "HDR", "PoE", "AV over IP"],
      tags: ["AVOIP", "encoder", "4K"],
    },
    {
      sku: "NHD-500-RX",
      name: "NetworkHD 500 4K60 Decoder",
      family: "NetworkHD",
      role: "Decoder",
      features: ["4K60", "HDR", "PoE", "AV over IP"],
      tags: ["AVOIP", "decoder", "4K"],
    },
    {
      sku: "MX-0808-H2A",
      name: "8x8 HDMI Matrix",
      family: "Matrix",
      role: "Matrix",
      features: ["4K60", "HDCP 2.2", "Audio de-embedding"],
      tags: ["matrix", "4K"],
    },
    {
      sku: "EX-70-4K",
      name: "HDBaseT 4K Extender Kit",
      family: "Extender",
      role: "Extender",
      features: ["4K", "HDBaseT", "PoE"],
      tags: ["HDBaseT", "extender"],
    },
    {
      sku: "SW-0401-4K",
      name: "4x1 Presentation Switcher",
      family: "Switcher",
      role: "Switcher",
      features: ["4K", "HDCP 2.2", "Auto-switching"],
      tags: ["presentation", "switcher"],
    },
    {
      sku: "AMP-2120-DNT",
      name: "Dante Amplifier",
      family: "Amplifier",
      role: "Amplifier",
      features: ["Dante", "DSP", "PoE"],
      tags: ["audio", "Dante", "amplifier"],
    },
  ];

  describe("technology class matching", () => {
    it("should match AVOIP competitor to NetworkHD products", () => {
      const result = compareCompetitor("DM-NVX-350", mockProducts);
      expect(result.matches.length).toBeGreaterThan(0);
      expect(result.matches[0].sku).toMatch(/NHD/);
    });

    it("should not rank UC, camera, rack, or accessory products as DM-NVX AVoIP equivalents", () => {
      const richProducts: WyrestormProduct[] = [
        {
          sku: "APO-210-UC",
          name: "Apollo video-speakerphone switcher",
          category: "UC / conferencing",
          features: ["USB-C", "Wireless presentation", "NDI", "Speakerphone"],
          tags: ["Audio", "UC / conferencing", "AVoIP"],
        },
        {
          sku: "CAM-210-PTZ",
          name: "PTZ camera",
          category: "UC / conferencing",
          features: ["NDI", "USB", "Camera"],
          tags: ["Camera", "AVoIP"],
        },
        {
          sku: "NHD-000-RACK4",
          name: "NetworkHD rack mount",
          category: "AVoIP",
          features: ["AVoIP", "Rack accessory"],
          tags: ["NetworkHD", "rack-mount", "Accessory"],
        },
        {
          sku: "NHD-500-TX",
          name: "NetworkHD 500 4K60 Encoder",
          category: "AVoIP",
          features: ["4K60", "HDR", "PoE", "AV over IP", "Encoder"],
          tags: ["AVOIP", "encoder", "NetworkHD 500"],
        },
        {
          sku: "NHD-600-TRX",
          name: "NetworkHD 600 4K60 SDVoE Transceiver",
          category: "AVoIP",
          features: ["4K60", "HDR", "PoE", "AV over IP", "Transceiver"],
          tags: ["AVOIP", "transceiver", "NetworkHD 600"],
        },
      ];

      const result = compareCompetitor("DM-NVX-360", richProducts, "Crestron", 5);
      const skus = result.matches.map((match) => match.sku);

      expect(skus[0]).toMatch(/^NHD-/);
      expect(skus).toContain("NHD-600-TRX");
      expect(skus).not.toContain("APO-210-UC");
      expect(skus).not.toContain("CAM-210-PTZ");
      expect(skus).not.toContain("NHD-000-RACK4");
    });

    it("should match matrix competitor to matrix products", () => {
      const result = compareCompetitor("VS-88H2A matrix", mockProducts);
      const matrixMatch = result.matches.find((m) => m.sku.includes("MX"));
      expect(matrixMatch).toBeDefined();
    });

    it("should match HDBaseT competitor to extender products", () => {
      const result = compareCompetitor("DTP2 T 211 HDBaseT", mockProducts);
      const extenderMatch = result.matches.find((m) => m.sku.includes("EX"));
      expect(extenderMatch).toBeDefined();
      expect(result.matches.some((match) => match.sku.startsWith("MX-"))).toBe(false);
      expect(result.matches.some((match) => match.sku.startsWith("SW-"))).toBe(false);
    });

    it("should match Dante competitor to audio products", () => {
      const result = compareCompetitor("Dante audio amplifier", mockProducts);
      const audioMatch = result.matches.find((m) => m.sku.includes("AMP"));
      expect(audioMatch).toBeDefined();
    });
  });

  describe("role matching", () => {
    it("should prefer encoder match for encoder competitor", () => {
      const result = compareCompetitor("NMX-ENC-N2412A encoder", mockProducts);
      expect(result.matches[0].sku).toBe("NHD-500-TX");
    });

    it("should prefer decoder match for decoder competitor", () => {
      const result = compareCompetitor("NMX-DEC-N2422A decoder", mockProducts);
      expect(result.matches[0].sku).toBe("NHD-500-RX");
    });
  });

  describe("relevance checking", () => {
    it("should mark AVOIP as relevant to WyreStorm", () => {
      const result = compareCompetitor("DM-NVX-350", mockProducts);
      expect(result.isRelevant).toBe(true);
    });

    it("should mark MATRIX as relevant to WyreStorm", () => {
      const result = compareCompetitor("VS-88H2A matrix", mockProducts);
      expect(result.isRelevant).toBe(true);
    });

    it("should mark AUDIO as relevant to WyreStorm", () => {
      const result = compareCompetitor("Dante amplifier", mockProducts);
      expect(result.isRelevant).toBe(true);
    });

    it("should mark CONTROL as not directly relevant", () => {
      const result = compareCompetitor("NX-1200 control processor", mockProducts);
      expect(result.isRelevant).toBe(false);
      expect(result.relevanceReason).toContain("control processor");
    });
  });

  describe("match quality scoring", () => {
    it("should return excellent match for exact tech class and role", () => {
      const result = compareCompetitor("AVOIP 4K encoder network", mockProducts);
      expect(result.matches[0].matchQuality).toBe("excellent");
    });

    it("should provide match reasons", () => {
      const result = compareCompetitor("DM-NVX-350 encoder", mockProducts);
      expect(result.matches[0].matchReasons.length).toBeGreaterThan(0);
    });

    it("should provide recommendation", () => {
      const result = compareCompetitor("DM-NVX-350", mockProducts);
      expect(result.recommendation).toBeTruthy();
    });

    it("should provide next steps", () => {
      const result = compareCompetitor("DM-NVX-350", mockProducts);
      expect(result.nextSteps.length).toBeGreaterThan(0);
    });
  });

  describe("application context", () => {
    it("should use context to improve matching", () => {
      const result = compareCompetitor("generic product conference room USB BYOD", mockProducts);
      expect(result.competitor.technologyClass).toBe("USB_CONFERENCE");
    });

    it("should detect video wall context", () => {
      const result = compareCompetitor("processor video wall multiview", mockProducts);
      expect(result.competitor.technologyClass).toBe("VIDEO_WALL");
    });

    it("keeps HDBaseT extender comparisons out of matrix and presentation candidate lanes", () => {
      const result = compareCompetitor("AT-OME-EX-KIT HDBaseT extender kit", mockProducts);

      expect(result.competitor.technologyClass).toBe("HDBASET");
      expect(result.matches.length).toBeGreaterThan(0);
      expect(result.matches.every((match) => match.sku.startsWith("EX-"))).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should handle empty product list", () => {
      const result = compareCompetitor("DM-NVX-350", []);
      expect(result.matches).toEqual([]);
      expect(result.recommendation).toContain("No strong matches");
    });

    it("should handle unknown SKU", () => {
      const result = compareCompetitor("XYZ-UNKNOWN-123", mockProducts);
      expect(result.competitor.brand).toBe("Unknown");
      expect(result.competitor.confidence).toBe("low");
    });

    it("should handle whitespace input", () => {
      const result = compareCompetitor("  DM-NVX-350  ", mockProducts);
      expect(result.competitor.brand).toBe("Crestron");
    });
  });
});
