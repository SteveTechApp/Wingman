export type Vertical =
  | "Corporate"
  | "Education"
  | "Hospitality"
  | "Retail"
  | "Government"
  | "Healthcare"
  | "Control Room"
  | "Broadcast"
  | "Residential"
  | "Consultant / Tender"
  | "Mixed Use"
  | "Unknown";

export type Complexity = "Simple" | "Medium" | "Complex" | "Tender";

export type DisplayType =
  | "Single Display"
  | "Dual Display"
  | "Projector"
  | "Dual Projection"
  | "Video Wall"
  | "LED Wall"
  | "Digital Signage"
  | "Unknown";

export type UCPlatform =
  | "Microsoft Teams"
  | "Zoom"
  | "Google Meet"
  | "Webex"
  | "BYOM"
  | "Unknown"
  | "None";

export type SolutionCategory =
  | "HDBaseT Extension"
  | "Matrix Switching"
  | "AV over IP"
  | "Wireless Presentation"
  | "USB Extension / Routing"
  | "Video Wall Processing"
  | "Digital Signage Distribution"
  | "UC Room Integration"
  | "Lecture Capture Support"
  | "Audio DSP / Reinforcement"
  | "Control System / Touch Panel"
  | "Streaming / Recording"
  | "Central Monitoring / Management";

export type SignalFlag =
  | "distance-sensitive"
  | "multi-room"
  | "dual-screen"
  | "video-conferencing"
  | "hybrid-learning"
  | "digital-signage"
  | "video-wall"
  | "consultant-spec"
  | "guest-friendly"
  | "high-reliability"
  | "network-infrastructure-available"
  | "budget-sensitive"
  | "easy-to-use-required"
  | "control-sensitive"
  | "standardisation-required";

export type DeploymentScale =
  | "Single space"
  | "Multi-room"
  | "Multi-site"
  | "Campus / Estate"
  | "Portfolio rollout"
  | "Programme / Tender";

export type RiskSeverity = "low" | "medium" | "high";
export type ClarificationPriority = "low" | "medium" | "high";

export type EnquiryEvidence = {
  label: string;
  matchedText: string;
  source: "keyword" | "pattern" | "fallback";
};

export type ClarificationQuestion = {
  id: string;
  question: string;
  reason: string;
  priority: ClarificationPriority;
};

export type RiskFlag = {
  id: string;
  title: string;
  detail: string;
  severity: RiskSeverity;
};

export type DisplayRequirement = {
  displayType: DisplayType;
  displayCount?: number;
  displaySizesInches: number[];
  requiresIndependentContent: boolean;
  notes: string[];
};

export type SourceRequirement = {
  sourceCount?: number;
  sourceTypes: string[];
  connectivity: string[];
  wirelessPresentation: boolean;
  notes: string[];
};

export type ConferencingRequirement = {
  required: boolean;
  platform: UCPlatform;
  byom: boolean;
  roomPcLikely: boolean;
  peripherals: string[];
  lectureCapture: boolean;
  streaming: boolean;
  recording: boolean;
  notes: string[];
};

export type AudioRequirement = {
  reinforcementLikely: boolean;
  microphonesLikely: boolean;
  dspLikely: boolean;
  speechPrivacyLikely: boolean;
  notes: string[];
};

export type ControlRequirement = {
  controlRequired: boolean;
  touchPanelRequired: boolean;
  simpleOperationImportant: boolean;
  notes: string[];
};

export type InfrastructureRequirement = {
  distancesM: number[];
  longestDistanceM?: number;
  rackMentioned: boolean;
  networkMentioned: boolean;
  deploymentScale: DeploymentScale;
  roomCount?: number;
  notes: string[];
};

export type CommercialRequirement = {
  budgetNotes?: string;
  urgencyNotes?: string;
  usabilityNotes?: string;
  notes: string[];
};

export type ParsedRequirement = {
  rawRequest: string;
  normalizedRequest: string;
  roomType?: string;
  roomCount?: number;
  capacity?: number;
  vertical?: Vertical;
  complexity?: Complexity;
  displayType?: DisplayType;
  displayCount?: number;
  displaySizesInches?: number[];
  sources?: string[];
  connectivity?: string[];
  wirelessPresentation?: boolean;
  ucPlatform?: UCPlatform;
  videoConferencing?: boolean;
  cameras?: string[];
  microphones?: string[];
  speakers?: boolean;
  lectureCapture?: boolean;
  streaming?: boolean;
  recording?: boolean;
  controlRequired?: boolean;
  touchPanelRequired?: boolean;
  rackDistanceM?: number;
  infrastructureNotes?: string[];
  deploymentScale?: DeploymentScale;
  budgetNotes?: string;
  urgencyNotes?: string;
  usabilityNotes?: string;
  openQuestions: string[];
  flags: SignalFlag[];
  confidence: number;
  evidence: EnquiryEvidence[];
  roomApplication: {
    roomType: string;
    vertical: Vertical;
    complexity: Complexity;
    capacity?: number;
  };
  display: DisplayRequirement;
  sourceInput: SourceRequirement;
  conferencing: ConferencingRequirement;
  audio: AudioRequirement;
  control: ControlRequirement;
  infrastructure: InfrastructureRequirement;
  commercial: CommercialRequirement;
  missingInformation: string[];
  clarificationQuestionsDetailed: ClarificationQuestion[];
  riskFlagsDetailed: RiskFlag[];
};

export type CustomerRequestRecord = {
  id: string;
  title: string;
  vertical: Vertical;
  complexity: Complexity;
  channel?: "email" | "phone note" | "consultant brief" | "tender" | "site survey";
  customerRequest: string;
  expectedSignals: string[];
  likelySolutionCategories: SolutionCategory[];
  expectedRoomType?: string;
  expectedDeploymentScale?: DeploymentScale;
};

export type RecommendationCandidate = {
  category: SolutionCategory;
  score: number;
  reasons: string[];
};

export type RecommendationResult = {
  summary: string;
  detectedNeeds: string[];
  likelySolutionCategories: SolutionCategory[];
  rankedCategories: RecommendationCandidate[];
  risks: string[];
  clarificationQuestions: string[];
  salespersonActions: string[];
  rationale: string[];
  confidence: number;
};

export type SalespersonReadyResponse = {
  summaryParagraph: string;
  whatCustomerNeeds: string[];
  keyRisksAndUnknowns: string[];
  recommendedNextActions: string[];
  commercialGuidance: string[];
};

export type DiscoveryMode = "form" | "walkthrough";

export type RoomProfileId =
  | "huddle-room"
  | "meeting-room"
  | "boardroom"
  | "training-room"
  | "classroom"
  | "lecture-theatre"
  | "collaboration-space"
  | "reception-signage"
  | "video-wall-control-room"
  | "hospitality-ballroom"
  | "cafe-social-space"
  | "mixed-unknown";

export type QuestionGroupId =
  | "display"
  | "sources"
  | "conferencing"
  | "audio"
  | "capture"
  | "control"
  | "installation"
  | "content-management";

export type RoomProfile = {
  id: RoomProfileId;
  label: string;
  synonyms: string[];
  likelyUses: string[];
  defaultAssumptions: string[];
  likelySolutionCategories: SolutionCategory[];
  starterQuestions: string[];
  followUpQuestionGroups: QuestionGroupId[];
};

export type QuestionGroup = {
  id: QuestionGroupId;
  questions: string[];
};

export type WalkthroughStep = {
  type: "room-profile" | "question";
  id: string;
  label: string;
  helperText?: string;
  options?: string[];
  groupId?: QuestionGroupId;
};

export type WalkthroughAnswerMap = Record<string, string>;

export type WalkthroughSession = {
  mode: DiscoveryMode;
  roomProfileId?: RoomProfileId;
  roomProfileLabel?: string;
  answers: WalkthroughAnswerMap;
};

export type WalkthroughInterpretation = {
  combinedNarrative: string;
  parsed: ParsedRequirement;
  recommendation: RecommendationResult;
};

export type SuggestedAnswerOption = {
  label: string;
  value: string;
};

export type QuestionVisibilityRule = {
  dependsOnQuestionId: string;
  includesAny: string[];
};

export type WalkthroughQuestionDefinition = {
  id: string;
  label: string;
  groupId?: QuestionGroupId;
  helperText?: string;
  suggestedAnswers?: SuggestedAnswerOption[];
  visibilityRules?: QuestionVisibilityRule[];
};

export type WalkthroughFlow = {
  roomProfileId: RoomProfileId;
  questions: WalkthroughQuestionDefinition[];
};

export type WingmanArchitecturePath =
  | "Room HDMI / USB-C Extension"
  | "Room Switching + UC"
  | "Dual Display Room"
  | "BYOM / USB-Collaboration Room"
  | "AV over IP Distribution"
  | "Video Wall / LED Processing"
  | "Digital Signage Distribution"
  | "Lecture Capture / Hybrid Teaching"
  | "Large Room Audio + Presentation"
  | "Divisible Room / Multi-Mode Space"
  | "Control Room / Operations"
  | "Undetermined";

export type ProductFamilyHint =
  | "Apollo"
  | "NetworkHD"
  | "HDBaseT"
  | "Matrix"
  | "Switching / Presentation"
  | "USB Extension"
  | "Video Wall"
  | "Digital Signage"
  | "Control"
  | "Audio"
  | "Third-Party / External"
  | "Undetermined";

export type DesignDirection = {
  primaryArchitecture: WingmanArchitecturePath;
  secondaryArchitectures: WingmanArchitecturePath[];
  productFamilyHints: ProductFamilyHint[];
  commercialSummary: string;
  technicalSummary: string;
  whyThisPath: string[];
  designNotes: string[];
  missingDetailsBeforeBom: string[];
  suitabilityScore: number;
};

export type FullInterpretationResult = {
  parsed: ParsedRequirement;
  recommendation: RecommendationResult;
  designDirection: DesignDirection;
};
