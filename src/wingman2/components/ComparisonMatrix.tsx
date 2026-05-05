import type { CompareRow } from "../types";

type ComparisonMatrixProps = {
  title: string;
  competitorSku: string;
  wyrestormSku: string;
  rows: CompareRow[];
};

function verdictClass(verdict: CompareRow["verdict"]) {
  switch (verdict) {
    case "Better":
      return "bg-emerald-100 text-emerald-700";
    case "Match":
      return "bg-sky-100 text-sky-700";
    case "Partial":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-rose-100 text-rose-700";
  }
}

export function ComparisonMatrix({
  title,
  competitorSku,
  wyrestormSku,
  rows,
}: ComparisonMatrixProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <p className="wingman-kicker">Competitor compare</p>
        <h3 className="mt-1 text-lg font-semibold text-slate-900">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-5 py-3 font-semibold">Specification</th>
              <th className="px-5 py-3 font-semibold">{competitorSku}</th>
              <th className="px-5 py-3 font-semibold">{wyrestormSku}</th>
              <th className="px-5 py-3 font-semibold">Verdict</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-slate-100">
                <td className="px-5 py-3 font-medium text-slate-900">{row.label}</td>
                <td className="px-5 py-3 text-slate-700">{row.competitor}</td>
                <td className="px-5 py-3 text-slate-700">{row.wyrestorm}</td>
                <td className="px-5 py-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${verdictClass(row.verdict)}`}>
                    {row.verdict}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
