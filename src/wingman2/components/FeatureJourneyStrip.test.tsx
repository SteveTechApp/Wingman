import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { FeatureJourneyStrip } from "./FeatureJourneyStrip";
import { featureJourneyActions } from "../features/navigation";

describe("FeatureJourneyStrip", () => {
  it("renders contextual next tools", () => {
    render(<MemoryRouter><FeatureJourneyStrip routeKey="products" context={{ sku: "MX-0404" }} /></MemoryRouter>);
    const help = screen.getByText("More tools");
    expect(help.closest("details")?.open).toBe(false);
    fireEvent.click(help);
    expect(screen.getByRole("link", { name: /Get product conversation prompts/i }).getAttribute("href")).toBe("/wingman/call-coach");
    expect(screen.getByRole("link", { name: /Start Discovery/i })).toBeTruthy();
  });

  it("prints each entry's reason under its label", () => {
    // The table writes a sentence for every entry, and an entry that printed only
    // its label left that sentence written and never read: a rep reading `Compare
    // a competitor` had to open the page to learn what the move was for. Each
    // link therefore carries its own sentence beside its own label, which is what
    // "under its label" means — a strip that printed the labels and the sentences
    // as two lists would leave a rep pairing them up.
    render(<MemoryRouter><FeatureJourneyStrip routeKey="products" context={{ sku: "MX-0404" }} /></MemoryRouter>);
    fireEvent.click(screen.getByText("More tools"));

    const actions = featureJourneyActions("products", { sku: "MX-0404" });
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(actions.length);

    for (const action of actions) {
      const link = links.find((node) => node.querySelector("strong")?.textContent === action.label);
      expect(link, action.label).toBeTruthy();
      expect(link?.querySelector("small")?.textContent, action.label).toBe(action.reason);
    }
  });

  it("renders nothing for routes without journey actions", () => {
    const { container } = render(<MemoryRouter><FeatureJourneyStrip routeKey="profile" /></MemoryRouter>);
    expect(container.firstChild).toBeNull();
  });
});
