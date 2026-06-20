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

  it("shows evidence-led AVoIP compare reasoning with differentiated candidate explanations", async () => {
    render(
      <MemoryRouter>
        <ComparePageNew />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Blustream" }));
    fireEvent.click(screen.getByRole("button", { name: "IP350UHD-TX" }));

    await screen.findByText("Best WyreStorm candidate");

    expect(screen.getByText(/Recognised class: AV-over-IP/i)).toBeInTheDocument();
    expect(screen.getByText(/Signal direction: Source-side \/ encoder path/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Where it matches/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/Unknown \/ verify before quoting/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/Required WyreStorm dependencies/i).length).toBeGreaterThanOrEqual(2);

    expect(screen.getByText("NHD-500-TX")).toBeInTheDocument();
    expect(screen.getByText("NHD-500-E-TX")).toBeInTheDocument();
    expect(screen.getByText("NHD-510-TX")).toBeInTheDocument();

    expect(screen.getAllByText(/Standard NetworkHD 500 source-side encoder path/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/lighter NetworkHD 500 encoder path/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/audio-network encoder option/i).length).toBeGreaterThanOrEqual(1);

    expect(screen.queryByText(/Closest WyreStorm direction for a 1GbE AV-over-IP endpoint/i)).not.toBeInTheDocument();
  });

  it("makes incomplete competitor data explicit and shows multiple verify-before-quote items", async () => {
    render(
      <MemoryRouter>
        <ComparePageNew />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "CUSTOM / missing SKU" }));

    await screen.findByText("Best WyreStorm candidate");

    expect(
      screen.getByText(
        "Wingman has limited local data for this competitor SKU. Treat this as product-direction guidance, not a confirmed direct equivalent.",
      ),
    ).toBeInTheDocument();

    const verifyHeadings = screen.getAllByText(/Unknown \/ verify before quoting/i);
    expect(verifyHeadings.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/Confirm exact video format, bandwidth and connector expectations before external quote use/i)).toBeInTheDocument();
    expect(screen.getByText(/Confirm control, audio and USB behaviour before treating this as a direct equivalent/i)).toBeInTheDocument();
    expect(screen.getByText(/Confirm whether the customer wants the same architecture or is open to a different WyreStorm system direction/i)).toBeInTheDocument();
  });

  it("keeps HDBaseT extender kits on extender architecture instead of leading with switchers", async () => {
    render(
      <MemoryRouter>
        <ComparePageNew />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Atlona" }));
    fireEvent.click(screen.getByRole("button", { name: "AT-OME-EX-KIT" }));

    await screen.findByText("Best WyreStorm candidate");

    expect(screen.getByText(/Recognised class: HDBaseT extender/i)).toBeInTheDocument();
    expect(screen.getAllByText(/TX\/RX extender kit/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Quote the transmitter\/receiver kit or matching endpoint pair/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("EX-100-KVM")).toBeInTheDocument();
    expect(screen.queryByText("MX-0403-H3-MST")).not.toBeInTheDocument();
    expect(screen.queryByText(/Compact presentation-switcher path considered/i)).not.toBeInTheDocument();
  });

  it("keeps matrix kits on matrix architecture instead of drifting into extender classification", async () => {
    render(
      <MemoryRouter>
        <ComparePageNew />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Blustream" }));
    fireEvent.click(screen.getByRole("button", { name: "HMX44-18G-KIT" }));

    await screen.findByText("Best WyreStorm candidate");

    expect(screen.getByText(/Recognised class: Matrix/i)).toBeInTheDocument();
    expect(screen.getByText("MX-0404-SCL")).toBeInTheDocument();
    expect(screen.queryByText(/Recognised class: HDBaseT extender/i)).not.toBeInTheDocument();
  });
});
