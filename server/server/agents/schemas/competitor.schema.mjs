export const competitorResponseSchema = {
  type: "object",
  properties: {
    competitorVersion: { type: "string" },
    summary: { type: "string" },
    matches: {
      type: "array",
      items: {
        type: "object",
        properties: {
          sku: { type: "string" },
          confidence: { type: "number" },
          reason: { type: "string" },
        },
        required: ["sku", "confidence", "reason"],
      },
    },
    caveats: { type: "array", items: { type: "string" } },
    recommendedNextAction: { type: "string", enum: ["review-in-compare-tool"] },
  },
  required: ["competitorVersion", "summary", "matches", "caveats", "recommendedNextAction"],
};
