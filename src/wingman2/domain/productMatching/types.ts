export type MatchStatus = "recommended" | "alternative" | "caution";
export type ProductVoiceId = "endUser" | "systemIntegrator" | "consultant";

export type ProductSalesVoice = {
  label?: string;
  headline?: string;
  pitch?: string;
  value?: string;
  talkTrack?: string[];
  discoveryPrompts?: string[];
  positioningNotes?: string[];
  avoidPositioningAs?: string[];
};

export type ProductSalesLanguage = {
  headline?: string;
  plainEnglishSummary?: string;
  customerValue?: string;
  realWorldApplication?: string;
  salespersonCue?: string;
  thirdOutputUseCase?: string;
  talkTrack?: string[];
  discoveryPrompts?: string[];
  positioningNotes?: string[];
  avoidPositioningAs?: string[];
  marketApplications?: string[];
  voices?: Partial<Record<ProductVoiceId, ProductSalesVoice>>;
};

export type FinderProduct = {
  sku: string;
  title: string;
  family: string;
  category: string;
  description: string;
  tags: string[];
  searchText: string;
  source: "seed" | "index";
  salesLanguage?: ProductSalesLanguage;
  commercialRole?: string;
  finderVisibility?: string;
  bomRole?: string;
  dependencyType?: string;
  primarySystemFamily?: string;
  showWhenRequestedBy?: string[];
  activeSku?: string;
  lifecycleStatus?: string;
  recommendationStatus?: string;
  lifecycleWarning?: string;
};

export type FinderNeed = {
  query: string;
  technicalRequirement: string;
  productPath: string;
  technologyType: string;
  signalType: string;
  sourceConnector: string;
  displayConnector: string;
  inputs: string;
  outputs: string;
  distance: string;
  resolution: string;
  usb: string;
  audio: string;
  network: string;
  processing: string;
  control: string;
};

export type ProductMatch = FinderProduct & {
  score: number;
  status: MatchStatus;
};

export type FinderFeatureFilter = {
  id: string;
  label: string;
  weight: number;
  matches: (product: FinderProduct) => boolean;
};

export type UnknownRecord = Record<string, unknown>;
