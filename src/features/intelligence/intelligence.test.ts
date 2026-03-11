import { describe, expect, it } from "vitest";

import { parseSeedRecord } from "@/features/intelligence/parser";
import { recommendSolution } from "@/features/intelligence/recommendationEngine";
import { buildSalespersonResponse } from "@/features/intelligence/responseBuilder";
import { seedCustomerRequests } from "@/features/intelligence/seedCustomerRequests";

describe("intelligence pipeline", () => {
  it("turns seeded customer requests into commercially useful interpretations", () => {
    for (const record of seedCustomerRequests) {
      const parsed = parseSeedRecord(record);
      const recommendation = recommendSolution(parsed);
      const response = buildSalespersonResponse(parsed, recommendation);

      expect(parsed.confidence).toBeGreaterThan(0.2);
      expect(recommendation.likelySolutionCategories.length).toBeGreaterThan(0);
      expect(response.whatCustomerNeeds.length).toBeGreaterThan(0);
      expect(response.recommendedNextActions.length).toBeGreaterThan(0);

      const overlap = record.likelySolutionCategories.filter((category) =>
        recommendation.likelySolutionCategories.includes(category),
      );
      expect(overlap.length).toBeGreaterThan(0);

      if (record.expectedRoomType) {
        expect(parsed.roomType).toBeTruthy();
      }

      if (record.expectedDeploymentScale) {
        expect(parsed.deploymentScale).toBeTruthy();
      }
    }
  });
});
