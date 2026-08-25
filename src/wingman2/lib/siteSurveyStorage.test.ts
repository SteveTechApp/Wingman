import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getProjectEdits,
  saveProjectEdits,
  setCableLength,
  setCableConfirmed,
  setDeviceVerified,
  setLocationNotes,
  getSurveyProgress,
  clearProjectEdits,
  buildCableComparisons,
  buildComparisonSummary,
  type SurveyProjectEdits,
} from "./siteSurveyStorage";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
})();

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

describe("siteSurveyStorage", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe("getProjectEdits", () => {
    it("returns empty edits for a new project", () => {
      const edits = getProjectEdits("project-1");
      expect(edits.projectId).toBe("project-1");
      expect(edits.cableEdits).toEqual({});
      expect(edits.deviceEdits).toEqual({});
      expect(edits.locationEdits).toEqual({});
    });

    it("returns saved edits for an existing project", () => {
      const initial: SurveyProjectEdits = {
        projectId: "project-1",
        cableEdits: {
          "cable-1": { cableId: "cable-1", actualLengthMetres: 15, confirmed: true },
        },
        deviceEdits: {},
        locationEdits: {},
        lastModified: "2026-01-01T00:00:00Z",
        synced: false,
      };
      saveProjectEdits(initial);

      const loaded = getProjectEdits("project-1");
      expect(loaded.cableEdits["cable-1"].actualLengthMetres).toBe(15);
      expect(loaded.cableEdits["cable-1"].confirmed).toBe(true);
    });
  });

  describe("cable edits", () => {
    it("setCableLength sets actual length and marks confirmed", () => {
      setCableLength("proj-1", "cable-1", 25);
      const edits = getProjectEdits("proj-1");
      expect(edits.cableEdits["cable-1"].actualLengthMetres).toBe(25);
      expect(edits.cableEdits["cable-1"].confirmed).toBe(true);
    });

    it("setCableLength with undefined clears length", () => {
      setCableLength("proj-1", "cable-1", 25);
      setCableLength("proj-1", "cable-1", undefined);
      const edits = getProjectEdits("proj-1");
      expect(edits.cableEdits["cable-1"].actualLengthMetres).toBeUndefined();
      expect(edits.cableEdits["cable-1"].confirmed).toBe(false);
    });

    it("setCableConfirmed toggles confirmation", () => {
      setCableConfirmed("proj-1", "cable-1", true);
      let edits = getProjectEdits("proj-1");
      expect(edits.cableEdits["cable-1"].confirmed).toBe(true);

      setCableConfirmed("proj-1", "cable-1", false);
      edits = getProjectEdits("proj-1");
      expect(edits.cableEdits["cable-1"].confirmed).toBe(false);
    });
  });

  describe("device edits", () => {
    it("setDeviceVerified toggles verification", () => {
      setDeviceVerified("proj-1", "dev-1", true);
      let edits = getProjectEdits("proj-1");
      expect(edits.deviceEdits["dev-1"].verified).toBe(true);

      setDeviceVerified("proj-1", "dev-1", false);
      edits = getProjectEdits("proj-1");
      expect(edits.deviceEdits["dev-1"].verified).toBe(false);
    });
  });

  describe("location edits", () => {
    it("setLocationNotes saves notes", () => {
      setLocationNotes("proj-1", "loc-1", "Access via side door");
      const edits = getProjectEdits("proj-1");
      expect(edits.locationEdits["loc-1"].notes).toBe("Access via side door");
    });
  });

  describe("getSurveyProgress", () => {
    it("calculates completion percentage", () => {
      setCableConfirmed("proj-1", "cable-1", true);
      setCableConfirmed("proj-1", "cable-2", false);
      setDeviceVerified("proj-1", "dev-1", true);

      const progress = getSurveyProgress("proj-1");
      expect(progress.totalCables).toBe(2);
      expect(progress.confirmedCables).toBe(1);
      expect(progress.totalDevices).toBe(1);
      expect(progress.verifiedDevices).toBe(1);
      // 2 completed (1 cable + 1 device) out of 3 total items (2 cables + 1 device)
      expect(progress.completionPercent).toBe(67);
    });

    it("returns 0% for empty project", () => {
      const progress = getSurveyProgress("empty-project");
      expect(progress.completionPercent).toBe(0);
    });
  });

  describe("clearProjectEdits", () => {
    it("removes all edits for a project", () => {
      setCableLength("proj-1", "cable-1", 15);
      setDeviceVerified("proj-1", "dev-1", true);

      clearProjectEdits("proj-1");

      const edits = getProjectEdits("proj-1");
      expect(edits.cableEdits).toEqual({});
      expect(edits.deviceEdits).toEqual({});
    });
  });

  describe("buildCableComparisons", () => {
    it("classifies matching cables within 10%", () => {
      setCableLength("proj-comp", "cable-1", 10.5);

      const comparisons = buildCableComparisons("proj-comp", [
        { id: "cable-1", lengthMetres: 10 },
      ]);

      expect(comparisons[0].status).toBe("match");
      expect(comparisons[0].varianceMetres).toBe(0.5);
      expect(comparisons[0].variancePercent).toBe(5);
    });

    it("classifies close cables within 20%", () => {
      setCableLength("proj-comp", "cable-2", 18);

      const comparisons = buildCableComparisons("proj-comp", [
        { id: "cable-2", lengthMetres: 15 },
      ]);

      expect(comparisons[0].status).toBe("close");
      expect(comparisons[0].varianceMetres).toBe(3);
    });

    it("classifies divergent cables beyond 20%", () => {
      setCableLength("proj-comp", "cable-3", 25);

      const comparisons = buildCableComparisons("proj-comp", [
        { id: "cable-3", lengthMetres: 15 },
      ]);

      expect(comparisons[0].status).toBe("divergent");
      expect(comparisons[0].varianceMetres).toBe(10);
      expect(comparisons[0].variancePercent).toBe(67);
    });

    it("marks unmeasured cables", () => {
      const comparisons = buildCableComparisons("proj-comp", [
        { id: "cable-4", lengthMetres: 20 },
      ]);

      expect(comparisons[0].status).toBe("unmeasured");
      expect(comparisons[0].actualMetres).toBeUndefined();
    });

    it("handles cables with no planned length", () => {
      setCableLength("proj-comp", "cable-5", 10);

      const comparisons = buildCableComparisons("proj-comp", [
        { id: "cable-5" },
      ]);

      expect(comparisons[0].status).toBe("divergent");
      expect(comparisons[0].plannedMetres).toBeUndefined();
    });
  });

  describe("buildComparisonSummary", () => {
    it("aggregates comparison statistics", () => {
      setCableLength("proj-sum", "c1", 10);
      setCableLength("proj-sum", "c2", 17);
      setCableConfirmed("proj-sum", "c1", true);

      const comparisons = buildCableComparisons("proj-sum", [
        { id: "c1", lengthMetres: 10 },
        { id: "c2", lengthMetres: 15 },
        { id: "c3", lengthMetres: 5 },
      ]);

      const summary = buildComparisonSummary(comparisons);
      expect(summary.totalCables).toBe(3);
      expect(summary.measured).toBe(2);
      expect(summary.matchCount).toBe(1); // c1: 10m plan, 10m actual
      expect(summary.closeCount).toBe(1); // c2: 15m plan, 17m actual (13%)
      expect(summary.unmeasuredCount).toBe(1); // c3: no actual
      expect(summary.totalPlannedMetres).toBe(30);
      expect(summary.totalActualMetres).toBe(27);
    });
  });
});
