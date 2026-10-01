import { useState } from "react";
import type { ProjectTopology, ProjectLocationType } from "../../lib/projectTopology";

export function DiscoveryRoomLocations({ topology, onChange }: { topology: ProjectTopology; onChange: (next: ProjectTopology) => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<ProjectLocationType>("table");
  const update = (next: ProjectTopology) => onChange({ ...next, updatedAt: new Date().toISOString() });
  return <section aria-label="Room input and output locations">
    <h3>Where will people connect, watch and listen?</h3><p>Name each position—for example, lectern laptop, table connection, front screen or rear confidence screen. Cable lengths can remain open until the site survey.</p>
    <div className="wm-room-wizard-fields"><label>Location name<input value={name} onChange={event => setName(event.target.value)} placeholder="Lectern laptop connection" /></label>
      <label>Position<select value={type} onChange={event => setType(event.target.value as ProjectLocationType)}><option value="table">Table</option><option value="lectern">Lectern</option><option value="display-wall">Display wall</option><option value="ceiling">Ceiling</option><option value="room-rack">Equipment rack</option><option value="floor-box">Floor connection</option><option value="custom">Another position</option></select></label>
      <button type="button" className="wm-ui-button wm-ui-button-secondary" disabled={!name.trim()} onClick={() => { update({ ...topology, locations: [...topology.locations, { id: crypto.randomUUID(), name: name.trim(), type }] }); setName(""); }}>Add location</button></div>
    {topology.locations.map(location => <label key={location.id}>{location.type.replaceAll("-", " ")}<input aria-label={`Name for ${location.name}`} value={location.name} onChange={event => update({ ...topology, locations: topology.locations.map(row => row.id === location.id ? { ...row, name: event.target.value } : row) })} /></label>)}
    {topology.devices.map(device => <div className="wm-room-wizard-fields" key={device.id}><label>{device.name}<select aria-label={`Location for ${device.name}`} value={device.locationId} onChange={event => update({ ...topology, devices: topology.devices.map(row => row.id === device.id ? { ...row, locationId: event.target.value } : row) })}>{topology.locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
      <label>Quantity<input type="number" min="1" step="1" value={device.quantity} onChange={event => { const quantity = Number(event.target.value); if (Number.isInteger(quantity) && quantity > 0) update({ ...topology, devices: topology.devices.map(row => row.id === device.id ? { ...row, quantity } : row) }); }} /></label></div>)}
    {topology.connections.map(connection => <label key={connection.id}>Cable route: {topology.devices.find(device => device.id === connection.fromDeviceId)?.name || "Input"} → {topology.devices.find(device => device.id === connection.toDeviceId)?.name || "Output"}
      <input type="number" min="0.1" step="0.1" placeholder="Distance in metres, if known" value={connection.lengthMetres ?? ""} onChange={event => { const length = Number(event.target.value); update({ ...topology, connections: topology.connections.map(row => row.id === connection.id ? { ...row, lengthMetres: length > 0 ? length : undefined, lengthMode: length > 0 ? "estimated" : "unknown" } : row) }); }} /></label>)}
  </section>;
}
