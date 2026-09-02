import { useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Clock,
  HelpCircle,
  Zap,
} from "lucide-react";
import {
  applyRoomTypeSmartDefaults,
  getQuickStartDisagreements,
  plainLanguageLabels,
  type QuickStartRoomType,
  quickStartConfigs,
  getQuickStartSummary,
} from "./discoveryQuickStart";
import { SMART_DEFAULTS } from "./discoveryProgressiveDisclosure";
import type { DiscoveryAnswers } from "./discoveryTypes";

export function DiscoveryQuickStartEntry({ onAnswers }: { onAnswers: (answers: DiscoveryAnswers) => void }) {
  const [open, setOpen] = useState(false);
  if (open)
    return (
      <div className="wm-discovery-question-layout">
        <DiscoveryQuickStart
          onSelect={(answers) => {
            onAnswers(answers);
            setOpen(false);
          }}
          onSkip={() => setOpen(false)}
        />
      </div>
    );
  return (
    <div className="wm-qs-entry">
      <button type="button" onClick={() => setOpen(true)} className="wm-qs-entry__button">
        <span className="wm-qs-entry__icon" aria-hidden="true">&#9889;</span>
        <div>
          <p className="wm-qs-entry__title">Quick Start available</p>
          <p className="wm-qs-entry__subtitle">Pre-fill common settings for meeting rooms, classrooms and more</p>
        </div>
      </button>
    </div>
  );
}

type DiscoveryQuickStartProps = {
  // Called with the fully seeded answers once the profile is confirmed.
  onSelect: (answers: DiscoveryAnswers) => void;
  onSkip: () => void;
};

const roomTypeOrder: QuickStartRoomType[] = [
  "huddle-room",
  "meeting-room-small",
  "meeting-room-large",
  "boardroom",
  "classroom",
  "lecture-hall",
  "training-room",
  "custom",
];

function roomProfileAnswers(roomType: QuickStartRoomType): DiscoveryAnswers {
  return applyRoomTypeSmartDefaults(roomType, {});
}

function standardProfileAnswers(application: string): DiscoveryAnswers {
  const defaults = SMART_DEFAULTS[application] ?? {};
  return { opportunity: application, ...defaults } as DiscoveryAnswers;
}

export function DiscoveryQuickStart({
  onSelect,
  onSkip,
}: DiscoveryQuickStartProps) {
  const [selectedType, setSelectedType] =
    useState<QuickStartRoomType | null>(null);
  const [confirming, setConfirming] = useState(false);

  const config = selectedType ? quickStartConfigs[selectedType] : null;
  const disagreements = selectedType ? getQuickStartDisagreements(selectedType) : [];
  const application = config ? config.suggestedApplication : "";
  const applicationLabel = application ? (plainLanguageLabels[application] ?? application) : "";

  const handleContinue = () => {
    if (!selectedType) return;
    // A room whose profile disagrees with its application-level smart defaults
    // asks for confirmation instead of silently seeding the room profile.
    if (disagreements.length > 0) {
      setConfirming(true);
      return;
    }
    onSelect(roomProfileAnswers(selectedType));
  };

  // Profile-confirmation step: list where the room's pre-fill disagrees with
  // the application's standard defaults and let the salesperson pick the
  // starting profile. Every answer remains adjustable in the interview.
  if (confirming && selectedType && config) {
    return (
      <section className="wm-qs">
        <div className="wm-qs__header">
          <div className="wm-qs__badge">
            <Zap className="wm-qs__badge-icon" />
            Quick Start
          </div>
          <h2 className="wm-qs__title">
            {config.label} differs from the {applicationLabel} profile
          </h2>
          <p className="wm-qs__subtitle">
            This room pre-fills {disagreements.length} answer{disagreements.length === 1 ? "" : "s"}{" "}
            differently from Wingman's standard {applicationLabel} defaults. Choose the
            starting profile — every answer can still be adjusted in the interview.
          </p>
        </div>

        <div className="wm-decision-compatibility-alert" role="alert" aria-live="polite">
          {disagreements.map((disagreement) => (
            <article key={disagreement.questionId} className="is-warning">
              <strong>
                {disagreement.questionLabel}: {disagreement.roomText}
              </strong>
              <p>Standard {applicationLabel} profile: {disagreement.standardText}.</p>
            </article>
          ))}
        </div>

        <div className="wm-qs__actions">
          <button type="button" onClick={() => setConfirming(false)} className="wm-qs__skip">
            <HelpCircle className="wm-qs__skip-icon" />
            Back to room types
          </button>
          <button
            type="button"
            onClick={() => onSelect(standardProfileAnswers(config.suggestedApplication))}
            className="wm-qs__continue"
          >
            Use standard {applicationLabel} profile
          </button>
          <button
            type="button"
            onClick={() => onSelect(roomProfileAnswers(selectedType))}
            className="wm-qs__continue wm-qs__continue--active"
          >
            Use {config.label} profile
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="wm-qs">
      {/* Header */}
      <div className="wm-qs__header">
        <div className="wm-qs__badge">
          <Zap className="wm-qs__badge-icon" />
          Quick Start
        </div>
        <h2 className="wm-qs__title">
          What type of room is this?
        </h2>
        <p className="wm-qs__subtitle">
          Select a room type to pre-fill common settings. You can always adjust
          details later.
        </p>
      </div>

      {/* Room type grid */}
      <div className="wm-qs__grid">
        {roomTypeOrder.map((roomType) => {
          const roomConfig = quickStartConfigs[roomType];
          const isSelected = selectedType === roomType;
          const summary = getQuickStartSummary(roomType);

          return (
            <button
              key={roomType}
              type="button"
              onClick={() => setSelectedType(roomType)}
              className={`wm-qs-card${isSelected ? " wm-qs-card--selected" : ""}`}
            >
              {/* Selection indicator */}
              {isSelected ? (
                <div className="wm-qs-card__check">
                  <Check className="wm-qs-card__check-icon" />
                </div>
              ) : null}

              {/* Icon and label */}
              <div className="wm-qs-card__head">
                <span className="wm-qs-card__icon">{roomConfig.icon}</span>
                <div className="wm-qs-card__text">
                  <p className="wm-qs-card__label">{roomConfig.label}</p>
                  <p className="wm-qs-card__description">
                    {roomConfig.description}
                  </p>
                </div>
              </div>

              {/* Summary chips */}
              {summary.length > 0 ? (
                <div className="wm-qs-card__chips">
                  {summary.map((item) => (
                    <span
                      key={item}
                      className="wm-qs-chip"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              ) : null}

              {/* Question count */}
              <div className="wm-qs-card__count">
                <Clock className="wm-qs-card__count-icon" />
                ~{roomConfig.estimatedQuestions} questions
                {roomType === "custom" ? " (full workflow)" : ""}
              </div>
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="wm-qs__actions">
        <button
          type="button"
          onClick={onSkip}
          className="wm-qs__skip"
        >
          <HelpCircle className="wm-qs__skip-icon" />
          Skip to full Discovery
        </button>

        <button
          type="button"
          onClick={handleContinue}
          disabled={!selectedType}
          className={`wm-qs__continue${selectedType ? " wm-qs__continue--active" : ""}`}
        >
          Continue
          <ArrowRight className="wm-qs__continue-icon" />
        </button>
      </div>

      {/* Help text */}
      {selectedType && selectedType !== "custom" ? (
        <div className="wm-qs__help">
          <div className="wm-qs__help-inner">
            <ChevronRight className="wm-qs__help-chevron" />
            <div>
              <p className="wm-qs__help-title">
                What happens next?
              </p>
              <p className="wm-qs__help-text">
                Wingman will pre-fill common settings for a{" "}
                {quickStartConfigs[selectedType].label.toLowerCase()}. You'll
                answer a few essential questions, then can review and adjust any
                details before generating recommendations.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}