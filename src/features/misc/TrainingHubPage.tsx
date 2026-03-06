import * as React from "react";
import { TRAINING_MODULES, TrainingModule } from "@/training/trainingModules";

function pill(level: TrainingModule["level"]) {
  const base = "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium border";
  switch (level) {
    case "Foundation":
      return base + " border-slate-200 text-slate-700 bg-white/60";
    case "Intermediate":
      return base + " border-slate-200 text-slate-700 bg-white/60";
    default:
      return base + " border-slate-200 text-slate-700 bg-white/60";
  }
}

export default function TrainingHubPage() {
  const [q, setQ] = React.useState("");
  const [track, setTrack] = React.useState<TrainingModule["track"] | "All">("All");
  const [level, setLevel] = React.useState<TrainingModule["level"] | "All">("All");
  const [openId, setOpenId] = React.useState<string | null>(TRAINING_MODULES[0]?.id ?? null);

  const tracks: Array<TrainingModule["track"] | "All"> = ["All", "Sales", "Design", "Products", "Tools"];
  const levels: Array<TrainingModule["level"] | "All"> = ["All", "Foundation", "Intermediate", "Advanced"];

  const filtered = React.useMemo(() => {
    const qq = q.trim().toLowerCase();
    return TRAINING_MODULES.filter(m => {
      if (track !== "All" && m.track !== track) return false;
      if (level !== "All" && m.level !== level) return false;
      if (!qq) return true;
      const inTitle = m.title.toLowerCase().includes(qq);
      const inDesc = m.description.toLowerCase().includes(qq);
      const inLesson = m.lessons.some(l => l.title.toLowerCase().includes(qq) || l.bullets.some(b => b.toLowerCase().includes(qq)));
      return inTitle || inDesc || inLesson;
    });
  }, [q, track, level]);

  const open = filtered.find(m => m.id === openId) ?? filtered[0] ?? null;

  return (<div className="wm-page">

    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Training</h1>
          <p className="text-sm text-slate-600">
            Modular learning blocks for sales discovery, system design, and product positioning.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search modules or lessons…"
            className="w-full sm:w-72 rounded-lg border border-slate-200 bg-white/70 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
          />
          <select
            value={track}
            onChange={(e) => setTrack(e.target.value as any)}
            className="rounded-lg border border-slate-200 bg-white/70 px-3 py-2 text-sm"
          >
            {tracks.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value as any)}
            className="rounded-lg border border-slate-200 bg-white/70 px-3 py-2 text-sm"
          >
            {levels.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-12">
        {/* Left: module list */}
        <div className="md:col-span-5">
          <div className="rounded-2xl border border-slate-200 bg-white/60 p-3">
            <div className="flex items-center justify-between px-1 pb-2">
              <div className="text-sm font-medium text-slate-800">Modules</div>
              <div className="text-xs text-slate-500">{filtered.length} shown</div>
            </div>

            <div className="space-y-2">
              {filtered.map(m => {
                const active = m.id === (open?.id ?? openId);
                return (
                  <button
                    key={m.id}
                    onClick={() => setOpenId(m.id)}
                    className={[
                      "w-full text-left rounded-xl border px-3 py-3 transition",
                      active ? "border-slate-300 bg-slate-50" : "border-slate-200 bg-white/50 hover:bg-white/70"
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900 truncate">{m.title}</div>
                        <div className="text-xs text-slate-600 line-clamp-2">{m.description}</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className={pill(m.level)}>{m.level}</span>
                          <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium border border-slate-200 text-slate-700 bg-white/60">
                            {m.track}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-slate-500 whitespace-nowrap">
                        {m.lessons.length} lessons
                      </div>
                    </div>
                  </button>
                );
              })}

              {filtered.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white/40 p-4 text-sm text-slate-600">
                  No results. Try a different search term.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: module detail */}
        <div className="md:col-span-7">
          <div className="rounded-2xl border border-slate-200 bg-white/60 p-5">
            {!open ? (
              <div className="text-sm text-slate-600">Select a module to view details.</div>
            ) : (
              <>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="text-lg font-semibold text-slate-900">{open.title}</div>
                    <div className="text-sm text-slate-600">{open.description}</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className={pill(open.level)}>{open.level}</span>
                      <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium border border-slate-200 text-slate-700 bg-white/60">
                        {open.track}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      className="rounded-lg border border-slate-200 bg-white/70 px-3 py-2 text-sm hover:bg-white"
                      onClick={() => alert("Next step: wire this to progress tracking (localStorage or user account).")}
                    >
                      Mark complete
                    </button>
                    <button
                      className="rounded-lg border border-slate-200 bg-white/70 px-3 py-2 text-sm hover:bg-white"
                      onClick={() => navigator.clipboard?.writeText(window.location.href)}
                    >
                      Copy link
                    </button>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {open.lessons.map((l) => (
                    <div key={l.id} className="rounded-xl border border-slate-200 bg-white/55 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium text-slate-900">{l.title}</div>
                          <div className="text-xs text-slate-500">{l.minutes} min</div>
                        </div>
                        <button
                          className="rounded-lg border border-slate-200 bg-white/70 px-2.5 py-1.5 text-xs hover:bg-white"
                          onClick={() => alert("Next step: open lesson player (slides/notes/quiz).")}
                        >
                          Open
                        </button>
                      </div>

                      <ul className="mt-3 list-disc pl-5 text-sm text-slate-700 space-y-1">
                        {l.bullets.map((b, i) => <li key={i}>{b}</li>)}
                      </ul>

                      {l.resources && l.resources.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {l.resources.map((r, i) => (
                            <span key={i} className="inline-flex items-center rounded-full px-2.5 py-1 text-xs border border-slate-200 bg-white/60 text-slate-700">
                              {r.label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-4 text-xs text-slate-500">
                  Next: connect lessons to printable notes + short quizzes, and store completion per user.
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  
</div>);
}