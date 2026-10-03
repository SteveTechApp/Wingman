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

export type WingmanApplicationContext =
  | "GENERAL"
  | "MEETING_ROOM"
  | "EDUCATION"
  | "HOSPITALITY_RETAIL"
  | "CONTROL_ROOM"
  | "VIDEO_WALL"
  | "DISTRIBUTED_AV";

export type DataConfidence = "LOW" | "MEDIUM" | "HIGH";

export type ProductMediaView =
  | "front"
  | "rear"
  | "primary"
  | "angle"
  | "side"
  | "top"
  | "detail"
  | "in-use"
  | "unknown";

export type ProductMediaStatus =
  | "verified-front-back"
  | "partial-front"
  | "primary-only"
  | "gallery-only"
  | "no-gallery"
  | "no-official-page";

export type ProductMediaAsset = {
  url: string;
  view: ProductMediaView;
  alt: string;
  sourceUrl: string;
  confidence: DataConfidence;
};

export type ProductMediaSet = {
  sku: string;
  productName?: string;
  officialProductUrl?: string;
  status: ProductMediaStatus;
  front?: ProductMediaAsset;
  rear?: ProductMediaAsset;
  gallery: ProductMediaAsset[];
  notes: string[];
  lastChecked?: string;
};

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

export const WINGMAN_APPLICATION_CONTEXTS: {
  id: WingmanApplicationContext;
  label: string;
  description: string;
}[] = [
  {
    id: "GENERAL",
    label: "General AV",
    description: "Keep the wording broad until the room or market is known.",
  },
  {
    id: "MEETING_ROOM",
    label: "Meeting room / UC",
    description: "Focus on joining calls, sharing content, USB ownership and day-to-day ease of use.",
  },
  {
    id: "EDUCATION",
    label: "Education / teaching",
    description: "Focus on repeatable teaching, sightlines, lesson flow, capture and supportability.",
  },
  {
    id: "HOSPITALITY_RETAIL",
    label: "Hospitality / retail",
    description: "Focus on staff operation, display zones, signage, source control and guest experience.",
  },
  {
    id: "CONTROL_ROOM",
    label: "Control room / monitoring",
    description: "Focus on source visibility, operator confidence, reliability and layout control.",
  },
  {
    id: "VIDEO_WALL",
    label: "Video wall / signage",
    description: "Focus on wall behaviour, source count, layout control, processing and display outputs.",
  },
  {
    id: "DISTRIBUTED_AV",
    label: "Distributed AV / campus",
    description: "Focus on routing between spaces, endpoint count, network ownership and expansion path.",
  },
];

export const DATA_CONFIDENCE_LABELS: Record<DataConfidence, string> = {
  LOW: "Needs validation",
  MEDIUM: "Usable with review",
  HIGH: "Validated",
};
