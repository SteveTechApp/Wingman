import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  RETIRED_STORAGE_KEYS,
  RETIRED_STORAGE_RECLAIM_KEY,
  carriedRetiredStorageReclaim,
  clearCarriedRetiredStorageReclaim,
  formatStorageBytes,
  reclaimedStorageNote,
  recordStorageReclaim,
  sweepRetiredStorage,
  takeRetiredStorageReclaim,
} from "./retiredStorage";

/**
 * The sweep is the only thing that still knows an old build's key exists, so
 * these readings are about what it does to a browser rather than about the shape
 * of the list: what it takes, what it leaves, what it says it took, and what the
 * load after it is handed.
 */
const RETIRED = "wingman:video-wall-last-summary";

/** Keys this build still reads, which a sweep must never touch. */
const LIVE_KEYS: Array<[string, string]> = [
  ["wingman-project-store-v1", JSON.stringify({ projects: [], proposalDrafts: [] })],
  ["wingman-installation-rate-card-v1", JSON.stringify({ rates: { outlet: "35" } })],
];

/** The bytes a stored entry is accounted for: the key and its value as UTF-16. */
const entryBytes = (key: string, value: string) => (key.length + value.length) * 2;

beforeEach(() => {
  window.localStorage.clear();
  clearCarriedRetiredStorageReclaim();
});

describe("sweepRetiredStorage", () => {
  it("takes back the wall summary copy an older build wrote, and says which key went", () => {
    const value = JSON.stringify({ savedAt: "2026-07-02T09:00:00.000Z", wallType: "lcd" });
    window.localStorage.setItem(RETIRED, value);
    expect(sweepRetiredStorage()).toEqual({ removed: [RETIRED], reclaimedBytes: entryBytes(RETIRED, value) });
    expect(window.localStorage.getItem(RETIRED)).toBeNull();
  });

  it("leaves the stores this build still reads exactly as they were", () => {
    for (const [key, value] of LIVE_KEYS) window.localStorage.setItem(key, value);
    window.localStorage.setItem(RETIRED, "{}");
    expect(sweepRetiredStorage().removed).toEqual([RETIRED]);
    for (const [key, value] of LIVE_KEYS) expect(window.localStorage.getItem(key)).toBe(value);
  });

  it("touches nothing on a browser that never held the key", () => {
    for (const [key, value] of LIVE_KEYS) window.localStorage.setItem(key, value);
    const remove = vi.spyOn(Storage.prototype, "removeItem");
    const write = vi.spyOn(Storage.prototype, "setItem");
    expect(sweepRetiredStorage()).toEqual({ removed: [], reclaimedBytes: 0 });
    expect(remove).not.toHaveBeenCalled();
    // A clean browser gets no report either: there is no space to report.
    expect(write).not.toHaveBeenCalled();
    remove.mockRestore();
    write.mockRestore();
  });

  it("is a no-op the second time, so a reload does not report the same key again", () => {
    window.localStorage.setItem(RETIRED, "{}");
    expect(sweepRetiredStorage().removed).toEqual([RETIRED]);
    expect(sweepRetiredStorage().removed).toEqual([]);
  });

  it("stays silent when the browser refuses the store", () => {
    // Reading and removing are guarded one key at a time: a browser that denies
    // the store (private mode, a blocked origin) must not take boot with it, and
    // must not be reported as a key that was reclaimed.
    const get = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError: the operation is insecure.");
    });
    expect(sweepRetiredStorage()).toEqual({ removed: [], reclaimedBytes: 0 });
    get.mockRestore();
  });

  it("names the key older builds wrote, because this build cannot", () => {
    // The list is the only record: no shipped source writes this key any more, so
    // a sweep that dropped it would leave the copies in place with nothing left to
    // find them.
    expect(RETIRED_STORAGE_KEYS).toContain(RETIRED);
  });
});

describe("the report a sweep leaves for the next load", () => {
  it("stores the size it reclaimed rather than only returning it", () => {
    const value = "x".repeat(4096);
    window.localStorage.setItem(RETIRED, value);
    const sweep = sweepRetiredStorage();
    // The size and nothing else: which keys went is what the sweep exists to
    // forget, and a field the note does not print is a field this store does not
    // carry.
    expect(JSON.parse(window.localStorage.getItem(RETIRED_STORAGE_RECLAIM_KEY) ?? "null"))
      .toEqual({ bytes: entryBytes(RETIRED, value) });
    expect(sweep.reclaimedBytes).toBe(entryBytes(RETIRED, value));
  });

  it("hands that report to the next load's take, which clears it", () => {
    window.localStorage.setItem(RETIRED, "{}");
    const sweep = sweepRetiredStorage();
    // The next load: the take runs before that load's own sweep, so it reads the
    // previous load's number and leaves nothing behind for a third load.
    expect(takeRetiredStorageReclaim()).toEqual({ bytes: sweep.reclaimedBytes, webhookBytes: 0 });
    expect(window.localStorage.getItem(RETIRED_STORAGE_RECLAIM_KEY)).toBeNull();
    expect(takeRetiredStorageReclaim()).toBeNull();
    expect(sweepRetiredStorage()).toEqual({ removed: [], reclaimedBytes: 0 });
  });

  it("does not let a load report the space it is still taking back", () => {
    // The ordering main.tsx keeps: take, then sweep. At that point the pending
    // report is this load's, so a note reading after the sweep would print a
    // reclamation the rep has not had yet.
    window.localStorage.setItem(RETIRED, "{}");
    expect(takeRetiredStorageReclaim()).toBeNull();
    const sweep = sweepRetiredStorage();
    expect(sweep.reclaimedBytes).toBeGreaterThan(0);
    expect(carriedRetiredStorageReclaim()).toBeNull();
    // ...and it is still waiting, whole, for the load after this one.
    expect(takeRetiredStorageReclaim()).toEqual({ bytes: sweep.reclaimedBytes, webhookBytes: 0 });
  });

  it("adds up when more than one copy is waiting to be reported", () => {
    window.localStorage.setItem(RETIRED, "a");
    const first = sweepRetiredStorage();
    window.localStorage.setItem(RETIRED, "b");
    const second = sweepRetiredStorage();
    expect(takeRetiredStorageReclaim()?.bytes).toBe(first.reclaimedBytes + second.reclaimedBytes);
  });

  it("holds the taken report for the surface that prints it, until it is read", () => {
    window.localStorage.setItem(RETIRED, "{}");
    const sweep = sweepRetiredStorage();
    expect(takeRetiredStorageReclaim()).toEqual({ bytes: sweep.reclaimedBytes, webhookBytes: 0 });
    expect(carriedRetiredStorageReclaim()).toEqual({ bytes: sweep.reclaimedBytes, webhookBytes: 0 });
    clearCarriedRetiredStorageReclaim();
    expect(carriedRetiredStorageReclaim()).toBeNull();
  });

  it("ignores a report that is not a size, rather than printing one", () => {
    for (const junk of ["{\"bytes\":0}", "{\"bytes\":\"lots\"}", "not json", "null"]) {
      window.localStorage.setItem(RETIRED_STORAGE_RECLAIM_KEY, junk);
      expect(takeRetiredStorageReclaim(), junk).toBeNull();
    }
  });
});

/**
 * Both boot sweeps write this report, so these readings are about the sum a rep
 * reads rather than about either sweep: one number for the strip, and the split
 * the sentence needs to say where it came from.
 */
describe("the report the two boot sweeps share", () => {
  it("adds the CRM sweep's reclaim to the retired copy's instead of replacing it", () => {
    window.localStorage.setItem(RETIRED, "a");
    const retired = sweepRetiredStorage();

    // What main.tsx runs next: the CRM cleanup, whose size arrives through the
    // same write. One strip has to name both, so the second call adds.
    recordStorageReclaim(2048, 2048);

    expect(takeRetiredStorageReclaim()).toEqual({
      bytes: retired.reclaimedBytes + 2048,
      webhookBytes: 2048,
    });
  });

  it("stores no history part when the retired copy is the only source", () => {
    window.localStorage.setItem(RETIRED, "{}");
    sweepRetiredStorage();

    // A field the note never prints is not written, so a browser whose only
    // reclaimable storage is an old copy keeps the shape it always had.
    expect(JSON.parse(window.localStorage.getItem(RETIRED_STORAGE_RECLAIM_KEY) ?? "null"))
      .toEqual({ bytes: entryBytes(RETIRED, "{}") });
  });

  it("reads a report written before the history contributed as the copy it was", () => {
    window.localStorage.setItem(RETIRED_STORAGE_RECLAIM_KEY, JSON.stringify({ bytes: 4096 }));
    expect(takeRetiredStorageReclaim()).toEqual({ bytes: 4096, webhookBytes: 0 });
  });

  it("never lets the history's part outgrow the total it is part of", () => {
    // A hand-edited or half-written report; the note's arithmetic would otherwise
    // print a send history that gave back more than boot did.
    window.localStorage.setItem(
      RETIRED_STORAGE_RECLAIM_KEY,
      JSON.stringify({ bytes: 100, webhookBytes: 900 }),
    );
    expect(takeRetiredStorageReclaim()).toEqual({ bytes: 100, webhookBytes: 100 });
  });

  it("writes nothing for a sweep that gave nothing back", () => {
    const write = vi.spyOn(Storage.prototype, "setItem");
    recordStorageReclaim(0);
    expect(write).not.toHaveBeenCalled();
    write.mockRestore();
  });
});

describe("what a rep is told", () => {
  it("reads sizes in the units a browser's storage screen uses", () => {
    expect(formatStorageBytes(0)).toBe("0 B");
    expect(formatStorageBytes(812)).toBe("812 B");
    expect(formatStorageBytes(1024)).toBe("1 KB");
    expect(formatStorageBytes(39_936)).toBe("39 KB");
    expect(formatStorageBytes(1024 * 1024)).toBe("1.0 MB");
    expect(formatStorageBytes(1_468_006)).toBe("1.4 MB");
  });

  it("says what came back and that nothing was lost", () => {
    const note = reclaimedStorageNote(39_936);
    expect(note).toContain("took back 39 KB of browser storage");
    expect(note).toContain("Nothing was lost");
    // The key is a code name, and the sweep exists to forget it: the sentence is
    // about the space, not about `wingman:video-wall-last-summary`.
    expect(note).not.toContain("wingman:");
  });

  it("says where the space came from when the send history gave it back", () => {
    const note = reclaimedStorageNote(20_480, 20_480);
    expect(note).toContain("took back 20 KB of browser storage");
    expect(note).toContain("CRM send history");
    expect(note).toContain("The CRM panel names any sends that went");
    // The retired copy's promise cannot stand in for this one: those rows were the
    // rep's own record, and the panel is where any that went are named.
    expect(note).not.toContain("this build never reads it");
  });

  it("names each part apart when boot gave back more than one kind of space", () => {
    const note = reclaimedStorageNote(4096 + 2048, 2048);
    expect(note).toContain("took back 6 KB of browser storage");
    expect(note).toContain("4 KB in copies an older build left behind");
    expect(note).toContain("2 KB from the CRM send history");
    expect(note).not.toContain("this build never reads it");
  });
});
