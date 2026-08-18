import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import index from "../../../public/product-intelligence-index.json";
import type {
  CompetitorDecisionApprovedResponse,
  CompetitorDecisionQueueResponse,
} from "../api/wingmanApi";
import type { CompetitorMatchDecision } from "../lib/competitorMatchDecisionLedger";
import ComparePageNew from "./ComparePageNew";

const {
  getWingmanSession,
  fetchCompetitorDecisionQueue,
  fetchApprovedCompetitorDecisions,
} = vi.hoisted(() => ({
  getWingmanSession: vi.fn(),
  fetchCompetitorDecisionQueue: vi.fn(),
  fetchApprovedCompetitorDecisions: vi.fn(),
}));

vi.mock("../api/wingmanApi", async () => {
  const actual = await vi.importActual<typeof import("../api/wingmanApi")>(
    "../api/wingmanApi",
  );

  return {
    ...actual,
    getWingmanSession,
    fetchCompetitorDecisionQueue,
    fetchApprovedCompetitorDecisions,
  };
});

vi.mock("../lib/productIntelligenceIndexCache", () => ({
  loadProductIntelligenceIndex: vi.fn().mockResolvedValue(index),
}));

function queuePayload(): CompetitorDecisionQueueResponse {
  return {
    ok: true,
    total: 3,
    pending: 2,
    approved: 1,
    queue: [
      {
        id: "barco-CLICKSHARE-CX-30--closest-technical-match",
        competitorManufacturer: "Barco",
        competitorSku: "CLICKSHARE-CX-30",
        decisionType: "closest-technical-match",
        wyrestormSku: "SW-620-TX-W",
        productClass: "WIRELESS_PRESENTATION",
        endpointRole: "switcher",
        transportClass: "hybrid",
        maxResolution: "4K",
        inputCount: null,
        routedOutputCount: 1,
        lead: true,
      },
    ],
  };
}

function approvedLedgerDecision(): CompetitorMatchDecision {
  return {
    id: "barco-CLICKSHARE-CX-30--closest-technical-match",
    competitorManufacturer: "Barco",
    competitorSku: "CLICKSHARE-CX-30",
    fingerprint: {
      productClass: "WIRELESS_PRESENTATION",
      endpointRole: "switcher",
      transportClass: "hybrid",
      dependencies: [],
      notes: [],
    },
    wyrestormSku: "SW-620-TX-W",
    decisionType: "closest-technical-match",
    reviewStatus: "approved",
    reviewer: "Server Reviewer",
    reviewedAt: "2026-08-16T12:00:00.000Z",
    matchedPoints: [],
    importantDifferences: [],
    dependencies: [],
    quoteBlockers: [],
    evidence: [],
    createdAt: "2026-08-16T00:00:00.000Z",
    updatedAt: "2026-08-16T12:00:00.000Z",
  };
}

describe("Compare governed decisions after minimum-card simplification", () => {
  it("does not render the decision-review queue on the sales Compare page", async () => {
    getWingmanSession.mockResolvedValue({
      ok: true,
      session: {
        workspaceRole: "admin",
        permissions: { canManageWorkspace: true },
      },
    });
    fetchCompetitorDecisionQueue.mockResolvedValue(queuePayload());
    fetchApprovedCompetitorDecisions.mockResolvedValue({
      ok: true,
      total: 3,
      approved: 0,
      decisions: [],
    } satisfies CompetitorDecisionApprovedResponse);

    render(
      <MemoryRouter initialEntries={["/wingman/compare"]}>
        <ComparePageNew />
      </MemoryRouter>,
    );

    await screen.findByRole("heading", {
      name: "Compare competitor products",
    });

    expect(
      screen.queryByLabelText("Competitor decision review queue"),
    ).toBeNull();
  });

  it("still honours an approved governed decision inside technical review", async () => {
    getWingmanSession.mockResolvedValue({
      ok: true,
      session: {
        workspaceRole: "sales",
        permissions: { canManageWorkspace: false },
      },
    });
    fetchCompetitorDecisionQueue.mockResolvedValue(queuePayload());
    fetchApprovedCompetitorDecisions.mockResolvedValue({
      ok: true,
      total: 3,
      approved: 1,
      decisions: [approvedLedgerDecision()],
    } satisfies CompetitorDecisionApprovedResponse);

    render(
      <MemoryRouter
        initialEntries={[
          "/wingman/compare?brand=Barco&sku=CLICKSHARE-CX-30",
        ]}
      >
        <ComparePageNew />
      </MemoryRouter>,
    );

    await screen.findByLabelText("Compare product cards");
    fireEvent.click(screen.getByText("Technical evidence & review"));

    await waitFor(() => {
      const body = document.body.textContent ?? "";
      expect(body).toContain("Current decision:");
      expect(body).toContain("SW-620-TX-W");
      expect(body).toContain("Server Reviewer");
    });
  });
});