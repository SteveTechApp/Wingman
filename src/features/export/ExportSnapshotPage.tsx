import * as React from "react";
import { useNavigate } from "react-router-dom";

type ActiveProjectLite = {
  id?: string;
  name?: string;
  customer?: string;
  site?: string;
  status?: string;
};

function readActiveProject(): ActiveProjectLite {
  // Safe, best-effort: supports multiple possible keys / shapes without breaking.
  const keys = ["wm_active_project", "wm_activeProject", "wm_project_active", "wm_current_project", "wm_currentProject"];
  for (const k of keys) {
    try {
      const raw = window.localStorage.getItem(k);
      if (!raw) continue;
      const obj = JSON.parse(raw);

      const id =
        obj?.id ?? obj?.projectId ?? obj?.project?.id ?? obj?.activeProjectId ?? obj?.currentProjectId;

      const customer =
        obj?.customer ?? obj?.project?.customer ?? obj?.meta?.customer ?? obj?.details?.customer;

      const site =
        obj?.site ?? obj?.project?.site ?? obj?.meta?.site ?? obj?.details?.site;

      const status =
        obj?.status ?? obj?.project?.status ?? obj?.meta?.status ?? obj?.details?.status;

      const name =
        obj?.name ?? obj?.project?.name ?? obj?.title ?? obj?.projectName;

      return { id, customer, site, status, name };
    } catch {}
  }
  return {};
}

export default function ExportSnapshotPage() {
  const nav = useNavigate();

  React.useEffect(() => {
    document.body.classList.add("wm-export-mode");
    try { window.scrollTo({ top: 0, left: 0, behavior: "instant" as any }); } catch { window.scrollTo(0, 0); }
    return () => document.body.classList.remove("wm-export-mode");
  }, []);

  const today = React.useMemo(() => new Date(), []);
  const proj = React.useMemo(() => readActiveProject(), []);

  const customer = proj.customer || "â€”";
  const site = proj.site || "â€”";
  const status = proj.status || "Draft";

  function handlePrint() {
    window.print();
  }

  function openProject() {
    if (!proj.id) return;
    // Common route pattern; adjust later if your app uses a different one
    nav("/app/projects");
  }

  return (
    <div className="wm-export-page">
      <div className="wm-export-toolbar no-print">
        <button className="wm-btn wm-btn--primary" onClick={handlePrint}>
          Print / Save PDF
        </button>
        <div className="wm-export-hint">Tip: choose â€œSave as PDFâ€ in the print dialog.</div>
      </div>

      <div className="wm-export-container">
        <div className="wm-export-sheet wm-export-sheet--preview">
          {/* In-sheet Wingman header (navigation) */}
          <div className="wm-docbar no-print">
            <div className="wm-docbar__brand">
  <div className="wm-docbar__mark">WYRESTORM</div>
  <div className="wm-docbar__sub">Wingman â€¢ Snapshot</div>
</div>
            <div className="wm-docbar__actions">
              {proj.id ? (
                <button className="wm-docbtn" type="button" onClick={openProject} title="Open active project">
                  Open Project
                </button>
              ) : null}
              <button className="wm-docbtn" type="button" onClick={() => nav("/app/dashboard")}>
                Home
              </button>
              <button className="wm-docbtn wm-docbtn--ghost" type="button" onClick={() => nav(-1)}>
                Back
              </button>
            </div>
          </div>

          {/* Document header */}
          <header className="wm-export-header">
            <div>
              <h1>Project Snapshot</h1>
              <div className="wm-export-sub">WyreStorm Wingman â€¢ Internal snapshot</div>
            </div>

            <div className="wm-export-meta">
              <div><strong>Status:</strong> {status}</div>
              <div><strong>Customer:</strong> {customer}</div>
              <div><strong>Site:</strong> {site}</div>
              <div><strong>Date:</strong> {today.toLocaleDateString()}</div>
            </div>
          </header>

          <section className="wm-export-section">
            <h2>Discovery Summary</h2>
            <table className="wm-export-table">
              <tbody>
                <tr><td>Application</td><td>â€”</td></tr>
                <tr><td>Displays</td><td>â€”</td></tr>
                <tr><td>Sources</td><td>â€”</td></tr>
              </tbody>
            </table>
          </section>

          <section className="wm-export-section">
            <h2>Selected Products</h2>
            <table className="wm-export-table">
              <thead>
                <tr>
                  <th style={{ width: "22%" }}>SKU</th>
                  <th>Description</th>
                  <th style={{ width: "10%", textAlign: "right" }}>Qty</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>â€”</td>
                  <td>â€”</td>
                  <td style={{ textAlign: "right" }}>â€”</td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* In-sheet footer (nav + timestamp on screen) */}
          <footer className="wm-docfooter">
            <div className="wm-docfooter__left">
              <span className="wm-docfooter__tag">Internal use</span>
              <span className="wm-docfooter__muted">Generated {today.toLocaleString()}</span>
            </div>
            <div className="wm-docfooter__right no-print">
              <button className="wm-doclink" type="button" onClick={() => nav("/app/projects")}>Projects</button>
              <button className="wm-doclink" type="button" onClick={() => nav("/app/tools")}>Tool Hub</button>
              <button className="wm-doclink" type="button" onClick={() => nav("/app/dashboard")}>Dashboard</button>
            </div>
          </footer>

          {/* Print-only fixed footer with page numbering */}
          <div className="wm-print-footer">
            <span>WyreStorm Wingman â€¢ Project Snapshot</span>
            <span className="wm-print-footer__page">Page </span>
          </div>
        </div>
      </div>
    </div>
  );
}