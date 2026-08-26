// DiscoveryGuidedInterview — the hands-free voice Q&A mode for Discovery.
//
// Instead of working through option buttons, the rep (or the customer, on a
// shared screen) is walked through the relevant questions one at a time:
//  1. Wingman reads the question aloud (SpeechSynthesis, optional).
//  2. The spoken answer is captured through the open microphone (SpeechRecognition).
//  3. The free-text transcript is interpreted back onto the governed option
//     values while the raw wording is kept as the note for the question.
//  4. The interview auto-advances, and at the end offers product selection.
//
// The interpretation logic lives in discoveryGuidedInterview.ts (unit-tested);
// this component only orchestrates the browser speech APIs and the UI.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  Languages,
  ListChecks,
  Loader2,
  Mic,
  MicOff,
  RotateCcw,
  Sparkles,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import type {
  DiscoveryAnswers,
  DiscoveryNotes,
  DiscoveryQuestion,
} from "./discoveryTypes";
import {
  getOptionLabel,
  getQuestionView,
  wmDiscoveryAnswerToText,
  wmDiscoveryHasAnswer,
  wmDiscoveryIsMultiSelectStep,
} from "./discoveryAnswerUtils";
import {
  getDiscoverySpeechRecognition,
  type DiscoverySpeechRecognitionEventLike,
  type DiscoverySpeechRecognitionLike,
} from "./discoverySpeechRecognition";
import {
  isSpeechSynthesisSupported,
  matchSpokenAnswer,
  speakGuidedText,
  stopGuidedSpeech,
  type GuidedAnswerMatch,
} from "./discoveryGuidedInterviewLogic";
import {
  guidedVoicePreview,
  isInterviewLanguageLoaded,
  loadInterviewLanguage,
  normalizeInterviewLang,
  prefetchInterviewLanguage,
  SPOKEN_LANGUAGE_OPTIONS,
  translateInterviewQuestion,
  type InterviewLangId,
} from "./discoveryGuidedInterviewI18n";
import { getStoredWingmanCaptureLanguage } from "../../data/wingmanLanguage";
import { DiscoveryQuickStartEntry } from "./discoveryQuickStartPanel";

export type DiscoveryAnswersUpdater =
  | DiscoveryAnswers
  | ((previous: DiscoveryAnswers) => DiscoveryAnswers);
export type DiscoveryNotesUpdater =
  | DiscoveryNotes
  | ((previous: DiscoveryNotes) => DiscoveryNotes);

export type DiscoveryGuidedInterviewProps = {
  questions: DiscoveryQuestion[];
  answers: DiscoveryAnswers;
  notes: DiscoveryNotes;
  onAnswersChange: (value: DiscoveryAnswersUpdater) => void;
  onNotesChange: (value: DiscoveryNotesUpdater) => void;
  /** stepId -> true when the rep verified the answer with the customer. */
  confirmed?: Record<string, boolean>;
  onConfirmedChange?: (value: Record<string, boolean> | ((previous: Record<string, boolean>) => Record<string, boolean>)) => void;
  /** Records the capture confidence for a step (high / matched / low) so the
   *  conversation trail can flag low-confidence rows for re-verification. */
  onConfidenceChange?: (
    questionId: string,
    confidence: "high" | "matched" | "low",
    score?: number,
  ) => void;
  onExit: () => void;
  onComplete: () => void;
  /** Persisted zero-based position of the last review walk, so re-entering review resumes there instead of question one. */
  reviewPosition?: number;
  /** Fired whenever the review walk moves to another question so the page can persist it. */
  onReviewPositionChange?: (index: number) => void;
  /** Start in focused review: walk only the questions still marked "to be confirmed". */
  initialReviewOpen?: boolean;
};

// Entry card for the hands-free interview. Shows as "Start" on an empty
// Discovery, and as "Continue" when a discovery is partially complete so a
// rep can resume at the first open question instead of re-answering.
export function DiscoveryGuidedInterviewEntry({
  onStart,
  onStartReviewOpen,
  answeredCount = 0,
  total = 0,
  reviewing = false,
  openCount = 0,
}: {
  onStart: () => void;
  onStartReviewOpen?: () => void;
  answeredCount?: number;
  total?: number;
  /** All questions answered — the entry becomes a review walk, not a resume. */
  reviewing?: boolean;
  /** Questions still marked "to be confirmed" — offered as a focused re-verify walk. */
  openCount?: number;
}) {
  const resuming = total > 0 && answeredCount > 0 && answeredCount < total;

  // Prefetch the capture language's phrase/stem tables as soon as the entry
  // card renders, scheduled on the browser's idle callback so the chunk fetch
  // happens during the Discovery page's idle time — the tables are already in
  // the registry by the time the rep clicks Start, and the first question
  // never flashes the English fallback. English is always loaded, so this is a
  // no-op there (and for languages already fetched in this session).
  useEffect(() => {
    const { speechLang } = getStoredWingmanCaptureLanguage();
    prefetchInterviewLanguage(speechLang);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={onStart}
        className="mx-auto mb-4 block w-full max-w-3xl rounded-xl border border-purple-500/30 bg-purple-900/20 px-4 py-3 text-left transition hover:bg-purple-900/30"
      >
        <span className="flex items-center gap-3">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500 text-sm font-bold text-purple-950">🎙️</span>
          <span>
            <span className="block text-sm font-bold text-purple-300">{reviewing ? "Review conversation — voice Q&A" : resuming ? "Continue guided interview — voice Q&A" : "Guided interview — voice Q&A"}</span>
            <span className="block text-xs text-[#8fb8d0]">{reviewing ? `Re-walk every question (${answeredCount} of ${total} captured) — answers stay captured, change anything before sign-off.` : resuming ? `Resume at the next open question (${answeredCount} of ${total} captured) — answer by speaking or choosing options.` : "Wingman reads each question aloud, you answer by speaking. Notes and the product shortlist build as you go."}</span>
          </span>
        </span>
      </button>
      {reviewing && openCount > 0 && onStartReviewOpen && (
        <button
          type="button"
          onClick={onStartReviewOpen}
          className="mx-auto mb-4 block w-full max-w-3xl rounded-xl border border-amber-500/30 bg-amber-900/20 px-4 py-3 text-left transition hover:bg-amber-900/30"
        >
          <span className="flex items-center gap-3">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-sm font-bold text-amber-950">✅</span>
            <span>
              <span className="block text-sm font-bold text-amber-300">Re-verify open questions — voice Q&A</span>
              <span className="block text-xs text-[#8fb8d0]">{openCount} question{openCount === 1 ? " is" : "s are"} still marked “to be confirmed” — walk only those before sign-off, answers stay saved.</span>
            </span>
          </span>
        </button>
      )}
    </>
  );
}

// Entry rail above Discovery: Quick Start only while nothing is captured yet,
// plus the guided interview entry (start, continue, or review). The entry stays
// visible once every question is answered so a rep can re-walk the whole
// conversation in review mode without resetting anything.
export function DiscoveryEntryRail({
  onStart,
  onStartReviewOpen,
  onQuickStart,
  answeredCount,
  total,
  openCount = 0,
}: {
  onStart: () => void;
  onStartReviewOpen?: () => void;
  onQuickStart: (answers: DiscoveryAnswers) => void;
  answeredCount: number;
  total: number;
  /** Questions still "to be confirmed" — shown as a focused re-verify entry. */
  openCount?: number;
}) {
  const reviewing = total > 0 && answeredCount >= total;
  return (
    <>
      {answeredCount === 0 && <DiscoveryQuickStartEntry onAnswers={onQuickStart} />}
      <DiscoveryGuidedInterviewEntry onStart={onStart} onStartReviewOpen={onStartReviewOpen} answeredCount={answeredCount} total={total} reviewing={reviewing} openCount={openCount} />
    </>
  );
}

function mergeNote(existing: string | undefined, next: string): string {
  const cleanNext = next.trim();
  if (!cleanNext) return existing?.trim() ?? "";
  return [existing?.trim(), cleanNext].filter(Boolean).join(" ");
}

export function DiscoveryGuidedInterview({
  questions,
  answers,
  notes,
  onAnswersChange,
  onNotesChange,
  confirmed = {},
  onConfirmedChange,
  onConfidenceChange,
  onExit,
  onComplete,
  reviewPosition,
  onReviewPositionChange,
  initialReviewOpen = false,
}: DiscoveryGuidedInterviewProps) {
  const [reviewMode, setReviewMode] = useState(() => {
    const firstOpen = questions.findIndex(
      (question) => !wmDiscoveryHasAnswer(answers[question.id]),
    );
    // A fully-captured discovery opens in review mode so the rep re-walks
    // every question with answers pre-selected, instead of finishing instantly.
    return firstOpen === -1 && questions.length > 0;
  });
  // Focused review: re-walk only the questions still marked "to be confirmed",
  // so re-verification homes in on the open rows before sign-off.
  const [reviewOpenOnly, setReviewOpenOnly] = useState(() => Boolean(initialReviewOpen));
  // Questions still marked "to be confirmed" — the focused review walk target.
  const openQuestions = useMemo(
    () => questions.filter((question) => confirmed[question.id] !== true),
    [questions, confirmed],
  );
  // The walkable list: the whole conversation in review mode, or just the open
  // questions in focused re-verify mode. Falls back to the full list when
  // everything is already confirmed, so the walk never empties out.
  const focusedReview =
    reviewMode && reviewOpenOnly && openQuestions.length > 0;
  const walkQuestions = focusedReview ? openQuestions : questions;

  // Section jump targets for review mode: the first walk index of each distinct
  // question section, so the rep can jump straight to Sources & displays,
  // Unified Communications, Positions & distance, etc. instead of walking the
  // whole conversation linearly. In the focused re-verify walk the sections are
  // derived from the open questions only, so a fully-confirmed section drops
  // out of the stepper.
  const sectionStops = useMemo(() => {
    const stops: { label: string; firstIndex: number }[] = [];
    walkQuestions.forEach((question, walkIndex) => {
      if (stops.length === 0 || stops[stops.length - 1].label !== question.section) {
        stops.push({ label: question.section, firstIndex: walkIndex });
      }
    });
    return stops;
  }, [walkQuestions]);

  // Start at the first open question so re-entering a partial discovery
  // resumes where the rep left off instead of re-asking answered questions.
  // Review mode resumes at the persisted review position (or question one on
  // a fresh walk), so leaving mid-review returns to the same question. The
  // focused re-verify walk always starts at the first to-be-confirmed question
  // — confirming a row drops it out, so the first open question is naturally
  // where a half-finished walk continues.
  const [index, setIndex] = useState(() => {
    if (reviewMode && reviewOpenOnly) return 0;
    if (reviewMode) {
      const stored = Number.isFinite(reviewPosition) ? (reviewPosition ?? 0) : 0;
      return Math.min(Math.max(Math.floor(stored), 0), Math.max(questions.length - 1, 0));
    }
    const firstOpen = questions.findIndex(
      (question) => !wmDiscoveryHasAnswer(answers[question.id]),
    );
    return firstOpen === -1 ? 0 : Math.max(firstOpen, 0);
  });
  const [startedResumed] = useState(
    () => questions.findIndex((q) => !wmDiscoveryHasAnswer(answers[q.id])) > 0,
  );
  const [showSummary, setShowSummary] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [heard, setHeard] = useState("");
  const [match, setMatch] = useState<GuidedAnswerMatch | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [trailOpen, setTrailOpen] = useState(false);
  const [micError, setMicError] = useState("");
  const [micSupported] = useState(() => Boolean(getDiscoverySpeechRecognition()));
  const [ttsSupported] = useState(() => isSpeechSynthesisSupported());
  const recogniserRef = useRef<DiscoverySpeechRecognitionLike | null>(null);
  const activeQuestionIdRef = useRef(walkQuestions[0]?.id ?? "");

  const speechLang = useMemo(
    () => getStoredWingmanCaptureLanguage().speechLang,
    [],
  );
  const interviewLang = useMemo(() => normalizeInterviewLang(speechLang), [speechLang]);
  // Per-session spoken-language override: the rep can switch the language the
  // question is read in (and answers interpreted) mid-call without changing the
  // stored profile capture language. null keeps the profile language.
  const [spokenLangOverride, setSpokenLangOverride] = useState<string | null>(null);
  const activeSpeechLang = spokenLangOverride ?? speechLang;
  const activeInterviewLang = normalizeInterviewLang(activeSpeechLang);
  // Non-English phrase/stem tables are lazy-loaded (see loadInterviewLanguage),
  // so the Discovery chunk only ships English by default. tablesVersion bumps
  // when the active language's tables land, re-rendering the localized stems.
  const [tablesVersion, setTablesVersion] = useState(0);
  // Local mirror of the capture confidence reported up via onConfidenceChange,
  // so the completion summary (which lives here) can list which captured
  // answers were low-confidence and drive a focused re-verify of exactly those.
  const [localConfidenceByStep, setLocalConfidenceByStep] = useState<
    Record<string, "high" | "matched" | "low">
  >({});

  useEffect(() => {
    // No work when English (always loaded) or when the language is already in
    // the registry — the sync lookups already return its tables, so re-renders
    // would be pointless (and, in tests, an unwrapped act() warning).
    if (
      activeInterviewLang === "en" ||
      isInterviewLanguageLoaded(activeInterviewLang)
    ) {
      return undefined;
    }
    let cancelled = false;
    loadInterviewLanguage(activeInterviewLang).then(() => {
      if (!cancelled) setTablesVersion((version) => version + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [activeInterviewLang]);

  const safeIndex = Math.min(Math.max(index, 0), Math.max(walkQuestions.length - 1, 0));
  const currentQuestion = walkQuestions[safeIndex];
  const application = wmDiscoveryAnswerToText(answers.opportunity);
  const currentView = useMemo(
    () => getQuestionView(currentQuestion, application),
    [currentQuestion, application],
  );
  // The stem Wingman reads aloud: localised for the active spoken language
  // (profile capture language unless the rep overrides it mid-call), falling
  // back to the governed English text.
  const spokenText = useMemo(
    () => translateInterviewQuestion(currentView, activeInterviewLang),
    // tablesVersion: re-derive the stem once the active language's tables load
    // so the read-aloud text flips from the English fallback to the capture
    // language (English is always loaded, so the memo is stable there).
    [currentView, activeInterviewLang, tablesVersion],
  );
  // True while a non-English capture language's tables are still being fetched
  // — the stem below is the English fallback until they land, so show a small
  // inline indicator rather than letting it read as final translated copy.
  const languageTablesPending =
    activeInterviewLang !== "en" &&
    !isInterviewLanguageLoaded(activeInterviewLang);

  const answeredCount = useMemo(
    () => questions.filter((question) => wmDiscoveryHasAnswer(answers[question.id])).length,
    [questions, answers],
  );
  const total = Math.max(questions.length, 1);
  const percent = Math.round((answeredCount / total) * 100);

  // Keep the index inside the current (possibly shrinking) question list.
  useEffect(() => {
    setIndex((current) =>
      Math.min(Math.max(current, 0), Math.max(questions.length - 1, 0)),
    );
  }, [questions.length]);

  // Persist the review position whenever the walk moves, so leaving mid-review
  // and re-entering lands back on the same question instead of question one.
  // The focused re-verify walk is excluded: confirming a row removes it from
  // the open set, so the "first open question" start is already resumable.
  useEffect(() => {
    if (!reviewMode || reviewOpenOnly || !onReviewPositionChange) return;
    onReviewPositionChange(index);
  }, [index, reviewMode, reviewOpenOnly, onReviewPositionChange]);

  useEffect(() => {
    activeQuestionIdRef.current = currentQuestion?.id ?? "";
  }, [currentQuestion]);

  useEffect(() => {
    return () => {
      recogniserRef.current?.stop();
      stopGuidedSpeech();
    };
  }, []);

  const stopListening = useCallback(() => {
    recogniserRef.current?.stop();
    recogniserRef.current = null;
    setListening(false);
  }, []);

  const finalizeAnswer = useCallback((transcript: string) => {
    const clean = transcript.trim();
    if (!clean) return;
    const question = questions.find(
      (candidate) => candidate.id === activeQuestionIdRef.current,
    );
    if (!question) return;
    stopListening();
    setInterim("");
    setHeard(clean);
    setMatch(
      matchSpokenAnswer(getQuestionView(question, application), clean, activeInterviewLang),
    );
  }, [questions, application, activeInterviewLang, stopListening]);

  const beginListening = useCallback(() => {
    setMicError("");
    stopGuidedSpeech();
    if (recogniserRef.current) {
      stopListening();
      return;
    }
    const Recognition = getDiscoverySpeechRecognition();
    if (!Recognition) {
      setMicError("Voice capture is not supported in this browser. Type the answer or choose an option below.");
      return;
    }
    const recogniser = new Recognition();
    recogniser.continuous = true;
    recogniser.interimResults = true;
    recogniser.lang = activeSpeechLang;

    recogniser.onresult = (event: DiscoverySpeechRecognitionEventLike) => {
      let interimText = "";
      let finalText = "";
      for (let resultIndex = 0; resultIndex < event.results.length; resultIndex += 1) {
        const result = event.results[resultIndex];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }
      setInterim(interimText.trim());
      if (finalText.trim()) {
        finalizeAnswer(finalText);
      }
    };

    recogniser.onerror = () => {
      setMicError("Microphone capture stopped. Check the browser microphone permission and try again.");
      setListening(false);
    };

    recogniser.onend = () => {
      setListening(false);
    };

    recogniserRef.current = recogniser;
    recogniser.start();
    setListening(true);
  }, [finalizeAnswer, activeSpeechLang, stopListening]);

  const speakCurrent = useCallback(() => {
    if (!currentView) return;
    stopGuidedSpeech();
    speakGuidedText(`${spokenText.question} ${spokenText.prompt}`, activeSpeechLang);
  }, [currentView, spokenText, activeSpeechLang]);

  // Header voice preview — lets the rep hear the selected language's voice
  // before the interview reads the next question in it.
  const previewVoice = useCallback(() => {
    stopGuidedSpeech();
    speakGuidedText(guidedVoicePreview(activeInterviewLang), activeSpeechLang);
  }, [activeInterviewLang, activeSpeechLang]);

  useEffect(() => {
    // Wait for the active language's tables before reading aloud, so the rep
    // never hears the English fallback when the capture language is French,
    // Spanish or German. The 400ms delay also lets the lazy import land.
    if (autoSpeak && ttsSupported && !showSummary && isInterviewLanguageLoaded(activeInterviewLang)) {
      const timeout = window.setTimeout(() => {
        speakCurrent();
      }, 400);
      return () => window.clearTimeout(timeout);
    }
    return undefined;
  }, [autoSpeak, ttsSupported, showSummary, index, currentQuestion?.id, speakCurrent, activeInterviewLang, tablesVersion]);

  const advance = useCallback(() => {
    setHeard("");
    setMatch(null);
    setInterim("");
    if (safeIndex >= walkQuestions.length - 1) {
      setShowSummary(true);
      stopGuidedSpeech();
      return;
    }
    setIndex((current) => Math.min(walkQuestions.length - 1, current + 1));
  }, [safeIndex, walkQuestions.length]);

  const goBack = useCallback(() => {
    setHeard("");
    setMatch(null);
    setInterim("");
    setIndex((current) => Math.max(0, current - 1));
  }, []);

  const startReview = useCallback(() => {
    setReviewMode(true);
    setReviewOpenOnly(false);
    setShowSummary(false);
    setHeard("");
    setMatch(null);
    setInterim("");
    setIndex(0);
  }, []);

  const startReviewOpen = useCallback(() => {
    setReviewMode(true);
    setReviewOpenOnly(true);
    setShowSummary(false);
    setHeard("");
    setMatch(null);
    setInterim("");
    setIndex(0);
  }, []);

  const applyAnswer = useCallback(
    (
      values: string[],
      note: string,
      confidence?: "high" | "matched" | "low",
      score?: number,
    ) => {
      const questionId = activeQuestionIdRef.current;
      const question = questions.find((candidate) => candidate.id === questionId);
      if (!question) return;

      onNotesChange((previous) => ({
        ...previous,
        [questionId]: mergeNote(previous[questionId], note),
      }));

      onAnswersChange((previous) => {
        const updated = { ...previous };
        if (values.length > 0) {
          updated[questionId] =
            wmDiscoveryIsMultiSelectStep(question) ? values : values[0];
        } else {
          delete updated[questionId];
        }
        return updated;
      });

    if (confidence && values.length > 0) {
      onConfidenceChange?.(questionId, confidence, score);
      setLocalConfidenceByStep((previous) => ({ ...previous, [questionId]: confidence }));
    }
    },
    [onAnswersChange, onConfidenceChange, onNotesChange, questions],
  );

  const toggleConfirmed = useCallback((questionId: string) => {
    if (!onConfirmedChange) return;
    onConfirmedChange((previous) => ({
      ...previous,
      [questionId]: previous[questionId] !== true,
    }));
  }, [onConfirmedChange]);

  // Mirrors the capture chip's tier logic exactly (score >= 5 high, matched,
  // partial/none low) so the trail records the same confidence the rep saw.
  const confidenceForMatch = (m: GuidedAnswerMatch): "high" | "matched" | "low" =>
    m.score >= 5 ? "high" : m.confidence === "matched" ? "matched" : "low";

  const confirmHeardAnswer = useCallback(() => {
    if (!match) return;
    applyAnswer(match.values, heard, confidenceForMatch(match), match.score);
    advance();
  }, [applyAnswer, confidenceForMatch, match, heard, advance]);

  const selectOption = useCallback((value: string) => {
    const questionId = activeQuestionIdRef.current;
    const question = questions.find((candidate) => candidate.id === questionId);
    if (!question) return;
    const label = getOptionLabel(question, value, application);
    const multi = wmDiscoveryIsMultiSelectStep(question);
    if (multi) {
      const current = Array.isArray(answers[questionId])
        ? (answers[questionId] as string[])
        : [];
      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];
      // A deliberately picked option is a high-confidence capture by definition
      // (score 10 — above the curated-phrase ceiling, clearly high).
      applyAnswer(next, `Selected: ${label}`, "high", 10);
    } else {
      applyAnswer([value], `Selected: ${label}`, "high", 10);
      advance();
    }
  }, [answers, application, applyAnswer, advance, questions]);

  const skipQuestion = useCallback(() => {
    setHeard("");
    setMatch(null);
    advance();
  }, [advance]);

  const exitInterview = useCallback(() => {
    stopListening();
    stopGuidedSpeech();
    onExit();
  }, [onExit, stopListening]);

  const finishInterview = useCallback(() => {
    stopListening();
    stopGuidedSpeech();
    onComplete();
  }, [onComplete, stopListening]);

  // Low-confidence captured answers — listed in the completion summary so the
  // rep can re-verify the guesses before generating recommendations. Only rows
  // with an actual governed answer count (a scuffed keyword-only hit is what
  // made them low in the first place).
  const lowConfidenceAnswers = useMemo(
    () =>
      questions
        .filter(
          (question) =>
            wmDiscoveryHasAnswer(answers[question.id]) &&
            localConfidenceByStep[question.id] === "low",
        )
        .map((question) =>
          getOptionLabel(question, answers[question.id], application),
        ),
    [questions, answers, localConfidenceByStep, application],
  );

  if (!currentQuestion) {
    return (
      <div className="mx-auto max-w-3xl py-10 text-center">
        <button
          type="button"
          className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-semibold text-[#8fb8d0]"
          onClick={onExit}
        >
          Back to Discovery
        </button>
      </div>
    );
  }

  const answeredThisQuestion = wmDiscoveryHasAnswer(answers[currentQuestion.id]);

  // In review mode the question card opens with a "currently captured" summary
  // so the rep sees what was already recorded for this question (governed
  // answer, customer wording, confirmed status) without hunting through the
  // options. The controls below stay live, so re-walking never resets anything
  // — it just shows and lets the rep change what was captured.
  const capturedLabel =
    reviewMode && wmDiscoveryHasAnswer(answers[currentQuestion.id])
      ? getOptionLabel(currentQuestion, answers[currentQuestion.id], application)
      : "";
  const capturedNote = reviewMode ? (notes[currentQuestion.id]?.trim() ?? "") : "";
  const capturedConfirmed = confirmed[currentQuestion.id] === true;

  // The interpretation chip mirrors the capture chip's 3-tier confidence
  // exactly (same tiers, labels, colours and bar count), so the trust signal
  // the rep sees when an answer is interpreted is the same one that gets
  // recorded in the trail and shown in the conversation review.
  const matchTierStyle =
    match && match.values.length > 0
      ? confidenceForMatch(match) === "high"
        ? { label: "High confidence", badge: "bg-emerald-500/15 text-emerald-300", bar: "bg-emerald-500", bars: 3 }
        : confidenceForMatch(match) === "matched"
          ? { label: "Matched", badge: "bg-emerald-500/15 text-emerald-300", bar: "bg-emerald-500", bars: 2 }
          : { label: "Low confidence — verify", badge: "bg-amber-500/15 text-amber-300", bar: "bg-amber-500", bars: 1 }
      : null;

  return (
    <div
      className="mx-auto mb-6 max-w-4xl space-y-4"
      data-wingman-guided-interview="true"
    >
      {/* Interview header + progress */}
      <section className="rounded-2xl border border-white/10 bg-[#0b1824]/80 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-purple-500/20 text-lg" aria-hidden="true">
              🎙️
            </span>
            <div>
              <p className="text-sm font-bold text-[#edf6ff]">Guided interview</p>
              <p className="text-xs text-[#8fb8d0]">
                Wingman asks, you answer — notes and product selection build as you go.
              </p>
              {focusedReview ? (
                <p className="mt-1 text-xs text-amber-300">
                  Re-verifying {openQuestions.length} open question{openQuestions.length === 1 ? "" : "s"} still marked “to be confirmed” — confirm with the customer to settle each row before sign-off.
                </p>
              ) : reviewMode ? (
                <p className="mt-1 text-xs text-purple-300">
                  Reviewing conversation — every question is captured. Answers stay saved; change anything before sign-off.
                </p>
              ) : startedResumed ? (
                <p className="mt-1 text-xs text-purple-300">
                  Resumed — continuing at the first open question. Earlier answers are saved.
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {ttsSupported && (
              <button
                type="button"
                onClick={() => setAutoSpeak((current) => !current)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  autoSpeak
                    ? "border-purple-500/40 bg-purple-500/15 text-purple-300"
                    : "border-white/10 bg-white/[0.03] text-[#8fb8d0] hover:text-[#cfe6f7]"
                }`}
                aria-pressed={autoSpeak}
                title={autoSpeak ? "Wingman reads each question aloud" : "Questions are not read aloud"}
              >
                {autoSpeak ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                {autoSpeak ? "Speak on" : "Speak off"}
              </button>
            )}
            {ttsSupported && (
              <button
                type="button"
                onClick={previewVoice}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-[#8fb8d0] transition hover:text-[#cfe6f7]"
                title={`Hear the voice for ${activeSpeechLang}`}
              >
                <Volume1 className="h-3.5 w-3.5" />
                Preview voice
              </button>
            )}
            {ttsSupported && (
              <label
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-[#8fb8d0]"
                title="Spoken language for this call — the profile capture language is unchanged"
              >
                <Languages className="h-3.5 w-3.5" />
                <span>Speak in</span>
                <select
                  value={activeInterviewLang}
                  onChange={(event) => {
                    const next = event.target.value;
                    // Selecting the profile language clears the override so the
                    // stored profile stays the source of truth.
                    setSpokenLangOverride(
                      normalizeInterviewLang(next) === interviewLang ? null : next,
                    );
                  }}
                  aria-label="Spoken language"
                  className="cursor-pointer bg-transparent font-semibold text-[#cfe6f7] outline-none [&>option]:bg-[#0b1824]"
                >
                  {SPOKEN_LANGUAGE_OPTIONS.map((option) => (
                    <option key={option.lang} value={option.lang}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button
              type="button"
              onClick={exitInterview}
              className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-[#8fb8d0] transition hover:text-[#cfe6f7]"
            >
              Exit to standard questions
            </button>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-[#8fb8d0]">
            <span>
              {answeredCount} of {questions.length} questions captured
            </span>
            <span>{percent}%</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-400 transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </section>

      {showSummary ? (
        <SummaryPanel
          questions={questions}
          answers={answers}
          notes={notes}
          application={application}
          unansweredCount={total - answeredCount}
          confirmed={confirmed}
          onConfirmedChange={onConfirmedChange}
          onFinish={finishInterview}
          onBack={() => {
            setShowSummary(false);
            setIndex(Math.max(walkQuestions.length - 1, 0));
          }}
          onReview={startReview}
          onReviewOpen={startReviewOpen}
          openCount={openQuestions.length}
          lowConfidenceAnswers={lowConfidenceAnswers}
          onExit={onExit}
          interviewLang={activeInterviewLang}
          speechLang={activeSpeechLang}
        />
      ) : (
        <>
          {reviewMode && sectionStops.length > 1 && (
            <section className="rounded-2xl border border-white/10 bg-[#0b1824]/80 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-[#8fb8d0]">Jump to section:</span>
                {sectionStops.map((stop) => {
                  const active = currentQuestion?.section === stop.label;
                  return (
                    <button
                      key={stop.label}
                      type="button"
                      onClick={() => {
                        setHeard("");
                        setMatch(null);
                        setInterim("");
                        setIndex(stop.firstIndex);
                      }}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        active
                          ? "border-purple-500/40 bg-purple-500/15 text-purple-300"
                          : "border-white/10 bg-white/[0.03] text-[#8fb8d0] hover:text-[#cfe6f7]"
                      }`}
                      aria-pressed={active}
                    >
                      {stop.label}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Current question */}
          <section
            className="rounded-2xl border border-white/10 bg-[#0b1824]/80 p-6"
            data-guided-question={currentQuestion.id}
          >
            <div className="flex items-center justify-between text-xs text-[#8fb8d0]">
              <span className="rounded-full bg-white/[0.05] px-2.5 py-1 font-semibold">
                {currentQuestion.section}
              </span>
              <span>
                {focusedReview
                  ? `Open question ${safeIndex + 1} of ${walkQuestions.length}`
                  : `Question ${safeIndex + 1} of ${questions.length}`}
              </span>
            </div>

            <h2 className="mt-3 text-2xl font-black leading-snug text-[#edf6ff]">
              {currentView.question}
            </h2>
            <p className="mt-1.5 text-sm leading-6 text-[#8fb8d0]">{currentView.prompt}</p>
            {activeInterviewLang !== "en" && (
              <p
                lang={activeSpeechLang}
                className="mt-2 border-l-2 border-purple-500/40 pl-3 text-sm italic leading-6 text-purple-300/80"
              >
                {spokenText.question}
                {languageTablesPending && (
                  <span
                    className="ml-2 inline-flex items-center gap-1.5 text-xs not-italic text-slate-400"
                    role="status"
                    aria-label="Loading language tables"
                  >
                    <Loader2 aria-hidden="true" className="h-3 w-3 animate-spin" />
                    loading language tables…
                  </span>
                )}
              </p>
            )}

            {/* Currently captured — review mode summary for this question */}
            {capturedLabel && (
              <div
                className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4"
                data-guided-captured="true"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-300">
                    Currently captured
                  </p>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                      capturedConfirmed
                        ? "bg-cyan-500/20 text-cyan-300"
                        : "bg-amber-500/15 text-amber-300"
                    }`}
                  >
                    {capturedConfirmed
                      ? "Confirmed with customer"
                      : "To be confirmed"}
                  </span>
                </div>
                <p className="mt-1.5 text-sm font-semibold text-slate-100">
                  {capturedLabel}
                </p>
                {capturedNote && (
                  <p className="mt-1 text-xs italic text-slate-400">
                    “{capturedNote}”
                  </p>
                )}
                <p className="mt-1.5 text-[11px] text-slate-400">
                  Captured earlier — change it below before sign-off. Nothing
                  else in the discovery is reset.
                </p>
              </div>
            )}

            {/* Controls */}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {ttsSupported && (
                <button
                  type="button"
                  onClick={speakCurrent}
                  className="inline-flex items-center gap-2 rounded-full border border-purple-500/40 bg-purple-500/10 px-4 py-2 text-sm font-semibold text-purple-300 transition hover:bg-purple-500/20"
                >
                  <Volume2 className="h-4 w-4" />
                  Read question
                </button>
              )}
              <button
                type="button"
                onClick={beginListening}
                aria-pressed={listening}
                className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition ${
                  listening
                    ? "animate-pulse bg-red-500 text-red-950 hover:bg-red-400"
                    : "bg-purple-500 text-purple-950 hover:bg-purple-400"
                }`}
              >
                {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {listening ? "Listening — tap to stop" : "Open mic — answer by voice"}
              </button>
              <button
                type="button"
                onClick={skipQuestion}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-[#8fb8d0] transition hover:text-[#cfe6f7]"
              >
                Skip for now
              </button>
              {safeIndex > 0 && (
                <button
                  type="button"
                  onClick={goBack}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-[#8fb8d0] transition hover:text-[#cfe6f7]"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous question
                </button>
              )}
            </div>

            {!micSupported && (
              <p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                Voice capture needs a supported browser (Chrome or Edge). Type an
                answer or choose an option below — everything else still works.
              </p>
            )}
            {micError && (
              <p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                {micError}
              </p>
            )}

            {/* Live transcript while listening */}
            {listening && (
              <div className="mt-4 rounded-xl border border-purple-500/30 bg-purple-500/10 p-4">
                <p className="flex items-center gap-2 text-xs font-bold text-purple-300">
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-400" />
                  Listening… speak your answer
                </p>
                <p className="mt-2 text-lg text-[#edf6ff]">{interim || "…"}</p>
              </div>
            )}

            {/* Heard answer + interpretation */}
            {!listening && heard && (
              <div
                className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] p-4"
                data-guided-heard="true"
              >
                <p className="text-xs font-bold uppercase tracking-wide text-[#8fb8d0]">You said</p>
                <p className="mt-1 text-lg text-[#edf6ff]">“{heard}”</p>

                {match && match.values.length > 0 && matchTierStyle ? (
                  <div className="mt-3">
                    <p className="text-sm text-slate-100">
                      <span
                        className={`mr-1.5 inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${matchTierStyle.badge}`}
                      >
                        {matchTierStyle.label}
                      </span>
                      <span
                        className="mr-1.5 inline-flex items-center gap-0.5 align-middle"
                        title={`Confidence ${matchTierStyle.bars} of 3`}
                        aria-label={`Confidence ${matchTierStyle.bars} of 3`}
                      >
                        {[1, 2, 3].map((bar) => (
                          <span
                            key={bar}
                            className={`h-1.5 w-3 rounded-full ${bar <= matchTierStyle.bars ? matchTierStyle.bar : "bg-white/10"}`}
                          />
                        ))}
                      </span>
                      <Check className="mr-1 inline h-3.5 w-3.5 text-emerald-300" />
                      {match.labels.join(", ")}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={confirmHeardAnswer}
                        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-2 text-sm font-bold text-emerald-950 transition hover:bg-emerald-400"
                      >
                        That's right
                        <ArrowRight className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setHeard("");
                          setMatch(null);
                          window.setTimeout(beginListening, 120);
                        }}
                        className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-[#8fb8d0] transition hover:text-[#cfe6f7]"
                      >
                        <RotateCcw className="mr-1.5 inline h-3.5 w-3.5" />
                        Try again
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3">
                    <p className="text-sm text-[#cfe6f7]">
                      I didn't quite catch that. Try again, or choose from the options below.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          applyAnswer([], heard);
                          advance();
                        }}
                        className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-[#8fb8d0] transition hover:text-[#cfe6f7]"
                      >
                        Keep as note only
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setHeard("");
                          setMatch(null);
                          window.setTimeout(beginListening, 120);
                        }}
                        className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-[#8fb8d0] transition hover:text-[#cfe6f7]"
                      >
                        <RotateCcw className="mr-1.5 inline h-3.5 w-3.5" />
                        Try again
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Manual options — always available as the fallback */}
            <div className="mt-5">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#8fb8d0]">
                Or choose an option
                {wmDiscoveryIsMultiSelectStep(currentQuestion) ? " (pick all that apply)" : ""}
              </p>
              <div className="flex flex-wrap gap-2">
                {currentView.options.map((option) => {
                  const selected = Array.isArray(answers[currentQuestion.id])
                    ? (answers[currentQuestion.id] as string[]).includes(option.value)
                    : answers[currentQuestion.id] === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => selectOption(option.value)}
                      aria-pressed={selected}
                      className={`rounded-full border px-3.5 py-2 text-left text-sm font-medium transition ${
                        selected
                          ? "border-purple-400 bg-purple-500/20 text-purple-200"
                          : "border-white/10 bg-white/[0.03] text-[#cfe6f7] hover:border-white/25"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              {answeredThisQuestion && (
                <button
                  type="button"
                  onClick={advance}
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-cyan-500 px-5 py-2.5 text-sm font-bold text-cyan-950 transition hover:bg-cyan-400"
                >
                  Next question
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </section>

          {/* Notes trail */}
          <section className="rounded-2xl border border-white/10 bg-[#0b1824]/60">
            <button
              type="button"
              onClick={() => setTrailOpen((current) => !current)}
              className="flex w-full items-center justify-between px-5 py-3.5 text-left"
              aria-expanded={trailOpen}
            >
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#edf6ff]">
                <ListChecks className="h-4 w-4 text-purple-400" />
                Notes captured so far ({answeredCount})
              </span>
              <ChevronDown
                className={`h-4 w-4 text-[#8fb8d0] transition-transform ${trailOpen ? "rotate-180" : ""}`}
              />
            </button>
            {trailOpen && (
              <div className="border-t border-white/5 px-5 py-4">
                {questions.filter(
                  (question) =>
                    wmDiscoveryHasAnswer(answers[question.id]) ||
                    Boolean(notes[question.id]?.trim()),
                ).length === 0 ? (
                  <p className="text-sm text-[#8fb8d0]">
                    No notes yet — answer the first question to get started.
                  </p>
                ) : (
                  <ul className="space-y-2.5">
                    {questions
                      .filter(
                        (question) =>
                          wmDiscoveryHasAnswer(answers[question.id]) ||
                          Boolean(notes[question.id]?.trim()),
                      )
                      .map((question) => {
                        const localized = translateInterviewQuestion(question, activeInterviewLang);
                        const localizedDiffers = localized.question !== question.question;
                        return (
                          <li key={question.id} className="text-sm">
                            <div className="flex items-start justify-between gap-3">
                              <span>
                                <span className="font-semibold text-[#cfe6f7]">
                                  {question.shortLabel}:
                                </span>{" "}
                                <span className="text-[#8fb8d0]">
                                  {wmDiscoveryHasAnswer(answers[question.id])
                                    ? getOptionLabel(question, answers[question.id], application)
                                    : "Note only"}
                                  {notes[question.id]?.trim()
                                    ? ` — ${notes[question.id].trim()}`
                                    : ""}
                                </span>
                              </span>
                              {onConfirmedChange && (
                                <button
                                  type="button"
                                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                                    confirmed[question.id] === true
                                      ? "bg-emerald-500/15 text-emerald-300"
                                      : "bg-amber-500/15 text-amber-300"
                                  }`}
                                  aria-pressed={confirmed[question.id] === true}
                                  onClick={() => toggleConfirmed(question.id)}
                                >
                                  {confirmed[question.id] === true ? "Confirmed" : "Confirm with customer"}
                                </button>
                              )}
                            </div>
                            {localizedDiffers && (
                              <p
                                lang={activeSpeechLang}
                                className="mt-1 border-l-2 border-purple-500/40 pl-2 text-xs italic leading-5 text-purple-300/80"
                              >
                                {question.question} — {localized.question}
                              </p>
                            )}
                          </li>
                        );
                      })}
                  </ul>
                )}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function SummaryPanel({
  questions,
  answers,
  notes,
  application,
  unansweredCount,
  confirmed = {},
  onConfirmedChange,
  onFinish,
  onBack,
  onReview,
  onReviewOpen,
  openCount = 0,
  lowConfidenceAnswers = [],
  onExit,
  interviewLang = "en",
  speechLang = "en-GB",
}: {
  questions: DiscoveryQuestion[];
  answers: DiscoveryAnswers;
  notes: DiscoveryNotes;
  application: string;
  unansweredCount: number;
  confirmed?: Record<string, boolean>;
  onConfirmedChange?: DiscoveryGuidedInterviewProps["onConfirmedChange"];
  onFinish: () => void;
  onBack: () => void;
  onReview: () => void;
  /** Start a focused walk over the questions still marked "to be confirmed". */
  onReviewOpen?: () => void;
  openCount?: number;
  /** Captured answers the rep should re-verify — shown as a one-line summary. */
  lowConfidenceAnswers?: string[];
  onExit: () => void;
  /** Capture language of the conversation — used to show the localized stem. */
  interviewLang?: InterviewLangId | string;
  speechLang?: string;
}) {
  // Bulk action: confirm every captured row in one click, then reopen any row
  // individually via its chip or the re-verify walk. Rows left unanswered stay
  // open — they are flagged for confirmation rather than assumed.
  const capturedIds = questions
    .filter((question) => wmDiscoveryHasAnswer(answers[question.id]))
    .map((question) => question.id);
  const unconfirmedCapturedCount = capturedIds.filter(
    (id) => confirmed[id] !== true,
  ).length;

  return (
    <section className="rounded-2xl border border-white/10 bg-[#0b1824]/80 p-6">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-xl" aria-hidden="true">
          <Sparkles className="h-5 w-5 text-emerald-300" />
        </span>
        <div>
          <h2 className="text-xl font-black text-[#edf6ff]">Interview complete</h2>
          <p className="text-sm text-[#8fb8d0]">
            Here is everything Wingman noted from the conversation.
          </p>
        </div>
      </div>

      {unansweredCount > 0 && (
        <p className="mt-4 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
          {unansweredCount} question{unansweredCount === 1 ? " was" : "s were"} left
          open — Wingman will flag these for confirmation rather than assume them.
        </p>
      )}
      {lowConfidenceAnswers && lowConfidenceAnswers.length > 0 && (
        <p className="mt-4 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
          <CheckCheck className="mr-1.5 inline h-4 w-4" />
          {lowConfidenceAnswers.length} low-confidence answer
          {lowConfidenceAnswers.length === 1 ? " was" : "s were"} captured on
          partial matches — re-verify before generating recommendations:{" "}
          {lowConfidenceAnswers.join("; ")}.
        </p>
      )}

      <ul className="mt-4 space-y-2">
        {questions.map((question) => {
          const hasAnswer = wmDiscoveryHasAnswer(answers[question.id]);
          const note = notes[question.id]?.trim() ?? "";
          const localized = translateInterviewQuestion(question, interviewLang);
          const localizedDiffers = localized.question !== question.question;
          return (
            <li
              key={question.id}
              className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#cfe6f7]">{question.shortLabel}</p>
                  <p className="text-xs text-[#6a97b0]">{question.question}</p>
                  {localizedDiffers && (
                    <p
                      lang={speechLang}
                      className="mt-0.5 border-l-2 border-purple-500/40 pl-2 text-xs italic leading-5 text-purple-300/80"
                    >
                      {localized.question}
                    </p>
                  )}
                </div>
                <span className="flex shrink-0 flex-col items-end gap-1.5">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                      hasAnswer
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-amber-500/15 text-amber-300"
                    }`}
                  >
                    {hasAnswer ? "Captured" : "Open"}
                  </span>
                  {onConfirmedChange && (
                    <button
                      type="button"
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        confirmed[question.id] === true
                          ? "bg-cyan-500/20 text-cyan-300"
                          : "bg-white/5 text-slate-400 hover:text-slate-200"
                      }`}
                      aria-pressed={confirmed[question.id] === true}
                      onClick={() =>
                        onConfirmedChange((previous) => ({
                          ...previous,
                          [question.id]: previous[question.id] !== true,
                        }))
                      }
                    >
                      {confirmed[question.id] === true
                        ? "Confirmed with customer"
                        : "Confirm with customer"}
                    </button>
                  )}
                </span>
              </div>
              {hasAnswer && (
                <p className="mt-1.5 text-sm text-[#edf6ff]">
                  {getOptionLabel(question, answers[question.id], application)}
                </p>
              )}
              {note && (
                <p className="mt-1 text-xs italic text-[#8fb8d0]">“{note}”</p>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onFinish}
          className="inline-flex items-center gap-2 rounded-full bg-cyan-500 px-6 py-3 text-sm font-bold text-cyan-950 transition hover:bg-cyan-400"
        >
          Generate product recommendations
          <ArrowRight className="h-4 w-4" />
        </button>
        {onConfirmedChange && unconfirmedCapturedCount > 0 && (
          <button
            type="button"
            onClick={() =>
              onConfirmedChange((previous) => {
                const next = { ...previous };
                for (const id of capturedIds) next[id] = true;
                return next;
              })
            }
            className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-5 py-2.5 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
          >
            <CheckCheck className="mr-1.5 inline h-4 w-4" />
            Confirm all captured ({unconfirmedCapturedCount})
          </button>
        )}
        {openCount > 0 && onReviewOpen && (
          <button
            type="button"
            onClick={onReviewOpen}
            className="rounded-full border border-amber-500/40 bg-amber-500/10 px-5 py-2.5 text-sm font-semibold text-amber-300 transition hover:bg-amber-500/20"
          >
            <ListChecks className="mr-1.5 inline h-4 w-4" />
            Re-verify {openCount} open question{openCount === 1 ? "" : "s"}
          </button>
        )}
        <button
          type="button"
          onClick={onReview}
          className="rounded-full border border-purple-500/40 bg-purple-500/10 px-5 py-2.5 text-sm font-semibold text-purple-300 transition hover:bg-purple-500/20"
        >
          <ListChecks className="mr-1.5 inline h-4 w-4" />
          Review all questions
        </button>
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-white/10 bg-white/[0.03] px-5 py-2.5 text-sm font-semibold text-[#8fb8d0] transition hover:text-[#cfe6f7]"
        >
          Back to questions
        </button>
        <button
          type="button"
          onClick={onExit}
          className="rounded-full border border-white/10 bg-white/[0.03] px-5 py-2.5 text-sm font-semibold text-[#8fb8d0] transition hover:text-[#cfe6f7]"
        >
          Exit to standard questions
        </button>
      </div>
    </section>
  );
}

export default DiscoveryGuidedInterview;
