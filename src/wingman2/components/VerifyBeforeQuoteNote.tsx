import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { routeCatalogByKey } from "../app/routeCatalog";

/**
 * Inline verification-responsibility note shown on decision surfaces
 * (Recommendations, Compare, Proposal) so the best-efforts disclaimer is
 * visible where a rep actually decides, not only on the Terms page.
 */
export function VerifyBeforeQuoteNote({ className = "" }: { className?: string }) {
  return (
    <p
      className={`wm-verify-before-quote wm-ui-copy ${className}`.trim()}
      data-wingman-verify-before-quote="true"
    >
      <ShieldCheck className="wm-verify-before-quote__icon" aria-hidden="true" />
      <span>
        Wingman guidance is best-efforts. Verify specifications, compatibility, lifecycle and
        regional availability against current WyreStorm documentation before finalising the
        system design.{" "}
        <Link to={routeCatalogByKey.terms.path} className="wm-verify-before-quote__link">
          Read the terms
        </Link>
        .
      </span>
    </p>
  );
}

export default VerifyBeforeQuoteNote;
