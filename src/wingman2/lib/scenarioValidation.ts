export type QuoteSafetyExpectation = "quote-ready" | "validate-before-quote" | "do-not-quote-yet";
export type RecommendationScenario = { id: string; name: string; evidence: Record<string, unknown>; expectedArchitecture?: string; expectedProductFamily?: string; allowedLeadProducts?: string[]; forbiddenLeadProducts?: string[]; requiredDependencies?: string[]; expectedMissingInformation?: string[]; quoteSafety?: QuoteSafetyExpectation };
export type ScenarioResult = { architecture?: string; productFamily?: string; leadProducts: string[]; dependencies: string[]; missingInformation: string[]; quoteSafety: QuoteSafetyExpectation };
export type ScenarioFailure = { field: string; message: string };

export function validateRecommendationScenario(scenario: RecommendationScenario, actual: ScenarioResult): ScenarioFailure[] {
  const failures: ScenarioFailure[] = [];
  if (scenario.expectedArchitecture && actual.architecture !== scenario.expectedArchitecture) failures.push({ field: "architecture", message: `Expected ${scenario.expectedArchitecture}; received ${actual.architecture || "unknown"}.` });
  if (scenario.expectedProductFamily && actual.productFamily !== scenario.expectedProductFamily) failures.push({ field: "productFamily", message: `Expected ${scenario.expectedProductFamily}; received ${actual.productFamily || "unknown"}.` });
  if (scenario.allowedLeadProducts?.length && actual.leadProducts.some((sku) => !scenario.allowedLeadProducts!.includes(sku))) failures.push({ field: "allowedLeadProducts", message: "A lead product was not in the allowed set." });
  const forbidden = actual.leadProducts.filter((sku) => scenario.forbiddenLeadProducts?.includes(sku));
  if (forbidden.length) failures.push({ field: "forbiddenLeadProducts", message: `Forbidden lead products: ${forbidden.join(", ")}.` });
  const missingDependencies = (scenario.requiredDependencies || []).filter((item) => !actual.dependencies.includes(item));
  if (missingDependencies.length) failures.push({ field: "requiredDependencies", message: `Missing dependencies: ${missingDependencies.join(", ")}.` });
  const missingQuestions = (scenario.expectedMissingInformation || []).filter((item) => !actual.missingInformation.includes(item));
  if (missingQuestions.length) failures.push({ field: "missingInformation", message: `Expected unresolved information: ${missingQuestions.join(", ")}.` });
  if (scenario.quoteSafety && actual.quoteSafety !== scenario.quoteSafety) failures.push({ field: "quoteSafety", message: `Expected ${scenario.quoteSafety}; received ${actual.quoteSafety}.` });
  return failures;
}

export const GOVERNANCE_SCENARIOS: RecommendationScenario[] = [
  "Small Teams/BYOD boardroom", "Medium corporate meeting room", "University teaching room", "Lecture theatre", "Sports bar", "Hotel function room", "LCD video wall", "LED video wall", "NetworkHD 100 distribution", "NetworkHD 500 KVM", "NetworkHD 600 high-performance deployment", "NDI camera workflow", "Simple HDBaseT extension", "Competitor matrix replacement", "Competitor AVoIP replacement",
].map((name, index) => ({ id: `scenario-${index + 1}`, name, evidence: {} }));
