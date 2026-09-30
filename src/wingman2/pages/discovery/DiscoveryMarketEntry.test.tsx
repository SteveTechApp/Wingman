import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { DiscoveryMarketEntry } from "./DiscoveryMarketEntry";

describe("Discovery market entry", () => {
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
});
