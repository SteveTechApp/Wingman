import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DiscoveryQuickStart } from "./discoveryQuickStartPanel";
import { clearQuickStartProfileChoices, rememberQuickStartProfileChoice } from "./discoveryQuickStartPreferences";
import { quickStartConfigs } from "./discoveryQuickStart";
import type { DiscoveryAnswers } from "./discoveryTypes";

function pickRoom(label: RegExp) {
  fireEvent.click(screen.getByRole("button", { name: label }));
}

beforeEach(() => {
  clearQuickStartProfileChoices();
});

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

  it("blends both profiles: standard where they differ, room elsewhere", () => {
    const onSelect = vi.fn();
    render(<DiscoveryQuickStart onSelect={onSelect} onSkip={vi.fn()} />);
    pickRoom(/Lecture hall/);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    fireEvent.click(screen.getByRole("button", { name: /Blend — standard values where profiles differ/ }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    const seeded = onSelect.mock.calls[0][0] as DiscoveryAnswers;
    // Disagreements take the standard defaults…
    expect(seeded.opportunity).toBe("classroom");
    expect(seeded.displays).toBe("one-display");
    expect(seeded["display-behaviour"]).toBe("same-content-all-displays");
    expect(seeded["signal-standard"]).toBe("1080p-standard-hdmi");
    // …and agreement/room-only questions keep the room values.
    expect(seeded["source-connection"]).toBe(quickStartConfigs["lecture-hall"].defaults["source-connection"]);
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

  it("does not re-ask on the next visit after choosing the room profile", () => {
    const first = vi.fn();
    const firstRender = render(<DiscoveryQuickStart onSelect={first} onSkip={vi.fn()} />);
    pickRoom(/Lecture hall/);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: /Use Lecture hall profile/ }));
    expect(first).toHaveBeenCalledTimes(1);
    firstRender.unmount();

    // A FRESH component instance (repeat visit in the same session): the
    // same room type seeds directly — no confirmation step in between.
    const second = vi.fn();
    render(<DiscoveryQuickStart onSelect={second} onSkip={vi.fn()} />);
    pickRoom(/Lecture hall/);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(second).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/differs from the/)).toBeNull();
    const seeded = second.mock.calls[0][0] as DiscoveryAnswers;
    expect(seeded.opportunity).toBe("classroom");
    expect(seeded.displays).toBe("two-displays");
    expect(seeded["display-behaviour"]).toBe("independent-routing-per-display");
  });

  it("reapplies the remembered standard profile on the next visit", () => {
    const first = vi.fn();
    const firstRender = render(<DiscoveryQuickStart onSelect={first} onSkip={vi.fn()} />);
    pickRoom(/Lecture hall/);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: /Use standard Teaching \/ classroom profile/ }));
    expect(first).toHaveBeenCalledTimes(1);
    firstRender.unmount();

    const second = vi.fn();
    render(<DiscoveryQuickStart onSelect={second} onSkip={vi.fn()} />);
    pickRoom(/Lecture hall/);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(second).toHaveBeenCalledTimes(1);
    const seeded = second.mock.calls[0][0] as DiscoveryAnswers;
    expect(seeded.displays).toBe("one-display");
    expect(seeded["signal-standard"]).toBe("1080p-standard-hdmi");
    expect(seeded.usb).toBe("room-pc-uc");
  });

  it("applies the remembered blend on the next visit without confirming", () => {
    const first = vi.fn();
    const firstRender = render(<DiscoveryQuickStart onSelect={first} onSkip={vi.fn()} />);
    pickRoom(/Lecture hall/);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: /Blend — standard values where profiles differ/ }));
    expect(first).toHaveBeenCalledTimes(1);
    firstRender.unmount();

    const second = vi.fn();
    render(<DiscoveryQuickStart onSelect={second} onSkip={vi.fn()} />);
    pickRoom(/Lecture hall/);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(second).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/differs from the/)).toBeNull();
    const seeded = second.mock.calls[0][0] as DiscoveryAnswers;
    expect(seeded.displays).toBe("one-display");
    expect(seeded["signal-standard"]).toBe("1080p-standard-hdmi");
  });

  it("remembers the preference per room type, not globally", () => {
    const first = vi.fn();
    const firstRender = render(<DiscoveryQuickStart onSelect={first} onSkip={vi.fn()} />);
    pickRoom(/Training room/);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: /Use Training room profile/ }));
    expect(first).toHaveBeenCalledTimes(1);
    firstRender.unmount();

    // A different disagreeing room type is not blocked by that memory: it
    // still asks for confirmation.
    const second = vi.fn();
    render(<DiscoveryQuickStart onSelect={second} onSkip={vi.fn()} />);
    pickRoom(/Lecture hall/);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(second).not.toHaveBeenCalled();
    expect(screen.getByText(/Lecture hall differs from the/)).toBeTruthy();
  });
});
describe("DiscoveryQuickStart remembered-profile note", () => {
  it("announces the remembered room profile on the room-type step instead of applying it silently", () => {
    const first = vi.fn();
    const firstRender = render(<DiscoveryQuickStart onSelect={first} onSkip={vi.fn()} />);
    pickRoom(/Lecture hall/);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: /Use Lecture hall profile/ }));
    expect(first).toHaveBeenCalledTimes(1);
    firstRender.unmount();

    // Repeat visit: the note is visible BEFORE Continue, naming the room.
    const second = vi.fn();
    render(<DiscoveryQuickStart onSelect={second} onSkip={vi.fn()} />);
    pickRoom(/Lecture hall/);
    const note = screen.getByTestId("quick-start-remembered-note");
    expect(note.textContent).toBe("Using your remembered Lecture hall profile");
    expect(second).not.toHaveBeenCalled();

    // Continue applies it without re-showing the confirmation step.
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(second).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/differs from the/)).toBeNull();
  });

  it("names the standard and blended profiles, not just the room profile", () => {
    rememberQuickStartProfileChoice("lecture-hall", "standard");
    const standard = vi.fn();
    const standardRender = render(<DiscoveryQuickStart onSelect={standard} onSkip={vi.fn()} />);
    pickRoom(/Lecture hall/);
    expect(screen.getByTestId("quick-start-remembered-note").textContent).toBe(
      "Using your remembered standard Teaching / classroom profile",
    );
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(standard).toHaveBeenCalledTimes(1);
    standardRender.unmount();

    rememberQuickStartProfileChoice("lecture-hall", "blend");
    const blend = vi.fn();
    render(<DiscoveryQuickStart onSelect={blend} onSkip={vi.fn()} />);
    pickRoom(/Lecture hall/);
    expect(screen.getByTestId("quick-start-remembered-note").textContent).toBe(
      "Using your remembered blend of the Lecture hall and Teaching / classroom profiles",
    );
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(blend).toHaveBeenCalledTimes(1);
  });

  it("shows no note for a room without a remembered choice", () => {
    render(<DiscoveryQuickStart onSelect={vi.fn()} onSkip={vi.fn()} />);
    pickRoom(/Lecture hall/);
    expect(screen.queryByTestId("quick-start-remembered-note")).toBeNull();
    // Fresh room: Continue still asks for confirmation.
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText(/Lecture hall differs from the/)).toBeTruthy();
  });
});
