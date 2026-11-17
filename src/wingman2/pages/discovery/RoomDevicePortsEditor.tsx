import { useState, type ChangeEvent } from "react";
import {
  PROJECT_CONNECTION_SERVICE_OPTIONS,
  type ProjectConnectionService,
  type ProjectDevice,
  type ProjectDevicePort,
  type ProjectDeviceStatus,
  type ProjectPortDirection,
  type ProjectTopology,
} from "../../lib/projectTopology";

export function RoomDevicePortsEditor({ device, topology, onChange }: {
  device: ProjectDevice;
  topology: ProjectTopology;
  onChange: (next: ProjectTopology) => void;
}) {
  const ports = device.ports ?? [];
  const updatePorts = (nextPorts: ProjectDevicePort[]) => onChange({
    ...topology,
    updatedAt: new Date().toISOString(),
    devices: topology.devices.map((row) => row.id === device.id ? { ...row, ports: nextPorts } : row),
  });

  const addPort = (direction: ProjectPortDirection) => {
    const nextNumber = ports.filter((port) => port.direction === direction).length + 1;
    updatePorts([...ports, {
      id: crypto.randomUUID(),
      direction,
      name: `${direction === "input" ? "Input" : "Output"} ${nextNumber}`,
      connector: undefined,
      services: [],
      status: "unknown",
    }]);
  };

  const updatePort = (portId: string, patch: Partial<ProjectDevicePort>) => {
    updatePorts(ports.map((port) => port.id === portId ? { ...port, ...patch } : port));
  };

  const handleServices = (port: ProjectDevicePort) => (event: ChangeEvent<HTMLSelectElement>) => {
    updatePort(port.id, { services: Array.from(event.target.selectedOptions, (option) => option.value as ProjectConnectionService) });
  };

  const removePort = (portId: string) => {
    onChange({
      ...topology,
      updatedAt: new Date().toISOString(),
      devices: topology.devices.map((row) => row.id === device.id ? { ...row, ports: ports.filter((port) => port.id !== portId) } : row),
      connections: topology.connections.map((connection) => ({
        ...connection,
        fromPort: connection.fromPort === portId ? undefined : connection.fromPort,
        toPort: connection.toPort === portId ? undefined : connection.toPort,
      })),
    });
  };

  return <details className="wm-essential-site-details">
    <summary>Inputs and outputs · {ports.length || "none declared"}</summary>
    <p>Record verified interfaces when known. If the make, connector or service is uncertain, mark it assumed or to confirm so the design review keeps that check open.</p>
    <div className="wm-room-wizard-actions">
      <button type="button" className="wm-ui-button wm-ui-button-secondary" onClick={() => addPort("input")}>Add input interface</button>
      <button type="button" className="wm-ui-button wm-ui-button-secondary" onClick={() => addPort("output")}>Add output interface</button>
    </div>
    {ports.map((port) => <fieldset key={port.id}>
      <legend>{port.direction === "input" ? "Input" : "Output"}</legend>
      <div className="wm-room-wizard-fields">
        <label>Interface name<input value={port.name} onChange={(event) => updatePort(port.id, { name: event.target.value })} placeholder="e.g. Programme HDMI output" /></label>
        <label>Connector / protocol<input value={port.connector ?? ""} onChange={(event) => updatePort(port.id, { connector: event.target.value || undefined })} placeholder="e.g. HDMI, SDI, NDI, Dante" /></label>
        <label>Signal services<select multiple value={port.services} onChange={handleServices(port)}>{PROJECT_CONNECTION_SERVICE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label>Interface status<select value={port.status} onChange={(event) => updatePort(port.id, { status: event.target.value as ProjectDeviceStatus })}><option value="unknown">To confirm</option><option value="assumed">Assumed</option><option value="confirmed">Confirmed</option></select></label>
      </div>
      <button type="button" className="wm-ui-button wm-ui-button-secondary" onClick={() => removePort(port.id)}>Remove interface</button>
    </fieldset>)}
  </details>;
}
