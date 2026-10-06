import { fireEvent, render, screen } from "@testing-library/react";
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
});
