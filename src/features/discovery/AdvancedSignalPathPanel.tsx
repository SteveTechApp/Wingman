import * as React from "react";
import {
  emptyDiscoveryConnection,
  normalizeDiscoveryAdvanced,
  recommendDiscoveryFamiliesAdvanced,
  type DiscoveryCableManagement,
  type DiscoveryResolutionPreset,
  type DiscoveryRoutePreset,
  type DiscoveryUsbBandwidth,
  type DiscoveryVideoProfile,
} from "./DiscoveryAdvanced";

type Props = {
  record: any;
  setRecord: React.Dispatch<React.SetStateAction<any>>;
};

function sameArray(a: unknown, b: unknown): boolean {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export default function AdvancedSignalPathPanel({ record, setRecord }: Props) {
  const safe = normalizeDiscoveryAdvanced(record);

  React.useEffect(() => {
    const needsNormalize =
      record == null ||
      typeof record !== "object" ||
      record.defaultResolution == null ||
      record.defaultVideoProfile == null ||
      record.defaultRoutePreset == null ||
      record.defaultCableManagement == null ||
      record.defaultUsbBandwidth == null ||
      record.detailConnectionsEnabled == null ||
      !Array.isArray(record.connections);

    if (needsNormalize) {
      setRecord((prev: any) => normalizeDiscoveryAdvanced(prev));
    }
  }, [record, setRecord]);

  React.useEffect(() => {
    const next = recommendDiscoveryFamiliesAdvanced(safe);
    const current = Array.isArray(safe.recommendedFamilies) ? safe.recommendedFamilies : [];
    if (!sameArray(current, next)) {
      setRecord((prev: any) => ({ ...prev, recommendedFamilies: next }));
    }
  }, [safe, setRecord]);

  function patchRecord(patch: Record<string, any>) {
    setRecord((prev: any) => normalizeDiscoveryAdvanced({ ...prev, ...patch }));
  }

  function updateConnection(id: string, patch: Record<string, any>) {
    setRecord((prev: any) => {
      const current = normalizeDiscoveryAdvanced(prev);
      return {
        ...current,
        connections: current.connections.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      };
    });
  }

  function addConnection() {
    setRecord((prev: any) => {
      const current = normalizeDiscoveryAdvanced(prev);
      return {
        ...current,
        detailConnectionsEnabled: true,
        connections: [
          ...current.connections,
          emptyDiscoveryConnection({
            label: `Signal path ${current.connections.length + 1}`,
            expectedDistanceM: String(current.cableDistanceM ?? ""),
            resolution: current.defaultResolution,
            videoProfile: current.defaultVideoProfile,
            routePreset: current.defaultRoutePreset,
            cableManagement: current.defaultCableManagement,
            usbBandwidth: current.defaultUsbBandwidth,
          }),
        ],
      };
    });
  }

  function removeConnection(id: string) {
    setRecord((prev: any) => {
      const current = normalizeDiscoveryAdvanced(prev);
      return {
        ...current,
        connections: current.connections.filter((c) => c.id !== id),
      };
    });
  }

  const panelStyle: React.CSSProperties = {
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 16,
    display: "grid",
    gap: 14,
    marginTop: 16,
  };

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  };

  const labelStyle: React.CSSProperties = {
    display: "grid",
    gap: 6,
  };

  const nestedStyle: React.CSSProperties = {
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: 12,
    display: "grid",
    gap: 10,
  };

  return (
    <section style={panelStyle}>
      <div>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>
          Signal path & transport detail
        </div>
        <div style={{ opacity: 0.8, fontSize: 13 }}>
          Keep the fast estimate, or optionally define each connection path for better distance and product-family accuracy.
        </div>
      </div>

      <div style={gridStyle}>
        <label style={labelStyle}>
          <span>Expected Longest distance (m)</span>
          <input
            value={String(safe.cableDistanceM ?? "")}
            onChange={(e) => patchRecord({ cableDistanceM: e.target.value })}
          />
        </label>

        <label style={labelStyle}>
          <span>Default Resolution</span>
          <select
            value={safe.defaultResolution}
            onChange={(e) => patchRecord({ defaultResolution: e.target.value as DiscoveryResolutionPreset })}
          >
            <option value="1080p">1080p</option>
            <option value="2K">2K</option>
            <option value="4K">4K</option>
            <option value="5K">5K</option>
            <option value="8K">8K</option>
            <option value="CUSTOM">CUSTOM</option>
          </select>
        </label>

        <label style={labelStyle}>
          <span>Signal Profile</span>
          <select
            value={safe.defaultVideoProfile}
            onChange={(e) => patchRecord({ defaultVideoProfile: e.target.value as DiscoveryVideoProfile })}
          >
            <option value="Auto">Auto</option>
            <option value="1080p60">1080p60</option>
            <option value="2K60">2K60</option>
            <option value="4K30 HDR">4K30 HDR</option>
            <option value="4K60 HDR">4K60 HDR</option>
            <option value="5K">5K</option>
            <option value="8K">8K</option>
            <option value="Custom">Custom</option>
          </select>
        </label>

        <label style={labelStyle}>
          <span>Default Route</span>
          <select
            value={safe.defaultRoutePreset}
            onChange={(e) => patchRecord({ defaultRoutePreset: e.target.value as DiscoveryRoutePreset })}
          >
            <option value="Direct">Direct</option>
            <option value="Via Central Rack">Via Central Rack</option>
            <option value="Via Local Rack">Via Local Rack</option>
            <option value="Under Table / Floor Box">Under Table / Floor Box</option>
            <option value="Unknown">Unknown</option>
          </select>
        </label>

        <label style={labelStyle}>
          <span>Cable Management</span>
          <select
            value={safe.defaultCableManagement}
            onChange={(e) => patchRecord({ defaultCableManagement: e.target.value as DiscoveryCableManagement })}
          >
            <option value="None">None</option>
            <option value="IDB-300">IDB-300</option>
            <option value="Floor Box">Floor Box</option>
            <option value="Conduit / Trunking">Conduit / Trunking</option>
            <option value="Other">Other</option>
          </select>
        </label>

        <label style={labelStyle}>
          <span>USB Requirement</span>
          <select
            value={safe.defaultUsbBandwidth}
            onChange={(e) => patchRecord({ defaultUsbBandwidth: e.target.value as DiscoveryUsbBandwidth })}
          >
            <option value="None">None</option>
            <option value="USB 2.0">USB 2.0</option>
            <option value="USB 3.0">USB 3.0</option>
          </select>
        </label>
      </div>

      {(safe.defaultResolution === "CUSTOM" || safe.defaultVideoProfile === "Custom") && (
        <label style={labelStyle}>
          <span>Custom Video Format</span>
          <input
            placeholder="Example: 3840x2160@60 4:4:4 HDR10"
            value={safe.customVideoFormat}
            onChange={(e) => patchRecord({ customVideoFormat: e.target.value })}
          />
        </label>
      )}

      <label style={{ display: "flex", gap: 8, alignItems: "center", paddingTop: 4 }}>
        <input
          type="checkbox"
          checked={Boolean(safe.detailConnectionsEnabled)}
          onChange={(e) => {
            if (e.target.checked && safe.connections.length === 0) {
              patchRecord({
                detailConnectionsEnabled: true,
                connections: [
                  emptyDiscoveryConnection({
                    label: "Signal path 1",
                    expectedDistanceM: String(safe.cableDistanceM ?? ""),
                    resolution: safe.defaultResolution,
                    videoProfile: safe.defaultVideoProfile,
                    routePreset: safe.defaultRoutePreset,
                    cableManagement: safe.defaultCableManagement,
                    usbBandwidth: safe.defaultUsbBandwidth,
                  }),
                ],
              });
              return;
            }

            patchRecord({ detailConnectionsEnabled: e.target.checked });
          }}
        />
        <span>Define individual connection paths (optional)</span>
      </label>

      {safe.detailConnectionsEnabled && (
        <div style={{ display: "grid", gap: 12 }}>
          {safe.connections.map((conn, index) => (
            <div key={conn.id} style={nestedStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                <strong>{conn.label || `Signal path ${index + 1}`}</strong>
                <button type="button" onClick={() => removeConnection(conn.id)}>Remove</button>
              </div>
            </div>
          ))}

          <div>
            <button type="button" onClick={addConnection}>Add connection path</button>
          </div>
        </div>
      )}
    </section>
  );
}