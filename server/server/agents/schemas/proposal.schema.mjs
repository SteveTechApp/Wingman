export const proposalResponseSchema = {
  type: "object",
  properties: {
    proposalVersion: { type: "string" },
    readiness: { type: "string", enum: ["ready", "conditional", "blocked"] },
    executiveSummary: { type: "string" },
    solutionOverview: { type: "array", items: { type: "string" } },
    bomNotes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          sku: { type: "string" },
          qty: { type: "integer" },
          note: { type: "string" },
        },
        required: ["sku", "qty", "note"],
      },
    },
    exclusions: { type: "array", items: { type: "string" } },
    internalReviewNotes: { type: "array", items: { type: "string" } },
    nextSteps: { type: "array", items: { type: "string" } },
  },
  required: [
    "proposalVersion",
    "readiness",
    "executiveSummary",
    "solutionOverview",
    "bomNotes",
    "exclusions",
    "internalReviewNotes",
    "nextSteps",
  ],
};
