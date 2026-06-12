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
    shortLabel: "NO",
    Icon: X,
    className: "border-rose-400/60 bg-rose-400/15 text-rose-100",
  },
  partial: {
    label: "Needs checking",
    shortLabel: "CHECK",
    Icon: AlertTriangle,
    className: "border-amber-400/65 bg-amber-400/15 text-amber-100",
  },
  extra: {
    label: "WyreStorm extra",
    shortLabel: "EXTRA",
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

function StatusPill({ status }: { status: CompareFeatureMatrixStatus }) {
  const view = STATUS_VIEW[status];
  const Icon = view.Icon;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em] ${view.className}`} title={view.label}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {view.shortLabel}
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
    return <span className="font-black text-amber-100">Unknown</span>;
  }

  return (
    <span className="inline-flex min-h-7 min-w-9 items-center justify-center rounded-lg border border-cyan-300/40 bg-cyan-300/10 px-2 text-sm font-black text-cyan-100">
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
    <section
      className="mt-4 rounded-3xl border border-cyan-300/35 bg-[#081724] p-4 shadow-[0_0_28px_rgba(34,211,238,0.08)]"
      data-wingman-feature-match-grid="true" data-compare-matrix="true"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-base font-black uppercase tracking-[0.12em] text-cyan-200">
            Competitor vs WyreStorm comparison matrix
          </h4>
          <p className="mt-1 max-w-5xl text-sm leading-6 text-white/60">
            This is the primary comparison view. Scroll the page vertically if needed; the matrix itself can scroll sideways on smaller screens or higher browser zoom.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-black">
          <span className="rounded-full border border-emerald-400/50 bg-emerald-400/10 px-2.5 py-1 text-emerald-100">{counts.match} match</span>
          <span className="rounded-full border border-rose-400/50 bg-rose-400/10 px-2.5 py-1 text-rose-100">{counts.miss} no</span>
          <span className="rounded-full border border-amber-400/50 bg-amber-400/10 px-2.5 py-1 text-amber-100">{counts.partial} check</span>
          <span className="rounded-full border border-cyan-300/50 bg-cyan-300/10 px-2.5 py-1 text-cyan-100">{counts.extra} extra</span>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-[#29465e]" data-wingman-comparison-matrix-scroll="true">
        <table className="min-w-[980px] w-full border-collapse text-left text-sm">
          <thead className="bg-[#0d2133] text-xs font-black uppercase tracking-[0.1em] text-white/45">
            <tr>
              <th className="w-[120px] px-3 py-3">Result</th>
              <th className="w-[190px] px-3 py-3">Specification</th>
              <th className="px-3 py-3">{competitor}</th>
              <th className="px-3 py-3">{wyrestorm}</th>
              <th className="w-[260px] px-3 py-3">Reason / check point</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#1b3348]">
            {rows.map((row) => (
              <tr key={row.id} className="bg-[#071522] align-top hover:bg-[#0a1b2a]">
                <td className="px-3 py-3">
                  <StatusPill status={row.status} />
                </td>

                <td className="px-3 py-3">
                  <div className="font-black leading-5 text-white">{row.label}</div>
                  <div className="mt-1 text-[11px] font-black uppercase tracking-[0.1em] text-white/35">{row.group} / {kindLabel(row.kind)}</div>
                </td>

                <td className="px-3 py-3">
                  <div className="rounded-xl border border-[#29465e]/70 bg-[#0a1b2a] px-3 py-2">
                    <MatrixValue row={row} side="competitor" />
                  </div>
                </td>

                <td className="px-3 py-3">
                  <div className="rounded-xl border border-[#29465e]/70 bg-[#0a1b2a] px-3 py-2">
                    <MatrixValue row={row} side="wyrestorm" />
                  </div>
                </td>

                <td className="px-3 py-3 text-sm leading-5 text-white/55">
                  {row.note || STATUS_VIEW[row.status].label}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}