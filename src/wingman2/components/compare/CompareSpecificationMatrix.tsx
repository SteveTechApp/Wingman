import { AlertTriangle, Check, CircleHelp, Plus, X, type LucideIcon } from "lucide-react";
import type {
  CompareFeatureMatrixRow,
  CompareFeatureMatrixStatus,
  CompareFeatureValueKind,
} from "../../lib/compareFeatureMatrix";

const STATUS_VIEW: Record<CompareFeatureMatrixStatus, { label: string; Icon: LucideIcon; className: string; shortLabel: string }> = {
  match: {
    label: "Match",
    shortLabel: "OK",
    Icon: Check,
    className: "border-emerald-400/60 bg-emerald-400/15 text-emerald-100",
  },
  miss: {
    label: "No match",
    shortLabel: "No",
    Icon: X,
    className: "border-rose-400/60 bg-rose-400/15 text-rose-100",
  },
  partial: {
    label: "Partial or unknown",
    shortLabel: "Check",
    Icon: AlertTriangle,
    className: "border-amber-400/65 bg-amber-400/15 text-amber-100",
  },
  extra: {
    label: "WyreStorm extra",
    shortLabel: "Extra",
    Icon: Plus,
    className: "border-cyan-300/60 bg-cyan-300/15 text-cyan-100",
  },
};

function matrixCounts(rows: CompareFeatureMatrixRow[]) {
  return rows.reduce(
    (counts, row) => {
      counts[row.status] += 1;
      return counts;
    },
    { match: 0, miss: 0, partial: 0, extra: 0 } as Record<CompareFeatureMatrixStatus, number>,
  );
}

function StatusIcon({ status }: { status: CompareFeatureMatrixStatus }) {
  const view = STATUS_VIEW[status];
  const Icon = view.Icon;

  return (
    <span className={`inline-flex h-8 min-w-8 items-center justify-center rounded-full border ${view.className}`} title={view.label}>
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only">{view.label}</span>
    </span>
  );
}

function BooleanValue({ value }: { value: string }) {
  if (value === "Yes") {
    return (
      <span className="inline-flex items-center gap-1 font-black text-emerald-100">
        <Check className="h-4 w-4" aria-hidden="true" />
        Yes
      </span>
    );
  }

  if (value === "No") {
    return (
      <span className="inline-flex items-center gap-1 font-black text-rose-100">
        <X className="h-4 w-4" aria-hidden="true" />
        No
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 font-black text-amber-100">
      <CircleHelp className="h-4 w-4" aria-hidden="true" />
      Unknown
    </span>
  );
}

function QuantityValue({ value }: { value: string }) {
  if (value === "Unknown") {
    return <span className="text-xs font-black text-amber-100">Unknown</span>;
  }

  return (
    <span className="inline-flex h-8 min-w-9 items-center justify-center rounded-lg border border-cyan-300/40 bg-cyan-300/10 px-2 text-sm font-black text-cyan-100">
      {value}
    </span>
  );
}

function MatrixValue({ row, side }: { row: CompareFeatureMatrixRow; side: "competitor" | "wyrestorm" }) {
  const value = side === "competitor" ? row.competitorValue : row.wyrestormValue;

  if (row.kind === "boolean") return <BooleanValue value={value} />;
  if (row.kind === "quantity") return <QuantityValue value={value} />;

  return <span className="text-sm font-semibold leading-5 text-white/80">{value}</span>;
}

function kindLabel(kind: CompareFeatureValueKind) {
  if (kind === "quantity") return "count";
  if (kind === "boolean") return "yes/no";
  return "value";
}

function productLabel(value: string, fallback: string) {
  const trimmed = value.trim();
  return trimmed || fallback;
}

export function CompareSpecificationMatrix({
  rows,
  competitorLabel = "Competitor product",
  wyrestormLabel = "WyreStorm product",
}: {
  rows: CompareFeatureMatrixRow[];
  competitorLabel?: string;
  wyrestormLabel?: string;
}) {
  if (!rows.length) return null;

  const counts = matrixCounts(rows);
  const competitor = productLabel(competitorLabel, "Competitor product");
  const wyrestorm = productLabel(wyrestormLabel, "WyreStorm product");

  return (
    <section className="mt-3 rounded-2xl border border-[#29465e] bg-[#081724] p-3" data-wingman-feature-match-grid="true">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-black text-cyan-200">Specification comparison matrix</h4>
          <p className="mt-1 text-xs leading-5 text-white/55">Rows show the fact being compared; columns show the competitor and WyreStorm value.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-black">
          <span className="rounded-full border border-emerald-400/50 bg-emerald-400/10 px-2.5 py-1 text-emerald-100">{counts.match} match</span>
          <span className="rounded-full border border-rose-400/50 bg-rose-400/10 px-2.5 py-1 text-rose-100">{counts.miss} no</span>
          <span className="rounded-full border border-amber-400/50 bg-amber-400/10 px-2.5 py-1 text-amber-100">{counts.partial} check</span>
        </div>
      </div>

      <div className="mt-3 grid gap-1 text-sm">
        <div className="hidden rounded-xl border border-[#29465e] bg-[#0d2133] px-3 py-2 text-xs font-black uppercase tracking-[0.1em] text-white/45 md:grid md:grid-cols-[48px_minmax(120px,0.9fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(90px,0.45fr)] md:gap-3">
          <span>Fit</span>
          <span>Spec</span>
          <span>{competitor}</span>
          <span>{wyrestorm}</span>
          <span>Result</span>
        </div>

        {rows.map((row) => {
          const status = STATUS_VIEW[row.status];

          return (
            <div
              key={row.id}
              className="grid gap-2 rounded-xl border border-[#1b3348] bg-[#071522] px-3 py-2 md:grid-cols-[48px_minmax(120px,0.9fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(90px,0.45fr)] md:items-center md:gap-3"
            >
              <div className="flex items-center justify-between gap-2 md:block">
                <StatusIcon status={row.status} />
                <span className="text-xs font-black uppercase tracking-[0.1em] text-white/40 md:hidden">{status.label}</span>
              </div>

              <div className="min-w-0">
                <div className="font-black leading-5 text-white">{row.label}</div>
                <div className="text-[11px] font-black uppercase tracking-[0.1em] text-white/35">{row.group} / {kindLabel(row.kind)}</div>
              </div>

              <div className="min-w-0 rounded-lg border border-[#29465e]/70 bg-[#0a1b2a] px-2 py-1.5">
                <div className="mb-1 text-[11px] font-black uppercase tracking-[0.1em] text-white/35 md:hidden">{competitor}</div>
                <MatrixValue row={row} side="competitor" />
              </div>

              <div className="min-w-0 rounded-lg border border-[#29465e]/70 bg-[#0a1b2a] px-2 py-1.5">
                <div className="mb-1 text-[11px] font-black uppercase tracking-[0.1em] text-white/35 md:hidden">{wyrestorm}</div>
                <MatrixValue row={row} side="wyrestorm" />
              </div>

              <div className="flex items-center justify-between gap-2 md:block">
                <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-black uppercase tracking-[0.08em] ${status.className}`}>
                  {status.shortLabel}
                </span>
                {row.note ? <span className="text-xs leading-4 text-white/45 md:mt-1 md:block">{row.note}</span> : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
