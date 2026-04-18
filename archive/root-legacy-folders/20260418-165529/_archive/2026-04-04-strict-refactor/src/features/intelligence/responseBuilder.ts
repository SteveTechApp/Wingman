import type {
  DesignDirection,
  ParsedRequirement,
  RecommendationResult,
  SalespersonReadyResponse,
} from "./types";

function unique(items: string[]): string[] {
  return Array.from(new Set(items.filter(Boolean)));
}

function buildCommercialGuidance(
  parsed: ParsedRequirement,
  recommendation: RecommendationResult,
  designDirection?: DesignDirection,
): string[] {
  const guidance = [
    parsed.commercial.budgetNotes || "",
    parsed.commercial.urgencyNotes || "",
    parsed.commercial.usabilityNotes || "",
    recommendation.likelySolutionCategories.includes("AV over IP")
      ? "Position a scalable architecture only if the customer can support the network, ownership, and support model."
      : "",
    recommendation.likelySolutionCategories.includes("Digital Signage Distribution")
      ? "Treat content ownership, scheduling, and local override as commercial decision points, not only technical details."
      : "",
    recommendation.likelySolutionCategories.includes("UC Room Integration")
      ? "Keep the customer discussion focused on meeting workflow simplicity before diving into device topology."
      : "",
    designDirection?.commercialSummary || "",
  ];

  return unique(guidance);
}

export function buildSalespersonResponse(
  parsed: ParsedRequirement,
  recommendation: RecommendationResult,
  designDirection?: DesignDirection,
): SalespersonReadyResponse {
  const whatCustomerNeeds = unique([
    ...recommendation.detectedNeeds,
    parsed.roomType && parsed.roomType !== "General AV Space" ? `${parsed.roomType} workflow support.` : "",
    parsed.display.displayType !== "Unknown"
      ? `${parsed.display.displayType} display approach.`
      : "Display approach still needs confirmation.",
    parsed.conferencing.required
      ? `Conferencing support${parsed.conferencing.platform !== "Unknown" && parsed.conferencing.platform !== "None" ? ` for ${parsed.conferencing.platform}` : ""}.`
      : "",
  ]);

  const keyRisksAndUnknowns = unique([
    ...recommendation.risks,
    ...parsed.missingInformation.map((item) => `Missing detail: ${item}.`),
    ...(designDirection?.missingDetailsBeforeBom.map((item) => `Still needed before BOM: ${item}.`) ?? []),
  ]);

  const recommendedNextActions = unique([
    ...recommendation.salespersonActions,
    ...parsed.clarificationQuestionsDetailed
      .filter((question) => question.priority === "high")
      .map((question) => `Ask: ${question.question}`),
  ]);

  const summaryParagraph = [
    recommendation.summary,
    whatCustomerNeeds.length > 0
      ? `The customer appears to need ${whatCustomerNeeds[0].charAt(0).toLowerCase()}${whatCustomerNeeds[0].slice(1)}`
      : "The customer appears to need a clearer definition of the room workflow",
    keyRisksAndUnknowns.length > 0
      ? `The main current risk is ${keyRisksAndUnknowns[0].charAt(0).toLowerCase()}${keyRisksAndUnknowns[0].slice(1)}`
      : "The current risks are manageable with a short clarification step",
  ]
    .map((sentence) => sentence.trim().replace(/\.*$/, "."))
    .join(" ");

  return {
    summaryParagraph,
    whatCustomerNeeds,
    keyRisksAndUnknowns,
    recommendedNextActions,
    commercialGuidance: buildCommercialGuidance(parsed, recommendation, designDirection),
  };
}

export function buildSalespersonSummary(
  parsed: ParsedRequirement,
  recommendation: RecommendationResult,
  designDirection?: DesignDirection,
): string {
  const response = buildSalespersonResponse(parsed, recommendation, designDirection);
  const lines: string[] = [];

  lines.push("What the customer appears to need:");
  for (const item of response.whatCustomerNeeds) {
    lines.push(`- ${item}`);
  }

  lines.push("");
  lines.push("Likely solution categories:");
  for (const category of recommendation.likelySolutionCategories) {
    lines.push(`- ${category}`);
  }

  lines.push("");
  lines.push("Interpreted room profile:");
  lines.push(`- Room type: ${parsed.roomType || "Not yet clear"}`);
  lines.push(`- Display approach: ${parsed.displayType || "Not yet clear"}`);
  lines.push(`- Video conferencing: ${parsed.videoConferencing ? "Yes / likely" : "Not confirmed"}`);
  lines.push(`- Capacity: ${parsed.capacity ?? "Not confirmed"}`);
  lines.push(`- Confidence: ${Math.round(recommendation.confidence * 100)}%`);

  if (designDirection) {
    lines.push("");
    lines.push("Recommended design direction:");
    lines.push(`- Primary architecture: ${designDirection.primaryArchitecture}`);
    lines.push(`- Product-family hints: ${designDirection.productFamilyHints.join(", ")}`);
    lines.push(`- Commercial view: ${designDirection.commercialSummary}`);
  }

  lines.push("");
  lines.push("Key risks / unknowns:");
  for (const item of response.keyRisksAndUnknowns) {
    lines.push(`- ${item}`);
  }

  lines.push("");
  lines.push("Recommended clarification questions:");
  for (const question of recommendation.clarificationQuestions) {
    lines.push(`- ${question}`);
  }

  if (designDirection?.missingDetailsBeforeBom.length) {
    lines.push("");
    lines.push("Still needed before BOM generation:");
    for (const item of designDirection.missingDetailsBeforeBom) {
      lines.push(`- ${item}`);
    }
  }

  lines.push("");
  lines.push("Recommended next actions for sales:");
  for (const action of response.recommendedNextActions) {
    lines.push(`- ${action}`);
  }

  if (response.commercialGuidance.length > 0) {
    lines.push("");
    lines.push("Commercial guidance:");
    for (const item of response.commercialGuidance) {
      lines.push(`- ${item}`);
    }
  }

  return lines.join("\n");
}
