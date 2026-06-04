export type WingmanAudience =
  | "DISTRIBUTOR"
  | "DEALER"
  | "INTEGRATOR"
  | "CONSULTANT"
  | "END_USER"
  | "INTERNAL_SALES";

export type WingmanCallMode =
  | "INBOUND_SUPPORT"
  | "PRODUCT_CALLOUT"
  | "COMPETITOR_DISPLACEMENT"
  | "PROJECT_DISCOVERY"
  | "TRAINING";

export type DataConfidence = "LOW" | "MEDIUM" | "HIGH";

export type ProductPositioningObjection = {
  objection: string;
  response: string;
};

export type ProductPositioningAttachProduct = {
  sku?: string;
  productFamily?: string;
  reason: string;
};

export type ProductPositioningCompetitorAngle = {
  competitorBrand?: string;
  competitorCategory?: string;
  positioningNote: string;
  compareSearchTerms: string[];
};

export type ProductPositioningCard = {
  sku: string;
  productName: string;
  productFamily: string;
  technologyType: string;

  salientPoint: string;
  oneLinePositioning: string;
  oneMinuteBrief: string;

  bestFitApplications: string[];
  weakFitApplications: string[];
  customerProblems: string[];
  wyrestormFit: string[];

  openingQuestions: string[];
  qualificationQuestions: string[];
  technicalCheckQuestions: string[];

  listenForTriggers: string[];
  disqualifiers: string[];
  caveats: string[];

  objectionHandling: ProductPositioningObjection[];
  attachProducts: ProductPositioningAttachProduct[];
  competitorAngles: ProductPositioningCompetitorAngle[];

  audienceNotes: Partial<Record<WingmanAudience, string>>;
  callModeNotes: Partial<Record<WingmanCallMode, string>>;

  followUpWording: string;
  reviewGates: string[];

  dataConfidence: DataConfidence;
  lastReviewed?: string;
};

export const WINGMAN_AUDIENCES: { id: WingmanAudience; label: string }[] = [
  { id: "DISTRIBUTOR", label: "Distributor" },
  { id: "DEALER", label: "Dealer" },
  { id: "INTEGRATOR", label: "Integrator" },
  { id: "CONSULTANT", label: "Consultant" },
  { id: "END_USER", label: "End-user" },
  { id: "INTERNAL_SALES", label: "Internal sales" },
];

export const WINGMAN_CALL_MODES: { id: WingmanCallMode; label: string }[] = [
  { id: "INBOUND_SUPPORT", label: "Inbound support" },
  { id: "PRODUCT_CALLOUT", label: "Product call-out" },
  { id: "COMPETITOR_DISPLACEMENT", label: "Competitor displacement" },
  { id: "PROJECT_DISCOVERY", label: "Project discovery" },
  { id: "TRAINING", label: "Training" },
];

export const DATA_CONFIDENCE_LABELS: Record<DataConfidence, string> = {
  LOW: "Needs validation",
  MEDIUM: "Usable with review",
  HIGH: "Validated",
};
