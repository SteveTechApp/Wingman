import * as React from "react";
import {
  ArrowRight,
  BookOpenText,
  Compass,
  GraduationCap,
  MessageSquareText,
  Route,
  Wrench,
} from "lucide-react";
import { Link } from "react-router-dom";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import { buildGuruProjectSummary } from "@/features/ai/guru/guruContext";
import {
  getActiveProject,
  subscribeProjects,
} from "@/features/projects/projectStore";
import {
  buildGuruJourneyLink,
  recommendSupportJourney,
  SUPPORT_JOURNEYS,
  type SupportJourney,
} from "@/features/support/supportJourneys";
import { TRAINING_MODULES } from "@/training/trainingModules";
import "./training-hub-page.css";

function formatProjectOverviewRoute(projectId?: string | null): string {
  return projectId ? `/app/projects/${encodeURIComponent(projectId)}` : WM_ROUTES.projects;
}

function totalMinutesForModule(module: typeof TRAINING_MODULES[number]): number {
  return module.lessons.reduce((sum, lesson) => sum + lesson.minutes, 0);
}

function journeyIcon(journey: SupportJourney) {
  if (journey.category === "Learn") return GraduationCap;
  if (journey.category === "Recommend") return Compass;
  if (journey.category === "Review") return Route;
  if (journey.category === "Fix") return Wrench;
  return BookOpenText;
}

function JourneyCard(props: {
  active: boolean;
  journey: SupportJourney;
  onSelect: (id: string) => void;
}) {
  const Icon = journeyIcon(props.journey);

  return (
    <button
      type="button"
      className={`wm-training-hub__journey-card${props.active ? " is-active" : ""}`}
      onClick={() => props.onSelect(props.journey.id)}
    >
      <span className="wm-training-hub__journey-icon">
        <Icon size={18} strokeWidth={1.9} />
      </span>
      <span className="wm-training-hub__journey-copy">
        <small>{props.journey.category}</small>
        <strong>{props.journey.title}</strong>
        <span>{props.journey.summary}</span>
      </span>
    </button>
  );
}

function ModuleCard(props: {
  active: boolean;
  module: typeof TRAINING_MODULES[number];
  onSelect: (id: string) => void;
}) {
  const minutes = totalMinutesForModule(props.module);

  return (
    <button
      type="button"
      className={`wm-training-hub__module-card${props.active ? " is-active" : ""}`}
      onClick={() => props.onSelect(props.module.id)}
    >
      <div className="wm-training-hub__module-top">
        <div>
          <span className="wm-training-hub__module-meta">
            {props.module.track} | {props.module.level}
          </span>
          <strong>{props.module.title}</strong>
        </div>
        <span className="wm-training-hub__module-badge">{props.module.lessons.length} lessons</span>
      </div>

      <p>{props.module.description}</p>

      <div className="wm-training-hub__module-stats">
        <span>{minutes} min</span>
        <span>{props.module.lessons[0]?.title || "Lesson path ready"}</span>
      </div>
    </button>
  );
}

export default function TrainingHubPage() {
  const activeProject = React.useSyncExternalStore(subscribeProjects, getActiveProject, () => undefined);
  const recommendedJourney = React.useMemo(
    () => recommendSupportJourney(activeProject),
    [activeProject],
  );
  const [search, setSearch] = React.useState("");
  const deferredSearch = React.useDeferredValue(search);
  const [selectedJourneyId, setSelectedJourneyId] = React.useState(recommendedJourney.id);
  const [selectedModuleId, setSelectedModuleId] = React.useState(TRAINING_MODULES[0]?.id ?? "");

  React.useEffect(() => {
    setSelectedJourneyId(recommendedJourney.id);
  }, [activeProject?.id, recommendedJourney.id]);

  const selectedJourney = React.useMemo(
    () => SUPPORT_JOURNEYS.find((journey) => journey.id === selectedJourneyId) ?? recommendedJourney,
    [recommendedJourney, selectedJourneyId],
  );

  const modules = React.useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    return TRAINING_MODULES.filter((module) => {
      if (!selectedJourney.moduleTracks.includes(module.track)) return false;
      if (!query) return true;

      return (
        module.title.toLowerCase().includes(query) ||
        module.description.toLowerCase().includes(query) ||
        module.lessons.some((lesson) => (
          lesson.title.toLowerCase().includes(query) ||
          lesson.bullets.some((bullet) => bullet.toLowerCase().includes(query))
        ))
      );
    });
  }, [deferredSearch, selectedJourney]);

  React.useEffect(() => {
    if (!modules.length) return;
    if (modules.some((module) => module.id === selectedModuleId)) return;
    setSelectedModuleId(modules[0].id);
  }, [modules, selectedModuleId]);

  const selectedModule = modules.find((module) => module.id === selectedModuleId) ?? modules[0] ?? null;
  const totalMinutes = modules.reduce((sum, module) => sum + totalMinutesForModule(module), 0);
  const projectSummary = buildGuruProjectSummary(activeProject);
  const nextToolRoute = selectedJourney.id === "project-review"
    ? formatProjectOverviewRoute(activeProject?.id)
    : selectedJourney.nextTool.route;
  const guruQuestion = selectedModule
    ? `Teach me ${selectedModule.title} in a practical way and tie it back to ${selectedJourney.title.toLowerCase()}.`
    : selectedJourney.starterQuestion;

  return (
    <div className="wm-training-hub">
      <section className="wm-training-hub__hero">
        <div className="wm-training-hub__hero-copy">
          <div className="wm-training-hub__eyebrow">Training and Support</div>
          <h1>Get the right help without guessing which tool to open.</h1>
          <p>
            Start from the kind of help you need right now, then move into the matching lesson,
            Guru question, or Wingman workspace without losing context.
          </p>

          <div className="wm-training-hub__hero-actions">
            <Link to={buildGuruJourneyLink(selectedJourney, { question: guruQuestion })} className="wm-btn-primary">
              Ask Guru About This
              <ArrowRight size={16} />
            </Link>
            <Link to={nextToolRoute} className="wm-btn-secondary">
              {selectedJourney.nextTool.label}
            </Link>
          </div>
        </div>

        <div className="wm-training-hub__hero-metrics">
          <div className="wm-training-hub__metric">
            <span>Help paths</span>
            <strong>{SUPPORT_JOURNEYS.length}</strong>
          </div>
          <div className="wm-training-hub__metric">
            <span>Related modules</span>
            <strong>{modules.length}</strong>
          </div>
          <div className="wm-training-hub__metric">
            <span>Study time</span>
            <strong>{totalMinutes} min</strong>
          </div>
          <div className="wm-training-hub__metric">
            <span>Current project</span>
            <strong>{activeProject?.name || "Not attached"}</strong>
          </div>
        </div>
      </section>

      <section className="wm-training-hub__project-strip">
        <div className="wm-training-hub__project-copy">
          <div className="wm-training-hub__section-eyebrow">
            {activeProject ? "Current project help" : "No active project"}
          </div>
          <h2>
            {activeProject
              ? "The active project is available for review, fit checks, and next-step guidance."
              : "General AV learning and WyreStorm support still work even before a project exists."}
          </h2>
          <p>{projectSummary}</p>
        </div>

        <div className="wm-training-hub__project-actions">
          <Link
            to={buildGuruJourneyLink(
              SUPPORT_JOURNEYS.find((journey) => journey.id === "project-review") ?? selectedJourney,
            )}
            className="wm-btn-primary"
          >
            Review Current Project
          </Link>
          <Link to={formatProjectOverviewRoute(activeProject?.id)} className="wm-btn-secondary">
            Open Project Overview
          </Link>
        </div>
      </section>

      <div className="wm-training-hub__layout">
        <aside className="wm-training-hub__sidebar">
          <section className="wm-training-hub__panel">
            <div className="wm-training-hub__section-head">
              <div>
                <div className="wm-training-hub__section-eyebrow">Step 1</div>
                <h2>Choose the help path</h2>
                <p>Pick the clearest reason you are here, and let the page narrow everything else around it.</p>
              </div>
            </div>

            <div className="wm-training-hub__journey-list">
              {SUPPORT_JOURNEYS.map((journey) => (
                <JourneyCard
                  key={journey.id}
                  active={journey.id === selectedJourney.id}
                  journey={journey}
                  onSelect={setSelectedJourneyId}
                />
              ))}
            </div>
          </section>
        </aside>

        <main className="wm-training-hub__main">
          <section className="wm-training-hub__panel wm-training-hub__panel--feature">
            <div className="wm-training-hub__feature-top">
              <div>
                <div className="wm-training-hub__section-eyebrow">Selected path</div>
                <h2>{selectedJourney.title}</h2>
                <p>{selectedJourney.detail}</p>
              </div>

              <div className="wm-training-hub__chip-row">
                {selectedJourney.bestFor.map((item) => (
                  <span key={`${selectedJourney.id}-${item}`} className="wm-training-hub__chip wm-training-hub__chip--accent">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="wm-training-hub__next-step">
              <MessageSquareText size={16} />
              <span>{selectedJourney.starterQuestion}</span>
            </div>
          </section>

          <section className="wm-training-hub__panel">
            <div className="wm-training-hub__section-head">
              <div>
                <div className="wm-training-hub__section-eyebrow">Step 2</div>
                <h2>Choose the learning module</h2>
                <p>The modules below are narrowed to the current help path so the starting point feels obvious.</p>
              </div>
            </div>

            <label className="wm-training-hub__search">
              <BookOpenText size={16} />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Refine by topic, lesson, or phrase"
              />
            </label>

            {modules.length > 0 ? (
              <div className="wm-training-hub__module-grid">
                {modules.map((module) => (
                  <ModuleCard
                    key={module.id}
                    active={module.id === selectedModule?.id}
                    module={module}
                    onSelect={setSelectedModuleId}
                  />
                ))}
              </div>
            ) : (
              <div className="wm-training-hub__empty">
                <h3>No modules matched that search</h3>
                <p>Clear the search or switch help path to bring relevant lessons back into view.</p>
              </div>
            )}
          </section>

          <section className="wm-training-hub__panel">
            <div className="wm-training-hub__section-head">
              <div>
                <div className="wm-training-hub__section-eyebrow">Step 3</div>
                <h2>Turn it into action</h2>
                <p>Use Guru for the question, then move straight into the matching Wingman tool while the context is fresh.</p>
              </div>
            </div>

            <div className="wm-training-hub__action-grid">
              <Link to={buildGuruJourneyLink(selectedJourney, { question: guruQuestion })} className="wm-training-hub__action-card">
                <strong>Ask Guru</strong>
                <span>{guruQuestion}</span>
                <small>Best for a practical answer right now.</small>
              </Link>

              <Link to={nextToolRoute} className="wm-training-hub__action-card">
                <strong>{selectedJourney.nextTool.label}</strong>
                <span>Use the matching workspace once the direction feels clear.</span>
                <small>Keep the next move obvious.</small>
              </Link>

              <Link to={WM_ROUTES.catalog} className="wm-training-hub__action-card">
                <strong>Open product guidance</strong>
                <span>Shortlist WyreStorm products from room type and application intent.</span>
                <small>Best when the conversation turns into product fit.</small>
              </Link>
            </div>
          </section>
        </main>

        <aside className="wm-training-hub__detail-rail">
          <section className="wm-training-hub__panel wm-training-hub__detail-panel">
            <div className="wm-training-hub__section-head">
              <div>
                <div className="wm-training-hub__section-eyebrow">Selected module</div>
                <h2>{selectedModule?.title || "Choose a module"}</h2>
                <p>{selectedModule?.description || "Pick a module to see the lesson plan and best next question."}</p>
              </div>
            </div>

            {selectedModule ? (
              <>
                <div className="wm-training-hub__detail-meta">
                  <span>{selectedModule.track}</span>
                  <span>{selectedModule.level}</span>
                  <span>{selectedModule.lessons.length} lessons</span>
                  <span>{totalMinutesForModule(selectedModule)} min</span>
                </div>

                <div className="wm-training-hub__lesson-list">
                  {selectedModule.lessons.map((lesson) => (
                    <article key={lesson.id} className="wm-training-hub__lesson-card">
                      <span className="wm-training-hub__lesson-time">{lesson.minutes} min</span>
                      <h3>{lesson.title}</h3>
                      <ul>
                        {lesson.bullets.map((bullet) => (
                          <li key={`${lesson.id}-${bullet}`}>{bullet}</li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>

                <div className="wm-training-hub__detail-actions">
                  <Link
                    to={buildGuruJourneyLink(selectedJourney, {
                      question: `Teach me ${selectedModule.title} in a practical way and help me apply it.`,
                    })}
                    className="wm-btn-primary"
                  >
                    Ask Guru About This Module
                  </Link>
                  <Link to={nextToolRoute} className="wm-btn-secondary">
                    {selectedJourney.nextTool.label}
                  </Link>
                </div>
              </>
            ) : (
              <div className="wm-training-hub__empty">
                <h3>No module selected</h3>
                <p>Pick a learning module from the middle column to open its lesson plan here.</p>
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
