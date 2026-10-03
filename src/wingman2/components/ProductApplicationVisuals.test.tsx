import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProductApplicationVisuals } from "./ProductApplicationVisuals";

describe("ProductApplicationVisuals", () => {
  it("shows governed application imagery for a product with official visuals", () => {
    render(<ProductApplicationVisuals sku="nhd-0401-mv" />);

    expect(screen.getByRole("heading", { name: "Layouts and signal flow" })).not.toBeNull();
    expect(screen.getByAltText(/picture-in-picture layout/i).getAttribute("src"))
      .toContain("NHD-0401-MV-6");
    expect(screen.getByRole("button", { name: "Quad view" })).not.toBeNull();
    expect(screen.getByAltText(/standalone wiring diagram/i).getAttribute("src"))
      .toContain("NHD-0401-MV_WiringDiagram_Standalone");
    expect(screen.getByRole("link", { name: "Official product page" }).getAttribute("href"))
      .toBe("https://www.wyrestorm.com/product/nhd-0401-mv/");
  });

  it("does not show a generic visual for a product without governed application imagery", () => {
    const { container } = render(<ProductApplicationVisuals sku="UNKNOWN-SKU" />);
    expect(container.childElementCount).toBe(0);
  });
});
