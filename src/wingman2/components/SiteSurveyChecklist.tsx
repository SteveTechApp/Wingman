import { useMemo, useState, useCallback, useEffect } from "react";
import {
  ClipboardCheck,
  Download,
  Printer,
  MapPin,
  Cable,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Wifi,
  WifiOff,
  Save,
  RotateCcw,
  GitCompareArrows,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import type { StoredProject, StoredProductSelection } from "../data/projectStore";
import { SiteSurveyPhotoCapture } from "./SiteSurveyPhotoCapture";
import type { SiteSurveyPhotoResult, PhotoExtractionMapping } from "../lib/siteSurveyPhotoAnalysis";
import type { PhotoToTopologyResult } from "../lib/siteSurveyPhotoToTopology";
import type { ProjectTopology } from "../lib/projectTopology";
import {
  buildSiteSurveyChecklist,
  printSiteSurveyChecklist,
  downloadSiteSurveyHtml,
  type SurveyChecklist,
  type SurveyLocation,
  type SurveyCable,
} from "../lib/siteSurveyChecklist";
import {
  getProjectEdits,
  getInstallChecked,
  setInstallChecked,
  setCableLength,
  setCableConfirmed,
  setCableNotes,
  setDeviceVerified,
  setLocationNotes,
  getSurveyProgress,
  isOnline,
  clearProjectEdits,
  buildCableComparisons,
  buildComparisonSummary,
  type SurveyProjectEdits,
  type CableComparison,
  type ComparisonSummary,
} from "../lib/siteSurveyStorage";
import {
  startSurveySync,
  stopSurveySync,
  onSyncStatusChange,
  type SurveySyncStatus,
} from "../lib/siteSurveySync";

type SiteSurveyChecklistProps = {
  project: StoredProject;
  productSelections?: StoredProductSelection[];
};

export function SiteSurveyChecklist({ project, productSelections }: SiteSurveyChecklistProps) {
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set());
  const [expandedCables, setExpandedCables] = useState(true);
  const [edits, setEdits] = useState<SurveyProjectEdits>(() => getProjectEdits(project.id));
  const [online, setOnline] = useState(isOnline());
  const [showNotes, setShowNotes] = useState(false);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [installChecked, setInstallCheckedState] = useState<Set<string>>(
    () => new Set(getInstallChecked(project.id)),
  );
  const [syncStatus, setSyncStatus] = useState<SurveySyncStatus>({
    state: "idle",
    message: "Not synced",
    lastSyncedAt: null,
    pendingChanges: 0,
  });

  const checklist = useMemo(
    () => buildSiteSurveyChecklist(project, productSelections),
    [project, productSelections],
  );

  const installItemIds = useMemo(
    () => (checklist.installItems ?? []).map((item) => item.id),
    [checklist],
  );

  const progress = useMemo(
    () => getSurveyProgress(project.id, installItemIds),
    [project.id, edits, installChecked, installItemIds],
  );

  // Comparison mode data
  const comparisons = useMemo(
    () => buildCableComparisons(project.id, checklist.cables),
    [project.id, checklist.cables, edits],
  );
  const comparisonSummary = useMemo(
    () => buildComparisonSummary(comparisons),
    [comparisons],
  );

  // Listen for online/offline events
  useEffect(() => {
    function handleOnline() { setOnline(true); }
    function handleOffline() { setOnline(false); }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Refresh edits when project changes
  useEffect(() => {
    setEdits(getProjectEdits(project.id));
  }, [project.id]);

  // Start/stop real-time sync
  useEffect(() => {
    startSurveySync(project.id);

    const unsubscribe = onSyncStatusChange((status) => {
      setSyncStatus(status);
    });

    // Listen for server updates
    function handleSyncUpdate(event: Event) {
      const detail = (event as CustomEvent).detail;
      if (detail?.projectId === project.id) {
        setEdits(getProjectEdits(project.id));
      }
    }
    window.addEventListener("wingman:survey-sync-update", handleSyncUpdate);

    return () => {
      stopSurveySync();
      unsubscribe();
      window.removeEventListener("wingman:survey-sync-update", handleSyncUpdate);
    };
  }, [project.id]);

  const refreshEdits = useCallback(() => {
    setEdits(getProjectEdits(project.id));
  }, [project.id]);

  function toggleInstallItem(id: string) {
    setInstallCheckedState((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setInstallChecked(project.id, [...next]);
      return next;
    });
  }

  function toggleLocation(id: string) {
    setExpandedLocations((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function expandAllLocations() {
    setExpandedLocations(new Set(checklist.locations.map((l) => l.id)));
  }

  function collapseAllLocations() {
    setExpandedLocations(new Set());
  }

  function handleCableLengthChange(cableId: string, value: string) {
    const num = value === "" ? undefined : Number(value);
    if (num !== undefined && (Number.isNaN(num) || num < 0)) return;
    setCableLength(project.id, cableId, num);
    refreshEdits();
  }

  function handleCableConfirmedChange(cableId: string, checked: boolean) {
    setCableConfirmed(project.id, cableId, checked);
    refreshEdits();
  }

  function handleCableNotesChange(cableId: string, value: string) {
    setCableNotes(project.id, cableId, value);
    refreshEdits();
  }

  function handleDeviceVerifiedChange(deviceId: string, checked: boolean) {
    setDeviceVerified(project.id, deviceId, checked);
    refreshEdits();
  }

  function handleLocationNotesChange(locationId: string, value: string) {
    setLocationNotes(project.id, locationId, value);
    refreshEdits();
  }

  function handleClearAll() {
    if (confirm("Clear all on-site survey edits for this project?")) {
      clearProjectEdits(project.id);
      refreshEdits();
    }
  }

  function handleExportEdits() {
    const data = JSON.stringify(edits, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `site-survey-edits-${project.id}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function handleTopologyUpdate(_updatedTopology: ProjectTopology, result: PhotoToTopologyResult) {
    // Show summary of what was added
    const summary = [
      result.locationsAdded.length > 0 ? `${result.locationsAdded.length} location(s) added` : null,
      result.devicesAdded.length > 0 ? `${result.devicesAdded.length} device(s) added` : null,
      result.connectionsAdded.length > 0 ? `${result.connectionsAdded.length} cable(s) added` : null,
    ].filter(Boolean).join(", ");

    if (summary) {
      alert(
        `Photo analysis results applied to topology:\n\n${summary}\n\n` +
        (result.warnings.length > 0 ? `Notes:\n${result.warnings.join("\n")}` : "") +
        "\n\nThe topology has been updated. Refresh the checklist to see the new items."
      );
    } else {
      alert("No new items were added to the topology.");
    }
  }

  function handlePhotoExtraction(_extraction: SiteSurveyPhotoResult, mapping: PhotoExtractionMapping) {
    // Show confirmation with extracted data
    const itemCount = mapping.locationsToCreate.length + mapping.equipmentToCreate.length + mapping.cablesToCreate.length;
    if (itemCount === 0) {
      alert("No new items to add - all detected equipment and locations already exist in the topology.");
      return;
    }

    const confirmed = confirm(
      `Apply ${mapping.locationsToCreate.length} location(s), ` +
      `${mapping.equipmentToCreate.length} device(s), and ` +
      `${mapping.cablesToCreate.length} cable(s) to the checklist?\n\n` +
      "This will add the extracted items to your project topology."
    );

    if (confirmed) {
      // In a real implementation, this would update the project topology
      // For now, we show what was extracted
      alert(
        "Photo analysis extracted:\n\n" +
        `Locations: ${mapping.locationsToCreate.map((l) => l.name).join(", ") || "none"}\n` +
        `Equipment: ${mapping.equipmentToCreate.map((e) => e.name).join(", ") || "none"}\n` +
        `Cables: ${mapping.cablesToCreate.map((c) => `${c.fromEquipment} → ${c.toEquipment}`).join("\n") || "none"}\n\n` +
        "Note: Full topology integration requires updating the Discovery topology."
      );
    }
  }

  const hasTopology = checklist.locations.length > 0 || checklist.cables.length > 0;

  if (!hasTopology) {
    return (
      <div className="wm-survey-checklist wm-ui-card rounded-2xl border p-5">
        <header className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <ClipboardCheck size={18} className="text-cyan-400" aria-hidden="true" />
            <p className="wm-ui-kicker">Site Survey</p>
          </div>
          <h2 className="wm-ui-title text-lg font-black">Site Survey Checklist</h2>
        </header>
        <p className="wm-ui-copy text-sm opacity-70 mb-4">
          Complete the Discovery topology (locations, devices, and cable runs) to generate a
          printable site survey checklist.
        </p>
        <div className="wm-survey-empty">
          <AlertTriangle size={16} className="text-amber-400" aria-hidden="true" />
          <span className="text-xs text-amber-300">No topology data available. Run Discovery first.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="wm-survey-checklist wm-ui-card rounded-2xl border p-5">
      <header className="mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 mb-1">
            <ClipboardCheck size={18} className="text-cyan-400" aria-hidden="true" />
            <p className="wm-ui-kicker">Site Survey</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Comparison mode toggle */}
            {checklist.cables.length > 0 && (
              <button
                type="button"
                className={`wm-survey-compare-toggle ${comparisonMode ? "wm-survey-compare-toggle--active" : ""}`}
                onClick={() => setComparisonMode(!comparisonMode)}
                title="Compare planned vs actual cable distances"
              >
                <GitCompareArrows size={12} aria-hidden="true" />
                <span className="text-[10px]">{comparisonMode ? "Exit Compare" : "Compare"}</span>
              </button>
            )}
            {/* Online/offline indicator */}
            <div className={`wm-survey-online-badge ${online ? "wm-survey-online-badge--online" : "wm-survey-online-badge--offline"}`}>
              {online ? <Wifi size={12} /> : <WifiOff size={12} />}
              <span className="text-[10px]">{online ? "Online" : "Offline"}</span>
            </div>
            {/* Sync status indicator */}
            {online && (
              <div className={`wm-survey-sync-badge wm-survey-sync-badge--${syncStatus.state}`}>
                <span className="text-[10px]">{syncStatus.message}</span>
                {syncStatus.pendingChanges > 0 && (
                  <span className="text-[10px] opacity-60">({syncStatus.pendingChanges})</span>
                )}
              </div>
            )}
          </div>
        </div>
        <h2 className="wm-ui-title text-lg font-black">Site Survey Checklist</h2>
        <p className="wm-ui-copy text-sm opacity-70">
          Fill in actual cable lengths and verify equipment on-site. Changes save locally and work offline.
        </p>
      </header>

      {/* Photo capture for auto-population */}
      <SiteSurveyPhotoCapture
        onExtractionReady={handlePhotoExtraction}
        onTopologyUpdate={handleTopologyUpdate}
        existingTopology={project.discoveryBrief?.topology ?? { schemaVersion: 1, mode: "simple", locations: [], devices: [], connections: [], generatedFromDiscovery: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }}
        existingLocationNames={checklist.locations.map((l) => l.name)}
        existingEquipmentNames={checklist.locations.flatMap((l) => l.devices.map((d) => d.name))}
      />

      {/* Progress bar */}
      <div className="wm-survey-progress">
        <div className="wm-survey-progress-header">
          <span className="text-xs font-semibold">On-site Progress</span>
          <span className="text-xs text-cyan-400">{progress.completionPercent}%</span>
        </div>
        <div className="wm-survey-progress-bar">
          <div
            className="wm-survey-progress-fill"
            style={{ width: `${progress.completionPercent}%` }}
          />
        </div>
        <div className="wm-survey-progress-stats">
          <span className="text-[10px] text-white/50">
            {progress.confirmedCables}/{progress.totalCables} cables confirmed
          </span>
          <span className="text-[10px] text-white/50">
            {progress.verifiedDevices} devices verified
          </span>
          <span className="text-[10px] text-white/50">
            {progress.confirmedInstallItems}/{progress.totalInstallItems} install details confirmed
          </span>
        </div>
      </div>

      {/* Summary cards */}
      <div className="wm-survey-summary">
        <div className="wm-survey-summary-card">
          <MapPin size={16} className="text-cyan-400" aria-hidden="true" />
          <div>
            <span className="wm-survey-summary-number">{checklist.locations.length}</span>
            <span className="wm-survey-summary-label">Locations</span>
          </div>
        </div>
        <div className="wm-survey-summary-card">
          <ClipboardCheck size={16} className="text-blue-400" aria-hidden="true" />
          <div>
            <span className="wm-survey-summary-number">{checklist.totalDevices}</span>
            <span className="wm-survey-summary-label">Devices</span>
          </div>
        </div>
        <div className="wm-survey-summary-card">
          <Cable size={16} className="text-emerald-400" aria-hidden="true" />
          <div>
            <span className="wm-survey-summary-number">{checklist.totalCables}</span>
            <span className="wm-survey-summary-label">Cable Runs</span>
          </div>
        </div>
        <div className="wm-survey-summary-card">
          <span className="text-lg font-bold text-amber-400">
            {checklist.estimatedCableMetres + checklist.confirmedCableMetres}m
          </span>
          <span className="wm-survey-summary-label">Total Cable</span>
        </div>
      </div>

      {/* Cable statistics */}
      <div className="wm-survey-cable-stats">
        <div className="wm-survey-stat">
          <CheckCircle2 size={12} className="text-emerald-400" aria-hidden="true" />
          <span className="text-xs">{checklist.confirmedCableMetres}m confirmed</span>
        </div>
        <div className="wm-survey-stat">
          <AlertTriangle size={12} className="text-amber-400" aria-hidden="true" />
          <span className="text-xs">{checklist.estimatedCableMetres}m estimated</span>
        </div>
        {checklist.unknownCableCount > 0 && (
          <div className="wm-survey-stat">
            <AlertTriangle size={12} className="text-red-400" aria-hidden="true" />
            <span className="text-xs">{checklist.unknownCableCount} length TBC</span>
          </div>
        )}
      </div>

      {/* Port summary */}
      {checklist.portSummary.length > 0 && (
        <div className="wm-survey-section">
          <h3 className="wm-survey-section-title">Port Summary</h3>
          <div className="wm-survey-port-tags">
            {checklist.portSummary.map((p) => (
              <span key={p.transport} className="wm-survey-port-tag">
                <span className="font-semibold">{p.transport}</span>
                <span className="opacity-60">×{p.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Locations */}
      <div className="wm-survey-section">
        <div className="flex items-center justify-between mb-2">
          <h3 className="wm-survey-section-title">Locations & Equipment</h3>
          <div className="flex gap-2">
            <button type="button" className="text-[10px] text-white/40 hover:text-white/60" onClick={expandAllLocations}>
              Expand all
            </button>
            <button type="button" className="text-[10px] text-white/40 hover:text-white/60" onClick={collapseAllLocations}>
              Collapse all
            </button>
          </div>
        </div>
        <div className="wm-survey-locations">
          {checklist.locations.map((loc) => (
            <LocationCard
              key={loc.id}
              location={loc}
              projectId={project.id}
              expanded={expandedLocations.has(loc.id)}
              onToggle={() => toggleLocation(loc.id)}
              edits={edits}
              onDeviceVerified={handleDeviceVerifiedChange}
              onLocationNotes={handleLocationNotesChange}
            />
          ))}
        </div>
      </div>

      {/* Installation details — confirmed on site, not during discovery */}
      <div className="wm-survey-section" data-testid="survey-install-details">
        <h3 className="wm-survey-section-title">Installation Details</h3>
        <p className="text-xs text-white/50 mb-2">
          Confirmed on site — these do not change the WyreStorm hardware selection but are required before installation.
        </p>
        <div className="wm-survey-install-list">
          {(checklist.installItems ?? []).map((item) => (
            <label key={item.id} className="wm-survey-install-item">
              <input
                type="checkbox"
                checked={installChecked.has(item.id)}
                onChange={() => toggleInstallItem(item.id)}
              />
              <span>
                <strong>{item.label}</strong>
                <small>{item.appliesTo ?? "All positions"} — {item.hint}</small>
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Comparison mode or cable runs */}
      {comparisonMode ? (
        <ComparisonView
          cables={checklist.cables}
          comparisons={comparisons}
          summary={comparisonSummary}
          projectId={project.id}
          edits={edits}
          onLengthChange={handleCableLengthChange}
          onConfirmedChange={handleCableConfirmedChange}
        />
      ) : (
        <div className="wm-survey-section">
          <button
            type="button"
            className="wm-survey-section-toggle"
            onClick={() => setExpandedCables(!expandedCables)}
          >
            <h3 className="wm-survey-section-title">
              Cable Runs ({checklist.cables.length})
            </h3>
            {expandedCables ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {expandedCables && (
            <div className="wm-survey-cables">
              {checklist.cables.map((cable, i) => (
                <CableRow
                  key={cable.id}
                  cable={cable}
                  index={i + 1}
                  projectId={project.id}
                  edits={edits}
                  onLengthChange={handleCableLengthChange}
                  onConfirmedChange={handleCableConfirmedChange}
                  onNotesChange={handleCableNotesChange}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="wm-survey-actions">
        <button
          type="button"
          className="wm-ui-button wm-ui-button-primary text-xs flex items-center gap-2"
          onClick={() => printSiteSurveyChecklist(checklist)}
        >
          <Printer size={14} aria-hidden="true" />
          Print Checklist / Save as PDF
        </button>
        <button
          type="button"
          className="wm-ui-button wm-ui-button-secondary text-xs flex items-center gap-2"
          onClick={() => downloadSiteSurveyHtml(checklist)}
        >
          <Download size={14} aria-hidden="true" />
          Download HTML
        </button>
        <button
          type="button"
          className="wm-ui-button wm-ui-button-secondary text-xs flex items-center gap-2"
          onClick={handleExportEdits}
          title="Export survey edits as JSON"
        >
          <Save size={14} aria-hidden="true" />
          Export Edits
        </button>
        <button
          type="button"
          className="wm-ui-button wm-ui-button-secondary text-xs flex items-center gap-2 opacity-60"
          onClick={handleClearAll}
          title="Clear all survey edits"
        >
          <RotateCcw size={14} aria-hidden="true" />
          Reset
        </button>
      </div>

      <p className="text-[10px] opacity-40 mt-2">
        {online
          ? "Edits save locally and are available offline. Export edits as JSON to share with the team."
          : "You are offline. All changes are saved locally and will persist."}
      </p>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Sub-components
   ────────────────────────────────────────────── */

function LocationCard({
  location,
  projectId,
  expanded,
  onToggle,
  edits,
  onDeviceVerified,
  onLocationNotes,
}: {
  location: SurveyLocation;
  projectId: string;
  expanded: boolean;
  onToggle: () => void;
  edits: SurveyProjectEdits;
  onDeviceVerified: (deviceId: string, verified: boolean) => void;
  onLocationNotes: (locationId: string, notes: string) => void;
}) {
  const locationEdit = edits.locationEdits[location.id];
  const verifiedCount = location.devices.filter(
    (d) => edits.deviceEdits[d.id]?.verified,
  ).length;

  return (
    <div className="wm-survey-location-card">
      <button
        type="button"
        className="wm-survey-location-header"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <MapPin size={12} className="text-cyan-400" aria-hidden="true" />
          <span className="font-semibold text-sm">{location.name}</span>
          <span className="text-[10px] text-white/40">
            {verifiedCount}/{location.devices.length} verified · {location.portCount} port{location.portCount !== 1 ? "s" : ""}
          </span>
        </div>
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {expanded && (
        <div className="wm-survey-location-devices">
          {location.devices.length === 0 ? (
            <p className="text-[10px] text-white/40 py-2">No devices at this location.</p>
          ) : (
            <table className="wm-survey-device-table">
              <thead>
                <tr>
                  <th style={{ width: "40px" }}>✓</th>
                  <th>Device</th>
                  <th>SKU</th>
                  <th>Qty</th>
                  <th>Ports</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {location.devices.map((device) => {
                  const verified = edits.deviceEdits[device.id]?.verified ?? false;
                  return (
                    <tr key={device.id} className={verified ? "wm-survey-row--verified" : ""}>
                      <td>
                        <label className="wm-survey-checkbox-label">
                          <input
                            type="checkbox"
                            className="wm-survey-checkbox"
                            checked={verified}
                            onChange={(e) => onDeviceVerified(device.id, e.target.checked)}
                          />
                        </label>
                      </td>
                      <td>
                        {device.name}
                        {device.thirdParty && <span className="text-[10px] text-white/40 ml-1">(3rd party)</span>}
                      </td>
                      <td className="font-mono text-[10px]">{device.sku ?? "—"}</td>
                      <td>{device.quantity}</td>
                      <td className="text-[10px]">{device.ports.length > 0 ? device.ports.join(", ") : "—"}</td>
                      <td>
                        <span className={`wm-survey-status wm-survey-status--${device.status}`}>
                          {device.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {/* Location notes */}
          <div className="wm-survey-notes-input">
            <label className="text-[10px] text-white/40 block mb-1">Integrator notes</label>
            <textarea
              className="wm-survey-textarea"
              placeholder="Observations, access issues, power availability..."
              value={locationEdit?.notes ?? ""}
              onChange={(e) => onLocationNotes(location.id, e.target.value)}
              rows={2}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function CableRow({
  cable,
  index,
  projectId,
  edits,
  onLengthChange,
  onConfirmedChange,
  onNotesChange,
}: {
  cable: SurveyCable;
  index: number;
  projectId: string;
  edits: SurveyProjectEdits;
  onLengthChange: (cableId: string, value: string) => void;
  onConfirmedChange: (cableId: string, checked: boolean) => void;
  onNotesChange: (cableId: string, value: string) => void;
}) {
  const cableEdit = edits.cableEdits[cable.id];
  const actualLength = cableEdit?.actualLengthMetres?.toString() ?? "";
  const confirmed = cableEdit?.confirmed ?? false;

  return (
    <div className={`wm-survey-cable-row ${confirmed ? "wm-survey-cable-row--confirmed" : ""}`}>
      <span className="wm-survey-cable-index">{index}</span>
      <div className="wm-survey-cable-endpoints">
        <div>
          <span className="text-xs font-semibold">{cable.fromDevice}</span>
          <span className="text-[10px] text-white/40 block">{cable.fromLocation}</span>
        </div>
        <span className="text-white/30 mx-2">→</span>
        <div>
          <span className="text-xs font-semibold">{cable.toDevice}</span>
          <span className="text-[10px] text-white/40 block">{cable.toLocation}</span>
        </div>
      </div>
      <div className="wm-survey-cable-details">
        <span className="wm-survey-transport-tag">{cable.transport}</span>
        <span className="text-[10px] text-white/50">{cable.services.join(", ")}</span>
      </div>
      <div className="wm-survey-cable-edit">
        {/* Original length */}
        <div className="wm-survey-cable-original">
          {cable.lengthMetres ? (
            <span className={`text-[10px] wm-survey-status wm-survey-status--${cable.lengthMode}`}>
              Plan: {cable.lengthMetres}m
            </span>
          ) : (
            <span className="text-[10px] text-red-400">Plan: TBC</span>
          )}
        </div>
        {/* Actual length input */}
        <div className="wm-survey-cable-input-group">
          <label className="text-[10px] text-white/40" htmlFor={`cable-${cable.id}`}>Actual:</label>
          <input
            id={`cable-${cable.id}`}
            type="number"
            className="wm-survey-cable-input"
            placeholder="m"
            value={actualLength}
            onChange={(e) => onLengthChange(cable.id, e.target.value)}
            min="0"
            step="0.5"
          />
          <span className="text-[10px] text-white/30">m</span>
        </div>
        {/* Confirm checkbox */}
        <label className="wm-survey-checkbox-label">
          <input
            type="checkbox"
            className="wm-survey-checkbox"
            checked={confirmed}
            onChange={(e) => onConfirmedChange(cable.id, e.target.checked)}
          />
          <span className="text-[10px] text-white/50">Confirmed</span>
        </label>
      </div>
      {/* Notes */}
      {confirmed && (
        <input
          type="text"
          className="wm-survey-cable-notes"
          placeholder="Notes (optional)"
          value={cableEdit?.integratorNotes ?? ""}
          onChange={(e) => onNotesChange(cable.id, e.target.value)}
        />
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────
   Comparison View
   ────────────────────────────────────────────── */

function ComparisonView({
  cables,
  comparisons,
  summary,
  projectId,
  edits,
  onLengthChange,
  onConfirmedChange,
}: {
  cables: SurveyCable[];
  comparisons: CableComparison[];
  summary: ComparisonSummary;
  projectId: string;
  edits: SurveyProjectEdits;
  onLengthChange: (cableId: string, value: string) => void;
  onConfirmedChange: (cableId: string, checked: boolean) => void;
}) {
  const cableById = new Map(cables.map((c) => [c.id, c]));

  return (
    <div className="wm-survey-section">
      <h3 className="wm-survey-section-title flex items-center gap-2">
        <GitCompareArrows size={14} className="text-cyan-400" aria-hidden="true" />
        Plan vs Actual Comparison
      </h3>

      {/* Summary stats */}
      <div className="wm-survey-compare-summary">
        <div className="wm-survey-compare-stat">
          <CheckCircle2 size={14} className="text-emerald-400" aria-hidden="true" />
          <div>
            <span className="wm-survey-compare-stat-number text-emerald-400">{summary.matchCount}</span>
            <span className="wm-survey-compare-stat-label">Match</span>
          </div>
        </div>
        <div className="wm-survey-compare-stat">
          <AlertTriangle size={14} className="text-amber-400" aria-hidden="true" />
          <div>
            <span className="wm-survey-compare-stat-number text-amber-400">{summary.closeCount}</span>
            <span className="wm-survey-compare-stat-label">Close</span>
          </div>
        </div>
        <div className="wm-survey-compare-stat">
          <AlertTriangle size={14} className="text-red-400" aria-hidden="true" />
          <div>
            <span className="wm-survey-compare-stat-number text-red-400">{summary.divergentCount}</span>
            <span className="wm-survey-compare-stat-label">Divergent</span>
          </div>
        </div>
        <div className="wm-survey-compare-stat">
          <Minus size={14} className="text-white/40" aria-hidden="true" />
          <div>
            <span className="wm-survey-compare-stat-number text-white/40">{summary.unmeasuredCount}</span>
            <span className="wm-survey-compare-stat-label">Unmeasured</span>
          </div>
        </div>
      </div>

      {/* Total variance */}
      <div className="wm-survey-compare-totals">
        <span className="text-xs text-white/60">
          Total planned: <strong className="text-white">{summary.totalPlannedMetres}m</strong>
        </span>
        <span className="text-xs text-white/60">
          Total actual: <strong className="text-white">{summary.totalActualMetres}m</strong>
        </span>
        {summary.totalPlannedMetres > 0 && summary.totalActualMetres > 0 && (
          <span className={`text-xs font-semibold ${
            Math.abs(summary.totalActualMetres - summary.totalPlannedMetres) <= summary.totalPlannedMetres * 0.1
              ? "text-emerald-400"
              : Math.abs(summary.totalActualMetres - summary.totalPlannedMetres) <= summary.totalPlannedMetres * 0.2
                ? "text-amber-400"
                : "text-red-400"
          }`}>
            ({summary.totalActualMetres > summary.totalPlannedMetres ? "+" : ""}
            {summary.totalActualMetres - summary.totalPlannedMetres}m)
          </span>
        )}
      </div>

      {/* Max variance warning */}
      {summary.maxVariance && summary.maxVariance.actualMetres !== undefined && (
        <div className="wm-survey-compare-warning">
          <AlertTriangle size={12} className="text-amber-400" aria-hidden="true" />
          <span className="text-xs text-amber-300">
            Largest variance: Cable #{cables.findIndex((c) => c.id === summary.maxVariance!.cableId) + 1}
            ({summary.maxVariance.varianceMetres > 0 ? "+" : ""}{summary.maxVariance.varianceMetres}m,
            {summary.maxVariance.variancePercent > 0 ? "+" : ""}{summary.maxVariance.variancePercent}%)
          </span>
        </div>
      )}

      {/* Comparison table */}
      <div className="wm-survey-compare-table-wrap">
        <table className="wm-survey-compare-table">
          <thead>
            <tr>
              <th>#</th>
              <th>From</th>
              <th>To</th>
              <th>Transport</th>
              <th>Planned</th>
              <th>Actual</th>
              <th>Variance</th>
              <th>Status</th>
              <th>Confirm</th>
            </tr>
          </thead>
          <tbody>
            {comparisons.map((comp, i) => {
              const cable = cableById.get(comp.cableId);
              if (!cable) return null;
              const cableEdit = edits.cableEdits[comp.cableId];
              const statusClass = `wm-survey-compare-status--${comp.status}`;

              return (
                <tr key={comp.cableId} className={`wm-survey-compare-row ${statusClass}`}>
                  <td className="wm-survey-compare-index">{i + 1}</td>
                  <td>
                    <span className="text-xs font-semibold">{cable.fromDevice}</span>
                    <span className="text-[10px] text-white/40 block">{cable.fromLocation}</span>
                  </td>
                  <td>
                    <span className="text-xs font-semibold">{cable.toDevice}</span>
                    <span className="text-[10px] text-white/40 block">{cable.toLocation}</span>
                  </td>
                  <td>
                    <span className="wm-survey-transport-tag">{cable.transport}</span>
                  </td>
                  <td className="text-center">
                    {comp.plannedMetres ? (
                      <span className="text-xs text-white/70">{comp.plannedMetres}m</span>
                    ) : (
                      <span className="text-xs text-red-400">TBC</span>
                    )}
                  </td>
                  <td className="text-center">
                    <input
                      type="number"
                      className="wm-survey-cable-input"
                      placeholder="m"
                      value={cableEdit?.actualLengthMetres?.toString() ?? ""}
                      onChange={(e) => onLengthChange(comp.cableId, e.target.value)}
                      min="0"
                      step="0.5"
                    />
                  </td>
                  <td className="text-center">
                    {comp.actualMetres !== undefined && comp.plannedMetres !== undefined ? (
                      <span className={`text-xs font-semibold ${
                        comp.status === "match" ? "text-emerald-400"
                          : comp.status === "close" ? "text-amber-400"
                            : "text-red-400"
                      }`}>
                        {comp.varianceMetres > 0 ? "+" : ""}{comp.varianceMetres}m
                        <span className="text-[10px] ml-1 opacity-70">
                          ({comp.variancePercent > 0 ? "+" : ""}{comp.variancePercent}%)
                        </span>
                      </span>
                    ) : (
                      <span className="text-xs text-white/30">—</span>
                    )}
                  </td>
                  <td className="text-center">
                    <span className={`wm-survey-compare-badge ${statusClass}`}>
                      {comp.status === "match" && <CheckCircle2 size={10} />}
                      {comp.status === "close" && <AlertTriangle size={10} />}
                      {comp.status === "divergent" && <AlertTriangle size={10} />}
                      {comp.status === "unmeasured" && <Minus size={10} />}
                      <span>{comp.status}</span>
                    </span>
                  </td>
                  <td className="text-center">
                    <input
                      type="checkbox"
                      className="wm-survey-checkbox"
                      checked={cableEdit?.confirmed ?? false}
                      onChange={(e) => onConfirmedChange(comp.cableId, e.target.checked)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-white/40 mt-3">
        <strong>Match:</strong> within 10% or 1m. <strong>Close:</strong> within 20% or 3m. <strong>Divergent:</strong> more than 20% or 3m off.
      </p>
    </div>
  );
}
