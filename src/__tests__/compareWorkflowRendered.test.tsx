import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { readProjectStore } from "@/wingman2/data/projectStore";
import ComparePageNew from "@/wingman2/pages/ComparePageNew";

vi.mock("@/wingman2/lib/productIntelligenceIndexCache", () => ({
  loadProductIntelligenceIndex: vi.fn().mockResolvedValue({ products: [] }),
}));

function renderPage() {
  render(<MemoryRouter><ComparePageNew /></MemoryRouter>);
}

function runCompare(brand: string, sku: string) {
  fireEvent.change(screen.getByRole("combobox", { name: /^Manufacturer$/i }), { target: { value: brand } });
  fireEvent.change(screen.getByRole("combobox", { name: /^Competitor SKU$/i }), { target: { value: sku } });
  const button = screen.queryByRole("button", { name: /^Compare$/i });
  if (button) fireEvent.click(button);
}

describe("Compare rendered workflow - minimum card surface", () => {
  beforeAll(() => { HTMLElement.prototype.scrollIntoView = vi.fn(); });
  beforeEach(() => { window.localStorage.clear(); window.sessionStorage.clear(); });

  it("opens as one compact manufacturer + SKU form", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "Compare competitor products" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /^Manufacturer$/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /^Competitor SKU$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Compare$/i })).toBeInTheDocument();
    expect(screen.queryByText("Step 1")).not.toBeInTheDocument();
    expect(screen.queryByRole("tablist", { name: /comparison result sections/i })).not.toBeInTheDocument();
  });

  it("shows competitor left and WyreStorm right", async () => {
    renderPage();
    runCompare("Crestron", "DM-NVX-350");
    const cards = await screen.findByLabelText("Compare product cards");
    expect(within(cards).getByLabelText("Competitor product card").textContent).toContain("DM-NVX-350");
    expect(within(cards).getByLabelText("WyreStorm product card").textContent).toMatch(/NHD-/i);
  });

  it("keeps evidence collapsed and removes the review queue from Compare", async () => {
    renderPage();
    runCompare("Blustream", "IP350UHD-TX");
    await screen.findByLabelText("Compare product cards");
    const details = screen.getByText("Technical evidence & review").closest("details") as HTMLDetailsElement | null;
    expect(details?.open).toBe(false);
    expect(screen.queryByText("Competitor decision review queue")).not.toBeInTheDocument();
    expect(screen.queryByRole("tablist", { name: /comparison result sections/i })).not.toBeInTheDocument();
  });

  it("does not recommend APO-VX20-UC-V2 for Crestron HD-PS622", async () => {
    renderPage();
    runCompare("Crestron", "HD-PS622");
    const cards = await screen.findByLabelText("Compare product cards");
    expect(cards.textContent).not.toContain("APO-VX20-UC-V2");
  });

  it("renders MFP112 as an 11x2 presentation job without an 8x8 matrix lead", async () => {
    renderPage();
    runCompare("Blustream", "MFP112");
    const cards = await screen.findByLabelText("Compare product cards");
    const competitor = within(cards).getByLabelText("Competitor product card");
    const alternative = within(cards).getByLabelText("No WyreStorm product match");

    expect(competitor.textContent).toContain("Presentation switcher");
    expect(competitor.textContent).toContain("11x routed source inputs");
    expect(competitor.textContent).toContain("2x routed display outputs");
    expect(alternative.textContent).toContain("No suitable match");
    expect(cards.textContent).toContain("11x2 routed I/O requirement");
    expect(alternative.textContent).not.toContain("SW-510-TX");
    expect(alternative.textContent).not.toMatch(/MXV-0808-H2A-KIT|MX-0808-KIT-V2/);
  });

  it("keeps the three core result actions", async () => {
    renderPage();
    runCompare("Crestron", "DM-NVX-350");
    await screen.findByLabelText("WyreStorm product card");
    const actions = screen.getByLabelText("Compare result actions");
    expect(within(actions).getByRole("button", { name: /Add to project/i })).toBeInTheDocument();
    expect(within(actions).getByRole("link", { name: "Product details" })).toBeInTheDocument();
    expect(within(actions).getByRole("button", { name: "New comparison" })).toBeInTheDocument();
  });

  it("still saves the selected direction to the project", async () => {
    renderPage();
    runCompare("Crestron", "DM-NVX-350");
    await screen.findByLabelText("WyreStorm product card");
    fireEvent.click(screen.getByRole("button", { name: /Add to project/i }));
    const snapshot = readProjectStore();
    const active = snapshot.projects.find((p) => p.id === snapshot.activeProjectId) ?? snapshot.projects[0];
    expect(active.compareRuns?.[0]?.competitorSku).toBe("DM-NVX-350");
    expect(active.compareRuns?.[0]?.wyrestormSku).toMatch(/^NHD-/);
  });
});
