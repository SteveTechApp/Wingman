import * as React from "react";
import AdvancedSignalPathPanel from "./AdvancedSignalPathPanel";
// src/features/discovery/DiscoveryWizardPage.tsx

import { useNavigate } from "react-router-dom";
import { LayoutGrid, ArrowRight, ChevronDown } from "lucide-react";
import {
  ensureActiveProject,
  getActiveProject,
  getActiveProjectId,
  getProjectById,
  updateProjectDiscovery,
} from "@/features/projects/projectStore";

export type DiscoveryProductFamily =
  | "Apollo"
  | "HDBaseT"
  | "AVoIP"
  | "Matrix"
  | "USB Extension"
  | "Video Wall";

export type DiscoveryRecord = {
  customer: string;
  site: string;
  roomName: string;
  applicationType: string;
  roomLengthM: string;
  roomWidthM: string;
  roomHeightM: string;
  cableDistanceM: string;
  displayLocation: string;
  sourceLocation: string;
  rackLocation: string;
  displayCount: string;
  sourceCount: string;
  usbNeeds: string;
  audioNeeds: string;
  controlNeeds: string;
  budgetBand: string;
  urgency: string;
  notes: string;
  recommendedFamilies: DiscoveryProductFamily[];
  recommendedNextTool: string;
  createdAt: string;
};

const STORAGE_KEY = "wm_discovery_seed_v2";

const APPLICATION_OPTIONS = [
  "Meeting room",
  "Boardroom",
  "Huddle room",
  "Training room",
  "Classroom",
  "Lecture space",
  "Control room",
  "Retail display",
  "Hospitality",
  "Video wall",
];

const DISPLAY_LOCATION_OPTIONS = [
  "Front wall",
  "Side wall",
  "Rear wall",
  "Ceiling mounted",
  "Projection screen",
  "LED wall",
  "Freestanding display",
  "Video wall array",
];

const SOURCE_POSITION_OPTIONS = [
  "Table",
  "Lectern",
  "Rack",
  "Floor box",
  "Wall plate",
  "Wireless/BYOD",
];

const RACK_LOCATION_OPTIONS = [
  "In-room rack",
  "Cupboard",
  "Remote comms room",
  "Under desk",
  "No rack",
];

const USB_OPTIONS = [
  "None",
  "BYOD (USB-C laptop)",
  "Camera",
  "USB extension",
  "Host switching",
  "Touch interface",
];

const AUDIO_OPTIONS = [
  "None",
  "Ceiling microphones",
  "Table microphones",
  "Speakers",
  "DSP required",
  "Audio breakout",
];

const CONTROL_OPTIONS = [
  "None",
  "Front panel control",
  "Touch panel control",
  "API / network control",
  "RS-232 control",
  "IP control",
];

const BUDGET_OPTIONS = ["Cost-led", "Balanced", "Premium"];

const URGENCY_OPTIONS = [
  "This week",
  "This month",
  "This quarter",
  "Urgent retrofit",
  "Future phase",
];

function nowIso(): string {
  return new Date().toISOString();
}

function emptyDiscoveryRecord(): DiscoveryRecord {
  return {
    customer: "",
    site: "",
    roomName: "",
    applicationType: "",
    roomLengthM: "",
    roomWidthM: "",
    roomHeightM: "",
    cableDistanceM: "",
    displayLocation: "",
    sourceLocation: "",
    rackLocation: "",
    displayCount: "",
    sourceCount: "",
    usbNeeds: "",
    audioNeeds: "",
    controlNeeds: "",
    budgetBand: "",
    urgency: "",
    notes: "",
    recommendedFamilies: [],
    recommendedNextTool: "/app/tools/catalog",
    createdAt: nowIso(),
  };
}

function safeNum(v: string): number | null {
  const n = Number(String(v || "").trim());
  return Number.isFinite(n) ? n : null;
}

function norm(v: string): string {
  return String(v || "").trim().toLowerCase();
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function computeRecommendations(record: DiscoveryRecord): {
  families: DiscoveryProductFamily[];
  why: Record<DiscoveryProductFamily, string[]>;
  nextTool: string;
} {
  const families: DiscoveryProductFamily[] = [];
  const why: Record<DiscoveryProductFamily, string[]> = {
    Apollo: [],
    HDBaseT: [],
    AVoIP: [],
    Matrix: [],
    "USB Extension": [],
    "Video Wall": [],
  };

  const app = norm(record.applicationType);
  const usb = norm(record.usbNeeds);
  const displayLoc = norm(record.displayLocation);

  const displayCount = safeNum(record.displayCount);
  const sourceCount = safeNum(record.sourceCount);
  const cable = safeNum(record.cableDistanceM);

  if (
    usb.includes("byod") ||
    usb.includes("usb-c") ||
    usb.includes("camera") ||
    usb.includes("host") ||
    app.includes("meeting") ||
    app.includes("board") ||
    app.includes("huddle") ||
    app.includes("collab")
  ) {
    families.push("Apollo");
    if (usb.includes("byod") || usb.includes("usb-c")) why.Apollo.push("USB-C/BYOD workflow selected.");
    if (usb.includes("camera") || usb.includes("host")) why.Apollo.push("USB device support or host switching indicated.");
    if (app.includes("meeting") || app.includes("board") || app.includes("huddle")) why.Apollo.push("Typical collaboration-room application.");
  }

  if (
    usb.includes("extension") ||
    usb.includes("camera") ||
    usb.includes("touch") ||
    usb.includes("peripheral")
  ) {
    families.push("USB Extension");
    why["USB Extension"].push("USB peripherals indicated, so extension may be required.");
  }

  if (cable !== null && cable >= 15) {
    families.push("HDBaseT");
    why.HDBaseT.push(`Cable route is ${cable}m, which suits point-to-point transport.`);
  }

  if (
    app.includes("video wall") ||
    displayLoc.includes("led") ||
    displayLoc.includes("video wall")
  ) {
    families.push("Video Wall");
    why["Video Wall"].push("Display type suggests LED/LCD wall planning requirements.");
  }

  const endpoints = (displayCount || 0) + (sourceCount || 0);
  if (
    (displayCount !== null && displayCount >= 3) ||
    (sourceCount !== null && sourceCount >= 3) ||
    endpoints >= 8
  ) {
    families.push("AVoIP");
    why.AVoIP.push("Higher endpoint count suggests scalable switching/distribution.");
  }

  if (
    displayCount !== null &&
    sourceCount !== null &&
    displayCount >= 2 &&
    sourceCount >= 2 &&
    displayCount <= 8 &&
    sourceCount <= 8 &&
    !families.includes("AVoIP")
  ) {
    families.push("Matrix");
    why.Matrix.push("Mid-scale fixed I/O suggests matrix switching.");
  }

  const finalFamilies = uniq(families) as DiscoveryProductFamily[];
  let nextTool = "/app/tools/catalog";
  if (finalFamilies.includes("Video Wall")) nextTool = "/app/tools/videowall";

  return { families: finalFamilies, why, nextTool };
}

type SelectOrCustomProps = {
  label: string;
  value: string;
  options: string[];
  placeholder?: string;
  onChange: (value: string) => void;
};

function SelectOrCustom({
  label,
  value,
  options,
  placeholder = "Select an option",
  onChange,
}: SelectOrCustomProps) {
  const isCustom = value !== "" && !options.includes(value);
  const selectValue = isCustom ? "__custom__" : value;

  return (
    <label className="wm-field">
      <div className="wm-field__label">{label}</div>

      <div className="wm-selectwrap">
        <select
          className="wm-input wm-select"
          value={selectValue}
          onChange={(e) => {
            const next = e.target.value;
            if (next === "__custom__") {
              if (!isCustom) onChange("");
              return;
            }
            onChange(next);
          }}
        >
          <option value="">{placeholder}</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
          <option value="__custom__">Custom...</option>
        </select>
        <ChevronDown size={16} className="wm-selecticon" />
      </div>

      {(isCustom || selectValue === "__custom__") && (
        <input
          className="wm-input"
          type="text"
          value={isCustom ? value : ""}
          placeholder="e.g: Enter custom value"
          onChange={(e) => onChange(e.target.value)}
          style={{ marginTop: 8 }}
        />
      )}
    </label>
  );
}

function SummaryRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="wm-srow">
      <div className="wm-srow__k">{k}</div>
      <div className="wm-srow__v">{v || "—"}</div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="wm-chip">{children}</span>;
}

export default function DiscoveryWizardPage() {
  const nav = useNavigate();
    const [showWhy, setShowWhy] = React.useState(false);
  const [saveTick, setSaveTick] = React.useState(0);
  const [tick, setTick] = React.useState<string>(() => {
    try { return localStorage.getItem("wm_projects_tick") || ""; } catch { return ""; }
  });

  const [record, setRecord] = React.useState<DiscoveryRecord>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyDiscoveryRecord();
      const parsed = JSON.parse(raw) as Partial<DiscoveryRecord>;
      return {
        ...emptyDiscoveryRecord(),
        ...parsed,
        recommendedFamilies: Array.isArray(parsed.recommendedFamilies)
          ? (parsed.recommendedFamilies as DiscoveryProductFamily[])
          : [],
        recommendedNextTool:
          typeof parsed.recommendedNextTool === "string"
            ? parsed.recommendedNextTool
            : "/app/tools/catalog",
        createdAt:
          typeof parsed.createdAt === "string" ? parsed.createdAt : nowIso(),
      };
    } catch {
      return emptyDiscoveryRecord();
    }
  });

  const rec = React.useMemo(() => computeRecommendations(record), [record]);
  const activeProject = React.useMemo(() => getActiveProject(), [saveTick, tick]);

    React.useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "wm_projects_tick") {
        try { setTick(localStorage.getItem("wm_projects_tick") || ""); } catch { setTick(""); }
      }
    };
    window.addEventListener("storage", onStorage);
    const t = window.setInterval(() => {
      try { setTick(localStorage.getItem("wm_projects_tick") || ""); } catch {}
    }, 800);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.clearInterval(t);
    };
  }, []);

  React.useEffect(() => {
    const id = getActiveProjectId();
    if (!id) return;

    const p = getProjectById(id);
    if (!p?.discovery) return;

    setRecord((prev) => {
      const prevKey = `${prev.customer}||${prev.site}||${prev.roomName}`.trim();
      const nextKey = `${p.discovery!.customer}||${p.discovery!.site}||${p.discovery!.roomName}`.trim();

      const isEmpty =
        !prev.customer &&
        !prev.site &&
        !prev.roomName &&
        !prev.applicationType &&
        !prev.displayLocation &&
        !prev.sourceLocation &&
        !prev.rackLocation &&
        !prev.displayCount &&
        !prev.sourceCount &&
        !prev.usbNeeds &&
        !prev.audioNeeds &&
        !prev.controlNeeds &&
        !prev.budgetBand &&
        !prev.urgency &&
        !prev.notes;

      if (!isEmpty && prevKey === nextKey) return prev;
      return { ...prev, ...p.discovery! };
    });
  }, [saveTick]);

    React.useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "wm_projects_tick") {
        try { setTick(localStorage.getItem("wm_projects_tick") || ""); } catch { setTick(""); }
      }
    };
    window.addEventListener("storage", onStorage);
    const t = window.setInterval(() => {
      try { setTick(localStorage.getItem("wm_projects_tick") || ""); } catch {}
    }, 800);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.clearInterval(t);
    };
  }, []);

  React.useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          ...record,
          recommendedFamilies: rec.families,
          recommendedNextTool: rec.nextTool,
        })
      );
    } catch {}
  }, [record, rec.families, rec.nextTool]);

  function updateRecord<K extends keyof DiscoveryRecord>(
    key: K,
    value: DiscoveryRecord[K]
  ) {
    setRecord((prev) => ({ ...prev, [key]: value }));
  }

  function clearAll() {
    const fresh = emptyDiscoveryRecord();
    setRecord(fresh);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    } catch {}
  }

  function buildPayload(): DiscoveryRecord {
    return {
      ...record,
      recommendedFamilies: rec.families,
      recommendedNextTool: rec.nextTool,
    };
  }

  function persistPayload(payload: DiscoveryRecord) {
    const project = ensureActiveProject({
      roomName: record.roomName,
      customer: record.customer,
      site: record.site,
    });

    updateProjectDiscovery(project.id, payload);
    setRecord(payload);
    setSaveTick((v) => v + 1);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {}
  }

  function saveSummary() {
    const payload = buildPayload();
    persistPayload(payload);
  }

  function saveAndNavigate(to: string) {
    const payload = buildPayload();
    persistPayload(payload);
    nav(to);
  }

  function goToSuggestedTool() {
    saveAndNavigate(rec.nextTool);
  }

  return (
    <div className="wm-page">
      <style>{`
        .wm-page{
          min-height: 100%;
          padding: 16px;
          color: rgba(255,255,255,0.96);
        }
        .wm-head{
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap: 8px;
          margin-bottom: 14px;
        }
        .wm-head__left{
          display:flex;
          align-items:flex-start;
          gap: 10px;
          min-width: 0;
        }
        .wm-title{
          font-weight: 900;
          font-size: 18px;
          line-height: 1.15;
          color: rgba(248,250,255,0.98);
        }
        .wm-sub{
          color: rgba(224,232,244,0.94);
          font-size: 12px;
          line-height: 1.25;
          margin-top: 3px;
          max-width: 540px;
        }
        .wm-grid{
          display:grid;
          grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.9fr);
          gap: 14px;
          align-items:start;
        }
        @media (max-width: 1100px){
          .wm-grid{ grid-template-columns: 1fr; }
        }
        .wm-card{
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(16,22,32,0.72);
          border-radius: 16px;
          padding: 14px;
          overflow: hidden;
          box-shadow: 0 0 0 1px rgba(0,0,0,0.12) inset;
        }
        .wm-card + .wm-card{
          margin-top: 14px;
        }
        .wm-card__h{
          font-weight: 800;
          margin-bottom: 10px;
          color: rgba(248,250,255,0.98);
        }
        .wm-formgrid{
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        @media (max-width: 900px){
          .wm-formgrid{ grid-template-columns: 1fr; }
        }
        .wm-field{
          display:block;
          min-width: 0;
        }
        .wm-field__label{
          font-size: 11px;
          opacity: 0.96;
          color: rgba(224,232,244,0.94);
          letter-spacing: .06em;
          text-transform: uppercase;
          margin: 0 0 6px;
        }
        .wm-input{
          width: 100%;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(255,255,255,0.05);
          color: rgba(248,250,255,0.98);
          padding: 10px 10px;
          outline: none;
          font: inherit;
        }
        .wm-input::placeholder{
          color: rgba(214,222,236,0.78);
        }
        .wm-input:focus{
          border-color: rgba(120,200,255,0.35);
          box-shadow: 0 0 0 3px rgba(120,200,255,0.10);
        }
        .wm-selectwrap{
          position: relative;
        }
        .wm-select{
          appearance: none;
          padding-right: 34px;
          color: rgba(248,250,255,0.98);
          background-color: rgba(255,255,255,0.05);
        }
        select.wm-input option{
          color: #111827;
          background: #ffffff;
        }
        select.wm-input{
          color-scheme: dark;
        }        .wm-selecticon{
          position:absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          opacity: .9;
          color: rgba(224,232,244,0.92);
          pointer-events:none;
        }
        .wm-sidepanel{
          display:grid;
          gap: 14px;
          align-content:start;
        }
        @media (min-width: 1101px){
          .wm-sidepanel--sticky{
            position: sticky;
            top: 16px;
            align-self: start;
          }
        }
        .wm-srow{
          display:grid;
          grid-template-columns: 1fr auto;
          gap: 12px;
          padding: 7px 0;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .wm-srow:last-child{
          border-bottom: 0;
        }
        .wm-srow__k{
          font-size: 11px;
          opacity: .98;
          color: rgba(224,232,244,0.94);
          letter-spacing: .06em;
          text-transform: uppercase;
        }
        .wm-srow__v{
          font-size: 12px;
          opacity: .99;
          color: rgba(248,250,255,0.98);
          max-width: 240px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          text-align: right;
        }
        .wm-chiprow{
          display:flex;
          flex-wrap:wrap;
          gap: 8px;
          margin: 10px 0 12px;
        }
        .wm-chip{
          display:inline-flex;
          align-items:center;
          padding: 6px 10px;
          border-radius: 999px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.10);
          color: rgba(248,250,255,0.98);
          font-size: 12px;
          font-weight: 700;
          line-height: 1;
          min-height: 28px;
        }
        .wm-statusbar{
          display:flex;
          flex-wrap:wrap;
          gap:10px;
          align-items:center;
        }
        .wm-statusbar__back{
          margin-left:auto;
        }
        .wm-rechead{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap: 10px;
        }
        .wm-whybox{
          display:grid;
          gap: 10px;
          margin: 0 0 12px;
          padding: 10px;
          border-radius: 12px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
        }
        .wm-whyline{
          display:grid;
          gap: 4px;
          font-size: 12px;
          line-height: 1.35;
          color: rgba(236,242,250,0.96);
        }
        .wm-actions{
          display:flex;
          flex-wrap:wrap;
          gap: 8px;
          align-items:center;
        }
        .wm-btn{
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.08);
          color: rgba(248,250,255,0.98);
          padding: 9px 12px;
          min-height: 36px;
          cursor: pointer;
          font: inherit;
          white-space: nowrap;
        }
        .wm-btn:hover{
          background: rgba(255,255,255,0.10);
        }
        .wm-btn--ghost{
          background: transparent;
          border-color: rgba(255,255,255,0.10);
          opacity: .98;
        }
        .wm-btn--primary{
          background: rgba(120,200,255,0.14);
          border-color: rgba(120,200,255,0.22);
        }
        .wm-btn--sm{
          min-height: 24px;
          padding: 3px 8px;
          font-size: 11px;
          line-height: 1.1;
          border-radius: 8px;
        }
      `}</style>

      <div className="wm-head">
        <div className="wm-head__left">
          <LayoutGrid size={18} />
          <div>
            <div className="wm-title">Discovery Wizard</div>
            <div className="wm-sub">
              Capture requirements, then jump into the next tool with a sensible starting point.
            </div>
          </div>
        </div>
      </div>

      <div className="wm-card" style={{ marginBottom: 14, paddingTop: 10, paddingBottom: 10 }}>
        <div className="wm-statusbar">
          <span className="wm-chip">Project: {activeProject?.name || "No active project"}</span>
          <span className="wm-chip">Status: {activeProject?.status || "Draft"}</span>
          <span className="wm-chip">Next: {rec.nextTool === "/app/tools/videowall" ? "Video Wall Planner" : "Product Catalog"}</span>
          <button
            className="wm-btn wm-btn--ghost wm-btn--sm wm-statusbar__back"
            type="button"
            onClick={() => nav("/app/tools")}
          >
            Back to Tool Hub
          </button>
        </div>
      </div>

      <div className="wm-grid">
        <div>
          <div className="wm-card">
            <div className="wm-card__h">Step 1 · Basic context</div>
            <div className="wm-formgrid">
              <label className="wm-field">
                <div className="wm-field__label">Customer</div>
                <input
                  className="wm-input"
                  value={record.customer}
                  onChange={(e) => updateRecord("customer", e.target.value)}
                  placeholder="e.g: Acme Ltd"
                />
              </label>

              <label className="wm-field">
                <div className="wm-field__label">Site</div>
                <input
                  className="wm-input"
                  value={record.site}
                  onChange={(e) => updateRecord("site", e.target.value)}
                  placeholder="e.g: London HQ"
                />
              </label>

              <label className="wm-field">
                <div className="wm-field__label">Room name</div>
                <input
                  className="wm-input"
                  value={record.roomName}
                  onChange={(e) => updateRecord("roomName", e.target.value)}
                  placeholder="e.g: Boardroom 2.14"
                />
              </label>

              <SelectOrCustom
                label="Application type"
                value={record.applicationType}
                options={APPLICATION_OPTIONS}
                onChange={(v) => updateRecord("applicationType", v)}
              />
            </div>
          </div>

          <div className="wm-card">
            <div className="wm-card__h">Step 2 · Physical and practical layout</div>
            <div className="wm-formgrid">
              <label className="wm-field">
                <div className="wm-field__label">Room length (m)</div>
                <input
                  className="wm-input"
                  value={record.roomLengthM}
                  onChange={(e) => updateRecord("roomLengthM", e.target.value)}
                  placeholder="e.g: 6.5"
                  inputMode="decimal"
                />
              </label>

              <label className="wm-field">
                <div className="wm-field__label">Room width (m)</div>
                <input
                  className="wm-input"
                  value={record.roomWidthM}
                  onChange={(e) => updateRecord("roomWidthM", e.target.value)}
                  placeholder="e.g: 4.2"
                  inputMode="decimal"
                />
              </label>

              <label className="wm-field">
                <div className="wm-field__label">Room height (m)</div>
                <input
                  className="wm-input"
                  value={record.roomHeightM}
                  onChange={(e) => updateRecord("roomHeightM", e.target.value)}
                  placeholder="e.g: 2.8"
                  inputMode="decimal"
                />
              </label>

              <label className="wm-field">
                <div className="wm-field__label">Expected Longest distance (m)</div>
                <input
                  className="wm-input"
                  value={record.cableDistanceM}
                  onChange={(e) => updateRecord("cableDistanceM", e.target.value)}
                  placeholder="e.g: Installed route, not straight-line"
                  inputMode="decimal"
                />
              </label>

              <SelectOrCustom
                label="Display location"
                value={record.displayLocation}
                options={DISPLAY_LOCATION_OPTIONS}
                onChange={(v) => updateRecord("displayLocation", v)}
              />

              <SelectOrCustom
                label="Source position"
                value={record.sourceLocation}
                options={SOURCE_POSITION_OPTIONS}
                onChange={(v) => updateRecord("sourceLocation", v)}
              />

              <SelectOrCustom
                label="Rack / comms location"
                value={record.rackLocation}
                options={RACK_LOCATION_OPTIONS}
                onChange={(v) => updateRecord("rackLocation", v)}
              />
            </div>
          </div>

          <div className="wm-card">
            <div className="wm-card__h">Step 3 · Technical and commercial qualifiers</div>
            <div className="wm-formgrid">
              <label className="wm-field">
                <div className="wm-field__label">Display count</div>
                <input
                  className="wm-input"
                  value={record.displayCount}
                  onChange={(e) => updateRecord("displayCount", e.target.value)}
                  placeholder="e.g: 2"
                  inputMode="numeric"
                />
              </label>

              <label className="wm-field">
                <div className="wm-field__label">Source count</div>
                <input
                  className="wm-input"
                  value={record.sourceCount}
                  onChange={(e) => updateRecord("sourceCount", e.target.value)}
                  placeholder="e.g: 4"
                  inputMode="numeric"
                />
              </label>

              <SelectOrCustom
                label="USB needs"
                value={record.usbNeeds}
                options={USB_OPTIONS}
                onChange={(v) => updateRecord("usbNeeds", v)}
              />

              <SelectOrCustom
                label="Audio needs"
                value={record.audioNeeds}
                options={AUDIO_OPTIONS}
                onChange={(v) => updateRecord("audioNeeds", v)}
              />

              <SelectOrCustom
                label="Control needs"
                value={record.controlNeeds}
                options={CONTROL_OPTIONS}
                onChange={(v) => updateRecord("controlNeeds", v)}
              />

              <SelectOrCustom
                label="Budget band"
                value={record.budgetBand}
                options={BUDGET_OPTIONS}
                onChange={(v) => updateRecord("budgetBand", v)}
              />

              <SelectOrCustom
                label="Urgency / timeline"
                value={record.urgency}
                options={URGENCY_OPTIONS}
                onChange={(v) => updateRecord("urgency", v)}
              />

              <label className="wm-field" style={{ gridColumn: "1 / -1" }}>
                <div className="wm-field__label">Call notes / constraints</div>
                <textarea
                  className="wm-input"
                  value={record.notes}
                  onChange={(e) => updateRecord("notes", e.target.value)}
                  placeholder="e.g: Existing equipment to retain, mounting constraints, access issues, competitor references"
                  rows={4}
                  style={{ resize: "vertical" }}
                />
              </label>
            </div>
          </div>
        </div>

        <div className="wm-sidepanel wm-sidepanel--sticky">
          <div className="wm-card">
            <div className="wm-card__h">Discovery summary</div>
            <SummaryRow k="Customer" v={record.customer} />
            <SummaryRow k="Site" v={record.site} />
            <SummaryRow k="Application" v={record.applicationType} />
            <SummaryRow k="Room" v={record.roomName} />
            <SummaryRow
              k="Physical size"
              v={[record.roomLengthM, record.roomWidthM, record.roomHeightM].filter(Boolean).join(" × ")}
            />
            <SummaryRow
              k="Cable route"
              v={record.cableDistanceM ? `${record.cableDistanceM} m` : ""}
            />
            <SummaryRow k="Display position" v={record.displayLocation} />
            <SummaryRow k="Source position" v={record.sourceLocation} />
            <SummaryRow k="Rack position" v={record.rackLocation} />
            <SummaryRow
              k="Displays / sources"
              v={[record.displayCount, record.sourceCount].filter(Boolean).join(" / ")}
            />
            <SummaryRow
              k="USB / control"
              v={[record.usbNeeds, record.controlNeeds].filter(Boolean).join(" / ")}
            />
            <SummaryRow
              k="Budget / urgency"
              v={[record.budgetBand, record.urgency].filter(Boolean).join(" / ")}
            />
          </div>

          <div className="wm-card">
            <div className="wm-rechead">
              <div className="wm-card__h" style={{ marginBottom: 0 }}>
                Recommended product families
              </div>

              <button
                className="wm-btn wm-btn--ghost wm-btn--sm"
                type="button"
                onClick={() => setShowWhy((v) => !v)}
              >
                {showWhy ? "Collapse" : "Why these?"}
              </button>
            </div>

            <div className="wm-chiprow">
              {rec.families.length > 0 ? (
                rec.families.map((family) => <Chip key={family}>{family}</Chip>)
              ) : (
                <span style={{ opacity: 0.94, color: "rgba(224,232,244,0.94)", fontSize: 12 }}>
                  Fill in a few fields to see recommendations.
                </span>
              )}
            </div>

            {showWhy && rec.families.length > 0 && (
              <div className="wm-whybox">
                {rec.families.map((family) => {
                  const lines = rec.why[family] || [];
                  return (
                    <div key={family} className="wm-whyline">
                      <strong>{family}</strong>
                      <span style={{ opacity: 0.96 }}>
                        {lines.length > 0 ? lines.join(" ") : "Selected from the overall requirement pattern."}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="wm-actions">
              <button
                className="wm-btn wm-btn--primary"
                type="button"
                onClick={saveSummary}
              >
                Save discovery summary
              </button>

              <button
                className="wm-btn"
                type="button"
                onClick={() => saveAndNavigate("/app/tools/catalog")}
              >
                Open Catalog
                <ArrowRight size={16} style={{ marginLeft: 6, verticalAlign: "text-bottom" }} />
              </button>

              <button
                className="wm-btn"
                type="button"
                onClick={() => saveAndNavigate("/app/tools/proposal")}
              >
                Open Proposal Builder
                <ArrowRight size={16} style={{ marginLeft: 6, verticalAlign: "text-bottom" }} />
              </button>

              <button
                className="wm-btn wm-btn--ghost"
                type="button"
                onClick={clearAll}
              >
                Clear
              </button>

              <button
                className="wm-btn wm-btn--ghost"
                type="button"
                onClick={goToSuggestedTool}
              >
                Go to suggested next tool
                <ArrowRight size={16} style={{ marginLeft: 6, verticalAlign: "text-bottom" }} />
              </button>
            </div>
          </div>
        </div>
      </div>
      <AdvancedSignalPathPanel record={record} setRecord={setRecord} />
</div>
  );
}

