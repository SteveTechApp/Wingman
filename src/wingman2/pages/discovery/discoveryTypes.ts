// Shared question/answer types for the Discovery workflow. Extracted from
// DiscoveryPage.tsx so the question data, pure answer helpers and the page
// component can all share one definition without the page owning them.

export type DiscoveryOption = {
  value: string;
  label: string;
  help?: string;
};

export type DiscoveryQuestion = {
  id: string;
  shortLabel: string;
  section: string;
  optional?: boolean;
  question: string;
  prompt: string;
  why: string;
  required: boolean;
  selectionMode?: "single" | "multiple";
  exclusiveValues?: string[];
  selectAllValue?: string;
  capturePlaceholder: string;
  options: DiscoveryOption[];
};

export type DiscoveryQuestionView = DiscoveryQuestion;

export type DiscoveryAnswerValue = string | string[];
export type DiscoveryAnswers = Record<string, DiscoveryAnswerValue>;
export type DiscoveryNotes = Record<string, string>;

export type DiscoverySummaryItem = {
  id: string;
  label: string;
  answer: string;
  note: string;
};
