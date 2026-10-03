import type { CSSProperties, Dispatch, SetStateAction } from "react";
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

const opportunityPhotoByValue: Record<string, string> = {
  "meeting-room": "/template-photos/discovery-boardroom-v2.jpg",
  classroom: "/template-photos/discovery-classroom-v2.jpg",
  hospitality: "/template-photos/discovery-hospitality-v2.jpg",
  "video-wall": "/template-photos/discovery-led-wall-v2.jpg",
  "av-over-ip": "/template-photos/discovery-distributed-video-v2.jpg",
  "not-sure": "/template-photos/discovery-not-sure-v2.jpg",
};

const discoveryPhotoByValue: Record<string, string> = {
  "single-small-room": "/template-photos/discovery-scale-small-room-v3.jpg",
  "single-large-room": "/template-photos/discovery-scale-large-room-v3.jpg",
  "multi-room": "/template-photos/discovery-scale-multi-room-v3.jpg",
  "building-wide": "/template-photos/discovery-scale-campus-v3.jpg",
  "unknown-scale": "/template-photos/discovery-scale-unknown-v3.jpg",
  "one-source": "/template-photos/photo-huddle-room.jpg",
  "two-four-sources": "/template-photos/discovery-boardroom-v2.jpg",
  "five-eight-sources": "/template-photos/photo-pub-matrix.jpg",
  "nine-plus-sources": "/template-photos/discovery-distributed-video-v2.jpg",
  "one-display": "/template-photos/photo-huddle-room.jpg",
  "two-displays": "/template-photos/discovery-boardroom-v2.jpg",
  "three-eight-displays": "/template-photos/photo-pub-matrix.jpg",
  "nine-plus-displays": "/template-photos/discovery-distributed-video-v2.jpg",
  "no-uc": "/template-photos/photo-huddle-room.jpg",
  "no-microphones": "/template-photos/photo-boardroom.jpg",
  "no-room-audio": "/template-photos/photo-boardroom.jpg",
  "display-audio": "/template-photos/photo-school-hall-projector.jpg",
  "no-usb": "/template-photos/photo-boardroom.jpg",
  "no-wireless-presentation": "/template-photos/photo-boardroom.jpg",
  "lcd-array": "/template-photos/discovery-led-wall-v2.jpg",
  "single-canvas": "/template-photos/discovery-led-wall-v2.jpg",
  "independent-tiles": "/template-photos/discovery-led-wall-v2.jpg",
  "projection-canvas": "/template-photos/photo-school-hall-projector.jpg",
  "multiview-single-display": "/template-photos/photo-signage.jpg",
  "multiview-projector": "/template-photos/photo-school-hall-projector.jpg",
  "multiview-video-wall": "/template-photos/discovery-led-wall-v2.jpg",
  "multiview-led-processor": "/template-photos/discovery-led-wall-v2.jpg",
  "multiview-confidence-monitor": "/template-photos/photo-control-room.jpg",
  "multiview-record-stream": "/template-photos/photo-multicamera-meeting.jpg",
  "multiview-uc-return": "/template-photos/photo-multicamera-meeting.jpg",
  "signage-presets": "/template-photos/photo-signage.jpg",
  "user-laptops": "/template-photos/discovery-boardroom-v2.jpg",
  "room-pc-uc-source": "/template-photos/discovery-boardroom-v2.jpg",
  "signage-media-players": "/template-photos/photo-signage.jpg",
  "broadcast-tv-feeds": "/template-photos/discovery-hospitality-v2.jpg",
  "teaching-visualisers": "/template-photos/discovery-classroom-v2.jpg",
  "operational-workstations": "/template-photos/photo-control-room.jpg",
  "cameras-production": "/template-photos/photo-multicamera-meeting.jpg",
  "specialist-simulation-medical": "/template-photos/photo-situation-room.jpg",
  "network-remote-feeds": "/template-photos/discovery-distributed-video-v2.jpg",
  "wireless-casting-source": "/template-photos/photo-flexible-learning.jpg",
  "wireless-room-routing": "/template-photos/discovery-distributed-video-v2.jpg",
  "lectern-microphone": "/template-photos/discovery-classroom-v2.jpg",
  "direct-integrated-audio": "/template-photos/discovery-boardroom-v2.jpg",
};

export function getDiscoveryOptionPhoto(stepId: string, value: string, label: string, help: string): string {
  if (stepId === "opportunity") {
    return opportunityPhotoByValue[value] ?? "/template-photos/discovery-not-sure-v2.jpg";
  }
  if (discoveryPhotoByValue[value]) return discoveryPhotoByValue[value];

  const identity = `${value} ${label}`.toLowerCase();
  const meaning = `${identity} ${help}`.toLowerCase();

  if (/unknown|not sure|not yet|not confirmed|not selected/.test(identity)) return "/template-photos/discovery-not-sure-v2.jpg";
  if (stepId === "control") return "/template-photos/photo-control-room.jpg";
  if (stepId === "signal-standard") return "/template-photos/photo-school-hall-projector.jpg";
  if (stepId === "uc-camera-count") return "/template-photos/photo-multicamera-meeting.jpg";
  if (stepId === "avoip-profile") return /multiview|several sources/.test(identity)
    ? "/template-photos/discovery-led-wall-v2.jpg"
    : "/template-photos/discovery-distributed-video-v2.jpg";
  if (stepId === "multiview-operation") return /operator|layout|composition/.test(identity)
    ? "/template-photos/photo-control-room.jpg"
    : "/template-photos/discovery-led-wall-v2.jpg";
  if (/video.?wall|led wall|led processor|full.canvas|multiview/.test(meaning)) return "/template-photos/discovery-led-wall-v2.jpg";
  if (/stadium|arena|large venue|auditorium/.test(meaning)) return "/template-photos/photo-stadium.jpg";
  if (/hospitality|bar|pub|casino|bingo/.test(meaning)) return "/template-photos/discovery-hospitality-v2.jpg";
  if (/campus|building.wide|multi.room|many rooms|long distance|av.over.ip|network video|dante|aes67/.test(meaning)) return "/template-photos/discovery-distributed-video-v2.jpg";
  if (/camera|microphone|\bmic\b|teams|zoom|unified communications|conference|byod|byom/.test(meaning)) return "/template-photos/photo-multicamera-meeting.jpg";
  if (/classroom|teaching|lecture|lectern/.test(meaning)) return "/template-photos/discovery-classroom-v2.jpg";
  if (/signage|media player|scheduled content/.test(meaning)) return "/template-photos/photo-signage.jpg";
  if (/control|automation|touch panel|processor/.test(meaning)) return "/template-photos/photo-control-room.jpg";
  if (/wireless|flexible|mobile|casting/.test(meaning)) return "/template-photos/photo-flexible-learning.jpg";
  if (/matrix|route|routing|switch|encoder|decoder|rack|source/.test(meaning)) return "/template-photos/photo-pub-matrix.jpg";
  if (/audio|speaker|amplif|sound|arc|earc/.test(meaning)) return "/template-photos/photo-sportsbar.jpg";
  if (/cable|connection|location|distance|fibre|fiber/.test(meaning)) return "/template-photos/photo-situation-room.jpg";
  if (/small|huddle|single room|one display|one source/.test(meaning)) return "/template-photos/photo-huddle-room.jpg";
  if (/display|output|screen|projector|projection|resolution|4k|1080|hdr|hdcp|edid/.test(meaning)) return "/template-photos/photo-school-hall-projector.jpg";
  if (/usb|laptop|hdmi|presentation/.test(meaning)) return "/template-photos/discovery-boardroom-v2.jpg";

  if (stepId.startsWith("uc-camera") || stepId.startsWith("uc-microphone")) return "/template-photos/photo-multicamera-meeting.jpg";
  if (stepId === "audio" || stepId === "uc-audio-processing") return "/template-photos/photo-sportsbar.jpg";
  if (stepId === "control" || stepId === "multiview-operation") return "/template-photos/photo-control-room.jpg";
  if (stepId.startsWith("wireless-presentation")) return "/template-photos/photo-flexible-learning.jpg";
  if (stepId.startsWith("multiview")) return "/template-photos/discovery-led-wall-v2.jpg";
  if (stepId.startsWith("video-wall")) return "/template-photos/discovery-led-wall-v2.jpg";

  return "/template-photos/photo-boardroom.jpg";
}

type DiscoveryQuestionSectionProps = {
  activeIndex: number;
  questionCount: number;
  answeredCount: number;
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
  onFinishDiscovery: () => void;
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
    answeredCount,
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
    onFinishDiscovery,
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
              const optionPhoto = getDiscoveryOptionPhoto(
                currentStep.id,
                option.value,
                option.label,
                option.help ?? "",
              );
              const usesCountGraphic = currentStep.id === "sources";
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`wm-discovery-option${selected ? " is-selected" : ""}`}
                  data-discovery-option-step={currentStep.id}
                  data-option-photo={usesCountGraphic ? undefined : "true"}
                  data-source-count={usesCountGraphic ? option.value : undefined}
                  style={usesCountGraphic ? undefined : ({ "--discovery-option-photo": `url(${optionPhoto})` } as CSSProperties)}
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
          <div className="wm-discovery-exit-signpost" role="status" aria-live="polite">
            <span>Next stage</span>
            <strong>{requiresVideoWallConfiguration && !videoWallConfigured ? "Configure video wall" : "Find matching products"}</strong>
            <small>
              {questionCount - answeredCount > 0
                ? `${questionCount - answeredCount} answer${questionCount - answeredCount === 1 ? "" : "s"} remaining`
                : "Ready to finish"}
            </small>
          </div>
          <button
            className="wm-ui-button wm-ui-button-primary wm-discovery-next-button"
            type="button"
            onClick={
              currentStep.id === "locations-connections"
                ? onCompleteTopology
                : isLastStep
                  ? onFinishDiscovery
                : onMoveNext
            }
            disabled={isLastStep && !isDiscoveryComplete}
          >
            {currentStep.id === "locations-connections" && isLastStep
              ? "Complete discovery"
              : isLastStep
                ? "Finish discovery"
              : "Continue"}
          </button>
        </div>
        {savedMessage.startsWith("Resolve ") && (
          <div className="wm-discovery-exit-blocker" role="alert">
            <strong>Discovery needs attention</strong>
            <span>{savedMessage}</span>
          </div>
        )}
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
