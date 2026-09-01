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
  type QuickStartRoomType,
  quickStartConfigs,
  getQuickStartSummary,
} from "./discoveryQuickStart";
import type { DiscoveryAnswers } from "./discoveryTypes";

export function DiscoveryQuickStartEntry({ onAnswers }: { onAnswers: (answers: DiscoveryAnswers) => void }) {
  const [open, setOpen] = useState(false);
  if (open) return <div className="wm-discovery-question-layout"><DiscoveryQuickStart onSelect={(type) => { onAnswers(applyRoomTypeSmartDefaults(type, {})); setOpen(false); }} onSkip={() => setOpen(false)} /></div>;
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
  onSelect: (roomType: QuickStartRoomType) => void;
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

export function DiscoveryQuickStart({
  onSelect,
  onSkip,
}: DiscoveryQuickStartProps) {
  const [selectedType, setSelectedType] =
    useState<QuickStartRoomType | null>(null);

  const handleContinue = () => {
    if (selectedType) {
      onSelect(selectedType);
    }
  };

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
          const config = quickStartConfigs[roomType];
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
                <span className="wm-qs-card__icon">{config.icon}</span>
                <div className="wm-qs-card__text">
                  <p className="wm-qs-card__label">{config.label}</p>
                  <p className="wm-qs-card__description">
                    {config.description}
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
                ~{config.estimatedQuestions} questions
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
