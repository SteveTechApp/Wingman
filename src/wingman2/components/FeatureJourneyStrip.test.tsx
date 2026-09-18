import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { FeatureJourneyStrip } from "./FeatureJourneyStrip";

describe("FeatureJourneyStrip", () => {
  it("renders contextual next tools", () => {
    render(<MemoryRouter><FeatureJourneyStrip routeKey="products" context={{ sku: "MX-0404" }} /></MemoryRouter>);
    expect(screen.getByRole("complementary", { name: "Useful next tools" })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Get product conversation prompts/i }).getAttribute("href")).toBe("/wingman/call-coach");
    expect(screen.getByRole("link", { name: /Start Discovery/i })).toBeTruthy();
  });

  it("renders nothing for routes without journey actions", () => {
    const { container } = render(<MemoryRouter><FeatureJourneyStrip routeKey="profile" /></MemoryRouter>);
    expect(container.firstChild).toBeNull();
  });
});
