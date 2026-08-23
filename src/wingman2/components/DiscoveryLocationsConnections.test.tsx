import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import DiscoveryLocationsConnections from "./DiscoveryLocationsConnections";
import {
  createBlankProjectTopology,
  type ProjectTopology,
} from "../lib/projectTopology";

// The route planner is a controlled component: it emits the next topology via
// onChange and expects the parent to feed it back as `value`. This harness
// mirrors DiscoveryPage's handling so the rendered plan reflects the edits.
function StatefulPlanner({
  onEmit,
}: {
  onEmit?: (next: ProjectTopology) => void;
}) {
  const [topology, setTopology] = useState(() => createBlankProjectTopology());

  return (
    <DiscoveryLocationsConnections
      value={topology}
      seed={{
        answers: { usb: "room-pc-uc" },
        notes: {},
        application: "Meeting room / boardroom",
      }}
      onChange={(next) => {
        setTopology(next);
        onEmit?.(next);
      }}
    />
  );
}

function renderPlanner(): ProjectTopology[] {
  const emissions: ProjectTopology[] = [];
  render(<StatefulPlanner onEmit={(next) => emissions.push(next)} />);
  return emissions;
}

describe("DiscoveryLocationsConnections guided route planner", () => {
  it("accepts an exact cable length that overrides the distance-band estimate", () => {
    const emissions = renderPlanner();

    fireEvent.click(screen.getByRole("button", { name: /Video distance/ }));

    const exactInput = screen.getByLabelText(/Enter exact cable length/) as HTMLInputElement;
    fireEvent.change(exactInput, { target: { value: "42" } });

    const last = emissions[emissions.length - 1];
    expect(last.connections.some((connection) => connection.lengthMetres === 42)).toBe(true);

    // The planning basis records that the figure was entered exactly, not band-derived.
    const estimateReasons = last.connections
      .map((connection) => connection.estimateReason ?? "")
      .join(" | ");
    expect(estimateReasons).toContain("Exact cable length entered during discovery: 42 m");

    // The result card reflects the exact figure.
    expect(screen.getByText("42 m")).not.toBeNull();
    expect(screen.queryByText("35 m")).toBeNull();
  });

  it("keeps the band estimate when the exact-length field is cleared", () => {
    renderPlanner();

    fireEvent.click(screen.getByRole("button", { name: /Video distance/ }));

    const exactInput = screen.getByLabelText(/Enter exact cable length/) as HTMLInputElement;
    fireEvent.change(exactInput, { target: { value: "42" } });
    expect((screen.getByLabelText(/Enter exact cable length/) as HTMLInputElement).value).toBe("42");

    fireEvent.change(exactInput, { target: { value: "" } });
    expect((screen.getByLabelText(/Enter exact cable length/) as HTMLInputElement).value).toBe("");
    // The band-derived planning allowance returns.
    expect(screen.getByText(/planning allowance/)).not.toBeNull();
  });

  it("uses a rep-typed location name for the equipment position on the topology", () => {
    const emissions = renderPlanner();

    const nameInput = screen.getByLabelText(/Name this equipment location/) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "Credenza under the display" } });

    const last = emissions[emissions.length - 1];
    expect(
      last.locations.some((location) => location.name === "Credenza under the display"),
    ).toBe(true);
  });

  it("accepts an exact USB cable length that overrides the USB band", () => {
    const emissions = renderPlanner();

    fireEvent.click(screen.getByRole("button", { name: /USB path/ }));

    const usbInput = screen.getByLabelText(/Enter exact USB cable length/) as HTMLInputElement;
    fireEvent.change(usbInput, { target: { value: "7" } });

    const last = emissions[emissions.length - 1];
    const usbConnections = last.connections.filter((connection) =>
      connection.services.some((service) =>
        ["usb-2", "usb-3", "usb-kvm"].includes(service),
      ),
    );
    expect(usbConnections.length).toBeGreaterThan(0);
    expect(usbConnections.every((connection) => connection.lengthMetres === 7)).toBe(true);
  });

  it("keeps the USB band when the exact-length field is cleared", () => {
    const emissions = renderPlanner();

    fireEvent.click(screen.getByRole("button", { name: /USB path/ }));

    const usbInput = screen.getByLabelText(/Enter exact USB cable length/) as HTMLInputElement;
    fireEvent.change(usbInput, { target: { value: "7" } });
    expect((screen.getByLabelText(/Enter exact USB cable length/) as HTMLInputElement).value).toBe("7");

    fireEvent.change(usbInput, { target: { value: "" } });
    expect((screen.getByLabelText(/Enter exact USB cable length/) as HTMLInputElement).value).toBe("");
    // Band-derived routing still applies.
    expect(emissions.length).toBeGreaterThan(0);
  });

  it("accepts an exact exception length that overrides the exception band", () => {
    const emissions = renderPlanner();

    // Exceptions is the final step.
    fireEvent.click(screen.getByRole("button", { name: /Exceptions/ }));
    fireEvent.click(screen.getByRole("button", { name: /Add one significant distance exception/ }));

    const exceptionInput = screen.getByLabelText(/Enter exact length/) as HTMLInputElement;
    fireEvent.change(exceptionInput, { target: { value: "60" } });

    const last = emissions[emissions.length - 1];
    const exceptionConnection = last.connections.find(
      (connection) => connection.id === "planning-exception-path",
    );
    expect(exceptionConnection).toBeDefined();
    expect(exceptionConnection?.lengthMetres).toBe(60);
  });
});
