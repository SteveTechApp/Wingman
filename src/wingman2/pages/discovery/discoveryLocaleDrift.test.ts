// Guards the guided-interview language tables against drift FROM the
// canonical question set. The completeness suite in
// discoveryGuidedInterviewI18n.test.ts pins canonical -> locale (every core
// option must have phrases in every language); nothing pinned the reverse
// direction: a locale table could keep interpreting a question or option that
// the canonical model renamed or removed, and a translation could silently
// diverge from the option surface the English table interprets. locale-en is
// the base/fallback interpretation table and locale-de the highest-fidelity
// translation, so both are pinned here against the real question model
// (discoveryQuestions.ts, not a hand-maintained copy) plus each other. Every
// OTHER language table is pinned the same way: its curated keys must resolve
// to canonical questions/options and its questionTranslations must resolve to
// canonical questions with non-empty copy, so any language falling behind the
// canonical option set fails CI rather than silently mislabelling free text.

import { describe, expect, it } from "vitest";
import { canonicalDiscoveryQuestions } from "./discoveryQuestions";
import en from "./locales/locale-en";
import de from "./locales/locale-de";
import es from "./locales/locale-es";
import fr from "./locales/locale-fr";
import hi from "./locales/locale-hi";
import itLang from "./locales/locale-it";
import nb from "./locales/locale-nb";
import nl from "./locales/locale-nl";
import pt from "./locales/locale-pt";
import ru from "./locales/locale-ru";
import sv from "./locales/locale-sv";
import zh from "./locales/locale-zh";

// Every supported guided-interview language table. The phrase-uniqueness
// guarantee is per language: a collision in ONE language already makes
// classification ambiguous there, so each table is checked independently.
const LOCALE_TABLES = [
  ["en", en],
  ["de", de],
  ["es", es],
  ["fr", fr],
  ["hi", hi],
  ["it", itLang],
  ["nb", nb],
  ["nl", nl],
  ["pt", pt],
  ["ru", ru],
  ["sv", sv],
  ["zh", zh],
] as const;

const canonicalById = new Map(canonicalDiscoveryQuestions.map((question) => [question.id, question]));
const canonicalOptions = new Map(
  canonicalDiscoveryQuestions.map((question) => [question.id, new Set(question.options.map((option) => option.value))]),
);

type LocaleTableShape = {
  curated: Record<string, Record<string, string[]>>;
  questionTranslations?: Record<string, { question: string; prompt: string }>;
};

// The locale analog of the canonical per-label uniqueness rule: within ONE
// language, no two questions may interpret DIFFERENT option sets through an
// IDENTICAL translated phrase inventory — spoken/free-text capture then cannot
// tell them apart. Phrase sets are case-folded and de-duplicated; questions
// with no phrases cannot collide meaningfully and are skipped.
function collectIdenticalPhraseSetProblems(lang: string, curated: Record<string, Record<string, string[]>>): string[] {
  const problems: string[] = [];
  const phraseSetByQuestion = new Map<string, string[]>();
  for (const [questionId, values] of Object.entries(curated)) {
    const phrases = Array.from(
      new Set(
        Object.values(values)
          .flat()
          .map((phrase) => phrase.trim().toLowerCase())
          .filter(Boolean),
      ),
    ).sort();
    if (phrases.length === 0) continue;
    phraseSetByQuestion.set(questionId, phrases);
  }

  const byPhrases = new Map<string, string[]>();
  for (const [questionId, phrases] of phraseSetByQuestion) {
    const key = phrases.join("\u0000");
    const same = byPhrases.get(key);
    if (same) {
      problems.push(
        `${lang}: questions "${same.join(", ")}" and "${questionId}" share an identical ` +
          `translated option phrase set (${phrases.length} phrase${phrases.length === 1 ? "" : "s"}: ${phrases.join(", ")})`,
      );
    } else {
      byPhrases.set(key, [questionId]);
    }
  }
  return problems;
}

function collectTranslationProblems(
  lang: string,
  translations: Record<string, { question: string; prompt: string }>,
): string[] {
  const problems: string[] = [];
  for (const [questionId, entry] of Object.entries(translations)) {
    if (!canonicalById.has(questionId)) {
      problems.push(`${lang} translates question "${questionId}" which is not in the canonical question set`);
      continue;
    }
    if (!entry.question.trim()) problems.push(`${lang} question "${questionId}" has an empty translated question`);
    if (!entry.prompt.trim()) problems.push(`${lang} question "${questionId}" has an empty translated prompt`);
  }
  return problems;
}

function collectCuratedProblems(lang: string, curated: Record<string, Record<string, string[]>>): string[] {
  const problems: string[] = [];
  for (const [questionId, values] of Object.entries(curated)) {
    const canonical = canonicalById.get(questionId);
    if (!canonical) {
      problems.push(`${lang}: curated interprets question "${questionId}" which is not in the canonical question set`);
      continue;
    }
    const options = canonicalOptions.get(questionId)!;
    for (const value of Object.keys(values)) {
      if (!options.has(value)) {
        problems.push(
          `${lang}: curated ${questionId} interprets option "${value}" which is not a canonical option ` +
            `(canonical: ${[...options].join(", ")})`,
        );
      }
    }
  }
  return problems;
}

describe("discovery locale tables stay pinned to the canonical question set", () => {
  for (const [lang, table] of LOCALE_TABLES) {
    it(`locale-${lang} curated keys resolve to canonical questions and their option values`, () => {
      expect(collectCuratedProblems(`locale-${lang}`, (table as LocaleTableShape).curated)).toEqual([]);
    });
  }

  it("locale-en and locale-de interpret exactly the same option values for every shared question", () => {
    // German falls back to the English table for whole questions it has not
    // localised (en.curated has extra ids), but for a question BOTH tables
    // interpret, the value surface must match exactly: an option added to the
    // English table must reach the German table (silent English fallback is
    // drift), and a stale German-only option means the translation references
    // something the English interpretation no longer covers.
    const problems: string[] = [];
    for (const [questionId, enValues] of Object.entries(en.curated)) {
      const deValues = de.curated[questionId];
      if (!deValues) continue; // English-only fallback question, not localised in de
      const onlyEn = Object.keys(enValues).filter((value) => !(value in deValues));
      const onlyDe = Object.keys(deValues).filter((value) => !(value in enValues));
      if (onlyEn.length > 0) {
        problems.push(`locale-de is missing interpretation for ${questionId}/${onlyEn.join(", ")} (present in locale-en)`);
      }
      if (onlyDe.length > 0) {
        problems.push(`locale-de interprets ${questionId}/${onlyDe.join(", ")} which locale-en no longer covers`);
      }
    }
    expect(problems).toEqual([]);
  });

  it("no question's full translated option phrase set equals another's in ANY supported language", () => {
    const problems: string[] = [];
    for (const [lang, table] of LOCALE_TABLES) {
      problems.push(...collectIdenticalPhraseSetProblems(lang, table.curated));
    }
    expect(problems).toEqual([]);
  });

  it("flags a planted identical phrase set between two questions", () => {
    // Negative control: two questions interpreting different option values
    // through the same phrase inventory must be reported, so a copy-paste in
    // one locale cannot sail through the real-data check.
    const planted: Record<string, Record<string, string[]>> = {
      "displays": { "one-display": ["one screen"], "two-displays": ["two screens"] },
      "uc-camera-count": { "one-camera": ["one screen"], "two-cameras": ["two screens"] },
    };
    expect(collectIdenticalPhraseSetProblems("planted", planted)).toEqual([
      'planted: questions "displays" and "uc-camera-count" share an identical translated option phrase set (2 phrases: one screen, two screens)',
    ]);
  });

  for (const [lang, table] of LOCALE_TABLES) {
    const translations = (table as LocaleTableShape).questionTranslations;
    if (!translations) continue; // locale-en is the base table and has no translations
    it(`locale-${lang} questionTranslations resolve to canonical questions with non-empty labels`, () => {
      expect(collectTranslationProblems(`locale-${lang}`, translations)).toEqual([]);
    });
  }

  it("flags a planted stale curated key and unknown question id", () => {
    // Negative control for the per-language curated pin: a curated table that
    // interprets a renamed option or a removed question must be reported, so
    // the real-data loop cannot go green vacuously.
    const planted: Record<string, Record<string, string[]>> = {
      displays: {
        "one-display": ["one screen"],
        "renamed-display-option": ["some screens"],
      },
      "question-that-no-longer-exists": {
        "some-value": ["phrase"],
      },
    };
    const problems = collectCuratedProblems("planted", planted);
    expect(problems).toHaveLength(2);
    expect(problems[0]).toContain('interprets option "renamed-display-option"');
    expect(problems[1]).toContain('interprets question "question-that-no-longer-exists"');
  });

  it("flags a planted unknown question and empty translation copy", () => {
    // Negative control for the per-language translation pin: an id outside the
    // canonical set or an empty translated question/prompt must be reported.
    const planted = {
      "uc-purpose": { question: "Was brauchen Sie?", prompt: "Wählen Sie alles Zutreffende." },
      "question-that-no-longer-exists": { question: "Gibt es das noch?", prompt: "Bestätigen." },
      displays: { question: "", prompt: "" },
    };
    const problems = collectTranslationProblems("planted", planted);
    expect(problems).toHaveLength(3);
    expect(problems[0]).toContain('translates question "question-that-no-longer-exists"');
    expect(problems[1]).toContain('displays" has an empty translated question');
    expect(problems[2]).toContain('displays" has an empty translated prompt');
  });
});
