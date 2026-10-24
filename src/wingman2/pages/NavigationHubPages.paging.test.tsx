import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { expectNoResultsPager, expectResultsWindow, turnResultsPage } from "../lib/testHelpers/resultsPager";

vi.mock("../features/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../features/navigation")>();
  return {
    ...actual,
    workflowTelemetry: { start: vi.fn(), handoff: vi.fn(), complete: vi.fn(), abandonOnUnload: vi.fn() },
  };
});

import { CallCoachPage } from "./NavigationHubPages";

const startingPoints = [
  "Product-specific call",
  "Discovery / requirement capture",
  "Call-out day",
  "Escalation check",
];

describe("call coach paging", () => {
  it("keeps the four starting points on one page while the conversation list below pages", () => {
    render(
      <MemoryRouter initialEntries={["/wingman/call-coach"]}>
        <CallCoachPage />
      </MemoryRouter>,
    );

    const hub = screen.getByRole("region", { name: "Call Coach workflows" });
    for (const title of startingPoints) {
      expect(within(hub).getByRole("link", { name: `Open ${title} in Wingman` })).toBeTruthy();
    }

    // A rep chooses how a call starts without paging, so the hub list carries no
    // pager of its own and the only one on the screen belongs to the
    // conversation list beneath it.
    expectNoResultsPager(hub);

    // Four conversation starting points fit a page and eight need two. The
    // window lookup is unscoped, so it also proves the screen carries one pager.
    expectResultsWindow(1, 4, 8);
    turnResultsPage(5, 8, 8);

    // Paging the conversations leaves the starting points where they are: the
    // two lists hold their own positions.
    for (const title of startingPoints) {
      expect(within(hub).getByRole("link", { name: `Open ${title} in Wingman` })).toBeTruthy();
    }
    expectNoResultsPager(hub);
    expectResultsWindow(5, 8, 8);
  });
});
