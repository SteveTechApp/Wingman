import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type {
  CompetitorDecisionApprovedResponse,
} from "../api/wingmanApi";
import type { CompetitorMatchDecision } from "../lib/competitorMatchDecisionLedger";
import { DashboardPage } from "./DashboardPage";

const { fetchApprovedCompetitorDecisions } = vi.hoisted(() => ({
  fetchApprovedCompetitorDecisions: vi.fn(),
}));

vi.mock("../api/wingmanApi", async () => {
  const actual = await vi.importActual<typeof import("../api/wingmanApi")>(
    "../api/wingmanApi",
  );
  return {
    ...actual,
    fetchApprovedCompetitorDecisions,
  };
});

function approvedDecision(
  manufacturer: string,
  sku: string,
  wyrestormSku: string,
  reviewedAt: string,
): CompetitorMatchDecision {
  return {
    id: `${manufacturer}-${sku}--closest-technical-match`,
    competitorManufacturer: manufacturer,
    competitorSku: sku,
    fingerprint: {
      productClass: "MATRIX",
      endpointRole: "matrix",
      transportClass: "hdmi",
      dependencies: [],
      notes: [],
    },
    wyrestormSku,
    decisionType: "closest-technical-match",
    reviewStatus: "approved",
    reviewer: "Steve",
    reviewedAt,
    matchedPoints: [],
    importantDifferences: [],
    dependencies: [],
    quoteBlockers: [],
    evidence: [
      {
        sourceUrl: `https://${manufacturer.toLowerCase() === "amx" ? "www.amx.com/en-US/site_elements" : "hallresearch.com/product"}/data-sheet-${sku.toLowerCase()}`,
        sourceType: "manufacturer",
        checkedAt: reviewedAt,
      },
    ],
    createdAt: reviewedAt,
    updatedAt: reviewedAt,
  };
}

function approvedPayload(): CompetitorDecisionApprovedResponse {
  return {
    ok: true,
    total: 299,
    approved: 2,
    decisions: [
      approvedDecision("AMX", "DGX1600-ENC", "MX-1616-SCL", "2026-08-16T12:01:17.801Z"),
      approvedDecision("Atlona", "AT-HDR-H2H-44MA", "MX-0808-SCL", "2026-08-16T12:01:18.100Z"),
    ],
  };
}

describe("DashboardPage approved competitor decisions card", () => {
  it("surfaces the approved count, the pending remainder and the reviewer trail", async () => {
    fetchApprovedCompetitorDecisions.mockResolvedValue(approvedPayload());

    render(
      <MemoryRouter initialEntries={["/wingman"]}>
        <DashboardPage />
      </MemoryRouter>,
    );

    const card = await screen.findByLabelText("Approved competitor decisions");
    expect(within(card).getByText("2 approved")).not.toBeNull();
    expect(card.textContent).toContain(
      "2/299 competitor decisions human-approved · 297 awaiting review in the",
    );
    expect(card.textContent).toContain("Compare decision queue");

    // Recent-first rows with the full trail: recommendation, reviewer, date,
    // and the official source each decision was confirmed against.
    const rows = within(card).getAllByRole("listitem");
    expect(rows[0].textContent).toContain("Atlona AT-HDR-H2H-44MA");
    expect(rows[0].textContent).toContain("→ MX-0808-SCL");
    expect(rows[0].textContent).toContain("Approved closest technical match · Steve · 2026-08-16");
    expect(rows[0].textContent).toContain("hallresearch.com");
    expect(rows[1].textContent).toContain("AMX DGX1600-ENC");
  });

  it("renders nothing when the governed server is absent", async () => {
    fetchApprovedCompetitorDecisions.mockRejectedValue(new Error("offline"));

    render(
      <MemoryRouter initialEntries={["/wingman"]}>
        <DashboardPage />
      </MemoryRouter>,
    );

    // Let the rejected fetch settle (act-wrapped) before asserting the card
    // stays hidden - the card is never shown without a server response.
    await waitFor(() => {
      expect(fetchApprovedCompetitorDecisions).toHaveBeenCalled();
    });
    expect(screen.queryByLabelText("Approved competitor decisions")).toBeNull();
  });
});
