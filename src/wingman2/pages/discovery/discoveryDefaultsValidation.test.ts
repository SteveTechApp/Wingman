// Guards the discovery default tables against drift from the canonical
// question set. Both SMART_DEFAULTS (progressive disclosure, keyed by
// application type) and quickStartConfigs (quick start, keyed by room type)
// were once written against an older question set — dead keys and invalid
// option values silently rendered as raw tokens in the UI and broke
// downstream branching (contradiction detection, escalation triggers,
// brief text). This test fails CI the moment a default no longer matches
// a current question option.

import { describe, expect, it } from "vitest";
import { baseDiscoveryQuestions } from "./discoveryQuestions";
import { SMART_DEFAULTS } from "./discoveryProgressiveDisclosure";
import { quickStartConfigs } from "./discoveryQuickStart";
import type { DiscoveryAnswers } from "./discoveryTypes";

const questionOptions = new Map(
  baseDiscoveryQuestions.map((question) => [question.id, new Set(question.options.map((option) => option.value))]),
);

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
});
