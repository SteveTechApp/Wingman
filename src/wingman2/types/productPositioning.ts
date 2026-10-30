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
