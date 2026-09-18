import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { roomTemplates } from "../lib/roomTemplates";
import { TemplateLibraryCard } from "./TemplateLibraryCard";

describe("TemplateLibraryCard", () => {
  it("keeps the application brief and both actions visible", () => {
    const template = roomTemplates[0];
    render(<TemplateLibraryCard template={template} onReview={vi.fn()} onPersonalise={vi.fn()} />);

    expect(screen.getByRole("img", { name: new RegExp(template.name, "i") })).toBeTruthy();
    expect(screen.queryByText(template.summary)).toBeNull();
    expect(screen.getByText(template.scale)).toBeTruthy();
    expect(screen.getByText(/required sku/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /review design/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /personalise/i })).toBeTruthy();
  });
});
