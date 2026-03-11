import { recommendSolution } from "./recommendationEngine";
import { buildDesignDirection } from "./designDirectionEngine";
import type { FullInterpretationResult, ParsedRequirement } from "./types";

export function buildFullInterpretation(parsed: ParsedRequirement): FullInterpretationResult {
  const recommendation = recommendSolution(parsed);
  const designDirection = buildDesignDirection(parsed);

  return {
    parsed,
    recommendation,
    designDirection
  };
}