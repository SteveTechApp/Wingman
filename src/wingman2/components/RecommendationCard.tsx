import { ArrowRight, ShieldCheck, TriangleAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { ConfidenceMeter } from "./ConfidenceMeter";
import { StatusChip } from "./StatusChip";

type RecommendationCardProps = {
  title: string;
  sku: string;
  status: "recommended" | "alternative" | "caution";
  confidence: number;
  rationale: readonly string[];
  caution?: string;
  actionLabel?: string;
  actionTo?: string;
};

export function RecommendationCard({
  title,
  sku,
  status,
  confidence,
  rationale,
  caution,
  actionLabel = "Add to proposal",
  actionTo,
}: RecommendationCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="wingman-kicker">Recommendation</p>
          <h3 className="mt-1 text-xl font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{sku}</p>
        </div>
        <StatusChip
          label={status === "recommended" ? "Recommended" : status === "alternative" ? "Alternative" : "Caution"}
          variant={status}
        />
      </div>

      <div className="mt-5">
        <ConfidenceMeter score={confidence} />
      </div>

      <ul className="mt-5 space-y-3 text-sm text-slate-700">
        {rationale.map((item) => (
          <li key={item} className="flex gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-600" />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      {caution ? (
        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <div className="flex gap-3">
            <TriangleAlert className="mt-0.5 h-4 w-4" />
            <span>{caution}</span>
          </div>
        </div>
      ) : null}

      {actionTo ? (
        <Link
          to={actionTo}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          {actionLabel} <ArrowRight className="h-4 w-4" />
        </Link>
      ) : null}
    </div>
  );
}
