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
    expect(screen.getByRole("link", { name: "Families" }).getAttribute("href")).toBe("/wingman/products?view=families");
    expect(screen.getByRole("link", { name: "Focused view" }).getAttribute("href")).toBe("/wingman/products?view=focused");
    expect(screen.getByRole("link", { name: "Expert view" }).getAttribute("href")).toBe("/wingman/products?view=expert");
  });

  it("carries the selected product when switching between focused and expert views", () => {
    const focused = render(
      <MemoryRouter initialEntries={["/wingman/product-call-cards/TX-35-IW-KVM"]}>
        <ProductWorkspaceNav />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Focused view" }).className).toContain("is-active");
    expect(screen.getByRole("link", { name: "Expert view" }).getAttribute("href"))
      .toBe("/wingman/product-pitch?sku=TX-35-IW-KVM");
    focused.unmount();

    render(
      <MemoryRouter initialEntries={["/wingman/product-pitch?sku=SW-510-TX"]}>
        <ProductWorkspaceNav />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "Focused view" }).getAttribute("href"))
      .toBe("/wingman/product-call-cards/SW-510-TX");
    expect(screen.getByRole("link", { name: "Expert view" }).className).toContain("is-active");
  });

  it("uses a consistent accessible heading and search control", () => {
    const onChange = vi.fn();

    render(
      <>
        <ProductWorkspaceHeader eyebrow="Products / Focused view" title="Browse products" description="Find a product." />
        <ProductSearchField value="" onChange={onChange} placeholder="Search products" />
      </>,
    );

    expect(screen.getByRole("heading", { name: "Browse products" })).toBeTruthy();
    expect(screen.getByText("Products / Focused view")).toBeTruthy();
    fireEvent.change(screen.getByRole("searchbox", { name: "Search products" }), { target: { value: "NHD" } });
    expect(onChange).toHaveBeenCalledWith("NHD");
  });
});
