Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Set-Location C:\Users\steve\wingman
$root = (Get-Location).Path

function Save-Utf8NoBom {
  param([string]$Path,[string]$Content)
  $full = Join-Path $root $Path
  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($full,$Content,$utf8)
}

# -----------------------------
# GURU PAGE (CLEAN Q / A LAYOUT)
# -----------------------------
@'
import { useState } from "react";
import "./guru-tool-host.css";

export default function GuruToolHostPage() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("Your answer will appear here.");

  const handleAsk = () => {
    if (!question.trim()) return;

    // TEMP LOGIC (replace later with real AI)
    setAnswer(
      "Start with outcome: room type, sources, displays, distance, USB, audio, control. Then match to correct WyreStorm product family."
    );
  };

  return (
    <div className="guru-layout">

      {/* LEFT = QUESTION */}
      <div className="guru-panel guru-panel--question">
        <div className="guru-header">
          <h2>Question</h2>
          <span>Describe what the customer needs</span>
        </div>

        <textarea
          className="guru-input"
          placeholder="e.g. 6 sources, 2 displays, 20m distance, USB camera, wireless presentation..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />

        <button className="guru-ask" onClick={handleAsk}>
          Ask Guru
        </button>
      </div>

      {/* RIGHT = ANSWER */}
      <div className="guru-panel guru-panel--answer">
        <div className="guru-header">
          <h2>Answer</h2>
          <span>Live guidance updates here</span>
        </div>

        <div className="guru-answer">
          {answer}
        </div>
      </div>

    </div>
  );
}
'@ | Set-Content src\features\ai\guru\GuruToolHostPage.tsx -Encoding UTF8

# -----------------------------
# CSS (CLEAR SPLIT LAYOUT)
# -----------------------------
@'
.guru-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  height: calc(100vh - 120px);
}

.guru-panel {
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  border: 1px solid rgba(100,116,139,0.2);
  background: linear-gradient(180deg,#020617,#020617ee);
  padding: 16px;
}

.guru-header h2 {
  margin: 0;
  font-size: 1.1rem;
  color: white;
}

.guru-header span {
  font-size: 0.75rem;
  color: #94a3b8;
}

.guru-input {
  flex: 1;
  margin-top: 12px;
  padding: 14px;
  border-radius: 12px;
  border: 1px solid rgba(96,165,250,0.3);
  background: #020617;
  color: white;
  font-size: 0.9rem;
  resize: none;
}

.guru-ask {
  margin-top: 12px;
  height: 42px;
  border-radius: 10px;
  border: none;
  background: #6366f1;
  color: white;
  font-weight: 600;
  cursor: pointer;
}

.guru-answer {
  margin-top: 12px;
  padding: 14px;
  border-radius: 12px;
  background: rgba(15,23,42,0.8);
  color: #e2e8f0;
  line-height: 1.5;
  flex: 1;
  overflow: auto;
}

@media (max-width: 1000px) {
  .guru-layout {
    grid-template-columns: 1fr;
  }
}
'@ | Set-Content src\features\ai\guru\guru-tool-host.css -Encoding UTF8

Write-Host "Guru layout fixed (clear Question / Answer)" -ForegroundColor Green