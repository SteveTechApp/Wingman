import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ProjectComparisonHistory } from "./ProjectComparisonHistory";
import type { StoredCompareRun } from "../../features/projects";

const runs = [
  { id: "run-1", createdAt: "2026-08-04T09:00:00.000Z", version: 1, mode: "saved-history", competitorBrand: "Barco", competitorSku: "CX-30", wyrestormSku: "APO-VX20-UC-V2", matchType: "GOOD MATCH", evidence: ["USB confirmed"] },
  { id: "run-2", createdAt: "2026-08-05T09:00:00.000Z", version: 1, mode: "saved-history", competitorBrand: "Blustream", competitorSku: "IP350", wyrestormSku: "NHD-600", matchType: "VERIFY" },
] as StoredCompareRun[];

describe("project comparison history", () => {
  it("filters project snapshots and links to current and saved Compare views", () => {
    render(<MemoryRouter><ProjectComparisonHistory projectId="project-1" runs={runs} compareLink={(run) => `/wingman/compare?projectId=project-1&sku=${run.competitorSku}`} onDelete={vi.fn()} /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("Search saved comparisons"), { target: { value: "Barco" } });
    expect(screen.getByText("Barco CX-30")).toBeTruthy();
    expect(screen.queryByText("Blustream IP350")).toBeNull();
    expect(screen.getByRole("link", { name: "Restore snapshot" }).getAttribute("href")).toContain("snapshotId=run-1");
  });

  it("requires confirmation before deleting the selected snapshot", () => {
    const onDelete = vi.fn();
    render(<MemoryRouter><ProjectComparisonHistory projectId="project-1" runs={runs} compareLink={() => "/wingman/compare?projectId=project-1"} onDelete={onDelete} /></MemoryRouter>);
    fireEvent.click(screen.getAllByRole("button", { name: "Delete" })[0]);
    expect(onDelete).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.keyDown(window, { key: "Tab" });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Delete snapshot" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete snapshot" }));
    expect(onDelete).toHaveBeenCalledWith("run-2");
  });
});
