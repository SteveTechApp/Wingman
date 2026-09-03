// Guards the remaining value-keyed consumer tables against stale-value drift,
// mirroring the escalation-trigger treatment. The big default tables
// (SMART_DEFAULTS, quickStartConfigs, ESCALATION_TRIGGERS, locale curated
// tables) are already pinned; this file covers the smaller value-keyed maps
// that branch on answer values outside the discovery question definitions —
// plainLanguageLabels carried three keys ("ceiling-microphone", "hdmi-only",
// "premium-4k60") that used pre-rename spellings of canonical values, so a
// label lookup for the real values silently fell back to the raw token.

import { describe, expect, it } from "vitest";
import {
  AUDIO_PREFERRED_OPTION_ORDER,
  SOURCE_DEVICE_WORKFLOWS_PREFERRED_OPTION_ORDER,
  getQuestionView,
} from "./discoveryAnswerUtils";
import { baseDiscoveryQuestions, canonicalDiscoveryQuestions } from "./discoveryQuestions";
import { plainLanguageLabels } from "./discoveryQuickStart";

const canonicalOptionValues = new Set(
  baseDiscoveryQuestions.flatMap((question) => question.options.map((option) => option.value)),
);

// The ordering tables also cover operational questions (source-device-workflows
// lives in the operational set), so resolution checks run against the FULL
// canonical vocabulary, not just the base questions.
const optionValuesFor = (questionId: string) =>
  new Set(canonicalDiscoveryQuestions.find((question) => question.id === questionId)!.options.map((option) => option.value));

const canonicalStepFor = (questionId: string) =>
  canonicalDiscoveryQuestions.find((question) => question.id === questionId)!;

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

  it("every preferred audio ordering value resolves to a current option, without duplicates", () => {
    const audioOptions = optionValuesFor("audio");
    const stale: string[] = [];
    for (const [application, values] of Object.entries(AUDIO_PREFERRED_OPTION_ORDER)) {
      values.forEach((value, index) => {
        if (!audioOptions.has(value)) stale.push(`audio["${application}"]: "${value}"`);
        if (values.indexOf(value) !== index) stale.push(`audio["${application}"]: duplicate "${value}"`);
      });
    }
    expect(stale).toEqual([]);
  });

  it("every preferred source-device-workflows ordering value resolves to a current option, without duplicates", () => {
    const workflowOptions = optionValuesFor("source-device-workflows");
    const stale: string[] = [];
    for (const [application, values] of Object.entries(SOURCE_DEVICE_WORKFLOWS_PREFERRED_OPTION_ORDER)) {
      values.forEach((value, index) => {
        if (!workflowOptions.has(value)) stale.push(`source-device-workflows["${application}"]: "${value}"`);
        if (values.indexOf(value) !== index) stale.push(`source-device-workflows["${application}"]: duplicate "${value}"`);
      });
    }
    expect(stale).toEqual([]);
  });

  it("getQuestionView surfaces each preferred option ahead of the unlisted ones", () => {
    // The ordering tables only take effect while every listed value still
    // exists AND sorts first: if an option were renamed (stale value ranks at
    // 99) or the canonical set reordered around it, the expected prefix would
    // no longer match the view the rep sees.
    const assertPrefix = (questionId: string, preferredOrder: Record<string, string[]>) => {
      const step = canonicalStepFor(questionId);
      const canonicalValues = step.options.map((option) => option.value);
      for (const [application, preferred] of Object.entries(preferredOrder)) {
        const view = getQuestionView(step, application);
        const expected = [...preferred, ...canonicalValues.filter((value) => !preferred.includes(value))];
        expect(
          view.options.map((option) => option.value),
          `${questionId} order for "${application}"`,
        ).toEqual(expected);
      }
    };
    assertPrefix("audio", AUDIO_PREFERRED_OPTION_ORDER);
    assertPrefix("source-device-workflows", SOURCE_DEVICE_WORKFLOWS_PREFERRED_OPTION_ORDER);
  });
});
