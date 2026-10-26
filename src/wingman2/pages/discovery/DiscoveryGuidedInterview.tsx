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
  type StrandedQuickStartDefault,
} from "./discoveryAnswerUtils";
import {
  DiscoveryStrandedDefaultsNotice,
  type DiscoveryApplicationDrift,
} from "./DiscoveryStrandedDefaultsNotice";
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
import { DiscoveryDefaultsConflictAlert } from "./DiscoveryDefaultsConflictAlert";
import { DISCOVERY_CAPTURE_PRESENTATION } from "./discoveryProgressiveDisclosure";

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
  /** Stranded quick-start defaults surfaced in the review trail so the rep can
   *  clear hidden pre-fills without leaving the completion summary. */
  strandedQuickStart?: ReadonlyArray<StrandedQuickStartDefault>;
  /** Post-seed application drift, shown beside the stranded defaults. */
  applicationDrift?: DiscoveryApplicationDrift | null;
  /** Fallback jump for stranded rows outside the guided walk (page-level). */
  onOpenStrandedStep?: (questionId: string) => void;
  /** Clear every untouched hidden default at once from the review trail. */
  onRemoveStranded?: () => void;
  /** Clear every untouched quick-start answer still following the old profile. */
  onRemoveDrift?: () => void;
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
    <div className="wm-guided-entry" data-wingman-guided-interview="true" data-guided-interview-entry="true">
      <button type="button" onClick={onStart} className="wm-guided-entry-card">
        <span className="wm-guided-entry-icon" aria-hidden="true"><Mic /></span>
        <span className="wm-guided-entry-copy">
          <strong>{reviewing ? `Review ${DISCOVERY_CAPTURE_PRESENTATION.label.toLowerCase()}` : resuming ? `Continue ${DISCOVERY_CAPTURE_PRESENTATION.label.toLowerCase()}` : DISCOVERY_CAPTURE_PRESENTATION.label}</strong>
          <small>
            {reviewing
              ? `${answeredCount} of ${total} captured`
              : resuming
                ? `${answeredCount} of ${total} captured — pick up at the first open question`
                : "Answer aloud — Wingman asks each question and keeps the wording you answer with"}
            {reviewing && <span className="sr-only"> Re-walk every question.</span>}
          </small>
        </span>
        <span className="wm-guided-entry-go" aria-hidden="true">
          {reviewing ? "Review" : resuming ? "Continue" : "Start"}
          <ArrowRight />
        </span>
      </button>
      {reviewing && openCount > 0 && onStartReviewOpen && (
        <button type="button" onClick={onStartReviewOpen} className="wm-guided-entry-card is-open">
          <span className="wm-guided-entry-icon" aria-hidden="true"><ListChecks /></span>
          <span className="wm-guided-entry-copy">
            <strong>Re-verify open questions — voice Q&A</strong>
            <small>{openCount} question{openCount === 1 ? " is" : "s are"} still marked “to be confirmed” — walk only those before sign-off, answers stay saved.</small>
          </span>
          <span className="wm-guided-entry-go" aria-hidden="true">
            Open
            <ArrowRight />
          </span>
        </button>
      )}
    </div>
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
  strandedQuickStart,
  applicationDrift,
  onOpenStrandedStep,
  onRemoveStranded,
  onRemoveDrift,
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
  const confidenceForMatch = useCallback(
    (m: GuidedAnswerMatch): "high" | "matched" | "low" =>
      m.score >= 5 ? "high" : m.confidence === "matched" ? "matched" : "low",
    [],
  );

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

  // "Open step" from the stranded-defaults notice inside the review trail:
  // jump the guided walk to the owning question when it is part of the current
  // walk (full or focused re-verify), so the rep lands directly on the hidden
  // default to re-choose. Questions outside the walk delegate to the page's
  // step opener (which handles mode escalation for Basic-only questions).
  const openStrandedQuestion = useCallback(
    (questionId: string) => {
      const walkIndex = walkQuestions.findIndex((question) => question.id === questionId);
      if (walkIndex >= 0) {
        setHeard("");
        setMatch(null);
        setInterim("");
        setIndex(walkIndex);
        setShowSummary(false);
        return;
      }
      onOpenStrandedStep?.(questionId);
    },
    [onOpenStrandedStep, walkQuestions],
  );

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
      <div className="wm-guided-empty">
        <p className="wm-guided-copy">No questions are open in this walk.</p>
        <button type="button" className="wm-ui-button wm-ui-button-secondary" onClick={onExit}>
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
        ? { label: "High confidence", tone: "high", bars: 3 }
        : confidenceForMatch(match) === "matched"
          ? { label: "Matched", tone: "matched", bars: 2 }
          : { label: "Low confidence — verify", tone: "low", bars: 1 }
      : null;

  return (
    <div className="wm-guided-interview" data-wingman-guided-interview="true">
      {/* Interview header + progress */}
      <section className="wm-guided-panel wm-guided-header">
        <div className="wm-guided-header-main">
          <div className="wm-guided-header-copy">
            <p className="wm-guided-eyebrow">{DISCOVERY_CAPTURE_PRESENTATION.label}</p>
            <h2 className="wm-guided-title">Answer aloud — the wording is kept with the answer.</h2>
            <p className="wm-guided-copy">
              Wingman asks, you answer — notes and product selection build as you go.
            </p>
            {focusedReview ? (
              <p className="wm-guided-note is-warning">
                Re-verifying {openQuestions.length} open question{openQuestions.length === 1 ? "" : "s"} still marked “to be confirmed” — confirm with the customer to settle each row before sign-off.
              </p>
            ) : reviewMode ? (
              <p className="wm-guided-note">
                Reviewing conversation — every question is captured. Answers stay saved; change anything before sign-off.
              </p>
            ) : startedResumed ? (
              <p className="wm-guided-note">
                Resumed — continuing at the first open question. Earlier answers are saved.
              </p>
            ) : null}
          </div>
          <div className="wm-expert-capture-count">
            <strong>{answeredCount}</strong>
            <span>of {questions.length} captured</span>
          </div>
        </div>

        <div className="wm-guided-meter">
          <div className="wm-guided-meter-line">
            <span>
              {answeredCount} of {questions.length} questions captured
            </span>
            <b>{percent}%</b>
          </div>
          <div className="wm-guided-meter-track" aria-hidden="true">
            <span style={{ width: `${percent}%` }} />
          </div>
        </div>

        <div className="wm-guided-chips">
          {ttsSupported && (
            <button
              type="button"
              onClick={() => setAutoSpeak((current) => !current)}
              className={autoSpeak ? "wm-guided-chip is-active" : "wm-guided-chip"}
              aria-pressed={autoSpeak}
              title={autoSpeak ? "Wingman reads each question aloud" : "Questions are not read aloud"}
            >
              {autoSpeak ? <Volume2 /> : <VolumeX />}
              {autoSpeak ? "Speak on" : "Speak off"}
            </button>
          )}
          {ttsSupported && (
            <button
              type="button"
              onClick={previewVoice}
              className="wm-guided-chip"
              title={`Hear the voice for ${activeSpeechLang}`}
            >
              <Volume1 />
              Preview voice
            </button>
          )}
          {ttsSupported && (
            <label
              className="wm-guided-chip"
              title="Spoken language for this call — the profile capture language is unchanged"
            >
              <Languages />
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
              >
                {SPOKEN_LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.lang} value={option.lang}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button type="button" onClick={exitInterview} className="wm-guided-chip">
            Exit to standard questions
          </button>
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
          strandedQuickStart={strandedQuickStart}
          applicationDrift={applicationDrift}
          onOpenStrandedStep={openStrandedQuestion}
          onRemoveStranded={onRemoveStranded}
          onRemoveDrift={onRemoveDrift}
          onExit={onExit}
          interviewLang={activeInterviewLang}
          speechLang={activeSpeechLang}
        />
      ) : (
        <>
          {reviewMode && sectionStops.length > 1 && (
            <section className="wm-guided-jumps" aria-label="Jump to section">
              <span className="wm-guided-jumps-label">Jump to section:</span>
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
                      className="wm-guided-jump"
                      aria-pressed={active}
                    >
                      {stop.label}
                    </button>
                  );
                })}
            </section>
          )}

          {/* Current question */}
          <section
            className="wm-guided-question"
            data-guided-question={currentQuestion.id}
          >
            <div className="wm-guided-question-meta">
              <span className="wm-guided-section">
                {currentQuestion.section}
              </span>
              <span className="wm-guided-step">
                {focusedReview
                  ? `Open question ${safeIndex + 1} of ${walkQuestions.length}`
                  : `Question ${safeIndex + 1} of ${questions.length}`}
              </span>
            </div>

            <h2>{currentView.question}</h2>
            <p className="wm-guided-prompt">{currentView.prompt}</p>
            {activeInterviewLang !== "en" && (
              <p lang={activeSpeechLang} className="wm-guided-stem">
                {spokenText.question}
                {languageTablesPending && (
                  <span className="wm-guided-stem-status" role="status" aria-label="Loading language tables">
                    <Loader2 aria-hidden="true" className="animate-spin" />
                    loading language tables…
                  </span>
                )}
              </p>
            )}

            {/* Currently captured — review mode summary for this question */}
            {capturedLabel && (
              <div className="wm-guided-state is-captured" data-guided-captured="true">
                <div className="wm-guided-state-head">
                  <p className="wm-guided-state-label">Currently captured</p>
                  <span className={capturedConfirmed ? "wm-guided-tag is-captured" : "wm-guided-tag is-open"}>
                    {capturedConfirmed
                      ? "Confirmed with customer"
                      : "To be confirmed"}
                  </span>
                </div>
                <p className="wm-guided-state-text">{capturedLabel}</p>
                {capturedNote && (
                  <p className="wm-guided-state-quote">“{capturedNote}”</p>
                )}
                <p className="wm-guided-state-hint">
                  Captured earlier — change it below before sign-off. Nothing
                  else in the discovery is reset.
                </p>
              </div>
            )}

            {/* Controls */}
            <div className="wm-guided-tools">
              {ttsSupported && (
                <button type="button" onClick={speakCurrent} className="wm-guided-chip">
                  <Volume2 />
                  Read question
                </button>
              )}
              <button
                type="button"
                onClick={beginListening}
                aria-pressed={listening}
                className={listening ? "wm-guided-mic is-listening" : "wm-guided-mic"}
              >
                {listening ? <MicOff /> : <Mic />}
                {listening ? "Listening — tap to stop" : "Open mic — answer by voice"}
              </button>
              <button type="button" onClick={skipQuestion} className="wm-guided-chip">
                Skip for now
              </button>
              {safeIndex > 0 && (
                <button type="button" onClick={goBack} className="wm-guided-chip">
                  <ChevronLeft />
                  Previous question
                </button>
              )}
            </div>

            {!micSupported && (
              <p className="wm-guided-warning">
                Voice capture needs a supported browser (Chrome or Edge). Type an
                answer or choose an option below — everything else still works.
              </p>
            )}
            {micError && <p className="wm-guided-warning">{micError}</p>}

            {/* Live transcript while listening */}
            {listening && (
              <div className="wm-guided-live" aria-live="polite">
                <p className="wm-guided-live-label">
                  <span className="wm-guided-live-dot" aria-hidden="true" />
                  Listening… speak your answer
                </p>
                <p className="wm-guided-live-text">{interim || "…"}</p>
              </div>
            )}

            {/* Heard answer + interpretation */}
            {!listening && heard && (
              <div className="wm-guided-state" data-guided-heard="true">
                <p className="wm-guided-state-label">You said</p>
                <p className="wm-guided-state-text">“{heard}”</p>

                {match && match.values.length > 0 && matchTierStyle ? (
                  <>
                    <div className="wm-guided-state-head">
                      <span className={`wm-guided-match is-${matchTierStyle.tone}`}>
                        {matchTierStyle.label}
                      </span>
                      <span
                        className="wm-guided-bars"
                        role="img"
                        title={`Confidence ${matchTierStyle.bars} of 3`}
                        aria-label={`Confidence ${matchTierStyle.bars} of 3`}
                      >
                        {[1, 2, 3].map((bar) => (
                          <span
                            key={bar}
                            className={`wm-guided-bar${bar <= matchTierStyle.bars ? " is-on" : ""}${matchTierStyle.tone === "low" ? " is-low" : ""}`}
                          />
                        ))}
                      </span>
                    </div>
                    <ul className="wm-guided-heard-list">
                      <li>
                        <Check aria-hidden="true" />
                        {match.labels.join(", ")}
                      </li>
                    </ul>
                    <div className="wm-guided-tools">
                      <button
                        type="button"
                        onClick={confirmHeardAnswer}
                        className="wm-ui-button wm-ui-button-primary"
                      >
                        That's right
                        <ArrowRight />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setHeard("");
                          setMatch(null);
                          window.setTimeout(beginListening, 120);
                        }}
                        className="wm-guided-chip"
                      >
                        <RotateCcw />
                        Try again
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="wm-guided-state-hint">
                      I didn't quite catch that. Try again, or choose from the options below.
                    </p>
                    <div className="wm-guided-tools">
                      <button
                        type="button"
                        onClick={() => {
                          applyAnswer([], heard);
                          advance();
                        }}
                        className="wm-guided-chip"
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
                        className="wm-guided-chip"
                      >
                        <RotateCcw />
                        Try again
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Quick-start defaults that the interview filters can strand an
                answer; surface them here instead of letting them silently
                contradict the captured answers. */}
            <DiscoveryDefaultsConflictAlert
              questionId={currentQuestion.id}
              visibleOptionValues={currentView.options.map((option) => option.value)}
              answer={answers[currentQuestion.id]}
            />

            {/* Manual options — always available as the fallback */}
            <div className="wm-guided-answer">
              <p className="wm-guided-label">
                Or choose an option
                {wmDiscoveryIsMultiSelectStep(currentQuestion) ? " (pick all that apply)" : ""}
              </p>
              <div className="wm-room-wizard-options">
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
                      className="wm-room-wizard-option"
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
                  className="wm-ui-button wm-ui-button-primary wm-guided-next"
                >
                  Next question
                  <ArrowRight />
                </button>
              )}
            </div>
          </section>

          {/* Notes trail */}
          <section className="wm-guided-panel wm-guided-trail">
            <button
              type="button"
              onClick={() => setTrailOpen((current) => !current)}
              className="wm-guided-trail-toggle"
              aria-expanded={trailOpen}
            >
              <span>
                <ListChecks />
                Notes captured so far ({answeredCount})
              </span>
              <ChevronDown
                className={trailOpen ? "wm-guided-trail-chevron is-open" : "wm-guided-trail-chevron"}
              />
            </button>
            {trailOpen && (
              <div className="wm-guided-trail-body">
                {questions.filter(
                  (question) =>
                    wmDiscoveryHasAnswer(answers[question.id]) ||
                    Boolean(notes[question.id]?.trim()),
                ).length === 0 ? (
                  <p className="wm-guided-trail-empty">
                    No notes yet — answer the first question to get started.
                  </p>
                ) : (
                  <ul className="wm-guided-trail-list">
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
                          <li key={question.id} className="wm-guided-trail-row">
                            <div className="wm-guided-trail-copy">
                              <p>
                                <strong>{question.shortLabel}</strong>
                                <span>
                                  {wmDiscoveryHasAnswer(answers[question.id])
                                    ? getOptionLabel(question, answers[question.id], application)
                                    : "Note only"}
                                  {notes[question.id]?.trim()
                                    ? ` — ${notes[question.id].trim()}`
                                    : ""}
                                </span>
                              </p>
                              {localizedDiffers && (
                                <p lang={activeSpeechLang} className="wm-guided-stem">
                                  {question.question} — {localized.question}
                                </p>
                              )}
                            </div>
                            {onConfirmedChange && (
                              <button
                                type="button"
                                className="wm-guided-confirm"
                                aria-pressed={confirmed[question.id] === true}
                                onClick={() => toggleConfirmed(question.id)}
                              >
                                {confirmed[question.id] === true ? "Confirmed" : "Confirm with customer"}
                              </button>
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
  strandedQuickStart,
  applicationDrift,
  onOpenStrandedStep,
  onRemoveStranded,
  onRemoveDrift,
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
  /** Stranded quick-start defaults surfaced in the review trail. */
  strandedQuickStart?: ReadonlyArray<StrandedQuickStartDefault>;
  /** Post-seed application drift, shown beside the stranded defaults. */
  applicationDrift?: DiscoveryApplicationDrift | null;
  /** Guided-internal jump to the owning question of a stranded row. */
  onOpenStrandedStep?: (questionId: string) => void;
  /** Clear every untouched hidden default at once from the review trail. */
  onRemoveStranded?: () => void;
  /** Clear every untouched quick-start answer still following the old profile. */
  onRemoveDrift?: () => void;
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
    <section className="wm-guided-panel wm-guided-summary">
      <div className="wm-guided-summary-head">
        <span className="wm-guided-summary-icon" aria-hidden="true">
          <Sparkles />
        </span>
        <div>
          <h2>Interview complete</h2>
          <p>Here is everything Wingman noted from the conversation.</p>
        </div>
      </div>

      {unansweredCount > 0 && (
        <p className="wm-guided-warning">
          {unansweredCount} question{unansweredCount === 1 ? " was" : "s were"} left
          open — Wingman will flag these for confirmation rather than assume them.
        </p>
      )}
      {lowConfidenceAnswers && lowConfidenceAnswers.length > 0 && (
        <p className="wm-guided-warning">
          <CheckCheck aria-hidden="true" />{" "}
          {lowConfidenceAnswers.length} low-confidence answer
          {lowConfidenceAnswers.length === 1 ? " was" : "s were"} captured on
          partial matches — re-verify before generating recommendations:{" "}
          {lowConfidenceAnswers.join("; ")}.
        </p>
      )}

      <ul className="wm-guided-summary-list">
        {questions.map((question) => {
          const hasAnswer = wmDiscoveryHasAnswer(answers[question.id]);
          const note = notes[question.id]?.trim() ?? "";
          const localized = translateInterviewQuestion(question, interviewLang);
          const localizedDiffers = localized.question !== question.question;
          return (
            <li key={question.id} className="wm-guided-summary-row">
              <div className="wm-guided-summary-row-head">
                <div>
                  <strong>{question.shortLabel}</strong>
                  <small>{question.question}</small>
                  {localizedDiffers && (
                    <p lang={speechLang} className="wm-guided-stem">
                      {localized.question}
                    </p>
                  )}
                </div>
                <span className="wm-guided-tags">
                  <span className={hasAnswer ? "wm-guided-tag is-captured" : "wm-guided-tag is-open"}>
                    {hasAnswer ? "Captured" : "Open"}
                  </span>
                  {onConfirmedChange && (
                    <button
                      type="button"
                      className="wm-guided-confirm"
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
                <p className="wm-guided-summary-row-answer">
                  {getOptionLabel(question, answers[question.id], application)}
                </p>
              )}
              {note && <p className="wm-guided-summary-row-note">“{note}”</p>}
            </li>
          );
        })}
      </ul>

      {(strandedQuickStart && strandedQuickStart.length > 0) ||
      (applicationDrift && applicationDrift.items.length > 0) ? (
        <DiscoveryStrandedDefaultsNotice
          items={strandedQuickStart ?? []}
          applicationDrift={applicationDrift}
          onOpenStep={onOpenStrandedStep}
          onRemoveStranded={onRemoveStranded}
          onRemoveDrift={onRemoveDrift}
        />
      ) : null}

      <div className="wm-guided-summary-actions">
        <button type="button" onClick={onFinish} className="wm-ui-button wm-ui-button-primary">
          Generate product recommendations
          <ArrowRight />
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
            className="wm-ui-button wm-ui-button-secondary"
          >
            <CheckCheck />
            Confirm all captured ({unconfirmedCapturedCount})
          </button>
        )}
        {openCount > 0 && onReviewOpen && (
          <button type="button" onClick={onReviewOpen} className="wm-ui-button wm-ui-button-secondary">
            <ListChecks />
            Re-verify {openCount} open question{openCount === 1 ? "" : "s"}
          </button>
        )}
        <button type="button" onClick={onReview} className="wm-ui-button wm-ui-button-secondary">
          <ListChecks />
          Review all questions
        </button>
        <button type="button" onClick={onBack} className="wm-guided-chip">
          Back to questions
        </button>
        <button type="button" onClick={onExit} className="wm-guided-chip">
          Exit to standard questions
        </button>
      </div>
    </section>
  );
}

export default DiscoveryGuidedInterview;
