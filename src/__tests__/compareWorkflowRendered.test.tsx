import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { readProjectStore } from "@/wingman2/data/projectStore";
import ComparePageNew from "@/wingman2/pages/ComparePageNew";

vi.mock("@/wingman2/lib/productIntelligenceIndexCache", () => ({
  loadProductIntelligenceIndex: vi.fn().mockResolvedValue({ products: [] }),
}));

function renderComparePage() {
  render(
    <MemoryRouter>
      <ComparePageNew />
    </MemoryRouter>,
  );
}

function runKnownCompare(brand: string, sku: string) {
  const visibleBrandButton = screen.queryByRole("button", { name: brand });

  if (!visibleBrandButton) {
    const manualCompareButton = screen.queryByRole("button", { name: /choose products manually/i });

    if (!manualCompareButton) {
      throw new Error("Manual compare button was not available before selecting a known competitor brand.");
    }

    fireEvent.click(manualCompareButton);
  }

  fireEvent.click(screen.getByRole("button", { name: brand }));
  fireEvent.click(screen.getByRole("button", { name: sku }));
}

describe("Compare rendered workflow", () => {
  beforeAll(() => {
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("saves a quote-safe competitor lookup and keeps the lead recommendation away from controller-only products", async () => {
    renderComparePage();

    runKnownCompare("Crestron", "DM-NVX-350");

    await screen.findByText("Competitor matched against");

    const addToProjectButton = screen.getByRole("button", { name: /Add to project/i });
    const pitchLink = screen.getByRole("link", { name: /See full pitch/i });

    fireEvent.click(addToProjectButton);

    const snapshot = readProjectStore();
    const activeProject = snapshot.projects.find((project) => project.id === snapshot.activeProjectId) ?? snapshot.projects[0];
    const selectedSku = activeProject.productSelections?.[0]?.sku ?? "";

    expect(selectedSku).toMatch(/^NHD-/);
    expect(selectedSku).not.toMatch(/CTL|RACK/);
    expect(activeProject.compareRuns?.[0]).toMatchObject({
      competitorBrand: "Crestron",
      competitorSku: "DM-NVX-350",
      wyrestormSku: selectedSku,
    });
    expect(activeProject.recommendationEvidence?.productDirection).toContain(selectedSku);
    expect(activeProject.recommendationEvidence?.quoteSafetyStatus).not.toBe("quote-ready");
    expect(activeProject.recommendationEvidence?.evidenceUsed.join(" ").toLowerCase()).toContain("competitor");
    expect(pitchLink.getAttribute("href")).toContain(`/wingman/product-pitch?sku=${encodeURIComponent(selectedSku)}`);
  });

  it("renders the key comparison matrix with competitor and WyreStorm values side by side", async () => {
    renderComparePage();

    runKnownCompare("Blustream", "IP350UHD-TX");

    const matrix = await screen.findByRole("table", { name: /competitor versus wyrestorm comparison matrix/i });

    expect(within(matrix).getAllByRole("columnheader").map((node) => node.textContent)).toEqual([
      "Comparison point",
      "Competitor",
      "WyreStorm",
      "Result",
    ]);

    const inputRow = within(matrix).getByText("Inputs").closest('[role="row"]');
    expect(inputRow).not.toBeNull();
    expect(within(inputRow as HTMLElement).getByText(/1x HDMI input/i)).toBeInTheDocument();
    expect(within(inputRow as HTMLElement).getByText(/1x local source input/i)).toBeInTheDocument();

    const transportRow = within(matrix).getByText("Transport").closest('[role="row"]');
    expect(transportRow).not.toBeNull();
    expect(within(transportRow as HTMLElement).getAllByText(/AVoIP/i).length).toBeGreaterThanOrEqual(1);
    expect(within(transportRow as HTMLElement).getByText(/1GbE JPEG-XS AVoIP/i)).toBeInTheDocument();
  });

  it("keeps supporting evidence collapsed by default on the result screen", async () => {
    renderComparePage();

    runKnownCompare("Atlona", "AT-OMNI-111");

    await screen.findByRole("table", { name: /competitor versus wyrestorm comparison matrix/i });

    const quoteChecks = screen.getByText("Quote checks").closest("details") as HTMLDetailsElement | null;
    const whyThisFits = screen.getByText("Why this fits").closest("details") as HTMLDetailsElement | null;
    const fullEvidenceTrace = screen.getByText("Full evidence trace").closest("details") as HTMLDetailsElement | null;
    const copyableSummary = screen.getByText("Copyable summary").closest("details") as HTMLDetailsElement | null;
    const otherOptions = screen.getByText(/Other possible WyreStorm options/i).closest("details") as HTMLDetailsElement | null;

    expect(quoteChecks?.open).toBe(false);
    expect(whyThisFits?.open).toBe(false);
    expect(fullEvidenceTrace?.open).toBe(false);
    expect(copyableSummary?.open).toBe(false);
    expect(otherOptions?.open).toBe(false);

    expect(screen.queryByText("Ask the customer")).not.toBeInTheDocument();
    expect(screen.queryByText("More detail")).not.toBeInTheDocument();
  });

  it("uses concrete limited-data wording instead of the old generic guidance phrasing", async () => {
    renderComparePage();

    const nextProductStep = screen.queryByRole("button", { name: /next: choose competitor product/i });

    if (nextProductStep) {
      fireEvent.click(nextProductStep);
    }

        if (!screen.queryByRole("heading", { name: /choose competitor product/i })) {
      const manualCompareButton = screen.queryByRole("button", { name: /choose products manually/i });

      if (!manualCompareButton) {
        throw new Error("Manual compare button was not available before the known-SKU workflow check.");
      }

      fireEvent.click(manualCompareButton);
    }

        if (!screen.queryByRole("heading", { name: /choose competitor product/i })) {
      const nextProductButton = screen.queryByRole("button", { name: /next:\s*choose competitor product/i });

      if (nextProductButton) {
        fireEvent.click(nextProductButton);
      }
    }

    await screen.findByRole("heading", { name: /choose competitor product/i });

    const customSkuButtons = await screen.findAllByRole("button", { name: /custom \/ missing sku/i });
    fireEvent.click(customSkuButtons[0]);

    await screen.findByRole("heading", { name: /No suitable WyreStorm match found from the current data/i });

    expect(screen.getByText(/Closest direction only until the competitor specification is confirmed\./i)).toBeInTheDocument();
    expect(screen.queryByText(/Treat this as product-direction guidance, not a confirmed direct equivalent/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Confirm whether the customer wants the same architecture/i)).not.toBeInTheDocument();
  });

  it("keeps Marshall NDI PTZ cameras in the camera lane instead of forcing a NetworkHD encoder result", async () => {
    renderComparePage();

    runKnownCompare("Marshall", "VS-PTC-200NDI");

    await screen.findByText("Competitor matched against");

    expect(screen.getAllByText("Marshall VS-PTC-200NDI").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("NDI camera").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("CAM-210-NDI-PTZ").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("NHD-500-TX")).not.toBeInTheDocument();
    expect(screen.queryByText(/source-side AV-over-IP encoder/i)).not.toBeInTheDocument();
  });

  it("shows presentation-switcher comparison rows instead of debug-style copy", async () => {
    renderComparePage();

    runKnownCompare("Atlona", "AT-OME-CS31-SA");

    const matrix = await screen.findByRole("table", { name: /competitor versus wyrestorm comparison matrix/i });

    expect(within(matrix).getByText("Product type")).toBeInTheDocument();
    expect(within(matrix).getByText("Inputs")).toBeInTheDocument();
    expect(within(matrix).getByText("Outputs")).toBeInTheDocument();
    expect(within(matrix).getByText("Transport")).toBeInTheDocument();
    expect(within(matrix).getByText("Main caveat")).toBeInTheDocument();
    expect(within(matrix).getAllByText(/presentation switcher/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Match score context")).not.toBeInTheDocument();
    expect(screen.queryByText(/customer workflow/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/codec\/compression class/i)).not.toBeInTheDocument();
    expect(screen.queryByText("NHD-500-TX")).not.toBeInTheDocument();
  });

  it("treats larger matrix options as covering the brief for Lightware MMX6x2 without relabeling outputs as inputs", async () => {
    renderComparePage();

    runKnownCompare("Lightware", "MMX6x2-HT200");

    const matrix = await screen.findByRole("table", { name: /competitor versus wyrestorm comparison matrix/i });

    const inputRow = within(matrix).getByText("Inputs").closest('[role="row"]');
    expect(inputRow).not.toBeNull();
    expect(within(inputRow as HTMLElement).getByText(/6x .*input/i)).toBeInTheDocument();
    expect(within(inputRow as HTMLElement).getByText("Covers required count")).toBeInTheDocument();

    const outputRow = within(matrix).getByText("Outputs").closest('[role="row"]');
    expect(outputRow).not.toBeNull();
    expect(within(outputRow as HTMLElement).getByText(/2x .*output/i)).toBeInTheDocument();
    expect(within(outputRow as HTMLElement).queryByText(/2x .*input/i)).not.toBeInTheDocument();

    expect(screen.queryByText("MX-0402-MST")).not.toBeInTheDocument();
  });
});
