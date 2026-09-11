import { describe, expect, it } from "vitest";
import { roomTemplates } from "./roomTemplates";

describe("high-ratio room template assumptions", () => {
  it.each([
    ["retail-signage-networkhd100", /two signage sources repeat across eight displays/i],
    ["education-stem-science-lab-networkhd100", /two teacher\/demo sources.*eight bench displays/i],
    ["healthcare-clinic-waiting-patient-calling-networkhd100", /two patient-calling\/signage sources.*six waiting displays/i],
  ])("documents intentional shared content for %s", (id, expected) => {
    const template = roomTemplates.find((candidate) => candidate.id === id);
    expect(template, `Missing room template ${id}`).toBeDefined();
    expect(template?.assumptions.some((assumption) => expected.test(assumption))).toBe(true);
  });
});
