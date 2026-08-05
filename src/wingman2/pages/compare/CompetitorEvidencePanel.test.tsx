import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { runCompetitorLookup, WingmanApiError } from "../../api/wingmanApi";
import { CompetitorEvidencePanel } from "./CompetitorEvidencePanel";

vi.mock("../../api/wingmanApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../api/wingmanApi")>();
  return { ...actual, runCompetitorLookup: vi.fn() };
});

const mockedLookup = vi.mocked(runCompetitorLookup);

describe("CompetitorEvidencePanel live lookup", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockedLookup.mockReset();
  });

  it("shows a persistent sign-in action when the protected lookup rejects the request", async () => {
    mockedLookup.mockRejectedValue(new WingmanApiError("Authentication required.", 401));
    render(<CompetitorEvidencePanel brand="Blustream" sku="UNKNOWN-SKU" onSaved={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Run live lookup" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Live lookup could not run");
    expect(
      screen.getByRole("link", { name: "Open Workspace settings" }).getAttribute("href"),
    ).toBe("/wingman/settings");
    expect(mockedLookup).toHaveBeenCalledWith({ brand: "Blustream", sku: "UNKNOWN-SKU" });
  });

  it("shows lookup progress and renders returned manufacturer evidence", async () => {
    let finishLookup: ((value: Awaited<ReturnType<typeof runCompetitorLookup>>) => void) | undefined;
    mockedLookup.mockImplementation(() => new Promise((resolve) => { finishLookup = resolve; }));
    render(<CompetitorEvidencePanel brand="Blustream" sku="NEW-SKU" onSaved={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Run live lookup" }));
    expect(screen.getByRole("status").textContent).toContain(
      "Searching approved manufacturer sources",
    );

    finishLookup?.({
      ok: true,
      record: { name: "New Blustream product", summary: "Verified manufacturer summary.", sourceUrl: "https://www.blustream.co.uk/example" },
    });

    await waitFor(() => expect(screen.queryByText("New Blustream product")).not.toBeNull());
    expect(screen.getAllByText("Verified manufacturer summary.").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByRole("link", { name: "View manufacturer source" }).getAttribute("href"),
    ).toBe("https://www.blustream.co.uk/example");
  });
});
