import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

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
});
