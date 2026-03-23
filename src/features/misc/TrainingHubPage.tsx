import * as React from "react";
import { useNavigate } from "react-router-dom";
import { TRAINING_MODULES, type TrainingModule } from "@/training/trainingModules";
import {
  PageHeader,
  pageWrapStyle,
  stackStyle,
  cardStyle,
  sectionTitleStyle,
  sectionTextStyle,
  inputStyle,
  Field,
} from "@/ui2/page/PageChrome";

const TRACK_OPTIONS: Array<TrainingModule["track"] | "All"> = [
  "All",
  "Sales",
  "Design",
  "Products",
  "Tools",
];

const LEVEL_OPTIONS: Array<TrainingModule["level"] | "All"> = [
  "All",
  "Foundation",
  "Intermediate",
  "Advanced",
];

function pill(_level: TrainingModule["level"]) {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 700,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.05)",
    color: "rgba(255,255,255,0.86)",
  };
  return base;
}

export default function TrainingHubPage() {
  const nav = useNavigate();
  const [q, setQ] = React.useState("");
  const [track, setTrack] = React.useState<TrainingModule["track"] | "All">("All");
  const [level, setLevel] = React.useState<TrainingModule["level"] | "All">("All");
  const [openId, setOpenId] = React.useState<string | null>(TRAINING_MODULES[0]?.id ?? null);

  const filtered = React.useMemo(() => {
    const qq = q.trim().toLowerCase();
    return TRAINING_MODULES.filter((m) => {
      if (track !== "All" && m.track !== track) return false;
      if (level !== "All" && m.level !== level) return false;
      if (!qq) return true;
      const inTitle = m.title.toLowerCase().includes(qq);
      const inDesc = m.description.toLowerCase().includes(qq);
      const inLesson = m.lessons.some((l) => l.title.toLowerCase().includes(qq) || l.bullets.some((b) => b.toLowerCase().includes(qq)));
      return inTitle || inDesc || inLesson;
    });
  }, [q, track, level]);

  const open = filtered.find((m) => m.id === openId) ?? filtered[0] ?? null;
  const metrics = React.useMemo(() => {
    const lessonCount = filtered.reduce((sum, module) => sum + module.lessons.length, 0);
    const minutes = filtered.reduce(
      (sum, module) =>
        sum + module.lessons.reduce((lessonSum, lesson) => lessonSum + lesson.minutes, 0),
      0,
    );
    return {
      modules: filtered.length,
      lessons: lessonCount,
      minutes,
    };
  }, [filtered]);

  return (
    <div className="wm-page wm-animate-in wm-training-hub-page" style={pageWrapStyle()}>
      <div className="wm-training-hub-page__stack" style={stackStyle(14)}>
        <PageHeader
          eyebrow="TRAINING"
          title="Training Hub"
          description="Modular learning blocks for sales discovery, system design, product positioning and tool use."
          actions={
            <button className="wm-btn" type="button" onClick={() => nav("/app/dashboard")}>
              Dashboard
            </button>
          }
        />

        <section className="wm-card wm-training-hub-page__finder" style={cardStyle()}>
          <div style={sectionTitleStyle()}>Find a module</div>
          <div style={sectionTextStyle()}>
            Filter by track or level, then open a module for more detail.
          </div>

          <div className="wm-training-hub-page__filter-grid" style={{ marginTop: 16 }}>
            <Field label="Search">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search modules or lessons"
                style={inputStyle()}
              />
            </Field>

            <Field label="Track">
              <select value={track} onChange={(e) => setTrack(e.target.value as any)} style={inputStyle()}>
                {TRACK_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Field>

            <Field label="Level">
              <select value={level} onChange={(e) => setLevel(e.target.value as any)} style={inputStyle()}>
                {LEVEL_OPTIONS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="wm-training-hub-page__stats-grid">
            <div className="wm-training-hub-page__stat">
              <span className="wm-training-hub-page__stat-label">Modules</span>
              <strong className="wm-training-hub-page__stat-value">{metrics.modules}</strong>
            </div>
            <div className="wm-training-hub-page__stat">
              <span className="wm-training-hub-page__stat-label">Lessons</span>
              <strong className="wm-training-hub-page__stat-value">{metrics.lessons}</strong>
            </div>
            <div className="wm-training-hub-page__stat">
              <span className="wm-training-hub-page__stat-label">Study time</span>
              <strong className="wm-training-hub-page__stat-value">{metrics.minutes} min</strong>
            </div>
          </div>
        </section>

        <div className="wm-training-hub-page__workspace">
          <section className="wm-card wm-training-hub-page__modules" style={cardStyle()}>
            <div style={sectionTitleStyle()}>Modules</div>
            <div className="wm-training-hub-page__module-list">
              {filtered.map((m) => {
                const active = m.id === (open?.id ?? openId);
                const lessonTotal = m.lessons.reduce((sum, lesson) => sum + lesson.minutes, 0);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setOpenId(m.id)}
                    className={`wm-training-hub-page__module-card${active ? " is-active" : ""}`}
                    style={{
                      textAlign: "left",
                      borderRadius: 14,
                      border: active
                        ? "1px solid rgba(15,154,126,0.28)"
                        : "1px solid rgba(255,255,255,0.08)",
                      background: active
                        ? "linear-gradient(90deg, rgba(9,44,39,0.92), rgba(7,18,30,0.92))"
                        : "rgba(255,255,255,0.03)",
                      padding: 14,
                      cursor: "pointer",
                    }}
                  >
                    <div className="wm-training-hub-page__module-title">
                      {m.title}
                    </div>
                    <div className="wm-training-hub-page__module-copy">
                      {m.description}
                    </div>
                    <div className="wm-training-hub-page__module-meta">
                      <span style={pill(m.level)}>{m.level}</span>
                      <span style={pill(m.level)}>{m.track}</span>
                      <span className="wm-training-hub-page__meta-note">
                        {m.lessons.length} lessons / {lessonTotal} min
                      </span>
                    </div>
                  </button>
                );
              })}

              {!filtered.length ? (
                <div style={{ ...sectionTextStyle(), marginTop: 0 }}>
                  No modules matched your filters.
                </div>
              ) : null}
            </div>
          </section>

          <section className="wm-card wm-training-hub-page__detail" style={cardStyle()}>
            <div style={sectionTitleStyle()}>Module detail</div>

            {!open ? (
              <div style={sectionTextStyle()}>Select a module to view details.</div>
            ) : (
              <div className="wm-training-hub-page__detail-stack">
                <div className="wm-training-hub-page__detail-header">
                  <div className="wm-training-hub-page__detail-title">
                    {open.title}
                  </div>
                  <div className="wm-training-hub-page__detail-copy">
                    {open.description}
                  </div>
                  <div className="wm-training-hub-page__module-meta">
                    <span style={pill(open.level)}>{open.level}</span>
                    <span style={pill(open.level)}>{open.track}</span>
                    <span className="wm-training-hub-page__meta-note">
                      {open.lessons.length} lessons / {open.lessons.reduce((sum, lesson) => sum + lesson.minutes, 0)} min
                    </span>
                  </div>
                </div>

                <div className="wm-training-hub-page__lesson-list">
                  {open.lessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      className="wm-training-hub-page__lesson-card"
                      style={{
                        borderRadius: 14,
                        border: "1px solid rgba(255,255,255,0.08)",
                        background: "rgba(255,255,255,0.03)",
                        padding: 14,
                      }}
                    >
                      <div className="wm-training-hub-page__lesson-title">
                        {lesson.title}
                      </div>
                      <div className="wm-training-hub-page__lesson-minutes">
                        {lesson.minutes} min
                      </div>
                      <ul className="wm-training-hub-page__lesson-bullets" style={{ margin: "10px 0 0", paddingLeft: 18, color: "rgba(255,255,255,0.76)" }}>
                        {lesson.bullets.map((b, i) => <li key={i} style={{ marginTop: 6 }}>{b}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
