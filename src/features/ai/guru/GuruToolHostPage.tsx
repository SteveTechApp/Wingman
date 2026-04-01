import { useMemo, useState } from "react";
import "./guru-tool-host.css";

const TOPICS = [
  "General AV advice",
  "WyreStorm guidance",
  "Design support",
  "Troubleshooting",
  "Training",
];

const PROMPTS = [
  "Which WyreStorm family best suits a small meeting room?",
  "When should I recommend Apollo instead of HDBaseT?",
  "How do I choose between matrix switching and AV over IP?",
  "What discovery answers matter most before product selection?",
];

export default function GuruToolHostPage() {
  const [topic, setTopic] = useState("WyreStorm guidance");
  const [question, setQuestion] = useState(
    "Which presentation switchers support AirPlay, and what should I confirm before recommending one?"
  );
  const [lastAsked, setLastAsked] = useState(
    "Which presentation switchers support AirPlay, and what should I confirm before recommending one?"
  );

  const answer = useMemo(() => {
    const q = lastAsked.trim().toLowerCase();

    if (!q) {
      return "Your answer will appear here once a question has been asked.";
    }

    if (q.includes("airplay")) {
      return "Start by confirming whether the requirement is native wireless presentation, simple HDMI/USB-C switching, or a broader room presentation workflow. For Wingman, surface the user outcome first, then confirm source count, display count, USB host/device needs, control expectations, and whether the client wants a guided presentation experience rather than basic switching.";
    }

    if (q.includes("apollo")) {
      return "Use Apollo when the room needs a more complete collaboration workflow around switching, USB, host management, and room presentation behaviour. Stay with simpler HDBaseT or switching paths when the requirement is straightforward transport and the client does not need the added workflow layer.";
    }

    if (q.includes("matrix") || q.includes("av over ip")) {
      return "Use matrix switching when the system is more fixed, with known source-to-display relationships and limited scale. Move to AV over IP when scalability, flexible routing, video wall behaviour, distributed endpoints, or future expansion are part of the brief.";
    }

    return "Start with outcome first: room type, source count, display count, transport distance, USB, audio breakout, control, switching behaviour, and future expansion. Then match the project to the most suitable WyreStorm family and explain why it fits.";
  }, [lastAsked]);

  const summary = useMemo(() => {
    if (topic === "Design support") return "Focus on architecture, signal paths, and room behaviour.";
    if (topic === "Troubleshooting") return "Focus on likely failure points, validation, and corrective actions.";
    if (topic === "Training") return "Focus on explanation quality and sales confidence.";
    if (topic === "General AV advice") return "Focus on concepts, terminology, and workflow guidance.";
    return "Focus on WyreStorm positioning, fit, and product family selection.";
  }, [topic]);

  return (
    <div className="guru-page-shell">
      <section className="guru-hero">
        <div className="guru-hero__copy">
          <div className="guru-hero__eyebrow">Guru Assistant</div>
          <h1 className="guru-hero__title">Question in view. Answer in view. No clutter.</h1>
          <p className="guru-hero__subtitle">
            Keep the user input visible on the left and the answer visible on the right so changes can be reviewed immediately.
          </p>
        </div>

        <div className="guru-hero__status">
          <div className="guru-status-card">
            <div className="guru-status-card__label">Current mode</div>
            <div className="guru-status-card__value">{topic}</div>
          </div>
          <div className="guru-status-card">
            <div className="guru-status-card__label">Focus</div>
            <div className="guru-status-card__value guru-status-card__value--small">{summary}</div>
          </div>
        </div>
      </section>

      <section className="guru-workspace">
        <div className="guru-panel guru-panel--question">
          <div className="guru-panel__header">
            <div>
              <div className="guru-panel__eyebrow">Question</div>
              <h2 className="guru-panel__title">What does the user need?</h2>
            </div>
            <div className="guru-panel__badge">Input</div>
          </div>

          <div className="guru-topic-row">
            {TOPICS.map((item) => (
              <button
                key={item}
                type="button"
                className={`guru-topic-chip ${item === topic ? "guru-topic-chip--active" : ""}`}
                onClick={() => setTopic(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="guru-question-card">
            <label className="guru-label" htmlFor="guru-question">
              Main question
            </label>

            <textarea
              id="guru-question"
              className="guru-textarea"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Describe room type, sources, displays, distance, USB, audio, control, and the user outcome."
            />

            <div className="guru-inline-guidance">
              Keep the brief practical. Only add context that changes the recommendation.
            </div>

            <div className="guru-action-row">
              <button
                type="button"
                className="guru-button guru-button--primary"
                onClick={() => setLastAsked(question)}
              >
                Ask Guru
              </button>

              <button
                type="button"
                className="guru-button"
                onClick={() => setQuestion("")}
              >
                Clear
              </button>
            </div>
          </div>

          <div className="guru-prompt-block">
            <div className="guru-label">Starter prompts</div>
            <div className="guru-prompt-list">
              {PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="guru-prompt-chip"
                  onClick={() => {
                    setQuestion(prompt);
                    setLastAsked(prompt);
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="guru-panel guru-panel--answer">
          <div className="guru-panel__header">
            <div>
              <div className="guru-panel__eyebrow">Answer</div>
              <h2 className="guru-panel__title">Recommendation and reasoning</h2>
            </div>
            <div className="guru-panel__badge guru-panel__badge--answer">Output</div>
          </div>

          <div className="guru-answer-stage">
            <div className="guru-answer-card">
              <div className="guru-answer-card__topline">{topic}</div>
              <div className="guru-answer-card__question">{lastAsked}</div>
              <div className="guru-answer-card__body">{answer}</div>
            </div>

            <div className="guru-next-step-card">
              <div className="guru-next-step-card__title">Next step</div>
              <ul className="guru-next-step-card__list">
                <li>Confirm the user outcome before selecting a family.</li>
                <li>Keep inputs visible while reviewing the answer.</li>
                <li>Reduce scrolling and show only decision-critical information.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
