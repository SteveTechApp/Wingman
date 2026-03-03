import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

type SeedLine = {
  sku: string;
  name: string;
  qty: number;
  role: string;
};

type TemplateSeed = {
  source: "templates";
  marketId: string;
  marketName: string;
  roomTypeId: string;
  roomTypeName: string;
  templateId: string;
  templateName: string;
  tier: "Bronze" | "Silver" | "Gold";
  summary: string;
  lines: SeedLine[];
  seededAt: string;
};

type ProjectDraft = {
  id: string;
  name: string;
  source: string;
  marketName: string;
  roomTypeName: string;
  tier: string;
  summary: string;
  lines: SeedLine[];
  createdAt: string;
};

const SESSION_SEED_KEY = "wm_template_seed";
const SESSION_DRAFTS_KEY = "wm_project_drafts";

function readTemplateSeed(): TemplateSeed | null {
  try {
    const raw = sessionStorage.getItem(SESSION_SEED_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TemplateSeed;
  } catch {
    return null;
  }
}

function clearTemplateSeed() {
  try {
    sessionStorage.removeItem(SESSION_SEED_KEY);
  } catch {}
}

function readDrafts(): ProjectDraft[] {
  try {
    const raw = sessionStorage.getItem(SESSION_DRAFTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ProjectDraft[]) : [];
  } catch {
    return [];
  }
}

function writeDrafts(next: ProjectDraft[]) {
  try {
    sessionStorage.setItem(SESSION_DRAFTS_KEY, JSON.stringify(next));
  } catch {}
}

function makeDraftFromSeed(seed: TemplateSeed): ProjectDraft {
  return {
    id: "draft-" + Date.now().toString(36),
    name: `${seed.marketName} - ${seed.roomTypeName} - ${seed.tier}`,
    source: "Template seed",
    marketName: seed.marketName,
    roomTypeName: seed.roomTypeName,
    tier: seed.tier,
    summary: seed.summary,
    lines: seed.lines,
    createdAt: new Date().toISOString(),
  };
}

export default function ProjectsPage() {
  const nav = useNavigate();

  const [seed, setSeed] = useState<TemplateSeed | null>(null);
  const [drafts, setDrafts] = useState<ProjectDraft[]>([]);

  useEffect(() => {
    setSeed(readTemplateSeed());
    setDrafts(readDrafts());
  }, []);

  const totalSeedLines = useMemo(
    () => (seed?.lines ?? []).reduce((sum, line) => sum + (line.qty || 0), 0),
    [seed]
  );

  const ingestSeed = () => {
    if (!seed) return;
    const draft = makeDraftFromSeed(seed);
    const next = [draft, ...drafts];
    setDrafts(next);
    writeDrafts(next);
    clearTemplateSeed();
    setSeed(null);
  };

  const dismissSeed = () => {
    clearTemplateSeed();
    setSeed(null);
  };

  const openDraft = (draft: ProjectDraft) => {
    try {
      sessionStorage.setItem("wm_active_project_draft", JSON.stringify(draft));
    } catch {}
    nav("/app/tools/room-wizard");
  };

  const clearDrafts = () => {
    try {
      sessionStorage.removeItem(SESSION_DRAFTS_KEY);
    } catch {}
    setDrafts([]);
  };

  return (
    <div className="wm-page">
      <div style={{ marginBottom: 14 }}>
        <h1 style={{ margin: 0 }}>Projects</h1>
        <p style={{ margin: "6px 0 0", opacity: 0.78 }}>
          Manage project drafts and convert template presets into editable working designs.
        </p>
      </div>

      {seed ? (
        <section
          className="wm-card"
          style={{
            padding: 14,
            marginBottom: 14,
            borderRadius: 12,
            borderColor: "rgba(94,234,212,0.24)",
            background: "rgba(94,234,212,0.04)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 12,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  opacity: 0.72,
                  marginBottom: 6,
                }}
              >
                Incoming template seed
              </div>

              <div style={{ fontWeight: 700, marginBottom: 4 }}>
                {seed.templateName}
              </div>

              <div style={{ opacity: 0.82, lineHeight: 1.45 }}>
                {seed.marketName} / {seed.roomTypeName} / {seed.tier}
              </div>

              <div style={{ marginTop: 6, opacity: 0.74, fontSize: 13 }}>
                {seed.summary}
              </div>

              <div style={{ marginTop: 8, opacity: 0.7, fontSize: 12 }}>
                {seed.lines.length} BOM lines / {totalSeedLines} total units
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                className="wm-btn wm-btn-primary"
                onClick={ingestSeed}
                style={{ borderRadius: 10 }}
              >
                Start working from this template
              </button>

              <button
                type="button"
                className="wm-btn"
                onClick={dismissSeed}
                style={{ borderRadius: 10 }}
              >
                Clear seed
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="wm-card" style={{ padding: 14, borderRadius: 12 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
            marginBottom: 12,
          }}
        >
          <div>
            <div style={{ fontWeight: 700 }}>Draft projects</div>
            <div style={{ opacity: 0.72, fontSize: 13 }}>
              Session-backed drafts created from Templates.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              className="wm-btn"
              onClick={() => nav("/app/templates")}
              style={{ borderRadius: 10 }}
            >
              Open Templates
            </button>

            {drafts.length > 0 ? (
              <button
                type="button"
                className="wm-btn"
                onClick={clearDrafts}
                style={{ borderRadius: 10 }}
              >
                Clear drafts
              </button>
            ) : null}
          </div>
        </div>

        {drafts.length === 0 ? (
          <div
            className="wm-card"
            style={{
              padding: 14,
              borderRadius: 10,
              background: "rgba(255,255,255,0.03)",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 4 }}>
              No drafts yet
            </div>
            <div style={{ opacity: 0.76, lineHeight: 1.45 }}>
              Create a template in Template Workbench, then send it here to begin a custom project flow.
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {drafts.map((draft) => (
              <div
                key={draft.id}
                className="wm-card"
                style={{
                  padding: 12,
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{draft.name}</div>
                    <div style={{ opacity: 0.8, fontSize: 13 }}>
                      {draft.marketName} / {draft.roomTypeName} / {draft.tier}
                    </div>
                    <div style={{ marginTop: 6, opacity: 0.72, fontSize: 13, lineHeight: 1.4 }}>
                      {draft.summary}
                    </div>
                    <div style={{ marginTop: 6, opacity: 0.64, fontSize: 12 }}>
                      {draft.lines.length} BOM lines
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="wm-btn wm-btn-primary"
                      onClick={() => openDraft(draft)}
                      style={{ borderRadius: 10 }}
                    >
                      Open in Room Wizard
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: 10, overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ textAlign: "left", opacity: 0.7 }}>
                        <th style={{ padding: "6px 6px 8px 0" }}>SKU</th>
                        <th style={{ padding: "6px 6px 8px 0" }}>Name</th>
                        <th style={{ padding: "6px 6px 8px 0" }}>Qty</th>
                        <th style={{ padding: "6px 0 8px 0" }}>Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {draft.lines.map((line) => (
                        <tr key={draft.id + line.sku + line.role}>
                          <td style={{ padding: "7px 6px 7px 0", borderTop: "1px solid rgba(255,255,255,0.08)" }}>{line.sku}</td>
                          <td style={{ padding: "7px 6px 7px 0", borderTop: "1px solid rgba(255,255,255,0.08)" }}>{line.name}</td>
                          <td style={{ padding: "7px 6px 7px 0", borderTop: "1px solid rgba(255,255,255,0.08)" }}>{line.qty}</td>
                          <td style={{ padding: "7px 0 7px 0", borderTop: "1px solid rgba(255,255,255,0.08)" }}>{line.role}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}