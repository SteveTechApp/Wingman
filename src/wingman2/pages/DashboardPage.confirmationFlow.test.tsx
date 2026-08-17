import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { governedProfilesWithStatus } from "../lib/testHelpers/governedProfilesHarness";
import { DashboardPage } from "./DashboardPage";

const { getWingmanSession } = vi.hoisted(() => ({
  getWingmanSession: vi.fn(),
}));

vi.mock("../api/wingmanApi", async () => {
  const actual = await vi.importActual<typeof import("../api/wingmanApi")>(
    "../api/wingmanApi",
  );
  return {
    ...actual,
    getWingmanSession,
  };
});

function adminSessionResponse() {
  return {
    ok: true,
    session: {
      workspaceRole: "admin",
      permissions: { canManageWorkspace: true },
      user: {
        id: "test-admin",
        name: "Steve",
        role: "admin",
      },
    },
  };
}

// The 2026-08-16 review passes confirmed every profile whose spec-critical
// fields were readable (117 of 130), so the real data has zero ready-to-confirm
// profiles. The confirmation panel + API-write flow still needs a controlled
// ready profile to run against: demote APO-210-UC (a real profile with all
// three fields readable) back to verified-with-warning, so it appears in the
// awaiting list as confirmable. Everything else stays as the real data.
vi.mock("../../../data/governance/wyrestorm-technical-profiles.json", async () => {
  const actual = (await vi.importActual(
    "../../../data/governance/wyrestorm-technical-profiles.json",
  )) as { default: { profiles: Array<{ sku: string } & Record<string, unknown>> } };
  return {
    default: governedProfilesWithStatus(actual.default, ["APO-210-UC"], "verified-with-warning"),
  };
});

function renderDashboard() {
  render(
    <MemoryRouter initialEntries={["/wingman"]}>
      <DashboardPage />
    </MemoryRouter>,
  );

  return within(screen.getByLabelText("Recent projects"));
}

describe("DashboardPage confirmation flow (ready profile)", () => {
  beforeEach(() => {
    getWingmanSession.mockReset();
    getWingmanSession.mockResolvedValue(adminSessionResponse());
  });

  it("opens the confirmation panel for a ready profile listing its spec-critical fields with values", async () => {
    renderDashboard();

    const card = await screen.findByLabelText("Profiles awaiting human confirmation");
    // With APO-210-UC set aside for review, the awaiting list is 18 (17 real profiles + the test's simulated one).
    expect(card.textContent).toContain("18 awaiting");
    const apoRow = within(card).getByText("APO-210-UC").closest("li");
    fireEvent.click(within(apoRow as HTMLElement).getByRole("button", { name: "Confirm" }));

    const panel = screen.getByLabelText("Confirm APO-210-UC profile");
    expect(panel.textContent).toContain("Max resolution");
    expect(panel.textContent).toContain("4K30 4:4:4");
    expect(panel.textContent).toContain("Routed I/O");
    expect(panel.textContent).toContain("2 in / 2 out");
    expect(panel.textContent).toContain("Power");
    expect(within(panel).getByRole("button", { name: "Confirm profile (mark verified)" })).not.toBeNull();
  });

  it("writes the confirmation through the API and removes the profile from the awaiting list", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          sku: "APO-210-UC",
          verifiedBy: "A. Reviewer",
          verifiedAt: "2026-08-16T00:00:00.000Z",
        }),
      }),
    );

    renderDashboard();

    const card = await screen.findByLabelText("Profiles awaiting human confirmation");
    expect(card.textContent).toContain("18 awaiting");
    const apoRow = within(card).getByText("APO-210-UC").closest("li");
    fireEvent.click(within(apoRow as HTMLElement).getByRole("button", { name: "Confirm" }));

    const panel = screen.getByLabelText("Confirm APO-210-UC profile");
    fireEvent.change(within(panel).getByPlaceholderText("Name of technical reviewer"), {
      target: { value: "A. Reviewer" },
    });
    fireEvent.change(within(panel).getByPlaceholderText("https://wyrestorm.com/product"), {
      target: { value: "https://wyrestorm.com/products/apo-210-uc" },
    });
    fireEvent.click(within(panel).getByRole("button", { name: "Confirm profile (mark verified)" }));

    expect(
      await screen.findByText(/APO-210-UC verified - confirmed by A\. Reviewer\. Reload to refresh the governed profile data\./),
    ).not.toBeNull();
    const fetchMock = vi.mocked(fetch);
    // The dashboard also fetches the approved competitor decisions card, so
    // locate the confirmation POST among the calls rather than pinning a total.
    const confirmCall = fetchMock.mock.calls.find(
      (call) => String(call[0]) === "/api/governance/profiles/confirm",
    );
    expect(confirmCall).toBeDefined();
    const body = JSON.parse(String(confirmCall?.[1]?.body));
    expect(body).toMatchObject({
      sku: "APO-210-UC",
      verifiedBy: "A. Reviewer",
      confirmedFields: ["max-resolution", "routed-io", "power"],
      evidenceUrl: "https://wyrestorm.com/products/apo-210-uc",
    });

    expect(card.textContent).toContain("17 awaiting");
    // The row leaves the awaiting list (the notice above it still names the SKU).
    expect(within(card).queryByText("APO-210-UC")).toBeNull();
    // The panel closes after a successful save.
    expect(screen.queryByLabelText("Confirm APO-210-UC profile")).toBeNull();
  });
});
