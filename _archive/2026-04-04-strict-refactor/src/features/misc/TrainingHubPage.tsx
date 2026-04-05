import * as React from "react";
import { Link } from "react-router-dom";
import { ArrowRightCircle, BookOpenCheck, ClipboardCheck, GraduationCap } from "lucide-react";

import SplitWorkspaceFrame from "@/components/workspace/SplitWorkspaceFrame";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import { TRAINING_MODULES, type TrainingModule } from "@/training/trainingModules";

type TrainingTab = "lessons" | "support";

const TRACK_OPTIONS: Array<TrainingModule["track"] | "All"> = ["All", "Sales", "Design", "Products", "Tools"];
const LEVEL_OPTIONS: Array<TrainingModule["level"] | "All"> = ["All", "Foundation", "Intermediate", "Advanced"];
const LEVEL_MARK: Record<TrainingModule["level"], string> = {
  Foundation: "1",
  Intermediate: "2",
  Advanced: "3",
};
const TRACK_ACCENTS: Record<
  TrainingModule["track"],
  { accent: string; accentSoft: string; heroLabel: string }
> = {
  Sales: {
    accent: "#f0a35a",
    accentSoft: "rgba(240, 163, 90, 0.34)",
    heroLabel: "Sales",
  },
  Design: {
    accent: "#8d755d",
    accentSoft: "rgba(141, 117, 93, 0.3)",
    heroLabel: "Design",
  },
  Products: {
    accent: "#15c9bc",
    accentSoft: "rgba(21, 201, 188, 0.32)",
    heroLabel: "Technical",
  },
  Tools: {
    accent: "#83919f",
    accentSoft: "rgba(131, 145, 159, 0.3)",
    heroLabel: "Workflow",
  },
};
const JOURNEY_STEPS = [
  {
    title: "Watch Lessons",
    copy: "Move through the lesson plan without losing the broader learning path.",
    icon: BookOpenCheck,
  },
  {
    title: "Review Support",
    copy: "Keep resources and follow-on notes in the separate support tab so the lesson view stays clean.",
    icon: ClipboardCheck,
  },
  {
    title: "Apply in Wingman",
    copy: "Jump into the matching tool while the training context is still fresh.",
    icon: GraduationCap,
  },
];

function nextToolForTrack(track: TrainingModule["track"]) {
  if (track === "Sales") return { label: "Open Sales Positioning", to: WM_ROUTES.sales, note: "Use the messaging tool next while the discovery context is still fresh." };
  if (track === "Design") return { label: "Open Room Wizard", to: WM_ROUTES.roomWizard, note: "Move into room design next so the training translates into an actual workflow." };
  if (track === "Products") return { label: "Open Catalogue", to: WM_ROUTES.catalog, note: "Use the catalogue next to validate product families and shortlist options." };
  return { label: "Open Tool Hub", to: WM_ROUTES.tools, note: "Jump back into the tool workspace and keep the training applied in context." };
}

function lessonResources(module: TrainingModule) {
  return module.lessons.flatMap((lesson) => (lesson.resources || []).map((resource) => ({ ...resource, lessonTitle: lesson.title })));
}

function styleForModule(module: TrainingModule): React.CSSProperties {
  const accent = TRACK_ACCENTS[module.track];
  return {
    ["--wm-training-accent" as string]: accent.accent,
    ["--wm-training-accent-soft" as string]: accent.accentSoft,
  };
}

export default function TrainingHubPage() {
  const [query, setQuery] = React.useState("");
  const deferredQuery = React.useDeferredValue(query);
  const [track, setTrack] = React.useState<TrainingModule["track"] | "All">("All");
  const [level, setLevel] = React.useState<TrainingModule["level"] | "All">("All");
  const [openId, setOpenId] = React.useState<string | null>(TRAINING_MODULES[0]?.id ?? null);
  const [tab, setTab] = React.useState<TrainingTab>("lessons");

  const filtered = React.useMemo(() => {
    const search = deferredQuery.trim().toLowerCase();
    return TRAINING_MODULES.filter((module) => {
      if (track !== "All" && module.track !== track) return false;
      if (level !== "All" && module.level !== level) return false;
      if (!search) return true;
      const inTitle = module.title.toLowerCase().includes(search);
      const inDesc = module.description.toLowerCase().includes(search);
      const inLesson = module.lessons.some((lesson) => lesson.title.toLowerCase().includes(search) || lesson.bullets.some((bullet) => bullet.toLowerCase().includes(search)));
      return inTitle || inDesc || inLesson;
    });
  }, [deferredQuery, level, track]);

  const open = filtered.find((module) => module.id === openId) ?? filtered[0] ?? null;

  React.useEffect(() => {
    if (!filtered.length) return;
    if (openId && filtered.some((module) => module.id === openId)) return;
    setOpenId(filtered[0].id);
  }, [filtered, openId]);

  const metrics = React.useMemo(() => {
    const lessons = filtered.reduce((sum, module) => sum + module.lessons.length, 0);
    const minutes = filtered.reduce((sum, module) => sum + module.lessons.reduce((lessonSum, lesson) => lessonSum + lesson.minutes, 0), 0);
    return { modules: filtered.length, lessons, minutes };
  }, [filtered]);

  const recommendation = open ? nextToolForTrack(open.track) : null;
  const resources = open ? lessonResources(open) : [];
  const tabPanelId = (value: TrainingTab) => `training-panel-${value}`;
  const tabId = (value: TrainingTab) => `training-tab-${value}`;
  const openStyle = open ? styleForModule(open) : undefined;
  const openAccent = open ? TRACK_ACCENTS[open.track] : null;

  const left = (
    <div className="wm-workspace-stack">
      <div className="wm-start-step">Browse the learning paths here, then keep the selected lesson plan and support detail open beside it.</div>

      <section className="wm-workspace-card wm-training-filter-card">
        <div className="wm-training-filter-card__header">
          <h3 className="wm-workspace-card__title">Find the Right Path</h3>
          <p>Search by topic, then narrow by track or level so the next lesson feels obvious instead of buried.</p>
        </div>
        <div className="wm-workspace-form">
          <div className="wm-workspace-field">
            <label htmlFor="training-search" className="wm-workspace-label">Search</label>
            <input id="training-search" name="training_search" className="wm-input-dark" type="search" autoComplete="off" placeholder="Module, lesson, or topic…" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <div className="wm-workspace-grid-2">
            <div className="wm-workspace-field">
              <label htmlFor="training-track" className="wm-workspace-label">Track</label>
              <select id="training-track" name="training_track" className="wm-select-dark" value={track} onChange={(event) => setTrack(event.target.value as TrainingModule["track"] | "All")}>
                {TRACK_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
            <div className="wm-workspace-field">
              <label htmlFor="training-level" className="wm-workspace-label">Level</label>
              <select id="training-level" name="training_level" className="wm-select-dark" value={level} onChange={(event) => setLevel(event.target.value as TrainingModule["level"] | "All")}>
                {LEVEL_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
          </div>
          <div className="wm-workspace-action-row">
            <button type="button" className="wm-btn-secondary" onClick={() => setQuery("")}>Clear Search</button>
            <Link to={WM_ROUTES.tools} className="wm-btn">Tool Hub</Link>
          </div>
          <div className="wm-training-stat-strip">
            <div className="wm-training-stat"><span>Modules</span><strong>{metrics.modules}</strong></div>
            <div className="wm-training-stat"><span>Lessons</span><strong>{metrics.lessons}</strong></div>
            <div className="wm-training-stat"><span>Study Time</span><strong>{metrics.minutes} min</strong></div>
          </div>
        </div>
      </section>

      <section className="wm-workspace-card wm-training-library">
        <div className="wm-training-library__header">
          <h3 className="wm-workspace-card__title">Learning Paths</h3>
          <p>Select a course card and keep the lesson plan open beside it instead of bouncing between screens.</p>
        </div>
        <div className="wm-next-step">{open ? `Open "${open.title}" on the right, then use the support tab to move straight into the matching workspace.` : "Adjust the filters to bring a training path back into view."}</div>
        <div className="wm-training-path-grid">
          {filtered.length ? filtered.map((module) => {
            const active = module.id === open?.id;
            const totalMinutes = module.lessons.reduce((sum, lesson) => sum + lesson.minutes, 0);
            const moduleStyle = styleForModule(module);
            const accent = TRACK_ACCENTS[module.track];
            return (
              <button
                key={module.id}
                type="button"
                className={`wm-training-path-card${active ? " wm-training-path-card--active" : ""}`}
                aria-pressed={active}
                onClick={() => setOpenId(module.id)}
                style={moduleStyle}
              >
                <span className="wm-training-path-card__hero">
                  <span className="wm-training-path-card__brand">WyreStorm Learning</span>
                  <span className="wm-training-path-card__level">{LEVEL_MARK[module.level]}</span>
                  <span className="wm-training-path-card__kicker">Level {LEVEL_MARK[module.level]}</span>
                  <span className="wm-training-path-card__headline">{module.title}</span>
                  <span className="wm-training-path-card__track">{accent.heroLabel}</span>
                </span>
                <span className="wm-training-path-card__body">
                  <span className="wm-training-path-card__summary">{module.description}</span>
                  <span className="wm-training-path-card__meta">{module.lessons.length} lessons | {totalMinutes} min</span>
                </span>
              </button>
            );
          }) : <div className="wm-workspace-empty">No modules matched the current search and filter combination.</div>}
        </div>
      </section>
    </div>
  );

  const right = !open ? (
    <div className="wm-workspace-empty">Choose a module from the left to view the lesson plan.</div>
  ) : (
    <div className="wm-workspace-stack">
      <section className="wm-workspace-card wm-training-module-hero" style={openStyle}>
        <div className="wm-training-module-hero__visual">
          <span className="wm-training-module-hero__brand">WyreStorm Training</span>
          <span className="wm-training-module-hero__level">{LEVEL_MARK[open.level]}</span>
          <span className="wm-training-module-hero__kicker">Level {LEVEL_MARK[open.level]}</span>
          <h3 className="wm-training-module-hero__title">{open.title}</h3>
          <span className="wm-training-module-hero__track">{openAccent?.heroLabel || open.track}</span>
        </div>
        <div className="wm-training-module-hero__body">
          <p className="wm-training-module-hero__copy">{open.description}</p>
          <div className="wm-training-module-hero__actions">
            <span className="wm-workspace-tag">{open.track}</span>
            <span className="wm-workspace-tag">{open.level}</span>
            <span className="wm-workspace-tag">{open.lessons.length} lessons</span>
            <span className="wm-workspace-tag">{open.lessons.reduce((sum, lesson) => sum + lesson.minutes, 0)} min</span>
            {recommendation ? <Link to={recommendation.to} className="wm-btn-primary">{recommendation.label}</Link> : null}
          </div>
        </div>
      </section>

      <section className="wm-workspace-card">
        <div className="wm-workspace-tab-row" role="tablist" aria-label="Training module detail sections">
          <button id={tabId("lessons")} type="button" role="tab" aria-selected={tab === "lessons"} aria-controls={tabPanelId("lessons")} className={`wm-workspace-tab${tab === "lessons" ? " wm-workspace-tab--active" : ""}`} onClick={() => setTab("lessons")}>Lesson Plan</button>
          <button id={tabId("support")} type="button" role="tab" aria-selected={tab === "support"} aria-controls={tabPanelId("support")} className={`wm-workspace-tab${tab === "support" ? " wm-workspace-tab--active" : ""}`} onClick={() => setTab("support")}>Support</button>
        </div>

        {tab === "lessons" ? (
          <div id={tabPanelId("lessons")} role="tabpanel" aria-labelledby={tabId("lessons")} className="wm-workspace-list">
            {open.lessons.map((lesson) => (
              <article key={lesson.id} className="wm-workspace-list-item">
                <span className="wm-workspace-list-item__eyebrow">{lesson.minutes} min</span>
                <span className="wm-workspace-list-item__title">{lesson.title}</span>
                <ul className="wm-training-hub-page__lesson-bullets">
                  {lesson.bullets.map((bullet) => <li key={`${lesson.id}-${bullet}`}>{bullet}</li>)}
                </ul>
              </article>
            ))}
          </div>
        ) : (
          <div id={tabPanelId("support")} role="tabpanel" aria-labelledby={tabId("support")} className="wm-workspace-stack">
            <section className="wm-workspace-card wm-training-journey" style={openStyle}>
              <div className="wm-training-journey__header">
                <h3 className="wm-training-journey__title">Your Journey</h3>
                <p className="wm-training-journey__copy">Keep the primary lesson flow clean, then use separate support guidance to help the training translate into action.</p>
              </div>
              <div className="wm-training-journey__grid">
                {JOURNEY_STEPS.map((step) => {
                  const Icon = step.icon;
                  return (
                    <article key={step.title} className="wm-training-journey__step">
                      <div className="wm-training-journey__icon" aria-hidden="true">
                        <Icon />
                      </div>
                      <h4 className="wm-training-journey__step-title">{step.title}</h4>
                      <p className="wm-training-journey__step-copy">{step.copy}</p>
                    </article>
                  );
                })}
              </div>
            </section>
            <section className="wm-workspace-card wm-workspace-card--muted">
              <div className="wm-workspace-card__header">
                <h3 className="wm-workspace-card__title">Use This Next</h3>
                <p className="wm-workspace-card__copy">{recommendation?.note}</p>
              </div>
              <div className="wm-workspace-action-row">
                {recommendation ? <Link to={recommendation.to} className="wm-btn-primary">{recommendation.label}</Link> : null}
                <Link to={WM_ROUTES.dashboard} className="wm-btn">Dashboard</Link>
                {recommendation ? <Link to={recommendation.to} className="wm-btn-secondary">Open Matching Tool <ArrowRightCircle size={16} aria-hidden="true" /></Link> : null}
              </div>
            </section>
            <section className="wm-workspace-card wm-workspace-card--muted">
              <div className="wm-workspace-card__header">
                <h3 className="wm-workspace-card__title">Linked Resources</h3>
                <p className="wm-workspace-card__copy">Supporting links stay in this separate tab so the lesson plan remains easy to scan.</p>
              </div>
              {resources.length ? <div className="wm-workspace-list">{resources.map((resource) => resource.href ? <a key={`${resource.lessonTitle}-${resource.label}`} href={resource.href} target="_blank" rel="noreferrer" className="wm-workspace-list-item"><span className="wm-workspace-list-item__eyebrow">{resource.lessonTitle}</span><span className="wm-workspace-list-item__title">{resource.label}</span><span className="wm-workspace-list-item__copy">{resource.href}</span></a> : <div key={`${resource.lessonTitle}-${resource.label}`} className="wm-workspace-list-item"><span className="wm-workspace-list-item__eyebrow">{resource.lessonTitle}</span><span className="wm-workspace-list-item__title">{resource.label}</span></div>)}</div> : <div className="wm-workspace-empty">No extra resources are attached to this module yet. Use the recommended next tool to keep moving.</div>}
            </section>
          </div>
        )}
      </section>
    </div>
  );

  return (
    <SplitWorkspaceFrame
      title="Training Hub"
      subtitle="A lighter learning workspace inspired by WyreStorm's training presentation style, with separate support tabs to keep the lesson view clean."
      leftTitle="Learning Paths"
      rightTitle="Course Detail"
      left={left}
      right={right}
      top={<div className="wm-workspace-action-row"><Link to={WM_ROUTES.dashboard} className="wm-btn">Dashboard</Link><Link to={WM_ROUTES.tools} className="wm-btn">Tool Hub</Link></div>}
    />
  );
}

