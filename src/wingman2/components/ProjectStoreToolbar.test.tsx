import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { StoredProjectSyncStatus } from "../data/projectStore";
import { ProjectStoreToolbar, projectSyncStatusVariant } from "./ProjectStoreToolbar";

function status(state: StoredProjectSyncStatus["state"], message: string): StoredProjectSyncStatus {
  return { state, message, updatedAt: "2026-10-23T09:00:00.000Z" };
}

type ToolbarOverrides = Partial<{
  projectCount: number;
  draftCount: number;
  syncStatus: StoredProjectSyncStatus;
  syncConflicts: Array<{ name: string; fields: string[] }>;
}>;

function renderToolbar(overrides: ToolbarOverrides = {}) {
  const onReset = vi.fn();
  render(
    <ProjectStoreToolbar
      syncStatus={overrides.syncStatus ?? status("local", "Saved in this browser.")}
      syncConflicts={overrides.syncConflicts ?? []}
      projectCount={overrides.projectCount ?? 0}
      draftCount={overrides.draftCount ?? 0}
      onReset={onReset}
    />,
  );
  return { onReset };
}

const chip = () => document.querySelector(".wm-status-chip");

describe("project store toolbar", () => {
  it("reports a browser-only save in the rep's words, in a neutral tone", () => {
    renderToolbar({ syncStatus: status("local", "Saved in this browser.") });

    // The stored message ends in a full stop; the chip stands in a row with the
    // other labels, so the visible text drops it while the title keeps it whole.
    expect(chip()?.textContent).toContain("Saved in this browser");
    expect(chip()?.textContent).not.toContain("Saved in this browser.");
    expect(chip()?.getAttribute("title")).toBe("Saved in this browser.");
    expect(chip()?.className).toContain("wm-status-neutral");
  });

  it("quotes the workspace's own message once sync has something to say", () => {
    renderToolbar({ syncStatus: status("synced", "Synced to Wingman Local") });
    expect(chip()?.textContent).toContain("Synced to Wingman Local");
    expect(chip()?.className).toContain("wm-status-success");

    // A conflict is the rep's to resolve, so it wears the danger tone rather
    // than the ambient one an error-free local save uses.
    render(
      <ProjectStoreToolbar
        syncStatus={status("conflict", "Team changed this project")}
        syncConflicts={[]}
        projectCount={0}
        draftCount={0}
        onReset={vi.fn()}
      />,
    );
    const chips = document.querySelectorAll(".wm-status-chip");
    expect(chips[chips.length - 1].className).toContain("wm-status-danger");
    expect(chips[chips.length - 1].textContent).toContain("Team changed this project");
    // Even with no lane labels to fold, the sentence is longer than the chip's
    // shared one-line rule allows, so the whole conflict chip wraps.
    expect(chips[chips.length - 1].className).toContain("wm-projects-sync-conflict");
  });

  it("reads a team member's change the way the gallery card's badge reads it", () => {
    renderToolbar({
      syncStatus: status("synced", "Project changes are synced to the workspace backend."),
      syncConflicts: [{ name: "Northbridge Meeting Room Refresh", fields: ["proposal", "requirements", "videowall"] }],
    });

    // The same words the card one line below prints, folded the same way: the
    // lanes are the payload, and a fourth lane would sit in the title.
    expect(chip()?.textContent).toContain("Team changed: Proposal, Requirements +1 more");
    expect(chip()?.className).toContain("wm-status-danger");
    expect(chip()?.className).toContain("wm-projects-sync-conflict");
    expect(chip()?.getAttribute("title")).toBe(
      'A team member changed Proposal, Requirements, Videowall in "Northbridge Meeting Room Refresh" since your last sync.',
    );
  });

  it("says how widely the change landed when several rooms are in conflict", () => {
    renderToolbar({
      syncConflicts: [
        { name: "Alpha Room", fields: ["proposal"] },
        { name: "Beta Room", fields: ["proposal", "name"] },
      ],
    });

    // One room's lanes would read as the whole store, so the count says how
    // many rooms the change is spread over — each card names its own lanes.
    expect(chip()?.textContent).toContain("Team changed in 2 rooms: Proposal, Project name");
    expect(chip()?.getAttribute("title")).toContain("See the Changed badges for details.");
  });

  it("tones every sync state from one rule", () => {
    expect(projectSyncStatusVariant("synced")).toBe("success");
    expect(projectSyncStatusVariant("error")).toBe("danger");
    expect(projectSyncStatusVariant("conflict")).toBe("danger");
    expect(projectSyncStatusVariant("local")).toBe("neutral");
    expect(projectSyncStatusVariant("syncing")).toBe("neutral");
  });

  it("arms the reset on a first click and disarms it on blur without resetting", () => {
    const { onReset } = renderToolbar();

    fireEvent.click(screen.getByRole("button", { name: "Reset sample store" }));
    const armed = screen.getByRole("button", { name: "Confirm reset?" });

    fireEvent.blur(armed);
    expect(screen.getByRole("button", { name: "Reset sample store" })).toBeTruthy();
    expect(onReset).not.toHaveBeenCalled();
  });

  it("resets on the second click", () => {
    const { onReset } = renderToolbar();

    fireEvent.click(screen.getByRole("button", { name: "Reset sample store" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm reset?" }));

    expect(onReset).toHaveBeenCalledTimes(1);
    // The button goes back to its first-click face, so a repeated press starts
    // the confirmation over rather than resetting again.
    expect(screen.getByRole("button", { name: "Reset sample store" })).toBeTruthy();
  });

  it("says what a reset leaves alone, counting only real work", () => {
    renderToolbar({ projectCount: 3, draftCount: 2 });
    expect(screen.getByRole("button", { name: "Reset sample store" }).getAttribute("title")).toBe(
      "Restores the built-in starter examples. Your 3 project(s) and 2 draft(s) are never affected.",
    );

    // With nothing of their own, there is nothing to promise about.
    render(
      <ProjectStoreToolbar syncStatus={status("local", "Saved in this browser.")} syncConflicts={[]} projectCount={0} draftCount={0} onReset={vi.fn()} />,
    );
    const buttons = screen.getAllByRole("button", { name: "Reset sample store" });
    expect(buttons[buttons.length - 1].getAttribute("title")).toBe("Restores the built-in starter examples.");
  });
});
