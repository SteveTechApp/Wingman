import { useState } from "react";
import { AlertTriangle, CheckCircle2, Clipboard, Code2, Info } from "lucide-react";

type DiagramPreviewPanelProps = {
  title: string;
  summary: string;
  mermaid: string;
  blockers: string[];
  assumptions: string[];
  stats?: Array<{ label: string; value: string }>;
};

export function DiagramPreviewPanel({
  title,
  summary,
  mermaid,
  blockers,
  assumptions,
  stats = [],
}: DiagramPreviewPanelProps) {
  const [copyStatus, setCopyStatus] = useState("");

  async function copyMermaid() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(mermaid);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = mermaid;
        textarea.setAttribute("readonly", "true");
        textarea.style.position = "fixed";
        textarea.style.top = "-1000px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopyStatus("Mermaid copied for Whimsical.");
    } catch {
      setCopyStatus("Copy unavailable. Select the Mermaid code manually.");
    }

    window.setTimeout(() => setCopyStatus(""), 2200);
  }

  return (
    <section className="wm-diagram-preview-panel">
      <header className="wm-diagram-preview-head">
        <div>
          <p>Mermaid export</p>
          <h2>{title}</h2>
          <span>{summary}</span>
        </div>

        <button type="button" onClick={copyMermaid}>
          <Clipboard className="h-4 w-4" />
          <span>Copy Mermaid</span>
        </button>
      </header>

      {stats.length ? (
        <div className="wm-diagram-stat-row">
          {stats.map((stat) => (
            <div key={stat.label}>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
            </div>
          ))}
        </div>
      ) : null}

      {copyStatus ? (
        <div className="wm-diagram-copy-status" role="status">
          <CheckCircle2 className="h-4 w-4" />
          <span>{copyStatus}</span>
        </div>
      ) : null}

      <div className="wm-diagram-code-shell">
        <div>
          <Code2 className="h-4 w-4" />
          <span>Paste this Mermaid into Whimsical as an editable diagram</span>
        </div>
        <textarea value={mermaid} readOnly aria-label="Generated Mermaid code" spellCheck={false} />
      </div>

      <div className="wm-diagram-review-grid">
        <section data-state={blockers.length ? "warning" : "ready"}>
          <h3>
            <AlertTriangle className="h-4 w-4" />
            Visible blockers
          </h3>
          {blockers.length ? (
            <ul>
              {blockers.map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          ) : (
            <p>No blockers detected from the selected source data.</p>
          )}
        </section>

        <section>
          <h3>
            <Info className="h-4 w-4" />
            Diagram assumptions
          </h3>
          <ul>
            {assumptions.map((assumption) => (
              <li key={assumption}>{assumption}</li>
            ))}
          </ul>
        </section>
      </div>
    </section>
  );
}

export default DiagramPreviewPanel;
