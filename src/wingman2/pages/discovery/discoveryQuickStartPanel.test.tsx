import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DiscoveryQuickStart } from "./discoveryQuickStartPanel";
import type { DiscoveryAnswers } from "./discoveryTypes";

function pickRoom(label: RegExp) {
  fireEvent.click(screen.getByRole("button", { name: label }));
}

describe("DiscoveryQuickStart profile confirmation", () => {
  it("seeds the room profile immediately when the room agrees with its standard profile", () => {
    const onSelect = vi.fn();
    render(<DiscoveryQuickStart onSelect={onSelect} onSkip={vi.fn()} />);
    pickRoom(/Classroom/);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    const seeded = onSelect.mock.calls[0][0] as DiscoveryAnswers;
    expect(seeded.displays).toBe("one-display");
    expect(seeded["display-behaviour"]).toBe("same-content-all-displays");
    expect(screen.queryByText(/differs from the/)).toBeNull();
  });

  it("asks to confirm when the room profile disagrees with its standard profile", () => {
    const onSelect = vi.fn();
    render(<DiscoveryQuickStart onSelect={onSelect} onSkip={vi.fn()} />);
    pickRoom(/Lecture hall/);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    // Confirmation step lists the disagreement, both sides label-resolved.
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByText(/Lecture hall differs from the Teaching \/ classroom profile/)).toBeTruthy();
    expect(screen.getByText(/Premium 4K with HDR \(4K60 HDR \/ HDCP-sensitive\)/)).toBeTruthy();
    expect(screen.getByText(/Standard Teaching \/ classroom profile: 2-4 sources\./)).toBeTruthy();

    // Confirming the room profile seeds exactly the room defaults.
    fireEvent.click(screen.getByRole("button", { name: /Use Lecture hall profile/ }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    const seeded = onSelect.mock.calls[0][0] as DiscoveryAnswers;
    expect(seeded.opportunity).toBe("classroom");
    expect(seeded.displays).toBe("two-displays");
    expect(seeded["display-behaviour"]).toBe("independent-routing-per-display");
    expect(seeded.sources).toBe("five-eight-sources");
  });

  it("seeds the standard application profile when confirmed instead", () => {
    const onSelect = vi.fn();
    render(<DiscoveryQuickStart onSelect={onSelect} onSkip={vi.fn()} />);
    pickRoom(/Lecture hall/);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    fireEvent.click(screen.getByRole("button", { name: /Use standard Teaching \/ classroom profile/ }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    const seeded = onSelect.mock.calls[0][0] as DiscoveryAnswers;
    expect(seeded.opportunity).toBe("classroom");
    expect(seeded.displays).toBe("one-display");
    expect(seeded["signal-standard"]).toBe("1080p-standard-hdmi");
    expect(seeded.usb).toBe("room-pc-uc");
  });

  it("can go back from the confirmation to the room grid", () => {
    const onSelect = vi.fn();
    render(<DiscoveryQuickStart onSelect={onSelect} onSkip={vi.fn()} />);
    pickRoom(/Lecture hall/);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: /Back to room types/ }));

    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByText("What type of room is this?")).toBeTruthy();
  });
});