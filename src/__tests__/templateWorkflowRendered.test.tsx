import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";

import { saveRoomTemplateCopy } from "../wingman2/lib/customRoomTemplates";
import { saveCustomRoomTemplate } from "../wingman2/lib/customRoomTemplates";
import { createBlankProjectTopology } from "../wingman2/lib/projectTopology";
import { roomTemplates } from "../wingman2/lib/roomTemplates";
import { templateMatchesMarketFilter } from "../wingman2/lib/templateMarkets";
import { TemplateReviewPage } from "../wingman2/pages/TemplateReviewPage";
import { TemplatesPage } from "../wingman2/pages/TemplatesPage";
import { getTemplateApplicationProfile } from "../wingman2/lib/templateApplicationProfiles";

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
    const template = roomTemplates.find((candidate) => candidate.vertical === "Corporate" && candidate.bom.some((row) => row.sku === "MX-0404-HDMI"));

    expect(template).toBeDefined();
    renderTemplateRoutes();

    fireEvent.click(screen.getByRole("button", { name: template!.name }));
    expect(screen.getByRole("heading", { name: template!.name, level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Equipment" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: "Equipment", level: 2 })).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole("tab", { name: "Overview" }));
    expect(screen.getByRole("heading", { name: "Room concept" })).toBeVisible();
    expect(screen.getAllByText(profile.architectureFamily).length).toBeGreaterThan(0);
    expect(screen.getByText(template.concept!.statement)).toBeVisible();
    expect(screen.getByRole("region", { name: "Room concept statement" })).toBeVisible();
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

  it("opens a custom template in Discovery with its detailed room design intact", () => {
    const template = roomTemplates[0];
    const topology = createBlankProjectTopology();
    topology.locations.push({ id: "display-wall", name: "Front display wall", type: "display-wall" });
    topology.devices.push({
      id: "saved-display", name: "Main display", category: "display", locationId: "display-wall",
      manufacturer: "Example AV", sku: "EX-100", productRelationship: "complementary", quantity: 1,
      thirdParty: true, status: "assumed", notes: "Confirm wall bracket compatibility.",
    });
    topology.devices.push({
      id: "saved-source", name: "Room PC", category: "source", locationId: "display-wall",
      manufacturer: "Example AV", sku: "EX-PC", productRelationship: "complementary", quantity: 1,
      thirdParty: true, status: "assumed",
    });
    topology.connections.push({
      id: "saved-route", fromDeviceId: "saved-source", toDeviceId: "saved-display", fromPort: "HDMI 1",
      toPort: "HDMI 1", services: ["video"], transport: "hdmi", lengthMode: "estimated", lengthMetres: 9,
      status: "assumed", notes: "Reuse existing containment if suitable.",
    });
    const saved = saveCustomRoomTemplate({
      ...template, name: "Room design to edit", topology,
      discoveryAnswers: { opportunity: "meeting-room" }, discoveryNotes: { opportunity: "Keep room operation simple." },
    }, { sourceTemplateId: template.id });
    renderTemplateRoutes();

    const card = screen.getByRole("heading", { name: saved.name }).closest("article");
    expect(card).not.toBeNull();
    fireEvent.click(within(card!).getByText("Manage custom template"));
    fireEvent.click(within(card!).getByRole("button", { name: "Edit" }));

    const handoff = JSON.parse(window.sessionStorage.getItem("wingman:discovery-handoff") || "null");
    expect(handoff).toMatchObject({
      mode: "template-edit", templateId: saved.id,
      answers: { opportunity: "meeting-room" }, notes: { opportunity: "Keep room operation simple." },
      topology: {
        locations: [{ id: "display-wall" }], devices: [{ id: "saved-display", sku: "EX-100" }, { id: "saved-source", sku: "EX-PC" }],
        connections: [{ id: "saved-route", lengthMetres: 9 }],
      },
      bom: saved.bom,
    });
  });

  it("keeps an excluded WyreStorm option in its equipment group", () => {
    const template = roomTemplates[0];
    const optionalRow = { ...template.bom[0], id: "optional-dongle", sku: "APO-DG2", description: "Wireless presentation option", type: "Optional" as const, status: "optional" };
    const saved = saveRoomTemplateCopy(template, [...template.bom, optionalRow]);
    renderTemplateRoutes(`/wingman/templates/${saved.id}`);

    fireEvent.click(screen.getByRole("tab", { name: "Equipment" }));
    fireEvent.click(screen.getByRole("button", { name: "Optional equipment group" }));

    const fibreRow = screen.getByText("APO-DG2").closest("article");
    expect(fibreRow).not.toBeNull();
    fireEvent.click(within(fibreRow!).getByRole("checkbox", { name: "Include APO-DG2" }));

    expect(screen.getByText("APO-DG2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Third-party scope equipment group" }));
    expect(screen.queryByText("APO-DG2")).not.toBeInTheDocument();
  });
});
