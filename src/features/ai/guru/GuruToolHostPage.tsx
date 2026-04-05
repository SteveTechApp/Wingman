import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ClipboardList,
  FileText,
  Layers3,
  MapPinned,
  TriangleAlert,
} from "lucide-react";
import "./guru-shared.css";
import "./guru-tool-host-page.css";
import { buildGuruAdvice } from "./guruIntelligence";
import { buildGuruInputFromProject, getGuruProjectSnapshot } from "./guruProjectBridge";

const starterBrief = [
  "4 sources, 6 displays across two spaces, 35m max distance, central control required, audio de-embed preferred.",
  "3x3 video wall in reception, customer wants flexible layouts and simple operation.",
  "Meeting room with 2 sources, 2 displays, USB camera and BYOD switching.",
];

export default function GuruToolHostPage() {
  const location = useLocation();
  const [brief, setBrief] = useState("");

  const projectSnapshot = useMemo(() => getGuruProjectSnapshot(), []);
  const effectiveInput = useMemo(
    () => buildGuruInputFromProject(brief, projectSnapshot),
    [brief, projectSnapshot],
  );

  const advice = useMemo(
    () => buildGuruAdvice(effectiveInput, location.pathname, projectSnapshot),
    [effectiveInput, location.pathname, projectSnapshot],
  );

  const confidenceClass =
    advice.confidence === "high"
      ? "guru-confidence guru-confidence--high"
      : advice.confidence === "medium"
      ? "guru-confidence guru-confidence--medium"
      : "guru-confidence guru-confidence--low";

  return (
    <div className="guru-page">
      <section className="guru-hero">
        <div className="guru-hero-main">
          <div className="guru-kicker">
            <img src="/guru.png" alt="Wingman Guru" className="wm-guru-mark" />
            <span>Wingman Guru</span>
          </div>

          <h1>Context-aware AV guidance for the next decision.</h1>
          <p>
            Guru now reads the active project snapshot when available, so recommendations
            can reflect the current brief, architecture direction and selected products.
          </p>

          <div className="guru-context-row">
            <div className="guru-context-pill">
              <MapPinned size={14} />
              <span>Current context: {advice.contextLabel}</span>
            </div>
            <div className={confidenceClass}>
              <CheckCircle2 size={14} />
              <span>{advice.confidence} confidence</span>
            </div>
          </div>
        </div>

        <aside className="guru-hero-side">
          <div className="guru-side-card">
            <div className="guru-side-head">
              <Bot size={18} />
              <strong>Starter briefs</strong>
            </div>

            <div className="guru-starter-list">
              {starterBrief.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="guru-starter-button"
                  onClick={() => setBrief(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <section className="guru-workspace">
        <div className="guru-input-panel">
          <div className="guru-panel-head">
            <div className="guru-panel-title">
              <ClipboardList size={18} />
              <strong>Project brief</strong>
            </div>
            <button type="button" className="guru-clear-button" onClick={() => setBrief("")}>
              Clear
            </button>
          </div>

          <textarea
            className="guru-brief-input"
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder="Example: 4 sources, 8 displays, 40m max distance, control system required, USB camera support, customer wants easy expansion later."
          />

          {brief.length > 0 && (
            <div className="guru-live-indicator">Guru is analysing your brief and active project data...</div>
          )}

          <div className="guru-card guru-project-snapshot-card">
            <div className="guru-panel-title">
              <Layers3 size={18} />
              <strong>Active project snapshot</strong>
            </div>

            {projectSnapshot ? (
              <div className="guru-list">
                {projectSnapshot.projectName ? (
                  <div className="guru-list-row"><span>Project: {projectSnapshot.projectName}</span></div>
                ) : null}
                {projectSnapshot.customerName ? (
                  <div className="guru-list-row"><span>Customer: {projectSnapshot.customerName}</span></div>
                ) : null}
                {projectSnapshot.application ? (
                  <div className="guru-list-row"><span>Application: {projectSnapshot.application}</span></div>
                ) : null}
                {projectSnapshot.roomType ? (
                  <div className="guru-list-row"><span>Room type: {projectSnapshot.roomType}</span></div>
                ) : null}
                {projectSnapshot.sourceCount !== undefined ? (
                  <div className="guru-list-row"><span>Sources: {projectSnapshot.sourceCount}</span></div>
                ) : null}
                {projectSnapshot.displayCount !== undefined ? (
                  <div className="guru-list-row"><span>Displays: {projectSnapshot.displayCount}</span></div>
                ) : null}
                {projectSnapshot.distanceM !== undefined ? (
                  <div className="guru-list-row"><span>Distance: {projectSnapshot.distanceM}m</span></div>
                ) : null}
                {projectSnapshot.architecture ? (
                  <div className="guru-list-row"><span>Architecture: {projectSnapshot.architecture}</span></div>
                ) : null}
                {projectSnapshot.selectedProducts && projectSnapshot.selectedProducts.length > 0 ? (
                  <div className="guru-list-row"><span>Products: {projectSnapshot.selectedProducts.join(", ")}</span></div>
                ) : null}
              </div>
            ) : (
              <div className="guru-empty-state">
                No active project snapshot found yet. Guru will still use the typed brief.
              </div>
            )}
          </div>
        </div>

        <div className="guru-output-panel">
          <div className="guru-summary-card">
            <div className="guru-panel-head">
              <div className="guru-panel-title">
                <Layers3 size={18} />
                <strong>Guru recommendation</strong>
              </div>
            </div>

            <div className="guru-architecture-pill">{advice.architecture}</div>
            <p className="guru-summary-text">{advice.summary}</p>

            <div className="guru-note-list">
              {advice.notes.map((note) => (
                <div key={note} className="guru-note-item">
                  <CheckCircle2 size={16} />
                  <span>{note}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="guru-columns">
            <div className="guru-card">
              <div className="guru-panel-title">
                <TriangleAlert size={18} />
                <strong>Missing information</strong>
              </div>

              {advice.missingItems.length > 0 ? (
                <div className="guru-list">
                  {advice.missingItems.map((item) => (
                    <div key={item} className="guru-list-row guru-list-row--warn">
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="guru-empty-state">Core inputs look reasonably complete.</div>
              )}
            </div>

            <div className="guru-card">
              <div className="guru-panel-title">
                <Layers3 size={18} />
                <strong>Product direction</strong>
              </div>

              <div className="guru-list">
                {advice.productDirection.map((item) => (
                  <div key={item} className="guru-list-row">
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="guru-columns">
            <div className="guru-card">
              <div className="guru-panel-title">
                <Bot size={18} />
                <strong>Suggested prompts</strong>
              </div>

              <div className="guru-list">
                {advice.prompts.map((item) => (
                  <div key={item} className="guru-list-row">
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="guru-card">
              <div className="guru-panel-title">
                <FileText size={18} />
                <strong>Next tools</strong>
              </div>

              <div className="guru-next-step-list">
                {advice.nextSteps.map((step) => (
                  <Link key={step.label} to={step.href} className="guru-next-step">
                    <div>
                      <strong>{step.label}</strong>
                      <p>{step.reason}</p>
                    </div>
                    <ArrowRight size={16} />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}