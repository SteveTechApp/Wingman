export type CompareIO = {
  inputs: number;
  outputs: number;
};

export type CompareFeatures = {
  usb?: boolean;
  audio?: boolean;
  control?: boolean;
};

export type CompareResult = {
  competitorName: string;
  competitorSku: string;

  wyrestormSku: string;
  wyrestormName: string;

  score: number;
  band: "strong" | "good" | "partial" | "weak";
  confidence: "high" | "medium" | "low";

  transport?: string;

  io: {
    competitor: CompareIO;
    wyrestorm: CompareIO;
  };

  features: {
    competitor: CompareFeatures;
    wyrestorm: CompareFeatures;
  };

  notes: string[];
};