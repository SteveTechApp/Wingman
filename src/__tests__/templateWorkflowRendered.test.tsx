import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";

import { saveRoomTemplateCopy } from "../wingman2/lib/customRoomTemplates";
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

    fireEvent.click(screen.getByRole("button", { name: template!.name }));
    expect(screen.getByRole("heading", { name: template!.name, level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Equipment" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Editable WyreStorm BOM")).toBeInTheDocument();
  });

  it("shows a clear not-found state for an invalid template ID", () => {
    renderTemplateRoutes("/wingman/templates/not-a-real-template");

    expect(screen.getByRole("heading", { name: "Template not found." })).toBeInTheDocument();
    expect(screen.queryByText(roomTemplates[0].name)).not.toBeInTheDocument();
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

  it("shows saved custom templates in the library and opens their review page", () => {
    const savedTemplate = saveRoomTemplateCopy(roomTemplates[0]);
    renderTemplateRoutes();

    expect(screen.getByRole("heading", { name: `${roomTemplates.length + 1} templates` })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: savedTemplate.name }));
    expect(screen.getByRole("heading", { name: savedTemplate.name, level: 1 })).toBeInTheDocument();
  });

  it("keeps an excluded WyreStorm option in its equipment group", () => {
    renderTemplateRoutes("/wingman/templates/government-control-room-networkhd600");

    fireEvent.click(screen.getByRole("tab", { name: "Equipment" }));
    fireEvent.click(screen.getByRole("button", { name: "Optional equipment group" }));

    const fibreRow = screen.getByText("NHD-600-TRXF").closest("article");
    expect(fibreRow).not.toBeNull();
    fireEvent.click(within(fibreRow!).getByRole("checkbox", { name: "Include NHD-600-TRXF" }));

    expect(screen.getByText("NHD-600-TRXF")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Third-party scope equipment group" }));
    expect(screen.queryByText("NHD-600-TRXF")).not.toBeInTheDocument();
  });
});
