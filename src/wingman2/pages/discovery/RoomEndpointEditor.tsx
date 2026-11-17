import { useState, type FormEvent } from "react";
import {
  type ProjectDeviceOwnership,
  type ProjectDeviceSignalRole,
  type ProjectDeviceStatus,
  type ProjectTopology,
} from "../../lib/projectTopology";

const roleOptions: Array<{ value: ProjectDeviceSignalRole; label: string }> = [
  { value: "source", label: "Source" },
  { value: "processor", label: "Processing or switching" },
  { value: "destination", label: "Destination" },
  { value: "infrastructure", label: "Network or infrastructure" },
  { value: "other", label: "Other / not sure" },
];

export function RoomEndpointEditor({ topology, onChange }: { topology: ProjectTopology; onChange: (next: ProjectTopology) => void }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<ProjectDeviceSignalRole>("source");
  const [locationId, setLocationId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState<ProjectDeviceStatus>("unknown");
  const [ownership, setOwnership] = useState<ProjectDeviceOwnership>("unassigned");
  const [notes, setNotes] = useState("");
  const resolvedLocation = topology.locations.some((location) => location.id === locationId)
    ? locationId
    : topology.locations[0]?.id ?? "";

  const addEndpoint = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || !resolvedLocation || !Number.isInteger(quantity) || quantity < 1) return;
    onChange({
      ...topology,
      updatedAt: new Date().toISOString(),
      devices: [...topology.devices, {
        id: crypto.randomUUID(),
        name: name.trim(),
        category: role,
        signalRole: role,
        locationId: resolvedLocation,
        ownership,
        quantity,
        thirdParty: ownership === "third-party",
        status,
        notes: notes.trim() || undefined,
      }],
    });
    setName("");
    setQuantity(1);
    setStatus("unknown");
    setOwnership("unassigned");
    setNotes("");
  };

  return <section aria-label="Room endpoint inventory">
    <h3>Add a source, processor, destination or infrastructure endpoint</h3>
    <p>Record the actual or planned equipment, even if the make and model are not chosen. Declare inputs and outputs on each endpoint after adding it; unknown details remain open for confirmation.</p>
    {!topology.locations.length && <p role="status">Add the room positions above before adding endpoints.</p>}
    <form className="wm-room-wizard-fields" onSubmit={addEndpoint}>
      <label>Endpoint name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Main hall vision mixer" required /></label>
      <label>Signal role<select value={role} onChange={(event) => setRole(event.target.value as ProjectDeviceSignalRole)}>{roleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <label>Position<select value={resolvedLocation} onChange={(event) => setLocationId(event.target.value)} required><option value="" disabled>Add a room position first</option>{topology.locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
      <label>Quantity<input type="number" min="1" step="1" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} /></label>
      <label>Record status<select value={status} onChange={(event) => setStatus(event.target.value as ProjectDeviceStatus)}><option value="unknown">To confirm</option><option value="assumed">Assumed</option><option value="confirmed">Confirmed</option></select></label>
      <label>Equipment owner<select value={ownership} onChange={(event) => setOwnership(event.target.value as ProjectDeviceOwnership)}><option value="unassigned">Not assigned yet</option><option value="third-party">Customer / third-party</option><option value="wyrestorm">WyreStorm</option></select></label>
      <label className="wm-room-wizard-field-wide">Design notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Purpose, owner, location detail or dependency" /></label>
      <button type="submit" className="wm-ui-button wm-ui-button-primary wm-room-wizard-field-wide" disabled={!resolvedLocation || !name.trim() || !Number.isInteger(quantity) || quantity < 1}>Add endpoint to this room</button>
    </form>
  </section>;
}
