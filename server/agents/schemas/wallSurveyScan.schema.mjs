/**
 * What a photographed measurement worksheet has to come back as: the measured
 * run written in each row, keyed by the link id printed on that row, plus the
 * install line printed under it (display housing, mount, termination, run
 * entry). `unread` names rows where something is written but cannot be read, so
 * the client can ask for those two or three links by name instead of "some rows
 * failed". A box the surveyor left empty is omitted rather than returned as an
 * empty string.
 */
export const wallSurveyScanResponseSchema = {
  type: "object",
  properties: {
    scanVersion: { type: "string" },
    summary: { type: "string" },
    rows: {
      type: "array",
      items: {
        type: "object",
        properties: {
          linkId: { type: "string" },
          metres: { type: "number" },
          confidence: { type: "number" },
          note: { type: "string" },
          enclosure: { type: "string" },
          mount: { type: "string" },
          termination: { type: "string" },
          entry: { type: "string" },
        },
        required: ["linkId", "metres", "confidence"],
      },
    },
    unread: { type: "array", items: { type: "string" } },
    confidence: { type: "number" },
  },
  required: ["scanVersion", "summary", "rows", "unread", "confidence"],
};
