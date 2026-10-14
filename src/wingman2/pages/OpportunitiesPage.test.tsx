import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { UiModeProvider } from "../data/uiMode";
import { UiModeToggle } from "../components/UiModeToggle";
import { readProjectStore } from "../data/projectStore";
import { DISCOVERY_SNAPSHOT_KEY, readLatestDiscoverySnapshot, writeLatestDiscoverySnapshot } from "../data/workflowHandoff";
import { getCustomRoomTemplates } from "../lib/customRoomTemplates";
import { roomTemplates } from "../lib/roomTemplates";
import { projectScopeSection } from "../lib/projectScope";
import { OpportunitiesPage } from "./OpportunitiesPage";
import { TemplateReviewPage } from "./TemplateReviewPage";
import { TemplateBuilderPage } from "./TemplateBuilderPage";

function mount(path = "/wingman/discovery") {
  return render(<MemoryRouter initialEntries={[path]}><UiModeProvider><UiModeToggle /><Routes>
    <Route path="/wingman/discovery" element={<OpportunitiesPage />} />
    <Route path="/wingman/templates/new" element={<TemplateBuilderPage />} />
    <Route path="/wingman/templates/:templateId/edit" element={<TemplateBuilderPage />} />
    <Route path="/wingman/templates/:templateId" element={<TemplateReviewPage />} />
    <Route path="/wingman/templates" element={<p>Template library</p>} />
  </Routes></UiModeProvider></MemoryRouter>);
}
const template = roomTemplates.find(row => row.vertical === "Corporate")!;
const row = template.bom.find(item => item.type === "Required")!;
function seedRoomBrief() {
  writeLatestDiscoverySnapshot({ projectId: undefined, projectName: undefined, activeStepIndex: 0,
    state: { answers: { market: "corporate", environment: "meeting", opportunity: "meeting-room" }, notes: {}, clientName: "Original customer" },
    brief: { capturedPercent: 5 }, savedAt: "" });
}

describe("Focused and Expert room workflows", () => {
  beforeEach(() => { window.localStorage.clear(); window.sessionStorage.clear(); });
  it("starts Focused discovery with an editable room template and saves its changed quantities", () => {
    window.localStorage.setItem("wingman-ui-mode-v1", "guided");
    mount();
    expect(screen.getByRole("heading", { name: "Start with a room template" })).toBeVisible();
    expect(screen.queryByRole("region", { name: "Full room builder" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: template.name }));
    fireEvent.change(screen.getByLabelText("Room design step"), { target: { value: "schedule" } });
    fireEvent.change(screen.getByLabelText("Schedule section"), { target: { value: projectScopeSection(row) } });
    fireEvent.change(screen.getByRole("spinbutton", { name: `Quantity for ${row.sku}` }), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Save as project" }));
    const project = readProjectStore().projects.find(item => item.name === template.name)!;
    expect(project.productSelections?.find(item => item.sku === row.sku)?.quantity).toBe(3);
  });
  it("retains template equipment edits when switching from Focused to Expert", async () => {
    window.localStorage.setItem("wingman-ui-mode-v1", "guided");
    mount(`/wingman/templates/${template.id}`);
    fireEvent.change(screen.getByLabelText("Room design step"), { target: { value: "schedule" } });
    fireEvent.change(screen.getByLabelText("Schedule section"), { target: { value: projectScopeSection(row) } });
    fireEvent.change(screen.getByRole("spinbutton", { name: `Quantity for ${row.sku}` }), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: /^Expert view:/ }));
    expect(await screen.findByRole("heading", { name: "Room builder", level: 1 })).toBeVisible();
    await waitFor(() => expect(readLatestDiscoverySnapshot()?.brief.topology?.devices.find(item => item.id === row.id)?.quantity).toBe(4));
    expect(readLatestDiscoverySnapshot()?.state.sourceTemplateId).toBe(template.id);
  });
  it("opens the full room builder in Expert and saves edited room positions", async () => {
    window.localStorage.setItem("wingman-ui-mode-v1", "unguided");
    seedRoomBrief();
    mount("/wingman/discovery?resume=project");
    expect(screen.getByRole("region", { name: "Full room builder" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Equipment and room positions" }));
    expect(screen.getByRole("region", { name: "Room signal connections" })).toBeVisible();
    fireEvent.change(screen.getByRole("textbox", { name: "Location name" }), { target: { value: "Rear confidence display" } });
    fireEvent.click(screen.getByRole("button", { name: "Add location" }));
    await waitFor(() => expect(readLatestDiscoverySnapshot()?.brief.topology?.locations.some(item => item.name === "Rear confidence display")).toBe(true));
    expect(screen.getByRole("button", { name: "Detailed questions" })).toBeVisible();
  });
  it("keeps an unfinished Expert room when changing interface views", async () => {
    window.localStorage.setItem("wingman-ui-mode-v1", "unguided");
    seedRoomBrief();
    mount("/wingman/discovery?resume=project");
    fireEvent.click(screen.getByRole("button", { name: "Equipment and room positions" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Location name" }), { target: { value: "Lectern" } });
    fireEvent.click(screen.getByRole("button", { name: "Add location" }));
    fireEvent.click(screen.getByRole("button", { name: /^Focused view:/ }));
    expect(screen.getByRole("heading", { name: "Start with a room template" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /^Expert view:/ }));
    fireEvent.click(screen.getByRole("button", { name: "Equipment and room positions" }));
    expect(screen.getByRole("textbox", { name: "Name for Lectern" })).toHaveValue("Lectern");
  });
  it("restores an unfinished reusable template after reopening its builder", () => {
    window.localStorage.setItem("wingman-ui-mode-v1", "unguided");
    const view = mount("/wingman/templates/new");
    fireEvent.change(screen.getByRole("textbox", { name: "Template name" }), { target: { value: "Draft room template" } });
    fireEvent.click(screen.getByRole("button", { name: /Corporate & enterprise/i }));
    fireEvent.click(screen.getByRole("button", { name: /Meeting or boardroom/i }));
    view.unmount();
    mount("/wingman/templates/new");
    expect(screen.getByRole("textbox", { name: "Template name" })).toHaveValue("Draft room template");
    expect(screen.getByRole("region", { name: "Full room builder" })).toBeVisible();
  });
  it.each(["guided", "unguided"])("keeps reusable template authoring separate from the customer draft in %s view", async (mode) => {
    window.localStorage.setItem("wingman-ui-mode-v1", mode);
    seedRoomBrief();
    const original = window.localStorage.getItem(DISCOVERY_SNAPSHOT_KEY);
    const projectIds = readProjectStore().projects.map(item => item.id);
    mount("/wingman/templates/new");
    expect(screen.getByRole("heading", { name: "Custom room template", level: 1 })).toBeVisible();
    expect(screen.queryByPlaceholderText("Client name")).toBeNull();
    fireEvent.change(screen.getByRole("textbox", { name: "Template name" }), { target: { value: "Reusable meeting room" } });
    fireEvent.click(screen.getByRole("button", { name: /Corporate & enterprise/i }));
    fireEvent.click(screen.getByRole("button", { name: /Meeting or boardroom/i }));
    fireEvent.click(screen.getByRole("button", { name: "Equipment and room positions" }));
    fireEvent.click(screen.getByRole("button", { name: "Review room brief" }));
    expect(screen.queryByRole("button", { name: "Find WyreStorm products" })).toBeNull();
    fireEvent.click(screen.getAllByRole("button", { name: "Save Custom Template" })[0]);
    await waitFor(() => expect(getCustomRoomTemplates().some(item => item.name === "Reusable meeting room")).toBe(true));
    expect(window.localStorage.getItem(DISCOVERY_SNAPSHOT_KEY)).toBe(original);
    expect(readProjectStore().projects.map(item => item.id)).toEqual(projectIds);
  });
});
