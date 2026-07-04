import { beforeEach, describe, expect, it } from "vitest";
import {
  clearRecentCompareSearches,
  readRecentCompareSearches,
  recordRecentCompareSearch,
} from "./compareRecentSearches";

describe("compare recent searches", () => {
  beforeEach(() => {
    clearRecentCompareSearches();
  });

  it("starts empty", () => {
    expect(readRecentCompareSearches()).toEqual([]);
  });

  it("records a search and puts it first", () => {
    recordRecentCompareSearch("Poly X52");
    recordRecentCompareSearch("Crestron DM-NVX-363");

    expect(readRecentCompareSearches()).toEqual(["Crestron DM-NVX-363", "Poly X52"]);
  });

  it("dedupes case-insensitively and moves the repeat to the front", () => {
    recordRecentCompareSearch("Poly X52");
    recordRecentCompareSearch("Crestron DM-NVX-363");
    recordRecentCompareSearch("poly x52");

    expect(readRecentCompareSearches()).toEqual(["poly x52", "Crestron DM-NVX-363"]);
  });

  it("ignores blank queries", () => {
    recordRecentCompareSearch("   ");
    expect(readRecentCompareSearches()).toEqual([]);
  });

  it("caps the list at 8 entries", () => {
    for (let index = 0; index < 10; index += 1) {
      recordRecentCompareSearch(`Search ${index}`);
    }

    const result = readRecentCompareSearches();
    expect(result).toHaveLength(8);
    expect(result[0]).toBe("Search 9");
  });

  it("clears the list", () => {
    recordRecentCompareSearch("Poly X52");
    clearRecentCompareSearches();

    expect(readRecentCompareSearches()).toEqual([]);
  });
});
