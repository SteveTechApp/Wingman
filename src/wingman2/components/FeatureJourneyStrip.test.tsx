import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { FeatureJourneyStrip } from "./FeatureJourneyStrip";

describe("FeatureJourneyStrip", () => {
  it("renders contextual next tools", () => {
    render(<MemoryRouter><FeatureJourneyStrip routeKey="products" context={{ sku: "MX-0404" }} /></MemoryRouter>);
    const help = screen.getByText("More tools");
    expect(help.closest("details")?.open).toBe(false);
    fireEvent.click(help);
    expect(screen.getByRole("link", { name: /Get product conversation prompts/i }).getAttribute("href")).toBe("/wingman/call-coach");
    expect(screen.getByRole("link", { name: /Start Discovery/i })).toBeTruthy();
  });

  it("renders nothing for routes without journey actions", () => {
    const { container } = render(<MemoryRouter><FeatureJourneyStrip routeKey="profile" /></MemoryRouter>);
    expect(container.firstChild).toBeNull();
  });
});
