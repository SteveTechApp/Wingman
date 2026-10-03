// Guards the discovery default tables against drift from the canonical
// question set. Both SMART_DEFAULTS (progressive disclosure, keyed by
// application type) and quickStartConfigs (quick start, keyed by room type)
// were once written against an older question set — dead keys and invalid
// option values silently rendered as raw tokens in the UI and broke
// downstream branching (contradiction detection, escalation triggers,
// brief text). This test fails CI the moment a default no longer matches
// a current question option.

import { describe, expect, it } from "vitest";
import { baseDiscoveryQuestions, canonicalDiscoveryQuestions, getVisibleDiscoveryQuestions } from "./discoveryQuestions";
import { getHiddenAnswerValues } from "./discoveryAnswerUtils";
import { BASIC_MODE_REQUIRED_IDS, ESCALATION_TRIGGERS, SMART_DEFAULTS } from "./discoveryProgressiveDisclosure";
import { getQuickStartDisagreements, quickStartConfigs } from "./discoveryQuickStart";
import {
  auditDisplaysBehaviourPair,
  auditScaleDisplaysPair,
  auditSourcesConnectionPair,
  auditUcPurposeCameraPair,
  type FlatAnswerSet,
} from "./discoveryCrossFieldRules";
import type { DiscoveryAnswers } from "./discoveryTypes";

const questionOptions = new Map(
  baseDiscoveryQuestions.map((question) => [question.id, new Set(question.options.map((option) => option.value))]),
);

const questionById = new Map(baseDiscoveryQuestions.map((question) => [question.id, question]));

function collectDefaultProblems(defaults: Partial<DiscoveryAnswers>, source: string): string[] {
  const problems: string[] = [];
  for (const [key, value] of Object.entries(defaults)) {
    const options = questionOptions.get(key);
    if (!options) {
      problems.push(`${source}: unknown question id "${key}"`);
      continue;
    }
    const values = Array.isArray(value) ? value : [value];
    for (const entry of values) {
      if (typeof entry !== "string") {
        problems.push(`${source}: "${key}" has non-string value ${JSON.stringify(entry)}`);
      } else if (!options.has(entry)) {
        problems.push(`${source}: "${key}" has unknown option value "${entry}"`);
      }
    }
  }
  return problems;
}

describe("discovery default tables stay aligned with the canonical questions", () => {
  it("every SMART_DEFAULTS key and value resolves to a current question option", () => {
    const problems: string[] = [];
    for (const [applicationType, defaults] of Object.entries(SMART_DEFAULTS)) {
      problems.push(...collectDefaultProblems(defaults, `SMART_DEFAULTS["${applicationType}"]`));
    }
    expect(problems).toEqual([]);
  });

  it("every quickStartConfigs default key and value resolves to a current question option", () => {
    const problems: string[] = [];
    for (const [roomType, config] of Object.entries(quickStartConfigs)) {
      problems.push(...collectDefaultProblems(config.defaults, `quickStartConfigs["${roomType}"].defaults`));
    }
    expect(problems).toEqual([]);
  });

  it("every quick-start suggestedApplication is a valid opportunity option", () => {
    const opportunityOptions = questionOptions.get("opportunity");
    if (!opportunityOptions) throw new Error("canonical question set is missing 'opportunity'");

    const invalid: string[] = [];
    for (const [roomType, config] of Object.entries(quickStartConfigs)) {
      if (!opportunityOptions.has(config.suggestedApplication)) {
        invalid.push(`quickStartConfigs["${roomType}"].suggestedApplication = "${config.suggestedApplication}"`);
      }
    }
    expect(invalid).toEqual([]);
  });

  it("every SMART_DEFAULTS application key is a valid opportunity option", () => {
    const opportunityOptions = questionOptions.get("opportunity");
    if (!opportunityOptions) throw new Error("canonical question set is missing 'opportunity'");

    const invalid = Object.keys(SMART_DEFAULTS).filter((key) => !opportunityOptions.has(key));
    expect(invalid).toEqual([]);
  });

  // Quick Start rooms are per-room profiles of an application: a lecture hall
  // is a richer classroom, a huddle room a leaner meeting room. Each room is
  // therefore joined to SMART_DEFAULTS via its suggestedApplication, and every
  // deliberate deviation is pinned here. The check is two-sided: a difference
  // that is NOT documented, or a documented difference whose values no longer
  // hold (either table drifted), both fail CI - so a refinement can never be
  // silently added, silently lost, or silently changed.
  const DOCUMENTED_ROOM_REFINEMENTS: Record<
    string,
    Record<string, { quickStart: string | string[]; smart: string | string[]; reason: string }>
  > = {
    "huddle-room": {
      scale: { quickStart: "single-small-room", smart: "single-large-room", reason: "2-4 person space, not a full meeting room" },
      sources: { quickStart: "one-source", smart: "two-four-sources", reason: "single laptop/tablet source is typical for 2-4 people" },
      "source-connection": { quickStart: "laptops-wireless-inputs", smart: "mixed-hdmi-usbc", reason: "huddle rooms are laptop/wireless-only, no permanent sources" },
      "signal-standard": { quickStart: "1080p-standard-hdmi", smart: "4k60-standard", reason: "small collaboration displays are standard HD" },
      audio: { quickStart: "display-audio", smart: "room-audio", reason: "no separate amplification beyond the display" },
      control: { quickStart: "simple-auto", smart: "touch-panel", reason: "auto-switching suffices; no room control panel" },
      "uc-camera": { quickStart: ["fixed-usb-camera"], smart: ["usb-ptz-camera"], reason: "2-4 person spaces use the compact fixed USB camera; the meeting-room standard defaults to a PTZ camera" },
    },
    // meeting-room-small deliberately matches the meeting-room standard's
    // scale (single-large-room): with 2-4 sources, dual routed displays and a
    // touch panel it is a full meeting room, not the huddle/contained-space
    // bucket single-small-room describes. Only displays/signal deviate.
    "meeting-room-small": {
      displays: { quickStart: "two-displays", smart: "one-display", reason: "profile is 1-2 displays" },
      "display-behaviour": { quickStart: "independent-routing-per-display", smart: "same-content-all-displays", reason: "dual outputs route independently in the small-room profile" },
      "signal-standard": { quickStart: "1080p-standard-hdmi", smart: "4k60-standard", reason: "standard HD screens for a small meeting room" },
    },
    "meeting-room-large": {
      displays: { quickStart: "two-displays", smart: "one-display", reason: "dual output is standard for 8-16 person rooms" },
      "display-behaviour": { quickStart: "independent-routing-per-display", smart: "same-content-all-displays", reason: "dual outputs route independently" },
      "signal-standard": { quickStart: "4k60-hdr-hdcp", smart: "4k60-standard", reason: "larger rooms follow the premium 4K signal gradient (large/boardroom family)" },
      usb: { quickStart: "usb-extension-required", smart: "byod-byom", reason: "sources sit beyond practical USB reach" },
    },
    boardroom: {
      sources: { quickStart: "five-eight-sources", smart: "two-four-sources", reason: "8-16 person rooms carry more sources" },
      displays: { quickStart: "three-eight-displays", smart: "one-display", reason: "multiple displays are standard" },
      "display-behaviour": { quickStart: "independent-routing-per-display", smart: "same-content-all-displays", reason: "individual outputs route independently" },
      "signal-standard": { quickStart: "4k60-hdr-hdcp", smart: "4k60-standard", reason: "premium signal path for an executive room" },
      "uc-purpose": { quickStart: ["video-conferencing", "recording-streaming"], smart: ["video-conferencing"], reason: "executive spaces also record/stream" },
      usb: { quickStart: "usb-extension-required", smart: "byod-byom", reason: "peripheral-to-host distance exceeds direct USB" },
    },
    "lecture-hall": {
      sources: { quickStart: "five-eight-sources", smart: "two-four-sources", reason: "lectern PC, visualisers and media players exceed a standard classroom count" },
      displays: { quickStart: "two-displays", smart: "one-display", reason: "main projection plus confidence display" },
      "display-behaviour": { quickStart: "independent-routing-per-display", smart: "same-content-all-displays", reason: "confidence monitor routes independently of the main projection" },
      "signal-standard": { quickStart: "4k60-hdr-hdcp", smart: "1080p-standard-hdmi", reason: "premium 4K capture path matches the large-room gradient (like meeting-room-large/boardroom)" },
      usb: { quickStart: "usb-extension-required", smart: "room-pc-uc", reason: "lectern-to-capture distances require USB extension" },
      control: { quickStart: "touch-panel", smart: "simple-auto", reason: "multi-input lecture hall needs staff room control" },
    },
    "training-room": {
      displays: { quickStart: "two-displays", smart: "one-display", reason: "flexible two-screen training setup" },
      usb: { quickStart: "byod-byom", smart: "room-pc-uc", reason: "training rooms are BYOD-first: visitor laptops own the room USB devices" },
    },
  };

  it("every quick-start room agrees with its SMART_DEFAULTS application profile except documented refinements", () => {
    const normalize = (value: string | string[]) => (Array.isArray(value) ? JSON.stringify([...value].sort()) : value);
    const problems: string[] = [];

    for (const [roomType, config] of Object.entries(quickStartConfigs)) {
      const smartDefaults = SMART_DEFAULTS[config.suggestedApplication];
      if (!smartDefaults) continue; // no application-level profile (e.g. "not-sure")
      const documented = DOCUMENTED_ROOM_REFINEMENTS[roomType] ?? {};

      for (const [questionId, smartValue] of Object.entries(smartDefaults)) {
        const quickStartValue = config.defaults[questionId as keyof DiscoveryAnswers];
        if (quickStartValue === undefined || quickStartValue === "") continue;

        const quickStartNormalized = normalize(quickStartValue as string | string[]);
        const smartNormalized = normalize(smartValue as string | string[]);

        if (quickStartNormalized === smartNormalized) {
          if (documented[questionId]) {
            problems.push(
              `${roomType}: "${questionId}" now matches SMART_DEFAULTS but is still documented as a refinement - stale documentation`,
            );
          }
          continue;
        }

        const entry = documented[questionId];
        if (!entry) {
          problems.push(
            `${roomType}: "${questionId}" differs (quickStart=${JSON.stringify(quickStartValue)} vs SMART_DEFAULTS=${JSON.stringify(smartValue)}) but is not documented as an intentional refinement`,
          );
          continue;
        }
        if (
          normalize(entry.quickStart) !== quickStartNormalized ||
          normalize(entry.smart) !== smartNormalized
        ) {
          problems.push(
            `${roomType}: "${questionId}" refinement is stale - documented ${JSON.stringify(entry.quickStart)} vs ${JSON.stringify(entry.smart)}, actual ${JSON.stringify(quickStartValue)} vs ${JSON.stringify(smartValue)}`,
          );
        }
      }
    }

    expect(problems).toEqual([]);
  });

  it("every ESCALATION_TRIGGERS questionId and value resolves to a current question option", () => {
    const problems: string[] = [];
    for (const trigger of ESCALATION_TRIGGERS) {
      const options = questionOptions.get(trigger.questionId);
      if (!options) {
        problems.push(`ESCALATION_TRIGGERS: unknown question id "${trigger.questionId}"`);
        continue;
      }
      for (const value of trigger.values) {
        if (!options.has(value)) {
          problems.push(
            `ESCALATION_TRIGGERS[${trigger.questionId}]: unknown option value "${value}"`,
          );
        }
      }
    }
    expect(problems).toEqual([]);
  });

  // The exact escalation surface, pinned like the room refinements above.
  // Validity checks catch a trigger pointing at a removed id/value; this
  // catches the opposite drift - a trigger that is removed, added, renamed,
  // reordered, or whose values change without a deliberate test update.
  const PINNED_ESCALATION_TRIGGERS: Array<{ questionId: string; values: string[] }> = [
    { questionId: "displays", values: ["nine-plus-displays", "video-wall-output"] },
    { questionId: "sources", values: ["nine-plus-sources"] },
    { questionId: "scale", values: ["building-wide"] },
    { questionId: "display-behaviour", values: ["multiview-on-one-output"] },
    { questionId: "uc-purpose", values: ["recording-streaming", "camera-distribution-only"] },
  ];

  it("ESCALATION_TRIGGERS matches the pinned surface exactly (no removals, additions, renames or value changes)", () => {
    const actual = ESCALATION_TRIGGERS.map((trigger) => ({ questionId: trigger.questionId, values: trigger.values }));
    expect(actual).toEqual(PINNED_ESCALATION_TRIGGERS);
  });

  it("every ESCALATION_TRIGGERS reason is non-empty", () => {
    const problems = ESCALATION_TRIGGERS.filter((trigger) => !trigger.reason.trim()).map(
      (trigger) => `trigger "${trigger.questionId}" has an empty reason`,
    );
    expect(problems).toEqual([]);
  });

  it("every ESCALATION_TRIGGERS question is one Basic mode asks", () => {
    // Escalation triggers exist to push Basic-mode users into Expert when an
    // answer signals complexity. The trigger surface must be exactly the set
    // of questions Basic mode asks (BASIC_MODE_REQUIRED_IDS): a trigger on
    // any other question is dead — Basic never shows it and no smart default
    // supplies a value for it.
    const expected = new Set<string>(BASIC_MODE_REQUIRED_IDS);
    const unexpected = ESCALATION_TRIGGERS
      .map((trigger) => trigger.questionId)
      .filter((questionId) => !expected.has(questionId));
    expect(unexpected).toEqual([]);
  });

  it("every canonical question option has a non-empty, globally unique label", () => {
    // Labels are what the UI renders, the conversation parser matches against,
    // and the summary/exports display. An empty label renders a blank button;
    // a label shared across questions makes feedback like "is it Unknown?"
    // ambiguous and lets a future label-reference drift silently. Both are
    // pinned here across the FULL canonical set (base + operational + avoip).
    const problems: string[] = [];
    const firstQuestionByLabel = new Map<string, string>();
    for (const question of canonicalDiscoveryQuestions) {
      for (const option of question.options) {
        if (!option.label.trim()) {
          problems.push(`question "${question.id}": option "${option.value}" has an empty label`);
          continue;
        }
        const first = firstQuestionByLabel.get(option.label);
        if (first === undefined) {
          firstQuestionByLabel.set(option.label, question.id);
        } else if (first !== question.id) {
          problems.push(`label "${option.label}" is shared by questions "${first}" and "${question.id}"`);
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it("no quick-start room seeds an answer the interview would hide at start", () => {
    // The interview hides options based on answers (e.g. independent routing
    // disappears when displays = one-display). A quick-start default that is
    // already invisible under the room's OWN seeded answers would be stranded
    // from the very first step - an internal contradiction, caught here.
    const problems: string[] = [];
    for (const [roomType, config] of Object.entries(quickStartConfigs)) {
      const seeded = { opportunity: config.suggestedApplication, ...config.defaults } as DiscoveryAnswers;
      const visible = getVisibleDiscoveryQuestions(config.suggestedApplication, seeded);
      for (const step of visible) {
        const hidden = getHiddenAnswerValues(
          step.id,
          step.options.map((option) => option.value),
          seeded[step.id as keyof DiscoveryAnswers],
        );
        for (const entry of hidden) {
          problems.push(`${roomType}: defaults seed ${step.id}="${entry.value}" but the interview hides that option at start`);
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it("a later answer can strand a quick-start default, and the helper reports exactly the hidden value", () => {
    // User picks Lecture hall (which seeds independent routing for two
    // displays), then answers displays = one-display. The interview hides
    // independent routing, but the stored default still references it - the
    // silent-conflict class the UI warning exists for.
    const lectureHallDefaults = quickStartConfigs["lecture-hall"].defaults;
    const changedAnswers = { opportunity: "classroom", displays: "one-display" } as DiscoveryAnswers;
    const displayBehaviourStep = getVisibleDiscoveryQuestions("classroom", changedAnswers).find(
      (step) => step.id === "display-behaviour",
    )!;
    const hidden = getHiddenAnswerValues(
      displayBehaviourStep.id,
      displayBehaviourStep.options.map((option) => option.value),
      lectureHallDefaults["display-behaviour"],
    );
    expect(hidden).toEqual([
      { value: "independent-routing-per-display", label: "Different content by display or zone" },
    ]);

    // Training room seeds mirrored content, which the interview keeps for a
    // one-display room - no strand, no warning.
    const trainingRoomDefaults = quickStartConfigs["training-room"].defaults;
    expect(
      getHiddenAnswerValues(
        displayBehaviourStep.id,
        displayBehaviourStep.options.map((option) => option.value),
        trainingRoomDefaults["display-behaviour"],
      ),
    ).toEqual([]);

    // Values that were never options of the question are raw input, not a
    // hidden-default conflict, and stay out of the report.
    expect(getHiddenAnswerValues("displays", ["one-display"], "not-a-real-option")).toEqual([]);
  });

  it("getQuickStartDisagreements reports exactly the documented refinements per room", () => {
    // The agreement test documents every intentional deviation; the runtime
    // disagreement surface (the profile-confirm step) must expose exactly the
    // same set - not more, not less - so the UI never surprises the
    // salesperson.
    const byRoom: Record<string, string[]> = {
      "huddle-room": ["scale", "sources", "source-connection", "signal-standard", "audio", "control", "uc-camera"],
      "meeting-room-small": ["displays", "display-behaviour", "signal-standard"],
      "meeting-room-large": ["displays", "display-behaviour", "signal-standard", "usb"],
      boardroom: ["sources", "displays", "display-behaviour", "signal-standard", "usb", "uc-purpose"],
      classroom: [],
      "lecture-hall": ["sources", "displays", "display-behaviour", "signal-standard", "control", "usb"],
      "training-room": ["displays", "usb"],
      custom: [],
    };
    for (const [roomType, expectedIds] of Object.entries(byRoom)) {
      const disagreements = getQuickStartDisagreements(roomType as keyof typeof quickStartConfigs);
      expect(disagreements.map((d) => d.questionId)).toEqual(expectedIds);
    }
  });

  it("getQuickStartDisagreements resolves human-readable labels for both sides", () => {
    const lectureHall = getQuickStartDisagreements("lecture-hall");
    const signal = lectureHall.find((d) => d.questionId === "signal-standard")!;
    expect(signal).toEqual({
      questionId: "signal-standard",
      questionLabel: "Picture quality",
      roomText: "Premium 4K with HDR (4K60 HDR / HDCP-sensitive)",
      standardText: "Standard HD (1080p / standard HDMI)",
    });
    const usb = lectureHall.find((d) => d.questionId === "usb")!;
    expect(usb.roomText).toBe("USB extension required");
    expect(usb.standardText).toBe("Room PC or UC appliance owns USB");
  });

  it("displays count and display-behaviour never contradict within a default set", () => {
    const problems: string[] = [];
    for (const [applicationType, defaults] of Object.entries(SMART_DEFAULTS)) {
      problems.push(...auditDisplaysBehaviourPair(defaults as FlatAnswerSet, `SMART_DEFAULTS["${applicationType}"]`));
    }
    for (const [roomType, config] of Object.entries(quickStartConfigs)) {
      problems.push(...auditDisplaysBehaviourPair(config.defaults as FlatAnswerSet, `quickStartConfigs["${roomType}"].defaults`));
    }
    expect(problems).toEqual([]);
  });

  it("scale and displays count never contradict within a default set", () => {
    const problems: string[] = [];
    for (const [applicationType, defaults] of Object.entries(SMART_DEFAULTS)) {
      problems.push(...auditScaleDisplaysPair(defaults as FlatAnswerSet, `SMART_DEFAULTS["${applicationType}"]`));
    }
    for (const [roomType, config] of Object.entries(quickStartConfigs)) {
      problems.push(...auditScaleDisplaysPair(config.defaults as FlatAnswerSet, `quickStartConfigs["${roomType}"].defaults`));
    }
    expect(problems).toEqual([]);
  });

  it("sources count and source-connection never contradict within a default set", () => {
    const problems: string[] = [];
    for (const [applicationType, defaults] of Object.entries(SMART_DEFAULTS)) {
      problems.push(...auditSourcesConnectionPair(defaults as FlatAnswerSet, `SMART_DEFAULTS["${applicationType}"]`));
    }
    for (const [roomType, config] of Object.entries(quickStartConfigs)) {
      problems.push(...auditSourcesConnectionPair(config.defaults as FlatAnswerSet, `quickStartConfigs["${roomType}"].defaults`));
    }
    expect(problems).toEqual([]);
  });

  it("uc-purpose camera workflows and uc-camera seeding never contradict within a default set", () => {
    const problems: string[] = [];
    for (const [applicationType, defaults] of Object.entries(SMART_DEFAULTS)) {
      problems.push(...auditUcPurposeCameraPair(defaults as FlatAnswerSet, `SMART_DEFAULTS["${applicationType}"]`));
    }
    for (const [roomType, config] of Object.entries(quickStartConfigs)) {
      problems.push(...auditUcPurposeCameraPair(config.defaults as FlatAnswerSet, `quickStartConfigs["${roomType}"].defaults`));
    }
    expect(problems).toEqual([]);
  });
});
