import { expect, it, vi } from "vitest";
import type { StoredProject } from "../data/projectStore";
import { defaultWallRequirements } from "./videowallOptions";
const { update } = vi.hoisted(() => ({ update: vi.fn() }));
vi.mock("../data/projectStore", () => ({ updateStoredProject: update }));
import { updateSavedWallRequirements } from "./savedWallUpdates";
it("recomputes evidence from new answers while preserving the recorded wall and previous snapshot", () => {
  const previous = { id: "owner", videowall: { projectId: "owner", templateId: "room", wallType: "lcd", savedAt: "before", summary: { requirements: defaultWallRequirements, transport: { headline: "stale" }, recommendation: { title: "Kept" } } } } as unknown as StoredProject;
  const snapshot = JSON.stringify(previous);
  update.mockImplementation((_id, transform) => transform(previous));
  const result = updateSavedWallRequirements("owner", { ...defaultWallRequirements, columns: 3, measuredRuns: { "display-1": 90 } }) as unknown as StoredProject;
  expect(result).toMatchObject({ videowall: { projectId: "owner", templateId: "room", summary: { requirements: { columns: 3 }, recommendation: { title: "Kept" } } } });
  expect(result.videowall?.summary.transport).not.toEqual({ headline: "stale" });
  expect(JSON.stringify(previous)).toBe(snapshot);
});

