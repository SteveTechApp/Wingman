import { useState } from "react";
import { PROJECT_CONNECTION_SERVICE_OPTIONS, PROJECT_TRANSPORT_OPTIONS, type ProjectConnectionService, type ProjectTopology, type ProjectTransport } from "../../lib/projectTopology";

export function RoomConnectionsEditor({ topology, onChange }: { topology: ProjectTopology; onChange: (value: ProjectTopology) => void }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const options = topology.devices.map(device => <option key={device.id} value={device.id}>{device.name}</option>);
  const update = (next: ProjectTopology) => onChange({ ...next, updatedAt: new Date().toISOString() });
  const validPair = from !== to && topology.devices.some(device => device.id === from) && topology.devices.some(device => device.id === to);
  return <section aria-label="Room signal connections"><h3>Connect the room equipment</h3>
    <div className="wm-room-wizard-fields"><label>From device<select value={from} onChange={event => setFrom(event.target.value)}><option value="">Select equipment</option>{options}</select></label>
    <label>To device<select value={to} onChange={event => setTo(event.target.value)}><option value="">Select equipment</option>{options}</select></label>
    <button type="button" className="wm-ui-button wm-ui-button-secondary" disabled={!validPair} onClick={() => update({ ...topology, connections: [...topology.connections, { id: crypto.randomUUID(), fromDeviceId: from, toDeviceId: to, services: [], transport: "unknown", lengthMode: "unknown", status: "unknown" }] })}>Add connection</button></div>
    {topology.connections.map(connection => <fieldset key={connection.id}><legend>{topology.devices.find(device => device.id === connection.fromDeviceId)?.name} → {topology.devices.find(device => device.id === connection.toDeviceId)?.name}</legend>
      <label>Transport<select value={connection.transport} onChange={event => update({ ...topology, connections: topology.connections.map(row => row.id === connection.id ? { ...row, transport: event.target.value as ProjectTransport } : row) })}>{PROJECT_TRANSPORT_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <label>Signal services<select multiple value={connection.services} onChange={event => update({ ...topology, connections: topology.connections.map(row => row.id === connection.id ? { ...row, services: Array.from(event.target.selectedOptions, option => option.value as ProjectConnectionService) } : row) })}>{PROJECT_CONNECTION_SERVICE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <button type="button" className="wm-ui-button wm-ui-button-secondary" onClick={() => update({ ...topology, connections: topology.connections.filter(row => row.id !== connection.id) })}>Remove connection</button>
    </fieldset>)}
  </section>;
}
