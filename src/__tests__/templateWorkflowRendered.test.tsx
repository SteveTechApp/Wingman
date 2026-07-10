import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";

import { roomTemplates } from "../wingman2/lib/roomTemplates";
import { TemplateReviewPage } from "../wingman2/pages/TemplateReviewPage";
import { TemplatesPage } from "../wingman2/pages/TemplatesPage";

function renderTemplateRoutes(initialPath = "/wingman/templates") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/wingman/templates" element={<TemplatesPage />} />
        <Route path="/wingman/templates/:templateId" element={<TemplateReviewPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("template workflow wiring", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("browses BOM-backed templates and opens the selected review page", () => {
    const template = roomTemplates.find((candidate) => candidate.bom.some((row) => row.sku === "NHD-500-TX"));

    expect(template).toBeDefined();
    renderTemplateRoutes();

    const card = screen.getByRole("heading", { name: template!.name }).closest("article");
    expect(card).not.toBeNull();

    fireEvent.click(within(card!).getByRole("link", { name: "Review template" }));
    expect(screen.getByRole("heading", { name: template!.name, level: 1 })).toBeInTheDocument();
  });

  it("shows a clear not-found state for an invalid template ID", () => {
    renderTemplateRoutes("/wingman/templates/not-a-real-template");

    expect(screen.getByRole("heading", { name: "Template not found." })).toBeInTheDocument();
    expect(screen.queryByText(roomTemplates[0].name)).not.toBeInTheDocument();
  });

  it("creates and reviews a brand-new custom room template", () => {
    renderTemplateRoutes();

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Council chamber custom room" },
    });
    fireEvent.change(screen.getByLabelText("Vertical"), {
      target: { value: "Government" },
    });
    fireEvent.change(screen.getByLabelText("Application"), {
      target: { value: "Hybrid civic meetings" },
    });
    fireEvent.change(screen.getByLabelText("Scale"), {
      target: { value: "Custom" },
    });
    fireEvent.change(screen.getByLabelText("Summary"), {
      target: { value: "Reusable chamber design starting point." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create template" }));

    const card = screen.getByRole("heading", { name: "Council chamber custom room" }).closest("article");
    expect(card).not.toBeNull();
    expect(screen.getByText("1 custom template saved in this browser.")).toBeInTheDocument();

    fireEvent.click(within(card!).getByRole("link", { name: "Review template" }));
    expect(screen.getByRole("heading", { name: "Council chamber custom room", level: 1 })).toBeInTheDocument();
  });

  it("saves an adjusted room design as a reusable custom template", () => {
    const template = roomTemplates[0];
    renderTemplateRoutes(`/wingman/templates/${template.id}`);

    fireEvent.click(screen.getByRole("button", { name: "Save as template" }));

    expect(screen.getByText("Room design saved as a custom template.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open template" })).toHaveAttribute(
      "href",
      expect.stringContaining("/wingman/templates/custom-"),
    );
  });
});
