import { buildDesignDirectionSummary } from "./designDirectionSummary";
import { buildFullInterpretation } from "./fullInterpretation";
import { parseSeedRecord } from "./parser";
import { buildSalespersonResponse, buildSalespersonSummary } from "./responseBuilder";
import { seedCustomerRequests } from "./seedCustomerRequests";

export const intelligenceFixtures = seedCustomerRequests.map((record) => {
  const parsed = parseSeedRecord(record);
  const full = buildFullInterpretation(parsed);
  const response = buildSalespersonResponse(parsed, full.recommendation, full.designDirection);
  const summary = buildSalespersonSummary(parsed, full.recommendation, full.designDirection);
  const designDirectionSummary = buildDesignDirectionSummary(full.designDirection);

  return {
    id: record.id,
    title: record.title,
    input: record.customerRequest,
    seed: record,
    parsed,
    recommendation: full.recommendation,
    designDirection: full.designDirection,
    response,
    summary,
    designDirectionSummary,
    assertions: {
      expectedRoomType: record.expectedRoomType,
      expectedDeploymentScale: record.expectedDeploymentScale,
      expectedCategoryOverlap: record.likelySolutionCategories,
    },
  };
});
