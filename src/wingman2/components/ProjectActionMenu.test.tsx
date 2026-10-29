import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ProjectActionMenu } from "./ProjectActionMenu";

describe("Project action menu", () => {
  it("opens editing and copying without invoking deletion", () => {
    const onEdit = vi.fn(); const onCopy = vi.fn(); const onDelete = vi.fn();
    render(<ProjectActionMenu name="Boardroom" onEdit={onEdit} onCopy={onCopy} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole("button", { name: "Project actions for Boardroom" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit project" }));
    expect(onEdit).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Project actions for Boardroom" }));
    fireEvent.click(screen.getByRole("button", { name: "Copy project" }));
    expect(onCopy).toHaveBeenCalledOnce(); expect(onDelete).not.toHaveBeenCalled();
  });
  it("requires confirmation and clears it when dismissed", () => {
    const onDelete = vi.fn();
    render(<ProjectActionMenu name="Training room" onEdit={vi.fn()} onCopy={vi.fn()} onDelete={onDelete} />);
    const trigger = screen.getByRole("button", { name: "Project actions for Training room" });
    fireEvent.click(trigger); fireEvent.click(screen.getByRole("button", { name: "Delete project" }));
    expect(onDelete).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole("button", { name: "Confirm delete" }), { key: "Escape" });
    fireEvent.click(trigger); expect(screen.queryByRole("button", { name: "Confirm delete" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Delete project" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it("offers the room's own template beside the actions on the room", () => {
    const templates = [
      { id: "custom-acme", name: "Acme standard room", sourceProjectId: "project-1" },
      { id: "custom-other", name: "Other room template", sourceProjectId: "project-2" },
    ];
    render(
      <MemoryRouter>
        <ProjectActionMenu name="Boardroom" projectId="project-1" templates={templates} onEdit={vi.fn()} onCopy={vi.fn()} onDelete={vi.fn()} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Project actions for Boardroom" }));

    // The menu entry is the chip's destination, not a second way of naming it.
    const link = screen.getByRole("link", { name: "Open template: Acme standard room" });
    expect(link.getAttribute("href")).toBe("/wingman/templates/custom-acme");
    // Another room's template is not this card's way in.
    expect(screen.queryByRole("link", { name: "Open template: Other room template" })).toBeNull();
  });

  it("offers no template entry for a room nobody has saved", () => {
    render(
      <MemoryRouter>
        <ProjectActionMenu name="Training room" projectId="project-1" templates={[]} onEdit={vi.fn()} onCopy={vi.fn()} onDelete={vi.fn()} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Project actions for Training room" }));

    expect(screen.queryByRole("link", { name: /Open template/ })).toBeNull();
  });
});
