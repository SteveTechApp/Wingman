export const guruResponseSchema = {
  type: "object",
  properties: {
    guruVersion: { type: "string" },
    answer: { type: "string" },
    bullets: { type: "array", items: { type: "string" } },
    followUpActions: { type: "array", items: { type: "string" } },
    confidence: { type: "number" },
  },
  required: ["guruVersion", "answer", "bullets", "followUpActions", "confidence"],
};
