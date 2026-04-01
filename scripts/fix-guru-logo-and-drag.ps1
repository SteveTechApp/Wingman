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
import { useMemo, useRef, useState } from "react";
import "./guru-tool-host.css";

const topicChips = [
  "General AV advice",
  "WyreStorm guidance",
  "Design support",
  "Troubleshooting",
  "Training and explainers",
];

const starterPrompts = [
  "Which WyreStorm family best suits a small meeting room?",
  "When should I recommend Apollo instead of HDBaseT?",
  "How would you position WyreStorm against larger AV brands?",
  "What discovery answers matter most before choosing WyreStorm products?",
];

const initialPosition = { x: 0, y: 0 };

export default function GuruToolHostPage() {
  const [question, setQuestion] = useState("which presentation switchers support airplay?");
  const [selectedTopic, setSelectedTopic] = useState("WyreStorm guidance");
  const [panelPosition, setPanelPosition] = useState(initialPosition);
  const [dragging, setDragging] = useState(false);
  const dragState = useRef({ startX: 0, startY: 0, originX: 0, originY: 0 });

  const answer = useMemo(() => {
    const q = question.trim().toLowerCase();

    if (!q) {
      return "Ask a product, design, or positioning question and the answer will appear here.";
    }

    if (q.includes("airplay")) {
      return "For AirPlay requirements, start with presentation switching products that support wireless presentation workflows or can be paired with an AirPlay-capable source path. In Wingman, surface the wireless requirement first, then confirm source count, display count, USB needs, control needs, and network constraints before narrowing to the final family.";
    }

    return "Start with the user outcome first: room type, number of sources, number of displays, transport distance, USB, audio breakout, control, and whether simple switching or a guided presentation experience is required. Then narrow to the most suitable WyreStorm family and explain why it fits.";
  }, [question]);

  const beginDrag = (event: React.MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button, textarea, input, select, a")) {
      return;
    }

    event.preventDefault();
    setDragging(true);

    dragState.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: panelPosition.x,
      originY: panelPosition.y,
    };

    const handleMove = (moveEvent: MouseEvent) => {
      const nextX = dragState.current.originX + (moveEvent.clientX - dragState.current.startX);
      const nextY = dragState.current.originY + (moveEvent.clientY - dragState.current.startY);
      setPanelPosition({ x: nextX, y: nextY });
    };

    const handleUp = () => {
      setDragging(false);
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  };

  return (
    <div className="guru-page">
      <div
        className={`guru-window ${dragging ? "guru-window--dragging" : ""}`}
        style={{ transform: `translate(${panelPosition.x}px, ${panelPosition.y}px)` }}
      >
        <div
          className="guru-window__titlebar"
          onMouseDown={beginDrag}
        >
          <div className="guru-window__brand">
            <img
              className="guru-window__logo"
              src="/wingman-logo-compact.png"
              alt="Wingman"
            />
            <div className="guru-window__headings">
              <h1>Guru Assistant</h1>
              <p>Drag the window from this title bar. Question on the left, answer on the right.</p>
            </div>
          </div>

          <button
            type="button"
            className="guru-window__reset"
            onClick={() => setPanelPosition(initialPosition)}
          >
            Reset position
          </button>
        </div>

        <div className="guru-window__body">
          <section className="guru-window__input">
            <div className="guru-window__section-title">Question</div>

            <div className="guru-chip-row">
              {topicChips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  className={`guru-chip ${chip === selectedTopic ? "guru-chip--active" : ""}`}
                  onClick={() => setSelectedTopic(chip)}
                >
                  {chip}
                </button>
              ))}
            </div>

            <label className="guru-window__question-label" htmlFor="guru-question">
              Main question
            </label>

            <textarea
              id="guru-question"
              className="guru-window__question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Describe room type, source count, display count, distance, USB, audio, control, and user goal."
            />

            <div className="guru-window__actions">
              <button type="button" className="guru-btn guru-btn--primary">
                Ask Guru
              </button>
              <button type="button" className="guru-btn">
                Add context
              </button>
              <button type="button" className="guru-btn" onClick={() => setQuestion("")}>
                Clear
              </button>
            </div>

            <div className="guru-window__prompts">
              {starterPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="guru-prompt"
                  onClick={() => setQuestion(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </section>

          <section className="guru-window__output">
            <div className="guru-window__section-title">Answer</div>

            <div className="guru-answer-card">
              <div className="guru-answer-card__eyebrow">{selectedTopic}</div>
              <div className="guru-answer-card__content">{answer}</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
'@ | ForEach-Object { Save-Utf8NoBom "src\features\ai\guru\GuruToolHostPage.tsx" $_ }

@'
import { useNavigate } from "react-router-dom";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import "./guru-fab.css";

export default function GuruFab() {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      className="guru-fab"
      aria-label="Open Guru"
      title="Open Guru"
      onClick={() => navigate(WM_ROUTES.GURU)}
    >
      <img
        className="guru-fab__logo"
        src="/wingman-logo-compact.png"
        alt="Wingman"
      />

      <span className="guru-fab__copy">
        <strong>Guru</strong>
        <span>Open assistant</span>
      </span>
    </button>
  );
}
'@ | ForEach-Object { Save-Utf8NoBom "src\features\ai\guru\GuruFab.tsx" $_ }

@'
.guru-page {
  min-height: 100%;
  padding: 18px;
  display: grid;
  place-items: start center;
}

.guru-window {
  width: min(1240px, calc(100vw - 56px));
  min-height: 720px;
  border-radius: 20px;
  border: 1px solid rgba(96, 165, 250, 0.18);
  background:
    radial-gradient(circle at top, rgba(37, 99, 235, 0.12), transparent 26%),
    linear-gradient(180deg, rgba(2, 6, 23, 0.98), rgba(2, 6, 23, 0.96));
  box-shadow:
    0 28px 80px rgba(2, 6, 23, 0.56),
    0 0 0 1px rgba(59, 130, 246, 0.12);
  overflow: hidden;
}

.guru-window--dragging {
  box-shadow:
    0 34px 92px rgba(2, 6, 23, 0.66),
    0 0 0 1px rgba(96, 165, 250, 0.24);
}

.guru-window__titlebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(51, 65, 85, 0.42);
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.92), rgba(2, 6, 23, 0.92));
  cursor: grab;
  user-select: none;
}

.guru-window__titlebar:active {
  cursor: grabbing;
}

.guru-window__brand {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.guru-window__logo {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  object-fit: contain;
  flex: 0 0 auto;
  box-shadow:
    0 8px 24px rgba(37, 99, 235, 0.2),
    0 0 0 1px rgba(148, 163, 184, 0.12);
}

.guru-window__headings {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.guru-window__headings h1 {
  margin: 0;
  color: #f8fafc;
  font-size: 1.28rem;
  line-height: 1;
  font-weight: 650;
}

.guru-window__headings p {
  margin: 0;
  color: rgba(191, 219, 254, 0.8);
  font-size: 0.78rem;
}

.guru-window__reset {
  min-height: 36px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid rgba(96, 165, 250, 0.2);
  background: rgba(15, 23, 42, 0.88);
  color: #e2e8f0;
  font-size: 0.8rem;
  font-weight: 600;
}

.guru-window__body {
  display: grid;
  grid-template-columns: minmax(480px, 0.95fr) minmax(360px, 0.75fr);
  gap: 16px;
  padding: 16px;
  align-items: start;
}

.guru-window__input,
.guru-window__output {
  display: grid;
  gap: 12px;
  align-self: start;
}

.guru-window__section-title {
  color: #dbeafe;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.guru-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.guru-chip {
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid rgba(71, 85, 105, 0.8);
  background: rgba(15, 23, 42, 0.82);
  color: #cbd5e1;
  font-size: 0.8rem;
  font-weight: 600;
}

.guru-chip--active {
  border-color: rgba(96, 165, 250, 0.42);
  background: linear-gradient(180deg, rgba(49, 46, 129, 0.88), rgba(30, 41, 59, 0.92));
  color: #f8fafc;
}

.guru-window__question-label {
  color: #bfdbfe;
  font-size: 0.8rem;
  font-weight: 650;
}

.guru-window__question {
  width: 100%;
  min-height: 230px;
  padding: 14px;
  resize: vertical;
  border-radius: 16px;
  border: 1px solid rgba(96, 165, 250, 0.26);
  background:
    linear-gradient(180deg, rgba(2, 6, 23, 0.98), rgba(15, 23, 42, 0.94));
  color: #f8fafc;
  font-size: 1rem;
  line-height: 1.45;
  box-shadow:
    inset 0 0 0 1px rgba(59, 130, 246, 0.06),
    0 16px 40px rgba(2, 6, 23, 0.34);
}

.guru-window__question:focus {
  outline: none;
  border-color: rgba(96, 165, 250, 0.52);
  box-shadow:
    0 0 0 4px rgba(59, 130, 246, 0.14),
    0 18px 40px rgba(2, 6, 23, 0.34);
}

.guru-window__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.guru-btn {
  min-height: 38px;
  padding: 0 14px;
  border-radius: 12px;
  border: 1px solid rgba(71, 85, 105, 0.7);
  background: rgba(15, 23, 42, 0.88);
  color: #e2e8f0;
  font-size: 0.82rem;
  font-weight: 620;
}

.guru-btn--primary {
  border-color: rgba(99, 102, 241, 0.36);
  background: linear-gradient(180deg, rgba(99, 102, 241, 0.96), rgba(79, 70, 229, 0.96));
  color: white;
  box-shadow: 0 12px 26px rgba(79, 70, 229, 0.28);
}

.guru-window__prompts {
  display: grid;
  gap: 8px;
}

.guru-prompt {
  min-height: 42px;
  padding: 0 14px;
  text-align: left;
  border-radius: 14px;
  border: 1px solid rgba(51, 65, 85, 0.8);
  background: rgba(15, 23, 42, 0.78);
  color: #dbeafe;
  font-size: 0.82rem;
  font-weight: 560;
}

.guru-answer-card {
  min-height: 100%;
  padding: 16px;
  border-radius: 18px;
  border: 1px solid rgba(96, 165, 250, 0.18);
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.92), rgba(2, 6, 23, 0.9));
  box-shadow:
    0 18px 40px rgba(2, 6, 23, 0.32),
    0 0 0 1px rgba(59, 130, 246, 0.08);
  display: grid;
  gap: 10px;
  align-content: start;
}

.guru-answer-card__eyebrow {
  color: #93c5fd;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.guru-answer-card__content {
  color: #f8fafc;
  font-size: 0.95rem;
  line-height: 1.6;
}

@media (max-width: 1180px) {
  .guru-window {
    width: calc(100vw - 28px);
    min-height: auto;
  }

  .guru-window__body {
    grid-template-columns: 1fr;
  }
}
'@ | ForEach-Object { Save-Utf8NoBom "src\features\ai\guru\guru-tool-host.css" $_ }

@'
import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import WingmanBrand from "@/app/branding/WingmanBrand";

const titleMap: Record<string, { title: string; subtitle: string }> = {
  "/app/dashboard": {
    title: "Mission Control",
    subtitle: "Clear inputs, live outputs, and visual decision support.",
  },
  "/app/projects": {
    title: "Projects",
    subtitle: "Active work, recent proposals, and next actions.",
  },
  "/app/tools": {
    title: "Tools",
    subtitle: "Compact workspace with visible input, output, and guidance.",
  },
  "/app/tools/guru": {
    title: "Guru",
    subtitle: "Question on the left. Answer on the right.",
  },
};

export default function TopBar() {
  const location = useLocation();

  const meta = useMemo(() => {
    return (
      titleMap[location.pathname] ?? {
        title: "Wingman Workspace",
        subtitle: "Clear inputs, live outputs, and visual decision support.",
      }
    );
  }, [location.pathname]);

  return (
    <header className="wm-topbar wm-topbar--compact">
      <div className="wm-topbar__brand-slot">
        <WingmanBrand compact={false} subtitle={meta.subtitle} />
      </div>

      <div className="wm-topbar__heading">
        <div className="wm-topbar__kicker">Workspace</div>
        <h1 className="wm-topbar__title">{meta.title}</h1>
      </div>
    </header>
  );
}
'@ | ForEach-Object { Save-Utf8NoBom "src\app\navigation\TopBar.tsx" $_ }

Write-Host ""
Write-Host "Fixed Wingman main logo and Guru drag window." -ForegroundColor Green
Write-Host ""
Write-Host "Run:"
Write-Host "npm run repo:health"