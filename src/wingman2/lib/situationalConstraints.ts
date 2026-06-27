// Situational option constraints.
//
// As a salesperson answers the Discovery questions, Wingman should stop offering
// options that do not fit what we already know. Pick "Hospitality / bar / venue"
// and Wingman should de-emphasise "1 display" and "Same content on all displays";
// pick "Distributed AV / AV-over-IP" and it should stop steering toward a single
// source/display local job. The same logic also feeds the Finder so the product
// paths it surfaces match the captured context.
//
// This module is the single source of truth for that behaviour. It is intentionally
// pure data + pure functions so both the Discovery UI and the Finder can consume it,
// and so the rules are easy to unit-test and extend.
//
// Rules are CUMULATIVE: every answer captured so far can narrow the remaining
// options (e.g. once "9+ displays" is chosen, "Same content on all displays" becomes
// unlikely; once "1 display" is chosen, "Different content by display" becomes
// impossible). We never HIDE an option - the salesperson may still be capturing an
// unusual customer requirement - we only de-emphasise the unlikely ones and highlight
// the likely ones, with a suggested default where the context is strong.

export type OptionRelevance = "recommended" | "unlikely" | "neutral";

// questionId -> selected option value. Values match the Discovery question option
// `value`s in DiscoveryPage.tsx and the avoip-profile question.
export type DiscoveryAnswers = Record<string, string | undefined>;

type ConstraintEffect = {
  // Option values to highlight as the likely fit for the captured context.
  recommend?: string[];
  // Option values to de-emphasise because they are an uncommon fit for what we know
  // (soft signal: a "recommend" from a more specific rule can rescue them).
  unlikely?: string[];
  // Option values that are logically impossible given what we know (hard signal:
  // e.g. independent routing with a single display). Exclusion always wins over a
  // recommendation, so an application preference cannot bring an impossible option
  // back.
  exclude?: string[];
  // A single option value to pre-select when nothing has been chosen yet and the
  // context makes one answer the obvious starting point.
  suggestedDefault?: string;
};

type ConstraintRule = {
  id: string;
  // Short, plain-language reason shown to the rep ("Sports bars route different
  // content to many screens"). Surfaced on de-emphasised options as a tooltip.
  reason: string;
  // Fires when the answers captured so far match.
  when: (answers: DiscoveryAnswers) => boolean;
  // Per-question effects to apply when the rule fires.
  effects: Record<string, ConstraintEffect>;
};

// --- helpers ----------------------------------------------------------------

const is = (answers: DiscoveryAnswers, questionId: string, ...values: string[]) =>
  values.includes(answers[questionId] ?? "");

const OPPORTUNITY = "opportunity";
const SCALE = "scale";
const SOURCES = "sources";
const DISPLAYS = "displays";
const DISPLAY_BEHAVIOUR = "display-behaviour";

// --- rules ------------------------------------------------------------------
// Each rule is independent; the engine merges every firing rule's effects. A
// "recommend" always wins over an "unlikely" for the same option, so a later, more
// specific rule can rescue an option an application-level rule de-emphasised.

const RULES: ConstraintRule[] = [
  // ---- Application (opportunity) shapes the whole job -----------------------
  {
    id: "meeting-room",
    reason: "Meeting rooms are usually a single space with a few sources and one or two displays.",
    when: (a) => is(a, OPPORTUNITY, "meeting-room"),
    effects: {
      [SCALE]: { recommend: ["single-small-room", "single-large-room"], unlikely: ["multi-room", "building-wide"] },
      [SOURCES]: { recommend: ["one-source", "two-four-sources"], unlikely: ["nine-plus-sources"] },
      [DISPLAYS]: { recommend: ["one-display", "two-displays"], unlikely: ["nine-plus-displays", "video-wall-output"] },
      [DISPLAY_BEHAVIOUR]: { recommend: ["same-content-all-displays"], unlikely: ["video-wall-or-processor-feed", "independent-routing-per-display"] },
      "source-connection": { recommend: ["mixed-hdmi-usbc", "laptops-wireless-inputs"] },
      usb: { recommend: ["byod-byom", "room-pc-uc", "usb-camera-audio"], unlikely: ["no-usb"] },
      audio: { recommend: ["mic-conferencing", "room-audio"] },
      control: { recommend: ["touch-panel", "simple-auto"], unlikely: ["third-party-control"] },
    },
  },
  {
    id: "classroom",
    reason: "Teaching rooms are a single space with lectern sources and one display or projector.",
    when: (a) => is(a, OPPORTUNITY, "classroom"),
    effects: {
      [SCALE]: { recommend: ["single-small-room", "single-large-room"], unlikely: ["multi-room", "building-wide"] },
      [SOURCES]: { recommend: ["one-source", "two-four-sources"], unlikely: ["nine-plus-sources"] },
      [DISPLAYS]: { recommend: ["one-display", "two-displays"], unlikely: ["nine-plus-displays", "video-wall-output"] },
      [DISPLAY_BEHAVIOUR]: { recommend: ["same-content-all-displays"], unlikely: ["video-wall-or-processor-feed", "independent-routing-per-display"] },
      distance: { recommend: ["10-35m", "35-70m"] },
      audio: { recommend: ["room-audio", "mic-conferencing"] },
      control: { recommend: ["simple-auto", "front-panel-remote"] },
    },
  },
  {
    id: "hospitality",
    reason: "Bars and venues route different content to many screens across zones.",
    when: (a) => is(a, OPPORTUNITY, "hospitality"),
    effects: {
      [SCALE]: { recommend: ["single-large-room", "multi-room"], unlikely: ["single-small-room"] },
      [SOURCES]: { recommend: ["two-four-sources", "five-eight-sources", "nine-plus-sources"], unlikely: ["one-source"], suggestedDefault: "five-eight-sources" },
      [DISPLAYS]: { recommend: ["three-eight-displays", "nine-plus-displays"], unlikely: ["one-display", "two-displays"], suggestedDefault: "three-eight-displays" },
      [DISPLAY_BEHAVIOUR]: { recommend: ["independent-routing-per-display", "multiview-on-one-output"], unlikely: ["same-content-all-displays"], suggestedDefault: "independent-routing-per-display" },
      "source-connection": { recommend: ["fixed-hdmi-sources"] },
      usb: { recommend: ["no-usb"], unlikely: ["byod-byom", "room-pc-uc"] },
      audio: { recommend: ["room-audio"] },
      control: { recommend: ["simple-auto", "touch-panel", "front-panel-remote"] },
    },
  },
  {
    id: "video-wall",
    reason: "A video wall is a processor or multiview canvas, not a set of independent screens.",
    when: (a) => is(a, OPPORTUNITY, "video-wall"),
    effects: {
      [DISPLAYS]: { recommend: ["video-wall-output"], unlikely: ["one-display", "two-displays"], suggestedDefault: "video-wall-output" },
      [DISPLAY_BEHAVIOUR]: { recommend: ["video-wall-or-processor-feed", "multiview-on-one-output"], unlikely: ["same-content-all-displays", "independent-routing-per-display"], suggestedDefault: "video-wall-or-processor-feed" },
      [SOURCES]: { recommend: ["two-four-sources", "five-eight-sources"], unlikely: ["one-source"] },
      usb: { recommend: ["no-usb"], unlikely: ["byod-byom"] },
    },
  },
  {
    id: "av-over-ip",
    reason: "AV-over-IP is for routing many sources to many displays across a site.",
    when: (a) => is(a, OPPORTUNITY, "av-over-ip"),
    effects: {
      [SCALE]: { recommend: ["single-large-room", "multi-room", "building-wide"], unlikely: ["single-small-room"] },
      [SOURCES]: { recommend: ["five-eight-sources", "nine-plus-sources"], unlikely: ["one-source"], suggestedDefault: "five-eight-sources" },
      [DISPLAYS]: { recommend: ["three-eight-displays", "nine-plus-displays"], unlikely: ["one-display"], suggestedDefault: "three-eight-displays" },
      [DISPLAY_BEHAVIOUR]: { recommend: ["independent-routing-per-display", "multiview-on-one-output"], unlikely: ["same-content-all-displays"] },
      distance: { recommend: ["35-70m", "70-100m-plus"] },
      infrastructure: { recommend: ["managed-network", "new-cabling-needed"], unlikely: ["short-hdmi"] },
    },
  },

  // ---- Cumulative cross-answer rules ---------------------------------------
  // These refine the remaining options from answers already given, regardless of
  // the application, so the questions stay internally consistent.
  {
    id: "single-small-room-narrows-scale",
    reason: "A single small room will not have a large source or display count.",
    when: (a) => is(a, SCALE, "single-small-room"),
    effects: {
      [SOURCES]: { unlikely: ["nine-plus-sources"] },
      [DISPLAYS]: { unlikely: ["nine-plus-displays", "video-wall-output"] },
    },
  },
  {
    id: "multi-room-narrows",
    reason: "Across several rooms or a whole site, content is routed, not mirrored to one screen.",
    when: (a) => is(a, SCALE, "multi-room", "building-wide"),
    effects: {
      [DISPLAYS]: { unlikely: ["one-display"] },
      [DISPLAY_BEHAVIOUR]: { recommend: ["independent-routing-per-display"], unlikely: ["same-content-all-displays"] },
    },
  },
  {
    id: "one-display-cannot-route-independently",
    reason: "With a single display there is nothing to route independently to.",
    when: (a) => is(a, DISPLAYS, "one-display"),
    effects: {
      [DISPLAY_BEHAVIOUR]: { recommend: ["same-content-all-displays"], exclude: ["independent-routing-per-display", "video-wall-or-processor-feed"] },
    },
  },
  {
    id: "video-wall-output-sets-behaviour",
    reason: "A video wall / LED processor output drives a wall-processing or multiview path.",
    when: (a) => is(a, DISPLAYS, "video-wall-output"),
    effects: {
      [DISPLAY_BEHAVIOUR]: { recommend: ["video-wall-or-processor-feed", "multiview-on-one-output"], unlikely: ["same-content-all-displays"] },
    },
  },
  {
    id: "many-displays-not-mirrored",
    reason: "Once there are many displays, the job is almost always independent routing, not one mirrored source.",
    when: (a) => is(a, DISPLAYS, "nine-plus-displays") || is(a, SOURCES, "nine-plus-sources"),
    effects: {
      [DISPLAY_BEHAVIOUR]: { unlikely: ["same-content-all-displays"] },
      [SCALE]: { unlikely: ["single-small-room"] },
    },
  },
  {
    id: "one-source-no-multiview",
    reason: "Multiview composes several sources onto one screen, so it needs more than one source.",
    when: (a) => is(a, SOURCES, "one-source"),
    effects: {
      [DISPLAY_BEHAVIOUR]: { exclude: ["multiview-on-one-output"], recommend: ["same-content-all-displays"] },
    },
  },
  {
    id: "mirrored-is-distribution",
    reason: "Showing the same content everywhere is a distribution job, not a routing one.",
    when: (a) => is(a, DISPLAY_BEHAVIOUR, "same-content-all-displays"),
    effects: {
      [SOURCES]: { recommend: ["one-source", "two-four-sources"] },
    },
  },
];

// --- engine -----------------------------------------------------------------

export type QuestionConstraint = {
  recommend: Set<string>;
  // De-emphasised options (soft "uncommon" plus hard "impossible"). What the UI greys.
  unlikely: Set<string>;
  // The subset of `unlikely` that is logically impossible (the UI may grey these more
  // strongly or block selection if it ever chooses to).
  excluded: Set<string>;
  suggestedDefault?: string;
  // optionValue -> short reason, for de-emphasised options.
  reasons: Record<string, string>;
};

/**
 * Merge every firing rule into a per-question constraint set for the given answers.
 * Precedence: a hard `exclude` always wins; otherwise a `recommend` wins over a soft
 * `unlikely`.
 */
export function situationalConstraints(answers: DiscoveryAnswers): Record<string, QuestionConstraint> {
  const out: Record<string, QuestionConstraint> = {};
  const ensure = (qid: string): QuestionConstraint =>
    (out[qid] ??= { recommend: new Set(), unlikely: new Set(), excluded: new Set(), reasons: {} });

  for (const rule of RULES) {
    if (!rule.when(answers)) continue;
    for (const [qid, effect] of Object.entries(rule.effects)) {
      const c = ensure(qid);
      for (const v of effect.recommend ?? []) c.recommend.add(v);
      for (const v of effect.unlikely ?? []) {
        c.unlikely.add(v);
        c.reasons[v] ??= rule.reason;
      }
      for (const v of effect.exclude ?? []) {
        c.excluded.add(v);
        c.unlikely.add(v);
        c.reasons[v] = rule.reason; // a hard reason supersedes a soft one
      }
      // A later rule's default is more specific; let it win.
      if (effect.suggestedDefault) c.suggestedDefault = effect.suggestedDefault;
    }
  }

  for (const c of Object.values(out)) {
    // Hard exclusion beats a recommendation.
    for (const v of c.excluded) c.recommend.delete(v);
    // A surviving recommendation clears a soft de-emphasis.
    for (const v of c.recommend) {
      c.unlikely.delete(v);
      delete c.reasons[v];
    }
  }

  return out;
}

/** Relevance of a single option value for a question, given the answers so far. */
export function optionRelevance(
  questionId: string,
  optionValue: string,
  answers: DiscoveryAnswers,
): OptionRelevance {
  const c = situationalConstraints(answers)[questionId];
  if (!c) return "neutral";
  if (c.recommend.has(optionValue)) return "recommended";
  if (c.unlikely.has(optionValue)) return "unlikely";
  return "neutral";
}

/** Short reason an option is de-emphasised, for a tooltip. Empty if not unlikely. */
export function optionUnlikelyReason(
  questionId: string,
  optionValue: string,
  answers: DiscoveryAnswers,
): string {
  return situationalConstraints(answers)[questionId]?.reasons[optionValue] ?? "";
}

/** The suggested default option value for a question, if the context makes one obvious. */
export function suggestedDefaultOption(questionId: string, answers: DiscoveryAnswers): string | undefined {
  return situationalConstraints(answers)[questionId]?.suggestedDefault;
}

/**
 * True if the captured context has any opinion about this question's options
 * (used by the UI to decide whether to show the "context-aware" affordance).
 */
export function hasSituationalOpinion(questionId: string, answers: DiscoveryAnswers): boolean {
  const c = situationalConstraints(answers)[questionId];
  return Boolean(c && (c.recommend.size > 0 || c.unlikely.size > 0));
}
