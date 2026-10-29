import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ProjectTemplateChip, ProjectTemplateLineage } from "./ProjectTemplateLineage";
import { deleteCustomRoomTemplate, getCustomRoomTemplates, saveCustomRoomTemplate } from "../lib/customRoomTemplates";
import { roomTemplates } from "../lib/roomTemplates";

const project = "northbridge-meeting-room";
const source = roomTemplates[0];

function saveTemplate(id: string, name: string, sourceProjectId?: string) {
  return saveCustomRoomTemplate(
    { ...source, id, name },
    { id, ...(sourceProjectId ? { sourceProjectId } : {}) },
  );
}

function renderLineage(projectId = project) {
  return render(
    <MemoryRouter>
      <ProjectTemplateLineage projectId={projectId} />
    </MemoryRouter>,
  );
}

/** The gallery card's reading of the same fact: one chip, not a list. */
function renderChip(projectId = project) {
  return render(
    <MemoryRouter>
      <ProjectTemplateChip projectId={projectId} templates={getCustomRoomTemplates()} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(cleanup);

describe("the project record's saved-as-a-template note", () => {
  it("says the room is a template and opens it", () => {
    saveTemplate("custom-northbridge", "Northbridge template", project);
    renderLineage();

    expect(screen.getByText("Saved as a custom template.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open template: Northbridge template" })).toHaveAttribute(
      "href",
      "/wingman/templates/custom-northbridge",
    );
  });

  it("carries the action in its visible text, and keeps the arrow out of the name", () => {
    saveTemplate("custom-northbridge", "Northbridge template", project);
    const { container } = renderLineage();

    // The wording the action menu, the gallery card's row and Home use, printed
    // rather than hidden: one fact reads one way wherever a rep meets it.
    expect(screen.getByText("Open template: Northbridge template")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open template: Northbridge template" })).toBeInTheDocument();
    // The arrow is decoration, so it is not part of the name a screen reader reads.
    expect(container.querySelector(".wm-project-template-lineage__arrow")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("lists every template the room produced, because a room can be saved twice", () => {
    saveTemplate("custom-northbridge", "Northbridge template", project);
    saveTemplate("custom-northbridge-2", "Northbridge AV template", project);
    const { container } = renderLineage();

    expect(container.querySelector("[data-project-template-lineage]")).toHaveAttribute("data-project-template-lineage", "2");
    expect(screen.getByText("Saved as 2 custom templates.")).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });

  it("keeps another room's templates out of this record", () => {
    saveTemplate("custom-huddle", "Huddle template", "some-other-project");
    const { container } = renderLineage();

    expect(container.querySelector("[data-project-template-lineage]")).toBeNull();
  });

  it("prints nothing for a room nobody has saved", () => {
    const { container } = renderLineage("project-with-no-template");

    expect(container.querySelector("[data-project-template-lineage]")).toBeNull();
  });

  it("stops offering a template that has been deleted from the library", () => {
    saveTemplate("custom-northbridge", "Northbridge template", project);
    deleteCustomRoomTemplate("custom-northbridge");
    const { container } = renderLineage();

    // A link to a deleted template lands nowhere, so the line goes with it.
    expect(container.querySelector("[data-project-template-lineage]")).toBeNull();
  });
});

describe("the gallery card's saved-as-a-template flag", () => {
  it("names the room's template in one chip and opens it", () => {
    saveTemplate("custom-northbridge", "Northbridge template", project);
    const { container } = renderChip();

    // The chip is the whole answer, name included, so the card does not say the
    // same three words on every row that has a template.
    const chip = screen.getByRole("link", { name: "Saved as a template: Northbridge template" });
    expect(chip).toHaveAttribute("href", "/wingman/templates/custom-northbridge");
    expect(chip).toHaveAttribute("title", "Northbridge template");
    expect(container.querySelector("[data-project-template-flag]")).toHaveAttribute("data-project-template-flag", "1");
  });

  it("counts every design the room produced", () => {
    saveTemplate("custom-northbridge", "Northbridge template", project);
    saveTemplate("custom-northbridge-2", "Northbridge AV template", project);
    renderChip();

    // The names read in library order — the most recent save first — which is
    // the order the project record lists the same designs in.
    const chip = screen.getByRole("link", {
      name: "Saved as 2 templates: Northbridge AV template, Northbridge template",
    });
    expect(chip).toHaveTextContent("Saved as 2 templates");
    expect(chip).toHaveAttribute("title", "Northbridge AV template, Northbridge template");
  });

  it("says nothing for a room nobody has saved, or for another room's template", () => {
    saveTemplate("custom-huddle", "Huddle template", "some-other-project");
    const { container } = renderChip("project-with-no-template");

    expect(container.querySelector("[data-project-template-flag]")).toBeNull();
  });

  it("stops counting a template that has been deleted from the library", () => {
    saveTemplate("custom-northbridge", "Northbridge template", project);
    deleteCustomRoomTemplate("custom-northbridge");
    const { container } = renderChip();

    expect(container.querySelector("[data-project-template-flag]")).toBeNull();
  });
});
