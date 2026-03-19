import * as React from "react";
import { Link } from "react-router-dom";

import { WM_ROUTES } from "@/core/wingman/routeMap";

import "./avNavigator.css";

type NavigatorTrackId = "interest" | "research" | "feedback";

type NavigatorQuestion = {
  id: string;
  prompt: string;
  helper: string;
  type: "single" | "multi" | "text";
  options?: string[];
  placeholder?: string;
};

type NavigatorTrack = {
  id: NavigatorTrackId;
  title: string;
  subtitle: string;
  summary: string;
  accentRgb: string;
  questions: NavigatorQuestion[];
};

const TRACKS: NavigatorTrack[] = [
  {
    id: "interest",
    title: "Find likely interest",
    subtitle: "Use plain English to work out what kind of product conversation this really is.",
    summary: "Best when the customer is still exploring and you need a simple direction without product jargon.",
    accentRgb: "56,189,248",
    questions: [
      {
        id: "space",
        prompt: "Where is this likely to be used?",
        helper: "Keep it simple and pick the setting that feels closest.",
        type: "single",
        options: ["Meeting room", "Classroom", "Reception or open area", "Control space", "Mixed spaces"],
      },
      {
        id: "need",
        prompt: "What sounds most important to them right now?",
        helper: "Choose the things they care about most, not the technical fix.",
        type: "multi",
        options: [
          "Plug a laptop in quickly",
          "Share to one screen",
          "Share to many screens",
          "Bring cameras and mics into calls",
          "Keep cabling simple",
          "Control the room more easily",
        ],
      },
      {
        id: "network",
        prompt: "How comfortable are they with using the building network for AV?",
        helper: "This helps separate simple point-to-point needs from scalable networked systems.",
        type: "single",
        options: ["Very comfortable", "Maybe, if it is easy", "Prefer to avoid that", "Not sure yet"],
      },
      {
        id: "brand",
        prompt: "Are they already talking about another brand or an existing system?",
        helper: "If yes, capture the name in the notes after this.",
        type: "single",
        options: ["Yes", "No", "Not sure"],
      },
      {
        id: "notes",
        prompt: "What phrase or pain point keeps coming up?",
        helper: "Examples: 'We just want it to work', 'Too many cables', 'Hybrid meetings are awkward'.",
        type: "text",
        placeholder: "Write the customer language here...",
      },
    ],
  },
  {
    id: "research",
    title: "Research an account",
    subtitle: "Gather competitor footprint, buying signals, and useful field context before a deeper sales conversation.",
    summary: "Best when you want a lightweight account brief without dropping into a full discovery workflow.",
    accentRgb: "74,222,128",
    questions: [
      {
        id: "customer",
        prompt: "Who are we researching?",
        helper: "Account, site, or vertical is enough to start.",
        type: "text",
        placeholder: "Customer, site, or market sector...",
      },
      {
        id: "installed",
        prompt: "What do they seem to be using today?",
        helper: "Think in plain terms first, like 'meeting room bars', 'matrix systems', or competitor names'.",
        type: "text",
        placeholder: "Current setup or brands in use...",
      },
      {
        id: "pressure",
        prompt: "Why might they change anything?",
        helper: "Look for refresh cycles, service pain, expansion, standardisation, or user complaints.",
        type: "multi",
        options: ["Refresh due", "User complaints", "Site expansion", "Need simpler support", "Need better meeting experience", "Just benchmarking"],
      },
      {
        id: "brands",
        prompt: "Which competitor names have come up?",
        helper: "Pick one or more if they are already known.",
        type: "multi",
        options: ["Barco", "Crestron", "Extron", "Kramer", "Atlona", "Lightware"],
      },
      {
        id: "notes",
        prompt: "Any extra market notes or field feedback?",
        helper: "Capture anything the sales team should remember before the next call.",
        type: "text",
        placeholder: "Commercial notes, sentiment, rollout patterns, buying behaviour...",
      },
    ],
  },
  {
    id: "feedback",
    title: "Capture sales feedback",
    subtitle: "Turn scattered customer comments into a cleaner summary of what matters, what hurts, and where to go next.",
    summary: "Best after a customer call when the main goal is to organise feedback and identify the next useful tool.",
    accentRgb: "251,191,36",
    questions: [
      {
        id: "stage",
        prompt: "How far along is the customer?",
        helper: "Use the rough stage that best matches the conversation.",
        type: "single",
        options: ["Just exploring", "Comparing options", "Shortlisting now", "Trying to fix a live issue"],
      },
      {
        id: "likes",
        prompt: "What did they respond well to?",
        helper: "Write down what got positive energy in the conversation.",
        type: "text",
        placeholder: "What landed well...",
      },
      {
        id: "blocks",
        prompt: "What seems to be blocking momentum?",
        helper: "Pick the main blockers, even if you are not fully certain yet.",
        type: "multi",
        options: ["Budget pressure", "Too much complexity", "Support concerns", "Brand loyalty elsewhere", "Unclear need", "Technical confidence gap"],
      },
      {
        id: "focus",
        prompt: "What do they really want to feel better about?",
        helper: "This is about reassurance as much as product direction.",
        type: "multi",
        options: ["Ease of use", "Meeting quality", "Coverage across many rooms", "Cabling distance", "Better control", "Confidence in the vendor"],
      },
      {
        id: "notes",
        prompt: "Anything the next salesperson should know before they speak to this customer?",
        helper: "Capture tone, urgency, internal politics, and language to mirror back.",
        type: "text",
        placeholder: "Next-call coaching notes...",
      },
    ],
  },
];

const TOOL_LABELS: Record<string, string> = {
  [WM_ROUTES.catalogue]: "Open product catalog",
  [WM_ROUTES.competitorCompare]: "Open competitor compare",
  [WM_ROUTES.discovery]: "Open guided project",
  [WM_ROUTES.guru]: "Open Guru",
};

function normaliseText(value: string) {
  return value.toLowerCase().trim();
}

function arrayValue(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) return value;
  return typeof value === "string" && value ? [value] : [];
}

function textValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value.join(", ");
  return value ?? "";
}

function toggleMultiValue(current: string | string[] | undefined, next: string): string[] {
  const values = arrayValue(current);
  return values.includes(next) ? values.filter((item) => item !== next) : [...values, next];
}

function firstUnansweredIndex(track: NavigatorTrack, answers: Record<string, string | string[]>) {
  return track.questions.findIndex((question) => {
    const value = answers[question.id];
    return question.type === "multi" ? arrayValue(value).length === 0 : !textValue(value).trim();
  });
}

function buildInterestSummary(answers: Record<string, string | string[]>) {
  const needs = arrayValue(answers.need);
  const network = textValue(answers.network);
  const notes = normaliseText(textValue(answers.notes));
  const signals = new Set<string>();
  const prompts: string[] = [];
  const routes = new Set<string>([WM_ROUTES.catalogue]);

  if (needs.includes("Plug a laptop in quickly") || needs.includes("Bring cameras and mics into calls")) {
    signals.add("Meeting room collaboration");
    signals.add("Presentation and UC");
    prompts.push("Would it help if people could walk in, plug in once, and start sharing straight away?");
  }

  if (needs.includes("Bring cameras and mics into calls")) {
    signals.add("Cameras and room USB");
    prompts.push("Do they care more about a better in-room meeting experience or just adding a camera to what they already have?");
  }

  if (needs.includes("Share to many screens")) {
    if (network === "Very comfortable" || network === "Maybe, if it is easy") {
      signals.add("Scalable signal distribution");
      signals.add("Network-based AV");
    } else {
      signals.add("Matrix or point-to-point distribution");
    }
    prompts.push("Is this about one room with several displays, or many spaces that need the same system approach?");
  }

  if (needs.includes("Keep cabling simple")) {
    signals.add("Longer reach with simpler cabling");
    prompts.push("Is the main pain point distance, cable clutter, or getting signals from one side of the room to the other?");
  }

  if (needs.includes("Control the room more easily")) {
    signals.add("Simple room control");
    prompts.push("Do they want fewer remotes and a simpler way to start the room each day?");
  }

  if (textValue(answers.brand) === "Yes") {
    routes.add(WM_ROUTES.competitorCompare);
  }

  if (notes.includes("hybrid") || notes.includes("meeting")) {
    signals.add("Hybrid meeting improvement");
  }

  routes.add(WM_ROUTES.discovery);

  return {
    title: "Likely conversation direction",
    summary:
      signals.size > 0
        ? "This sounds like a customer exploring a practical outcome rather than asking for a named product."
        : "There is enough here to start a plain-English discovery before moving into specific products.",
    signals: Array.from(signals.size > 0 ? signals : new Set(["Early-stage product interest"])),
    prompts: prompts.slice(0, 3),
    routes: Array.from(routes),
  };
}

function buildResearchSummary(answers: Record<string, string | string[]>) {
  const routes = new Set<string>([WM_ROUTES.competitorCompare, WM_ROUTES.catalogue]);
  const brands = arrayValue(answers.brands);
  const pressure = arrayValue(answers.pressure);
  const signals = new Set<string>();

  if (brands.length > 0) {
    signals.add(`Competitors already in frame: ${brands.join(", ")}`);
  }

  if (pressure.includes("Need better meeting experience")) {
    signals.add("Customer may be open to collaboration refresh");
  }

  if (pressure.includes("Need simpler support")) {
    signals.add("Support and standardisation story may matter");
  }

  if (pressure.includes("Just benchmarking")) {
    routes.add(WM_ROUTES.guru);
  }

  return {
    title: "Account research snapshot",
    summary: "This gives the sales team a quick brief before deeper product mapping or competitor positioning.",
    signals: Array.from(signals.size > 0 ? signals : new Set(["Capture current estate and competitor footprint"])),
    prompts: [
      "What is the customer standardising on today, if anything?",
      "Which brand seems hardest for them to move away from?",
      "Where is the opportunity: refresh, expansion, or dissatisfaction?",
    ],
    routes: Array.from(routes),
  };
}

function buildFeedbackSummary(answers: Record<string, string | string[]>) {
  const blocks = arrayValue(answers.blocks);
  const focus = arrayValue(answers.focus);
  const routes = new Set<string>([WM_ROUTES.guru, WM_ROUTES.discovery]);
  const signals = new Set<string>();

  if (blocks.includes("Brand loyalty elsewhere")) {
    routes.add(WM_ROUTES.competitorCompare);
    signals.add("Competitive objection handling likely needed");
  }

  if (blocks.includes("Technical confidence gap")) {
    signals.add("Keep future conversations plain-English and reassurance-led");
  }

  if (focus.includes("Ease of use")) {
    signals.add("Lead with simplicity and day-one usability");
  }

  if (focus.includes("Coverage across many rooms")) {
    signals.add("Talk about repeatability and rollout consistency");
  }

  return {
    title: "Sales feedback readout",
    summary: "This translates the call into a cleaner next-step brief for the wider team.",
    signals: Array.from(signals.size > 0 ? signals : new Set(["Organise feedback into a practical next step"])),
    prompts: [
      "What one concern should we clear up first next time?",
      "What language did the customer use that we should mirror back?",
      "Do we need education, positioning, or a tighter shortlist next?",
    ],
    routes: Array.from(routes),
  };
}

function buildNavigatorSummary(track: NavigatorTrack, answers: Record<string, string | string[]>) {
  if (track.id === "research") return buildResearchSummary(answers);
  if (track.id === "feedback") return buildFeedbackSummary(answers);
  return buildInterestSummary(answers);
}

export default function AvNavigatorPage() {
  const [trackId, setTrackId] = React.useState<NavigatorTrackId>("interest");
  const [answersByTrack, setAnswersByTrack] = React.useState<Record<NavigatorTrackId, Record<string, string | string[]>>>({
    interest: {},
    research: {},
    feedback: {},
  });

  const activeTrack = React.useMemo(
    () => TRACKS.find((track) => track.id === trackId) ?? TRACKS[0],
    [trackId]
  );
  const answers = answersByTrack[trackId];
  const firstPending = firstUnansweredIndex(activeTrack, answers);
  const progressCount =
    firstPending === -1 ? activeTrack.questions.length : firstPending;
  const summary = React.useMemo(
    () => buildNavigatorSummary(activeTrack, answers),
    [activeTrack, answers]
  );

  function setAnswer(questionId: string, value: string | string[]) {
    setAnswersByTrack((previous) => ({
      ...previous,
      [trackId]: {
        ...previous[trackId],
        [questionId]: value,
      },
    }));
  }

  function resetTrack() {
    setAnswersByTrack((previous) => ({
      ...previous,
      [trackId]: {},
    }));
  }

  return (
    <div className="wm-page wm-navx">
      <section className="wm-hero wm-navx__hero">
        <div className="wm-navx__hero-copy">
          <p className="wm-navx__eyebrow">AV Navigator</p>
          <h1 className="wm-navx__title">A simpler starting point for newer AV sales conversations.</h1>
          <p className="wm-navx__subtitle">
            Quick-fire prompts, plain English phrasing, and a clear next move when the customer does not yet know the product language.
          </p>
        </div>
        <div className="wm-navx__hero-panel wm-work-card">
          <div className="wm-navx__hero-stat">{progressCount}/{activeTrack.questions.length}</div>
          <div className="wm-navx__hero-label">Questions answered in this track</div>
          <button type="button" className="wm-cat2__btn wm-cat2__btn--ghost" onClick={resetTrack}>
            Reset this track
          </button>
        </div>
      </section>

      <section className="wm-section wm-section--tone-cyan">
        <div className="wm-navx__layout">
          <aside className="wm-work-card wm-navx__tracks">
            <div className="wm-navx__section-label">Choose a helper mode</div>
            <div className="wm-navx__track-list">
              {TRACKS.map((track) => {
                const answered = Object.keys(answersByTrack[track.id]).length;
                return (
                  <button
                    key={track.id}
                    type="button"
                    className={track.id === trackId ? "wm-navx__track is-active" : "wm-navx__track"}
                    style={{ "--wm-navx-accent-rgb": track.accentRgb } as React.CSSProperties}
                    onClick={() => setTrackId(track.id)}
                  >
                    <span className="wm-navx__track-title">{track.title}</span>
                    <span className="wm-navx__track-subtitle">{track.subtitle}</span>
                    <span className="wm-navx__track-meta">{answered}/{track.questions.length} answered</span>
                  </button>
                );
              })}
            </div>
          </aside>

          <main className="wm-navx__main">
            <section className="wm-work-card wm-navx__intro">
              <div>
                <p className="wm-navx__section-label">Current flow</p>
                <h2>{activeTrack.title}</h2>
                <p>{activeTrack.summary}</p>
              </div>
            </section>

            <section className="wm-navx__question-stack">
              {activeTrack.questions.map((question, index) => {
                const value = answers[question.id];
                const isAnswered = question.type === "multi" ? arrayValue(value).length > 0 : Boolean(textValue(value).trim());
                const isCurrent = firstPending === -1 ? index === activeTrack.questions.length - 1 : index === firstPending;
                const isVisible = isAnswered || isCurrent || index === 0;

                if (!isVisible) {
                  return null;
                }

                return (
                  <section
                    key={question.id}
                    className={isCurrent ? "wm-work-card wm-navx__question is-current" : "wm-work-card wm-navx__question"}
                  >
                    <div className="wm-navx__question-head">
                      <span className="wm-navx__question-index">Q{index + 1}</span>
                      {isAnswered ? <span className="wm-navx__question-status">Captured</span> : null}
                    </div>
                    <h3>{question.prompt}</h3>
                    <p>{question.helper}</p>

                    {question.type === "single" ? (
                      <div className="wm-navx__option-grid">
                        {question.options?.map((option) => (
                          <button
                            key={option}
                            type="button"
                            className={textValue(value) === option ? "wm-navx__option is-active" : "wm-navx__option"}
                            onClick={() => setAnswer(question.id, option)}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    ) : null}

                    {question.type === "multi" ? (
                      <div className="wm-navx__option-grid">
                        {question.options?.map((option) => {
                          const selected = arrayValue(value).includes(option);
                          return (
                            <button
                              key={option}
                              type="button"
                              className={selected ? "wm-navx__option is-active" : "wm-navx__option"}
                              onClick={() => setAnswer(question.id, toggleMultiValue(value, option))}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}

                    {question.type === "text" ? (
                      <textarea
                        className="wm-navx__textarea"
                        value={textValue(value)}
                        placeholder={question.placeholder}
                        onChange={(event) => setAnswer(question.id, event.target.value)}
                      />
                    ) : null}
                  </section>
                );
              })}
            </section>
          </main>

          <aside className="wm-navx__aside">
            <section className="wm-work-card wm-navx__summary">
              <p className="wm-navx__section-label">Navigator readout</p>
              <h2>{summary.title}</h2>
              <p>{summary.summary}</p>

              <div className="wm-navx__chip-list">
                {summary.signals.map((signal) => (
                  <span key={signal} className="wm-navx__chip">
                    {signal}
                  </span>
                ))}
              </div>
            </section>

            <section className="wm-work-card wm-navx__summary">
              <p className="wm-navx__section-label">Plain-English follow-ups</p>
              <div className="wm-navx__prompt-list">
                {summary.prompts.map((prompt) => (
                  <div key={prompt} className="wm-navx__prompt">
                    {prompt}
                  </div>
                ))}
              </div>
            </section>

            <section className="wm-work-card wm-navx__summary">
              <p className="wm-navx__section-label">Useful next tool</p>
              <div className="wm-navx__link-list">
                {summary.routes.map((route) => (
                  <Link key={route} to={route} className="wm-navx__link">
                    {TOOL_LABELS[route] ?? "Open tool"}
                  </Link>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </section>
    </div>
  );
}
