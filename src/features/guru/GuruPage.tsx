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

type GuruPanelLayout = {
  width: number;
  height: number;
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
const PANEL_LAYOUT_KEY = "wm_guru_panel_layout_v1";
const DEFAULT_PANEL_LAYOUT: GuruPanelLayout = { width: 520, height: 680 };

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

function readPanelLayout(): GuruPanelLayout {
  try {
    const raw = localStorage.getItem(PANEL_LAYOUT_KEY);
    if (!raw) return DEFAULT_PANEL_LAYOUT;
    const parsed = JSON.parse(raw) as Partial<GuruPanelLayout>;
    const width = Number(parsed.width);
    const height = Number(parsed.height);
    return {
      width: Number.isFinite(width) && width >= 360 ? width : DEFAULT_PANEL_LAYOUT.width,
      height: Number.isFinite(height) && height >= 420 ? height : DEFAULT_PANEL_LAYOUT.height,
    };
  } catch {
    return DEFAULT_PANEL_LAYOUT;
  }
}

function writePanelLayout(layout: GuruPanelLayout) {
  try {
    localStorage.setItem(PANEL_LAYOUT_KEY, JSON.stringify(layout));
  } catch {
  }
}

const pageStyles = `
.wm-guru-float-page{
  position: relative;
  min-height: 0;
  padding: 0;
  overflow: visible;
}

.wm-guru-float-launcher{
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 120;
  min-height: 46px;
  padding: 0 16px;
  border-radius: 999px;
  border: 1px solid rgba(125, 189, 255, 0.42);
  background: linear-gradient(135deg, rgba(58, 121, 212, 0.92), rgba(33, 161, 117, 0.92));
  color: rgba(247, 252, 255, 0.98);
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 20px 38px rgba(4, 12, 24, 0.45);
}

.wm-guru-float-panel{
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 121;
  width: min(520px, calc(100vw - 24px));
  height: min(680px, calc(100vh - 96px));
  min-width: 360px;
  min-height: 420px;
  max-width: calc(100vw - 12px);
  max-height: calc(100vh - 12px);
  border-radius: 18px;
  border: 1px solid rgba(124, 173, 224, 0.26);
  background:
    linear-gradient(180deg, rgba(12, 24, 38, 0.97), rgba(8, 18, 29, 0.97)),
    linear-gradient(120deg, rgba(68, 138, 222, 0.12), rgba(61, 210, 145, 0.08));
  box-shadow: 0 28px 56px rgba(0, 0, 0, 0.48);
  box-sizing: border-box;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  resize: both;
  overflow: hidden;
}

.wm-guru-float-panel__head{
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 14px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.wm-guru-float-panel__head-actions{
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.wm-guru-float-panel__title{
  margin: 0;
  font-size: 18px;
  color: rgba(247, 251, 255, 0.98);
}

.wm-guru-float-panel__sub{
  margin: 4px 0 0;
  color: rgba(201, 217, 236, 0.78);
  font-size: 12px;
}

.wm-guru-float-resize-note{
  color: rgba(190, 212, 237, 0.72);
  font-size: 11px;
}

.wm-guru-float-panel__body{
  overflow: auto;
  padding: 12px 14px 14px;
  display: grid;
  gap: 12px;
}

.wm-guru-float-modes{
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.wm-guru-float-mode{
  min-height: 30px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(228, 239, 251, 0.88);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.wm-guru-float-mode.is-active{
  border-color: rgba(120, 210, 186, 0.46);
  background: linear-gradient(90deg, rgba(38, 142, 89, 0.22), rgba(45, 108, 184, 0.2));
  color: rgba(236, 255, 248, 0.97);
}

.wm-guru-float-field{
  display: grid;
  gap: 6px;
}

.wm-guru-float-field label{
  color: rgba(218, 231, 246, 0.9);
  font-size: 12px;
  font-weight: 700;
}

.wm-guru-float-input{
  width: 100%;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(7, 16, 27, 0.7);
  color: rgba(244, 249, 255, 0.96);
  padding: 10px 11px;
  outline: none;
  resize: vertical;
  font-size: 13px;
  line-height: 1.45;
}

.wm-guru-float-input:focus{
  border-color: rgba(126, 198, 255, 0.5);
  box-shadow: 0 0 0 3px rgba(98, 167, 245, 0.18);
}

.wm-guru-float-quickasks{
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.wm-guru-float-chip{
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(220, 232, 246, 0.88);
  padding: 0 10px;
  font-size: 11px;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
}

.wm-guru-float-actions{
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.wm-guru-float-actions .wm-btn{
  min-height: 34px;
}

.wm-guru-float-answer{
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
  padding: 11px;
  color: rgba(233, 242, 252, 0.92);
  white-space: pre-wrap;
  line-height: 1.5;
  font-size: 13px;
}

.wm-guru-float-muted{
  color: rgba(195, 214, 232, 0.76);
  font-size: 12px;
  line-height: 1.45;
}

@media (max-width: 720px){
  .wm-guru-float-page{
    padding: 0;
  }

  .wm-guru-float-panel{
    left: 10px;
    right: 10px;
    width: auto;
    height: min(74vh, 640px);
    min-width: 0;
    min-height: 360px;
    max-width: none;
    bottom: 10px;
    resize: none;
  }

  .wm-guru-float-launcher{
    right: 10px;
    bottom: 10px;
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
  const [panelOpen, setPanelOpen] = React.useState(false);
  const [contextOpen, setContextOpen] = React.useState(false);
  const [panelLayout, setPanelLayout] = React.useState<GuruPanelLayout>(() => readPanelLayout());
  const panelRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    writeState({ mode, question, context });
  }, [mode, question, context]);

  React.useEffect(() => {
    writePanelLayout(panelLayout);
  }, [panelLayout]);

  React.useEffect(() => {
    if (!panelOpen || !panelRef.current || typeof ResizeObserver === "undefined") {
      return undefined;
    }

    const node = panelRef.current;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const next = {
        width: Math.round(entry.contentRect.width),
        height: Math.round(entry.contentRect.height),
      };

      setPanelLayout((current) =>
        current.width === next.width && current.height === next.height ? current : next
      );
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, [panelOpen]);

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
    setContextOpen(true);
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
      setPanelOpen(true);
      return;
    }

    setPanelOpen(true);
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

  const resetPanelSize = React.useCallback(() => {
    setPanelLayout(DEFAULT_PANEL_LAYOUT);
  }, []);

  return (
    <div className="wm-guru-float-page">
      <style>{pageStyles}</style>

      <div className="wm-guru-float-page__hint">
        Guru is a floating helper. Open it when needed, then resize from the lower-right corner.
      </div>

      {!panelOpen ? (
        <button
          type="button"
          className="wm-guru-float-launcher"
          onClick={() => setPanelOpen(true)}
        >
          Open Guru Helper
        </button>
      ) : null}

      {panelOpen ? (
        <aside
          ref={panelRef}
          className="wm-guru-float-panel"
          role="dialog"
          aria-label="Guru helper"
          aria-modal="false"
          style={{
            width: panelLayout.width,
            height: panelLayout.height,
          }}
        >
          <div className="wm-guru-float-panel__head">
            <div>
              <h2 className="wm-guru-float-panel__title">Guru Assistant</h2>
              <p className="wm-guru-float-panel__sub">{def.label} · {def.subtitle}</p>
            </div>
            <div className="wm-guru-float-panel__head-actions">
              <button className="wm-btn" type="button" onClick={resetPanelSize}>
                Reset size
              </button>
              <button className="wm-btn" type="button" onClick={() => setPanelOpen(false)}>
                Minimise
              </button>
            </div>
          </div>

          <div className="wm-guru-float-panel__body">
            <div className="wm-guru-float-resize-note">
              Tip: drag the lower-right corner to resize this helper window.
            </div>

            <div className="wm-guru-float-modes">
              {(Object.values(MODE_DEFS) as GuruModeDef[]).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`wm-guru-float-mode ${item.id === mode ? "is-active" : ""}`}
                  onClick={() => setMode(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="wm-guru-float-field">
              <label>Main question</label>
              <textarea
                className="wm-guru-float-input"
                value={question}
                rows={4}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder={def.placeholder}
              />
            </div>

            <div className="wm-guru-float-actions">
              <button className="wm-btn" type="button" onClick={() => navigate("/app/tools")}>Tool Hub</button>
              <button className="wm-btn wm-btn-primary" type="button" onClick={askLiveGuru} disabled={!hasContent || answerBusy}>
                {answerBusy ? "Thinking..." : "Ask Guru"}
              </button>
              <button className="wm-btn" type="button" onClick={copyPrompt} disabled={!hasContent}>Copy prompt</button>
              <button className="wm-btn" type="button" onClick={insertContextTemplate}>Context template</button>
              <button className="wm-btn" type="button" onClick={clearAll}>Clear</button>
            </div>

            <div className="wm-guru-float-quickasks">
              {def.quickAsks.map((ask) => (
                <button key={ask} type="button" className="wm-guru-float-chip" onClick={() => setQuestion(ask)}>
                  {ask}
                </button>
              ))}
            </div>

            <div className="wm-guru-float-actions">
              <button className="wm-guru-float-chip" type="button" onClick={() => setContextOpen((value) => !value)}>
                {contextOpen ? "Hide context" : "Add context"}
              </button>
              <div className="wm-guru-float-muted">
                {copiedAt ? `Prompt copied at ${copiedAt}.` : "Ask directly first, then add context if needed."}
              </div>
            </div>

            {contextOpen ? (
              <div className="wm-guru-float-field">
                <label>Optional context</label>
                <textarea
                  className="wm-guru-float-input"
                  value={context}
                  rows={5}
                  onChange={(event) => setContext(event.target.value)}
                  placeholder="Paste room notes, customer requirements, constraints, existing kit, or other context."
                />
              </div>
            ) : null}

            <div className="wm-guru-float-answer">
              {answerError ? (
                <div>{answerError}</div>
              ) : answer ? (
                <>
                  <div>{answer.text}</div>
                  <div className="wm-guru-float-muted" style={{ marginTop: 8 }}>
                    Confidence: {confidenceLabel(answer.confidence)}
                    {answeredAt ? ` · Updated at ${answeredAt}` : ""}
                  </div>
                </>
              ) : (
                "Ask Guru to generate an answer. It will appear here."
              )}
            </div>

            {answer?.sources && answer.sources.length > 0 ? (
              <div className="wm-guru-float-quickasks">
                {answer.sources.map((source) => (
                  source.to ? (
                    <button
                      key={`${source.title}_${source.to}`}
                      type="button"
                      className="wm-guru-float-chip"
                      onClick={() => navigate(source.to || "/app/tools")}
                    >
                      {source.title}
                    </button>
                  ) : source.url ? (
                    <a
                      key={`${source.title}_${source.url}`}
                      className="wm-guru-float-chip"
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
                <div className="wm-guru-float-muted">Detected WyreStorm SKUs:</div>
                <div className="wm-guru-float-quickasks">
                  {suggestedSkus.map((item) => (
                    <span key={item.sku} className="wm-guru-float-chip">{item.sku}</span>
                  ))}
                </div>
                <div className="wm-guru-float-actions">
                  <button type="button" className="wm-btn wm-btn-primary" onClick={sendSuggestedSkusToProject}>
                    Send to active project
                  </button>
                  <button type="button" className="wm-btn" onClick={sendSuggestedSkusToProposal}>
                    Send to proposal BOM
                  </button>
                </div>
              </>
            ) : null}

            {transferMessage ? <div className="wm-guru-float-muted">{transferMessage}</div> : null}
          </div>
        </aside>
      ) : null}
    </div>
  );
}
