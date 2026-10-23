import { beforeEach, describe, expect, it } from "vitest";
import { templatePreIssueStages } from "./templatePreIssue";
import {
  readTemplatePreIssueStage,
  rememberTemplatePreIssueStage,
  templatePreIssueStageFromSearch,
  templatePreIssueStageSearch,
  templatePreIssueStageStorageKey,
} from "./templatePreIssuePass";

const stages = templatePreIssueStages({ blockers: 1, warnings: 0, unpricedLines: 2, validationItems: 0 });

describe("templatePreIssueStageFromSearch", () => {
  it("reads the stage the address names", () => {
    expect(templatePreIssueStageFromSearch("?stage=assumptions", stages)).toBe("assumptions");
    expect(templatePreIssueStageFromSearch(new URLSearchParams({ stage: "blockers" }), stages)).toBe("blockers");
  });

  it("ignores a value that names no stage of the walk", () => {
    // A hand-edited or older link is ignored rather than half-applied.
    expect(templatePreIssueStageFromSearch("?stage=cover", stages)).toBeNull();
    expect(templatePreIssueStageFromSearch("", stages)).toBeNull();
  });
});

describe("templatePreIssueStageSearch", () => {
  it("puts the stage on the address and keeps the other parameters", () => {
    const next = templatePreIssueStageSearch("?tab=proposal", "assumptions");

    expect(next.get("stage")).toBe("assumptions");
    expect(next.get("tab")).toBe("proposal");
  });
});

describe("template stage memory", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("keeps one stage per template", () => {
    rememberTemplatePreIssueStage("boardroom", "blockers");
    rememberTemplatePreIssueStage("huddle", "issue");

    expect(readTemplatePreIssueStage("boardroom")).toBe("blockers");
    expect(readTemplatePreIssueStage("huddle")).toBe("issue");
    expect(readTemplatePreIssueStage("never-visited")).toBeNull();
  });

  it("stores the stage under the template's own key", () => {
    rememberTemplatePreIssueStage("boardroom", "pricing");

    expect(window.localStorage.getItem(templatePreIssueStageStorageKey("boardroom"))).toBe("pricing");
  });
});
