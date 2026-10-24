import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { routeCatalogByKey } from "../app/routeCatalog";
import { expectResultsWindow, turnResultsPage } from "../lib/testHelpers/resultsPager";

vi.mock("../features/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../features/navigation")>();
  return {
    ...actual,
    workflowTelemetry: { start: vi.fn(), handoff: vi.fn(), complete: vi.fn(), abandonOnUnload: vi.fn() },
  };
});

import { SalesHelperPage } from "./SalesHelperPage";

function LocationProbe() {
  return <output data-testid="route">{useLocation().pathname}</output>;
}

describe("sales helper paging", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("pages the conversation starting points and keeps the page when a card opens", () => {
    render(
      <MemoryRouter initialEntries={["/wingman/call-coach"]}>
        <LocationProbe />
        <SalesHelperPage />
      </MemoryRouter>,
    );

    // Four starting points fit a page and eight need two, so the arrow between
    // them is on screen.
    expectResultsWindow(1, 4, 8);
    expect(screen.getByRole("button", { name: "Open Room requirement in Wingman" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Open Competitor SKU in Wingman" })).toBeNull();

    turnResultsPage(5, 8, 8);
    expect(screen.queryByRole("button", { name: "Open Room requirement in Wingman" })).toBeNull();

    // The card a rep opens is the card on the page they are reading, and this
    // screen has no filter, so choosing one leaves the list where it was.
    fireEvent.click(screen.getByRole("button", { name: "Open Competitor SKU in Wingman" }));
    expect(screen.getByTestId("route").textContent).toBe(routeCatalogByKey.compare.path);
    expectResultsWindow(5, 8, 8);
    expect(screen.getByRole("button", { name: "Open Proposal / closing follow-up in Wingman" })).toBeTruthy();
  });
});
