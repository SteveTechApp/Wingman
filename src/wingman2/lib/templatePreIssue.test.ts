import { describe, expect, it } from "vitest";
import {
  templatePreIssueAssumptions,
  templatePreIssueInitialStage,
  templatePreIssueResumeStage,
  templatePreIssueStages,
  templatePreIssueSummary,
  type TemplatePreIssueInput,
} from "./templatePreIssue";

function input(overrides: Partial<TemplatePreIssueInput> = {}): TemplatePreIssueInput {
  return { blockers: 0, warnings: 0, unpricedLines: 0, validationItems: 0, ...overrides };
}

describe("templatePreIssueStages", () => {
  it("counts what each stage still holds", () => {
    const stages = templatePreIssueStages(input({ blockers: 2, warnings: 1, unpricedLines: 3, validationItems: 2 }));

    expect(stages.map((stage) => stage.label)).toEqual(["Blockers", "Unpriced lines", "Assumptions", "Issue"]);
    expect(stages.map((stage) => stage.status)).toEqual([
      "2 to clear",
      // A line that prints TBC changes the document's total, so it is counted.
      "3 print TBC",
      // The document labels its warnings and the template's own points alike.
      "3 labelled",
      "Blocked",
    ]);
    expect(stages.filter((stage) => stage.open).map((stage) => stage.key)).toEqual([
      "blockers",
      "pricing",
      "assumptions",
    ]);
  });

  it("reads a clean review as an empty walk", () => {
    const stages = templatePreIssueStages(input());

    expect(stages.map((stage) => stage.status)).toEqual([
      "None",
      "Every line priced",
      "None",
      "Ready to issue",
    ]);
    expect(stages.some((stage) => stage.open)).toBe(false);
  });

  it("counts the assumptions the document will label", () => {
    expect(templatePreIssueAssumptions(input({ warnings: 2, validationItems: 3 }))).toBe(5);
  });
});

describe("templatePreIssueInitialStage", () => {
  it("opens where the rep is needed", () => {
    expect(templatePreIssueInitialStage(input({ blockers: 1, unpricedLines: 4, validationItems: 2 }))).toBe("blockers");
    // Money outranks caveats: an unpriced line changes what the document totals.
    expect(templatePreIssueInitialStage(input({ unpricedLines: 4, validationItems: 2 }))).toBe("pricing");
    expect(templatePreIssueInitialStage(input({ validationItems: 2 }))).toBe("assumptions");
    expect(templatePreIssueInitialStage(input())).toBe("issue");
  });
});

describe("templatePreIssueResumeStage", () => {
  it("reopens the stage the rep left, even once that stage has cleared", () => {
    // The rep chose the reading; a stage that is now empty says so in its line,
    // so the walk does not drag them back to the top of one they finished.
    expect(templatePreIssueResumeStage(input({ unpricedLines: 2 }), "assumptions")).toBe("assumptions");
    expect(templatePreIssueResumeStage(input(), "pricing")).toBe("pricing");
  });

  it("opens where the work is when nothing usable is remembered", () => {
    expect(templatePreIssueResumeStage(input({ unpricedLines: 2 }), null)).toBe("pricing");
    // A value from an older build that names no stage is ignored, not applied.
    expect(templatePreIssueResumeStage(input({ unpricedLines: 2 }), "cover page")).toBe("pricing");
    expect(templatePreIssueResumeStage(input(), "")).toBe("issue");
  });
});

describe("templatePreIssueSummary", () => {
  it("phrases a blocker as a stop and everything else as what prints", () => {
    // Only a blocker holds the button; an unpriced line holds the total.
    expect(templatePreIssueSummary(input({ blockers: 2, unpricedLines: 3 }))).toBe(
      "2 blockers must clear before this can issue.",
    );
    expect(templatePreIssueSummary(input({ unpricedLines: 1, warnings: 2 }))).toBe(
      "Issues with 1 line prints as TBC and 2 assumptions labelled.",
    );
    expect(templatePreIssueSummary(input({ unpricedLines: 2, validationItems: 1 }))).toBe(
      "Issues with 2 lines print as TBC and 1 assumption labelled.",
    );
  });

  it("says the checks are clear when nothing is left", () => {
    expect(templatePreIssueSummary(input())).toBe("Every check is clear — ready to issue.");
  });
});
