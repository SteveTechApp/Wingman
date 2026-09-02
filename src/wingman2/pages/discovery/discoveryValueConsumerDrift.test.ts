// Guards the remaining value-keyed consumer tables against stale-value drift,
// mirroring the escalation-trigger treatment. The big default tables
// (SMART_DEFAULTS, quickStartConfigs, ESCALATION_TRIGGERS, locale curated
// tables) are already pinned; this file covers the smaller value-keyed maps
// that branch on answer values outside the discovery question definitions —
// plainLanguageLabels carried three keys ("ceiling-microphone", "hdmi-only",
// "premium-4k60") that used pre-rename spellings of canonical values, so a
// label lookup for the real values silently fell back to the raw token.

import { describe, expect, it } from "vitest";
import { baseDiscoveryQuestions } from "./discoveryQuestions";
import { plainLanguageLabels } from "./discoveryQuickStart";

const canonicalOptionValues = new Set(
  baseDiscoveryQuestions.flatMap((question) => question.options.map((option) => option.value)),
);

describe("value-keyed consumer tables stay pinned to the canonical question set", () => {
  it("every plainLanguageLabels key resolves to a current canonical option value", () => {
    const stale = Object.keys(plainLanguageLabels).filter((key) => !canonicalOptionValues.has(key));
    expect(stale).toEqual([]);
  });

  it("plainLanguageLabels covers the application values the quick-start flow can offer", () => {
    // The panel labels the suggested application from this map; every
    // opportunity option that a room type can seed must have a plain-language
    // label here (otherwise the confirmation header shows the raw token).
    const opportunityOptions = baseDiscoveryQuestions.find((question) => question.id === "opportunity")!;
    const missing = opportunityOptions.options
      .map((option) => option.value)
      .filter((value) => !(value in plainLanguageLabels));
    expect(missing).toEqual([]);
  });
});
