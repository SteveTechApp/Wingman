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

    await screen.findByText("Sales answer");

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

  it("shows a short sales-first AVoIP compare answer with differentiated candidate explanations", async () => {
    render(
      <MemoryRouter>
        <ComparePageNew />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Blustream" }));
    fireEvent.click(screen.getByRole("button", { name: "IP350UHD-TX" }));

    await screen.findByText("Sales answer");

    expect(screen.getByText("Sales answer")).toBeInTheDocument();
    expect(screen.getByText(/IP350UHD-TX is recognised as a source-side AV-over-IP encoder/i)).toBeInTheDocument();
    expect(screen.getByText(/Use NHD-500-TX when the requirement is encoding a local source into a WyreStorm NetworkHD 500 system/i)).toBeInTheDocument();
    expect(screen.getByText(/Check before quoting/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Check before quoting/i)).toHaveLength(1);

    expect(screen.getByText("NHD-500-TX")).toBeInTheDocument();
    expect(screen.getByText("NHD-500-E-TX")).toBeInTheDocument();
    expect(screen.getByText("NHD-510-TX")).toBeInTheDocument();

    fireEvent.click(screen.getAllByText(/More detail/i)[0]);
    expect(screen.getAllByText(/Standard NetworkHD 500 source-side encoder path/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/lighter NetworkHD 500 encoder path/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/audio-network encoder option/i).length).toBeGreaterThanOrEqual(1);

    expect(screen.queryByText(/Closest WyreStorm direction for a 1GbE AV-over-IP endpoint/i)).not.toBeInTheDocument();
  });

  it("states ecosystem difference for Atlona OmniStream encoder and keeps the sales answer compact", async () => {
    render(
      <MemoryRouter>
        <ComparePageNew />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Atlona" }));
    fireEvent.click(screen.getByRole("button", { name: "AT-OMNI-111" }));

    await screen.findByText("Sales answer");

    expect(screen.getByText(/AT-OMNI-111 is recognised as a source-side AV-over-IP encoder/i)).toBeInTheDocument();
    expect(screen.getByText(/Use NHD-500-TX when the requirement is encoding a local source into a WyreStorm NetworkHD 500 system/i)).toBeInTheDocument();
    expect(screen.getByText(/Atlona OmniStream and WyreStorm NetworkHD are not drop-in compatible ecosystems/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Check before quoting/i)).toHaveLength(1);
  });

  it("makes incomplete competitor data explicit and shows multiple verify-before-quote items", async () => {
    render(
      <MemoryRouter>
        <ComparePageNew />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "CUSTOM / missing SKU" }));

    await screen.findByText("Sales answer");

    expect(
      screen.getByText(
        "Wingman has limited local data for this competitor SKU. Treat this as product-direction guidance, not a confirmed direct equivalent.",
      ),
    ).toBeInTheDocument();

    const verifyHeadings = screen.getAllByText(/Check before quoting/i);
    expect(verifyHeadings).toHaveLength(1);
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

    await screen.findByText("Sales answer");

    expect(screen.getByText(/AT-OME-EX-KIT is recognised as a point-to-point HDBaseT extender kit/i)).toBeInTheDocument();
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

    await screen.findByText("Sales answer");

    expect(screen.getByText(/HMX44-18G-KIT is recognised as a matrix switcher/i)).toBeInTheDocument();
    expect(screen.getByText("MX-0404-SCL")).toBeInTheDocument();
    expect(screen.queryByText(/point-to-point HDBaseT extender kit/i)).not.toBeInTheDocument();
  });
});
