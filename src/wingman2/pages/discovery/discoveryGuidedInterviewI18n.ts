// Guided interview localisation — discoveryGuidedInterviewI18n.
//
// The guided interview reads each question aloud and interprets spoken answers
// in the profile capture language (fr-FR, es-ES, de-DE, ...). This module owns
// that language data and — critically — lazy-loads it:
//
//   - English (the always-needed fallback) is statically imported from
//     locales/locale-en.ts, so every lookup can fall back safely.
//   - Every other language table (locales/locale-fr.ts, locale-es.ts, ...)
//     is a separate module pulled in ONLY when the capture language is
//     selected, via loadInterviewLanguage(). The DiscoveryPage chunk therefore
//     ships English by default instead of all twelve languages' phrase data.
//
// Lookup helpers (stopwordsFor, unknownPhrasesFor, curatedPhrasesFor,
// translateInterviewQuestion, guidedVoicePreview) are synchronous and read the
// registry: they return the language's own tables once loaded, and the English
// fallback before that, so interpretation never crashes mid-switch. The
// interview component re-renders when the active language resolves.

import type { DiscoveryQuestion } from "./discoveryTypes";
import type { LanguageTable } from "./locales/localeTypes";
import enTable from "./locales/locale-en";

export type { LanguageTable } from "./locales/localeTypes";

export type InterviewLangId =
  | "en"
  | "fr"
  | "es"
  | "de"
  | "pt"
  | "it"
  | "ru"
  | "zh"
  | "hi"
  | "sv"
  | "nb"
  | "nl";

// Maps a BCP-47 speech language ("fr-FR", "en-GB", "en-IN") to its base id.
export function normalizeInterviewLang(speechLang: string): InterviewLangId {
  const base = speechLang.split("-")[0].toLowerCase();
  if (
    base === "en" || base === "fr" || base === "es" || base === "de" ||
    base === "pt" || base === "it" || base === "ru" || base === "zh" ||
    base === "hi" || base === "sv" || base === "nb" || base === "nl"
  ) {
    return base;
  }
  return "en";
}

// ─── Lazy language registry ─────────────────────────────────────────────────
//
// Each non-English locale is a dynamic import boundary, so Vite emits it as
// its own chunk (fetched only when loadInterviewLanguage is called for it).
// The lookup helpers below read LOADED synchronously and fall back to English
// until the language arrives.

const LOCALE_LOADERS: Record<string, () => Promise<{ default: LanguageTable }>> = {
  fr: () => import("./locales/locale-fr"),
  es: () => import("./locales/locale-es"),
  de: () => import("./locales/locale-de"),
  pt: () => import("./locales/locale-pt"),
  it: () => import("./locales/locale-it"),
  nl: () => import("./locales/locale-nl"),
  sv: () => import("./locales/locale-sv"),
  nb: () => import("./locales/locale-nb"),
  ru: () => import("./locales/locale-ru"),
  zh: () => import("./locales/locale-zh"),
  hi: () => import("./locales/locale-hi"),
};

const LOADED: Partial<Record<InterviewLangId, LanguageTable>> = { en: enTable };
const LOADING: Partial<Record<InterviewLangId, Promise<LanguageTable>>> = {};

/** Loads (and caches) the phrase/stem tables for a capture language. */
export function loadInterviewLanguage(
  lang: InterviewLangId | string,
): Promise<LanguageTable> {
  const id = normalizeInterviewLang(lang);
  if (id === "en") return Promise.resolve(enTable);
  const cached = LOADED[id];
  if (cached) return Promise.resolve(cached);
  LOADING[id] ??= LOCALE_LOADERS[id]().then((module) => {
    const table = module.default;
    LOADED[id] = table;
    return table;
  });
  return LOADING[id]!;
}

/** True once a language's tables are in the registry (English always is). */
export function isInterviewLanguageLoaded(
  lang: InterviewLangId | string,
): boolean {
  return normalizeInterviewLang(lang) === "en" || Boolean(LOADED[normalizeInterviewLang(lang)]);
}

/**
 * Prefetch hint for a capture language's locale chunk.
 *
 * Schedules the dynamic import on the browser's idle callback, so the chunk
 * fetch starts during the Discovery page's idle time rather than only when the
 * interview (or its entry card) first needs it. English and already-loaded
 * languages are no-ops. Where requestIdleCallback is unavailable (older
 * browsers, jsdom) it falls back to a deferred setTimeout — still after the
 * current task, so it never competes with the initial page render.
 *
 * The prefetch writes straight into the LOADED registry and deliberately never
 * touches the LOADING in-flight map: if the idle fetch fails (offline), it
 * leaves no trace, so the interview's own loadInterviewLanguage call later is
 * a genuinely fresh attempt rather than a re-return of a cached rejection.
 */
export function prefetchInterviewLanguage(
  lang: InterviewLangId | string,
): Promise<void> {
  const id = normalizeInterviewLang(lang);
  if (id === "en" || isInterviewLanguageLoaded(id)) {
    return Promise.resolve();
  }
  const run = () => {
    LOCALE_LOADERS[id]()
      .then((module) => {
        LOADED[id] ??= module.default;
      })
      .catch(() => {
        // Offline / fetch failure: the prefetch leaves nothing cached, and the
        // on-demand loader retries when the interview actually starts —
        // nothing to surface here.
      });
  };
  const windowWithIdle = window as Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => unknown;
  };
  if (typeof windowWithIdle.requestIdleCallback === "function") {
    windowWithIdle.requestIdleCallback(run, { timeout: 2000 });
  } else {
    window.setTimeout(run, 0);
  }
  return Promise.resolve();
}

function tableFor(lang: InterviewLangId): LanguageTable {
  return LOADED[lang] ?? enTable;
}

// Value-keyed lookup for a phrase set: the language table first, then the
// English table so untranslated values still recognise shared AV jargon.
function flattenedPhrases(
  langTable: Record<string, Record<string, string[]>>,
): Record<string, string[]> {
  return Object.values(langTable).reduce<Record<string, string[]>>(
    (acc, byValue) => {
      Object.entries(byValue).forEach(([value, phrases]) => {
        acc[value] = phrases;
      });
      return acc;
    },
    {},
  );
}

const FLATTENED_CACHE: Record<string, Record<string, string[]>> = {
  en: flattenedPhrases(enTable.curated),
};

function flattenedFor(lang: InterviewLangId): Record<string, string[]> {
  const table = LOADED[lang];
  if (table && !FLATTENED_CACHE[lang]) {
    FLATTENED_CACHE[lang] = flattenedPhrases(table.curated);
  }
  return FLATTENED_CACHE[lang] ?? FLATTENED_CACHE.en;
}

export function curatedPhrasesFor(
  value: string,
  lang: InterviewLangId,
): string[] | undefined {
  return flattenedFor(lang)[value] ?? FLATTENED_CACHE.en[value];
}

export function unknownPhrasesFor(lang: InterviewLangId): string[] {
  return tableFor(lang).unknown;
}

export function stopwordsFor(lang: InterviewLangId): ReadonlySet<string> {
  return tableFor(lang).stopwords;
}

// ─── Spoken question stems (TTS) ─────────────────────────────────────────────

type TranslatedQuestionText = { question: string; prompt: string };

// Localised question stem for the capture language. English (or any language
// whose table is not loaded yet) returns the governed English text unchanged.
export function translateInterviewQuestion(
  question: Pick<DiscoveryQuestion, "id" | "question" | "prompt">,
  language: InterviewLangId | string = "en",
): TranslatedQuestionText {
  const lang = normalizeInterviewLang(language);
  const table = tableFor(lang).questionTranslations?.[question.id];
  if (!table) {
    return { question: question.question, prompt: question.prompt };
  }
  return {
    question: table.question || question.question,
    prompt: table.prompt || question.prompt,
  };
}

// ─── Voice preview + spoken-language options ────────────────────────────────
//
// The interview can switch the spoken language mid-call without touching the
// stored profile capture language. The preview sample lets the rep hear the
// selected voice before the questions are read, and the options list feeds the
// header control.

// The languages the spoken toggle can switch to, in display order.
export const SPOKEN_LANGUAGE_OPTIONS: { lang: InterviewLangId; label: string }[] = [
  { lang: "en", label: "English" },
  { lang: "fr", label: "Français" },
  { lang: "es", label: "Español" },
  { lang: "de", label: "Deutsch" },
  { lang: "pt", label: "Português" },
  { lang: "it", label: "Italiano" },
  { lang: "nl", label: "Nederlands" },
  { lang: "sv", label: "Svenska" },
  { lang: "nb", label: "Norsk" },
  { lang: "ru", label: "Русский" },
  { lang: "zh", label: "中文" },
  { lang: "hi", label: "हिन्दी" },
];

// Short sample phrase in the given language, for the header voice preview.
// Unknown or not-yet-loaded languages fall back to English.
export function guidedVoicePreview(language: InterviewLangId | string = "en"): string {
  return tableFor(normalizeInterviewLang(language)).voicePreview ?? enTable.voicePreview ?? "";
}
