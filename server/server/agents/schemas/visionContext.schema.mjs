export const visionContextResponseSchema = {
  type: "object",
  properties: {
    visionVersion: { type: "string" },
    attachmentKind: { type: "string", enum: ["room_photo", "schematic_diagram", "unclear"] },
    summary: { type: "string" },
    roomObservations: { type: "array", items: { type: "string" } },
    visibleEquipment: { type: "array", items: { type: "string" } },
    layoutNotes: { type: "array", items: { type: "string" } },
    confidence: { type: "number" },
  },
  required: [
    "visionVersion",
    "attachmentKind",
    "summary",
    "roomObservations",
    "visibleEquipment",
    "layoutNotes",
    "confidence",
  ],
};
