import { AlertTriangle, CheckCircle2, CircleHelp, PlusCircle, XCircle, type LucideIcon } from "lucide-react";
import type {
  CompareFeatureMatrixRow,
  CompareFeatureMatrixStatus,
  CompareFeatureValueKind,
} from "../../lib/compareFeatureMatrix";

const STATUS_VIEW: Record<CompareFeatureMatrixStatus, { label: string; Icon: LucideIcon; className: string }> = {
  match: {
    label: "Match",
    Icon: CheckCircle2,
    className: "border-emerald-400/50 bg-emerald-400/15 text-emerald-100",
  },
  miss: {
    label: "Miss",
    Icon: XCircle,
    className: "border-rose-400/55 bg-rose-400/15 text-rose-100",
  },
  partial: {
    label: "Partial",
    Icon: AlertTriangle,
    className: "border-amber-400/55 bg-amber-400/15 text-amber-100",
  },
  extra: {
    label: "Extra",
    Icon: PlusCircle,
    className: "border-cyan-300/55 bg-cyan-300/15 text-cyan-100",
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
    <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full border ${view.className}`} title={view.label}>
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only">{view.label}</span>
    </span>
  );
}

function BooleanValue({ value }: { value: string }) {
  if (value === "Yes") {
    return (
      <span className="inline-flex items-center gap-1.5 font-black text-emerald-100">
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        Yes
      </span>
    );
  }

  if (value === "No") {
    return (
      <span className="inline-flex items-center gap-1.5 font-black text-rose-100">
        <XCircle className="h-4 w-4" aria-hidden="true" />
        No
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 font-black text-amber-100">
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
    <span className="inline-flex min-w-8 items-center justify-center rounded-lg border border-cyan-300/40 bg-cyan-300/10 px-2 py-1 text-sm font-black text-cyan-100">
      {value}
    </span>
  );
}

function MatrixValue({ row, side }: { row: CompareFeatureMatrixRow; side: "competitor" | "wyrestorm" }) {
  const value = side === "competitor" ? row.competitorValue : row.wyrestormValue;

  if (row.kind === "boolean") return <BooleanValue value={value} />;
  if (row.kind === "quantity") return <QuantityValue value={value} />;

  return <span className="text-sm font-semibold leading-5 text-white/75">{value}</span>;
}

function kindLabel(kind: CompareFeatureValueKind) {
  return kind;
}

export function CompareSpecificationMatrix({ rows }: { rows: CompareFeatureMatrixRow[] }) {
  if (!rows.length) return null;

  const counts = matrixCounts(rows);

  return (
    <section className="mt-4 rounded-2xl border border-[#29465e] bg-[#081724] p-4" data-wingman-feature-match-grid="true">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-black text-cyan-200">Specification match matrix</h4>
          <p className="mt-1 text-xs leading-5 text-white/55">Competitor facts against this WyreStorm candidate.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-black">
          <span className="rounded-full border border-emerald-400/50 bg-emerald-400/10 px-2.5 py-1 text-emerald-100">{counts.match} match</span>
          <span className="rounded-full border border-rose-400/50 bg-rose-400/10 px-2.5 py-1 text-rose-100">{counts.miss} miss</span>
          <span className="rounded-full border border-amber-400/50 bg-amber-400/10 px-2.5 py-1 text-amber-100">{counts.partial} partial</span>
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-sm">
        <div className="hidden grid-cols-[48px_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,1.2fr)] gap-3 border-b border-[#29465e] pb-2 text-xs font-black uppercase tracking-[0.12em] text-white/40 md:grid">
          <span>Fit</span>
          <span>Spec</span>
          <span>Competitor</span>
          <span>WyreStorm</span>
          <span>Note</span>
        </div>

        {rows.map((row) => (
          <div
            key={row.id}
            className="grid gap-3 rounded-xl border border-[#1b3348] bg-[#071522] p-3 md:grid-cols-[48px_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,1.2fr)] md:items-start"
          >
            <div className="flex items-center justify-between gap-3 md:block">
              <StatusIcon status={row.status} />
              <span className="text-xs font-black uppercase tracking-[0.12em] text-white/40 md:hidden">{STATUS_VIEW[row.status].label}</span>
            </div>
            <div className="min-w-0">
              <div className="font-black leading-5 text-white">{row.label}</div>
              <div className="mt-1 text-xs text-white/40">{row.group} / {kindLabel(row.kind)}</div>
            </div>
            <div className="min-w-0">
              <div className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-white/35 md:hidden">Competitor</div>
              <MatrixValue row={row} side="competitor" />
            </div>
            <div className="min-w-0">
              <div className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-white/35 md:hidden">WyreStorm</div>
              <MatrixValue row={row} side="wyrestorm" />
            </div>
            <p className="min-w-0 text-sm leading-5 text-white/55">{row.note}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
