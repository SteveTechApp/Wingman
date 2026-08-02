import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import {
  ProductSearchField,
  ProductWorkspaceHeader,
  ProductWorkspaceNav,
} from "./ProductWorkspaceChrome";

describe("ProductWorkspaceChrome", () => {
  it("provides the same product-tool navigation and marks the current tool", () => {
    render(
      <MemoryRouter initialEntries={["/wingman/catalog-browser"]}>
        <ProductWorkspaceNav />
      </MemoryRouter>,
    );

    expect(screen.getByRole("navigation", { name: "Product tools" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Catalogue" }).className).toContain("is-active");
    expect(screen.getByRole("link", { name: "Families" }).getAttribute("href")).toBe("/wingman/product-families");
    expect(screen.getByRole("link", { name: "Call cards" }).getAttribute("href")).toBe("/wingman/product-call-cards");
    expect(screen.getByRole("link", { name: "Positioning" }).getAttribute("href")).toBe("/wingman/product-pitch");
  });

  it("uses a consistent accessible heading and search control", () => {
    const onChange = vi.fn();

    render(
      <>
        <ProductWorkspaceHeader title="Browse products" description="Find a product." />
        <ProductSearchField value="" onChange={onChange} placeholder="Search products" />
      </>,
    );

    expect(screen.getByRole("heading", { name: "Browse products" })).toBeTruthy();
    fireEvent.change(screen.getByRole("searchbox", { name: "Search products" }), { target: { value: "NHD" } });
    expect(onChange).toHaveBeenCalledWith("NHD");
  });
});
