import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockUseProjectStore,
  mockSetActiveProjectId,
  mockSaveProjectRequirementsToProject,
} = vi.hoisted(() => ({
  mockUseProjectStore: vi.fn(),
  mockSetActiveProjectId: vi.fn(),
  mockSaveProjectRequirementsToProject: vi.fn(),
}));

vi.mock("@/wingman2/data/projectStore", async () => {
  const actual = await vi.importActual<typeof import("@/wingman2/data/projectStore")>("@/wingman2/data/projectStore");

  return {
    ...actual,
    useProjectStore: mockUseProjectStore,
    setActiveProjectId: mockSetActiveProjectId,
    saveProjectRequirementsToProject: mockSaveProjectRequirementsToProject,
  };
});

import { ProjectDetailPage } from "@/wingman2/pages/ProjectDetailPage";

describe("Project Detail rendered workflow evidence", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseProjectStore.mockReturnValue({
      syncStatus: {
        state: "local",
        message: "Projects are saved in this browser.",
        updatedAt: new Date().toISOString(),
      },
      projects: [
        {
          id: "project-1",
          name: "Sports Bar Refresh",
          owner: "Steve",
          stage: "Competitor Compare",
          status: "alternative",
          updated: "Now",
          resumeTo: "/wingman/compare",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          discoveryBrief: {
            savedAt: new Date().toISOString(),
            capturedPercent: 100,
            nextBestQuestion: "Confirm whether each TV zone needs independent source control.",
            missingInformation: ["Confirm final display resolution for all bar TVs."],
            recommendationEvidence: {
              updatedAt: new Date().toISOString(),
              source: "Discovery",
              customerRequirement: "Sports bar with local Sky/media sources and six TVs across multiple zones.",
              productDirection: "Matrix / HDBaseT direction",
              systemShape: "Contained routing direction",
              whyThisFits: ["Local multi-zone routing is the leading requirement."],
              evidenceUsed: ["Product-family score: Matrix / HDBaseT"],
              productFamilyScores: [
                {
                  family: "Matrix / HDBaseT",
                  score: 94,
                  reasons: ["Hospitality / sports bar routing", "Contained local source-to-display paths"],
                  cautions: ["Confirm per-zone output behaviour before quote."],
                },
              ],
              quoteChecks: ["Confirm zone routing and display quantities."],
              missingInformation: ["Confirm final display resolution for all bar TVs."],
              requiredDependencies: ["Control approach for staff switching."],
              optionalUpgrades: ["Consider NetworkHD only if routing flexibility expands beyond local zones."],
              alternatives: ["Do not lead with a controller or accessory as the main recommendation."],
              customerSafeWording: ["Lead with the bar workflow and zone routing outcome."],
              internalGuidance: ["Avoid controller-only or accessory-only lead recommendations."],
              quoteSafetyStatus: "validate-before-quote",
              quoteSafetyMessage: "Validate before quote - the product direction is usable, but checks remain.",
              confidence: "medium",
              nextBestQuestion: "Confirm whether each TV zone needs independent source control.",
            },
          },
          productSelections: [
            {
              sku: "MX-0808-KIT",
              title: "8x8 matrix kit",
              family: "Matrix / HDBaseT",
              category: "Matrix",
              status: "recommended",
              source: "Competitor Compare",
              addedAt: new Date().toISOString(),
            },
          ],
          compareRuns: [
            {
              id: "compare-1",
              createdAt: new Date().toISOString(),
              competitorBrand: "Kramer",
              competitorSku: "VS-88H2A",
              confidence: "Plausible — confirm",
              wyrestormSku: "MX-0808-KIT",
              wyrestormTitle: "8x8 matrix kit",
              summary: "Local hospitality routing points to a contained matrix direction.",
              source: "Competitor Compare",
            },
          ],
          proposal: {
            title: "Sports Bar Proposal",
            summary: "Matrix-led draft for hospitality routing.",
            sections: ["Overview", "Products"],
            products: [],
            assumptions: [],
            readinessScore: 72,
            updatedAt: new Date().toISOString(),
          },
        },
      ],
    });
  });

  it("renders product-family decision, missing information, and project evidence handoff from the stored project", () => {
    render(
      <MemoryRouter initialEntries={["/wingman/projects/project-1"]}>
        <Routes>
          <Route path="/wingman/projects/:projectId" element={<ProjectDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(mockSetActiveProjectId).toHaveBeenCalledWith("project-1");
    expect(screen.getAllByText("MX-0808-KIT").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /Review .* project blockers?/ }));
    expect(screen.getByRole("region", { name: "Proposal blocker walkthrough" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open full Discovery|Open Finder|Open Compare|Open Proposal/ })).toBeInTheDocument();

    // The evidence trace renders by default: the compare-run confidence chip is
    // visible on the timeline without an extra click.
    expect(screen.getByText("Project evidence trace")).toBeInTheDocument();
    expect(screen.getAllByText("Plausible — confirm").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Kramer VS-88H2A").length).toBeGreaterThan(0);

    expect(screen.getByText("Leading product family")).toBeInTheDocument();
    expect(screen.getAllByText("Matrix / HDBaseT").length).toBeGreaterThan(0);
  });

  it("collapses and re-expands the detail body with the Review/Hide toggle", () => {
    render(
      <MemoryRouter initialEntries={["/wingman/projects/project-1"]}>
        <Routes>
          <Route path="/wingman/projects/:projectId" element={<ProjectDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Project evidence trace")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Hide project detail" }));
    expect(screen.queryByText("Project evidence trace")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Review project detail" }));
    expect(screen.getByText("Project evidence trace")).toBeInTheDocument();
  });
});
