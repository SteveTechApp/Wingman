export type ProposalSafetyConfidence =
  | "confirmed"
  | "assumption"
  | "recommended"
  | "optional"
  | "needs-validation";

export type ProposalSafetySection = {
  id: string;
  title: string;
  confidence: ProposalSafetyConfidence;
  required: boolean;
};

export const proposalSafetySections: ProposalSafetySection[] = [
  { id: "confirmed-requirement", title: "Confirmed requirement", confidence: "confirmed", required: true },
  { id: "design-assumptions", title: "Design assumptions", confidence: "assumption", required: true },
  { id: "recommended-architecture", title: "Recommended architecture", confidence: "recommended", required: true },
  { id: "required-wyrestorm-products", title: "Required WyreStorm products", confidence: "recommended", required: true },
  { id: "optional-enhancements", title: "Optional enhancements", confidence: "optional", required: false },
  { id: "risks-needs-validation", title: "Risks / needs validation", confidence: "needs-validation", required: true },
  { id: "next-steps", title: "Next steps", confidence: "recommended", required: true },
];

export const proposalUnsafeClaims = [
  "guaranteed",
  "fully compatible",
  "will work in all cases",
  "best product",
  "exact equivalent",
];

export const proposalValidationTopics = [
  "installed cable route",
  "USB generation",
  "audio routing",
  "Dante or AES67 requirement",
  "control protocol",
  "regional SKU availability",
  "network capability",
  "display behaviour",
  "camera compatibility",
  "product lifecycle status",
];

export function getProposalSafetyLabel(confidence: ProposalSafetyConfidence) {
  if (confidence === "confirmed") return "Confirmed";
  if (confidence === "assumption") return "Assumption";
  if (confidence === "recommended") return "Recommended";
  if (confidence === "optional") return "Optional";
  return "Needs validation";
}

export function createProposalValidationNote(topic: string) {
  return `Subject to final confirmation of ${topic}.`;
}