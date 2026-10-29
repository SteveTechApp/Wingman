import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TemplateLineageNote } from "./TemplateLineageNote";
import { roomTemplates } from "../lib/roomTemplates";

const source = roomTemplates[0];
const project = { id: "northbridge-meeting-room-refresh", name: "Northbridge Meeting Room Refresh" };

function renderNote(overrides: { sourceProjectId?: string; sourceTemplateId?: string } = {}) {
  return render(
    <MemoryRouter>
      <TemplateLineageNote template={{ ...source, id: "custom-copy", ...overrides }} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(cleanup);

describe("the template page's lineage line", () => {
  it("names and links the project and the design a template came from", () => {
    renderNote({ sourceProjectId: project.id, sourceTemplateId: source.id });

    const saved = screen.getByRole("link", { name: project.name });
    expect(saved).toHaveAttribute("href", `/wingman/projects/${project.id}`);
    expect(screen.getByText(/Saved from/)).toBeInTheDocument();

    const copied = screen.getByRole("link", { name: source.name });
    expect(copied).toHaveAttribute("href", `/wingman/templates/${source.id}`);
    expect(screen.getByText(/Copied from/)).toBeInTheDocument();
  });

  it("says nothing when the records it names are gone", () => {
    const { container } = renderNote({ sourceProjectId: "project-gone", sourceTemplateId: "template-gone" });

    // A name that leads nowhere is worse than no line at all.
    expect(container.querySelector("[data-template-lineage]")).toBeNull();
  });

  it("keeps the half that still exists", () => {
    renderNote({ sourceProjectId: "project-gone", sourceTemplateId: source.id });

    expect(screen.queryByText(/Saved from/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: source.name })).toBeInTheDocument();
  });
});
