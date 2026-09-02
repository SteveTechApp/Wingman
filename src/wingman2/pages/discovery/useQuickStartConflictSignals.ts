// Owns the quick-start CONFLICT signals for the Discovery page: provenance of
// the applied seed, the stranded-default list, the post-seed application
// drift, and the two resolution actions (jump to the owning step / remove the
// hidden answers). Lives in discovery/ so DiscoveryPage.tsx stays an
// orchestrator instead of owning this logic inline (its size budget is
// tracked by tools/check-size-budgets.mjs).
//
// The stranded list derives purely from the current answers (a stored value
// whose option the interview no longer offers). The drift additionally needs
// the seed provenance: which application the quick start was applied for, and
// the exact answers it wrote — an untouched answer that still disagrees with
// the CURRENT application's standard profile belongs to the old profile.

import { useCallback, useMemo, useState } from "react";
import { findStrandedQuickStartDefaults, removeDiscoveryAnswerValue, wmDiscoveryAnswerToText } from "./discoveryAnswerUtils";
import { findQuickStartApplicationDrift } from "./discoveryQuickStart";
import type { DiscoveryAnswers, DiscoveryQuestion } from "./discoveryTypes";

export type DiscoveryQuickStartConflictSignals = {
  /** Records the seed provenance and applies the answers. */
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
    setActiveIndex,
    setIsReviewingAnswers,
    setPendingEscalation,
  } = options;

  const [quickStartSeed, setQuickStartSeed] = useState<{ application: string; answers: DiscoveryAnswers } | null>(null);

  const selectedApplication = wmDiscoveryAnswerToText(answers.opportunity);

  const applyQuickStartSeeded = useCallback(
    (seeded: DiscoveryAnswers) => {
      setQuickStartSeed({ application: wmDiscoveryAnswerToText(seeded.opportunity), answers: seeded });
      setAnswers(seeded);
    },
    [setAnswers],
  );

  // Quick-start defaults stranded by a later answer (a stored value whose
  // option the interview no longer offers). Computed across the FULL visible
  // set so the conflict shows in the summary card and completion panel even
  // when the owning step is no longer the one being edited.
  const strandedQuickStart = useMemo(
    () => findStrandedQuickStartDefaults(discoveryQuestions, answers),
    [discoveryQuestions, answers],
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

  // "Remove stranded answers": clear every stored default whose option the
  // interview no longer offers. The stranded list recomputes from answers, so
  // the notice disappears as soon as the values are gone.
  const removeStrandedQuickStart = useCallback(() => {
    if (strandedQuickStart.length === 0) return;
    setAnswers((previous) => {
      let next = previous;
      for (const item of strandedQuickStart) {
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