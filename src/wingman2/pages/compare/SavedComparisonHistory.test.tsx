import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SavedComparisonHistory } from "./SavedComparisonHistory";

const run = { id: "r1", createdAt: "2026-08-01T00:00:00Z", mode: "saved-history", competitorBrand: "Barco", competitorSku: "CX-30", wyrestormSku: "SW-620-TX-W", matchType: "VERIFY", confidence: "Review", matchScore: 60, evidence: [], warnings: [] };

describe("SavedComparisonHistory", () => {
  it("filters and delegates history actions", () => {
    const onFilter = vi.fn();
    const onDelete = vi.fn();
    render(<SavedComparisonHistory runs={[run]} view={{ search: "", filter: "all", sort: "newest" }} onSearch={vi.fn()} onFilter={onFilter} onSort={vi.fn()} onReopen={vi.fn()} onRestore={vi.fn()} onDelete={onDelete} />);
    expect(screen.getByText(/Barco/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Filter"), { target: { value: "VERIFY" } });
    expect(onFilter).toHaveBeenCalledWith("VERIFY");
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete snapshot" }));
    expect(onDelete).toHaveBeenCalledWith(run);
  });

  it("exports the CSV and revokes the blob URL only after the download task starts", async () => {
    const createSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:wingman-test-comparisons");
    const revokeSpy = vi.fn();
    // revokeObjectURL is inherited in this environment; install an own,
    // spyable version so the deferred revoke can be observed.
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, writable: true, value: revokeSpy });
    try {
      render(<SavedComparisonHistory runs={[run]} view={{ search: "", filter: "all", sort: "newest" }} onSearch={vi.fn()} onFilter={vi.fn()} onSort={vi.fn()} onReopen={vi.fn()} onRestore={vi.fn()} onDelete={vi.fn()} />);
      fireEvent.click(screen.getByRole("button", { name: "Export" }));
      fireEvent.click(screen.getByRole("menuitem", { name: "Export CSV" }));

      // Inside the synchronous click handler the URL must still be live: the
      // revoke is deferred to the next task so the browser can begin the
      // download fetch against it.
      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(createSpy).toHaveBeenCalledWith(expect.any(Blob));
      expect(revokeSpy).not.toHaveBeenCalled();

      // Once the task queue drains, the exact created URL is revoked.
      await waitFor(() => expect(revokeSpy).toHaveBeenCalledWith("blob:wingman-test-comparisons"));
    } finally {
      Reflect.deleteProperty(URL, "revokeObjectURL");
      vi.restoreAllMocks();
    }
  });
});
