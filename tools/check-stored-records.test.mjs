import { describe, expect, it } from "vitest";
import { reachedThrough } from "./check-stored-records.mjs";

/**
 * What a failure says about *where* an unread field lives, without a checkout:
 * the formatter takes the stores the walk collected and returns the fragment the
 * bullet prints.
 *
 * The stores are long strings by design — a storage key and the write that put
 * the record there — so these fixtures keep that shape rather than short names:
 * a reader's problem with a shared record is that eight of these will not fit on
 * a line, and a spec written with `a`, `b`, `c` would not notice.
 */
const store = (key, line) => `${key} (src/wingman2/lib/${key}.ts:${line})`;

const EIGHT = [
  store("wingman-project-store-v1", 64),
  store("wingman-project-drafts-v1", 88),
  store("wingman-site-survey-edits", 64),
  store("wingman-wall-surveys-v1", 120),
  store("wingman-discovery-briefs-v1", 33),
  store("wingman-template-document-drafts-v1", 71),
  store("wingman-proposal-revisions-v1", 19),
  store("wingman-approvals-v1", 57),
];

describe("how a failure names the stores a field was reached through", () => {
  it("says nothing when there are no stores", () => {
    expect(reachedThrough([])).toBe("");
    expect(reachedThrough(undefined)).toBe("");
  });

  it("names the one store whole, on the bullet's line or its own", () => {
    expect(reachedThrough([EIGHT[0]])).toBe(` — reached through ${EIGHT[0]}`);
    expect(reachedThrough([EIGHT[0]], { ownLine: true })).toBe(`\n    reached through ${EIGHT[0]}`);
  });

  it("names every store of a shared record, not the first one and a count", () => {
    // The reading is over the string a person gets: seven of eight stores named
    // is the failure this replaces, and it passed every check that counted
    // stores as long as the count itself was right.
    const printed = reachedThrough(EIGHT);
    for (const one of EIGHT) expect(printed).toContain(one);
    expect(printed).not.toContain("more");
  });

  it("puts each store on a line of its own, under the count that says how many", () => {
    expect(reachedThrough(EIGHT)).toBe(
      `\n    reached through 8 stores:${EIGHT.map((one) => `\n      ${one}`).join("")}`,
    );
  });

  it("keeps the count and the list in agreement for a small set", () => {
    const two = reachedThrough(EIGHT.slice(0, 2));
    expect(two).toContain("reached through 2 stores:");
    expect(two.split("\n").filter((line) => line.trim().startsWith("wingman-"))).toHaveLength(2);
  });

  it("hands the stores to a field with a path as its own line", () => {
    // The path block already puts the hops on their own indented lines; the
    // store list follows it rather than trailing the hops' line.
    expect(reachedThrough([EIGHT[2]], { ownLine: true }).startsWith("\n    reached through")).toBe(true);
    expect(reachedThrough(EIGHT, { ownLine: true }).startsWith("\n    reached through 8 stores:")).toBe(true);
  });
});
