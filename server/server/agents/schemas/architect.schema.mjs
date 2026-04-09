export const architectResponseSchema = {
  type: "object",
  properties: {
    architectureVersion: { type: "string" },
    recommendedArchitecture: {
      type: "object",
      properties: {
        family: { type: "string", enum: ["HDBaseT", "matrix", "AVoIP-100", "AVoIP-500", "AVoIP-600", "video-wall-processor", "hybrid", "unknown"] },
        topology: { type: "string" },
        rationale: { type: "string" },
      },
      required: ["family", "topology", "rationale"],
    },
    recommendedProducts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          sku: { type: "string" },
          role: { type: "string", enum: ["transmitter", "receiver", "switcher", "matrix", "processor", "accessory", "controller", "other"] },
          qty: { type: "integer" },
          reason: { type: "string" },
          confidence: { type: "number" },
        },
        required: ["sku", "role", "qty", "reason", "confidence"],
      },
    },
    alternativeArchitectures: {
      type: "array",
      items: {
        type: "object",
        properties: {
          family: { type: "string" },
          reason: { type: "string" },
          tradeOffs: { type: "array", items: { type: "string" } },
        },
        required: ["family", "reason", "tradeOffs"],
      },
    },
    designNotes: { type: "array", items: { type: "string" } },
    risks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          severity: { type: "string", enum: ["low", "medium", "high"] },
          detail: { type: "string" },
        },
        required: ["severity", "detail"],
      },
    },
    assumptions: { type: "array", items: { type: "string" } },
    openQuestions: { type: "array", items: { type: "string" } },
    recommendedNextAction: { type: "string", enum: ["validate"] },
  },
  required: [
    "architectureVersion",
    "recommendedArchitecture",
    "recommendedProducts",
    "alternativeArchitectures",
    "designNotes",
    "risks",
    "assumptions",
    "openQuestions",
    "recommendedNextAction",
  ],
};
