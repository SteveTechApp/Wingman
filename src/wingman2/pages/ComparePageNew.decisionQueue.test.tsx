import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import index from "../../../public/product-intelligence-index.json";
import type {
  CompetitorDecisionApprovalResponse,
  CompetitorDecisionApprovedResponse,
  CompetitorDecisionQueueResponse,
} from "../api/wingmanApi";
import type { CompetitorMatchDecision } from "../lib/competitorMatchDecisionLedger";
import ComparePageNew from "./ComparePageNew";

const {
  getWingmanSession,
  fetchCompetitorDecisionQueue,
  fetchApprovedCompetitorDecisions,
  approveCompetitorDecision,
} = vi.hoisted(() => ({
  getWingmanSession: vi.fn(),
  fetchCompetitorDecisionQueue: vi.fn(),
  fetchApprovedCompetitorDecisions: vi.fn().mockResolvedValue({
    ok: true,
    total: 3,
    approved: 0,
    decisions: [],
  } satisfies CompetitorDecisionApprovedResponse),
  approveCompetitorDecision: vi.fn(),
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
    approveCompetitorDecision,
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
      {
        id: "maker-SKU-2--review-required",
        competitorManufacturer: "Maker",
        competitorSku: "SKU-2",
        decisionType: "review-required",
        wyrestormSku: null,
        productClass: "CONTROL",
        endpointRole: "controller",
        transportClass: "unknown",
        maxResolution: null,
        inputCount: null,
        routedOutputCount: null,
        lead: false,
      },
    ],
  };
}

function renderCompare() {
  return render(
    <MemoryRouter initialEntries={["/wingman/compare"]}>
      <ComparePageNew />
    </MemoryRouter>,
  );
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

describe("compare page competitor decision review queue", () => {
  it("renders the pending decisions sorted with the reviewer inputs for an admin", async () => {
    getWingmanSession.mockResolvedValue({
      ok: true,
      session: { workspaceRole: "admin", permissions: { canManageWorkspace: true } },
    });
    fetchCompetitorDecisionQueue.mockResolvedValue(queuePayload());

    renderCompare();

    const queue = await screen.findByLabelText("Competitor decision review queue");
    expect(within(queue).getByText("2 pending · 1 approved")).not.toBeNull();

    // Sorted by what reps face: the wireless lead renders first with its
    // recommendation and fingerprint; the review-required row renders last.
    const rows = within(queue).getAllByRole("listitem");
    expect(rows[0].textContent).toContain("Barco CLICKSHARE-CX-30");
    expect(rows[0].textContent).toContain("Approved closest technical match");
    expect(rows[0].textContent).toContain("→ SW-620-TX-W");
    expect(rows[0].textContent).toContain("Lead class");
    expect(rows[0].textContent).toContain("WIRELESS_PRESENTATION");
    expect(rows[1].textContent).toContain("Maker SKU-2");
    expect(rows[1].textContent).toContain("Technical review required");
    expect(rows[1].textContent).toContain("No recommendation");

    // The admin gets reviewer + evidence inputs and the approve action.
    const firstRow = rows[0];
    expect(
      within(firstRow).getByPlaceholderText("Name of technical reviewer"),
    ).not.toBeNull();
    expect(
      within(firstRow).getByPlaceholderText("https://manufacturer.example/product"),
    ).not.toBeNull();
    expect(
      within(firstRow).getByRole("button", { name: "Approve decision" }),
    ).not.toBeNull();
  });

  it("approves a decision, records reviewer + evidence, removes it from the queue, and refreshes the promoted runtime decisions", async () => {
    getWingmanSession.mockResolvedValue({
      ok: true,
      session: { workspaceRole: "admin", permissions: { canManageWorkspace: true } },
    });
    fetchCompetitorDecisionQueue.mockResolvedValue(queuePayload());
    fetchApprovedCompetitorDecisions.mockResolvedValue({
      ok: true,
      total: 3,
      approved: 0,
      decisions: [],
    } satisfies CompetitorDecisionApprovedResponse);
    approveCompetitorDecision.mockResolvedValue({
      ok: true,
      competitorManufacturer: "Barco",
      competitorSku: "CLICKSHARE-CX-30",
      decisionType: "closest-technical-match",
      wyrestormSku: "SW-620-TX-W",
      reviewer: "A. Reviewer",
      reviewedAt: "2026-08-16T12:00:00.000Z",
      approved: 2,
      total: 3,
    } satisfies CompetitorDecisionApprovalResponse);

    renderCompare();

    const queue = await screen.findByLabelText("Competitor decision review queue");
    const firstRow = within(queue).getAllByRole("listitem")[0];

    fireEvent.change(
      within(firstRow).getByPlaceholderText("Name of technical reviewer"),
      { target: { value: "A. Reviewer" } },
    );
    fireEvent.change(
      within(firstRow).getByPlaceholderText("https://manufacturer.example/product"),
      { target: { value: "https://www.barco.com/product/clickshare-cx-30" } },
    );
    const approvedFetchesBefore = fetchApprovedCompetitorDecisions.mock.calls.length;
    fireEvent.click(within(firstRow).getByRole("button", { name: "Approve decision" }));

    await waitFor(() => {
      expect(approveCompetitorDecision).toHaveBeenCalledWith({
        competitorManufacturer: "Barco",
        competitorSku: "CLICKSHARE-CX-30",
        reviewer: "A. Reviewer",
        evidenceUrl: "https://www.barco.com/product/clickshare-cx-30",
      });
    });

    // The row leaves the queue and the counts update.
    await waitFor(() => {
      expect(within(queue).queryByText("Barco CLICKSHARE-CX-30")).toBeNull();
    });
    expect(within(queue).getByText("1 pending · 2 approved")).not.toBeNull();
    expect(within(queue).getByText(/recorded in the governed ledger/)).not.toBeNull();

    // The approval bumps the page's decision revision, which refetches the
    // approved ledger so the new decision can promote into the current
    // results immediately.
    await waitFor(() => {
      expect(fetchApprovedCompetitorDecisions.mock.calls.length).toBeGreaterThan(
        approvedFetchesBefore,
      );
    });
  });

  it("promotes a ledger-approved decision into the runtime results immediately", async () => {
    getWingmanSession.mockResolvedValue({
      ok: true,
      session: { workspaceRole: "sales", permissions: { canManageWorkspace: false } },
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

    // The approved ledger decision (fetched from the governed server, not
    // localStorage) surfaces as the current governed decision on the match
    // cards' review controls, with its reviewer recorded.
    await waitFor(() => {
      const status = screen.getByText((content, element) =>
        Boolean(
          element?.tagName === "P" &&
            element.textContent?.includes("Current decision:") &&
            element.textContent?.includes("Approved closest technical match"),
        ),
      );
      expect(status.textContent).toContain("SW-620-TX-W");
      expect(status.textContent).toContain("Reviewer: Server Reviewer");
    });
  });

  it("shows the queue read-only without the workspace-admin permission", async () => {
    getWingmanSession.mockResolvedValue({
      ok: true,
      session: { workspaceRole: "sales", permissions: { canManageWorkspace: false } },
    });
    fetchCompetitorDecisionQueue.mockResolvedValue(queuePayload());

    renderCompare();

    const queue = await screen.findByLabelText("Competitor decision review queue");
    const firstRow = within(queue).getAllByRole("listitem")[0];

    // No reviewer input or approve action for a rep without admin rights.
    expect(
      within(firstRow).queryByPlaceholderText("Name of technical reviewer"),
    ).toBeNull();
    expect(
      within(firstRow).queryByRole("button", { name: "Approve decision" }),
    ).toBeNull();
    expect(firstRow.textContent).toContain(
      "Approval is restricted to workspace admins - read-only queue.",
    );
  });
});
