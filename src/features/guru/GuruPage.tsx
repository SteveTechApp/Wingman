import * as React from "react";
import { useNavigate } from "react-router-dom";
import { askGuru, type GuruAnswer, type GuruMode as ApiGuruMode } from "@/features/ai/guru/guruApi";
import { getActiveProject, updateProject } from "@/features/projects/projectStore";
import { addLineToSavedProposal } from "@/proposal/bom/store";

type GuruMode =
  | "general"
  | "wyrestorm"
  | "design"
  | "troubleshooting"
  | "training";

type GuruWorkspaceState = {
  mode: GuruMode;
  question: string;
  context: string;
};

type GuruModeDef = {
  id: GuruMode;
  label: string;
  subtitle: string;
  placeholder: string;
  persona: string;
  quickAsks: string[];
};

const STORAGE_KEY = "wm_guru_workspace_v3";

const MODE_DEFS: Record<GuruMode, GuruModeDef> = {
  general: {
    id: "general",
    label: "General AV advice",
    subtitle: "Broad AV guidance, terminology, workflows and best practice.",
    placeholder:
      "Ask a general AV question, for example: What should I consider when specifying a meeting room signal path?",
    persona:
      "You are Guru, an AV industry assistant. Give clear, commercially useful advice in plain English. Focus on practical audiovisual guidance, signal flow, room design logic and product-category reasoning.",
    quickAsks: [
      "Explain the difference between matrix switching, extension and AVoIP.",
      "What should I ask during an AV discovery call?",
      "How do I choose between HDBaseT and AVoIP?",
      "What are the key design considerations for a boardroom AV system?",
    ],
  },
  wyrestorm: {
    id: "wyrestorm",
    label: "WyreStorm guidance",
    subtitle: "WyreStorm-focused product and application support.",
    placeholder:
      "Ask a WyreStorm-specific question, for example: Which WyreStorm family fits a small Teams room with USB-C BYOD?",
    persona:
      "You are Guru, a WyreStorm-focused AV assistant. Prioritise WyreStorm product families, application fit and plain-English guidance. State assumptions clearly when exact product detail is missing.",
    quickAsks: [
      "Which WyreStorm family best suits a small meeting room?",
      "When should I recommend Apollo instead of HDBaseT?",
      "How would you position WyreStorm against larger AV brands?",
      "What discovery answers matter most before choosing WyreStorm products?",
    ],
  },
  design: {
    id: "design",
    label: "Design support",
    subtitle: "Signal paths, room planning and system architecture advice.",
    placeholder:
      "Describe the room, sources, displays and constraints, then ask for a design recommendation.",
    persona:
      "You are Guru, an AV design assistant. Help structure signal paths, room layouts, extension methods, switching logic, USB transport, audio integration, control considerations and design risks.",
    quickAsks: [
      "Propose a signal path for a boardroom with two displays and three sources.",
      "What inputs do I need before designing a divisible training space?",
      "How should I structure USB, video and control in a meeting room?",
      "What are the typical pitfalls in AV system design?",
    ],
  },
  troubleshooting: {
    id: "troubleshooting",
    label: "Troubleshooting",
    subtitle: "Fault-finding for signal, USB, audio and control problems.",
    placeholder:
      "Describe the fault symptoms, what is connected, and what has already been tested.",
    persona:
      "You are Guru, an AV troubleshooting assistant. Help isolate likely causes, suggest ordered checks and separate symptoms from root causes. Keep answers structured and practical.",
    quickAsks: [
      "Help me troubleshoot intermittent HDMI sync issues.",
      "Why might USB devices fail over extension?",
      "What should I check when audio is missing but video is present?",
      "Create a structured AV fault-finding checklist.",
    ],
  },
  training: {
    id: "training",
    label: "Training and explainers",
    subtitle: "Learning support, sales coaching and concept explainers.",
    placeholder:
      "Ask Guru to explain a concept, teach a workflow, or simplify a technical topic.",
    persona:
      "You are Guru, an AV trainer and explainer. Teach clearly, keep the language simple, and connect technical concepts to real sales and design decisions.",
    quickAsks: [
      "Explain HDCP, EDID and scaling in simple terms.",
      "Teach me how to qualify an AV opportunity.",
      "What are the core AV concepts a salesperson should understand?",
      "Summarise AVoIP for a non-technical audience.",
    ],
  },
};

function readState(): GuruWorkspaceState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { mode: "general", question: "", context: "" };
    }
    const parsed = JSON.parse(raw) as Partial<GuruWorkspaceState>;
    return {
      mode: parsed.mode ?? "general",
      question: parsed.question ?? "",
      context: parsed.context ?? "",
    };
  } catch {
    return { mode: "general", question: "", context: "" };
  }
}

function writeState(state: GuruWorkspaceState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
  }
}

function buildPrompt(mode: GuruMode, question: string, context: string): string {
  const def = MODE_DEFS[mode];
  const sections: string[] = [def.persona, "", `Mode: ${def.label}`];

  if (context.trim()) sections.push("", "Optional context:", context.trim());
  sections.push("", `Task: ${question.trim() || ""}`);

  return sections.join("\n");
}

function mapModeToApiMode(mode: GuruMode): ApiGuruMode {
  if (mode === "training") return "resources";
  if (mode === "design" || mode === "troubleshooting") return "project-check";
  return "ask";
}

function confidenceLabel(value: GuruAnswer["confidence"]): string {
  if (!value) return "Unknown";
  if (value === "high") return "High";
  if (value === "medium") return "Medium";
  return "Low";
}

function normalizeSuggestedSkus(answer: GuruAnswer | null): Array<{ sku: string; name?: string; reason?: string }> {
  if (!answer?.suggestedSkus || answer.suggestedSkus.length === 0) return [];
  const seen = new Set<string>();
  const out: Array<{ sku: string; name?: string; reason?: string }> = [];

  for (const item of answer.suggestedSkus) {
    const sku = String(item.sku ?? "").trim().toUpperCase();
    if (!sku || seen.has(sku)) continue;
    seen.add(sku);
    out.push({
      sku,
      name: item.name?.trim() || undefined,
      reason: item.reason?.trim() || undefined,
    });
  }

  return out;
}

const pageStyles = `
.wm-guru-page{
  padding: 14px 16px 18px;
}

.wm-guru-page__hero{
  display: grid;
  grid-template-columns: minmax(0,1fr) auto;
  gap: 12px;
  align-items: start;
}

.wm-guru-page__heroActions{
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.wm-guru-page__eyebrow{
  margin: 0 0 4px;
  color: #66eadb;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.wm-guru-page__modes{
  margin-top: 12px;
}

@media (max-width: 900px){
  .wm-guru-page__hero{
    grid-template-columns: 1fr;
  }

  .wm-guru-page__heroActions{
    justify-content: flex-start;
  }
}
`;

export default function GuruPage() {
  const navigate = useNavigate();

  const initial = React.useMemo(() => readState(), []);
  const [mode, setMode] = React.useState<GuruMode>(initial.mode);
  const [question, setQuestion] = React.useState(initial.question);
  const [context, setContext] = React.useState(initial.context);
  const [copiedAt, setCopiedAt] = React.useState("");
  const [answerBusy, setAnswerBusy] = React.useState(false);
  const [answerError, setAnswerError] = React.useState("");
  const [answer, setAnswer] = React.useState<GuruAnswer | null>(null);
  const [answeredAt, setAnsweredAt] = React.useState("");
  const [transferMessage, setTransferMessage] = React.useState("");

  React.useEffect(() => {
    writeState({ mode, question, context });
  }, [mode, question, context]);

  const def = MODE_DEFS[mode];
  const promptPreview = React.useMemo(() => buildPrompt(mode, question, context), [mode, question, context]);
  const hasContent = question.trim().length > 0 || context.trim().length > 0;
  const suggestedSkus = React.useMemo(() => normalizeSuggestedSkus(answer), [answer]);

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(promptPreview);
      setCopiedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    } catch {
    }
  };

  const clearAll = () => {
    setQuestion("");
    setContext("");
    setCopiedAt("");
    setAnswerError("");
    setAnswer(null);
    setAnsweredAt("");
    setTransferMessage("");
  };

  const insertContextTemplate = () => {
    setContext((prev) => {
      if (prev.trim()) return prev;
      return [
        "Project or room type:",
        "Customer goal:",
        "Source devices:",
        "Displays:",
        "Distances:",
        "Audio requirements:",
        "Control requirements:",
        "Budget band:",
        "Constraints or risks:",
      ].join("\n");
    });
  };

  const askLiveGuru = async () => {
    const primaryQuestion = question.trim();
    const contextText = context.trim();
    const combined = contextText
      ? `${primaryQuestion || "Use the following context to answer the request."}\n\nContext:\n${contextText}`
      : primaryQuestion;

    if (!combined.trim()) {
      setAnswerError("Add a question or context before asking Guru.");
      setAnswer(null);
      return;
    }

    setAnswerBusy(true);
    setAnswerError("");
    setTransferMessage("");
    try {
      const result = await askGuru(combined, {
        mode: mapModeToApiMode(mode),
        notes: contextText || undefined,
      });
      setAnswer(result);
      setAnsweredAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    } catch {
      setAnswerError("Guru request failed. Retry, or open diagnostics if this persists.");
      setAnswer(null);
    } finally {
      setAnswerBusy(false);
    }
  };

  const sendSuggestedSkusToProject = () => {
    if (suggestedSkus.length === 0) {
      setTransferMessage("No WyreStorm SKU suggestions found in this answer.");
      return;
    }

    const active = getActiveProject();
    if (!active) {
      setTransferMessage("No active project found. Open a project first, then transfer SKUs.");
      return;
    }

    const existing = Array.isArray(active.catalog?.skus) ? active.catalog!.skus! : [];
    const merged = Array.from(new Set([...existing, ...suggestedSkus.map((item) => item.sku)]));

    updateProject(active.id, {
      catalog: {
        ...(active.catalog ?? {}),
        selectedBrand: "WyreStorm",
        skus: merged,
      },
      stage: active.stage || "Specify",
    });

    setTransferMessage(`Added ${suggestedSkus.length} SKU(s) to project catalog (${active.name}).`);
  };

  const sendSuggestedSkusToProposal = () => {
    if (suggestedSkus.length === 0) {
      setTransferMessage("No WyreStorm SKU suggestions found in this answer.");
      return;
    }

    suggestedSkus.forEach((item) => {
      addLineToSavedProposal({
        sku: item.sku,
        name: item.name || item.sku,
        qty: 1,
        source: "guru",
      });
    });

    setTransferMessage(`Added ${suggestedSkus.length} SKU(s) to Proposal BOM draft.`);
  };

  return (
    <div className="wm-guru-page wm-ui">
      <style>{pageStyles}</style>

      <div className="wm-ui__stack">
        <section className="wm-ui__card wm-ui__card--hero">
          <div className="wm-guru-page__hero">
            <div>
              <p className="wm-guru-page__eyebrow">Guru</p>
              <h1 className="wm-ui__title">AV knowledge workspace</h1>
              <p className="wm-ui__subtitle">
                Standalone AI assistant for WyreStorm expertise and general AV guidance. Use it for answers first, then optionally push suggested SKUs into project or proposal workflows.
              </p>
            </div>

            <div className="wm-guru-page__heroActions">
              <button className="wm-ui__btn wm-ui__btn--ghost" onClick={() => navigate("/app/tools")}>
                Tool Hub
              </button>
              <button className="wm-ui__btn wm-ui__btn--ghost" onClick={() => navigate("/app/tools/product-intelligence")}>
                Product Intelligence
              </button>
              <button className="wm-ui__btn" onClick={askLiveGuru} disabled={!hasContent || answerBusy}>
                {answerBusy ? "Thinking..." : "Ask Guru"}
              </button>
              <button className="wm-ui__btn wm-ui__btn--primary" onClick={copyPrompt} disabled={!hasContent}>
                Copy prompt
              </button>
            </div>
          </div>
        </section>

        <section className="wm-ui__card">
          <h2 className="wm-ui__sectionTitle">Mode</h2>
          <p className="wm-ui__sectionText">Select how Guru should respond before you ask the question.</p>

          <div className="wm-ui__grid wm-ui__grid--auto wm-guru-page__modes">
            {(Object.values(MODE_DEFS) as GuruModeDef[]).map((item) => (
              <button
                key={item.id}
                type="button"
                className={`wm-ui__chip ${item.id === mode ? "wm-ui__chip--active" : ""}`}
                onClick={() => setMode(item.id)}
                style={{ justifyContent: "flex-start", minHeight: "auto", padding: "12px 14px", borderRadius: "14px", display: "block", textAlign: "left" }}
              >
                <strong style={{ display: "block", marginBottom: "4px", fontSize: "0.96rem", fontWeight: 650 }}>{item.label}</strong>
                <span style={{ display: "block", color: "rgba(232,241,255,0.72)", fontSize: "0.82rem", lineHeight: 1.28 }}>{item.subtitle}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="wm-ui__card">
          <h2 className="wm-ui__sectionTitle">{def.label}</h2>
          <p className="wm-ui__sectionText">{def.subtitle}</p>

          <label className="wm-ui__field" style={{ marginTop: "12px" }}>
            <span className="wm-ui__label">Main question</span>
            <textarea
              className="wm-ui__textarea wm-ui__textarea--lg"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={def.placeholder}
            />
          </label>

          <div className="wm-ui__helper">
            Put the actual question first. Add room notes, customer details or system constraints only if they help.
          </div>

          <label className="wm-ui__field">
            <span className="wm-ui__label">Optional context</span>
            <textarea
              className="wm-ui__textarea wm-ui__textarea--sm"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Paste room notes, customer requirements, design constraints, existing kit, or any other useful context."
            />
          </label>

          <div className="wm-ui__chips">
            {def.quickAsks.map((ask) => (
              <button
                key={ask}
                type="button"
                className="wm-ui__chip"
                onClick={() => setQuestion(ask)}
              >
                {ask}
              </button>
            ))}
          </div>

          <div className="wm-ui__actions">
            <button className="wm-ui__btn wm-ui__btn--primary" onClick={askLiveGuru} disabled={!hasContent || answerBusy}>
              {answerBusy ? "Thinking..." : "Ask Guru"}
            </button>
            <button className="wm-ui__btn" onClick={insertContextTemplate}>
              Insert context template
            </button>
            <button className="wm-ui__btn" onClick={clearAll}>
              Clear
            </button>
            <button className="wm-ui__btn wm-ui__btn--primary" onClick={copyPrompt} disabled={!hasContent}>
              Copy prompt
            </button>
          </div>
        </section>

        <section className="wm-ui__card">
          <h3 className="wm-ui__sectionTitle">Prompt preview</h3>
          <div className="wm-ui__preview">
            {hasContent ? promptPreview : "Your prompt preview will appear here as soon as you type a question or add context."}
          </div>
          <div className="wm-ui__helper">
            {copiedAt ? `Copied at ${copiedAt}` : "Use Copy prompt when the wording looks right."}
          </div>
        </section>

        <section className="wm-ui__card">
          <h3 className="wm-ui__sectionTitle">Live answer</h3>
          {answerError ? (
            <div className="wm-ui__helper">{answerError}</div>
          ) : answer ? (
            <>
              <div className="wm-ui__preview">{answer.text}</div>
              <div className="wm-ui__helper">
                Confidence: {confidenceLabel(answer.confidence)}
                {answeredAt ? ` · Updated at ${answeredAt}` : ""}
              </div>
              {answer.sources && answer.sources.length > 0 ? (
                <div className="wm-ui__chips">
                  {answer.sources.map((source) => (
                    source.to ? (
                      <button
                        key={`${source.title}_${source.to}`}
                        type="button"
                        className="wm-ui__chip"
                        onClick={() => navigate(source.to || "/app/tools")}
                      >
                        {source.title}
                      </button>
                    ) : source.url ? (
                      <a
                        key={`${source.title}_${source.url}`}
                        className="wm-ui__chip"
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {source.title}
                      </a>
                    ) : null
                  ))}
                </div>
              ) : null}
              {suggestedSkus.length > 0 ? (
                <>
                  <div className="wm-ui__helper" style={{ marginTop: 10 }}>
                    WyreStorm products detected in this answer:
                  </div>
                  <div className="wm-ui__chips">
                    {suggestedSkus.map((item) => (
                      <span key={item.sku} className="wm-ui__chip">
                        {item.sku}
                      </span>
                    ))}
                  </div>
                  <div className="wm-ui__actions" style={{ marginTop: 10 }}>
                    <button
                      type="button"
                      className="wm-ui__btn wm-ui__btn--primary"
                      onClick={sendSuggestedSkusToProject}
                    >
                      Send To Active Project
                    </button>
                    <button
                      type="button"
                      className="wm-ui__btn"
                      onClick={sendSuggestedSkusToProposal}
                    >
                      Send To Proposal BOM
                    </button>
                    <button
                      type="button"
                      className="wm-ui__btn"
                      onClick={() => navigate("/app/tools/catalog")}
                    >
                      Open Product Catalogue
                    </button>
                  </div>
                </>
              ) : null}
              {transferMessage ? (
                <div className="wm-ui__helper" style={{ marginTop: 8 }}>
                  {transferMessage}
                </div>
              ) : null}
            </>
          ) : (
            <div className="wm-ui__helper">Run Ask Guru to generate an answer with confidence and support links.</div>
          )}
        </section>

        <section className="wm-ui__card">
          <h3 className="wm-ui__sectionTitle">How to use Guru</h3>
          <div className="wm-ui__miniGrid" style={{ marginTop: "12px" }}>
            <div className="wm-ui__miniItem">
              <strong>1. Pick a mode</strong>
              <span>Choose the kind of help you want before writing the question.</span>
            </div>
            <div className="wm-ui__miniItem">
              <strong>2. Ask plainly</strong>
              <span>Write the real AV question first. Keep it direct and specific.</span>
            </div>
            <div className="wm-ui__miniItem">
              <strong>3. Add context only when useful</strong>
              <span>Paste notes only if they improve the answer. Guru should work without project data.</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
