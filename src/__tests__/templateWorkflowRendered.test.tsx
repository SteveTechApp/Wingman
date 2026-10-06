import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { saveRoomTemplateCopy } from "../wingman2/lib/customRoomTemplates";
import { roomTemplates } from "../wingman2/lib/roomTemplates";
import { templateMatchesMarketFilter } from "../wingman2/lib/templateMarkets";
import { TemplateReviewPage } from "../wingman2/pages/TemplateReviewPage";
import { TemplatesPage } from "../wingman2/pages/TemplatesPage";
import { getTemplateApplicationProfile } from "../wingman2/lib/templateApplicationProfiles";
import { projectScopeSection } from "../wingman2/lib/projectScope";

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

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("browses BOM-backed templates and opens the selected review page", () => {
    const template = roomTemplates.find((candidate) => candidate.vertical === "Corporate" && candidate.bom.some((row) => row.sku === "MX-0404-HDMI"));

    expect(template).toBeDefined();
    renderTemplateRoutes();

    fireEvent.click(screen.getByRole("button", { name: template!.name }));
    expect(screen.getByRole("heading", { name: template!.name, level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Room design" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: "Room brief", level: 2 })).toBeInTheDocument();
  });

  it("shows a clear not-found state for an invalid template ID", () => {
    renderTemplateRoutes("/wingman/templates/not-a-real-template");

    expect(screen.getByRole("heading", { name: "Template not found." })).toBeInTheDocument();
    expect(screen.queryByText(roomTemplates[0].name)).not.toBeInTheDocument();
  });

  it("carries the reviewed application brief into preview and detail overview", () => {
    const template = roomTemplates[0];
    const profile = getTemplateApplicationProfile(template);
    const view = renderTemplateRoutes();

    const card = screen.getByRole("heading", { name: template.name }).closest("article");
    expect(card).not.toBeNull();
    fireEvent.click(within(card!).getByRole("button", { name: /personalise/i }));
    fireEvent.click(screen.getByRole("button", { name: /back to preview/i }));
    const preview = screen.getByRole("dialog", { name: template.name });
    expect(within(preview).getByRole("img", { name: `${template.name} application` })).toBeVisible();
    expect(within(preview).getByText("Sizing basis")).toBeVisible();
    expect(within(preview).getByText(profile.userJourney)).toBeVisible();
    view.unmount();

    renderTemplateRoutes(`/wingman/templates/${template.id}`);
    expect(screen.getByRole("img", { name: `${template.name} application` })).toBeVisible();
    expect(screen.getByRole("heading", { name: "What the room needs to do" })).toBeVisible();
    expect(screen.getByText(template.story!.requirement)).toBeVisible();
    expect(screen.getByText(template.architecture)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Edit room brief" }));
    expect(screen.getByLabelText("Room dimensions and layout")).toHaveValue(template.concept!.environment);
    expect(screen.getByLabelText("Customer requirement and room use")).toHaveValue(template.story!.requirement);
  });

  it("populates a third-party BOM row from a manufacturer product URL", async () => {
    const template = roomTemplates[0];
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      manufacturer: "Example Displays",
      model: "PROPANEL-65",
      title: "ProPanel 65 - Commercial 4K Display | Example Displays",
      summary: "ProPanel 65 is a 65-inch commercial 4K display rated for 16/7 operation.",
      keySpecs: ["65-inch 4K UHD panel", "2 × HDMI inputs", "16/7 operating hours"],
      resolvedUrl: "https://www.example-displays.com/products/propanel-65",
      fetchedAt: "2026-10-02T09:00:00.000Z",
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    renderTemplateRoutes(`/wingman/templates/${template.id}`);
    fireEvent.change(screen.getByLabelText("Room design step"), { target: { value: "schedule" } });
    fireEvent.change(screen.getByLabelText("Schedule section"), { target: { value: "displays" } });
    fireEvent.click(screen.getAllByRole("button", { name: /^Edit / })[0]);

    fireEvent.change(screen.getByLabelText("Product page URL"), { target: { value: "https://www.example-displays.com/products/propanel-65" } });
    fireEvent.click(screen.getByRole("button", { name: "Read product details" }));

    expect(await screen.findByText(/Product details added as suggestions/)).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith("/api/wingman/equipment/inspect-product-page", expect.objectContaining({ method: "POST" }));
    expect(screen.getByText("Example Displays PROPANEL-65")).toBeVisible();
    expect(screen.getByRole("link", { name: /Open product page/ })).toHaveAttribute(
      "href",
      "https://www.example-displays.com/products/propanel-65",
    );
    expect(screen.getAllByText(/Source: https:\/\/www.example-displays.com\/products\/propanel-65 \(read 2026-10-02\)/).length).toBeGreaterThan(0);
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

    const corporateTemplateCount = [...roomTemplates, savedTemplate]
      .filter((template) => templateMatchesMarketFilter(template, "Corporate")).length;
    expect(screen.queryByRole("button", { name: "All" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: `${corporateTemplateCount} templates` })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: savedTemplate.name }));
    expect(screen.getByRole("heading", { name: savedTemplate.name, level: 1 })).toBeInTheDocument();
  });

  it("keeps an excluded WyreStorm option in its equipment group", () => {
    const template = roomTemplates[0];
    const optionalRow = { ...template.bom[0], id: "optional-dongle", sku: "APO-DG2", description: "Wireless presentation option", type: "Optional" as const, status: "optional" };
    const saved = saveRoomTemplateCopy(template, [...template.bom, optionalRow]);
    renderTemplateRoutes(`/wingman/templates/${saved.id}`);

    fireEvent.change(screen.getByLabelText("Room design step"), { target: { value: "schedule" } });
    fireEvent.change(screen.getByLabelText("Schedule section"), { target: { value: projectScopeSection(optionalRow) } });
    fireEvent.change(screen.getByLabelText("Schedule items"), { target: { value: "optional" } });

    const fibreRow = screen.getByText("Wireless presentation option").closest("article");
    expect(fibreRow).not.toBeNull();
    fireEvent.click(within(fibreRow!).getByRole("checkbox", { name: "Include Wireless presentation option" }));

    expect(screen.getByText("Wireless presentation option")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Schedule items"), { target: { value: "others" } });
    expect(screen.queryByText("Wireless presentation option")).not.toBeInTheDocument();
  });
});
