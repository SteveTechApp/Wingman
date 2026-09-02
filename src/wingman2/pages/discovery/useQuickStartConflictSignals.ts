// Owns the quick-start CONFLICT signals for the Discovery page: provenance of
// the applied seed, the stranded-default list, the post-seed application
// drift, and the two resolution actions (jump to the owning step / remove the
// hidden answers). Lives in discovery/ so DiscoveryPage.tsx stays an
// orchestrator instead of owning this logic inline (its size budget is
// tracked by tools/check-size-budgets.mjs).
//
// The stranded list derives from the current answers PLUS the persisted
// applied-defaults record (which default the app applied per question): a
// stored value whose option the interview no longer offers is only an
// untouched quick-start default when the app recorded that value for the
// question and the answer still equals it — otherwise it is a rep-typed
// answer that must not be silently bulk-removed. The drift additionally needs
// the seed provenance: which application the quick start was applied for, and
// the exact answers it wrote — an untouched answer that still disagrees with
// the CURRENT application's standard profile belongs to the old profile.

import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { findStrandedQuickStartDefaults, removeDiscoveryAnswerValue, wmDiscoveryAnswerToText } from "./discoveryAnswerUtils";
import { findQuickStartApplicationDrift } from "./discoveryQuickStart";
import type { DiscoveryAnswers, DiscoveryQuestion } from "./discoveryTypes";

export type DiscoveryQuickStartConflictSignals = {
  /** Records the seed provenance + applied defaults and applies the answers. */
  applyQuickStartSeeded: (seeded: DiscoveryAnswers) => void;
  strandedQuickStart: ReturnType<typeof findStrandedQuickStartDefaults>;
  quickStartDrift: {
    previousApplication: string;
    application: string;
    items: ReturnType<typeof findQuickStartApplicationDrift>;
  } | null;
  /** Jump the interview to the step owning a stranded or drifted default. */
  openStrandedStep: (questionId: string) => void;
  /** Clear every hidden default from the answers at once. */
  removeStrandedQuickStart: () => void;
};

export function useQuickStartConflictSignals(options: {
  /** Full visible question set (expert mode) — the stranded scan target. */
  discoveryQuestions: DiscoveryQuestion[];
  /** Questions visible in the current mode (Basic shows fewer). */
  modeQuestions: DiscoveryQuestion[];
  progressiveMode: "basic" | "expert";
  answers: DiscoveryAnswers;
  setAnswers: (updater: DiscoveryAnswers | ((previous: DiscoveryAnswers) => DiscoveryAnswers)) => void;
  /**
   * Which value the app applied per question (quick-start seed, template
   * pre-fill, smart defaults). Persisted with the discovery draft so stranded
   * detection can tell untouched quick-start values from rep-typed answers
   * across reloads. Empty when nothing has been applied by the app yet.
   */
  appliedDefaults: Partial<DiscoveryAnswers>;
  /** Records which values the app applied (same shape as `appliedDefaults`). */
  onAppliedDefaultsChange: Dispatch<SetStateAction<Partial<DiscoveryAnswers>>>;
  setActiveIndex: (index: number) => void;
  setIsReviewingAnswers: (value: boolean) => void;
  setPendingEscalation: (questionId: string | null) => void;
}): DiscoveryQuickStartConflictSignals {
  const {
    discoveryQuestions,
    modeQuestions,
    progressiveMode,
    answers,
    setAnswers,
    appliedDefaults,
    onAppliedDefaultsChange,
    setActiveIndex,
    setIsReviewingAnswers,
    setPendingEscalation,
  } = options;

  const [quickStartSeed, setQuickStartSeed] = useState<{ application: string; answers: DiscoveryAnswers } | null>(null);

  const selectedApplication = wmDiscoveryAnswerToText(answers.opportunity);

  const applyQuickStartSeeded = useCallback(
    (seeded: DiscoveryAnswers) => {
      setQuickStartSeed({ application: wmDiscoveryAnswerToText(seeded.opportunity), answers: seeded });
      // Record which values the app just applied at the same moment the
      // answers land, so stranded detection can distinguish untouched
      // quick-start pre-fills (safe to bulk-remove) from rep-typed answers.
      onAppliedDefaultsChange((previous) => ({ ...previous, ...seeded }));
      setAnswers(seeded);
    },
    [onAppliedDefaultsChange, setAnswers],
  );

  // Quick-start defaults stranded by a later answer (a stored value whose
  // option the interview no longer offers). Computed across the FULL visible
  // set so the conflict shows in the summary card and completion panel even
  // when the owning step is no longer the one being edited. The applied
  // defaults record decides each entry's origin: a value the app applied and
  // the rep never changed is an untouched quick-start default; anything else
  // is a rep-typed answer that must not be bulk-removed.
  const strandedQuickStart = useMemo(
    () => findStrandedQuickStartDefaults(discoveryQuestions, answers, appliedDefaults),
    [discoveryQuestions, answers, appliedDefaults],
  );

  // Answers seeded for a room profile that no longer match after the
  // opportunity answer changed applications — surfaced in the summary card and
  // completion panel exactly like stranded defaults.
  const quickStartDrift = useMemo(() => {
    if (!quickStartSeed) return null;
    const items = findQuickStartApplicationDrift(quickStartSeed, answers, selectedApplication);
    if (items.length === 0) return null;
    return {
      previousApplication: quickStartSeed.application,
      application: selectedApplication,
      items,
    };
  }, [answers, quickStartSeed, selectedApplication]);

  const openStrandedStep = useCallback(
    (questionId: string) => {
      const index = modeQuestions.findIndex((question) => question.id === questionId);
      if (index >= 0) {
        setActiveIndex(index);
        setIsReviewingAnswers(false);
        return;
      }
      if (progressiveMode === "basic" && discoveryQuestions.some((question) => question.id === questionId)) {
        // The step lives outside Basic mode — reuse the existing escalation
        // confirmation so the rep decides before switching modes.
        setPendingEscalation(questionId);
      }
    },
    [discoveryQuestions, modeQuestions, progressiveMode, setActiveIndex, setIsReviewingAnswers, setPendingEscalation],
  );

  // "Remove stranded answers": clear every UNTOUCHED app-applied default
  // whose option the interview no longer offers. Rep-typed stranded answers
  // (values the rep chose/edited themselves) are deliberately left in place —
  // silently discarding the rep's own answer would destroy data, so those rows
  // are resolved by re-opening the owning step instead. The stranded list
  // recomputes from answers, so the notice disappears as soon as the values
  // are gone.
  const removeStrandedQuickStart = useCallback(() => {
    const untouchedDefaults = strandedQuickStart.filter((item) => item.origin === "quick-start");
    if (untouchedDefaults.length === 0) return;
    setAnswers((previous) => {
      let next = previous;
      for (const item of untouchedDefaults) {
        next = removeDiscoveryAnswerValue(next, item.questionId, item.optionValue);
      }
      return next;
    });
  }, [setAnswers, strandedQuickStart]);

  return {
    applyQuickStartSeeded,
    strandedQuickStart,
    quickStartDrift,
    openStrandedStep,
    removeStrandedQuickStart,
  };
}