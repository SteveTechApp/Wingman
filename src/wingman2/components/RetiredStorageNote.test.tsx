import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  clearCarriedRetiredStorageReclaim,
  recordStorageReclaim,
  sweepRetiredStorage,
  takeRetiredStorageReclaim,
} from "../lib/retiredStorage";
import { RetiredStorageNote } from "./RetiredStorageNote";

const RETIRED = "wingman:video-wall-last-summary";

/**
 * One load's worth of the handoff: a sweep takes the copy back, and the load
 * after it is the one holding the report — which is the state a rep meets, a load
 * after the space came back rather than during it.
 */
function afterASweptLoad() {
  window.localStorage.setItem(RETIRED, "x".repeat(40_000));
  const sweep = sweepRetiredStorage();
  takeRetiredStorageReclaim();
  return sweep.reclaimedBytes;
}

beforeEach(() => {
  window.localStorage.clear();
  clearCarriedRetiredStorageReclaim();
});

describe("the storage-reclaim note", () => {
  it("prints the size a previous load took back, once", () => {
    const bytes = afterASweptLoad();
    render(<RetiredStorageNote />);

    const note = screen.getByTestId("storage-reclaim-note");
    expect(note.textContent).toContain("took back");
    expect(note.textContent).toContain(`${Math.round(bytes / 1024)} KB`);
    // A rep reading it should not have to wonder whether a copy of their work
    // went with it.
    expect(note.textContent).toContain("Nothing was lost");
  });

  it("tells the whole of what boot gave back in one strip", () => {
    // Both boot sweeps write the one report main.tsx takes, so a rep who wonders
    // where storage went learns both sources from one sentence.
    recordStorageReclaim(4096);
    recordStorageReclaim(2048, 2048);
    takeRetiredStorageReclaim();

    render(<RetiredStorageNote />);

    const note = screen.getByTestId("storage-reclaim-note");
    expect(note.textContent).toContain("took back 6 KB");
    expect(note.textContent).toContain("4 KB in copies an older build left behind");
    expect(note.textContent).toContain("2 KB from the CRM send history");
    // One strip, not one per sweep: a second strip would be a second thing to
    // dismiss for one load's work.
    expect(screen.getAllByTestId("storage-reclaim-note")).toHaveLength(1);
  });

  it("does not promise a copy nobody reads when the send history gave the space back", () => {
    recordStorageReclaim(2048, 2048);
    takeRetiredStorageReclaim();

    render(<RetiredStorageNote />);

    const note = screen.getByTestId("storage-reclaim-note");
    expect(note.textContent).toContain("CRM send history");
    // Those rows are the rep's own record, so the retired copy's promise would be
    // false here; the panel is where any that went are named.
    expect(note.textContent).not.toContain("Nothing was lost");
  });

  it("stays out of the way on a load that has nothing to report", () => {
    render(<RetiredStorageNote />);
    expect(screen.queryByTestId("storage-reclaim-note")).toBeNull();
  });

  it("does not come back after the rep dismisses it", () => {
    afterASweptLoad();
    render(<RetiredStorageNote />);
    fireEvent.click(screen.getByTestId("storage-reclaim-dismiss"));
    expect(screen.queryByTestId("storage-reclaim-note")).toBeNull();

    // Dismissing is the last copy: the surface cleared the value it printed, so a
    // remount in this load prints nothing even though storage has no report left.
    render(<RetiredStorageNote />);
    expect(screen.queryByTestId("storage-reclaim-note")).toBeNull();
  });
});
