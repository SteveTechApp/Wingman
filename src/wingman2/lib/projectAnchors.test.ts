import { describe, expect, it } from "vitest";
import {
  projectAnchorFromHash,
  projectAnchorHref,
  projectAnchorTargetFromHash,
  projectAnchors,
  projectDetailSections,
  projectSectionAnchor,
  projectSectionHref,
} from "./projectAnchors";
import { WALL_SURVEY_REVIEW_ANCHOR, wallSurveyReviewRowAnchor } from "./wallSurveyReview";

describe("project anchors", () => {
  it("gives every section a panel of its own", () => {
    for (const section of projectDetailSections) {
      const anchor = projectSectionAnchor(section.id);
      // A section with no anchor could be shown by `?view=` but never linked to.
      expect(anchor, section.id).not.toBeNull();
      expect(anchor?.section).toBe(section.id);
    }
  });

  it("names only sections the page shows", () => {
    const sections = new Set(projectDetailSections.map((section) => section.id));
    for (const anchor of projectAnchors) {
      expect(sections.has(anchor.section), anchor.id).toBe(true);
    }
  });

  it("gives each panel one id", () => {
    expect(new Set(projectAnchors.map((anchor) => anchor.id)).size).toBe(projectAnchors.length);
  });

  it("keeps the survey review inside Requirements, beside the section's own panel", () => {
    expect(projectAnchorFromHash(`#${WALL_SURVEY_REVIEW_ANCHOR}`)).toMatchObject({
      section: "confirm",
      label: "Site survey photo review",
    });
    // Linking Requirements still lands on the Requirements panel, not on the
    // survey review that happens to live beside it.
    expect(projectSectionAnchor("confirm")?.id).toBe("project-requirements");
  });

  it("reads a hash rather than a bare id", () => {
    expect(projectAnchorFromHash("#project-evidence")?.section).toBe("capture");
    expect(projectAnchorFromHash("project-evidence")).toBeNull();
    expect(projectAnchorFromHash("#")).toBeNull();
    expect(projectAnchorFromHash("")).toBeNull();
    expect(projectAnchorFromHash("#  project-evidence  ")?.id).toBe("project-evidence");
  });

  it("decodes an encoded hash and survives a malformed one", () => {
    expect(projectAnchorFromHash("#project%2Devidence")?.id).toBe("project-evidence");
    // A stray % is compared as written instead of throwing.
    expect(projectAnchorFromHash("#project%E0%A4%A")).toBeNull();
  });

  it("ignores a hash this page does not render", () => {
    expect(projectAnchorFromHash("#somewhere-else")).toBeNull();
    // A panel from another route is not adopted by name collision.
    expect(projectAnchorFromHash("#survey")).toBeNull();
  });

  it("reads a row inside a panel, so a link can land on the row not the table", () => {
    const target = projectAnchorTargetFromHash(`#${wallSurveyReviewRowAnchor("display-2")}`);

    expect(target).toMatchObject({ rowId: "display-2" });
    expect(target?.anchor).toMatchObject({ id: WALL_SURVEY_REVIEW_ANCHOR, section: "confirm" });
    // The panel itself still resolves to no row.
    expect(projectAnchorTargetFromHash(`#${WALL_SURVEY_REVIEW_ANCHOR}`)?.rowId).toBeUndefined();
  });

  it("does not invent a row for a hash it cannot read", () => {
    // A prefix with nothing after it names no row, and an unregistered panel is
    // still no panel.
    expect(projectAnchorTargetFromHash(`#${WALL_SURVEY_REVIEW_ANCHOR}-row-`)).toBeNull();
    expect(projectAnchorTargetFromHash("#somewhere-else-row-display-1")).toBeNull();
  });

  it("builds one panel's address, or none for a panel it does not know", () => {
    expect(projectAnchorHref("project-1", "project-evidence")).toBe(
      "/wingman/projects/project-1?view=capture#project-evidence",
    );
    // The survey flag's address comes from here, so the section it names and
    // the panel it names cannot drift apart.
    expect(projectAnchorHref("project-1", WALL_SURVEY_REVIEW_ANCHOR)).toBe(
      `/wingman/projects/project-1?view=confirm#${WALL_SURVEY_REVIEW_ANCHOR}`,
    );
    expect(projectAnchorHref("harbour 12", "project-handoff")).toBe(
      "/wingman/projects/harbour%2012?view=handoff#project-handoff",
    );
    expect(projectAnchorHref("project-1", "not-a-panel")).toBeNull();
  });

  it("builds one row's address, and reads back the row it wrote", () => {
    const href = projectAnchorHref("project-1", WALL_SURVEY_REVIEW_ANCHOR, "display-2");

    expect(href).toBe(`/wingman/projects/project-1?view=confirm#${wallSurveyReviewRowAnchor("display-2")}`);
    // The writer and the reader are one contract: a link that builds through
    // the registry lands on the row the registry resolves.
    expect(projectAnchorTargetFromHash(`#${href!.split("#")[1]}`)).toMatchObject({
      anchor: { id: WALL_SURVEY_REVIEW_ANCHOR },
      rowId: "display-2",
    });
    // An empty row is the panel itself, not a hash ending in the separator.
    expect(projectAnchorHref("project-1", WALL_SURVEY_REVIEW_ANCHOR, " ")).toBe(
      `/wingman/projects/project-1?view=confirm#${WALL_SURVEY_REVIEW_ANCHOR}`,
    );
  });

  it("builds a section's address from the panel that section opens on", () => {
    // The navigator's links come from here, so a section cannot be listed on one
    // screen and land on another — and every section has an address, because
    // every section has a panel.
    for (const section of projectDetailSections) {
      const href = projectSectionHref("project-1", section.id);
      expect(href, section.id).toBe(
        `/wingman/projects/project-1?view=${section.id}#${projectSectionAnchor(section.id)?.id}`,
      );
    }
    expect(projectSectionHref("harbour 12", "products")).toBe(
      "/wingman/projects/harbour%2012?view=products#project-equipment",
    );
    // A section the page does not show has no address to offer.
    expect(projectSectionHref("project-1", "not-a-section")).toBeNull();
  });

  it("encodes a row id rather than breaking the hash on it", () => {
    const href = projectAnchorHref("project-1", WALL_SURVEY_REVIEW_ANCHOR, "panel 2");

    expect(href).toContain("#wall-survey-review-row-panel%202");
    expect(projectAnchorTargetFromHash(`#${href!.split("#")[1]}`)?.rowId).toBe("panel 2");
  });
});
