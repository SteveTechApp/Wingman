import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ComparePageNew from "./ComparePageNew";
import { readProjectStore, saveCompareRunToProject, resetProjectStore } from "../data/projectStore";

vi.mock("../lib/productIntelligenceIndexCache", () => ({
  loadProductIntelligenceIndex: vi.fn().mockResolvedValue({ products: [] }),
}));

describe("saved comparison history", () => {
  beforeEach(() => {
    localStorage.clear();
    resetProjectStore();
    saveCompareRunToProject({ competitorBrand: "Barco", competitorSku: "CX-30", wyrestormSku: "APO-VX20-UC-V2", mode: "saved-history", confidence: "Strong direction", matchType: "GOOD MATCH", matchScore: 90 });
    saveCompareRunToProject({ competitorBrand: "Blustream", competitorSku: "IP350UHD-TX", wyrestormSku: "NHD-600-TX-I", mode: "saved-history", confidence: "Plausible — confirm", matchType: "VERIFY", matchScore: 55 });
  });

  it("filters and sorts saved snapshots", async () => {
    render(<MemoryRouter initialEntries={["/wingman/compare?brand=Barco&sku=CX-30&historyFilter=VERIFY"]}><ComparePageNew /></MemoryRouter>);
    await screen.findByText("Saved comparison history");
    fireEvent.click(screen.getByText("Saved comparison history"));
    expect(screen.getByText("Shared saved-history view")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByText("Shared saved-history view")).toBeNull();
    expect(screen.getByLabelText("Saved comparison summary").textContent).toContain("2 snapshots");
    expect(screen.getByText(/Shared view:/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Export" }));
    expect(screen.getByRole("menu")).toBeTruthy();
    const menu = screen.getByRole("menu");
    const exportCsv = screen.getByRole("menuitem", { name: "Export CSV" });
    const copyText = screen.getByRole("menuitem", { name: "Copy text" });
    exportCsv.focus();
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(document.activeElement).toBe(copyText);
    fireEvent.keyDown(menu, { key: "ArrowUp" });
    expect(document.activeElement).toBe(exportCsv);
    fireEvent.keyDown(menu, { key: "End" });
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Copy view link" }));
    fireEvent.keyDown(menu, { key: "Home" });
    expect(document.activeElement).toBe(exportCsv);
    expect(screen.queryByRole("menuitem", { name: "Clear export history" })).toBeNull();
    fireEvent.keyDown(menu, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /verify/i }));
    expect((screen.getByLabelText("Filter") as HTMLSelectElement).value).toBe("VERIFY");
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect((screen.getByLabelText("Filter") as HTMLSelectElement).value).toBe("all");
    expect(screen.getByLabelText("Search saved comparisons")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Search saved comparisons"), { target: { value: "Blustream" } });
    fireEvent.change(screen.getByLabelText("Filter"), { target: { value: "VERIFY" } });
    expect(screen.getAllByText(/Blustream IP350UHD-TX/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Barco CX-30/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Blustream IP350UHD-TX/).length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText("Sort"), { target: { value: "score" } });
    fireEvent.keyDown(window, { key: "r", shiftKey: true });
    expect((screen.getByLabelText("Search saved comparisons") as HTMLInputElement).value).toBe("");
  });

  it("confirms targeted deletion", async () => {
    render(<MemoryRouter initialEntries={["/wingman/compare?brand=Barco&sku=CX-30"]}><ComparePageNew /></MemoryRouter>);
    await screen.findByText("Saved comparison history");
    fireEvent.click(screen.getAllByRole("button", { name: "Delete" })[0]);
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(readProjectStore().projects.flatMap((project) => project.compareRuns ?? [])).toHaveLength(2);
  });

  it("closes with Escape and traps Tab", async () => {
    render(<MemoryRouter initialEntries={["/wingman/compare?brand=Barco&sku=CX-30"]}><ComparePageNew /></MemoryRouter>);
    await screen.findByText("Saved comparison history");
    fireEvent.click(screen.getAllByRole("button", { name: "Delete" })[0]);
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Delete snapshot" })));
    fireEvent.keyDown(window, { key: "Tab" });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Close delete dialog" }));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
