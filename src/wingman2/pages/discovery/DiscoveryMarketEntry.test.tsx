import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { DiscoveryMarketEntry } from "./DiscoveryMarketEntry";
import { applyDiscoveryEnvironmentInference, clearUnchangedDiscoveryEnvironmentInference, inferDiscoveryEnvironment } from "./discoveryMarketContext";

describe("Discovery market entry", () => {
  it("offers a blank design without selecting a market or inferred application", () => {
    const onEnvironmentSelect = vi.fn();
    render(<DiscoveryMarketEntry marketId="" environmentId="" onMarketChange={vi.fn()} onEnvironmentSelect={onEnvironmentSelect} />);

    fireEvent.click(screen.getByRole("button", { name: /Start with a blank AV design/ }));

    expect(onEnvironmentSelect).toHaveBeenCalledWith(
      "custom-room",
      undefined,
      expect.stringContaining("no market or template assumptions"),
    );
  });

  it("starts with markets and searches their environments", () => {
    const onMarketChange = vi.fn();
    render(<DiscoveryMarketEntry marketId="" environmentId="" onMarketChange={onMarketChange} onEnvironmentSelect={vi.fn()} />);
    expect(screen.getByText("Which market is the customer in?")).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText("Search markets or spaces…"), { target: { value: "incident" } });
    expect(screen.getByRole("button", { name: /Emergency services/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Emergency services/ }));
    expect(onMarketChange).toHaveBeenCalledWith("emergency");
  });

  it("shows specific environments and suggests an existing application", () => {
    const onEnvironmentSelect = vi.fn();
    render(<MemoryRouter><DiscoveryMarketEntry marketId="emergency" environmentId="" onMarketChange={vi.fn()} onEnvironmentSelect={onEnvironmentSelect} /></MemoryRouter>);
    expect(screen.getByText("Start from a pre-built room design")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Describe this environment for a custom design/ }));
    fireEvent.click(screen.getByRole("button", { name: /Incident command room/ }));
    expect(onEnvironmentSelect).toHaveBeenCalledWith("incident", "av-over-ip");
  });

  it("offers market-relevant pre-built templates before custom discovery", () => {
    render(<MemoryRouter><DiscoveryMarketEntry marketId="education" environmentId="" onMarketChange={vi.fn()} onEnvironmentSelect={vi.fn()} /></MemoryRouter>);
    expect(screen.getAllByRole("link", { name: /Review & use template/ }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Describe this environment for a custom design/ })).toBeTruthy();
  });

  it("captures an environment outside the catalogue in the customer's words", () => {
    const onEnvironmentSelect = vi.fn();
    render(<MemoryRouter><DiscoveryMarketEntry marketId="other" environmentId="" onMarketChange={vi.fn()} onEnvironmentSelect={onEnvironmentSelect} /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: /Describe the environment/ }));
    fireEvent.change(screen.getByPlaceholderText("e.g. Mobile incident support vehicle…"), { target: { value: "Mobile incident support vehicle" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue with this environment" }));
    expect(onEnvironmentSelect).toHaveBeenCalledWith("other", undefined, "Mobile incident support vehicle");
  });

  it("starts a lecture theatre as a large room with a clearly qualified capacity estimate", () => {
    const inference = inferDiscoveryEnvironment("education", "lecture");
    expect(inference.answers).toEqual({ scale: "single-large-room", "room-occupancy": "100" });
    expect(inference.note).toMatch(/Starting estimate.*capacity is approximate/);
    expect(inference.note).toMatch(/Confirm the actual number of seats and record measured length, width and height/);
  });

  it("does not invent room dimensions or capacity for other environments", () => {
    expect(inferDiscoveryEnvironment("education", "classroom")).toEqual({ answers: {} });
    expect(inferDiscoveryEnvironment("corporate", "meeting")).toEqual({ answers: {} });
  });

  it("preserves facts already captured while inferring only the missing lecture-theatre facts", () => {
    const result = applyDiscoveryEnvironmentInference(
      { "room-occupancy": "220" },
      {},
      "education",
      "lecture",
    );
    expect(result.answers).toMatchObject({ "room-occupancy": "220", scale: "single-large-room" });
    expect(result.notes.scale).toMatch(/Starting room-scale assumption/);
    expect(result.notes.scale).not.toMatch(/100 seats/);
  });

  it("clears only unchanged lecture-theatre assumptions when the market changes", () => {
    const result = clearUnchangedDiscoveryEnvironmentInference(
      { scale: "single-large-room", "room-occupancy": "100", "room-length": "24" },
      { "room-occupancy": "Starting estimate from Education · Lecture theatre: approximately 100 seats." },
    );
    expect(result.answers).toEqual({ "room-length": "24" });
    expect(result.notes).toEqual({});

    const edited = clearUnchangedDiscoveryEnvironmentInference(
      { scale: "single-large-room", "room-occupancy": "220" },
      { "room-occupancy": "Starting estimate from Education · Lecture theatre: approximately 100 seats." },
    );
    expect(edited.answers).toEqual({ "room-occupancy": "220" });
  });
});
