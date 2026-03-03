import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

type DraftLine = {
  sku: string;
  name: string;
  qty: number;
  role: string;
};

type ProjectDraft = {
  id: string;
  name: string;
  source: string;
  marketName: string;
  roomTypeName: string;
  tier: string;
  summary: string;
  lines: DraftLine[];
  createdAt: string;
};

const ACTIVE_DRAFT_KEY = "wm_active_project_draft";
const DRAFTS_KEY = "wm_project_drafts";

function readActiveDraft(): ProjectDraft | null {
  try {
    const raw = sessionStorage.getItem(ACTIVE_DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ProjectDraft;
  } catch {
    return null;
  }
}

function writeActiveDraft(next: ProjectDraft | null) {
  try {
    if (!next) {
      sessionStorage.removeItem(ACTIVE_DRAFT_KEY);
      return;
    }
    sessionStorage.setItem(ACTIVE_DRAFT_KEY, JSON.stringify(next));
  } catch {}
}

function persistDraftUpdate(next: ProjectDraft) {
  try {
    const raw = sessionStorage.getItem(DRAFTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(parsed) ? (parsed as ProjectDraft[]) : [];
    const updated = list.map((d) => (d.id === next.id ? next : d));
    sessionStorage.setItem(DRAFTS_KEY, JSON.stringify(updated));
  } catch {}
}

export default function RoomWizardPage() {
  const nav = useNavigate();

  const [draft, setDraft] = useState<ProjectDraft | null>(null);
  const [projectName, setProjectName] = useState("");
  const [marketName, setMarketName] = useState("");
  const [roomTypeName, setRoomTypeName] = useState("");
  const [tier, setTier] = useState("");
  const [summary, setSummary] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([]);

  useEffect(() => {
    const active = readActiveDraft();
    setDraft(active);
    if (active) {
      setProjectName(active.name ?? "");
      setMarketName(active.marketName ?? "");
      setRoomTypeName(active.roomTypeName ?? "");
      setTier(active.tier ?? "");
      setSummary(active.summary ?? "");
      setLines(active.lines ?? []);
    }
  }, []);

  const totalUnits = useMemo(
    () => lines.reduce((sum, line) => sum + (Number(line.qty) || 0), 0),
    [lines]
  );

  const updateLineQty = (idx: number, qty: number) => {
    const next = lines.map((line, i) => (i === idx ? { ...line, qty } : line));
    setLines(next);
  };

  const removeLine = (idx: number) => {
    const next = lines.filter((_, i) => i !== idx);
    setLines(next);
  };

  const saveDraft = () => {
    if (!draft) return;

    const next: ProjectDraft = {
      ...draft,
      name: projectName.trim() || draft.name,
      marketName: marketName.trim(),
      roomTypeName: roomTypeName.trim(),
      tier: tier.trim(),
      summary: summary.trim(),
      lines,
    };

    setDraft(next);
    writeActiveDraft(next);
    persistDraftUpdate(next);
  };

  const clearActiveDraft = () => {
    writeActiveDraft(null);
    setDraft(null);
    setProjectName("");
    setMarketName("");
    setRoomTypeName("");
    setTier("");
    setSummary("");
    setLines([]);
  };

  const goToProposalBuilder = () => {
    if (draft) {
      const next: ProjectDraft = {
        ...draft,
        name: projectName.trim() || draft.name,
        marketName: marketName.trim(),
        roomTypeName: roomTypeName.trim(),
        tier: tier.trim(),
        summary: summary.trim(),
        lines,
      };
      writeActiveDraft(next);
      persistDraftUpdate(next);
    }
    nav("/app/tools/proposal-builder");
  };

  return (
    <div className="wm-page">
      <div style={{ marginBottom: 14 }}>
        <h1 style={{ margin: 0 }}>Room Wizard</h1>
        <p style={{ margin: "6px 0 0", opacity: 0.78 }}>
          Refine the active draft into a working room design. Update metadata, adjust BOM quantities, then continue into Proposal Builder.
        </p>
      </div>

      {!draft ? (
        <section className="wm-card" style={{ padding: 14, borderRadius: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>No active draft</div>
          <div style={{ opacity: 0.76, lineHeight: 1.45, marginBottom: 12 }}>
            Open Templates first, seed a design into Projects, then launch Room Wizard from the draft.
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" className="wm-btn" onClick={() => nav("/app/templates")} style={{ borderRadius: 10 }}>
              Open Templates
            </button>
            <button type="button" className="wm-btn" onClick={() => nav("/app/projects")} style={{ borderRadius: 10 }}>
              Open Projects
            </button>
          </div>
        </section>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(320px, 420px) minmax(420px, 1fr)",
            gap: 14,
            alignItems: "start",
          }}
        >
          {/* Left column: project metadata */}
          <section className="wm-card" style={{ padding: 14, borderRadius: 12 }}>
            <div style={{ fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.72, marginBottom: 10 }}>
              Active draft context
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <label className="wm-field">
                <div className="wm-label">Project name</div>
                <input
                  className="wm-input"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
              </label>

              <label className="wm-field">
                <div className="wm-label">Vertical market</div>
                <input
                  className="wm-input"
                  value={marketName}
                  onChange={(e) => setMarketName(e.target.value)}
                />
              </label>

              <label className="wm-field">
                <div className="wm-label">Room type</div>
                <input
                  className="wm-input"
                  value={roomTypeName}
                  onChange={(e) => setRoomTypeName(e.target.value)}
                />
              </label>

              <label className="wm-field">
                <div className="wm-label">Tier</div>
                <input
                  className="wm-input"
                  value={tier}
                  onChange={(e) => setTier(e.target.value)}
                />
              </label>

              <label className="wm-field">
                <div className="wm-label">Design summary</div>
                <textarea
                  className="wm-input"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={4}
                  style={{ minHeight: 96, paddingTop: 8, paddingBottom: 8 }}
                />
              </label>
            </div>

            <div
              className="wm-card"
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 10,
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Draft statistics</div>
              <div style={{ display: "grid", gap: 4, fontSize: 13, opacity: 0.8 }}>
                <div>BOM lines: {lines.length}</div>
                <div>Total units: {totalUnits}</div>
                <div>Source: {draft.source}</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
              <button type="button" className="wm-btn wm-btn-primary" onClick={saveDraft} style={{ borderRadius: 10 }}>
                Save draft updates
              </button>
              <button type="button" className="wm-btn" onClick={clearActiveDraft} style={{ borderRadius: 10 }}>
                Clear active draft
              </button>
            </div>
          </section>

          {/* Right column: starter BOM */}
          <section className="wm-card" style={{ padding: 14, borderRadius: 12 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
                flexWrap: "wrap",
                marginBottom: 10,
              }}
            >
              <div>
                <div style={{ fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.72 }}>
                  Starter BOM
                </div>
                <div style={{ fontWeight: 700, marginTop: 4 }}>{projectName || draft.name}</div>
              </div>

              <button
                type="button"
                className="wm-btn wm-btn-primary"
                onClick={goToProposalBuilder}
                style={{ borderRadius: 10 }}
              >
                Continue to Proposal Builder
              </button>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: "left", opacity: 0.72 }}>
                    <th style={{ padding: "6px 8px 8px 0" }}>SKU</th>
                    <th style={{ padding: "6px 8px 8px 0" }}>Name</th>
                    <th style={{ padding: "6px 8px 8px 0" }}>Qty</th>
                    <th style={{ padding: "6px 8px 8px 0" }}>Role</th>
                    <th style={{ padding: "6px 0 8px 0" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, idx) => (
                    <tr key={line.sku + line.role + idx}>
                      <td style={{ padding: "8px 8px 8px 0", borderTop: "1px solid rgba(255,255,255,0.08)" }}>{line.sku}</td>
                      <td style={{ padding: "8px 8px 8px 0", borderTop: "1px solid rgba(255,255,255,0.08)" }}>{line.name}</td>
                      <td style={{ padding: "8px 8px 8px 0", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                        <input
                          className="wm-input"
                          type="number"
                          min={0}
                          value={line.qty}
                          onChange={(e) => updateLineQty(idx, Number(e.target.value))}
                          style={{ width: 76 }}
                        />
                      </td>
                      <td style={{ padding: "8px 8px 8px 0", borderTop: "1px solid rgba(255,255,255,0.08)" }}>{line.role}</td>
                      <td style={{ padding: "8px 0 8px 0", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                        <button
                          type="button"
                          className="wm-btn"
                          onClick={() => removeLine(idx)}
                          style={{ borderRadius: 8, minHeight: 28 }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div
              className="wm-card"
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 10,
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Next workflow step</div>
              <div style={{ opacity: 0.76, lineHeight: 1.45, fontSize: 13 }}>
                This draft is now editable in Room Wizard. The next action sends the current draft context into Proposal Builder, where you can turn this into a commercial narrative and fuller proposal structure.
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}