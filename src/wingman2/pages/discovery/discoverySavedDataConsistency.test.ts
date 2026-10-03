// Audits REAL saved discovery data (file-mode app store) with the same
// cross-field rule pairs that pin the default tables. The default-table pins
// only prove SMART_DEFAULTS / quickStartConfigs are internally consistent —
// they cannot catch contradictions a rep's saved project carries, e.g. a
// project seeded from an older quick-start profile whose scale says
// single-small-room while its displays say nine-plus-displays.
//
// The store (`data/runtime/wingman-app-db.json`) is a gitignored local
// artifact, so this suite self-skips on clean checkouts and worktrees; on a
// machine with real saved data it walks every project payload, finds any
// nested object carrying discovery question ids, and fails on the first
// contradictory pair. A dedicated synthetic fixture below proves the walker
// and auditors catch contradictions end to end, so the suite cannot go green
// vacuously when real data appears.

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CROSS_FIELD_QUESTION_IDS,
  auditCrossFieldDefaults,
  type FlatAnswerSet,
} from "./discoveryCrossFieldRules";

const STORE_PATH = join(process.cwd(), "data", "runtime", "wingman-app-db.json");
const storeExists = existsSync(STORE_PATH);

const ID_KEYS: ReadonlySet<string> = new Set(CROSS_FIELD_QUESTION_IDS);

type WalkerResult = { audited: number; problems: string[] };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function walkForAnswerMaps(
  value: unknown,
  path: string,
  out: WalkerResult,
): void {
  if (Array.isArray(value)) {
    for (const entry of value) walkForAnswerMaps(entry, path, out);
    return;
  }
  if (!isPlainObject(value)) return;

  const keys = Object.keys(value);
  if (keys.some((key) => ID_KEYS.has(key))) {
    out.audited += 1;
    out.problems.push(...auditCrossFieldDefaults(value as unknown as FlatAnswerSet, path));
    return; // nested maps inside an audited set belong to it, not siblings
  }
  for (const key of keys) {
    const child = value[key];
    if (child !== null && typeof child === "object") {
      walkForAnswerMaps(child, `${path}.${key}`, out);
    }
  }
}

function auditSavedStore(): WalkerResult {
  const db = JSON.parse(readFileSync(STORE_PATH, "utf8")) as Record<string, unknown>;
  const out: WalkerResult = { audited: 0, problems: [] };
  const byWorkspace = db.projectsByWorkspace;
  if (!isPlainObject(byWorkspace)) return out;
  for (const [workspaceId, space] of Object.entries(byWorkspace)) {
    if (!isPlainObject(space) || !Array.isArray(space.projects)) continue;
    for (const project of space.projects) {
      const id = isPlainObject(project)
        ? String(project.id ?? "unknown")
        : "unknown";
      walkForAnswerMaps(
        project,
        `${workspaceId}/${id}`,
        out,
      );
    }
  }
  return out;
}

describe("saved discovery data never carries cross-field contradictions", () => {
  it.skipIf(!storeExists)("real saved projects in the app store are internally consistent", () => {
    const { audited, problems } = auditSavedStore();
    // No answer-bearing payloads yet is the current true state on this
    // checkout (index fixtures only); the audit still runs and reports.
    expect(audited).toBeGreaterThanOrEqual(0);
    expect(problems).toEqual([]);
  });

  it("walker finds and rejects a contradictory answer map wherever it nests", () => {
    // Synthetic project payload proving the walker + auditors discriminate:
    // scale single-small-room with displays video-wall-output is the exact
    // contradiction class the default-table pins cannot see in saved data.
    const fixture = {
      id: "proj-synthetic-audit",
      payload: {
        brief: {
          roomModel: {
            scale: "single-small-room",
            displays: "video-wall-output",
            "display-behaviour": "video-wall-or-processor-feed",
          },
        },
      },
    };
    const out: WalkerResult = { audited: 0, problems: [] };
    walkForAnswerMaps(fixture, "ws-synthetic/proj-synthetic-audit", out);
    expect(out.audited).toBe(1);
    expect(out.problems.length).toBeGreaterThan(0);
    expect(out.problems[0]).toMatch(/contradicts displays "video-wall-output"/);
  });

  it("walker leaves a consistent nested answer map untouched", () => {
    const fixture = {
      id: "proj-synthetic-clean",
      payload: {
        brief: {
          roomModel: {
            scale: "single-large-room",
            displays: "two-displays",
            "display-behaviour": "independent-routing-per-display",
            sources: "one-source",
            "source-connection": "local-fixed-devices",
          },
        },
      },
    };
    const out: WalkerResult = { audited: 0, problems: [] };
    walkForAnswerMaps(fixture, "ws-synthetic/proj-synthetic-clean", out);
    expect(out.audited).toBe(1);
    expect(out.problems).toEqual([]);
  });

  it("walker flags a saved one-display set that routes independently", () => {
    // The pre-gate capture class this audit exists to find: a single display
    // can only mirror content, so a saved set pairing one-display with
    // independent routing or a wall/processor feed is contradictory and the
    // interview would filter the behaviour away on re-entry.
    const bad = {
      id: "proj-synthetic-one-display-routed",
      payload: {
        brief: {
          roomModel: {
            displays: "one-display",
            "display-behaviour": "independent-routing-per-display",
          },
        },
      },
    };
    const out: WalkerResult = { audited: 0, problems: [] };
    walkForAnswerMaps(bad, "ws-synthetic/proj-synthetic-one-display-routed", out);
    expect(out.audited).toBe(1);
    expect(out.problems).toEqual([
      'ws-synthetic/proj-synthetic-one-display-routed.payload.brief.roomModel: displays "one-display" contradicts display-behaviour "independent-routing-per-display"',
    ]);

    const wall = {
      id: "proj-synthetic-one-display-wall",
      payload: {
        brief: {
          roomModel: {
            displays: "one-display",
            "display-behaviour": "video-wall-or-processor-feed",
          },
        },
      },
    };
    const wallOut: WalkerResult = { audited: 0, problems: [] };
    walkForAnswerMaps(wall, "ws-synthetic/proj-synthetic-one-display-wall", wallOut);
    expect(wallOut.audited).toBe(1);
    expect(wallOut.problems).toEqual([
      'ws-synthetic/proj-synthetic-one-display-wall.payload.brief.roomModel: displays "one-display" contradicts display-behaviour "video-wall-or-processor-feed"',
    ]);

    const clean = {
      id: "proj-synthetic-one-display-mirror",
      payload: {
        brief: {
          roomModel: {
            displays: "one-display",
            "display-behaviour": "same-content-all-displays",
          },
        },
      },
    };
    const cleanOut: WalkerResult = { audited: 0, problems: [] };
    walkForAnswerMaps(clean, "ws-synthetic/proj-synthetic-one-display-mirror", cleanOut);
    expect(cleanOut.audited).toBe(1);
    expect(cleanOut.problems).toEqual([]);
  });
});
