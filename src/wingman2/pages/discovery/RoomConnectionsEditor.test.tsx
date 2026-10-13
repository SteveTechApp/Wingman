import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { type ProjectTopology, createBlankProjectTopology } from "../../lib/projectTopology";
import { DiscoveryRoomLocations } from "./DiscoveryRoomLocations";
import { RoomConnectionsEditor } from "./RoomConnectionsEditor";

function Room() {
  const [topology, setTopology] = useState<ProjectTopology>(() => ({ ...createBlankProjectTopology(),
    locations: [{ id: "table", name: "Table", type: "table" as const }],
    devices: ["Laptop", "Display"].map(name => ({ id: name, name, category: name, locationId: "table", quantity: 1, thirdParty: true, status: "assumed" as const })) }));
  return <><DiscoveryRoomLocations topology={topology} onChange={setTopology} /><RoomConnectionsEditor topology={topology} onChange={setTopology} /><output data-testid="topology">{JSON.stringify(topology)}</output></>;
}
describe("room builder connections", () => {
  it("adds an open connection, edits its transport and removes routes with their equipment", () => {
    render(<Room />);
    expect(screen.getByRole("button", { name: "Add connection" })).toBeDisabled();
    fireEvent.change(screen.getByRole("combobox", { name: "From device" }), { target: { value: "Laptop" } });
    fireEvent.change(screen.getByRole("combobox", { name: "To device" }), { target: { value: "Display" } });
    fireEvent.click(screen.getByRole("button", { name: "Add connection" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Transport" }), { target: { value: "hdmi" } });
    expect(JSON.parse(screen.getByTestId("topology").textContent!).connections[0]).toMatchObject({ fromDeviceId: "Laptop", toDeviceId: "Display", transport: "hdmi", services: [], lengthMode: "unknown" });
    fireEvent.click(screen.getByRole("button", { name: "Remove Laptop" }));
    const saved = JSON.parse(screen.getByTestId("topology").textContent!);
    expect(saved.devices.map((device: { id: string }) => device.id)).toEqual(["Display"]);
    expect(saved.connections).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Add connection" })).toBeDisabled();
  });
});
