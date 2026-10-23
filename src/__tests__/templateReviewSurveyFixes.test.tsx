import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";

import { readProjectStore, setActiveProjectId, upsertStoredProject } from "../wingman2/data/projectStore";
import { completeProjectServiceRows } from "../wingman2/lib/projectScope";
import { validateProposalExport } from "../wingman2/lib/proposalExportValidation";
import { roomTemplates } from "../wingman2/lib/roomTemplates";
import { templateBomRows, templateProducts } from "../wingman2/lib/templateReviewProposal";
import { defaultWallRequirements } from "../wingman2/lib/videowallOptions";
import { wallTransportPlan, wallTransportRequirements } from "../wingman2/lib/videowallTransport";
import { wallSurveyGaps } from "../wingman2/lib/wallSurvey";
import { TemplateReviewPage } from "../wingman2/pages/TemplateReviewPage";

function exportableTemplate() {
  return roomTemplates.find((template) => {
    const rows = completeProjectServiceRows(template.bom, template.id);
    return validateProposalExport({
      products: templateProducts(rows),
      bomRows: templateBomRows(template, rows),
    }).allowed;
  });
}

describe("template review survey fixes", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("records an enclosure and termination typed on the survey warning", () => {
    const template = exportableTemplate()!;
    const savedAt = "2026-10-20T09:00:00.000Z";
    // Another project is active; the cells belong to the wall's own project.
    upsertStoredProject({
      id: "unrelated-project",
      name: "Unrelated",
      owner: "Wingman user",
      stage: "Proposal Builder",
      status: "recommended",
      updated: "Just now",
      resumeTo: "/wingman/proposal",
      createdAt: savedAt,
      updatedAt: savedAt,
    });
    setActiveProjectId("unrelated-project");
    // display-1 already has its enclosure; display-2 has neither cell. The
    // warning names both links, so the cells offered must be exactly the ones
    // each link is short of.
    upsertStoredProject({
      id: "template-survey-project",
      name: "Template survey",
      owner: "Wingman user",
      stage: "Templates",
      status: "recommended",
      updated: "Just now",
      resumeTo: "/wingman/templates",
      createdAt: savedAt,
      updatedAt: savedAt,
      discoveryBrief: { savedAt, roomModel: { sourceTemplateId: template.id } },
      videowall: {
        savedAt,
        wallType: "lcd",
        templateId: template.id,
        // No `projectId`: the page must identify the wall's own project rather
        // than writing the cells into whichever project is active.
        summary: {
          version: 2,
          requirements: {
            ...defaultWallRequirements,
            application: "lcd-direct",
            layout: "independent",
            columns: 2,
            rows: 1,
            sources: 1,
            windows: 1,
            measuredRuns: { "display-1": 3, "display-2": 4 },
            linkDetails: { "display-1": { enclosure: "Back box" } },
          },
        },
      },
    });

    const requirements = wallTransportRequirements(
      readProjectStore().projects[0].videowall!.summary!.requirements as never,
    )!;
    const gaps = wallSurveyGaps(wallTransportPlan(requirements), requirements.linkDetails);
    expect(gaps.length).toBeGreaterThan(0);

    render(
      <MemoryRouter initialEntries={[`/wingman/templates/${template.id}`]}>
        <Routes>
          <Route path="/wingman/templates/:templateId" element={<TemplateReviewPage />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Proposal" }));
    // A short survey is an assumption the document labels, so the walk opens on
    // the unpriced lines and the cells are one stage along.
    fireEvent.click(screen.getByTestId("template-preissue-assumptions"));

    // The warning says the survey is short, and the same cells the proposal
    // offers are on the template page, one row per short link.
    expect(screen.getByText(/Survey incomplete/)).not.toBeNull();
    for (const gap of gaps) {
      expect(screen.getByTestId("template-proposal-pricing")).not.toBeNull();
      for (const field of gap.missing) {
        const label = { enclosure: "Display housing", entry: "Run entry", termination: "Termination" }[field];
        expect(screen.queryByLabelText(`${label} for ${gap.link}`)).not.toBeNull();
      }
    }

    // Only the cells the rep types are recorded; the enclosure the design
    // already had is left alone.
    for (const gap of gaps) {
      for (const field of gap.missing) {
        const label = `${{ enclosure: "Display housing", entry: "Run entry", termination: "Termination" }[field]} for ${gap.link}`;
        fireEvent.change(screen.getByLabelText(label), {
          target: { value: field === "enclosure" ? "Back box" : field === "termination" ? "Cat6A outlet" : "Floor box" },
        });
      }
    }
    fireEvent.click(screen.getByRole("button", { name: "Record on the wall" }));

    const store = readProjectStore();
    // The active project was untouched, so the cells followed the wall's project.
    expect(store.projects.find((project) => project.id === "unrelated-project")!.videowall).toBeUndefined();
    const wall = store.projects.find((project) => project.id === "template-survey-project")!.videowall!;
    const recorded = wall.summary!.requirements as { linkDetails?: Record<string, Record<string, string>> };
    expect(recorded.linkDetails?.["display-1"]).toEqual({ enclosure: "Back box", entry: "Floor box", termination: "Cat6A outlet" });
    for (const gap of gaps) expect(recorded.linkDetails?.[gap.id]).toBeTruthy();

    // The warning is about the saved wall, so recording the cells clears it.
    expect(screen.queryByText(/Survey incomplete/)).toBeNull();
  });
});
