import { describe, expect, it } from "vitest";
import { hasExplicitSharedContentIntent } from "./template-shared-content-intent.mjs";

describe("template shared-content intent", () => {
  it.each([
    "Two signage sources repeat across eight displays.",
    "Teacher and demo distribution uses 2 sources across 8 bench displays.",
    "The same content from two patient-calling sources is shown on six waiting displays.",
  ])("accepts explicit intent and allocation: %s", (assumption) => {
    expect(hasExplicitSharedContentIntent([assumption])).toBe(true);
  });

  it.each([
    "Shared content is intentional.",
    "Two sources and eight displays.",
    "Content distribution across the room.",
    "Several sources repeat across many displays.",
  ])("rejects vague evidence: %s", (assumption) => {
    expect(hasExplicitSharedContentIntent([assumption])).toBe(false);
  });
});
