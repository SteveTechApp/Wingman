import { Users } from "lucide-react";
import {
  getAudienceProfile,
  wingmanAudienceProfiles,
  type WingmanAudienceMode
} from "../lib/audienceProfiles";
import { useWingmanAudience } from "../hooks/useWingmanAudience";

export default function TopBarAudienceSelector() {
  const { audienceMode, setAudienceMode } = useWingmanAudience();
  const profile = getAudienceProfile(audienceMode);

  return (
    <label className="wm-fixed-dock-audience">
      <span className="wm-fixed-dock-icon" aria-hidden="true">
        <Users size={15} />
      </span>

      <span className="wm-fixed-dock-copy">
        <small>Talking with</small>
        <strong>{profile.shortLabel}</strong>
      </span>

      <select
        value={audienceMode}
        onChange={(event) => setAudienceMode(event.target.value as WingmanAudienceMode)}
        aria-label="Who are you talking with?"
      >
        {wingmanAudienceProfiles.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}