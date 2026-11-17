import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { type ProjectTopology, createBlankProjectTopology } from "../../lib/projectTopology";
import { DiscoveryRoomLocations } from "./DiscoveryRoomLocations";
import { RoomEndpointEditor } from "./RoomEndpointEditor";
import { RoomConnectionsEditor } from "./RoomConnectionsEditor";

function Room() {
  const [topology, setTopology] = useState<ProjectTopology>(() => ({ ...createBlankProjectTopology(),
    locations: [{ id: "table", name: "Table", type: "table" as const }],
    devices: ["Laptop", "Display"].map((name, index) => ({ id: name, name, category: name, signalRole: index === 0 ? "source" as const : "destination" as const, ownership: "third-party" as const, locationId: "table", quantity: 2, thirdParty: true, status: "assumed" as const })) }));
  return <><DiscoveryRoomLocations topology={topology} onChange={setTopology} /><RoomEndpointEditor topology={topology} onChange={setTopology} /><RoomConnectionsEditor topology={topology} onChange={setTopology} /><output data-testid="topology">{JSON.stringify(topology)}</output></>;
}

function selectServices(select: HTMLSelectElement, values: string[]) {
  for (const option of Array.from(select.options)) option.selected = values.includes(option.value);
  fireEvent.change(select);
}

describe("room builder connections", () => {
  it("adds repeated endpoints with explicit roles and open ports", () => {
    render(<Room />);
    const endpointForm = screen.getByRole("region", { name: "Room endpoint inventory" });
    fireEvent.change(within(endpointForm).getByRole("textbox", { name: "Endpoint name" }), { target: { value: "PTZ camera" } });
    fireEvent.change(within(endpointForm).getByRole("combobox", { name: "Signal role" }), { target: { value: "source" } });
    fireEvent.change(within(endpointForm).getByRole("spinbutton", { name: "Quantity" }), { target: { value: "2" } });
    fireEvent.click(within(endpointForm).getByRole("button", { name: "Add endpoint to this room" }));

    const camera = JSON.parse(screen.getByTestId("topology").textContent!).devices.find((device: { name: string }) => device.name === "PTZ camera");
    expect(camera).toMatchObject({ quantity: 2, signalRole: "source", ownership: "unassigned" });
    expect(camera).not.toHaveProperty("ports");

    const portSummary = screen.getAllByText("Inputs and outputs · none declared").at(-1)!;
    fireEvent.click(portSummary);
    fireEvent.click(within(portSummary.closest("details")!).getByRole("button", { name: "Add output interface" }));
    const savedCamera = JSON.parse(screen.getByTestId("topology").textContent!).devices.find((device: { name: string }) => device.name === "PTZ camera");
    expect(savedCamera.ports).toMatchObject([{ direction: "output", name: "Output 1", services: [], status: "unknown" }]);
  });

  it("records required pairings by physical unit and service", () => {
    render(<Room />);
    expect(screen.getByRole("button", { name: "Add required path" })).toBeDisabled();
    fireEvent.change(screen.getByRole("combobox", { name: "Required source" }), { target: { value: "Laptop" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Required source unit" }), { target: { value: "2" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Required destination" }), { target: { value: "Display" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Required destination unit" }), { target: { value: "2" } });
    selectServices(screen.getByRole("listbox", { name: "Required services" }) as HTMLSelectElement, ["video", "embedded-audio"]);
    fireEvent.click(screen.getByRole("button", { name: "Add required path" }));

    expect(JSON.parse(screen.getByTestId("topology").textContent!).signalRequirements[0]).toMatchObject({
      fromDeviceId: "Laptop", fromUnit: 2, toDeviceId: "Display", toUnit: 2, services: ["video", "embedded-audio"],
    });
  });

  it("adds an open connection, edits its transport and removes routes with their equipment", () => {
    render(<Room />);
    expect(screen.getByRole("button", { name: "Add connection" })).toBeDisabled();
    fireEvent.change(screen.getByRole("combobox", { name: "From device" }), { target: { value: "Laptop" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: "From unit" }), { target: { value: "2" } });
    fireEvent.change(screen.getByRole("combobox", { name: "To device" }), { target: { value: "Display" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: "To unit" }), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Add connection" }));
    fireEvent.change(screen.getByRole("combobox", { name: /Transport/ }), { target: { value: "hdmi" } });
    fireEvent.change(screen.getByRole("combobox", { name: /Route length status/ }), { target: { value: "confirmed" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: /Route length metres/ }), { target: { value: "12.5" } });
    fireEvent.change(screen.getByRole("textbox", { name: /Route length basis/ }), { target: { value: "Measured during site survey" } });
    expect(JSON.parse(screen.getByTestId("topology").textContent!).connections[0]).toMatchObject({ fromDeviceId: "Laptop", fromUnit: 2, toDeviceId: "Display", toUnit: 2, transport: "hdmi", services: [] });
    expect(JSON.parse(screen.getByTestId("topology").textContent!).connections[0]).toMatchObject({ lengthMode: "confirmed", lengthMetres: 12.5, estimateReason: "Measured during site survey" });
    fireEvent.click(screen.getByRole("button", { name: "Remove Laptop" }));
    const saved = JSON.parse(screen.getByTestId("topology").textContent!);
    expect(saved.devices.map((device: { id: string }) => device.id)).toEqual(["Display"]);
    expect(saved.connections).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Add connection" })).toBeDisabled();
  });
});
