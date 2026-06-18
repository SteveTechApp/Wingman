import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { readProjectStore } from "@/wingman2/data/projectStore";
import ComparePageNew from "@/wingman2/pages/ComparePageNew";

vi.mock("@/wingman2/lib/productIntelligenceIndexCache", () => ({
  loadProductIntelligenceIndex: vi.fn().mockResolvedValue({ products: [] }),
}));

describe("Compare rendered workflow", () => {
  beforeAll(() => {
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("saves a quote-safe competitor lookup and keeps the lead recommendation away from controller-only products", async () => {
    render(
      <MemoryRouter>
        <ComparePageNew />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Crestron" }));
    fireEvent.click(screen.getByRole("button", { name: "DM-NVX-350" }));

    await screen.findByText("Best WyreStorm candidate");

    const pitchLink = screen.getByRole("link", { name: /See full pitch/i });
    const addToProjectButton = screen.getByRole("button", { name: /Add to project/i });

    expect(screen.getByText(/keeps the result quote-safe/i)).toBeInTheDocument();

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
});
