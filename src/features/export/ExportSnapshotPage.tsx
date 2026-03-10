import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  getActiveProject,
  subscribeProjects,
  type StoredProject,
} from "@/features/projects/projectStore";
import skuCatalog from "@/data/wyrestormSkuCatalog.2026";

type SkuItem = {
  sku: string;
  description?: string;
};

type SelectedProductRow = {
  sku: string;
  description: string;
  quantity: number;
};

function formatDate(value: Date): string {
  return value.toLocaleDateString();
}

function normalizeText(value: unknown, fallback = "-"): string {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : fallback;
}

function readCatalogItems(): SkuItem[] {
  const anyCatalog = skuCatalog as any;
  const items =
    (anyCatalog?.items as SkuItem[] | undefined) ??
    (anyCatalog?.default?.items as SkuItem[] | undefined) ??
    (anyCatalog?.default?.default?.items as SkuItem[] | undefined) ??
    [];

  return Array.isArray(items) ? items : [];
}

function buildSkuDescriptionMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const item of readCatalogItems()) {
    const sku = String(item.sku ?? "").trim();
    if (!sku) continue;
    if (!map.has(sku)) {
      map.set(sku, normalizeText(item.description, "Description unavailable"));
    }
  }
  return map;
}

const SKU_DESCRIPTION_MAP = buildSkuDescriptionMap();

function buildSelectedProductRows(project: StoredProject | null): SelectedProductRow[] {
  if (!project) return [];
  const skus = Array.isArray(project.catalog?.skus) ? project.catalog?.skus : [];
  if (!skus || skus.length === 0) return [];

  const counts = new Map<string, number>();

  for (const value of skus) {
    const sku = String(value ?? "").trim();
    if (!sku) continue;
    counts.set(sku, (counts.get(sku) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([sku, quantity]) => ({
      sku,
      quantity,
      description: SKU_DESCRIPTION_MAP.get(sku) ?? "Description unavailable",
    }))
    .sort((a, b) => a.sku.localeCompare(b.sku));
}

function getDiscoverySummary(project: StoredProject | null) {
  if (!project) {
    return {
      application: "-",
      displays: "-",
      sources: "-",
      distance: "-",
      usbNeeds: "-",
      controlNeeds: "-",
    };
  }

  const displays =
    normalizeText(project.discovery?.displayCount, "") ||
    (project.videowall ? String(project.videowall.rows * project.videowall.cols) : "") ||
    "-";

  const distanceRaw = normalizeText(project.discovery?.cableDistanceM, "");
  const distance = distanceRaw !== "" ? `${distanceRaw} m` : "-";

  return {
    application: normalizeText(project.discovery?.applicationType ?? project.template?.application, "-"),
    displays,
    sources: normalizeText(project.discovery?.sourceCount, "-"),
    distance,
    usbNeeds: normalizeText(project.discovery?.usbNeeds, "-"),
    controlNeeds: normalizeText(project.discovery?.controlNeeds, "-"),
  };
}

export default function ExportSnapshotPage() {
  const nav = useNavigate();

  const project = React.useSyncExternalStore(
    subscribeProjects,
    () => getActiveProject() ?? null,
    () => null
  );

  React.useEffect(() => {
    document.body.classList.add("wm-export-mode");
    try {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" as never });
    } catch {
      window.scrollTo(0, 0);
    }

    return () => document.body.classList.remove("wm-export-mode");
  }, []);

  const today = React.useMemo(() => new Date(), []);
  const discovery = React.useMemo(() => getDiscoverySummary(project), [project]);
  const productRows = React.useMemo(() => buildSelectedProductRows(project), [project]);

  const customer = normalizeText(project?.customer, "-");
  const site = normalizeText(project?.site, "-");
  const status = normalizeText(project?.status, "Draft");
  const projectName = normalizeText(project?.name, "Project Snapshot");

  const recommendedFamilies = Array.isArray(project?.discovery?.recommendedFamilies)
    ? project?.discovery?.recommendedFamilies
    : [];

  function handlePrint() {
    window.print();
  }

  function openProject() {
    if (project?.id) {
      nav(`/app/projects/${project.id}`);
      return;
    }
    nav("/app/projects");
  }

  return (
    <div className="wm-export-page">
      <div className="wm-export-toolbar no-print">
        <button className="wm-btn wm-btn-primary" onClick={handlePrint}>
          Print / Save PDF
        </button>
        <div className="wm-export-hint">Tip: choose "Save as PDF" in the print dialog.</div>
      </div>

      <div className="wm-export-container">
        <div className="wm-export-sheet wm-export-sheet--preview">
          <div className="wm-docbar no-print">
            <div className="wm-docbar__brand">
              <div className="wm-docbar__mark">WYRESTORM</div>
              <div className="wm-docbar__sub">Wingman | Snapshot</div>
            </div>
            <div className="wm-docbar__actions">
              <button className="wm-docbtn" type="button" onClick={openProject} title="Open active project">
                Open Project
              </button>
              <button className="wm-docbtn" type="button" onClick={() => nav("/app/dashboard")}>
                Home
              </button>
              <button className="wm-docbtn wm-docbtn--ghost" type="button" onClick={() => nav(-1)}>
                Back
              </button>
            </div>
          </div>

          <header className="wm-export-header">
            <div>
              <h1>{projectName}</h1>
              <div className="wm-export-sub">WyreStorm Wingman | Internal snapshot</div>
            </div>

            <div className="wm-export-meta">
              <div><strong>Status:</strong> {status}</div>
              <div><strong>Customer:</strong> {customer}</div>
              <div><strong>Site:</strong> {site}</div>
              <div><strong>Date:</strong> {formatDate(today)}</div>
            </div>
          </header>

          <section className="wm-export-section">
            <h2>Discovery Summary</h2>
            <table className="wm-export-table">
              <tbody>
                <tr><td>Application</td><td>{discovery.application}</td></tr>
                <tr><td>Displays</td><td>{discovery.displays}</td></tr>
                <tr><td>Sources</td><td>{discovery.sources}</td></tr>
                <tr><td>Distance</td><td>{discovery.distance}</td></tr>
                <tr><td>USB needs</td><td>{discovery.usbNeeds}</td></tr>
                <tr><td>Control needs</td><td>{discovery.controlNeeds}</td></tr>
              </tbody>
            </table>

            {recommendedFamilies.length > 0 ? (
              <div className="wm-export-recommended">
                <strong>Recommended families:</strong> {recommendedFamilies.join(", ")}
              </div>
            ) : null}
          </section>

          <section className="wm-export-section">
            <h2>Selected Products</h2>
            <table className="wm-export-table">
              <thead>
                <tr>
                  <th className="wm-export-col-sku">SKU</th>
                  <th>Description</th>
                  <th className="wm-export-col-qty">Qty</th>
                </tr>
              </thead>
              <tbody>
                {productRows.length > 0 ? (
                  productRows.map((row) => (
                    <tr key={row.sku}>
                      <td>{row.sku}</td>
                      <td>{row.description}</td>
                      <td className="wm-export-align-right">{row.quantity}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td>-</td>
                    <td>No selected SKUs on this project yet.</td>
                    <td className="wm-export-align-right">-</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

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

          <div className="wm-print-footer">
            <span>WyreStorm Wingman | Project Snapshot</span>
            <span className="wm-print-footer__page">Page </span>
          </div>
        </div>
      </div>
    </div>
  );
}
