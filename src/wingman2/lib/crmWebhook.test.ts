import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getWebhookUrl,
  setWebhookUrl,
  buildWebhookPayload,
  generateCurlSnippet,
  type CrmWebhookPayload,
} from "./crmWebhook";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
})();

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

describe("crmWebhook", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe("getWebhookUrl / setWebhookUrl", () => {
    it("returns empty string when no URL is configured", () => {
      expect(getWebhookUrl()).toBe("");
    });

    it("stores and retrieves a webhook URL", () => {
      setWebhookUrl("https://hooks.zoho.com/example");
      expect(getWebhookUrl()).toBe("https://hooks.zoho.com/example");
    });

    it("trims whitespace from the URL", () => {
      setWebhookUrl("  https://hooks.zoho.com/example  ");
      expect(getWebhookUrl()).toBe("https://hooks.zoho.com/example");
    });
  });

  describe("buildWebhookPayload", () => {
    it("builds a payload from a project object", () => {
      const project = {
        id: "proj-001",
        name: "Boardroom AV Upgrade",
        owner: "Steve",
        stage: "Proposal Builder",
        dealOutcome: "won" as const,
        dealOutcomeWhy: "Better HDBaseT reach",
        discoveryBrief: {
          roomModel: {
            clientName: "Acme Corp",
            siteName: "London HQ",
            application: "Boardroom",
            sourceCount: "4",
            displayCount: "2",
          },
        },
        productSelections: [
          { sku: "NHD-500-TX", title: "NetworkHD TX", quantity: 2, family: "NetworkHD" },
          { sku: "NHD-500-RX", title: "NetworkHD RX", quantity: 2 },
        ],
        proposal: {
          title: "Boardroom AV Solution",
          summary: "4K60 AV over IP for 4-source, 2-display boardroom",
          bomRows: [
            { sku: "NHD-500-TX", description: "4K60 TX", role: "Transmitter", qty: 2, notes: "Install at source" },
            { sku: "NHD-500-RX", description: "4K60 RX", role: "Receiver", qty: 2, notes: "Install at display" },
          ],
        },
      };

      const payload = buildWebhookPayload(project);

      expect(payload.projectId).toBe("proj-001");
      expect(payload.projectName).toBe("Boardroom AV Upgrade");
      expect(payload.customer).toBe("Acme Corp");
      expect(payload.site).toBe("London HQ");
      expect(payload.stage).toBe("Proposal Builder");
      expect(payload.dealOutcome).toBe("won");
      expect(payload.dealOutcomeWhy).toBe("Better HDBaseT reach");
      expect(payload.products).toHaveLength(2);
      expect(payload.products[0].sku).toBe("NHD-500-TX");
      expect(payload.products[0].quantity).toBe(2);
      expect(payload.proposalTitle).toBe("Boardroom AV Solution");
      expect(payload.proposalSummary).toBe("4K60 AV over IP for 4-source, 2-display boardroom");
      expect(payload.bomRows).toHaveLength(2);
      expect(payload.source).toBe("wingman");
      expect(payload.generatedAt).toBeTruthy();
    });

    it("handles empty product selections", () => {
      const project = {
        id: "proj-002",
        name: "Empty Project",
        owner: "Test",
        stage: "Discovery",
      };

      const payload = buildWebhookPayload(project);
      expect(payload.products).toEqual([]);
      expect(payload.proposalTitle).toBeUndefined();
      expect(payload.bomRows).toBeUndefined();
    });

    it("falls back to owner when clientName is missing", () => {
      const project = {
        id: "proj-003",
        name: "Fallback Project",
        owner: "Fallback Owner",
        stage: "Discovery",
        discoveryBrief: { roomModel: {} },
      };

      const payload = buildWebhookPayload(project);
      expect(payload.customer).toBe("Fallback Owner");
      expect(payload.site).toBe("");
    });
  });

  describe("generateCurlSnippet", () => {
    it("generates a valid cURL command", () => {
      const url = "https://hooks.zoho.com/test";
      const payload: CrmWebhookPayload = {
        projectId: "proj-001",
        projectName: "Test Project",
        customer: "Acme",
        site: "HQ",
        stage: "Discovery",
        products: [],
        generatedAt: "2026-01-01T00:00:00Z",
        source: "wingman",
      };

      const curl = generateCurlSnippet(url, payload);

      expect(curl).toContain("curl -X POST");
      expect(curl).toContain(url);
      expect(curl).toContain("Content-Type: application/json");
      expect(curl).toContain('"projectId": "proj-001"');
      expect(curl).toContain('"source": "wingman"');
    });
  });
});
