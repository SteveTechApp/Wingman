Set-Location C:\Users\steve\wingman
$ErrorActionPreference = "Stop"

# -----------------------------
# HARD REPLACE GURU PAGE
# -----------------------------
@'
import { useState } from "react";
import "./guru-tool-host.css";

export default function GuruToolHostPage() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("Answer will appear here.");

  const ask = () => {
    if (!question.trim()) return;

    setAnswer(
      "Start with outcome: room type, sources, displays, distance, USB, audio, control. Then match to the correct WyreStorm product family."
    );
  };

  return (
    <div className="guru-qa-layout">

      {/* LEFT: QUESTION */}
      <div className="guru-box">
        <h2>Question</h2>

        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Describe the system requirement..."
        />

        <button onClick={ask}>
          Ask Guru
        </button>
      </div>

      {/* RIGHT: ANSWER */}
      <div className="guru-box">
        <h2>Answer</h2>

        <div className="guru-answer">
          {answer}
        </div>
      </div>

    </div>
  );
}
'@ | Set-Content src\features\ai\guru\GuruToolHostPage.tsx -Encoding UTF8

# -----------------------------
# HARD REPLACE CSS
# -----------------------------
@'
.guru-qa-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  height: calc(100vh - 120px);
  padding: 20px;
}

.guru-box {
  display: flex;
  flex-direction: column;
  background: #020617;
  border: 1px solid rgba(96,165,250,0.3);
  border-radius: 14px;
  padding: 16px;
}

.guru-box h2 {
  color: white;
  margin-bottom: 10px;
}

.guru-box textarea {
  flex: 1;
  min-height: 200px;
  background: #020617;
  border: 1px solid rgba(96,165,250,0.4);
  border-radius: 10px;
  color: white;
  padding: 12px;
}

.guru-box button {
  margin-top: 12px;
  height: 42px;
  background: #6366f1;
  border: none;
  border-radius: 10px;
  color: white;
  font-weight: 600;
  cursor: pointer;
}

.guru-answer {
  flex: 1;
  background: rgba(15,23,42,0.8);
  border-radius: 10px;
  padding: 12px;
  color: #e2e8f0;
}
'@ | Set-Content src\features\ai\guru\guru-tool-host.css -Encoding UTF8

Write-Host "Guru FORCED to Q/A layout" -ForegroundColor Green