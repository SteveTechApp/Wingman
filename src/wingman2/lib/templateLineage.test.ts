import { describe, expect, it } from "vitest";
import {
  templateLineageRecord,
  templateMatchesSourceProject,
  templateSourceProjects,
  templatesSavedFromProject,
} from "./templateLineage";

function template(id: string, sourceProjectId?: string) {
  return { id, sourceProjectId };
}

describe("templates grouped by the project they came from", () => {
  it("lists each named project once, with the designs it produced", () => {
    const groups = templateSourceProjects(
      [template("a", "project-b"), template("b", "project-a"), template("c", "project-a"), template("d")],
      [
        { id: "project-a", name: "Boardroom refresh" },
        { id: "project-b", name: "Huddle rooms" },
        { id: "project-c", name: "Unused room" },
      ],
    );

    expect(groups.map((group) => [group.name, group.templateIds])).toEqual([
      ["Boardroom refresh", ["b", "c"]],
      ["Huddle rooms", ["a"]],
    ]);
  });

  it("reads a renamed project by the name the rep knows now", () => {
    const [group] = templateSourceProjects([template("a", "project-a")], [{ id: "project-a", name: "Boardroom refresh" }]);
    expect(group.name).toBe("Boardroom refresh");
  });

  it("drops a project the store no longer holds rather than offering a chip with no name", () => {
    expect(templateSourceProjects([template("a", "project-gone")], [])).toEqual([]);
  });

  it("names the design a template came from, in the words the page prints", () => {
    const lineage = templateLineageRecord(
      { id: "copy", sourceProjectId: "project-a", sourceTemplateId: "library-a" },
      [{ id: "project-a", name: "Boardroom refresh" }],
      [{ id: "library-a", name: "Meeting room standard" }],
    );

    expect(lineage).toEqual({
      project: { id: "project-a", name: "Boardroom refresh" },
      template: { id: "library-a", name: "Meeting room standard" },
    });
  });

  it("drops a source the store no longer holds, without hiding the other half", () => {
    expect(templateLineageRecord(
      { id: "copy", sourceProjectId: "project-gone", sourceTemplateId: "library-a" },
      [],
      [{ id: "library-a", name: "Meeting room standard" }],
    )).toEqual({ template: { id: "library-a", name: "Meeting room standard" } });

    expect(templateLineageRecord({ id: "copy", sourceProjectId: "project-gone" }, [], [])).toEqual({});
  });

  it("never reads a template as its own source", () => {
    expect(templateLineageRecord({ id: "library-a", sourceTemplateId: "library-a" }, [], [{ id: "library-a", name: "Meeting room standard" }]))
      .toEqual({});
  });

  it("names the templates a project produced, in library order", () => {
    const saved = templatesSavedFromProject("project-a", [
      { id: "custom-b", name: "Boardroom template", sourceProjectId: "project-a" },
      { id: "custom-other", name: "Someone else's room", sourceProjectId: "project-b" },
      { id: "custom-a", name: "Boardroom template 2", sourceProjectId: "project-a" },
      { id: "custom-none", name: "Not from a project" },
    ]);

    expect(saved).toEqual([
      { id: "custom-b", name: "Boardroom template" },
      { id: "custom-a", name: "Boardroom template 2" },
    ]);
  });

  it("says nothing for a room nobody has saved, or for a blank id", () => {
    expect(templatesSavedFromProject("project-gone", [{ id: "custom-b", name: "B", sourceProjectId: "project-a" }])).toEqual([]);
    expect(templatesSavedFromProject("", [{ id: "custom-b", name: "B", sourceProjectId: "" }])).toEqual([]);
  });

  it("matches every template while no source is chosen", () => {
    expect(templateMatchesSourceProject(template("a", "project-a"), null)).toBe(true);
    expect(templateMatchesSourceProject(template("a", "project-a"), "project-a")).toBe(true);
    expect(templateMatchesSourceProject(template("a", "project-b"), "project-a")).toBe(false);
    // A design saved without a project is not one project's design.
    expect(templateMatchesSourceProject(template("library"), "project-a")).toBe(false);
  });
});
