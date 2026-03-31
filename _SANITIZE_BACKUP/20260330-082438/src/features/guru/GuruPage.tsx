import * as React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { Bot } from "lucide-react";
import { askGuru, type GuruAnswer, type GuruMode as ApiGuruMode } from "@/features/ai/guru/guruApi";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import {
  getActiveProject,
  subscribeProjects,
  updateProject,
  type StoredProject,
} from "@/features/projects/projectStore";
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

type GuruHistoryEntry = {
  id: string;
  projectId: string | null;
  question: string;
  context: string;
  mode: GuruMode;
  answeredAt: string;
  status: string;
  answer: GuruAnswer;
};

type GuruAnswerSession = {
  combinedQuestion: string;
  contextText: string;
  apiMode: ApiGuruMode;
  projectId: string | null;
  discoverySignature: string;
  usedDiscovery: boolean;
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
const HISTORY_STORAGE_KEY = "wm_guru_history_v1";
const PANEL_LAYOUT_KEY = "wm_guru_panel_layout_v1";
const PANEL_POSITION_KEY = "wm_guru_panel_position_v1";
const LAUNCHER_POSITION_KEY = "wm_guru_launcher_position_v1";
const DEFAULT_PANEL_LAYOUT: GuruPanelLayout = { width: 448, height: 580 };
const DEFAULT_ROUTE_PANEL_LAYOUT: GuruPanelLayout = { width: 720, height: 680 };
const PANEL_MIN_WIDTH = 320;
const PANEL_MIN_HEIGHT = 392;
const PANEL_VIEWPORT_MARGIN = 6;
const LAUNCHER_SIZE = 46;
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

function guruHistoryStorageKey(projectId: string | null): string {
  return `${HISTORY_STORAGE_KEY}:${projectId ?? "global"}`;
}

function readGuruHistory(projectId: string | null): GuruHistoryEntry[] {
  try {
    const raw = localStorage.getItem(guruHistoryStorageKey(projectId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as GuruHistoryEntry[];
    return Array.isArray(parsed) ? parsed.slice(0, 8) : [];
  } catch {
    return [];
  }
}

function writeGuruHistory(projectId: string | null, history: GuruHistoryEntry[]) {
  try {
    localStorage.setItem(guruHistoryStorageKey(projectId), JSON.stringify(history.slice(0, 8)));
  } catch {
  }
}

function makeGuruHistoryEntryId(): string {
  return `guru_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function buildGuruCombinedQuestion(question: string, context: string): string {
  const primaryQuestion = question.trim();
  const contextText = context.trim();
  return contextText
    ? `${primaryQuestion || "Use the following context to answer the request."}\n\nContext:\n${contextText}`
    : primaryQuestion;
}

function buildDiscoverySignature(project: StoredProject | null | undefined): string {
  try {
    return JSON.stringify(project?.discovery ?? null);
  } catch {
    return "";
  }
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

function confidenceRank(value: GuruAnswer["confidence"]): number {
  if (value === "high") return 3;
  if (value === "medium") return 2;
  if (value === "low") return 1;
  return 0;
}

function buildAutoRefreshStatus(
  previous: GuruAnswer | null,
  next: GuruAnswer,
): string {
  if (!previous) {
    return "Updated from the latest Discovery inputs.";
  }

  const changes: string[] = [];
  const previousConfidence = confidenceLabel(previous.confidence);
  const nextConfidence = confidenceLabel(next.confidence);

  if (previous.confidence !== next.confidence) {
    changes.push(`Confidence moved ${previousConfidence} -> ${nextConfidence}.`);
  }

  const previousHeadline = previous.explanation?.headline?.trim() ?? "";
  const nextHeadline = next.explanation?.headline?.trim() ?? "";
  if (previousHeadline && nextHeadline && previousHeadline !== nextHeadline) {
    changes.push(`Lead direction updated to ${nextHeadline}`);
  }

  const previousMissing = previous.explanation?.whatsMissing?.length ?? 0;
  const nextMissing = next.explanation?.whatsMissing?.length ?? 0;
  if (previousMissing !== nextMissing) {
    if (nextMissing < previousMissing) {
      changes.push(`Missing inputs reduced ${previousMissing} -> ${nextMissing}.`);
    } else {
      changes.push(`Missing inputs changed ${previousMissing} -> ${nextMissing}.`);
    }
  }

  if (changes.length === 0 && confidenceRank(next.confidence) > confidenceRank(previous.confidence)) {
    changes.push(`Confidence improved to ${nextConfidence}.`);
  }

  return changes.length > 0
    ? `Updated from the latest Discovery inputs. ${changes.join(" ")}`
    : "Updated from the latest Discovery inputs.";
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

function defaultRoutePanelPosition(layout: GuruPanelLayout): GuruPanelPosition {
  if (typeof window === "undefined") {
    return { left: 32, top: 96 };
  }

  return {
    left: Math.max(PANEL_VIEWPORT_MARGIN, Math.round((window.innerWidth - layout.width) / 2)),
    top: Math.max(92, Math.round((window.innerHeight - layout.height) / 2)),
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

.wm-guru-float-panel.is-route{
  min-width: min(520px, calc(100vw - 32px));
  min-height: min(520px, calc(100dvh - 48px));
  max-width: calc(100vw - 40px);
  max-height: calc(100dvh - 48px);
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

.wm-guru-float-panel__body{
  overflow: auto;
  padding: 10px 12px 12px;
  display: grid;
  gap: 10px;
  background: linear-gradient(180deg, rgb(21, 24, 32), rgb(14, 18, 25));
}

.wm-guru-float-modes{
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
  gap: 6px;
}

.wm-guru-float-mode{
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  padding: 6px 10px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(228, 239, 251, 0.88);
  font-size: 12px;
  font-weight:600;
  line-height: 1.25;
  text-align: center;
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
  font-weight:600;
}

.wm-guru-float-promptHint{
  color: rgba(195, 214, 232, 0.78);
  font-size: 11px;
  line-height: 1.4;
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
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 6px;
}

.wm-guru-float-chip{
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  min-height: 30px;
  width: 100%;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(220, 232, 246, 0.88);
  padding: 6px 10px;
  font-size: 11px;
  font-weight:600;
  line-height: 1.25;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
}

.wm-guru-float-actions{
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.wm-guru-float-actions--primary{
  display: grid;
  gap: 8px;
}

.wm-guru-float-actions--support{
  display: grid;
  grid-template-columns: repeat(3, max-content) minmax(0, 1fr);
  align-items: center;
  gap: 6px 8px;
}

.wm-guru-float-actions--support .wm-guru-float-chip{
  width: auto;
}

.wm-guru-float-actions--support .wm-guru-float-muted{
  margin-left: 0;
  justify-self: end;
  text-align: right;
}

.wm-guru-float-actions .wm-btn{
  min-height: 34px;
}

.wm-guru-submit{
  width: 100%;
  min-height: 42px !important;
  justify-content: center;
  font-size: 14px;
  font-weight: 800;
  color: #fff8ef !important;
  background: linear-gradient(135deg, #ef852a, #d05819) !important;
  text-shadow: 0 1px 0 rgba(86, 37, 9, 0.4);
  box-shadow: 0 10px 24px rgba(236, 123, 39, 0.24) !important;
}

.wm-guru-submit:disabled{
  color: rgba(255, 248, 239, 0.84) !important;
  background: linear-gradient(135deg, rgba(239, 133, 42, 0.72), rgba(208, 88, 25, 0.72)) !important;
  opacity: 0.78;
  cursor: not-allowed;
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

.wm-guru-float-explain{
  display: grid;
  gap: 8px;
}

.wm-guru-float-explain-grid{
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 8px;
}

.wm-guru-float-explain-card{
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: linear-gradient(180deg, rgba(17, 29, 44, 0.92), rgba(11, 19, 31, 0.94));
  padding: 10px 11px;
  display: grid;
  gap: 6px;
}

.wm-guru-float-explain-card--confidence{
  border-color: rgba(115, 205, 176, 0.34);
  background: linear-gradient(180deg, rgba(19, 47, 48, 0.94), rgba(12, 23, 31, 0.96));
}

.wm-guru-float-explain-card--why{
  border-color: rgba(100, 176, 255, 0.3);
}

.wm-guru-float-explain-card--missing{
  border-color: rgba(255, 191, 114, 0.3);
}

.wm-guru-float-explain-label{
  color: rgba(191, 210, 233, 0.74);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.wm-guru-float-explain-headline{
  color: rgba(243, 249, 255, 0.96);
  font-size: 14px;
  font-weight:600;
  line-height: 1.4;
}

.wm-guru-float-explain-list{
  margin: 0;
  padding-left: 16px;
  color: rgba(220, 232, 246, 0.9);
  font-size: 12px;
  line-height: 1.5;
}

.wm-guru-float-explain-list li + li{
  margin-top: 4px;
}

.wm-guru-float-explain-actions{
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.wm-guru-float-history{
  display: grid;
  gap: 8px;
}

.wm-guru-float-historyHead{
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.wm-guru-float-historyList{
  display: grid;
  gap: 6px;
}

.wm-guru-float-historyItem{
  width: 100%;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
  padding: 9px 10px;
  text-align: left;
  display: grid;
  gap: 4px;
  cursor: pointer;
}

.wm-guru-float-historyItem:hover{
  border-color: rgba(117, 194, 255, 0.28);
  background: rgba(18, 32, 49, 0.68);
}

.wm-guru-float-historyMeta{
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: rgba(190, 210, 233, 0.76);
  font-size: 11px;
  line-height: 1.4;
}

.wm-guru-float-historyQuestion{
  color: rgba(236, 244, 252, 0.94);
  font-size: 12px;
  font-weight:600;
  line-height: 1.45;
}

.wm-guru-float-historySummary{
  color: rgba(196, 214, 235, 0.8);
  font-size: 11px;
  line-height: 1.45;
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

/* Modern density pass: slimmer, calmer assistant geometry. */
.wm-guru-float-page{
  --wm-guru-route-column: 64ch;
}

.wm-guru-float-launcher{
  width: 46px;
  height: 46px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: linear-gradient(180deg, rgba(42, 48, 69, 0.96), rgba(20, 24, 35, 0.98));
  color: rgba(243, 247, 255, 0.94);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    0 16px 34px rgba(0, 0, 0, 0.28);
}

.wm-guru-float-launcher.is-open{
  border-color: rgba(132, 141, 255, 0.22);
  background: linear-gradient(180deg, rgba(69, 74, 117, 0.96), rgba(34, 38, 59, 0.98));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    0 18px 36px rgba(42, 46, 94, 0.24);
}

.wm-guru-float-panel{
  width: min(460px, calc(100vw - 28px));
  height: min(600px, calc(100dvh - 92px));
  min-width: min(320px, calc(100vw - 28px));
  min-height: min(392px, calc(100dvh - 28px));
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: linear-gradient(180deg, rgba(23, 24, 31, 0.98), rgba(13, 14, 19, 0.98));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 24px 56px rgba(0, 0, 0, 0.32);
}

.wm-guru-float-panel.is-route{
  min-width: min(640px, calc(100vw - 56px));
  min-height: min(520px, calc(100dvh - 72px));
  max-width: calc(100vw - 48px);
  max-height: calc(100dvh - 72px);
}

.wm-guru-float-panel__head{
  gap: 10px;
  padding: 12px 14px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  background: linear-gradient(180deg, rgba(28, 30, 40, 0.98), rgba(18, 20, 28, 0.98));
}

.wm-guru-float-panel__dragzone{
  gap: 3px;
}

.wm-guru-float-panel__title{
  font-size: 16px;
  font-weight: 620;
  letter-spacing: -0.02em;
}

.wm-guru-float-panel__sub{
  margin-top: 2px;
  font-size: 11px;
  color: rgba(205, 212, 224, 0.68);
}

.wm-guru-float-panel__head-actions .wm-btn{
  min-height: 32px;
  padding-inline: 11px;
  border-radius: 999px;
  font-size: 11px;
}

.wm-guru-float-panel__body{
  gap: 12px;
  padding: 12px;
  background: linear-gradient(180deg, rgba(16, 17, 24, 0.98), rgba(12, 13, 18, 1));
}

.wm-guru-float-panel.is-route .wm-guru-float-panel__body{
  justify-items: start;
  padding-inline: 18px;
  padding-bottom: 18px;
}

.wm-guru-float-panel.is-route .wm-guru-float-panel__body > *{
  width: min(100%, var(--wm-guru-route-column));
}

.wm-guru-float-modes{
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.wm-guru-float-mode{
  min-height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.03);
  color: rgba(228, 239, 251, 0.8);
  font-size: 11px;
  font-weight: 600;
}

.wm-guru-float-mode.is-active{
  border-color: rgba(132, 141, 255, 0.3);
  background: linear-gradient(180deg, rgba(71, 74, 122, 0.74), rgba(43, 46, 82, 0.84));
  color: rgba(248, 250, 255, 0.96);
}

.wm-guru-float-field{
  gap: 5px;
}

.wm-guru-float-field label{
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(202, 207, 219, 0.76);
}

.wm-guru-float-promptHint,
.wm-guru-float-muted{
  font-size: 11px;
  line-height: 1.45;
  color: rgba(195, 201, 214, 0.72);
}

.wm-guru-float-field--question .wm-guru-float-promptHint{
  max-width: 54ch;
}

.wm-guru-float-input{
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.025);
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.45;
  resize: vertical;
}

.wm-guru-float-field--question .wm-guru-float-input{
  min-height: 74px;
}

.wm-guru-float-field--context .wm-guru-float-input{
  min-height: 92px;
}

.wm-guru-float-actions{
  gap: 8px;
}

.wm-guru-float-actions--primary{
  align-items: flex-start;
}

.wm-guru-float-actions--support{
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.wm-guru-float-actions--support .wm-guru-float-muted{
  width: 100%;
  margin-top: 2px;
  text-align: left;
}

.wm-guru-float-quickasks{
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.wm-guru-float-chip{
  min-height: 30px;
  width: auto;
  max-width: 100%;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 600;
}

.wm-guru-submit{
  width: fit-content;
  min-width: 132px;
  min-height: 36px !important;
  padding-inline: 16px;
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(107, 97, 255, 0.92), rgba(88, 120, 255, 0.88)) !important;
  color: #f9f7ff !important;
  text-shadow: none;
  box-shadow: 0 12px 24px rgba(81, 92, 210, 0.22) !important;
}

.wm-guru-float-answer{
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.028);
  padding: 12px 13px;
  font-size: 13px;
}

.wm-guru-float-disclosure{
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.022);
  padding: 12px;
}

.wm-guru-float-disclosure__summary{
  list-style: none;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  cursor: pointer;
}

.wm-guru-float-disclosure__summary::-webkit-details-marker{
  display: none;
}

.wm-guru-float-disclosure__title{
  display: grid;
  gap: 2px;
}

.wm-guru-float-disclosure__label{
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(206, 212, 224, 0.78);
}

.wm-guru-float-disclosure__hint{
  font-size: 11px;
  line-height: 1.4;
  color: rgba(190, 197, 210, 0.68);
}

.wm-guru-float-disclosure__summary::after{
  content: "Expand";
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(243, 247, 255, 0.86);
  font-size: 11px;
  font-weight: 600;
}

.wm-guru-float-disclosure[open] .wm-guru-float-disclosure__summary::after{
  content: "Collapse";
}

.wm-guru-float-disclosure__body{
  margin-top: 10px;
  display: grid;
  gap: 10px;
}

.wm-guru-float-explain-grid{
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.wm-guru-float-explain-card{
  border-radius: 16px;
  padding: 10px;
}

.wm-guru-float-history{
  gap: 10px;
}

.wm-guru-float-historyItem{
  border-radius: 16px;
  padding: 10px 11px;
}

@media (max-width: 900px){
  .wm-guru-float-modes,
  .wm-guru-float-quickasks,
  .wm-guru-float-actions--support{
    grid-template-columns: 1fr;
  }

  .wm-guru-float-actions--support .wm-guru-float-muted{
    justify-self: start;
    text-align: left;
  }

  .wm-guru-float-page{
    padding: 0;
  }

  .wm-guru-float-panel{
    left: 12px;
    right: 12px;
    width: auto;
    height: min(72dvh, 560px);
    min-width: 0;
    min-height: 360px;
    max-width: none;
    bottom: 12px;
  }

  .wm-guru-float-panel__dragzone{
    cursor: default;
  }

  .wm-guru-float-panel__corner{
    display: none;
  }

  .wm-guru-float-panel.is-route{
    left: 12px;
    right: 12px;
    top: 78px;
    bottom: auto;
    width: auto;
    height: calc(100dvh - 96px);
    max-width: none;
    max-height: calc(100dvh - 84px);
    transform: none;
  }

  .wm-guru-float-panel.is-route .wm-guru-float-panel__body{
    padding-inline: 12px;
  }

  .wm-guru-float-panel.is-route .wm-guru-float-panel__body > *{
    width: 100%;
  }

  .wm-guru-submit{
    width: 100%;
  }

  .wm-guru-float-launcher{
    right: 12px;
    bottom: 12px;
  }
}
`;

export default function GuruPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const isGuruRoute = location.pathname.startsWith("/app/tools/guru");
  const activeProject = React.useSyncExternalStore(
    subscribeProjects,
    () => getActiveProject() ?? null,
    () => null,
  );

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
  const [answerBusy, setAnswerBusy] = React.useState(false);
  const [answerError, setAnswerError] = React.useState("");
  const [answer, setAnswer] = React.useState<GuruAnswer | null>(null);
  const [answeredAt, setAnsweredAt] = React.useState("");
  const [answerStatus, setAnswerStatus] = React.useState("");
  const [transferMessage, setTransferMessage] = React.useState("");
  const [lastAskedSession, setLastAskedSession] = React.useState<GuruAnswerSession | null>(null);
  const [historyEntries, setHistoryEntries] = React.useState<GuruHistoryEntry[]>(() =>
    readGuruHistory(activeProject?.id ?? null),
  );
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
    typeof window !== "undefined" ? window.innerWidth <= 900 : false,
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
  const latestAnswerRef = React.useRef<GuruAnswer | null>(null);

  React.useEffect(() => {
    latestAnswerRef.current = answer;
  }, [answer]);

  React.useEffect(() => {
    writeState({ mode, question, context });
  }, [mode, question, context]);

  React.useEffect(() => {
    setHistoryEntries(readGuruHistory(activeProject?.id ?? null));
  }, [activeProject?.id]);

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
      const compact = window.innerWidth <= 900;
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
    if (!isGuruRoute) return;
    setPanelOpen(true);
    if (isCompactViewport) return;
    const nextLayout = clampLayoutToViewport(DEFAULT_ROUTE_PANEL_LAYOUT);
    setPanelLayout(nextLayout);
    setPanelPosition(clampPositionToViewport(defaultRoutePanelPosition(nextLayout), nextLayout));
  }, [clampLayoutToViewport, clampPositionToViewport, isCompactViewport, isGuruRoute]);

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
      if (isGuruRoute || isCompactViewport || event.button !== 0) return;
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
    [isCompactViewport, isGuruRoute, launcherPosition.left, launcherPosition.top],
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
  const hasContent = question.trim().length > 0 || context.trim().length > 0;
  const suggestedSkus = React.useMemo(() => normalizeSuggestedSkus(answer), [answer]);
  const explanation = answer?.explanation ?? null;
  const answerSources = answer?.sources ?? [];
  const hasMoreInformation = Boolean(
    explanation
    || answerSources.length > 0
    || suggestedSkus.length > 0,
  );
  const activeDiscoverySignature = React.useMemo(
    () => buildDiscoverySignature(activeProject),
    [activeProject],
  );

  const clearAll = () => {
    setQuestion("");
    setContext("");
    setContextOpen(false);
    setAnswerError("");
    setAnswer(null);
    setAnsweredAt("");
    setAnswerStatus("");
    setLastAskedSession(null);
    setTransferMessage("");
  };

  const pushHistoryEntry = React.useCallback(
    (entry: Omit<GuruHistoryEntry, "id">) => {
      const projectId = entry.projectId ?? null;
      setHistoryEntries((previous) => {
        const next = [
          {
            ...entry,
            id: makeGuruHistoryEntryId(),
          },
          ...previous,
        ].slice(0, 8);
        writeGuruHistory(projectId, next);
        return next;
      });
    },
    [],
  );

  const restoreHistoryEntry = React.useCallback((entry: GuruHistoryEntry) => {
    setMode(entry.mode);
    setQuestion(entry.question);
    setContext(entry.context);
    setContextOpen(Boolean(entry.context.trim()));
    setAnswer(entry.answer);
    setAnsweredAt(entry.answeredAt);
    setAnswerStatus(entry.status);
    setAnswerError("");
    setTransferMessage("");
    setPanelOpen(true);
  }, []);

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

  const runGuruQuery = React.useCallback(async (
    params: {
      combinedQuestion: string;
      contextText: string;
      apiMode: ApiGuruMode;
      project: StoredProject | null;
      autoRefresh?: boolean;
    },
  ) => {
    if (!params.combinedQuestion.trim()) {
      setAnswerError("Add a question or context before asking Guru.");
      setAnswer(null);
      setPanelOpen(true);
      return;
    }

    setPanelOpen(true);
    setAnswerBusy(true);
    if (!params.autoRefresh) {
      setAnswerError("");
      setTransferMessage("");
      setAnswerStatus("");
    }
    try {
      const result = await askGuru(params.combinedQuestion, {
        mode: params.apiMode,
        notes: params.contextText || undefined,
        discovery: params.project?.discovery ?? null,
      });
      const answeredTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const refreshStatus = params.autoRefresh
        ? buildAutoRefreshStatus(latestAnswerRef.current, result)
        : "";
      setAnswer(result);
      setAnsweredAt(answeredTime);
      setLastAskedSession({
        combinedQuestion: params.combinedQuestion,
        contextText: params.contextText,
        apiMode: params.apiMode,
        projectId: params.project?.id ?? null,
        discoverySignature: buildDiscoverySignature(params.project),
        usedDiscovery: Boolean(params.project?.discovery),
      });
      if (params.autoRefresh) {
        setAnswerStatus(refreshStatus);
      }
      pushHistoryEntry({
        projectId: params.project?.id ?? null,
        question,
        context: params.contextText,
        mode,
        answeredAt: answeredTime,
        status: refreshStatus,
        answer: result,
      });
    } catch {
      if (!params.autoRefresh) {
        setAnswerError("Guru request failed. Retry, or open diagnostics if this persists.");
        setAnswer(null);
      }
    } finally {
      setAnswerBusy(false);
    }
  }, [mode, pushHistoryEntry, question]);

  const askLiveGuru = React.useCallback(async () => {
    const contextText = context.trim();
    const combined = buildGuruCombinedQuestion(question, contextText);

    await runGuruQuery({
      combinedQuestion: combined,
      contextText,
      apiMode: mapModeToApiMode(mode),
      project: activeProject,
    });
  }, [activeProject, context, mode, question, runGuruQuery]);

  React.useEffect(() => {
    if (answerBusy || !lastAskedSession?.usedDiscovery) return;
    if ((activeProject?.id ?? null) !== lastAskedSession.projectId) return;
    if (activeDiscoverySignature === lastAskedSession.discoverySignature) return;

    const currentCombined = buildGuruCombinedQuestion(question, context);
    if (currentCombined.trim() !== lastAskedSession.combinedQuestion.trim()) return;

    void runGuruQuery({
      combinedQuestion: lastAskedSession.combinedQuestion,
      contextText: lastAskedSession.contextText,
      apiMode: lastAskedSession.apiMode,
      project: activeProject,
      autoRefresh: true,
    });
  }, [
    activeDiscoverySignature,
    activeProject,
    answerBusy,
    context,
    lastAskedSession,
    question,
    runGuruQuery,
  ]);

  const handleQuestionKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && !answerBusy) {
        event.preventDefault();
        void askLiveGuru();
      }
    },
    [answerBusy, askLiveGuru],
  );

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

  const openDiscoveryHandoff = React.useCallback(
    (item: NonNullable<NonNullable<GuruAnswer["explanation"]>["handoffItems"]>[number]) => {
      navigate(WM_ROUTES.discovery, {
        state: {
          focusStep: item.step,
          focusQuestionId: item.questionId,
        },
      });
    },
    [navigate],
  );

  const resetPanelSize = React.useCallback(() => {
    const nextLayout = clampLayoutToViewport(isGuruRoute ? DEFAULT_ROUTE_PANEL_LAYOUT : DEFAULT_PANEL_LAYOUT);
    setPanelLayout(nextLayout);
    setPanelPosition((current) =>
      isGuruRoute
        ? clampPositionToViewport(defaultRoutePanelPosition(nextLayout), nextLayout)
        : clampPositionToViewport(current, nextLayout),
    );
  }, [clampLayoutToViewport, clampPositionToViewport, isGuruRoute]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="wm-guru-float-page">
      <style>{pageStyles}</style>

      {!isGuruRoute ? (
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
      ) : null}

      {panelOpen ? (
        <aside
          className={`wm-guru-float-panel${isGuruRoute ? " is-route" : ""}`}
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
              <p className="wm-guru-float-panel__sub">{def.label} | {def.subtitle}</p>
            </div>
            <div className="wm-guru-float-panel__head-actions">
              <button className="wm-btn" type="button" onClick={resetPanelSize}>
                Reset size
              </button>
              {!isGuruRoute ? (
                <>
                  <button className="wm-btn" type="button" onClick={() => setPanelOpen(false)}>
                    Close
                  </button>
                </>
              ) : null}
            </div>
          </div>

          <div className="wm-guru-float-panel__body">
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

            <div className="wm-guru-float-field wm-guru-float-field--question">
              <label>Ask Guru</label>
              <textarea
                className="wm-guru-float-input"
                value={question}
                rows={isGuruRoute ? 3 : 2}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={handleQuestionKeyDown}
                placeholder={def.placeholder}
              />
              <div className="wm-guru-float-promptHint">
                Start with the main question. Add extra context only if it helps narrow the advice. Press Ctrl+Enter to ask.
              </div>
            </div>

            <div className="wm-guru-float-actions wm-guru-float-actions--primary">
              <button className="wm-btn wm-btn-primary wm-guru-submit" type="button" onClick={askLiveGuru} disabled={!hasContent || answerBusy}>
                {answerBusy ? "Thinking..." : "Ask Guru"}
              </button>
              <div className="wm-guru-float-muted">
                {answerBusy
                  ? "Guru is working through your question."
                  : answeredAt
                    ? `Last updated at ${answeredAt}.`
                    : "Answer will appear below."}
              </div>
              {answerStatus ? (
                <div className="wm-guru-float-muted">{answerStatus}</div>
              ) : null}
            </div>

            <div className="wm-guru-float-actions wm-guru-float-actions--support">
              <button className="wm-guru-float-chip" type="button" onClick={() => setContextOpen((value) => !value)}>
                {contextOpen ? "Hide context" : "Add context"}
              </button>
              <button className="wm-guru-float-chip" type="button" onClick={insertContextTemplate}>
                Use context template
              </button>
              <button className="wm-guru-float-chip" type="button" onClick={clearAll}>
                Clear
              </button>
              <div className="wm-guru-float-muted">
                Keep it simple first, then add context if the answer needs tightening.
              </div>
            </div>

            <div className="wm-guru-float-quickasks">
              {def.quickAsks.map((ask) => (
                <button key={ask} type="button" className="wm-guru-float-chip" onClick={() => setQuestion(ask)}>
                  {ask}
                </button>
              ))}
            </div>

            {contextOpen ? (
              <div className="wm-guru-float-field wm-guru-float-field--context">
                <label>Optional context</label>
                <textarea
                  className="wm-guru-float-input"
                  value={context}
                  rows={4}
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
                    {answeredAt ? ` | Updated at ${answeredAt}` : ""}
                  </div>
                </>
              ) : (
                "Ask Guru to generate an answer. It will appear here."
              )}
            </div>

            {hasMoreInformation ? (
              <details className="wm-guru-float-disclosure">
                <summary className="wm-guru-float-disclosure__summary">
                  <span className="wm-guru-float-disclosure__title">
                    <span className="wm-guru-float-disclosure__label">More information</span>
                    <span className="wm-guru-float-disclosure__hint">
                      Supporting reasoning, follow-up links, and next-step actions.
                    </span>
                  </span>
                </summary>

                <div className="wm-guru-float-disclosure__body">
                  {answer && explanation ? (
                    <div className="wm-guru-float-explain">
                      <div className="wm-guru-float-explain-grid">
                        <article className="wm-guru-float-explain-card wm-guru-float-explain-card--confidence">
                          <div className="wm-guru-float-explain-label">Confidence</div>
                          <div className="wm-guru-float-explain-headline">
                            {confidenceLabel(answer.confidence)}
                          </div>
                          {explanation.headline ? (
                            <div className="wm-guru-float-muted">{explanation.headline}</div>
                          ) : null}
                        </article>

                        {explanation.why && explanation.why.length > 0 ? (
                          <article className="wm-guru-float-explain-card wm-guru-float-explain-card--why">
                            <div className="wm-guru-float-explain-label">Why This Answer</div>
                            <ul className="wm-guru-float-explain-list">
                              {explanation.why.map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ul>
                          </article>
                        ) : null}

                        {explanation.whatsMissing && explanation.whatsMissing.length > 0 ? (
                          <article className="wm-guru-float-explain-card wm-guru-float-explain-card--missing">
                            <div className="wm-guru-float-explain-label">What&apos;s Still Missing</div>
                            <ul className="wm-guru-float-explain-list">
                              {explanation.whatsMissing.map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ul>
                            {explanation.handoffItems && explanation.handoffItems.length > 0 ? (
                              <div className="wm-guru-float-explain-actions">
                                {explanation.handoffItems.map((item) => (
                                  <button
                                    key={`${item.step}:${item.questionId}`}
                                    type="button"
                                    className="wm-guru-float-chip"
                                    onClick={() => openDiscoveryHandoff(item)}
                                  >
                                    Open Step {item.step + 1}: {item.label}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </article>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {answerSources.length > 0 ? (
                    <div className="wm-guru-float-field">
                      <label>Supporting links</label>
                      <div className="wm-guru-float-quickasks">
                        {answerSources.map((source) => (
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
                    </div>
                  ) : null}

                  {suggestedSkus.length > 0 ? (
                    <div className="wm-guru-float-field">
                      <label>Detected WyreStorm SKUs</label>
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
                    </div>
                  ) : null}
                </div>
              </details>
            ) : null}

            {transferMessage ? <div className="wm-guru-float-muted">{transferMessage}</div> : null}

            {historyEntries.length > 0 ? (
              <details className="wm-guru-float-disclosure">
                <summary className="wm-guru-float-disclosure__summary">
                  <span className="wm-guru-float-disclosure__title">
                    <span className="wm-guru-float-disclosure__label">Recent history</span>
                    <span className="wm-guru-float-disclosure__hint">
                      {activeProject?.name ? `Project: ${activeProject.name}` : "General context"}
                    </span>
                  </span>
                </summary>

                <div className="wm-guru-float-disclosure__body">
                  <div className="wm-guru-float-history">
                    <div className="wm-guru-float-historyList">
                      {historyEntries.slice(0, 5).map((entry) => (
                        <button
                          key={entry.id}
                          type="button"
                          className="wm-guru-float-historyItem"
                          onClick={() => restoreHistoryEntry(entry)}
                        >
                          <div className="wm-guru-float-historyMeta">
                            <span>{entry.answeredAt}</span>
                            <span>{confidenceLabel(entry.answer.confidence)}</span>
                          </div>
                          <div className="wm-guru-float-historyQuestion">{entry.question || "Context-led Guru answer"}</div>
                          <div className="wm-guru-float-historySummary">
                            {entry.status || entry.answer.explanation?.headline || entry.answer.text.split("\n")[0]}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </details>
            ) : null}
          </div>
          <>
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
          </>
        </aside>
      ) : null}
    </div>,
    document.body
  );
}
