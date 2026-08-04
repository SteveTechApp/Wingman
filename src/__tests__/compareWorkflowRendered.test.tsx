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

// The result view defaults to the "Product cards" tab (the head-to-head proof
// cards); the summary card and technical comparison matrix these tests assert
// on live in the "Overview" tab, so switch to it first.
function openOverviewTab() {
  const overviewTab = screen.queryByRole("tab", { name: "Overview" });

  if (overviewTab && overviewTab.getAttribute("aria-selected") !== "true") {
    fireEvent.click(overviewTab);
  }
}

function openTechnicalComparisonDetails() {
  openOverviewTab();

  const summary = screen.getByText("Technical comparison details");
  const details = summary.closest("details") as HTMLDetailsElement | null;

  if (details && !details.open) {
    fireEvent.click(summary);
  }
}

async function findMainCompareResult(): Promise<HTMLElement> {
  openOverviewTab();
  return screen.findByLabelText(/Main WyreStorm match:/i);
}

function getMainCompareProductSection(
  label: "Competitor" | "WyreStorm direction",
): HTMLElement | null {
  const result = screen.getByLabelText(/Main WyreStorm match:/i);

  return within(result)
    .getByText(label, {
      selector: ".compare-compact-result__product > span",
    })
    .closest("section");
}

function runCustomTextCompare(brand: string, description: string) {
  const visibleBrandButton = screen.queryByRole("button", { name: brand });

  if (!visibleBrandButton) {
    const manualCompareButton = screen.queryByRole("button", { name: /choose products manually/i });

    if (!manualCompareButton) {
      throw new Error("Manual compare button was not available before selecting a known competitor brand.");
    }

    fireEvent.click(manualCompareButton);
  }

  fireEvent.click(screen.getByRole("button", { name: brand }));

  const skuInput = screen.getByRole("textbox", { name: /^Competitor SKU$/i });
  fireEvent.change(skuInput, { target: { value: description } });

  const reviewButton = screen
    .getAllByRole("button", { name: /review wyrestorm direction/i })
    .find((button) => button.textContent?.trim() === "Review WyreStorm direction");

  if (!reviewButton) {
    throw new Error("Review WyreStorm direction button was not available.");
  }

  fireEvent.click(reviewButton);
}

describe("Compare rendered workflow", () => {
  beforeAll(() => {
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("opens directly on the structured competitor product workflow", () => {
    renderComparePage();

    expect(screen.getByRole("heading", { name: "Compare competitor products" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Choose competitor brand" })).toBeInTheDocument();
    expect(screen.getByText("Current step")).toBeInTheDocument();
    expect(screen.getByText("Next")).toBeInTheDocument();
    expect(screen.getByText("Available after selection")).toBeInTheDocument();

    const stepGuidance = screen.getByText("Why this step matters").closest("details") as HTMLDetailsElement | null;
    expect(stepGuidance?.open).toBe(false);

    expect(screen.queryByText(/Enter what the customer mentioned/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /open manual picker/i })).not.toBeInTheDocument();
  });

  it("lists competitor manufacturers alphabetically", () => {
    renderComparePage();

    const manufacturerList = screen.getByLabelText("Known manufacturers");
    const brands = within(manufacturerList)
      .getAllByRole("button")
      .map((button) => button.textContent?.trim() ?? "");
    const alphabetized = [...brands].sort((left, right) =>
      left.localeCompare(right, undefined, { sensitivity: "base" }),
    );

    expect(brands).toEqual(alphabetized);
  });

  it("includes UC manufacturers and products in the structured selectors", async () => {
    renderComparePage();

    for (const brand of [
      "AVer",
      "Bose Professional",
      "Cisco",
      "Crestron",
      "HP Poly",
      "Huddly",
      "Jabra",
      "Logitech",
      "Neat",
      "Q-SYS",
      "Yealink",
    ]) {
      expect(screen.getByRole("button", { name: brand })).toBeInTheDocument();
    }

    fireEvent.click(screen.getByRole("button", { name: "HP Poly" }));
    expect(screen.getByRole("button", { name: "Studio R30" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Studio E70" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Studio R30" }));
    await findMainCompareResult();

    const wyrestormSection = getMainCompareProductSection("WyreStorm direction");
    expect(wyrestormSection).not.toBeNull();
    expect(within(wyrestormSection as HTMLElement).getByText("APO-VX20-UC-V2")).toBeInTheDocument();
  });

  it("saves a quote-safe competitor lookup and keeps the lead recommendation away from controller-only products", async () => {
    renderComparePage();

    runKnownCompare("Crestron", "DM-NVX-350");

    await findMainCompareResult();

    const addToProjectButton = screen.getByRole("button", { name: /Add to project/i });
    const pitchLink = screen.getByRole("link", { name: /Product details/i });

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

    openTechnicalComparisonDetails();

    const matrix = await screen.findByRole("table", { name: /competitor versus wyrestorm comparison matrix/i });
    const competitorSection = getMainCompareProductSection("Competitor");
    const wyrestormSection = getMainCompareProductSection("WyreStorm direction");

    expect(competitorSection).not.toBeNull();
    expect(wyrestormSection).not.toBeNull();

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
    expect(within(transportRow as HTMLElement).getByText(/1GbE JPEG2000 AVoIP/i)).toBeInTheDocument();
  });

  it("labels routed matrix outputs distinctly without inventing NDI", async () => {
    renderComparePage();

    runKnownCompare("Lightware", "MMX6x2-HT200");

    openTechnicalComparisonDetails();

    const matrix = await screen.findByRole("table", { name: /competitor versus wyrestorm comparison matrix/i });
    const outputRow = within(matrix).getByText("Outputs").closest('[role="row"]');

    expect(outputRow).not.toBeNull();
    expect((outputRow as HTMLElement).textContent).toMatch(/routed display outputs/i);
    expect((outputRow as HTMLElement).textContent).toMatch(/HDBaseT/i);
    expect((outputRow as HTMLElement).textContent).not.toMatch(/NDI/i);
  });

  it("shows one reported result colour and keeps technical detail collapsed", async () => {
    renderComparePage();

    runKnownCompare("Atlona", "AT-OMNI-111");

    await findMainCompareResult();

    const statusRail = screen.getByRole("list", { name: /comparison result status/i });
    const activeStatuses = within(statusRail)
      .getAllByRole("listitem")
      .filter((item) => item.classList.contains("is-active"));

    expect(activeStatuses).toHaveLength(1);
    expect(activeStatuses[0]).toHaveTextContent("Further checks required");
    expect(activeStatuses[0]).toHaveClass("compare-reported-status--checks");

    const technicalDetails = screen
      .getByText("Technical comparison details")
      .closest("details") as HTMLDetailsElement | null;

    const supportDetails = screen
      .getByText("Technical review controls and other options")
      .closest("details") as HTMLDetailsElement | null;

    expect(technicalDetails?.open).toBe(false);
    expect(supportDetails?.open).toBe(false);
    expect(screen.getByRole("button", { name: "More info from Guru" })).toBeInTheDocument();
    expect(screen.queryByText("Ask the customer")).not.toBeInTheDocument();
  });

  it("sends the concise result context directly to Guru", async () => {
    const guruListener = vi.fn();
    window.addEventListener("wingman:open-guru", guruListener as EventListener);

    renderComparePage();
    runKnownCompare("Atlona", "AT-OMNI-111");

    await findMainCompareResult();
    const guruButton = await screen.findByRole("button", { name: "More info from Guru" });
    fireEvent.click(guruButton);

    expect(guruListener).toHaveBeenCalledTimes(1);

    const event = guruListener.mock.calls[0]?.[0] as CustomEvent;
    expect(event.detail?.source).toBe("competitor-compare");
    expect(event.detail?.prompt).toMatch(/technical reason/i);
    expect(event.detail?.prompt).toMatch(/next two questions/i);

    window.removeEventListener("wingman:open-guru", guruListener as EventListener);
  });

  it("uses concrete limited-data wording instead of the old generic guidance phrasing", async () => {
    renderComparePage();

    const nextProductStep = screen.queryByRole("button", { name: /next: choose competitor product/i });

    if (nextProductStep) {
      fireEvent.click(nextProductStep);
    }

        if (!screen.queryByRole("heading", { name: /choose the competitor sku/i })) {
      const manualCompareButton = screen.queryByRole("button", { name: /choose products manually/i });

      if (!manualCompareButton) {
        throw new Error("Manual compare button was not available before the known-SKU workflow check.");
      }

      fireEvent.click(manualCompareButton);
    }

        if (!screen.queryByRole("heading", { name: /choose the competitor sku/i })) {
      const nextProductButton = screen.queryByRole("button", { name: /next:\s*choose competitor product/i });

      if (nextProductButton) {
        fireEvent.click(nextProductButton);
      }
    }

    await screen.findByRole("heading", { name: /choose the competitor sku/i });

    const customSkuButtons = await screen.findAllByRole("button", { name: /custom \/ missing sku/i });
    fireEvent.click(customSkuButtons[0]);

    await screen.findByRole("heading", { name: /No suitable WyreStorm match found from the current data/i });

    expect(screen.getByText(/Closest direction only until the competitor specification is confirmed\./i)).toBeInTheDocument();
    expect(screen.queryByText(/Treat this as product-direction guidance, not a confirmed direct equivalent/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Confirm whether the customer wants the same architecture/i)).not.toBeInTheDocument();
  });

  it("keeps Marshall PTZ controllers out of camera and NetworkHD endpoint recommendations", async () => {
    renderComparePage();

    runKnownCompare("Marshall", "VS-PTC-200NDI");

    await screen.findByRole("heading", { name: /No suitable WyreStorm match found from the current data/i });

    expect(screen.queryByText("CAM-210-NDI-PTZ")).not.toBeInTheDocument();
    expect(screen.queryByText("NHD-500-TX")).not.toBeInTheDocument();
    expect(screen.queryByText(/source-side AV-over-IP encoder/i)).not.toBeInTheDocument();
  });

  it("shows presentation-switcher comparison rows instead of debug-style copy", async () => {
    renderComparePage();

    runKnownCompare("Atlona", "AT-OME-CS31-SA");

    openTechnicalComparisonDetails();

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

    openTechnicalComparisonDetails();

    const matrix = await screen.findByRole("table", { name: /competitor versus wyrestorm comparison matrix/i });

    const inputRow = within(matrix).getByText("Inputs").closest('[role="row"]');
    expect(inputRow).not.toBeNull();
        const inputRowText = (inputRow as HTMLElement).textContent ?? "";
    expect(inputRowText).toMatch(/(?:6\s*x?\s*.*input|input.*6\s*x?|4\s*x?\s*HDMI.*input)/i);
    expect(within(inputRow as HTMLElement).getByText("Covers required count")).toBeInTheDocument();

    const outputRow = within(matrix).getByText("Outputs").closest('[role="row"]');
    expect(outputRow).not.toBeNull();
    expect(within(outputRow as HTMLElement).getByText(/2x .*output/i)).toBeInTheDocument();
    expect(within(outputRow as HTMLElement).queryByText(/2x .*input/i)).not.toBeInTheDocument();

    expect(screen.queryByText("MX-0402-MST")).not.toBeInTheDocument();
  });

  it("recommends the Apollo UC video bar (not a bare PTZ camera) for a described all-in-one UC video bar competitor", async () => {
    renderComparePage();

    runCustomTextCompare("Barco", "XYZ888 UC video bar soundbar camera microphone speaker teams zoom BYOD");

    await findMainCompareResult();

    const wyrestormSection = getMainCompareProductSection("WyreStorm direction");
    expect(wyrestormSection).not.toBeNull();
    expect(within(wyrestormSection as HTMLElement).getByText("APO-VX20-UC-V2")).toBeInTheDocument();
  });

  it("recommends the Apollo wireless casting dongle for a described wireless casting competitor", async () => {
    renderComparePage();

    runCustomTextCompare("Barco", "XYZ999 wireless casting dongle byod presentation");

    await findMainCompareResult();

    const wyrestormSection = getMainCompareProductSection("WyreStorm direction");
    expect(wyrestormSection).not.toBeNull();
    expect(within(wyrestormSection as HTMLElement).getByText("APO-DG2")).toBeInTheDocument();
  });

  it("recommends a WyreStorm HDMI splitter for a described HDMI splitter/distribution amplifier competitor", async () => {
    renderComparePage();

    runCustomTextCompare("Barco", "SP14CS 1x4 4K HDMI splitter with audio breakout");

    await findMainCompareResult();

    const wyrestormSection = getMainCompareProductSection("WyreStorm direction");
    expect(wyrestormSection).not.toBeNull();
    expect(within(wyrestormSection as HTMLElement).getByText("SP-0104-H2")).toBeInTheDocument();
  });
});
