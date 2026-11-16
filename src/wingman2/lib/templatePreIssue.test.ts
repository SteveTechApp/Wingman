import { describe, expect, it } from "vitest";
import { templatePreIssueAssumptions, templatePreIssueInitialStage, templatePreIssueResumeStage, templatePreIssueStages, templatePreIssueSummary, type TemplatePreIssueInput } from "./templatePreIssue";

function input(overrides: Partial<TemplatePreIssueInput> = {}): TemplatePreIssueInput {
  return { blockers: 0, warnings: 0, validationItems: 0, ...overrides };
}

describe("template proposal review", () => {
  it("shows only technical blockers, assumptions and issue stages", () => {
    const stages = templatePreIssueStages(input({ blockers: 2, warnings: 1, validationItems: 2 }));
    expect(stages.map((stage) => stage.label)).toEqual(["Blockers", "Assumptions", "Issue"]);
    expect(stages.map((stage) => stage.status)).toEqual(["2 to clear", "3 labelled", "Blocked"]);
    expect(stages.filter((stage) => stage.open).map((stage) => stage.key)).toEqual(["blockers", "assumptions"]);
  });

  it("counts labelled assumptions and opens at the next technical decision", () => {
    expect(templatePreIssueAssumptions(input({ warnings: 2, validationItems: 3 }))).toBe(5);
    expect(templatePreIssueInitialStage(input({ blockers: 1, validationItems: 2 }))).toBe("blockers");
    expect(templatePreIssueInitialStage(input({ validationItems: 2 }))).toBe("assumptions");
    expect(templatePreIssueInitialStage(input())).toBe("issue");
  });

  it("resumes only a stage that still exists", () => {
    expect(templatePreIssueResumeStage(input(), "assumptions")).toBe("assumptions");
    expect(templatePreIssueResumeStage(input(), "legacy-stage")).toBe("issue");
  });

  it("summarizes technical blockers and open assumptions", () => {
    expect(templatePreIssueSummary(input({ blockers: 2, warnings: 1 }))).toBe("2 blockers must clear before this can issue.");
    expect(templatePreIssueSummary(input({ warnings: 2, validationItems: 1 }))).toBe("Issues with 3 assumptions labelled.");
    expect(templatePreIssueSummary(input())).toBe("Every check is clear — ready to issue.");
  });
});
