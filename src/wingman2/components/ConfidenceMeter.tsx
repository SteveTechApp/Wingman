type ConfidenceMeterProps = {
  score: number;
};

export function ConfidenceMeter({ score }: ConfidenceMeterProps) {
  const safe = Math.max(0, Math.min(100, score));
  const barClass =
    safe >= 80
      ? "bg-emerald-500"
      : safe >= 60
      ? "bg-amber-500"
      : "bg-rose-500";

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Confidence
        </span>
        <span className="text-sm font-semibold text-slate-800">{safe}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-200">
        <div className={`h-2 rounded-full ${barClass}`} style={{ width: `${safe}%` }} />
      </div>
    </div>
  );
}
