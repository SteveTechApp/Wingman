Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Set-Location C:\Users\steve\wingman
$root = (Get-Location).Path

function Save-Utf8NoBom {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Content
  )
  $fullPath = Join-Path $root $Path
  $dir = Split-Path $fullPath -Parent
  if ($dir -and -not (Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }
  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($fullPath, $Content, $utf8)
}

@'
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
'@ | Set-Content .\src\features\ai\guru\GuruToolHostPage.tsx -Encoding UTF8

@'
.guru-page-shell {
  display: grid;
  gap: 16px;
  min-height: 100%;
  padding: 18px;
  background:
    radial-gradient(circle at top, rgba(37, 99, 235, 0.12), transparent 24%),
    linear-gradient(180deg, #020617, #030b1b);
}

.guru-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(320px, 0.7fr);
  gap: 14px;
  align-items: stretch;
}

.guru-hero__copy,
.guru-hero__status {
  border-radius: 20px;
  border: 1px solid rgba(96, 165, 250, 0.16);
  background:
    radial-gradient(circle at top right, rgba(59, 130, 246, 0.14), transparent 28%),
    linear-gradient(180deg, rgba(15, 23, 42, 0.94), rgba(2, 6, 23, 0.94));
  box-shadow:
    0 22px 50px rgba(2, 6, 23, 0.38),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.guru-hero__copy {
  padding: 18px 20px;
}

.guru-hero__eyebrow {
  color: #93c5fd;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.guru-hero__title {
  margin: 10px 0 0;
  color: #f8fafc;
  font-size: clamp(1.5rem, 2vw, 2.2rem);
  line-height: 1.02;
  font-weight: 700;
  letter-spacing: -0.04em;
}

.guru-hero__subtitle {
  margin: 12px 0 0;
  max-width: 68ch;
  color: rgba(191, 219, 254, 0.82);
  font-size: 0.92rem;
  line-height: 1.55;
}

.guru-hero__status {
  padding: 14px;
  display: grid;
  gap: 12px;
}

.guru-status-card {
  padding: 14px;
  border-radius: 16px;
  border: 1px solid rgba(96, 165, 250, 0.16);
  background: linear-gradient(180deg, rgba(9, 15, 30, 0.72), rgba(2, 6, 23, 0.64));
}

.guru-status-card__label {
  color: #93c5fd;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.guru-status-card__value {
  margin-top: 8px;
  color: #f8fafc;
  font-size: 1rem;
  font-weight: 650;
  line-height: 1.3;
}

.guru-status-card__value--small {
  font-size: 0.86rem;
  font-weight: 500;
  color: rgba(226, 232, 240, 0.92);
}

.guru-workspace {
  display: grid;
  grid-template-columns: minmax(380px, 0.92fr) minmax(460px, 1.08fr);
  gap: 16px;
  align-items: start;
}

.guru-panel {
  min-height: 720px;
  border-radius: 22px;
  border: 1px solid rgba(96, 165, 250, 0.16);
  background:
    radial-gradient(circle at top, rgba(30, 64, 175, 0.12), transparent 26%),
    linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(2, 6, 23, 0.96));
  box-shadow:
    0 24px 58px rgba(2, 6, 23, 0.44),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
  overflow: hidden;
}

.guru-panel--question {
  position: sticky;
  top: 88px;
}

.guru-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px;
  border-bottom: 1px solid rgba(51, 65, 85, 0.42);
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.82), rgba(2, 6, 23, 0.82));
}

.guru-panel__eyebrow {
  color: #93c5fd;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.guru-panel__title {
  margin: 6px 0 0;
  color: #f8fafc;
  font-size: 1.02rem;
  line-height: 1.08;
  font-weight: 650;
  letter-spacing: -0.02em;
}

.guru-panel__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 58px;
  height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.16);
  color: #dbeafe;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.guru-panel__badge--answer {
  background: rgba(99, 102, 241, 0.18);
}

.guru-topic-row,
.guru-question-card,
.guru-prompt-block,
.guru-answer-stage {
  padding-inline: 18px;
}

.guru-topic-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 16px;
}

.guru-topic-chip {
  min-height: 36px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid rgba(71, 85, 105, 0.85);
  background: rgba(15, 23, 42, 0.86);
  color: #cbd5e1;
  font-size: 0.82rem;
  font-weight: 620;
}

.guru-topic-chip--active {
  border-color: rgba(129, 140, 248, 0.38);
  background: linear-gradient(180deg, rgba(99, 102, 241, 0.32), rgba(49, 46, 129, 0.24));
  color: #f8fafc;
  box-shadow: 0 10px 24px rgba(79, 70, 229, 0.16);
}

.guru-question-card {
  display: grid;
  gap: 10px;
  padding-top: 16px;
}

.guru-label {
  color: #bfdbfe;
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.guru-textarea {
  width: 100%;
  min-height: 260px;
  padding: 16px;
  resize: vertical;
  border-radius: 18px;
  border: 1px solid rgba(96, 165, 250, 0.22);
  background:
    linear-gradient(180deg, rgba(2, 6, 23, 0.98), rgba(9, 14, 28, 0.95));
  color: #f8fafc;
  font-size: 1rem;
  line-height: 1.52;
  box-shadow:
    inset 0 0 0 1px rgba(37, 99, 235, 0.05),
    0 16px 36px rgba(2, 6, 23, 0.3);
}

.guru-textarea:focus {
  outline: none;
  border-color: rgba(129, 140, 248, 0.44);
  box-shadow:
    0 0 0 4px rgba(99, 102, 241, 0.12),
    0 18px 42px rgba(2, 6, 23, 0.34);
}

.guru-inline-guidance {
  color: rgba(191, 219, 254, 0.8);
  font-size: 0.82rem;
  line-height: 1.45;
}

.guru-action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.guru-button {
  min-height: 40px;
  padding: 0 14px;
  border-radius: 12px;
  border: 1px solid rgba(71, 85, 105, 0.78);
  background: rgba(15, 23, 42, 0.88);
  color: #e2e8f0;
  font-size: 0.82rem;
  font-weight: 650;
}

.guru-button--primary {
  border-color: rgba(129, 140, 248, 0.34);
  background: linear-gradient(180deg, rgba(99, 102, 241, 0.94), rgba(79, 70, 229, 0.94));
  color: white;
  box-shadow: 0 14px 28px rgba(79, 70, 229, 0.24);
}

.guru-prompt-block {
  display: grid;
  gap: 10px;
  padding-top: 16px;
  padding-bottom: 18px;
}

.guru-prompt-list {
  display: grid;
  gap: 8px;
}

.guru-prompt-chip {
  min-height: 42px;
  padding: 0 14px;
  text-align: left;
  border-radius: 14px;
  border: 1px solid rgba(51, 65, 85, 0.82);
  background:
    linear-gradient(180deg, rgba(15, 23, 42, 0.78), rgba(2, 6, 23, 0.82));
  color: #dbeafe;
  font-size: 0.84rem;
  font-weight: 560;
}

.guru-answer-stage {
  display: grid;
  gap: 14px;
  padding-top: 16px;
  padding-bottom: 18px;
}

.guru-answer-card,
.guru-next-step-card {
  border-radius: 18px;
  border: 1px solid rgba(96, 165, 250, 0.16);
  background:
    radial-gradient(circle at top right, rgba(99, 102, 241, 0.1), transparent 24%),
    linear-gradient(180deg, rgba(9, 15, 30, 0.86), rgba(2, 6, 23, 0.88));
  box-shadow:
    0 16px 36px rgba(2, 6, 23, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.03);
}

.guru-answer-card {
  min-height: 430px;
  padding: 18px;
  display: grid;
  gap: 12px;
  align-content: start;
}

.guru-answer-card__topline {
  color: #93c5fd;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.guru-answer-card__question {
  color: #f8fafc;
  font-size: 1.04rem;
  line-height: 1.35;
  font-weight: 650;
  letter-spacing: -0.02em;
}

.guru-answer-card__body {
  color: rgba(226, 232, 240, 0.96);
  font-size: 0.94rem;
  line-height: 1.7;
}

.guru-next-step-card {
  padding: 16px 18px;
}

.guru-next-step-card__title {
  color: #f8fafc;
  font-size: 0.84rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.guru-next-step-card__list {
  margin: 10px 0 0;
  padding-left: 18px;
  color: rgba(191, 219, 254, 0.86);
  font-size: 0.84rem;
  line-height: 1.6;
}

@media (max-width: 1180px) {
  .guru-hero,
  .guru-workspace {
    grid-template-columns: 1fr;
  }

  .guru-panel--question {
    position: static;
  }

  .guru-panel {
    min-height: auto;
  }

  .guru-answer-card {
    min-height: 280px;
  }
}
'@ | Set-Content .\src\features\ai\guru\guru-tool-host.css -Encoding UTF8

npm run repo:health