import type { Dispatch, SetStateAction } from "react";
import DiscoveryLocationsConnections from "../../components/DiscoveryLocationsConnections";
import type { ProjectTopology } from "../../lib/projectTopology";
import { DiscoveryCaptureSuggestion } from "./DiscoveryCaptureSuggestion";
import { DiscoveryDefaultsConflictAlert } from "./DiscoveryDefaultsConflictAlert";
import { DiscoveryOptionGraphic } from "./DiscoveryOpportunityGraphic";
import {
  DiscoveryQuestionIntro,
  getDiscoverySectionTone,
} from "./DiscoveryQuestionGraphic";
import { DiscoverySummaryCard } from "./DiscoverySummaryCard";
import type { DiscoveryApplicationDrift } from "./DiscoveryStrandedDefaultsNotice";
import {
  type StrandedQuickStartDefault,
  wmDiscoveryIsMultiSelectStep,
} from "./discoveryAnswerUtils";
import type {
  DiscoveryAnswerValue,
  DiscoveryAnswers,
  DiscoveryNotes,
  DiscoveryQuestion,
  DiscoveryQuestionView,
  DiscoverySummaryItem,
} from "./discoveryTypes";
import type { getQuestionStrategy } from "./discoveryQuestions";

type DiscoveryQuestionSectionProps = {
  activeIndex: number;
  questionCount: number;
  currentStep: DiscoveryQuestion;
  currentStepView: DiscoveryQuestionView;
  currentAnswer: DiscoveryAnswerValue;
  currentNote: string;
  answers: DiscoveryAnswers;
  notes: DiscoveryNotes;
  topology: ProjectTopology;
  isFirstStep: boolean;
  isLastStep: boolean;
  isReviewingAnswers: boolean;
  isDiscoveryComplete: boolean;
  capturedSummary: DiscoverySummaryItem[];
  savedMessage: string;
  micSupported: boolean;
  isListening: boolean;
  micError: string;
  selectedApplication: string;
  selectedApplicationGuidance?: ReturnType<typeof getQuestionStrategy>;
  requiresVideoWallConfiguration: boolean;
  videoWallConfigured: boolean;
  strandedQuickStart: ReadonlyArray<StrandedQuickStartDefault>;
  quickStartDrift: DiscoveryApplicationDrift | null;
  setIsReviewingAnswers: Dispatch<SetStateAction<boolean>>;
  setConfirmedSteps: Dispatch<SetStateAction<Record<string, boolean>>>;
  onReset: () => void;
  onSelectAnswer: (value: string) => void;
  onTopologyChange: (topology: ProjectTopology) => void;
  onCompleteTopology: () => void;
  onMovePrevious: () => void;
  onMoveNext: () => void;
  onCaptureChange: (value: string) => void;
  onConfirmCaptureSuggestion: (
    values: string[],
    confidence?: "high" | "matched" | "low",
  ) => void;
  onSaveCapture: () => void;
  onSaveDiscovery: () => void;
  onToggleMicrophone: () => void;
  onConfigureVideoWall: () => void;
  onOpenStrandedStep: (questionId: string) => void;
  onRemoveStranded: () => void;
  onRemoveDrift: () => void;
};

export function DiscoveryQuestionSection(props: DiscoveryQuestionSectionProps) {
  const {
    activeIndex,
    questionCount,
    currentStep,
    currentStepView,
    currentAnswer,
    currentNote,
    answers,
    notes,
    topology,
    isFirstStep,
    isLastStep,
    isReviewingAnswers,
    isDiscoveryComplete,
    capturedSummary,
    savedMessage,
    micSupported,
    isListening,
    micError,
    selectedApplication,
    selectedApplicationGuidance,
    requiresVideoWallConfiguration,
    videoWallConfigured,
    strandedQuickStart,
    quickStartDrift,
    setIsReviewingAnswers,
    setConfirmedSteps,
    onReset,
    onSelectAnswer,
    onTopologyChange,
    onCompleteTopology,
    onMovePrevious,
    onMoveNext,
    onCaptureChange,
    onConfirmCaptureSuggestion,
    onSaveCapture,
    onSaveDiscovery,
    onToggleMicrophone,
    onConfigureVideoWall,
    onOpenStrandedStep,
    onRemoveStranded,
    onRemoveDrift,
  } = props;

  return (
    <div
      className={`wm-discovery-question-layout is-${getDiscoverySectionTone(currentStep.section)}`}
    >
      <section
        className="wm-discovery-question-card wm-ui-section wm-ui-card"
        data-discovery-step={currentStep.id}
        data-discovery-section={currentStep.section}
      >
        <div
          className="wm-discovery-compact-stepbar"
          aria-label="Discovery progress and controls"
        >
          <div className="wm-discovery-compact-step-copy">
            <strong>
              Step {activeIndex + 1} of {questionCount}
            </strong>
            <span>
              {currentStep.section}
              {currentStep.optional ? " · Optional" : ""}
            </span>
          </div>
          <div className="wm-discovery-compact-step-actions">
            {isReviewingAnswers && (
              <button
                className="wm-ui-button wm-ui-button-secondary"
                type="button"
                onClick={() => setIsReviewingAnswers(false)}
              >
                Back to completion
              </button>
            )}
            <button
              className="wm-ui-button wm-ui-button-secondary"
              type="button"
              onClick={onReset}
            >
              Reset discovery
            </button>
          </div>
        </div>

        <DiscoveryQuestionIntro
          section={currentStep.section}
          shortLabel={currentStep.shortLabel}
          question={currentStepView.question}
          prompt={currentStepView.prompt}
          showMultiSelectNote={wmDiscoveryIsMultiSelectStep(currentStep)}
          conflictAlert={
            <DiscoveryDefaultsConflictAlert
              questionId={currentStep.id}
              visibleOptionValues={currentStepView.options.map(
                (option) => option.value,
              )}
              answer={currentAnswer}
            />
          }
        />

        {currentStep.id === "locations-connections" ? (
          <DiscoveryLocationsConnections
            value={topology}
            seed={{
              answers,
              notes,
              application: selectedApplication,
              existing: topology,
            }}
            onChange={onTopologyChange}
          />
        ) : (
          <div className="wm-discovery-option-list wm-ui-card">
            {currentStepView.options.map((option) => {
              const selected = Array.isArray(currentAnswer)
                ? currentAnswer.includes(option.value)
                : currentAnswer === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`wm-discovery-option${selected ? " is-selected" : ""}`}
                  onClick={() => onSelectAnswer(option.value)}
                  aria-pressed={selected}
                >
                  <span
                    className={
                      wmDiscoveryIsMultiSelectStep(currentStep)
                        ? "wm-discovery-option-checkbox"
                        : "wm-discovery-option-radio"
                    }
                    aria-hidden="true"
                  />
                  <DiscoveryOptionGraphic
                    option={option.value}
                    step={currentStep.id}
                    label={option.label}
                  />
                  <span>
                    <strong>{option.label}</strong>
                    <small>{option.help}</small>
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="wm-discovery-navigation-row wm-ui-card">
          <button
            className="wm-ui-button wm-ui-button-secondary"
            type="button"
            onClick={onMovePrevious}
            disabled={isFirstStep}
          >
            Previous
          </button>
          <button
            className="wm-ui-button wm-ui-button-primary wm-discovery-next-button"
            type="button"
            onClick={
              currentStep.id === "locations-connections"
                ? onCompleteTopology
                : onMoveNext
            }
            disabled={currentStep.id !== "locations-connections" && isLastStep}
          >
            {currentStep.id === "locations-connections" && isLastStep
              ? "Complete discovery"
              : "Continue"}
          </button>
        </div>
      </section>

      <aside className="wm-discovery-capture-card wm-ui-card">
        {capturedSummary.length > 0 && (
          <DiscoverySummaryCard
            items={capturedSummary}
            isDiscoveryComplete={isDiscoveryComplete}
            savedMessage={savedMessage}
            onMoveNext={onMoveNext}
            onSaveProgress={onSaveDiscovery}
            videoWallRequired={requiresVideoWallConfiguration}
            videoWallConfigured={videoWallConfigured}
            onConfigureVideoWall={onConfigureVideoWall}
            onToggleConfirmed={(stepId) =>
              setConfirmedSteps((previous) => ({
                ...previous,
                [stepId]: previous[stepId] !== true,
              }))
            }
            compact
            strandedQuickStart={strandedQuickStart}
            applicationDrift={quickStartDrift}
            onOpenStrandedStep={onOpenStrandedStep}
            onRemoveStranded={onRemoveStranded}
            onRemoveDrift={onRemoveDrift}
          />
        )}
        <div className="wm-discovery-capture-heading wm-ui-title">
          <div>
            <span>Capture box</span>
            <h3 className="wm-ui-title">Customer wording / notes</h3>
          </div>
          <button
            type="button"
            className={
              isListening
                ? "wm-discovery-mic-button is-listening"
                : "wm-discovery-mic-button"
            }
            onClick={onToggleMicrophone}
            aria-pressed={isListening}
            disabled={!micSupported && isListening}
          >
            {isListening ? "Stop mic" : "Mic"}
          </button>
        </div>
        <textarea
          className="wm-ui-input"
          aria-label="Customer wording / notes"
          value={currentNote}
          onChange={(event) => onCaptureChange(event.target.value)}
          placeholder={currentStepView.capturePlaceholder}
          rows={9}
        />
        <DiscoveryCaptureSuggestion
          step={currentStep}
          view={currentStepView}
          note={currentNote}
          onConfirm={onConfirmCaptureSuggestion}
        />
        <div className="wm-discovery-capture-actions">
          <button
            className="wm-ui-button wm-ui-button-primary wm-discovery-save-button"
            type="button"
            onClick={onSaveCapture}
            disabled={!currentNote.trim()}
          >
            Save capture and continue
          </button>
        </div>
        {!micSupported && (
          <p className="wm-discovery-muted-note wm-ui-copy">
            Microphone capture depends on browser support. Manual note capture
            is always available.
          </p>
        )}
        {micError && (
          <p className="wm-discovery-error-note wm-ui-copy">{micError}</p>
        )}
        {selectedApplicationGuidance && (
          <div className="wm-discovery-live-tip wm-discovery-application-guidance">
            <strong>Application-specific discovery question guidance</strong>
            <p className="wm-ui-copy">
              {selectedApplicationGuidance.likelyDirection}
            </p>
            <ul>
              {selectedApplicationGuidance.checkBeforeProduct.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}
