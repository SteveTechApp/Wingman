import * as React from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { Bot } from "lucide-react";
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

type GuruPanelPosition = {
  left: number;
  top: number;
};

type GuruLauncherPosition = {
  left: number;
  top: number;
};

type GuruResizeCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

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
const PANEL_POSITION_KEY = "wm_guru_panel_position_v1";
const LAUNCHER_POSITION_KEY = "wm_guru_launcher_position_v1";
const DEFAULT_PANEL_LAYOUT: GuruPanelLayout = { width: 520, height: 680 };
const PANEL_MIN_WIDTH = 360;
const PANEL_MIN_HEIGHT = 420;
const PANEL_VIEWPORT_MARGIN = 6;
const LAUNCHER_SIZE = 54;
const LAUNCHER_VIEWPORT_MARGIN = 8;

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
      width: Number.isFinite(width) && width >= PANEL_MIN_WIDTH ? width : DEFAULT_PANEL_LAYOUT.width,
      height: Number.isFinite(height) && height >= PANEL_MIN_HEIGHT ? height : DEFAULT_PANEL_LAYOUT.height,
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

function defaultPanelPosition(layout: GuruPanelLayout): GuruPanelPosition {
  if (typeof window === "undefined") {
    return { left: 16, top: 84 };
  }

  return {
    left: window.innerWidth - layout.width - 16,
    top: window.innerHeight - layout.height - 84,
  };
}

function readPanelPosition(layout: GuruPanelLayout): GuruPanelPosition {
  try {
    const fallback = defaultPanelPosition(layout);
    const raw = localStorage.getItem(PANEL_POSITION_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<GuruPanelPosition>;
    const left = Number(parsed.left);
    const top = Number(parsed.top);
    return {
      left: Number.isFinite(left) ? left : fallback.left,
      top: Number.isFinite(top) ? top : fallback.top,
    };
  } catch {
    return defaultPanelPosition(layout);
  }
}

function writePanelPosition(position: GuruPanelPosition) {
  try {
    localStorage.setItem(PANEL_POSITION_KEY, JSON.stringify(position));
  } catch {
  }
}

function defaultLauncherPosition(): GuruLauncherPosition {
  if (typeof window === "undefined") {
    return { left: 16, top: 16 };
  }

  return {
    left: window.innerWidth - LAUNCHER_SIZE - 16,
    top: window.innerHeight - LAUNCHER_SIZE - 16,
  };
}

function clampLauncherPosition(position: GuruLauncherPosition): GuruLauncherPosition {
  if (typeof window === "undefined") return position;
  const maxLeft = Math.max(LAUNCHER_VIEWPORT_MARGIN, window.innerWidth - LAUNCHER_SIZE - LAUNCHER_VIEWPORT_MARGIN);
  const maxTop = Math.max(LAUNCHER_VIEWPORT_MARGIN, window.innerHeight - LAUNCHER_SIZE - LAUNCHER_VIEWPORT_MARGIN);
  return {
    left: Math.min(maxLeft, Math.max(LAUNCHER_VIEWPORT_MARGIN, position.left)),
    top: Math.min(maxTop, Math.max(LAUNCHER_VIEWPORT_MARGIN, position.top)),
  };
}

function readLauncherPosition(): GuruLauncherPosition {
  try {
    const fallback = defaultLauncherPosition();
    const raw = localStorage.getItem(LAUNCHER_POSITION_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<GuruLauncherPosition>;
    const left = Number(parsed.left);
    const top = Number(parsed.top);
    return clampLauncherPosition({
      left: Number.isFinite(left) ? left : fallback.left,
      top: Number.isFinite(top) ? top : fallback.top,
    });
  } catch {
    return defaultLauncherPosition();
  }
}

function writeLauncherPosition(position: GuruLauncherPosition) {
  try {
    localStorage.setItem(LAUNCHER_POSITION_KEY, JSON.stringify(position));
  } catch {
  }
}

const pageStyles = `
.wm-guru-float-page{
  position: relative;
  min-height: 0;
  padding: 0;
  overflow: visible;
  pointer-events: none;
}

.wm-guru-float-launcher{
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 6002;
  width: 54px;
  height: 54px;
  border-radius: 50%;
  border: 1px solid rgba(255, 196, 124, 0.62);
  background: linear-gradient(135deg, rgba(239, 133, 42, 0.96), rgba(208, 88, 25, 0.96));
  color: rgba(255, 247, 234, 0.98);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow:
    0 0 0 1px rgba(255, 191, 118, 0.28) inset,
    0 0 30px rgba(236, 123, 39, 0.44),
    0 16px 36px rgba(4, 12, 24, 0.45);
  pointer-events: auto;
  touch-action: none;
}

.wm-guru-float-launcher.is-open{
  border-color: rgba(255, 220, 162, 0.76);
  background: linear-gradient(135deg, rgba(248, 146, 49, 0.98), rgba(219, 96, 28, 0.98));
  box-shadow:
    0 0 0 1px rgba(255, 212, 151, 0.36) inset,
    0 0 36px rgba(244, 136, 46, 0.58),
    0 18px 40px rgba(4, 12, 24, 0.48);
}

.wm-guru-float-launcher__icon{
  display: inline-flex;
  align-items: center;
  justify-content: center;
  filter: drop-shadow(0 0 8px rgba(255, 230, 195, 0.44));
}

.wm-guru-float-panel{
  position: fixed;
  right: 16px;
  bottom: 84px;
  z-index: 6001;
  width: min(520px, calc(100vw - 24px));
  height: min(680px, calc(100dvh - 96px));
  min-width: min(360px, calc(100vw - 24px));
  min-height: min(420px, calc(100dvh - 24px));
  max-width: calc(100vw - 12px);
  max-height: calc(100dvh - 12px);
  border-radius: 18px;
  border: 1px solid rgba(255, 183, 118, 0.56);
  background: linear-gradient(180deg, rgb(30, 21, 15), rgb(16, 20, 28));
  opacity: 1;
  box-shadow:
    0 0 0 1px rgba(255, 177, 107, 0.18) inset,
    0 0 34px rgba(238, 128, 43, 0.28),
    0 28px 56px rgba(0, 0, 0, 0.52);
  box-sizing: border-box;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  overflow: hidden;
  pointer-events: auto;
}

.wm-guru-float-panel__head{
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 14px 12px;
  border-bottom: 1px solid rgba(255, 194, 136, 0.2);
  background: linear-gradient(180deg, rgb(44, 26, 14), rgb(29, 26, 25));
}

.wm-guru-float-panel__dragzone{
  display: grid;
  gap: 4px;
  cursor: move;
  user-select: none;
  touch-action: none;
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
  background: linear-gradient(180deg, rgb(21, 24, 32), rgb(14, 18, 25));
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

.wm-guru-float-panel__corner{
  position: absolute;
  width: 16px;
  height: 16px;
  border: 0;
  padding: 0;
  background: transparent;
  z-index: 2;
}

.wm-guru-float-panel__corner::after{
  content: "";
  position: absolute;
  inset: 4px;
  border-color: rgba(158, 207, 255, 0.74);
}

.wm-guru-float-panel__corner--tl{
  top: 0;
  left: 0;
  cursor: nwse-resize;
}

.wm-guru-float-panel__corner--tl::after{
  border-top: 1px solid rgba(158, 207, 255, 0.74);
  border-left: 1px solid rgba(158, 207, 255, 0.74);
}

.wm-guru-float-panel__corner--tr{
  top: 0;
  right: 0;
  cursor: nesw-resize;
}

.wm-guru-float-panel__corner--tr::after{
  border-top: 1px solid rgba(158, 207, 255, 0.74);
  border-right: 1px solid rgba(158, 207, 255, 0.74);
}

.wm-guru-float-panel__corner--bl{
  bottom: 0;
  left: 0;
  cursor: nesw-resize;
}

.wm-guru-float-panel__corner--bl::after{
  border-bottom: 1px solid rgba(158, 207, 255, 0.74);
  border-left: 1px solid rgba(158, 207, 255, 0.74);
}

.wm-guru-float-panel__corner--br{
  bottom: 0;
  right: 0;
  cursor: nwse-resize;
}

.wm-guru-float-panel__corner--br::after{
  border-bottom: 1px solid rgba(158, 207, 255, 0.74);
  border-right: 1px solid rgba(158, 207, 255, 0.74);
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
  }

  .wm-guru-float-panel__dragzone{
    cursor: default;
  }

  .wm-guru-float-panel__corner{
    display: none;
  }

  .wm-guru-float-launcher{
    right: 10px;
    bottom: 10px;
  }
}
`;

export default function GuruPage() {
  const navigate = useNavigate();

  const clampLayoutToViewport = React.useCallback((layout: GuruPanelLayout): GuruPanelLayout => {
    if (typeof window === "undefined") return layout;
    const maxWidth = Math.max(280, window.innerWidth - 24);
    const maxHeight = Math.max(320, window.innerHeight - 24);
    const minWidth = Math.min(PANEL_MIN_WIDTH, maxWidth);
    const minHeight = Math.min(PANEL_MIN_HEIGHT, maxHeight);
    return {
      width: Math.min(maxWidth, Math.max(minWidth, layout.width)),
      height: Math.min(maxHeight, Math.max(minHeight, layout.height)),
    };
  }, []);

  const clampPositionToViewport = React.useCallback(
    (position: GuruPanelPosition, layout: GuruPanelLayout): GuruPanelPosition => {
      if (typeof window === "undefined") return position;
      const maxLeft = Math.max(PANEL_VIEWPORT_MARGIN, window.innerWidth - layout.width - PANEL_VIEWPORT_MARGIN);
      const maxTop = Math.max(PANEL_VIEWPORT_MARGIN, window.innerHeight - layout.height - PANEL_VIEWPORT_MARGIN);
      return {
        left: Math.min(maxLeft, Math.max(PANEL_VIEWPORT_MARGIN, position.left)),
        top: Math.min(maxTop, Math.max(PANEL_VIEWPORT_MARGIN, position.top)),
      };
    },
    [],
  );

  const calculateResizeGeometry = React.useCallback(
    (
      state: {
        corner: GuruResizeCorner;
        startX: number;
        startY: number;
        startLeft: number;
        startTop: number;
        startWidth: number;
        startHeight: number;
      },
      clientX: number,
      clientY: number,
    ): { layout: GuruPanelLayout; position: GuruPanelPosition } => {
      if (typeof window === "undefined") {
        return {
          layout: { width: state.startWidth, height: state.startHeight },
          position: { left: state.startLeft, top: state.startTop },
        };
      }

      const safeClamp = (value: number, minValue: number, maxValue: number) => {
        const upper = Math.max(minValue, maxValue);
        return Math.min(upper, Math.max(minValue, value));
      };

      const dx = clientX - state.startX;
      const dy = clientY - state.startY;
      const startRight = state.startLeft + state.startWidth;
      const startBottom = state.startTop + state.startHeight;
      const maxRight = window.innerWidth - PANEL_VIEWPORT_MARGIN;
      const maxBottom = window.innerHeight - PANEL_VIEWPORT_MARGIN;
      const minWidth = Math.min(PANEL_MIN_WIDTH, Math.max(280, window.innerWidth - PANEL_VIEWPORT_MARGIN * 2));
      const minHeight = Math.min(PANEL_MIN_HEIGHT, Math.max(320, window.innerHeight - PANEL_VIEWPORT_MARGIN * 2));

      let left = state.startLeft;
      let top = state.startTop;
      let width = state.startWidth;
      let height = state.startHeight;

      if (state.corner === "bottom-right") {
        const movingRight = safeClamp(startRight + dx, state.startLeft + minWidth, maxRight);
        const movingBottom = safeClamp(startBottom + dy, state.startTop + minHeight, maxBottom);
        width = movingRight - state.startLeft;
        height = movingBottom - state.startTop;
      } else if (state.corner === "top-left") {
        const movingLeft = safeClamp(state.startLeft + dx, PANEL_VIEWPORT_MARGIN, startRight - minWidth);
        const movingTop = safeClamp(state.startTop + dy, PANEL_VIEWPORT_MARGIN, startBottom - minHeight);
        left = movingLeft;
        top = movingTop;
        width = startRight - movingLeft;
        height = startBottom - movingTop;
      } else if (state.corner === "top-right") {
        const movingRight = safeClamp(startRight + dx, state.startLeft + minWidth, maxRight);
        const movingTop = safeClamp(state.startTop + dy, PANEL_VIEWPORT_MARGIN, startBottom - minHeight);
        top = movingTop;
        width = movingRight - state.startLeft;
        height = startBottom - movingTop;
      } else {
        const movingLeft = safeClamp(state.startLeft + dx, PANEL_VIEWPORT_MARGIN, startRight - minWidth);
        const movingBottom = safeClamp(startBottom + dy, state.startTop + minHeight, maxBottom);
        left = movingLeft;
        width = startRight - movingLeft;
        height = movingBottom - state.startTop;
      }

      return {
        layout: {
          width: Math.round(width),
          height: Math.round(height),
        },
        position: {
          left: Math.round(left),
          top: Math.round(top),
        },
      };
    },
    [],
  );

  const initial = React.useMemo(() => readState(), []);
  const initialPanelLayout = React.useMemo(
    () => clampLayoutToViewport(readPanelLayout()),
    [clampLayoutToViewport],
  );
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
  const [panelLayout, setPanelLayout] = React.useState<GuruPanelLayout>(initialPanelLayout);
  const [panelPosition, setPanelPosition] = React.useState<GuruPanelPosition>(() =>
    clampPositionToViewport(readPanelPosition(initialPanelLayout), initialPanelLayout),
  );
  const [launcherPosition, setLauncherPosition] = React.useState<GuruLauncherPosition>(() =>
    readLauncherPosition(),
  );
  const [isCompactViewport, setIsCompactViewport] = React.useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= 720 : false,
  );
  const dragRef = React.useRef<null | {
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
  }>(null);
  const resizeRef = React.useRef<null | {
    corner: GuruResizeCorner;
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
    startWidth: number;
    startHeight: number;
  }>(null);
  const launcherDragRef = React.useRef<null | {
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
    moved: boolean;
  }>(null);
  const suppressLauncherToggleRef = React.useRef(false);

  React.useEffect(() => {
    writeState({ mode, question, context });
  }, [mode, question, context]);

  React.useEffect(() => {
    writePanelLayout(panelLayout);
  }, [panelLayout]);

  React.useEffect(() => {
    writePanelPosition(panelPosition);
  }, [panelPosition]);

  React.useEffect(() => {
    writeLauncherPosition(launcherPosition);
  }, [launcherPosition]);

  React.useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleResize = () => {
      const compact = window.innerWidth <= 720;
      setIsCompactViewport(compact);
      setPanelLayout((currentLayout) => {
        const nextLayout = clampLayoutToViewport(currentLayout);
        setPanelPosition((currentPosition) => clampPositionToViewport(currentPosition, nextLayout));
        return nextLayout;
      });
      setLauncherPosition((currentPosition) => clampLauncherPosition(currentPosition));
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [clampLayoutToViewport, clampPositionToViewport]);

  React.useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const onPointerMove = (event: PointerEvent) => {
      if (!isCompactViewport && launcherDragRef.current) {
        const dx = event.clientX - launcherDragRef.current.startX;
        const dy = event.clientY - launcherDragRef.current.startY;
        if (!launcherDragRef.current.moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
          launcherDragRef.current.moved = true;
        }
        const next = clampLauncherPosition({
          left: launcherDragRef.current.startLeft + dx,
          top: launcherDragRef.current.startTop + dy,
        });
        setLauncherPosition((current) =>
          current.left === next.left && current.top === next.top ? current : next,
        );
        return;
      }

      if (isCompactViewport) return;

      if (dragRef.current) {
        const dx = event.clientX - dragRef.current.startX;
        const dy = event.clientY - dragRef.current.startY;
        const next = clampPositionToViewport(
          {
            left: dragRef.current.startLeft + dx,
            top: dragRef.current.startTop + dy,
          },
          panelLayout,
        );
        setPanelPosition((current) =>
          current.left === next.left && current.top === next.top ? current : next,
        );
        return;
      }

      if (resizeRef.current) {
        const next = calculateResizeGeometry(resizeRef.current, event.clientX, event.clientY);
        setPanelLayout((current) =>
          current.width === next.layout.width && current.height === next.layout.height
            ? current
            : next.layout,
        );
        setPanelPosition((current) =>
          current.left === next.position.left && current.top === next.position.top
            ? current
            : next.position,
        );
      }
    };

    const stopInteractions = () => {
      if (launcherDragRef.current?.moved) {
        suppressLauncherToggleRef.current = true;
      }
      launcherDragRef.current = null;
      dragRef.current = null;
      resizeRef.current = null;
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopInteractions);
    window.addEventListener("pointercancel", stopInteractions);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stopInteractions);
      window.removeEventListener("pointercancel", stopInteractions);
    };
  }, [calculateResizeGeometry, clampPositionToViewport, isCompactViewport, panelLayout]);

  const startLauncherDrag = React.useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (isCompactViewport || event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      launcherDragRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        startLeft: launcherPosition.left,
        startTop: launcherPosition.top,
        moved: false,
      };
    },
    [isCompactViewport, launcherPosition.left, launcherPosition.top],
  );

  const startPanelDrag = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (isCompactViewport || event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      dragRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        startLeft: panelPosition.left,
        startTop: panelPosition.top,
      };
    },
    [isCompactViewport, panelPosition.left, panelPosition.top],
  );

  const startPanelResize = React.useCallback(
    (corner: GuruResizeCorner) => (event: React.PointerEvent<HTMLButtonElement>) => {
      if (isCompactViewport || event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      resizeRef.current = {
        corner,
        startX: event.clientX,
        startY: event.clientY,
        startLeft: panelPosition.left,
        startTop: panelPosition.top,
        startWidth: panelLayout.width,
        startHeight: panelLayout.height,
      };
    },
    [isCompactViewport, panelLayout.height, panelLayout.width, panelPosition.left, panelPosition.top],
  );

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
    const nextLayout = clampLayoutToViewport(DEFAULT_PANEL_LAYOUT);
    setPanelLayout(nextLayout);
    setPanelPosition((current) => clampPositionToViewport(current, nextLayout));
  }, [clampLayoutToViewport, clampPositionToViewport]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="wm-guru-float-page">
      <style>{pageStyles}</style>

      <button
        type="button"
        className={`wm-guru-float-launcher ${panelOpen ? "is-open" : ""}`}
        onPointerDown={startLauncherDrag}
        onClick={() => {
          if (suppressLauncherToggleRef.current) {
            suppressLauncherToggleRef.current = false;
            return;
          }
          setPanelOpen((value) => !value);
        }}
        aria-label={panelOpen ? "Close Guru" : "Open Guru"}
        aria-expanded={panelOpen}
        title={panelOpen ? "Close Guru (drag to move)" : "Open Guru (drag to move)"}
        style={
          isCompactViewport
            ? undefined
            : {
                left: launcherPosition.left,
                top: launcherPosition.top,
                right: "auto",
                bottom: "auto",
              }
        }
      >
        <span className="wm-guru-float-launcher__icon">
          <Bot size={20} />
        </span>
      </button>

      {panelOpen ? (
        <aside
          className="wm-guru-float-panel"
          role="dialog"
          aria-label="Guru helper"
          aria-modal="false"
          style={
            isCompactViewport
              ? undefined
              : {
                  left: panelPosition.left,
                  top: panelPosition.top,
                  right: "auto",
                  bottom: "auto",
                  width: panelLayout.width,
                  height: panelLayout.height,
                }
          }
        >
          <div className="wm-guru-float-panel__head">
            <div className="wm-guru-float-panel__dragzone" onPointerDown={startPanelDrag}>
              <h2 className="wm-guru-float-panel__title">Guru Assistant</h2>
              <p className="wm-guru-float-panel__sub">{def.label} �f�?s· {def.subtitle}</p>
            </div>
            <div className="wm-guru-float-panel__head-actions">
              <button className="wm-btn" type="button" onClick={resetPanelSize}>
                Reset size
              </button>
              <button className="wm-btn" type="button" onClick={() => setPanelOpen(false)}>
                Close
              </button>
            </div>
          </div>

          <div className="wm-guru-float-panel__body">
            <div className="wm-guru-float-resize-note">
              Tip: drag this header to move Guru and resize from any corner.
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
              <button className="wm-btn wm-btn-primary wm-guru-submit" type="button" onClick={askLiveGuru} disabled={!hasContent || answerBusy}>
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
                    {answeredAt ? ` �f�?s· Updated at ${answeredAt}` : ""}
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
          <button
            type="button"
            tabIndex={-1}
            aria-label="Resize from top left"
            className="wm-guru-float-panel__corner wm-guru-float-panel__corner--tl"
            onPointerDown={startPanelResize("top-left")}
          />
          <button
            type="button"
            tabIndex={-1}
            aria-label="Resize from top right"
            className="wm-guru-float-panel__corner wm-guru-float-panel__corner--tr"
            onPointerDown={startPanelResize("top-right")}
          />
          <button
            type="button"
            tabIndex={-1}
            aria-label="Resize from bottom left"
            className="wm-guru-float-panel__corner wm-guru-float-panel__corner--bl"
            onPointerDown={startPanelResize("bottom-left")}
          />
          <button
            type="button"
            tabIndex={-1}
            aria-label="Resize from bottom right"
            className="wm-guru-float-panel__corner wm-guru-float-panel__corner--br"
            onPointerDown={startPanelResize("bottom-right")}
          />
        </aside>
      ) : null}
    </div>,
    document.body
  );
}
