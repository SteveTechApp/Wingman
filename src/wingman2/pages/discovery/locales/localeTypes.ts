// Shared shape of a guided-interview language table. Each locale module in
// this directory exports one of these; discoveryGuidedInterviewI18n.ts loads
// them on demand (see loadInterviewLanguage) so the Discovery chunk only ships
// English by default and pulls a language in when the rep selects it.
export type LanguageTable = {
  stopwords: ReadonlySet<string>;
  unknown: string[];
  curated: Record<string, Record<string, string[]>>;
  questionTranslations?: Record<string, { question: string; prompt: string }>;
  voicePreview?: string;
};
