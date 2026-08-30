import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

const { storedProject } = vi.hoisted(() => ({
  storedProject: {
    id: "project-1",
    name: "Meeting Room Refresh",
    owner: "Northbridge",
    stage: "Discovery",
    status: "alternative",
    updated: "Today",
    updatedAt: "2026-08-04T09:00:00.000Z",
    resumeTo: "/wingman/discovery",
    requirements: [],
    productSelections: [],
    compareRuns: [] as StoredCompareRun[],
    recommendationEvidence: {
      productDirection: "Presentation / UC",
      systemShape: "Meeting room presentation system",
      quoteSafetyStatus: "do-not-quote",
      quoteSafetyMessage: "Confirm the USB path.",
      nextBestQuestion: "Who owns the USB host?",
      missingInformation: ["USB host ownership"],
      productFamilyScores: [],
      evidenceUsed: [],
      requiredDependencies: [],
    },
  },
}));

vi.mock("../data/projectStore", () => ({
  setActiveProjectId: vi.fn(),
  saveProjectRequirementsToProject: vi.fn(),
  updateStoredProject: vi.fn(),
  useProjectStore: () => ({
    projects: [storedProject],
    syncStatus: { state: "local", message: "Saved in this browser." },
    deleteProject: vi.fn(),
  }),
}));

import { ProjectDetailPage } from "./ProjectDetailPage";
import { routeCatalogByKey } from "../app/routeCatalog";
import type { StoredCompareRun } from "../data/projectStore";

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={["/wingman/projects/project-1"]}>
      <Routes>
        <Route path="/wingman/projects/:projectId" element={<ProjectDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function traceSection() {
  const trace = screen.getByText("Project evidence trace").closest("section");
  expect(trace).not.toBeNull();
  return trace!;
}

// Contract: the evidence trace renders by default and surfaces the stored
// compare tier as the timeline status chip, so the confidence signal a rep saw
// on the Compare page is visible on the project timeline. Scoped to the trace
// section because the competitor label and summary also appear in the
// command-centre card above it.
describe("Project detail evidence trace contract", () => {
  it("renders the compare-run confidence chip on the evidence trace timeline", () => {
    storedProject.compareRuns = [
      {
        id: "compare-cx30",
        createdAt: "2026-08-16T14:59:00.000Z",
        competitorBrand: "Barco",
        competitorSku: "CLICKSHARE-CX-30",
        confidence: "Plausible — confirm",
        summary: "Approved closest technical match by Steve.",
      },
    ];

    renderDetail();
    fireEvent.click(screen.getByRole("tab", { name: /Capture/ }));

    const trace = traceSection();
    expect(within(trace).getByText("Barco CLICKSHARE-CX-30")).not.toBeNull();
    expect(within(trace).getAllByText("Plausible — confirm").length).toBeGreaterThan(0);
    expect(within(trace).getByText("Approved closest technical match by Steve.")).not.toBeNull();

    // The trace entry opens the Compare workflow preloaded with the stored
    // competitor, so the Open action re-checks rather than starting cold.
    const openLinks = within(trace).getAllByRole("link", { name: "Open" });
    const compareLink = openLinks.find((link) =>
      link.getAttribute("href")?.startsWith(routeCatalogByKey.compare.path),
    );
    expect(compareLink).not.toBeUndefined();
    const url = new URL(compareLink!.getAttribute("href")!, "http://localhost");
    expect(url.searchParams.get("brand")).toBe("Barco");
    expect(url.searchParams.get("sku")).toBe("CLICKSHARE-CX-30");
  });

  it("shows the honest 'Comparison saved' default for a run without a stored tier", () => {
    // A run saved before the confidence field existed carries no tier: the
    // timeline must not fabricate one, it must fall back to the plain default.
    storedProject.compareRuns = [
      {
        id: "compare-legacy",
        createdAt: "2026-08-04T09:00:00.000Z",
        competitorBrand: "Kramer",
        competitorSku: "VS-42H",
        summary: "Legacy comparison evidence saved to project.",
      },
    ];

    renderDetail();
    fireEvent.click(screen.getByRole("tab", { name: /Capture/ }));

    const trace = traceSection();
    expect(within(trace).getByText("Kramer VS-42H")).not.toBeNull();
    expect(within(trace).getByText("Comparison saved")).not.toBeNull();
    // No tier is invented for a run that never recorded one.
    expect(within(trace).queryByText(/Strong direction|Plausible — confirm|No equivalent|Evidence pending/)).toBeNull();
  });
});
