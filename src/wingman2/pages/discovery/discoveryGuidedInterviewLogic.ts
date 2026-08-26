// Guided interview (voice Q&A) support for Discovery.
//
// The guided interview replaces the option-by-option screen with a spoken
// conversation: Wingman reads each question aloud (SpeechSynthesis), the rep
// (or customer) answers through the open microphone (SpeechRecognition), and
// the free-text transcript is interpreted back onto the governed Discovery
// option values while the raw customer wording is kept as the note.
//
// The question list, spoken question stems and the interpretation phrase
// tables are language-aware: matchSpokenAnswer takes the capture language
// (fr-FR, es-ES, de-DE, ...) and uses the per-language stopwords and curated
// phrases from discoveryGuidedInterviewI18n.ts, falling back to English for
// languages without tables yet.
//
// This file holds pure logic + browser API helpers so the behaviour can be
// unit-tested without a browser. The React component lives in
// DiscoveryGuidedInterview.tsx.

import type { DiscoveryAnswers, DiscoveryQuestion } from "./discoveryTypes";
import { getVisibleDiscoveryQuestions } from "./discoveryQuestions";
import {
  wmDiscoveryFilterUnifiedCommsQuestions,
} from "./discoveryAnswerUtils";
import {
  curatedPhrasesFor,
  normalizeInterviewLang,
  stopwordsFor,
  unknownPhrasesFor,
  type InterviewLangId,
} from "./discoveryGuidedInterviewI18n";

export type GuidedAnswerConfidence = "matched" | "partial" | "none";

export type GuidedAnswerMatch = {
  values: string[];
  labels: string[];
  confidence: GuidedAnswerConfidence;
  // Strength of the best-matching option (curated phrases weigh 3, exclusive
  // negatives and unknowns weigh 5, single keyword hits weigh 1). Surfaces use
  // this to show reps how certain the interpretation is.
  score: number;
  matchedKeywords: string[];
};

export type GuidedQuestionListOptions = {
  startAt?: number;
};

// ─── Question list ───────────────────────────────────────────────────────────

// The same visible + UC-filtered question set the standard Discovery flow
// renders, so a rep can switch between the interview and the option screens
// without the two disagreeing about which questions are relevant.
export function buildInterviewQuestions(
  application: string,
  answers: DiscoveryAnswers = {},
): DiscoveryQuestion[] {
  return wmDiscoveryFilterUnifiedCommsQuestions(
    getVisibleDiscoveryQuestions(application, answers),
    answers,
  );
}

// ─── Speech synthesis helpers ────────────────────────────────────────────────

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function stopGuidedSpeech(): void {
  if (!isSpeechSynthesisSupported()) {
    return;
  }
  window.speechSynthesis.cancel();
}

export function speakGuidedText(text: string, lang = "en-GB"): void {
  if (!isSpeechSynthesisSupported() || !text.trim()) {
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 1;
  utterance.pitch = 1;
  const voices = window.speechSynthesis.getVoices();
  const preferred =
    voices.find(
      (voice) => voice.lang.replace("_", "-").toLowerCase() === lang.toLowerCase(),
    ) ??
    voices.find((voice) =>
      voice.lang.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()),
    );
  if (preferred) {
    utterance.voice = preferred;
  }
  window.speechSynthesis.speak(utterance);
}

// ─── Spoken answer interpretation ────────────────────────────────────────────

// "Only X" markers per language, used to trim multi-select answers down to a
// single deliberate pick ("just mics", "solo micros", "nur mikrofone").
const ONLY_PATTERNS: Record<string, RegExp> = {
  en: /(^|\s)(only|just)\s/,
  fr: /(^|\s)(seulement|uniquement|juste)\s/,
  es: /(^|\s)(solo|solamente|únicamente|unicamente)\s/,
  de: /(^|\s)(nur)\s/,
  pt: /(^|\s)(só|so|somente|apenas)\s/,
  it: /(^|\s)(solo|soltanto|unicamente|solamente)\s/,
  nl: /(^|\s)(alleen|slechts|enkel)\s/,
  sv: /(^|\s)(bara|endast)\s/,
  nb: /(^|\s)(bare|kun)\s/,
  ru: /(^|\s)(только)\s/,
  // CJK has no word spaces: anchor on utterance start or punctuation, or a
  // verb following the marker (只要/只有/只需要/仅有 …). The trim only fires
  // when several options matched, so this stays a deliberate-collapse aid.
  zh: /(^|[，。！？、；：\s])(只|仅)|只(要|有|需要|用)|仅(有|需|要|用)/,
  hi: /(^|\s)(केवल|सिर्फ|बस)\s/,
};

function tokenize(text: string, lang: InterviewLangId): string[] {
  const stopwords = stopwordsFor(lang);
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 1 && !stopwords.has(word));
}

function keywordMatches(token: string, keyword: string): boolean {
  if (token === keyword) return true;
  // "screens" matches "screen", "microphone" matches "mic"
  if (keyword.length >= 3 && token.startsWith(keyword)) return true;
  // "4k" matches "4k60", "hd" matches "hdmi"
  if (token.length >= 2 && keyword.startsWith(token)) return true;
  return false;
}

function buildOptionProfile(
  option: DiscoveryQuestion["options"][number],
  lang: InterviewLangId,
): {
  value: string;
  keywords: Set<string>;
  phrases: Array<{ text: string; weight: number }>;
} {
  const keywords = new Set<string>();
  option.value.split("-").forEach((part) => {
    if (part.length > 1) keywords.add(part);
  });
  `${option.label} ${option.help ?? ""}`
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .forEach((word) => {
      if (word.length > 1 && !stopwordsFor(lang).has(word)) keywords.add(word);
    });

  const phrases: Array<{ text: string; weight: number }> = [];
  const curated = curatedPhrasesFor(option.value, lang);
  if (curated) {
    curated.forEach((phrase) => {
      const weight = phrase.startsWith("no ") || phrase === "none" ? 5 : 3;
      phrases.push({ text: phrase, weight });
    });
  }
  if (option.value.startsWith("no-")) {
    const natural = option.value.replace(/-/g, " ");
    if (!phrases.some((phrase) => phrase.text === natural)) {
      phrases.push({ text: natural, weight: 5 });
    }
  }
  if (option.value.startsWith("unknown-")) {
    unknownPhrasesFor(lang).forEach((phrase) => {
      if (!phrases.some((existing) => existing.text === phrase)) {
        phrases.push({ text: phrase, weight: 5 });
      }
    });
  }

  return { value: option.value, keywords, phrases };
}

export function matchSpokenAnswer(
  question: DiscoveryQuestion,
  transcript: string,
  language: InterviewLangId | string = "en",
): GuidedAnswerMatch {
  const lang = normalizeInterviewLang(language);
  const text = transcript.trim().toLowerCase();
  if (!text) {
    return { values: [], labels: [], confidence: "none", score: 0, matchedKeywords: [] };
  }

  const tokens = tokenize(text, lang);
  const profiles = question.options.map((option) => buildOptionProfile(option, lang));

  // Drop keywords that appear in too many options of the same question — they
  // cannot discriminate ("usb" appears in most usb options, "camera" in most
  // camera options) and would make every answer look like a match.
  const optionCount = Math.max(profiles.length, 1);
  const keywordFrequency = new Map<string, number>();
  profiles.forEach((profile) => {
    profile.keywords.forEach((keyword) => {
      keywordFrequency.set(keyword, (keywordFrequency.get(keyword) ?? 0) + 1);
    });
  });

  const scores = profiles.map((profile) => {
    let score = 0;
    const matchedKeywords: string[] = [];
    profile.phrases.forEach((phrase) => {
      if (text.includes(phrase.text)) {
        score += phrase.weight;
        matchedKeywords.push(phrase.text);
      }
    });
    profile.keywords.forEach((keyword) => {
      if ((keywordFrequency.get(keyword) ?? 0) > optionCount / 2) return;
      if (tokens.some((token) => keywordMatches(token, keyword))) {
        score += 1;
        matchedKeywords.push(keyword);
      }
    });
    return { value: profile.value, score, matchedKeywords };
  });

  const unknownHints = unknownPhrasesFor(lang).some((phrase) =>
    text.includes(phrase),
  );
  const capped = unknownHints
    ? scores.map((entry) => ({
        ...entry,
        score: entry.value.startsWith("unknown-") ? entry.score + 5 : entry.score,
      }))
    : scores;

  const isMulti = question.selectionMode === "multiple";
  const best = capped.reduce((max, entry) =>
    entry.score > max.score ? entry : max,
  );

  let selected = isMulti
    ? capped
        .filter((entry) => entry.score > 0)
        .sort((left, right) => right.score - left.score)
    : best.score > 0
      ? [best]
      : [];

  // A clear negative or unknown answer is exclusive: "no usb" must not also
  // select a USB ownership option, and "no cameras or microphones" must not
  // also select "microphones only". When a strong curated phrase matched
  // (score >= 3), weaker keyword-only hits are interpretation noise rather
  // than a deliberate second answer.
  if (isMulti && selected.length > 1) {
    const top = selected[0];
    if (top.value.startsWith("no-") || top.value.startsWith("unknown-")) {
      selected = [top];
    } else if (top.score >= 3) {
      selected = selected.filter((entry) => entry.score >= 3);
    }
  }

  let values = selected.map((entry) => entry.value);
  const onlyPattern = ONLY_PATTERNS[lang] ?? ONLY_PATTERNS.en;
  if (isMulti && onlyPattern.test(text) && values.length > 1) {
    values = values.slice(0, 1);
  }

  const highest = best.score;
  const confidence: GuidedAnswerConfidence =
    highest >= 3 ? "matched" : highest > 0 ? "partial" : "none";

  const labels = values.map(
    (value) =>
      question.options.find((option) => option.value === value)?.label ?? value,
  );

  return {
    values,
    labels,
    confidence,
    score: highest,
    matchedKeywords: Array.from(
      new Set(selected.flatMap((entry) => entry.matchedKeywords)),
    ).slice(0, 8),
  };
}
