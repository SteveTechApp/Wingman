import { describe, expect, it } from "vitest";
import { GOVERNANCE_SCENARIOS, validateRecommendationScenario, type RecommendationScenario } from "./scenarioValidation";

describe("scenario validation harness", () => {
  it("defines all 15 governed scenarios", () => expect(GOVERNANCE_SCENARIOS).toHaveLength(15));
  it("behaviourally rejects forbidden leads, missing dependencies, and unsafe quote state", () => {
    const scenario: RecommendationScenario = { id: "apo", name: "Wireless dongle", evidence: {}, forbiddenLeadProducts: ["APO-DG2"], requiredDependencies: ["compatible -W receiver"], quoteSafety: "do-not-quote-yet" };
    const failures = validateRecommendationScenario(scenario, { leadProducts: ["APO-DG2"], dependencies: [], missingInformation: [], quoteSafety: "quote-ready" });
    expect(failures.map((failure) => failure.field)).toEqual(["forbiddenLeadProducts", "requiredDependencies", "quoteSafety"]);
  });
});
