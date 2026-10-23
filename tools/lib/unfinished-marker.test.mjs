import { describe, expect, it } from "vitest";
import { hasUnfinishedMarker } from "./unfinished-marker.mjs";

describe("hasUnfinishedMarker", () => {
  it("does not read ordinary live code as unfinished work", () => {
    for (const line of [
      '/** Keep a room under construction, even before its signal connections exist. */',
      '"todo o edifício",',
      '"todo o andar",',
      '"todo el edificio",',
      '"todo igual",',
      'data-state={atResult || index < step ? "done" : index === step ? "current" : "todo"}',
    ]) expect(hasUnfinishedMarker(line), line).toBe(false);
  });

  it("keeps explicit work markers and placeholder copy visible", () => {
    for (const line of [
      "// TODO: implement validation",
      "const value = 1; // fixme: handle empty input",
      "/* wip: validation */",
      " * TODO(owner): finish this",
      'throw new Error("Not implemented");',
      '<p>{"Coming soon"}</p>',
      'title: "Under construction"',
      "// Under construction: route handler",
    ]) expect(hasUnfinishedMarker(line), line).toBe(true);
  });
});
