import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { GovernedDataBadge, governedBadgeMeta } from "./GovernedDataBadge";

// The governed badge is shared by the Compare, Product Pitch and Catalog pages
// so every product card tells the same data-tier story. These tiers are the
// exact sourceTier values the compare decision engine and
// resolveProductTechnicalData emit - the mapping must never drift between
// surfaces.
describe("GovernedDataBadge", () => {
  it("maps every sourceTier to its shared badge copy and style", () => {
    expect(governedBadgeMeta("verified-profile")).toEqual({ text: "Verified governed data", className: "is-verified" });
    expect(governedBadgeMeta("official-structured")).toEqual({ text: "Official data - review required", className: "is-warn" });
    expect(governedBadgeMeta("text-inferred")).toEqual({ text: "Inferred data - review before use", className: "is-warn" });
    expect(governedBadgeMeta("missing")).toEqual({ text: "Technical data not resolved", className: "is-warn" });
    // Copy unification: the resolver itself now emits the canonical
    // "Technical data not resolved" label for the missing tier, so the
    // resolver and badge can never disagree. The legacy "Technical data
    // missing" string is still asserted here as a drift guard - even if a
    // stale caller passes it, the component must render the canonical copy.
    expect(governedBadgeMeta("missing", "Technical data missing").text).toBe("Technical data not resolved");
  });

  it("falls back to the supplied label for unknown tiers", () => {
    expect(governedBadgeMeta(undefined, "Official profile requiring review").text).toBe("Official profile requiring review");
  });

  it("renders the verified badge with the data-source tooltip", () => {
    const { container, getByTitle } = render(<GovernedDataBadge tier="verified-profile" />);
    expect(container.textContent).toContain("Verified governed data");
    expect(container.querySelector(".compare-native-governance-badge.is-verified")).toBeTruthy();
    expect(getByTitle("Data source: Verified governed data")).toBeTruthy();
  });
});
