import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useParams } from "react-router-dom";
import { roomTemplates } from "../lib/roomTemplates";
import { readDiscoveryHandoff } from "../lib/discoveryTemplateHandoff";
import type { CustomRoomTemplate } from "../lib/customRoomTemplates";
import { TemplatesPage } from "./TemplatesPage";

const mode = vi.hoisted(() => ({ isGuided: true }));
vi.mock("../data/uiMode", () => ({ useUiMode: () => mode }));
vi.mock("../lib/customRoomTemplates", async importOriginal => ({
  ...await importOriginal<typeof import("../lib/customRoomTemplates")>(),
  useCustomRoomTemplates: () => [customTemplate],
}));

const customTemplate: CustomRoomTemplate = {
  ...roomTemplates[0], id: "saved-custom-room", name: "Saved custom room",
  customTemplate: true, createdAt: "2026-10-23", updatedAt: "2026-10-23",
  schemaVersion: 3, discoveryAnswers: { displays: "2" }, discoveryNotes: {},
};

function EditorDestination() {
  return <div>Editing {useParams().id}</div>;
}

afterEach(() => { cleanup(); sessionStorage.clear(); });

it.each([true, false])("edits the original custom template in guided=%s", isGuided => {
  mode.isGuided = isGuided;
  render(<MemoryRouter initialEntries={["/wingman/templates"]}><Routes>
    <Route path="/wingman/templates" element={<TemplatesPage />} />
    <Route path="/wingman/templates/:id/edit" element={<EditorDestination />} />
    <Route path="/wingman/templates/:id" element={<div>Review destination</div>} />
  </Routes></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "Custom" }));
  fireEvent.click(screen.getByText("Manage custom template"));
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  expect(screen.getByText("Editing saved-custom-room")).toBeTruthy();
  expect(readDiscoveryHandoff()).toMatchObject({
    mode: "template-edit", templateId: customTemplate.id, answers: customTemplate.discoveryAnswers,
  });
});
