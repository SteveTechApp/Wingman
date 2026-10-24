import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { StoredProposalDraft } from "../data/projectStore";
import { ProposalDraftPanel } from "./ProposalDraftPanel";

function draft(overrides: Partial<StoredProposalDraft>): StoredProposalDraft {
  return {
    id: "draft-1",
    name: "Harbour Retail Signage",
    customer: "Harbour Retail",
    state: "Awaiting pricing",
    createdAt: "2026-10-01T09:00:00.000Z",
    updatedAt: "2026-10-01T09:00:00.000Z",
    ...overrides,
  };
}

function renderPanel(drafts: StoredProposalDraft[], onCopy = vi.fn(), onDelete = vi.fn()) {
  render(
    <MemoryRouter initialEntries={["/wingman/projects"]}>
      <ProposalDraftPanel drafts={drafts} onCopy={onCopy} onDelete={onDelete} />
    </MemoryRouter>,
  );
  return { onCopy, onDelete };
}

describe("proposal draft panel", () => {
  it("names each draft and the document it opens", () => {
    renderPanel([draft({}), draft({ id: "draft-2", name: "Westbrook Classroom", customer: "Westbrook" })]);

    expect(screen.getByText("Harbour Retail Signage")).toBeTruthy();
    expect(screen.getByText("Westbrook Classroom")).toBeTruthy();
    expect(screen.getByText("Harbour Retail")).toBeTruthy();
    const openLinks = screen.getAllByRole("link", { name: "Open" });
    expect(openLinks).toHaveLength(2);
    expect(openLinks[0].getAttribute("href")).toBe("/wingman/responses");
  });

  it("arms one tile's delete on a first click, and blur alone disarms it", () => {
    const { onDelete } = renderPanel([
      draft({}),
      draft({ id: "draft-2", name: "Westbrook Classroom" }),
    ]);

    // The confirmation belongs to the tile that was clicked, so arming one does
    // not arm its neighbour.
    fireEvent.click(screen.getByRole("button", { name: "Delete Harbour Retail Signage" }));
    const armed = screen.getByRole("button", { name: "Confirm delete Harbour Retail Signage" });
    expect(screen.getByRole("button", { name: "Delete Westbrook Classroom" })).toBeTruthy();

    // Looking away is not a delete: the tile goes back to its first-click state
    // and the draft is still there.
    fireEvent.blur(armed);
    expect(screen.getByRole("button", { name: "Delete Harbour Retail Signage" })).toBeTruthy();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("deletes on the second click and only for the armed tile", () => {
    const { onDelete } = renderPanel([
      draft({}),
      draft({ id: "draft-2", name: "Westbrook Classroom" }),
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Delete Harbour Retail Signage" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete Harbour Retail Signage" }));

    expect(onDelete).toHaveBeenCalledWith("draft-1");
    expect(screen.getByRole("button", { name: "Delete Westbrook Classroom" })).toBeTruthy();
  });

  it("hands the copy action the draft it was pressed for", () => {
    const { onCopy } = renderPanel([draft({}), draft({ id: "draft-2", name: "Westbrook Classroom" })]);

    fireEvent.click(screen.getByRole("button", { name: "Copy Westbrook Classroom" }));
    expect(onCopy).toHaveBeenCalledWith("draft-2");
  });

  it("says so when there is nothing to continue", () => {
    renderPanel([]);

    expect(screen.getByText(/No proposal drafts are currently listed/)).toBeTruthy();
    expect(screen.queryByText("Harbour Retail Signage")).toBeNull();
  });
});
