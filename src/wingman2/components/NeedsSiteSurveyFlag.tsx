import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { routeCatalogByKey } from "../app/routeCatalog";

/**
 * Visible "needs site survey" flag shown on the proposal when any topology
 * route is still band-estimated rather than an exact figure (or has no
 * recorded length). Renders the specific reasons so the rep knows exactly
 * which cable route must be measured before final quoting.
 */
export function NeedsSiteSurveyFlag({
  reasons,
  className = "",
}: {
  reasons: string[];
  className?: string;
}) {
  if (reasons.length === 0) return null;

  return (
    <aside
      className={`wm-needs-survey-flag wm-ui-copy ${className}`.trim()}
      data-wingman-needs-site-survey="true"
    >
      <MapPin className="wm-needs-survey-flag__icon" aria-hidden="true" />
      <div className="wm-needs-survey-flag__body">
        <strong>Needs site survey</strong>
        <span>
          Confirm the exact cable run before final quoting — these routes are
          still band-estimated:
        </span>
        <ul>
          {reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
        <Link
          to={`${routeCatalogByKey.discovery.path}?edit=${encodeURIComponent("locations-connections")}`}
          className="wm-needs-survey-flag__link"
        >
          Edit routes in Discovery
        </Link>
      </div>
    </aside>
  );
}

export default NeedsSiteSurveyFlag;
