export type WingmanShellInput = {
  projectName?: string;
  customer?: string;
  roomType?: string;
  application?: string;
  sourceCount?: number;
  displayCount?: number;
  distanceM?: number;
  resolution?: string;
  notes?: string;
  avGuide?: {
    usb?: string;
    audio?: string;
    control?: string;
  };
  videoWall?: {
    wallType?: string;
  };
};

export type WingmanBomItem = {
  name: string;
  qty: number;
};

export type WingmanUxPipelineResult = {
  recommendation: {
    primaryFamily?: string;
    confidenceLabel?: string;
    whyThisAnswer?: string[];
    whatsMissing?: string[];
    context?: unknown;
    summaries?: {
      proposal?: string;
    };
  };
  topology: {
    architecture?: string;
    bandwidthEstimate?: string;
    transport?: string;
    switchRecommendation?: string;
  };
  signalPath: {
    links: Array<{
      from: string;
      to: string;
      label?: string;
    }>;
  };
  room: {
    nextTool?: string;
    suggestedBom?: WingmanBomItem[];
  } | null;
  proposal: {
    title?: string;
    sections?: Array<{
      title: string;
      body: string;
    }>;
  } | null;
};