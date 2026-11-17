import { useState, type ChangeEvent } from "react";
import {
  PROJECT_CONNECTION_SERVICE_OPTIONS,
  PROJECT_TRANSPORT_OPTIONS,
  type ProjectConnection,
  type ProjectConnectionService,
  type ProjectDevice,
  type ProjectSignalRequirement,
  type ProjectTopology,
  type ProjectTransport,
} from "../../lib/projectTopology";

function selectUnits(device: ProjectDevice | undefined, value: number, onChange: (next: number) => void, label: string) {
  const maximum = Math.max(1, device?.quantity ?? 1);
  return <label>{label}<input type="number" min="1" max={maximum} step="1" value={value}
    onChange={(event) => {
      const entered = Number(event.target.value);
      if (Number.isInteger(entered) && entered >= 1 && entered <= maximum) onChange(entered);
    }} /></label>;
}

function serviceSelect(label: string, services: ProjectConnectionService[], onChange: (services: ProjectConnectionService[]) => void) {
  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onChange(Array.from(event.target.selectedOptions, (option) => option.value as ProjectConnectionService));
  };
  return <label>{label}<select multiple aria-label={label} value={services} onChange={handleChange}>
    {PROJECT_CONNECTION_SERVICE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
  </select></label>;
}

function updateConnection(topology: ProjectTopology, id: string, patch: Partial<ProjectConnection>): ProjectTopology {
  return {
    ...topology,
    updatedAt: new Date().toISOString(),
    connections: topology.connections.map((row) => row.id === id ? { ...row, ...patch } : row),
  };
}

function updateRequirement(topology: ProjectTopology, id: string, patch: Partial<ProjectSignalRequirement>): ProjectTopology {
  return {
    ...topology,
    updatedAt: new Date().toISOString(),
    signalRequirements: (topology.signalRequirements ?? []).map((row) => row.id === id ? { ...row, ...patch } : row),
  };
}

function portOptions(device: ProjectDevice | undefined, direction: "input" | "output") {
  return (device?.ports ?? []).filter((port) => port.direction === direction);
}

export function RoomConnectionsEditor({ topology, onChange }: { topology: ProjectTopology; onChange: (value: ProjectTopology) => void }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [fromUnit, setFromUnit] = useState(1);
  const [toUnit, setToUnit] = useState(1);
  const [requiredFrom, setRequiredFrom] = useState("");
  const [requiredTo, setRequiredTo] = useState("");
  const [requiredFromUnit, setRequiredFromUnit] = useState(1);
  const [requiredToUnit, setRequiredToUnit] = useState(1);
  const [requiredServices, setRequiredServices] = useState<ProjectConnectionService[]>([]);
  const devices = topology.devices;
  const routeFromDevice = devices.find((device) => device.id === from);
  const routeToDevice = devices.find((device) => device.id === to);
  const requirementFromDevice = devices.find((device) => device.id === requiredFrom);
  const requirementToDevice = devices.find((device) => device.id === requiredTo);
  const validRoute = from !== to && Boolean(routeFromDevice && routeToDevice);
  const validRequirement = requiredFrom !== requiredTo
    && requirementFromDevice?.signalRole === "source"
    && requirementToDevice?.signalRole === "destination"
    && requiredServices.length > 0;
  const deviceOptions = devices.map((device) => <option key={device.id} value={device.id}>{device.name}</option>);
  const sourceDevices = devices.filter((device) => device.signalRole === "source");
  const destinationDevices = devices.filter((device) => device.signalRole === "destination");
  const sourceOptions = sourceDevices.map((device) => <option key={device.id} value={device.id}>{device.name}</option>);
  const destinationOptions = destinationDevices.map((device) => <option key={device.id} value={device.id}>{device.name}</option>);
  const currentRoleOption = (selectedId: string, device: ProjectDevice | undefined, eligibleIds: Set<string>, role: string) =>
    selectedId && !eligibleIds.has(selectedId)
      ? <option key={`unresolved-${selectedId}`} value={selectedId}>{device?.name ?? `Missing device (${selectedId})`} · resolve {role} role</option>
      : null;
  const sourceIds = new Set(sourceDevices.map((device) => device.id));
  const destinationIds = new Set(destinationDevices.map((device) => device.id));

  return <section aria-label="Room signal connections">
    <h3>Define required source-to-destination paths</h3>
    <p>List the source, destination and services this room must connect. Add one pairing for each intended path; Wingman will check those exact requirements through the route segments below.</p>
    {(!sourceDevices.length || !destinationDevices.length) && <p role="status">Classify equipment as a source or destination in the room inventory above before adding required paths.</p>}
    <div className="wm-room-wizard-fields">
      <label>Required source<select aria-label="Required source" value={requiredFrom} onChange={(event) => {
        const next = event.target.value;
        setRequiredFrom(next);
        const selected = devices.find((device) => device.id === next);
        if (selected) setRequiredFromUnit(Math.min(requiredFromUnit, selected.quantity));
      }}><option value="">Select a classified source</option>{currentRoleOption(requiredFrom, requirementFromDevice, sourceIds, "source")}{sourceOptions}</select></label>
      {selectUnits(requirementFromDevice, requiredFromUnit, setRequiredFromUnit, "Required source unit")}
      <label>Required destination<select aria-label="Required destination" value={requiredTo} onChange={(event) => {
        const next = event.target.value;
        setRequiredTo(next);
        const selected = devices.find((device) => device.id === next);
        if (selected) setRequiredToUnit(Math.min(requiredToUnit, selected.quantity));
      }}><option value="">Select a classified destination</option>{currentRoleOption(requiredTo, requirementToDevice, destinationIds, "destination")}{destinationOptions}</select></label>
      {selectUnits(requirementToDevice, requiredToUnit, setRequiredToUnit, "Required destination unit")}
      {serviceSelect("Required services", requiredServices, setRequiredServices)}
      <button type="button" className="wm-ui-button wm-ui-button-secondary" disabled={!validRequirement}
        onClick={() => onChange({ ...topology, updatedAt: new Date().toISOString(), signalRequirements: [...(topology.signalRequirements ?? []), {
          id: crypto.randomUUID(), fromDeviceId: requiredFrom, fromUnit: requiredFromUnit, toDeviceId: requiredTo, toUnit: requiredToUnit, services: requiredServices,
        }] })}>Add required path</button>
    </div>
    {(topology.signalRequirements ?? []).map((requirement) => {
      const source = devices.find((device) => device.id === requirement.fromDeviceId);
      const destination = devices.find((device) => device.id === requirement.toDeviceId);
      return <fieldset key={requirement.id}>
        <legend>{source?.name ?? "Source to resolve"}{source && source.quantity > 1 ? ` · unit ${requirement.fromUnit}` : ""} → {destination?.name ?? "Destination to resolve"}{destination && destination.quantity > 1 ? ` · unit ${requirement.toUnit}` : ""}</legend>
        <div className="wm-room-wizard-fields">
          <label>Requirement source<select aria-label={`Requirement source ${requirement.id}`} value={requirement.fromDeviceId}
            onChange={(event) => onChange(updateRequirement(topology, requirement.id, { fromDeviceId: event.target.value }))}>
            {currentRoleOption(requirement.fromDeviceId, source, sourceIds, "source")}{sourceOptions}
          </select></label>
          {selectUnits(source, requirement.fromUnit, (next) => onChange(updateRequirement(topology, requirement.id, { fromUnit: next })), `Requirement source unit ${requirement.id}`)}
          <label>Requirement destination<select aria-label={`Requirement destination ${requirement.id}`} value={requirement.toDeviceId}
            onChange={(event) => onChange(updateRequirement(topology, requirement.id, { toDeviceId: event.target.value }))}>
            {currentRoleOption(requirement.toDeviceId, destination, destinationIds, "destination")}{destinationOptions}
          </select></label>
          {selectUnits(destination, requirement.toUnit, (next) => onChange(updateRequirement(topology, requirement.id, { toUnit: next })), `Requirement destination unit ${requirement.id}`)}
          {serviceSelect(`Services for requirement ${requirement.id}`, requirement.services, (services) => onChange(updateRequirement(topology, requirement.id, { services })))}
        </div>
        <button type="button" className="wm-ui-button wm-ui-button-secondary" onClick={() => onChange({
          ...topology,
          updatedAt: new Date().toISOString(),
          signalRequirements: (topology.signalRequirements ?? []).filter((row) => row.id !== requirement.id),
        })}>Remove required path</button>
      </fieldset>;
    })}

    <h3>Map the route segments</h3>
    <p>Connect each required source through any processors or transport devices to its destination. Select a physical unit when a device quantity is greater than one. Choose declared ports when known; leave unknown details open for confirmation.</p>
    <div className="wm-room-wizard-fields">
      <label>From device<select aria-label="From device" value={from} onChange={(event) => {
        const next = event.target.value;
        setFrom(next);
        const selected = devices.find((device) => device.id === next);
        if (selected) setFromUnit(Math.min(fromUnit, selected.quantity));
      }}><option value="">Select equipment</option>{deviceOptions}</select></label>
      {selectUnits(routeFromDevice, fromUnit, setFromUnit, "From unit")}
      <label>To device<select aria-label="To device" value={to} onChange={(event) => {
        const next = event.target.value;
        setTo(next);
        const selected = devices.find((device) => device.id === next);
        if (selected) setToUnit(Math.min(toUnit, selected.quantity));
      }}><option value="">Select equipment</option>{deviceOptions}</select></label>
      {selectUnits(routeToDevice, toUnit, setToUnit, "To unit")}
      <button type="button" className="wm-ui-button wm-ui-button-secondary" disabled={!validRoute} onClick={() => {
        onChange({
          ...topology,
          updatedAt: new Date().toISOString(),
          connections: [...topology.connections, {
            id: crypto.randomUUID(), fromDeviceId: from, fromUnit, toDeviceId: to, toUnit,
            services: [], transport: "unknown", lengthMode: "unknown", status: "unknown",
          }],
        });
      }}>Add connection</button>
    </div>
    {topology.connections.map((connection) => {
      const source = devices.find((device) => device.id === connection.fromDeviceId);
      const destination = devices.find((device) => device.id === connection.toDeviceId);
      const sourcePorts = portOptions(source, "output");
      const destinationPorts = portOptions(destination, "input");
      const fromUnit = connection.fromUnit ?? 1;
      const toUnit = connection.toUnit ?? 1;
      return <fieldset key={connection.id}>
        <legend>{source?.name ?? "Source"}{source && source.quantity > 1 ? ` · unit ${fromUnit}` : ""} → {destination?.name ?? "Destination"}{destination && destination.quantity > 1 ? ` · unit ${toUnit}` : ""}</legend>
        <div className="wm-room-wizard-fields">
          {selectUnits(source, fromUnit, (next) => onChange(updateConnection(topology, connection.id, { fromUnit: next })), `Source unit for route ${connection.id}`)}
          {selectUnits(destination, toUnit, (next) => onChange(updateConnection(topology, connection.id, { toUnit: next })), `Receiving unit for route ${connection.id}`)}
          <label>Source output<select aria-label={`Source output ${connection.id}`} value={connection.fromPort ?? ""} onChange={(event) => onChange(updateConnection(topology, connection.id, { fromPort: event.target.value || undefined }))}>
            <option value="">Not selected / to confirm</option>{sourcePorts.map((port) => <option key={port.id} value={port.id}>{port.name}{port.connector ? ` · ${port.connector}` : ""}</option>)}
          </select></label>
          <label>Receiving input<select aria-label={`Receiving input ${connection.id}`} value={connection.toPort ?? ""} onChange={(event) => onChange(updateConnection(topology, connection.id, { toPort: event.target.value || undefined }))}>
            <option value="">Not selected / to confirm</option>{destinationPorts.map((port) => <option key={port.id} value={port.id}>{port.name}{port.connector ? ` · ${port.connector}` : ""}</option>)}
          </select></label>
          {serviceSelect(`Services for route ${connection.id}`, connection.services, (services) => onChange(updateConnection(topology, connection.id, { services })))}
          <label>Transport<select aria-label={`Transport ${connection.id}`} value={connection.transport} onChange={(event) => onChange(updateConnection(topology, connection.id, { transport: event.target.value as ProjectTransport }))}>{PROJECT_TRANSPORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label>Route status<select aria-label={`Route status ${connection.id}`} value={connection.status} onChange={(event) => onChange(updateConnection(topology, connection.id, { status: event.target.value as ProjectConnection["status"] }))}><option value="unknown">To confirm</option><option value="assumed">Assumed</option><option value="confirmed">Confirmed</option></select></label>
          <label>Route length status<select aria-label={`Route length status ${connection.id}`} value={connection.lengthMode} onChange={(event) => onChange(updateConnection(topology, connection.id, { lengthMode: event.target.value as ProjectTopology["connections"][number]["lengthMode"] }))}>
            <option value="unknown">Not known yet</option><option value="estimated">Estimated</option><option value="confirmed">Measured / confirmed</option>
          </select></label>
          <label>Route length (m)<input aria-label={`Route length metres ${connection.id}`} type="number" min="0" step="0.1" value={connection.lengthMetres ?? ""} onChange={(event) => onChange(updateConnection(topology, connection.id, { lengthMetres: event.target.value === "" ? undefined : Math.max(0, Number(event.target.value)) }))} /></label>
          <label>Length basis<input aria-label={`Route length basis ${connection.id}`} value={connection.estimateReason ?? ""} onChange={(event) => onChange(updateConnection(topology, connection.id, { estimateReason: event.target.value || undefined }))} placeholder="e.g. measured along the agreed cable route" /></label>
          <label className="wm-room-wizard-field-wide">Route notes<textarea aria-label={`Route notes ${connection.id}`} value={connection.notes ?? ""} onChange={(event) => onChange(updateConnection(topology, connection.id, { notes: event.target.value || undefined }))} placeholder="Intermediary equipment, route constraints, format or follow-up to confirm" /></label>
        </div>
        <button type="button" className="wm-ui-button wm-ui-button-secondary" onClick={() => onChange({ ...topology, updatedAt: new Date().toISOString(), connections: topology.connections.filter((row) => row.id !== connection.id) })}>Remove route segment</button>
      </fieldset>;
    })}
  </section>;
}
