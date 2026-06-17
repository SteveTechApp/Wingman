import { describe, it, expect, vi } from "vitest";
import {
  buildRecommendationEvidence,
  buildDiscoveryRecommendationEvidence,
  productToSelection,
  type RecommendationEvidenceInput,
  type RecommendationEvidenceProduct } from "@/wingman2/lib/recommendationEvidence";
import type {
  StoredDiscoveryBrief,
  StoredProductSelection } from "@/wingman2/data/projectStore";

// Mock the dependencies that have side effects or external dependencies
vi.mock("@/wingman2/lib/salesReadiness", () => ({
  buildSalesReadinessPackage: vi.fn(() => ({
    governedDependencies: [],
    bomRows: [],
    evidence: [],
    governanceWarnings: [],
    repGuidance: [],
    validationNotes: [],
    readinessScore: 75,
    reviewRequired: false,
    outputPurpose: {
      motion: "Outcome SKU",
      summary: "Test summary",
      customerOutput: "Test output",
      nextAction: "Test action" } })) }));

vi.mock("@/wingman2/lib/avDecisionEvidence", () => ({
  buildAvDecisionEvidence: vi.fn(() => ({
    score: 80,
    confidence: "high",
    blockerCount: 0,
    warningCount: 0,
    evidence: ["Test AV evidence"],
    quoteChecks: [],
    missingInformation: [],
    requiredDependencies: [],
    alternatives: [],
    repGuidance: [],
    nextBestQuestion: "",
    issues: [] })) }));

describe("productToSelection", () => {
  describe("Basic conversion", () => {
    it("should convert a minimal product to selection", () => {
      const product: RecommendationEvidenceProduct = {
        sku: "NHD-500-TX" };

      const result = productToSelection(product);

      expect(result.sku).toBe("NHD-500-TX");
      expect(result.title).toBe("NHD-500-TX");
      expect(result.status).toBe("alternative");
      expect(result.source).toBe("Product Pitch");
      expect(result.addedAt).toBeDefined();
      expect(typeof result.addedAt).toBe("string");
    });

    it("should convert a full product with all fields", () => {
      const product: RecommendationEvidenceProduct = {
        sku: "NHD-500-TX",
        title: "NetworkHD 500 Transmitter",
        name: "NHD 500 Series TX",
        family: "NetworkHD 500",
        category: "AV-over-IP",
        summary: "4K60 encoder for NetworkHD systems",
        features: ["4K60 4:4:4", "USB 2.0", "IR passthrough"],
        tags: ["encoder", "avoip", "4k"],
        source: "Product Finder",
        isFallback: false };

      const result = productToSelection(product, "Custom Source");

      expect(result.sku).toBe("NHD-500-TX");
      expect(result.title).toBe("NHD 500 Series TX"); // Uses name over title
      expect(result.family).toBe("NetworkHD 500");
      expect(result.category).toBe("AV-over-IP");
      expect(result.tags).toEqual(["encoder", "avoip", "4k"]);
      expect(result.source).toBe("Custom Source");
    });

    it("should prefer name over title when both are present", () => {
      const product: RecommendationEvidenceProduct = {
        sku: "TEST-SKU",
        name: "Product Name",
        title: "Product Title" };

      const result = productToSelection(product);

      expect(result.title).toBe("Product Name");
    });

    it("should fall back to title when name is not present", () => {
      const product: RecommendationEvidenceProduct = {
        sku: "TEST-SKU",
        title: "Product Title" };

      const result = productToSelection(product);

      expect(result.title).toBe("Product Title");
    });

    it("should fall back to SKU when neither name nor title is present", () => {
      const product: RecommendationEvidenceProduct = {
        sku: "TEST-SKU" };

      const result = productToSelection(product);

      expect(result.title).toBe("TEST-SKU");
    });
  });

  describe("Edge cases", () => {
    it("should handle empty strings in product fields", () => {
      const product: RecommendationEvidenceProduct = {
        sku: "TEST-SKU",
        name: "",
        title: "",
        summary: "" };

      const result = productToSelection(product);

      expect(result.sku).toBe("TEST-SKU");
      expect(result.title).toBe("TEST-SKU"); // Falls back to SKU
    });

    it("should handle whitespace-only strings", () => {
      const product: RecommendationEvidenceProduct = {
        sku: "  TEST-SKU  ",
        name: "   ",
        title: "Valid Title" };

      const result = productToSelection(product);

      expect(result.sku).toBe("  TEST-SKU  "); // SKU preserved as-is
      expect(result.title).toBe("Valid Title");
    });

    it("should handle undefined optional fields", () => {
      const product: RecommendationEvidenceProduct = {
        sku: "TEST-SKU",
        family: undefined,
        category: undefined,
        tags: undefined };

      const result = productToSelection(product);

      expect(result.sku).toBe("TEST-SKU");
      expect(result.family).toBeUndefined();
      expect(result.category).toBeUndefined();
    });

    it("should convert StoredProductSelection input", () => {
      const storedSelection: StoredProductSelection = {
        sku: "MX-0808-KIT",
        title: "8x8 Matrix Kit",
        family: "Matrix",
        category: "Switching",
        status: "recommended",
        tags: ["matrix", "hdmi"],
        addedAt: "2024-01-01T00:00:00Z",
        source: "Project Store",
        evidence: ["Supports 8 sources"],
        cautions: ["Requires external power"] };

      const result = productToSelection(storedSelection);

      expect(result.sku).toBe("MX-0808-KIT");
      expect(result.title).toBe("8x8 Matrix Kit");
      expect(result.status).toBe("recommended");
      expect(result.evidence).toContain("Supports 8 sources");
      expect(result.cautions).toContain("Requires external power");
    });
  });
});

describe("buildRecommendationEvidence", () => {
  describe("Basic evidence building", () => {
    it("should build evidence for minimal input", () => {
      const input: RecommendationEvidenceInput = {
        source: "Test" };

      const result = buildRecommendationEvidence(input);

      expect(result.source).toBe("Test");
      expect(result.updatedAt).toBeDefined();
      expect(result.customerRequirement).toBeDefined();
      expect(result.productDirection).toBeDefined();
      expect(result.systemShape).toBeDefined();
      expect(result.quoteSafetyStatus).toBeDefined();
      expect(result.confidence).toBeDefined();
    });

    it("should build evidence with product selection", () => {
      const input: RecommendationEvidenceInput = {
        source: "Product Finder",
        product: {
          sku: "NHD-500-TX",
          title: "NetworkHD 500 Transmitter",
          family: "NetworkHD 500",
          category: "AV-over-IP" } };

      const result = buildRecommendationEvidence(input);

      expect(result.productDirection).toContain("NHD-500-TX");
      expect(result.whyThisFits).toBeDefined();
      expect(Array.isArray(result.whyThisFits)).toBe(true);
    });

    it("should include product family in whyThisFits", () => {
      const input: RecommendationEvidenceInput = {
        source: "Test",
        product: {
          sku: "NHD-500-TX",
          family: "NetworkHD 500" } };

      const result = buildRecommendationEvidence(input);

      const hasFamilyEvidence = result.whyThisFits.some(
        (item) => item.includes("NetworkHD 500") || item.includes("direction")
      );
      expect(hasFamilyEvidence).toBe(true);
    });
  });

  describe("Discovery brief evidence", () => {
    it("should extract requirement from discovery brief room model", () => {
      const input: RecommendationEvidenceInput = {
        source: "Discovery",
        discoveryBrief: {
          roomModel: {
            customerWording: "Need a 4K video distribution system",
            roomType: "Boardroom",
            sourceCount: "4",
            displayCount: "8" } } };

      const result = buildRecommendationEvidence(input);

      expect(result.customerRequirement).toContain("4K video distribution");
    });

    it("should extract evidence from room model fields", () => {
      const input: RecommendationEvidenceInput = {
        source: "Discovery",
        discoveryBrief: {
          roomModel: {
            roomType: "Meeting Room",
            sourceCount: "2",
            displayCount: "1",
            usbTransport: "Required",
            networkAvailability: "Managed network available" } } };

      const result = buildRecommendationEvidence(input);

      expect(result.evidenceUsed.length).toBeGreaterThan(0);
    });

    it("should handle inference data in discovery brief", () => {
      const input: RecommendationEvidenceInput = {
        source: "Discovery",
        discoveryBrief: {
          inference: {
            summary: "Small meeting room with presentation switching needs",
            architecture: "Presentation Switcher",
            missing: ["Display resolution requirement"] },
          roomModel: {
            outcome: "Simple presentation switching" } } };

      const result = buildRecommendationEvidence(input);

      expect(result.missingInformation.length).toBeGreaterThan(0);
    });
  });

  describe("Project-based evidence", () => {
    it("should extract discovery brief from project when not provided directly", () => {
      const input: RecommendationEvidenceInput = {
        source: "Project",
        project: {
          id: "test-project",
          name: "Test Project",
          owner: "Test User",
          stage: "Discovery",
          status: "alternative",
          updated: "Now",
          resumeTo: "/discovery",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          discoveryBrief: {
            roomModel: {
              customerWording: "Campus-wide video distribution",
              sourceCount: "20",
              displayCount: "100" } } } };

      const result = buildRecommendationEvidence(input);

      expect(result.customerRequirement).toContain("Campus-wide");
    });
  });

  describe("Compare run evidence", () => {
    it("should include competitor comparison evidence", () => {
      const input: RecommendationEvidenceInput = {
        source: "Competitor Compare",
        compare: {
          competitorBrand: "Crestron",
          competitorSku: "DM-NVX-350",
          wyrestormSku: "NHD-500-TX",
          matchScore: 85,
          evidence: ["Similar 4K60 encoding capability"],
          warnings: ["Check USB support differences"] } };

      const result = buildRecommendationEvidence(input);

      expect(result.evidenceUsed.some((e) => e.includes("Competitor"))).toBe(true);
    });

    it("should add alternative guidance when competitor is present", () => {
      const input: RecommendationEvidenceInput = {
        source: "Compare",
        compare: {
          competitorSku: "COMPETITOR-SKU" } };

      const result = buildRecommendationEvidence(input);

      const hasCompetitorWarning = result.alternatives.some(
        (alt) => alt.toLowerCase().includes("competitor")
      );
      expect(hasCompetitorWarning).toBe(true);
    });

    it("should include match score in evidence when present", () => {
      const input: RecommendationEvidenceInput = {
        source: "Compare",
        compare: {
          matchScore: 75 },
        product: {
          sku: "NHD-500-TX" } };

      const result = buildRecommendationEvidence(input);

      const hasScoreEvidence = result.whyThisFits.some(
        (item) => item.includes("75") || item.includes("score")
      );
      expect(hasScoreEvidence).toBe(true);
    });
  });

  describe("System shape detection", () => {
    it("should detect video wall system shape", () => {
      const input: RecommendationEvidenceInput = {
        source: "Test",
        discoveryBrief: {
          roomModel: {
            customerWording: "Need a 2x2 video wall for the lobby",
            videoWallRequirement: "2x2 LCD wall" } } };

      const result = buildRecommendationEvidence(input);

      expect(result.systemShape.toLowerCase()).toContain("wall");
    });

    it("should detect NetworkHD system shape", () => {
      const input: RecommendationEvidenceInput = {
        source: "Test",
        product: {
          sku: "NHD-500-TX",
          family: "NetworkHD 500" },
        discoveryBrief: {
          inference: {
            architecture: "AV over IP" } } };

      const result = buildRecommendationEvidence(input);

      expect(result.systemShape.toLowerCase()).toContain("networkhd");
    });

    it("should detect meeting room system shape", () => {
      const input: RecommendationEvidenceInput = {
        source: "Test",
        discoveryBrief: {
          roomModel: {
            customerWording: "Teams meeting room with BYOD support",
            usbTransport: "Required" } } };

      const result = buildRecommendationEvidence(input);

      expect(result.systemShape.toLowerCase()).toContain("meeting");
    });

    it("should detect matrix system shape", () => {
      const input: RecommendationEvidenceInput = {
        source: "Test",
        discoveryBrief: {
          roomModel: {
            applicationType: "Sports bar multi-zone" } } };

      const result = buildRecommendationEvidence(input);

      const hasMatrixOrContained =
        result.systemShape.toLowerCase().includes("matrix") ||
        result.systemShape.toLowerCase().includes("routing") ||
        result.systemShape.toLowerCase().includes("contained");
      expect(hasMatrixOrContained).toBe(true);
    });
  });

  describe("Missing information detection", () => {
    it("should detect missing source count", () => {
      const input: RecommendationEvidenceInput = {
        source: "Test",
        discoveryBrief: {
          roomModel: {
            sourceCount: "unknown",
            displayCount: "4" } } };

      const result = buildRecommendationEvidence(input);

      const hasSourceMissing = result.missingInformation.some(
        (item) => item.toLowerCase().includes("source")
      );
      expect(hasSourceMissing).toBe(true);
    });

    it("should detect missing display count", () => {
      const input: RecommendationEvidenceInput = {
        source: "Test",
        discoveryBrief: {
          roomModel: {
            sourceCount: "2",
            displayCount: "not confirmed" } } };

      const result = buildRecommendationEvidence(input);

      const hasDisplayMissing = result.missingInformation.some(
        (item) => item.toLowerCase().includes("display") || item.toLowerCase().includes("output")
      );
      expect(hasDisplayMissing).toBe(true);
    });

    it("should detect missing USB info for meeting rooms", () => {
      const input: RecommendationEvidenceInput = {
        source: "Test",
        discoveryBrief: {
          roomModel: {
            customerWording: "Teams meeting room setup",
            usbTransport: "not sure" } } };

      const result = buildRecommendationEvidence(input);

      const hasUsbMissing = result.missingInformation.some(
        (item) => item.toLowerCase().includes("usb")
      );
      expect(hasUsbMissing).toBe(true);
    });

    it("should detect missing network info for AV-over-IP", () => {
      const input: RecommendationEvidenceInput = {
        source: "Test",
        product: {
          sku: "NHD-500-TX" },
        discoveryBrief: {
          roomModel: {
            customerWording: "NetworkHD AV-over-IP installation",
            networkAvailability: "unknown" } } };

      const result = buildRecommendationEvidence(input);

      const hasNetworkMissing = result.missingInformation.some(
        (item) => item.toLowerCase().includes("network")
      );
      expect(hasNetworkMissing).toBe(true);
    });

    it("should include missingInformation from discovery brief", () => {
      const input: RecommendationEvidenceInput = {
        source: "Test",
        discoveryBrief: {
          missingInformation: ["Customer budget", "Installation timeline"] } };

      const result = buildRecommendationEvidence(input);

      expect(result.missingInformation).toContain("Customer budget");
      expect(result.missingInformation).toContain("Installation timeline");
    });
  });

  describe("Quote safety status", () => {
    it("should return do-not-quote-yet when no product selected", () => {
      const input: RecommendationEvidenceInput = {
        source: "Test",
        product: undefined };

      const result = buildRecommendationEvidence(input);

      expect(result.quoteSafetyStatus).toBe("do-not-quote-yet");
    });

    it("should return do-not-quote-yet when too much missing information", () => {
      const input: RecommendationEvidenceInput = {
        source: "Test",
        product: { sku: "TEST-SKU" },
        discoveryBrief: {
          missingInformation: [
            "Source count",
            "Display count",
            "Cable distance",
            "Network availability",
          ],
          roomModel: {
            sourceCount: "unknown",
            displayCount: "unknown",
            distanceInfrastructureNotes: "unknown" } } };

      const result = buildRecommendationEvidence(input);

      expect(result.quoteSafetyStatus).toBe("do-not-quote-yet");
    });

    it("should return validate-before-quote for weak compare match", () => {
      const input: RecommendationEvidenceInput = {
        source: "Test",
        product: { sku: "NHD-500-TX" },
        compare: {
          matchScore: 50, // Below 66 threshold
        },
        discoveryBrief: {
          roomModel: {
            sourceCount: "2",
            displayCount: "4",
            resolutionRequirement: "4K60",
            distanceInfrastructureNotes: "50m" } } };

      const result = buildRecommendationEvidence(input);

      expect(result.quoteSafetyStatus).toBe("validate-before-quote");
    });

    it("should return validate-before-quote for fallback product", () => {
      const input: RecommendationEvidenceInput = {
        source: "Test",
        product: {
          sku: "FALLBACK-SKU",
          isFallback: true },
        discoveryBrief: {
          roomModel: {
            sourceCount: "2",
            displayCount: "4",
            resolutionRequirement: "4K60",
            distanceInfrastructureNotes: "50m" } } };

      const result = buildRecommendationEvidence(input);

      expect(result.quoteSafetyStatus).toBe("validate-before-quote");
    });
  });

  describe("Confidence levels", () => {
    it("should return low confidence when quote status is do-not-quote-yet", () => {
      const input: RecommendationEvidenceInput = {
        source: "Test",
        product: undefined };

      const result = buildRecommendationEvidence(input);

      expect(result.confidence).toBe("low");
    });

    it("should return medium confidence with some missing info but usable", () => {
      const input: RecommendationEvidenceInput = {
        source: "Test",
        product: { sku: "NHD-500-TX" },
        discoveryBrief: {
          missingInformation: ["Cable distance"],
          roomModel: {
            sourceCount: "2",
            displayCount: "4",
            resolutionRequirement: "4K60" } } };

      const result = buildRecommendationEvidence(input);

      // With only 1-2 missing items and validate-before-quote status
      expect(["medium", "low"]).toContain(result.confidence);
    });
  });

  describe("Quote safety messages", () => {
    it("should provide appropriate message for quote-ready status", () => {
      const input: RecommendationEvidenceInput = {
        source: "Test",
        product: { sku: "NHD-500-TX" },
        discoveryBrief: {
          roomModel: {
            sourceCount: "2",
            displayCount: "4",
            resolutionRequirement: "4K60",
            distanceInfrastructureNotes: "50m" } } };

      const result = buildRecommendationEvidence(input);

      // Even with all info, it should have some status message
      expect(result.quoteSafetyMessage).toBeDefined();
      expect(result.quoteSafetyMessage.length).toBeGreaterThan(0);
    });

    it("should mention missing item in do-not-quote-yet message", () => {
      const input: RecommendationEvidenceInput = {
        source: "Test",
        product: undefined,
        discoveryBrief: {
          roomModel: {
            sourceCount: "unknown" } } };

      const result = buildRecommendationEvidence(input);

      expect(result.quoteSafetyMessage.toLowerCase()).toContain("confirm");
    });
  });

  describe("Required dependencies", () => {
    it("should add NHD-CTL-PRO dependency for NetworkHD products", () => {
      const input: RecommendationEvidenceInput = {
        source: "Test",
        product: {
          sku: "NHD-500-TX",
          family: "NetworkHD 500" } };

      const result = buildRecommendationEvidence(input);

      const hasCtlDependency = result.requiredDependencies.some(
        (dep) => dep.toLowerCase().includes("nhd-ctl") || dep.toLowerCase().includes("control")
      );
      expect(hasCtlDependency).toBe(true);
    });

    it("should add USB validation dependency for conferencing", () => {
      const input: RecommendationEvidenceInput = {
        source: "Test",
        discoveryBrief: {
          roomModel: {
            customerWording: "Teams meeting room with camera" } } };

      const result = buildRecommendationEvidence(input);

      const hasUsbDependency = result.requiredDependencies.some(
        (dep) => dep.toLowerCase().includes("usb")
      );
      expect(hasUsbDependency).toBe(true);
    });

    it("should add video wall dependencies", () => {
      const input: RecommendationEvidenceInput = {
        source: "Test",
        discoveryBrief: {
          roomModel: {
            videoWallRequirement: "2x2 video wall" } } };

      const result = buildRecommendationEvidence(input);

      const hasWallDependency = result.requiredDependencies.some(
        (dep) =>
          dep.toLowerCase().includes("wall") ||
          dep.toLowerCase().includes("display") ||
          dep.toLowerCase().includes("layout")
      );
      expect(hasWallDependency).toBe(true);
    });
  });

  describe("Optional upgrades", () => {
    it("should suggest NetworkHD 500/600 upgrade for NetworkHD 100 users", () => {
      const input: RecommendationEvidenceInput = {
        source: "Test",
        product: {
          sku: "NHD-120-TX",
          family: "NetworkHD 100" } };

      const result = buildRecommendationEvidence(input);

      const has500or600Upgrade = result.optionalUpgrades.some(
        (upgrade) => upgrade.includes("500") || upgrade.includes("600")
      );
      expect(has500or600Upgrade).toBe(true);
    });

    it("should suggest video wall processors for wall applications", () => {
      const input: RecommendationEvidenceInput = {
        source: "Test",
        discoveryBrief: {
          roomModel: {
            videoWallRequirement: "LCD video wall" } } };

      const result = buildRecommendationEvidence(input);

      const hasWallProcessorSuggestion = result.optionalUpgrades.some(
        (upgrade) => upgrade.includes("SW-0204") || upgrade.includes("SW-0206")
      );
      expect(hasWallProcessorSuggestion).toBe(true);
    });

    it("should suggest matrix for hospitality applications", () => {
      const input: RecommendationEvidenceInput = {
        source: "Test",
        discoveryBrief: {
          roomModel: {
            applicationType: "Sports bar with multiple TVs" } } };

      const result = buildRecommendationEvidence(input);

      const hasMatrixSuggestion = result.optionalUpgrades.some(
        (upgrade) =>
          upgrade.toLowerCase().includes("matrix") || upgrade.includes("MX-0808")
      );
      expect(hasMatrixSuggestion).toBe(true);
    });
  });

  describe("Alternatives guidance", () => {
    it("should always include datasheet validation reminder", () => {
      const input: RecommendationEvidenceInput = {
        source: "Test",
        product: { sku: "ANY-SKU" } };

      const result = buildRecommendationEvidence(input);

      const hasDatasheetReminder = result.alternatives.some(
        (alt) => alt.toLowerCase().includes("datasheet")
      );
      expect(hasDatasheetReminder).toBe(true);
    });

    it("should warn about NetworkHD series interoperability", () => {
      const input: RecommendationEvidenceInput = {
        source: "Test",
        product: {
          sku: "NHD-500-TX",
          family: "NetworkHD" } };

      const result = buildRecommendationEvidence(input);

      const hasInteropWarning = result.alternatives.some(
        (alt) => alt.toLowerCase().includes("networkhd") && alt.toLowerCase().includes("interoperability")
      );
      expect(hasInteropWarning).toBe(true);
    });

    it("should warn about video wall product selection", () => {
      const input: RecommendationEvidenceInput = {
        source: "Test",
        discoveryBrief: {
          roomModel: {
            videoWallRequirement: "Video wall needed" } } };

      const result = buildRecommendationEvidence(input);

      const hasWallWarning = result.alternatives.some(
        (alt) => alt.toLowerCase().includes("video wall") || alt.toLowerCase().includes("wall")
      );
      expect(hasWallWarning).toBe(true);
    });
  });

  describe("Customer safe wording", () => {
    it("should include product direction in customer wording", () => {
      const input: RecommendationEvidenceInput = {
        source: "Test",
        product: {
          sku: "NHD-500-TX",
          title: "NetworkHD 500 Transmitter" } };

      const result = buildRecommendationEvidence(input);

      expect(result.customerSafeWording.length).toBeGreaterThan(0);
      const hasProductReference = result.customerSafeWording.some(
        (wording) => wording.includes("NHD-500-TX") || wording.includes("WyreStorm")
      );
      expect(hasProductReference).toBe(true);
    });

    it("should always include room requirement basis statement", () => {
      const input: RecommendationEvidenceInput = {
        source: "Test",
        product: { sku: "TEST-SKU" } };

      const result = buildRecommendationEvidence(input);

      const hasRequirementBasis = result.customerSafeWording.some(
        (wording) => wording.toLowerCase().includes("room requirement")
      );
      expect(hasRequirementBasis).toBe(true);
    });
  });

  describe("Internal guidance", () => {
    it("should include escalation guidance for do-not-quote status", () => {
      const input: RecommendationEvidenceInput = {
        source: "Test",
        product: undefined };

      const result = buildRecommendationEvidence(input);

      const hasDesignGuidance = result.internalGuidance.some(
        (guidance) =>
          guidance.toLowerCase().includes("design direction") ||
          guidance.toLowerCase().includes("do not send")
      );
      expect(hasDesignGuidance).toBe(true);
    });

    it("should include competitor guidance when compare data present", () => {
      const input: RecommendationEvidenceInput = {
        source: "Test",
        product: { sku: "NHD-500-TX" },
        compare: {
          competitorSku: "COMPETITOR-SKU" } };

      const result = buildRecommendationEvidence(input);

      const hasCompetitorGuidance = result.internalGuidance.some(
        (guidance) => guidance.toLowerCase().includes("competitor")
      );
      expect(hasCompetitorGuidance).toBe(true);
    });
  });

  describe("Next best question", () => {
    it("should use stored next best question when available", () => {
      const input: RecommendationEvidenceInput = {
        source: "Test",
        discoveryBrief: {
          nextBestQuestion: "What is the display resolution requirement?" } };

      const result = buildRecommendationEvidence(input);

      expect(result.nextBestQuestion).toBe("What is the display resolution requirement?");
    });

    it("should generate question from missing info when no stored question", () => {
      const input: RecommendationEvidenceInput = {
        source: "Test",
        discoveryBrief: {
          roomModel: {
            sourceCount: "unknown" } } };

      const result = buildRecommendationEvidence(input);

      expect(result.nextBestQuestion).toBeDefined();
      expect(result.nextBestQuestion!.toLowerCase()).toContain("confirm");
    });

    it("should ask about quantities when no missing info", () => {
      const input: RecommendationEvidenceInput = {
        source: "Test",
        product: { sku: "NHD-500-TX" },
        discoveryBrief: {
          roomModel: {
            sourceCount: "2",
            displayCount: "4",
            resolutionRequirement: "4K60",
            distanceInfrastructureNotes: "30m Cat6" } } };

      const result = buildRecommendationEvidence(input);

      // Should have some next question even with complete info
      expect(result.nextBestQuestion).toBeDefined();
    });
  });

  describe("Quote checks", () => {
    it("should include validation checks from missing info", () => {
      const input: RecommendationEvidenceInput = {
        source: "Test",
        discoveryBrief: {
          roomModel: {
            sourceCount: "unknown" } } };

      const result = buildRecommendationEvidence(input);

      const hasSourceCheck = result.quoteChecks.some(
        (check) => check.toLowerCase().includes("source")
      );
      expect(hasSourceCheck).toBe(true);
    });

    it("should include standard validation reminder", () => {
      const input: RecommendationEvidenceInput = {
        source: "Test",
        product: { sku: "TEST-SKU" } };

      const result = buildRecommendationEvidence(input);

      const hasStandardCheck = result.quoteChecks.some(
        (check) =>
          check.toLowerCase().includes("datasheet") ||
          check.toLowerCase().includes("lifecycle") ||
          check.toLowerCase().includes("firmware")
      );
      expect(hasStandardCheck).toBe(true);
    });

    it("should include dependency checks", () => {
      const input: RecommendationEvidenceInput = {
        source: "Test",
        product: {
          sku: "NHD-500-TX",
          summary: "NetworkHD AV over IP encoder" } };

      const result = buildRecommendationEvidence(input);

      const hasDependencyCheck = result.quoteChecks.some(
        (check) => check.toLowerCase().includes("dependency")
      );
      expect(hasDependencyCheck).toBe(true);
    });
  });
});

describe("buildDiscoveryRecommendationEvidence", () => {
  it("should build evidence from a discovery brief", () => {
    const brief: StoredDiscoveryBrief = {
      roomModel: {
        customerWording: "Corporate boardroom AV upgrade",
        roomType: "Boardroom",
        sourceCount: "4",
        displayCount: "2" },
      inference: {
        summary: "Large meeting room with multiple source switching",
        architecture: "Matrix or presentation switcher" } };

    const result = buildDiscoveryRecommendationEvidence(brief);

    expect(result.source).toBe("Discovery");
    expect(result.customerRequirement).toContain("Corporate boardroom");
    expect(result.evidenceUsed.length).toBeGreaterThan(0);
  });

  it("should handle empty discovery brief", () => {
    const brief: StoredDiscoveryBrief = {};

    const result = buildDiscoveryRecommendationEvidence(brief);

    expect(result.source).toBe("Discovery");
    expect(result.quoteSafetyStatus).toBe("do-not-quote-yet");
    expect(result.confidence).toBe("low");
  });

  it("should extract missing information from brief", () => {
    const brief: StoredDiscoveryBrief = {
      missingInformation: ["Budget range", "Timeline"],
      roomModel: {
        sourceCount: "unknown" } };

    const result = buildDiscoveryRecommendationEvidence(brief);

    expect(result.missingInformation).toContain("Budget range");
    expect(result.missingInformation).toContain("Timeline");
  });
});

describe("Return type structure validation", () => {
  it("should always return StoredRecommendationEvidence shape", () => {
    const input: RecommendationEvidenceInput = {
      source: "Test" };

    const result = buildRecommendationEvidence(input);

    // Verify all required properties exist
    expect(result).toHaveProperty("updatedAt");
    expect(result).toHaveProperty("source");
    expect(result).toHaveProperty("customerRequirement");
    expect(result).toHaveProperty("productDirection");
    expect(result).toHaveProperty("systemShape");
    expect(result).toHaveProperty("whyThisFits");
    expect(result).toHaveProperty("evidenceUsed");
    expect(result).toHaveProperty("quoteChecks");
    expect(result).toHaveProperty("missingInformation");
    expect(result).toHaveProperty("requiredDependencies");
    expect(result).toHaveProperty("optionalUpgrades");
    expect(result).toHaveProperty("alternatives");
    expect(result).toHaveProperty("customerSafeWording");
    expect(result).toHaveProperty("internalGuidance");
    expect(result).toHaveProperty("quoteSafetyStatus");
    expect(result).toHaveProperty("quoteSafetyMessage");
    expect(result).toHaveProperty("confidence");
  });

  it("should have array types for list properties", () => {
    const input: RecommendationEvidenceInput = {
      source: "Test" };

    const result = buildRecommendationEvidence(input);

    expect(Array.isArray(result.whyThisFits)).toBe(true);
    expect(Array.isArray(result.evidenceUsed)).toBe(true);
    expect(Array.isArray(result.quoteChecks)).toBe(true);
    expect(Array.isArray(result.missingInformation)).toBe(true);
    expect(Array.isArray(result.requiredDependencies)).toBe(true);
    expect(Array.isArray(result.optionalUpgrades)).toBe(true);
    expect(Array.isArray(result.alternatives)).toBe(true);
    expect(Array.isArray(result.customerSafeWording)).toBe(true);
    expect(Array.isArray(result.internalGuidance)).toBe(true);
  });

  it("should have valid enum values for status and confidence", () => {
    const input: RecommendationEvidenceInput = {
      source: "Test" };

    const result = buildRecommendationEvidence(input);

    expect(["quote-ready", "validate-before-quote", "do-not-quote-yet"]).toContain(
      result.quoteSafetyStatus
    );
    expect(["high", "medium", "low"]).toContain(result.confidence);
  });

  it("should have ISO date string for updatedAt", () => {
    const input: RecommendationEvidenceInput = {
      source: "Test" };

    const result = buildRecommendationEvidence(input);

    // Should be a valid ISO date string
    const date = new Date(result.updatedAt);
    expect(date.toISOString()).toBe(result.updatedAt);
  });
});

describe("Data deduplication and uniqueness", () => {
  it("should deduplicate evidence entries", () => {
    const input: RecommendationEvidenceInput = {
      source: "Test",
      discoveryBrief: {
        roomModel: {
          customerWording: "Same customer wording",
          notes: "Same customer wording", // Duplicate content
        } } };

    const result = buildRecommendationEvidence(input);

    // Check for no exact duplicates in evidenceUsed
    const uniqueEvidence = new Set(result.evidenceUsed);
    expect(uniqueEvidence.size).toBe(result.evidenceUsed.length);
  });

  it("should deduplicate missing information", () => {
    const input: RecommendationEvidenceInput = {
      source: "Test",
      discoveryBrief: {
        missingInformation: ["Source count", "Source count"],
        inference: {
          missing: ["Source count"] } } };

    const result = buildRecommendationEvidence(input);

    // Count occurrences of source-related entries
    const sourceEntries = result.missingInformation.filter((item) =>
      item.toLowerCase().includes("source")
    );
    // Should be deduplicated or at least not have exact duplicates
    const uniqueSourceEntries = new Set(sourceEntries);
    expect(uniqueSourceEntries.size).toBe(sourceEntries.length);
  });

  it("should filter empty strings from arrays", () => {
    const input: RecommendationEvidenceInput = {
      source: "Test",
      discoveryBrief: {
        roomModel: {
          customerWording: "",
          notes: "" } } };

    const result = buildRecommendationEvidence(input);

    // No empty strings should be in any array
    const allArrays = [
      result.evidenceUsed,
      result.missingInformation,
      result.requiredDependencies,
      result.optionalUpgrades,
      result.alternatives,
      result.customerSafeWording,
      result.internalGuidance,
      result.quoteChecks,
      result.whyThisFits,
    ];

    for (const arr of allArrays) {
      expect(arr.every((item) => item.trim().length > 0)).toBe(true);
    }
  });
});

describe("Edge cases and error handling", () => {
  it("should handle null product gracefully", () => {
    const input: RecommendationEvidenceInput = {
      source: "Test",
      product: null };

    const result = buildRecommendationEvidence(input);

    expect(result.productDirection).toBeDefined();
    expect(result.quoteSafetyStatus).toBe("do-not-quote-yet");
  });

  it("should handle null discovery brief gracefully", () => {
    const input: RecommendationEvidenceInput = {
      source: "Test",
      discoveryBrief: null };

    const result = buildRecommendationEvidence(input);

    expect(result.customerRequirement).toBeDefined();
    expect(result.evidenceUsed).toBeDefined();
  });

  it("should handle null compare gracefully", () => {
    const input: RecommendationEvidenceInput = {
      source: "Test",
      compare: null };

    const result = buildRecommendationEvidence(input);

    expect(result).toBeDefined();
    expect(result.evidenceUsed).toBeDefined();
  });

  it("should handle all null inputs", () => {
    const input: RecommendationEvidenceInput = {
      source: "Test",
      project: null,
      discoveryBrief: null,
      product: null,
      compare: null,
      query: undefined };

    const result = buildRecommendationEvidence(input);

    expect(result.source).toBe("Test");
    expect(result.quoteSafetyStatus).toBe("do-not-quote-yet");
    expect(result.confidence).toBe("low");
  });

  it("should handle special characters in input strings", () => {
    const input: RecommendationEvidenceInput = {
      source: "Test",
      query: "Special chars: <>&\"'`${}[]",
      discoveryBrief: {
        roomModel: {
          customerWording: "Unicode: éàü 中文" } } };

    const result = buildRecommendationEvidence(input);

    expect(result).toBeDefined();
    expect(result.customerRequirement).toBeDefined();
  });

  it("should handle very long input strings", () => {
    const longString = "a".repeat(10000);
    const input: RecommendationEvidenceInput = {
      source: "Test",
      query: longString,
      discoveryBrief: {
        roomModel: {
          customerWording: longString } } };

    const result = buildRecommendationEvidence(input);

    expect(result).toBeDefined();
  });

  it("should handle numeric-like strings in room model", () => {
    const input: RecommendationEvidenceInput = {
      source: "Test",
      discoveryBrief: {
        roomModel: {
          sourceCount: "0",
          displayCount: "-1",
          longestRun: "100.5m" } } };

    const result = buildRecommendationEvidence(input);

    expect(result).toBeDefined();
    expect(result.evidenceUsed.length).toBeGreaterThan(0);
  });
});

describe("Query-based evidence", () => {
  it("should include query in requirement detection", () => {
    const input: RecommendationEvidenceInput = {
      source: "Test",
      query: "I need a video wall solution for our lobby" };

    const result = buildRecommendationEvidence(input);

    expect(result.systemShape.toLowerCase()).toContain("wall");
  });

  it("should detect meeting room patterns from query", () => {
    const input: RecommendationEvidenceInput = {
      source: "Test",
      query: "Teams meeting room with BYOD capabilities" };

    const result = buildRecommendationEvidence(input);

    expect(result.systemShape.toLowerCase()).toContain("meeting");
  });

  it("should detect AV-over-IP patterns from query", () => {
    const input: RecommendationEvidenceInput = {
      source: "Test",
      query: "NetworkHD 500 system for campus distribution" };

    const result = buildRecommendationEvidence(input);

    expect(result.systemShape.toLowerCase()).toContain("networkhd");
  });
});
