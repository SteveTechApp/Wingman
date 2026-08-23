import { useMemo } from "react";
import { CheckCircle2, Info, ThumbsDown, ThumbsUp } from "lucide-react";
import {
  collectCrossProjectFeedback,
  type CrossProjectFeedbackSummary,
} from "../lib/feedbackInformedGuidance";

const NEGATIVE_RATINGS = new Set(["wrong-fit", "missing-accessory", "needs-review"]);
const ACCEPTED_RATINGS = new Set(["accepted"]);

function ratingIcon(rating: string) {
  if (ACCEPTED_RATINGS.has(rating)) return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />;
  if (NEGATIVE_RATINGS.has(rating)) return <ThumbsDown className="h-4 w-4 shrink-0 text-red-400" aria-hidden="true" />;
  return <Info className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />;
}

function ratingLabel(rating: string) {
  if (rating === "accepted") return "Accepted";
  if (rating === "wrong-fit") return "Wrong fit";
  if (rating === "missing-accessory") return "Missing accessory";
  if (rating === "needs-review") return "Needs review";
  return rating;
}

function ratingColor(rating: string): string {
  if (ACCEPTED_RATINGS.has(rating)) return "text-emerald-400";
  if (NEGATIVE_RATINGS.has(rating)) return "text-red-400";
  return "text-slate-400";
}

export function FeedbackConsolidationPanel() {
  const summaries = useMemo(() => collectCrossProjectFeedback(), []);

  if (!summaries.length) {
    return null;
  }

  const negativeCount = summaries.filter((s) =>
    s.ratings.some((r) => NEGATIVE_RATINGS.has(r.rating)),
  ).length;
  const acceptedCount = summaries.filter((s) =>
    s.ratings.every((r) => ACCEPTED_RATINGS.has(r.rating)),
  ).length;

  return (
    <section className="wm-feedback-consolidation wm-ui-card rounded-2xl border p-5">
      <header className="mb-4">
        <p className="wm-ui-kicker">Product feedback insights</p>
        <h2 className="wm-ui-title text-xl font-black">What the field said about these products</h2>
        <p className="wm-ui-copy text-sm">
          Feedback captured across your active projects. A SKU flagged here in prior projects
          may need extra validation before the same architecture is quoted again.
        </p>
      </header>

      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        {negativeCount > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-1.5 font-bold text-red-300">
            <ThumbsDown className="h-3.5 w-3.5" aria-hidden="true" />
            {negativeCount} SKU{negativeCount === 1 ? "" : "s"} with negative feedback
          </span>
        ) : null}
        {acceptedCount > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-3 py-1.5 font-bold text-emerald-300">
            <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
            {acceptedCount} SKU{acceptedCount === 1 ? "" : "s"} confirmed by the field
          </span>
        ) : null}
      </div>

      <div className="wm-feedback-table-wrap rounded-xl border wm-ui-card">
        <table className="w-full text-left text-sm wm-ui-copy">
          <thead className="wm-ui-card">
            <tr>
              <th className="px-4 py-3 font-bold">SKU</th>
              <th className="px-4 py-3 font-bold">Feedback</th>
              <th className="px-4 py-3 font-bold">Projects</th>
              <th className="px-4 py-3 font-bold">Notes</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((summary) => (
              <FeedbackSummaryRow key={summary.sku} summary={summary} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function FeedbackSummaryRow({ summary }: { summary: CrossProjectFeedbackSummary }) {
  const negativeRatings = summary.ratings.filter((r) => NEGATIVE_RATINGS.has(r.rating));
  const positiveRatings = summary.ratings.filter((r) => ACCEPTED_RATINGS.has(r.rating));
  const allProjectNames = Array.from(new Set(summary.ratings.flatMap((r) => r.projectNames)));

  return (
    <tr className="border-t wm-ui-card">
      <td className="px-4 py-3 font-semibold text-[#edf6ff]">{summary.sku}</td>
      <td className="px-4 py-3">
        <div className="flex flex-col gap-1">
          {negativeRatings.map((r) => (
            <span key={r.rating} className={`inline-flex items-center gap-1.5 text-xs font-bold ${ratingColor(r.rating)}`}>
              {ratingIcon(r.rating)}
              {ratingLabel(r.rating)} &times;{r.count}
            </span>
          ))}
          {positiveRatings.map((r) => (
            <span key={r.rating} className={`inline-flex items-center gap-1.5 text-xs font-bold ${ratingColor(r.rating)}`}>
              {ratingIcon(r.rating)}
              {ratingLabel(r.rating)} &times;{r.count}
            </span>
          ))}
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-[#cfe6f7]">
        {allProjectNames.join(", ")}
      </td>
      <td className="px-4 py-3 text-xs text-[#cfe6f7]">
        {negativeRatings.flatMap((r) => r.notes).filter(Boolean).slice(0, 2).join("; ") || "No notes attached"}
      </td>
    </tr>
  );
}
