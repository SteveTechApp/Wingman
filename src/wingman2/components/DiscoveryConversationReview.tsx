import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, MessagesSquare } from "lucide-react";
import { routeCatalogByKey } from "../app/routeCatalog";
import type { DiscoveryConversationItem } from "../data/projectStore";
import { captureConfidenceLabel } from "../lib/discoveryConversationDisplay";

type ConfidenceFilter = "all" | "low";

/**
 * In-app review of the Discovery Q&A trail, shown on the Proposal page before
 * export so the rep sees exactly what the customer will read in the exported
 * document. Each row links back to the discovery question that produced it, so
 * a rep can correct the underlying answer rather than editing copy.
 *
 * A “Re-verify low confidence” filter narrows the walk to only the amber rows
 * (captured from a partial match), so a rep can settle the guesses before
 * sign-off without wading through the settled answers.
 */
export function DiscoveryConversationReview({
  items,
  className = "",
}: {
  items: DiscoveryConversationItem[];
  className?: string;
}) {
  const [filter, setFilter] = useState<ConfidenceFilter>("all");
  const lowCount = items.filter(
    (item) => item.confidence === "low",
  ).length;
  const visibleItems =
    filter === "low" ? items.filter((item) => item.confidence === "low") : items;

  return (
    <section
      className={`wm-discovery-conversation-review wm-ui-copy ${className}`.trim()}
      data-wingman-discovery-conversation-review="true"
      data-testid="discovery-conversation-review-section"
    >
      <div className="wm-discovery-conversation-review__heading">
        <MessagesSquare className="wm-discovery-conversation-review__icon" aria-hidden="true" />
        <div>
          <h3>Discovery Conversation</h3>
          <p>
            The questions asked, the closest governed answer, and the customer's
            own wording — exactly as it will appear in the exported proposal.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Discovery conversation filter">
        <button
          type="button"
          aria-pressed={filter === "all"}
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition ${
            filter === "all"
              ? "bg-white/10 text-white"
              : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200"
          }`}
          onClick={() => setFilter("all")}
        >
          All ({items.length})
        </button>
        <button
          type="button"
          aria-pressed={filter === "low"}
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition ${
            filter === "low"
              ? "bg-amber-500/25 text-amber-200"
              : "bg-white/5 text-amber-400/80 hover:bg-amber-500/10 hover:text-amber-300"
          }`}
          onClick={() => setFilter("low")}
        >
          <AlertTriangle aria-hidden="true" className="h-3 w-3" />
          Re-verify low confidence ({lowCount})
        </button>
      </div>

      {items.length === 0 ? (
        <p className="wm-discovery-conversation-review__empty">
          No discovery answers have been captured yet. Run Discovery first so the
          conversation behind the design can be reviewed here.
        </p>
      ) : visibleItems.length === 0 ? (
        <p className="wm-discovery-conversation-review__empty">
          No low-confidence answers — nothing left to re-verify. The capture is
          currently strong enough to quote.
        </p>
      ) : (
        <ul className="wm-discovery-conversation-review__list">
          {visibleItems.map((item) => (
            <li key={item.stepId}>
              <div className="wm-discovery-conversation-review__row">
                <span className="wm-discovery-conversation-review__question">
                  {item.question}
                </span>
                <span
                  className={`wm-discovery-conversation-review__answer${item.confirmed ? " is-confirmed" : " is-open"}`}
                >
                  {item.confirmed ? item.answer : `${item.answer} — to be confirmed`}
                </span>
                <span className="wm-discovery-conversation-review__note">
                  {item.note || "—"}
                </span>
              </div>
              <span
                className={`wm-discovery-conversation-review__status${item.confirmed ? " is-confirmed" : " is-open"}`}
              >
                {item.confirmed ? "Confirmed with customer" : "To be confirmed"}
              </span>
              {item.confidence ? (
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    item.confidence === "high"
                      ? "bg-emerald-500/15 text-emerald-300"
                      : item.confidence === "matched"
                        ? "bg-cyan-500/15 text-cyan-300"
                        : "bg-amber-500/15 text-amber-300"
                  }`}
                  title={
                    item.confidence === "low"
                      ? "Captured from a partial match — verify before quoting"
                      : undefined
                  }
                >
                  {captureConfidenceLabel(item.confidence)}
                </span>
              ) : null}
              <Link
                to={`${routeCatalogByKey.discovery.path}?edit=${encodeURIComponent(item.stepId)}`}
                className="wm-discovery-conversation-review__edit"
                aria-label={`Edit "${item.question}" in Discovery`}
              >
                Edit in Discovery
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default DiscoveryConversationReview;
