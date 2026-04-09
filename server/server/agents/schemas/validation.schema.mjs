export const validationResponseSchema = {
  type: "object",
  properties: {
    validationVersion: { type: "string" },
    status: { type: "string", enum: ["pass", "pass-with-warnings", "fail"] },
    checks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          code: { type: "string", enum: ["COMPATIBILITY", "DISTANCE", "COUNT", "TOPOLOGY", "VIDEO_WALL", "MISSING_ACCESSORY", "MISSING_INFO", "RISK"] },
          status: { type: "string", enum: ["pass", "warn", "fail"] },
          message: { type: "string" },
        },
        required: ["code", "status", "message"],
      },
    },
    blockingIssues: { type: "array", items: { type: "string" } },
    warnings: { type: "array", items: { type: "string" } },
    fixSuggestions: { type: "array", items: { type: "string" } },
    revisedProductSuggestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          sku: { type: "string" },
          role: { type: "string" },
          qty: { type: "integer" },
          reason: { type: "string" },
        },
        required: ["sku", "role", "qty", "reason"],
      },
    },
    confidence: { type: "number" },
    recommendedNextAction: { type: "string", enum: ["return-to-architect", "ready-for-proposal"] },
  },
  required: [
    "validationVersion",
    "status",
    "checks",
    "blockingIssues",
    "warnings",
    "fixSuggestions",
    "revisedProductSuggestions",
    "confidence",
    "recommendedNextAction",
  ],
};
