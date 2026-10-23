import { describe, expect, it } from "vitest";
import { projectAnchorHref } from "./projectAnchors";
import type { WallSurveyScan } from "./wallSurveyScan";
import {
  normalizeWallSurveyReview,
  projectsNeedingSurveyAttention,
  projectSurveyReconfirmDue,
  projectSurveyClearedFlag,
  projectSurveyNeedsAttention,
  projectSurveyReviewedFlag,
  SURVEY_REVIEW_STALE_DAYS,
  WALL_SURVEY_REVIEW_ANCHOR,
  wallSurveyClearedLink,
  wallSurveyClearedRows,
  wallSurveyReviewAge,
  wallSurveyReviewAuditNote,
  wallSurveyReviewCounts,
  wallSurveyReviewFlagLinks,
  wallSurveyReviewFrom,
  wallSurveyReviewFlagText,
  wallSurveyReviewFromSummary,
  wallSurveyReviewRowAnchor,
  wallSurveyReviewStamp,
  wallSurveyReviewSummary,
  type WallSurveyReview,
} from "./wallSurveyReview";

const REVIEWED_AT = "2026-10-20T14:12:00.000Z";
const DAY_MS = 86_400_000;
const daysAfter = (days: number) => new Date(new Date(REVIEWED_AT).getTime() + days * DAY_MS);

function scan(): WallSurveyScan {
  return {
    readings: [
      { id: "source-1", label: "Source 1", metres: 4.5, confidence: 0.82, note: "Clear handwriting.", detail: { enclosure: "Back box" } },
      { id: "display-1", label: "Panel 1", metres: 9, confidence: 0.41, note: "Digit smudged.", detail: {} },
      { id: "display-2", label: "Panel 2", metres: null, confidence: 0.9, note: "", detail: { mount: "Pole" } },
    ],
    runs: [
      { id: "source-1", metres: 4.5 },
      { id: "display-1", metres: 9 },
    ],
    details: [
      { id: "source-1", detail: { enclosure: "Back box" } },
      { id: "display-2", detail: { mount: "Pole" } },
    ],
    displayMounts: {},
    unread: [],
    blank: [],
    problems: [],
    summary: "Two runs and one install line.",
    confidence: 0.63,
    photoCount: 2,
  };
}

describe("wallSurveyReviewFrom", () => {
  it("keeps every row the reader offered and marks the rep's decision", () => {
    const review = wallSurveyReviewFrom(scan(), ["source-1", "display-2"], REVIEWED_AT);

    expect(review).toEqual({
      reviewedAt: REVIEWED_AT,
      photoCount: 2,
      confidence: 0.63,
      rows: [
        { id: "source-1", label: "Source 1", metres: 4.5, confidence: 0.82, decision: "accepted" },
        // The cleared row keeps the run it was read at, because that is the
        // value the rep looked at and decided not to trust.
        { id: "display-1", label: "Panel 1", metres: 9, confidence: 0.41, decision: "rejected" },
        { id: "display-2", label: "Panel 2", metres: null, confidence: 0.9, decision: "accepted" },
      ],
    });
    expect(wallSurveyReviewCounts(review)).toEqual({ accepted: 2, rejected: 1 });
  });

  it("reads as a full rejection when nothing was accepted", () => {
    const review = wallSurveyReviewFrom(scan(), [], REVIEWED_AT);
    expect(wallSurveyReviewCounts(review)).toEqual({ accepted: 0, rejected: 3 });
  });

  it("keeps both runs when the rep corrected a row before applying it", () => {
    const read = scan();
    const corrected = {
      ...read,
      readings: read.readings.map((reading) =>
        reading.id === "display-1" ? { ...reading, metres: 4 } : reading,
      ),
    };
    const review = wallSurveyReviewFrom(corrected, ["display-1"], REVIEWED_AT, read);

    // The applied run is the one that landed; the read one explains the edit.
    expect(review.rows.find((row) => row.id === "display-1")).toMatchObject({
      metres: 4,
      readMetres: 9,
      decision: "accepted",
    });
    // A row nobody touched carries no second number.
    expect(review.rows.find((row) => row.id === "source-1")).not.toHaveProperty("readMetres");
  });

  it("keeps the flagged hand-typed runs, but only the ones that landed", () => {
    const read = scan();
    const typedRun = {
      ...read,
      readings: read.readings.map((reading) =>
        reading.id === "display-1" ? { ...reading, metres: 20 } : reading,
      ),
    };
    const review = wallSurveyReviewFrom(typedRun, ["display-1"], REVIEWED_AT, read, [
      { id: "display-1", label: "Panel 1", metres: 20, allowanceMetres: 5 },
      // A flag for a cleared row describes a run the design does not hold.
      { id: "source-1", label: "Source 1", metres: 20, allowanceMetres: 5 },
    ]);

    expect(review.flags).toEqual([
      { id: "display-1", label: "Panel 1", metres: 20, allowanceMetres: 5 },
    ]);
    // The numbers are recorded beside the row, not instead of it.
    expect(review.rows.find((row) => row.id === "display-1")).toMatchObject({
      metres: 20,
      decision: "accepted",
    });
  });

  it("marks a row the rep typed as typed, not as read", () => {
    const read = scan();
    const typed = {
      ...read,
      readings: [
        ...read.readings,
        { id: "display-3", label: "Panel 3", metres: 5, confidence: 0, note: "", detail: {}, typed: true },
      ],
    };

    const review = wallSurveyReviewFrom(typed, ["source-1", "display-3"], REVIEWED_AT, read);

    // A typed row carries no read run to compare against, so it never claims
    // the photograph reported a number a rep supplied.
    expect(review.rows.at(-1)).toEqual({
      id: "display-3",
      label: "Panel 3",
      metres: 5,
      confidence: 0,
      typed: true,
      decision: "accepted",
    });
    expect(wallSurveyReviewSummary(review)).toContain("2 rows accepted (1 typed)");
  });
});

describe("normalizeWallSurveyReview", () => {
  const valid: WallSurveyReview = {
    reviewedAt: REVIEWED_AT,
    photoCount: 1,
    confidence: 0.8,
    rows: [{ id: "display-1", label: "Panel 1", metres: 6, confidence: 0.8, decision: "accepted" }],
  };

  it("returns a stored review unchanged", () => {
    expect(normalizeWallSurveyReview(valid)).toEqual(valid);
  });

  it("keeps the typed marker on a stored row", () => {
    const typed = {
      ...valid,
      rows: [{ ...valid.rows[0], typed: true }],
    };

    expect(normalizeWallSurveyReview(typed)?.rows[0]).toMatchObject({ typed: true });
  });

  it("drops rows that name nothing or carry no decision", () => {
    const normalized = normalizeWallSurveyReview({
      ...valid,
      confidence: "0.8",
      photoCount: "2",
      rows: [
        { id: "display-1", metres: "6", confidence: "0.8", decision: "accepted" },
        { id: "  ", metres: 6, decision: "accepted" },
        { id: "display-2", metres: 6, decision: "maybe" },
        { id: "display-3", metres: 6, confidence: 2, decision: "rejected" },
      ],
    });

    expect(normalized).toEqual({
      reviewedAt: REVIEWED_AT,
      photoCount: 2,
      confidence: 0.8,
      rows: [
        { id: "display-1", label: "display-1", metres: 6, confidence: 0.8, decision: "accepted" },
        // Confidence is clamped to what the panel can show.
        { id: "display-3", label: "display-3", metres: 6, confidence: 1, decision: "rejected" },
      ],
    });
  });

  it("keeps a corrected row's read run and drops a meaningless one", () => {
    const normalized = normalizeWallSurveyReview({
      ...valid,
      rows: [
        { id: "display-1", metres: 4, readMetres: 9, confidence: 0.8, decision: "accepted" },
        // A "read" value identical to what was applied says nothing.
        { id: "display-2", metres: 6, readMetres: 6, decision: "accepted" },
        // Neither does one that is not a length.
        { id: "display-3", metres: 5, readMetres: -1, decision: "accepted" },
      ],
    });

    expect(normalized?.rows).toEqual([
      { id: "display-1", label: "display-1", metres: 4, readMetres: 9, confidence: 0.8, decision: "accepted" },
      { id: "display-2", label: "display-2", metres: 6, confidence: 0, decision: "accepted" },
      { id: "display-3", label: "display-3", metres: 5, confidence: 0, decision: "accepted" },
    ]);
  });

  it("keeps a stored flag only while its row is there and still accepted", () => {
    const normalized = normalizeWallSurveyReview({
      ...valid,
      rows: [{ id: "display-1", label: "Panel 1", metres: 20, confidence: 0.4, decision: "accepted" }],
      flags: [
        // Numbers arrive as text from a draft; the label may be missing.
        { id: "display-1", metres: "20", allowanceMetres: "5" },
        { id: "display-1", metres: 20, allowanceMetres: 5 },
        // No such row, so nothing to explain.
        { id: "display-2", label: "Panel 2", metres: 30, allowanceMetres: 5 },
        // Not a length.
        { id: "display-1", metres: 0, allowanceMetres: 5 },
      ],
    });

    expect(normalized?.flags).toEqual([
      { id: "display-1", label: "Panel 1", metres: 20, allowanceMetres: 5 },
    ]);
  });

  it("drops a flag for a row the rep cleared", () => {
    const normalized = normalizeWallSurveyReview({
      ...valid,
      rows: [{ ...valid.rows[0], decision: "rejected" }],
      flags: [{ id: "display-1", metres: 20, allowanceMetres: 5 }],
    });

    expect(normalized?.flags).toBeUndefined();
  });

  it("is no review at all when nothing usable survives", () => {
    expect(normalizeWallSurveyReview(undefined)).toBeUndefined();
    expect(normalizeWallSurveyReview({ rows: valid.rows })).toBeUndefined();
    expect(normalizeWallSurveyReview({ reviewedAt: REVIEWED_AT, rows: [] })).toBeUndefined();
    expect(normalizeWallSurveyReview({ reviewedAt: REVIEWED_AT, rows: [{ id: "display-1" }] })).toBeUndefined();
  });
});

describe("wallSurveyReviewSummary", () => {
  it("names what the review decided and where it came from", () => {
    expect(wallSurveyReviewSummary(wallSurveyReviewFrom(scan(), ["source-1"], REVIEWED_AT))).toBe(
      "1 row accepted, 2 rejected, 2 photos, 63% confidence",
    );
    expect(wallSurveyReviewFrom(scan(), ["source-1", "display-1", "display-2"], REVIEWED_AT)).toMatchObject({
      photoCount: 2,
    });
    expect(wallSurveyReviewSummary({
      reviewedAt: REVIEWED_AT,
      photoCount: 1,
      confidence: 0.9,
      rows: [{ id: "display-1", label: "Panel 1", metres: 4, confidence: 0.9, decision: "accepted" }],
    })).toBe("1 row accepted, none rejected, 1 photo, 90% confidence");
  });

  it("names the review and when it was applied on the audit trail", () => {
    const note = wallSurveyReviewAuditNote(wallSurveyReviewFrom(scan(), ["source-1"], REVIEWED_AT));

    expect(note).toContain("Worksheet photo review — 1 row accepted, 2 rejected, 2 photos, 63% confidence");
    // The stamp is what keeps a later review with the same counts a new event.
    expect(note).toContain(wallSurveyReviewStamp(REVIEWED_AT));
    expect(wallSurveyReviewStamp("not a date")).toBe("not a date");
  });

  it("carries the flagged runs and both numbers onto the trail", () => {
    const review = wallSurveyReviewFrom(scan(), ["source-1", "display-1"], REVIEWED_AT, scan(), [
      { id: "display-1", label: "Panel 1", metres: 20, allowanceMetres: 5 },
    ]);
    const note = wallSurveyReviewAuditNote(review);

    // The same run the apply bar named, in the same words, so the saved entry
    // does not drop back to a count nobody can check.
    expect(note).toContain(
      "2 rows accepted, 1 rejected, 2 photos, 63% confidence, 1 typed run outside the printed allowance (Panel 1: 20 m against ≈5 m)",
    );
    expect(note).toContain(`; recorded ${wallSurveyReviewStamp(REVIEWED_AT)}`);
  });

  it("names three flagged runs and counts the rest", () => {
    const flagged = [1, 2, 3, 4].map((index) => ({
      id: `display-${index}`,
      label: `Panel ${index}`,
      metres: 20,
      allowanceMetres: 5,
    }));
    const note = wallSurveyReviewAuditNote({
      reviewedAt: REVIEWED_AT,
      photoCount: 1,
      confidence: 0.9,
      rows: flagged.map((flag) => ({
        id: flag.id,
        label: flag.label,
        metres: flag.metres,
        confidence: 0,
        typed: true,
        decision: "accepted" as const,
      })),
      flags: flagged,
    });

    expect(note).toContain(
      "4 typed runs outside the printed allowance (Panel 1: 20 m against ≈5 m; Panel 2: 20 m against ≈5 m; Panel 3: 20 m against ≈5 m and 1 more)",
    );
  });

  it("says nothing about flagged runs when the review flagged none", () => {
    expect(wallSurveyReviewAuditNote(wallSurveyReviewFrom(scan(), ["source-1"], REVIEWED_AT))).not.toContain(
      "outside the printed allowance",
    );
  });
});

describe("wallSurveyReviewFromSummary", () => {
  const review = wallSurveyReviewFrom(scan(), ["source-1"], REVIEWED_AT);

  it("reads the review out of a saved wall summary or plain requirements", () => {
    expect(wallSurveyReviewFromSummary({ summary: { requirements: { surveyReview: review } } })).toEqual(review);
    expect(wallSurveyReviewFromSummary({ surveyReview: review })).toEqual(review);
  });

  it("treats a design without a usable review as having none", () => {
    expect(wallSurveyReviewFromSummary(null)).toBeUndefined();
    expect(wallSurveyReviewFromSummary({ summary: { requirements: {} } })).toBeUndefined();
    // A rotted row cannot be shown as a decision nobody made.
    expect(wallSurveyReviewFromSummary({ surveyReview: { reviewedAt: REVIEWED_AT, rows: [{ id: "display-1" }] } })).toBeUndefined();
  });
});

describe("wallSurveyReviewAge", () => {
  it("says how far away the review is, in the words a rep would use", () => {
    expect(wallSurveyReviewAge(REVIEWED_AT, new Date(REVIEWED_AT))).toEqual({ days: 0, text: "today", stale: false });
    expect(wallSurveyReviewAge(REVIEWED_AT, daysAfter(1))?.text).toBe("yesterday");
    expect(wallSurveyReviewAge(REVIEWED_AT, daysAfter(5))?.text).toBe("5 days ago");
    expect(wallSurveyReviewAge(REVIEWED_AT, daysAfter(14))?.text).toBe("2 weeks ago");
    expect(wallSurveyReviewAge(REVIEWED_AT, daysAfter(45))?.text).toBe("last month");
    expect(wallSurveyReviewAge(REVIEWED_AT, daysAfter(200))?.text).toBe("6 months ago");
    expect(wallSurveyReviewAge(REVIEWED_AT, daysAfter(400))?.text).toBe("last year");
  });

  it("calls a review stale only once the room may have moved on", () => {
    expect(wallSurveyReviewAge(REVIEWED_AT, daysAfter(SURVEY_REVIEW_STALE_DAYS - 1))?.stale).toBe(false);
    expect(wallSurveyReviewAge(REVIEWED_AT, daysAfter(SURVEY_REVIEW_STALE_DAYS))?.stale).toBe(true);
  });

  it("treats a fast clock as today and an unreadable stamp as no age at all", () => {
    expect(wallSurveyReviewAge(REVIEWED_AT, daysAfter(-2))).toEqual({ days: 0, text: "today", stale: false });
    expect(wallSurveyReviewAge("not a date")).toBeNull();
  });
});

describe("projectSurveyClearedFlag", () => {
  const review = wallSurveyReviewFrom(scan(), ["source-1"], REVIEWED_AT);

  it("flags a project whose last review cleared rows, and says where they are", () => {
    const flag = projectSurveyClearedFlag({ videowall: { summary: { requirements: { surveyReview: review } } } });

    expect(flag).toMatchObject({ cleared: 2, total: 3, reviewedAt: REVIEWED_AT, label: "2 survey rows cleared" });
    // The flag carries the row its link lands on, not just the table's name.
    expect(flag?.rowId).toBe("display-1");
    expect(projectAnchorHref("p1", WALL_SURVEY_REVIEW_ANCHOR, flag?.rowId)).toBe(
      `/wingman/projects/p1?view=confirm#${WALL_SURVEY_REVIEW_ANCHOR}-row-display-1`,
    );
    expect(flag?.title).toContain("cleared 2 of 3 rows");
    expect(flag?.title).toContain(wallSurveyReviewStamp(REVIEWED_AT));
    // The flag has to point at the panel that lists the rows.
    expect(flag?.title).toContain("Requirements section");
    expect(wallSurveyClearedRows(review).map((row) => row.id)).toEqual(["display-1", "display-2"]);
  });

  it("does not flag a review that kept every row", () => {
    const accepted = wallSurveyReviewFrom(scan(), ["source-1", "display-1", "display-2"], REVIEWED_AT);
    expect(projectSurveyClearedFlag({ videowall: { summary: { requirements: { surveyReview: accepted } } } })).toBeNull();
  });

  it("does not flag a project with no wall or no usable review", () => {
    expect(projectSurveyClearedFlag(null)).toBeNull();
    expect(projectSurveyClearedFlag({})).toBeNull();
    expect(projectSurveyClearedFlag({ videowall: { summary: { requirements: {} } } })).toBeNull();
  });

  it("counts one cleared row in the singular", () => {
    const one = wallSurveyReviewFrom(scan(), ["source-1", "display-2"], REVIEWED_AT);
    expect(projectSurveyClearedFlag({ videowall: { summary: { requirements: { surveyReview: one } } } })?.label).toBe(
      "1 survey row cleared",
    );
  });

  it("carries how long ago the rows were cleared, and what to do once it is old", () => {
    const project = { videowall: { summary: { requirements: { surveyReview: review } } } };

    const fresh = projectSurveyClearedFlag(project, new Date(REVIEWED_AT));
    expect(fresh?.age).toEqual({ days: 0, text: "today", stale: false });
    expect(fresh?.title).toContain("Last reviewed today.");

    const stale = projectSurveyClearedFlag(project, daysAfter(120));
    expect(stale?.age?.stale).toBe(true);
    expect(stale?.title).toContain("reopen the review to re-confirm the rows");
    // The state's own sentence is unchanged: age is shown beside it, not inside it.
    expect(stale?.label).toBe("2 survey rows cleared");
  });
});

describe("projectSurveyReviewedFlag", () => {
  it("states a review that kept every row, without a count of cleared rows", () => {
    const review = wallSurveyReviewFrom(scan(), ["source-1", "display-1", "display-2"], REVIEWED_AT);
    const flag = projectSurveyReviewedFlag({ videowall: { summary: { requirements: { surveyReview: review } } } });

    expect(flag).toMatchObject({ total: 3, reviewedAt: REVIEWED_AT, label: "Survey reviewed" });
    expect(flag?.title).toContain("kept all 3 rows");
    expect(flag?.title).toContain(wallSurveyReviewStamp(REVIEWED_AT));
    // The quiet state still leads somewhere: the panel that lists the decisions.
    expect(flag?.title).toContain("Requirements section");
  });

  it("stays out of the way of a review that cleared rows", () => {
    // One flag per project: the warning the cleared rows need is the only one.
    expect(projectSurveyReviewedFlag({ videowall: { summary: { requirements: { surveyReview: wallSurveyReviewFrom(scan(), ["source-1"], REVIEWED_AT) } } } })).toBeNull();
  });

  it("does not stand in for a survey that was never read", () => {
    expect(projectSurveyReviewedFlag(null)).toBeNull();
    expect(projectSurveyReviewedFlag({})).toBeNull();
    expect(projectSurveyReviewedFlag({ videowall: { summary: { requirements: {} } } })).toBeNull();
    // A design with measured runs but no applied review has not been read.
    expect(projectSurveyReviewedFlag({ videowall: { summary: { requirements: { measuredRuns: { "display-1": 4 } } } } })).toBeNull();
  });

  it("says how long ago a clean review happened, and that an old one is worth re-checking", () => {
    const review = wallSurveyReviewFrom(scan(), ["source-1", "display-1", "display-2"], REVIEWED_AT);
    const project = { videowall: { summary: { requirements: { surveyReview: review } } } };

    const fresh = projectSurveyReviewedFlag(project, daysAfter(3));
    expect(fresh?.age).toEqual({ days: 3, text: "3 days ago", stale: false });
    expect(fresh?.title).toContain("Last reviewed 3 days ago.");
    expect(fresh?.title).not.toContain("may have changed since");

    const stale = projectSurveyReviewedFlag(project, daysAfter(200));
    expect(stale?.age?.stale).toBe(true);
    expect(stale?.title).toContain("so the room may have changed since");
  });

  it("names one kept row in the singular", () => {
    const one: WallSurveyReview = {
      reviewedAt: REVIEWED_AT,
      photoCount: 1,
      confidence: 0.9,
      rows: [{ id: "display-1", label: "Panel 1", metres: 4, confidence: 0.9, decision: "accepted" }],
    };
    expect(projectSurveyReviewedFlag({ videowall: { summary: { requirements: { surveyReview: one } } } })?.title).toContain(
      "kept all 1 row (",
    );
  });
});

describe("projectSurveyNeedsAttention", () => {
  // The argument is the rows the rep kept, so anything left out is cleared.
  const saved = (accepted: string[]) => ({
    videowall: {
      summary: {
        requirements: { surveyReview: wallSurveyReviewFrom(scan(), accepted, REVIEWED_AT) },
      },
    },
  });

  it("counts the rows a review cleared, however recent it is", () => {
    // A cleared row is a decision to act on, so the chip that warns about it is
    // also the card the filter keeps.
    expect(projectSurveyNeedsAttention(saved(["source-1"]), daysAfter(1))).toBe(true);
  });

  it("counts a clean review once the room may have moved on, and not before", () => {
    const clean = saved(["source-1", "display-1", "display-2"]);

    expect(projectSurveyNeedsAttention(clean, daysAfter(3))).toBe(false);
    expect(projectSurveyNeedsAttention(clean, daysAfter(SURVEY_REVIEW_STALE_DAYS))).toBe(true);
    expect(projectSurveyNeedsAttention(clean, daysAfter(200))).toBe(true);
  });

  it("is not a count of projects nobody has surveyed", () => {
    // The filter answers "which surveys need me?", so a design with runs but no
    // applied review stays out of it rather than padding the number.
    expect(projectSurveyNeedsAttention(null)).toBe(false);
    expect(projectSurveyNeedsAttention({})).toBe(false);
    expect(projectSurveyNeedsAttention({ videowall: { summary: { requirements: {} } } })).toBe(false);
    expect(
      projectSurveyNeedsAttention({ videowall: { summary: { requirements: { measuredRuns: { "display-1": 4 } } } } }),
    ).toBe(false);
  });
});

describe("wallSurveyClearedLink", () => {
  const review = wallSurveyReviewFrom(scan(), ["source-1"], REVIEWED_AT);

  it("points an audit entry at the first cleared row", () => {
    const link = wallSurveyClearedLink(review);

    expect(link).toMatchObject({
      cleared: 2,
      anchorId: WALL_SURVEY_REVIEW_ANCHOR,
      rowId: `${WALL_SURVEY_REVIEW_ANCHOR}-row-display-1`,
      label: "See the 2 cleared rows",
    });
    // The jump has to say where it lands, because the entry is about a photo,
    // not about the Requirements section.
    expect(link?.title).toContain("survey photo review");
  });

  it("names one cleared row in the singular", () => {
    const one = wallSurveyReviewFrom(scan(), ["source-1", "display-2"], REVIEWED_AT);

    expect(wallSurveyClearedLink(one)?.label).toBe("See the 1 cleared row");
  });

  it("offers no jump when the review kept every row", () => {
    const accepted = wallSurveyReviewFrom(scan(), ["source-1", "display-1", "display-2"], REVIEWED_AT);

    expect(wallSurveyClearedLink(accepted)).toBeNull();
    expect(wallSurveyClearedLink(undefined)).toBeNull();
    expect(wallSurveyClearedLink(null)).toBeNull();
  });
});

describe("wallSurveyReviewFlagLinks", () => {
  it("sends each flagged run to the row it was read from, in the trail's words", () => {
    const review = wallSurveyReviewFrom(scan(), ["source-1"], REVIEWED_AT, scan(), [
      { id: "source-1", label: "Source 1", metres: 20, allowanceMetres: 5 },
      // A flag for a row the rep cleared describes a number the design does not
      // carry, so it is not a row the record can send anyone to.
      { id: "display-1", label: "Panel 1", metres: 30, allowanceMetres: 5 },
    ]);

    const links = wallSurveyReviewFlagLinks(review);

    expect(links).toHaveLength(1);
    expect(links[0].rowId).toBe(wallSurveyReviewRowAnchor("source-1"));
    // The link is the clause the audit note prints, so the numbers on the trail
    // and the numbers on the link cannot drift apart.
    expect(links[0].label).toBe("Source 1: 20 m against ≈5 m");
    expect(links[0].label).toBe(wallSurveyReviewFlagText(review.flags![0]));
    expect(links[0].title).toContain("Source 1's row");
    expect(links[0].title).toContain("≈5 m allowance");
  });

  it("has nothing to link for a review that flagged no run", () => {
    const accepted = wallSurveyReviewFrom(scan(), ["source-1", "display-1", "display-2"], REVIEWED_AT);

    expect(wallSurveyReviewFlagLinks(accepted)).toEqual([]);
  });
});

describe("projectSurveyReconfirmDue", () => {
  const project = (accepted: string[]) => ({
    videowall: { summary: { requirements: { surveyReview: wallSurveyReviewFrom(scan(), accepted, REVIEWED_AT) } } },
  });

  it("offers the action only on a clean review that has grown old", () => {
    const clean = project(["source-1", "display-1", "display-2"]);

    expect(projectSurveyReconfirmDue(clean, daysAfter(3))).toBeNull();
    expect(projectSurveyReconfirmDue(clean, daysAfter(SURVEY_REVIEW_STALE_DAYS))?.total).toBe(3);
    expect(projectSurveyReconfirmDue(clean, daysAfter(200))?.age?.stale).toBe(true);
  });

  it("is not offered for a cleared row or a wall nobody surveyed", () => {
    // A cleared row is work to do, not a room to check again.
    expect(projectSurveyReconfirmDue(project(["source-1"]), daysAfter(200))).toBeNull();
    expect(projectSurveyReconfirmDue(null, daysAfter(200))).toBeNull();
    expect(projectSurveyReconfirmDue({}, daysAfter(200))).toBeNull();
  });
});

describe("projectsNeedingSurveyAttention", () => {
  const saved = (accepted: string[]) => ({
    videowall: { summary: { requirements: { surveyReview: wallSurveyReviewFrom(scan(), accepted, REVIEWED_AT) } } },
  });

  it("returns the projects whose survey still asks for a rep", () => {
    const projects: Array<{ id: string; videowall?: unknown }> = [
      { id: "cleared", ...saved(["source-1"]) },
      { id: "clean", ...saved(["source-1", "display-1", "display-2"]) },
      { id: "unsurveyed" },
    ];

    expect(projectsNeedingSurveyAttention(projects, daysAfter(1)).map((project) => project.id)).toEqual(["cleared"]);
    expect(projectsNeedingSurveyAttention(projects, daysAfter(200)).map((project) => project.id)).toEqual(["cleared", "clean"]);
    expect(projectsNeedingSurveyAttention([], daysAfter(1))).toEqual([]);
  });
});
