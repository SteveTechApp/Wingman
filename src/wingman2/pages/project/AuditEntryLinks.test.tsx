import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { ProjectAuditEntry } from "../../data/projectStore";
import type { StoredProject } from "../../features/projects";
import { AuditEntryLinks } from "./AuditEntryLinks";

const REVIEWED_AT = "2026-10-20T14:12:00.000Z";

/** The newest review entry, written the way the command layer writes it. */
const reviewEntry: ProjectAuditEntry = {
  id: "audit-review-2",
  action: "wall-survey-review",
  detail:
    "Worksheet photo review — 1 row accepted (1 typed), none rejected, 1 photo, 63% confidence, 1 typed run outside the printed allowance (Panel 1: 7 m against ≈2 m); recorded 20 Oct 2026, 14:12",
  scope: "videowall",
  severity: "info",
  actorName: "Wingman user",
  createdAt: REVIEWED_AT,
};

const olderEntry: ProjectAuditEntry = {
  ...reviewEntry,
  id: "audit-review-1",
  detail: "Worksheet photo review — 3 rows accepted, none rejected, 1 photo, 88% confidence; recorded 18 Oct 2026, 09:05",
  createdAt: "2026-10-18T09:05:00.000Z",
};

function project(requirements: Record<string, unknown>, auditTrail: ProjectAuditEntry[] = [reviewEntry]): StoredProject {
  return {
    id: "project-1",
    name: "Boardroom wall",
    videowall: {
      savedAt: REVIEWED_AT,
      wallType: "lcd",
      summary: { version: 2, requirements },
    },
    auditTrail,
  } as unknown as StoredProject;
}

/** A typed run the apply bar doubted, kept on the review and accepted. */
function flaggedReview() {
  return {
    surveyReview: {
      reviewedAt: REVIEWED_AT,
      photoCount: 1,
      confidence: 0.63,
      rows: [{ id: "display-1", label: "Panel 1", metres: 7, confidence: 0, typed: true, decision: "accepted" }],
      flags: [{ id: "display-1", label: "Panel 1", metres: 7, allowanceMetres: 2 }],
    },
  };
}

/** A saved wall with costable links, so its transport rows exist to be named. */
const costedWall = {
  application: "lcd-direct",
  columns: 2,
  rows: 1,
  sources: 1,
  sourceLocation: "local",
  sourceResolution: "4k60",
  measuredRuns: { "display-1": 4 },
};

function renderEntry(value: StoredProject, entry: ProjectAuditEntry = value.auditTrail?.[0] ?? reviewEntry) {
  return render(
    <MemoryRouter>
      <AuditEntryLinks project={value} entry={entry} />
    </MemoryRouter>,
  );
}

describe("AuditEntryLinks", () => {
  it("addresses the review row a flagged run was read from", () => {
    const value = project(flaggedReview());
    renderEntry(value);

    const link = screen.getByTestId("audit-survey-flag-link");
    // The link is the clause the note prints, not a second wording of it.
    expect(link.textContent).toBe("Panel 1: 7 m against ≈2 m");
    // And its destination is the shared row-anchor contract, the same address a
    // copied panel link uses — the page's hash reader does the landing.
    expect(link.getAttribute("href")).toBe(
      "/wingman/projects/project-1?view=confirm#wall-survey-review-row-display-1",
    );
    expect(link.getAttribute("data-survey-flag-run")).toBe("wall-survey-review-row-display-1");
    expect(link.getAttribute("title")).toContain("Requirements");
  });

  it("decorates only the newest review entry, because the project keeps one review", () => {
    renderEntry(project(flaggedReview(), [reviewEntry, olderEntry]), olderEntry);

    expect(screen.queryByTestId("audit-survey-flag-link")).toBeNull();
    expect(screen.queryByTestId("audit-survey-cleared-link")).toBeNull();
  });

  it("addresses the rows a review cleared", () => {
    renderEntry(
      project({
        surveyReview: {
          reviewedAt: REVIEWED_AT,
          photoCount: 1,
          confidence: 0.9,
          rows: [
            { id: "source-1", label: "Source 1", metres: 4.5, confidence: 0.9, decision: "accepted" },
            { id: "display-2", label: "Panel 2", metres: 9, confidence: 0.4, decision: "rejected" },
          ],
        },
      }),
    );

    const link = screen.getByTestId("audit-survey-cleared-link");
    expect(link.textContent).toBe("See the 1 cleared row");
    expect(link.getAttribute("href")).toBe(
      "/wingman/projects/project-1?view=confirm#wall-survey-review-row-display-2",
    );
    // A clean run of numbers is not made to look checked: no flags, no links.
    expect(screen.queryByTestId("audit-survey-flag-links")).toBeNull();
  });

  it("addresses the transport row a sheet import named", () => {
    const sheetEntry: ProjectAuditEntry = {
      ...reviewEntry,
      id: "audit-sheet-1",
      action: "wall-survey-sheet",
      detail: "Survey sheet imported — 1 run (Panel 1: 4 m); recorded 21 Oct 2026, 20:30",
      createdAt: "2026-10-21T20:30:00.000Z",
    };
    renderEntry(project(costedWall, [sheetEntry]), sheetEntry);

    const link = screen.getByTestId("audit-wall-transport-link");
    expect(link.textContent).toBe("Panel 1: 4 m");
    expect(link.getAttribute("href")).toBe(
      "/wingman/projects/project-1?view=confirm#wall-transport-review-row-display-1",
    );
    expect(link.getAttribute("data-wall-transport-row")).toBe("display-1");
  });

  it("leaves an entry alone when the review has nothing to check", () => {
    renderEntry(
      project({
        surveyReview: {
          reviewedAt: REVIEWED_AT,
          photoCount: 1,
          confidence: 0.9,
          rows: [{ id: "source-1", label: "Source 1", metres: 4.5, confidence: 0.9, decision: "accepted" }],
        },
      }),
    );

    expect(screen.queryByTestId("audit-survey-cleared-link")).toBeNull();
    expect(screen.queryByTestId("audit-survey-flag-link")).toBeNull();
  });
});
