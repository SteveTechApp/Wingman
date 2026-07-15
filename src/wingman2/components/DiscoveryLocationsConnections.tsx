import { useMemo, useState } from "react";
import {
  PROJECT_CONNECTION_SERVICE_OPTIONS,
  PROJECT_LOCATION_OPTIONS,
  PROJECT_TRANSPORT_OPTIONS,
  generateProjectTopologyFromDiscovery,
  normaliseProjectTopology,
  projectTopologyMissingInformation,
  projectTopologySummary,
  type DiscoveryTopologySeed,
  type ProjectConnection,
  type ProjectConnectionService,
  type ProjectDevice,
  type ProjectLocation,
  type ProjectTopology,
} from "../lib/projectTopology";

type DiscoveryLocationsConnectionsProps = {
  value: ProjectTopology;
  seed: DiscoveryTopologySeed;
  onChange: (next: ProjectTopology) => void;
};

function timestamp(): string {
  return new Date().toISOString();
}

function nextId(prefix: string, ids: string[]): string {
  const existing = new Set(ids);
  let index = existing.size + 1;
  let candidate = `${prefix}-${index}`;
  while (existing.has(candidate)) {
    index += 1;
    candidate = `${prefix}-${index}`;
  }
  return candidate;
}

function updateTopology(value: ProjectTopology, patch: Partial<ProjectTopology>): ProjectTopology {
  return normaliseProjectTopology({
    ...value,
    ...patch,
    updatedAt: timestamp(),
  });
}

export default function DiscoveryLocationsConnections({
  value,
  seed,
  onChange,
}: DiscoveryLocationsConnectionsProps) {
  const topology = normaliseProjectTopology(value);
  const [showAdvanced, setShowAdvanced] = useState(topology.mode === "advanced");
  const deviceById = useMemo(
    () => new Map(topology.devices.map((device) => [device.id, device])),
    [topology.devices],
  );
  const missingInformation = useMemo(
    () => projectTopologyMissingInformation(topology),
    [topology],
  );

  function emit(next: ProjectTopology): void {
    onChange(normaliseProjectTopology({ ...next, updatedAt: timestamp() }));
  }

  function regenerate(): void {
    const generated = generateProjectTopologyFromDiscovery({
      ...seed,
      existing: undefined,
    });
    emit({ ...generated, mode: showAdvanced ? "advanced" : "simple" });
  }

  function toggleMode(): void {
    const advanced = !showAdvanced;
    setShowAdvanced(advanced);
    emit(updateTopology(topology, { mode: advanced ? "advanced" : "simple" }));
  }

  function updateLocation(id: string, patch: Partial<ProjectLocation>): void {
    emit(updateTopology(topology, {
      locations: topology.locations.map((location) =>
        location.id === id ? { ...location, ...patch } : location,
      ),
    }));
  }

  function addLocation(): void {
    const id = nextId("location-custom", topology.locations.map((item) => item.id));
    emit(updateTopology(topology, {
      locations: [
        ...topology.locations,
        { id, name: "New project location", type: "custom" },
      ],
    }));
  }

  function removeLocation(id: string): void {
    if (topology.locations.length <= 1) return;
    const fallbackId = topology.locations.find((item) => item.id !== id)?.id ?? "";
    emit(updateTopology(topology, {
      locations: topology.locations.filter((location) => location.id !== id),
      devices: topology.devices.map((device) =>
        device.locationId === id ? { ...device, locationId: fallbackId, status: "unknown" } : device,
      ),
    }));
  }

  function updateDevice(id: string, patch: Partial<ProjectDevice>): void {
    emit(updateTopology(topology, {
      devices: topology.devices.map((device) =>
        device.id === id ? { ...device, ...patch } : device,
      ),
    }));
  }

  function addDevice(): void {
    const id = nextId("device-custom", topology.devices.map((item) => item.id));
    const locationId = topology.locations[0]?.id ?? "";
    emit(updateTopology(topology, {
      devices: [
        ...topology.devices,
        {
          id,
          name: "New device / placeholder",
          category: "other",
          locationId,
          quantity: 1,
          thirdParty: true,
          status: "unknown",
        },
      ],
    }));
  }

  function removeDevice(id: string): void {
    emit(updateTopology(topology, {
      devices: topology.devices.filter((device) => device.id !== id),
      connections: topology.connections.filter(
        (connection) => connection.fromDeviceId !== id && connection.toDeviceId !== id,
      ),
    }));
  }

  function updateConnection(id: string, patch: Partial<ProjectConnection>): void {
    emit(updateTopology(topology, {
      connections: topology.connections.map((connection) =>
        connection.id === id ? { ...connection, ...patch } : connection,
      ),
    }));
  }

  function toggleConnectionService(connection: ProjectConnection, service: ProjectConnectionService): void {
    const services = connection.services.includes(service)
      ? connection.services.filter((item) => item !== service)
      : [...connection.services, service];
    updateConnection(connection.id, { services: services.length ? services : ["video"] });
  }

  function addConnection(): void {
    if (topology.devices.length < 2) return;
    const id = nextId("connection-custom", topology.connections.map((item) => item.id));
    emit(updateTopology(topology, {
      connections: [
        ...topology.connections,
        {
          id,
          fromDeviceId: topology.devices[0].id,
          toDeviceId: topology.devices[1].id,
          services: ["video"],
          transport: "unknown",
          lengthMode: "unknown",
          status: "unknown",
        },
      ],
    }));
  }

  function removeConnection(id: string): void {
    emit(updateTopology(topology, {
      connections: topology.connections.filter((connection) => connection.id !== id),
    }));
  }

  return (
    <section className="wm-topology-editor wm-ui-card" aria-label="Locations and connections editor">
      <header className="wm-topology-editor-head">
        <div>
          <span>Suggested project topology</span>
          <strong>{projectTopologySummary(topology)}</strong>
          <small>
            Estimated lengths are planning allowances only. Mark surveyed routes as confirmed before final quoting.
          </small>
        </div>
        <div className="wm-topology-editor-actions">
          <button className="wm-ui-button wm-ui-button-secondary" type="button" onClick={regenerate}>
            Rebuild suggestions
          </button>
          <button className="wm-ui-button wm-ui-button-secondary" type="button" onClick={toggleMode}>
            {showAdvanced ? "Use simple view" : "Show advanced fields"}
          </button>
        </div>
      </header>

      <div className="wm-topology-stat-grid">
        <div><strong>{topology.locations.length}</strong><span>Locations</span></div>
        <div><strong>{topology.devices.length}</strong><span>Devices</span></div>
        <div><strong>{topology.connections.length}</strong><span>Connections</span></div>
        <div><strong>{missingInformation.length}</strong><span>Checks remaining</span></div>
      </div>

      <section className="wm-topology-section">
        <div className="wm-topology-section-head">
          <div><span>1</span><strong>Device locations</strong></div>
          <button className="wm-ui-button wm-ui-button-secondary" type="button" onClick={addLocation}>Add location</button>
        </div>
        <div className="wm-topology-location-grid">
          {topology.locations.map((location) => (
            <article className="wm-topology-location-card" key={location.id}>
              <label>
                Location name
                <input className="wm-ui-input" value={location.name} onChange={(event) => updateLocation(location.id, { name: event.target.value })} />
              </label>
              <label>
                Location type
                <select className="wm-ui-input" value={location.type} onChange={(event) => updateLocation(location.id, { type: event.target.value as ProjectLocation["type"] })}>
                  {PROJECT_LOCATION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              {showAdvanced ? (
                <>
                  <label>
                    Building / floor
                    <input className="wm-ui-input" value={location.buildingId ?? ""} onChange={(event) => updateLocation(location.id, { buildingId: event.target.value })} placeholder="Building A / Floor 2" />
                  </label>
                  <label>
                    Room / zone
                    <input className="wm-ui-input" value={location.roomId ?? ""} onChange={(event) => updateLocation(location.id, { roomId: event.target.value })} placeholder="Boardroom / Zone 1" />
                  </label>
                  <label>
                    Location notes
                    <input className="wm-ui-input" value={location.notes ?? ""} onChange={(event) => updateLocation(location.id, { notes: event.target.value })} placeholder="Rack, ceiling, wall or route note" />
                  </label>
                </>
              ) : null}
              <button className="wm-topology-remove" type="button" onClick={() => removeLocation(location.id)} disabled={topology.locations.length <= 1}>Remove</button>
            </article>
          ))}
        </div>
      </section>

      <section className="wm-topology-section">
        <div className="wm-topology-section-head">
          <div><span>2</span><strong>Primary devices and placeholders</strong></div>
          <button className="wm-ui-button wm-ui-button-secondary" type="button" onClick={addDevice}>Add device</button>
        </div>
        <div className="wm-topology-device-list">
          {topology.devices.map((device) => (
            <article className="wm-topology-device-row" key={device.id}>
              <label className="wm-topology-wide-field">
                Device / object
                <input className="wm-ui-input" value={device.name} onChange={(event) => updateDevice(device.id, { name: event.target.value })} />
              </label>
              <label>
                Location
                <select className="wm-ui-input" value={device.locationId} onChange={(event) => updateDevice(device.id, { locationId: event.target.value })}>
                  {topology.locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
                </select>
              </label>
              <label>
                Confidence
                <select className="wm-ui-input" value={device.status} onChange={(event) => updateDevice(device.id, { status: event.target.value as ProjectDevice["status"] })}>
                  <option value="confirmed">Confirmed</option>
                  <option value="assumed">Assumed</option>
                  <option value="unknown">Unknown</option>
                </select>
              </label>
              {showAdvanced ? (
                <>
                  <label>
                    Category
                    <input className="wm-ui-input" value={device.category} onChange={(event) => updateDevice(device.id, { category: event.target.value })} />
                  </label>
                  <label>
                    Manufacturer
                    <input className="wm-ui-input" value={device.manufacturer ?? ""} onChange={(event) => updateDevice(device.id, { manufacturer: event.target.value })} placeholder="WyreStorm or third party" />
                  </label>
                  <label>
                    SKU / model
                    <input className="wm-ui-input" value={device.sku ?? ""} onChange={(event) => updateDevice(device.id, { sku: event.target.value })} placeholder="Known SKU or TBC" />
                  </label>
                  <label>
                    Quantity
                    <input className="wm-ui-input" type="number" min="1" value={device.quantity} onChange={(event) => updateDevice(device.id, { quantity: Math.max(1, Number(event.target.value) || 1) })} />
                  </label>
                  <label className="wm-topology-check-field">
                    <input type="checkbox" checked={device.thirdParty} onChange={(event) => updateDevice(device.id, { thirdParty: event.target.checked })} />
                    Third-party / existing object
                  </label>
                </>
              ) : null}
              <button className="wm-topology-remove" type="button" onClick={() => removeDevice(device.id)}>Remove</button>
            </article>
          ))}
        </div>
      </section>

      <section className="wm-topology-section">
        <div className="wm-topology-section-head">
          <div><span>3</span><strong>Connections and planning lengths</strong></div>
          <button className="wm-ui-button wm-ui-button-secondary" type="button" onClick={addConnection} disabled={topology.devices.length < 2}>Add connection</button>
        </div>
        <div className="wm-topology-connection-list">
          {topology.connections.map((connection, index) => {
            const from = deviceById.get(connection.fromDeviceId);
            const to = deviceById.get(connection.toDeviceId);
            return (
              <article className="wm-topology-connection-card" key={connection.id}>
                <div className="wm-topology-connection-title">
                  <span>Path {index + 1}</span>
                  <strong>{from?.name ?? "Unknown source"} → {to?.name ?? "Unknown destination"}</strong>
                  <button className="wm-topology-remove" type="button" onClick={() => removeConnection(connection.id)}>Remove</button>
                </div>
                <div className="wm-topology-connection-fields">
                  <label>
                    From
                    <select className="wm-ui-input" value={connection.fromDeviceId} onChange={(event) => updateConnection(connection.id, { fromDeviceId: event.target.value })}>
                      {topology.devices.filter((device) => device.id !== connection.toDeviceId).map((device) => <option key={device.id} value={device.id}>{device.name}</option>)}
                    </select>
                  </label>
                  <label>
                    To
                    <select className="wm-ui-input" value={connection.toDeviceId} onChange={(event) => updateConnection(connection.id, { toDeviceId: event.target.value })}>
                      {topology.devices.filter((device) => device.id !== connection.fromDeviceId).map((device) => <option key={device.id} value={device.id}>{device.name}</option>)}
                    </select>
                  </label>
                  <label>
                    Connection type
                    <select className="wm-ui-input" value={connection.transport} onChange={(event) => updateConnection(connection.id, { transport: event.target.value as ProjectConnection["transport"] })}>
                      {PROJECT_TRANSPORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                  <label>
                    Length status
                    <select className="wm-ui-input" value={connection.lengthMode} onChange={(event) => updateConnection(connection.id, { lengthMode: event.target.value as ProjectConnection["lengthMode"], lengthMetres: event.target.value === "unknown" ? undefined : connection.lengthMetres ?? 10 })}>
                      <option value="estimated">Estimated</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="unknown">Unknown</option>
                    </select>
                  </label>
                  <label>
                    Cable length (metres)
                    <input className="wm-ui-input" type="number" min="0" step="0.5" disabled={connection.lengthMode === "unknown"} value={connection.lengthMetres ?? ""} onChange={(event) => updateConnection(connection.id, { lengthMetres: event.target.value === "" ? undefined : Math.max(0, Number(event.target.value) || 0) })} placeholder="TBC" />
                  </label>
                </div>
                <fieldset className="wm-topology-service-fieldset">
                  <legend>Signals / services carried</legend>
                  <div className="wm-topology-service-grid">
                    {PROJECT_CONNECTION_SERVICE_OPTIONS.map((service) => (
                      <label key={service.value}>
                        <input type="checkbox" checked={connection.services.includes(service.value)} onChange={() => toggleConnectionService(connection, service.value)} />
                        {service.label}
                      </label>
                    ))}
                  </div>
                </fieldset>
                {connection.estimateReason ? <p className="wm-topology-estimate-note">Planning basis: {connection.estimateReason}</p> : null}
                {showAdvanced ? (
                  <div className="wm-topology-advanced-path-fields">
                    <label>From port<input className="wm-ui-input" value={connection.fromPort ?? ""} onChange={(event) => updateConnection(connection.id, { fromPort: event.target.value })} /></label>
                    <label>To port<input className="wm-ui-input" value={connection.toPort ?? ""} onChange={(event) => updateConnection(connection.id, { toPort: event.target.value })} /></label>
                    <label className="wm-topology-wide-field">Path notes<input className="wm-ui-input" value={connection.notes ?? ""} onChange={(event) => updateConnection(connection.id, { notes: event.target.value })} placeholder="Cable route, network segment, extender or validation note" /></label>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      {missingInformation.length ? (
        <section className="wm-topology-checks">
          <strong>Checks before product selection</strong>
          <ul>{missingInformation.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
      ) : (
        <p className="wm-topology-ready">All current paths have a device, transport and length status. Validate assumptions before customer issue.</p>
      )}
    </section>
  );
}
