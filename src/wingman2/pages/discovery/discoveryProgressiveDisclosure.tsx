/**
 * DiscoveryProgressiveDisclosure — Shows 3 questions at a time with smart defaults.
 *
 * This component wraps the existing question rendering and adds:
 * 1. Batch navigation (3 questions per batch)
 * 2. Smart defaults based on application type
 * 3. Quick mode toggle for simple rooms
 * 4. Progress indicators showing batch completion
 */
import { useState, useMemo, useRef, useCallback } from "react";
import type { DiscoveryAnswers, DiscoveryQuestion } from "./discoveryTypes";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DiscoveryMode = "quick" | "standard";

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

// ─── Quick Mode Configuration ─────────────────────────────────────────────────

const QUICK_MODE_QUESTION_IDS = [
  "opportunity",   // What type of room?
  "scale",         // How big?
  "sources",       // How many sources?
] as const;

const SMART_DEFAULTS: Record<string, Partial<DiscoveryAnswers>> = {
  "meeting-room": {
    scale: "single-large-room",
    sources: "two-four-sources",
    displays: "one-display",
    "display-behaviour": "independent-display",
    "signal-standard": "standard-4k60",
    audio: "room-speakers",
    control: "touch-panel",
  },
  "classroom": {
    scale: "single-large-room",
    sources: "two-four-sources",
    displays: "one-display",
    "display-behaviour": "projector-or-large-display",
    "signal-standard": "standard-4k60",
    audio: "room-speakers",
    control: "simple-control",
  },
  "hospitality": {
    scale: "multi-room",
    sources: "five-eight-sources",
    displays: "multiple-displays",
    "display-behaviour": "independent-display",
    "signal-standard": "standard-4k60",
    audio: "distributed-audio",
    control: "staff-control",
  },
  "video-wall": {
    scale: "single-large-room",
    sources: "two-four-sources",
    displays: "video-wall-output",
    "display-behaviour": "video-wall-or-processor-feed",
    "signal-standard": "standard-4k60",
    audio: "room-speakers",
    control: "simple-control",
  },
  "av-over-ip": {
    scale: "building-wide",
    sources: "five-eight-sources",
    displays: "multiple-displays",
    "display-behaviour": "independent-display",
    "signal-standard": "standard-4k60",
    audio: "distributed-audio",
    control: "network-control",
  },
};

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

export function applySmartDefaults(
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
  /** Whether to show the quick mode toggle */
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
  const bannerRef = useRef<HTMLDivElement>(null);

  // Scroll the banner so the clicked step snaps into view
  const handleStepClick = useCallback((globalIndex: number) => {
    onActiveIndexChange(globalIndex);
    // Scroll the banner to show the clicked item
    requestAnimationFrame(() => {
      const item = bannerRef.current?.querySelector(`[data-question-index="${globalIndex}"]`);
      item?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
    });
  }, [onActiveIndexChange]);

  // Get the current batch of questions
  const currentBatch = useMemo(() => {
    if (mode === "quick") {
      // In quick mode, show only the essential questions
      const quickQuestions = questions.filter((q) =>
        QUICK_MODE_QUESTION_IDS.includes(q.id as typeof QUICK_MODE_QUESTION_IDS[number]),
      );
      return getQuestionBatch(quickQuestions, 0, 3);
    }
    return getQuestionBatch(questions, activeIndex, 3);
  }, [questions, activeIndex, mode]);

  // Calculate batch info
  const batchNumber = getCurrentBatchNumber(activeIndex, 3);
  const totalBatches = getTotalBatches(questions.length, 3);
  const isFirstBatch = batchNumber === 1;
  const isLastBatch = batchNumber === totalBatches;

  // Check for smart defaults
  const selectedApplication = typeof answers.opportunity === "string" ? answers.opportunity : (Array.isArray(answers.opportunity) ? answers.opportunity[0] || "" : "");
  const defaultsApplied = hasSmartDefaults(answers, selectedApplication);

  // Handle applying smart defaults
  const handleApplyDefaults = () => {
    const updatedAnswers = applySmartDefaults(answers, selectedApplication);
    onAnswersChange(updatedAnswers);
    setShowSmartDefaultsBanner(false);
  };

  // Handle batch navigation
  const goToNextBatch = () => {
    if (!isLastBatch) {
      onActiveIndexChange(Math.min(activeIndex + 3, questions.length - 1));
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
            className={`wm-discovery-mode-button ${mode === "quick" ? "is-active" : ""}`}
            onClick={() => onModeChange("quick")}
            aria-pressed={mode === "quick"}
          >
            <span className="wm-discovery-mode-icon" aria-hidden="true">⚡</span>
            Quick mode
          </button>
          <button
            type="button"
            className={`wm-discovery-mode-button ${mode === "standard" ? "is-active" : ""}`}
            onClick={() => onModeChange("standard")}
            aria-pressed={mode === "standard"}
          >
            <span className="wm-discovery-mode-icon" aria-hidden="true">📋</span>
            Full discovery
          </button>
          <span className="wm-discovery-mode-hint">
            {mode === "quick"
              ? "3 essential questions — get a product direction fast"
              : `${questions.length} questions — capture full requirements`}
          </span>
        </div>
      )}

      {/* Smart Defaults Banner */}
      {showBatchControls && selectedApplication && !defaultsApplied && !isReviewingAnswers && (
        <div className="wm-discovery-smart-defaults-banner" data-wingman-smart-defaults="true">
          <div className="wm-discovery-smart-defaults-content">
            <span className="wm-discovery-smart-defaults-icon" aria-hidden="true">✨</span>
            <div>
              <strong>Smart defaults available</strong>
              <p>
                Pre-fill common answers for a {selectedApplication.replace(/-/g, " ")} room?
                You can always change them later.
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

      {/* Batch Progress Indicator */}
      {showBatchControls && mode === "standard" && !isReviewingAnswers && (
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
          {showBatchControls && mode === "standard" && !isReviewingAnswers && (
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
          {showBatchControls && mode === "standard" && !isReviewingAnswers && (
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

      {/* Quick Mode Summary */}
      {showBatchControls && mode === "quick" && (
        <div className="wm-discovery-quick-summary" data-wingman-quick-summary="true">
          <p>
            <strong>Quick mode:</strong> Answer the 3 questions above to get a product direction.
            {mode === "quick" && " Switch to Full discovery for complete requirements."}
          </p>
        </div>
      )}
    </div>
  );
}

export default DiscoveryProgressiveDisclosure;
