// Cross-field consistency rules for Discovery answer sets.
//
// The discovery interview derives some questions' option sets from other
// questions' answers (see discoveryQuestions.getVisibleDiscoveryQuestions),
// so a default set or saved answer map can silently pair values the UI would
// never offer together. Each auditor below returns human-readable problems for
// one such pair; they are the single source of truth consumed by BOTH the
// default-table pin tests (SMART_DEFAULTS / quickStartConfigs) and the audit
// of real saved project data, so a rule change cannot drift between the two.
//
// Message wording is load-bearing: the pin tests and saved-data audit assert
// on the problem lists, and operators triage real projects from them.

import type { DiscoveryAnswers } from "./discoveryTypes";

/**
 * A flat map of questionId -> one or more option values. Wider than
 * `Partial<DiscoveryAnswers>` so the auditors also accept loosely-typed data
 * read back from saved projects/templates without casts at call sites.
 */
export type FlatAnswerSet = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function toList(value: string | string[] | undefined): string[] {
  return value === undefined ? [] : Array.isArray(value) ? value : [value];
}

// ---------------------------------------------------------------------------
// displays count <-> display-behaviour
// ---------------------------------------------------------------------------

/**
 * Mirrors the interview rules in getVisibleDiscoveryQuestions: a single
 * display only supports mirrored content; a video-wall output requires a
 * wall/processor feed; multi-display rooms may mirror or route independently.
 * A pair outside these is contradictory — the UI would seed it as a default
 * and then filter it out of the answer options.
 */
export const BEHAVIOUR_FOR_DISPLAYS: Record<string, ReadonlySet<string>> = {
  "one-display": new Set(["same-content-all-displays"]),
  "two-displays": new Set([
    "same-content-all-displays",
    "independent-routing-per-display",
    "multiview-on-one-output",
  ]),
  "three-eight-displays": new Set([
    "same-content-all-displays",
    "independent-routing-per-display",
    "multiview-on-one-output",
  ]),
  "nine-plus-displays": new Set([
    "same-content-all-displays",
    "independent-routing-per-display",
    "multiview-on-one-output",
  ]),
  "video-wall-output": new Set(["video-wall-or-processor-feed"]),
};

export function auditDisplaysBehaviourPair(
  set: FlatAnswerSet,
  source: string,
): string[] {
  const displays = set.displays;
  const behaviour = set["display-behaviour"];
  if (displays === undefined || behaviour === undefined) return [];

  const display = single(displays);
  if (display === undefined) return [];
  const allowed = BEHAVIOUR_FOR_DISPLAYS[display];
  if (!allowed) {
    return [`${source}: displays "${display}" has no defined behaviour rule`];
  }

  const problems: string[] = [];
  for (const entry of toList(behaviour)) {
    if (!allowed.has(entry)) {
      problems.push(
        `${source}: displays "${display}" contradicts display-behaviour "${entry}"`,
      );
    }
  }
  return problems;
}

// ---------------------------------------------------------------------------
// scale <-> displays count
// ---------------------------------------------------------------------------

/**
 * Scale describes the room/system footprint; displays describes the endpoint
 * count. A single-small-room (huddle or contained space) seeding nine-plus
 * displays or a wall processor feed would make the profile-confirm summary
 * disagree with the seeded display count, and a multi-room/building-wide scale
 * seeding exactly one display contradicts "shared source routing across
 * several spaces/zones" (the interview help text for those scale options).
 */
export const DISPLAYS_ALLOWED_BY_SCALE: Record<string, ReadonlySet<string>> = {
  "single-small-room": new Set(["one-display", "two-displays"]),
  "single-large-room": new Set([
    "one-display",
    "two-displays",
    "three-eight-displays",
    "nine-plus-displays",
    "video-wall-output",
  ]),
  "multi-room": new Set([
    "two-displays",
    "three-eight-displays",
    "nine-plus-displays",
    "video-wall-output",
  ]),
  "building-wide": new Set([
    "two-displays",
    "three-eight-displays",
    "nine-plus-displays",
    "video-wall-output",
  ]),
};

export function auditScaleDisplaysPair(
  set: FlatAnswerSet,
  source: string,
): string[] {
  const scale = set.scale;
  const displays = set.displays;
  if (scale === undefined || displays === undefined) return [];

  const scaleValue = single(scale);
  const displayValue = single(displays);
  if (scaleValue === undefined || displayValue === undefined) return [];

  const allowed = DISPLAYS_ALLOWED_BY_SCALE[scaleValue];
  if (!allowed) {
    return [`${source}: scale "${scaleValue}" has no defined display-count rule`];
  }
  if (!allowed.has(displayValue)) {
    return [
      `${source}: scale "${scaleValue}" contradicts displays "${displayValue}"`,
    ];
  }
  return [];
}

// ---------------------------------------------------------------------------
// sources count <-> source-connection
// ---------------------------------------------------------------------------

/**
 * source-connection describes WHERE the sources sit: fixed installed devices,
 * user-presented laptops/wireless, or a mix that includes routed network
 * video. "network-video-sources" is the interview option for "local fixed
 * equipment and/or user laptops combined with routed AV-over-IP/NDI streams"
 * — an architecture that presumes more than one source position — so it can
 * never pair with sources = one-source, and a one-source profile must not
 * claim network feeds as its only input.
 */
export function auditSourcesConnectionPair(
  set: FlatAnswerSet,
  source: string,
): string[] {
  const count = set.sources;
  const connection = set["source-connection"];
  if (count === undefined || connection === undefined) return [];

  const countValue = single(count);
  if (countValue === "one-source" && toList(connection).includes("network-video-sources")) {
    return [
      `${source}: sources "one-source" contradicts source-connection "network-video-sources"`,
    ];
  }
  return [];
}

// ---------------------------------------------------------------------------
// uc-purpose <-> uc-camera
// ---------------------------------------------------------------------------

/**
 * The uc-purpose options each carry an implicit camera requirement:
 * video-conferencing, recording-streaming and camera-distribution-only are
 * camera workflows (their help text all describe camera feeds), while
 * microphones-only explicitly does NOT need a room camera and no-uc excludes
 * the whole UC section. A set that seeds a camera workflow without a camera
 * type (or a no-camera workflow with one) is contradictory — the interview
 * would offer the workflow and then filter every camera option away (or vice
 * versa).
 */
export const UC_CAMERA_WORKFLOWS: ReadonlySet<string> = new Set([
  "video-conferencing",
  "recording-streaming",
  "camera-distribution-only",
]);

export function auditUcPurposeCameraPair(
  set: FlatAnswerSet,
  source: string,
): string[] {
  const purposes = toList(set["uc-purpose"]);
  const cameras = toList(set["uc-camera"]);

  const hasCameraWorkflow = purposes.some((value) =>
    UC_CAMERA_WORKFLOWS.has(value),
  );
  const problems: string[] = [];

  if (hasCameraWorkflow && cameras.length === 0) {
    problems.push(
      `${source}: uc-purpose includes a camera workflow but seeds no uc-camera`,
    );
  }
  if (purposes.includes("microphones-only") && cameras.length > 0) {
    problems.push(
      `${source}: uc-purpose "microphones-only" contradicts uc-camera seeding (that workflow needs no room camera)`,
    );
  }
  if (purposes.includes("no-uc") && cameras.length > 0) {
    problems.push(`${source}: uc-purpose "no-uc" contradicts uc-camera seeding`);
  }
  if (cameras.length > 0 && purposes.length === 0) {
    problems.push(`${source}: seeds uc-camera without any uc-purpose`);
  }
  return problems;
}

// ---------------------------------------------------------------------------
// Combined audit
// ---------------------------------------------------------------------------

/**
 * Runs every cross-field rule pair against one answer set. Used by the
 * default-table pin tests and the saved-project audit alike; returns a flat
 * list of human-readable problems (empty when the set is consistent).
 */
export function auditCrossFieldDefaults(
  set: FlatAnswerSet,
  source: string,
): string[] {
  return [
    ...auditDisplaysBehaviourPair(set, source),
    ...auditScaleDisplaysPair(set, source),
    ...auditSourcesConnectionPair(set, source),
    ...auditUcPurposeCameraPair(set, source),
  ];
}

/** Question ids the cross-field auditors read from an answer set. */
export const CROSS_FIELD_QUESTION_IDS = [
  "displays",
  "display-behaviour",
  "scale",
  "sources",
  "source-connection",
  "uc-purpose",
  "uc-camera",
] as const;

export type CrossFieldAnswerMap = Partial<DiscoveryAnswers>;
