import AudienceSelector from "./AudienceSelector";
import {
  getAudienceCoaching,
  getAudienceProfile,
  type WingmanCoachingPageContext
} from "../lib/audienceProfiles";
import { useWingmanAudience } from "../hooks/useWingmanAudience";

interface AudienceAwareCoachingPanelProps {
  pageContext?: WingmanCoachingPageContext;
  compact?: boolean;
}

const pageContextLabel: Record<WingmanCoachingPageContext, string> = {
  dashboard: "Opportunity Navigator",
  discovery: "Discovery",
  finder: "Product Finder",
  productPitch: "Product Pitch",
  compare: "Competitor Compare",
  proposal: "Proposal",
  visualStudio: "Visual Studio",
  general: "Wingman coaching"
};

export default function AudienceAwareCoachingPanel({
  pageContext = "general",
  compact = false
}: AudienceAwareCoachingPanelProps) {
  const { audienceMode, setAudienceMode } = useWingmanAudience();
  const profile = getAudienceProfile(audienceMode);
  const coaching = getAudienceCoaching(audienceMode, pageContext);

  return (
    <section className={`wm-audience-coaching-panel ${compact ? "wm-audience-coaching-panel-compact" : ""}`}>
      <AudienceSelector value={audienceMode} onChange={setAudienceMode} compact />

      <div className="wm-audience-coaching-copy">
        <div>
          <p className="wm-audience-eyebrow">{pageContextLabel[pageContext]} framing</p>
          <h2>{coaching.headline}</h2>
          <p>{coaching.framing}</p>
        </div>

        <div className="wm-audience-coaching-grid">
          <article>
            <span>Ask this next</span>
            <p>{coaching.askThisNext}</p>
          </article>
          <article>
            <span>Keep visible</span>
            <p>{coaching.keepVisible}</p>
          </article>
          <article>
            <span>Avoid in this mode</span>
            <p>{coaching.avoid}</p>
          </article>
        </div>

        <div className="wm-audience-tone-strip" aria-label="Selected audience tone">
          {profile.tone.map((tone) => (
            <span key={tone}>{tone}</span>
          ))}
        </div>
      </div>
    </section>
  );
}