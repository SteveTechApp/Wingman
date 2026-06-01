import {
  getAudienceProfile,
  type WingmanAudienceMode,
  wingmanAudienceProfiles
} from "../lib/audienceProfiles";
import { useWingmanAudience } from "../hooks/useWingmanAudience";

interface AudienceSelectorProps {
  value?: WingmanAudienceMode;
  onChange?: (mode: WingmanAudienceMode) => void;
  compact?: boolean;
}

export default function AudienceSelector({ value, onChange, compact = false }: AudienceSelectorProps) {
  const internalAudience = useWingmanAudience();
  const selectedMode = value ?? internalAudience.audienceMode;
  const setSelectedMode = onChange ?? internalAudience.setAudienceMode;
  const profile = getAudienceProfile(selectedMode);

  return (
    <section className={`wm-audience-selector ${compact ? "wm-audience-selector-compact" : ""}`}>
      <div className="wm-audience-selector-heading">
        <p className="wm-audience-eyebrow">Coaching context</p>
        <h2>Who are you talking with?</h2>
        <p>{profile.description}</p>
      </div>

      <div className="wm-audience-options" role="radiogroup" aria-label="Who are you talking with?">
        {wingmanAudienceProfiles.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`wm-audience-option ${selectedMode === option.id ? "is-active" : ""}`}
            onClick={() => setSelectedMode(option.id)}
            role="radio"
            aria-checked={selectedMode === option.id}
          >
            <span className="wm-audience-radio" aria-hidden="true" />
            <span>
              <strong>{option.label}</strong>
              <small>{option.description}</small>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}