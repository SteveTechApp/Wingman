import * as React from "react";
// src/features/projects/ProjectsPage.tsx

import { useNavigate } from "react-router-dom";
import {
  getProjects,
  setActiveProject,
  type ProjectRecord,
} from "@/features/projects/projectStore";

function card(): React.CSSProperties {
  return {
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 16,
    background: "rgba(16,22,32,0.72)",
    padding: 14,
  };
}

function chip(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 28,
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.06)",
    fontSize: 12,
    lineHeight: 1,
    whiteSpace: "nowrap",
  };
}

function buttonStyle(primary?: boolean): React.CSSProperties {
  return {
    borderRadius: 12,
    border: primary
      ? "1px solid rgba(120,200,255,0.26)"
      : "1px solid rgba(255,255,255,0.12)",
    background: primary
      ? "rgba(120,200,255,0.14)"
      : "rgba(255,255,255,0.08)",
    color: "rgba(255,255,255,0.92)",
    padding: "9px 12px",
    minHeight: 36,
    cursor: "pointer",
    font: "inherit",
    whiteSpace: "nowrap",
  };
}

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function proposalText(p: ProjectRecord): string {
  if (!p.proposal) return "No proposal saved";
  const tier = p.proposal.selectedTier || "—";
  const fams =
    Array.isArray(p.proposal.families) && p.proposal.families.length
      ? p.proposal.families.join(", ")
      : "No families";
  return `${tier} · ${fams}`;
}

function catalogText(p: ProjectRecord): string {
  if (!p.catalog) return "No catalog selection";
  const fams =
    Array.isArray(p.catalog.families) && p.catalog.families.length
      ? p.catalog.families.join(", ")
      : "No families";
  const count = Array.isArray(p.catalog.skus) ? p.catalog.skus.length : 0;
  return `${count} SKU(s) · ${fams}`;
}

function progress(p: ProjectRecord): { done: number; total: number } {
  const hasDiscovery = !!p.discovery;
  const hasCatalog = Array.isArray(p.catalog?.skus) && p.catalog!.skus.length > 0;
  const hasProposal = !!p.proposal;
  const done = [hasDiscovery, hasCatalog, hasProposal].filter(Boolean).length;
  return { done, total: 3 };
}

function projectToText(p: ProjectRecord): string {
  return [
    `Project: ${p.name || "Untitled Project"}`,
    `Customer: ${p.customer || "—"}`,
    `Site: ${p.site || "—"}`,
    `Status: ${p.status}`,
    `Updated: ${fmtDate(p.updatedAt)}`,
    `Catalog: ${catalogText(p)}`,
    `Proposal: ${proposalText(p)}`,
  ].join("\n");
}

function downloadTxt(fileName: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function ProjectsPage() {
  const nav = useNavigate();
  const [q, setQ] = React.useState("");

  const projects = React.useMemo(() => {
    const rows = getProjects();
    return Array.isArray(rows) ? rows : [];
  }, []);

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return projects;
    return projects.filter((p) => {
      const blob = [
        p.name,
        p.customer,
        p.site,
        p.status,
        p.proposal?.selectedTier || "",
        Array.isArray(p.catalog?.skus) ? p.catalog!.skus.join(" ") : "",
        Array.isArray(p.catalog?.families) ? p.catalog!.families.join(" ") : "",
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(s);
    });
  }, [projects, q]);

  function open(p: ProjectRecord, to: string) {
    setActiveProject(p.id);
    nav(to);
  }

  function exportProject(p: ProjectRecord) {
    const fileName = `${(p.name || "project").replace(/[^a-z0-9_\-]+/gi, "_")}.txt`;
    downloadTxt(fileName, projectToText(p));
  }

  return (
    <div style={{ minHeight: "100%", padding: 16, color: "rgba(255,255,255,0.92)" }}>
      <div style={{ ...card(), marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900 }}>Projects</div>
            <div style={{ opacity: 0.78, fontSize: 13, marginTop: 4 }}>
              Manage active project context. Jump straight into the next step.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={() => nav("/app/dashboard")} style={buttonStyle()}>
              Dashboard
            </button>
            <button type="button" onClick={() => nav("/app/tools")} style={buttonStyle()}>
              Tool Hub
            </button>
            <button type="button" onClick={() => nav("/app/projects/new")} style={buttonStyle(true)}>
              Start New Project
            </button>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="e.g: Search by customer, site, room, status, tier, sku"
            style={{
              width: "100%",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.05)",
              color: "rgba(255,255,255,0.92)",
              padding: "10px 10px",
              outline: "none",
              font: "inherit",
            }}
          />
        </div>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {filtered.map((p) => {
          const pr = progress(p);
          return (
            <div key={p.id} style={card()}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 900, fontSize: 16, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.name || "Untitled Project"}
                  </div>
                  <div style={{ opacity: 0.78, fontSize: 13, marginTop: 4 }}>
                    {(p.customer || "—") + " · " + (p.site || "—")}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <span style={chip()}>{p.status}</span>
                  <span style={chip()}>Updated: {fmtDate(p.updatedAt)}</span>
                  <span style={chip()}>Progress: {pr.done}/{pr.total}</span>
                </div>
              </div>

              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <span style={chip()}>Catalog: {catalogText(p)}</span>
                  {p.catalog?.updatedAt ? <span style={chip()}>Catalog updated: {fmtDate(p.catalog.updatedAt)}</span> : null}
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <span style={chip()}>Proposal: {proposalText(p)}</span>
                  {p.proposal?.updatedAt ? <span style={chip()}>Proposal updated: {fmtDate(p.proposal.updatedAt)}</span> : null}
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" onClick={() => open(p, "/app/tools/discovery")} style={buttonStyle()}>
                    Discovery
                  </button>
                  <button type="button" onClick={() => open(p, "/app/tools/catalog")} style={buttonStyle()}>
                    Catalog
                  </button>
                  <button type="button" onClick={() => open(p, "/app/tools/proposal")} style={buttonStyle(true)}>
                    Proposal
                  </button>
                  <button type="button" onClick={() => open(p, "/app/tools")} style={buttonStyle()}>
                    Tool Hub
                  </button>
                  <button type="button" onClick={() => exportProject(p)} style={buttonStyle()}>
                    Export
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {!filtered.length && (
          <div style={{ ...card(), opacity: 0.8 }}>
            No projects found.
          </div>
        )}
      </div>
    </div>
  );
}
