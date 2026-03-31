import * as React from "react";
import { useNavigate } from "react-router-dom";

import { WingmanPageFrame, WingmanSection, WingmanStat } from "@/components/layout/WingmanPageFrame";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import { TRAINING_MODULES, type TrainingModule } from "@/training/trainingModules";

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

export default function TrainingHubPage() {
  const nav = useNavigate();
  const [q, setQ] = React.useState("");
  const [track, setTrack] = React.useState<TrainingModule["track"] | "All">("All");
  const [level, setLevel] = React.useState<TrainingModule["level"] | "All">("All");
  const [openId, setOpenId] = React.useState<string | null>(TRAINING_MODULES[0]?.id ?? null);

  const filtered = React.useMemo(() => {
    const qq = q.trim().toLowerCase();
    return TRAINING_MODULES.filter((module) => {
      if (track !== "All" && module.track !== track) return false;
      if (level !== "All" && module.level !== level) return false;
      if (!qq) return true;

      const inTitle = module.title.toLowerCase().includes(qq);
      const inDesc = module.description.toLowerCase().includes(qq);
      const inLesson = module.lessons.some((lesson) =>
        lesson.title.toLowerCase().includes(qq) ||
        lesson.bullets.some((bullet) => bullet.toLowerCase().includes(qq))
      );

      return inTitle || inDesc || inLesson;
    });
  }, [level, q, track]);

  const open = filtered.find((module) => module.id === openId) ?? filtered[0] ?? null;

  const metrics = React.useMemo(() => {
    const lessonCount = filtered.reduce((sum, module) => sum + module.lessons.length, 0);
    const minutes = filtered.reduce(
      (sum, module) => sum + module.lessons.reduce((lessonSum, lesson) => lessonSum + lesson.minutes, 0),
      0
    );

    return {
      modules: filtered.length,
      lessons: lessonCount,
      minutes,
    };
  }, [filtered]);

  return (
    <div className="wm-page wm-page--frame wm-training-hub-page">
      <WingmanPageFrame
        eyebrow="Training"
        title="Training Hub"
        description="Modular learning blocks for sales discovery, system design, product positioning and tool use."
        actions={(
          <div className="wm-toolbar">
            <button className="wm-btn wm-btn-primary" type="button" onClick={() => nav(WM_ROUTES.dashboard)}>
              Dashboard
            </button>
            <button className="wm-btn" type="button" onClick={() => nav(WM_ROUTES.tools)}>
              Tool hub
            </button>
          </div>
        )}
        stats={(
          <>
            <WingmanStat label="Modules" value={metrics.modules} meta="Filtered by your current search and track selections." />
            <WingmanStat label="Lessons" value={metrics.lessons} meta="Short, focused learning blocks." />
            <WingmanStat label="Study time" value={`${metrics.minutes} min`} meta="Total duration across the current results." />
          </>
        )}
      >
        <WingmanSection
          title="Find a module"
          description="Filter by track or level, then open a module for more detail."
        >
          <div className="wm-training-toolbar">
            <label className="wm-frame-field">
              <span className="wm-frame-field__label">Search</span>
              <input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Search modules or lessons"
                className="wm-frame-input"
              />
            </label>

            <label className="wm-frame-field">
              <span className="wm-frame-field__label">Track</span>
              <select
                value={track}
                onChange={(event) => setTrack(event.target.value as TrainingModule["track"] | "All")}
                className="wm-frame-input"
              >
                {TRACK_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="wm-frame-field">
              <span className="wm-frame-field__label">Level</span>
              <select
                value={level}
                onChange={(event) => setLevel(event.target.value as TrainingModule["level"] | "All")}
                className="wm-frame-input"
              >
                {LEVEL_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </WingmanSection>

        <div className="wm-split">
          <WingmanSection title="Modules" description="Open a learning path on the left, then review the lesson structure on the right.">
            <div className="wm-training-module-list">
              {filtered.map((module) => {
                const active = module.id === (open?.id ?? openId);
                const lessonTotal = module.lessons.reduce((sum, lesson) => sum + lesson.minutes, 0);

                return (
                  <button
                    key={module.id}
                    type="button"
                    onClick={() => setOpenId(module.id)}
                    className={active ? "wm-training-module-card is-active" : "wm-training-module-card"}
                  >
                    <div className="wm-training-module-card__title">{module.title}</div>
                    <div className="wm-training-module-card__copy">{module.description}</div>
                    <div className="wm-training-module-card__meta">
                      <span className="wm-training-pill">{module.level}</span>
                      <span className="wm-training-pill">{module.track}</span>
                      <span className="wm-training-module-card__note">
                        {module.lessons.length} lessons / {lessonTotal} min
                      </span>
                    </div>
                  </button>
                );
              })}

              {!filtered.length ? (
                <div className="wm-info-card">
                  <div className="wm-info-card__title">No modules matched</div>
                  <p className="wm-info-card__copy">Adjust your filters or search term to see more training content.</p>
                </div>
              ) : null}
            </div>
          </WingmanSection>

          <WingmanSection title="Module detail" description="Lesson outlines stay in the same surface treatment as the wider workspace.">
            {!open ? (
              <div className="wm-info-card">
                <div className="wm-info-card__title">Select a module</div>
                <p className="wm-info-card__copy">Choose a module from the left to view the lesson plan.</p>
              </div>
            ) : (
              <div className="wm-training-detail">
                <div className="wm-training-detail__header">
                  <div className="wm-training-detail__title">{open.title}</div>
                  <div className="wm-training-detail__copy">{open.description}</div>
                  <div className="wm-training-module-card__meta">
                    <span className="wm-training-pill">{open.level}</span>
                    <span className="wm-training-pill">{open.track}</span>
                    <span className="wm-training-module-card__note">
                      {open.lessons.length} lessons / {open.lessons.reduce((sum, lesson) => sum + lesson.minutes, 0)} min
                    </span>
                  </div>
                </div>

                <div className="wm-training-lesson-list">
                  {open.lessons.map((lesson) => (
                    <article key={lesson.id} className="wm-training-lesson-card">
                      <div className="wm-training-lesson-card__head">
                        <div className="wm-training-lesson-card__title">{lesson.title}</div>
                        <div className="wm-training-lesson-card__minutes">{lesson.minutes} min</div>
                      </div>
                      <ul className="wm-training-lesson-card__bullets">
                        {lesson.bullets.map((bullet) => (
                          <li key={`${lesson.id}-${bullet}`}>{bullet}</li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </WingmanSection>
        </div>
      </WingmanPageFrame>
    </div>
  );
}
