import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  getRecentTextEntries,
  rememberRecentTextEntry,
} from "@/features/inputs/recentTextEntries";

function createStorage(): Storage {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

describe("recentTextEntries", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: createStorage(),
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "localStorage");
  });

  it("stores the latest five values with newest first", () => {
    [
      "Acme Ltd",
      "Globex",
      "Initech",
      "Umbrella",
      "Soylent",
      "Stark Industries",
    ].forEach((entry) => {
      rememberRecentTextEntry("customer", entry);
    });

    expect(getRecentTextEntries("customer")).toEqual([
      "Stark Industries",
      "Soylent",
      "Umbrella",
      "Initech",
      "Globex",
    ]);
  });

  it("deduplicates entries case-insensitively and trims whitespace", () => {
    rememberRecentTextEntry("customer", "  Acme Ltd  ");
    rememberRecentTextEntry("customer", "acme ltd");
    rememberRecentTextEntry("customer", "  Beta   Group ");

    expect(getRecentTextEntries("customer")).toEqual([
      "Beta Group",
      "acme ltd",
    ]);
  });
});
