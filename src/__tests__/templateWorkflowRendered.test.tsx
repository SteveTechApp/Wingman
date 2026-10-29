import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { saveRoomTemplateCopy } from "../wingman2/lib/customRoomTemplates";
import { saveCustomRoomTemplate } from "../wingman2/lib/customRoomTemplates";
import { createBlankProjectTopology } from "../wingman2/lib/projectTopology";
import { roomTemplates } from "../wingman2/lib/roomTemplates";
import { templateMatchesMarketFilter } from "../wingman2/lib/templateMarkets";
import { TemplateReviewPage } from "../wingman2/pages/TemplateReviewPage";
import { TemplatesPage } from "../wingman2/pages/TemplatesPage";
import { getTemplateApplicationProfile } from "../wingman2/lib/templateApplicationProfiles";
import { PROJECT_SCOPE_SECTIONS, projectScopeSection } from "../wingman2/lib/projectScope";

/** The address the page is on, so a test can see what a link would send. */
function AddressProbe() {
  const location = useLocation();
  return <output data-testid="address">{location.search}</output>;
}

function renderTemplateRoutes(initialPath = "/wingman/templates") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/wingman/templates" element={<TemplatesPage />} />
        <Route path="/wingman/templates/:templateId" element={<><TemplateReviewPage /><AddressProbe /></>} />
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

  it("opens the Proposal tab when the address names a pre-issue stage", () => {
    const template = roomTemplates[0];

    renderTemplateRoutes(`/wingman/templates/${template.id}?stage=assumptions`);

    // A link to a stage has to land on the tab that shows it.
    expect(screen.getByRole("tab", { name: "Proposal" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("address").textContent).toBe(`?stage=assumptions`);
  });

  it("drops the stage from the address once the rep leaves the Proposal tab", () => {
    const template = roomTemplates[0];
    renderTemplateRoutes(`/wingman/templates/${template.id}?stage=assumptions`);

    fireEvent.click(screen.getByRole("tab", { name: "Room design" }));

    // An address naming a stage nobody can see is one a reload would jump back to.
    expect(screen.getByTestId("address").textContent).toBe("");
  });

  it("chooses the display receiver from the surveyed cable run and states the reason", () => {
    const template = roomTemplates.find((candidate) => candidate.id === "education-classroom-hdbaset")!;
    renderTemplateRoutes(`/wingman/templates/${template.id}`);

    fireEvent.click(screen.getByRole("button", { name: "Edit room brief" }));
    fireEvent.change(screen.getByLabelText("Longest surveyed display run (m)"), { target: { value: "24" } });
    fireEvent.click(screen.getByRole("button", { name: "Done editing brief" }));

    // The room design states the run the receiver was chosen on.
    expect(screen.getByRole("heading", { name: "Display receiver" })).toBeInTheDocument();
    expect(screen.getByText(/The survey records a 24 m display run/)).toBeInTheDocument();

    // The schedule quotes the part that run allows, not the 100 m receiver.
    fireEvent.change(screen.getByLabelText("Room design step"), { target: { value: "schedule" } });
    fireEvent.click(screen.getByRole("tab", { name: "Distribution and switching" }));
    expect(screen.getByLabelText("Quantity for RX-500")).toBeInTheDocument();
    expect(screen.queryByLabelText("Quantity for RX-700")).not.toBeInTheDocument();

    // The proposal quotes the part the run chose, not the one the template held.
    fireEvent.click(screen.getByRole("tab", { name: "Proposal" }));
    expect(screen.getAllByText("RX-500").length).toBeGreaterThan(0);
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
    fireEvent.click(screen.getByRole("tab", { name: "Displays and projection" }));
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
    // The confirmation prints the app's one link to a template, so it names the
    // design it just wrote instead of reading as a bare "Open template" beside
    // the sentence that saved it.
    expect(
      screen.getByRole("link", { name: `Open template: ${template.name} - Custom` }),
    ).toHaveAttribute(
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

  it("opens a custom template with its detailed room design intact", () => {
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
      bom: JSON.parse(JSON.stringify(saved.bom)),
    });
  });

  it("keeps an excluded WyreStorm option in its equipment group", () => {
    const template = roomTemplates[0];
    const optionalRow = { ...template.bom[0], id: "optional-dongle", sku: "APO-DG2", description: "Wireless presentation option", type: "Optional" as const, status: "optional" };
    const saved = saveRoomTemplateCopy(template, [...template.bom, optionalRow]);
    renderTemplateRoutes(`/wingman/templates/${saved.id}`);

    fireEvent.change(screen.getByLabelText("Room design step"), { target: { value: "schedule" } });
    fireEvent.click(screen.getByRole("tab", { name: PROJECT_SCOPE_SECTIONS.find(section => section.id === projectScopeSection(optionalRow))!.title }));
    fireEvent.change(screen.getByLabelText("Schedule items"), { target: { value: "optional" } });

    const fibreRow = screen.getByText("Wireless presentation option").closest("article");
    expect(fibreRow).not.toBeNull();
    fireEvent.click(within(fibreRow!).getByRole("checkbox", { name: "Include Wireless presentation option" }));

    expect(screen.getByText("Wireless presentation option")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Schedule items"), { target: { value: "others" } });
    expect(screen.queryByText("Wireless presentation option")).not.toBeInTheDocument();
  });
});
