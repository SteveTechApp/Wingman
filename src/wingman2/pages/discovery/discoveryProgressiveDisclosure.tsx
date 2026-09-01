/**
 * DiscoveryProgressiveDisclosure — Shows questions in batches with smart defaults.
 *
 * Two modes:
 *   • **Basic** — template-first: asks only 6 high-impact questions that drive
 *     the architecture decision. All other questions receive smart defaults from
 *     the selected template. Escalates to Expert automatically when the customer's
 *     requirements depart from the template assumptions.
 *
 *   • **Expert** — full discovery: all questions are visible and required.
 *     Complete technical capture for complex, non-standard or multi-room designs.
 *
 * The mode toggle replaces the old "Quick / Full discovery" toggle.
 */
import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import type { DiscoveryAnswers, DiscoveryQuestion } from "./discoveryTypes";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DiscoveryMode = "basic" | "expert";

type QuestionBatch = {
  startIndex: number;
  endIndex: number;
  questions: Array<{
    id: string;
    shortLabel: string;
    section: string;
    question: string;
    prompt: string;
    required: boolean;
  }>;
};

// ─── Basic Mode Configuration ─────────────────────────────────────────────────

/**
 * The 6 questions that drive the architecture decision in Basic mode.
 * These are the minimum viable inputs for Wingman to produce a product
 * direction. Everything else gets a smart default from the template.
 */
export const BASIC_MODE_REQUIRED_IDS = [
  "opportunity",         // What type of room? — drives template selection
  "scale",               // How big? — drives system complexity
  "sources",             // How many sources? — drives input count
  "displays",            // How many displays? — drives output count
  "display-behaviour",   // How should displays behave? — key architectural decision
  "uc-purpose",          // Camera/mic workflows? — key for BYOM/BYOD
] as const;

const BASIC_MODE_REQUIRED_SET = new Set<string>(BASIC_MODE_REQUIRED_IDS);

/**
 * Smart defaults keyed by application type. These fill in the questions
 * that Basic mode doesn't ask, so the integrity gate sees plausible values.
 */
export const SMART_DEFAULTS: Record<string, Partial<DiscoveryAnswers>> = {
  "meeting-room": {
    scale: "single-large-room",
    sources: "two-four-sources",
    "source-connection": "mixed-hdmi-usbc",
    displays: "one-display",
    "display-behaviour": "independent-routing-per-display",
    "signal-standard": "4k60-standard",
    audio: "room-audio",
    control: "touch-panel",
    usb: "byod-byom",
    "uc-purpose": ["video-conferencing"],
  },
  "classroom": {
    scale: "single-large-room",
    sources: "two-four-sources",
    "source-connection": "mixed-hdmi-usbc",
    displays: "one-display",
    // Aligned with quickStartConfigs.classroom: a teaching space mirrors one
    // source to a projector/display, typically fed at standard HD. The prior
    // values (video-wall-or-processor-feed / 4k60-standard) implied a wall
    // processor feed that classrooms do not use.
    "display-behaviour": "same-content-all-displays",
    "signal-standard": "1080p-standard-hdmi",
    audio: "room-audio",
    control: "simple-auto",
    usb: "room-pc-uc",
  },
  "hospitality": {
    scale: "multi-room",
    sources: "five-eight-sources",
    "source-connection": "fixed-hdmi-sources",
    displays: "three-eight-displays",
    "display-behaviour": "independent-routing-per-display",
    "signal-standard": "4k60-standard",
    audio: "distributed-70v-100v",
    control: "front-panel-remote",
  },
  "video-wall": {
    scale: "single-large-room",
    sources: "two-four-sources",
    "source-connection": "fixed-hdmi-sources",
    displays: "video-wall-output",
    "display-behaviour": "video-wall-or-processor-feed",
    "signal-standard": "4k60-standard",
    audio: "room-audio",
    control: "simple-auto",
  },
  "av-over-ip": {
    scale: "building-wide",
    sources: "five-eight-sources",
    "source-connection": "network-video-sources",
    displays: "three-eight-displays",
    "display-behaviour": "independent-routing-per-display",
    "signal-standard": "4k60-standard",
    audio: "distributed-70v-100v",
    control: "software-app-control",
  },
};

/**
 * Escalation triggers: when a Basic mode answer matches one of these
 * patterns, the system suggests switching to Expert because the
 * requirement departs from typical template assumptions.
 */
export const ESCALATION_TRIGGERS: Array<{
  questionId: string;
  values: string[];
  reason: string;
}> = [
  {
    questionId: "displays",
    values: ["nine-plus-displays", "video-wall-output"],
    reason: "9+ displays or a video wall requires detailed signal-path planning that goes beyond template defaults.",
  },
  {
    questionId: "sources",
    values: ["nine-plus-sources"],
    reason: "9+ sources typically need a matrix or networked system with detailed port planning.",
  },
  {
    questionId: "scale",
    values: ["building-wide"],
    reason: "Building-wide systems need VLAN, network topology and distance planning that templates don't cover.",
  },
  {
    questionId: "display-behaviour",
    values: ["multiview-on-one-output"],
    reason: "Multiview requires specific decoder selection and layout configuration beyond template scope.",
  },
  {
    questionId: "uc-purpose",
    values: ["recording-streaming", "camera-distribution-only"],
    reason: "Recording, streaming or camera distribution workflows need detailed USB/audio path planning.",
  },
];

// ─── Utility Functions ────────────────────────────────────────────────────────

function getQuestionBatch(
  allQuestions: Array<{ id: string; shortLabel: string; section: string; question: string; prompt: string; required: boolean }>,
  startIndex: number,
  batchSize: number = 3,
): QuestionBatch {
  const endIndex = Math.min(startIndex + batchSize, allQuestions.length);
  return {
    startIndex,
    endIndex,
    questions: allQuestions.slice(startIndex, endIndex),
  };
}

function getTotalBatches(questionCount: number, batchSize: number = 3): number {
  return Math.ceil(questionCount / batchSize);
}

function getCurrentBatchNumber(activeIndex: number, batchSize: number = 3): number {
  return Math.floor(activeIndex / batchSize) + 1;
}

export function applyApplicationSmartDefaults(
  currentAnswers: DiscoveryAnswers,
  applicationType: string,
): DiscoveryAnswers {
  const defaults = SMART_DEFAULTS[applicationType];
  if (!defaults) return currentAnswers;
  const updated = { ...currentAnswers };
  for (const [key, value] of Object.entries(defaults)) {
    if (!updated[key] && value) {
      updated[key] = value;
    }
  }
  return updated;
}

function hasSmartDefaults(answers: DiscoveryAnswers, applicationType: string): boolean {
  const defaults = SMART_DEFAULTS[applicationType];
  if (!defaults) return false;
  return Object.keys(defaults).some((key) => answers[key] === defaults[key]);
}

/**
 * Check if the current answers trigger an escalation from Basic to Expert.
 * Returns the first matching trigger's reason, or null if no escalation needed.
 */
export function checkEscalationTriggers(answers: DiscoveryAnswers): string | null {
  for (const trigger of ESCALATION_TRIGGERS) {
    const answer = answers[trigger.questionId];
    if (!answer) continue;
    const values = Array.isArray(answer) ? answer : [answer];
    if (values.some((v) => trigger.values.includes(v))) {
      return trigger.reason;
    }
  }
  return null;
}

/**
 * Filter questions for Basic mode: only the required questions are shown,
 * all others are hidden (they receive smart defaults instead).
 */
function filterQuestionsForMode(
  questions: DiscoveryQuestion[],
  mode: DiscoveryMode,
): DiscoveryQuestion[] {
  if (mode === "expert") return questions;

  // Basic mode: show only the high-impact required questions
  return questions.filter((q) => BASIC_MODE_REQUIRED_SET.has(q.id));
}

// ─── Types ────────────────────────────────────────────────────────────────────

type DiscoveryProgressiveDisclosureProps = {
  /** All discovery questions */
  questions: DiscoveryQuestion[];
  /** Current active question index */
  activeIndex: number;
  /** Current answers */
  answers: DiscoveryAnswers;
  /** Callback when answers change */
  onAnswersChange: (answers: DiscoveryAnswers) => void;
  /** Callback when active index changes */
  onActiveIndexChange: (index: number) => void;
  /** Current discovery mode */
  mode: DiscoveryMode;
  /** Callback when mode changes */
  onModeChange: (mode: DiscoveryMode) => void;
  /** Whether the rep is reviewing answers */
  isReviewingAnswers: boolean;
  /** Whether to show the mode toggle */
  showModeToggle?: boolean;
  /** Whether to show batch controls (mode toggle, dots, nav) — hides after first answers */
  showBatchControls?: boolean;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function DiscoveryProgressiveDisclosure({
  questions,
  activeIndex,
  answers,
  onAnswersChange,
  onActiveIndexChange,
  mode,
  onModeChange,
  isReviewingAnswers,
  showModeToggle = true,
  showBatchControls = true,
}: DiscoveryProgressiveDisclosureProps) {
  const [showSmartDefaultsBanner, setShowSmartDefaultsBanner] = useState(false);
  const [escalationReason, setEscalationReason] = useState<string | null>(null);
  const bannerRef = useRef<HTMLDivElement>(null);

  // Filter questions based on mode
  const visibleQuestions = useMemo(
    () => filterQuestionsForMode(questions, mode),
    [questions, mode],
  );

  // Auto-apply smart defaults when entering Basic mode
  useEffect(() => {
    if (mode === "basic") {
      const selectedApplication = typeof answers.opportunity === "string"
        ? answers.opportunity
        : Array.isArray(answers.opportunity) ? answers.opportunity[0] || "" : "";

      if (selectedApplication && !hasSmartDefaults(answers, selectedApplication)) {
        setShowSmartDefaultsBanner(true);
      }
    }
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Check for escalation triggers when answers change in Basic mode
  useEffect(() => {
    if (mode === "basic") {
      const reason = checkEscalationTriggers(answers);
      setEscalationReason(reason);
    } else {
      setEscalationReason(null);
    }
  }, [answers, mode]);

  // Scroll the banner so the clicked step snaps into view
  const handleStepClick = useCallback((globalIndex: number) => {
    onActiveIndexChange(globalIndex);
    requestAnimationFrame(() => {
      const item = bannerRef.current?.querySelector(`[data-question-index="${globalIndex}"]`);
      item?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
    });
  }, [onActiveIndexChange]);

  // Get the current batch of questions
  const currentBatch = useMemo(() => {
    return getQuestionBatch(visibleQuestions, activeIndex, 3);
  }, [visibleQuestions, activeIndex]);

  // Calculate batch info
  const batchNumber = getCurrentBatchNumber(activeIndex, 3);
  const totalBatches = getTotalBatches(visibleQuestions.length, 3);
  const isFirstBatch = batchNumber === 1;
  const isLastBatch = batchNumber === totalBatches;

  // Check for smart defaults
  const selectedApplication = typeof answers.opportunity === "string"
    ? answers.opportunity
    : Array.isArray(answers.opportunity) ? answers.opportunity[0] || "" : "";
  // Handle applying smart defaults
  const handleApplyDefaults = () => {
    const updatedAnswers = applyApplicationSmartDefaults(answers, selectedApplication);
    onAnswersChange(updatedAnswers);
    setShowSmartDefaultsBanner(false);
  };

  // Handle batch navigation
  const goToNextBatch = () => {
    if (!isLastBatch) {
      onActiveIndexChange(Math.min(activeIndex + 3, visibleQuestions.length - 1));
    }
  };

  const goToPreviousBatch = () => {
    if (!isFirstBatch) {
      onActiveIndexChange(Math.max(activeIndex - 3, 0));
    }
  };

  // Don't render if no questions
  if (questions.length === 0) return null;

  return (
    <div className="wm-discovery-progressive-disclosure" data-wingman-progressive-disclosure="true">
      {/* Mode Toggle */}
      {showBatchControls && showModeToggle && !isReviewingAnswers && (
        <div className="wm-discovery-mode-toggle" data-wingman-mode-toggle="true">
          <button
            type="button"
            className={`wm-discovery-mode-button ${mode === "basic" ? "is-active" : ""}`}
            onClick={() => onModeChange("basic")}
            aria-pressed={mode === "basic"}
          >
            <span className="wm-discovery-mode-icon" aria-hidden="true">🎯</span>
            Basic
          </button>
          <button
            type="button"
            className={`wm-discovery-mode-button ${mode === "expert" ? "is-active" : ""}`}
            onClick={() => onModeChange("expert")}
            aria-pressed={mode === "expert"}
          >
            <span className="wm-discovery-mode-icon" aria-hidden="true">🔬</span>
            Expert
          </button>
          <span className="wm-discovery-mode-hint">
            {mode === "basic"
              ? `${visibleQuestions.length} essential questions — get a product direction fast`
              : `${questions.length} questions — capture full requirements`}
          </span>
        </div>
      )}

      {/* Smart Defaults Banner — Basic mode only */}
      {showBatchControls && showSmartDefaultsBanner && mode === "basic" && !isReviewingAnswers && (
        <div className="wm-discovery-smart-defaults-banner" data-wingman-smart-defaults="true">
          <div className="wm-discovery-smart-defaults-content">
            <span className="wm-discovery-smart-defaults-icon" aria-hidden="true">✨</span>
            <div>
              <strong>Template defaults available</strong>
              <p>
                Pre-fill common answers for a {selectedApplication.replace(/-/g, " ")} room?
                You can always change them later or switch to Expert for full control.
              </p>
            </div>
          </div>
          <div className="wm-discovery-smart-defaults-actions">
            <button
              type="button"
              className="wm-ui-button wm-ui-button-primary"
              onClick={handleApplyDefaults}
            >
              Apply defaults
            </button>
            <button
              type="button"
              className="wm-ui-button wm-ui-button-secondary"
              onClick={() => setShowSmartDefaultsBanner(false)}
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {/* Escalation Banner — shown when Basic mode answers trigger Expert suggestion */}
      {showBatchControls && escalationReason && mode === "basic" && !isReviewingAnswers && (
        <div className="wm-discovery-escalation-banner" data-wingman-escalation="true" role="alert">
          <div className="wm-discovery-escalation-content">
            <span className="wm-discovery-escalation-icon" aria-hidden="true">⚠️</span>
            <div>
              <strong>Consider switching to Expert</strong>
              <p>{escalationReason}</p>
            </div>
          </div>
          <div className="wm-discovery-escalation-actions">
            <button
              type="button"
              className="wm-ui-button wm-ui-button-primary"
              onClick={() => onModeChange("expert")}
            >
              Switch to Expert
            </button>
            <button
              type="button"
              className="wm-ui-button wm-ui-button-secondary"
              onClick={() => setEscalationReason(null)}
            >
              Stay in Basic
            </button>
          </div>
        </div>
      )}

      {/* Batch Progress Indicator — Expert mode only */}
      {showBatchControls && mode === "expert" && !isReviewingAnswers && (
        <div className="wm-discovery-batch-progress" data-wingman-batch-progress="true">
          <div className="wm-discovery-batch-dots">
            {Array.from({ length: totalBatches }, (_, i) => (
              <button
                key={i}
                type="button"
                className={`wm-discovery-batch-dot ${i + 1 === batchNumber ? "is-active" : ""} ${
                  i + 1 < batchNumber ? "is-completed" : ""
                }`}
                onClick={() => onActiveIndexChange(i * 3)}
                aria-label={`Go to batch ${i + 1}`}
                aria-current={i + 1 === batchNumber ? "step" : undefined}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <span className="wm-discovery-batch-label">
            Batch {batchNumber} of {totalBatches}
          </span>
        </div>
      )}

      {/* Questions in Current Batch */}
      <div className="wm-discovery-question-batch" data-wingman-question-batch="true">
        {/* Horizontal step banner with inline nav + progress counter */}
        <div className="wm-discovery-batch-step-banner-wrap">
        <div ref={bannerRef} className="wm-discovery-batch-step-banner" role="list" aria-label="Discovery questions in this batch">
          {showBatchControls && mode === "expert" && !isReviewingAnswers && (
            <button
              type="button"
              className="wm-discovery-batch-step-banner__nav"
              onClick={goToPreviousBatch}
              disabled={isFirstBatch}
              aria-label="Previous batch"
            >
              ← Prev
            </button>
          )}
          {currentBatch.questions.map((question, index) => {
            const globalIndex = activeIndex + index;
            const isActive = globalIndex === activeIndex;
            const answer = answers[question.id];
            const isAnswered = Array.isArray(answer) ? answer.length > 0 : !!answer;
            const bannerClass = [
              "wm-discovery-batch-step-banner__button",
              isActive ? "is-active" : "",
              isAnswered ? "is-answered" : "",
            ].filter(Boolean).join(" ");
            return (
              <span key={question.id} className="wm-discovery-batch-step-banner__item" role="listitem">
                <button
                  type="button"
                  className={bannerClass}
                  onClick={() => handleStepClick(globalIndex)}
                  aria-current={isActive ? "step" : undefined}
                  aria-label={`Question ${globalIndex + 1}: ${question.question}${isAnswered ? " (answered)" : ""}`}
                >
                  <span className="wm-discovery-batch-step-banner__number" aria-hidden="true">
                    {isAnswered ? (
                      <span className="wm-discovery-batch-step-banner__check" aria-hidden="true">✓</span>
                    ) : (
                      globalIndex + 1
                    )}
                  </span>
                  <span className="wm-discovery-batch-step-banner__text">
                    <span className="wm-discovery-batch-step-banner__section">
                      {question.section}
                      {question.required ? "" : " · Optional"}
                    </span>
                    <span className="wm-discovery-batch-step-banner__title">
                      {question.question}
                    </span>
                  </span>
                </button>
                {index < currentBatch.questions.length - 1 && (
                  <span className="wm-discovery-batch-step-banner__chevron" aria-hidden="true">
                    »
                  </span>
                )}
              </span>
            );
          })}
          {showBatchControls && mode === "expert" && !isReviewingAnswers && (
            <button
              type="button"
              className="wm-discovery-batch-step-banner__nav"
              onClick={goToNextBatch}
              disabled={isLastBatch}
              aria-label="Next batch"
            >
              Next →
            </button>
          )}
          {/* Batch progress counter — inside scrollable banner at the end */}
          {(() => {
            const batchAnswered = currentBatch.questions.filter((q) => {
              const a = answers[q.id];
              return Array.isArray(a) ? a.length > 0 : !!a;
            }).length;
            const batchTotal = currentBatch.questions.length;
            return (
              <span className="wm-discovery-batch-step-banner__progress" role="status" aria-live="polite" aria-label={`${batchAnswered} of ${batchTotal} questions answered`}>
                <span className="wm-discovery-batch-step-banner__progress-done">{batchAnswered}</span>
                <span className="wm-discovery-batch-step-banner__progress-sep">/</span>
                <span className="wm-discovery-batch-step-banner__progress-total">{batchTotal}</span>
              </span>
            );
          })()}
        </div>
        </div>

        {/* Active question content — full card with options */}
        {currentBatch.questions.map((question, index) => {
          const globalIndex = activeIndex + index;
          if (globalIndex !== activeIndex) return null;
          return (
            <div
              key={question.id}
              className="wm-discovery-batch-question"
              data-question-id={question.id}
              data-question-index={globalIndex}
            >
              <div className="wm-discovery-batch-question-content" data-question-content={question.id}>
                {/* Options will be injected here by the parent component */}
              </div>
            </div>
          );
        })}
      </div>

      {/* Basic Mode Summary */}
      {showBatchControls && mode === "basic" && !isReviewingAnswers && (
        <div className="wm-discovery-quick-summary" data-wingman-quick-summary="true">
          <p>
            <strong>Basic mode:</strong> Answer the {visibleQuestions.length} questions above.
            Template defaults fill in the rest. Switch to Expert for full technical detail.
          </p>
        </div>
      )}
    </div>
  );
}

export default DiscoveryProgressiveDisclosure;
