import { fireEvent, render, screen } from "@testing-library/react";
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
});
