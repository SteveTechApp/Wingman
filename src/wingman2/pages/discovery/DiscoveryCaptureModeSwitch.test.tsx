import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { DiscoveryCaptureModeSwitch, type DiscoveryCaptureMode } from "./DiscoveryCaptureModeSwitch";

describe("capture mode switch", () => {
  it("opens the chosen reading and marks only that card pressed", () => {
    const onSelect = vi.fn();
    function Harness() {
      const [mode, setMode] = useState<DiscoveryCaptureMode>("room-builder");
      return <DiscoveryCaptureModeSwitch active={mode} onSelect={(next) => { onSelect(next); setMode(next); }} />;
    }
    render(<Harness />);
    // The card reads as one line, but the button's name stays the label alone so
    // a caller can still ask for it by name; the sentence is its description.
    expect(screen.getByRole("button", { name: "Room builder" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Detailed questions" })).toBeTruthy();
    const builder = screen.getByTestId("discovery-room-builder-toggle");
    const detailed = screen.getByTestId("discovery-detailed-toggle");
    expect(builder.getAttribute("aria-pressed")).toBe("true");
    expect(detailed.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(detailed);
    expect(onSelect).toHaveBeenCalledWith("detailed");
    expect(detailed.getAttribute("aria-pressed")).toBe("true");
    expect(builder.getAttribute("aria-pressed")).toBe("false");
  });

  it("holds both cards unpressed while the essential or voice capture is open", () => {
    render(<DiscoveryCaptureModeSwitch active={null} onSelect={vi.fn()} />);
    expect(screen.getByRole("group", { name: "Room capture mode" })).toBeTruthy();
    expect(screen.getByTestId("discovery-room-builder-toggle").getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByTestId("discovery-detailed-toggle").getAttribute("aria-pressed")).toBe("false");
  });
});
