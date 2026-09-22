import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ComparePageNew from "./ComparePageNew";
import { readProjectStore, resetProjectStore, saveCompareRunToProject } from "../data/projectStore";

vi.mock("../lib/productIntelligenceIndexCache", () => ({
  loadProductIntelligenceIndex: vi.fn().mockResolvedValue({ products: [] }),
}));

describe("saved comparison handoff", () => {
  beforeEach(() => {
    localStorage.clear();
    resetProjectStore();
    saveCompareRunToProject({ competitorBrand: "Barco", competitorSku: "CX-30", wyrestormSku: "APO-VX20-UC-V2", mode: "saved-history", confidence: "Strong direction", matchType: "GOOD MATCH", matchScore: 90 });
  });

  it("sends saved-history management to the owning project", async () => {
    const projectId = readProjectStore().activeProjectId;
    render(<MemoryRouter initialEntries={["/wingman/compare?brand=Barco&sku=CX-30"]}><ComparePageNew /></MemoryRouter>);
    const link = await screen.findByRole("link", { name: "Review saved history in Project" });
    expect(link.getAttribute("href")).toContain(`/wingman/projects/${projectId}?view=history`);
    expect(screen.queryByLabelText("Saved comparison history")).toBeNull();
  });

  it("restores a specific saved snapshot without changing the current result", async () => {
    const store = readProjectStore();
    const projectId = store.activeProjectId;
    const snapshotId = store.projects.find((project) => project.id === projectId)?.compareRuns?.[0]?.id;
    render(<MemoryRouter initialEntries={[`/wingman/compare?projectId=${projectId}&brand=Barco&sku=CX-30&snapshotId=${snapshotId}`]}><ComparePageNew /></MemoryRouter>);
    expect(await screen.findByRole("region", { name: "Saved comparison snapshot" })).toBeTruthy();
    expect(screen.getByText(/Restored snapshot v1/)).toBeTruthy();
  });
});
